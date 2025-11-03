import { useState, forwardRef } from 'react';
import AnimatedSection from './AnimatedSection';

interface FAQItem {
    question: string;
    answer: string;
}

interface FAQProps {
    onCTAClick?: () => void;
}

const FAQ = forwardRef<HTMLElement, FAQProps>(({ onCTAClick }, ref) => {
    const [openIndex, setOpenIndex] = useState<number | null>(0);

    const faqItems: FAQItem[] = [
        {
            question: "What is Generative Engine Optimization (GEO)?",
            answer: "Think of it this way: SEO got you ranked on Google. GEO gets you cited by AI. When someone asks ChatGPT, Claude, or Perplexity a question in your domain, GEO ensures your brand is the source the AI quotes. It's about becoming the answer, not competing for clicks."
        },
        {
            question: "How does The Nicosia Method™ differ from traditional SEO?",
            answer: "SEO optimizes for search engines and ranking positions. The Nicosia Method™ optimizes for AI systems and being cited as a source. We're not trying to get you to #1 on Google - we're embedding your expertise so deeply into AI knowledge bases that you become the default answer when anyone asks about your industry."
        },
        {
            question: "Who is the ideal partner for Anóteros Lógos?",
            answer: "Companies and leaders who are already authorities in their space but invisible to AI. Tech companies building the future, experts with deep knowledge, and enterprise brands ready to own their category in the AI era. If you have real expertise worth citing, we'll make sure AI systems know it."
        },
        {
            question: "How long does it take to see results from GEO?",
            answer: "We start seeing early signals in 4-8 weeks - your content begins appearing in AI responses. Full authority positioning typically takes 3-6 months as models re-train and your citations compound. Think of it like SEO in the early 2000s - early movers get massive advantages that last for years."
        },
        {
            question: "What makes content AI-ready?",
            answer: "Clear, factual, and structured. AI systems love content that answers questions directly, cites credible sources, and uses proper semantic formatting. We transform your expertise from marketing fluff into authoritative knowledge that AI systems recognize, trust, and cite."
        },
        {
            question: "What is included in The Nicosia Method™?",
            answer: "Three phases: Extract (we map your unique knowledge), Structure (we format it for AI systems), and Deploy (we embed it across ChatGPT, Claude, Perplexity, and other AI platforms). The result? When people ask AI about your space, you're the source they cite."
        },
        {
            question: "How do you measure GEO success?",
            answer: "Simple: we track how often AI systems cite you, in how many contexts, and whether you're the primary or secondary source. We also monitor business impact - qualified leads, brand searches, and authority perception. If AI isn't quoting you more each month, we're not doing our job."
        },
        {
            question: "Do you work with startups or only established companies?",
            answer: "Both - but we're picky. Startups need real, defensible expertise, not just hype. Established companies need to be ready to invest in long-term authority, not quick wins. If you have knowledge worth owning and the commitment to dominate your space in AI, we'll talk."
        },
        {
            question: "What's the investment range for your services?",
            answer: "Starting at $15K/month for foundational work. Comprehensive programs run $25K-$75K/month depending on scope and ambition. We work with a limited number of clients because this isn't scalable agency work - it's strategic authority architecture. You're investing in owning your category in the AI era."
        },
        {
            question: "Can GEO work alongside traditional SEO?",
            answer: "Yes, and they reinforce each other. SEO gets you ranked for human searches. GEO gets you cited by AI. The interesting part? Good GEO often improves your SEO too, because structured, authoritative content works for both humans and machines. It's not either/or - it's both."
        },
        {
            question: "What industries do you specialize in?",
            answer: "Complex, knowledge-intensive spaces where expertise matters: B2B SaaS, enterprise tech, professional services, healthcare innovation, fintech, AI/ML, emerging tech. If your industry requires deep knowledge to understand, and you have that knowledge, we can make AI systems recognize your authority."
        },
        {
            question: "How is this different from content marketing?",
            answer: "Content marketing creates blog posts and whitepapers for humans. GEO structures knowledge for AI systems. We're not writing articles hoping people read them - we're encoding your expertise so AI cites it millions of times. Different audience, different format, exponentially bigger reach."
        }
    ];

    const toggleFAQ = (index: number) => {
        setOpenIndex(openIndex === index ? null : index);
    };

    return (
        <section 
            ref={ref}
            id="faq"
            aria-label="Frequently Asked Questions"
            className="relative py-24 md:py-40 lg:py-48 overflow-hidden"
        >
            {/* Background effects */}
            <div className="absolute inset-0 z-0" aria-hidden="true">
                <div className="absolute top-1/3 right-0 w-[500px] h-[500px] bg-brand-accent/5 rounded-full blur-3xl"></div>
                <div className="absolute bottom-1/3 left-0 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-3xl"></div>
            </div>

            <div className="relative z-10 max-w-4xl mx-auto px-6">
                <AnimatedSection>
                    <div className="text-center mb-16">
                        <div className="inline-flex items-center gap-2 px-4 py-2 mb-6 bg-brand-accent/10 border border-brand-accent/20 rounded-full backdrop-blur-sm">
                            <svg className="w-4 h-4 text-brand-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="font-mono text-xs tracking-[0.15em] uppercase text-brand-accent/90 font-medium">
                                FAQ
                            </span>
                        </div>
                        
                        <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
                            <span className="bg-gradient-to-r from-white via-white to-brand-accent bg-clip-text text-transparent">
                                Common Questions
                            </span>
                        </h2>
                        
                        <p className="text-lg md:text-xl text-white/70 max-w-2xl mx-auto">
                            Everything you need to know about GEO and The Nicosia Method™
                        </p>
                    </div>
                </AnimatedSection>

                <div className="space-y-4">
                    {faqItems.map((item, index) => (
                        <AnimatedSection key={index} delay={index * 50}>
                            <div className="border border-white/10 rounded-xl overflow-hidden backdrop-blur-sm bg-white/[0.02] hover:border-brand-accent/30 transition-all duration-300">
                                <button
                                    onClick={() => toggleFAQ(index)}
                                    className="w-full text-left p-6 flex justify-between items-center gap-4 group"
                                    aria-expanded={openIndex === index}
                                    aria-controls={`faq-answer-${index}`}
                                >
                                    <h3 className="font-display text-lg md:text-xl font-semibold text-white/90 group-hover:text-brand-accent transition-colors pr-4">
                                        {item.question}
                                    </h3>
                                    <div className={`flex-shrink-0 w-8 h-8 rounded-full bg-brand-accent/10 border border-brand-accent/30 flex items-center justify-center transition-all duration-300 ${openIndex === index ? 'rotate-180 bg-brand-accent/20' : ''}`}>
                                        <svg 
                                            className="w-5 h-5 text-brand-accent" 
                                            fill="none" 
                                            stroke="currentColor" 
                                            viewBox="0 0 24 24"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </div>
                                </button>
                                
                                <div 
                                    id={`faq-answer-${index}`}
                                    className={`overflow-hidden transition-all duration-300 ease-in-out ${
                                        openIndex === index ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                                    }`}
                                >
                                    <div className="px-6 pb-6 text-white/70 leading-relaxed">
                                        {item.answer}
                                    </div>
                                </div>
                            </div>
                        </AnimatedSection>
                    ))}
                </div>

                {/* CTA after FAQ */}
                <AnimatedSection delay={600}>
                    <div className="mt-16 text-center p-8 rounded-2xl border border-brand-accent/20 bg-gradient-to-br from-brand-accent/5 to-transparent">
                        <h3 className="font-display text-2xl font-semibold mb-3">Still have questions?</h3>
                        <p className="text-white/70 mb-6">We're here to help you understand how GEO can transform your brand's authority.</p>
                        <button 
                            onClick={onCTAClick}
                            className="bg-brand-accent hover:bg-blue-500 text-white px-8 py-3 rounded-full font-semibold transition-all duration-300 hover:shadow-lg hover:shadow-brand-accent/30 hover:-translate-y-0.5"
                        >
                            Schedule a Consultation
                        </button>
                    </div>
                </AnimatedSection>
            </div>
        </section>
    );
});

FAQ.displayName = 'FAQ';

export default FAQ;
