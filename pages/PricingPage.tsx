import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Modal from '../components/Modal';
import Grain from '../components/Grain';
import AnimatedSection from '../components/AnimatedSection';
import SectionLabel from '../components/SectionLabel';

type Currency = 'GBP' | 'EUR' | 'USD';

const CURRENCIES: Currency[] = ['GBP', 'EUR', 'USD'];

interface Engagement {
    name: string;
    tag: string;
    from: Record<Currency, string>;
    unit: string;
    description: string;
    includes: string[];
    cta: string;
    featured?: boolean;
}

const PricingPage: React.FC = () => {
    const navigate = useNavigate();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currency, setCurrency] = useState<Currency>('GBP');

    useEffect(() => {
        document.body.style.overflow = isModalOpen ? 'hidden' : 'unset';
        return () => { document.body.style.overflow = 'unset'; };
    }, [isModalOpen]);

    const openModal = () => setIsModalOpen(true);

    const engagements: Engagement[] = [
        {
            name: 'Project build',
            tag: 'Fixed scope',
            from: { GBP: '£20,000', EUR: '€23,000', USD: '$25,000' },
            unit: 'per project',
            description:
                'Fixed-scope delivery of a platform or defined system, priced once we have scoped the work together.',
            includes: ['Architecture & build', 'Design & interface', 'Launch & handover'],
            cta: 'Scope a build',
        },
        {
            name: 'Monthly retainer',
            tag: 'Ongoing',
            from: { GBP: '£6,000', EUR: '€7,000', USD: '$7,500' },
            unit: 'per month',
            description:
                'A dedicated senior team on call for engineering, SEO/GEO, and growth, running as one plan.',
            includes: ['Ongoing engineering', 'Search & GEO', 'Reporting against revenue'],
            cta: 'Start a retainer',
            featured: true,
        },
        {
            name: 'Advisory & sprints',
            tag: 'Focused',
            from: { GBP: '£3,500', EUR: '€4,000', USD: '$4,500' },
            unit: 'per engagement',
            description:
                'A focused audit, an architecture review, or a short sprint to unblock a problem and set direction.',
            includes: ['Technical or GEO audit', 'Architecture review', 'A clear, written plan'],
            cta: 'Book a session',
        },
    ];

    const priceFactors = [
        {
            k: 'Scope & complexity',
            v: 'How much has to be built, and how hard the constraints are: load, latency, compliance, integrations.',
        },
        {
            k: 'Team & duration',
            v: 'How many senior people the work needs, and for how long. Short and focused costs less than sustained.',
        },
        {
            k: 'Ambition',
            v: 'Keeping the lights on differs from owning a category. We price to the outcome you actually want.',
        },
    ];

    return (
        <div className="relative bg-brand-bg text-brand-text font-sans antialiased min-h-screen overflow-x-hidden">
            <Grain />
            <Header onMethodClick={() => navigate('/')} onContactClick={openModal} />

            <main className="relative z-[2]">
                {/* Hero */}
                <section className="relative pt-32 pb-10 px-6 sm:px-10 lg:px-16 overflow-hidden">
                    <div className="absolute inset-0 z-0" aria-hidden="true">
                        <div className="absolute inset-0 tech-grid [mask-image:radial-gradient(ellipse_80%_70%_at_25%_20%,black,transparent_75%)] opacity-60"></div>
                        <div className="absolute -top-40 left-0 w-[45rem] h-[45rem] bg-[radial-gradient(circle,rgba(57,216,230,0.08),transparent_60%)] blur-2xl"></div>
                    </div>
                    <div className="relative z-10 max-w-7xl mx-auto">
                        <AnimatedSection>
                            <SectionLabel>Pricing</SectionLabel>
                            <h1 className="mt-6 font-display font-bold text-4xl sm:text-5xl md:text-6xl tracking-[-0.04em] leading-[0.98] max-w-3xl">
                                Engagements, not subscriptions.
                            </h1>
                            <p className="mt-5 text-base sm:text-lg text-brand-text/60 max-w-2xl leading-relaxed font-light">
                                We scope every engagement to the problem in front of us. The
                                figures below are indicative starting points; a precise quote
                                follows a short conversation.
                            </p>
                        </AnimatedSection>
                    </div>
                </section>

                {/* Engagement formats */}
                <section className="px-6 sm:px-10 lg:px-16 pb-8">
                    <div className="max-w-7xl mx-auto">
                        {/* Toggle row: indicative note + currency switch */}
                        <AnimatedSection>
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                                <p className="font-mono text-[0.7rem] tracking-[0.24em] uppercase text-brand-muted/60">
                                    Indicative &middot; from figures
                                </p>
                                <div
                                    role="group"
                                    aria-label="Display currency"
                                    className="inline-flex items-center self-start rounded-full border border-white/10 bg-brand-surface/40 p-1 font-mono text-[0.7rem] tracking-[0.2em] uppercase"
                                >
                                    {CURRENCIES.map((c) => (
                                        <button
                                            key={c}
                                            type="button"
                                            aria-pressed={currency === c}
                                            onClick={() => setCurrency(c)}
                                            className={`px-4 py-2 rounded-full transition-colors duration-300 ${
                                                currency === c
                                                    ? 'bg-brand-text text-brand-bg'
                                                    : 'text-brand-muted hover:text-brand-text'
                                            }`}
                                        >
                                            {c}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </AnimatedSection>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
                            {engagements.map((eng, index) => (
                                <AnimatedSection key={eng.name} delay={index * 100} className="h-full">
                                    <article
                                        className={`group relative flex flex-col h-full rounded-2xl border p-7 md:p-8 transition-all duration-500 hover:-translate-y-1 ${
                                            eng.featured
                                                ? 'border-brand-accent/30 bg-brand-surface/60 ring-1 ring-brand-accent/15'
                                                : 'border-white/[0.08] bg-brand-surface/30 hover:border-white/20 hover:bg-brand-surface/50'
                                        }`}
                                    >
                                        {/* top row: tag + featured badge */}
                                        <div className="flex items-center justify-between">
                                            <span className="font-mono text-[0.65rem] tracking-[0.22em] uppercase text-brand-muted/70">
                                                {eng.tag}
                                            </span>
                                            {eng.featured && (
                                                <span className="font-mono text-[0.6rem] tracking-[0.2em] uppercase text-brand-accent/90 border border-brand-accent/30 rounded-full px-2.5 py-1">
                                                    Most common
                                                </span>
                                            )}
                                        </div>

                                        {/* Name */}
                                        <h2 className="mt-5 font-display text-xl font-semibold text-brand-text group-hover:text-white transition-colors duration-300">
                                            {eng.name}
                                        </h2>

                                        {/* Description */}
                                        <p className="mt-3 text-sm text-brand-text/55 leading-relaxed">
                                            {eng.description}
                                        </p>

                                        {/* Price */}
                                        <div className="mt-6">
                                            <div className="font-mono text-[0.65rem] tracking-[0.24em] uppercase text-brand-muted mb-2">
                                                From
                                            </div>
                                            <div className="flex items-baseline gap-2">
                                                <span className="font-display text-4xl font-bold tracking-tight text-white leading-none">
                                                    {eng.from[currency]}
                                                </span>
                                            </div>
                                            <div className="font-mono text-xs text-brand-muted mt-2">{eng.unit}</div>
                                        </div>

                                        {/* Includes */}
                                        <ul className="mt-6 space-y-2.5 border-t border-white/[0.06] pt-6">
                                            {eng.includes.map((item) => (
                                                <li key={item} className="flex items-start gap-3 text-sm text-brand-text/75">
                                                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-accent/80" strokeWidth={2} />
                                                    <span>{item}</span>
                                                </li>
                                            ))}
                                        </ul>

                                        {/* CTA pinned to the foot so buttons align across cards */}
                                        <div className="mt-auto pt-8">
                                            <button
                                                onClick={openModal}
                                                className={`inline-flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-medium transition-all duration-300 ${
                                                    eng.featured
                                                        ? 'bg-brand-text text-brand-bg hover:bg-white hover:shadow-[0_0_40px_-8px_rgba(57,216,230,0.5)]'
                                                        : 'border border-white/15 text-brand-text hover:border-brand-accent/40 hover:bg-white/[0.03]'
                                                }`}
                                            >
                                                {eng.cta}
                                                <svg className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                                </svg>
                                            </button>
                                        </div>
                                    </article>
                                </AnimatedSection>
                            ))}
                        </div>
                    </div>
                </section>

                {/* What shapes the price */}
                <section className="px-6 sm:px-10 lg:px-16 py-24">
                    <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
                        <div className="lg:col-span-4">
                            <AnimatedSection>
                                <SectionLabel>How we quote</SectionLabel>
                                <h2 className="mt-8 font-display text-3xl sm:text-4xl font-bold tracking-[-0.03em] leading-[1.05] text-brand-text">
                                    What shapes a number.
                                </h2>
                            </AnimatedSection>
                        </div>
                        <div className="lg:col-span-8">
                            <div className="divide-y divide-white/[0.06] border-t border-white/[0.06]">
                                {priceFactors.map((row, i) => (
                                    <AnimatedSection key={row.k} delay={i * 80}>
                                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-8 py-8">
                                            <h3 className="sm:col-span-4 font-display text-lg font-semibold text-brand-text">{row.k}</h3>
                                            <p className="sm:col-span-8 text-brand-muted leading-relaxed">{row.v}</p>
                                        </div>
                                    </AnimatedSection>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* CTA band */}
                <section className="px-6 sm:px-10 lg:px-16 pb-32">
                    <AnimatedSection>
                        <div className="relative max-w-7xl mx-auto rounded-2xl border border-white/[0.08] bg-brand-surface/50 p-8 sm:p-12 md:p-16 overflow-hidden">
                            <div className="absolute -top-24 right-0 w-[30rem] h-[30rem] bg-[radial-gradient(circle,rgba(57,216,230,0.07),transparent_65%)] blur-2xl" aria-hidden="true"></div>
                            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
                                <div className="max-w-xl">
                                    <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold tracking-[-0.03em] leading-[1.02] text-brand-text">
                                        Tell us what you&rsquo;re building.
                                    </h2>
                                    <p className="mt-4 text-brand-muted leading-relaxed">
                                        A short call and a written scope. No sales pipeline, no obligation.
                                    </p>
                                </div>
                                <button
                                    onClick={openModal}
                                    className="group flex-shrink-0 inline-flex items-center gap-3 bg-brand-text text-brand-bg font-semibold px-8 py-4 rounded-full transition-all duration-300 hover:bg-white hover:-translate-y-0.5 hover:shadow-[0_0_40px_-8px_rgba(57,216,230,0.5)]"
                                >
                                    Start a project
                                    <svg className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </AnimatedSection>
                </section>
            </main>

            <Footer
                onPhilosophyClick={() => navigate('/')}
                onMethodClick={() => navigate('/')}
                onClientsClick={() => navigate('/')}
                onFAQClick={() => navigate('/')}
                onContactClick={openModal}
            />
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
        </div>
    );
};

export default PricingPage;
