import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Zap, Building, Rocket } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import DigitalBackground from '../components/DigitalBackground';
import AnimatedSection from '../components/AnimatedSection';

interface PricingTier {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  cta: string;
  highlighted?: boolean;
  icon: React.ReactNode;
  badge?: string;
}

const PricingPage: React.FC = () => {
  const navigate = useNavigate();

  const tiers: PricingTier[] = [
    {
      name: 'Free',
      price: '$0',
      period: '/month',
      description: 'Perfect for trying out GEO and understanding AI optimization.',
      features: [
        '1 GEO audit/month',
        'Basic verification',
        'Community support',
        'Public dashboard',
      ],
      cta: 'Get Started Free',
      icon: <Zap className="w-6 h-6" />,
    },
    {
      name: 'Starter',
      price: '$19',
      period: '/month',
      description: 'Perfect for individual professionals and small teams getting started with GEO.',
      features: [
        '10 GEO audits/month',
        'Full verification suite',
        'Email support',
        'Audit history (30 days)',
        'API access',
      ],
      cta: 'Start Free Trial',
      icon: <Rocket className="w-6 h-6" />,
    },
    {
      name: 'Pro',
      price: '$49',
      period: '/month',
      description: 'Advanced features and priority support for growing businesses.',
      features: [
        '100 GEO audits/month',
        'Priority verification',
        'Priority support',
        'Audit history (90 days)',
        'Advanced analytics',
        'Webhook notifications',
        'Custom integrations',
      ],
      cta: 'Get Started',
      highlighted: true,
      icon: <Building className="w-6 h-6" />,
      badge: 'Most Popular',
    },
    {
      name: 'Enterprise',
      price: '$499',
      period: '/month',
      description: 'Tailored solutions for large organizations with dedicated support.',
      features: [
        'Unlimited GEO audits',
        'Dedicated infrastructure',
        'White-label options',
        'SLA guarantee (99.9%)',
        'Dedicated support',
        'Custom contract terms',
        'Bulk API discounts',
        'Team management',
      ],
      cta: 'Contact Sales',
      icon: <Building className="w-6 h-6" />,
    },
  ];

  const handleCTAClick = (tierName: string) => {
    if (tierName === 'Enterprise') {
      navigate('/contact');
    } else {
      // For Free, Starter, and Pro plans - redirect to signup
      navigate('/auth/signup');
    }
  };

  return (
    <div className="bg-brand-bg text-brand-text font-sans antialiased min-h-screen">
      <DigitalBackground />
      <Header />
      
      <main className="relative z-10">
        {/* Hero Section */}
        <section className="pt-32 pb-16 px-4 sm:px-6">
          <div className="max-w-7xl mx-auto text-center">
            <AnimatedSection>
              <h1 className="font-display font-bold text-4xl sm:text-5xl md:text-6xl lg:text-7xl leading-tight mb-6">
                <span className="bg-gradient-to-r from-white via-brand-accent to-blue-400 bg-clip-text text-transparent">
                  Simple, Transparent Pricing
                </span>
              </h1>
              <p className="text-lg sm:text-xl text-white/70 max-w-3xl mx-auto leading-relaxed">
                Choose the plan that fits your needs. All plans include core GEO features with{' '}
                <span className="text-brand-accent font-semibold">no hidden fees</span>.
              </p>
            </AnimatedSection>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="pb-32 px-4 sm:px-6">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
              {tiers.map((tier, index) => (
                <AnimatedSection key={tier.name} delay={index * 100}>
                  <div
                    className={`relative rounded-2xl p-8 transition-all duration-300 ${
                      tier.highlighted
                        ? 'bg-gradient-to-b from-brand-accent/10 to-transparent border-2 border-brand-accent shadow-2xl shadow-brand-accent/20 md:-mt-4 md:scale-105'
                        : 'bg-white/5 border border-[#2A2A2A] hover:border-white/20'
                    }`}
                  >
                    {/* Badge */}
                    {tier.badge && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                        <span className="bg-brand-accent text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg">
                          {tier.badge}
                        </span>
                      </div>
                    )}

                    {/* Icon & Name */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`p-3 rounded-xl ${tier.highlighted ? 'bg-brand-accent/20' : 'bg-white/5'}`}>
                        <div className={tier.highlighted ? 'text-brand-accent' : 'text-white/70'}>
                          {tier.icon}
                        </div>
                      </div>
                      <h2 className="text-2xl font-bold text-white">{tier.name}</h2>
                    </div>

                    {/* Price */}
                    <div className="mb-6">
                      <div className="flex items-baseline gap-1">
                        <span className="text-5xl font-bold text-white">{tier.price}</span>
                        {tier.period && (
                          <span className="text-lg text-white/50">{tier.period}</span>
                        )}
                      </div>
                      <p className="mt-3 text-white/60 leading-relaxed">{tier.description}</p>
                    </div>

                    {/* CTA Button */}
                    <button
                      onClick={() => handleCTAClick(tier.name)}
                      className={`w-full py-4 px-6 rounded-xl font-semibold transition-all duration-300 mb-8 ${
                        tier.highlighted
                          ? 'bg-brand-accent hover:bg-blue-500 text-white shadow-lg shadow-brand-accent/30 hover:shadow-xl hover:-translate-y-0.5'
                          : 'bg-white/10 hover:bg-white/20 text-white border border-white/20 hover:border-white/40'
                      }`}
                    >
                      {tier.cta}
                    </button>

                    {/* Features */}
                    <div className="space-y-4">
                      <p className="text-xs text-white/40 uppercase tracking-wider font-semibold mb-4">
                        What's Included
                      </p>
                      {tier.features.map((feature) => (
                        <div key={feature} className="flex items-start gap-3">
                          <div className="flex-shrink-0 mt-0.5">
                            <Check className={`w-5 h-5 ${tier.highlighted ? 'text-brand-accent' : 'text-white/40'}`} />
                          </div>
                          <span className="text-white/80 text-sm leading-relaxed">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </AnimatedSection>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="pb-32 px-4 sm:px-6">
          <div className="max-w-4xl mx-auto">
            <AnimatedSection>
              <h2 className="text-3xl sm:text-4xl font-bold text-center mb-12 text-white">
                Frequently Asked Questions
              </h2>
              <div className="space-y-6">
                <div className="bg-white/5 border border-[#2A2A2A] rounded-xl p-6 hover:border-white/10 transition-colors">
                  <h3 className="text-xl font-semibold text-white mb-3">Can I change plans later?</h3>
                  <p className="text-white/70 leading-relaxed">
                    Yes, you can upgrade or downgrade your plan at any time. Changes take effect at the start
                    of your next billing period.
                  </p>
                </div>
                <div className="bg-white/5 border border-[#2A2A2A] rounded-xl p-6 hover:border-white/10 transition-colors">
                  <h3 className="text-xl font-semibold text-white mb-3">What payment methods do you accept?</h3>
                  <p className="text-white/70 leading-relaxed">
                    We accept USDC payments on Base L2 for transparent, low-fee transactions. You can pay
                    using any Web3 wallet (MetaMask, Coinbase Wallet, etc.). Enterprise customers can request
                    invoice billing.
                  </p>
                </div>
                <div className="bg-white/5 border border-[#2A2A2A] rounded-xl p-6 hover:border-white/10 transition-colors">
                  <h3 className="text-xl font-semibold text-white mb-3">Is there a free plan?</h3>
                  <p className="text-white/70 leading-relaxed">
                    Yes! Our Free plan includes 1 GEO audit per month with basic verification and community
                    support. Perfect for trying out the platform before upgrading.
                  </p>
                </div>
                <div className="bg-white/5 border border-[#2A2A2A] rounded-xl p-6 hover:border-white/10 transition-colors">
                  <h3 className="text-xl font-semibold text-white mb-3">What happens if I exceed my audit quota?</h3>
                  <p className="text-white/70 leading-relaxed">
                    If you reach your monthly audit limit, you can upgrade to a higher plan or wait until
                    your quota resets at the start of the next billing period. Enterprise plans include
                    unlimited audits.
                  </p>
                </div>
              </div>
            </AnimatedSection>
          </div>
        </section>
      </main>

      <Footer 
        onPhilosophyClick={() => navigate('/')}
        onMethodClick={() => navigate('/')}
        onClientsClick={() => navigate('/')}
        onFAQClick={() => navigate('/')}
        onContactClick={() => navigate('/contact')}
      />
    </div>
  );
};

export default PricingPage;
