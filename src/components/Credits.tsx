import { Users, Sparkles, HeartHandshake } from 'lucide-react';

const FOUNDERS = [
  { name: 'Pushpal Sanyal', role: 'Founder' },
  { name: 'Shrestha Sharan', role: 'Co-Founder' },
  { name: 'Rishi Singh', role: 'Co-Founder' },
  { name: 'Namonarayan Divli', role: 'Co-Founder' },
];

export function Credits() {
  return (
    <section className="space-y-8">
      <div className="glass-card border border-border/50 rounded-3xl p-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-purple-500/5 to-blue-500/5" />
        <div className="relative z-10 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary via-purple-500 to-blue-500 flex items-center justify-center shadow-lg">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Credits</p>
              <h1 className="text-3xl font-bold text-foreground">SlideTutor — Learn boldly.</h1>
              <p className="text-muted-foreground mt-1">Built to transform PDFs, slides, and videos into beautiful lessons, quizzes, and flashcards.</p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="glass-card border border-border/40 rounded-2xl p-6 shadow-inner">
              <div className="flex items-center gap-3 mb-3">
                <HeartHandshake className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold">What SlideTutor does</h2>
              </div>
              <ul className="space-y-2 text-muted-foreground text-sm">
                <li>• Turns your documents and lectures into structured study plans.</li>
                <li>• Generates quizzes, flashcards, and summaries with AI that respects your time.</li>
                <li>• Keeps progress in sync across devices with a focus on clarity and speed.</li>
              </ul>
            </div>
            <div className="glass-card border border-border/40 rounded-2xl p-6 shadow-inner">
              <div className="flex items-center gap-3 mb-3">
                <Users className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold">Founding team</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                {FOUNDERS.map((founder) => (
                  <div key={founder.name} className="p-3 rounded-xl bg-muted/60 border border-border/40">
                    <p className="font-semibold text-foreground">{founder.name}</p>
                    <p className="text-xs text-muted-foreground">{founder.role}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Credits;
