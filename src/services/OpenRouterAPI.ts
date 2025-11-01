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
      const maxAttempts = 3;

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
          await new Promise((r) => setTimeout(r, 400 * attempt)); // 400ms, 800ms
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
    onProgress?: ProgressCallback
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
      // Process as single chunk
      onProgress?.(10, 'Generating lesson...');
      const result = await this.generateSingleLesson(content);
      onProgress?.(100, 'Complete!');
      return result;
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

      const chunkLesson = await this.generateSingleLesson(chunk.text, contextHint);
      chunkResults.push(chunkLesson);
      
      // Extract a brief summary of what was covered for the next chunk
      if (i < chunks.length - 1) {
        const lines = chunkLesson.split('\n').filter(line => line.trim());
        const headings = lines.filter(line => line.startsWith('#'));
        previousSummary = headings.slice(0, 5).join(', ') || 'previous content';
      }
    }

    onProgress?.(95, 'Merging results...');
    const mergedLesson = mergeChunkedResults(chunkResults);
    onProgress?.(100, 'Complete!');

    return mergedLesson;
  }

  private async generateSingleLesson(
    content: string,
    contextHint?: string
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
      : `You are an expert educator and curriculum designer specializing in creating engaging, comprehensive lessons.\n\n` +
        `Your task: Transform the provided content into a well-structured educational lesson that is easy to understand for everyone.\n\n` +
        `Required Structure:\n` +
        `# [Clear, Descriptive Title]\n\n` +
        `## Overview\n` +
        `Brief introduction (2-3 sentences) explaining what you'll learn and why it matters.\n\n` +
        `## Core Concepts\n` +
        `### Fundamental Ideas\n` +
        `Explain the main concepts in simple, clear language with real-world analogies and examples.\n` +
        `Break down complex ideas into digestible pieces.\n\n` +
        `### How It Works\n` +
        `Step-by-step explanation of processes and mechanisms.\n` +
        `Use numbered lists for sequential steps and bullet points for related items.\n\n` +
        `### Practical Examples\n` +
        `Provide concrete, relatable examples that demonstrate the concepts in action.\n` +
        `Show real-world applications and use cases.\n\n` +
        `## Key Points to Remember\n` +
        `Highlight the most important takeaways (3-7 bullet points).\n` +
        `Focus on what learners absolutely need to understand.\n\n` +
        `## Common Questions & Tips\n` +
        `Address frequent misconceptions and provide helpful tips.\n` +
        `Offer practical advice for applying the knowledge.\n\n` +
        `## Summary\n` +
        `Concise recap of what was covered (3-5 bullet points).\n\n` +
        `Use markdown formatting with rich styling:\n` +
        `- Use **bold** for emphasis on key terms\n` +
        `- Use \`code\` for technical terms and code snippets\n` +
        `- Use > blockquotes for important notes and warnings\n` +
        `- Use numbered lists for sequential steps\n` +
        `- Use bullet points for related items\n` +
        `- Use code blocks with language tags for code examples\n` +
        `- Use tables when comparing or listing structured information\n\n` +
        `Make it visually appealing, comprehensive yet clear, and explain everything in a way that anyone can understand.`;

    const userPrompt = contextHint
      ? `${contextHint}\n\n${content}`
      : `Create an engaging, comprehensive lesson from this content:\n\n${content}`;

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    const result = await this.completionWithFallback(MODEL_ORDER.lesson, messages, {
      maxTokens: 4096,
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
      onProgress?.(10, 'Generating quiz questions...');
      const result = await this.generateSingleQuiz(content, questionCount);
      onProgress?.(100, 'Complete!');
      return result;
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
      onProgress?.(10, 'Generating flashcards...');
      const result = await this.generateSingleFlashcardSet(content, cardCount);
      onProgress?.(100, 'Complete!');
      console.log('[OpenRouterAPI] Single-chunk generation complete');
      return result;
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
