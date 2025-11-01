import { Loader2 } from 'lucide-react';

interface ProgressIndicatorProps {
  progress: number;
  message?: string;
  className?: string;
}

export function ProgressIndicator({ progress, message, className = '' }: ProgressIndicatorProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          <span className="text-foreground font-medium">{message || 'Processing...'}</span>
        </div>
        <span className="text-primary font-bold">{Math.round(progress)}%</span>
      </div>
      
      <div className="relative h-2 bg-muted rounded-full overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-muted via-muted/50 to-muted opacity-50 animate-pulse" />
        <div 
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary via-secondary to-primary rounded-full transition-all duration-300 ease-out shadow-lg shadow-primary/50"
          style={{ width: `${progress}%` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
        </div>
      </div>
      
      <div className="text-xs text-muted-foreground text-center">
        {progress < 25 && "Initializing..."}
        {progress >= 25 && progress < 50 && "Processing content..."}
        {progress >= 50 && progress < 75 && "Generating results..."}
        {progress >= 75 && progress < 100 && "Finalizing..."}
        {progress >= 100 && "Complete!"}
      </div>
    </div>
  );
}
