import React, { useEffect, useMemo, useReducer, memo, useState } from 'react';
import { BookOpen, Wand2, Copy, RefreshCw, Bookmark, BookmarkCheck, StickyNote, CheckCircle2, Circle, Clock3, Youtube, ChevronRight, FileDown, Settings, Award } from 'lucide-react';
import type { Upload } from '../services/FileProcessor';
import { ChunkedAIProcessor } from '../services/ChunkedAIProcessor';
import { extractJSONFromResponse } from '../services/lessonParser';
import { fetchYouTubeData } from '../utils/youtubeUtils';
import { cn } from '../lib/utils';
import { ProgressIndicator } from './ProgressIndicator';
import { MarkdownRenderer } from './MarkdownRenderer';
import { exportLessonAsPDF } from '../utils/exportUtils';
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
  savedLessons: any[];
  currentLessonId: string | null;
  showSavedLessons: boolean;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  customInstructions: string;
  includeQuiz: boolean;
};

type Action =
  | { type: 'SET_SELECTED_UPLOAD'; payload: string }
  | { type: 'SET_SOURCE_TYPE'; payload: 'document' | 'youtube' }
  | { type: 'SET_YOUTUBE_URL'; payload: string }
  | { type: 'SET_DIFFICULTY'; payload: 'beginner' | 'intermediate' | 'advanced' }
  | { type: 'SET_CUSTOM_INSTRUCTIONS'; payload: string }
  | { type: 'TOGGLE_INCLUDE_QUIZ' }
  | { type: 'START_GENERATION' }
  | { type: 'UPDATE_PROGRESS'; payload: { progress: number; message: string } }
  | { type: 'GENERATION_SUCCESS'; payload: { raw: string; parsed: ParsedLesson | null; lessonId: string } }
  | { type: 'GENERATION_FAILURE'; payload: string }
  | { type: 'TOGGLE_VIEW'; payload: 'markdown' | 'structured' }
  | { type: 'LOAD_SAVED_LESSONS'; payload: any[] }
  | { type: 'LOAD_LESSON'; payload: { content: string; parsed: ParsedLesson | null; id: string } }
  | { type: 'DELETE_LESSON'; payload: string }
  | { type: 'TOGGLE_SAVED_LESSONS' }
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
  savedLessons: [],
  currentLessonId: null,
  showSavedLessons: false,
  difficulty: 'intermediate',
  customInstructions: '',
  includeQuiz: true,
};

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'SET_SELECTED_UPLOAD':
      return { ...state, selectedUploadId: action.payload };
    case 'SET_SOURCE_TYPE':
      return { ...state, sourceType: action.payload, selectedUploadId: '', youtubeUrl: '', error: null };
    case 'SET_YOUTUBE_URL':
      return { ...state, youtubeUrl: action.payload, error: null };
    case 'SET_DIFFICULTY':
      return { ...state, difficulty: action.payload };
    case 'SET_CUSTOM_INSTRUCTIONS':
      return { ...state, customInstructions: action.payload };
    case 'TOGGLE_INCLUDE_QUIZ':
      return { ...state, includeQuiz: !state.includeQuiz };
    case 'START_GENERATION':
      return { ...state, isGenerating: true, generationProgress: 0, generationMessage: 'Initializing...', error: null, lessonContent: '', parsedLesson: null, currentLessonId: null };
    case 'UPDATE_PROGRESS':
      return { ...state, generationProgress: action.payload.progress, generationMessage: action.payload.message };
    case 'GENERATION_SUCCESS':
      return { ...state, isGenerating: false, generationProgress: 100, generationMessage: 'Complete!', lessonContent: action.payload.raw, parsedLesson: action.payload.parsed, currentLessonId: action.payload.lessonId };
    case 'GENERATION_FAILURE':
      return { ...state, isGenerating: false, generationProgress: 0, generationMessage: '', error: action.payload };
    case 'TOGGLE_VIEW':
      if (action.payload === 'markdown') return { ...state, showMarkdown: !state.showMarkdown };
      if (action.payload === 'structured') return { ...state, showStructured: !state.showStructured };
      return state;
    case 'LOAD_SAVED_LESSONS':
      return { ...state, savedLessons: action.payload };
    case 'LOAD_LESSON':
      return { ...state, lessonContent: action.payload.content, parsedLesson: action.payload.parsed, currentLessonId: action.payload.id, error: null, showSavedLessons: false };
    case 'DELETE_LESSON':
      return { ...state, savedLessons: state.savedLessons.filter(l => l.id !== action.payload), ...(state.currentLessonId === action.payload ? { lessonContent: '', currentLessonId: null } : {}) };
    case 'TOGGLE_SAVED_LESSONS':
      return { ...state, showSavedLessons: !state.showSavedLessons };
    case 'CLEAR':
      return { ...state, lessonContent: '', parsedLesson: null, error: null, currentLessonId: null };
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
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
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
              className="w-full px-5 py-3.5 glass-card border border-border/50 rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200 text-foreground bg-background/50 hover:border-primary/30 cursor-pointer font-medium shadow-sm hover:shadow-md appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22currentColor%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3c%2Fpolyline%3E%3c%2Fsvg%3E')] bg-[length:1.25rem] bg-[right_0.75rem_center] bg-no-repeat pr-10"
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
              className="w-full px-5 py-3.5 glass-card border border-border/50 rounded-xl focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all duration-200 text-foreground bg-background/50 hover:border-red-500/30 placeholder:text-muted-foreground font-medium shadow-sm hover:shadow-md"
            />
          </>
        )}
      </div>
      <div>
        <label htmlFor="difficulty" className="block text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Award className="w-4 h-4 text-secondary" />
          Difficulty Level
        </label>
        <select
          id="difficulty"
          value={state.difficulty}
          onChange={e => dispatch({ type: 'SET_DIFFICULTY', payload: e.target.value as 'beginner' | 'intermediate' | 'advanced' })}
          className="w-full px-5 py-3.5 glass-card border border-border/50 rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200 text-foreground bg-background/50 hover:border-primary/30 cursor-pointer font-medium shadow-sm hover:shadow-md appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22currentColor%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3c%2Fpolyline%3E%3c%2Fsvg%3E')] bg-[length:1.25rem] bg-[right_0.75rem_center] bg-no-repeat pr-10"
        >
          <option value="beginner">Beginner - Simple explanations</option>
          <option value="intermediate">Intermediate - Balanced depth</option>
          <option value="advanced">Advanced - In-depth analysis</option>
        </select>
      </div>
    </div>

    {/* Advanced Options */}
    <div className="mb-6">
      <label htmlFor="custom-instructions" className="block text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
        <Settings className="w-4 h-4 text-primary" />
        Custom Instructions (Optional)
      </label>
      <textarea
        id="custom-instructions"
        value={state.customInstructions}
        onChange={e => dispatch({ type: 'SET_CUSTOM_INSTRUCTIONS', payload: e.target.value })}
        placeholder="Add specific topics to focus on, teaching style preferences, or any special requirements..."
        rows={3}
        className="w-full px-5 py-3.5 glass-card border border-border/50 rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200 text-foreground bg-background/50 hover:border-primary/30 placeholder:text-muted-foreground resize-none font-medium shadow-sm hover:shadow-md"
      />
    </div>

    <div className="flex items-center justify-between mb-6 p-4 glass-card border border-border/50 rounded-xl">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
          <CheckCircle2 className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="font-semibold text-foreground">Include Practice Quiz</p>
          <p className="text-xs text-muted-foreground">Add a short quiz at the end for self-assessment</p>
        </div>
      </div>
      <button
        onClick={() => dispatch({ type: 'TOGGLE_INCLUDE_QUIZ' })}
        className={cn(
          "relative inline-flex h-7 w-14 items-center rounded-full transition-colors",
          state.includeQuiz ? "bg-gradient-to-r from-emerald-500 to-teal-500 shadow-lg shadow-emerald-500/30" : "bg-muted"
        )}
      >
        <span
          className={cn(
            "inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-transform",
            state.includeQuiz ? "translate-x-8" : "translate-x-1"
          )}
        />
      </button>
    </div>

    <div className="flex justify-center">
      <button 
        onClick={onGenerate} 
        disabled={(state.sourceType === 'document' ? !state.selectedUploadId : !state.youtubeUrl.trim()) || state.isGenerating || !apiKey} 
        className={cn(
          "px-10 py-4 rounded-xl font-bold flex items-center gap-3 transition-all duration-300 shadow-lg relative overflow-hidden group",
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
));

const LessonView = memo(({ content, onCopy, onClear }: any) => {
    const [isBookmarked, setIsBookmarked] = useState(false);
    const [showNotes, setShowNotes] = useState(false);
    const [notes, setNotes] = useState('');
    
    const handleExportPDF = () => {
      const timestamp = new Date().toISOString().slice(0, 10);
      exportLessonAsPDF(content, `lesson-${timestamp}.pdf`);
      toast.success('PDF export started!');
    };
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
                    onClick={handleExportPDF} 
                    title="Export as PDF" 
                    className="p-2.5 rounded-xl glass-card border border-border/50 hover:border-success/50 text-muted-foreground hover:text-success transition-all duration-200 hover:scale-110 active:scale-95"
                  >
                    <FileDown className="w-5 h-5" />
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

  // Load saved lessons on mount
  useEffect(() => {
    const loadSavedLessons = async () => {
      try {
        const { storage } = await import('../lib/storage');
        const lessons = await storage.getLessons();
        dispatch({ type: 'LOAD_SAVED_LESSONS', payload: lessons || [] });
      } catch (error) {
        console.error('Failed to load saved lessons:', error);
      }
    };
    loadSavedLessons();
  }, []);

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
          
          // Check if we got a real transcript or need to use AI fallback
          if (ytData.hasTranscript && ytData.transcript.length > 100) {
            sourceText = ytData.transcript;
            dispatch({ type: 'UPDATE_PROGRESS', payload: { progress: 30, message: `Processing ${Math.round(ytData.transcript.length / 1000)}K characters of content...` } });
            toast.success(`Successfully loaded transcript for "${ytData.title}"`);
          } else {
            // No transcript available - generate AI content based on video title
            sourceText = `Create a comprehensive educational lesson about: "${ytData.title}"\n\nThis is a YouTube video. Since the transcript is not available, create a detailed lesson covering what this video likely teaches, including key concepts, examples, and learning points.`;
            dispatch({ type: 'UPDATE_PROGRESS', payload: { progress: 30, message: 'Transcript unavailable - generating AI content from video title...' } });
            toast('Transcript unavailable - generating lesson from video title', { icon: 'ℹ️' });
          }
        } catch (ytError: any) {
          dispatch({ type: 'GENERATION_FAILURE', payload: ytError.message || 'Failed to fetch YouTube data' });
          toast.error(ytError.message || 'Failed to fetch YouTube data');
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
      
      // Add custom instructions to sourceText if provided
      const enhancedSourceText = state.customInstructions.trim() 
        ? `${sourceText}\n\n[CUSTOM INSTRUCTIONS]: ${state.customInstructions}`
        : sourceText;
      
      const rawContent = await processor.generateChunkedLesson(
        enhancedSourceText,
        state.difficulty,
        (progress, message) => {
          dispatch({ type: 'UPDATE_PROGRESS', payload: { progress: progress || 0, message: message || 'Processing...' } });
        },
        state.includeQuiz
      ); 
      const parsedContent = extractJSONFromResponse(rawContent);
      
      // Create lesson ID before saving and dispatching
      const lessonId = `lesson-${Date.now()}`;
      
      // Save lesson to storage for persistence
      try {
        const { storage } = await import('../lib/storage');
        await storage.createLesson({
          id: lessonId,
          title: state.sourceType === 'youtube' ? `Lesson from YouTube video` : `Lesson from ${selectedUpload?.filename || 'document'}`,
          content: rawContent,
          parsedContent: parsedContent, // Save parsed content for structured view
          sourceType: state.sourceType,
          sourceId: state.sourceType === 'document' ? state.selectedUploadId : state.youtubeUrl,
          createdAt: new Date().toISOString(),
        });
        
        // Reload saved lessons list
        const lessons = await storage.getLessons();
        dispatch({ type: 'LOAD_SAVED_LESSONS', payload: lessons });
      } catch (saveError) {
        console.error('Failed to save lesson:', saveError);
      }
      
      dispatch({ type: 'GENERATION_SUCCESS', payload: { raw: rawContent, parsed: parsedContent || null, lessonId } });
      toast.success('Lesson generated and saved successfully!');
    } catch (err: any) {
      dispatch({ type: 'GENERATION_FAILURE', payload: err.message || 'An unknown error occurred.' });
      toast.error(err.message || 'Failed to generate lesson');
    }
  };

  const handleCopyToClipboard = () => navigator.clipboard.writeText(state.lessonContent);

  const handleLoadLesson = async (lessonId: string) => {
    try {
      const { storage } = await import('../lib/storage');
      const lesson: any = await storage.getLessonById(lessonId);
      if (lesson && lesson.content) {
        // If parsedContent is saved, use it; otherwise try to parse from raw content
        const parsed = lesson.parsedContent || extractJSONFromResponse(lesson.content);
        dispatch({ type: 'LOAD_LESSON', payload: { content: lesson.content, parsed: parsed || null, id: lesson.id } });
        toast.success('Lesson loaded successfully!');
      }
    } catch (error) {
      console.error('Failed to load lesson:', error);
      toast.error('Failed to load lesson');
    }
  };

  const handleDeleteLesson = async (lessonId: string) => {
    if (!confirm('Are you sure you want to delete this lesson?')) return;
    
    try {
      const { storage } = await import('../lib/storage');
      await storage.deleteLesson(lessonId);
      dispatch({ type: 'DELETE_LESSON', payload: lessonId });
      toast.success('Lesson deleted successfully!');
    } catch (error) {
      console.error('Failed to delete lesson:', error);
      toast.error('Failed to delete lesson');
    }
  };

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

        {/* Saved Lessons Section */}
        {state.savedLessons.length > 0 && (
          <div className="glass-card border border-border/40 rounded-2xl p-6 shadow-lg">
            <button
              onClick={() => dispatch({ type: 'TOGGLE_SAVED_LESSONS' })}
              className="w-full flex items-center justify-between mb-4 text-left"
            >
              <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" />
                Saved Lessons ({state.savedLessons.length})
              </h3>
              <ChevronRight className={cn("w-5 h-5 text-muted-foreground transition-transform", state.showSavedLessons && "rotate-90")} />
            </button>
            
            {state.showSavedLessons && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                {state.savedLessons.map((lesson: any) => (
                  <div key={lesson.id} className={cn(
                    "flex items-center justify-between p-4 rounded-lg border transition-all",
                    state.currentLessonId === lesson.id 
                      ? "border-primary bg-primary/5" 
                      : "border-border/30 hover:border-primary/50"
                  )}>
                    <button
                      onClick={() => handleLoadLesson(lesson.id)}
                      className="flex-1 text-left"
                    >
                      <p className="font-medium text-foreground">{lesson.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(lesson.createdAt).toLocaleDateString()} • {lesson.sourceType}
                      </p>
                    </button>
                    <button
                      onClick={() => handleDeleteLesson(lesson.id)}
                      className="p-2 rounded-lg hover:bg-error/10 text-error transition-colors"
                      title="Delete lesson"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

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
