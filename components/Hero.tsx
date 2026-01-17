import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AnimatedSection from './AnimatedSection';
import GeoAnalysisForm from './GeoAnalysisForm';
import AuditShowcaseCarousel from './AuditShowcaseCarousel';

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
                    className="mt-6 sm:mt-8 text-base sm:text-lg md:text-xl lg:text-2xl text-white/80 max-w-4xl mx-auto leading-relaxed px-4"
                    itemProp="description"
                >
                    Our audit shows if AI can find your website, mention your brand, and what to change to get more visibility and traffic.
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
            
            {/* Audit Showcase Carousel */}
            <AnimatedSection delay={600}>
                <div className="mt-12 sm:mt-14 md:mt-16">
                    <AuditShowcaseCarousel />
                </div>
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
