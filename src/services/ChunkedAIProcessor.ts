/**
 * Chunked AI Processing Service
 * Handles large documents by splitting them into chunks and processing them separately
 */

import { chunkText, mergeChunkedResults, TextChunk } from '../utils/textChunking';
import { OpenRouterAPI } from './OpenRouterAPI';

export class ChunkedAIProcessor {
  private api: OpenRouterAPI;

  constructor(apiKey: string) {
    this.api = new OpenRouterAPI(apiKey);
  }

  /**
   * Generate lesson content from large text using chunking
   */
  async generateChunkedLesson(
    text: string,
    difficulty: string,
    onProgress?: (progress: number, message: string) => void
  ): Promise<string> {
    const chunks = chunkText(text);
    
    if (chunks.length === 1) {
      // Small document - process directly
      return this.api.generateLesson(text, difficulty, onProgress);
    }

    onProgress?.(0, `Processing document in ${chunks.length} chunks...`);
    const lessonParts: string[] = [];

    for (const chunk of chunks) {
      const chunkProgress = ((chunk.index + 1) / chunk.total) * 100;
      onProgress?.(
        chunkProgress,
        `Processing chunk ${chunk.index + 1} of ${chunk.total}...`
      );

      const lessonPart = await this.api.generateLesson(
        chunk.text,
        difficulty,
        (partProgress, partMessage) => {
          // Adjust progress to account for overall chunking progress
          const overallProgress = (chunk.index / chunk.total) * 100 + (partProgress / chunk.total);
          onProgress?.(overallProgress, `Chunk ${chunk.index + 1}/${chunk.total}: ${partMessage}`);
        }
      );

      lessonParts.push(lessonPart);
    }

    onProgress?.(95, 'Merging lesson sections...');
    const merged = mergeChunkedResults(lessonParts);
    onProgress?.(100, 'Complete!');

    return merged;
  }

  /**
   * Generate quiz questions from large text using chunking
   */
  async generateChunkedQuiz(
    text: string,
    totalQuestions: number,
    onProgress?: (progress: number, message: string) => void
  ): Promise<string> {
    const chunks = chunkText(text);
    
    if (chunks.length === 1) {
      // Small document - process directly
      return this.api.generateQuiz(text, totalQuestions, onProgress);
    }

    onProgress?.(0, `Processing document in ${chunks.length} chunks...`);
    
    // Distribute questions across chunks based on chunk size
    const questionsPerChunk = Math.ceil(totalQuestions / chunks.length);
    const allQuestions: any[] = [];

    for (const chunk of chunks) {
      const chunkProgress = ((chunk.index + 1) / chunk.total) * 100;
      onProgress?.(
        chunkProgress,
        `Generating questions from chunk ${chunk.index + 1} of ${chunk.total}...`
      );

      try {
        const quizJSON = await this.api.generateQuiz(
          chunk.text,
          questionsPerChunk,
          (partProgress, partMessage) => {
            const overallProgress = (chunk.index / chunk.total) * 100 + (partProgress / chunk.total);
            onProgress?.(overallProgress, `Chunk ${chunk.index + 1}/${chunk.total}: ${partMessage}`);
          }
        );

        // Parse the questions from this chunk
        const parsed = JSON.parse(quizJSON);
        const questions = Array.isArray(parsed) ? parsed : parsed.quiz || parsed.questions || [];
        allQuestions.push(...questions);
      } catch (error) {
        console.error(`Error processing chunk ${chunk.index + 1}:`, error);
      }
    }

    // Take only the requested number of questions
    const finalQuestions = allQuestions.slice(0, totalQuestions);
    onProgress?.(95, `Generated ${finalQuestions.length} questions, finalizing...`);

    onProgress?.(100, 'Complete!');
    return JSON.stringify({ quiz: finalQuestions }, null, 2);
  }

  /**
   * Generate flashcards from large text using chunking
   */
  async generateChunkedFlashcards(
    text: string,
    totalCards: number,
    onProgress?: (progress: number, message: string) => void
  ): Promise<string> {
    const chunks = chunkText(text);
    
    if (chunks.length === 1) {
      // Small document - process directly
      return this.api.generateFlashcards(text, totalCards, onProgress);
    }

    onProgress?.(0, `Processing document in ${chunks.length} chunks...`);
    
    // Distribute cards across chunks
    const cardsPerChunk = Math.ceil(totalCards / chunks.length);
    const allCards: any[] = [];

    for (const chunk of chunks) {
      const chunkProgress = ((chunk.index + 1) / chunk.total) * 100;
      onProgress?.(
        chunkProgress,
        `Generating flashcards from chunk ${chunk.index + 1} of ${chunk.total}...`
      );

      try {
        const cardsJSON = await this.api.generateFlashcards(
          chunk.text,
          cardsPerChunk,
          (partProgress, partMessage) => {
            const overallProgress = (chunk.index / chunk.total) * 100 + (partProgress / chunk.total);
            onProgress?.(overallProgress, `Chunk ${chunk.index + 1}/${chunk.total}: ${partMessage}`);
          }
        );

        // Parse the flashcards from this chunk
        const parsed = JSON.parse(cardsJSON);
        const cards = Array.isArray(parsed) ? parsed : parsed.flashcards || parsed.cards || [];
        allCards.push(...cards);
      } catch (error) {
        console.error(`Error processing chunk ${chunk.index + 1}:`, error);
      }
    }

    // Take only the requested number of cards
    const finalCards = allCards.slice(0, totalCards);
    onProgress?.(95, `Generated ${finalCards.length} flashcards, finalizing...`);

    onProgress?.(100, 'Complete!');
    return JSON.stringify({ flashcards: finalCards }, null, 2);
  }

  /**
   * Answer questions using chunked context
   */
  async answerQuestionWithContext(
    question: string,
    context: string,
    onProgress?: (progress: number, message: string) => void
  ): Promise<string> {
    const chunks = chunkText(context, { maxChunkSize: 6000 }); // Larger chunks for Q&A
    
    if (chunks.length === 1) {
      // Small context - process directly
      return this.api.answerQuestion(question, context);
    }

    onProgress?.(0, `Searching through ${chunks.length} document sections...`);
    
    // For Q&A, we search through chunks and use the most relevant one
    // Or we can combine answers from multiple chunks
    const answers: string[] = [];

    for (const chunk of chunks) {
      const chunkProgress = ((chunk.index + 1) / chunk.total) * 100;
      onProgress?.(
        chunkProgress,
        `Analyzing section ${chunk.index + 1} of ${chunk.total}...`
      );

      try {
        const answer = await this.api.answerQuestion(question, chunk.text);
        answers.push(answer);
      } catch (error) {
        console.error(`Error processing chunk ${chunk.index + 1}:`, error);
      }
    }

    onProgress?.(95, 'Synthesizing final answer...');

    // If we got multiple answers, combine them intelligently
    if (answers.length > 1) {
      const combinedContext = answers.map((a, i) => `From section ${i + 1}:\n${a}`).join('\n\n');
      const finalAnswer = await this.api.answerQuestion(
        `Based on these insights from different sections, provide a comprehensive answer to: "${question}"\n\n${combinedContext}`,
        ''
      );
      onProgress?.(100, 'Complete!');
      return finalAnswer;
    }

    onProgress?.(100, 'Complete!');
    return answers[0] || 'I could not find relevant information to answer this question.';
  }
}
