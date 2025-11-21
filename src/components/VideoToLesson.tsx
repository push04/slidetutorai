import { useState, useEffect } from 'react';
import {
  Youtube,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Copy,
  FileText,
  BookOpen,
  Brain,
  FileQuestion,
  UploadCloud,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { ChunkedAIProcessor } from '../services/ChunkedAIProcessor';
import { OpenRouterAPI } from '../services/OpenRouterAPI';
import { MarkdownRenderer } from './MarkdownRenderer';
import { fetchYouTubeData } from '../utils/youtubeUtils';

interface VideoToLessonProps {
  onVideoProcessed: (videoData: { title: string; transcript: string; url: string }) => void;
  apiKey: string;
}

interface VideoState {
  youtubeUrl: string;
  lessonContent: string;
  rawTranscript: string;
  videoTitle: string;
  processingStatus: 'idle' | 'extracting' | 'transcribing' | 'success' | 'error';
}

const STORAGE_KEY = 'slidetutor_youtube_video_state';

export function VideoToLesson({ onVideoProcessed, apiKey }: VideoToLessonProps) {
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<'idle' | 'extracting' | 'transcribing' | 'success' | 'error'>('idle');
  const [lessonContent, setLessonContent] = useState('');
  const [rawTranscript, setRawTranscript] = useState('');
  const [videoTitle, setVideoTitle] = useState('');
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [isGeneratingFlashcards, setIsGeneratingFlashcards] = useState(false);
  const [isGeneratingNotes, setIsGeneratingNotes] = useState(false);
  const [transcriptStatus, setTranscriptStatus] = useState<string | null>(null);
  const [transcriptError, setTranscriptError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const state: VideoState = JSON.parse(saved);
        setYoutubeUrl(state.youtubeUrl);
        setLessonContent(state.lessonContent);
        setRawTranscript(state.rawTranscript);
        setVideoTitle(state.videoTitle);
        setProcessingStatus(state.processingStatus);
      }
    } catch (error) {
      console.error('Failed to load saved video state:', error);
    }
  }, []);

  useEffect(() => {
    if (lessonContent || youtubeUrl || rawTranscript) {
      const state: VideoState = {
        youtubeUrl,
        lessonContent,
        rawTranscript,
        videoTitle,
        processingStatus,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  }, [youtubeUrl, lessonContent, rawTranscript, videoTitle, processingStatus]);

  const handleProcessVideo = async () => {
    if (!youtubeUrl.trim()) {
      toast.error('Please enter a YouTube URL');
      return;
    }

    setIsProcessing(true);
    setProcessingStatus('extracting');
    setLessonContent('');
    setRawTranscript('');
    setTranscriptStatus(null);
    setTranscriptError(null);

    try {
      const ytData = await fetchYouTubeData(youtubeUrl);
      setVideoTitle(ytData.title);
      setProcessingStatus('transcribing');

      if (ytData.hasTranscript && ytData.transcript) {
        setRawTranscript(ytData.transcript);
        setTranscriptStatus('Found captions automatically. Review below, then generate your study pack.');
      } else {
        setTranscriptStatus(
          ytData.transcriptReason ||
            'Auto-transcript was not available. Paste the transcript from YouTube (⋮ → "Show transcript") to continue.'
        );
      }
    } catch (error) {
      console.error('Video processing error:', error);
      setProcessingStatus('error');
      setTranscriptError('Failed to look up this video. Please double-check the URL and try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const parseCaptionFile = async (file: File) => {
    const text = await file.text();
    const withoutTimestamps = text
      .replace(/\r/g, '')
      .split('\n')
      .filter((line) => !/^\d+$/.test(line.trim()) && !/\d{2}:\d{2}:\d{2}/.test(line))
      .join(' ');
    setRawTranscript(withoutTimestamps.trim());
    setTranscriptStatus(`Loaded transcript from ${file.name}`);
  };

  const generateLessonFromTranscript = async () => {
    if (!apiKey) {
      toast.error('Please configure your OpenRouter API key in Settings first');
      return;
    }

    setIsProcessing(true);
    setProcessingStatus('transcribing');

    const api = new OpenRouterAPI(apiKey);
    const transcriptText = rawTranscript.trim();
    let finalContent = '';

    try {
      if (transcriptText) {
        const promptContent = `You are an expert educator. Format the following YouTube video transcript into a well-structured, easy-to-read educational document.

Transcript:
${transcriptText}

Create a study-friendly output that includes:
- A concise title and short intro for the topic
- Sectioned explanations with bullet points and sub-bullets
- Important quotes or concepts highlighted
- A summary of key takeaways and 3-5 practice prompts

Use markdown with clear headings, bold key terms, and concise bullets.`;

        finalContent = await api.generateLesson(promptContent);
      } else {
        const promptContent = `Create a comprehensive educational study guide for a YouTube video titled "${videoTitle || 'YouTube Video'}".

The transcript was not provided. Build a thoughtful outline that includes:
- Introduction and likely scope of the video
- Core concepts and key learning points
- Practical examples or applications
- Mini self-check questions
- Next steps for deeper study

Use markdown with headers, bullets, and short paragraphs. Note clearly that this was generated without the original transcript.`;

        finalContent = await api.generateLesson(promptContent);
      }

      setLessonContent(finalContent);
      setProcessingStatus('success');
      onVideoProcessed({ title: videoTitle || 'YouTube Video', transcript: finalContent, url: youtubeUrl });
      toast.success(transcriptText ? 'Study guide generated from transcript!' : 'AI outline generated without transcript.');
    } catch (error) {
      console.error('Lesson generation error:', error);
      setProcessingStatus('error');
      toast.error('Failed to generate study guide. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const copyTranscript = () => {
    if (!lessonContent) return;
    navigator.clipboard.writeText(lessonContent);
    toast.success('Study guide copied to clipboard!');
  };

  const contentForActions = lessonContent || rawTranscript;

  const handleGenerateQuiz = async () => {
    if (!apiKey) {
      toast.error('Please configure your OpenRouter API key in Settings first');
      return;
    }
    if (!contentForActions) {
      toast.error('No study content available. Paste a transcript and generate a guide first.');
      return;
    }

    setIsGeneratingQuiz(true);
    try {
      const processor = new ChunkedAIProcessor(apiKey);
      const quizJson = await processor.generateChunkedQuiz(contentForActions, 10);
      const parsed = JSON.parse(quizJson);

      const existingQuizzes = JSON.parse(localStorage.getItem('slidetutor_generated_quizzes') || '[]');
      existingQuizzes.push({
        id: `youtube-${Date.now()}`,
        title: `Quiz: ${videoTitle || 'YouTube Video'}`,
        questions: parsed.quiz,
        createdAt: new Date().toISOString(),
        source: 'youtube',
      });
      localStorage.setItem('slidetutor_generated_quizzes', JSON.stringify(existingQuizzes));

      toast.success('Quiz generated successfully! Go to the Quiz tab to take it.');
    } catch (error) {
      console.error('Quiz generation error:', error);
      toast.error('Failed to generate quiz. Please try again.');
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  const handleGenerateFlashcards = async () => {
    if (!apiKey) {
      toast.error('Please configure your OpenRouter API key in Settings first');
      return;
    }
    if (!contentForActions) {
      toast.error('No study content available. Paste a transcript and generate a guide first.');
      return;
    }

    setIsGeneratingFlashcards(true);
    try {
      const processor = new ChunkedAIProcessor(apiKey);
      const flashcardsJson = await processor.generateChunkedFlashcards(contentForActions, 15);
      const parsed = JSON.parse(flashcardsJson);

      const existingFlashcards = JSON.parse(localStorage.getItem('slidetutor_flashcards') || '[]');
      parsed.flashcards.forEach((card: any) => {
        existingFlashcards.push({
          id: `youtube-${Date.now()}-${Math.random()}`,
          front: card.question,
          back: card.answer,
          hint: card.hint || '',
          createdAt: new Date().toISOString(),
          source: videoTitle,
          interval: 0,
          repetitions: 0,
          easeFactor: 2.5,
          nextReview: new Date().toISOString(),
        });
      });
      localStorage.setItem('slidetutor_flashcards', JSON.stringify(existingFlashcards));

      toast.success('Flashcards generated! Check the Flashcards tab.');
    } catch (error) {
      console.error('Flashcard generation error:', error);
      toast.error('Failed to generate flashcards. Please try again.');
    } finally {
      setIsGeneratingFlashcards(false);
    }
  };

  const handleGenerateNotes = async () => {
    if (!apiKey) {
      toast.error('Please configure your OpenRouter API key in Settings first');
      return;
    }
    if (!contentForActions) {
      toast.error('No study content available. Paste a transcript and generate a guide first.');
      return;
    }

    setIsGeneratingNotes(true);
    try {
      const processor = new ChunkedAIProcessor(apiKey);
      const notes = await processor.generateChunkedNotes(contentForActions, 3);
      const existingNotes = JSON.parse(localStorage.getItem('slidetutor_notes') || '[]');
      existingNotes.push({
        id: `note-${Date.now()}`,
        title: `Notes: ${videoTitle || 'YouTube Video'}`,
        content: notes,
        createdAt: new Date().toISOString(),
        source: 'youtube',
      });
      localStorage.setItem('slidetutor_notes', JSON.stringify(existingNotes));
      toast.success('Notes generated! Check the Notes section.');
    } catch (error) {
      console.error('Notes generation error:', error);
      toast.error('Failed to generate notes. Please try again.');
    } finally {
      setIsGeneratingNotes(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-2xl border border-border/60 shadow-sm p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-primary/10 text-primary">
            <Youtube className="w-6 h-6" />
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2 flex-wrap justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-foreground">YouTube Learning Hub</h1>
                <p className="text-sm text-muted-foreground">Turn any YouTube video into lessons, quizzes, and flashcards.</p>
              </div>
              {processingStatus === 'success' && (
                <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-3 py-1.5 rounded-full">
                  <CheckCircle2 className="w-4 h-4" />
                  Ready to study
                </div>
              )}
            </div>
            <div className="flex flex-col md:flex-row gap-3">
              <input
                type="url"
                placeholder="Paste YouTube video URL"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                className="flex-1 px-4 py-3 rounded-xl border border-border/70 bg-background focus:outline-none focus:ring-2 focus:ring-primary/60"
              />
              <button
                onClick={handleProcessVideo}
                disabled={isProcessing}
                className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-white font-medium shadow-sm hover:shadow transition disabled:opacity-60"
              >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Youtube className="w-4 h-4" />}
                Check video & transcript
              </button>
            </div>
            {transcriptStatus && (
              <div className="flex items-start gap-3 text-sm text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 rounded-xl p-3">
                <AlertCircle className="w-4 h-4 mt-0.5" />
                <div>
                  <p className="font-medium text-foreground">Transcript guidance</p>
                  <p>{transcriptStatus}</p>
                </div>
              </div>
            )}
            {transcriptError && (
              <div className="flex items-start gap-3 text-sm text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-800/50 rounded-xl p-3">
                <AlertCircle className="w-4 h-4 mt-0.5" />
                <div>
                  <p className="font-medium text-foreground">We hit a snag</p>
                  <p>{transcriptError}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-card rounded-2xl border border-border/60 shadow-sm p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Step 1</p>
                <h2 className="text-lg font-semibold text-foreground">Add transcript (paste or upload)</h2>
              </div>
              <label className="inline-flex items-center gap-2 text-sm text-primary cursor-pointer">
                <UploadCloud className="w-4 h-4" />
                <span>Upload .srt/.vtt</span>
                <input
                  type="file"
                  accept=".srt,.vtt,.txt"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) parseCaptionFile(file);
                  }}
                />
              </label>
            </div>
            <textarea
              value={rawTranscript}
              onChange={(e) => setRawTranscript(e.target.value)}
              placeholder="Paste transcript text or captions here..."
              className="w-full min-h-[160px] rounded-xl border border-border/70 bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/60"
            />
            <p className="text-xs text-muted-foreground">
              Tip: On YouTube, open the video → click the three dots → "Show transcript" → copy & paste. Add language-appropriate captions for best results.
            </p>
          </div>

          <div className="bg-card rounded-2xl border border-border/60 shadow-sm p-5 space-y-4">
            <div className="flex items-center gap-2 justify-between flex-wrap">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Step 2</p>
                <h2 className="text-lg font-semibold text-foreground">Generate study guide</h2>
                <p className="text-sm text-muted-foreground">We will format the transcript into clean notes. If no transcript, we will build a careful outline.</p>
              </div>
              <button
                onClick={generateLessonFromTranscript}
                disabled={isProcessing}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium shadow-sm hover:shadow disabled:opacity-60"
              >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Generate study guide
              </button>
            </div>
            {processingStatus === 'transcribing' && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> Preparing your study guide...
              </div>
            )}
            {lessonContent ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold text-foreground">{videoTitle || 'Study guide'}</h3>
                  <button
                    onClick={copyTranscript}
                    className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <Copy className="w-4 h-4" /> Copy
                  </button>
                </div>
                <div className="prose dark:prose-invert max-w-none border border-border/60 rounded-xl p-4 bg-background/60">
                  <MarkdownRenderer content={lessonContent} />
                </div>
              </div>
            ) : (
              <div className="border border-dashed border-border/70 rounded-xl p-4 text-sm text-muted-foreground">
                Generate your study guide to see structured notes here.
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-card rounded-2xl border border-border/60 shadow-sm p-4 space-y-3">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Actions</p>
                <h3 className="text-base font-semibold text-foreground">Generate outputs</h3>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2">
              <button
                onClick={handleGenerateQuiz}
                disabled={isGeneratingQuiz || !contentForActions}
                className="inline-flex items-center justify-between gap-2 px-3 py-3 rounded-xl border border-border/70 text-left hover:bg-muted/40 transition disabled:opacity-60"
              >
                <div className="flex items-center gap-2">
                  {isGeneratingQuiz ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileQuestion className="w-4 h-4 text-primary" />}
                  <div>
                    <p className="text-sm font-semibold text-foreground">Generate quiz</p>
                    <p className="text-xs text-muted-foreground">10 questions with explanations</p>
                  </div>
                </div>
              </button>

              <button
                onClick={handleGenerateFlashcards}
                disabled={isGeneratingFlashcards || !contentForActions}
                className="inline-flex items-center justify-between gap-2 px-3 py-3 rounded-xl border border-border/70 text-left hover:bg-muted/40 transition disabled:opacity-60"
              >
                <div className="flex items-center gap-2">
                  {isGeneratingFlashcards ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4 text-primary" />}
                  <div>
                    <p className="text-sm font-semibold text-foreground">Generate flashcards</p>
                    <p className="text-xs text-muted-foreground">Spaced repetition ready</p>
                  </div>
                </div>
              </button>

              <button
                onClick={handleGenerateNotes}
                disabled={isGeneratingNotes || !contentForActions}
                className="inline-flex items-center justify-between gap-2 px-3 py-3 rounded-xl border border-border/70 text-left hover:bg-muted/40 transition disabled:opacity-60"
              >
                <div className="flex items-center gap-2">
                  {isGeneratingNotes ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookOpen className="w-4 h-4 text-primary" />}
                  <div>
                    <p className="text-sm font-semibold text-foreground">Generate quick notes</p>
                    <p className="text-xs text-muted-foreground">3 concise note sets</p>
                  </div>
                </div>
              </button>
            </div>
            {!contentForActions && (
              <p className="text-xs text-muted-foreground">Paste a transcript and generate a guide first to unlock these.</p>
            )}
          </div>

          <div className="bg-card rounded-2xl border border-border/60 shadow-sm p-4 space-y-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-primary" />
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">How to add transcript</p>
                <h3 className="text-base font-semibold text-foreground">Manual fallback</h3>
              </div>
            </div>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>Open the video on YouTube and click the three dots below the player.</li>
              <li>Select "Show transcript" and choose your language.</li>
              <li>Copy all transcript text and paste it into the box above, or download captions and upload the .srt/.vtt file.</li>
              <li>Click "Generate study guide" to format it and unlock quizzes/flashcards.</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
