import React, { forwardRef } from 'react';
import AnimatedSection from './AnimatedSection';
import { Database, Shield, Network, Boxes } from 'lucide-react';

interface Pillar {
    icon: React.ElementType;
    badge: string;
    title: string;
    userFacing: string;
    systems: Array<{
        name: string;
        lines: number;
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
            badge: '10,450 lines',
            title: 'Knowledge Infrastructure',
            userFacing: 'Real-time website analysis and knowledge graph extraction optimized for AI retrieval systems.',
            systems: [
                {
                    name: 'GEO Audit Engine',
                    lines: 2131,
                    description: 'Multi-platform scoring across Perplexity, ChatGPT, Claude, and Gemini with Schema.org parsing and NER'
                },
                {
                    name: 'Knowledge Graph Engine',
                    lines: 2376,
                    description: 'Self-learning semantic graphs with bidirectional citation feedback and cross-platform authority propagation'
                },
                {
                    name: 'Causal Citation Tracer',
                    lines: 4020,
                    description: 'Counterfactual simulation using BFS/DFS + A* pathfinding for ROI attribution and visibility prediction'
                },
                {
                    name: 'Citation Intelligence',
                    lines: 1923,
                    description: 'ML-based probability scoring with ensemble models and continuous retraining from citation feedback'
                }
            ],
            technologies: [
                { name: 'RDF Graphs' },
                { name: 'A* Pathfinding' },
                { name: 'Platform Decision Emulation' },
                { name: 'Bidirectional Learning' }
            ],
            outcome: 'Machine-readable knowledge foundation'
        },
        {
            icon: Shield,
            badge: '3,180 lines',
            title: 'Cryptographic Provenance',
            userFacing: 'First production implementation of cryptographically verifiable provenance tokens for AI agent interactions.',
            systems: [
                {
                    name: 'UCPT Tokens',
                    lines: 658,
                    description: 'RFC 9052 COSE_Sign1 + RFC 8949 CBOR with Ed25519 signatures and SHA3-512 hashing for replay protection'
                },
                {
                    name: 'Byzantine Fault Tolerance',
                    lines: 3180,
                    description: 'PBFT consensus with 7-node quorum tolerating f=2 Byzantine nodes using Castro & Liskov algorithm'
                },
                {
                    name: 'Causal Consensus Oracle',
                    lines: 254,
                    description: 'Provenance-based voting weight calculated from knowledge graph depth with 95% cache hit rate'
                },
                {
                    name: 'Off-Chain Oracle',
                    lines: 280,
                    description: '10x throughput improvement via distributed LRU cache with mesh gossip protocol broadcasting'
                }
            ],
            technologies: [
                { name: 'COSE_Sign1', spec: 'RFC 9052' },
                { name: 'Ed25519 Signatures' },
                { name: 'PBFT Consensus' },
                { name: 'Trust Attestation' }
            ],
            outcome: 'Cryptographically verifiable AI claims',
            stats: '2f+1 quorum (5 of 7 nodes)'
        },
        {
            icon: Network,
            badge: '27,602 lines',
            title: 'Autonomous Agent Economy',
            userFacing: 'Production micropayments on Base L2 with contribution-based rewards solving the agent ecosystem cold-start problem.',
            systems: [
                {
                    name: 'APA Micropayments',
                    lines: 4700,
                    description: 'USDC invoicing on Base L2 with automatic detection, double-entry bookkeeping, and reorg protection'
                },
                {
                    name: 'Universal Agent Protocol',
                    lines: 7100,
                    description: 'HTTP/2 + WebSocket transport with cryptographic trust attestation and circuit breaker patterns'
                },
                {
                    name: 'A2A Protocol',
                    lines: 15433,
                    description: 'Full Linux Foundation compliance (14/14 requirements) with JSON-RPC 2.0 and SSE streaming'
                },
                {
                    name: 'Causal Contribution Credits',
                    lines: 1469,
                    description: 'Graph-theoretic reward computation with discount tiers from Bronze (25%) to Platinum (90%)'
                },
                {
                    name: 'Mesh Network',
                    lines: 5513,
                    description: 'Kademlia DHT with 160-bit node IDs, XOR distance metric, and capability-based routing'
                }
            ],
            technologies: [
                { name: 'USDC on Base L2' },
                { name: 'HTTP/2 Streaming' },
                { name: 'JSON-RPC 2.0' },
                { name: 'Kademlia DHT' }
            ],
            outcome: 'Self-sustaining agent network',
            stats: 'Supports 1000+ agents in mesh'
        },
        {
            icon: Boxes,
            badge: '2,006 lines',
            title: 'Enterprise Integration',
            userFacing: 'Direct LLM integration through industry-standard protocols with isolated execution and semantic tool discovery.',
            systems: [
                {
                    name: 'MCP Integration',
                    lines: 2006,
                    description: 'Model Context Protocol v2.0 with isolated-vm sandbox (128MB heap, 60s timeout) and automatic cleanup'
                },
                {
                    name: 'Anthropic Advanced Tool Use',
                    lines: 227,
                    description: 'Programmatic execution with semantic BM25 tool search and async function bridges'
                },
                {
                    name: 'TypeScript SDK',
                    lines: 843,
                    description: 'Production-grade client with resilience patterns, circuit breakers, and exponential backoff'
                }
            ],
            technologies: [
                { name: 'MCP v2.0' },
                { name: 'RFC 8615 Well-Known', spec: 'RFC 8615' },
                { name: 'Token Bucket Rate Limiting' },
                { name: 'SSE Streaming' }
            ],
            outcome: 'Direct LLM integration',
            stats: 'Agent card discovery via well-known endpoints'
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
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                            <span className="font-mono text-xs tracking-[0.15em] uppercase text-brand-accent/90 font-medium">
                                Platform Architecture
                            </span>
                        </div>

                        <h2 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.1] tracking-tight mb-6">
                            <span className="bg-gradient-to-r from-white via-brand-accent to-white bg-clip-text text-transparent">
                                Enterprise Infrastructure
                            </span>
                        </h2>
                        
                        <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-white/70 max-w-3xl mx-auto leading-relaxed">
                            Production-grade AI knowledge platform built on{' '}
                            <span className="text-brand-accent font-semibold">108,800 lines</span> of TypeScript across{' '}
                            <span className="text-white font-semibold">14 major systems</span>.
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
                                    <div className="flex items-start justify-between mb-6">
                                        <div className="relative">
                                            <div className="absolute inset-0 bg-brand-accent/30 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                                            <div className="relative w-16 h-16 rounded-xl bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center group-hover:bg-brand-accent/20 group-hover:border-brand-accent/40 group-hover:scale-110 transition-all duration-300">
                                                <pillar.icon className="h-8 w-8 text-brand-accent" />
                                            </div>
                                        </div>
                                        <span className="text-xs font-mono text-brand-accent/60 px-3 py-1.5 rounded-full bg-brand-accent/10 border border-brand-accent/20">
                                            {pillar.badge}
                                        </span>
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
                                                <div className="flex items-baseline gap-2 mb-1">
                                                    <span className="text-sm font-semibold text-white/90 group-hover/system:text-brand-accent transition-colors">
                                                        {system.name}
                                                    </span>
                                                    <span className="text-xs font-mono text-brand-accent/50">
                                                        {system.lines.toLocaleString()} lines
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

                {/* Platform Stats */}
                <AnimatedSection delay={400}>
                    <div className="mt-16 p-8 rounded-2xl bg-gradient-to-br from-brand-accent/5 to-transparent border border-brand-accent/10">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            <div className="text-center">
                                <div className="text-3xl md:text-4xl font-bold text-brand-accent mb-2">372</div>
                                <div className="text-xs text-white/50 uppercase tracking-wider font-mono">Files</div>
                            </div>
                            <div className="text-center">
                                <div className="text-3xl md:text-4xl font-bold text-brand-accent mb-2">108.8K</div>
                                <div className="text-xs text-white/50 uppercase tracking-wider font-mono">Lines of Code</div>
                            </div>
                            <div className="text-center">
                                <div className="text-3xl md:text-4xl font-bold text-brand-accent mb-2">14</div>
                                <div className="text-xs text-white/50 uppercase tracking-wider font-mono">Major Systems</div>
                            </div>
                            <div className="text-center">
                                <div className="text-3xl md:text-4xl font-bold text-brand-accent mb-2">7</div>
                                <div className="text-xs text-white/50 uppercase tracking-wider font-mono">PBFT Consensus Nodes</div>
                            </div>
                        </div>
                    </div>
                </AnimatedSection>
            </div>
        </section>
    );
});

Method.displayName = 'Method';

export default Method;
