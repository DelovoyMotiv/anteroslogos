import React, { useState, useEffect, useRef } from 'react';
import AnimatedSection from './AnimatedSection';

interface StatItemProps {
    value: number;
    suffix?: string;
    prefix?: string;
    label: string;
    duration?: number;
}

const StatItem: React.FC<StatItemProps> = ({ value, suffix = '', prefix = '', label, duration = 2000 }) => {
    const [count, setCount] = useState(0);
    const [isVisible, setIsVisible] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && !isVisible) {
                    setIsVisible(true);
                }
            },
            { threshold: 0.3 }
        );

        const currentRef = ref.current;
        if (currentRef) {
            observer.observe(currentRef);
        }

        return () => {
            if (currentRef) {
                observer.unobserve(currentRef);
            }
        };
    }, [isVisible]);

    useEffect(() => {
        if (!isVisible) return;

        const startTime = Date.now();

        const updateCount = () => {
            const now = Date.now();
            const progress = Math.min((now - startTime) / duration, 1);
            
            // Easing function for smooth animation
            const easeOutQuart = 1 - Math.pow(1 - progress, 4);
            const currentCount = Math.floor(easeOutQuart * value);
            
            setCount(currentCount);

            if (progress < 1) {
                requestAnimationFrame(updateCount);
            }
        };

        requestAnimationFrame(updateCount);
    }, [isVisible, value, duration]);

    return (
        <div ref={ref} className="text-center">
            <div className="text-5xl md:text-6xl lg:text-7xl font-display font-bold bg-gradient-to-br from-brand-accent via-brand-text to-brand-accent bg-clip-text text-transparent mb-4">
                {prefix}{count}{suffix}
            </div>
            <div className="text-lg md:text-xl text-brand-text/60 font-medium tracking-wide">
                {label}
            </div>
        </div>
    );
};

const Stats: React.FC = () => {
    const stats = [
        { value: 3, suffix: '+', label: 'Years in AI Optimization' },
        { value: 50, suffix: '+', label: 'Brands Transformed' },
        { value: 2, suffix: 'M+', label: 'AI Citations Earned' },
        { value: 92, suffix: '%', label: 'Client Retention Rate' },
    ];

    return (
        <section className="py-32 md:py-40 relative overflow-hidden">
            {/* Subtle background gradient */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-brand-accent/5 to-transparent"></div>
            
            <div className="max-w-7xl mx-auto px-6 relative z-10">
                <AnimatedSection>
                    <div className="text-center mb-20">
                        <h3 className="font-mono text-sm tracking-widest uppercase text-brand-accent mb-6">
                            The Impact
                        </h3>
                        <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold">
                            Defining the Future of{' '}
                            <span className="text-brand-accent">Digital Authority</span>
                        </h2>
                    </div>
                </AnimatedSection>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-16">
                    {stats.map((stat, index) => (
                        <AnimatedSection key={stat.label} delay={index * 100}>
                            <StatItem {...stat} />
                        </AnimatedSection>
                    ))}
                </div>

                {/* Decorative line */}
                <AnimatedSection delay={400}>
                    <div className="mt-20 w-full h-px bg-gradient-to-r from-transparent via-brand-accent/30 to-transparent"></div>
                </AnimatedSection>
            </div>
        </section>
    );
};

export default Stats;
