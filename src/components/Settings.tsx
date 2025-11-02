import React from 'react';
import { Settings as SettingsIcon, Download, AlertCircle, CheckCircle } from 'lucide-react';
import { Upload } from '../services/FileProcessor';

interface SettingsProps {
  uploads: Upload[];
}

export const Settings: React.FC<SettingsProps> = ({ uploads }) => {
  const envApiKey = (import.meta.env?.VITE_OPENROUTER_API_KEY ?? '').trim();

  const exportAllData = () => {
    const data = {
      uploads: uploads.map(u => ({
        id: u.id,
        filename: u.filename,
        uploadedAt: u.uploadedAt,
        slideCount: u.slideCount,
        processed: u.processed,
        indexed: u.indexed
      })),
      flashcards: JSON.parse(localStorage.getItem('slidetutor_flashcards') || '[]'),
      exportedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `slidetutor-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearAllData = () => {
    if (confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  const diagnostics = [
    { name: 'OpenRouter API Key', status: !!envApiKey, description: 'Required for AI features' },
    { name: 'File API', status: typeof File !== 'undefined', description: 'File upload support' },
    { name: 'Fetch API', status: typeof fetch !== 'undefined', description: 'API communication' },
    { name: 'Local Storage', status: typeof localStorage !== 'undefined', description: 'Data persistence' },
  ];

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-foreground mb-4">Control Your Learning Experience</h1>
        <p className="text-lg text-muted-foreground">
          Manage your data, check system health, and customize your study environment.
        </p>
      </div>

      {/* Data Management */}
      <div className="glass-card rounded-xl p-6 shadow-sm border border-border/40">
        <h2 className="text-xl font-bold text-foreground mb-6">Your Data, Your Control</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold text-foreground mb-3">Backup Your Progress</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Save all your study materials and progress securely.
            </p>
            <button
              onClick={exportAllData}
              className="px-4 py-2 bg-success text-white rounded-lg hover:bg-success/90 transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export All Data
            </button>
          </div>

          <div>
            <h3 className="font-semibold text-foreground mb-3">Fresh Start</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Clear everything and begin with a clean slate.
            </p>
            <button
              onClick={clearAllData}
              className="px-4 py-2 bg-error text-white rounded-lg hover:bg-error/90 transition-colors"
            >
              Clear All Data
            </button>
          </div>
        </div>
      </div>

      {/* System Diagnostics */}
      <div className="glass-card rounded-xl p-6 shadow-sm border border-border/40">
        <div className="flex items-center gap-3 mb-6">
          <SettingsIcon className="w-6 h-6 text-muted-foreground" />
          <h2 className="text-xl font-bold text-foreground">System Health Check</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {diagnostics.map((item, index) => (
            <div key={index} className="flex items-start gap-3 p-4 border border-border/40 rounded-lg">
              {item.status ? (
                <CheckCircle className="w-5 h-5 text-success mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
              )}
              <div>
                <h3 className="font-medium text-foreground">{item.name}</h3>
                <p className="text-sm text-muted-foreground">{item.description}</p>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  item.status 
                    ? 'bg-success/10 text-success' 
                    : 'bg-error/10 text-red-700'
                }`}>
                  {item.status ? 'Working' : 'Not Available'}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-muted/20 rounded-lg">
          <h3 className="font-medium text-foreground mb-2">Statistics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Total Uploads:</span>
              <span className="font-semibold text-foreground ml-2">{uploads.length}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Processed:</span>
              <span className="font-semibold text-foreground ml-2">
                {uploads.filter(u => u.processed).length}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Indexed:</span>
              <span className="font-semibold text-foreground ml-2">
                {uploads.filter(u => u.indexed).length}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Total Slides:</span>
              <span className="font-semibold text-foreground ml-2">
                {uploads.reduce((sum, u) => sum + u.slideCount, 0)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Usage Tips */}
      <div className="glass-card rounded-xl p-6 shadow-sm border border-border/40">
        <h2 className="text-xl font-bold text-foreground mb-4">Pro Tips for Success</h2>
        <div className="space-y-3 text-foreground">
          <div className="flex gap-3">
            <span className="w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center text-sm font-bold">1</span>
            <p>Upload your PDF or PPTX files using the Upload tab - the system will automatically extract text and process content.</p>
          </div>
          <div className="flex gap-3">
            <span className="w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center text-sm font-bold">2</span>
            <p>Use the Lessons tab to generate comprehensive, multi-level educational content from your documents.</p>
          </div>
          <div className="flex gap-3">
            <span className="w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center text-sm font-bold">3</span>
            <p>Create and take quizzes to test your knowledge, with immediate feedback and explanations.</p>
          </div>
          <div className="flex gap-3">
            <span className="w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center text-sm font-bold">4</span>
            <p>Generate flashcards and use the spaced repetition system to optimize your learning retention.</p>
          </div>
          <div className="flex gap-3">
            <span className="w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center text-sm font-bold">5</span>
            <p>Use the Chat Q&A feature to ask specific questions about your documents and get AI-powered answers.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
