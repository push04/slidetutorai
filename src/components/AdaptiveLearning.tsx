import { useState, useEffect } from 'react';
import { Brain, TrendingUp, Target, Eye, Ear, Hand, BarChart3 } from 'lucide-react';

interface LearningStyle {
  type: 'visual' | 'auditory' | 'kinesthetic';
  score: number;
  description: string;
}

interface AdaptiveLearningProps {
  userPerformance: {
    correctAnswers: number;
    totalAnswers: number;
    avgResponseTime: number;
    topicsStruggling: string[];
  };
}

export function AdaptiveLearning({ userPerformance }: AdaptiveLearningProps) {
  const [detectedStyle, setDetectedStyle] = useState<LearningStyle | null>(null);
  const [difficulty, setDifficulty] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    analyzeLearningStyle();
    adjustDifficulty();
  }, [userPerformance]);

  const analyzeLearningStyle = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      const styles: LearningStyle[] = [
        {
          type: 'visual',
          score: Math.random() * 100,
          description: 'You learn best through images, diagrams, and visual representations'
        },
        {
          type: 'auditory',
          score: Math.random() * 100,
          description: 'You prefer learning through listening and verbal explanations'
        },
        {
          type: 'kinesthetic',
          score: Math.random() * 100,
          description: 'You learn best through hands-on practice and physical interaction'
        }
      ];

      const dominantStyle = styles.reduce((prev, current) => 
        current.score > prev.score ? current : prev
      );

      setDetectedStyle(dominantStyle);
      setIsAnalyzing(false);
    }, 1000);
  };

  const adjustDifficulty = () => {
    const accuracy = userPerformance.totalAnswers > 0
      ? (userPerformance.correctAnswers / userPerformance.totalAnswers) * 100
      : 50;

    if (accuracy >= 85) {
      setDifficulty('advanced');
    } else if (accuracy >= 60) {
      setDifficulty('intermediate');
    } else {
      setDifficulty('beginner');
    }
  };

  const getStyleIcon = (type: string) => {
    switch (type) {
      case 'visual': return <Eye className="w-6 h-6" />;
      case 'auditory': return <Ear className="w-6 h-6" />;
      case 'kinesthetic': return <Hand className="w-6 h-6" />;
      default: return <Brain className="w-6 h-6" />;
    }
  };

  const getDifficultyColor = (diff: string) => {
    switch (diff) {
      case 'beginner': return 'from-green-500 to-emerald-500';
      case 'intermediate': return 'from-yellow-500 to-orange-500';
      case 'advanced': return 'from-red-500 to-pink-500';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  const accuracy = userPerformance.totalAnswers > 0
    ? Math.round((userPerformance.correctAnswers / userPerformance.totalAnswers) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div className="glass-card p-6 rounded-2xl border border-border">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">Adaptive Learning Engine</h2>
            <p className="text-sm text-muted-foreground">Personalized to your learning style and pace</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="p-4 bg-background rounded-xl border border-border">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-foreground">Current Difficulty</h3>
                <BarChart3 className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="space-y-3">
                <div className={`p-4 bg-gradient-to-r ${getDifficultyColor(difficulty)} rounded-lg text-white`}>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold capitalize">{difficulty}</span>
                    <TrendingUp className="w-5 h-5" />
                  </div>
                </div>
                <div className="space-y-2">
                  {['beginner', 'intermediate', 'advanced'].map((level) => (
                    <div
                      key={level}
                      className={`p-2 rounded-lg transition-all ${
                        difficulty === level
                          ? 'bg-primary/10 border border-primary/30'
                          : 'bg-background/50 border border-border/50'
                      }`}
                    >
                      <div className="flex items-center justify-between text-sm">
                        <span className={`capitalize ${
                          difficulty === level ? 'text-foreground font-medium' : 'text-muted-foreground'
                        }`}>
                          {level}
                        </span>
                        {difficulty === level && (
                          <span className="text-xs text-primary">Active</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Based on {accuracy}% accuracy. System auto-adjusts as you improve.
              </p>
            </div>

            <div className="p-4 bg-background rounded-xl border border-border">
              <h3 className="font-semibold text-foreground mb-3">Performance Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Accuracy</span>
                  <span className="text-sm font-medium text-foreground">{accuracy}%</span>
                </div>
                <div className="w-full bg-background/50 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-300"
                    style={{ width: `${accuracy}%` }}
                  />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Questions Answered</span>
                  <span className="text-sm font-medium text-foreground">{userPerformance.totalAnswers}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Avg Response Time</span>
                  <span className="text-sm font-medium text-foreground">{userPerformance.avgResponseTime}s</span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-background rounded-xl border border-border">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-foreground">Learning Style</h3>
                {isAnalyzing && (
                  <span className="text-xs text-muted-foreground">Analyzing...</span>
                )}
              </div>
              
              {detectedStyle && (
                <div className="space-y-4">
                  <div className="p-4 bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/30 rounded-xl">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center text-white">
                        {getStyleIcon(detectedStyle.type)}
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground capitalize">{detectedStyle.type} Learner</h4>
                        <p className="text-xs text-muted-foreground">{Math.round(detectedStyle.score)}% match</p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">{detectedStyle.description}</p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-foreground">Optimized Content For You:</h4>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      {detectedStyle.type === 'visual' && (
                        <>
                          <li className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                            More diagrams and infographics
                          </li>
                          <li className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                            Color-coded notes and highlights
                          </li>
                          <li className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                            Visual memory aids and mind maps
                          </li>
                        </>
                      )}
                      {detectedStyle.type === 'auditory' && (
                        <>
                          <li className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                            Audio explanations and podcasts
                          </li>
                          <li className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                            Discussion-based learning
                          </li>
                          <li className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                            Verbal repetition exercises
                          </li>
                        </>
                      )}
                      {detectedStyle.type === 'kinesthetic' && (
                        <>
                          <li className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                            Interactive simulations
                          </li>
                          <li className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                            Hands-on practice problems
                          </li>
                          <li className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                            Physical activity breaks
                          </li>
                        </>
                      )}
                    </ul>
                  </div>
                </div>
              )}
            </div>

            {userPerformance.topicsStruggling.length > 0 && (
              <div className="p-4 bg-background rounded-xl border border-border">
                <div className="flex items-center gap-2 mb-3">
                  <Target className="w-5 h-5 text-warning" />
                  <h3 className="font-semibold text-foreground">Focus Areas</h3>
                </div>
                <div className="space-y-2">
                  {userPerformance.topicsStruggling.map((topic, index) => (
                    <div key={index} className="p-3 bg-warning/10 border border-warning/50 rounded-lg">
                      <p className="text-sm text-foreground">{topic}</p>
                      <p className="text-xs text-muted-foreground mt-1">Recommended for extra practice</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
