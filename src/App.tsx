import { useState, useCallback, useEffect, useMemo } from 'react';
import { Toaster } from 'react-hot-toast';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { EnhancedNavigation } from './components/enhanced/EnhancedNavigation';
import { EnhancedDashboard } from './components/enhanced/EnhancedDashboard';
import { CommandPalette, useCommandPalette } from './components/enhanced/CommandPalette';
import { UploadManager } from './components/UploadManager';
import { LessonGenerator } from './components/LessonGenerator';
import { QuizManager } from './components/QuizManager';
import { FlashcardManager } from './components/FlashcardManager';
import { ChatInterface } from './components/ChatInterface';
import { Settings } from './components/Settings';
import { processor, Upload } from './services/FileProcessor';
import { FlashcardProvider } from './contexts/FlashcardContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { MobileBottomNav } from './components/MobileBottomNav';
import { KeyboardShortcutsGuide } from './components/KeyboardShortcutsGuide';
import { useUploads, useCreateUpload, useDeleteUpload } from './hooks/useLocalStorage';
import { StudyTimer } from './components/StudyTimer';
import { VideoToLesson } from './components/VideoToLesson';
import { ImageRecognition } from './components/ImageRecognition';
import { InvestorPanel } from './components/InvestorPanel';
import { ProfessionalAICoach } from './components/ProfessionalAICoach';
import { NotesApp } from './components/NotesApp';
import { TaskManager } from './components/TaskManager';
import { HabitTracker } from './components/HabitTracker';
import { ApiKeyNotice } from './components/ApiKeyNotice';

export type TabType = 'dashboard' | 'upload' | 'youtube' | 'lessons' | 'quiz' | 'flashcards' | 'chat' | 'investors' | 'settings' | 'ai-coach' | 'study-timer' | 'image-recognition' | 'notes' | 'tasks' | 'habits';

const ACTIVE_TAB_STORAGE_KEY = 'activeTab';

const TABS: TabType[] = [
  'dashboard',
  'upload',
  'youtube',
  'lessons',
  'quiz',
  'flashcards',
  'chat',
  'investors',
  'settings',
  'ai-coach',
  'study-timer',
  'image-recognition',
  'notes',
  'tasks',
  'habits',
];

const API_KEY_REQUIRED_TABS: TabType[] = [
  'youtube',
  'lessons',
  'quiz',
  'flashcards',
  'chat',
  'ai-coach',
  'image-recognition',
];

const isValidTab = (tab: string | null): tab is TabType => {
  return Boolean(tab && TABS.includes(tab as TabType));
};

/**
 * The main application component.
 * Manages global state, navigation, and renders the active view.
 */
function AppContent() {
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    if (typeof window === 'undefined') return 'dashboard';

    const storedTab = localStorage.getItem(ACTIVE_TAB_STORAGE_KEY);
    if (isValidTab(storedTab)) {
      return storedTab;
    }

    return 'dashboard';
  });
  const { isOpen: isPaletteOpen, close: closePalette } = useCommandPalette();

  const stableSetActiveTab = useCallback((tab: TabType) => {
    setActiveTab(tab);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    localStorage.setItem(ACTIVE_TAB_STORAGE_KEY, activeTab);
  }, [activeTab]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key !== ACTIVE_TAB_STORAGE_KEY) return;
      if (!isValidTab(event.newValue)) return;

      setActiveTab(event.newValue);
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);
  
  // Use localStorage hooks for persistent storage
  const { 
    data: uploadsData
  } = useUploads();
  const createUploadMutation = useCreateUpload();
  const deleteUploadMutation = useDeleteUpload();

  const handleAddUpload = useCallback(async (
    file: File,
    opts: {
      signal: AbortSignal;
      clientHint: { mime?: string; ext?: string; pipeline?: string };
      onProgress: (percent: number, message?: string, etaSeconds?: number) => void
    }
  ): Promise<Upload> => {
    const throwIfAborted = () => {
      if (opts.signal?.aborted) {
        throw new DOMException('Upload aborted', 'AbortError');
      }
    };

    let lastProgress = 0;
    const emitProgress = (percent: number, message?: string, etaSeconds?: number) => {
      throwIfAborted();
      lastProgress = Math.min(100, Math.max(lastProgress, percent));
      opts.onProgress(lastProgress, message, etaSeconds);
    };

    try {
      throwIfAborted();
      if (!file || file.size === 0) {
        throw new Error('Invalid file: File is empty or null');
      }

      // Report progress during processing
      emitProgress(5, 'Queued for processing...');

      throwIfAborted();

      const newUpload = await processor.processFile(file, {
        signal: opts.signal,
        onProgress: (progress, message, etaSeconds) => {
          // guard against regressions from the processor and aborted work
          emitProgress(Math.min(progress, 98), message, etaSeconds);
        },
      });

      emitProgress(Math.max(lastProgress, 92), 'Finalizing upload...');

      throwIfAborted();

      if (!newUpload.processed || newUpload.status === 'failed') {
        throw new Error(newUpload.errorMessage || 'File processing failed');
      }

      emitProgress(Math.max(lastProgress, 96), 'Saving upload...');

      throwIfAborted();

      await createUploadMutation.mutateAsync({
        id: newUpload.id,
        filename: newUpload.filename,
        size: newUpload.size,
        uploadedAt: newUpload.uploadedAt,
        fullText: newUpload.fullText,
        slideCount: newUpload.slideCount,
        status: newUpload.status,
        processed: newUpload.processed,
        indexed: newUpload.indexed,
        errorMessage: newUpload.errorMessage || undefined,
      });

      throwIfAborted();
      emitProgress(100, 'Complete', 0);

      return newUpload;
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  }, [createUploadMutation]);

  const handleDeleteUpload = useCallback((id: string) => {
    deleteUploadMutation.mutate(id);
  }, [deleteUploadMutation]);
  
  const uploads = useMemo(() => (uploadsData || []) as Upload[], [uploadsData]);
  // Get API key from environment
  const apiKey = (import.meta.env?.VITE_OPENROUTER_API_KEY ?? '').trim();
  const requiresApiKey = API_KEY_REQUIRED_TABS.includes(activeTab);

  // A map of tab keys to their corresponding components for cleaner rendering
  const viewMap: Record<TabType, React.ReactNode> = useMemo(() => ({
    dashboard: <EnhancedDashboard uploads={uploads as Upload[]} onNavigate={stableSetActiveTab} />,
    upload: (
      <UploadManager
        uploads={uploads as Upload[]}
        onAddUpload={handleAddUpload}
        onDeleteUpload={handleDeleteUpload}
      />
    ),
    youtube: (
      <VideoToLesson
        onVideoProcessed={() => {}}
        apiKey={apiKey}
      />
    ),
    'image-recognition': (
      <ImageRecognition
        onImageProcessed={() => {}}
        apiKey={apiKey}
      />
    ),
    lessons: <LessonGenerator uploads={uploads as Upload[]} apiKey={apiKey} />,
    quiz: <QuizManager uploads={uploads as Upload[]} apiKey={apiKey} />,
    flashcards: <FlashcardManager uploads={uploads as Upload[]} apiKey={apiKey} />,
    chat: <ChatInterface uploads={uploads as Upload[]} apiKey={apiKey} />,
    'ai-coach': <ProfessionalAICoach />,
    'study-timer': (
      <StudyTimer
        onSessionComplete={() => {}}
      />
    ),
    notes: <NotesApp />,
    tasks: <TaskManager />,
    habits: <HabitTracker />,
    investors: <InvestorPanel />,
    settings: <Settings uploads={uploads as Upload[]} />,
  }), [apiKey, handleAddUpload, handleDeleteUpload, stableSetActiveTab, uploads]);

  const activeView = viewMap[activeTab] || <EnhancedDashboard uploads={uploads as Upload[]} onNavigate={stableSetActiveTab} />;

  const apiKeyDescriptions: Partial<Record<TabType, string>> = {
    youtube: 'Video-to-lesson conversion relies on the OpenRouter API. Add your key to process clips.',
    lessons: 'Lesson generation needs a valid API key to create outlines and study plans.',
    quiz: 'Quizzes are generated with the AI provider. Connect your key to continue.',
    flashcards: 'AI flashcards are created from your materials using the configured API key.',
    chat: 'Chat responses come from the OpenRouter provider. Add your key to chat with your tutor.',
    'ai-coach': 'The AI coach uses your API key for guidance and voice notes.',
    'image-recognition': 'Image recognition calls the AI provider. Add your key to process images.',
  };

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      <div className="gradient-mesh fixed inset-0 opacity-20 pointer-events-none" />
      <div className="relative z-10">
        <EnhancedNavigation activeTab={activeTab} onTabChange={stableSetActiveTab} />
        <main className="lg:ml-72 px-4 py-8 pb-20 md:pb-8">
          <div className="container mx-auto max-w-7xl">
            {requiresApiKey && !apiKey && (
              <ApiKeyNotice
                onOpenSettings={() => stableSetActiveTab('settings')}
                description={apiKeyDescriptions[activeTab]}
              />
            )}
            {requiresApiKey && !apiKey ? (
              <EnhancedDashboard uploads={uploads as Upload[]} onNavigate={stableSetActiveTab} />
            ) : (
              activeView
            )}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav activeTab={activeTab} onTabChange={stableSetActiveTab} />

      {/* Keyboard Shortcuts Guide */}
      <KeyboardShortcutsGuide onNavigate={(tab) => stableSetActiveTab(tab as TabType)} />

      {/* Command Palette */}
      <CommandPalette
        isOpen={isPaletteOpen}
        onClose={closePalette}
        onNavigate={stableSetActiveTab}
      />
      
      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'rgb(var(--color-card))',
            color: 'rgb(var(--color-card-foreground))',
            border: '1px solid rgb(var(--color-border))',
            borderRadius: 'var(--radius)',
          },
        }}
      />
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <FlashcardProvider>
              <AppContent />
            </FlashcardProvider>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
