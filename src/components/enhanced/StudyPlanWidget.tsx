import { useEffect, useState } from 'react';
import { Calendar, Goal, Target, Loader2, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { OpenRouterAPI } from '../../services/OpenRouterAPI';
import { MarkdownRenderer } from '../MarkdownRenderer';

interface StudyPlanWidgetProps {
  apiKey?: string;
}

interface SavedPlan {
  title: string;
  plan: string;
  createdAt: string;
}

const STORAGE_KEY = 'slidetutor_study_plan';

export function StudyPlanWidget({ apiKey }: StudyPlanWidgetProps) {
  const [goal, setGoal] = useState('CBSE 10th Board');
  const [examDate, setExamDate] = useState('');
  const [weakTopics, setWeakTopics] = useState('Algebra, Organic Chemistry, Current Affairs');
  const [hoursPerWeek, setHoursPerWeek] = useState('10');
  const [isGenerating, setIsGenerating] = useState(false);
  const [plan, setPlan] = useState<SavedPlan | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setPlan(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    if (plan) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
    }
  }, [plan]);

  const handleGenerate = async () => {
    if (!goal.trim()) {
      toast.error('Add a goal or board to personalize your plan.');
      return;
    }

    if (!apiKey) {
      const fallback: SavedPlan = {
        title: `${goal} • weekly rhythm`,
        plan:
          'Set your exam date to map backwards. Spend ~2 focused hours/day on priority gaps. Week 1: refresh Algebra fundamentals; Week 2: factorization & quadratic practice; Week 3: coordinate geometry drills; Week 4: timed mixed papers. Reserve Sunday evenings for a 30-minute reflection + plan reset.',
        createdAt: new Date().toISOString(),
      };
      setPlan(fallback);
      toast.success('Saved a quick starter plan. Add your API key for a deeper AI plan.');
      return;
    }

    setIsGenerating(true);
    try {
      const client = new OpenRouterAPI(apiKey);
      const response = await client.generateStudyPlan({
        goal,
        examDate,
        weakTopics,
        hoursPerWeek,
      });

      const saved: SavedPlan = {
        title: `${goal} • Study plan`,
        plan: response,
        createdAt: new Date().toISOString(),
      };
      setPlan(saved);
      toast.success('Study plan created!');
    } catch (error) {
      console.error('Plan generation failed', error);
      toast.error('Could not generate plan. Please retry.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="bg-card border border-border/60 rounded-2xl shadow-lg p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/10 text-secondary text-xs font-semibold ring-1 ring-secondary/30">
            <Target className="w-4 h-4" />
            Goal-aware planning
          </div>
          <h2 className="text-xl font-semibold text-foreground">AI study plan</h2>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Capture your board/goal, exam date, and weak topics. SlideTutor builds a weekly schedule with checkpoints, focus blocks, and revision loops.
          </p>
        </div>
        <div className="hidden md:flex">
          <div className="px-3 py-2 rounded-lg bg-primary/10 text-primary text-xs font-semibold inline-flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            New
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-3">
          <label className="text-sm font-medium text-foreground flex items-center gap-2">
            <Goal className="w-4 h-4 text-primary" />
            Board / goal
          </label>
          <input
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="CBSE 10th, ICSE, NEET, JEE, SAT, IELTS..."
            className="w-full px-4 py-3 rounded-xl border border-border/70 bg-background focus:outline-none focus:ring-2 focus:ring-primary/60"
          />
          <label className="text-sm font-medium text-foreground flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            Exam date (optional)
          </label>
          <input
            type="date"
            value={examDate}
            onChange={(e) => setExamDate(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-border/70 bg-background focus:outline-none focus:ring-2 focus:ring-primary/60"
          />
        </div>
        <div className="space-y-3">
          <label className="text-sm font-medium text-foreground">Weak topics or focus areas</label>
          <textarea
            value={weakTopics}
            onChange={(e) => setWeakTopics(e.target.value)}
            rows={3}
            className="w-full px-4 py-3 rounded-xl border border-border/70 bg-background focus:outline-none focus:ring-2 focus:ring-primary/60"
            placeholder="e.g., Organic mechanisms, vectors, reading comprehension..."
          />
          <label className="text-sm font-medium text-foreground">Hours per week</label>
          <input
            type="number"
            min="2"
            max="60"
            value={hoursPerWeek}
            onChange={(e) => setHoursPerWeek(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-border/70 bg-background focus:outline-none focus:ring-2 focus:ring-primary/60"
            placeholder="10"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white font-semibold shadow-sm hover:shadow transition disabled:opacity-60"
        >
          {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          Generate AI plan
        </button>
        {!apiKey && (
          <span className="text-xs text-muted-foreground">
            Add your OpenRouter key in Settings for a bespoke plan. Using a starter template meanwhile.
          </span>
        )}
        {plan && (
          <span className="text-xs text-secondary bg-secondary/10 px-3 py-1.5 rounded-full font-semibold">
            Saved {new Date(plan.createdAt).toLocaleDateString()}
          </span>
        )}
      </div>

      <div className="rounded-2xl border border-dashed border-border/70 bg-background/60 p-4">
        {plan ? (
          <div className="space-y-2">
            <h3 className="text-base font-semibold text-foreground">{plan.title}</h3>
            <div className="prose dark:prose-invert max-w-none">
              <MarkdownRenderer content={plan.plan} />
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No plan yet. Add your goal, weak topics, and hours to create one.</p>
        )}
      </div>
    </div>
  );
}
