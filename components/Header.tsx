import { useState, useEffect, forwardRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Logo } from './Icons';
import { useAuth } from '../lib/dashboard/auth-guard';
import { LogOut, LayoutDashboard, ChevronDown } from 'lucide-react';

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
    const { user, signOut } = useAuth();
    const [scrolled, setScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const isHomePage = location.pathname === '/';

    const handleLogoClick = () => {
        if (isHomePage) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            navigate('/');
        }
    };

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 40);
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        if (!userMenuOpen) return undefined;
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (!target.closest('[data-user-menu]')) {
                setUserMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [userMenuOpen]);

    const menuItems = [
        { label: 'Services', onClick: onMethodClick || (() => navigate('/')), isScroll: true },
        { label: 'Pricing', onClick: () => navigate('/pricing'), isScroll: false },
        { label: 'Knowledge Base', onClick: () => navigate('/knowledge-base'), isScroll: false },
    ];

    const handleStartProject = () => {
        if (onContactClick) {
            onContactClick();
        } else {
            navigate('/');
        }
    };

    return (
        <header
            ref={ref}
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
                scrolled
                    ? 'bg-brand-bg/80 backdrop-blur-xl border-b border-white/[0.06]'
                    : isHomePage
                    ? 'bg-transparent'
                    : 'bg-brand-bg/90 backdrop-blur-xl border-b border-white/[0.06]'
            }`}
        >
            <nav className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-16 h-20 flex items-center justify-between">
                {/* Logo */}
                <button onClick={handleLogoClick} aria-label="Anóteros Lógos" className="group flex items-center cursor-pointer">
                    <div className="flex items-center gap-3 transition-opacity duration-300 group-hover:opacity-80">
                        <Logo className="h-7 w-7 flex-shrink-0" />
                        <span className="font-display text-lg sm:text-xl font-semibold tracking-tight text-brand-text whitespace-nowrap">
                            Anóteros Lógos
                        </span>
                    </div>
                </button>

                {/* Desktop Navigation */}
                <div className="hidden md:flex items-center gap-8 lg:gap-10">
                    {menuItems.map((item) => (
                        <button
                            key={item.label}
                            onClick={() => item.onClick?.()}
                            className="relative text-sm font-medium text-brand-text/70 hover:text-brand-text transition-colors duration-300 py-2 whitespace-nowrap group"
                        >
                            {item.label}
                            <span className="absolute -bottom-0.5 left-0 w-0 h-px bg-brand-accent transition-all duration-300 group-hover:w-full"></span>
                        </button>
                    ))}

                    {user ? (
                        <div className="relative" data-user-menu>
                            <button
                                onClick={() => setUserMenuOpen(!userMenuOpen)}
                                className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 transition-all duration-300"
                            >
                                <div className="w-7 h-7 rounded-full bg-brand-accent flex items-center justify-center text-brand-bg text-sm font-semibold">
                                    {user.email?.[0].toUpperCase()}
                                </div>
                                <ChevronDown className={`w-4 h-4 text-brand-text/70 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {userMenuOpen && (
                                <div className="absolute right-0 mt-2 w-64 bg-brand-surface border border-white/10 rounded-xl shadow-2xl shadow-black/50 overflow-hidden">
                                    <div className="px-4 py-3 border-b border-white/10">
                                        <p className="text-sm text-brand-text/90 font-medium truncate">{user.email}</p>
                                    </div>
                                    <div className="py-2">
                                        <button
                                            onClick={() => { navigate('/dashboard'); setUserMenuOpen(false); }}
                                            className="w-full flex items-center gap-3 px-4 py-2.5 text-brand-text/80 hover:text-brand-text hover:bg-white/[0.04] transition-all"
                                        >
                                            <LayoutDashboard className="w-4 h-4" />
                                            <span className="text-sm">Dashboard</span>
                                        </button>
                                        <button
                                            onClick={async () => { await signOut(); navigate('/'); setUserMenuOpen(false); }}
                                            className="w-full flex items-center gap-3 px-4 py-2.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all"
                                        >
                                            <LogOut className="w-4 h-4" />
                                            <span className="text-sm">Sign Out</span>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => navigate('/auth/login')}
                                className="text-brand-text/70 hover:text-brand-text text-sm font-medium transition-colors"
                            >
                                Sign In
                            </button>
                            <button
                                onClick={handleStartProject}
                                className="bg-brand-text text-brand-bg px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 hover:bg-white hover:-translate-y-0.5 hover:shadow-[0_0_28px_-8px_rgba(57,216,230,0.6)] whitespace-nowrap"
                            >
                                Start a project
                            </button>
                        </div>
                    )}
                </div>

                {/* Mobile Menu Button */}
                <button
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    className="md:hidden text-brand-text/90 hover:text-brand-text p-2 rounded-lg hover:bg-white/[0.04] transition-all duration-300"
                    aria-label="Toggle menu"
                    aria-expanded={mobileMenuOpen}
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
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
                <div className="md:hidden bg-brand-bg/95 backdrop-blur-xl border-t border-white/[0.06]">
                    <div className="px-6 py-6 space-y-1 max-w-7xl mx-auto">
                        {menuItems.map((item) => (
                            <button
                                key={item.label}
                                onClick={() => { item.onClick?.(); setMobileMenuOpen(false); }}
                                className="block w-full text-left text-brand-text/80 hover:text-brand-text hover:bg-white/[0.04] transition-all duration-300 py-3 px-4 rounded-lg font-medium"
                            >
                                {item.label}
                            </button>
                        ))}
                        <div className="pt-3 space-y-2">
                            {user ? (
                                <>
                                    <button
                                        onClick={() => { navigate('/dashboard'); setMobileMenuOpen(false); }}
                                        className="w-full bg-white/[0.06] text-brand-text px-6 py-3.5 rounded-full text-sm font-semibold transition-all flex items-center justify-center gap-2"
                                    >
                                        <LayoutDashboard className="w-4 h-4" />
                                        Dashboard
                                    </button>
                                    <button
                                        onClick={async () => { await signOut(); navigate('/'); setMobileMenuOpen(false); }}
                                        className="w-full bg-red-500/10 text-red-400 px-6 py-3 rounded-full text-sm font-semibold transition-all flex items-center justify-center gap-2"
                                    >
                                        <LogOut className="w-4 h-4" />
                                        Sign Out
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        onClick={() => { navigate('/auth/login'); setMobileMenuOpen(false); }}
                                        className="w-full bg-white/[0.04] text-brand-text px-6 py-3 rounded-full text-sm font-semibold transition-all border border-white/10"
                                    >
                                        Sign In
                                    </button>
                                    <button
                                        onClick={() => { handleStartProject(); setMobileMenuOpen(false); }}
                                        className="w-full bg-brand-text text-brand-bg px-6 py-3.5 rounded-full text-sm font-semibold transition-all hover:bg-white"
                                    >
                                        Start a project
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </header>
    );
});

Header.displayName = 'Header';

export default Header;
