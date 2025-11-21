import { chunkText, mergeChunkedResults } from '../utils/textChunking';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

const MODELS_POOL = [
  'meta-llama/llama-3.3-70b-instruct:free',
  'deepseek/deepseek-r1:free',
  'google/gemini-2.0-flash-exp:free',
  'qwen/qwen-2.5-72b-instruct:free',
  'meta-llama/llama-3.1-70b-instruct:free',
  'mistralai/mistral-7b-instruct:free',
  'meta-llama/llama-3.1-8b-instruct:free',
  'qwen/qwen-2.5-7b-instruct:free',
  'google/gemma-2-9b-it:free',
  'microsoft/phi-4:free',
] as const;

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface CompletionOptions {
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export type ProgressCallback = (progress: number, status?: string) => void;

export class OpenRouterAPI {
  private apiKey: string;

  constructor(apiKey: string) {
    const envKey = (import.meta as any)?.env?.VITE_OPENROUTER_API_KEY;
    this.apiKey = apiKey && apiKey.trim().length > 0 ? apiKey : envKey;
  }

  async generateCompletion(
    messages: ChatMessage[],
    options: CompletionOptions = {}
  ): Promise<string> {
    if (!this.apiKey || this.apiKey.trim().length === 0) {
      throw new Error('OpenRouter API key is missing. Please add it in Settings.');
    }
    const {
      temperature = 0.7,
      maxTokens = 4000,
      stream = false,
    } = options;

    const failures: { model: string; error: string }[] = [];

    for (const model of MODELS_POOL) {
      try {
        const response = await fetch(OPENROUTER_API_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': window.location.origin,
          },
          body: JSON.stringify({
            model,
            messages,
            temperature,
            max_tokens: maxTokens,
            stream,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        const content = data.choices[0]?.message?.content;
        
        if (!content) {
          throw new Error('Empty response from model');
        }
        
        return content;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        failures.push({ model, error: errorMessage });
        console.warn(`Model ${model} failed:`, errorMessage);
        continue;
      }
    }

    const failureDetails = failures.map(f => `${f.model}: ${f.error}`).join('; ');
    throw new Error(`All AI models failed. Details: ${failureDetails}`);
  }

  /**
   * Generate lesson with STRICT anti-hallucination measures
   */
  async generateLesson(
    content: string,
    onProgress?: ProgressCallback,
    _includeQuiz: boolean = true
  ): Promise<string> {
    console.log('[AI] Starting lesson generation with anti-hallucination measures');
    
    if (!content || content.trim().length === 0) {
      throw new Error('No content provided for lesson generation');
    }

    // For short content, process directly
    if (content.length < 3000) {
      onProgress?.(10, 'Processing content...');
      const result = await this.generateLessonChunk(content, 0, 1, null);
      onProgress?.(100, 'Lesson generated!');
      return result;
    }

    // For large content, use chunking with strict anti-hallucination
    const chunks = chunkText(content, {
      maxChunkSize: 3500,
      overlapSize: 400,
      preserveParagraphs: true,
      adaptiveChunking: true,
    });

    console.log(`[AI] Processing ${chunks.length} chunks for lesson generation`);
    const results: string[] = [];
    let previousContext: string | null = null;

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const progress = 10 + ((i / chunks.length) * 80);
      onProgress?.(progress, `Processing section ${i + 1} of ${chunks.length}...`);

      try {
        const result = await this.generateLessonChunk(
          chunk.text,
          chunk.index,
          chunk.total,
          previousContext
        );
        results.push(result);
        
        // Extract last few sentences as context for next chunk
        previousContext = this.extractContextSummary(result);
        
        // Small delay to avoid rate limits
        if (i < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (error) {
        console.error(`[AI] Error processing chunk ${i}:`, error);
        throw error;
      }
    }

    onProgress?.(95, 'Merging sections...');
    const mergedLesson = mergeChunkedResults(results, 'lesson');
    onProgress?.(100, 'Lesson complete!');
    
    return mergedLesson;
  }

  /**
   * Generate lesson for a single chunk with STRICT anti-hallucination prompts
   */
  private async generateLessonChunk(
    content: string,
    chunkIndex: number,
    totalChunks: number,
    previousContext: string | null
  ): Promise<string> {
    const isFirstChunk = chunkIndex === 0;
    const isLastChunk = chunkIndex === totalChunks - 1;

    const contextHint = previousContext 
      ? `\n\nPREVIOUS SECTION CONTEXT: ${previousContext}\nContinue from where the previous section left off. Do NOT repeat information from the previous section.`
      : '';

    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: `You are an expert educational content creator. Your task is to create lessons STRICTLY from the source material provided.

CRITICAL ANTI-HALLUCINATION RULES:
1. Use ONLY information directly stated in the source content
2. Do NOT add examples, facts, or details not present in the source
3. Do NOT make assumptions or inferences beyond what is explicitly stated
4. If information is incomplete, acknowledge it - do NOT fill in gaps
5. Do NOT use your general knowledge to expand on topics
6. Extract and organize ONLY what is actually written in the source
7. When citing facts, ensure they appear verbatim in the source material

Your response must be grounded EXCLUSIVELY in the provided text.`,
      },
      {
        role: 'user',
        content: `${isFirstChunk ? 'START OF CONTENT - ' : ''}${isLastChunk ? 'FINAL SECTION - ' : ''}Create a detailed lesson section from this content (Part ${chunkIndex + 1} of ${totalChunks}):

SOURCE MATERIAL (Use ONLY this information):
${content}${contextHint}

STRICT REQUIREMENTS:
- Use ONLY facts and information explicitly present in the source material above
- Do NOT invent, assume, or add any information not in the source
- Format with markdown: headings (##, ###), **bold**, bullet lists, code blocks
- Include learning objectives ONLY if they can be derived from the source
- Add key takeaways that are DIRECTLY from the source material
- If this is ${isFirstChunk ? 'the first section, include a title and introduction' : 'a middle section, focus on main content'} ${isLastChunk ? 'the final section, include a summary' : ''}
- Do NOT repeat information if context from previous section is provided

Generate the lesson section now using ONLY the source material provided above.`,
      },
    ];

    return this.generateCompletion(messages, { temperature: 0.3, maxTokens: 4000 });
  }

  /**
   * Generate quiz with STRICT anti-hallucination measures
   */
  async generateQuiz(
    content: string,
    numQuestions: number = 10,
    onProgress?: ProgressCallback
  ): Promise<string> {
    console.log('[AI] Starting quiz generation with anti-hallucination measures');
    
    if (!content || content.trim().length === 0) {
      throw new Error('No content provided for quiz generation');
    }

    // For short content, process directly
    if (content.length < 3000) {
      onProgress?.(10, 'Generating quiz questions...');
      const result = await this.generateQuizChunk(content, numQuestions, 0, 1);
      onProgress?.(100, 'Quiz generated!');
      return result;
    }

    // For large content, distribute questions across chunks
    const chunks = chunkText(content, {
      maxChunkSize: 3500,
      overlapSize: 300,
      preserveParagraphs: true,
    });

    const questionsPerChunk = Math.ceil(numQuestions / chunks.length);
    console.log(`[AI] Generating ${questionsPerChunk} questions per chunk across ${chunks.length} chunks`);
    
    const results: string[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const progress = 10 + ((i / chunks.length) * 80);
      const questionsForThisChunk = i === chunks.length - 1 
        ? numQuestions - (questionsPerChunk * i)
        : questionsPerChunk;
      
      onProgress?.(progress, `Generating questions ${i * questionsPerChunk + 1}-${i * questionsPerChunk + questionsForThisChunk}...`);

      try {
        const result = await this.generateQuizChunk(
          chunk.text,
          questionsForThisChunk,
          chunk.index,
          chunk.total
        );
        results.push(result);
        
        if (i < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (error) {
        console.error(`[AI] Error processing chunk ${i}:`, error);
        throw error;
      }
    }

    onProgress?.(95, 'Combining questions...');
    const mergedQuiz = this.mergeQuizResults(results);
    onProgress?.(100, 'Quiz complete!');
    
    return mergedQuiz;
  }

  /**
   * Generate quiz questions for a single chunk with anti-hallucination
   */
  private async generateQuizChunk(
    content: string,
    numQuestions: number,
    chunkIndex: number,
    totalChunks: number
  ): Promise<string> {
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: `You are an expert quiz creator. Generate questions STRICTLY from the source material.

CRITICAL ANTI-HALLUCINATION RULES:
1. Questions must be answerable using ONLY the provided source material
2. Do NOT create questions about topics not explicitly covered in the source
3. All answer options must be based on information in the source
4. Explanations must reference ONLY facts stated in the source
5. Do NOT use external knowledge or common facts not in the source
6. If the source lacks detail on a topic, skip that topic - don't create questions anyway
7. Verify every question, option, and explanation against the source text

Your quiz must be 100% grounded in the provided content.`,
      },
      {
        role: 'user',
        content: `Create ${numQuestions} quiz questions from this content (Section ${chunkIndex + 1} of ${totalChunks}):

SOURCE MATERIAL (Questions must be answerable from ONLY this text):
${content}

STRICT REQUIREMENTS:
- Create questions that can be answered using ONLY the source material above
- All 4 answer options must be plausible and derived from the source context
- The correct answer must be explicitly stated or clearly derivable from the source
- Explanations must cite information ONLY from the source material
- Include a mix of difficulties: beginner, intermediate, advanced
- Do NOT create questions about information not present in the source

Return ONLY a valid JSON array (no markdown fences) with this exact structure:
[{"question": "...", "options": ["A", "B", "C", "D"], "correctIndex": 0, "explanation": "...", "difficulty": "beginner"}]

Generate ${numQuestions} questions now.`,
      },
    ];

    return this.generateCompletion(messages, { temperature: 0.4, maxTokens: 4000 });
  }

  /**
   * Generate flashcards with STRICT anti-hallucination measures
   */
  async generateFlashcards(
    content: string,
    numCards: number = 20,
    onProgress?: ProgressCallback
  ): Promise<string> {
    console.log('[AI] Starting flashcard generation with anti-hallucination measures');
    
    if (!content || content.trim().length === 0) {
      throw new Error('No content provided for flashcard generation');
    }

    // For short content, process directly
    if (content.length < 3000) {
      onProgress?.(10, 'Creating flashcards...');
      const result = await this.generateFlashcardsChunk(content, numCards, 0, 1);
      onProgress?.(100, 'Flashcards generated!');
      return result;
    }

    // For large content, distribute cards across chunks
    const chunks = chunkText(content, {
      maxChunkSize: 3500,
      overlapSize: 300,
      preserveParagraphs: true,
    });

    const cardsPerChunk = Math.ceil(numCards / chunks.length);
    console.log(`[AI] Generating ${cardsPerChunk} flashcards per chunk across ${chunks.length} chunks`);
    
    const results: string[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const progress = 10 + ((i / chunks.length) * 80);
      const cardsForThisChunk = i === chunks.length - 1 
        ? numCards - (cardsPerChunk * i)
        : cardsPerChunk;
      
      onProgress?.(progress, `Creating flashcards ${i * cardsPerChunk + 1}-${i * cardsPerChunk + cardsForThisChunk}...`);

      try {
        const result = await this.generateFlashcardsChunk(
          chunk.text,
          cardsForThisChunk,
          chunk.index,
          chunk.total
        );
        results.push(result);
        
        if (i < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (error) {
        console.error(`[AI] Error processing chunk ${i}:`, error);
        throw error;
      }
    }

    onProgress?.(95, 'Combining flashcards...');
    const mergedFlashcards = this.mergeFlashcardResults(results);
    onProgress?.(100, 'Flashcards complete!');
    
    return mergedFlashcards;
  }

  /**
   * Generate flashcards for a single chunk with anti-hallucination
   */
  private async generateFlashcardsChunk(
    content: string,
    numCards: number,
    chunkIndex: number,
    totalChunks: number
  ): Promise<string> {
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: `You are an expert at creating effective study flashcards. Create flashcards STRICTLY from the source material.

CRITICAL ANTI-HALLUCINATION RULES:
1. Both front and back of cards must use ONLY information from the source
2. Do NOT add definitions, examples, or facts not in the source material
3. Do NOT use your general knowledge to expand or clarify concepts
4. Questions and answers must be directly extractable from the source
5. If a concept is mentioned without detail, create a basic card - don't elaborate
6. Every fact on the back must be explicitly stated in the source
7. Verify each flashcard against the source text before including it

Your flashcards must be 100% grounded in the provided content.`,
      },
      {
        role: 'user',
        content: `Create ${numCards} flashcards from this content (Section ${chunkIndex + 1} of ${totalChunks}):

SOURCE MATERIAL (Flashcards must use ONLY this information):
${content}

STRICT REQUIREMENTS:
- Front: Clear, concise question or prompt based ONLY on source material
- Back: Accurate answer using ONLY information explicitly in the source
- Do NOT add information, examples, or elaborations not in the source
- Focus on key concepts, definitions, and facts actually present in the source
- If the source provides limited detail, keep the answer brief - don't expand
- Do NOT use external knowledge or common definitions

Return ONLY a valid JSON array (no markdown fences) with this exact structure:
[{"front": "What is...?", "back": "Information from source..."}]

Generate ${numCards} flashcards now.`,
      },
    ];

    return this.generateCompletion(messages, { temperature: 0.3, maxTokens: 4000 });
  }

  /**
   * Answer questions using context (for chat)
   */
  async answerQuestion(question: string, context: string): Promise<string> {
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: `You are a helpful AI tutor. Answer questions based STRICTLY on the provided context.

CRITICAL RULES:
1. Answer using ONLY information in the provided context
2. If the answer is not in the context, say "I don't have that information in the provided materials"
3. Do NOT use your general knowledge to answer
4. Be honest about limitations of the context
5. Cite specific parts of the context when answering`,
      },
      {
        role: 'user',
        content: `Context:\n${context}\n\nQuestion: ${question}\n\nAnswer based ONLY on the context above. If the answer is not in the context, say so clearly.`,
      },
    ];

    return this.generateCompletion(messages, { temperature: 0.5 });
  }

  /**
   * Extract last few sentences as context for next chunk
   */
  private extractContextSummary(text: string): string {
    const sentences = text.split(/[.!?]\s+/).filter(s => s.trim().length > 20);
    const lastSentences = sentences.slice(-3).join('. ');
    return lastSentences.substring(0, 200);
  }

  /**
   * Merge quiz results from multiple chunks
   */
  private mergeQuizResults(results: string[]): string {
    try {
      const allQuestions: any[] = [];
      
      for (const result of results) {
        // Extract JSON from the result
        const jsonMatch = result.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          try {
            const questions = JSON.parse(jsonMatch[0]);
            if (Array.isArray(questions)) {
              allQuestions.push(...questions);
            }
          } catch (e) {
            console.warn('[AI] Failed to parse quiz chunk:', e);
          }
        }
      }
      
      return JSON.stringify(allQuestions, null, 2);
    } catch (error) {
      console.error('[AI] Error merging quiz results:', error);
      return results[0] || '[]';
    }
  }

  /**
   * Merge flashcard results from multiple chunks
   */
  private mergeFlashcardResults(results: string[]): string {
    try {
      const allCards: any[] = [];
      
      for (const result of results) {
        // Extract JSON from the result
        const jsonMatch = result.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          try {
            const cards = JSON.parse(jsonMatch[0]);
            if (Array.isArray(cards)) {
              allCards.push(...cards);
            }
          } catch (e) {
            console.warn('[AI] Failed to parse flashcard chunk:', e);
          }
        }
      }
      
      return JSON.stringify(allCards, null, 2);
    } catch (error) {
      console.error('[AI] Error merging flashcard results:', error);
      return results[0] || '[]';
    }
  }
}
