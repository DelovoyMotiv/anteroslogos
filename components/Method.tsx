import React, { forwardRef } from 'react';
import AnimatedSection from './AnimatedSection';
import SectionLabel from './SectionLabel';
import { disciplinesInLifecycleOrder } from '../data/services';

const Method = forwardRef<HTMLElement>((_props, ref) => {
    const disciplines = disciplinesInLifecycleOrder();

    return (
        <section
            ref={ref}
            id="services"
            aria-label="Services"
            className="relative py-28 md:py-40 px-6 sm:px-10 lg:px-16 border-t border-white/[0.06]"
        >
            <div className="relative z-10 max-w-7xl mx-auto">
                <AnimatedSection>
                    <div className="max-w-3xl">
                        <SectionLabel index="02">What we do</SectionLabel>
                        <h2 className="mt-8 font-display text-4xl sm:text-5xl md:text-6xl font-bold tracking-[-0.035em] leading-[0.98] text-brand-text">
                            Six disciplines,<br className="hidden sm:block" /> one team.
                        </h2>
                        <p className="mt-6 text-lg text-brand-muted leading-relaxed">
                            We take engagements across the full delivery lifecycle: build, run, grow, and
                            shape. Each discipline is led by people who have shipped it before.
                        </p>
                    </div>
                </AnimatedSection>

                <div className="mt-16 md:mt-20 grid grid-cols-1 md:grid-cols-2 gap-px bg-white/[0.06] border border-white/[0.06] rounded-2xl overflow-hidden">
                    {disciplines.map((discipline, index) => {
                        const Icon = discipline.icon;
                        const number = String(index + 1).padStart(2, '0');
                        return (
                            <AnimatedSection key={discipline.id} delay={index * 100}>
                                <article className="group relative h-full bg-brand-bg hover:bg-brand-surface transition-colors duration-500 p-8 md:p-12">
                                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-accent/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                                    <div className="flex items-start justify-between mb-8">
                                        <div className="w-12 h-12 rounded-xl border border-white/10 flex items-center justify-center text-brand-text group-hover:border-white/40 group-hover:bg-white/[0.03] transition-all duration-300">
                                            <Icon className="w-5 h-5" strokeWidth={1.5} />
                                        </div>
                                        <span className="font-mono text-sm text-brand-muted/40 group-hover:text-brand-accent/70 transition-colors duration-500">/ {number}</span>
                                    </div>

                                    <h3 className="font-display text-2xl md:text-3xl font-semibold text-brand-text mb-4 group-hover:text-white transition-colors duration-300">
                                        {discipline.title}
                                    </h3>
                                    <p className="text-brand-muted leading-relaxed mb-8 max-w-md">
                                        {discipline.summary}
                                    </p>

                                    <ul className="space-y-2.5 border-t border-white/[0.06] pt-6">
                                        {discipline.points.map((point) => (
                                            <li key={point} className="flex items-center gap-3 text-sm text-brand-text/75">
                                                <span className="h-1 w-1 rounded-full bg-brand-accent flex-shrink-0"></span>
                                                {point}
                                            </li>
                                        ))}
                                    </ul>
                                </article>
                            </AnimatedSection>
                        );
                    })}
                </div>
            </div>
        </section>
    );
});

Method.displayName = 'Method';

export default Method;
