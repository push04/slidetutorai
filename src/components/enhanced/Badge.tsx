import React from 'react';
import { cn } from '../../lib/utils';

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  variant?: 'solid' | 'outline';
};

export function Badge({ variant = 'solid', className, children, ...props }: BadgeProps) {
  const base = 'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold transition-colors';
  const styles =
    variant === 'outline'
      ? 'border border-border/60 text-foreground'
      : 'bg-primary text-primary-foreground';

  return (
    <span className={cn(base, styles, className)} {...props}>
      {children}
    </span>
  );
}
