import React, { useState } from 'react';
import { Keyboard, X } from 'lucide-react';
import { useHotkeys } from 'react-hotkeys-hook';
import { cn } from '../lib/utils';

interface Shortcut {
  key: string;
  description: string;
  category: string;
}

const shortcuts: Shortcut[] = [
  { key: '⌘ + K', description: 'Open command palette', category: 'Navigation' },
  { key: '⌘ + /', description: 'Open shortcuts guide', category: 'Navigation' },
  { key: 'D', description: 'Go to Dashboard', category: 'Navigation' },
  { key: 'U', description: 'Go to Upload', category: 'Navigation' },
  { key: 'L', description: 'Go to Lessons', category: 'Navigation' },
  { key: 'Q', description: 'Go to Quizzes', category: 'Navigation' },
  { key: 'F', description: 'Go to Flashcards', category: 'Navigation' },
  { key: 'C', description: 'Go to Chat', category: 'Navigation' },
  { key: 'S', description: 'Go to Settings', category: 'Navigation' },
  { key: 'A', description: 'Go to Analytics', category: 'Navigation' },
  { key: 'Esc', description: 'Close modals/dialogs', category: 'General' },
  { key: '/', description: 'Focus search', category: 'General' },
  { key: '?', description: 'Show this help', category: 'General' },
];

interface KeyboardShortcutsGuideProps {
  onNavigate?: (tab: string) => void;
}

export function KeyboardShortcutsGuide({ onNavigate }: KeyboardShortcutsGuideProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  // Shortcut to open this guide
  useHotkeys('meta+slash, ctrl+slash, shift+/', (e) => {
    e.preventDefault();
    setIsOpen(true);
  });
  
  // Navigation shortcuts
  useHotkeys('d', (e) => {
    if (!isInputFocused(e)) {
      e.preventDefault();
      onNavigate?.('dashboard');
    }
  });
  
  useHotkeys('u', (e) => {
    if (!isInputFocused(e)) {
      e.preventDefault();
      onNavigate?.('upload');
    }
  });
  
  useHotkeys('l', (e) => {
    if (!isInputFocused(e)) {
      e.preventDefault();
      onNavigate?.('lessons');
    }
  });
  
  useHotkeys('q', (e) => {
    if (!isInputFocused(e)) {
      e.preventDefault();
      onNavigate?.('quiz');
    }
  });
  
  useHotkeys('f', (e) => {
    if (!isInputFocused(e)) {
      e.preventDefault();
      onNavigate?.('flashcards');
    }
  });
  
  useHotkeys('c', (e) => {
    if (!isInputFocused(e)) {
      e.preventDefault();
      onNavigate?.('chat');
    }
  });
  
  useHotkeys('s', (e) => {
    if (!isInputFocused(e)) {
      e.preventDefault();
      onNavigate?.('settings');
    }
  });
  
  useHotkeys('a', (e) => {
    if (!isInputFocused(e)) {
      e.preventDefault();
      onNavigate?.('analytics');
    }
  });
  
  // Close on Escape
  useHotkeys('escape', () => {
    if (isOpen) setIsOpen(false);
  });
  
  const categories = Array.from(new Set(shortcuts.map(s => s.category)));
  
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-40 p-3 bg-secondary text-white rounded-full shadow-lg hover:bg-secondary/90 transition-all md:hidden"
        aria-label="Show keyboard shortcuts"
        title="Keyboard shortcuts (⌘/)"
      >
        <Keyboard className="w-5 h-5" />
      </button>
    );
  }
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="glass-card dark:bg-gray-900 rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <div className="sticky top-0 glass-card dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 dark:bg-secondary/20 rounded-lg">
              <Keyboard className="w-5 h-5 text-secondary dark:text-indigo-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Keyboard Shortcuts
            </h2>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            aria-label="Close shortcuts guide"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          {categories.map((category) => (
            <div key={category}>
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                {category}
              </h3>
              <div className="space-y-2">
                {shortcuts
                  .filter(s => s.category === category)
                  .map((shortcut, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <span className="text-gray-700 dark:text-gray-300">
                        {shortcut.description}
                      </span>
                      <kbd className={cn(
                        'px-3 py-1 text-sm font-mono font-semibold',
                        'glass-card dark:bg-gray-900 border border-gray-300 dark:border-gray-700',
                        'rounded shadow-sm text-gray-700 dark:text-gray-300'
                      )}>
                        {shortcut.key}
                      </kbd>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
        
        <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 py-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
            Press <kbd className="px-2 py-0.5 mx-1 glass-card dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded text-xs font-mono">Esc</kbd> to close
          </p>
        </div>
      </div>
    </div>
  );
}

function isInputFocused(e: KeyboardEvent): boolean {
  const target = e.target as HTMLElement;
  return (
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.isContentEditable
  );
}
