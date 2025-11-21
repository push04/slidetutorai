import { Calendar, CheckCircle2, Clock, Compass, Target } from 'lucide-react';
import { StudyPlanWidget } from './enhanced/StudyPlanWidget';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './enhanced/Card';

interface StudyPlanPageProps {
  apiKey?: string;
}

export function StudyPlanPage({ apiKey }: StudyPlanPageProps) {
  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-card/80 shadow-2xl shadow-primary/10 p-6 md:p-10">
        <div className="absolute inset-0 gradient-mesh opacity-30" />
        <div className="absolute -left-10 -top-10 w-40 h-40 bg-primary/20 blur-3xl" />
        <div className="absolute -right-16 bottom-0 w-48 h-48 bg-secondary/25 blur-3xl" />
        <div className="relative z-10 grid md:grid-cols-5 gap-6 items-center">
          <div className="md:col-span-3 space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/10 text-secondary text-xs font-semibold ring-1 ring-secondary/30">
              <Target className="w-4 h-4" /> Goal-aware roadmaps
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">Study plans that match your board and exam date</h1>
            <p className="text-muted-foreground max-w-2xl">
              Set your board or competitive goal, exam date, weak topics, and weekly hours. SlideTutor maps every week with checkpoints, revision loops, and mock-test timeboxes.
            </p>
            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary ring-1 ring-primary/20">
                <CheckCircle2 className="w-4 h-4" /> Adaptive milestones
              </span>
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 text-accent ring-1 ring-accent/20">
                <Clock className="w-4 h-4" /> Weekly cadence with buffers
              </span>
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/10 text-secondary ring-1 ring-secondary/20">
                <Calendar className="w-4 h-4" /> Built for CBSE/ICSE/NEET/JEE
              </span>
            </div>
          </div>
          <div className="md:col-span-2 space-y-3">
            <Card className="border-border/60 bg-background/80">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Compass className="w-5 h-5 text-primary" /> How it works
                </CardTitle>
                <CardDescription>Fast steps for a personal roadmap</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>1. Tell us your board/goal and exam month.</p>
                <p>2. Mark weak topics and weekly study hours.</p>
                <p>3. Generate a plan with milestones, drills, and revision blocks.</p>
                <p>4. Regenerate as you improve and track it from the dashboard.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <StudyPlanWidget apiKey={apiKey} />
    </div>
  );
}
