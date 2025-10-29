import React from 'react';

interface Article {
    title: string;
    description: string;
    content: string[];
    datePublished: string;
    author: string;
    category: string;
}

const Insights: React.FC = () => {
    const articles: Article[] = [
        {
            title: "The Evolution from SEO to GEO: Why Traditional Search is Obsolete",
            description: "Understanding the fundamental shift from search engine rankings to AI-powered answer synthesis",
            content: [
                "Traditional SEO optimized for 10 blue links. Users clicked, browsed, compared. The goal was ranking #1 in search results.",
                "Today, AI systems like ChatGPT, Perplexity, and Google's AI Overviews don't show links - they synthesize answers. Users receive direct responses, not lists to explore.",
                "GEO shifts the objective: instead of ranking first, become the source AI cites. This requires structured knowledge, semantic clarity, and authoritative attribution that machines can verify and trust.",
                "The competitive advantage moves from keyword optimization to entity recognition, from content volume to knowledge authority."
            ],
            datePublished: "2025-01-15",
            author: "Anóteros Lógos Research Team",
            category: "Strategic Insights"
        },
        {
            title: "How RAG Systems Select Sources: The Technical Foundation of GEO",
            description: "A deep dive into Retrieval-Augmented Generation and what makes content citation-worthy",
            content: [
                "RAG (Retrieval-Augmented Generation) is the architecture behind Perplexity AI and Google's AI Overviews. Unlike static LLMs, RAG systems search the web in real-time, retrieve relevant context, then generate grounded answers.",
                "RAG citation probability depends on: semantic relevance (Schema.org markup, knowledge graphs), content authority (E-E-A-T signals, authorship), structural clarity (headings, lists, tables), and freshness (recency, update timestamps).",
                "To optimize for RAG: create atomic, fact-dense content units; use explicit Schema.org markup for every entity and relationship; establish clear authorship and publication metadata; build topic authority through comprehensive, interconnected content clusters.",
                "RAG is not a black box. It's a sophisticated retrieval system you can engineer for. The brands that structure their knowledge today will dominate AI citations tomorrow."
            ],
            datePublished: "2025-01-20",
            author: "Anóteros Lógos Research Team",
            category: "Technical Deep Dive"
        },
        {
            title: "The Nicosia Method: Engineering Brand Authority into AI Logic",
            description: "Our proprietary framework for transforming expertise into machine-readable Lógos",
            content: [
                "The Nicosia Method™ is a three-phase process: Analysis, Synthesis, Integration.",
                "Analysis: We deconstruct your brand's expertise into core entities, relationships, and propositions. This creates your 'Lógos' - the fundamental truth structure of your authority.",
                "Synthesis: We encode this Lógos into semantic formats: knowledge graphs, Schema.org markup, entity registrations (Wikidata, industry databases), and structured content clusters designed for AI comprehension.",
                "Integration: We deploy and monitor. Your structured authority is published, indexed by RAG systems, and measured through AI citation analytics. We iteratively refine based on real-world AI responses.",
                "The result: your brand becomes the definitive source AI systems reference, not because of marketing, but because of verifiable, machine-readable expertise."
            ],
            datePublished: "2025-01-25",
            author: "Anóteros Lógos Research Team",
            category: "Methodology"
        },
        {
            title: "Measuring GEO Success: Beyond Traffic and Rankings",
            description: "New metrics for the AI-first era: citation share, sentiment analysis, and entity recognition",
            content: [
                "Traditional SEO metrics (rankings, traffic, CTR) are insufficient for GEO. AI citations don't drive traffic - they establish authority.",
                "Key GEO metrics: Citation Share (% of AI responses that reference your brand for target queries), Attribution Quality (how your brand is described and contextualized), Entity Recognition Rate (AI's ability to correctly identify and link your brand entities), Competitive Authority (who else is cited alongside you).",
                "Measurement requires systematic AI monitoring: daily queries to major LLMs (ChatGPT, Claude, Gemini, Perplexity), automated citation extraction and analysis, sentiment and context evaluation, competitive benchmarking.",
                "Success in GEO is long-term strategic positioning. You're not optimizing for clicks, you're encoding lasting authority into the knowledge layer of AI systems that will serve billions of users."
            ],
            datePublished: "2025-01-28",
            author: "Anóteros Lógos Research Team",
            category: "Metrics & Analytics"
        }
    ];

    const generateStructuredData = () => {
        return {
            "@context": "https://schema.org",
            "@graph": articles.map((article, index) => ({
                "@type": "Article",
                "@id": `https://anoteroslogos.com/insights#article-${index + 1}`,
                "headline": article.title,
                "description": article.description,
                "articleBody": article.content.join(" "),
                "datePublished": article.datePublished,
                "dateModified": article.datePublished,
                "author": {
                    "@type": "Organization",
                    "@id": "https://anoteroslogos.com/#organization",
                    "name": article.author
                },
                "publisher": {
                    "@type": "Organization",
                    "@id": "https://anoteroslogos.com/#organization",
                    "name": "Anóteros Lógos"
                },
                "articleSection": article.category,
                "about": [
                    {
                        "@type": "Thing",
                        "name": "Generative Engine Optimization"
                    },
                    {
                        "@type": "Thing",
                        "name": "AI Systems"
                    }
                ],
                "inLanguage": "en-US",
                "isAccessibleForFree": true
            }))
        };
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify(generateStructuredData())
                }}
            />

            <section id="insights" className="relative py-24 md:py-32 bg-gradient-to-b from-brand-bg to-brand-secondary/5 overflow-hidden">
                {/* Background */}
                <div className="absolute inset-0 opacity-20">
                    <div className="absolute top-0 left-1/3 w-96 h-96 bg-brand-accent/20 rounded-full blur-3xl animate-pulse-slow"></div>
                    <div className="absolute bottom-0 right-1/3 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1.5s' }}></div>
                </div>

                <div className="relative z-10 max-w-6xl mx-auto px-6">
                    {/* Header */}
                    <div className="text-center mb-16">
                        <div className="inline-block mb-4">
                            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-accent/10 border border-brand-accent/30 text-brand-accent text-sm font-mono">
                                <span className="w-2 h-2 bg-brand-accent rounded-full animate-pulse"></span>
                                Insights & Research
                            </span>
                        </div>
                        <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold mb-6 bg-gradient-to-br from-white via-brand-text to-brand-text/70 bg-clip-text text-transparent leading-tight">
                            Understanding GEO
                        </h2>
                        <p className="text-lg md:text-xl text-brand-text/70 max-w-3xl mx-auto leading-relaxed">
                            In-depth analysis and strategic insights on Generative Engine Optimization and the future of digital authority.
                        </p>
                    </div>

                    {/* Articles */}
                    <div className="space-y-8">
                        {articles.map((article, index) => (
                            <article
                                key={index}
                                id={`article-${index + 1}`}
                                className="group bg-gradient-to-br from-brand-secondary/10 via-brand-secondary/5 to-transparent backdrop-blur-sm border border-brand-secondary/20 rounded-2xl p-8 md:p-10 hover:border-brand-accent/40 transition-all duration-300 hover:shadow-2xl hover:shadow-brand-accent/10"
                                itemScope
                                itemType="https://schema.org/Article"
                            >
                                {/* Category & Date */}
                                <div className="flex flex-wrap items-center gap-3 mb-4">
                                    <span className="text-xs font-mono px-3 py-1 rounded-full bg-brand-accent/20 text-brand-accent border border-brand-accent/30">
                                        {article.category}
                                    </span>
                                    <time 
                                        className="text-sm text-brand-text/50"
                                        dateTime={article.datePublished}
                                        itemProp="datePublished"
                                    >
                                        {new Date(article.datePublished).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                                    </time>
                                </div>

                                {/* Title */}
                                <h3 
                                    className="font-display text-2xl md:text-3xl font-bold text-white mb-4 group-hover:text-brand-accent transition-colors duration-300"
                                    itemProp="headline"
                                >
                                    {article.title}
                                </h3>

                                {/* Description */}
                                <p 
                                    className="text-brand-text/90 text-lg mb-6 italic"
                                    itemProp="description"
                                >
                                    {article.description}
                                </p>

                                {/* Content */}
                                <div 
                                    className="space-y-4 text-brand-text/80 leading-relaxed"
                                    itemProp="articleBody"
                                >
                                    {article.content.map((paragraph, idx) => (
                                        <p key={idx}>{paragraph}</p>
                                    ))}
                                </div>

                                {/* Author */}
                                <div className="mt-6 pt-6 border-t border-brand-secondary/20">
                                    <p className="text-sm text-brand-text/60">
                                        By <span className="text-brand-accent font-semibold" itemProp="author">{article.author}</span>
                                    </p>
                                </div>

                                {/* Metadata (hidden but for schema) */}
                                <meta itemProp="publisher" content="Anóteros Lógos" />
                                <meta itemProp="inLanguage" content="en-US" />
                            </article>
                        ))}
                    </div>

                    {/* CTA */}
                    <div className="mt-16 text-center p-10 bg-gradient-to-br from-brand-secondary/10 to-brand-accent/5 border border-brand-accent/20 rounded-2xl">
                        <h3 className="font-display text-2xl md:text-3xl font-bold text-white mb-4">
                            Ready to Lead Your Industry?
                        </h3>
                        <p className="text-brand-text/70 mb-6 max-w-2xl mx-auto">
                            Let's encode your expertise into the foundational logic of AI systems. Become the source, not just a search result.
                        </p>
                        <a
                            href="#contact"
                            className="inline-flex items-center gap-2 bg-brand-accent hover:bg-blue-500 text-white px-8 py-4 rounded-full font-semibold transition-all duration-300 hover:shadow-lg hover:shadow-brand-accent/30 hover:-translate-y-1"
                        >
                            Begin Your Transformation
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                            </svg>
                        </a>
                    </div>
                </div>
            </section>
        </>
    );
};

export default Insights;
