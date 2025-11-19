import React, { createContext, useContext, useEffect, useState } from 'react';
import { applyTheme } from '../lib/theme';

interface ThemeContextType {
  theme: 'dark' | 'light';
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window === 'undefined') return 'dark';

    const saved = localStorage.getItem('slidetutor_theme');
    if (saved === 'light' || saved === 'dark') return saved;

    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  });

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem('slidetutor_theme', theme);
  }, [theme]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const media = window.matchMedia('(prefers-color-scheme: light)');
    const handler = (event: MediaQueryListEvent) => {
      const saved = localStorage.getItem('slidetutor_theme');
      if (!saved) {
        setTheme(event.matches ? 'light' : 'dark');
      }
    };

    media.addEventListener('change', handler);
    return () => media.removeEventListener('change', handler);
  }, []);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
