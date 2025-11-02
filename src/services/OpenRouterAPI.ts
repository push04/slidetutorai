// src/services/OpenRouterAPI.ts
import type { Upload } from './FileProcessor';
import { chunkText, mergeChunkedResults, estimateTokenCount } from '../utils/textChunking';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

type CompletionOpts = {
  expectJson?: boolean;
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
  stream?: boolean;
};

export interface ProgressCallback {
  (progress: number, message?: string): void;
}

/**
 * Single place to manage your preferred models.
 * Order = preference. Availability can change; fallback handles errors.
 */
const MODELS_POOL: readonly string[] = [
  'meta-llama/llama-3.1-8b-instruct:free',
  'qwen/qwen-2.5-32b-instruct:free',
  'google/gemma-2-9b-it:free',
  'mistralai/mistral-7b-instruct:free',
  'deepseek/deepseek-r1:free',
  'openchat/openchat-3.5:free',
  'mistralai/mixtral-8x7b-instruct',
  'meta-llama/llama-3.1-70b-instruct',
  'qwen/qwen-2.5-72b-instruct',
  'nousresearch/hermes-2-pro-mistral',
] as const;

/**
 * Per-feature ordering (can bias toward stronger JSON behavior for quiz/flashcards,
 * and toward bigger-context models for lessons).
 */
const MODEL_ORDER = {
  lesson: [
    // Wider context / stronger generalists first
    MODELS_POOL[0],
    MODELS_POOL[2],
    MODELS_POOL[6],
    MODELS_POOL[3],
    MODELS_POOL[7],
    MODELS_POOL[1],
    MODELS_POOL[8],
    MODELS_POOL[4],
    MODELS_POOL[5],
    MODELS_POOL[9],
  ],
  quiz: [
    // Models that tend to follow JSON instructions well
    MODELS_POOL[0],
    MODELS_POOL[1],
    MODELS_POOL[2],
    MODELS_POOL[3],
    MODELS_POOL[6],
    MODELS_POOL[7],
    MODELS_POOL[5],
    MODELS_POOL[4],
    MODELS_POOL[8],
    MODELS_POOL[9],
  ],
  flashcards: [
    MODELS_POOL[0],
    MODELS_POOL[1],
    MODELS_POOL[2],
    MODELS_POOL[3],
    MODELS_POOL[6],
    MODELS_POOL[7],
    MODELS_POOL[5],
    MODELS_POOL[4],
    MODELS_POOL[8],
    MODELS_POOL[9],
  ],
  chat: [
    // Snappy/free first, then bigger
    MODELS_POOL[0],
    MODELS_POOL[1],
    MODELS_POOL[2],
    MODELS_POOL[3],
    MODELS_POOL[4],
    MODELS_POOL[5],
    MODELS_POOL[6],
    MODELS_POOL[7],
    MODELS_POOL[8],
    MODELS_POOL[9],
  ],
} as const;

export class OpenRouterAPI {
  constructor(private apiKey: string) {
    if (!apiKey || apiKey.trim() === '' || apiKey === 'placeholder-key') {
      throw new Error('OpenRouter API key is required. Please configure your API key in Settings.');
    }
  }

  // ---------------------------------------------------------------------------
  // Core helpers
  // ---------------------------------------------------------------------------

  private get headers() {
    if (!this.apiKey) throw new Error('OpenRouter API key not configured');
    return {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'https://slidetutor.ai',
      'X-Title': 'SlideTutor AI',
    };
  }

  private async rawCompletionRequest(
    model: string,
    messages: ChatMessage[],
    {
      expectJson,
      temperature = 0.3,
      maxTokens = 4096,
      signal,
      stream,
    }: CompletionOpts = {}
  ) {
    const body: Record<string, any> = {
      model,
      messages,
      temperature,
      top_p: 0.9,
      max_tokens: maxTokens,
    };

    if (expectJson) {
      body.response_format = { type: 'json_object' };
      if (stream) delete body.stream; // avoid partial JSON streams
    } else if (stream) {
      body.stream = true;
    }

    const res = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
      signal,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      const hint =
        res.status === 429
          ? 'Rate limited. Retry soon or try another model.'
          : res.status >= 500
          ? 'Provider error. Retry or switch model.'
          : 'Verify request format and API key/limits.';
      throw new Error(
        `OpenRouter ${res.status} ${res.statusText} [${model}] — ${hint}\n${errText}`
      );
    }

    if (stream) return res;

    const data = await res.json();
    const content =
      data?.choices?.[0]?.message?.content ??
      data?.choices?.[0]?.delta?.content ??
      '';
    const finish = data?.choices?.[0]?.finish_reason ?? '';
    return { content, finish, raw: data };
  }

  private async completionWithFallback(
    models: readonly string[],
    messages: ChatMessage[],
    options: CompletionOpts = {}
  ): Promise<{ content: string; finish: string; model: string; raw: any } | Response> {
    let lastError: unknown;

    for (let i = 0; i < models.length; i++) {
      const model = models[i];
      let attempt = 0;
      const maxAttempts = 5; // Increased retry attempts

      while (attempt < maxAttempts) {
        try {
          const result = await this.rawCompletionRequest(model, messages, options);
          if (result instanceof Response) return result;
          return { ...(result as any), model };
        } catch (err: any) {
          lastError = err;
          const transient =
            typeof err?.message === 'string' &&
            (/\b429\b/.test(err.message) || /\b5\d{2}\b/.test(err.message));
          attempt++;
          
          if (attempt >= maxAttempts || !transient) break;
          
          // Exponential backoff with jitter for rate limits
          const baseDelay = 1000; // Start with 1 second
          const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);
          const jitter = Math.random() * 500; // Add random jitter up to 500ms
          const delay = Math.min(exponentialDelay + jitter, 30000); // Cap at 30 seconds
          
          console.log(`[OpenRouterAPI] Rate limited on ${model}, attempt ${attempt}/${maxAttempts}, retrying in ${Math.round(delay)}ms...`);
          await new Promise((r) => setTimeout(r, delay));
        }
      }
      // proceed to next model
    }
    throw lastError ?? new Error('All model attempts failed');
  }

  // ---------------------------------------------------------------------------
  // Feature wrappers
  // ---------------------------------------------------------------------------

  async generateLesson(
    uploadOrContent: Upload | string,
    onProgress?: ProgressCallback,
    includeQuiz: boolean = true
  ): Promise<string> {
    const content =
      typeof uploadOrContent === 'string'
        ? uploadOrContent
        : String(uploadOrContent.fullText ?? '');

    if (!content || content.trim().length === 0) {
      throw new Error('No content provided for lesson generation');
    }

    // Estimate tokens and determine if chunking is needed
    const estimatedTokens = estimateTokenCount(content);
    const needsChunking = estimatedTokens > 3000; // ~12,000 characters

    if (!needsChunking) {
      // Process as single chunk with simulated progress
      onProgress?.(10, 'Preparing content...');
      
      // Simulated progress updates during AI generation - faster intervals for better UX
      let currentProgress = 10;
      const progressInterval = setInterval(() => {
        if (currentProgress < 90) {
          currentProgress += 5 + Math.random() * 10; // Increase by 5-15% each time
          if (currentProgress > 90) currentProgress = 90;
          onProgress?.(Math.round(currentProgress), 'AI is generating your lesson...');
        }
      }, 400); // Update every 400ms for smoother progress
      
      try {
        // Start progress immediately
        setTimeout(() => onProgress?.(20, 'Analyzing content...'), 100);
        setTimeout(() => onProgress?.(35, 'Generating structure...'), 300);
        setTimeout(() => onProgress?.(50, 'Creating detailed explanations...'), 600);
        
        const result = await this.generateSingleLesson(content, undefined, includeQuiz);
        clearInterval(progressInterval);
        onProgress?.(100, 'Complete!');
        return result;
      } catch (error) {
        clearInterval(progressInterval);
        throw error;
      }
    }

    // Process in chunks with progress tracking
    onProgress?.(5, 'Preparing content chunks...');
    const chunks = chunkText(content, {
      maxChunkSize: 4000,
      overlapSize: 200,
      preserveParagraphs: true,
    });

    onProgress?.(10, `Processing ${chunks.length} chunks...`);
    const chunkResults: string[] = [];
    let previousSummary = '';

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const progressPercent = 10 + ((i + 1) / chunks.length) * 80; // 10-90%
      onProgress?.(
        Math.round(progressPercent),
        `Processing chunk ${i + 1} of ${chunks.length}...`
      );

      // Build context hint with previous chunk summary for continuity
      let contextHint: string | undefined;
      if (i > 0 && previousSummary) {
        contextHint = `This is part ${i + 1} of ${chunks.length} of a multi-part lesson.\n\nPrevious sections covered: ${previousSummary}\n\nContinue building on these concepts. Focus on the NEW content below, avoiding repetition of previously covered material:`;
      }

      const chunkLesson = await this.generateSingleLesson(chunk.text, contextHint, includeQuiz && i === chunks.length - 1);
      chunkResults.push(chunkLesson);
      
      // Extract a brief summary of what was covered for the next chunk
      if (i < chunks.length - 1) {
        const lines = chunkLesson.split('\n').filter(line => line.trim());
        const headings = lines.filter(line => line.startsWith('#'));
        previousSummary = headings.slice(0, 5).join(', ') || 'previous content';
        
        // Add delay between chunks to avoid rate limiting (500ms-1s)
        const delay = 500 + Math.random() * 500;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    onProgress?.(95, 'Merging results...');
    const mergedLesson = mergeChunkedResults(chunkResults);
    onProgress?.(100, 'Complete!');

    return mergedLesson;
  }

  private async generateSingleLesson(
    content: string,
    contextHint?: string,
    includeQuiz: boolean = true
  ): Promise<string> {
    // Adjust system prompt based on whether this is a continuation
    const isContinuation = !!contextHint;
    
    const systemPrompt = isContinuation
      ? `You are an expert educator continuing a multi-part lesson. Focus on the NEW content provided, building on previously covered topics without repeating them.\n\n` +
        `Structure your response with:\n` +
        `- Clear section headings for new topics\n` +
        `- **Bold** for key terms\n` +
        `- \`code\` for technical terms\n` +
        `- > blockquotes for important notes\n` +
        `- Lists for related items\n` +
        `- Code blocks with language tags for examples`
      : `You are an expert educator and curriculum designer specializing in creating COMPREHENSIVE, DETAILED, and ENGAGING lessons.\n\n` +
        `CRITICAL: Create an EXTENSIVE, IN-DEPTH lesson that is LONGER and MORE DETAILED than typical educational content.\n` +
        `Each section should be THOROUGH with MULTIPLE paragraphs, EXTENSIVE examples, and DETAILED explanations.\n\n` +
        `Required Structure (BE THOROUGH IN EVERY SECTION):\n\n` +
        `# [Clear, Descriptive Title]\n\n` +
        `## 📚 Overview\n` +
        `Write a comprehensive introduction (5-8 sentences) that:\n` +
        `- Explains what learners will master in this lesson\n` +
        `- Highlights why this topic is important and relevant\n` +
        `- Provides context and real-world significance\n` +
        `- Sets clear learning objectives\n\n` +
        `## 🎯 Core Concepts\n` +
        `### Fundamental Ideas\n` +
        `DETAILED explanation of main concepts (3-5 paragraphs):\n` +
        `- Define each concept thoroughly with clear, simple language\n` +
        `- Provide MULTIPLE real-world analogies for each concept\n` +
        `- Include historical context or background when relevant\n` +
        `- Break down complex ideas into digestible components\n` +
        `- Use examples and counter-examples to clarify\n\n` +
        `### Deep Dive: How It Works\n` +
        `COMPREHENSIVE step-by-step explanation (4-6 paragraphs):\n` +
        `- Detailed breakdown of processes and mechanisms\n` +
        `- Numbered lists for sequential steps with thorough explanations\n` +
        `- Visual descriptions (describe diagrams/charts textually)\n` +
        `- Technical details explained in accessible language\n` +
        `- Common pitfalls and how to avoid them\n\n` +
        `### 💡 Practical Examples & Applications\n` +
        `EXTENSIVE real-world examples (5-8 examples):\n` +
        `- Multiple concrete, relatable scenarios\n` +
        `- Industry applications and use cases\n` +
        `- Step-by-step walkthroughs of practical applications\n` +
        `- Before/after comparisons\n` +
        `- Success stories and case studies\n\n` +
        `## 🔑 Key Points to Remember\n` +
        `Comprehensive list of takeaways (8-12 bullet points):\n` +
        `- Each point should be detailed (2-3 sentences)\n` +
        `- Cover all critical concepts\n` +
        `- Include practical implications\n` +
        `- Highlight connections between ideas\n\n` +
        `## ❓ Common Questions & Expert Tips\n` +
        `DETAILED FAQ section (5-8 Q&A pairs):\n` +
        `- Address common misconceptions with thorough explanations\n` +
        `- Provide expert tips and best practices\n` +
        `- Include troubleshooting advice\n` +
        `- Offer practical wisdom from experience\n` +
        `- Answer "what if" scenarios\n\n` +
        `## 🎓 Advanced Insights\n` +
        `Go deeper (3-4 paragraphs):\n` +
        `- Explore advanced aspects of the topic\n` +
        `- Discuss future trends and developments\n` +
        `- Provide resources for further learning\n` +
        `- Connect to related topics and fields\n\n` +
        `## 📋 Summary & Recap\n` +
        `Comprehensive recap (8-10 bullet points):\n` +
        `- Each point summarizing a major section\n` +
        `- Reinforce key concepts with brief explanations\n` +
        `- Tie everything together cohesively\n\n` +
        (includeQuiz ? `## ✅ Quick Self-Check\n` +
        `Include 5-8 thoughtful questions to test deep understanding:\n` +
        `Format each as: **Q: [Challenging Question]**\nA: [Detailed Answer with Explanation]\n\n` : '') +
        `FORMATTING REQUIREMENTS (Make it visually stunning):\n` +
        `- Use **bold** extensively for emphasis on key terms and concepts\n` +
        `- Use \`code\` for technical terms, formulas, and code snippets\n` +
        `- Use > blockquotes for important notes, warnings, and key insights\n` +
        `- Use numbered lists for sequential steps (with sub-steps when needed)\n` +
        `- Use bullet points with sub-bullets for hierarchical information\n` +
        `- Use code blocks with language tags for code examples\n` +
        `- Use tables for comparisons, specifications, or structured data\n` +
        `- Use emojis sparingly for section headers to improve visual appeal\n` +
        `- Use horizontal rules (---) to separate major sections\n` +
        `- Format mathematical equations clearly\n\n` +
        `CRITICAL REQUIREMENTS:\n` +
        `✓ MAKE THIS LESSON 3-4X LONGER than a typical lesson\n` +
        `✓ EVERY section must be DETAILED and COMPREHENSIVE\n` +
        `✓ Include MULTIPLE examples in every section\n` +
        `✓ Write in DEPTH - don't rush through topics\n` +
        `✓ Make it visually appealing, professional, and engaging\n` +
        `✓ Explain everything thoroughly so anyone can master the subject\n` +
        `✓ Use rich markdown formatting throughout\n\n` +
        `Remember: LONGER is BETTER. DETAIL is ESSENTIAL. Make this a COMPREHENSIVE resource that leaves no questions unanswered.`;

    const userPrompt = contextHint
      ? `${contextHint}\n\n${content}`
      : `Create an engaging, comprehensive lesson from this content:\n\n${content}`;

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    const result = await this.completionWithFallback(MODEL_ORDER.lesson, messages, {
      maxTokens: 8192, // Increased from 4096 for longer, more detailed lessons
      temperature: 0.4,
    });

    if (result instanceof Response) throw new Error('Unexpected stream for generateLesson');
    if (result.finish === 'length') {
      console.warn(`[generateLesson] Output may be truncated on model ${result.model}`);
    }
    return result.content;
  }

  async generateQuiz(
    content: string,
    questionCount: number = 5,
    onProgress?: ProgressCallback
  ): Promise<string> {
    if (!content || content.trim().length === 0) {
      throw new Error('No content provided for quiz generation');
    }

    const estimatedTokens = estimateTokenCount(content);
    const needsChunking = estimatedTokens > 3000;

    if (!needsChunking) {
      // Single chunk with simulated progress
      onProgress?.(10, 'Preparing quiz generator...');
      
      let currentProgress = 10;
      const progressInterval = setInterval(() => {
        if (currentProgress < 90) {
          currentProgress += 5 + Math.random() * 10;
          if (currentProgress > 90) currentProgress = 90;
          onProgress?.(Math.round(currentProgress), 'AI is creating your quiz...');
        }
      }, 400); // Faster updates for better UX
      
      try {
        // Immediate progress updates for smooth experience
        setTimeout(() => onProgress?.(20, 'Analyzing content for questions...'), 100);
        setTimeout(() => onProgress?.(35, 'Generating questions...'), 300);
        setTimeout(() => onProgress?.(55, 'Creating answer options...'), 600);
        setTimeout(() => onProgress?.(70, 'Writing explanations...'), 900);
        
        const result = await this.generateSingleQuiz(content, questionCount);
        clearInterval(progressInterval);
        onProgress?.(100, 'Complete!');
        return result;
      } catch (error) {
        clearInterval(progressInterval);
        throw error;
      }
    }

    // For large content, split into chunks and generate questions from each
    onProgress?.(5, 'Preparing content chunks...');
    const chunks = chunkText(content, {
      maxChunkSize: 4000,
      overlapSize: 100,
      preserveParagraphs: true,
    });

    const questionsPerChunk = Math.ceil(questionCount / chunks.length);
    onProgress?.(10, `Generating ${questionCount} questions from ${chunks.length} chunks...`);
    
    const allQuestions: any[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const progressPercent = 10 + ((i + 1) / chunks.length) * 85;
      onProgress?.(
        Math.round(progressPercent),
        `Processing chunk ${i + 1} of ${chunks.length}...`
      );

      const chunkQuiz = await this.generateSingleQuiz(chunk.text, questionsPerChunk);
      const parsed = JSON.parse(chunkQuiz);
      if (parsed.quiz && Array.isArray(parsed.quiz)) {
        allQuestions.push(...parsed.quiz);
      }
      
      // Add delay between chunks to avoid rate limiting
      if (i < chunks.length - 1) {
        const delay = 500 + Math.random() * 500;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // Limit to requested question count
    const finalQuestions = allQuestions.slice(0, questionCount);
    onProgress?.(100, 'Complete!');
    
    return JSON.stringify({ quiz: finalQuestions });
  }

  private async generateSingleQuiz(content: string, questionCount: number): Promise<string> {
    const systemPrompt =
      `You are an expert quiz creator. Generate clear, well-explained multiple-choice questions from the provided content.\n\n` +
      `Return ONLY a valid JSON object with one key "quiz", an array of question objects.\n` +
      `Schema for each question:\n` +
      `{\n  "question": "question text",\n  "options": ["option A", "option B", "option C", "option D"],\n  "correctIndex": 0,\n  "explanation": "detailed explanation of why this answer is correct and why others are wrong"\n}\n` +
      `No markdown, no code fences, no extra text. Create questions that test understanding, not just memorization.\n` +
      `Provide comprehensive explanations that help learners understand the concepts better.`;
    const userPrompt = `Create exactly ${questionCount} multiple-choice questions from this content:\n\n${content}`;

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    const result = await this.completionWithFallback(MODEL_ORDER.quiz, messages, {
      maxTokens: 4096,
      temperature: 0.1,
      expectJson: true,
    });

    if (result instanceof Response) throw new Error('Unexpected stream for generateQuiz');
    return result.content;
  }

  async generateFlashcards(
    content: string,
    cardCount: number = 10,
    onProgress?: ProgressCallback
  ): Promise<string> {
    if (!content || content.trim().length === 0) {
      throw new Error('No content provided for flashcard generation');
    }

    console.log('[OpenRouterAPI] Starting flashcard generation, content length:', content.length, 'cards:', cardCount);
    
    const estimatedTokens = estimateTokenCount(content);
    const needsChunking = estimatedTokens > 3000;
    
    console.log('[OpenRouterAPI] Estimated tokens:', estimatedTokens, 'needs chunking:', needsChunking);

    if (!needsChunking) {
      console.log('[OpenRouterAPI] Using single-chunk generation');
      onProgress?.(10, 'Preparing flashcard generator...');
      
      let currentProgress = 10;
      const progressInterval = setInterval(() => {
        if (currentProgress < 90) {
          currentProgress += 5 + Math.random() * 10;
          if (currentProgress > 90) currentProgress = 90;
          onProgress?.(Math.round(currentProgress), 'AI is creating your flashcards...');
        }
      }, 400); // Faster updates for better UX
      
      try {
        // Immediate progress updates for smooth experience
        setTimeout(() => onProgress?.(20, 'Extracting key concepts...'), 100);
        setTimeout(() => onProgress?.(40, 'Creating flashcard questions...'), 300);
        setTimeout(() => onProgress?.(60, 'Writing detailed answers...'), 600);
        setTimeout(() => onProgress?.(80, 'Adding helpful hints...'), 900);
        
        const result = await this.generateSingleFlashcardSet(content, cardCount);
        clearInterval(progressInterval);
        onProgress?.(100, 'Complete!');
        console.log('[OpenRouterAPI] Single-chunk generation complete');
        return result;
      } catch (error) {
        clearInterval(progressInterval);
        throw error;
      }
    }

    // For large content, split into chunks
    console.log('[OpenRouterAPI] Starting chunked generation');
    onProgress?.(5, 'Preparing content chunks...');
    const chunks = chunkText(content, {
      maxChunkSize: 4000,
      overlapSize: 100,
      preserveParagraphs: true,
    });

    const cardsPerChunk = Math.ceil(cardCount / chunks.length);
    console.log('[OpenRouterAPI] Split into', chunks.length, 'chunks,', cardsPerChunk, 'cards per chunk');
    onProgress?.(10, `Generating ${cardCount} flashcards from ${chunks.length} chunks...`);
    
    const allCards: any[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const progressPercent = 10 + ((i + 1) / chunks.length) * 85;
      console.log(`[OpenRouterAPI] Processing chunk ${i + 1}/${chunks.length}, progress: ${Math.round(progressPercent)}%`);
      onProgress?.(
        Math.round(progressPercent),
        `Processing chunk ${i + 1} of ${chunks.length}...`
      );

      const chunkFlashcards = await this.generateSingleFlashcardSet(chunk.text, cardsPerChunk);
      const parsed = JSON.parse(chunkFlashcards);
      if (parsed.flashcards && Array.isArray(parsed.flashcards)) {
        console.log(`[OpenRouterAPI] Chunk ${i + 1} generated ${parsed.flashcards.length} cards`);
        allCards.push(...parsed.flashcards);
      }
      
      // Add delay between chunks to avoid rate limiting
      if (i < chunks.length - 1) {
        const delay = 500 + Math.random() * 500;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // Limit to requested card count
    const finalCards = allCards.slice(0, cardCount);
    console.log('[OpenRouterAPI] Chunked generation complete, total cards:', finalCards.length);
    onProgress?.(100, 'Complete!');
    
    return JSON.stringify({ flashcards: finalCards });
  }

  private async generateSingleFlashcardSet(content: string, cardCount: number): Promise<string> {
    const systemPrompt =
      `You are an expert at creating educational flashcards. From the provided content, create clear, concise Q&A pairs.\n\n` +
      `Return ONLY a valid JSON object with one key "flashcards", an array of cards.\n` +
      `Each card has "question" (front), "answer" (back), and "hint" (optional) keys.\n` +
      `No markdown, no code fences, no extra text. Focus on key concepts and facts.`;
    const userPrompt = `Create exactly ${cardCount} flashcards from this content:\n\n${content}`;

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    const result = await this.completionWithFallback(MODEL_ORDER.flashcards, messages, {
      maxTokens: 4096,
      temperature: 0.1,
      expectJson: true,
    });

    if (result instanceof Response) throw new Error('Unexpected stream for generateFlashcards');
    return result.content;
  }

  async answerQuestion(question: string, context: string): Promise<string> {
    const systemPrompt =
      `You are a helpful AI assistant. Answer the user's question using only the provided context.\n` +
      `If the answer is not in the context, say: "I don’t see that in the provided documents."`;
    const userPrompt = `Context:\n${context}\n\nQuestion: ${question}`;

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    const result = await this.completionWithFallback(MODEL_ORDER.chat, messages, {
      maxTokens: 2048,
      temperature: 0.2,
    });

    if (result instanceof Response) throw new Error('Unexpected stream for answerQuestion');
    return result.content;
  }

  /** Optional streaming variant for chat/Q&A */
  async answerQuestionStream(
    question: string,
    context: string,
    opts: { signal?: AbortSignal } = {}
  ): Promise<Response> {
    const systemPrompt =
      `You are a helpful AI assistant. Answer the user's question using only the provided context.\n` +
      `If the answer is not in the context, say: "I don’t see that in the provided documents."`;
    const userPrompt = `Context:\n${context}\n\nQuestion: ${question}`;

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    let lastError: unknown;
    for (const model of MODEL_ORDER.chat) {
      try {
        const res = await this.rawCompletionRequest(model, messages, {
          temperature: 0.2,
          maxTokens: 2048,
          stream: true,
          signal: opts.signal,
        });
        if (!(res instanceof Response)) throw new Error('Expected streaming Response');
        return res;
      } catch (err) {
        lastError = err;
        // try next model
      }
    }
    throw lastError ?? new Error('All streaming model attempts failed');
  }
}
