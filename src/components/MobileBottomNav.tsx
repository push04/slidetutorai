import React from 'react';
import { 
  LayoutDashboard, Upload, BookOpen, Brain, Youtube
} from 'lucide-react';
import { cn } from '../lib/utils';
import type { TabType } from '../App';

interface NavItem {
  id: TabType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const primaryNavItems: NavItem[] = [
  { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
  { id: 'youtube', label: 'YouTube', icon: Youtube },
  { id: 'lessons', label: 'Learn', icon: BookOpen },
  { id: 'quiz', label: 'Quiz', icon: Brain },
];

interface MobileBottomNavProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export function MobileBottomNav({ activeTab, onTabChange }: MobileBottomNavProps) {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass-card dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 safe-area-bottom">
      <div className="grid grid-cols-4 gap-1 px-2 py-1">
        {primaryNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={cn(
                'flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-lg transition-all',
                'min-h-[56px] active:scale-95',
                isActive && 'bg-secondary/10 text-secondary',
                !isActive && 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
              )}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon className={cn(
                'w-6 h-6 transition-transform',
                isActive && 'scale-110'
              )} />
              <span className="text-xs font-medium truncate w-full text-center">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
