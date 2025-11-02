import React from 'react';
import { Upload, FileText, Brain, MessageSquare, TrendingUp } from 'lucide-react';
import { Upload as UploadType } from '../services/FileProcessor';
import { TabType } from '../App';

interface DashboardProps {
  uploads: UploadType[];
  onNavigate: (tab: TabType) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ uploads, onNavigate }) => {
  const totalSlides = uploads.reduce((sum, upload) => sum + upload.slideCount, 0);
  const processedUploads = uploads.filter(u => u.processed).length;
  const indexedUploads = uploads.filter(u => u.indexed).length;

  const stats = [
    { label: 'Study Materials', value: uploads.length, icon: Upload, color: 'indigo' },
    { label: 'Content Mastered', value: totalSlides, icon: FileText, color: 'emerald' },
    { label: 'Knowledge Base', value: indexedUploads, icon: Brain, color: 'purple' },
    { label: 'AI Tutor Ready', value: indexedUploads, icon: MessageSquare, color: 'blue' },
  ];

  const quickActions = [
    { label: 'Add Study Material', description: 'Upload PDFs and presentations instantly', action: () => onNavigate('upload'), icon: Upload },
    { label: 'Build Smart Lessons', description: 'Transform content into learning magic', action: () => onNavigate('lessons'), icon: Brain },
    { label: 'Test Your Mastery', description: 'Challenge yourself with AI quizzes', action: () => onNavigate('quiz'), icon: FileText },
    { label: 'Get Instant Answers', description: 'Your personal study assistant', action: () => onNavigate('chat'), icon: MessageSquare },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl mx-auto flex items-center justify-center mb-4">
          <TrendingUp className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-4xl font-bold text-foreground">Your Learning Superpower Starts Here</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Turn any presentation or document into personalized study materials that actually stick. Powered by AI, designed for student success.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="glass-card rounded-xl p-6 shadow-sm border border-border/40 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 bg-${stat.color}-100 rounded-lg flex items-center justify-center`}>
                  <Icon className={`w-6 h-6 text-${stat.color}-600`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="glass-card rounded-xl p-8 shadow-sm border border-border/40">
        <h2 className="text-2xl font-bold text-foreground mb-6">Jump Into Action</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <button
                key={index}
                onClick={action.action}
                className="p-6 rounded-lg border border-border/40 hover:border-secondary hover:shadow-md transition-all duration-200 text-left group"
              >
                <Icon className="w-8 h-8 text-indigo-600 mb-3 group-hover:scale-110 transition-transform" />
                <h3 className="font-semibold text-foreground mb-2">{action.label}</h3>
                <p className="text-sm text-muted-foreground">{action.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Recent Uploads */}
      <div className="glass-card rounded-xl p-8 shadow-sm border border-border/40">
        <h2 className="text-2xl font-bold text-foreground mb-6">Your Study Library</h2>
        {uploads.length === 0 ? (
          <div className="text-center py-12">
            <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">Ready to ace your studies? Upload your first document and watch the magic happen!</p>
            <button
              onClick={() => onNavigate('upload')}
              className="px-6 py-3 bg-secondary text-white rounded-lg hover:bg-secondary/90 transition-colors"
            >
              Start Learning Now
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {uploads.slice(-6).reverse().map((upload) => (
              <div key={upload.id} className="border border-border/40 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                    <FileText className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground truncate">{upload.filename}</h3>
                    <p className="text-sm text-muted-foreground">
                      {upload.slideCount} slides • {upload.processed ? 'Processed' : 'Processing...'}
                    </p>
                    <div className="flex gap-2 mt-2">
                      {upload.processed && (
                        <span className="px-2 py-1 text-xs bg-success/10 text-success rounded">
                          Processed
                        </span>
                      )}
                      {upload.indexed && (
                        <span className="px-2 py-1 text-xs bg-accent/10 text-accent rounded">
                          Indexed
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};