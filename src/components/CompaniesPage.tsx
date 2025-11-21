import { Building2, Link2, Shield, Sparkles, Rocket, Globe2, PhoneCall, Mail, ArrowRight } from 'lucide-react';
import { Card, CardContent } from './enhanced/Card';
import { Badge } from './enhanced/Badge';
import { Button } from './enhanced/Button';

const highlights = [
  {
    title: 'White-label ready',
    copy: 'Embed SlideTutor AI inside your app with brandable themes, student analytics, and parental summaries.',
    icon: Shield,
  },
  {
    title: 'Education-safe AI',
    copy: 'Guardrails, retry logic, and transparent explanations tuned for school-safe deployments.',
    icon: Sparkles,
  },
  {
    title: 'Enterprise support',
    copy: 'Priority onboarding, SLAs, and shared roadmaps so your team ships faster.',
    icon: Rocket,
  },
];

export function CompaniesPage() {
  return (
    <div className="space-y-8 pb-20">
      {/* Hidden form for Netlify detection */}
      <form name="company-contact" data-netlify="true" data-netlify-honeypot="bot-field" hidden>
        <input type="text" name="company" />
        <input type="email" name="email" />
        <textarea name="needs" />
      </form>

      <div className="relative overflow-hidden rounded-3xl border border-border/40">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/15 via-primary/10 to-secondary/15" />
        <div className="relative glass-card p-8 md:p-12 grid md:grid-cols-5 gap-8 items-center">
          <div className="md:col-span-3 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-secondary text-white flex items-center justify-center shadow-lg shadow-primary/30">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground font-semibold">Enterprise</p>
                <h1 className="text-3xl md:text-4xl font-bold text-foreground">Companies & EdTech Partners</h1>
              </div>
            </div>
            <p className="text-lg text-muted-foreground max-w-3xl">
              Plug SlideTutor AI into your platform with safe AI tutoring, smart lesson generation, and analytics your teams can trust. Offer it as a premium add-on or a fully white-labeled study copilot.
            </p>
            <div className="flex flex-wrap gap-3">
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">White-label</Badge>
              <Badge variant="outline" className="bg-secondary/10 text-secondary border-secondary/30">Parent-friendly</Badge>
              <Badge variant="outline" className="bg-accent/10 text-accent border-accent/30">Analytics-ready</Badge>
            </div>
            <div className="flex gap-3 flex-wrap">
              <a href="#contact" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-primary to-secondary text-white shadow-md hover:shadow-lg transition">
                Talk to us <ArrowRight className="w-4 h-4" />
              </a>
              <a href="mailto:slidetutorai@gmail.com" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border/60 bg-card text-foreground hover:border-primary/50 transition">
                Email the founders <Mail className="w-4 h-4" />
              </a>
            </div>
          </div>
          <div className="md:col-span-2 space-y-4">
            <Card className="border-border/40 bg-card/70">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <Link2 className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-semibold text-foreground">Integration models</p>
                    <p className="text-sm text-muted-foreground">SDKs, embeddable widgets, and API endpoints with role-based access.</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Globe2 className="w-5 h-5 text-secondary" />
                  <div>
                    <p className="font-semibold text-foreground">Global-ready</p>
                    <p className="text-sm text-muted-foreground">Localization hooks, curriculum presets, and board-aware study plans.</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-emerald-500" />
                  <div>
                    <p className="font-semibold text-foreground">Compliance first</p>
                    <p className="text-sm text-muted-foreground">Student privacy, safe prompts, and transparent retry logs.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        {highlights.map((item) => (
          <Card key={item.title} className="border-border/40 h-full">
            <CardContent className="p-5 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary text-white flex items-center justify-center shadow-md shadow-primary/25">
                <item.icon className="w-5 h-5" />
              </div>
              <p className="font-semibold text-foreground">{item.title}</p>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.copy}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card id="contact" className="border-border/50">
        <CardContent className="p-6 md:p-8 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white flex items-center justify-center">
              <PhoneCall className="w-5 h-5" />
            </div>
            <div>
              <p className="text-lg font-semibold text-foreground">Book a discovery call</p>
              <p className="text-sm text-muted-foreground">Tell us about your use case—SDK embeds, full white-label, or a hybrid launch.</p>
            </div>
          </div>

          <form
            name="company-contact"
            method="POST"
            data-netlify="true"
            data-netlify-honeypot="bot-field"
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            <input type="hidden" name="form-name" value="company-contact" />
            <p className="hidden">
              <label>
                Don’t fill this out: <input name="bot-field" />
              </label>
            </p>
            <label className="space-y-2">
              <span className="text-sm font-medium text-foreground">Company</span>
              <input
                name="company"
                className="w-full rounded-xl border border-border/60 bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/60"
                placeholder="Acme Learning Pvt Ltd"
                required
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-foreground">Work email</span>
              <input
                type="email"
                name="email"
                className="w-full rounded-xl border border-border/60 bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/60"
                placeholder="you@company.com"
                required
              />
            </label>
            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-medium text-foreground">What do you want to build?</span>
              <textarea
                name="needs"
                className="w-full rounded-xl border border-border/60 bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/60 min-h-[120px]"
                placeholder="White-label tutoring, curriculum-aware quiz generator, parent reports..."
                required
              />
            </label>
            <div className="md:col-span-2 flex flex-wrap items-center gap-3">
              <Button type="submit" className="px-4 py-3">Submit</Button>
              <span className="text-sm text-muted-foreground flex items-center gap-2">
                <PhoneCall className="w-4 h-4" /> Prefer a call? +91-9800000000
              </span>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
