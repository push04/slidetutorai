import { useState, useCallback, useEffect } from 'react';
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
import { LoadingSpinner } from './components/LoadingSpinner';
import { MobileBottomNav } from './components/MobileBottomNav';
import { KeyboardShortcutsGuide } from './components/KeyboardShortcutsGuide';
import { useUploads, useCreateUpload, useDeleteUpload, useUserProfile } from './hooks/useLocalStorage';
import { SocraticTutor } from './components/SocraticTutor';
import { StudyTimer } from './components/StudyTimer';
import { AdaptiveLearning } from './components/AdaptiveLearning';
import { VideoToLesson } from './components/VideoToLesson';
import { ImageRecognition } from './components/ImageRecognition';

export type TabType = 'dashboard' | 'upload' | 'youtube' | 'lessons' | 'quiz' | 'flashcards' | 'chat' | 'settings' | 'ai-tutor' | 'study-timer';

/**
 * The main application component.
 * Manages global state, navigation, and renders the active view.
 */
function AppContent() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const { isOpen: isPaletteOpen, close: closePalette } = useCommandPalette();
  
  // Use Supabase hooks for persistent storage
  const { 
    data: uploadsData, 
    refetch: refetchUploads 
  } = useUploads();
  const createUploadMutation = useCreateUpload();
  const deleteUploadMutation = useDeleteUpload();
  const { 
    data: userProfile, 
    refetch: refetchProfile 
  } = useUserProfile();

  const handleAddUpload = useCallback(async (
    file: File,
    opts: { 
      signal: AbortSignal; 
      clientHint: { mime?: string; ext?: string; pipeline?: string }; 
      onProgress: (percent: number) => void 
    }
  ): Promise<Upload> => {
    try {
      if (!file || file.size === 0) {
        throw new Error('Invalid file: File is empty or null');
      }

      // Report progress during processing
      opts.onProgress(10);
      
      const newUpload = await processor.processFile(file);
      
      opts.onProgress(60);
      
      if (!newUpload.processed || newUpload.status === 'failed') {
        throw new Error(newUpload.errorMessage || 'File processing failed');
      }
      
      opts.onProgress(80);
      
      await createUploadMutation.mutateAsync({
        id: newUpload.id,
        filename: newUpload.filename,
        original_filename: file.name,
        file_size: newUpload.size,
        mime_type: file.type,
        storage_path: `uploads/${newUpload.id}/${file.name}`,
        full_text: newUpload.fullText,
        slide_count: newUpload.slideCount,
        status: newUpload.status,
        processed: newUpload.processed,
        indexed: newUpload.indexed,
        metadata: {},
        error_message: newUpload.errorMessage || null,
        version: 1,
        parent_upload_id: null,
      });
      
      opts.onProgress(100);
      
      return newUpload;
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  }, [createUploadMutation]);

  const handleDeleteUpload = useCallback((id: string) => {
    deleteUploadMutation.mutate(id);
  }, [deleteUploadMutation]);
  
  const uploads = uploadsData || [];
  // Get API key from environment
  const apiKey = (import.meta.env?.VITE_OPENROUTER_API_KEY ?? '').trim();
  
  // A map of tab keys to their corresponding components for cleaner rendering
  const viewMap: Record<TabType, React.ReactNode> = {
    dashboard: <EnhancedDashboard uploads={uploads} onNavigate={setActiveTab} />,
    upload: (
      <div className="space-y-6">
        <UploadManager
          uploads={uploads}
          onAddUpload={handleAddUpload}
          onDeleteUpload={handleDeleteUpload}
        />
        <ImageRecognition
          onImageProcessed={() => {}}
          apiKey={apiKey}
        />
      </div>
    ),
    youtube: (
      <VideoToLesson 
        onVideoProcessed={() => {}}
        apiKey={apiKey}
      />
    ),
    lessons: <LessonGenerator uploads={uploads} apiKey={apiKey} />,
    quiz: <QuizManager uploads={uploads} apiKey={apiKey} />,
    flashcards: <FlashcardManager uploads={uploads} apiKey={apiKey} />,
    chat: <ChatInterface uploads={uploads} apiKey={apiKey} />,
    'ai-tutor': <SocraticTutor apiKey={apiKey} />,
    'study-timer': (
      <StudyTimer
        onSessionComplete={() => {}}
      />
    ),
    settings: <Settings uploads={uploads} />,
  };

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      <div className="gradient-mesh fixed inset-0 opacity-20 pointer-events-none" />
      <div className="relative z-10">
        <EnhancedNavigation activeTab={activeTab} onTabChange={setActiveTab} />
        <main className="lg:ml-72 px-4 py-8 pb-20 md:pb-8">
          <div className="container mx-auto max-w-7xl">
            {viewMap[activeTab] || <EnhancedDashboard uploads={uploads} onNavigate={setActiveTab} />}
          </div>
        </main>
      </div>
      
      {/* Mobile Bottom Navigation */}
      <MobileBottomNav activeTab={activeTab} onTabChange={setActiveTab} />
      
      {/* Keyboard Shortcuts Guide */}
      <KeyboardShortcutsGuide onNavigate={(tab) => setActiveTab(tab as TabType)} />
      
      {/* Command Palette */}
      <CommandPalette 
        isOpen={isPaletteOpen}
        onClose={closePalette}
        onNavigate={setActiveTab}
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
          <ErrorBoundary>
            <AuthProvider>
              <ErrorBoundary>
                <FlashcardProvider>
                  <ErrorBoundary>
                    <AppContent />
                  </ErrorBoundary>
                </FlashcardProvider>
              </ErrorBoundary>
            </AuthProvider>
          </ErrorBoundary>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
