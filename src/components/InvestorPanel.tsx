import { useState, useEffect } from 'react';
import { 
  IndianRupee, Rocket, Users, Brain, Zap, Globe, Award, Send,
  Sparkles, BarChart3, Lock, Smartphone, BookOpen, MessageSquare,
  Check, Star, TrendingUp, Target, Heart, X, Download, ArrowRight
} from 'lucide-react';
import QRCodeLib from 'qrcode';
import toast from 'react-hot-toast';
import { Button } from './enhanced/Button';
import { Card, CardContent } from './enhanced/Card';

type InvestmentTier = {
  amount: number;
  title: string;
  icon: any;
  color: string;
  upiId: string;
  benefits: string[];
};

type ModalStep = 'qr' | 'form' | 'success';

export function InvestorPanel() {
  const [selectedTier, setSelectedTier] = useState<InvestmentTier | null>(null);
  const [modalStep, setModalStep] = useState<ModalStep>('qr');
  const [qrCode, setQrCode] = useState<string>('');
  const [paymentData, setPaymentData] = useState({
    bankName: '',
    transactionLast4: '',
    payerName: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const investmentTiers: InvestmentTier[] = [
    {
      amount: 50,
      title: 'Early Supporter',
      icon: Heart,
      color: 'from-pink-500 to-rose-500',
      upiId: 'pushpalsanyal9359@oksbi',
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
      upiId: 'pushpalsanyal9359@oksbi',
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
      upiId: 'pushpalsanyal9359@oksbi',
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
      upiId: 'pushpalsanyal9359@oksbi',
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

  // Generate QR code when tier is selected
  useEffect(() => {
    if (selectedTier) {
      const generateQR = async () => {
        const upiString = `upi://pay?pa=${selectedTier.upiId}&pn=SlideTutor AI&am=${selectedTier.amount}&cu=INR&tn=Investment - ${selectedTier.title}`;
        const qrDataUrl = await QRCodeLib.toDataURL(upiString, {
          width: 300,
          margin: 2,
          color: { dark: '#000000', light: '#FFFFFF' }
        });
        setQrCode(qrDataUrl);
      };
      generateQR();
    }
  }, [selectedTier]);

  const openModal = (tier: InvestmentTier) => {
    setSelectedTier(tier);
    setModalStep('qr');
  };

  const closeModal = () => {
    setSelectedTier(null);
    setQrCode('');
    setModalStep('qr');
    setPaymentData({ bankName: '', transactionLast4: '', payerName: '' });
  };

  const downloadQR = () => {
    if (!qrCode || !selectedTier) return;
    const link = document.createElement('a');
    link.download = `slidetutor-invest-${selectedTier.amount}.png`;
    link.href = qrCode;
    link.click();
    toast.success('QR code downloaded!');
  };

  const handlePaid = () => {
    setModalStep('form');
  };

  const encode = (data: Record<string, string>) => {
    return Object.keys(data)
      .map(key => encodeURIComponent(key) + '=' + encodeURIComponent(data[key]))
      .join('&');
  };

  const handlePaymentConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTier) return;

    setIsSubmitting(true);

    try {
      const response = await fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: encode({
          'form-name': 'investor-payment-confirmation',
          tier: `₹${selectedTier.amount} - ${selectedTier.title}`,
          bankName: paymentData.bankName,
          transactionLast4: paymentData.transactionLast4,
          payerName: paymentData.payerName
        })
      });

      if (response.ok || response.status === 200) {
        setModalStep('success');
      } else {
        throw new Error(`Server returned ${response.status}`);
      }
    } catch (error) {
      console.error('Payment confirmation error:', error);
      toast.error('Submission failed. Please email us at slidetutorai@gmail.com');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Hidden Netlify form - Netlify detects this at build time */}
      <form name="investor-payment-confirmation" data-netlify="true" data-netlify-honeypot="bot-field" hidden>
        <input type="text" name="tier" />
        <input type="text" name="bankName" />
        <input type="text" name="transactionLast4" />
        <input type="text" name="payerName" />
      </form>

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
              Every contribution helps us build better AI-powered learning tools. Click "Invest Now" to proceed with payment.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {investmentTiers.map((tier, idx) => {
              const Icon = tier.icon;
              return (
                <Card
                  key={idx}
                  className="group relative p-8 hover:shadow-2xl transition-all duration-300"
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${tier.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300 rounded-2xl`}></div>
                  
                  <CardContent className="relative z-10 p-0">
                    <div className={`w-16 h-16 bg-gradient-to-br ${tier.color} rounded-2xl flex items-center justify-center mb-4 shadow-lg`}>
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    
                    <div className="flex items-baseline gap-2 mb-2">
                      <span className="text-4xl font-bold text-foreground">₹{tier.amount}</span>
                    </div>
                    
                    <h3 className="text-2xl font-bold text-foreground mb-4">{tier.title}</h3>
                    
                    <ul className="space-y-3 mb-6">
                      {tier.benefits.map((benefit, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                          <span>{benefit}</span>
                        </li>
                      ))}
                    </ul>

                    <Button
                      onClick={() => openModal(tier)}
                      className={`w-full bg-gradient-to-r ${tier.color} hover:opacity-90 text-white shadow-lg`}
                    >
                      Invest Now <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Current Features */}
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

        {/* Why Invest CTA */}
        <div className="relative overflow-hidden rounded-3xl border border-border/40">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-blue-500/10"></div>
          <div className="relative glass-card p-12 text-center">
            <Globe className="w-16 h-16 text-primary mx-auto mb-6" />
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Why Invest in SlideTutor AI?
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-3xl mx-auto leading-relaxed">
              We're democratizing education globally with AI. The EdTech market is booming, and we're positioned at the forefront with cutting-edge AI technology, a working product, and real users.
            </p>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {selectedTier && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card max-w-2xl w-full rounded-3xl border border-border/40 max-h-[90vh] overflow-y-auto">
            <div className="p-8">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  {(() => {
                    const Icon = selectedTier.icon;
                    return (
                      <div className={`w-12 h-12 bg-gradient-to-br ${selectedTier.color} rounded-xl flex items-center justify-center`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                    );
                  })()}
                  <div>
                    <h3 className="text-2xl font-bold text-foreground">{selectedTier.title}</h3>
                    <p className="text-3xl font-bold text-primary">₹{selectedTier.amount}</p>
                  </div>
                </div>
                <button
                  onClick={closeModal}
                  className="w-10 h-10 rounded-full hover:bg-muted flex items-center justify-center transition-colors"
                >
                  <X className="w-5 h-5 text-foreground" />
                </button>
              </div>

              {/* QR Code Step */}
              {modalStep === 'qr' && (
                <div className="space-y-6">
                  <div className="text-center">
                    <h4 className="text-xl font-semibold text-foreground mb-2">Scan QR Code to Pay</h4>
                    <p className="text-muted-foreground">Use any UPI app to scan and complete payment</p>
                  </div>

                  {qrCode && (
                    <div className="flex flex-col items-center gap-4">
                      <div className="p-4 bg-white rounded-2xl shadow-xl">
                        <img src={qrCode} alt="Payment QR Code" className="w-64 h-64" />
                      </div>
                      <Button variant="outline" onClick={downloadQR} className="flex items-center gap-2">
                        <Download className="w-4 h-4" />
                        Download QR Code
                      </Button>
                    </div>
                  )}

                  <div className="bg-primary/10 border border-primary/20 rounded-xl p-4">
                    <p className="text-sm text-foreground">
                      <strong>Payment Details:</strong><br />
                      UPI ID: pushpalsanyal9359@oksbi<br />
                      Name: Pushpal Sanyal<br />
                      Amount: ₹{selectedTier.amount}<br />
                      Description: Investment - {selectedTier.title}
                    </p>
                  </div>

                  <Button onClick={handlePaid} className="w-full">
                    I've Completed the Payment <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              )}

              {/* Form Step */}
              {modalStep === 'form' && (
                <form onSubmit={handlePaymentConfirm} className="space-y-6">
                  <div className="text-center mb-6">
                    <h4 className="text-xl font-semibold text-foreground mb-2">Confirm Your Payment</h4>
                    <p className="text-muted-foreground">Help us verify your transaction</p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">
                      Bank Name Used for Payment *
                    </label>
                    <input
                      type="text"
                      required
                      value={paymentData.bankName}
                      onChange={(e) => setPaymentData({...paymentData, bankName: e.target.value})}
                      className="w-full px-4 py-3 glass-card border border-border/40 rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="e.g., HDFC Bank, SBI, ICICI Bank"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">
                      Last 4 Digits of Transaction ID *
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={4}
                      value={paymentData.transactionLast4}
                      onChange={(e) => setPaymentData({...paymentData, transactionLast4: e.target.value.replace(/\D/g, '')})}
                      className="w-full px-4 py-3 glass-card border border-border/40 rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="1234"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">
                      Name as Per Bank Account *
                    </label>
                    <input
                      type="text"
                      required
                      value={paymentData.payerName}
                      onChange={(e) => setPaymentData({...paymentData, payerName: e.target.value})}
                      className="w-full px-4 py-3 glass-card border border-border/40 rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="Rahul Kumar Sharma"
                    />
                  </div>

                  <Button type="submit" disabled={isSubmitting} className="w-full">
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Submit Payment Details
                      </>
                    )}
                  </Button>
                </form>
              )}

              {/* Success Step */}
              {modalStep === 'success' && (
                <div className="text-center space-y-6 py-8">
                  <div className="w-20 h-20 mx-auto bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center">
                    <Check className="w-10 h-10 text-white" />
                  </div>
                  <h4 className="text-2xl font-bold text-foreground">Thank You for Your Investment!</h4>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    We've received your payment details. Our team will verify the transaction and contact you within 24 hours to confirm your {selectedTier.title} benefits.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    A confirmation email will be sent to you shortly.
                  </p>
                  <Button onClick={closeModal} className="mt-4">
                    Close
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default InvestorPanel;
