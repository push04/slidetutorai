import { useMemo, useState } from 'react';
import { ArrowLeftRight, CheckCircle2, Download, FileText, Sparkles, Wand2, Palette } from 'lucide-react';
import toast from 'react-hot-toast';
import { MarkdownRenderer } from './MarkdownRenderer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './enhanced/Card';
import { Button } from './enhanced/Button';
import { OpenRouterAPI } from '../services/OpenRouterAPI';
import { useGlobalProgress } from '../contexts/GlobalProgressContext';
import { downloadTextSectionsAsPdf, markdownToPlain } from '../utils/pdfUtils';

interface CVBuilderProps {
  apiKey?: string;
}

const DEFAULT_PREVIEW = `# Your Name — Role

## Summary
Energetic student ready for internships. Blends rapid learning with disciplined execution and clear communication.

## Skills
- Core: JavaScript, TypeScript, React, HTML/CSS
- Data: SQL basics, Supabase familiarity
- Soft: Communication, ownership, calm under deadlines

## Experience
- Built a personal dashboard for course tracking with charts and reminders.
- Volunteered as a peer tutor; improved classmates' quiz scores by 12%.

## Education
- B.Tech / B.Sc candidate — GPA 8.5/10
- Highlights: Algorithms, Operating Systems, Statistics

## Projects
- Smart Notes: AI-assisted notes with flashcards.
- Quiz Sprint: Timed quiz generator with review mode.
`;

export function CVBuilder({ apiKey }: CVBuilderProps) {
  const [fullName, setFullName] = useState('Student Name');
  const [role, setRole] = useState('Aspiring Software Engineer');
  const [summary, setSummary] = useState('Energetic learner with a maker mindset, excited about internships and real-world projects.');
  const [skills, setSkills] = useState('JavaScript, TypeScript, React, Tailwind, SQL, Communication, Ownership');
  const [experience, setExperience] = useState('Built dashboards for classmates; led a mini study group that improved average scores.');
  const [education, setEducation] = useState('B.Tech/B.Sc candidate — GPA 8.5/10; coursework in algorithms, OS, statistics.');
  const [tone, setTone] = useState('Warm & confident');
  const [targetCompany, setTargetCompany] = useState('Any fast-learning environment / edtech / SaaS');
  const [standout, setStandout] = useState('Hackathon finalist; shipped two side projects used by peers.');
  const [preview, setPreview] = useState(DEFAULT_PREVIEW);
  const [isGenerating, setIsGenerating] = useState(false);
  const { start, update, complete } = useGlobalProgress();
  const STORAGE_KEY = 'slidetutor_cv_builder_state';

  const resolvedKey = useMemo(
    () => (apiKey && apiKey.trim().length > 0 ? apiKey : (import.meta.env?.VITE_OPENROUTER_API_KEY ?? '')),
    [apiKey]
  );

  const buildPrompt = () => ({
    fullName,
    role,
    summary,
    skills,
    experience,
    education,
    tone,
    targetCompany,
    standout,
  });

  const buildLocalPreview = () => `# ${fullName} — ${role}

## Summary
${summary} (${tone})

## Skills
${skills}

## Experience
${experience}

## Education
${education}

## Extras
Target: ${targetCompany}
Highlights: ${standout}`;

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setFullName(parsed.fullName ?? fullName);
        setRole(parsed.role ?? role);
        setSummary(parsed.summary ?? summary);
        setSkills(parsed.skills ?? skills);
        setExperience(parsed.experience ?? experience);
        setEducation(parsed.education ?? education);
        setTone(parsed.tone ?? tone);
        setTargetCompany(parsed.targetCompany ?? targetCompany);
        setStandout(parsed.standout ?? standout);
        setPreview(parsed.preview ?? DEFAULT_PREVIEW);
      }
    } catch (error) {
      console.warn('Failed to restore CV builder state', error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const payload = {
      fullName,
      role,
      summary,
      skills,
      experience,
      education,
      tone,
      targetCompany,
      standout,
      preview,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [fullName, role, summary, skills, experience, education, tone, targetCompany, standout, preview]);

  const handleGenerate = async () => {
    if (!fullName.trim() || !role.trim()) {
      toast.error('Add your name and target role to shape the CV.');
      return;
    }

    if (!resolvedKey) {
      setPreview(buildLocalPreview());
      toast.success('Starter CV loaded. Add your API key for a sharper draft.');
      return;
    }

    setIsGenerating(true);
    const progressId = start('Drafting your CV...');
    try {
      const client = new OpenRouterAPI(resolvedKey);
      const draft = await client.generateCvResume(buildPrompt(), (pct, msg) => update(pct, msg, progressId));
      setPreview(draft);
      toast.success('CV draft generated!');
    } catch (error) {
      console.error('CV generation failed', error);
      toast.error('Could not generate CV. Please retry.');
    } finally {
      update(100, 'Ready', progressId);
      complete(progressId);
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(preview);
      toast.success('Copied CV to clipboard');
    } catch (error) {
      console.error('Copy failed', error);
      toast.error('Could not copy. Select and copy manually.');
    }
  };

  const handleDownload = () => {
    const blob = new Blob([preview], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fullName.replace(/\s+/g, '_') || 'cv'}_slidetutor.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadPdf = () => {
    const plain = markdownToPlain(preview);
    const sections = [
      { heading: `${fullName} — ${role}`, body: plain },
      { heading: 'Contact for interviews', body: `${targetCompany}. Highlights: ${standout}` },
    ];
    downloadTextSectionsAsPdf('SlideTutor CV', sections, `${fullName.replace(/\s+/g, '_') || 'cv'}_slidetutor.pdf`);
    toast.success('CV saved as PDF');
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-card/80 shadow-2xl shadow-primary/10 p-6 md:p-10">
        <div className="absolute inset-0 gradient-mesh opacity-25" />
        <div className="relative z-10 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold ring-1 ring-primary/25">
            <Wand2 className="w-4 h-4" /> AI CV Builder
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">Polished, job-ready CVs in minutes</h1>
          <p className="text-muted-foreground max-w-3xl">
            Feed your skills, projects, and education. SlideTutor drafts a confident, metrics-driven CV you can ship for internships, placements, or freelance gigs.
          </p>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/10 text-secondary ring-1 ring-secondary/25">
              <CheckCircle2 className="w-4 h-4" /> ATS-friendly phrasing
            </span>
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 text-accent ring-1 ring-accent/25">
              <ArrowLeftRight className="w-4 h-4" /> Swap between summary + bullet focus
            </span>
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary ring-1 ring-primary/25">
              <Palette className="w-4 h-4" /> Tone presets & PDF export
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="w-5 h-5 text-primary" /> Tell us about you
            </CardTitle>
            <CardDescription>We’ll tighten wording and structure automatically.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="space-y-2 text-sm font-medium text-foreground">
                Full name
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-xl border border-border/70 bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/60"
                />
              </label>
              <label className="space-y-2 text-sm font-medium text-foreground">
                Target role
                <input
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full rounded-xl border border-border/70 bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/60"
                  placeholder="Backend intern, Frontend trainee, Data analyst"
                />
              </label>
            </div>

            <label className="space-y-2 text-sm font-medium text-foreground">
              Summary
              <textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-border/70 bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/60"
              />
            </label>

            <label className="space-y-2 text-sm font-medium text-foreground">
              Skills (comma separated)
              <textarea
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                rows={2}
                className="w-full rounded-xl border border-border/70 bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/60"
              />
            </label>

            <label className="space-y-2 text-sm font-medium text-foreground">
              Experience / impact
              <textarea
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-border/70 bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/60"
                placeholder="Quantify outcomes: improved grades by X%, shipped Y features, mentored Z peers."
              />
            </label>

            <label className="space-y-2 text-sm font-medium text-foreground">
              Education & highlights
              <textarea
                value={education}
                onChange={(e) => setEducation(e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-border/70 bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/60"
              />
            </label>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="space-y-2 text-sm font-medium text-foreground">
                Tone
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  className="w-full rounded-xl border border-border/70 bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/60"
                >
                  <option>Warm & confident</option>
                  <option>Concise & metrics-led</option>
                  <option>Formal & academic</option>
                  <option>Creative & storytelling</option>
                </select>
              </label>
              <label className="space-y-2 text-sm font-medium text-foreground">
                Target company or industry
                <input
                  value={targetCompany}
                  onChange={(e) => setTargetCompany(e.target.value)}
                  className="w-full rounded-xl border border-border/70 bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/60"
                  placeholder="e.g., Edtech, SaaS, fintech, consulting"
                />
              </label>
            </div>

            <label className="space-y-2 text-sm font-medium text-foreground">
              Standout accomplishments
              <textarea
                value={standout}
                onChange={(e) => setStandout(e.target.value)}
                rows={2}
                className="w-full rounded-xl border border-border/70 bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/60"
                placeholder="Awards, leadership, top metrics, community impact"
              />
            </label>

            <div className="flex flex-wrap gap-3">
              <Button onClick={handleGenerate} disabled={isGenerating} icon={<Sparkles className="w-4 h-4" />}>
                {isGenerating ? 'Crafting...' : 'Generate AI CV'}
              </Button>
              <Button variant="ghost" onClick={handleCopy} icon={<Wand2 className="w-4 h-4" />}>
                Copy
              </Button>
              <Button variant="outline" onClick={handleDownload} icon={<Download className="w-4 h-4" />}>
                Download .md
              </Button>
              <Button variant="outline" onClick={handleDownloadPdf} icon={<Download className="w-4 h-4" />}>
                Download PDF
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-background/80 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="w-5 h-5 text-secondary" /> Preview
            </CardTitle>
            <CardDescription>Polish wording, then copy or download instantly.</CardDescription>
          </CardHeader>
          <CardContent className="prose dark:prose-invert max-w-none max-h-[620px] overflow-y-auto border border-dashed border-border/60 rounded-2xl p-4">
            <MarkdownRenderer content={preview} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
