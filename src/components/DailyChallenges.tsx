import { useState, useEffect } from 'react';
import { Trophy, Zap, Star, Lock, CheckCircle2, Clock, Award } from 'lucide-react';
import toast from 'react-hot-toast';

interface Challenge {
  id: string;
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  xpReward: number;
  type: 'quiz' | 'flashcards' | 'study-time' | 'streak';
  completed: boolean;
  locked: boolean;
  progress: number;
  target: number;
}

interface DailyChallengesProps {
  userLevel: number;
  onChallengeComplete: (challenge: Challenge) => void;
}

export function DailyChallenges({ userLevel, onChallengeComplete }: DailyChallengesProps) {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);

  useEffect(() => {
    const today = new Date().toDateString();
    const dailyChallenges: Challenge[] = [
      {
        id: 'daily-quiz',
        title: 'Daily Quiz Master',
        description: 'Complete 5 quiz questions with 80% accuracy',
        difficulty: 'easy',
        xpReward: 50,
        type: 'quiz',
        completed: false,
        locked: false,
        progress: 0,
        target: 5
      },
      {
        id: 'flashcard-marathon',
        title: 'Flashcard Marathon',
        description: 'Review 20 flashcards today',
        difficulty: 'medium',
        xpReward: 100,
        type: 'flashcards',
        completed: false,
        locked: false,
        progress: 0,
        target: 20
      },
      {
        id: 'study-sprint',
        title: 'Study Sprint',
        description: 'Study for 30 minutes without breaks',
        difficulty: 'medium',
        xpReward: 75,
        type: 'study-time',
        completed: false,
        locked: false,
        progress: 0,
        target: 30
      },
      {
        id: 'streak-keeper',
        title: 'Streak Keeper',
        description: 'Maintain your study streak for 7 days',
        difficulty: 'hard',
        xpReward: 200,
        type: 'streak',
        completed: false,
        locked: userLevel < 3,
        progress: 0,
        target: 7
      },
      {
        id: 'perfect-score',
        title: 'Perfect Score',
        description: 'Get 100% on any quiz with at least 10 questions',
        difficulty: 'hard',
        xpReward: 150,
        type: 'quiz',
        completed: false,
        locked: userLevel < 5,
        progress: 0,
        target: 1
      }
    ];

    setChallenges(dailyChallenges);
  }, [userLevel]);

  const handleStartChallenge = (challenge: Challenge) => {
    if (challenge.locked) {
      toast.error(`Unlock at level ${challenge.type === 'streak' ? 3 : 5}`);
      return;
    }

    if (challenge.completed) {
      toast.success('Challenge already completed today!');
      return;
    }

    setSelectedChallenge(challenge);
    toast.success(`Challenge started: ${challenge.title}`);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-500';
      case 'medium': return 'text-warning';
      case 'hard': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getDifficultyBg = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-success/20 border-success/50';
      case 'medium': return 'bg-warning/20 border-warning/50';
      case 'hard': return 'bg-error/10 border-red-500/30';
      default: return 'bg-muted/20 border-muted/50';
    }
  };

  const completedCount = challenges.filter(c => c.completed).length;
  const totalXP = challenges.filter(c => c.completed).reduce((sum, c) => sum + c.xpReward, 0);

  return (
    <div className="space-y-6">
      <div className="glass-card p-6 rounded-2xl border border-border">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">Daily Challenges</h2>
              <p className="text-sm text-muted-foreground">Complete challenges to earn bonus XP</p>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2 text-2xl font-bold text-foreground">
              <Star className="w-6 h-6 text-warning" />
              {totalXP} XP
            </div>
            <p className="text-xs text-muted-foreground">
              {completedCount}/{challenges.length} completed
            </p>
          </div>
        </div>

        <div className="grid gap-4">
          {challenges.map((challenge) => (
            <div
              key={challenge.id}
              className={`relative p-4 rounded-xl border transition-all ${
                challenge.locked
                  ? 'bg-background/30 border-border/50 opacity-60'
                  : challenge.completed
                  ? 'bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-success/50'
                  : 'bg-background border-border hover:border-primary/50 cursor-pointer'
              }`}
              onClick={() => !challenge.locked && !challenge.completed && handleStartChallenge(challenge)}
            >
              {challenge.locked && (
                <div className="absolute top-4 right-4">
                  <Lock className="w-5 h-5 text-muted-foreground" />
                </div>
              )}
              {challenge.completed && (
                <div className="absolute top-4 right-4">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                </div>
              )}

              <div className="flex items-start gap-4">
                <div className={`w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  getDifficultyBg(challenge.difficulty)
                }`}>
                  {challenge.type === 'quiz' && <Zap className={`w-8 h-8 ${getDifficultyColor(challenge.difficulty)}`} />}
                  {challenge.type === 'flashcards' && <Star className={`w-8 h-8 ${getDifficultyColor(challenge.difficulty)}`} />}
                  {challenge.type === 'study-time' && <Clock className={`w-8 h-8 ${getDifficultyColor(challenge.difficulty)}`} />}
                  {challenge.type === 'streak' && <Award className={`w-8 h-8 ${getDifficultyColor(challenge.difficulty)}`} />}
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-foreground">{challenge.title}</h3>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                      challenge.difficulty === 'easy'
                        ? 'bg-success/20 text-success dark:text-green-400'
                        : challenge.difficulty === 'medium'
                        ? 'bg-warning/20 text-warning dark:text-yellow-400'
                        : 'bg-error/10 text-error dark:text-red-400'
                    }`}>
                      {challenge.difficulty.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{challenge.description}</p>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1 text-sm">
                        <Star className="w-4 h-4 text-warning" />
                        <span className="font-medium text-foreground">+{challenge.xpReward} XP</span>
                      </div>
                      {!challenge.completed && !challenge.locked && (
                        <div className="text-sm text-muted-foreground">
                          {challenge.progress}/{challenge.target} progress
                        </div>
                      )}
                    </div>
                    {!challenge.locked && !challenge.completed && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartChallenge(challenge);
                        }}
                        className="px-4 py-1.5 bg-primary text-white text-sm rounded-lg hover:bg-primary/90 transition-colors"
                      >
                        Start
                      </button>
                    )}
                    {challenge.locked && (
                      <span className="text-xs text-muted-foreground">
                        Requires Level {challenge.type === 'streak' ? 3 : 5}
                      </span>
                    )}
                  </div>

                  {!challenge.completed && !challenge.locked && challenge.progress > 0 && (
                    <div className="mt-3">
                      <div className="w-full bg-background/50 rounded-full h-2 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-300"
                          style={{ width: `${(challenge.progress / challenge.target) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-background/50 rounded-xl border border-border">
          <div className="flex items-start gap-3">
            <Trophy className="w-5 h-5 text-warning mt-0.5" />
            <div>
              <h4 className="font-medium text-foreground mb-1">Pro Tip</h4>
              <p className="text-sm text-muted-foreground">
                Complete all daily challenges to unlock bonus weekend challenges with even bigger rewards!
                Challenges reset every day at midnight.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
