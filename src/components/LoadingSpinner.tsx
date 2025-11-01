import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  fullScreen?: boolean;
}

export function LoadingSpinner({ size = 'md', text, fullScreen = false }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  const spinner = (
    <div className="flex flex-col items-center justify-center gap-3">
      <Loader2 className={`${sizeClasses[size]} text-indigo-600 animate-spin`} />
      {text && (
        <p className="text-gray-600 text-sm font-medium">{text}</p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-background flex items-center justify-center">
        {spinner}
      </div>
    );
  }

  return spinner;
}

export function LoadingCard({ text }: { text?: string }) {
  return (
    <div className="glass-card rounded-xl shadow-sm border border-gray-200 p-8 flex items-center justify-center">
      <LoadingSpinner size="md" text={text} />
    </div>
  );
}

export function LoadingOverlay({ text }: { text?: string }) {
  return (
    <div className="absolute inset-0 glass-card backdrop-blur-sm flex items-center justify-center rounded-lg z-10">
      <LoadingSpinner size="lg" text={text} />
    </div>
  );
}
