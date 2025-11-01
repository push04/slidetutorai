import React from 'react';
import { Trophy, Star, Flame, Target, Award, TrendingUp, Zap } from 'lucide-react';
import { useUserProfile, useUserAchievements } from '../hooks/useSupabaseQuery';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './enhanced/Card';

export function Gamification() {
  const { data: profile, isLoading: profileLoading } = useUserProfile();
  const { data: achievements, isLoading: achievementsLoading } = useUserAchievements();

  if (profileLoading || achievementsLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-secondary" />
      </div>
    );
  }

  const xp = profile?.total_xp || 0;
  const level = profile?.current_level || 1;
  const currentStreak = profile?.current_streak || 0;
  const longestStreak = profile?.longest_streak || 0;
  const xpForNextLevel = level * 1000;
  const xpInCurrentLevel = xp % 1000;
  const progressToNextLevel = (xpInCurrentLevel / 1000) * 100;

  const earnedAchievements = achievements || [];
  const totalAchievements = 12;

  return (
    <div className="space-y-8 animate-fade-in-up">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Progress & Achievements</h1>
        <p className="text-muted-foreground">Track your learning journey and unlock rewards</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card variant="gradient">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl shadow-lg">
                <Trophy className="w-8 h-8 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Level</p>
                <p className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  {level}
                </p>
              </div>
            </div>
            <div className="mt-6">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Progress to Level {level + 1}</span>
                <span className="font-semibold text-foreground">{xpInCurrentLevel} / 1000 XP</span>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-500 relative"
                  style={{ width: `${progressToNextLevel}%` }}
                >
                  <div className="absolute inset-0 bg-white/30 animate-shimmer" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card variant="glass">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl shadow-lg">
                <Flame className="w-8 h-8 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Current Streak</p>
                <p className="text-4xl font-bold text-foreground">{currentStreak}</p>
                <p className="text-xs text-muted-foreground mt-1">days in a row</p>
              </div>
            </div>
            {longestStreak > 0 && (
              <div className="mt-4 pt-4 border-t border-border">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Longest Streak</span>
                  <span className="font-semibold text-foreground">{longestStreak} days</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card variant="glass">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-gradient-to-br from-secondary/80 to-secondary rounded-2xl shadow-lg">
                <Award className="w-8 h-8 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Achievements</p>
                <p className="text-4xl font-bold text-foreground">
                  {earnedAchievements.length}
                  <span className="text-xl text-muted-foreground">/{totalAchievements}</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">unlocked</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-border">
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-secondary/80 to-secondary transition-all duration-500"
                  style={{ width: `${(earnedAchievements.length / totalAchievements) * 100}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="w-5 h-5 text-warning" />
              Recent Achievements
            </CardTitle>
            <CardDescription>Your latest unlocks and milestones</CardDescription>
          </CardHeader>
          <CardContent>
            {earnedAchievements.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Award className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No achievements yet. Keep studying to unlock your first achievement!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {earnedAchievements.slice(0, 5).map((achievement: any, index: number) => (
                  <div 
                    key={achievement.id}
                    className="flex items-center gap-4 p-4 rounded-lg bg-success/10 border border-success/20 animate-slide-up"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="p-3 bg-success/20 rounded-lg">
                      <Trophy className="w-6 h-6 text-success" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-foreground">{achievement.achievement?.name || 'Achievement'}</h4>
                      <p className="text-sm text-muted-foreground">{achievement.achievement?.description || 'Unlocked an achievement!'}</p>
                      <p className="text-xs text-success mt-1">+{achievement.achievement?.xp_reward || 100} XP</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              XP Breakdown
            </CardTitle>
            <CardDescription>How you've earned your experience points</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-secondary" />
                    <span className="text-foreground">Lessons Completed</span>
                  </div>
                  <span className="font-semibold">850 XP</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-secondary" style={{ width: '40%' }} />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-success" />
                    <span className="text-foreground">Quizzes Passed</span>
                  </div>
                  <span className="font-semibold">650 XP</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-success" style={{ width: '30%' }} />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-accent" />
                    <span className="text-foreground">Flashcards Reviewed</span>
                  </div>
                  <span className="font-semibold">420 XP</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-accent" style={{ width: '20%' }} />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-warning" />
                    <span className="text-foreground">Daily Streaks</span>
                  </div>
                  <span className="font-semibold">210 XP</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-warning" style={{ width: '10%' }} />
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-border">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">Total XP</span>
                <span className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  {xp}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default Gamification;
