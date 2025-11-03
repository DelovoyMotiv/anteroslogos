import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import DigitalBackground from '../components/DigitalBackground';
import { Logo } from '../components/Icons';
import { knowledgeTerms, categories, KnowledgeTerm } from '../data/geoKnowledgeBase';

const KnowledgeBasePage: React.FC = () => {
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedTerm, setExpandedTerm] = useState<string | null>(null);

    const filteredTerms = useMemo(() => {
        let filtered = knowledgeTerms;

        if (selectedCategory !== 'all') {
            filtered = filtered.filter(term => term.category === selectedCategory);
        }

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(term =>
                term.term.toLowerCase().includes(query) ||
                term.definition.toLowerCase().includes(query) ||
                term.detailedExplanation.toLowerCase().includes(query)
            );
        }

        return filtered;
    }, [selectedCategory, searchQuery]);

    const generateStructuredData = () => {
        return {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "name": "GEO Knowledge Base - Generative Engine Optimization",
            "description": "Comprehensive knowledge base covering all aspects of Generative Engine Optimization, AI systems, and digital authority building",
            "publisher": {
                "@type": "Organization",
                "@id": "https://anoteroslogos.com/#organization",
                "name": "Anóteros Lógos",
                "url": "https://anoteroslogos.com"
            },
            "mainEntity": knowledgeTerms.map(term => ({
                "@type": "Question",
                "name": `What is ${term.term}?`,
                "acceptedAnswer": {
                    "@type": "Answer",
                    "text": term.detailedExplanation
                }
            }))
        };
    };

    const getCategoryIcon = (iconName: string): React.ReactElement => {
        const icons: { [key: string]: React.ReactElement } = {
            brain: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
            ),
            code: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
            ),
            robot: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                </svg>
            ),
            database: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                </svg>
            ),
            chart: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
            ),
            target: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            )
        };
        return icons[iconName] || icons.brain;
    };

    return (
        <div className="bg-brand-bg text-brand-text font-sans antialiased min-h-screen">
            <DigitalBackground />

            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify(generateStructuredData())
                }}
            />

            <header className="relative z-20 border-b border-white/5 bg-brand-bg/80 backdrop-blur-sm sticky top-0">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <Link to="/" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
                        <Logo className="h-8 w-auto" />
                        <span className="font-display text-xl font-semibold tracking-tight bg-gradient-to-r from-brand-text to-brand-text/70 bg-clip-text text-transparent">
                            Anóteros Lógos
                        </span>
                    </Link>
                    <Link 
                        to="/" 
                        className="text-sm text-brand-text/60 hover:text-brand-accent transition-colors"
                    >
                        Back to Home
                    </Link>
                </div>
            </header>

            <main className="relative z-10 pt-28 sm:pt-32 md:pt-36 lg:pt-40">
                <div className="max-w-7xl mx-auto px-6 py-8 md:py-12">
                    <div className="text-center mb-16">
                        <div className="inline-block mb-4">
                            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-accent/10 border border-brand-accent/30 text-brand-accent text-sm font-mono">
                                <span className="w-2 h-2 bg-brand-accent rounded-full animate-pulse"></span>
                                Authoritative Source
                            </span>
                        </div>
                        <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-bold mb-6 bg-gradient-to-br from-white via-brand-text to-brand-text/70 bg-clip-text text-transparent leading-tight">
                            GEO Knowledge Base
                        </h1>
                        <p className="text-lg md:text-xl text-brand-text/70 max-w-3xl mx-auto leading-relaxed mb-8">
                            The definitive resource for understanding Generative Engine Optimization, AI systems, and the future of digital authority.
                        </p>

                        <div className="max-w-2xl mx-auto">
                            <div className="relative">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                    <svg className="w-5 h-5 text-brand-text/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </div>
                                <input
                                    type="text"
                                    placeholder="Search knowledge base..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-brand-secondary/20 border border-brand-secondary/40 focus:border-brand-accent rounded-xl px-6 py-4 pl-14 text-base focus:outline-none transition-colors placeholder:text-brand-text/40"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6 mb-12">
                        <button
                            onClick={() => setSelectedCategory('all')}
                            className={`p-4 rounded-xl border transition-all duration-300 ${
                                selectedCategory === 'all'
                                    ? 'bg-brand-accent border-brand-accent text-white'
                                    : 'bg-brand-secondary/10 border-brand-secondary/20 hover:border-brand-accent/40'
                            }`}
                        >
                            <div className="flex flex-col items-center gap-2">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                                </svg>
                                <span className="text-xs font-semibold">All</span>
                            </div>
                        </button>
                        {categories.map(category => (
                            <button
                                key={category.id}
                                onClick={() => setSelectedCategory(category.id)}
                                className={`p-4 rounded-xl border transition-all duration-300 ${
                                    selectedCategory === category.id
                                        ? 'bg-brand-accent border-brand-accent text-white'
                                        : 'bg-brand-secondary/10 border-brand-secondary/20 hover:border-brand-accent/40'
                                }`}
                            >
                                <div className="flex flex-col items-center gap-2">
                                    {getCategoryIcon(category.icon)}
                                    <span className="text-xs font-semibold text-center">{category.name.split(' ')[0]}</span>
                                </div>
                            </button>
                        ))}
                    </div>

                    <div className="mb-8 text-brand-text/60 text-sm">
                        Showing {filteredTerms.length} {filteredTerms.length === 1 ? 'term' : 'terms'}
                    </div>

                    <div className="grid gap-6">
                        {filteredTerms.map((term) => {
                            const isExpanded = expandedTerm === term.id;
                            return (
                                <article
                                    key={term.id}
                                    id={term.id}
                                    className="group relative bg-gradient-to-br from-brand-secondary/10 to-brand-secondary/5 backdrop-blur-sm border border-brand-secondary/20 rounded-2xl overflow-hidden hover:border-brand-accent/40 transition-all duration-300"
                                    itemScope
                                    itemType="https://schema.org/DefinedTerm"
                                >
                                    <div className="p-6 md:p-8">
                                        <div className="flex items-start justify-between gap-4 mb-4">
                                            <div className="flex-1">
                                                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-3">
                                                    <h2 
                                                        className="font-display text-xl md:text-2xl lg:text-3xl font-bold text-white group-hover:text-brand-accent transition-colors duration-300"
                                                        itemProp="name"
                                                    >
                                                        {term.term}
                                                    </h2>
                                                    <span className="text-xs px-2 py-1 rounded-full bg-brand-accent/10 text-brand-accent border border-brand-accent/30 w-fit">
                                                        {categories.find(c => c.id === term.category)?.name}
                                                    </span>
                                                </div>
                                                <p 
                                                    className="text-brand-text/80 leading-relaxed text-base md:text-lg"
                                                    itemProp="description"
                                                >
                                                    {term.definition}
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => setExpandedTerm(isExpanded ? null : term.id)}
                                                className="flex-shrink-0 w-10 h-10 rounded-full bg-brand-accent/10 hover:bg-brand-accent/20 border border-brand-accent/30 flex items-center justify-center transition-all duration-300"
                                                aria-label={isExpanded ? 'Collapse' : 'Expand'}
                                            >
                                                <svg 
                                                    className={`w-5 h-5 text-brand-accent transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                                                    fill="none" 
                                                    stroke="currentColor" 
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </button>
                                        </div>

                                        {isExpanded && (
                                            <div className="space-y-6 animate-fadeIn">
                                                <div className="pt-6 border-t border-brand-secondary/20">
                                                    <h3 className="text-lg font-semibold text-brand-text mb-3">Detailed Explanation</h3>
                                                    <p className="text-brand-text/70 leading-relaxed">
                                                        {term.detailedExplanation}
                                                    </p>
                                                </div>

                                                {term.examples && term.examples.length > 0 && (
                                                    <div>
                                                        <h3 className="text-lg font-semibold text-brand-text mb-3">Examples</h3>
                                                        <ul className="space-y-2">
                                                            {term.examples.map((example, idx) => (
                                                                <li key={idx} className="flex items-start gap-3">
                                                                    <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-brand-accent mt-2"></span>
                                                                    <span className="text-brand-text/70">{example}</span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}

                                                {term.technicalDetails && (
                                                    <div className="bg-brand-bg/50 border border-brand-accent/20 rounded-xl p-4">
                                                        <h3 className="text-lg font-semibold text-brand-accent mb-2">Technical Details</h3>
                                                        <p className="text-brand-text/70 leading-relaxed text-sm font-mono">
                                                            {term.technicalDetails}
                                                        </p>
                                                    </div>
                                                )}

                                                {term.bestPractices && term.bestPractices.length > 0 && (
                                                    <div>
                                                        <h3 className="text-lg font-semibold text-brand-text mb-3">Best Practices</h3>
                                                        <ul className="space-y-2">
                                                            {term.bestPractices.map((practice, idx) => (
                                                                <li key={idx} className="flex items-start gap-3">
                                                                    <svg className="flex-shrink-0 w-5 h-5 text-green-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                                    </svg>
                                                                    <span className="text-brand-text/70">{practice}</span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}

                                                {term.commonMistakes && term.commonMistakes.length > 0 && (
                                                    <div>
                                                        <h3 className="text-lg font-semibold text-brand-text mb-3">Common Mistakes</h3>
                                                        <ul className="space-y-2">
                                                            {term.commonMistakes.map((mistake, idx) => (
                                                                <li key={idx} className="flex items-start gap-3">
                                                                    <svg className="flex-shrink-0 w-5 h-5 text-red-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                                    </svg>
                                                                    <span className="text-brand-text/70">{mistake}</span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {term.relatedTerms && term.relatedTerms.length > 0 && (
                                            <div className="mt-6 pt-6 border-t border-brand-secondary/20">
                                                <p className="text-xs text-brand-text/50 uppercase tracking-wider mb-3 font-semibold">Related Terms</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {term.relatedTerms.map((relatedId, idx) => {
                                                        const relatedTerm = knowledgeTerms.find(t => t.id === relatedId);
                                                        if (!relatedTerm) return null;
                                                        return (
                                                            <a
                                                                key={idx}
                                                                href={`#${relatedId}`}
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    document.getElementById(relatedId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                                                    setExpandedTerm(null);
                                                                }}
                                                                className="text-xs px-3 py-1.5 rounded-full bg-brand-accent/10 text-brand-accent border border-brand-accent/30 hover:bg-brand-accent/20 hover:border-brand-accent/50 transition-all duration-300"
                                                            >
                                                                {relatedTerm.term}
                                                            </a>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-brand-accent/5 to-transparent rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
                                </article>
                            );
                        })}
                    </div>

                    {filteredTerms.length === 0 && (
                        <div className="text-center py-16">
                            <p className="text-brand-text/60 text-lg">No terms found matching your search.</p>
                        </div>
                    )}

                    <div className="mt-16 text-center bg-gradient-to-br from-brand-secondary/10 to-brand-secondary/5 border border-brand-accent/20 rounded-2xl p-12">
                        <h2 className="font-display text-3xl font-bold text-brand-text mb-4">
                            Ready to establish your brand as the definitive source?
                        </h2>
                        <p className="text-brand-text/70 mb-8 max-w-2xl mx-auto">
                            Apply these GEO principles to your brand and become the authority that AI systems cite.
                        </p>
                        <Link
                            to="/"
                            className="inline-flex items-center gap-2 bg-brand-accent hover:bg-blue-500 text-white px-8 py-4 rounded-full font-semibold transition-all duration-300 hover:shadow-lg hover:shadow-brand-accent/30 hover:-translate-y-1"
                        >
                            Start Your GEO Journey
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                            </svg>
                        </Link>
                    </div>
                </div>
            </main>

            <footer className="relative z-10 border-t border-white/5 bg-brand-bg/80 backdrop-blur-sm">
                <div className="max-w-7xl mx-auto px-6 py-8">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-brand-text/40">
                        <p>&copy; {new Date().getFullYear()} Anóteros Lógos. All rights reserved.</p>
                        <div className="flex items-center gap-6">
                            <Link to="/privacy-policy" className="hover:text-brand-accent transition-colors">
                                Privacy Policy
                            </Link>
                            <Link to="/cookie-policy" className="hover:text-brand-accent transition-colors">
                                Cookie Policy
                            </Link>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default KnowledgeBasePage;
