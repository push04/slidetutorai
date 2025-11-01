import React, { createContext, useContext, useReducer, useEffect, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { updateCardWithSM2 } from '../services/sm2';

// ================================================================================================
// 1. TYPES & HELPERS
// ================================================================================================

export interface Flashcard {
  id: string;
  uploadId: string;
  question: string;
  answer: string;
  // SM-2 Algorithm properties
  easiness: number;
  interval: number;
  repetitions: number;
  nextReview: number;
}

interface FlashcardState {
  cards: Flashcard[];
  dueCards: Flashcard[];
}

const getDueCards = (cards: Flashcard[]): Flashcard[] => {
  const now = Date.now();
  return cards.filter(card => card.nextReview <= now);
};

// ================================================================================================
// 2. STATE MANAGEMENT (useReducer with Action Creators)
// ================================================================================================

const flashcardActions = {
  addCards: (cards: Omit<Flashcard, 'id' | 'easiness' | 'interval' | 'repetitions' | 'nextReview'>[]) => ({ type: 'ADD_CARDS', payload: cards } as const),
  updateCard: (cardId: string, updates: Partial<Flashcard>) => ({ type: 'UPDATE_CARD', payload: { cardId, updates } } as const),
  loadCards: (cards: Flashcard[]) => ({ type: 'LOAD_CARDS', payload: cards } as const),
  updateDueCards: () => ({ type: 'UPDATE_DUE_CARDS' } as const),
};

type FlashcardAction = ReturnType<typeof flashcardActions[keyof typeof flashcardActions]>;

const flashcardReducer = (state: FlashcardState, action: FlashcardAction): FlashcardState => {
  switch (action.type) {
    case 'ADD_CARDS': {
      const newCards = action.payload.map(card => ({
        ...card,
        id: uuidv4(),
        easiness: 2.5,
        interval: 0,
        repetitions: 0,
        nextReview: Date.now(),
      }));
      const allCards = [...state.cards, ...newCards];
      return { ...state, cards: allCards, dueCards: getDueCards(allCards) };
    }
    case 'UPDATE_CARD': {
      const updatedCards = state.cards.map(card =>
        card.id === action.payload.cardId ? { ...card, ...action.payload.updates } : card
      );
      return { ...state, cards: updatedCards, dueCards: getDueCards(updatedCards) };
    }
    case 'LOAD_CARDS': {
      return { ...state, cards: action.payload, dueCards: getDueCards(action.payload) };
    }
    case 'UPDATE_DUE_CARDS': {
      return { ...state, dueCards: getDueCards(state.cards) };
    }
    default:
      return state;
  }
};

// ================================================================================================
// 3. CONTEXT PROVIDER & HOOK
// ================================================================================================

type FlashcardContextType = {
  state: FlashcardState;
  dispatch: React.Dispatch<FlashcardAction>;
};

const FlashcardContext = createContext<FlashcardContextType | null>(null);

const initializer = (): FlashcardState => {
  try {
    const saved = localStorage.getItem('slidetutor_flashcards');
    const cards = saved ? JSON.parse(saved) : [];
    return { cards, dueCards: getDueCards(cards) };
  } catch (error) {
    console.error('Failed to load flashcards from localStorage:', error);
    return { cards: [], dueCards: [] };
  }
};

export const FlashcardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(flashcardReducer, undefined, initializer);

  // Save cards to localStorage whenever they change.
  useEffect(() => {
    try {
      localStorage.setItem('slidetutor_flashcards', JSON.stringify(state.cards));
    } catch (error) {
      console.error('Failed to save flashcards to localStorage:', error);
    }
  }, [state.cards]);

  // Memoize the context value to prevent unnecessary re-renders of consumers.
  const contextValue = useMemo(() => ({ state, dispatch }), [state, dispatch]);

  return (
    <FlashcardContext.Provider value={contextValue}>
      {children}
    </FlashcardContext.Provider>
  );
};

export const useFlashcards = (): FlashcardContextType => {
  const context = useContext(FlashcardContext);
  if (!context) {
    throw new Error('useFlashcards must be used within a FlashcardProvider');
  }
  return context;
};

// Re-export the SM-2 algorithm for convenience
export { updateCardWithSM2 };
