import React from 'react';
import AnimatedSection from './AnimatedSection';
import SectionLabel from './SectionLabel';

/**
 * Positioning statement: the studio's point of view.
 */
const TheShift: React.FC = () => (
    <section
        id="studio"
        aria-label="Our positioning"
        className="relative py-28 md:py-40 px-6 sm:px-10 lg:px-16"
    >
        <div className="relative z-10 max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
                <div className="lg:col-span-4">
                    <AnimatedSection>
                        <SectionLabel index="01">The studio</SectionLabel>
                        <p className="mt-8 text-brand-muted leading-relaxed">
                            We keep the roster short on purpose. Fewer clients, senior
                            people on every engagement, and direct access to the people
                            doing the work.
                        </p>
                    </AnimatedSection>
                </div>

                <div className="lg:col-span-8">
                    <AnimatedSection delay={150}>
                        <h2 className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-[3.1rem] font-semibold leading-[1.16] tracking-[-0.025em] text-brand-text">
                            Search sends people to a list of links. AI answers the question
                            directly and names its sources.{' '}
                            <span className="text-brand-muted">
                                We build the products and the presence that put you on both
                                sides of that line:
                            </span>{' '}
                            fast systems people rely on, and content authoritative enough to
                            be quoted.
                        </h2>
                    </AnimatedSection>

                    <AnimatedSection delay={300}>
                        <div className="mt-14 grid grid-cols-1 sm:grid-cols-3 gap-8 border-t border-white/[0.06] pt-10">
                            {[
                                {
                                    k: 'Senior by default',
                                    v: 'No handoffs to junior teams after the pitch. The people you meet are the people who ship.',
                                },
                                {
                                    k: 'Engineering-led',
                                    v: 'Marketing that understands the stack, and a stack built to be found and cited.',
                                },
                                {
                                    k: 'Accountable to numbers',
                                    v: 'We tie the work to load, latency, pipeline, and revenue, not vanity metrics.',
                                },
                            ].map((item) => (
                                <div key={item.k}>
                                    <h3 className="font-display text-lg font-semibold text-brand-text mb-2">
                                        {item.k}
                                    </h3>
                                    <p className="text-sm text-brand-muted leading-relaxed">{item.v}</p>
                                </div>
                            ))}
                        </div>
                    </AnimatedSection>
                </div>
            </div>
        </div>
    </section>
);

export default TheShift;
