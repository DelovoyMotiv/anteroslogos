import React from 'react';
import AnimatedSection from './AnimatedSection';

interface FinalCTAProps {
    onCTAClick: () => void;
}

const FinalCTA: React.FC<FinalCTAProps> = ({ onCTAClick }) => (
    <section className="py-32 md:py-48 text-center relative overflow-hidden">
        {/* Subtle background glow to create a spotlight effect */}
        <div className="absolute inset-0 bg-brand-bg z-0 animate-pulse-glow" style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(59, 130, 246, 0.08), rgba(59, 130, 246, 0) 70%)' }}></div>
        
        <AnimatedSection className="relative z-10">
            <div className="max-w-3xl mx-auto px-6">
                {/* Decorative divider */}
                <div className="w-16 h-px bg-brand-accent mx-auto mb-8"></div>
                
                <h2 className="font-display text-4xl md:text-6xl font-bold">Position your truth.</h2>
                <p className="mt-6 text-lg md:text-xl text-brand-text/70">
                    We engage with a limited number of clients to ensure profound immersion and uncompromising results.
                </p>
                <div className="mt-12">
                    <button 
                        onClick={onCTAClick} 
                        className="font-semibold text-lg bg-brand-accent text-white py-4 px-10 rounded-full transition-all duration-300 hover:bg-blue-500 hover:shadow-2xl hover:shadow-blue-500/30 transform hover:-translate-y-1 hover:scale-105"
                    >
                        Initiate a Strategic Dialogue
                    </button>
                </div>
            </div>
        </AnimatedSection>
    </section>
);

export default FinalCTA;