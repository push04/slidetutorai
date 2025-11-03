import { useEffect, useState } from 'react';
import { Clock, Loader2 } from 'lucide-react';

interface CountdownTimerProps {
  estimatedSeconds: number;
  status: 'processing' | 'completed' | 'failed';
  onComplete?: () => void;
  className?: string;
}

export function CountdownTimer({ estimatedSeconds, status, onComplete, className = '' }: CountdownTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState(estimatedSeconds);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    setTimeRemaining(estimatedSeconds);
    setProgress(0);
  }, [estimatedSeconds]);

  useEffect(() => {
    if (status !== 'processing' || timeRemaining <= 0) {
      if (timeRemaining <= 0 && onComplete) {
        onComplete();
      }
      return;
    }

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        const newTime = Math.max(0, prev - 1);
        const newProgress = estimatedSeconds > 0 
          ? ((estimatedSeconds - newTime) / estimatedSeconds) * 100 
          : 0;
        setProgress(newProgress);
        return newTime;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [status, timeRemaining, estimatedSeconds, onComplete]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    
    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  };

  if (status === 'completed') {
    return (
      <div className={`flex items-center gap-2 text-green-500 ${className}`}>
        <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <span className="font-semibold">Completed!</span>
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div className={`flex items-center gap-2 text-red-500 ${className}`}>
        <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
          <span className="text-white text-xs font-bold">!</span>
        </div>
        <span className="font-semibold">Failed</span>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-primary">
          <Loader2 className="w-5 h-5 animate-spin" />
          <Clock className="w-5 h-5" />
        </div>
        <div className="text-right">
          <div className="text-sm font-semibold text-foreground">
            Processing...
          </div>
          <div className="text-xs text-muted-foreground">
            Est. {formatTime(timeRemaining)} remaining
          </div>
        </div>
      </div>
      
      {/* Progress bar */}
      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-1000 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>
      
      <div className="text-xs text-center text-muted-foreground">
        {Math.round(progress)}% complete
      </div>
    </div>
  );
}

// Hook for calculating estimated time based on file size and pages
export function useEstimatedTime(fileSize: number, pageCount: number): number {
  // Base time calculations:
  // - PDF parsing: ~0.1 seconds per page
  // - Text chunking: ~0.5 seconds per MB
  // - AI processing: ~2 seconds per chunk (assuming 5KB chunks, so ~200 chunks per MB)
  
  const pdfParsingTime = pageCount * 0.1;
  const fileSizeMB = fileSize / (1024 * 1024);
  const chunkingTime = fileSizeMB * 0.5;
  const aiProcessingTime = fileSizeMB * 200 * 2; // Very conservative estimate
  
  const totalSeconds = Math.ceil(pdfParsingTime + chunkingTime + aiProcessingTime);
  
  // Add 20% buffer for network delays and variations
  return Math.ceil(totalSeconds * 1.2);
}
