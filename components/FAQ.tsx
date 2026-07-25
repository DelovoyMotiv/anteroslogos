import { useState, forwardRef } from 'react';
import AnimatedSection from './AnimatedSection';
import SectionLabel from './SectionLabel';

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
            question: 'What kind of studio are you?',
            answer:
                'A small, senior team. We take on a limited number of engagements at a time so the people you meet are the people who do the work. We cover engineering, search, and marketing under one roof rather than handing pieces to separate vendors.',
        },
        {
            question: 'What does "high-load engineering" actually mean here?',
            answer:
                'Systems that have to stay fast and available when traffic is real: payment flows, real-time platforms, data-heavy products. We handle architecture, backend development, and the infrastructure and observability around it.',
        },
        {
            question: 'What is the difference between SEO and GEO?',
            answer:
                'SEO earns you a place in classic search results. GEO, generative engine optimization, is about being the source that ChatGPT, Perplexity, Gemini, and similar systems cite when they answer a question directly. They share foundations, so we run them together.',
        },
        {
            question: 'Do you only do one of these, or the whole thing?',
            answer:
                'Either. Some clients bring us in purely for engineering or purely for search and growth. The engagements we enjoy most are the ones where they overlap, a product that has to perform and be found at the same time.',
        },
        {
            question: 'How do you price and structure engagements?',
            answer:
                'Most work runs as a monthly retainer or a fixed-scope build, depending on what fits. We scope it together after an initial conversation and put the plan, the deliverables, and the success measures in writing before anything starts.',
        },
        {
            question: 'How soon will we see results?',
            answer:
                'Engineering ships in short cycles, so you see working software early. Search and growth compound: early signals in weeks, meaningful movement over a few months. We report against the numbers we agreed on, not vanity metrics.',
        },
        {
            question: 'How do we start?',
            answer:
                'Tell us about the project and the problem behind it. We reply with a short, direct read on whether we are the right team and what a first engagement could look like.',
        },
    ];

    const toggleFAQ = (index: number) => {
        setOpenIndex(openIndex === index ? null : index);
    };

    return (
        <section
            ref={ref}
            id="faq"
            aria-label="Frequently asked questions"
            className="relative py-28 md:py-40 px-6 sm:px-10 lg:px-16 border-t border-white/[0.06]"
        >
            <div className="relative z-10 max-w-7xl mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
                    <div className="lg:col-span-4">
                        <AnimatedSection>
                            <SectionLabel index="05">Questions</SectionLabel>
                            <h2 className="mt-8 font-display text-4xl sm:text-5xl font-bold tracking-[-0.035em] leading-[1.0] text-brand-text">
                                The things people ask first.
                            </h2>
                        </AnimatedSection>
                    </div>

                    <div className="lg:col-span-8">
                        <div className="border-t border-white/[0.06]">
                            {faqItems.map((item, index) => (
                                <AnimatedSection key={index} delay={index * 40}>
                                    <div className="border-b border-white/[0.06]">
                                        <button
                                            onClick={() => toggleFAQ(index)}
                                            className="w-full text-left py-6 flex justify-between items-start gap-6 group"
                                            aria-expanded={openIndex === index}
                                            aria-controls={`faq-answer-${index}`}
                                        >
                                            <h3 className="font-display text-lg md:text-xl font-medium text-brand-text group-hover:text-brand-accent transition-colors">
                                                {item.question}
                                            </h3>
                                            <span className={`flex-shrink-0 mt-1 text-brand-accent transition-transform duration-300 ${openIndex === index ? 'rotate-45' : ''}`}>
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                                                </svg>
                                            </span>
                                        </button>
                                        <div
                                            id={`faq-answer-${index}`}
                                            className={`overflow-hidden transition-all duration-300 ease-in-out ${
                                                openIndex === index ? 'max-h-96 opacity-100 pb-6' : 'max-h-0 opacity-0'
                                            }`}
                                        >
                                            <p className="text-brand-muted leading-relaxed max-w-2xl">
                                                {item.answer}
                                            </p>
                                        </div>
                                    </div>
                                </AnimatedSection>
                            ))}
                        </div>

                        <AnimatedSection delay={300}>
                            <div className="mt-12 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 rounded-2xl border border-white/[0.08] bg-brand-surface/40 p-8">
                                <div>
                                    <h3 className="font-display text-xl font-semibold text-brand-text mb-1">Still have a question?</h3>
                                    <p className="text-brand-muted text-sm">Send us the details and we&rsquo;ll give you a straight answer.</p>
                                </div>
                                <button
                                    onClick={onCTAClick}
                                    className="flex-shrink-0 bg-brand-text text-brand-bg font-semibold px-7 py-3.5 rounded-full transition-all duration-300 hover:bg-white hover:-translate-y-0.5 hover:shadow-[0_0_28px_-8px_rgba(57,216,230,0.6)]"
                                >
                                    Get in touch
                                </button>
                            </div>
                        </AnimatedSection>
                    </div>
                </div>
            </div>
        </section>
    );
});

FAQ.displayName = 'FAQ';

export default FAQ;
