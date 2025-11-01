import React from 'react';
import { Link } from 'react-router-dom';
import PrivacyPolicy from '../components/PrivacyPolicy';
import DigitalBackground from '../components/DigitalBackground';
import { Logo } from '../components/Icons';

const PrivacyPolicyPage: React.FC = () => {
    return (
        <div className="bg-brand-bg text-brand-text font-sans antialiased min-h-screen">
            <DigitalBackground />
            
            {/* Simple Header */}
            <header className="relative z-20 border-b border-white/5 bg-brand-bg/80 backdrop-blur-sm">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <Link to="/" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
                        <Logo className="h-8 w-auto" />
                        <span className="font-display text-xl font-semibold tracking-tight bg-gradient-to-r from-brand-text to-brand-text/70 bg-clip-text text-transparent">
                            Anóteros Lógos
                        </span>
                    </Link>
                    <Link 
                        to="/" 
                        className="text-sm text-brand-text/60 hover:text-brand-accent transition-colors"
                    >
                        ← Back to Home
                    </Link>
                </div>
            </header>

            <PrivacyPolicy />

            {/* Simple Footer */}
            <footer className="relative z-10 border-t border-white/5 bg-brand-bg/80 backdrop-blur-sm">
                <div className="max-w-7xl mx-auto px-6 py-8">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-brand-text/40">
                        <p>&copy; {new Date().getFullYear()} Anóteros Lógos. All rights reserved.</p>
                        <div className="flex items-center gap-6">
                            <Link to="/privacy-policy" className="hover:text-brand-accent transition-colors">
                                Privacy Policy
                            </Link>
                            <Link to="/cookie-policy" className="hover:text-brand-accent transition-colors">
                                Cookie Policy
                            </Link>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default PrivacyPolicyPage;
