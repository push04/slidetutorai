import React, { createContext, useContext, useMemo, useRef, useState } from 'react';

interface GlobalProgressState {
  percent: number;
  message?: string;
  isActive: boolean;
  start: (message?: string) => string;
  update: (percent: number, message?: string, id?: string) => void;
  complete: (id?: string) => void;
}

const GlobalProgressContext = createContext<GlobalProgressState | undefined>(undefined);

function generateId() {
  return Math.random().toString(36).slice(2, 9);
}

export function GlobalProgressProvider({ children }: { children: React.ReactNode }) {
  const [percent, setPercent] = useState(0);
  const [message, setMessage] = useState<string | undefined>('');
  const [isActive, setIsActive] = useState(false);
  const currentIdRef = useRef<string | null>(null);

  const api = useMemo<GlobalProgressState>(() => ({
    percent,
    message,
    isActive,
    start: (msg?: string) => {
      const id = generateId();
      currentIdRef.current = id;
      setPercent(5);
      setMessage(msg || 'Starting...');
      setIsActive(true);
      return id;
    },
    update: (value: number, msg?: string, id?: string) => {
      if (currentIdRef.current && id && id !== currentIdRef.current) return;
      setPercent(Math.min(100, Math.max(0, value)));
      if (msg) setMessage(msg);
      setIsActive(true);
    },
    complete: (id?: string) => {
      if (currentIdRef.current && id && id !== currentIdRef.current) return;
      setPercent(100);
      setTimeout(() => {
        setIsActive(false);
        setPercent(0);
        setMessage('');
        currentIdRef.current = null;
      }, 350);
    },
  }), [isActive, message, percent]);

  return (
    <GlobalProgressContext.Provider value={api}>
      {children}
    </GlobalProgressContext.Provider>
  );
}

export function useGlobalProgress(): GlobalProgressState {
  const ctx = useContext(GlobalProgressContext);
  if (!ctx) throw new Error('useGlobalProgress must be used within GlobalProgressProvider');
  return ctx;
}
