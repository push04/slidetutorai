import { Sparkles, ShieldCheck, HeartHandshake, Medal, Users } from 'lucide-react';
import { Card, CardContent } from './enhanced/Card';
import { Badge } from './enhanced/Badge';

const team = [
  {
    name: 'Pushpal Sanyal',
    title: 'Founder — Technology & Operations',
    blurb: 'Architecting SlideTutor AI with a relentless focus on stability, privacy, and fast iteration.',
  },
  {
    name: 'Shrestha Sharan',
    title: 'Co-founder — Ideation & Experience',
    blurb: 'Shapes delightful learning journeys that feel like a senior guiding you every step.',
  },
  {
    name: 'Rishi Singh',
    title: 'Co-founder — Testing & Development',
    blurb: 'Leads reliability sprints, making sure every quiz, flashcard, and lesson stays trustworthy.',
  },
  {
    name: 'Namonarayan Divli',
    title: 'Co-founder — Management & Marketing',
    blurb: 'Amplifies SlideTutor AI to schools and partners, keeping the brand caring yet premium.',
  },
];

export function CreditsPage() {
  return (
    <div className="space-y-8 pb-20">
      <div className="relative overflow-hidden rounded-3xl border border-border/40">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-secondary/10 to-accent/15" />
        <div className="relative glass-card p-8 md:p-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-secondary text-white flex items-center justify-center shadow-lg shadow-primary/30">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground font-semibold">Credits</p>
              <h1 className="text-3xl md:text-4xl font-bold text-foreground">The humans behind SlideTutor AI</h1>
            </div>
          </div>
          <p className="text-lg text-muted-foreground max-w-3xl">
            We blend pedagogy, engineering, and thoughtful design to beat yesterday&apos;s study habits and rival any tutor app.
            Our crew ships fast, listens hard, and keeps the platform trustworthy for learners and parents.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">Premium experience</Badge>
            <Badge variant="outline" className="bg-secondary/10 text-secondary border-secondary/30">Safe & reliable</Badge>
            <Badge variant="outline" className="bg-accent/10 text-accent border-accent/30">Built for students & parents</Badge>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6">
        {team.map((member) => (
          <Card key={member.name} className="h-full border-border/40 bg-card/60 backdrop-blur">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary to-secondary text-white flex items-center justify-center shadow-md shadow-primary/25">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{member.name}</p>
                  <p className="text-xs text-muted-foreground">{member.title}</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{member.blurb}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border/50">
        <CardContent className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white flex items-center justify-center">
              <HeartHandshake className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Learner-first ethos</p>
              <p className="text-sm text-muted-foreground">Clear explanations, smart retries, and safe defaults keep progress moving.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-500 text-white flex items-center justify-center">
              <Medal className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Quality obsession</p>
              <p className="text-sm text-muted-foreground">We validate AI outputs, add review modes, and keep analytics honest.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Built with community</p>
              <p className="text-sm text-muted-foreground">We listen to students, parents, and teachers to keep SlideTutor ahead.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
