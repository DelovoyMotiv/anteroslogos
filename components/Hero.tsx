import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AnimatedSection from './AnimatedSection';
import GeoAnalysisForm from './GeoAnalysisForm';
import PulseLine from './PulseLine';

interface HeroProps {
    onScrollClick: () => void;
}

const Hero: React.FC<HeroProps> = ({ onScrollClick }) => {
    const navigate = useNavigate();
    const [url, setUrl] = useState('');
    
    const handleAnalyze = (e: React.FormEvent) => {
        e.preventDefault();
        if (url.trim()) {
            // Navigate to GEO Audit page with URL as query parameter
            const encodedUrl = encodeURIComponent(url.trim());
            navigate(`/geo-audit?url=${encodedUrl}`);
        }
    };
    
    return (
    <section 
        id="hero" 
        aria-label="Hero section - Don't rank. Become the source"
        className="relative min-h-screen flex items-center justify-center text-center overflow-hidden px-4 py-20 sm:px-6 sm:py-24 md:py-32"
    >
        {/* Decorative grid background */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.03)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,black,transparent)]"></div>
        
        {/* Floating orbs */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 bg-brand-accent/10 rounded-full blur-3xl animate-pulse-glow"></div>
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse-glow" style={{animationDelay: '1s'}}></div>
        
        <div className="relative z-10 w-full max-w-6xl mx-auto">
            <AnimatedSection>
                {/* Pulse Line - feeling the internet's pulse in real-time */}
                <div className="mb-6 sm:mb-8">
                    <PulseLine />
                </div>
                
                <h1
                    className="font-display font-bold text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl leading-[1.05] mb-0 tracking-tight px-2"
                    itemProp="headline"
                >
                    <span className="inline-block text-white">
                        Don't rank.
                    </span>
                    <br />
                    <span className="inline-block bg-gradient-to-r from-white via-brand-accent to-blue-400 bg-clip-text text-transparent">
                        Become the source.
                    </span>
                </h1>
            </AnimatedSection>
            <AnimatedSection delay={200}>
                <p 
                    className="mt-6 sm:mt-8 text-base sm:text-lg md:text-xl lg:text-2xl text-white/70 max-w-4xl mx-auto leading-relaxed px-4"
                    itemProp="description"
                >
                    Our <span className="text-white font-semibold">Knowledge Graph Engine for GEO</span> transforms your expertise into{' '}
                    <span className="text-brand-accent font-semibold">AI knowledge infrastructure</span>.{' '}
                    <span className="text-white font-semibold">Direct LLM integration</span> with{' '}
                    <span className="text-brand-accent font-semibold">ChatGPT, Claude, and Perplexity</span>{' '}
                    - not content marketing, but citation intelligence.
                </p>
            </AnimatedSection>
            <AnimatedSection delay={400}>
                <div className="mt-10 sm:mt-12 md:mt-14 lg:mt-16 px-4">
                    <GeoAnalysisForm
                        url={url}
                        onUrlChange={setUrl}
                        onSubmit={handleAnalyze}
                        isAnalyzing={false}
                        compact={true}
                    />
                </div>
            </AnimatedSection>
            
            {/* Trust Bar */}
            <AnimatedSection delay={600}>
                <aside className="mt-16 sm:mt-20 md:mt-24 pt-12 sm:pt-14 md:pt-16 border-t border-white/10" aria-label="Client trust indicators">
                    <h2 className="text-xs sm:text-sm text-white/40 uppercase tracking-[0.2em] mb-8 sm:mb-10 font-mono text-center">Trusted by Visionaries</h2>
                    <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 md:gap-8 lg:gap-12 xl:gap-16" role="list" aria-label="Client categories">
                        <div className="group flex flex-col items-center gap-2 px-4 sm:px-6 py-3 sm:py-4 rounded-xl hover:bg-white/5 transition-all duration-300" role="listitem">
                            <h3 className="text-white/90 font-semibold text-base sm:text-lg md:text-xl whitespace-nowrap">AI Leaders</h3>
                            <div className="w-12 h-0.5 bg-gradient-to-r from-transparent via-brand-accent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        </div>
                        <div className="hidden sm:block w-px h-12 bg-white/10"></div>
                        <div className="group flex flex-col items-center gap-2 px-4 sm:px-6 py-3 sm:py-4 rounded-xl hover:bg-white/5 transition-all duration-300" role="listitem">
                            <h3 className="text-white/90 font-semibold text-base sm:text-lg md:text-xl whitespace-nowrap">Tech Innovators</h3>
                            <div className="w-12 h-0.5 bg-gradient-to-r from-transparent via-brand-accent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        </div>
                        <div className="hidden sm:block w-px h-12 bg-white/10"></div>
                        <div className="group flex flex-col items-center gap-2 px-4 sm:px-6 py-3 sm:py-4 rounded-xl hover:bg-white/5 transition-all duration-300" role="listitem">
                            <h3 className="text-white/90 font-semibold text-base sm:text-lg md:text-xl whitespace-nowrap">Fortune 500</h3>
                            <div className="w-12 h-0.5 bg-gradient-to-r from-transparent via-brand-accent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        </div>
                    </div>
                </aside>
            </AnimatedSection>
        </div>
        
        {/* Scroll Indicator */}
        <div className="absolute bottom-8 sm:bottom-10 md:bottom-12 left-1/2 -translate-x-1/2 animate-bounce cursor-pointer" onClick={onScrollClick} role="button" aria-label="Scroll down to content" tabIndex={0}>
             <div className="w-6 h-10 border-2 border-brand-accent/50 hover:border-brand-accent/70 rounded-full flex justify-center items-start pt-2 transition-colors duration-300">
                <div className="w-1 h-2 rounded-full bg-brand-accent/70 animate-scroll-indicator"></div>
             </div>
        </div>
    </section>
    );
};

export default Hero;
