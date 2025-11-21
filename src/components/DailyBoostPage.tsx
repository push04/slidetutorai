import { BatteryCharging, Flame, ListChecks, Sparkles } from 'lucide-react';
import { StudyBoostWidget } from './enhanced/StudyBoostWidget';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './enhanced/Card';

interface DailyBoostPageProps {
  apiKey?: string;
}

export function DailyBoostPage({ apiKey }: DailyBoostPageProps) {
  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-card/80 shadow-2xl shadow-secondary/10 p-6 md:p-10">
        <div className="absolute inset-0 aurora-surface opacity-50" />
        <div className="relative z-10 grid md:grid-cols-2 gap-6 items-center">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold ring-1 ring-primary/25">
              <Flame className="w-4 h-4" /> Daily Study Boosts
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">Micro-drills that keep your streak alive</h1>
            <p className="text-muted-foreground max-w-2xl">
              Ask for a topic and get a 10-minute burst: recap, micro-quiz, and a closing reflection. Perfect for warmups, streaks, or fast revision on the go.
            </p>
            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/10 text-secondary ring-1 ring-secondary/25">
                <BatteryCharging className="w-4 h-4" /> 10-minute drills
              </span>
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 text-accent ring-1 ring-accent/25">
                <Sparkles className="w-4 h-4" /> Fresh every request
              </span>
            </div>
          </div>
          <Card className="border-border/60 bg-background/80 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ListChecks className="w-5 h-5 text-secondary" /> Suggested uses
              </CardTitle>
              <CardDescription>Keep boosts practical and fun</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>• Warm up before a timed quiz.</p>
              <p>• Quick recap after class to cement memory.</p>
              <p>• On mobile? Use it as a streak saver with 3 checks.</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <StudyBoostWidget apiKey={apiKey} />
    </div>
  );
}
