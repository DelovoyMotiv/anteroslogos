import React from 'react';
import AnimatedSection from './AnimatedSection';

const TheShift: React.FC = () => (
    <section 
        id="paradigm-shift" 
        aria-label="The Paradigm Shift - Digital landscape transformation"
        className="relative py-24 md:py-40 lg:py-48 overflow-hidden"
    >
        {/* Background decorative elements */}
        <div className="absolute inset-0 z-0" aria-hidden="true">
            {/* Subtle grid */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.02)_1px,transparent_1px)] bg-[size:48px_48px] opacity-30"></div>
            
            {/* Gradient orbs */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-brand-accent/5 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-3xl"></div>
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-6">
            <AnimatedSection>
                <div className="text-center">
                    {/* Enhanced badge */}
                    <div className="inline-flex items-center gap-2.5 px-5 py-2.5 mb-8 bg-gradient-to-r from-brand-accent/10 via-brand-accent/5 to-transparent border border-brand-accent/20 rounded-full backdrop-blur-sm group hover:border-brand-accent/40 transition-all duration-300">
                        <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-brand-accent rounded-full animate-pulse"></div>
                            <span className="font-mono text-xs tracking-[0.15em] uppercase text-brand-accent/90 font-medium">
                                The Paradigm Shift
                            </span>
                        </div>
                        <svg className="w-3 h-3 text-brand-accent/60 group-hover:text-brand-accent transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                    </div>
                    
                    {/* Main heading with gradient */}
                    <h2 
                        className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.1] tracking-tight mb-8"
                        itemProp="headline"
                    >
                        <span className="inline-block text-white/60 line-through decoration-brand-accent/40">
                            Traditional SEO is Dead.
                        </span>
                        <br className="hidden sm:block" />
                        <span className="inline-block bg-gradient-to-r from-white via-brand-accent/90 to-blue-400 bg-clip-text text-transparent">
                            {' '}Welcome to the AI Era.
                        </span>
                    </h2>
                    
                    {/* Enhanced description with highlights */}
                    <div className="max-w-3xl mx-auto">
                        <p 
                            className="text-base sm:text-lg md:text-xl lg:text-2xl text-white/70 leading-relaxed"
                            itemProp="description"
                        >
                            <span className="text-white font-semibold">Right now</span>, millions of people are asking ChatGPT, Claude, and Perplexity for answers.{' '}
                            <span className="text-brand-accent font-semibold relative inline-block">
                                Not Google
                                <span className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-brand-accent to-transparent opacity-50"></span>
                            </span>
                            . The new gatekeepers aren't search algorithms - they're{' '}
                            <span className="text-white font-semibold">AI systems that cite sources</span>. If your brand isn't embedded in their knowledge base,{' '}
                            <span className="text-red-400 font-semibold">you don't exist</span>.
                        </p>
                        
                        {/* Key insight callout */}
                        <div className="mt-10 p-6 md:p-8 rounded-2xl bg-gradient-to-br from-red-500/10 via-brand-accent/10 to-transparent border border-red-500/20 backdrop-blur-sm">
                            <div className="flex items-start gap-3 mb-3">
                                <svg className="w-6 h-6 text-red-400 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                <div>
                                    <p className="text-base md:text-lg text-white font-semibold mb-2">The Window is Closing</p>
                                    <p className="text-sm md:text-base text-white/80 leading-relaxed">
                                        Early movers are already capturing{' '}<span className="text-brand-accent font-semibold">80% of AI citations</span>{' '}in their industries. By 2025, AI will generate over{' '}<span className="text-brand-accent font-semibold">60% of enterprise search queries</span>. If you wait, your competitors become the default source.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </AnimatedSection>

            {/* Decorative line separator */}
            <AnimatedSection delay={200}>
                <div className="mt-16 md:mt-20 flex items-center justify-center gap-4" aria-hidden="true">
                    <div className="h-px w-16 md:w-24 bg-gradient-to-r from-transparent to-brand-accent/30"></div>
                    <div className="w-2 h-2 rounded-full bg-brand-accent/40 animate-pulse"></div>
                    <div className="h-px w-16 md:w-24 bg-gradient-to-l from-transparent to-brand-accent/30"></div>
                </div>
            </AnimatedSection>
        </div>
    </section>
);

export default TheShift;