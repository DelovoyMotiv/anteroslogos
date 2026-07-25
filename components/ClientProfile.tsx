import React, { forwardRef } from 'react';
import AnimatedSection from './AnimatedSection';
import SectionLabel from './SectionLabel';
import { Building2, Rocket, Globe } from 'lucide-react';

interface Profile {
    icon: React.ElementType;
    title: string;
    description: string;
    /** Short mono focus tags rendered as a spec row at the card foot. */
    focus: string[];
}

const ClientProfile = forwardRef<HTMLElement>((_props, ref) => {
    const profiles: Profile[] = [
        {
            icon: Building2,
            title: 'Fintech & high-load platforms',
            description:
                'Companies where downtime and latency carry a direct cost. We design the architecture and own the components that have to hold under load.',
            focus: ['Reliability', 'Latency', 'Scale'],
        },
        {
            icon: Rocket,
            title: 'Product & SaaS companies',
            description:
                'Teams scaling a product and the demand for it, where engineering, search, and growth run on a single plan.',
            focus: ['Engineering', 'Search', 'Growth'],
        },
        {
            icon: Globe,
            title: 'Brands competing in search & AI',
            description:
                'Established names that intend to be the answer in their category, in search results and in what generative engines cite.',
            focus: ['SEO', 'GEO', 'Authority'],
        },
    ];

    return (
        <section
            ref={ref}
            id="industries"
            aria-label="Who we work with"
            className="relative py-28 md:py-40 px-6 sm:px-10 lg:px-16 border-t border-white/[0.06]"
        >
            <div className="relative z-10 max-w-7xl mx-auto">
                <AnimatedSection>
                    <div className="max-w-3xl">
                        <SectionLabel index="04">Who we work with</SectionLabel>
                        <h2 className="mt-8 font-display text-4xl sm:text-5xl md:text-6xl font-bold tracking-[-0.035em] leading-[0.98] text-brand-text">
                            A few clients, chosen carefully.
                        </h2>
                        <p className="mt-6 text-lg text-brand-muted leading-relaxed">
                            We do our best work with teams that hold real expertise and intend
                            to lead their category, not chase quick wins.
                        </p>
                    </div>
                </AnimatedSection>

                <div className="mt-16 md:mt-20 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
                    {profiles.map((profile, index) => {
                        const number = String(index + 1).padStart(2, '0');
                        return (
                            <AnimatedSection key={profile.title} delay={index * 120} className="h-full">
                                <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-brand-surface/40 p-8 md:p-10 transition-all duration-500 hover:border-white/20 hover:bg-brand-surface hover:-translate-y-1">
                                    {/* hover top hairline */}
                                    <span
                                        aria-hidden="true"
                                        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-accent/70 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                                    ></span>

                                    {/* top row: icon + index */}
                                    <div className="mb-8 flex items-start justify-between">
                                        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 text-brand-text transition-all duration-300 group-hover:border-white/40 group-hover:bg-white/[0.03]">
                                            <profile.icon className="h-5 w-5" strokeWidth={1.5} />
                                        </div>
                                        <span className="font-mono text-sm text-brand-muted/40 transition-colors duration-500 group-hover:text-brand-accent/70">/ {number}</span>
                                    </div>

                                    <h3 className="mb-4 font-display text-xl md:text-2xl font-semibold leading-tight text-brand-text transition-colors duration-300 group-hover:text-white md:min-h-[4rem]">
                                        {profile.title}
                                    </h3>

                                    <p className="text-brand-muted leading-relaxed">
                                        {profile.description}
                                    </p>

                                    {/* focus spec row, pinned to the foot so all cards align */}
                                    <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-white/[0.06] pt-6">
                                        {profile.focus.map((tag, i) => (
                                            <React.Fragment key={tag}>
                                                {i > 0 && <span className="text-brand-muted/25" aria-hidden="true">/</span>}
                                                <span className="font-mono text-[0.65rem] tracking-[0.18em] uppercase text-brand-muted/70">
                                                    {tag}
                                                </span>
                                            </React.Fragment>
                                        ))}
                                    </div>
                                </article>
                            </AnimatedSection>
                        );
                    })}
                </div>
            </div>
        </section>
    );
});

ClientProfile.displayName = 'ClientProfile';

export default ClientProfile;
