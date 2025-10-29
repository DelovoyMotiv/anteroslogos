import React from 'react';

interface GlossaryTerm {
    term: string;
    definition: string;
    relatedTerms?: string[];
}

const Glossary: React.FC = () => {
    const terms: GlossaryTerm[] = [
        {
            term: "Generative Engine Optimization (GEO)",
            definition: "The strategic discipline of optimizing digital content and brand presence to be selected, cited, and synthesized by AI language models in their generated responses. Unlike traditional SEO which targets search engine rankings, GEO focuses on becoming an authoritative source that AI systems reference when answering user queries.",
            relatedTerms: ["RAG", "Knowledge Graph", "Semantic SEO"]
        },
        {
            term: "The Nicosia Method™",
            definition: "A proprietary framework developed by Anóteros Lógos that structures a brand's core expertise (Lógos) into machine-readable, semantically rich formats. This method encodes brand authority directly into AI systems' foundational logic through strategic content architecture, entity management, and knowledge graph optimization.",
            relatedTerms: ["GEO", "Knowledge Graph", "Entity Optimization"]
        },
        {
            term: "RAG (Retrieval-Augmented Generation)",
            definition: "An AI architecture that combines information retrieval with text generation. RAG systems first search external knowledge bases or the web for relevant information, then use that retrieved context to generate accurate, grounded responses. Examples include Perplexity AI and Google's AI Overviews.",
            relatedTerms: ["GEO", "Knowledge Base", "AI Citations"]
        },
        {
            term: "Knowledge Graph",
            definition: "A structured representation of information that connects entities (people, places, concepts, organizations) through defined relationships. Knowledge graphs enable AI systems to understand context, relationships, and semantic meaning, making them critical for GEO implementation.",
            relatedTerms: ["Entity", "Semantic Web", "Schema.org"]
        },
        {
            term: "Entity",
            definition: "A distinct, identifiable thing or concept in the digital world - such as a person, organization, product, or idea. In GEO, proper entity management ensures AI systems can accurately identify and attribute information to your brand across different contexts and platforms.",
            relatedTerms: ["Knowledge Graph", "Wikidata", "Entity Disambiguation"]
        },
        {
            term: "Schema.org Markup",
            definition: "A collaborative vocabulary standard for structured data on the web. By embedding Schema.org markup in HTML, websites provide explicit semantic information that both search engines and AI systems can understand and use to generate accurate, contextual responses.",
            relatedTerms: ["Structured Data", "JSON-LD", "Semantic Markup"]
        },
        {
            term: "Lógos",
            definition: "From ancient Greek philosophy, meaning 'word,' 'reason,' or 'principle.' In the context of Anóteros Lógos, it represents a brand's core identity, expertise, and authoritative voice - the foundational truth that should be encoded into AI systems.",
            relatedTerms: ["Brand Authority", "Digital Identity", "The Nicosia Method™"]
        },
        {
            term: "AI Citations",
            definition: "When an AI model explicitly references or attributes information to a specific source in its generated response. Achieving consistent AI citations is the primary goal of GEO, as it establishes your brand as a recognized authority.",
            relatedTerms: ["Source Attribution", "RAG", "GEO Metrics"]
        },
        {
            term: "Semantic SEO",
            definition: "An evolution of traditional SEO that focuses on meaning and intent rather than just keywords. Semantic SEO involves creating content structured around topics, entities, and relationships - forming the foundation for effective GEO implementation.",
            relatedTerms: ["GEO", "Entity-Based SEO", "Topic Clusters"]
        },
        {
            term: "Content Authenticity",
            definition: "The verified trustworthiness and provenance of digital content. For GEO, establishing content authenticity through clear authorship attribution, publication dates, expert credentials, and source citations increases the likelihood of AI systems trusting and citing your information.",
            relatedTerms: ["E-E-A-T", "Author Authority", "Verifiable Claims"]
        }
    ];

    // Generate JSON-LD structured data for all glossary terms
    const generateStructuredData = () => {
        return {
            "@context": "https://schema.org",
            "@type": "DefinedTermSet",
            "name": "GEO Glossary - Generative Engine Optimization Terms",
            "description": "Comprehensive glossary of Generative Engine Optimization (GEO) terminology and concepts",
            "publisher": {
                "@type": "Organization",
                "@id": "https://anoteroslogos.com/#organization",
                "name": "Anóteros Lógos"
            },
            "inDefinedTermSet": "https://anoteroslogos.com/glossary",
            "hasDefinedTerm": terms.map(t => ({
                "@type": "DefinedTerm",
                "name": t.term,
                "description": t.definition,
                "inDefinedTermSet": "https://anoteroslogos.com/glossary",
                ...(t.relatedTerms && {
                    "relatedLink": t.relatedTerms.map(rt => `https://anoteroslogos.com/glossary#${rt.toLowerCase().replace(/\s+/g, '-')}`)
                })
            }))
        };
    };

    return (
        <>
            {/* Inject structured data */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify(generateStructuredData())
                }}
            />

            <section id="glossary" className="relative py-24 md:py-32 bg-brand-bg overflow-hidden">
                {/* Background Effects */}
                <div className="absolute inset-0 opacity-30">
                    <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-accent/10 rounded-full blur-3xl animate-pulse-slow"></div>
                    <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }}></div>
                </div>

                <div className="relative z-10 max-w-6xl mx-auto px-6">
                    {/* Header */}
                    <div className="text-center mb-16">
                        <div className="inline-block mb-4">
                            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-accent/10 border border-brand-accent/30 text-brand-accent text-sm font-mono">
                                <span className="w-2 h-2 bg-brand-accent rounded-full animate-pulse"></span>
                                Knowledge Base
                            </span>
                        </div>
                        <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold mb-6 bg-gradient-to-br from-white via-brand-text to-brand-text/70 bg-clip-text text-transparent leading-tight">
                            GEO Glossary
                        </h2>
                        <p className="text-lg md:text-xl text-brand-text/70 max-w-3xl mx-auto leading-relaxed">
                            Essential terminology for understanding Generative Engine Optimization and the future of digital authority.
                        </p>
                    </div>

                    {/* Glossary Grid */}
                    <div className="grid gap-6 md:grid-cols-2">
                        {terms.map((item, index) => (
                            <article
                                key={index}
                                id={item.term.toLowerCase().replace(/\s+/g, '-')}
                                className="group relative bg-gradient-to-br from-brand-secondary/10 to-brand-secondary/5 backdrop-blur-sm border border-brand-secondary/20 rounded-2xl p-6 md:p-8 hover:border-brand-accent/40 transition-all duration-300 hover:shadow-xl hover:shadow-brand-accent/5"
                                itemScope
                                itemType="https://schema.org/DefinedTerm"
                            >
                                {/* Term */}
                                <h3 
                                    className="font-display text-xl md:text-2xl font-bold text-white mb-4 group-hover:text-brand-accent transition-colors duration-300"
                                    itemProp="name"
                                >
                                    {item.term}
                                </h3>

                                {/* Definition */}
                                <p 
                                    className="text-brand-text/80 leading-relaxed mb-4"
                                    itemProp="description"
                                >
                                    {item.definition}
                                </p>

                                {/* Related Terms */}
                                {item.relatedTerms && item.relatedTerms.length > 0 && (
                                    <div className="pt-4 border-t border-brand-secondary/20">
                                        <p className="text-xs text-brand-text/50 uppercase tracking-wider mb-2 font-semibold">Related Terms</p>
                                        <div className="flex flex-wrap gap-2">
                                            {item.relatedTerms.map((related, idx) => (
                                                <a
                                                    key={idx}
                                                    href={`#${related.toLowerCase().replace(/\s+/g, '-')}`}
                                                    className="text-xs px-3 py-1 rounded-full bg-brand-accent/10 text-brand-accent border border-brand-accent/30 hover:bg-brand-accent/20 hover:border-brand-accent/50 transition-all duration-300"
                                                >
                                                    {related}
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Hover effect decoration */}
                                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-brand-accent/5 to-transparent rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
                            </article>
                        ))}
                    </div>

                    {/* CTA Footer */}
                    <div className="mt-16 text-center">
                        <p className="text-brand-text/60 mb-6">
                            Want to establish your brand as the definitive source in your industry?
                        </p>
                        <a
                            href="#contact"
                            className="inline-flex items-center gap-2 bg-brand-accent hover:bg-blue-500 text-white px-8 py-4 rounded-full font-semibold transition-all duration-300 hover:shadow-lg hover:shadow-brand-accent/30 hover:-translate-y-1"
                        >
                            Start Your GEO Journey
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

export default Glossary;
