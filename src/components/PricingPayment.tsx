import React, { useState, useEffect } from 'react';
import { Check, Zap, Crown, Rocket, Star } from 'lucide-react';
import QRCode from 'qrcode';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './enhanced/Card';
import { Button } from './enhanced/Button';

interface PricingTier {
  id: string;
  name: string;
  price: number;
  icon: React.ElementType;
  features: string[];
  color: string;
  popular?: boolean;
}

const PRICING_TIERS: PricingTier[] = [
  {
    id: 'basic',
    name: 'Basic',
    price: 50,
    icon: Zap,
    color: 'from-blue-500 to-cyan-500',
    features: [
      'AI-Powered Lesson Generation',
      'Up to 10 Quizzes per month',
      '50 Flashcards',
      'Basic Analytics',
      'Email Support',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 100,
    icon: Crown,
    color: 'from-purple-500 to-pink-500',
    popular: true,
    features: [
      'Everything in Basic',
      'Unlimited Quizzes',
      '200 Flashcards',
      'Advanced AI Tutor with Voice',
      'Priority Support',
      'Advanced Analytics',
    ],
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 250,
    icon: Rocket,
    color: 'from-orange-500 to-red-500',
    features: [
      'Everything in Pro',
      'Unlimited Everything',
      '1000+ Flashcards',
      'Custom AI Models',
      'White-label Option',
      'Dedicated Support',
      'API Access',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 500,
    icon: Star,
    color: 'from-yellow-500 to-amber-500',
    features: [
      'Everything in Premium',
      'Multi-user Teams',
      'Custom Integrations',
      'On-premise Deployment',
      'SLA Guarantee',
      '24/7 Phone Support',
      'Training Sessions',
    ],
  },
];

const UPI_ID = 'pushpalsanyal9359@oksbi';
const UPI_NAME = 'Pushpal Sanyal';

export function PricingPayment() {
  const [selectedTier, setSelectedTier] = useState<PricingTier | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [paymentName, setPaymentName] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (selectedTier) {
      generateQRCode(selectedTier.price);
    }
  }, [selectedTier]);

  const generateQRCode = async (amount: number) => {
    try {
      const upiUrl = `upi://pay?pa=${UPI_ID}&pn=${encodeURIComponent(UPI_NAME)}&am=${amount}&cu=INR`;
      const qrDataUrl = await QRCode.toDataURL(upiUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: '#ffffff',
          light: '#0a0a0a',
        },
      });
      setQrCodeUrl(qrDataUrl);
    } catch (error) {
      console.error('Error generating QR code:', error);
    }
  };

  const handleSubmitPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (paymentName.trim()) {
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setSelectedTier(null);
        setPaymentName('');
      }, 5000);
    }
  };

  if (showSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card variant="gradient" className="max-w-md w-full">
          <CardContent className="p-12 text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
              <Check className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-foreground mb-4">Payment Details Received!</h2>
            <p className="text-muted-foreground mb-2">
              Thank you, <span className="font-semibold text-foreground">{paymentName}</span>!
            </p>
            <p className="text-muted-foreground">
              We have received your payment information. Our team will verify the payment and contact you shortly to activate your subscription.
            </p>
            <div className="mt-8 p-4 bg-muted/30 rounded-xl border border-border/50">
              <p className="text-sm text-muted-foreground">
                You will receive a confirmation email within 24 hours. For immediate assistance, contact us at support@slidetutor.ai
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (selectedTier) {
    return (
      <div className="min-h-screen p-6 animate-fade-in-up">
        <div className="max-w-4xl mx-auto">
          <Button
            variant="outline"
            onClick={() => setSelectedTier(null)}
            className="mb-6"
          >
            ← Back to Plans
          </Button>

          <Card variant="gradient" className="overflow-hidden">
            <CardHeader className={`bg-gradient-to-r ${selectedTier.color} p-8`}>
              <div className="flex items-center gap-4">
                <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm">
                  <selectedTier.icon className="w-8 h-8 text-white" />
                </div>
                <div>
                  <CardTitle className="text-3xl font-bold text-white">
                    {selectedTier.name} Plan
                  </CardTitle>
                  <CardDescription className="text-white/90 text-xl mt-2">
                    ₹{selectedTier.price} / month
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-8">
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-semibold text-foreground mb-4">Plan Features</h3>
                    <ul className="space-y-3">
                      {selectedTier.features.map((feature, index) => (
                        <li key={index} className="flex items-start gap-3">
                          <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                          <span className="text-muted-foreground">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-4 bg-muted/30 rounded-xl border border-border/50">
                    <h4 className="font-semibold text-foreground mb-2">Payment Instructions</h4>
                    <ol className="text-sm text-muted-foreground space-y-2">
                      <li>1. Open your UPI app (Google Pay, PhonePe, Paytm, etc.)</li>
                      <li>2. Scan the QR code or use UPI ID: <span className="font-mono text-foreground">{UPI_ID}</span></li>
                      <li>3. Enter the exact amount: ₹{selectedTier.price}</li>
                      <li>4. Complete the payment</li>
                      <li>5. Enter your name below and submit</li>
                    </ol>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-semibold text-foreground mb-4 text-center">
                      Scan to Pay
                    </h3>
                    <div className="flex justify-center mb-4">
                      {qrCodeUrl ? (
                        <div className="p-6 bg-white rounded-2xl shadow-2xl">
                          <img
                            src={qrCodeUrl}
                            alt="UPI QR Code"
                            className="w-64 h-64"
                          />
                        </div>
                      ) : (
                        <div className="w-64 h-64 bg-muted animate-pulse rounded-2xl" />
                      )}
                    </div>
                    <p className="text-center text-sm text-muted-foreground">
                      Amount: <span className="font-bold text-foreground text-xl">₹{selectedTier.price}</span>
                    </p>
                  </div>

                  <form onSubmit={handleSubmitPayment} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Payment Confirmation
                      </label>
                      <input
                        type="text"
                        value={paymentName}
                        onChange={(e) => setPaymentName(e.target.value)}
                        placeholder="Enter your full name (as shown in UPI)"
                        className="w-full px-4 py-3 bg-muted/50 border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                        required
                      />
                      <p className="mt-2 text-xs text-muted-foreground">
                        This helps us verify your payment. Make sure it matches your UPI payment name.
                      </p>
                    </div>

                    <Button
                      type="submit"
                      variant="primary"
                      className="w-full py-6 text-lg font-semibold"
                      disabled={!paymentName.trim()}
                    >
                      I've Completed the Payment
                    </Button>
                  </form>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 animate-fade-in-up">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-foreground mb-4">
            Choose Your <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Learning Plan</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Unlock the full potential of AI-powered learning. Select a plan that fits your needs.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {PRICING_TIERS.map((tier) => (
            <Card
              key={tier.id}
              variant={tier.popular ? 'gradient' : 'default'}
              className={`relative overflow-hidden transition-all duration-300 hover:scale-105 cursor-pointer ${
                tier.popular ? 'ring-2 ring-primary shadow-2xl' : ''
              }`}
              onClick={() => setSelectedTier(tier)}
            >
              {tier.popular && (
                <div className="absolute top-0 right-0 bg-gradient-to-r from-primary to-secondary text-white px-4 py-1 text-xs font-bold rounded-bl-xl">
                  POPULAR
                </div>
              )}
              
              <CardHeader className="pb-4">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${tier.color} flex items-center justify-center mb-4 shadow-lg`}>
                  <tier.icon className="w-7 h-7 text-white" />
                </div>
                <CardTitle className="text-2xl font-bold">{tier.name}</CardTitle>
                <CardDescription className="text-3xl font-bold text-foreground mt-2">
                  ₹{tier.price}
                  <span className="text-base font-normal text-muted-foreground">/month</span>
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <ul className="space-y-3">
                  {tier.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  variant={tier.popular ? 'primary' : 'outline'}
                  className="w-full mt-6"
                  onClick={() => setSelectedTier(tier)}
                >
                  Get Started
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Card variant="gradient" className="max-w-3xl mx-auto">
            <CardContent className="p-8">
              <h3 className="text-2xl font-bold text-foreground mb-4">
                All Plans Include
              </h3>
              <div className="grid md:grid-cols-3 gap-4 text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-primary" />
                  <span>No Hidden Fees</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-primary" />
                  <span>Cancel Anytime</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-primary" />
                  <span>Secure Payments</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default PricingPayment;
