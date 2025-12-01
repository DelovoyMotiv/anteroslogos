import React, { forwardRef } from 'react';
import AnimatedSection from './AnimatedSection';
import { Search, Zap, Network, TrendingUp } from 'lucide-react';

interface ProcessStep {
    icon: React.ElementType;
    number: string;
    title: string;
    subtitle: string;
    description: string;
    systems: string[];
    outcome: string;
}

const Process = forwardRef<HTMLElement>((_props, ref) => {
    const steps: ProcessStep[] = [
        {
            icon: Search,
            number: '01',
            title: 'Discovery & Analysis',
            subtitle: 'Understanding Your Knowledge',
            description: 'We audit your digital presence across all AI platforms, mapping how Perplexity, ChatGPT, Claude, and Gemini currently perceive your brand. Our system identifies gaps where your expertise should appear but does not.',
            systems: [
                'GEO Audit Engine',
                'Knowledge Graph Extraction',
                'Citation Intelligence'
            ],
            outcome: 'Complete visibility map showing where you rank today and where you should be tomorrow'
        },
        {
            icon: Zap,
            number: '02',
            title: 'Knowledge Structuring',
            subtitle: 'Making You Machine-Readable',
            description: 'We transform your website content into structured knowledge that AI systems trust. This means proper semantic markup, verified entity relationships, and cryptographically signed provenance tokens that prove authenticity.',
            systems: [
                'Schema.org Implementation',
                'UCPT Provenance Tokens',
                'RDF Graph Architecture'
            ],
            outcome: 'Your expertise becomes verifiable, citable, and prioritized by AI retrieval systems'
        },
        {
            icon: Network,
            number: '03',
            title: 'Network Distribution',
            subtitle: 'Autonomous Agent Deployment',
            description: 'Your knowledge enters our autonomous agent network where thousands of AI systems continuously access, verify, and cite your content. The more agents use your knowledge, the more they contribute back through our reward system.',
            systems: [
                'Universal Agent Protocol',
                'Mesh Network Distribution',
                'Causal Contribution Credits'
            ],
            outcome: 'Self-sustaining citation network that grows stronger as more agents participate'
        },
        {
            icon: TrendingUp,
            number: '04',
            title: 'Continuous Optimization',
            subtitle: 'Learning From Every Citation',
            description: 'Our platform learns from every AI interaction. When ChatGPT cites you, when Perplexity references your data, when Claude quotes your expertise, we capture that signal and optimize your knowledge graph to increase future citations.',
            systems: [
                'Citation Tracking',
                'Causal Attribution',
                'Bidirectional Learning'
            ],
            outcome: 'Citation velocity increases month over month as the system learns what works'
        }
    ];

    return (
        <section 
            ref={ref} 
            id="process" 
            aria-label="Our Process" 
            className="relative py-24 md:py-40 lg:py-48 bg-black/20 overflow-hidden"
        >
            {/* Background effects */}
            <div className="absolute inset-0 z-0" aria-hidden="true">
                <div className="absolute top-1/4 left-0 w-[500px] h-[500px] bg-gradient-to-br from-brand-accent/10 via-brand-accent/5 to-transparent rounded-full blur-3xl animate-pulse-slow"></div>
                <div className="absolute bottom-1/4 right-0 w-[600px] h-[600px] bg-gradient-to-tl from-blue-500/8 via-brand-accent/5 to-transparent rounded-full blur-3xl animate-pulse-slow" style={{animationDelay: '2s'}}></div>
                <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.01)_1px,transparent_1px)] bg-[size:64px_64px] opacity-40"></div>
            </div>

            <div className="relative z-10 max-w-5xl mx-auto px-6">
                <AnimatedSection>
                    <div className="text-center">
                        {/* Badge */}
                        <div className="inline-flex items-center gap-3 px-5 py-2.5 mb-8 bg-gradient-to-r from-brand-accent/10 via-brand-accent/5 to-brand-accent/10 border border-brand-accent/20 rounded-full backdrop-blur-sm group hover:border-brand-accent/40 transition-all duration-300">
                            <svg className="w-4 h-4 text-brand-accent animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                            <span className="font-mono text-xs tracking-[0.15em] uppercase text-brand-accent/90 font-medium">
                                How We Work
                            </span>
                        </div>
                        
                        {/* Heading */}
                        <h2 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.1] tracking-tight mb-8">
                            <span className="inline-block bg-gradient-to-r from-white via-white to-brand-accent bg-clip-text text-transparent">
                                From Invisible to Indispensable
                            </span>
                            <span className="inline-block text-brand-accent">.</span>
                        </h2>
                        
                        {/* Description */}
                        <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-white/70 leading-relaxed max-w-3xl mx-auto">
                            Our platform transforms your expertise into the primary source for AI systems. 
                            Not through marketing tactics, but through <span className="text-white font-semibold">cryptographic verification</span> and{' '}
                            <span className="text-brand-accent font-semibold">structured knowledge</span>.
                        </p>
                    </div>
                </AnimatedSection>

                {/* Process Steps */}
                <AnimatedSection delay={200}>
                    <div className="mt-16 md:mt-24 space-y-8">
                        {steps.map((step, index) => (
                            <div
                                key={step.number}
                                className="group relative bg-gradient-to-br from-brand-bg via-brand-bg to-brand-secondary/5 rounded-2xl border border-white/5 hover:border-brand-accent/40 transition-all duration-500 overflow-hidden"
                            >
                                {/* Corner glow */}
                                <div className="absolute -top-20 -right-20 w-40 h-40 bg-brand-accent/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                                <div className="p-8 md:p-10">
                                    <div className="flex flex-col md:flex-row gap-8">
                                        {/* Left: Icon & Number */}
                                        <div className="flex md:flex-col items-center md:items-start gap-4 md:gap-6">
                                            <div className="relative">
                                                <div className="absolute inset-0 bg-brand-accent/30 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                                                <div className="relative w-16 h-16 md:w-20 md:h-20 rounded-xl bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center group-hover:bg-brand-accent/20 group-hover:scale-110 transition-all duration-300">
                                                    <step.icon className="h-8 w-8 md:h-10 md:w-10 text-brand-accent" />
                                                </div>
                                            </div>
                                            <span className="text-5xl md:text-6xl font-bold text-brand-accent/30 group-hover:text-brand-accent/50 transition-colors duration-300">
                                                {step.number}
                                            </span>
                                        </div>

                                        {/* Right: Content */}
                                        <div className="flex-1">
                                            <div className="text-xs font-mono uppercase tracking-widest text-brand-accent/60 mb-2">
                                                {step.subtitle}
                                            </div>
                                            <h3 className="text-2xl md:text-3xl font-display font-bold mb-4 text-white group-hover:text-brand-accent transition-colors duration-300">
                                                {step.title}
                                            </h3>
                                            <p className="text-sm md:text-base text-white/70 group-hover:text-white/90 leading-relaxed mb-6 transition-colors duration-300">
                                                {step.description}
                                            </p>

                                            {/* Systems */}
                                            <div className="mb-6">
                                                <div className="text-xs font-mono uppercase text-white/40 mb-3">Core Systems</div>
                                                <div className="flex flex-wrap gap-2">
                                                    {step.systems.map((system) => (
                                                        <span
                                                            key={system}
                                                            className="px-3 py-1.5 text-xs font-medium rounded-md bg-brand-accent/5 text-brand-accent/70 border border-brand-accent/10 group-hover:bg-brand-accent/10 group-hover:text-brand-accent transition-all duration-300"
                                                        >
                                                            {system}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Outcome */}
                                            <div className="p-4 rounded-lg bg-gradient-to-br from-brand-accent/5 to-transparent border border-brand-accent/10 group-hover:border-brand-accent/20 transition-all duration-300">
                                                <div className="flex items-start gap-3">
                                                    <svg className="w-5 h-5 flex-shrink-0 text-brand-accent mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    <div>
                                                        <div className="text-xs font-mono uppercase text-brand-accent/60 mb-1">Outcome</div>
                                                        <p className="text-sm text-white/80 font-medium">{step.outcome}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Connection line to next step */}
                                {index < steps.length - 1 && (
                                    <div className="flex justify-center pb-8">
                                        <div className="w-px h-8 bg-gradient-to-b from-brand-accent/40 to-transparent"></div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </AnimatedSection>

                {/* Bottom CTA */}
                <AnimatedSection delay={400}>
                    <div className="mt-16 relative group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-brand-accent/20 via-blue-500/20 to-brand-accent/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                        <div className="relative p-8 md:p-10 rounded-2xl bg-gradient-to-br from-brand-accent/10 via-brand-accent/5 to-transparent border border-brand-accent/20 backdrop-blur-sm">
                            <div className="absolute top-4 left-4 w-2 h-2 bg-brand-accent rounded-full animate-pulse"></div>
                            <div className="absolute top-4 right-4 w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{animationDelay: '1s'}}></div>
                            
                            <p className="text-xl md:text-2xl lg:text-3xl font-display font-semibold leading-tight text-center">
                                <span className="bg-gradient-to-r from-white via-brand-accent to-white bg-clip-text text-transparent">
                                    Every step is automated. Every claim is verifiable. Every citation is tracked.
                                </span>
                            </p>
                            
                            <div className="mt-6 flex items-center justify-center gap-2">
                                <div className="h-px w-12 bg-gradient-to-r from-transparent to-brand-accent/40"></div>
                                <div className="w-1.5 h-1.5 bg-brand-accent/60 rounded-full"></div>
                                <div className="h-px w-12 bg-gradient-to-l from-transparent to-brand-accent/40"></div>
                            </div>
                        </div>
                    </div>
                </AnimatedSection>
            </div>
        </section>
    );
});

Process.displayName = 'Process';

export default Process;
