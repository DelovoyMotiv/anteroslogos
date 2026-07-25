import React, { forwardRef } from 'react';
import AnimatedSection from './AnimatedSection';
import SectionLabel from './SectionLabel';

interface Step {
    number: string;
    title: string;
    description: string;
}

const Process = forwardRef<HTMLElement>((_props, ref) => {
    const steps: Step[] = [
        {
            number: '01',
            title: 'Understand',
            description:
                'We start with the business, not the brief. Constraints, the current stack, the numbers you are judged on, and where the real bottleneck sits.',
        },
        {
            number: '02',
            title: 'Design the plan',
            description:
                'One document that everyone signs off on: the architecture, the scope, the sequence, and what success looks like in measurable terms.',
        },
        {
            number: '03',
            title: 'Build in short cycles',
            description:
                'A small senior team ships in tight iterations. You see working software and live campaigns early, and steer as it takes shape.',
        },
        {
            number: '04',
            title: 'Measure and scale',
            description:
                'We instrument everything, tune against real load and real demand, and keep going while the results compound.',
        },
    ];

    return (
        <section
            ref={ref}
            id="approach"
            aria-label="How we work"
            className="relative py-28 md:py-40 px-6 sm:px-10 lg:px-16 border-t border-white/[0.06]"
        >
            <div className="relative z-10 max-w-7xl mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
                    <div className="lg:col-span-4">
                        <AnimatedSection>
                            <SectionLabel index="03">How we work</SectionLabel>
                            <h2 className="mt-8 font-display text-4xl sm:text-5xl font-bold tracking-[-0.035em] leading-[1.0] text-brand-text">
                                A short path from problem to shipped.
                            </h2>
                            <p className="mt-6 text-brand-muted leading-relaxed">
                                No layers of account management. The same people run discovery,
                                make the decisions, and do the work.
                            </p>
                        </AnimatedSection>
                    </div>

                    <div className="lg:col-span-8">
                        <div className="divide-y divide-white/[0.06] border-t border-white/[0.06]">
                            {steps.map((step, index) => (
                                <AnimatedSection key={step.number} delay={index * 100}>
                                    <div className="group grid grid-cols-1 sm:grid-cols-12 gap-4 sm:gap-8 py-8 md:py-10 transition-colors duration-300">
                                        <div className="sm:col-span-2 font-mono text-sm text-brand-accent/70 group-hover:text-brand-accent transition-colors duration-300">
                                            [ {step.number} ]
                                        </div>
                                        <h3 className="sm:col-span-3 font-display text-xl md:text-2xl font-semibold text-brand-text">
                                            {step.title}
                                        </h3>
                                        <p className="sm:col-span-7 text-brand-muted leading-relaxed group-hover:text-brand-text/80 transition-colors duration-300">
                                            {step.description}
                                        </p>
                                    </div>
                                </AnimatedSection>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
});

Process.displayName = 'Process';

export default Process;
