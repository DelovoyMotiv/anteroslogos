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
            <div className="w-full max-w-3xl mx-auto px-4 pb-4 pointer-events-auto">
                <div className="bg-brand-secondary/95 backdrop-blur-xl border border-brand-text/10 rounded-xl shadow-2xl overflow-hidden">
                    {!showPreferences ? (
                        <div className="p-4 md:p-5">
                            <div className="flex items-start gap-3 mb-3">
                                <div className="flex-shrink-0">
                                    <svg className="w-5 h-5 text-brand-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-base font-display font-semibold text-brand-text mb-2">
                                        Your Privacy Matters
                                    </h3>
                                    <p className="text-xs text-brand-text/70 leading-relaxed mb-2">
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
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-2">
                                <button
                                    onClick={handleAcceptAll}
                                    className="flex-1 bg-brand-accent hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-300 hover:shadow-lg hover:shadow-brand-accent/30"
                                >
                                    Accept All
                                </button>
                                <button
                                    onClick={handleRejectAll}
                                    className="flex-1 bg-brand-secondary/50 hover:bg-brand-secondary border border-brand-text/20 text-brand-text px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-300"
                                >
                                    Reject All
                                </button>
                                <button
                                    onClick={() => setShowPreferences(true)}
                                    className="flex-1 bg-transparent hover:bg-brand-secondary/30 border border-brand-text/20 text-brand-text/80 hover:text-brand-text px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-300"
                                >
                                    Customize
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="p-4 md:p-5">
                            <div className="mb-4">
                                <h3 className="text-base font-display font-semibold text-brand-text mb-1">
                                    Cookie Preferences
                                </h3>
                                <p className="text-xs text-brand-text/60">
                                    Choose which cookies you allow us to use.
                                </p>
                            </div>

                            <div className="space-y-3 mb-4">
                                {/* Necessary Cookies */}
                                <div className="bg-brand-bg/50 border border-brand-text/10 rounded-lg p-3">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1">
                                            <h4 className="text-xs font-semibold text-brand-text mb-0.5">
                                                Necessary Cookies
                                            </h4>
                                            <p className="text-[10px] text-brand-text/60 leading-snug">
                                                Essential for website function. Cannot be disabled.
                                            </p>
                                        </div>
                                        <div className="flex-shrink-0">
                                            <div className="relative inline-block w-10 h-5 rounded-full bg-brand-accent opacity-50 cursor-not-allowed">
                                                <div className="absolute right-0.5 top-0.5 w-4 h-4 bg-white rounded-full transition-transform"></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Analytics Cookies */}
                                <div className="bg-brand-bg/50 border border-brand-text/10 rounded-lg p-3">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1">
                                            <h4 className="text-xs font-semibold text-brand-text mb-0.5">
                                                Analytics Cookies
                                            </h4>
                                            <p className="text-[10px] text-brand-text/60 leading-snug">
                                                Help us understand visitor interactions.
                                            </p>
                                        </div>
                                        <div className="flex-shrink-0">
                                            <button
                                                onClick={() => togglePreference('analytics')}
                                                className={`relative inline-block w-10 h-5 rounded-full transition-colors ${
                                                    preferences.analytics ? 'bg-brand-accent' : 'bg-brand-text/20'
                                                }`}
                                            >
                                                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                                                    preferences.analytics ? 'right-0.5' : 'left-0.5'
                                                }`}></div>
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Marketing Cookies */}
                                <div className="bg-brand-bg/50 border border-brand-text/10 rounded-lg p-3">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1">
                                            <h4 className="text-xs font-semibold text-brand-text mb-0.5">
                                                Marketing Cookies
                                            </h4>
                                            <p className="text-[10px] text-brand-text/60 leading-snug">
                                                Personalized ads and tracking effectiveness.
                                            </p>
                                        </div>
                                        <div className="flex-shrink-0">
                                            <button
                                                onClick={() => togglePreference('marketing')}
                                                className={`relative inline-block w-10 h-5 rounded-full transition-colors ${
                                                    preferences.marketing ? 'bg-brand-accent' : 'bg-brand-text/20'
                                                }`}
                                            >
                                                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                                                    preferences.marketing ? 'right-0.5' : 'left-0.5'
                                                }`}></div>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-2">
                                <button
                                    onClick={handleSavePreferences}
                                    className="flex-1 bg-brand-accent hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-300 hover:shadow-lg hover:shadow-brand-accent/30"
                                >
                                    Save Preferences
                                </button>
                                <button
                                    onClick={() => setShowPreferences(false)}
                                    className="flex-1 bg-transparent hover:bg-brand-secondary/30 border border-brand-text/20 text-brand-text/80 hover:text-brand-text px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-300"
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
