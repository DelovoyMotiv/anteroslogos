import React from 'react';
import AnimatedSection from './AnimatedSection';

interface FinalCTAProps {
    onCTAClick: () => void;
}

const FinalCTA: React.FC<FinalCTAProps> = ({ onCTAClick }) => (
    <section className="relative py-28 md:py-44 px-6 sm:px-10 lg:px-16 border-t border-white/[0.06] overflow-hidden">
        <div className="absolute inset-0 z-0" aria-hidden="true">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[50rem] h-[50rem] bg-brand-accent/[0.05] rounded-full blur-[160px]"></div>
        </div>

        <AnimatedSection className="relative z-10">
            <div className="max-w-4xl">
                <span className="h-px w-12 bg-brand-accent/60 block mb-8"></span>
                <h2 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-[-0.04em] leading-[0.98] text-brand-text">
                    Let&rsquo;s build something worth being the source of.
                </h2>
                <p className="mt-8 text-lg md:text-xl text-brand-muted leading-relaxed max-w-2xl">
                    We take on a handful of engagements at a time. If you have a hard problem
                    and the ambition to lead your category, tell us about it.
                </p>
                <div className="mt-12 flex flex-col sm:flex-row items-start gap-4">
                    <button
                        onClick={onCTAClick}
                        className="group inline-flex items-center gap-3 bg-brand-text text-brand-bg font-semibold px-8 py-4 rounded-full transition-all duration-300 hover:bg-white hover:-translate-y-0.5 hover:shadow-[0_0_40px_-8px_rgba(57,216,230,0.5)]"
                    >
                        Start a project
                        <svg className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                    </button>
                    <a
                        href="mailto:Peitho@anoteroslogos.com"
                        className="inline-flex items-center gap-3 text-brand-text/80 hover:text-brand-text font-medium px-6 py-4 rounded-full border border-white/10 hover:border-white/25 transition-all duration-300"
                    >
                        Peitho@anoteroslogos.com
                    </a>
                </div>
            </div>
        </AnimatedSection>
    </section>
);

export default FinalCTA;
