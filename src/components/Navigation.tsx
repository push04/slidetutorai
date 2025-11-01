import React from 'react';
import { 
  BookOpen, 
  Upload, 
  Brain, 
  MessageSquare, 
  CreditCard, 
  BarChart3, 
  Settings,
  GraduationCap
} from 'lucide-react';
import { TabType } from '../App';

interface NavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'dashboard' as const, label: 'Dashboard', icon: BarChart3 },
    { id: 'upload' as const, label: 'Upload', icon: Upload },
    { id: 'lessons' as const, label: 'Lessons', icon: BookOpen },
    { id: 'quiz' as const, label: 'Quizzes', icon: Brain },
    { id: 'flashcards' as const, label: 'Flashcards', icon: CreditCard },
    { id: 'chat' as const, label: 'Chat Q&A', icon: MessageSquare },
    { id: 'settings' as const, label: 'Settings', icon: Settings },
  ];

  return (
    <nav className="glass-card border-b border-border/40 sticky top-0 z-50 backdrop-blur-sm bg-background/95">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">SlideTutor AI</h1>
              <p className="text-sm text-muted-foreground hidden sm:block">Professional Learning Platform</p>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                    isActive
                      ? 'bg-primary/10 text-primary shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:block">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
};