import React, { useEffect, useMemo, useReducer, memo, useState } from 'react';
import { BookOpen, Wand2, Copy, RefreshCw, Bookmark, BookmarkCheck, StickyNote, CheckCircle2, Circle, Clock3, Youtube } from 'lucide-react';
import type { Upload } from '../services/FileProcessor';
import { ChunkedAIProcessor } from '../services/ChunkedAIProcessor';
import { extractJSONFromResponse } from '../services/lessonParser';
import { fetchYouTubeData } from '../utils/youtubeUtils';
import { cn } from '../lib/utils';
import { ProgressIndicator } from './ProgressIndicator';
import { MarkdownRenderer } from './MarkdownRenderer';
import toast from 'react-hot-toast';

// ================================================================================================
// 1. CONFIGURATION & TYPES
// ================================================================================================

const LESSON_CONFIG = {
  wordsPerMinute: 200,
};

interface LessonGeneratorProps {
  uploads: Upload[];
  apiKey: string;
}

interface ParsedLesson {
  title?: string;
  levels?: Record<'Beginner' | 'Intermediate' | 'Advanced', {
    explanation?: string;
    worked_example?: string;
    tips?: string[];
  }>;
  short_quiz?: Array<{ question: string; answer: string }>;
}

// ================================================================================================
// 2. STATE MANAGEMENT (useReducer)
// ================================================================================================

type State = {
  selectedUploadId: string;
  isGenerating: boolean;
  generationProgress: number;
  generationMessage: string;
  lessonContent: string;
  parsedLesson: ParsedLesson | null;
  error: string | null;
  showMarkdown: boolean;
  showStructured: boolean;
  sourceType: 'document' | 'youtube';
  youtubeUrl: string;
};

type Action =
  | { type: 'SET_SELECTED_UPLOAD'; payload: string }
  | { type: 'SET_SOURCE_TYPE'; payload: 'document' | 'youtube' }
  | { type: 'SET_YOUTUBE_URL'; payload: string }
  | { type: 'START_GENERATION' }
  | { type: 'UPDATE_PROGRESS'; payload: { progress: number; message: string } }
  | { type: 'GENERATION_SUCCESS'; payload: { raw: string; parsed: ParsedLesson | null } }
  | { type: 'GENERATION_FAILURE'; payload: string }
  | { type: 'TOGGLE_VIEW'; payload: 'markdown' | 'structured' }
  | { type: 'CLEAR' };

const initialState: State = {
  selectedUploadId: '',
  isGenerating: false,
  generationProgress: 0,
  generationMessage: '',
  lessonContent: '',
  parsedLesson: null,
  error: null,
  showMarkdown: true,
  showStructured: true,
  sourceType: 'document',
  youtubeUrl: '',
};

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'SET_SELECTED_UPLOAD':
      return { ...state, selectedUploadId: action.payload };
    case 'SET_SOURCE_TYPE':
      return { ...state, sourceType: action.payload, selectedUploadId: '', youtubeUrl: '', error: null };
    case 'SET_YOUTUBE_URL':
      return { ...state, youtubeUrl: action.payload, error: null };
    case 'START_GENERATION':
      return { ...state, isGenerating: true, generationProgress: 0, generationMessage: 'Initializing...', error: null, lessonContent: '', parsedLesson: null };
    case 'UPDATE_PROGRESS':
      return { ...state, generationProgress: action.payload.progress, generationMessage: action.payload.message };
    case 'GENERATION_SUCCESS':
      return { ...state, isGenerating: false, generationProgress: 100, generationMessage: 'Complete!', lessonContent: action.payload.raw, parsedLesson: action.payload.parsed };
    case 'GENERATION_FAILURE':
      return { ...state, isGenerating: false, generationProgress: 0, generationMessage: '', error: action.payload };
    case 'TOGGLE_VIEW':
      if (action.payload === 'markdown') return { ...state, showMarkdown: !state.showMarkdown };
      if (action.payload === 'structured') return { ...state, showStructured: !state.showStructured };
      return state;
    case 'CLEAR':
      return { ...state, lessonContent: '', parsedLesson: null, error: null };
    default:
      return state;
  }
};

// ================================================================================================
// 3. UI SUB-COMPONENTS
// ================================================================================================

const LessonControls = memo(({ uploads, state, apiKey, onGenerate, dispatch }: any) => (
  <div className="glass-card border border-border/40 rounded-2xl p-8 shadow-xl shadow-primary/5 hover:shadow-2xl hover:shadow-primary/10 transition-all duration-300">
    <div className="mb-6">
      <h2 className="text-2xl font-bold text-foreground flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/30">
          <BookOpen className="w-6 h-6 text-white" />
        </div>
        Create AI Lesson
      </h2>
      <p className="text-muted-foreground text-sm">Transform documents or YouTube videos into comprehensive learning materials</p>
    </div>

    {/* Source Type Toggle */}
    <div className="flex gap-2 mb-6">
      <button
        onClick={() => dispatch({ type: 'SET_SOURCE_TYPE', payload: 'document' })}
        className={cn(
          "flex-1 px-4 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all",
          state.sourceType === 'document'
            ? "bg-gradient-to-r from-primary to-secondary text-white shadow-lg"
            : "glass-card border border-border/50 text-muted-foreground hover:border-primary/30"
        )}
      >
        <BookOpen className="w-4 h-4" />
        Document
      </button>
      <button
        onClick={() => dispatch({ type: 'SET_SOURCE_TYPE', payload: 'youtube' })}
        className={cn(
          "flex-1 px-4 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all",
          state.sourceType === 'youtube'
            ? "bg-gradient-to-r from-red-600 to-red-500 text-white shadow-lg"
            : "glass-card border border-border/50 text-muted-foreground hover:border-red-500/30"
        )}
      >
        <Youtube className="w-4 h-4" />
        YouTube
      </button>
    </div>

    {/* Conditional Input Based on Source Type */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
      <div>
        {state.sourceType === 'document' ? (
          <>
            <label htmlFor="select-doc" className="block text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" />
              Select Document
            </label>
            <select 
              id="select-doc" 
              value={state.selectedUploadId} 
              onChange={e => dispatch({ type: 'SET_SELECTED_UPLOAD', payload: e.target.value })} 
              className="w-full px-5 py-3.5 glass-card border border-border/50 rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200 text-foreground bg-background/50 hover:border-primary/30 cursor-pointer"
            >
              <option value="">Choose a document...</option>
              {uploads.map((u: Upload) => <option key={u.id} value={u.id}>{u.filename}</option>)}
            </select>
          </>
        ) : (
          <>
            <label htmlFor="youtube-url" className="block text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Youtube className="w-4 h-4 text-red-500" />
              YouTube URL
            </label>
            <input
              id="youtube-url"
              type="url"
              value={state.youtubeUrl}
              onChange={e => dispatch({ type: 'SET_YOUTUBE_URL', payload: e.target.value })}
              placeholder="https://youtube.com/watch?v=..."
              className="w-full px-5 py-3.5 glass-card border border-border/50 rounded-xl focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all duration-200 text-foreground bg-background/50 hover:border-red-500/30"
            />
          </>
        )}
      </div>
      <div className="flex justify-start md:justify-end items-center gap-3">
        <button 
          onClick={onGenerate} 
          disabled={(state.sourceType === 'document' ? !state.selectedUploadId : !state.youtubeUrl.trim()) || state.isGenerating || !apiKey} 
          className={cn(
            "px-8 py-4 rounded-xl font-bold flex items-center gap-3 transition-all duration-300 shadow-lg relative overflow-hidden group",
            "bg-gradient-to-r from-primary via-secondary to-primary bg-size-200 text-white",
            "hover:shadow-2xl hover:shadow-primary/40 hover:scale-105 active:scale-95 hover:bg-pos-100",
            "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          )}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 group-hover:animate-shimmer"></div>
          {state.isGenerating ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Wand2 className="w-5 h-5" />
          )}
          <span className="relative z-10">{state.isGenerating ? 'Generating Lesson...' : 'Generate Lesson'}</span>
        </button>
      </div>
    </div>
  </div>
));

const LessonView = memo(({ content, onCopy, onClear }: any) => {
    const [isBookmarked, setIsBookmarked] = useState(false);
    const [showNotes, setShowNotes] = useState(false);
    const [notes, setNotes] = useState('');
    const [isCompleted, setIsCompleted] = useState(false);
    
    const wordCount = useMemo(() => content.trim().split(/\s+/).length, [content]);
    const readingTime = Math.max(1, Math.round(wordCount / LESSON_CONFIG.wordsPerMinute));

    return (
        <div className="glass-card border border-border/40 rounded-2xl overflow-hidden shadow-xl shadow-primary/5">
            {/* Completion Indicator */}
            {isCompleted && (
              <div className="h-1.5 bg-gradient-to-r from-emerald-500 to-green-500"></div>
            )}
            
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-foreground flex items-center gap-2 mb-2">
                    <BookOpen className="w-6 h-6 text-primary" />
                    Lesson Content
                  </h2>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Clock3 className="w-4 h-4" />
                      ~{readingTime} min read
                    </span>
                    <span>•</span>
                    <span>{wordCount} words</span>
                    <span>•</span>
                    <button
                      onClick={() => setIsCompleted(!isCompleted)}
                      className={cn(
                        "flex items-center gap-1.5 transition-colors",
                        isCompleted ? "text-success font-semibold" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                      {isCompleted ? "Completed" : "Mark Complete"}
                    </button>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setIsBookmarked(!isBookmarked)}
                    title={isBookmarked ? "Remove Bookmark" : "Bookmark Lesson"}
                    className={cn(
                      "p-2.5 rounded-xl transition-all duration-200 hover:scale-110 active:scale-95",
                      isBookmarked 
                        ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/30" 
                        : "glass-card border border-border/50 hover:border-primary/50 text-muted-foreground hover:text-primary"
                    )}
                  >
                    {isBookmarked ? <BookmarkCheck className="w-5 h-5" /> : <Bookmark className="w-5 h-5" />}
                  </button>
                  <button 
                    onClick={() => setShowNotes(!showNotes)}
                    title="Toggle Notes"
                    className={cn(
                      "p-2.5 rounded-xl transition-all duration-200 hover:scale-110 active:scale-95",
                      showNotes
                        ? "bg-gradient-to-r from-secondary/80 to-secondary text-white shadow-lg shadow-secondary/30"
                        : "glass-card border border-border/50 hover:border-primary/50 text-muted-foreground hover:text-primary"
                    )}
                  >
                    <StickyNote className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={onCopy} 
                    title="Copy to Clipboard" 
                    className="p-2.5 rounded-xl glass-card border border-border/50 hover:border-primary/50 text-muted-foreground hover:text-primary transition-all duration-200 hover:scale-110 active:scale-95"
                  >
                    <Copy className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={onClear} 
                    title="Clear Lesson" 
                    className="p-2.5 rounded-xl glass-card border border-border/50 hover:border-error/50 text-muted-foreground hover:text-error transition-all duration-200 hover:scale-110 active:scale-95"
                  >
                    <RefreshCw className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Notes Section */}
              {showNotes && (
                <div className="mb-6 p-4 glass-card border border-border/50 rounded-xl animate-in fade-in slide-in-from-top-2 duration-300">
                  <label className="block text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                    <StickyNote className="w-4 h-4 text-primary" />
                    Your Notes
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Write your notes about this lesson..."
                    className="w-full px-4 py-3 glass-card border border-border/50 rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200 text-foreground bg-background/50 min-h-[100px] resize-y"
                  />
                </div>
              )}

              {/* Lesson Content */}
              <MarkdownRenderer content={content} />
            </div>
        </div>
    );
});

const StructuredLessonView = memo(({ lesson }: { lesson: ParsedLesson }) => {
  const [activeLevel, setActiveLevel] = useState<'Beginner' | 'Intermediate' | 'Advanced'>('Beginner');
  const levels: Array<'Beginner' | 'Intermediate' | 'Advanced'> = ['Beginner', 'Intermediate', 'Advanced'];
  
  return (
    <div className="glass-card border border-border/40 rounded-2xl overflow-hidden shadow-xl shadow-primary/5">
        <div className="p-6 border-b border-border/30 bg-gradient-to-r from-primary/5 to-secondary/5">
          <h3 className="text-2xl font-bold text-foreground flex items-center justify-center gap-2">
            <BookOpen className="w-6 h-6 text-primary" />
            {lesson.title ?? 'Structured Lesson'}
          </h3>
        </div>
        
        {/* Tabs for difficulty levels */}
        <div className="flex border-b border-border/30 bg-background/50">
          {levels.map((level) => (
            <button
              key={level}
              onClick={() => setActiveLevel(level)}
              className={cn(
                "flex-1 px-6 py-4 font-semibold transition-all duration-200 relative",
                activeLevel === level
                  ? "text-primary bg-gradient-to-b from-primary/10 to-transparent"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
              )}
            >
              {level}
              {activeLevel === level && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary to-secondary" />
              )}
            </button>
          ))}
        </div>

        {/* Level Content */}
        <div className="p-6">
          {lesson.levels && lesson.levels[activeLevel] && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              {lesson.levels[activeLevel].explanation && (
                <div className="glass-card border border-border/40 rounded-xl p-5">
                  <h4 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    Explanation
                  </h4>
                  <p className="text-foreground/90 leading-relaxed">{lesson.levels[activeLevel].explanation}</p>
                </div>
              )}
              
              {lesson.levels[activeLevel].worked_example && (
                <div className="glass-card border border-border/40 rounded-xl p-5 bg-gradient-to-br from-blue-500/5 to-cyan-500/5">
                  <h4 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-blue-500" />
                    Worked Example
                  </h4>
                  <p className="text-foreground/90 leading-relaxed font-mono text-sm">{lesson.levels[activeLevel].worked_example}</p>
                </div>
              )}
              
              {lesson.levels[activeLevel].tips?.length && (
                <div className="glass-card border border-border/40 rounded-xl p-5 bg-gradient-to-br from-amber-500/5 to-orange-500/5">
                  <h4 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                    <Circle className="w-5 h-5 text-amber-500" />
                    Pro Tips
                  </h4>
                  <ul className="space-y-2">
                    {lesson.levels[activeLevel].tips.map((tip, i) => (
                      <li key={i} className="flex items-start gap-2 text-foreground/90">
                        <span className="text-primary font-bold mt-0.5">•</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Quick Quiz */}
        {lesson.short_quiz?.length && (
            <div className="p-6 border-t border-border/30 bg-gradient-to-b from-transparent to-muted/20">
                <h4 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                  <CheckCircle2 className="w-6 h-6 text-primary" />
                  Quick Quiz
                </h4>
                <div className="space-y-3">
                    {lesson.short_quiz.map((q, i) => (
                        <details key={i} className="glass-card border border-border/40 rounded-xl p-4 group hover:border-primary/50 transition-all duration-200">
                            <summary className="cursor-pointer font-semibold text-foreground flex items-start gap-2">
                              <span className="text-primary">Q{i + 1}:</span>
                              <span className="flex-1">{q.question}</span>
                            </summary>
                            <p className="mt-3 pt-3 border-t border-border/30 text-foreground/80 leading-relaxed">{q.answer}</p>
                        </details>
                    ))}
                </div>
            </div>
        )}
    </div>
  );
});

// ================================================================================================
// 4. MAIN COMPONENT
// ================================================================================================

export const LessonGenerator: React.FC<LessonGeneratorProps> = ({ uploads, apiKey }) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const processedUploads = useMemo(() => uploads.filter(u => u.processed), [uploads]);
  const selectedUpload = useMemo(() => processedUploads.find(u => u.id === state.selectedUploadId), [processedUploads, state.selectedUploadId]);

  useEffect(() => {
    if (!state.selectedUploadId && processedUploads.length > 0) {
      dispatch({ type: 'SET_SELECTED_UPLOAD', payload: processedUploads[0].id });
    }
  }, [processedUploads, state.selectedUploadId]);

  const handleGenerate = async () => {
    if (!apiKey) {
        dispatch({ type: 'GENERATION_FAILURE', payload: 'API key is missing. Please set it in settings.' });
        return;
    }

    let sourceText = '';

    dispatch({ type: 'START_GENERATION' });
    try {
      // Get source text from document or YouTube
      if (state.sourceType === 'document') {
        if (!selectedUpload) {
          dispatch({ type: 'GENERATION_FAILURE', payload: 'Please select a processed document.' });
          return;
        }
        sourceText = selectedUpload.fullText;
      } else {
        // YouTube source
        if (!state.youtubeUrl.trim()) {
          dispatch({ type: 'GENERATION_FAILURE', payload: 'Please enter a YouTube URL.' });
          toast.error('Please enter a YouTube URL');
          return;
        }
        
        dispatch({ type: 'UPDATE_PROGRESS', payload: { progress: 5, message: 'Validating YouTube URL...' } });
        
        try {
          dispatch({ type: 'UPDATE_PROGRESS', payload: { progress: 10, message: 'Fetching video information...' } });
          const ytData = await fetchYouTubeData(state.youtubeUrl);
          
          dispatch({ type: 'UPDATE_PROGRESS', payload: { progress: 25, message: `Found: "${ytData.title}"` } });
          
          // Validate transcript length
          if (ytData.transcript.length < 100) {
            throw new Error('The transcript is too short to generate a meaningful lesson. Please try a longer video.');
          }
          
          sourceText = ytData.transcript;
          dispatch({ type: 'UPDATE_PROGRESS', payload: { progress: 30, message: `Processing ${Math.round(ytData.transcript.length / 1000)}K characters of content...` } });
          toast.success(`Successfully loaded transcript for "${ytData.title}"`);
        } catch (ytError: any) {
          dispatch({ type: 'GENERATION_FAILURE', payload: ytError.message || 'Failed to fetch YouTube data' });
          toast.error(ytError.message || 'Failed to fetch YouTube transcript');
          return;
        }
      }
      
      // Validate source text
      if (!sourceText || sourceText.trim().length < 50) {
        dispatch({ type: 'GENERATION_FAILURE', payload: 'Source content is too short to generate a lesson.' });
        toast.error('Content is too short');
        return;
      }

      const processor = new ChunkedAIProcessor(apiKey);
      const rawContent = await processor.generateChunkedLesson(
        sourceText,
        'intermediate',
        (progress, message) => {
          dispatch({ type: 'UPDATE_PROGRESS', payload: { progress: progress || 0, message: message || 'Processing...' } });
        }
      ); 
      const parsedContent = extractJSONFromResponse(rawContent);
      
      dispatch({ type: 'GENERATION_SUCCESS', payload: { raw: rawContent, parsed: parsedContent || null } });
      
      // Save lesson to localStorage for persistence
      try {
        const { storage } = await import('../lib/storage');
        await storage.createLesson({
          id: `lesson-${Date.now()}`,
          title: state.sourceType === 'youtube' ? `Lesson from YouTube video` : `Lesson from ${selectedUpload?.filename || 'document'}`,
          content: rawContent,
          sourceType: state.sourceType,
          sourceId: state.sourceType === 'document' ? state.selectedUploadId : state.youtubeUrl,
          createdAt: new Date().toISOString(),
        });
      } catch (saveError) {
        console.error('Failed to save lesson:', saveError);
      }
      
      toast.success('Lesson generated and saved successfully!');
    } catch (err: any) {
      dispatch({ type: 'GENERATION_FAILURE', payload: err.message || 'An unknown error occurred.' });
      toast.error(err.message || 'Failed to generate lesson');
    }
  };

  const handleCopyToClipboard = () => navigator.clipboard.writeText(state.lessonContent);

  return (
    <div className="space-y-6">
        <div className="text-center space-y-3">
            <h1 className="text-4xl font-bold text-foreground flex items-center justify-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/30">
                <BookOpen className="w-7 h-7 text-white" />
              </div>
              Generate AI-Powered Lessons
            </h1>
            <p className="text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Select a document and let AI create comprehensive, interactive lessons with multiple difficulty levels
            </p>
        </div>

        <LessonControls
            uploads={processedUploads}
            state={state}
            apiKey={apiKey}
            onGenerate={handleGenerate}
            dispatch={dispatch}
        />

        {state.isGenerating && (
          <div className="glass-card border border-primary/40 rounded-xl p-6 bg-gradient-to-r from-primary/5 to-secondary/5 animate-in fade-in slide-in-from-top-2 duration-300">
            <ProgressIndicator 
              progress={state.generationProgress} 
              message={state.generationMessage} 
            />
          </div>
        )}

        {state.error && (
          <div className="glass-card border border-error/40 rounded-xl p-5 bg-gradient-to-r from-error/10 to-error/5 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-error/20 flex items-center justify-center flex-shrink-0">
                <RefreshCw className="w-5 h-5 text-error" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-error mb-1">Generation Error</h4>
                <p className="text-sm text-foreground/80">{state.error}</p>
              </div>
            </div>
          </div>
        )}

        {state.showMarkdown && state.lessonContent && <LessonView content={state.lessonContent} onCopy={handleCopyToClipboard} onClear={() => dispatch({ type: 'CLEAR' })} />}

        {state.showStructured && state.parsedLesson && <StructuredLessonView lesson={state.parsedLesson} />}

        {processedUploads.length === 0 && (
            <div className="text-center p-12 glass-card border border-border/40 rounded-2xl shadow-xl shadow-primary/5">
                <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
                  <BookOpen className="w-10 h-10 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">No Documents Available</h3>
                <p className="text-muted-foreground max-w-md mx-auto">Please upload and process a document first to start generating AI-powered lessons.</p>
            </div>
        )}
    </div>
  );
};

export default LessonGenerator;
