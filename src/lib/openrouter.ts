const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

const MODELS_POOL = [
  'meta-llama/llama-3.1-8b-instruct:free',
  'qwen/qwen-2.5-32b-instruct:free',
  'google/gemma-2-9b-it:free',
  'mistralai/mistral-7b-instruct:free',
  'deepseek/deepseek-r1:free',
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

export class OpenRouterAPI {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateCompletion(
    messages: ChatMessage[],
    options: CompletionOptions = {}
  ): Promise<string> {
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

  async generateLesson(content: string): Promise<string> {
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: 'You are an expert educational content creator. Generate comprehensive, well-structured lessons from the provided content.',
      },
      {
        role: 'user',
        content: `Create a detailed lesson from this content:\n\n${content}\n\nFormat the lesson with:\n1. Title\n2. Learning objectives\n3. Main content with sections\n4. Key takeaways\n5. Summary`,
      },
    ];

    return this.generateCompletion(messages, { temperature: 0.7 });
  }

  async generateQuiz(content: string, numQuestions: number = 10): Promise<string> {
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: 'You are an expert quiz creator. Generate diverse, educational quiz questions with explanations.',
      },
      {
        role: 'user',
        content: `Create ${numQuestions} quiz questions from this content:\n\n${content}\n\nReturn a JSON array of objects with: question, options (array), correctIndex, explanation, difficulty (beginner/intermediate/advanced)`,
      },
    ];

    return this.generateCompletion(messages, { temperature: 0.6 });
  }

  async generateFlashcards(content: string, numCards: number = 20): Promise<string> {
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: 'You are an expert at creating effective study flashcards using spaced repetition principles.',
      },
      {
        role: 'user',
        content: `Create ${numCards} flashcards from this content:\n\n${content}\n\nReturn a JSON array of objects with: front, back`,
      },
    ];

    return this.generateCompletion(messages, { temperature: 0.5 });
  }
}
