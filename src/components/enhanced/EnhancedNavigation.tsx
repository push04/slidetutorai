import React, { useState } from 'react';
import { 
  LayoutDashboard, Upload, BookOpen, Brain, Layers, 
  MessageSquare, Settings, Sparkles,
  Clock, GraduationCap, Menu, X, Youtube
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { cn } from '../../lib/utils';
import { GlobalSearch } from '../GlobalSearch';
import type { TabType } from '../../App';

interface NavItem {
  id: TabType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
  description?: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, gradient: 'from-secondary/80 to-secondary', description: 'Your learning overview' },
    ]
  },
  {
    label: 'Learning',
    items: [
      { id: 'upload', label: 'Upload', icon: Upload, gradient: 'from-purple-500 to-pink-500', description: 'Add study materials' },
      { id: 'youtube', label: 'YouTube', icon: Youtube, gradient: 'from-red-500 to-rose-500', description: 'Learn from videos' },
      { id: 'lessons', label: 'Lessons', icon: BookOpen, gradient: 'from-green-500 to-emerald-500', description: 'AI-generated lessons' },
      { id: 'quiz', label: 'Quizzes', icon: Brain, gradient: 'from-orange-500 to-red-500', description: 'Test your knowledge' },
      { id: 'flashcards', label: 'Flashcards', icon: Layers, gradient: 'from-indigo-500 to-purple-500', description: 'Practice with cards' },
    ]
  },
  {
    label: 'AI Assistant',
    items: [
      { id: 'chat', label: 'Chat Q&A', icon: MessageSquare, gradient: 'from-pink-500 to-rose-500', description: 'Ask anything' },
      { id: 'ai-tutor', label: 'AI Tutor', icon: Sparkles, gradient: 'from-purple-500 to-blue-500', description: 'Personalized tutoring' },
    ]
  },
  {
    label: 'Tools',
    items: [
      { id: 'study-timer', label: 'Study Timer', icon: Clock, gradient: 'from-secondary/80 to-accent', description: 'Time tracking' },
    ]
  },
];

function Sidebar({ isOpen, onClose, activeTab, onTabChange }: {
  isOpen: boolean;
  onClose: () => void;
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}) {
  return (
    <>
      {/* Overlay with smooth fade */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden transition-all duration-300 ease-out"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar with enhanced glass-morphism */}
      <aside
        className={cn(
          'fixed top-0 left-0 h-full w-72 z-50 transition-all duration-500 ease-out overflow-hidden',
          'bg-gradient-to-b from-background/95 via-background/98 to-background/95',
          'backdrop-blur-xl border-r border-border/40 shadow-2xl shadow-primary/5',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
        style={{
          backgroundImage: 'linear-gradient(to bottom, rgba(99, 102, 241, 0.03) 0%, transparent 100%)'
        }}
      >
        {/* Sidebar Header with enhanced styling */}
        <div className="p-5 border-b border-border/30 flex items-center justify-between bg-gradient-to-r from-primary/5 to-secondary/5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-gradient-to-br from-primary via-primary to-secondary rounded-xl flex items-center justify-center shadow-lg shadow-primary/30 ring-1 ring-white/10">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-foreground text-base tracking-tight">SlideTutor AI</h2>
              <p className="text-xs text-muted-foreground font-medium">Learn Smarter</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-2.5 hover:bg-muted/60 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 group"
          >
            <X className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
          </button>
        </div>

        {/* Navigation Groups with custom scrollbar */}
        <nav className="p-4 space-y-6 overflow-y-auto h-[calc(100vh-88px)] scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent hover:scrollbar-thumb-primary/30">
          {navGroups.map((group, groupIndex) => (
            <div 
              key={group.label}
              className="animate-in fade-in slide-in-from-left-3 duration-500"
              style={{ animationDelay: `${groupIndex * 50}ms` }}
            >
              <h3 className="text-xs font-bold text-muted-foreground/80 uppercase tracking-wider mb-3 px-3 flex items-center gap-2">
                <span className="h-px flex-1 bg-gradient-to-r from-border/0 via-border/50 to-border/0"></span>
                <span>{group.label}</span>
                <span className="h-px flex-1 bg-gradient-to-r from-border/0 via-border/50 to-border/0"></span>
              </h3>
              <div className="space-y-1.5">
                {group.items.map((item, itemIndex) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onTabChange(item.id);
                        onClose();
                      }}
                      className={cn(
                        'w-full px-3 py-3 rounded-xl flex items-center gap-3.5 transition-all duration-300 group relative overflow-hidden',
                        isActive
                          ? 'bg-gradient-to-r from-primary/15 via-primary/10 to-secondary/15 border border-primary/25 text-foreground shadow-lg shadow-primary/10'
                          : 'hover:bg-gradient-to-r hover:from-muted/60 hover:via-muted/40 hover:to-muted/60 text-muted-foreground hover:text-foreground hover:border hover:border-border/50 hover:shadow-md'
                      )}
                      style={{
                        animationDelay: `${(groupIndex * 100) + (itemIndex * 30)}ms`
                      }}
                    >
                      {/* Animated background gradient on hover */}
                      {isActive && (
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-pulse opacity-50"></div>
                      )}
                      
                      <div className={cn(
                        'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300 relative',
                        isActive
                          ? `bg-gradient-to-br ${item.gradient} shadow-lg shadow-primary/30 scale-105`
                          : 'bg-gradient-to-br from-muted/60 to-muted/40 group-hover:from-muted group-hover:to-muted/80 group-hover:scale-110 group-hover:shadow-md'
                      )}>
                        {isActive && (
                          <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/20 to-transparent"></div>
                        )}
                        <Icon className={cn(
                          'w-5 h-5 relative z-10 transition-all duration-300',
                          isActive ? 'text-white' : 'text-muted-foreground group-hover:text-foreground'
                        )} />
                      </div>
                      <div className="flex-1 text-left relative z-10">
                        <div className={cn(
                          "font-semibold text-sm tracking-tight transition-all duration-200",
                          isActive && "text-foreground"
                        )}>
                          {item.label}
                        </div>
                        {item.description && (
                          <div className={cn(
                            "text-xs mt-0.5 transition-all duration-200",
                            isActive ? "text-muted-foreground/90" : "text-muted-foreground/60 group-hover:text-muted-foreground/80"
                          )}>
                            {item.description}
                          </div>
                        )}
                      </div>
                      {isActive && (
                        <div className="w-1 h-8 rounded-full bg-gradient-to-b from-primary to-secondary shadow-lg shadow-primary/50"></div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          
          {/* Settings */}
          <div className="pt-4 border-t border-border/30 mt-4">
            <button
              onClick={() => {
                onTabChange('settings');
                onClose();
              }}
              className={cn(
                'w-full px-3 py-3 rounded-xl flex items-center gap-3.5 transition-all duration-300 group relative overflow-hidden',
                activeTab === 'settings'
                  ? 'bg-gradient-to-r from-slate-500/15 via-slate-500/10 to-gray-500/15 border border-slate-400/25 text-foreground shadow-lg shadow-slate-500/10'
                  : 'hover:bg-gradient-to-r hover:from-muted/60 hover:via-muted/40 hover:to-muted/60 text-muted-foreground hover:text-foreground hover:border hover:border-border/50 hover:shadow-md'
              )}
            >
              {/* Animated background gradient on hover */}
              {activeTab === 'settings' && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-pulse opacity-50"></div>
              )}
              
              <div className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300 relative',
                activeTab === 'settings'
                  ? 'bg-gradient-to-br from-slate-500 to-gray-600 shadow-lg shadow-slate-500/30 scale-105'
                  : 'bg-gradient-to-br from-muted/60 to-muted/40 group-hover:from-muted group-hover:to-muted/80 group-hover:scale-110 group-hover:shadow-md'
              )}>
                {activeTab === 'settings' && (
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/20 to-transparent"></div>
                )}
                <Settings className={cn(
                  'w-5 h-5 relative z-10 transition-all duration-300',
                  activeTab === 'settings' ? 'text-white' : 'text-muted-foreground group-hover:text-foreground'
                )} />
              </div>
              <div className="flex-1 text-left relative z-10">
                <div className={cn(
                  "font-semibold text-sm tracking-tight transition-all duration-200",
                  activeTab === 'settings' && "text-foreground"
                )}>
                  Settings
                </div>
                <div className={cn(
                  "text-xs mt-0.5 transition-all duration-200",
                  activeTab === 'settings' ? "text-muted-foreground/90" : "text-muted-foreground/60 group-hover:text-muted-foreground/80"
                )}>
                  Preferences & API
                </div>
              </div>
              {activeTab === 'settings' && (
                <div className="w-1 h-8 rounded-full bg-gradient-to-b from-slate-500 to-gray-600 shadow-lg shadow-slate-500/50"></div>
              )}
            </button>
          </div>
        </nav>
      </aside>
    </>
  );
}

interface EnhancedNavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export function EnhancedNavigation({ activeTab, onTabChange }: EnhancedNavigationProps) {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <>
      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeTab={activeTab}
        onTabChange={onTabChange}
      />

      {/* Top Bar */}
      <nav className="glass-card sticky top-0 z-30 border-b border-border/50 lg:ml-72">
        <div className="px-4">
          <div className="flex items-center justify-between h-16">
            {/* Left: Menu Button + Logo (mobile only) */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 hover:bg-muted/50 rounded-lg transition-colors"
              >
                <Menu className="w-5 h-5" />
              </button>
              
              <div className="lg:hidden flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <span className="font-bold text-foreground">SlideTutor</span>
              </div>
            </div>

            {/* Center: Search */}
            <div className="flex-1 max-w-xl mx-4">
              <GlobalSearch onNavigate={onTabChange} />
            </div>

            {/* Right: Profile */}
            <div className="flex items-center gap-2">
              {/* Profile removed - using local storage only */}
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}
