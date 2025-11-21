import { Upload, BookOpen, Brain, MessageSquare, Clock, Target, Sparkles } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './Card';
import { Button } from './Button';
import type { TabType } from '../../App';
import type { Upload as UploadType } from '../UploadManager';
import { formatRelativeTime } from '../../lib/utils';
import { StudyPlanWidget } from './StudyPlanWidget';
import { StudyBoostWidget } from './StudyBoostWidget';

interface EnhancedDashboardProps {
  uploads: UploadType[];
  onNavigate: (tab: TabType) => void;
  apiKey?: string;
}

export function EnhancedDashboard({ uploads, onNavigate, apiKey }: EnhancedDashboardProps) {
  const stats = {
    totalUploads: uploads.length,
    processedUploads: uploads.filter(u => u.processed).length,
    indexedUploads: uploads.filter(u => u.indexed).length,
    totalSlides: uploads.reduce((sum, u) => sum + (u.slideCount || 0), 0),
  };

  const recentUploads = uploads.slice(0, 5);

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl p-8 md:p-12 bg-white/80 dark:bg-card/80 border border-border/60 shadow-2xl shadow-primary/10 backdrop-blur-xl">
        <div className="gradient-mesh absolute inset-0 opacity-30" />
        <div className="grid-overlay absolute inset-0" />
        <div className="absolute -right-24 -top-24 w-80 h-80 rounded-full bg-primary/25 blur-3xl" />
        <div className="absolute -left-16 bottom-0 w-72 h-72 rounded-full bg-secondary/30 blur-3xl" />
        <div className="relative z-10 space-y-4">
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-secondary/10 text-secondary ring-1 ring-secondary/30">
              <Sparkles className="w-4 h-4" /> Goal-aware plans
            </span>
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-accent/10 text-accent ring-1 ring-accent/30">
              Daily boosts & streak savers
            </span>
          </div>
          <div className="flex flex-col gap-3">
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              SlideTutor AI — upload, learn, quiz, and level up
            </h1>
            <p className="text-lg text-muted-foreground max-w-3xl">
              Turn PDFs, videos, and notes into guided lessons, quizzes, flashcards, and streak-friendly boosts. Stay in flow with light or dark mode, glassy cards, and responsive layouts.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="primary"
              size="lg"
              onClick={() => onNavigate('upload')}
              icon={<Upload className="w-5 h-5" />}
            >
              Upload Content
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => onNavigate('lessons')}
              icon={<BookOpen className="w-5 h-5" />}
            >
              Browse Lessons
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StudyPlanWidget apiKey={apiKey} />
        <StudyBoostWidget apiKey={apiKey} />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card variant="glass" hover>
          <CardContent className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-secondary/80 to-secondary rounded-lg shadow-lg">
              <Upload className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Uploads</p>
              <p className="text-3xl font-bold text-foreground">{stats.totalUploads}</p>
            </div>
          </CardContent>
        </Card>

        <Card variant="glass" hover>
          <CardContent className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg shadow-lg">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Slides Processed</p>
              <p className="text-3xl font-bold text-foreground">{stats.totalSlides}</p>
            </div>
          </CardContent>
        </Card>

        <Card variant="glass" hover>
          <CardContent className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg shadow-lg">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Indexed Documents</p>
              <p className="text-3xl font-bold text-foreground">{stats.indexedUploads}</p>
            </div>
          </CardContent>
        </Card>

        <Card variant="glass" hover>
          <CardContent className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg shadow-lg">
              <MessageSquare className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Ready for Chat</p>
              <p className="text-3xl font-bold text-foreground">{stats.indexedUploads}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card variant="gradient">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-6 h-6 text-secondary" />
            Quick Actions
          </CardTitle>
          <CardDescription>
            Jump right into your learning journey
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              onClick={() => onNavigate('upload')}
              className="p-6 rounded-xl bg-muted/50 hover:bg-muted transition-all duration-200 active:scale-95 group"
            >
              <Upload className="w-8 h-8 text-primary mb-3 group-hover:scale-110 transition-transform" />
              <h3 className="font-semibold text-foreground mb-1">Upload Files</h3>
              <p className="text-sm text-muted-foreground">Add new PDFs or PPTX files</p>
            </button>

            <button
              onClick={() => onNavigate('lessons')}
              className="p-6 rounded-xl bg-muted/50 hover:bg-muted transition-all duration-200 active:scale-95 group"
            >
              <BookOpen className="w-8 h-8 text-secondary mb-3 group-hover:scale-110 transition-transform" />
              <h3 className="font-semibold text-foreground mb-1">Generate Lesson</h3>
              <p className="text-sm text-muted-foreground">Create AI-powered lessons</p>
            </button>

            <button
              onClick={() => onNavigate('quiz')}
              className="p-6 rounded-xl bg-muted/50 hover:bg-muted transition-all duration-200 active:scale-95 group"
            >
              <Brain className="w-8 h-8 text-accent mb-3 group-hover:scale-110 transition-transform" />
              <h3 className="font-semibold text-foreground mb-1">Take Quiz</h3>
              <p className="text-sm text-muted-foreground">Practice with generated quizzes</p>
            </button>

            <button
              onClick={() => onNavigate('chat')}
              className="p-6 rounded-xl bg-muted/50 hover:bg-muted transition-all duration-200 active:scale-95 group"
            >
              <MessageSquare className="w-8 h-8 text-success mb-3 group-hover:scale-110 transition-transform" />
              <h3 className="font-semibold text-foreground mb-1">Chat Q&A</h3>
              <p className="text-sm text-muted-foreground">Ask questions about your documents</p>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      {recentUploads.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-6 h-6 text-primary" />
              Recent Activity
            </CardTitle>
            <CardDescription>
              Your latest uploads and progress
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentUploads.map((upload, index) => (
                <div
                  key={upload.id}
                  className="flex items-center gap-4 p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors animate-slide-up"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold">
                    {upload.filename[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{upload.filename}</p>
                    <p className="text-sm text-muted-foreground">
                      {upload.slideCount} slides • {formatRelativeTime(upload.uploadedAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {upload.processed && (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-success/20 text-success">
                        Processed
                      </span>
                    )}
                    {upload.indexed && (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-secondary/20 text-secondary">
                        Indexed
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
