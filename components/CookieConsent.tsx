import React, { useState, useEffect } from 'react';

const CookieConsent: React.FC = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [showPreferences, setShowPreferences] = useState(false);

    const [preferences, setPreferences] = useState({
        necessary: true,
        analytics: false,
        marketing: false,
    });

    useEffect(() => {
        const consent = localStorage.getItem('cookieConsent');
        if (!consent) {
            setIsVisible(true);
        }
    }, []);

    const handleAcceptAll = () => {
        const consentData = {
            necessary: true,
            analytics: true,
            marketing: true,
            timestamp: new Date().toISOString(),
        };
        localStorage.setItem('cookieConsent', JSON.stringify(consentData));
        setIsVisible(false);
    };

    const handleRejectAll = () => {
        const consentData = {
            necessary: true,
            analytics: false,
            marketing: false,
            timestamp: new Date().toISOString(),
        };
        localStorage.setItem('cookieConsent', JSON.stringify(consentData));
        setIsVisible(false);
    };

    const handleSavePreferences = () => {
        const consentData = {
            ...preferences,
            timestamp: new Date().toISOString(),
        };
        localStorage.setItem('cookieConsent', JSON.stringify(consentData));
        setIsVisible(false);
        setShowPreferences(false);
    };

    const togglePreference = (key: keyof typeof preferences) => {
        if (key === 'necessary') return; // Necessary cookies cannot be disabled
        setPreferences((prev) => ({
            ...prev,
            [key]: !prev[key],
        }));
    };

    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center pointer-events-none">
            <div className="w-full max-w-4xl mx-auto px-4 pb-4 pointer-events-auto">
                <div className="bg-brand-secondary/95 backdrop-blur-xl border border-brand-text/10 rounded-2xl shadow-2xl overflow-hidden">
                    {!showPreferences ? (
                        <div className="p-6 md:p-8">
                            <div className="flex items-start gap-4 mb-6">
                                <div className="flex-shrink-0 mt-1">
                                    <svg className="w-6 h-6 text-brand-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-xl font-display font-semibold text-brand-text mb-3">
                                        Your Privacy Matters
                                    </h3>
                                    <p className="text-sm text-brand-text/70 leading-relaxed mb-4">
                                        We use cookies and similar technologies to improve your experience on our website, analyze site traffic, and personalize content. 
                                        By clicking "Accept All", you consent to the use of all cookies as described in our{' '}
                                        <button 
                                            onClick={() => {
                                                const privacySection = document.getElementById('privacy-policy');
                                                privacySection?.scrollIntoView({ behavior: 'smooth' });
                                                setIsVisible(false);
                                            }}
                                            className="text-brand-accent hover:underline"
                                        >
                                            Privacy Policy
                                        </button>
                                        {' '}and{' '}
                                        <button 
                                            onClick={() => {
                                                const cookieSection = document.getElementById('cookie-policy');
                                                cookieSection?.scrollIntoView({ behavior: 'smooth' });
                                                setIsVisible(false);
                                            }}
                                            className="text-brand-accent hover:underline"
                                        >
                                            Cookie Policy
                                        </button>.
                                    </p>
                                    <p className="text-xs text-brand-text/50 leading-relaxed">
                                        You can customize your preferences or reject non-essential cookies. Your choice will be saved for 12 months.
                                    </p>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3">
                                <button
                                    onClick={handleAcceptAll}
                                    className="flex-1 bg-brand-accent hover:bg-blue-500 text-white px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300 hover:shadow-lg hover:shadow-brand-accent/30 hover:-translate-y-0.5"
                                >
                                    Accept All
                                </button>
                                <button
                                    onClick={handleRejectAll}
                                    className="flex-1 bg-brand-secondary/50 hover:bg-brand-secondary border border-brand-text/20 text-brand-text px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300 hover:-translate-y-0.5"
                                >
                                    Reject All
                                </button>
                                <button
                                    onClick={() => setShowPreferences(true)}
                                    className="flex-1 bg-transparent hover:bg-brand-secondary/30 border border-brand-text/20 text-brand-text/80 hover:text-brand-text px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300 hover:-translate-y-0.5"
                                >
                                    Customize
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="p-6 md:p-8">
                            <div className="mb-6">
                                <h3 className="text-xl font-display font-semibold text-brand-text mb-2">
                                    Cookie Preferences
                                </h3>
                                <p className="text-sm text-brand-text/60">
                                    Choose which cookies you allow us to use. You can change these settings at any time.
                                </p>
                            </div>

                            <div className="space-y-4 mb-6">
                                {/* Necessary Cookies */}
                                <div className="bg-brand-bg/50 border border-brand-text/10 rounded-xl p-4">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1">
                                            <h4 className="text-sm font-semibold text-brand-text mb-1">
                                                Necessary Cookies
                                            </h4>
                                            <p className="text-xs text-brand-text/60 leading-relaxed">
                                                Essential for the website to function properly. These cannot be disabled.
                                            </p>
                                        </div>
                                        <div className="flex-shrink-0">
                                            <div className="relative inline-block w-12 h-6 rounded-full bg-brand-accent opacity-50 cursor-not-allowed">
                                                <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full transition-transform"></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Analytics Cookies */}
                                <div className="bg-brand-bg/50 border border-brand-text/10 rounded-xl p-4">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1">
                                            <h4 className="text-sm font-semibold text-brand-text mb-1">
                                                Analytics Cookies
                                            </h4>
                                            <p className="text-xs text-brand-text/60 leading-relaxed">
                                                Help us understand how visitors interact with our website by collecting anonymous data.
                                            </p>
                                        </div>
                                        <div className="flex-shrink-0">
                                            <button
                                                onClick={() => togglePreference('analytics')}
                                                className={`relative inline-block w-12 h-6 rounded-full transition-colors ${
                                                    preferences.analytics ? 'bg-brand-accent' : 'bg-brand-text/20'
                                                }`}
                                            >
                                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                                                    preferences.analytics ? 'right-1' : 'left-1'
                                                }`}></div>
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Marketing Cookies */}
                                <div className="bg-brand-bg/50 border border-brand-text/10 rounded-xl p-4">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1">
                                            <h4 className="text-sm font-semibold text-brand-text mb-1">
                                                Marketing Cookies
                                            </h4>
                                            <p className="text-xs text-brand-text/60 leading-relaxed">
                                                Used to deliver personalized advertisements and track advertising effectiveness.
                                            </p>
                                        </div>
                                        <div className="flex-shrink-0">
                                            <button
                                                onClick={() => togglePreference('marketing')}
                                                className={`relative inline-block w-12 h-6 rounded-full transition-colors ${
                                                    preferences.marketing ? 'bg-brand-accent' : 'bg-brand-text/20'
                                                }`}
                                            >
                                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                                                    preferences.marketing ? 'right-1' : 'left-1'
                                                }`}></div>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3">
                                <button
                                    onClick={handleSavePreferences}
                                    className="flex-1 bg-brand-accent hover:bg-blue-500 text-white px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300 hover:shadow-lg hover:shadow-brand-accent/30 hover:-translate-y-0.5"
                                >
                                    Save Preferences
                                </button>
                                <button
                                    onClick={() => setShowPreferences(false)}
                                    className="flex-1 bg-transparent hover:bg-brand-secondary/30 border border-brand-text/20 text-brand-text/80 hover:text-brand-text px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300 hover:-translate-y-0.5"
                                >
                                    Back
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CookieConsent;
