import React from 'react';
import AnimatedSection from './AnimatedSection';
import { disciplinesByPhase, LIFECYCLE_ORDER } from '../data/services';

interface HeroProps {
    onScrollClick: () => void;
    onContactClick?: () => void;
}

const Hero: React.FC<HeroProps> = ({ onScrollClick, onContactClick }) => {
    return (
    <section
        id="hero"
        aria-label="Don't rank. Become the source."
        className="relative min-h-screen flex items-center overflow-hidden px-6 sm:px-10 lg:px-16 pt-32 pb-24"
    >
        {/* Cool ambient depth + technical grid */}
        <div className="absolute inset-0 z-0" aria-hidden="true">
            <div className="absolute inset-0 tech-grid [mask-image:radial-gradient(ellipse_85%_75%_at_20%_35%,black,transparent_75%)] opacity-70"></div>
            <div className="absolute -top-1/3 left-0 w-[55rem] h-[55rem] bg-[radial-gradient(circle,rgba(57,216,230,0.10),transparent_60%)] blur-2xl"></div>
            <div className="absolute bottom-0 right-0 w-[40rem] h-[40rem] bg-[radial-gradient(circle,rgba(57,216,230,0.06),transparent_65%)] blur-2xl"></div>
        </div>

        <div className="relative z-10 w-full max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center lg:items-stretch">
                {/* Left: statement */}
                <div className="lg:col-span-7">
                    <AnimatedSection>
                        <h1
                            className="font-display font-bold text-6xl sm:text-7xl md:text-8xl lg:text-[6.5rem] xl:text-[7.5rem] leading-[0.92] tracking-[-0.045em]"
                            itemProp="headline"
                        >
                            <span className="block text-brand-text">Don&rsquo;t rank.</span>
                            <span className="block bg-gradient-to-r from-white via-brand-text to-brand-accent/80 bg-clip-text text-transparent">
                                Become the source.
                            </span>
                        </h1>
                    </AnimatedSection>

                    <AnimatedSection delay={150}>
                        <p
                            className="mt-10 text-lg sm:text-xl text-brand-text/60 max-w-xl leading-relaxed font-light"
                            itemProp="description"
                        >
                            A small senior team building high-load platforms and running
                            search, generative-engine, and growth work for companies that
                            intend to lead their category.
                        </p>
                    </AnimatedSection>

                    <AnimatedSection delay={300}>
                        <div className="mt-12 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                            <button
                                onClick={onContactClick}
                                className="group inline-flex items-center gap-3 bg-brand-text text-brand-bg font-semibold px-8 py-4 rounded-full transition-all duration-300 hover:bg-white hover:-translate-y-0.5 hover:shadow-[0_0_40px_-8px_rgba(57,216,230,0.5)]"
                            >
                                Start a project
                                <svg className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                </svg>
                            </button>
                            <button
                                onClick={onScrollClick}
                                className="inline-flex items-center gap-3 text-brand-text/80 hover:text-brand-text font-medium px-6 py-4 rounded-full border border-white/10 hover:border-brand-accent/40 transition-all duration-300"
                            >
                                View our services
                            </button>
                        </div>
                    </AnimatedSection>
                </div>

                {/* Right: technical readout module */}
                <div className="lg:col-span-5 lg:flex">
                    <AnimatedSection delay={200} className="w-full">
                        <div className="relative flex h-full flex-col">
                            <div className="flex flex-1 flex-col">
                                {/* header */}
                                <div className="flex items-baseline">
                                    <span className="font-mono text-[0.7rem] tracking-[0.24em] uppercase text-brand-muted">What we do</span>
                                </div>

                                {/* Lifecycle groups: phase label sits as an editorial side note,
                                    disciplines are listed cleanly with a restrained hover accent.
                                    The list centers within the panel so its height harmonizes
                                    with the left column. */}
                                <div className="mt-10 flex flex-1 flex-col justify-center divide-y divide-white/[0.06]">
                                    {LIFECYCLE_ORDER.map((phase) => (
                                        <div key={phase} className="grid grid-cols-[3.25rem_1fr] gap-x-6 py-5 first:pt-0 last:pb-0">
                                            <span className="pt-[0.35rem] font-mono text-[0.65rem] leading-none tracking-[0.2em] uppercase text-brand-muted/45 whitespace-nowrap">
                                                {phase}
                                            </span>
                                            <div className="-my-1.5">
                                                {disciplinesByPhase(phase).map((discipline) => (
                                                    <div key={discipline.id} className="group flex items-center gap-4 py-1.5">
                                                        <span className="text-[0.95rem] text-brand-text/80 transition-colors duration-300 group-hover:text-white">
                                                            {discipline.title}
                                                        </span>
                                                        <span aria-hidden="true" className="h-px w-0 bg-brand-accent/60 transition-all duration-300 ease-out group-hover:w-6"></span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </AnimatedSection>
                </div>
            </div>
        </div>

        {/* Scroll cue */}
        <button
            onClick={onScrollClick}
            aria-label="Scroll to services"
            className="absolute bottom-8 right-8 sm:right-16 hidden sm:flex items-center gap-3 text-brand-muted hover:text-brand-text transition-colors duration-300"
        >
            <span className="font-mono text-xs tracking-[0.25em] uppercase">Scroll</span>
            <span className="h-px w-10 bg-current"></span>
        </button>
    </section>
    );
};

export default Hero;
