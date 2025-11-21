import { useMemo, useState } from 'react';
import { Flame, RefreshCw, Sparkles, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import { OpenRouterAPI } from '../../services/OpenRouterAPI';
import { MarkdownRenderer } from '../MarkdownRenderer';

interface StudyBoostWidgetProps {
  apiKey?: string;
}

const SEEDS = [
  'Mini-quiz: 3 conceptual MCQs on photosynthesis + 1 application question',
  'Rapid recap: Derivatives rules cheat-sheet + 2 worked examples',
  'Brain jog: 3-minute summary of World War II causes + 2 reflection prompts',
  'Numerical sprint: 4 practice problems on vectors with stepwise hints',
];

export function StudyBoostWidget({ apiKey }: StudyBoostWidgetProps) {
  const [topic, setTopic] = useState('Electrostatics fundamentals');
  const [boost, setBoost] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);

  const placeholder = useMemo(() => SEEDS[Math.floor(Math.random() * SEEDS.length)], []);

  const handleGenerate = async () => {
    if (!topic.trim()) {
      toast.error('Add a topic or goal to personalize your boost.');
      return;
    }

    if (!apiKey) {
      setBoost(`**Today’s Boost:** ${placeholder}\n\n- 5-minute read\n- 2 quick checks\n- Finish with a 1-line summary.`);
      toast.success('Starter boost ready. Add your API key for tailored micro-drills.');
      return;
    }

    setIsGenerating(true);
    try {
      const client = new OpenRouterAPI(apiKey);
      const response = await client.generateStudyBoost(topic);
      setBoost(response);
      toast.success('Study boost generated!');
    } catch (error) {
      console.error('Boost generation failed', error);
      toast.error('Could not generate boost. Please retry.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-primary/15 via-secondary/10 to-background border border-border/60 rounded-2xl p-6 space-y-4 shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/15 text-primary text-xs font-semibold">
            <Flame className="w-4 h-4" /> Daily Study Boost
          </div>
          <h2 className="text-lg font-semibold text-foreground">Micro-drill in under 10 minutes</h2>
          <p className="text-sm text-muted-foreground">Get a focused micro-quiz or recap tuned to your topic. Great for streaks and warmups.</p>
        </div>
        <div className="hidden md:flex">
          <Zap className="w-5 h-5 text-secondary" />
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder={placeholder}
          className="flex-1 px-4 py-3 rounded-xl border border-border/70 bg-background focus:outline-none focus:ring-2 focus:ring-primary/60"
        />
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-primary text-white font-semibold shadow-sm hover:shadow transition disabled:opacity-60"
        >
          {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          Generate boost
        </button>
      </div>

      <div className="rounded-xl border border-dashed border-border/70 bg-card/60 p-4 min-h-[140px]">
        {boost ? (
          <div className="prose dark:prose-invert max-w-none">
            <MarkdownRenderer content={boost} />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Describe your focus topic to receive a micro-quiz, recap, or drill.</p>
        )}
      </div>
    </div>
  );
}
