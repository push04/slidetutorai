/**
 * Chunked AI Processing Service
 * Handles large documents by splitting them into chunks and processing them separately
 */

import { OpenRouterAPI, ProgressCallback } from './OpenRouterAPI';

export class ChunkedAIProcessor {
  private api: OpenRouterAPI;

  constructor(apiKey: string) {
    this.api = new OpenRouterAPI(apiKey);
  }

  /**
   * Generate lesson content from large text using chunking
   * Note: The OpenRouterAPI handles the lesson generation internally, no difficulty param needed
   */
  async generateChunkedLesson(
    text: string,
    _difficulty: string,
    onProgress?: ProgressCallback
  ): Promise<string> {
    // Note: difficulty param is kept for API compatibility but not used 
    // The OpenRouterAPI.generateLesson handles this internally
    return this.api.generateLesson(text, onProgress);
  }

  /**
   * Generate quiz questions from large text using chunking
   * Note: OpenRouterAPI handles chunking internally
   */
  async generateChunkedQuiz(
    text: string,
    totalQuestions: number,
    onProgress?: ProgressCallback
  ): Promise<string> {
    // OpenRouterAPI.generateQuiz handles chunking internally
    return this.api.generateQuiz(text, totalQuestions, onProgress);
  }

  /**
   * Generate flashcards from large text using chunking
   * Note: OpenRouterAPI handles chunking internally
   */
  async generateChunkedFlashcards(
    text: string,
    totalCards: number,
    onProgress?: ProgressCallback
  ): Promise<string> {
    // OpenRouterAPI.generateFlashcards handles chunking internally
    return this.api.generateFlashcards(text, totalCards, onProgress);
  }

  /**
   * Answer questions using context
   * Note: OpenRouterAPI handles chunking internally if needed
   */
  async answerQuestionWithContext(
    question: string,
    context: string,
    _onProgress?: ProgressCallback
  ): Promise<string> {
    // OpenRouterAPI.answerQuestion can handle the context directly
    return this.api.answerQuestion(question, context);
  }
}
