import React from 'react';

interface SectionLabelProps {
    index?: string;
    children: React.ReactNode;
    className?: string;
}

/**
 * Editorial section label: a hairline rule, an optional index number,
 * and a mono uppercase caption. Deliberately restrained, no pills,
 * no pulsing dots.
 */
const SectionLabel: React.FC<SectionLabelProps> = ({ index, children, className = '' }) => (
    <div className={`flex items-center gap-4 ${className}`}>
        <span className="h-px w-10 bg-brand-accent/60"></span>
        {index && (
            <span className="font-mono text-xs text-brand-accent tracking-widest">{index}</span>
        )}
        <span className="font-mono text-xs tracking-[0.28em] uppercase text-brand-muted">
            {children}
        </span>
    </div>
);

export default SectionLabel;
