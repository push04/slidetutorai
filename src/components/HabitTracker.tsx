import { useState, useEffect } from 'react';
import { Plus, Trash2, Flame, CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from './enhanced/Card';
import { Button } from './enhanced/Button';
import toast from 'react-hot-toast';
import { cn } from '../lib/utils';

interface Habit {
  id: string;
  name: string;
  goal: string;
  color: string;
  streak: number;
  completedDates: string[];
  createdAt: Date;
}

export function HabitTracker() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [newHabit, setNewHabit] = useState({ name: '', goal: 'daily', color: 'from-blue-500 to-cyan-500' });

  const colors = [
    'from-blue-500 to-cyan-500',
    'from-purple-500 to-pink-500',
    'from-green-500 to-emerald-500',
    'from-orange-500 to-red-500',
    'from-yellow-500 to-amber-500',
    'from-indigo-500 to-purple-500',
  ];

  useEffect(() => {
    try {
      const stored = localStorage.getItem('slidetutor-habits');
      if (stored) {
        const parsed = JSON.parse(stored);
        setHabits(parsed.map((h: any) => ({ ...h, createdAt: new Date(h.createdAt) })));
      }
    } catch (error) {
      console.error('Failed to load habits:', error);
      toast.error('Failed to load saved habits');
    }
  }, []);

  useEffect(() => {
    try {
      if (habits.length > 0) {
        localStorage.setItem('slidetutor-habits', JSON.stringify(habits));
      } else {
        localStorage.removeItem('slidetutor-habits');
      }
    } catch (error) {
      console.error('Failed to save habits:', error);
      toast.error('Failed to save habits to storage');
    }
  }, [habits]);

  const addHabit = () => {
    if (!newHabit.name.trim()) {
      toast.error('Habit name is required!');
      return;
    }

    const habit: Habit = {
      id: Date.now().toString(),
      name: newHabit.name,
      goal: newHabit.goal,
      color: newHabit.color,
      streak: 0,
      completedDates: [],
      createdAt: new Date(),
    };

    setHabits([...habits, habit]);
    setNewHabit({ name: '', goal: 'daily', color: 'from-blue-500 to-cyan-500' });
    toast.success('Habit added!');
  };

  const toggleHabit = (id: string) => {
    const today = new Date().toISOString().split('T')[0];
    
    setHabits(habits.map(h => {
      if (h.id === id) {
        const isCompleted = h.completedDates.includes(today);
        const newCompletedDates = isCompleted
          ? h.completedDates.filter(d => d !== today)
          : [...h.completedDates, today];

        // Calculate streak
        let streak = 0;
        const sortedDates = [...newCompletedDates].sort().reverse();
        for (let i = 0; i < sortedDates.length; i++) {
          const date = new Date(sortedDates[i]);
          const expectedDate = new Date();
          expectedDate.setDate(expectedDate.getDate() - i);
          
          if (date.toISOString().split('T')[0] === expectedDate.toISOString().split('T')[0]) {
            streak++;
          } else {
            break;
          }
        }

        // Show encouraging messages
        if (!isCompleted) {
          if (streak === 1) {
            toast.success('Great start! 🎉');
          } else if (streak === 7) {
            toast.success('Amazing! 7-day streak! 🔥');
          } else if (streak === 30) {
            toast.success('Incredible! 30-day streak! 🏆');
          } else if (streak > 0 && streak % 10 === 0) {
            toast.success(`Wow! ${streak}-day streak! Keep it up! 💪`);
          } else {
            toast.success(`Day ${streak} complete! 🎯`);
          }
        } else {
          toast('Habit unmarked', { icon: '↩️' });
        }

        return { ...h, completedDates: newCompletedDates, streak };
      }
      return h;
    }));
  };

  const deleteHabit = (id: string) => {
    if (confirm('Delete this habit?')) {
      setHabits(habits.filter(h => h.id !== id));
      toast.success('Habit deleted!');
    }
  };

  const getLastSevenDays = () => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      days.push(date.toISOString().split('T')[0]);
    }
    return days;
  };

  const today = new Date().toISOString().split('T')[0];
  const last7Days = getLastSevenDays();

  const stats = {
    totalHabits: habits.length,
    completedToday: habits.filter(h => h.completedDates.includes(today)).length,
    totalStreak: habits.reduce((sum, h) => sum + h.streak, 0),
    bestStreak: Math.max(0, ...habits.map(h => h.streak)),
  };

  return (
    <div className="min-h-screen bg-background p-4 pb-20">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Flame className="w-8 h-8 text-orange-500" />
            Habit Tracker
          </h1>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-foreground">{stats.totalHabits}</div>
              <div className="text-sm text-muted-foreground">Total Habits</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-500">{stats.completedToday}</div>
              <div className="text-sm text-muted-foreground">Done Today</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-orange-500">{stats.totalStreak}</div>
              <div className="text-sm text-muted-foreground">Total Streak</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-purple-500">{stats.bestStreak}</div>
              <div className="text-sm text-muted-foreground">Best Streak</div>
            </CardContent>
          </Card>
        </div>

        {/* Add Habit */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Add New Habit
            </h3>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Habit name (e.g., Read for 30 minutes)"
                value={newHabit.name}
                onChange={(e) => setNewHabit({...newHabit, name: e.target.value})}
                className="w-full px-4 py-3 glass-card border border-border/40 rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">Goal</label>
                  <select
                    value={newHabit.goal}
                    onChange={(e) => setNewHabit({...newHabit, goal: e.target.value})}
                    className="w-full px-4 py-3 glass-card border border-border/40 rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">Color</label>
                  <div className="flex gap-2">
                    {colors.map(color => (
                      <button
                        key={color}
                        onClick={() => setNewHabit({...newHabit, color})}
                        className={cn(
                          `w-8 h-8 rounded-full bg-gradient-to-r ${color}`,
                          newHabit.color === color && 'ring-2 ring-primary ring-offset-2 ring-offset-background'
                        )}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex items-end">
                  <Button onClick={addHabit} className="w-full">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Habit
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Habits List */}
        <div className="space-y-4">
          {habits.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Flame className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">No habits yet. Create one to start building better habits!</p>
              </CardContent>
            </Card>
          ) : (
            habits.map(habit => (
              <Card key={habit.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="text-xl font-semibold text-foreground mb-1">{habit.name}</h4>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="capitalize">{habit.goal}</span>
                        {habit.streak > 0 && (
                          <span className="flex items-center gap-1 text-orange-500 font-semibold">
                            <Flame className="w-4 h-4" />
                            {habit.streak} day streak!
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => deleteHabit(habit.id)}
                      className="p-2 hover:bg-destructive/20 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </button>
                  </div>

                  {/* Last 7 days */}
                  <div className="flex gap-2">
                    {last7Days.map(date => {
                      const isCompleted = habit.completedDates.includes(date);
                      const isToday = date === today;
                      const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'short' });
                      
                      return (
                        <button
                          key={date}
                          onClick={() => toggleHabit(habit.id)}
                          disabled={!isToday}
                          className={cn(
                            'flex-1 p-3 rounded-xl transition-all',
                            isCompleted
                              ? `bg-gradient-to-r ${habit.color} text-white shadow-lg`
                              : 'glass-card border border-border/40 hover:border-primary/50',
                            !isToday && 'cursor-default',
                            isToday && !isCompleted && 'hover:scale-105'
                          )}
                        >
                          <div className="text-center">
                            <div className="text-xs mb-1">{dayName}</div>
                            {isCompleted ? (
                              <CheckCircle2 className="w-6 h-6 mx-auto" />
                            ) : (
                              <div className="w-6 h-6 mx-auto rounded-full border-2 border-current"></div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default HabitTracker;
