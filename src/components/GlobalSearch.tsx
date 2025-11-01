import React, { useState, useMemo } from 'react';
import { Search, FileText, BookOpen, Brain, Layers, X } from 'lucide-react';
import { useUploads, useLessons, useFlashcardDecks, useQuizSessions } from '../hooks/useSupabaseQuery';
import { cn } from '../lib/utils';
import type { TabType } from '../App';

interface SearchResult {
  id: string;
  type: 'upload' | 'lesson' | 'flashcard' | 'quiz';
  title: string;
  description: string;
  timestamp: string;
  navigateTo: TabType;
}

interface GlobalSearchProps {
  onNavigate: (tab: TabType, itemId?: string) => void;
}

export function GlobalSearch({ onNavigate }: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  
  const { data: uploads = [] } = useUploads();
  const { data: lessons = [] } = useLessons();
  const { data: decks = [] } = useFlashcardDecks();
  const { data: quizSessions = [] } = useQuizSessions();
  
  const searchResults = useMemo(() => {
    if (!query.trim()) return [];
    
    const lowerQuery = query.toLowerCase();
    const results: SearchResult[] = [];
    
    // Search uploads
    uploads.forEach((upload) => {
      if (
        upload.filename.toLowerCase().includes(lowerQuery) ||
        upload.full_text?.toLowerCase().includes(lowerQuery)
      ) {
        results.push({
          id: upload.id,
          type: 'upload',
          title: upload.filename,
          description: `${upload.slide_count} slides • ${upload.status}`,
          timestamp: upload.created_at,
          navigateTo: 'upload',
        });
      }
    });
    
    // Search lessons
    lessons.forEach((lesson) => {
      if (
        lesson.title.toLowerCase().includes(lowerQuery) ||
        lesson.content?.toLowerCase().includes(lowerQuery)
      ) {
        results.push({
          id: lesson.id,
          type: 'lesson',
          title: lesson.title,
          description: lesson.content?.slice(0, 100) || 'No content',
          timestamp: lesson.created_at,
          navigateTo: 'lessons',
        });
      }
    });
    
    // Search flashcard decks
    decks.forEach((deck) => {
      if (
        deck.name.toLowerCase().includes(lowerQuery) ||
        deck.description?.toLowerCase().includes(lowerQuery)
      ) {
        results.push({
          id: deck.id,
          type: 'flashcard',
          title: deck.name,
          description: deck.description || `${deck.total_cards || 0} cards`,
          timestamp: deck.created_at,
          navigateTo: 'flashcards',
        });
      }
    });
    
    // Search quiz sessions
    quizSessions.forEach((quiz) => {
      const uploadName = uploads.find(u => u.id === quiz.upload_id)?.filename || 'Unknown';
      if (uploadName.toLowerCase().includes(lowerQuery)) {
        results.push({
          id: quiz.id,
          type: 'quiz',
          title: `Quiz: ${uploadName}`,
          description: `${quiz.correct_answers}/${quiz.total_questions} correct • ${quiz.status}`,
          timestamp: quiz.created_at,
          navigateTo: 'quiz',
        });
      }
    });
    
    // Sort by timestamp (newest first)
    return results.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    ).slice(0, 10); // Limit to 10 results
  }, [query, uploads, lessons, decks, quizSessions]);
  
  const getIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'upload': return FileText;
      case 'lesson': return BookOpen;
      case 'flashcard': return Layers;
      case 'quiz': return Brain;
    }
  };
  
  const handleResultClick = (result: SearchResult) => {
    onNavigate(result.navigateTo, result.id);
    setQuery('');
    setIsOpen(false);
  };
  
  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Search uploads, lessons, flashcards..."
          className={cn(
            'w-full md:w-96 pl-10 pr-10 py-2 rounded-lg',
            'glass-card dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
            'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent',
            'transition-all'
          )}
          aria-label="Global search"
        />
        {query && (
          <button
            onClick={() => {
              setQuery('');
              setIsOpen(false);
            }}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            aria-label="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      
      {/* Search Results Dropdown */}
      {isOpen && query && (
        <div className="absolute top-full mt-2 w-full glass-card dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 max-h-96 overflow-y-auto">
          {searchResults.length > 0 ? (
            <div className="py-2">
              {searchResults.map((result) => {
                const Icon = getIcon(result.type);
                return (
                  <button
                    key={`${result.type}-${result.id}`}
                    onClick={() => handleResultClick(result)}
                    className="w-full px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left flex items-start gap-3"
                  >
                    <div className={cn(
                      'p-2 rounded-lg flex-shrink-0',
                      result.type === 'upload' && 'bg-secondary/10 text-secondary',
                      result.type === 'lesson' && 'bg-success/10 text-success',
                      result.type === 'flashcard' && 'bg-accent/10 text-accent',
                      result.type === 'quiz' && 'bg-orange-100 dark:bg-orange-900/30 text-warning'
                    )}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                        {result.title}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        {result.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
              No results found for "{query}"
            </div>
          )}
        </div>
      )}
      
      {/* Backdrop to close dropdown */}
      {isOpen && query && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
