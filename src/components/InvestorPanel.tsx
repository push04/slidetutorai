import { useState } from 'react';
import { 
  IndianRupee,
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
  MessageSquare,
  Check,
  Star,
  TrendingUp,
  Target,
  Heart
} from 'lucide-react';
import toast from 'react-hot-toast';

export function InvestorPanel() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    investmentTier: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const investmentTiers = [
    {
      amount: 50,
      title: 'Early Supporter',
      icon: Heart,
      color: 'from-pink-500 to-rose-500',
      benefits: [
        'Your email listed on our Contributors page',
        'Early access to new features',
        'Monthly updates newsletter',
        'Community Discord access'
      ]
    },
    {
      amount: 100,
      title: 'Bronze Contributor',
      icon: Star,
      color: 'from-orange-500 to-amber-500',
      benefits: [
        'Your name prominently displayed on our site',
        'All Early Supporter benefits',
        'Priority customer support',
        'Beta tester for new AI features',
        'Quarterly video calls with founders'
      ]
    },
    {
      amount: 250,
      title: 'Silver Investor',
      icon: Award,
      color: 'from-cyan-500 to-blue-500',
      benefits: [
        'Featured profile with bio on our Investors page',
        'All Bronze Contributor benefits',
        'Lifetime Pro account access',
        'Input on product roadmap',
        'Annual exclusive investor meetup invitation',
        'Custom acknowledgment in app credits'
      ]
    },
    {
      amount: 500,
      title: 'Gold Partner',
      icon: Zap,
      color: 'from-purple-500 to-indigo-500',
      benefits: [
        'Premium featured profile with custom branding',
        'All Silver Investor benefits',
        'Unlimited Pro accounts for your team',
        'Direct line to founders for feedback',
        'Annual profit-sharing (if implemented)',
        'Recognition in all marketing materials',
        'Early access to enterprise features'
      ]
    }
  ];

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
        toast.success('Thank you for your interest! We\'ll contact you soon.');
        setFormData({ name: '', email: '', phone: '', investmentTier: '', message: '' });
      } else {
        throw new Error('Form submission failed');
      }
    } catch (error) {
      toast.error('Something went wrong. Please email us directly at invest@slidetutor.ai');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 pb-20">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl border border-border/40">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 via-indigo-500/10 to-blue-500/20 animate-pulse"></div>
        <div className="relative glass-card p-8 md:p-12">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-3xl mb-6 shadow-2xl shadow-purple-500/30">
              <Rocket className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-indigo-400 to-blue-400">
              Invest in the Future of Learning
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Join us in revolutionizing education with AI. Start with as little as ₹50 and be part of something extraordinary.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
              <div className="glass-card p-6 rounded-2xl border border-purple-500/30 bg-purple-500/5 transform hover:scale-105 transition-transform">
                <TrendingUp className="w-8 h-8 text-purple-500 mx-auto mb-3" />
                <h3 className="text-3xl font-bold text-foreground mb-2">₹2.5L Cr+</h3>
                <p className="text-sm text-muted-foreground">Global EdTech Market by 2030</p>
              </div>
              <div className="glass-card p-6 rounded-2xl border border-indigo-500/30 bg-indigo-500/5 transform hover:scale-105 transition-transform">
                <Users className="w-8 h-8 text-indigo-500 mx-auto mb-3" />
                <h3 className="text-3xl font-bold text-foreground mb-2">180 Cr+</h3>
                <p className="text-sm text-muted-foreground">Learners Worldwide</p>
              </div>
              <div className="glass-card p-6 rounded-2xl border border-blue-500/30 bg-blue-500/5 transform hover:scale-105 transition-transform">
                <Brain className="w-8 h-8 text-blue-500 mx-auto mb-3" />
                <h3 className="text-3xl font-bold text-foreground mb-2">AI-First</h3>
                <p className="text-sm text-muted-foreground">Next-Gen Platform</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Investment Tiers */}
      <div className="glass-card p-8 rounded-3xl border border-border/40">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 flex items-center justify-center gap-3">
            <IndianRupee className="w-8 h-8 text-primary" />
            Choose Your Investment Level
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Every contribution helps us build better AI-powered learning tools. Select the tier that works for you.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {investmentTiers.map((tier, idx) => {
            const Icon = tier.icon;
            return (
              <div
                key={idx}
                className="group relative glass-card p-6 rounded-2xl border-2 border-border/40 hover:border-primary/50 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl overflow-hidden"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${tier.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}></div>
                
                <div className="relative z-10">
                  <div className={`w-14 h-14 bg-gradient-to-br ${tier.color} rounded-2xl flex items-center justify-center mb-4 shadow-lg`}>
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-3xl font-bold text-foreground">₹{tier.amount}</span>
                  </div>
                  
                  <h3 className="text-xl font-bold text-foreground mb-4">{tier.title}</h3>
                  
                  <ul className="space-y-3">
                    {tier.benefits.map((benefit, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Current Features Section */}
      <div className="glass-card p-8 rounded-3xl border border-border/40">
        <h2 className="text-3xl font-bold text-foreground mb-6 flex items-center gap-3">
          <Sparkles className="w-8 h-8 text-primary" />
          Live Platform Features
        </h2>
        <p className="text-muted-foreground mb-8">
          These features are already built and working in production:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { icon: Brain, title: 'AI Lesson Generation', desc: 'Transform PDFs & PPTX into structured lessons' },
            { icon: BookOpen, title: 'Smart Quizzes', desc: 'Adaptive difficulty with instant feedback' },
            { icon: Zap, title: 'Intelligent Flashcards', desc: 'Spaced repetition (SM-2 algorithm)' },
            { icon: MessageSquare, title: 'AI Tutor Chat', desc: 'Socratic method for deep learning' },
            { icon: Smartphone, title: 'Image OCR', desc: 'Extract text from handwriting & diagrams' },
            { icon: BarChart3, title: 'Analytics Dashboard', desc: 'Track progress and performance' },
            { icon: Award, title: 'Gamification', desc: 'XP, levels, and achievements' },
            { icon: Users, title: 'Leaderboards', desc: 'Compete globally with peers' },
            { icon: Target, title: 'Goal Tracking', desc: 'Set and monitor objectives' },
            { icon: Lock, title: 'Secure Auth', desc: 'Enterprise-grade security' },
            { icon: Globe, title: 'YouTube Integration', desc: 'Generate lessons from videos' },
            { icon: Rocket, title: 'PWA Support', desc: 'Offline mode & mobile install' }
          ].map((feature, idx) => (
            <div key={idx} className="glass-card p-5 rounded-xl border border-border/30 hover:border-primary/50 transition-all group">
              <feature.icon className="w-8 h-8 text-primary mb-3 group-hover:scale-110 transition-transform" />
              <h3 className="text-base font-bold text-foreground mb-2">{feature.title}</h3>
              <p className="text-xs text-muted-foreground">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Investment Form */}
      <div className="glass-card p-8 rounded-3xl border border-border/40">
        <h2 className="text-3xl font-bold text-foreground mb-6 flex items-center gap-3">
          <Mail className="w-8 h-8 text-primary" />
          Get Started Today
        </h2>
        <p className="text-muted-foreground mb-8">
          Fill out the form below and we'll send you payment details and next steps within 24 hours.
        </p>

        <form 
          name="investor-contact" 
          method="POST" 
          data-netlify="true"
          onSubmit={handleSubmit}
          className="space-y-6 max-w-3xl"
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
                placeholder="Rahul Sharma"
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
                placeholder="rahul@example.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="phone" className="block text-sm font-semibold text-foreground mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-3 glass-card border border-border/40 rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                placeholder="+91 98765 43210"
              />
            </div>

            <div>
              <label htmlFor="investmentTier" className="block text-sm font-semibold text-foreground mb-2">
                Investment Tier *
              </label>
              <select
                id="investmentTier"
                name="investmentTier"
                required
                value={formData.investmentTier}
                onChange={(e) => setFormData({ ...formData, investmentTier: e.target.value })}
                className="w-full px-4 py-3 glass-card border border-border/40 rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              >
                <option value="">Select Investment Level</option>
                <option value="50">₹50 - Early Supporter</option>
                <option value="100">₹100 - Bronze Contributor</option>
                <option value="250">₹250 - Silver Investor</option>
                <option value="500">₹500 - Gold Partner</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="message" className="block text-sm font-semibold text-foreground mb-2">
              Message (Optional)
            </label>
            <textarea
              id="message"
              name="message"
              rows={5}
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              className="w-full px-4 py-3 glass-card border border-border/40 rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-none"
              placeholder="Tell us why you're excited about SlideTutor AI..."
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full px-8 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl font-semibold text-lg transition-all shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 group"
          >
            {isSubmitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Sending...
              </>
            ) : (
              <>
                <Send className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                Submit Investment Interest
              </>
            )}
          </button>

          <p className="text-xs text-muted-foreground text-center">
            By submitting, you agree to be contacted about investment opportunities. We respect your privacy.
          </p>
        </form>
      </div>

      {/* Why Invest CTA */}
      <div className="relative overflow-hidden rounded-3xl border border-border/40">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-blue-500/10"></div>
        <div className="relative glass-card p-12 text-center">
          <Globe className="w-16 h-16 text-primary mx-auto mb-6" />
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Why Invest in SlideTutor AI?
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-3xl mx-auto leading-relaxed">
            We're democratizing education globally with AI. The EdTech market is booming, and we're positioned at the forefront with cutting-edge AI technology, a working product, and real users. Your investment helps us scale faster and reach millions of learners worldwide.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="glass-card p-6 rounded-2xl border border-border/30">
              <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-green-500/30">
                <TrendingUp className="w-7 h-7 text-white" />
              </div>
              <h3 className="font-bold text-foreground mb-2">Growing Market</h3>
              <p className="text-sm text-muted-foreground">
                Multi-trillion rupee opportunity in global education technology
              </p>
            </div>
            <div className="glass-card p-6 rounded-2xl border border-border/30">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-purple-500/30">
                <Brain className="w-7 h-7 text-white" />
              </div>
              <h3 className="font-bold text-foreground mb-2">AI Innovation</h3>
              <p className="text-sm text-muted-foreground">
                Cutting-edge AI models powering personalized learning
              </p>
            </div>
            <div className="glass-card p-6 rounded-2xl border border-border/30">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/30">
                <Rocket className="w-7 h-7 text-white" />
              </div>
              <h3 className="font-bold text-foreground mb-2">Proven Product</h3>
              <p className="text-sm text-muted-foreground">
                Live platform with real features serving actual users today
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
