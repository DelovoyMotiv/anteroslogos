import React, { forwardRef } from 'react';
import AnimatedSection from './AnimatedSection';

interface Feature {
    number: string;
    title: string;
    subtitle: string;
    description: string;
    technologies: string[];
    icon: React.ReactElement;
}

const Philosophy = forwardRef<HTMLElement>((_props, ref) => {
    const features: Feature[] = [
        {
            number: "01",
            title: "Extract",
            subtitle: "Knowledge Mapping",
            description: "We identify and structure the core knowledge that makes your brand unique - what you know better than anyone else.",
            technologies: ["NLP", "Entity Recognition", "Semantic Analysis"],
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
            )
        },
        {
            number: "02",
            title: "Structure",
            subtitle: "AI-Ready Formatting",
            description: "We translate your expertise into formats that AI systems understand and trust - making you citable, quotable, and authoritative.",
            technologies: ["Schema.org", "RDF", "Knowledge Graphs"],
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
            )
        },
        {
            number: "03",
            title: "Deploy",
            subtitle: "Multi-Platform Integration",
            description: "We embed your knowledge directly into AI systems so when millions ask questions in your domain, your brand is the answer.",
            technologies: ["AI SDK", "RAG", "A2A Protocol"],
            icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
            )
        }
    ];

    return (
    <section 
        ref={ref} 
        id="solution"
        aria-label="The Solution - Beyond traditional marketing"
        className="relative py-24 md:py-40 lg:py-48 bg-black/20 overflow-hidden"
    >
        {/* Enhanced background effects */}
        <div className="absolute inset-0 z-0" aria-hidden="true">
            {/* Animated gradient orbs */}
            <div className="absolute top-1/4 left-0 w-[500px] h-[500px] bg-gradient-to-br from-brand-accent/10 via-brand-accent/5 to-transparent rounded-full blur-3xl animate-pulse-slow"></div>
            <div className="absolute bottom-1/4 right-0 w-[600px] h-[600px] bg-gradient-to-tl from-blue-500/8 via-brand-accent/5 to-transparent rounded-full blur-3xl animate-pulse-slow" style={{animationDelay: '2s'}}></div>
            
            {/* Subtle grid overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.01)_1px,transparent_1px)] bg-[size:64px_64px] opacity-40"></div>
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-6">
            <AnimatedSection>
                <div className="text-center">
                    {/* Premium badge with icon */}
                    <div className="inline-flex items-center gap-3 px-5 py-2.5 mb-8 bg-gradient-to-r from-brand-accent/10 via-brand-accent/5 to-brand-accent/10 border border-brand-accent/20 rounded-full backdrop-blur-sm group hover:border-brand-accent/40 transition-all duration-300">
                        <svg className="w-4 h-4 text-brand-accent animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        <span className="font-mono text-xs tracking-[0.15em] uppercase text-brand-accent/90 font-medium">
                            The Solution
                        </span>
                        <div className="w-1 h-1 bg-brand-accent/60 rounded-full"></div>
                    </div>
                    
                    {/* Dynamic heading with emphasis */}
                    <h2 
                        className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.1] tracking-tight mb-8"
                        itemProp="headline"
                    >
                        <span className="inline-block bg-gradient-to-r from-white via-white to-brand-accent bg-clip-text text-transparent">
                            How We Make It Happen
                        </span>
                        <span className="inline-block text-brand-accent">.</span>
                    </h2>
                    
                    {/* Rich description with highlighted terms */}
                    <div className="max-w-3xl mx-auto">
                        <p 
                            className="text-base sm:text-lg md:text-xl lg:text-2xl text-white/70 leading-relaxed"
                            itemProp="description"
                        >
                            We transform your expertise into{' '}
                            <span className="text-white font-semibold relative inline-block">
                                structured knowledge
                                <span className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/30 to-transparent"></span>
                            </span>
                            {' '}that AI systems{' '}
                            <span className="text-brand-accent font-semibold">trust and cite</span>. Instead of chasing rankings, we make your brand the{' '}
                            <span className="text-white font-semibold">answer</span>{' '}- embedded directly into ChatGPT, Claude, and Perplexity responses.
                        </p>
                        
                        {/* Premium callout for key value prop */}
                        <div className="mt-10 relative group">
                            {/* Glow effect on hover */}
                            <div className="absolute -inset-1 bg-gradient-to-r from-brand-accent/20 via-blue-500/20 to-brand-accent/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                            
                            <div className="relative p-8 md:p-10 rounded-2xl bg-gradient-to-br from-brand-accent/10 via-brand-accent/5 to-transparent border border-brand-accent/20 backdrop-blur-sm">
                                <div className="absolute top-4 left-4 w-2 h-2 bg-brand-accent rounded-full animate-pulse"></div>
                                <div className="absolute top-4 right-4 w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{animationDelay: '1s'}}></div>
                                
                                <p className="text-xl md:text-2xl lg:text-3xl font-display font-semibold leading-tight">
                                    <span className="bg-gradient-to-r from-white via-brand-accent to-white bg-clip-text text-transparent">
                                        When someone asks an AI about your industry, your brand becomes the source they cite. That's the power of GEO.
                                    </span>
                                </p>
                                
                                {/* Decorative underline */}
                                <div className="mt-6 flex items-center justify-center gap-2">
                                    <div className="h-px w-12 bg-gradient-to-r from-transparent to-brand-accent/40"></div>
                                    <div className="w-1.5 h-1.5 bg-brand-accent/60 rounded-full"></div>
                                    <div className="h-px w-12 bg-gradient-to-l from-transparent to-brand-accent/40"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </AnimatedSection>

            {/* Enhanced feature cards */}
            <AnimatedSection delay={200}>
                <div className="mt-16 md:mt-24">
                    {/* Section subtitle */}
                    <div className="text-center mb-12">
                        <h3 className="text-sm font-mono uppercase tracking-widest text-brand-accent/60 mb-3">Our Process</h3>
                        <p className="text-white/50 text-sm max-w-2xl mx-auto">Three-phase methodology for AI authority architecture</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto">
                        {features.map((feature) => (
                            <div
                                key={feature.number}
                                className="group relative bg-gradient-to-br from-brand-bg via-brand-bg to-brand-secondary/5 p-8 rounded-2xl border border-white/5 hover:border-brand-accent/40 transition-all duration-500 overflow-hidden cursor-pointer"
                            >
                                {/* Corner glow */}
                                <div className="absolute -top-20 -right-20 w-40 h-40 bg-brand-accent/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                                {/* Number badge */}
                                <div className="flex items-start justify-between mb-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-xl bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center group-hover:bg-brand-accent/20 group-hover:scale-110 transition-all duration-300">
                                            <div className="text-brand-accent group-hover:scale-110 transition-transform duration-300">
                                                {feature.icon}
                                            </div>
                                        </div>
                                        <span className="text-4xl font-bold text-brand-accent/30 group-hover:text-brand-accent/50 transition-colors duration-300">
                                            {feature.number}
                                        </span>
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="relative z-10">
                                    <div className="text-xs font-mono uppercase tracking-widest text-brand-accent/60 mb-2">
                                        {feature.subtitle}
                                    </div>
                                    <h4 className="text-2xl font-display font-bold mb-3 text-white group-hover:text-brand-accent transition-colors duration-300">
                                        {feature.title}
                                    </h4>
                                    <p className="text-sm text-white/60 group-hover:text-white/80 leading-relaxed mb-4 transition-colors duration-300">
                                        {feature.description}
                                    </p>

                                    {/* Tech stack */}
                                    <div className="flex flex-wrap gap-2 pt-4 border-t border-white/5 group-hover:border-brand-accent/20 transition-colors duration-300">
                                        {feature.technologies.map((tech) => (
                                            <span
                                                key={tech}
                                                className="px-2.5 py-1 text-xs font-mono rounded-md bg-brand-accent/5 text-brand-accent/70 border border-brand-accent/10 group-hover:bg-brand-accent/10 group-hover:text-brand-accent group-hover:border-brand-accent/20 transition-all duration-300"
                                            >
                                                {tech}
                                            </span>
                                        ))}
                                    </div>

                                    {/* Hover indicator */}
                                    <div className="mt-6 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
                                        <div className="h-px flex-1 bg-gradient-to-r from-brand-accent/40 to-transparent"></div>
                                        <svg className="w-4 h-4 text-brand-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </AnimatedSection>
        </div>
    </section>
    );
});

Philosophy.displayName = 'Philosophy';

export default Philosophy;
