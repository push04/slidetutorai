import React, { useReducer, useMemo, useEffect, memo, useState } from 'react';
import { CreditCard, Wand2, Download, Play, RotateCcw, CheckCircle, BookOpen, Youtube, FileDown } from 'lucide-react';
import { Upload } from '../services/FileProcessor';
import { ChunkedAIProcessor } from '../services/ChunkedAIProcessor';
import { useFlashcards, updateCardWithSM2 } from '../contexts/FlashcardContext';
import { extractJSONFromResponse } from '../services/lessonParser';
import { ProgressIndicator } from './ProgressIndicator';
import { fetchYouTubeData } from '../utils/youtubeUtils';
import { exportFlashcardsAsPDF } from '../utils/exportUtils';
import { cn } from '../lib/utils';
import toast from 'react-hot-toast';

// ================================================================================================
// 1. STATE MANAGEMENT
// ================================================================================================

type State = {
  selectedUploadId: string;
  sourceType: 'document' | 'youtube';
  youtubeUrl: string;
  cardCount: number;
  isGenerating: boolean;
  isStudyMode: boolean;
  error: string | null;
  generationProgress: number;
  generationMessage: string;
};

type Action =
  | { type: 'SET_FIELD'; field: keyof State; payload: any }
  | { type: 'START_GENERATION' }
  | { type: 'UPDATE_PROGRESS'; progress: number; message: string }
  | { type: 'GENERATION_COMPLETE'; error?: string };

const initialState: State = {
  selectedUploadId: '',
  sourceType: 'document',
  youtubeUrl: '',
  cardCount: 10,
  isGenerating: false,
  isStudyMode: false,
  error: null,
  generationProgress: 0,
  generationMessage: '',
};

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, [action.field]: action.payload, error: null };
    case 'START_GENERATION':
      return { ...state, isGenerating: true, error: null, generationProgress: 0, generationMessage: 'Starting...' };
    case 'UPDATE_PROGRESS':
      return { ...state, generationProgress: action.progress, generationMessage: action.message };
    case 'GENERATION_COMPLETE':
      return { ...state, isGenerating: false, error: action.error || null, generationProgress: 100 };
    default:
      return state;
  }
};

// ================================================================================================
// 2. UI SUB-COMPONENTS
// ================================================================================================

interface DashboardProps {
  uploads: Upload[];
  state: State;
  dispatch: React.Dispatch<Action>;
  onGenerate: () => void;
  onStartStudy: () => void;
}

const FlashcardDashboard = memo(({ uploads, state, dispatch, onGenerate, onStartStudy }: DashboardProps) => {
  const { state: { dueCards, cards } } = useFlashcards();
  const processedUploads = useMemo(() => uploads.filter(u => u.processed), [uploads]);
  
  const handleExportPDF = () => {
    if (cards.length === 0) {
      toast.error('No flashcards to export');
      return;
    }
    const timestamp = new Date().toISOString().slice(0, 10);
    exportFlashcardsAsPDF(cards, `flashcards-${timestamp}.pdf`);
    toast.success('PDF export started!');
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card border border-border/40 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 text-center group">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-indigo-500/30 group-hover:shadow-xl group-hover:shadow-indigo-500/40 transition-all duration-300">
            <CreditCard className="w-7 h-7 text-white" />
          </div>
          <h3 className="text-3xl font-bold text-foreground mb-1">{cards.length}</h3>
          <p className="text-muted-foreground font-medium">Total Cards</p>
        </div>
        <div className="glass-card border border-border/40 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 text-center group">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-emerald-500/30 group-hover:shadow-xl group-hover:shadow-emerald-500/40 transition-all duration-300">
            <RotateCcw className="w-7 h-7 text-white" />
          </div>
          <h3 className="text-3xl font-bold text-foreground mb-1">{dueCards.length}</h3>
          <p className="text-muted-foreground font-medium">Due for Review</p>
        </div>
        <div className="glass-card border border-border/40 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 text-center group">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-purple-500/30 group-hover:shadow-xl group-hover:shadow-purple-500/40 transition-all duration-300">
            <CheckCircle className="w-7 h-7 text-white" />
          </div>
          <h3 className="text-3xl font-bold text-foreground mb-1">{cards.length - dueCards.length}</h3>
          <p className="text-muted-foreground font-medium">Mastered</p>
        </div>
      </div>
      <div className="glass-card border border-border/40 rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300">
        <div className="mb-6">
          <h3 className="text-xl font-bold text-foreground mb-2">Generate Flashcards</h3>
          <p className="text-muted-foreground text-sm">Create smart flashcards with spaced repetition</p>
        </div>
        
        {/* Source Type Toggle */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => dispatch({ type: 'SET_FIELD', field: 'sourceType', payload: 'document' })}
            className={cn(
              "flex-1 px-4 py-3 rounded-xl font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2",
              state.sourceType === 'document'
                ? "bg-gradient-to-r from-primary to-secondary text-white shadow-lg shadow-primary/30"
                : "glass-card border border-border/50 text-muted-foreground hover:border-primary/50 hover:text-foreground"
            )}
          >
            <BookOpen className="w-4 h-4" />
            Document
          </button>
          <button
            onClick={() => dispatch({ type: 'SET_FIELD', field: 'sourceType', payload: 'youtube' })}
            className={cn(
              "flex-1 px-4 py-3 rounded-xl font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2",
              state.sourceType === 'youtube'
                ? "bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg shadow-red-500/30"
                : "glass-card border border-border/50 text-muted-foreground hover:border-red-500/50 hover:text-foreground"
            )}
          >
            <Youtube className="w-4 h-4" />
            YouTube
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {state.sourceType === 'document' ? (
            <div>
              <label className="block text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-primary" />
                Select Document
              </label>
              <select
                value={state.selectedUploadId}
                onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'selectedUploadId', payload: e.target.value })}
                className="w-full px-5 py-3.5 glass-card border border-border/50 rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200 text-foreground bg-background/50 hover:border-primary/30 cursor-pointer"
                disabled={processedUploads.length === 0}
              >
                <option value="">{processedUploads.length > 0 ? 'Choose a document...' : 'No documents processed'}</option>
                {processedUploads.map((u) => <option key={u.id} value={u.id}>{u.filename}</option>)}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <Youtube className="w-4 h-4 text-red-500" />
                YouTube URL
              </label>
              <input
                type="url"
                value={state.youtubeUrl}
                onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'youtubeUrl', payload: e.target.value })}
                placeholder="https://youtube.com/watch?v=..."
                className="w-full px-5 py-3.5 glass-card border border-border/50 rounded-xl focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all duration-200 text-foreground bg-background/50 hover:border-red-500/30"
              />
            </div>
          )}
          
          <div>
            <label className="block text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-primary" />
              Number of Cards
            </label>
            <select value={state.cardCount} onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'cardCount', payload: parseInt(e.target.value) })} className="w-full px-5 py-3.5 glass-card border border-border/50 rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200 text-foreground bg-background/50 hover:border-primary/30 cursor-pointer">
              {[5, 10, 15, 20, 25].map(c => <option key={c} value={c}>{c} cards</option>)}
            </select>
          </div>
        </div>
        
        {state.isGenerating && (
          <div className="mb-6">
            <ProgressIndicator 
              progress={state.generationProgress} 
              message={state.generationMessage} 
            />
          </div>
        )}
        
        <div className="flex flex-wrap gap-4">
          <button onClick={onGenerate} disabled={(state.sourceType === 'document' ? !state.selectedUploadId : !state.youtubeUrl.trim()) || state.isGenerating} className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:shadow-xl hover:shadow-indigo-500/30 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center gap-2.5 font-semibold shadow-lg">
            <Wand2 className="w-5 h-5" />
            {state.isGenerating ? `Generating... ${Math.round(state.generationProgress)}%` : 'Generate Cards'}
          </button>
          <button onClick={onStartStudy} disabled={dueCards.length === 0} className="px-8 py-4 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl hover:shadow-xl hover:shadow-emerald-500/30 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center gap-2.5 font-semibold shadow-lg">
            <Play className="w-5 h-5" />
            Study ({dueCards.length} due)
          </button>
          <button onClick={handleExportPDF} disabled={cards.length === 0} className="px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl hover:shadow-xl hover:shadow-blue-500/30 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center gap-2.5 font-semibold shadow-lg">
            <FileDown className="w-5 h-5" />
            Export PDF
          </button>
        </div>
      </div>
    </div>
  );
});

const StudySession = memo(({ onReview, onEndSession }: { onReview: (id: string, quality: number) => void; onEndSession: () => void; }) => {
  const { state: { dueCards } } = useFlashcards();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);

  // Effect to reset the session if the underlying due cards change. This prevents crashes.
  useEffect(() => {
    setCurrentIndex(0);
    setShowAnswer(false);
  }, [dueCards]);

  const currentCard = dueCards[currentIndex];

  if (!currentCard) {
    return (
      <div className="text-center p-8">
        <h2 className="text-2xl font-bold">Session Complete!</h2>
        <button onClick={onEndSession} className="mt-4 px-6 py-3 bg-secondary text-white rounded-lg">Return to Dashboard</button>
      </div>
    );
  }

  const handleReview = (quality: number) => {
    onReview(currentCard.id, quality);
    if (currentIndex < dueCards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setShowAnswer(false);
    } else {
      onEndSession();
    }
  };

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-foreground">Study Session</h1>
        <p className="text-lg text-muted-foreground">Card {currentIndex + 1} of {dueCards.length}</p>
        <div className="w-full bg-muted rounded-full h-2 mt-2">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 h-2 rounded-full transition-all duration-300" style={{ width: `${((currentIndex + 1) / dueCards.length) * 100}%` }} />
        </div>
      </div>
      <div className="glass-card border border-border/40 rounded-2xl p-8 shadow-xl">
        <div className="text-center mb-8 min-h-[100px] flex items-center justify-center">
          <p className="text-xl text-foreground font-medium">{currentCard.question}</p>
        </div>
        {!showAnswer ? (
          <button onClick={() => setShowAnswer(true)} className="w-full px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:shadow-xl hover:shadow-indigo-500/30 hover:scale-105 active:scale-95 transition-all duration-300 text-lg font-semibold shadow-lg">
            Show Answer
          </button>
        ) : (
          <div>
            <div className="mb-8 bg-gradient-to-br from-muted/50 to-muted rounded-xl p-6 min-h-[100px] flex items-center justify-center border border-border/30">
              <p className="text-lg text-foreground font-medium">{currentCard.answer}</p>
            </div>
            <p className="text-muted-foreground mb-4 text-center">How well did you know this?</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <button onClick={() => handleReview(1)} className="px-4 py-3 bg-error/10 text-error rounded-lg hover:bg-error/20">Again</button>
              <button onClick={() => handleReview(3)} className="px-4 py-3 bg-warning/10 text-warning rounded-lg hover:bg-warning/20">Hard</button>
              <button onClick={() => handleReview(4)} className="px-4 py-3 bg-secondary/10 text-secondary rounded-lg hover:bg-secondary/20">Good</button>
              <button onClick={() => handleReview(5)} className="px-4 py-3 bg-success/10 text-success rounded-lg hover:bg-success/20">Easy</button>
            </div>
          </div>
        )}
      </div>
      <div className="text-center">
        <button onClick={onEndSession} className="px-4 py-2 text-muted-foreground hover:text-foreground">End Study Session</button>
      </div>
    </div>
  );
});

// ================================================================================================
// 3. MAIN COMPONENT
// ================================================================================================

interface FlashcardManagerProps {
  uploads: Upload[];
  apiKey?: string;
}

export const FlashcardManager: React.FC<FlashcardManagerProps> = ({ uploads, apiKey }) => {
  const { state: flashcardState, dispatch: flashcardDispatch } = useFlashcards();
  const [state, dispatch] = useReducer(reducer, initialState);

  const processedUploads = useMemo(() => uploads.filter((u: Upload) => u.processed && u.status === 'completed'), [uploads]);
  const selectedUpload = useMemo(() => processedUploads.find((u: Upload) => u.id === state.selectedUploadId), [processedUploads, state.selectedUploadId]);

  useEffect(() => {
    flashcardDispatch({ type: 'UPDATE_DUE_CARDS' });
  }, [flashcardState.cards, flashcardDispatch]);

  const handleGenerate = async () => {
    if (!apiKey) {
      const errorMsg = 'API key is missing. Please add it in Settings.';
      dispatch({ type: 'GENERATION_COMPLETE', error: errorMsg });
      toast.error(errorMsg);
      return;
    }

    let sourceText = '';

    dispatch({ type: 'START_GENERATION' });
    try {
      // Get source text from document or YouTube
      if (state.sourceType === 'document') {
        if (!selectedUpload) {
          const errorMsg = 'Please select a processed document first.';
          dispatch({ type: 'GENERATION_COMPLETE', error: errorMsg });
          toast.error(errorMsg);
          return;
        }
        if (!selectedUpload.fullText || selectedUpload.fullText.trim() === '') {
          const errorMsg = 'The selected document appears to be empty.';
          dispatch({ type: 'GENERATION_COMPLETE', error: errorMsg });
          toast.error(errorMsg);
          return;
        }
        sourceText = selectedUpload.fullText;
      } else {
        // YouTube source
        if (!state.youtubeUrl.trim()) {
          const errorMsg = 'Please enter a YouTube URL.';
          dispatch({ type: 'GENERATION_COMPLETE', error: errorMsg });
          toast.error(errorMsg);
          return;
        }
        
        try {
          dispatch({ type: 'UPDATE_PROGRESS', progress: 5, message: 'Validating YouTube URL...' });
          
          dispatch({ type: 'UPDATE_PROGRESS', progress: 10, message: 'Fetching video information...' });
          const ytData = await fetchYouTubeData(state.youtubeUrl);
          
          dispatch({ type: 'UPDATE_PROGRESS', progress: 25, message: `Found: "${ytData.title}"` });
          toast.success(`Found: "${ytData.title}"`);
          
          // Check if we got a real transcript or need to use AI fallback
          if (ytData.hasTranscript && ytData.transcript.length > 100) {
            sourceText = ytData.transcript;
            dispatch({ type: 'UPDATE_PROGRESS', progress: 30, message: `Processing ${Math.round(ytData.transcript.length / 1000)}K characters of content...` });
          } else {
            // No transcript available - generate AI flashcards based on video title
            sourceText = `Create flashcards about: "${ytData.title}"\n\nThis is a YouTube video. Since the transcript is not available, create flashcards covering what this video likely teaches based on the title.`;
            dispatch({ type: 'UPDATE_PROGRESS', progress: 30, message: 'Transcript unavailable - generating flashcards from video title...' });
          }
        } catch (ytError: any) {
          const errorMsg = ytError.message || 'Failed to fetch YouTube data';
          dispatch({ type: 'GENERATION_COMPLETE', error: errorMsg });
          toast.error(errorMsg);
          console.error('YouTube fetch error:', ytError);
          return;
        }
      }
      
      // Validate source text
      if (!sourceText || sourceText.trim().length < 50) {
        const errorMsg = 'Source content is too short to generate flashcards.';
        dispatch({ type: 'GENERATION_COMPLETE', error: errorMsg });
        toast.error(errorMsg);
        return;
      }

      console.log('Starting flashcard generation with', sourceText.length, 'characters');
      const processor = new ChunkedAIProcessor(apiKey);
      const response = await processor.generateChunkedFlashcards(sourceText, state.cardCount, (progress, message) => {
        console.log('Progress update:', progress, message);
        dispatch({ type: 'UPDATE_PROGRESS', progress: progress || 0, message: message || 'Processing...' });
      });
      
      console.log('Flashcard generation response received:', response?.substring(0, 100));
      const parsed = extractJSONFromResponse(response);
      
      let flashcardArray: any[] | null = null;
      if (parsed) {
        if (Array.isArray(parsed)) {
          flashcardArray = parsed;
        } else if (typeof parsed === 'object' && parsed !== null) {
          const keyWithArray = Object.keys(parsed).find(k => Array.isArray((parsed as any)[k]));
          if (keyWithArray) {
            flashcardArray = (parsed as any)[keyWithArray];
          }
        }
      }

      if (!flashcardArray) {
        throw new Error('AI response was not a valid JSON array. The model may be experiencing issues. Please try again.');
      }

      const newFlashcards = flashcardArray.map((card: any) => ({
        uploadId: state.sourceType === 'document' ? state.selectedUploadId : `youtube-${Date.now()}`,
        question: card.question || 'No Question Provided',
        answer: card.answer || 'No Answer Provided',
      }));
      
      console.log('Generated', newFlashcards.length, 'flashcards');
      flashcardDispatch({ type: 'ADD_CARDS', payload: newFlashcards });
      dispatch({ type: 'GENERATION_COMPLETE' });
      toast.success(`Successfully generated ${newFlashcards.length} flashcards!`);

    } catch (error: any) {
      const errorMsg = error.message || 'Failed to generate flashcards';
      console.error('Flashcard generation error:', error);
      dispatch({ type: 'GENERATION_COMPLETE', error: errorMsg });
      toast.error(errorMsg);
    }
  };
  
  const handleReviewCard = (cardId: string, quality: number) => {
    const card = flashcardState.cards.find(c => c.id === cardId);
    if (card) {
      const updates = updateCardWithSM2(card, quality);
      flashcardDispatch({ type: 'UPDATE_CARD', payload: { cardId, updates } });
    }
  };

  if (state.isStudyMode) {
    return <StudySession 
              onReview={handleReviewCard} 
              onEndSession={() => dispatch({ type: 'SET_FIELD', field: 'isStudyMode', payload: false })} 
           />;
  }

  return (
    <div className="space-y-8">
        <div className="text-center">
            <h1 className="text-3xl font-bold text-foreground">Flashcard Management</h1>
            <p className="text-lg text-muted-foreground">Generate, study, and manage flashcards with spaced repetition.</p>
        </div>
        {state.error && <div className="text-center text-sm text-rose-600 bg-rose-50 p-3 rounded-lg">{state.error}</div>}
        <FlashcardDashboard
          uploads={processedUploads}
          state={state}
          dispatch={dispatch}
          onGenerate={handleGenerate}
          onStartStudy={() => dispatch({ type: 'SET_FIELD', field: 'isStudyMode', payload: true })}
        />
    </div>
  );
};

export default FlashcardManager;

