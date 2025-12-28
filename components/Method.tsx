import React, { forwardRef } from 'react';
import AnimatedSection from './AnimatedSection';
import { Database, Shield, Network, Boxes } from 'lucide-react';

interface Pillar {
    icon: React.ElementType;
    title: string;
    userFacing: string;
    systems: Array<{
        name: string;
        description: string;
    }>;
    technologies: Array<{
        name: string;
        spec?: string;
    }>;
    outcome: string;
    stats?: string;
}

const Method = forwardRef<HTMLElement>((_props, ref) => {
    const pillars: Pillar[] = [
        {
            icon: Database,
            title: 'Smart Content Analysis',
            userFacing: 'We analyze your website and transform it into AI-friendly knowledge that search engines and AI assistants can easily understand and cite.',
            systems: [
                {
                    name: 'Multi-Platform Scoring',
                    description: 'Track your visibility across ChatGPT, Claude, Perplexity, and Gemini in real-time'
                },
                {
                    name: 'Knowledge Graph',
                    description: 'Build connections between your content and industry topics to increase authority'
                },
                {
                    name: 'Citation Tracking',
                    description: 'See exactly which content drives AI citations and measure your ROI'
                },
                {
                    name: 'Predictive Intelligence',
                    description: 'Get recommendations on what content to create next for maximum AI visibility'
                }
            ],
            technologies: [
                { name: 'Real-time Analysis' },
                { name: 'Smart Recommendations' },
                { name: 'ROI Attribution' },
                { name: 'Continuous Learning' }
            ],
            outcome: 'Your content becomes AI-discoverable'
        },
        {
            icon: Shield,
            title: 'Verified Trust & Authenticity',
            userFacing: 'Cryptographic proof that your content is authentic and trustworthy, making AI systems more likely to cite you as a reliable source.',
            systems: [
                {
                    name: 'Digital Signatures',
                    description: 'Every piece of content gets a unique cryptographic signature proving its authenticity'
                },
                {
                    name: 'Trust Network',
                    description: 'Build verifiable trust relationships with other authoritative sources in your industry'
                },
                {
                    name: 'Authority Scoring',
                    description: 'Your trust score increases as more AI systems cite your verified content'
                },
                {
                    name: 'Fast Verification',
                    description: 'AI systems can instantly verify your content authenticity without delays'
                }
            ],
            technologies: [
                { name: 'Cryptographic Signatures' },
                { name: 'Trust Verification' },
                { name: 'Authority Tracking' },
                { name: 'Instant Validation' }
            ],
            outcome: 'AI systems trust your content',
            stats: 'Verified by 7-node trust network'
        },
        {
            icon: Network,
            title: 'AI Agent Ecosystem',
            userFacing: 'Connect directly with AI agents and get paid when they use your content, creating a new revenue stream from AI citations.',
            systems: [
                {
                    name: 'Micropayments',
                    description: 'Receive automatic payments in USDC when AI agents cite your content'
                },
                {
                    name: 'Agent Discovery',
                    description: 'AI agents can easily find and connect with your content through standardized protocols'
                },
                {
                    name: 'Contribution Rewards',
                    description: 'Earn rewards based on how valuable your content is to the AI ecosystem'
                },
                {
                    name: 'Network Effects',
                    description: 'As more agents join, your content reaches more AI systems automatically'
                }
            ],
            technologies: [
                { name: 'Crypto Payments' },
                { name: 'Agent Protocol' },
                { name: 'Reward System' },
                { name: 'Network Growth' }
            ],
            outcome: 'Monetize your AI citations',
            stats: 'Connected to 1000+ AI agents'
        },
        {
            icon: Boxes,
            title: 'Seamless Integration',
            userFacing: 'Works with your existing tools and platforms. No technical expertise required - we handle all the complex AI integration for you.',
            systems: [
                {
                    name: 'One-Click Setup',
                    description: 'Connect your website in minutes with our simple integration process'
                },
                {
                    name: 'Universal Compatibility',
                    description: 'Works with WordPress, Shopify, custom sites, and all major platforms'
                },
                {
                    name: 'Auto-Discovery',
                    description: 'AI systems automatically find and index your content without manual work'
                },
                {
                    name: 'Developer-Friendly',
                    description: 'Full API access for custom integrations and advanced use cases'
                }
            ],
            technologies: [
                { name: 'Simple Setup' },
                { name: 'Platform Agnostic' },
                { name: 'Auto-Indexing' },
                { name: 'Full API Access' }
            ],
            outcome: 'Start getting AI citations today',
            stats: 'Works with any website platform'
        }
    ];

    return (
        <section 
            ref={ref} 
            id="method" 
            aria-label="Platform Architecture" 
            className="relative py-24 md:py-40 lg:py-48 overflow-hidden"
        >
            {/* Background effects */}
            <div className="absolute inset-0 z-0" aria-hidden="true">
                <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.02)_1px,transparent_1px)] bg-[size:48px_48px] opacity-30"></div>
                <div className="absolute top-1/3 left-1/4 w-[600px] h-[600px] bg-brand-accent/5 rounded-full blur-3xl"></div>
                <div className="absolute bottom-1/3 right-1/4 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-3xl"></div>
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-6">
                <AnimatedSection>
                    <div className="text-center mb-16 md:mb-20">
                        {/* Badge */}
                        <div className="inline-flex items-center gap-2.5 px-5 py-2.5 mb-8 bg-gradient-to-r from-brand-accent/10 via-brand-accent/5 to-transparent border border-brand-accent/20 rounded-full backdrop-blur-sm hover:border-brand-accent/40 transition-all duration-300">
                            <svg className="w-4 h-4 text-brand-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            <span className="font-mono text-xs tracking-[0.15em] uppercase text-brand-accent/90 font-medium">
                                How It Works
                            </span>
                        </div>

                        <h2 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.1] tracking-tight mb-6">
                            <span className="bg-gradient-to-r from-white via-brand-accent to-white bg-clip-text text-transparent">
                                Four Pillars of AI Visibility
                            </span>
                        </h2>
                        
                        <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-white/70 max-w-3xl mx-auto leading-relaxed">
                            Everything you need to dominate AI search results and get cited by ChatGPT, Claude, Perplexity, and more.
                        </p>
                    </div>
                </AnimatedSection>

                {/* Pillars Grid */}
                <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {pillars.map((pillar, index) => (
                        <AnimatedSection key={pillar.title} delay={index * 100}>
                            <article 
                                className="group relative h-full bg-gradient-to-br from-brand-bg via-brand-bg to-brand-secondary/10 p-8 md:p-10 rounded-2xl border border-brand-secondary/30 hover:border-brand-accent/50 transition-all duration-500 overflow-hidden"
                                aria-label={pillar.title}
                            >
                                {/* Gradient overlay */}
                                <div className="absolute inset-0 bg-gradient-to-br from-brand-accent/0 via-brand-accent/5 to-brand-accent/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                                
                                {/* Corner accent */}
                                <div className="absolute -top-12 -right-12 w-32 h-32 bg-brand-accent/10 rounded-full blur-2xl group-hover:bg-brand-accent/20 transition-colors duration-500"></div>

                                <div className="relative z-10">
                                    {/* Header */}
                                    <div className="flex items-start mb-6">
                                        <div className="relative">
                                            <div className="absolute inset-0 bg-brand-accent/30 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                                            <div className="relative w-16 h-16 rounded-xl bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center group-hover:bg-brand-accent/20 group-hover:border-brand-accent/40 group-hover:scale-110 transition-all duration-300">
                                                <pillar.icon className="h-8 w-8 text-brand-accent" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Title */}
                                    <h3 className="font-display text-2xl md:text-3xl font-bold mb-3 group-hover:text-brand-accent transition-colors duration-300">
                                        {pillar.title}
                                    </h3>

                                    {/* User-facing description */}
                                    <p className="text-sm md:text-base text-white/70 group-hover:text-white/90 leading-relaxed mb-6 transition-colors duration-300">
                                        {pillar.userFacing}
                                    </p>

                                    {/* Systems list */}
                                    <div className="mb-6 space-y-3">
                                        <div className="text-xs font-mono uppercase text-brand-accent/40 mb-3">Core Systems</div>
                                        {pillar.systems.map((system) => (
                                            <div key={system.name} className="group/system">
                                                <div className="mb-1">
                                                    <span className="text-sm font-semibold text-white/90 group-hover/system:text-brand-accent transition-colors">
                                                        {system.name}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-white/50 leading-relaxed">
                                                    {system.description}
                                                </p>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Technologies */}
                                    <div className="mb-6">
                                        <div className="text-xs font-mono uppercase text-brand-accent/40 mb-2">Key Technologies</div>
                                        <div className="flex flex-wrap gap-2">
                                            {pillar.technologies.map((tech) => (
                                                <span
                                                    key={tech.name}
                                                    className="px-2.5 py-1 text-xs font-mono rounded-md bg-brand-accent/5 text-brand-accent/70 border border-brand-accent/10 group-hover:bg-brand-accent/10 group-hover:text-brand-accent transition-all duration-300"
                                                    title={tech.spec}
                                                >
                                                    {tech.name}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Outcome */}
                                    <div className="p-3 rounded-lg bg-gradient-to-br from-brand-accent/5 to-transparent border border-brand-accent/10 group-hover:border-brand-accent/20 transition-all duration-300">
                                        <div className="flex items-center gap-2 text-xs text-brand-accent/80 font-medium mb-2">
                                            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <span>{pillar.outcome}</span>
                                        </div>
                                        {pillar.stats && (
                                            <div className="text-xs text-white/40 font-mono">
                                                {pillar.stats}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </article>
                        </AnimatedSection>
                    ))}
                </div>
            </div>
        </section>
    );
});

Method.displayName = 'Method';

export default Method;
