import React from 'react';

export const Logo: React.FC<{ className?: string }> = ({ className }) => (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true" focusable="false">
        <defs>
            <linearGradient id="logoGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="currentColor" />
                <stop offset="40%" stopColor="currentColor" />
                <stop offset="60%" stopColor="#3B82F6" />
                <stop offset="100%" stopColor="#3B82F6" />
            </linearGradient>
        </defs>
        {/* Base */}
        <rect x="4" y="28" width="24" height="3" fill="currentColor" rx="1"/>
        <rect x="6" y="25" width="20" height="3" fill="currentColor" rx="1"/>
        {/* Column */}
        <rect x="12" y="10" width="8" height="15" fill="currentColor" rx="1"/>
        {/* Top platform */}
        <rect x="6" y="8" width="20" height="2" fill="currentColor" rx="1"/>
        <rect x="4" y="6" width="24" height="2" fill="currentColor" rx="1"/>
        {/* Floating particles */}
        <circle cx="16" cy="4" r="1.5" fill="#3B82F6"/>
        <circle cx="22" cy="3" r="1" fill="url(#logoGradient)"/>
        <circle cx="10" cy="2" r="0.8" fill="#3B82F6" opacity="0.8"/>
        <circle cx="18" cy="1" r="0.6" fill="currentColor" opacity="0.6"/>
    </svg>
);

export const AnalysisIcon: React.FC<{className?: string}> = ({ className = "stroke-brand-accent h-8 w-8" }) => (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true" focusable="false">
        <circle cx="20" cy="20" r="12" strokeWidth="2"/>
        <path d="M30 30L40 40" strokeWidth="2" strokeLinecap="round"/>
        <path d="M14 20C14 20 16 16 20 20C24 24 26 20 26 20" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
);

export const SynthesisIcon: React.FC<{className?: string}> = ({ className = "stroke-brand-accent h-8 w-8" }) => (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true" focusable="false">
        <path d="M8 12L20 24" strokeWidth="2" strokeLinecap="round"/>
        <path d="M40 12L28 24" strokeWidth="2" strokeLinecap="round"/>
        <path d="M24 4V24" strokeWidth="2" strokeLinecap="round"/>
        <path d="M24 24L16 34L24 44L32 34L24 24Z" strokeWidth="2" strokeLinejoin="round" className="fill-brand-accent/20"/>
    </svg>
);

export const IntegrationIcon: React.FC<{className?: string}> = ({ className = "stroke-brand-accent h-8 w-8" }) => (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true" focusable="false">
        <circle cx="24" cy="24" r="4" strokeWidth="2" className="fill-brand-accent/20"/>
        <path d="M24 14V4" strokeWidth="2" strokeLinecap="round"/>
        <path d="M24 44V34" strokeWidth="2" strokeLinecap="round"/>
        <path d="M34 24H44" strokeWidth="2" strokeLinecap="round"/>
        <path d="M4 24H14" strokeWidth="2" strokeLinecap="round"/>
        <path d="M32.4648 15.5352L39.5359 8.46411" strokeWidth="2" strokeLinecap="round"/>
        <path d="M8.46484 39.5352L15.5359 32.4641" strokeWidth="2" strokeLinecap="round"/>
    </svg>
);

export const TechIcon: React.FC<{className?: string}> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    <path d="M12 2L12 8" />
    <path d="M12 16L12 22" />
    <path d="M17 4L14 7" />
    <path d="M10 7L7 4" />
    <path d="M17 20L14 17" />
    <path d="M10 17L7 20" />
    <path d="M22 12L16 12" />
    <path d="M8 12L2 12" />
    <circle cx="12" cy="12" r="2" />
  </svg>
);

export const ThoughtLeaderIcon: React.FC<{className?: string}> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2z" />
    <path d="M12 16v-4" />
    <path d="M12 8h.01" />
    <path d="M16 10c0 4.4-4 8-4 8s-4-3.6-4-8c0-2.2 1.8-4 4-4s4 1.8 4 4z" />
  </svg>
);

export const EnterpriseIcon: React.FC<{className?: string}> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    <path d="M2 9.5l4-3 4 3 4-3 4 3 4-3" />
    <path d="M2 14.5l4-3 4 3 4-3 4 3 4-3" />
    <path d="M6 11.5v8" />
    <path d="M10 11.5v8" />
    <path d="M14 11.5v8" />
    <path d="M18 11.5v8" />
    <path d="M2 19.5h20" />
  </svg>
);