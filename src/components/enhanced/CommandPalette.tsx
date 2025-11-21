import React, { useState, useEffect, useMemo } from 'react';
import {
  Search, Upload, BookOpen, Brain, Layers, MessageSquare,
  Settings, Home, TrendingUp, Target, Clock, Zap, Flame, BadgeCheck
} from 'lucide-react';
import { useHotkeys } from 'react-hotkeys-hook';
import type { TabType } from '../../App';

interface Command {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
  category: 'Navigation' | 'Actions' | 'Quick';
  keywords?: string[];
}

interface CommandPaletteProps {
  onNavigate: (tab: TabType) => void;
  onClose: () => void;
  isOpen: boolean;
}

export function CommandPalette({ onNavigate, onClose, isOpen }: CommandPaletteProps) {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const commands: Command[] = useMemo(() => [
    {
      id: 'nav-dashboard',
      label: 'Go to Dashboard',
      icon: Home,
      action: () => { onNavigate('dashboard'); onClose(); },
      category: 'Navigation',
      keywords: ['home', 'overview', 'stats'],
    },
    {
      id: 'nav-upload',
      label: 'Upload Files',
      icon: Upload,
      action: () => { onNavigate('upload'); onClose(); },
      category: 'Navigation',
      keywords: ['add', 'import', 'pdf', 'pptx'],
    },
    {
      id: 'nav-lessons',
      label: 'Browse Lessons',
      icon: BookOpen,
      action: () => { onNavigate('lessons'); onClose(); },
      category: 'Navigation',
      keywords: ['learn', 'study', 'read'],
    },
    {
      id: 'nav-quiz',
      label: 'Take Quiz',
      icon: Brain,
      action: () => { onNavigate('quiz'); onClose(); },
      category: 'Navigation',
      keywords: ['test', 'practice', 'questions'],
    },
    {
      id: 'nav-flashcards',
      label: 'Study Flashcards',
      icon: Layers,
      action: () => { onNavigate('flashcards'); onClose(); },
      category: 'Navigation',
      keywords: ['cards', 'review', 'memorize', 'spaced repetition'],
    },
    {
      id: 'nav-study-plan',
      label: 'AI Study Plan',
      icon: Target,
      action: () => { onNavigate('study-plan'); onClose(); },
      category: 'Navigation',
      keywords: ['goal', 'board', 'plan', 'roadmap'],
    },
    {
      id: 'nav-daily-boost',
      label: 'Daily Boost',
      icon: Flame,
      action: () => { onNavigate('daily-boost'); onClose(); },
      category: 'Navigation',
      keywords: ['streak', 'boost', 'drill'],
    },
    {
      id: 'nav-chat',
      label: 'Chat Q&A',
      icon: MessageSquare,
      action: () => { onNavigate('chat'); onClose(); },
      category: 'Navigation',
      keywords: ['ask', 'question', 'ai', 'help'],
    },
    {
      id: 'nav-settings',
      label: 'Settings',
      icon: Settings,
      action: () => { onNavigate('settings'); onClose(); },
      category: 'Navigation',
      keywords: ['config', 'preferences', 'api'],
    },
    {
      id: 'nav-cv-builder',
      label: 'AI CV Builder',
      icon: BadgeCheck,
      action: () => { onNavigate('cv-builder'); onClose(); },
      category: 'Navigation',
      keywords: ['resume', 'cv', 'career'],
    },
  ], [onNavigate, onClose]);

  const filteredCommands = useMemo(() => {
    if (!search) return commands;
    
    const searchLower = search.toLowerCase();
    return commands.filter(cmd => 
      cmd.label.toLowerCase().includes(searchLower) ||
      cmd.keywords?.some(kw => kw.toLowerCase().includes(searchLower))
    );
  }, [commands, search]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  useEffect(() => {
    if (!isOpen) {
      setSearch('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => 
        prev < filteredCommands.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => prev > 0 ? prev - 1 : prev);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        filteredCommands[selectedIndex].action();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] px-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-scale-in"
        onClick={onClose}
      />
      
      {/* Command Palette */}
      <div className="relative w-full max-w-2xl glass-card shadow-2xl animate-slide-up">
        {/* Search Input */}
        <div className="flex items-center gap-3 p-4 border-b border-border/50">
          <Search className="w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search commands..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground outline-none text-lg"
            autoFocus
          />
          <kbd className="px-2 py-1 text-xs bg-muted rounded border border-border">
            ESC
          </kbd>
        </div>

        {/* Commands List */}
        <div className="max-h-96 overflow-y-auto p-2">
          {filteredCommands.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Zap className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No commands found</p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredCommands.map((cmd, index) => {
                const Icon = cmd.icon;
                const isSelected = index === selectedIndex;
                
                return (
                  <button
                    key={cmd.id}
                    onClick={cmd.action}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`
                      w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all
                      ${isSelected 
                        ? 'bg-gradient-to-r from-primary/20 to-secondary/20 border border-primary/30' 
                        : 'hover:bg-muted/50'
                      }
                    `}
                  >
                    <div className={`
                      p-2 rounded-lg transition-colors
                      ${isSelected ? 'bg-gradient-to-br from-primary to-secondary' : 'bg-muted'}
                    `}>
                      <Icon className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-foreground'}`} />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{cmd.label}</p>
                      <p className="text-xs text-muted-foreground">{cmd.category}</p>
                    </div>
                    {isSelected && (
                      <kbd className="px-2 py-1 text-xs bg-muted rounded border border-border">
                        ↵
                      </kbd>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-3 border-t border-border/50 text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-muted rounded border border-border">↑</kbd>
              <kbd className="px-1.5 py-0.5 bg-muted rounded border border-border">↓</kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-muted rounded border border-border">↵</kbd>
              Select
            </span>
          </div>
          <span className="flex items-center gap-1">
            Press <kbd className="px-1.5 py-0.5 bg-muted rounded border border-border">⌘K</kbd> or <kbd className="px-1.5 py-0.5 bg-muted rounded border border-border">Ctrl+K</kbd>
          </span>
        </div>
      </div>
    </div>
  );
}

export function useCommandPalette() {
  const [isOpen, setIsOpen] = useState(false);

  useHotkeys('mod+k', (e) => {
    e.preventDefault();
    setIsOpen(true);
  }, { enableOnFormTags: true });

  useHotkeys('escape', () => {
    if (isOpen) setIsOpen(false);
  });

  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    toggle: () => setIsOpen(prev => !prev),
  };
}
