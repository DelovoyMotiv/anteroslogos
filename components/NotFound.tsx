import React, { useEffect, useState } from 'react';
import { Logo } from './Icons';

const NotFound: React.FC = () => {
    const [seconds, setSeconds] = useState(0);
    const [existentialQuote, setExistentialQuote] = useState(0);

    const quotes = [
        "We are all just URLs in the vast sitemap of existence.",
        "The page you seek mirrors the meaning we all chase.",
        "In the end, aren't we all just 404s looking for home?",
        "Even digital paths lead nowhere sometimes.",
        "This error is but a reflection of life's beautiful chaos."
    ];

    useEffect(() => {
        const timer = setInterval(() => {
            setSeconds(prev => prev + 1);
        }, 1000);

        const quoteRotation = setInterval(() => {
            setExistentialQuote(prev => (prev + 1) % quotes.length);
        }, 4000);

        return () => {
            clearInterval(timer);
            clearInterval(quoteRotation);
        };
    }, [quotes.length]);

    const handleGoHome = () => {
        window.location.href = '/';
    };

    return (
        <div className="min-h-screen bg-brand-bg text-brand-text flex flex-col items-center justify-center relative overflow-hidden px-6">
            {/* Animated Background */}
            <div className="absolute inset-0 opacity-20">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-500/20 rounded-full blur-3xl animate-pulse-slow"></div>
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-brand-accent/20 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }}></div>
            </div>

            {/* Grid Pattern */}
            <div className="absolute inset-0 opacity-5"
                style={{
                    backgroundImage: 'linear-gradient(rgba(59, 130, 246, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(59, 130, 246, 0.1) 1px, transparent 1px)',
                    backgroundSize: '50px 50px'
                }}>
            </div>

            {/* Main Content */}
            <div className="relative z-10 max-w-4xl mx-auto text-center">
                {/* Logo */}
                <div className="mb-8 flex justify-center items-center gap-3">
                    <Logo className="h-12 w-12 opacity-50" />
                    <span className="font-display text-2xl font-semibold tracking-tight text-brand-text/50">Anóteros Lógos</span>
                </div>

                {/* 404 Number */}
                <div className="mb-8">
                    <h1 className="font-display text-[12rem] md:text-[16rem] font-bold leading-none bg-gradient-to-br from-red-400 via-red-500 to-red-600 bg-clip-text text-transparent opacity-90">
                        404
                    </h1>
                </div>

                {/* Existential Title */}
                <div className="mb-6">
                    <h2 className="font-display text-3xl md:text-5xl font-bold mb-4 bg-gradient-to-br from-white via-brand-text to-brand-text/70 bg-clip-text text-transparent">
                        Lost in the Digital Void
                    </h2>
                    <p className="text-lg md:text-xl text-brand-text/80 italic">
                        ...where all paths converge into nothingness
                    </p>
                </div>

                {/* Philosophical Message */}
                <div className="mb-12 max-w-2xl mx-auto">
                    <div className="bg-gradient-to-br from-brand-secondary/20 to-brand-secondary/5 border border-brand-secondary/30 rounded-2xl p-8 backdrop-blur-sm">
                        <p className="text-brand-text/90 text-base md:text-lg leading-relaxed mb-4">
                            Alas, dear traveler, you have stumbled upon the void — that eternal emptiness where URLs go to contemplate their existence. 
                            The page you seek is but a phantom, a digital mirage in the desert of broken links.
                        </p>
                        <p className="text-brand-text/70 text-sm md:text-base leading-relaxed">
                            We are all condemned to wander through life making errors, clicking wrong links, seeking pages that do not exist. 
                            Such is the human condition. Such is the digital condition. Such is... everything.
                        </p>
                    </div>
                </div>

                {/* Rotating Existential Quotes */}
                <div className="mb-12 h-16 flex items-center justify-center">
                    <p 
                        className="text-brand-accent/80 italic text-sm md:text-base font-mono transition-opacity duration-1000"
                        key={existentialQuote}
                    >
                        "{quotes[existentialQuote]}"
                    </p>
                </div>

                {/* Statistics of Despair */}
                <div className="mb-12 grid grid-cols-3 gap-4 max-w-2xl mx-auto">
                    <div className="bg-brand-secondary/10 border border-brand-secondary/20 rounded-xl p-4">
                        <div className="text-2xl md:text-3xl font-bold text-red-400">{seconds}</div>
                        <div className="text-xs md:text-sm text-brand-text/50 mt-1">Seconds Lost</div>
                    </div>
                    <div className="bg-brand-secondary/10 border border-brand-secondary/20 rounded-xl p-4">
                        <div className="text-2xl md:text-3xl font-bold text-brand-accent">∞</div>
                        <div className="text-xs md:text-sm text-brand-text/50 mt-1">Broken Links</div>
                    </div>
                    <div className="bg-brand-secondary/10 border border-brand-secondary/20 rounded-xl p-4">
                        <div className="text-2xl md:text-3xl font-bold text-yellow-400">404</div>
                        <div className="text-xs md:text-sm text-brand-text/50 mt-1">Meaning</div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
                    <button
                        onClick={handleGoHome}
                        className="group relative bg-brand-accent hover:bg-blue-500 text-white px-8 py-4 rounded-full font-semibold transition-all duration-300 hover:shadow-lg hover:shadow-brand-accent/30 hover:-translate-y-1 flex items-center gap-2"
                    >
                        <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Return to Meaning
                    </button>
                    
                    <button
                        onClick={() => window.history.back()}
                        className="bg-brand-secondary/20 hover:bg-brand-secondary/30 text-brand-text border border-brand-secondary/30 hover:border-brand-accent/50 px-8 py-4 rounded-full font-semibold transition-all duration-300"
                    >
                        Retrace Your Steps
                    </button>
                </div>

                {/* Helpful Links */}
                <div className="text-brand-text/60 text-sm">
                    <p className="mb-3">Perhaps you were looking for:</p>
                    <div className="flex flex-wrap justify-center gap-3">
                        <a href="/#nicosia-method" className="hover:text-brand-accent transition-colors duration-300">The Nicosia Method</a>
                        <span className="text-brand-text/30">•</span>
                        <a href="/#insights" className="hover:text-brand-accent transition-colors duration-300">Insights</a>
                        <span className="text-brand-text/30">•</span>
                        <a href="/#glossary" className="hover:text-brand-accent transition-colors duration-300">GEO Glossary</a>
                        <span className="text-brand-text/30">•</span>
                        <a href="/#team" className="hover:text-brand-accent transition-colors duration-300">Team</a>
                    </div>
                </div>

                {/* Poetic Footer */}
                <div className="mt-16 pt-8 border-t border-brand-secondary/20">
                    <p className="text-brand-text/40 text-xs italic font-mono">
                        "To err is human; to 404 is digital; to return home is wisdom."
                    </p>
                    <p className="text-brand-text/30 text-xs mt-2">
                        — Philosophical musings of a lost URL
                    </p>
                </div>
            </div>

            {/* Floating particles effect */}
            <div className="absolute inset-0 pointer-events-none">
                {[...Array(20)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute w-1 h-1 bg-brand-accent/30 rounded-full"
                        style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            animation: `float ${5 + Math.random() * 10}s ease-in-out infinite`,
                            animationDelay: `${Math.random() * 5}s`
                        }}
                    />
                ))}
            </div>

            {/* SEO Meta (for 404 page) */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        "@context": "https://schema.org",
                        "@type": "WebPage",
                        "name": "404 - Page Not Found",
                        "description": "The requested page could not be found. Explore our site to discover insights on Generative Engine Optimization.",
                        "url": window.location.href,
                        "isPartOf": {
                            "@type": "WebSite",
                            "@id": "https://anoteroslogos.com/#website"
                        }
                    })
                }}
            />
        </div>
    );
};

export default NotFound;
