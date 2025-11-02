import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Flag,
  Wand2,
  Brain,
  Clock3,
  Award,
  CheckCircle2,
  XCircle,
  Loader2,
  Download,
  Copy,
  RefreshCw,
  ListChecks,
  Youtube,
  BookOpen,
  FileDown,
  Timer,
} from 'lucide-react';
import type { Upload } from '../services/FileProcessor';
import { ChunkedAIProcessor } from '../services/ChunkedAIProcessor';
import { OpenRouterAPI } from '../services/OpenRouterAPI';
import { MarkdownRenderer } from './MarkdownRenderer';
import { ProgressIndicator } from './ProgressIndicator';
import { fetchYouTubeData } from '../utils/youtubeUtils';
import { exportQuizAsPDF } from '../utils/exportUtils';
import { cn } from '../lib/utils';
import toast from 'react-hot-toast';

/* ================================================================================================
   Types
================================================================================================ */

interface QuizManagerProps {
  uploads: Upload[];
  apiKey?: string;
}

export interface Question {
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
}

interface Session {
  questions: Question[];
  currentIndex: number;
  answers: number[];       // -1 means unanswered
  flagged: boolean[];
  startedAt: number;       // epoch ms
  finishedAt?: number;     // epoch ms
}

/* ================================================================================================
   Helpers
================================================================================================ */

// forgiving extractor: JSON array, {quiz:[...]}, fenced code block, or first parseable JSON
function extractQuestions(raw: string): Question[] {
  const tryParse = (s: string): any => {
    try { return JSON.parse(s); } catch { return null; }
  };

  let parsed = tryParse(raw);

  if (!parsed) {
    const fence = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (fence) parsed = tryParse(fence[1]);
  }

  if (!parsed) {
    const m = raw.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (m) parsed = tryParse(m[1]);
  }

  let arr: any[] | null = null;
  if (Array.isArray(parsed)) arr = parsed;
  else if (parsed && typeof parsed === 'object') {
    if (Array.isArray((parsed as any).quiz)) arr = (parsed as any).quiz;
    else if (Array.isArray((parsed as any).questions)) arr = (parsed as any).questions;
  }

  if (!arr) throw new Error('Could not parse quiz JSON from the model response.');

  const norm = (x: any): Question | null => {
    const q = String(x?.question ?? '').trim();
    const opts = Array.isArray(x?.options) ? x.options.map((o: any) => String(o ?? '').trim()) : [];
    const idx = Number.isFinite(x?.correctIndex) ? Number(x.correctIndex) : -1;
    const exp = x?.explanation ? String(x.explanation) : undefined;
    if (!q || opts.length < 2 || idx < 0 || idx >= opts.length) return null;
    return { question: q, options: opts, correctIndex: idx, explanation: exp };
  };

  const out: Question[] = arr.map(norm).filter(Boolean) as Question[];
  if (!out.length) throw new Error('No valid questions found after parsing.');
  return out;
}

const fmtTime = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
};

function GlassRibbonButton({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={[
        'inline-flex items-center justify-center gap-2 px-4 py-2 rounded-2xl text-sm font-semibold text-foreground',
        'glass-card border border-border/50 hover:border-primary/30 shadow-sm',
        'active:scale-[.985] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
        props.disabled ? 'opacity-60 cursor-not-allowed' : '',
        className || '',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

function ProgressSlimLight({ value, label }: { value: number; label: string }) {
  return (
    <div className="min-w-[320px]">
      <div className="text-xs text-foreground mb-1 text-center font-medium">{label}</div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-[width] duration-500 ease-out relative"
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        >
          <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-white/50 mix-blend-overlay animate-sheen" />
        </div>
      </div>
    </div>
  );
}

/* ================================================================================================
   Component
================================================================================================ */

export const QuizManager: React.FC<QuizManagerProps> = ({ uploads, apiKey }) => {
  // ---------------------------------- generation ----------------------------------
  const [selectedUpload, setSelectedUpload] = useState('');
  const [sourceType, setSourceType] = useState<'document' | 'youtube'>('document');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [questionCount, setQuestionCount] = useState(10);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard' | 'mixed'>('mixed');
  const [questionType, setQuestionType] = useState<'multiple_choice' | 'true_false' | 'short_answer' | 'mixed'>('mixed');
  const [timeLimit, setTimeLimit] = useState<number>(0); // 0 = no time limit, otherwise seconds per question
  const [generating, setGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationMessage, setGenerationMessage] = useState('');
  const processedUploads = useMemo(() => uploads.filter((u) => u.processed), [uploads]);

  // ---------------------------------- session ----------------------------------
  const [session, setSession] = useState<Session | null>(null);
  const [reveal, setReveal] = useState(false); // reveal after answering
  const [showSummary, setShowSummary] = useState(false);

  // Timer (fixed): keep real elapsedMs in state; update every 250ms while active
  const [elapsedMs, setElapsedMs] = useState(0);
  useEffect(() => {
    if (!session || showSummary) return;
    setElapsedMs(Date.now() - session.startedAt); // snap immediately
    const id = window.setInterval(() => {
      setElapsedMs(Date.now() - session.startedAt);
    }, 250);
    return () => window.clearInterval(id);
  }, [session, showSummary]);

  const current = session ? session.questions[session.currentIndex] : null;
  const answered = session ? session.answers[session.currentIndex] : -1;

  // ---------------------------------- AI report ----------------------------------
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportText, setReportText] = useState<string>('');

  // Build a compact summary payload for the AI
  const buildResultSummary = useCallback((s: Session) => {
    const rows = s.questions.map((q, i) => {
      const user = s.answers[i];
      const correct = q.correctIndex;
      return {
        index: i + 1,
        question: q.question,
        options: q.options,
        correctIndex: correct,
        userIndex: user,
        correct: user === correct,
        flagged: s.flagged[i],
        explanation: q.explanation ?? '',
      };
    });
    return {
      total: s.questions.length,
      correct: rows.filter((r) => r.correct).length,
      time_seconds: Math.round(((s.finishedAt ?? Date.now()) - s.startedAt) / 1000),
      rows,
    };
  }, []);

  // Ask the model for a performance report (markdown)
  const requestReport = useCallback(async (s: Session) => {
    if (!apiKey) return;
    setReportLoading(true);
    setReportError(null);
    setReportText('');

    try {
      const api = new OpenRouterAPI(apiKey);
      const summary = buildResultSummary(s);
      const context =
        `Quiz results JSON:\n` +
        JSON.stringify(summary, null, 2) +
        `\n\nTask: Analyze performance. Identify strengths, weaknesses, and topics to reinforce.\nReturn a concise, well-structured report with:\n` +
        `- Headline with score and time\n- Top strengths (bullet list)\n- Weak areas with 2–3 targeted topics to study\n- Suggested micro-study plan for the next session\n- If any questions were flagged, call them out.\nUse short sections and bullet points.`;

      // Reuse the Q&A endpoint by stuffing everything in the context.
      const text = await api.answerQuestion(
        'Generate the performance report described above.',
        context
      );

      setReportText(String(text).trim());
    } catch (e: any) {
      console.error(e);
      setReportError(e?.message ?? 'Failed to generate AI report.');
    } finally {
      setReportLoading(false);
    }
  }, [apiKey, buildResultSummary]);

  // Auto-request report when finishing
  useEffect(() => {
    if (showSummary && session && apiKey) {
      requestReport(session);
    }
  }, [showSummary, session, apiKey, requestReport]);

  // ---------------------------------- actions ----------------------------------
  const generateQuiz = useCallback(async () => {
    setGenerationError(null);
    if (!apiKey) {
      setGenerationError('Please provide an API key in Settings.');
      return;
    }

    let sourceText = '';

    setGenerating(true);
    setGenerationProgress(0);
    setGenerationMessage('Starting quiz generation...');

    try {
      // Get source text from document or YouTube
      if (sourceType === 'document') {
        if (!selectedUpload) {
          setGenerationError('Select a processed document first.');
          setGenerating(false);
          return;
        }
        const upload = uploads.find((u) => u.id === selectedUpload);
        if (!upload?.fullText) {
          setGenerationError('Selected document has no text content.');
          setGenerating(false);
          return;
        }
        sourceText = upload.fullText;
      } else {
        // YouTube source
        if (!youtubeUrl.trim()) {
          setGenerationError('Please enter a YouTube URL.');
          setGenerating(false);
          return;
        }
        
        try {
          setGenerationProgress(5);
          setGenerationMessage('Validating YouTube URL...');
          
          setGenerationProgress(10);
          setGenerationMessage('Fetching video information...');
          const ytData = await fetchYouTubeData(youtubeUrl);
          
          setGenerationProgress(25);
          setGenerationMessage(`Found: "${ytData.title}"`);
          
          // Check if we got a real transcript or need to use AI fallback
          if (ytData.hasTranscript && ytData.transcript.length > 100) {
            sourceText = ytData.transcript;
            setGenerationProgress(30);
            setGenerationMessage(`Processing ${Math.round(ytData.transcript.length / 1000)}K characters of content...`);
          } else {
            // No transcript available - generate AI quiz based on video title
            sourceText = `Create quiz questions about: "${ytData.title}"\n\nThis is a YouTube video. Since the transcript is not available, create quiz questions covering what this video likely teaches based on the title.`;
            setGenerationProgress(30);
            setGenerationMessage('Transcript unavailable - generating quiz from video title...');
          }
        } catch (ytError: any) {
          setGenerationError(ytError.message || 'Failed to fetch YouTube data');
          setGenerating(false);
          return;
        }
      }
      
      // Validate source text
      if (!sourceText || sourceText.trim().length < 50) {
        setGenerationError('Source content is too short to generate quiz questions.');
        setGenerating(false);
        return;
      }

      // Add advanced options as instructions to the AI
      let enhancedSourceText = sourceText;
      
      // Add difficulty instructions
      if (difficulty !== 'mixed') {
        const difficultyInstructions = {
          easy: 'Focus on basic comprehension and fundamental concepts. Questions should be straightforward and test core understanding.',
          medium: 'Create standard difficulty questions that test both understanding and application of concepts.',
          hard: 'Generate advanced questions requiring deep analysis, critical thinking, and synthesis of multiple concepts.'
        }[difficulty];
        enhancedSourceText += `\n\n[DIFFICULTY]: ${difficultyInstructions}`;
      }
      
      // Add question type instructions
      if (questionType !== 'mixed') {
        const typeInstructions = {
          multiple_choice: 'All questions must be multiple choice with 4 options.',
          true_false: 'All questions must be true/false format.',
          short_answer: 'All questions must be short answer format requiring written responses.'
        }[questionType];
        enhancedSourceText += `\n\n[QUESTION TYPE]: ${typeInstructions}`;
      } else {
        enhancedSourceText += `\n\n[QUESTION TYPE]: Mix of multiple choice, true/false, and short answer questions for variety.`;
      }

      const processor = new ChunkedAIProcessor(apiKey);
      const raw = await processor.generateChunkedQuiz(enhancedSourceText, questionCount, (progress, message) => {
        setGenerationProgress(progress || 0);
        setGenerationMessage(message || 'Processing...');
      });
      const questions = extractQuestions(raw);

      const s: Session = {
        questions,
        currentIndex: 0,
        answers: Array(questions.length).fill(-1),
        flagged: Array(questions.length).fill(false),
        startedAt: Date.now(),
      };
      setSession(s);
      setReveal(false);
      setShowSummary(false);
      setReportText('');
      setReportError(null);
      setElapsedMs(0);
      
      // Save quiz to localStorage for persistence
      try {
        const { storage } = await import('../lib/storage');
        await storage.createQuiz({
          id: `quiz-${Date.now()}`,
          title: sourceType === 'youtube' ? `Quiz from YouTube video` : `Quiz from ${uploads.find(u => u.id === selectedUpload)?.filename || 'document'}`,
          questions: questions,
          sourceType: sourceType,
          sourceId: sourceType === 'document' ? selectedUpload : youtubeUrl,
          createdAt: new Date().toISOString(),
        });
      } catch (saveError) {
        console.error('Failed to save quiz:', saveError);
      }
      
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e: any) {
      console.error(e);
      setGenerationError(e?.message ?? 'Failed to generate quiz.');
    } finally {
      setGenerating(false);
    }
  }, [apiKey, questionCount, difficulty, questionType, selectedUpload, sourceType, youtubeUrl, uploads]);

  const handleAnswer = (idx: number) => {
    if (!session || answered !== -1) return; // already answered
    const next = { ...session, answers: [...session.answers] };
    next.answers[next.currentIndex] = idx;
    setSession(next);
    setReveal(true);
  };

  const goPrev = () => {
    if (!session) return;
    const i = Math.max(0, session.currentIndex - 1);
    setSession({ ...session, currentIndex: i });
    setReveal(session.answers[i] !== -1);
  };

  const goNext = () => {
    if (!session) return;
    if (session.currentIndex < session.questions.length - 1) {
      const i = session.currentIndex + 1;
      setSession({ ...session, currentIndex: i });
      setReveal(session.answers[i] !== -1);
    } else {
      // finish
      setSession((s) => (s ? { ...s, finishedAt: Date.now() } : s));
      setShowSummary(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const toggleFlag = () => {
    if (!session) return;
    const f = [...session.flagged];
    f[session.currentIndex] = !f[session.currentIndex];
    setSession({ ...session, flagged: f });
  };

  const jumpTo = (i: number) => {
    if (!session) return;
    setSession({ ...session, currentIndex: i });
    setReveal(session.answers[i] !== -1);
  };

  const resetAll = () => {
    setSession(null);
    setShowSummary(false);
    setReveal(false);
    setReportText('');
    setReportError(null);
    setElapsedMs(0);
    setGenerationError(null);
  };

  // Retake wrong/flagged only
  const retakeFiltered = (filter: 'wrong' | 'flagged') => {
    if (!session) return;
    const indexes =
      filter === 'wrong'
        ? session.answers
            .map((a, i) => (a !== session.questions[i].correctIndex ? i : -1))
            .filter((x) => x >= 0)
        : session.flagged
            .map((f, i) => (f ? i : -1))
            .filter((x) => x >= 0);

    if (indexes.length === 0) return;

    const qs = indexes.map((i) => session.questions[i]);
    const s: Session = {
      questions: qs,
      currentIndex: 0,
      answers: Array(qs.length).fill(-1),
      flagged: Array(qs.length).fill(false),
      startedAt: Date.now(),
    };
    setSession(s);
    setReveal(false);
    setShowSummary(false);
    setReportText('');
    setReportError(null);
    setElapsedMs(0);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // keyboard nav
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!session || showSummary) return;

      if (/^[1-9]$/.test(e.key)) {
        const idx = Number(e.key) - 1;
        if (current && idx < current.options.length) {
          e.preventDefault();
          handleAnswer(idx);
        }
      } else if (e.key === 'Enter' || e.key === 'ArrowRight') {
        e.preventDefault();
        goNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goPrev();
      } else if (e.key.toLowerCase() === 'f') {
        e.preventDefault();
        toggleFlag();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [session, current, showSummary, answered]);

  // ---------------------------------- derived ----------------------------------
  const progressPct = useMemo(() => {
    if (!session) return 0;
    const answeredCount = session.answers.filter((x) => x !== -1).length;
    return (answeredCount / session.questions.length) * 100;
  }, [session]);

  const score = useMemo(() => {
    if (!session) return 0;
    return session.answers.reduce((acc, a, i) => {
      if (a === session.questions[i].correctIndex) acc += 1;
      return acc;
    }, 0);
  }, [session]);

  const totalTimeMs = useMemo(() => {
    if (!session) return 0;
    return showSummary && session.finishedAt
      ? session.finishedAt - session.startedAt
      : elapsedMs;
  }, [session, elapsedMs, showSummary]);

  /* =============================================================================================
     RENDER — 3 states: no session, in session, summary
  ============================================================================================== */

  // ------------------------------ summary view ------------------------------
  if (showSummary && session) {
    const doneTime = session.finishedAt ?? Date.now();
    const label = `Completed • ${session.questions.length} questions`;

    const wrongCount = session.questions.length - score;
    const flaggedCount = session.flagged.filter(Boolean).length;

    const copyReport = () =>
      navigator.clipboard?.writeText(reportText || '').catch(() => {});

    const downloadReport = () => {
      const blob = new Blob([reportText || ''], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `quiz-report-${new Date(doneTime).toISOString().slice(0, 19)}.md`;
      a.click();
      URL.revokeObjectURL(url);
    };
    
    const exportPDF = () => {
      const timestamp = new Date(doneTime).toISOString().slice(0, 10);
      exportQuizAsPDF(session.questions, `quiz-${timestamp}.pdf`);
      toast.success('PDF export started!');
    };

    return (
      <div className="space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-foreground">Quiz Summary</h1>
          <p className="text-muted-foreground">Great job! Review your results and jump back in.</p>
        </div>

        {/* Light ribbon (summary) */}
        <div className="sticky top-[64px] z-30 border-b border-border/40 glass-card backdrop-blur">
          <div className="app-container py-3 flex items-center justify-between gap-3">
            <GlassRibbonButton onClick={resetAll}>
              <Wand2 className="w-4 h-4" />
              Generate new quiz
            </GlassRibbonButton>

            <ProgressSlimLight value={100} label={label} />

            <div className="flex items-center gap-2 text-sm">
              <div className="px-3 py-2 rounded-xl border border-border/40 glass-card text-foreground flex items-center gap-2">
                <Clock3 className="w-4 h-4" />
                {fmtTime(totalTimeMs)}
              </div>
              <div className="px-3 py-2 rounded-xl border border-border/40 glass-card text-foreground flex items-center gap-2">
                <Award className="w-4 h-4" />
                {score}/{session.questions.length}
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => retakeFiltered('wrong')}
            disabled={!wrongCount}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary text-white font-semibold shadow-sm hover:bg-secondary/90 disabled:bg-muted transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            Retake wrong only ({wrongCount})
          </button>
          <button
            onClick={() => retakeFiltered('flagged')}
            disabled={!flaggedCount}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-warning text-white font-semibold shadow-sm hover:bg-warning/90 disabled:bg-muted transition-all"
          >
            <Flag className="w-4 h-4" />
            Retake flagged ({flaggedCount})
          </button>
        </div>

        {/* Review list */}
        <div className="glass-card border rounded-xl p-6 shadow-sm">
          <h2 className="text-xl font-bold text-foreground mb-4">Review Answers</h2>
          <div className="space-y-6">
            {session.questions.map((q, i) => {
              const user = session.answers[i];
              const correct = q.correctIndex;
              const isRight = user === correct;
              return (
                <div key={i} className="rounded-lg border p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-foreground">
                      Q{i + 1}. {q.question}
                    </h3>
                    <span className={`inline-flex items-center gap-1 text-sm rounded-full px-2 py-0.5 ${isRight ? 'bg-success/10 text-success' : 'bg-error/10 text-error'}`}>
                      {isRight ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                      {isRight ? 'Correct' : 'Wrong'}
                    </span>
                  </div>
                  <div className="grid gap-2">
                    {q.options.map((opt, oi) => {
                      const base = 'px-3 py-2 rounded border text-foreground';
                      const cls =
                        oi === correct
                          ? 'border-success bg-success/10'
                          : oi === user
                          ? 'border-error/50 bg-error/10'
                          : 'border-border/40 bg-muted/20';
                      return (
                        <div key={oi} className={`${base} ${cls}`}>
                          <span className="font-medium mr-2">{String.fromCharCode(65 + oi)}.</span>
                          {opt}
                        </div>
                      );
                    })}
                  </div>
                  {q.explanation && (
                    <p className="mt-3 text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">Explanation:</span> {q.explanation}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* AI Report */}
        <div className="glass-card border rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <ListChecks className="w-5 h-5 text-indigo-600" />
              AI Performance Report
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={copyReport}
                disabled={!reportText}
                className="btn"
                title="Copy"
              >
                <Copy className="w-4 h-4" />
                Copy
              </button>
              <button
                onClick={downloadReport}
                disabled={!reportText}
                className="btn"
                title="Download .md"
              >
                <Download className="w-4 h-4" />
                Markdown
              </button>
              <button
                onClick={exportPDF}
                disabled={!session}
                className="btn"
                title="Export as PDF"
              >
                <FileDown className="w-4 h-4" />
                PDF
              </button>
            </div>
          </div>

          {reportLoading && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating your report…
            </div>
          )}

          {reportError && (
            <div className="rounded-lg border border-error/50 bg-error/10 text-error px-3 py-2 text-sm">
              {reportError}
            </div>
          )}

          {!reportLoading && !reportError && reportText && (
            <div className="rounded-lg border bg-muted/20 p-4">
              <MarkdownRenderer content={reportText} />
            </div>
          )}
          
          {!reportLoading && !reportError && !reportText && (
            <div className="rounded-lg border bg-muted/20 p-4 text-muted-foreground text-center italic">
              Report will appear here after quiz completion.
            </div>
          )}
        </div>
      </div>
    );
  }

  // ------------------------------ active session view ------------------------------
  if (session && current) {
    const total = session.questions.length;
    const label = `Question ${session.currentIndex + 1} of ${total}`;

    return (
      <div className="space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-foreground">Quizzes</h1>
          <p className="text-muted-foreground">
            Use <span className="kbd">1–9</span> to choose, <span className="kbd">Enter</span> to continue, <span className="kbd">F</span> to flag.
          </p>
        </div>

        {/* Light ribbon (top) */}
        <div className="sticky top-[64px] z-30 border-b border-border/40 glass-card backdrop-blur">
          <div className="app-container py-3 flex items-center justify-between gap-3">
            {/* Left controls */}
            <div className="flex items-center gap-2">
              <GlassRibbonButton onClick={goPrev} disabled={session.currentIndex === 0} title="Left Arrow">
                <ChevronLeft className="w-5 h-5" />
                Prev
              </GlassRibbonButton>

              <GlassRibbonButton onClick={goNext} title="Enter / →">
                {session.currentIndex === total - 1 ? 'Finish' : 'Next'}
                <ChevronRight className="w-5 h-5" />
              </GlassRibbonButton>
            </div>

            {/* Center progress */}
            <ProgressSlimLight value={progressPct} label={label} />

            {/* Right info + flag */}
            <div className="flex items-center gap-2">
              <div className="px-3 py-2 rounded-xl border border-border/40 glass-card text-foreground flex items-center gap-2">
                <Clock3 className="w-4 h-4" />
                {fmtTime(elapsedMs)}
              </div>
              <GlassRibbonButton
                onClick={toggleFlag}
                className={session.flagged[session.currentIndex] ? 'ring-2 ring-warning bg-warning/10' : ''}
                title="F to toggle flag"
              >
                <Flag className="w-5 h-5" />
                Flag
              </GlassRibbonButton>
            </div>
          </div>
        </div>

        {/* Palette + legend */}
        <div className="app-container">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="text-sm font-semibold text-foreground">Question Palette</div>
            <div className="flex flex-wrap gap-2">
              {session.questions.map((_, i) => {
                const isCurrent = i === session.currentIndex;
                const a = session.answers[i];
                const flagged = session.flagged[i];
                const base = 'w-9 h-8 rounded-lg border text-sm font-semibold flex items-center justify-center transition-all';
                const cls =
                  a === -1
                    ? 'glass-card border-border text-foreground hover:bg-muted/20'
                    : 'bg-success/10 border-success text-success';
                const active = isCurrent ? 'ring-2 ring-indigo-300' : '';
                const flaggedStyle = flagged ? 'shadow-[0_0_0_2px_#fde68a_inset]' : '';
                return (
                  <button
                    key={i}
                    onClick={() => jumpTo(i)}
                    className={`${base} ${cls} ${active} ${flaggedStyle}`}
                    title={flagged ? 'Flagged' : a === -1 ? 'Unanswered' : 'Answered'}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
            <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <span className="w-3 h-3 rounded glass-card border border-border inline-block" /> Unanswered
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-success/10 border border-success inline-block" /> Answered
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-warning/20 inline-block" /> Flagged
              </span>
            </div>
          </div>
        </div>

        {/* Question card */}
        <div className="glass-card border rounded-xl p-6 shadow-sm">
          <h2 className="text-2xl font-bold text-foreground mb-6">{current.question}</h2>

          <div className="space-y-3">
            {current.options.map((opt, i) => {
              const isSelected = answered === i;
              const showRight = reveal && i === current.correctIndex;
              const showWrong = reveal && isSelected && i !== current.correctIndex;

              const base =
                'group w-full text-left px-4 py-4 rounded-xl border transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 text-foreground';
              const cls = showRight
                ? 'border-success bg-success/10'
                : showWrong
                ? 'border-error bg-error/10 text-error'
                : isSelected
                ? 'border-secondary bg-secondary/10'
                : 'border-border hover:border-primary/50 hover:bg-muted/20';

              return (
                <button
                  key={i}
                  onClick={() => handleAnswer(i)}
                  disabled={answered !== -1}
                  className={`${base} ${cls}`}
                >
                  <span className="inline-flex w-8 h-8 mr-3 items-center justify-center rounded-full font-semibold border border-current/30">
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className="align-middle">{opt}</span>
                </button>
              );
            })}
          </div>

          {reveal && current.explanation && (
            <div className="mt-5 rounded-xl border bg-muted/20 p-4 text-foreground">
              <span className="font-semibold">Explanation:</span> {current.explanation}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ------------------------------ idle (no session) ------------------------------
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-extrabold text-foreground">Generate & Take Quizzes</h1>
        <p className="text-muted-foreground">Pick a processed document, generate a quiz, and start practicing in seconds.</p>
      </div>

      <div className="glass-card border rounded-xl p-6 shadow-sm">
        {generationError && (
          <div className="mb-4 rounded-lg border border-error/50 bg-error/10 text-error px-3 py-2 text-sm">
            {generationError}
          </div>
        )}

        {generating && (
          <div className="mb-6">
            <ProgressIndicator 
              progress={generationProgress} 
              message={generationMessage} 
            />
          </div>
        )}

        {/* Source Type Toggle */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => {
              setSourceType('document');
              setGenerationError(null);
            }}
            className={cn(
              "flex-1 px-4 py-3 rounded-xl font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2",
              sourceType === 'document'
                ? "bg-gradient-to-r from-primary to-secondary text-white shadow-lg shadow-primary/30"
                : "glass-card border border-border/50 text-muted-foreground hover:border-primary/50 hover:text-foreground"
            )}
          >
            <BookOpen className="w-4 h-4" />
            Document
          </button>
          <button
            onClick={() => {
              setSourceType('youtube');
              setGenerationError(null);
            }}
            className={cn(
              "flex-1 px-4 py-3 rounded-xl font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2",
              sourceType === 'youtube'
                ? "bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg shadow-red-500/30"
                : "glass-card border border-border/50 text-muted-foreground hover:border-red-500/50 hover:text-foreground"
            )}
          >
            <Youtube className="w-4 h-4" />
            YouTube
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {sourceType === 'document' ? (
            <div>
              <label className="block text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-primary" />
                Select Document
              </label>
              <select
                value={selectedUpload}
                onChange={(e) => setSelectedUpload(e.target.value)}
                className="w-full px-4 py-3.5 glass-card border border-border/50 rounded-xl bg-background/50 text-foreground focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200 hover:border-primary/30 cursor-pointer font-medium shadow-sm hover:shadow-md appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22currentColor%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3c%2Fpolyline%3E%3c%2Fsvg%3E')] bg-[length:1.25rem] bg-[right_0.75rem_center] bg-no-repeat pr-10"
              >
                <option value="">{processedUploads.length ? 'Choose a document…' : 'No documents processed'}</option>
                {processedUploads.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.filename}
                  </option>
                ))}
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
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=..."
                className="w-full px-4 py-3.5 glass-card border border-border/50 rounded-xl bg-background/50 text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all duration-200 hover:border-red-500/30 font-medium shadow-sm hover:shadow-md"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Brain className="w-4 h-4 text-secondary" />
              Number of Questions
            </label>
            <select
              value={questionCount}
              onChange={(e) => setQuestionCount(parseInt(e.target.value, 10))}
              className="w-full px-4 py-3.5 glass-card border border-border/50 rounded-xl bg-background/50 text-foreground focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200 hover:border-primary/30 cursor-pointer font-medium shadow-sm hover:shadow-md appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22currentColor%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3c%2Fpolyline%3E%3c%2Fsvg%3E')] bg-[length:1.25rem] bg-[right_0.75rem_center] bg-no-repeat pr-10"
            >
              {[3, 5, 10, 15, 20, 25, 30].map((n) => (
                <option key={n} value={n}>
                  {n} {n === 1 ? 'question' : 'questions'}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Advanced Options */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-500" />
              Difficulty Level
            </label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as 'easy' | 'medium' | 'hard' | 'mixed')}
              className="w-full px-4 py-3.5 glass-card border border-border/50 rounded-xl bg-background/50 text-foreground focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200 hover:border-primary/30 cursor-pointer font-medium shadow-sm hover:shadow-md appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22currentColor%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3c%2Fpolyline%3E%3c%2Fsvg%3E')] bg-[length:1.25rem] bg-[right_0.75rem_center] bg-no-repeat pr-10"
            >
              <option value="easy">Easy - Basic comprehension</option>
              <option value="medium">Medium - Standard questions</option>
              <option value="hard">Hard - Advanced analysis</option>
              <option value="mixed">Mixed - All difficulty levels</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <ListChecks className="w-4 h-4 text-emerald-500" />
              Question Type
            </label>
            <select
              value={questionType}
              onChange={(e) => setQuestionType(e.target.value as 'multiple_choice' | 'true_false' | 'short_answer' | 'mixed')}
              className="w-full px-4 py-3.5 glass-card border border-border/50 rounded-xl bg-background/50 text-foreground focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200 hover:border-primary/30 cursor-pointer font-medium shadow-sm hover:shadow-md appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22currentColor%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3c%2Fpolyline%3E%3c%2Fsvg%3E')] bg-[length:1.25rem] bg-[right_0.75rem_center] bg-no-repeat pr-10"
            >
              <option value="multiple_choice">Multiple Choice</option>
              <option value="true_false">True/False</option>
              <option value="short_answer">Short Answer</option>
              <option value="mixed">Mixed Types</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Timer className="w-4 h-4 text-blue-500" />
              Time Limit (per question)
            </label>
            <select
              value={timeLimit}
              onChange={(e) => setTimeLimit(parseInt(e.target.value, 10))}
              className="w-full px-4 py-3.5 glass-card border border-border/50 rounded-xl bg-background/50 text-foreground focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200 hover:border-primary/30 cursor-pointer font-medium shadow-sm hover:shadow-md appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22currentColor%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3c%2Fpolyline%3E%3c%2Fsvg%3E')] bg-[length:1.25rem] bg-[right_0.75rem_center] bg-no-repeat pr-10"
            >
              <option value="0">No time limit</option>
              <option value="30">30 seconds</option>
              <option value="60">1 minute</option>
              <option value="90">1.5 minutes</option>
              <option value="120">2 minutes</option>
              <option value="180">3 minutes</option>
            </select>
          </div>
        </div>

        <div className="flex justify-center mb-6">
          <button
            onClick={generateQuiz}
            disabled={(sourceType === 'document' ? !selectedUpload : !youtubeUrl.trim()) || generating || !apiKey}
            className={cn(
              "px-10 py-4 rounded-xl font-bold text-white shadow-lg relative overflow-hidden group transition-all duration-300",
              "bg-gradient-to-r from-secondary via-primary to-secondary bg-size-200 bg-pos-0",
              "hover:shadow-2xl hover:shadow-secondary/40 hover:scale-105 hover:bg-pos-100 active:scale-95",
              "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            )}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 group-hover:animate-shimmer"></div>
            {generating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
                <span className="relative z-10">Generating... {Math.round(generationProgress)}%</span>
              </>
            ) : (
              <>
                <Wand2 className="w-5 h-5 inline mr-2" />
                <span className="relative z-10">Generate Quiz</span>
              </>
            )}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg border">
            <Brain className="w-4 h-4 text-indigo-600" />
            AI-crafted questions from your content
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg border">
            <Award className="w-4 h-4 text-indigo-600" />
            Instant scoring & detailed review
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg border">
            <Clock3 className="w-4 h-4 text-indigo-600" />
            Keyboard shortcuts for speed
          </div>
        </div>
      </div>
    </div>
  );
};

/* ================================================================================================
   CSS helper (add once to index.css if not present)
   @keyframes sheen { 0% { transform: translateX(-120%); } 100% { transform: translateX(260%); } }
   .animate-sheen { animation: sheen 2.25s linear infinite; }
================================================================================================ */
