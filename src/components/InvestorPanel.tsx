import { useState } from 'react';
import { 
  TrendingUp, 
  Target, 
  Rocket, 
  Users, 
  Brain, 
  Zap, 
  Globe, 
  Award,
  Mail,
  Send,
  Sparkles,
  BarChart3,
  Lock,
  Smartphone,
  BookOpen,
  MessageSquare
} from 'lucide-react';
import toast from 'react-hot-toast';

export function InvestorPanel() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    organization: '',
    message: '',
    investmentRange: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          'form-name': 'investor-contact',
          ...formData
        }).toString()
      });

      if (response.ok) {
        toast.success('Thank you! We\'ll be in touch soon.');
        setFormData({ name: '', email: '', organization: '', message: '', investmentRange: '' });
      } else {
        throw new Error('Form submission failed');
      }
    } catch (error) {
      toast.error('Something went wrong. Please try again or email us directly.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 pb-20">
      {/* Hero Section */}
      <div className="glass-card p-8 rounded-2xl border border-border/40 bg-gradient-to-br from-purple-500/10 via-transparent to-indigo-500/10 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-indigo-500/5 animate-pulse"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/30">
              <Rocket className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-foreground mb-2">
                Invest in the Future of Education
              </h1>
              <p className="text-xl text-muted-foreground">
                Join us in revolutionizing how the world learns
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
            <div className="glass-card p-6 rounded-xl border border-purple-500/30 bg-purple-500/5">
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp className="w-6 h-6 text-purple-500" />
                <h3 className="text-2xl font-bold text-foreground">$2.5T+</h3>
              </div>
              <p className="text-sm text-muted-foreground">Global EdTech Market by 2030</p>
            </div>
            <div className="glass-card p-6 rounded-xl border border-indigo-500/30 bg-indigo-500/5">
              <div className="flex items-center gap-3 mb-2">
                <Users className="w-6 h-6 text-indigo-500" />
                <h3 className="text-2xl font-bold text-foreground">1.8B+</h3>
              </div>
              <p className="text-sm text-muted-foreground">Learners Worldwide</p>
            </div>
            <div className="glass-card p-6 rounded-xl border border-blue-500/30 bg-blue-500/5">
              <div className="flex items-center gap-3 mb-2">
                <Brain className="w-6 h-6 text-blue-500" />
                <h3 className="text-2xl font-bold text-foreground">AI-First</h3>
              </div>
              <p className="text-sm text-muted-foreground">Next-Gen Learning Platform</p>
            </div>
          </div>
        </div>
      </div>

      {/* Why Invest Section */}
      <div className="glass-card p-8 rounded-2xl border border-border/40">
        <h2 className="text-3xl font-bold text-foreground mb-6 flex items-center gap-3">
          <Target className="w-8 h-8 text-primary" />
          Why Invest in SlideTutor AI?
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-green-500/30">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground mb-1">Massive Market Opportunity</h3>
                <p className="text-sm text-muted-foreground">
                  The global EdTech market is exploding, with AI-powered learning platforms leading the charge. We're positioned at the intersection of education, AI, and productivity.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-purple-500/30">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground mb-1">AI-Powered Innovation</h3>
                <p className="text-sm text-muted-foreground">
                  Our platform uses cutting-edge AI models to transform any content into personalized learning experiences, making education accessible and adaptive.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-500/30">
                <Globe className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground mb-1">Scalable & Global</h3>
                <p className="text-sm text-muted-foreground">
                  Cloud-based architecture with multi-language support enables instant global reach with minimal infrastructure costs.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-orange-500/30">
                <Award className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground mb-1">Proven Product-Market Fit</h3>
                <p className="text-sm text-muted-foreground">
                  Students, professionals, and educators are actively seeking AI-powered learning tools. Our comprehensive feature set addresses real pain points.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-500/30">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground mb-1">Multiple Revenue Streams</h3>
                <p className="text-sm text-muted-foreground">
                  Freemium model, institutional licenses, API access, and premium features create diverse monetization opportunities.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-purple-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-pink-500/30">
                <Lock className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground mb-1">Enterprise-Ready Security</h3>
                <p className="text-sm text-muted-foreground">
                  Built with Supabase authentication, RLS policies, and secure data handling for institutional adoption.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Current Features Section */}
      <div className="glass-card p-8 rounded-2xl border border-border/40">
        <h2 className="text-3xl font-bold text-foreground mb-6 flex items-center gap-3">
          <Sparkles className="w-8 h-8 text-primary" />
          Current Platform Features
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { icon: Brain, title: 'AI Lesson Generation', desc: 'Transform PDFs, PPTX, and videos into structured lessons instantly' },
            { icon: BookOpen, title: 'Smart Quizzes', desc: 'Adaptive difficulty, multiple question types, instant feedback' },
            { icon: Zap, title: 'Intelligent Flashcards', desc: 'Spaced repetition with SM-2 algorithm for optimal retention' },
            { icon: MessageSquare, title: 'AI Tutor Chat', desc: 'Socratic teaching method for deeper understanding' },
            { icon: Smartphone, title: 'Image Recognition', desc: 'OCR for handwriting, equations, diagrams, and charts' },
            { icon: BarChart3, title: 'Learning Analytics', desc: 'Track progress, streaks, and performance insights' },
            { icon: Award, title: 'Gamification', desc: 'XP, levels, achievements, and leaderboards' },
            { icon: Users, title: 'Social Learning', desc: 'Compete with peers and share achievements' },
            { icon: Globe, title: 'Multi-Language', desc: 'Support for international learners' },
            { icon: Lock, title: 'Secure Auth', desc: 'Enterprise-grade authentication with Supabase' },
            { icon: TrendingUp, title: 'Goal Tracking', desc: 'Set and monitor learning objectives' },
            { icon: Rocket, title: 'PWA Ready', desc: 'Offline support and mobile installation' }
          ].map((feature, idx) => (
            <div key={idx} className="glass-card p-4 rounded-xl border border-border/30 hover:border-primary/50 transition-all">
              <feature.icon className="w-8 h-8 text-primary mb-3" />
              <h3 className="text-base font-bold text-foreground mb-1">{feature.title}</h3>
              <p className="text-xs text-muted-foreground">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Roadmap Section */}
      <div className="glass-card p-8 rounded-2xl border border-border/40 bg-gradient-to-br from-indigo-500/5 via-transparent to-purple-500/5">
        <h2 className="text-3xl font-bold text-foreground mb-6 flex items-center gap-3">
          <Rocket className="w-8 h-8 text-primary" />
          Product Roadmap & Growth Strategy
        </h2>

        <div className="space-y-6">
          <div className="border-l-4 border-green-500 pl-6 py-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <h3 className="text-xl font-bold text-foreground">Phase 1: Core Platform (Current)</h3>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>✓ AI-powered content generation (lessons, quizzes, flashcards)</li>
              <li>✓ Adaptive learning algorithms</li>
              <li>✓ Gamification and social features</li>
              <li>✓ Multi-modal input (PDF, PPTX, images, video)</li>
              <li>✓ Progress tracking and analytics</li>
            </ul>
          </div>

          <div className="border-l-4 border-blue-500 pl-6 py-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
              <h3 className="text-xl font-bold text-foreground">Phase 2: Enterprise & Monetization (Q1 2026)</h3>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>→ Institution dashboard with admin controls</li>
              <li>→ API access for third-party integrations</li>
              <li>→ Premium tier with advanced AI models</li>
              <li>→ White-label solutions for enterprises</li>
              <li>→ Team collaboration and shared workspaces</li>
              <li>→ Advanced analytics and reporting</li>
            </ul>
          </div>

          <div className="border-l-4 border-purple-500 pl-6 py-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
              <h3 className="text-xl font-bold text-foreground">Phase 3: AI Innovation (Q3 2026)</h3>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>→ Real-time video lecture transcription and summarization</li>
              <li>→ Voice-based learning assistant</li>
              <li>→ AR/VR integration for immersive learning</li>
              <li>→ Personalized learning paths with ML</li>
              <li>→ Live collaborative study sessions</li>
              <li>→ Mobile apps (iOS & Android)</li>
            </ul>
          </div>

          <div className="border-l-4 border-orange-500 pl-6 py-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
              <h3 className="text-xl font-bold text-foreground">Phase 4: Global Scale (2027)</h3>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>→ Content marketplace for educators</li>
              <li>→ AI tutors with subject specialization</li>
              <li>→ Certification and credential programs</li>
              <li>→ Partnership with educational institutions</li>
              <li>→ Multi-language content generation</li>
              <li>→ Blockchain-verified learning credentials</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Vision Section */}
      <div className="glass-card p-8 rounded-2xl border border-border/40 bg-gradient-to-br from-purple-500/10 via-indigo-500/5 to-transparent">
        <h2 className="text-3xl font-bold text-foreground mb-6 flex items-center gap-3">
          <Globe className="w-8 h-8 text-primary" />
          Our Revolutionary Vision
        </h2>

        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-bold text-foreground mb-3">Democratizing World-Class Education</h3>
            <p className="text-muted-foreground leading-relaxed">
              We envision a world where anyone, anywhere can access personalized, AI-powered education that adapts to their unique learning style, pace, and goals. SlideTutor AI breaks down barriers of cost, geography, and accessibility, making world-class learning available to billions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            <div className="text-center p-6 glass-card rounded-xl border border-border/30">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-purple-500/30">
                <Brain className="w-8 h-8 text-white" />
              </div>
              <h4 className="font-bold text-foreground mb-2">AI as Co-Teacher</h4>
              <p className="text-sm text-muted-foreground">
                Every learner gets a personal AI tutor that knows their strengths, weaknesses, and optimal learning patterns
              </p>
            </div>

            <div className="text-center p-6 glass-card rounded-xl border border-border/30">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-500/30">
                <Globe className="w-8 h-8 text-white" />
              </div>
              <h4 className="font-bold text-foreground mb-2">Borderless Learning</h4>
              <p className="text-sm text-muted-foreground">
                Language barriers, geographic limitations, and time zones become irrelevant in our AI-powered ecosystem
              </p>
            </div>

            <div className="text-center p-6 glass-card rounded-xl border border-border/30">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/30">
                <Rocket className="w-8 h-8 text-white" />
              </div>
              <h4 className="font-bold text-foreground mb-2">Lifelong Learning</h4>
              <p className="text-sm text-muted-foreground">
                From K-12 to professional upskilling, one platform that grows with learners throughout their entire journey
              </p>
            </div>
          </div>

          <div className="mt-8 p-6 bg-gradient-to-r from-purple-500/10 to-indigo-500/10 rounded-xl border border-primary/30">
            <p className="text-lg text-foreground font-semibold mb-2">
              "Education is the most powerful weapon which you can use to change the world." - Nelson Mandela
            </p>
            <p className="text-muted-foreground">
              We're building that weapon with AI, making it accessible to everyone, everywhere.
            </p>
          </div>
        </div>
      </div>

      {/* Contact Form Section */}
      <div className="glass-card p-8 rounded-2xl border border-border/40">
        <h2 className="text-3xl font-bold text-foreground mb-6 flex items-center gap-3">
          <Mail className="w-8 h-8 text-primary" />
          Let's Connect
        </h2>

        <form 
          name="investor-contact" 
          method="POST" 
          data-netlify="true"
          onSubmit={handleSubmit}
          className="space-y-6"
        >
          <input type="hidden" name="form-name" value="investor-contact" />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="name" className="block text-sm font-semibold text-foreground mb-2">
                Full Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 glass-card border border-border/40 rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                placeholder="John Doe"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-foreground mb-2">
                Email Address *
              </label>
              <input
                type="email"
                id="email"
                name="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-3 glass-card border border-border/40 rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                placeholder="john@example.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="organization" className="block text-sm font-semibold text-foreground mb-2">
                Organization
              </label>
              <input
                type="text"
                id="organization"
                name="organization"
                value={formData.organization}
                onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                className="w-full px-4 py-3 glass-card border border-border/40 rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                placeholder="Your Company or Fund"
              />
            </div>

            <div>
              <label htmlFor="investmentRange" className="block text-sm font-semibold text-foreground mb-2">
                Investment Interest
              </label>
              <select
                id="investmentRange"
                name="investmentRange"
                value={formData.investmentRange}
                onChange={(e) => setFormData({ ...formData, investmentRange: e.target.value })}
                className="w-full px-4 py-3 glass-card border border-border/40 rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              >
                <option value="">Select Range</option>
                <option value="seed">Seed ($50K - $500K)</option>
                <option value="series-a">Series A ($500K - $5M)</option>
                <option value="series-b">Series B ($5M+)</option>
                <option value="strategic">Strategic Partnership</option>
                <option value="other">Other / Just Exploring</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="message" className="block text-sm font-semibold text-foreground mb-2">
              Message *
            </label>
            <textarea
              id="message"
              name="message"
              required
              rows={5}
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              className="w-full px-4 py-3 glass-card border border-border/40 rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-none"
              placeholder="Tell us about your interest in SlideTutor AI..."
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full px-6 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl font-semibold text-lg transition-all shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
          >
            {isSubmitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Sending...
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                Send Message
              </>
            )}
          </button>

          <p className="text-xs text-muted-foreground text-center">
            By submitting this form, you agree to be contacted about investment opportunities in SlideTutor AI.
          </p>
        </form>
      </div>

      {/* Additional CTA Section */}
      <div className="glass-card p-8 rounded-2xl border border-border/40 bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-blue-500/10 text-center">
        <Rocket className="w-16 h-16 text-primary mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-foreground mb-3">
          Ready to Transform Education Together?
        </h2>
        <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
          Join us in building the future of learning. Whether you're interested in investment, partnership, or collaboration, we'd love to hear from you.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="mailto:investors@slidetutor.ai"
            className="px-6 py-3 bg-primary hover:bg-primary/80 text-white rounded-xl font-semibold transition-all inline-flex items-center justify-center gap-2"
          >
            <Mail className="w-5 h-5" />
            investors@slidetutor.ai
          </a>
        </div>
      </div>
    </div>
  );
}
