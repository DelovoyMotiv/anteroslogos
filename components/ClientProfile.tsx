import React, { forwardRef } from 'react';
import AnimatedSection from './AnimatedSection';
import { TechIcon, ThoughtLeaderIcon, EnterpriseIcon } from './Icons';

interface TechStack {
    name: string;
    color: string;
}

interface ProfileData {
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    subtitle: string;
    desc: string;
    techStack: TechStack[];
    highlight: string;
}

const ClientProfile = forwardRef<HTMLElement>((props, ref) => {
    const profiles: ProfileData[] = [
        { 
            icon: TechIcon, 
            title: "AI-Native Builders", 
            subtitle: "Next-Gen Tech Companies",
            desc: "Companies building on cutting-edge AI infrastructure - LLM applications, autonomous agents, and AI-first products that require authoritative knowledge graph presence.",
            techStack: [
                { name: "AI SDK", color: "#10B981" },
                { name: "A2A Protocol", color: "#3B82F6" },
                { name: "RAG Systems", color: "#8B5CF6" }
            ],
            highlight: "Optimized for Perplexity, ChatGPT, Claude citations"
        },
        { 
            icon: ThoughtLeaderIcon, 
            title: "Technical Visionaries", 
            subtitle: "Domain Experts & Researchers",
            desc: "AI researchers, technical founders, and domain experts whose insights shape industry direction and deserve to be the definitive source in generative AI responses.",
            techStack: [
                { name: "Schema.org", color: "#F59E0B" },
                { name: "Knowledge Graphs", color: "#EC4899" },
                { name: "Semantic Web", color: "#06B6D4" }
            ],
            highlight: "Featured in AI Overviews and LLM citations"
        },
        { 
            icon: EnterpriseIcon, 
            title: "Enterprise Innovators", 
            subtitle: "Fortune 500 Digital Leaders",
            desc: "Forward-thinking enterprises investing in AI transformation, requiring authoritative positioning across ChatGPT, Gemini, and next-generation search interfaces.",
            techStack: [
                { name: "Multi-Agent Systems", color: "#EF4444" },
                { name: "GEO Platform", color: "#3B82F6" },
                { name: "Voice AI", color: "#14B8A6" }
            ],
            highlight: "Dominant presence in AI-powered enterprise search"
        }
    ];

    return (
        <section ref={ref} id="client-profile" aria-label="Who We Partner With - Client profiles" className="relative py-24 md:py-40 lg:py-48 bg-black/20 overflow-hidden">
            {/* Enhanced background with grid and orbs */}
            <div className="absolute inset-0 z-0" aria-hidden="true">
                <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.02)_1px,transparent_1px)] bg-[size:48px_48px] opacity-30"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-br from-brand-accent/8 via-brand-accent/3 to-transparent rounded-full blur-3xl animate-pulse-slow"></div>
                <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-gradient-to-tl from-blue-500/5 to-transparent rounded-full blur-3xl"></div>
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-6">
                <AnimatedSection>
                    <div className="text-center mb-16 md:mb-20">
                        {/* Tech badge */}
                        <div className="inline-flex items-center gap-2.5 px-5 py-2.5 mb-8 bg-gradient-to-r from-brand-accent/10 via-brand-accent/5 to-transparent border border-brand-accent/20 rounded-full backdrop-blur-sm group hover:border-brand-accent/40 transition-all duration-300">
                            <svg className="w-4 h-4 text-brand-accent animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            <span className="font-mono text-xs tracking-[0.15em] uppercase text-brand-accent/90 font-medium">
                                AI-First Partnerships
                            </span>
                        </div>

                        <h2 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.1] tracking-tight mb-6">
                            <span className="bg-gradient-to-r from-white via-brand-accent to-white bg-clip-text text-transparent">
                                Who We Partner With
                            </span>
                        </h2>
                        
                        <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-white/70 max-w-3xl mx-auto leading-relaxed">
                            We collaborate with organizations at the{' '}
                            <span className="text-brand-accent font-semibold">cutting edge of AI</span>
                            {' '}- those building, researching, and deploying the technologies that define tomorrow's knowledge infrastructure.
                        </p>
                    </div>
                </AnimatedSection>
                <div className="mt-12 grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-6" role="list" aria-label="Client profiles">
                    {profiles.map((profile, index) => (
                        <AnimatedSection key={profile.title} delay={index * 150}>
                            <article 
                                className="group relative bg-gradient-to-br from-brand-bg via-brand-bg to-brand-secondary/10 h-full border border-brand-secondary/30 p-8 md:p-10 rounded-2xl transition-all duration-500 hover:border-brand-accent/60 hover:-translate-y-2 hover:shadow-2xl hover:shadow-brand-accent/20 overflow-hidden"
                                role="listitem"
                                aria-label={profile.title}
                            >
                                {/* Animated gradient overlay */}
                                <div className="absolute inset-0 bg-gradient-to-br from-brand-accent/0 via-brand-accent/5 to-brand-accent/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                                
                                {/* Corner accent */}
                                <div className="absolute top-0 right-0 w-32 h-32 bg-brand-accent/5 blur-2xl rounded-full translate-x-12 -translate-y-12 group-hover:bg-brand-accent/10 transition-colors duration-500"></div>
                                
                                <div className="relative z-10">
                                    {/* Icon with enhanced glow */}
                                    <div className="mb-6 relative flex justify-center">
                                        <div className="absolute inset-0 bg-brand-accent/30 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 scale-150"></div>
                                        <div className="relative w-16 h-16 flex items-center justify-center rounded-xl bg-brand-accent/10 border border-brand-accent/20 group-hover:border-brand-accent/40 transition-all duration-500 group-hover:scale-110">
                                            <profile.icon className="h-8 w-8 text-brand-accent transition-all duration-500 group-hover:scale-110" />
                                        </div>
                                    </div>

                                    {/* Subtitle */}
                                    <div className="text-xs font-mono uppercase tracking-widest text-brand-accent/60 mb-2 text-center">
                                        {profile.subtitle}
                                    </div>

                                    {/* Title */}
                                    <h3 className="font-display text-2xl md:text-3xl font-bold text-center mb-4 group-hover:text-brand-accent transition-colors duration-300" itemProp="name">
                                        {profile.title}
                                    </h3>

                                    {/* Description */}
                                    <p className="text-sm md:text-base text-brand-text/60 group-hover:text-brand-text/80 leading-relaxed mb-6 text-center transition-colors duration-300" itemProp="description">
                                        {profile.desc}
                                    </p>

                                    {/* Tech Stack Badges */}
                                    <div className="flex flex-wrap justify-center gap-2 mb-6">
                                        {profile.techStack.map((tech) => (
                                            <span 
                                                key={tech.name}
                                                className="px-3 py-1 text-xs font-mono rounded-full border transition-all duration-300"
                                                style={{
                                                    borderColor: `${tech.color}40`,
                                                    backgroundColor: `${tech.color}10`,
                                                    color: tech.color
                                                }}
                                            >
                                                {tech.name}
                                            </span>
                                        ))}
                                    </div>

                                    {/* Highlight badge */}
                                    <div className="p-3 rounded-lg bg-brand-accent/5 border border-brand-accent/10 group-hover:border-brand-accent/30 transition-all duration-300">
                                        <div className="flex items-center justify-center gap-2 text-xs text-brand-accent/80 font-medium">
                                            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                            <span className="text-center">{profile.highlight}</span>
                                        </div>
                                    </div>

                                    {/* Hover arrow indicator */}
                                    <div className="mt-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
                                        <svg className="w-6 h-6 text-brand-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                        </svg>
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

ClientProfile.displayName = 'ClientProfile';

export default ClientProfile;
