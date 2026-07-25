import React from 'react';
import { CAPABILITY_KEYWORDS } from '../data/services';

/**
 * Continuous capability marquee. A single row duplicated so the CSS
 * translate(-50%) loop is seamless.
 */
const Marquee: React.FC = () => (
    <section
        aria-label="Capabilities"
        className="relative py-6 border-y border-white/[0.06] overflow-hidden select-none"
    >
        <div className="flex w-max animate-marquee will-change-transform">
            {[0, 1].map((dup) => (
                <div key={dup} className="flex items-center" aria-hidden={dup === 1}>
                    {CAPABILITY_KEYWORDS.map((item) => (
                        <div key={`${dup}-${item}`} className="flex items-center">
                            <span className="px-8 font-mono text-xs sm:text-sm tracking-[0.15em] uppercase text-brand-muted whitespace-nowrap">
                                {item}
                            </span>
                            <span className="h-1 w-1 rounded-full bg-brand-accent/50"></span>
                        </div>
                    ))}
                </div>
            ))}
        </div>
    </section>
);

export default Marquee;
