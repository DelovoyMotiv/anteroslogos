import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from './Icons';

interface FooterProps {
    onPhilosophyClick: () => void;
    onMethodClick?: () => void;
    onClientsClick?: () => void;
    onFAQClick?: () => void;
    onContactClick?: () => void;
}

interface NavLink {
    label: string;
    onClick?: () => void;
    badge?: string;
}

interface NavColumn {
    title: string;
    links: NavLink[];
}

const Footer: React.FC<FooterProps> = ({ onPhilosophyClick, onMethodClick, onClientsClick, onFAQClick, onContactClick }) => {
    const [email, setEmail] = useState('');
    const [isSubmitted, setIsSubmitted] = useState(false);

    const handleNewsletterSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (email) {
            // TODO: Implement newsletter subscription
            console.log('Newsletter subscription:', email);
            setIsSubmitted(true);
            setTimeout(() => {
                setEmail('');
                setIsSubmitted(false);
            }, 3000);
        }
    };

    const navigationLinks: NavColumn[] = [
        { title: 'Company', links: [
            { label: 'Philosophy', onClick: onPhilosophyClick },
            { label: 'Method', onClick: onMethodClick },
            { label: 'Clients', onClick: onClientsClick },
        ]},
        { title: 'Resources', links: [
            { label: 'Insights', onClick: () => document.getElementById('insights')?.scrollIntoView({ behavior: 'smooth' }) },
            { label: 'Glossary', onClick: () => document.getElementById('glossary')?.scrollIntoView({ behavior: 'smooth' }) },
            { label: 'Team', onClick: () => document.getElementById('team')?.scrollIntoView({ behavior: 'smooth' }) },
            { label: 'FAQ', onClick: onFAQClick },
        ]},
        { title: 'Connect', links: [
            { label: 'Contact', onClick: onContactClick },
            { label: 'Careers', onClick: onContactClick, badge: 'Soon' },
            { label: 'Partner', onClick: onContactClick },
        ]},
    ];

    const socialLinks = [
        { name: 'LinkedIn', icon: 'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z', href: '#' },
        { name: 'X', icon: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z', href: 'https://x.com/anoteroslogos' },
        { name: 'GitHub', icon: 'M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12', href: '#' },
    ];

    return (
        <footer className="relative z-10 bg-brand-bg border-t border-white/5">
            {/* Top Section - Logo & CTA */}
            <div className="border-b border-white/5">
                <div className="max-w-7xl mx-auto px-6 py-16 md:py-20">
                    <div className="grid md:grid-cols-2 gap-12 items-center">
                        {/* Left - Logo & Tagline */}
                        <div>
                            <div className="flex items-center space-x-3 mb-6">
                                <Logo className="h-10 w-auto" />
                                <span className="font-display text-3xl font-semibold tracking-tight bg-gradient-to-r from-brand-text to-brand-text/70 bg-clip-text text-transparent">
                                    Anóteros Lógos
                                </span>
                            </div>
                            <p className="text-lg text-brand-text/60 max-w-md leading-relaxed">
                                Encoding expertise into the foundational logic of AI.
                            </p>
                            <p className="mt-4 text-sm text-brand-accent font-mono">
                                Don't rank. Become the source.
                            </p>
                        </div>

                        {/* Right - Newsletter */}
                        <div className="md:ml-auto max-w-md w-full">
                            <h3 className="text-xl font-display font-semibold mb-3">Stay Informed</h3>
                            <p className="text-sm text-brand-text/60 mb-6">
                                Get insights on GEO and AI authority delivered to your inbox.
                            </p>
                            {isSubmitted ? (
                                <div className="bg-brand-accent/10 border border-brand-accent/30 rounded-xl p-4 text-center">
                                    <p className="text-brand-accent">✓ Subscribed successfully!</p>
                                </div>
                            ) : (
                                <form onSubmit={handleNewsletterSubmit} className="flex gap-3">
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="your@email.com"
                                        required
                                        className="flex-1 bg-brand-secondary/20 border border-brand-secondary/40 focus:border-brand-accent rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors placeholder:text-brand-text/40"
                                    />
                                    <button
                                        type="submit"
                                        className="bg-brand-accent hover:bg-blue-500 text-white px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300 hover:shadow-lg hover:shadow-brand-accent/30 hover:-translate-y-0.5 whitespace-nowrap"
                                    >
                                        Subscribe
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Middle Section - Navigation */}
            <div className="border-b border-white/5">
                <div className="max-w-7xl mx-auto px-6 py-12 md:py-16">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
                        {navigationLinks.map((column) => (
                            <div key={column.title}>
                                <h4 className="text-sm font-semibold text-brand-text/40 uppercase tracking-wider mb-4">
                                    {column.title}
                                </h4>
                                <ul className="space-y-3">
                                    {column.links.map((link) => (
                                        <li key={link.label}>
                                            <button
                                                onClick={link.onClick}
                                                className="text-brand-text/70 hover:text-brand-accent transition-colors duration-300 text-sm flex items-center gap-2"
                                            >
                                                {link.label}
                                                {link.badge && (
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-accent/20 text-brand-accent font-mono uppercase">
                                                        {link.badge}
                                                    </span>
                                                )}
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}

                        {/* Social Links Column */}
                        <div>
                            <h4 className="text-sm font-semibold text-brand-text/40 uppercase tracking-wider mb-4">
                                Follow
                            </h4>
                            <div className="flex gap-4">
                                {socialLinks.map((social) => (
                                    <a
                                        key={social.name}
                                        href={social.href}
                                        aria-label={social.name}
                                        className="group w-10 h-10 rounded-lg bg-brand-secondary/20 border border-brand-secondary/30 hover:border-brand-accent/50 flex items-center justify-center transition-all duration-300 hover:bg-brand-accent/10 hover:-translate-y-1"
                                    >
                                        <svg className="w-5 h-5 text-brand-text/50 group-hover:text-brand-accent transition-colors duration-300" viewBox="0 0 24 24" fill="currentColor">
                                            <path d={social.icon} />
                                        </svg>
                                    </a>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Section - Legal & Copyright */}
            <div className="max-w-7xl mx-auto px-6 py-8">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-brand-text/40">
                    <div className="flex items-center gap-2">
                        <p>&copy; {new Date().getFullYear()} Anóteros Lógos</p>
                        <span className="text-brand-text/20">•</span>
                        <p>All rights reserved</p>
                    </div>
                    
                    <div className="flex items-center gap-6">
                        <Link 
                            to="/privacy-policy"
                            className="hover:text-brand-accent transition-colors duration-300"
                        >
                            Privacy Policy
                        </Link>
                        <Link 
                            to="/cookie-policy"
                            className="hover:text-brand-accent transition-colors duration-300"
                        >
                            Cookie Policy
                        </Link>
                        <p className="font-mono italic text-xs">
                            The Nicosia Method™
                        </p>
                    </div>
                </div>
            </div>

            {/* Decorative gradient line at very bottom */}
            <div className="h-1 bg-gradient-to-r from-transparent via-brand-accent/30 to-transparent"></div>
        </footer>
    );
};

export default Footer;
