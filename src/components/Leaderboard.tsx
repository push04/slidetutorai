import { useState } from 'react';
import { Trophy, Medal, Crown, TrendingUp, Users, Star, Zap } from 'lucide-react';
import { useLeaderboard } from '../hooks/useSupabaseQuery';
import { useAuth } from '../hooks/useAuth';

interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  avatar?: string | null;
  xp: number;
  level: number;
  streak: number;
  change: number;
}

interface LeaderboardProps {
  currentUserId: string;
  currentUserXP: number;
}

export function Leaderboard({ currentUserId }: LeaderboardProps) {
  const [timeframe, setTimeframe] = useState<'daily' | 'weekly' | 'monthly' | 'all_time'>('weekly');
  const [category, setCategory] = useState<'xp' | 'streak' | 'quizzes'>('xp');
  
  const { data: leaderboardData, isLoading } = useLeaderboard(timeframe, category);
  
  // Use real data if available, fallback to empty array
  const leaderboard: LeaderboardEntry[] = leaderboardData || [];

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-6 h-6 text-warning" />;
      case 2:
        return <Medal className="w-6 h-6 text-gray-400" />;
      case 3:
        return <Medal className="w-6 h-6 text-amber-600" />;
      default:
        return <span className="text-lg font-bold text-muted-foreground">#{rank}</span>;
    }
  };

  const getChangeIndicator = (change: number) => {
    if (change > 0) {
      return (
        <div className="flex items-center gap-1 text-green-500">
          <TrendingUp className="w-4 h-4" />
          <span className="text-xs font-medium">+{change}</span>
        </div>
      );
    } else if (change < 0) {
      return (
        <div className="flex items-center gap-1 text-red-500">
          <TrendingUp className="w-4 h-4 rotate-180" />
          <span className="text-xs font-medium">{change}</span>
        </div>
      );
    }
    return <span className="text-xs text-muted-foreground">—</span>;
  };

  if (isLoading) {
    return (
      <div className="glass-card p-6 rounded-2xl border border-border">
        <div className="flex items-center justify-center p-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-secondary" />
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-6 rounded-2xl border border-border">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center">
          <Trophy className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-foreground">Leaderboard</h2>
          <p className="text-sm text-muted-foreground">Compete with learners worldwide</p>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setTimeframe('daily')}
          className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
            timeframe === 'daily'
              ? 'bg-primary text-white shadow-lg shadow-primary/20'
              : 'bg-background text-muted-foreground hover:text-foreground border border-border'
          }`}
        >
          Daily
        </button>
        <button
          onClick={() => setTimeframe('weekly')}
          className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
            timeframe === 'weekly'
              ? 'bg-primary text-white shadow-lg shadow-primary/20'
              : 'bg-background text-muted-foreground hover:text-foreground border border-border'
          }`}
        >
          Weekly
        </button>
        <button
          onClick={() => setTimeframe('all_time')}
          className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
            timeframe === 'all_time'
              ? 'bg-primary text-white shadow-lg shadow-primary/20'
              : 'bg-background text-muted-foreground hover:text-foreground border border-border'
          }`}
        >
          All Time
        </button>
      </div>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setCategory('xp')}
          className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            category === 'xp'
              ? 'bg-secondary/20 text-secondary border border-secondary/30'
              : 'bg-background/50 text-muted-foreground border border-border/50'
          }`}
        >
          <Star className="w-3 h-3 inline mr-1" />
          XP
        </button>
        <button
          onClick={() => setCategory('streak')}
          className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            category === 'streak'
              ? 'bg-secondary/20 text-secondary border border-secondary/30'
              : 'bg-background/50 text-muted-foreground border border-border/50'
          }`}
        >
          <Zap className="w-3 h-3 inline mr-1" />
          Streak
        </button>
        <button
          onClick={() => setCategory('quizzes')}
          className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            category === 'quizzes'
              ? 'bg-secondary/20 text-secondary border border-secondary/30'
              : 'bg-background/50 text-muted-foreground border border-border/50'
          }`}
        >
          <Trophy className="w-3 h-3 inline mr-1" />
          Quizzes
        </button>
      </div>

      <div className="space-y-2">
        {leaderboard.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p>No leaderboard data yet. Start learning to appear on the board!</p>
          </div>
        ) : (
          leaderboard.map((entry) => {
            const isCurrentUser = entry.userId === currentUserId;
          
          return (
            <div
              key={entry.userId}
              className={`p-4 rounded-xl transition-all ${
                entry.rank <= 3
                  ? 'bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30'
                  : isCurrentUser
                  ? 'bg-primary/10 border border-primary/30'
                  : 'bg-background border border-border hover:border-primary/30'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0 w-12 text-center">
                  {getRankIcon(entry.rank)}
                </div>

                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                  isCurrentUser
                    ? 'bg-primary text-white'
                    : 'bg-gradient-to-br from-purple-500 to-blue-500 text-white'
                }`}>
                  {entry.username.slice(0, 2).toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className={`font-semibold truncate ${
                      isCurrentUser ? 'text-primary' : 'text-foreground'
                    }`}>
                      {entry.username}
                    </h4>
                    <span className="px-2 py-0.5 bg-secondary/20 text-secondary text-xs font-medium rounded-full">
                      Lv {entry.level}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                    <span className="flex items-center gap-1">
                      <Star className="w-3 h-3" />
                      {entry.xp.toLocaleString()} XP
                    </span>
                    <span className="flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      {entry.streak} day streak
                    </span>
                  </div>
                </div>

                <div className="flex-shrink-0">
                  {getChangeIndicator(entry.change)}
                </div>
              </div>
            </div>
          );
        })
        )}
      </div>

      <div className="mt-6 p-4 bg-background rounded-xl border border-border">
        <div className="flex items-start gap-3">
          <Users className="w-5 h-5 text-primary mt-0.5" />
          <div>
            <h4 className="font-medium text-foreground mb-1">Compete & Grow</h4>
            <p className="text-sm text-muted-foreground">
              Rankings update hourly. Study consistently to climb the leaderboard and unlock exclusive badges!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
