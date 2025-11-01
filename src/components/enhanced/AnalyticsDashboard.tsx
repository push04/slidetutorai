import React, { useMemo } from 'react';
import { 
  TrendingUp, Target, Clock, Flame, Award, Brain, 
  CheckCircle2, AlertCircle, Calendar, BarChart3 
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './Card';
import { formatDate, formatRelativeTime } from '../../lib/utils';
import { useUserProfile, useAnalyticsData } from '../../hooks/useSupabaseQuery';

interface AnalyticsData {
  totalStudyTime: number;
  lessonsCompleted: number;
  quizzesTaken: number;
  quizAccuracy: number;
  flashcardsReviewed: number;
  currentStreak: number;
  longestStreak: number;
  weeklyGoalProgress: number;
  masteryByTopic: { topic: string; level: number }[];
  recentActivity: { type: string; name: string; date: string; score?: number }[];
}

interface AnalyticsDashboardProps {
  data?: AnalyticsData;
}

// Mock data for demonstration
const mockData: AnalyticsData = {
  totalStudyTime: 1247, // minutes
  lessonsCompleted: 12,
  quizzesTaken: 8,
  quizAccuracy: 78,
  flashcardsReviewed: 156,
  currentStreak: 7,
  longestStreak: 14,
  weeklyGoalProgress: 65,
  masteryByTopic: [
    { topic: 'Machine Learning', level: 85 },
    { topic: 'Data Structures', level: 72 },
    { topic: 'Algorithms', level: 68 },
    { topic: 'Web Development', level: 91 },
  ],
  recentActivity: [
    { type: 'quiz', name: 'JavaScript Fundamentals', date: new Date().toISOString(), score: 85 },
    { type: 'lesson', name: 'React Hooks Deep Dive', date: new Date(Date.now() - 86400000).toISOString() },
    { type: 'flashcards', name: 'Python Syntax', date: new Date(Date.now() - 172800000).toISOString() },
  ],
};

export function AnalyticsDashboard({ data: propData }: AnalyticsDashboardProps) {
  const { data: profile } = useUserProfile();
  const { data: analyticsData, isLoading } = useAnalyticsData();
  
  // Merge real data with mock data fallback
  const data = useMemo(() => {
    if (!analyticsData || !profile) return propData || mockData;
    
    return {
      ...mockData,
      ...analyticsData,
      currentStreak: profile.current_streak || 0,
      longestStreak: profile.longest_streak || 0,
      weeklyGoalProgress: 65, // Still mock for now
      masteryByTopic: mockData.masteryByTopic, // Still mock for now
      recentActivity: mockData.recentActivity, // Still mock for now
    };
  }, [analyticsData, profile, propData]);
  
  const studyTimeFormatted = useMemo(() => {
    const hours = Math.floor(data.totalStudyTime / 60);
    const minutes = data.totalStudyTime % 60;
    return `${hours}h ${minutes}m`;
  }, [data.totalStudyTime]);

  const achievements = useMemo(() => [
    { 
      id: 'streak-week',
      title: '7-Day Streak',
      description: 'Study for 7 days in a row',
      icon: Flame,
      earned: data.currentStreak >= 7,
      progress: Math.min((data.currentStreak / 7) * 100, 100),
    },
    {
      id: 'quiz-master',
      title: 'Quiz Master',
      description: 'Score 80%+ on 5 quizzes',
      icon: Brain,
      earned: data.quizAccuracy >= 80 && data.quizzesTaken >= 5,
      progress: Math.min((data.quizzesTaken / 5) * 100, 100),
    },
    {
      id: 'flashcard-pro',
      title: 'Flashcard Pro',
      description: 'Review 100 flashcards',
      icon: Award,
      earned: data.flashcardsReviewed >= 100,
      progress: Math.min((data.flashcardsReviewed / 100) * 100, 100),
    },
  ], [data]);

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Analytics & Progress</h1>
        <p className="text-muted-foreground">
          Track your learning journey and celebrate your achievements
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card variant="glass">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="p-3 bg-gradient-to-br from-secondary/80 to-secondary rounded-lg">
              <Clock className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Study Time</p>
              <p className="text-2xl font-bold text-foreground">{studyTimeFormatted}</p>
            </div>
          </CardContent>
        </Card>

        <Card variant="glass">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="p-3 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg">
              <Flame className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Current Streak</p>
              <p className="text-2xl font-bold text-foreground">{data.currentStreak} days</p>
            </div>
          </CardContent>
        </Card>

        <Card variant="glass">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg">
              <Target className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Quiz Accuracy</p>
              <p className="text-2xl font-bold text-foreground">{data.quizAccuracy}%</p>
            </div>
          </CardContent>
        </Card>

        <Card variant="glass">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Weekly Goal</p>
              <p className="text-2xl font-bold text-foreground">{data.weeklyGoalProgress}%</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Mastery by Topic */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Mastery by Topic
            </CardTitle>
            <CardDescription>Your progress across different subjects</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.masteryByTopic.map((topic, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground">{topic.topic}</span>
                  <span className="text-muted-foreground">{topic.level}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-500"
                    style={{ width: `${topic.level}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Achievements */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5" />
              Achievements
            </CardTitle>
            <CardDescription>Milestones you've unlocked</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {achievements.map((achievement) => {
              const Icon = achievement.icon;
              return (
                <div 
                  key={achievement.id}
                  className={`
                    p-4 rounded-lg border transition-all
                    ${achievement.earned 
                      ? 'border-success/50 bg-success/10' 
                      : 'border-border bg-muted/30'
                    }
                  `}
                >
                  <div className="flex items-start gap-3">
                    <div className={`
                      p-2 rounded-lg
                      ${achievement.earned 
                        ? 'bg-success/20' 
                        : 'bg-muted'
                      }
                    `}>
                      <Icon className={`
                        w-5 h-5
                        ${achievement.earned ? 'text-success' : 'text-muted-foreground'}
                      `} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-semibold text-foreground">{achievement.title}</h4>
                        {achievement.earned && (
                          <CheckCircle2 className="w-4 h-4 text-success" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {achievement.description}
                      </p>
                      {!achievement.earned && (
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-500"
                            style={{ width: `${achievement.progress}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Recent Activity
          </CardTitle>
          <CardDescription>Your latest study sessions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.recentActivity.map((activity, index) => (
              <div 
                key={index}
                className="flex items-center gap-4 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div className="p-2 bg-gradient-to-br from-primary to-secondary rounded-lg">
                  {activity.type === 'quiz' && <Brain className="w-4 h-4 text-white" />}
                  {activity.type === 'lesson' && <CheckCircle2 className="w-4 h-4 text-white" />}
                  {activity.type === 'flashcards' && <Award className="w-4 h-4 text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{activity.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {activity.type.charAt(0).toUpperCase() + activity.type.slice(1)} • {formatRelativeTime(activity.date)}
                  </p>
                </div>
                {activity.score && (
                  <div className="text-right">
                    <p className="text-lg font-bold text-foreground">{activity.score}%</p>
                    <p className="text-xs text-muted-foreground">Score</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
