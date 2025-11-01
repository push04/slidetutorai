import type { Flashcard } from '../contexts/FlashcardContext';

/**
 * Implements the SM-2 spaced repetition algorithm to calculate the next review date for a flashcard.
 * @param card The flashcard to update.
 *- @param quality The user's recall quality (0-5, where 5 is perfect recall).
 * @returns An object with the updated easiness factor, interval, repetitions count, and next review timestamp.
 */
export function updateCardWithSM2(card: Flashcard, quality: number): Partial<Flashcard> {
  if (quality < 0 || quality > 5) {
    throw new Error('Quality must be between 0 and 5.');
  }

  let { easiness, interval, repetitions } = card;

  if (quality < 3) {
    // If recall was poor, reset repetitions and interval
    repetitions = 0;
    interval = 1;
  } else {
    // If recall was good
    repetitions += 1;
    if (repetitions === 1) {
      interval = 1;
    } else if (repetitions === 2) {
      interval = 6;
    } else {
      interval = Math.round(interval * easiness);
    }
  }

  // Update the easiness factor
  easiness += 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02);
  // The easiness factor should not be less than 1.3
  easiness = Math.max(1.3, easiness);

  // Calculate next review date in milliseconds
  const millisecondsInADay = 24 * 60 * 60 * 1000;
  const nextReview = Date.now() + interval * millisecondsInADay;

  return { easiness, interval, repetitions, nextReview };
}
