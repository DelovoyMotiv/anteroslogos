import React, { forwardRef } from 'react';
import AnimatedSection from './AnimatedSection';
import { AnalysisIcon, SynthesisIcon, IntegrationIcon } from './Icons';

interface MethodStep {
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    subtitle: string;
    desc: string;
    technologies: string[];
    platforms: string[];
    outcome: string;
}

const NicosiaMethod = forwardRef<HTMLElement>((props, ref) => {
    const steps: MethodStep[] = [
        {
            icon: AnalysisIcon,
            title: "Semantic Analysis",
            subtitle: "Entity & Knowledge Extraction",
            desc: "We deconstruct your domain expertise using NLP and entity recognition, identifying semantic primitives that AI systems recognize as authoritative knowledge patterns.",
            technologies: ["NLP", "Entity Graphs", "Semantic Web"],
            platforms: ["Schema.org", "OpenAI Embedding"],
            outcome: "Machine-readable knowledge foundation"
        },
        {
            icon: SynthesisIcon,
            title: "Ontological Synthesis",
            subtitle: "Knowledge Graph Architecture",
            desc: "We structure extracted components into RDF-based knowledge graphs optimized for LLM retrieval systems, ensuring your expertise becomes a primary citation source.",
            technologies: ["RDF", "Knowledge Graphs", "Vector DBs"],
            platforms: ["Pinecone", "Weaviate", "GraphQL"],
            outcome: "AI-optimized authority architecture"
        },
        {
            icon: IntegrationIcon,
            title: "AI Integration",
            subtitle: "Multi-Platform Deployment",
            desc: "We deploy structured knowledge across Perplexity, ChatGPT, Claude, and Gemini through AI SDK implementations, RAG systems, and agent protocols.",
            technologies: ["AI SDK", "RAG", "A2A Protocol"],
            platforms: ["Perplexity", "ChatGPT", "Claude"],
            outcome: "Dominant AI citation presence"
        }
    ];

    return (
        <section ref={ref} id="nicosia-method" aria-label="The Nicosia Method - Our GEO Process" className="relative py-24 md:py-40 lg:py-48 overflow-hidden">
            {/* Background effects */}
            <div className="absolute inset-0 z-0" aria-hidden="true">
                <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.02)_1px,transparent_1px)] bg-[size:48px_48px] opacity-30"></div>
                <div className="absolute top-1/3 left-1/4 w-[600px] h-[600px] bg-brand-accent/5 rounded-full blur-3xl"></div>
                <div className="absolute bottom-1/3 right-1/4 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-3xl"></div>
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-6">
                <AnimatedSection>
                    <div className="text-center mb-16 md:mb-20">
                        {/* Enhanced badge */}
                        <div className="inline-flex items-center gap-2.5 px-5 py-2.5 mb-8 bg-gradient-to-r from-brand-accent/10 via-brand-accent/5 to-transparent border border-brand-accent/20 rounded-full backdrop-blur-sm group hover:border-brand-accent/40 transition-all duration-300">
                            <svg className="w-4 h-4 text-brand-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                            <span className="font-mono text-xs tracking-[0.15em] uppercase text-brand-accent/90 font-medium">
                                The Process
                            </span>
                        </div>

                        <h2 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.1] tracking-tight mb-6" itemProp="name">
                            <span className="bg-gradient-to-r from-white via-brand-accent to-white bg-clip-text text-transparent">
                                The Nicosia Method
                            </span>
                            <span className="text-brand-accent">™</span>
                        </h2>
                        
                        <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-white/70 max-w-3xl mx-auto leading-relaxed" itemProp="description">
                            A proprietary{' '}
                            <span className="text-brand-accent font-semibold">three-phase methodology</span>
                            {' '}for embedding your authority into the{' '}
                            <span className="text-white font-semibold">knowledge infrastructure</span>
                            {' '}of generative AI systems.
                        </p>
                    </div>
                </AnimatedSection>
                <div className="mt-12 grid grid-cols-1 lg:grid-cols-3 gap-8" role="list" aria-label="Nicosia Method steps">
                    {steps.map((step, index) => (
                        <AnimatedSection key={step.title} delay={index * 150}>
                            <article 
                                className="group relative h-full bg-gradient-to-br from-brand-bg via-brand-bg to-brand-secondary/10 p-8 md:p-10 rounded-2xl border border-brand-secondary/30 hover:border-brand-accent/50 transition-all duration-500 overflow-hidden"
                                role="listitem"
                                aria-label={`Step ${index + 1}: ${step.title}`}
                            >
                                {/* Gradient overlay */}
                                <div className="absolute inset-0 bg-gradient-to-br from-brand-accent/0 via-brand-accent/5 to-brand-accent/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                                
                                {/* Corner accent */}
                                <div className="absolute -top-12 -right-12 w-32 h-32 bg-brand-accent/10 rounded-full blur-2xl group-hover:bg-brand-accent/20 transition-colors duration-500"></div>

                                <div className="relative z-10">
                                    {/* Icon + Number */}
                                    <div className="flex items-start justify-between mb-6">
                                        <div className="relative">
                                            <div className="absolute inset-0 bg-brand-accent/30 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                                            <div className="relative w-16 h-16 rounded-xl bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center group-hover:bg-brand-accent/20 group-hover:border-brand-accent/40 group-hover:scale-110 transition-all duration-300">
                                                <step.icon className="h-8 w-8 text-brand-accent" />
                                            </div>
                                        </div>
                                        <span className="text-5xl font-bold text-brand-accent/20 group-hover:text-brand-accent/40 transition-colors duration-300">
                                            {String(index + 1).padStart(2, '0')}
                                        </span>
                                    </div>

                                    {/* Subtitle */}
                                    <div className="text-xs font-mono uppercase tracking-widest text-brand-accent/60 mb-2">
                                        {step.subtitle}
                                    </div>

                                    {/* Title */}
                                    <h3 className="font-display text-2xl md:text-3xl font-bold mb-4 group-hover:text-brand-accent transition-colors duration-300" itemProp="name">
                                        {step.title}
                                    </h3>

                                    {/* Description */}
                                    <p className="text-sm md:text-base text-white/60 group-hover:text-white/80 leading-relaxed mb-6 transition-colors duration-300" itemProp="description">
                                        {step.desc}
                                    </p>

                                    {/* Technologies */}
                                    <div className="mb-4">
                                        <div className="text-xs font-mono uppercase text-brand-accent/40 mb-2">Technologies</div>
                                        <div className="flex flex-wrap gap-2">
                                            {step.technologies.map((tech) => (
                                                <span
                                                    key={tech}
                                                    className="px-2.5 py-1 text-xs font-mono rounded-md bg-brand-accent/5 text-brand-accent/70 border border-brand-accent/10 group-hover:bg-brand-accent/10 group-hover:text-brand-accent transition-all duration-300"
                                                >
                                                    {tech}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Platforms */}
                                    <div className="mb-6">
                                        <div className="text-xs font-mono uppercase text-brand-accent/40 mb-2">Platforms</div>
                                        <div className="flex flex-wrap gap-2">
                                            {step.platforms.map((platform) => (
                                                <span
                                                    key={platform}
                                                    className="px-2.5 py-1 text-xs font-mono rounded-md bg-blue-500/5 text-blue-400/70 border border-blue-500/10 group-hover:bg-blue-500/10 group-hover:text-blue-400 transition-all duration-300"
                                                >
                                                    {platform}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Outcome badge */}
                                    <div className="p-3 rounded-lg bg-gradient-to-br from-brand-accent/5 to-transparent border border-brand-accent/10 group-hover:border-brand-accent/20 transition-all duration-300">
                                        <div className="flex items-center gap-2 text-xs text-brand-accent/80 font-medium">
                                            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <span>{step.outcome}</span>
                                        </div>
                                    </div>
                                </div>
                            </article>
                        </AnimatedSection>
                    ))}
                </div>
            </div>
        </section>
    );
});

NicosiaMethod.displayName = 'NicosiaMethod';

export default NicosiaMethod;
