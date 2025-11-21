import { useEffect, useMemo, useState } from 'react';
import { useGlobalProgress } from '../contexts/GlobalProgressContext';
import { cn } from '../lib/utils';

export function TopLoadingBar() {
  const { percent, message, isActive } = useGlobalProgress();
  const [visible, setVisible] = useState(false);
  const clamped = useMemo(() => Math.min(100, Math.max(0, percent)), [percent]);

  useEffect(() => {
    if (isActive) {
      setVisible(true);
    } else {
      const timer = setTimeout(() => setVisible(false), 400);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isActive]);

  if (!visible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[120] pointer-events-none">
      <div
        className={cn(
          'h-1.5 w-full bg-border/60 overflow-hidden relative backdrop-blur-sm',
          'after:content-[""] after:absolute after:inset-0 after:bg-gradient-to-r after:from-primary/20 after:via-secondary/30 after:to-accent/30',
          'shadow-lg shadow-primary/10'
        )}
      >
        <div
          className="h-full bg-gradient-to-r from-primary via-secondary to-accent transition-all duration-200"
          style={{ width: `${clamped}%` }}
        />
      </div>
      {message && (
        <div className="px-4 py-1 text-xs font-medium text-foreground bg-background/90 border-x border-b border-border/60 w-fit rounded-b-lg shadow-md shadow-primary/10">
          {message} · {Math.round(clamped)}%
        </div>
      )}
    </div>
  );
}
