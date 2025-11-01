import React, { useState } from 'react';
import { Target, Plus, Check, Clock, TrendingUp } from 'lucide-react';
import { useUserGoals, useCreateGoal, useUpdateGoal } from '../hooks/useSupabaseQuery';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './enhanced/Card';
import { Button } from './enhanced/Button';

export function Goals() {
  const { data: goals = [], isLoading } = useUserGoals();
  const createGoal = useCreateGoal();
  const updateGoal = useUpdateGoal();
  
  const [showNewGoal, setShowNewGoal] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalTarget, setNewGoalTarget] = useState(10);
  const [newGoalType, setNewGoalType] = useState<'lessons' | 'quizzes' | 'flashcards' | 'streak'>('lessons');

  const handleCreateGoal = async () => {
    if (!newGoalTitle.trim()) return;
    
    try {
      await createGoal.mutateAsync({
        title: newGoalTitle.trim(),
        description: `Complete ${newGoalTarget} ${newGoalType}`,
        goal_type: newGoalType,
        target_value: newGoalTarget,
        current_value: 0,
        target_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'in_progress',
      });
      
      setNewGoalTitle('');
      setNewGoalTarget(10);
      setShowNewGoal(false);
    } catch (error) {
      console.error('Failed to create goal:', error);
    }
  };

  const handleCompleteGoal = async (goalId: string) => {
    try {
      await updateGoal.mutateAsync({
        id: goalId,
        updates: { status: 'completed', completed_at: new Date().toISOString() },
      });
    } catch (error) {
      console.error('Failed to complete goal:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-secondary" />
      </div>
    );
  }

  const activeGoals = goals.filter((g: any) => g.status !== 'completed');
  const completedGoals = goals.filter((g: any) => g.status === 'completed');

  return (
    <div className="space-y-8 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Learning Goals</h1>
          <p className="text-muted-foreground">Set targets and track your progress</p>
        </div>
        <Button
          onClick={() => setShowNewGoal(!showNewGoal)}
          icon={<Plus className="w-5 h-5" />}
          variant="primary"
        >
          New Goal
        </Button>
      </div>

      {showNewGoal && (
        <Card variant="glass">
          <CardHeader>
            <CardTitle>Create New Goal</CardTitle>
            <CardDescription>Set a target to help you stay motivated</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Goal Title</label>
                <input
                  type="text"
                  value={newGoalTitle}
                  onChange={(e) => setNewGoalTitle(e.target.value)}
                  placeholder="e.g., Master React Fundamentals"
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Goal Type</label>
                  <select
                    value={newGoalType}
                    onChange={(e) => setNewGoalType(e.target.value as any)}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                  >
                    <option value="lessons">Lessons</option>
                    <option value="quizzes">Quizzes</option>
                    <option value="flashcards">Flashcards</option>
                    <option value="streak">Study Streak</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Target</label>
                  <input
                    type="number"
                    value={newGoalTarget}
                    onChange={(e) => setNewGoalTarget(parseInt(e.target.value) || 0)}
                    min="1"
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                  />
                </div>
              </div>
              
              <div className="flex gap-3">
                <Button onClick={handleCreateGoal} variant="primary" className="flex-1">
                  Create Goal
                </Button>
                <Button onClick={() => setShowNewGoal(false)} variant="outline">
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            Active Goals
          </h2>
          
          {activeGoals.length === 0 ? (
            <Card variant="glass">
              <CardContent className="text-center py-12">
                <Target className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No Active Goals</h3>
                <p className="text-muted-foreground">Create a goal to start tracking your progress</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeGoals.map((goal: any, index: number) => {
                const progress = goal.target_value > 0 
                  ? (goal.current_value / goal.target_value) * 100 
                  : 0;
                
                return (
                  <Card 
                    key={goal.id}
                    variant="glass"
                    className="animate-slide-up"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="font-semibold text-foreground mb-1">{goal.title}</h3>
                          <p className="text-sm text-muted-foreground">{goal.description}</p>
                        </div>
                        <button
                          onClick={() => handleCompleteGoal(goal.id)}
                          className="p-2 hover:bg-success/10 rounded-lg transition-colors"
                          title="Mark as complete"
                        >
                          <Check className="w-4 h-4 text-success" />
                        </button>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="font-semibold text-foreground">
                            {goal.current_value} / {goal.target_value}
                          </span>
                        </div>
                        
                        <div className="h-3 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-500 relative"
                            style={{ width: `${Math.min(progress, 100)}%` }}
                          >
                            <div className="absolute inset-0 bg-white/30 animate-shimmer" />
                          </div>
                        </div>
                        
                        {goal.target_date && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            <span>Target: {new Date(goal.target_date).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {completedGoals.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-success" />
              Completed Goals
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {completedGoals.map((goal: any, index: number) => (
                <Card 
                  key={goal.id}
                  className="border-success/20 bg-success/5 animate-slide-up"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-success/20 rounded-lg">
                        <Check className="w-5 h-5 text-success" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-foreground truncate">{goal.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          Completed {goal.completed_at ? new Date(goal.completed_at).toLocaleDateString() : 'recently'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Goals;
