import { useState, useEffect } from 'react';
import { Youtube, Loader2, CheckCircle2, AlertCircle, Copy, FileText, BookOpen, Brain, FileQuestion } from 'lucide-react';
import toast from 'react-hot-toast';
import { ChunkedAIProcessor } from '../services/ChunkedAIProcessor';
import { OpenRouterAPI } from '../services/OpenRouterAPI';
import { MarkdownRenderer } from './MarkdownRenderer';

interface VideoToLessonProps {
  onVideoProcessed: (videoData: { title: string; transcript: string; url: string }) => void;
  apiKey: string;
}

interface VideoState {
  youtubeUrl: string;
  transcript: string;
  videoTitle: string;
  processingStatus: 'idle' | 'extracting' | 'transcribing' | 'success' | 'error';
}

const STORAGE_KEY = 'slidetutor_youtube_video_state';

export function VideoToLesson({ onVideoProcessed, apiKey }: VideoToLessonProps) {
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<'idle' | 'extracting' | 'transcribing' | 'success' | 'error'>('idle');
  const [transcript, setTranscript] = useState('');
  const [videoTitle, setVideoTitle] = useState('');
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [isGeneratingFlashcards, setIsGeneratingFlashcards] = useState(false);
  const [isGeneratingNotes, setIsGeneratingNotes] = useState(false);

  // Load persisted state on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const state: VideoState = JSON.parse(saved);
        setYoutubeUrl(state.youtubeUrl);
        setTranscript(state.transcript);
        setVideoTitle(state.videoTitle);
        setProcessingStatus(state.processingStatus);
      }
    } catch (error) {
      console.error('Failed to load saved video state:', error);
    }
  }, []);

  // Persist state whenever it changes
  useEffect(() => {
    if (transcript || youtubeUrl) {
      const state: VideoState = {
        youtubeUrl,
        transcript,
        videoTitle,
        processingStatus,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  }, [youtubeUrl, transcript, videoTitle, processingStatus]);

  const extractVideoId = (url: string): string | null => {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  };

  const handleProcessVideo = async () => {
    if (!youtubeUrl.trim()) {
      toast.error('Please enter a YouTube URL');
      return;
    }

    if (!apiKey) {
      toast.error('Please configure your OpenRouter API key in Settings first');
      return;
    }

    const videoId = extractVideoId(youtubeUrl);
    if (!videoId) {
      toast.error('Invalid YouTube URL. Please enter a valid YouTube video URL');
      return;
    }

    setIsProcessing(true);
    setProcessingStatus('extracting');
    setTranscript('');
    setVideoTitle('');

    try {
      // Fetch video metadata from YouTube
      const apiUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
      const response = await fetch(apiUrl);
      const data = await response.json();
      const title = data.title || 'YouTube Video';
      setVideoTitle(title);
      
      setProcessingStatus('transcribing');
      
      // Try to get real captions using YouTube Transcript API
      let transcriptText = '';
      try {
        const transcriptResponse = await fetch(
          `https://youtube-transcript-api.p.rapidapi.com/transcript?video_id=${videoId}`,
          {
            headers: {
              'X-RapidAPI-Key': 'demo', // Using demo key - in production, users would need their own
            }
          }
        ).catch(() => null);

        if (transcriptResponse && transcriptResponse.ok) {
          const transcriptData = await transcriptResponse.json();
          if (Array.isArray(transcriptData) && transcriptData.length > 0) {
            transcriptText = transcriptData.map((item: any) => item.text).join(' ');
          }
        }
      } catch (transcriptError) {
        console.log('Could not fetch transcript, will generate AI summary instead');
      }

      // If we got a transcript, use it; otherwise generate AI content
      let finalContent: string;
      const api = new OpenRouterAPI(apiKey);
      
      if (transcriptText && transcriptText.length > 100) {
        // We have a real transcript - format it nicely
        const promptContent = `You are an expert educator. Format the following YouTube video transcript into a well-structured, easy-to-read educational document.

Video Title: "${title}"

Raw Transcript:
${transcriptText}

Transform this into:
1. A clear introduction summarizing what the video covers
2. Main sections with headings for each topic discussed
3. Key points formatted as bullet lists
4. Important quotes or concepts highlighted
5. A summary of key takeaways

Use proper markdown formatting with headers, bold for key terms, bullet points, and blockquotes for important concepts. Make it professional and easy to study from.`;

        finalContent = await api.generateLesson(promptContent);
      } else {
        // No transcript available - inform user and generate educational outline
        const promptContent = `Create a comprehensive educational study guide for a YouTube video titled "${title}".

Since the actual transcript is not available, create a detailed outline covering what this video likely teaches, including:

**Note: This is an AI-generated study guide as the video transcript was not accessible.**

1. **Introduction**: What the video likely covers
2. **Core Concepts**: Main topics and ideas
3. **Key Learning Points**: Important information to understand
4. **Practical Applications**: How to apply this knowledge
5. **Further Study**: Related topics to explore

Use proper markdown with headers, bold text, bullet points, and professional formatting.`;

        finalContent = await api.generateLesson(promptContent);
      }
      
      setTranscript(finalContent);
      setProcessingStatus('success');
      
      const videoData = {
        title: title,
        transcript: finalContent,
        url: youtubeUrl,
      };

      onVideoProcessed(videoData);
      
      if (transcriptText) {
        toast.success('Video transcript processed successfully!');
      } else {
        toast.success('AI study guide generated! (Original transcript not available)');
      }
      setIsProcessing(false);

    } catch (error) {
      console.error('Video processing error:', error);
      setProcessingStatus('error');
      setTranscript('');
      toast.error('Failed to process video. Please check your API key and try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const copyTranscript = () => {
    navigator.clipboard.writeText(transcript);
    toast.success('Transcript copied to clipboard!');
  };

  const handleGenerateQuiz = async () => {
    if (!apiKey) {
      toast.error('Please configure your OpenRouter API key in Settings first');
      return;
    }
    if (!transcript) {
      toast.error('No transcript available');
      return;
    }

    setIsGeneratingQuiz(true);
    try {
      const processor = new ChunkedAIProcessor(apiKey);
      const quizJson = await processor.generateChunkedQuiz(transcript, 10);
      const parsed = JSON.parse(quizJson);
      
      // Store in localStorage for the quiz manager to access
      const existingQuizzes = JSON.parse(localStorage.getItem('slidetutor_generated_quizzes') || '[]');
      existingQuizzes.push({
        id: `youtube-${Date.now()}`,
        title: `Quiz: ${videoTitle}`,
        questions: parsed.quiz,
        createdAt: new Date().toISOString(),
        source: 'youtube',
      });
      localStorage.setItem('slidetutor_generated_quizzes', JSON.stringify(existingQuizzes));
      
      toast.success('Quiz generated successfully! Go to the Quiz tab to take it.');
    } catch (error: any) {
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
    if (!transcript) {
      toast.error('No transcript available');
      return;
    }

    setIsGeneratingFlashcards(true);
    try {
      const processor = new ChunkedAIProcessor(apiKey);
      const flashcardsJson = await processor.generateChunkedFlashcards(transcript, 15);
      const parsed = JSON.parse(flashcardsJson);
      
      // Store in localStorage for the flashcard manager to access
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
      
      toast.success('Flashcards generated successfully! Go to the Flashcards tab to study them.');
    } catch (error: any) {
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
    if (!transcript) {
      toast.error('No transcript available');
      return;
    }

    setIsGeneratingNotes(true);
    try {
      const api = new OpenRouterAPI(apiKey);
      const notes = await api.generateLesson(transcript);
      
      // Store in localStorage for the lesson manager to access
      const existingLessons = JSON.parse(localStorage.getItem('slidetutor_lessons') || '[]');
      existingLessons.push({
        id: `youtube-${Date.now()}`,
        title: `Notes: ${videoTitle}`,
        content: notes,
        createdAt: new Date().toISOString(),
        source: 'youtube',
      });
      localStorage.setItem('slidetutor_lessons', JSON.stringify(existingLessons));
      
      toast.success('Notes generated successfully! Go to the Lessons tab to view them.');
    } catch (error: any) {
      console.error('Notes generation error:', error);
      toast.error('Failed to generate notes. Please try again.');
    } finally {
      setIsGeneratingNotes(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="glass-card p-8 rounded-2xl border border-border/40 bg-gradient-to-br from-red-500/5 via-transparent to-pink-500/5">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg shadow-red-500/30">
            <Youtube className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-1">YouTube Learning Hub</h1>
            <p className="text-muted-foreground">Transform any YouTube video into comprehensive study materials</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="glass-card p-4 rounded-xl border border-border/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">Instant</div>
                <div className="text-xs text-muted-foreground">AI Processing</div>
              </div>
            </div>
          </div>
          <div className="glass-card p-4 rounded-xl border border-border/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">Smart</div>
                <div className="text-xs text-muted-foreground">Transcription</div>
              </div>
            </div>
          </div>
          <div className="glass-card p-4 rounded-xl border border-border/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
                <Youtube className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">Any Video</div>
                <div className="text-xs text-muted-foreground">All Formats</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Processing Card */}
      <div className="glass-card p-6 rounded-2xl border border-border/40">
        <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            YouTube Video URL
          </label>
          <input
            type="url"
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            disabled={isProcessing}
            className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground placeholder:text-muted-foreground disabled:opacity-50"
            onKeyDown={(e) => e.key === 'Enter' && handleProcessVideo()}
          />
        </div>

        {processingStatus !== 'idle' && (
          <div className="flex items-center gap-3 p-4 bg-background/50 rounded-lg border border-border">
            {processingStatus === 'extracting' && (
              <>
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
                <span className="text-sm text-muted-foreground">Extracting video information...</span>
              </>
            )}
            {processingStatus === 'transcribing' && (
              <>
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
                <span className="text-sm text-muted-foreground">Transcribing audio content...</span>
              </>
            )}
            {processingStatus === 'success' && (
              <>
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <span className="text-sm text-green-600 dark:text-green-400">Video processed successfully!</span>
              </>
            )}
            {processingStatus === 'error' && (
              <>
                <AlertCircle className="w-5 h-5 text-red-500" />
                <span className="text-sm text-error dark:text-red-400">Processing failed. Please try again.</span>
              </>
            )}
          </div>
        )}

        <button
          onClick={handleProcessVideo}
          disabled={isProcessing || !youtubeUrl.trim()}
          className="w-full px-4 py-2 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-lg hover:from-red-600 hover:to-pink-600 transition-all shadow-lg shadow-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Youtube className="w-4 h-4" />
              Process Video
            </>
          )}
        </button>

        {/* Quick Tips */}
        <div className="mt-6 p-4 bg-primary/5 rounded-xl border border-primary/20">
          <h4 className="text-sm font-semibold text-foreground mb-2">💡 Pro Tips:</h4>
          <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
            <li>Works with educational, tutorial, and documentary videos</li>
            <li>AI generates comprehensive learning materials</li>
            <li>Use the transcript to create quizzes, flashcards, and notes</li>
          </ul>
        </div>
        </div>
      </div>

      {/* Transcript Display Section */}
      {transcript && (
        <div className="mt-6 glass-card p-6 rounded-xl border border-border">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              <h4 className="text-lg font-semibold text-foreground">
                {videoTitle || 'Generated Content'}
              </h4>
            </div>
            <button
              onClick={copyTranscript}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-background hover:bg-muted border border-border rounded-lg transition-colors text-foreground"
            >
              <Copy className="w-4 h-4" />
              Copy
            </button>
          </div>

          {/* Generation Action Buttons */}
          <div className="flex flex-wrap gap-3 mb-6 pb-6 border-b border-border/40">
            <button
              onClick={handleGenerateQuiz}
              disabled={isGeneratingQuiz || !apiKey}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:from-blue-600 hover:to-cyan-600 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGeneratingQuiz ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <FileQuestion className="w-4 h-4" />
                  Generate Quiz
                </>
              )}
            </button>
            <button
              onClick={handleGenerateFlashcards}
              disabled={isGeneratingFlashcards || !apiKey}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg shadow-purple-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGeneratingFlashcards ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Brain className="w-4 h-4" />
                  Generate Flashcards
                </>
              )}
            </button>
            <button
              onClick={handleGenerateNotes}
              disabled={isGeneratingNotes || !apiKey}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all shadow-lg shadow-green-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGeneratingNotes ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <BookOpen className="w-4 h-4" />
                  Generate Notes
                </>
              )}
            </button>
          </div>

          <div className="overflow-y-auto">
            <MarkdownRenderer content={transcript} />
          </div>
        </div>
      )}
    </div>
  );
}
