import { useState, useEffect, forwardRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Logo } from './Icons';

interface HeaderProps {
    onMethodClick?: () => void;
    onClientsClick?: () => void;
    onInsightsClick?: () => void;
    onTeamClick?: () => void;
    onContactClick?: () => void;
}

const Header = forwardRef<HTMLElement, HeaderProps>(({ onMethodClick, onContactClick }, ref) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [scrolled, setScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const isHomePage = location.pathname === '/';

    const handleLogoClick = () => {
        if (isHomePage) {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        } else {
            navigate('/');
        }
    };

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 50);
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const menuItems = [
        { label: 'Method', onClick: onMethodClick || (() => navigate('/')), isScroll: true },
        { label: 'GEO vs SEO', onClick: () => navigate('/geo-vs-seo'), isScroll: false },
        { label: 'GEO Audit', onClick: () => navigate('/geo-audit'), isScroll: false, highlight: true },
        { label: 'Knowledge Base', onClick: () => navigate('/knowledge-base'), isScroll: false },
        { label: 'Blog', onClick: () => navigate('/blog'), isScroll: false },
        { label: 'Investors', onClick: () => navigate('/investors'), isScroll: false },
    ];

    return (
        <header ref={ref} className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? 'bg-brand-bg/85 backdrop-blur-xl shadow-2xl shadow-black/30 border-b border-white/5' : isHomePage ? 'bg-transparent' : 'bg-brand-bg/95 backdrop-blur-xl border-b border-white/5'}`}>
            <nav className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
                {/* Logo */}
                <button onClick={handleLogoClick} aria-label="Anóteros Lógos" className="group flex items-center cursor-pointer">
                    <div className="flex items-center gap-2.5 sm:gap-3 transition-all duration-300 group-hover:scale-105">
                        <Logo className="h-7 w-7 sm:h-8 sm:w-8 flex-shrink-0 transition-transform duration-300" />
                        <span className="font-display text-lg sm:text-xl md:text-2xl font-semibold tracking-tight bg-gradient-to-r from-brand-text to-brand-text/70 bg-clip-text text-transparent whitespace-nowrap">Anóteros Lógos</span>
                    </div>
                </button>

                {/* Desktop Navigation */}
                <div className="hidden md:flex items-center gap-6 lg:gap-8">
                    {menuItems.map((item) => (
                        <button
                            key={item.label}
                            onClick={() => {
                                if (!item.isScroll || !isHomePage) {
                                    item.onClick?.();
                                } else {
                                    item.onClick?.();
                                }
                            }}
                            className={`transition-colors duration-300 text-sm font-medium relative group py-2 whitespace-nowrap ${
                                'highlight' in item && item.highlight 
                                    ? 'text-brand-accent hover:text-blue-400 font-semibold' 
                                    : 'text-brand-text/80 hover:text-white'
                            }`}
                        >
                            {item.label}
                            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-brand-accent transition-all duration-300 group-hover:w-full"></span>
                        </button>
                    ))}
                    <button 
                        onClick={onContactClick || (() => navigate('/'))} 
                        className="bg-brand-accent/10 hover:bg-brand-accent text-brand-accent hover:text-white px-5 py-2 rounded-full text-sm font-semibold transition-all duration-300 border border-brand-accent/30 hover:border-brand-accent hover:shadow-lg hover:shadow-brand-accent/30 hover:-translate-y-0.5 whitespace-nowrap"
                    >
                        Get Started
                    </button>
                </div>

                {/* Mobile Menu Button */}
                <button
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    className="md:hidden text-white/90 hover:text-white p-2 rounded-lg hover:bg-white/5 transition-all duration-300"
                    aria-label="Toggle menu"
                    aria-expanded={mobileMenuOpen}
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                        {mobileMenuOpen ? (
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                        )}
                    </svg>
                </button>
            </nav>

            {/* Mobile Menu */}
            {mobileMenuOpen && (
                <div className="md:hidden bg-brand-bg/95 backdrop-blur-xl border-t border-white/5 shadow-xl shadow-black/50 animate-fade-in-up">
                    <div className="px-4 sm:px-6 py-6 space-y-2 max-w-7xl mx-auto">
                        {menuItems.map((item) => (
                            <button
                                key={item.label}
                                onClick={() => {
                                    item.onClick?.();
                                    setMobileMenuOpen(false);
                                }}
                                className="block w-full text-left text-white/80 hover:text-white hover:bg-white/5 transition-all duration-300 py-3 px-4 rounded-lg font-medium"
                            >
                                {item.label}
                            </button>
                        ))}
                        <div className="pt-2">
                            <button 
                                onClick={() => {
                                    onContactClick?.();
                                    setMobileMenuOpen(false);
                                }}
                                className="w-full bg-brand-accent hover:bg-blue-500 text-white px-6 py-3.5 rounded-full text-sm font-semibold transition-all duration-300 shadow-lg shadow-brand-accent/30"
                            >
                                Get Started
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </header>
    );
});

Header.displayName = 'Header';

export default Header;
