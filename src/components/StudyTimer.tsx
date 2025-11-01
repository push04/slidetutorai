import { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Clock, Coffee, Brain } from 'lucide-react';
import toast from 'react-hot-toast';

interface StudyTimerProps {
  onSessionComplete: (duration: number, type: 'work' | 'break') => void;
}

export function StudyTimer({ onSessionComplete }: StudyTimerProps) {
  const [mode, setMode] = useState<'work' | 'shortBreak' | 'longBreak'>('work');
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [sessionsCompleted, setSessionsCompleted] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const durations = {
    work: 25 * 60,
    shortBreak: 5 * 60,
    longBreak: 15 * 60
  };

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleTimerComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, timeLeft]);

  const handleTimerComplete = () => {
    setIsRunning(false);
    
    if (mode === 'work') {
      const newSessions = sessionsCompleted + 1;
      setSessionsCompleted(newSessions);
      onSessionComplete(durations.work, 'work');
      
      if (newSessions % 4 === 0) {
        toast.success('Great work! Time for a long break!');
        setMode('longBreak');
        setTimeLeft(durations.longBreak);
      } else {
        toast.success('Focus session complete! Take a short break.');
        setMode('shortBreak');
        setTimeLeft(durations.shortBreak);
      }
    } else {
      onSessionComplete(mode === 'shortBreak' ? durations.shortBreak : durations.longBreak, 'break');
      toast.success('Break over! Ready to focus again?');
      setMode('work');
      setTimeLeft(durations.work);
    }

    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Pomodoro Timer', {
        body: mode === 'work' ? 'Time for a break!' : 'Time to get back to work!',
        icon: '/icon.png'
      });
    }
  };

  const handlePlayPause = () => {
    if (!isRunning && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    setIsRunning(!isRunning);
  };

  const handleReset = () => {
    setIsRunning(false);
    setTimeLeft(durations[mode]);
  };

  const handleModeChange = (newMode: 'work' | 'shortBreak' | 'longBreak') => {
    setIsRunning(false);
    setMode(newMode);
    setTimeLeft(durations[newMode]);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = ((durations[mode] - timeLeft) / durations[mode]) * 100;

  return (
    <div className="glass-card p-6 rounded-2xl border border-border">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-gradient-to-br from-secondary/80 to-accent rounded-xl flex items-center justify-center">
          <Clock className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-foreground">Pomodoro Timer</h2>
          <p className="text-sm text-muted-foreground">Stay focused with timed study sessions</p>
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => handleModeChange('work')}
          className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            mode === 'work'
              ? 'bg-primary text-white shadow-lg shadow-primary/20'
              : 'bg-background text-muted-foreground hover:text-foreground border border-border'
          }`}
        >
          <Brain className="w-4 h-4 inline mr-1" />
          Focus (25m)
        </button>
        <button
          onClick={() => handleModeChange('shortBreak')}
          className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            mode === 'shortBreak'
              ? 'bg-primary text-white shadow-lg shadow-primary/20'
              : 'bg-background text-muted-foreground hover:text-foreground border border-border'
          }`}
        >
          <Coffee className="w-4 h-4 inline mr-1" />
          Short (5m)
        </button>
        <button
          onClick={() => handleModeChange('longBreak')}
          className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            mode === 'longBreak'
              ? 'bg-primary text-white shadow-lg shadow-primary/20'
              : 'bg-background text-muted-foreground hover:text-foreground border border-border'
          }`}
        >
          <Coffee className="w-4 h-4 inline mr-1" />
          Long (15m)
        </button>
      </div>

      <div className="relative mb-6">
        <div className="w-64 h-64 mx-auto relative">
          <svg className="w-full h-full -rotate-90">
            <circle
              cx="128"
              cy="128"
              r="112"
              stroke="currentColor"
              strokeWidth="12"
              fill="none"
              className="text-border"
            />
            <circle
              cx="128"
              cy="128"
              r="112"
              stroke="currentColor"
              strokeWidth="12"
              fill="none"
              strokeDasharray={2 * Math.PI * 112}
              strokeDashoffset={2 * Math.PI * 112 * (1 - progress / 100)}
              className={`${
                mode === 'work' ? 'text-primary' : 'text-green-500'
              } transition-all duration-1000`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-5xl font-bold text-foreground">{formatTime(timeLeft)}</div>
            <div className="text-sm text-muted-foreground mt-2 capitalize">
              {mode === 'work' ? 'Focus Time' : mode === 'shortBreak' ? 'Short Break' : 'Long Break'}
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-3 mb-6">
        <button
          onClick={handlePlayPause}
          className={`flex-1 px-6 py-3 rounded-xl font-semibold transition-all shadow-lg flex items-center justify-center gap-2 ${
            isRunning
              ? 'bg-warning hover:bg-warning/90 text-white shadow-warning/20'
              : 'bg-primary hover:bg-primary/90 text-white shadow-primary/20'
          }`}
        >
          {isRunning ? (
            <>
              <Pause className="w-5 h-5" />
              Pause
            </>
          ) : (
            <>
              <Play className="w-5 h-5" />
              Start
            </>
          )}
        </button>
        <button
          onClick={handleReset}
          className="px-6 py-3 rounded-xl font-semibold bg-background border border-border hover:border-primary/50 text-foreground transition-all"
        >
          <RotateCcw className="w-5 h-5" />
        </button>
      </div>

      <div className="flex items-center justify-between p-4 bg-background rounded-xl border border-border">
        <span className="text-sm text-muted-foreground">Sessions Completed</span>
        <div className="flex gap-1">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className={`w-8 h-8 rounded-lg flex items-center justify-center font-semibold text-sm ${
                i < (sessionsCompleted % 4)
                  ? 'bg-primary text-white'
                  : 'bg-background border border-border text-muted-foreground'
              }`}
            >
              {i < (sessionsCompleted % 4) ? '✓' : i + 1}
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-muted-foreground mt-4 text-center">
        Complete 4 focus sessions to earn a long break. Stay focused and productive!
      </p>
    </div>
  );
}
