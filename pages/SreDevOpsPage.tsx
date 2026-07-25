import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Activity,
    Workflow,
    Cloud,
    Archive,
    ShieldCheck,
    TrendingDown,
    type LucideIcon,
} from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Modal from '../components/Modal';
import Grain from '../components/Grain';
import AnimatedSection from '../components/AnimatedSection';
import SectionLabel from '../components/SectionLabel';
import SEOHead from '../components/SEOHead';
import { TRUST_STRIP_CONFIG, type TrustStat } from '../data/trustStrip';

interface Offering {
    title: string;
    summary: string;
    points: string[];
    icon: LucideIcon;
}

/**
 * The six SRE & DevOps offering areas. Copy is concrete and active-voice,
 * with no em dashes and no AI-buzzword vocabulary.
 */
const OFFERINGS: Offering[] = [
    {
        title: '24/7 monitoring and incident response',
        summary:
            'We watch production around the clock and act the moment something drifts, so small faults never become outages.',
        points: [
            'Metrics, logs, and traces in one view',
            'Actionable alerts routed to on-call',
            'Postmortems that close the loop',
        ],
        icon: Activity,
    },
    {
        title: 'CI/CD and Infrastructure-as-Code',
        summary:
            'We make every release repeatable and every environment reproducible, so shipping stops being a risk.',
        points: [
            'Automated build, test, and deploy pipelines',
            'Terraform and declarative infrastructure',
            'Safe rollbacks and progressive delivery',
        ],
        icon: Workflow,
    },
    {
        title: 'Cloud and server administration',
        summary:
            'We run the platform under your product: patched, tuned, and sized to the load it actually carries.',
        points: [
            'AWS, GCP, and Azure operations',
            'Container and orchestration management',
            'Capacity planning and tuning',
        ],
        icon: Cloud,
    },
    {
        title: 'Backups and disaster recovery',
        summary:
            'We protect your data and prove you can restore it, so a bad day stays a bad hour.',
        points: [
            'Automated, versioned backups',
            'Tested restore runbooks',
            'Recovery targets you can measure',
        ],
        icon: Archive,
    },
    {
        title: 'Network security and compliance',
        summary:
            'We lock down the perimeter and the paths through it, and keep the evidence auditors ask for.',
        points: [
            'Access control and secrets management',
            'Hardening and vulnerability response',
            'Audit trails for SOC 2 and ISO work',
        ],
        icon: ShieldCheck,
    },
    {
        title: 'Migration and cost optimization',
        summary:
            'We move workloads without downtime and trim the bill, so you pay for what you use.',
        points: [
            'Zero-downtime platform migrations',
            'Right-sizing and spend analysis',
            'Reserved and spot capacity strategy',
        ],
        icon: TrendingDown,
    },
];

/**
 * Trust_Strip. Renders one stat element per config entry using its label and
 * value. When the config array is empty, the strip renders nothing at all.
 */
const TrustStrip: React.FC<{ stats: TrustStat[] }> = ({ stats }) => {
    if (stats.length === 0) {
        return null;
    }

    return (
        <section className="px-6 sm:px-10 lg:px-16 pb-8" aria-label="Operational targets">
            <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-px bg-white/[0.06] border border-white/[0.06] rounded-2xl overflow-hidden">
                {stats.map((stat, index) => (
                    <AnimatedSection key={stat.label} delay={index * 80} className="h-full">
                        <div className="flex flex-col h-full bg-brand-bg p-8 md:p-10">
                            <div className="font-display text-3xl md:text-4xl font-bold tracking-tight text-white leading-none">
                                {stat.value}
                            </div>
                            <div className="mt-4 font-mono text-[0.7rem] tracking-[0.24em] uppercase text-brand-muted">
                                {stat.label}
                            </div>
                        </div>
                    </AnimatedSection>
                ))}
            </div>
        </section>
    );
};

const SreDevOpsPage: React.FC = () => {
    const navigate = useNavigate();
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        document.body.style.overflow = isModalOpen ? 'hidden' : 'unset';
        return () => { document.body.style.overflow = 'unset'; };
    }, [isModalOpen]);

    const openModal = () => setIsModalOpen(true);

    return (
        <div className="relative bg-brand-bg text-brand-text font-sans antialiased min-h-screen overflow-x-hidden">
            <SEOHead
                title="SRE & DevOps | Monitoring, CI/CD, and Cloud Operations | Anóteros Lógos"
                description="We keep production running: 24/7 monitoring and incident response, CI/CD and Infrastructure-as-Code, cloud and server administration, backups and disaster recovery, network security and compliance, and migration and cost optimization."
                url="https://anoteroslogos.com/services/sre-devops"
                type="website"
                keywords="SRE, DevOps, site reliability engineering, incident response, CI/CD, Infrastructure-as-Code, cloud administration, disaster recovery, network security, cost optimization"
                author="Anóteros Lógos"
            />
            <Grain />
            <Header onMethodClick={() => navigate('/')} onContactClick={openModal} />

            <main className="relative z-[2]">
                {/* Hero */}
                <section className="relative pt-40 pb-20 px-6 sm:px-10 lg:px-16 overflow-hidden">
                    <div className="absolute inset-0 z-0" aria-hidden="true">
                        <div className="absolute inset-0 tech-grid [mask-image:radial-gradient(ellipse_80%_70%_at_25%_20%,black,transparent_75%)] opacity-60"></div>
                        <div className="absolute -top-40 left-0 w-[45rem] h-[45rem] bg-[radial-gradient(circle,rgba(57,216,230,0.08),transparent_60%)] blur-2xl"></div>
                    </div>
                    <div className="relative z-10 max-w-7xl mx-auto">
                        <AnimatedSection>
                            <SectionLabel>SRE &amp; DevOps</SectionLabel>
                            <h1 className="mt-8 font-display font-bold text-5xl sm:text-6xl md:text-7xl tracking-[-0.04em] leading-[0.95] max-w-4xl">
                                We keep production running.
                            </h1>
                            <p className="mt-8 text-lg sm:text-xl text-brand-text/60 max-w-2xl leading-relaxed font-light">
                                Reliability is a practice, not a promise. We monitor your
                                systems, automate the way you ship, and harden the platform
                                underneath, so your team can build instead of firefight.
                            </p>
                            <div className="mt-10">
                                <button
                                    onClick={openModal}
                                    className="group inline-flex items-center gap-3 bg-brand-text text-brand-bg font-semibold px-8 py-4 rounded-full transition-all duration-300 hover:bg-white hover:-translate-y-0.5 hover:shadow-[0_0_40px_-8px_rgba(57,216,230,0.5)]"
                                >
                                    Talk to us
                                    <svg className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                    </svg>
                                </button>
                            </div>
                        </AnimatedSection>
                    </div>
                </section>

                {/* Trust strip: driven entirely by config, omitted when empty */}
                <TrustStrip stats={TRUST_STRIP_CONFIG} />

                {/* Offering areas */}
                <section className="px-6 sm:px-10 lg:px-16 py-16">
                    <div className="max-w-7xl mx-auto">
                        <AnimatedSection>
                            <SectionLabel>What we run</SectionLabel>
                            <h2 className="mt-8 font-display text-3xl sm:text-4xl font-bold tracking-[-0.03em] leading-[1.05] text-brand-text max-w-3xl">
                                Six areas that keep your platform steady.
                            </h2>
                        </AnimatedSection>

                        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-px bg-white/[0.06] border border-white/[0.06] rounded-2xl overflow-hidden">
                            {OFFERINGS.map((offering, index) => {
                                const Icon = offering.icon;
                                return (
                                    <AnimatedSection key={offering.title} delay={(index % 2) * 100} className="h-full">
                                        <article className="group relative flex flex-col h-full bg-brand-bg hover:bg-brand-surface transition-colors duration-500 p-8 md:p-10">
                                            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-accent/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                                            <div className="flex items-start gap-5">
                                                <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-brand-accent group-hover:border-brand-accent/40 transition-colors duration-500">
                                                    <Icon className="w-5 h-5" aria-hidden="true" />
                                                </div>
                                                <div className="min-w-0">
                                                    <h3 className="font-display text-lg font-semibold text-brand-text leading-snug">
                                                        {offering.title}
                                                    </h3>
                                                </div>
                                            </div>

                                            <p className="mt-6 text-sm text-brand-text/60 leading-relaxed">
                                                {offering.summary}
                                            </p>

                                            <div className="mt-auto pt-8">
                                                <ul className="space-y-3">
                                                    {offering.points.map((point) => (
                                                        <li key={point} className="flex items-center gap-3 text-sm text-brand-text/75">
                                                            <span className="h-1 w-1 rounded-full bg-brand-accent flex-shrink-0"></span>
                                                            {point}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </article>
                                    </AnimatedSection>
                                );
                            })}
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
                                        Let&rsquo;s make production boring.
                                    </h2>
                                    <p className="mt-4 text-brand-muted leading-relaxed">
                                        A short call and a written plan for the reliability work you need. No sales pipeline, no obligation.
                                    </p>
                                </div>
                                <button
                                    onClick={openModal}
                                    className="group flex-shrink-0 inline-flex items-center gap-3 bg-brand-text text-brand-bg font-semibold px-8 py-4 rounded-full transition-all duration-300 hover:bg-white hover:-translate-y-0.5 hover:shadow-[0_0_40px_-8px_rgba(57,216,230,0.5)]"
                                >
                                    Start a conversation
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

export default SreDevOpsPage;
