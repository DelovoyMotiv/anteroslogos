import React from 'react';

interface TeamMember {
    name: string;
    role: string;
    expertise: string[];
    description: string;
    email?: string;
}

const Team: React.FC = () => {
    const team: TeamMember[] = [
        {
            name: "The Anóteros Lógos Research Team",
            role: "GEO Strategy & Implementation",
            expertise: [
                "Generative Engine Optimization",
                "Knowledge Graph Architecture",
                "Semantic Web Technologies",
                "AI Systems Integration",
                "Digital Authority Engineering"
            ],
            description: "A collective of experts specializing in the emerging field of Generative Engine Optimization. Our team combines deep technical knowledge of AI systems, semantic web standards, and strategic brand positioning to architect digital authority for forward-thinking organizations.",
            email: "contact@anoteroslogos.com"
        }
    ];

    const generateStructuredData = () => {
        return {
            "@context": "https://schema.org",
            "@graph": team.map((member, index) => ({
                "@type": "Person",
                "@id": `https://anoteroslogos.com/#person-${index + 1}`,
                "name": member.name,
                "jobTitle": member.role,
                "knowsAbout": member.expertise,
                "description": member.description,
                ...(member.email && { "email": member.email }),
                "worksFor": {
                    "@type": "Organization",
                    "@id": "https://anoteroslogos.com/#organization",
                    "name": "Anóteros Lógos"
                },
                "memberOf": {
                    "@type": "Organization",
                    "@id": "https://anoteroslogos.com/#organization"
                }
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

            <section id="team" className="relative py-24 md:py-32 bg-brand-bg overflow-hidden">
                {/* Background */}
                <div className="absolute inset-0 opacity-20">
                    <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-brand-accent/10 rounded-full blur-3xl animate-pulse-slow"></div>
                </div>

                <div className="relative z-10 max-w-5xl mx-auto px-6">
                    {/* Header */}
                    <div className="text-center mb-16">
                        <div className="inline-block mb-4">
                            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-accent/10 border border-brand-accent/30 text-brand-accent text-sm font-mono">
                                <span className="w-2 h-2 bg-brand-accent rounded-full animate-pulse"></span>
                                Our Team
                            </span>
                        </div>
                        <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold mb-6 bg-gradient-to-br from-white via-brand-text to-brand-text/70 bg-clip-text text-transparent leading-tight">
                            Architects of Authority
                        </h2>
                        <p className="text-lg md:text-xl text-brand-text/70 max-w-3xl mx-auto leading-relaxed">
                            Experts engineering the future of digital presence through AI-first optimization.
                        </p>
                    </div>

                    {/* Team Members */}
                    <div className="space-y-8">
                        {team.map((member, index) => (
                            <article
                                key={index}
                                className="group bg-gradient-to-br from-brand-secondary/10 to-brand-secondary/5 backdrop-blur-sm border border-brand-secondary/20 rounded-2xl p-8 md:p-10 hover:border-brand-accent/40 transition-all duration-300 hover:shadow-2xl hover:shadow-brand-accent/10"
                                itemScope
                                itemType="https://schema.org/Person"
                            >
                                {/* Name & Role */}
                                <div className="mb-6">
                                    <h3 
                                        className="font-display text-2xl md:text-3xl font-bold text-white mb-2 group-hover:text-brand-accent transition-colors duration-300"
                                        itemProp="name"
                                    >
                                        {member.name}
                                    </h3>
                                    <p 
                                        className="text-brand-accent text-lg font-semibold"
                                        itemProp="jobTitle"
                                    >
                                        {member.role}
                                    </p>
                                </div>

                                {/* Description */}
                                <p 
                                    className="text-brand-text/80 leading-relaxed mb-6"
                                    itemProp="description"
                                >
                                    {member.description}
                                </p>

                                {/* Expertise */}
                                <div className="mb-6">
                                    <h4 className="text-sm text-brand-text/50 uppercase tracking-wider mb-3 font-semibold">
                                        Areas of Expertise
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                        {member.expertise.map((skill, idx) => (
                                            <span
                                                key={idx}
                                                className="text-sm px-4 py-2 rounded-full bg-brand-accent/10 text-brand-accent border border-brand-accent/30"
                                                itemProp="knowsAbout"
                                            >
                                                {skill}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                {/* Contact */}
                                {member.email && (
                                    <div className="pt-6 border-t border-brand-secondary/20">
                                        <a
                                            href={`mailto:${member.email}`}
                                            className="inline-flex items-center gap-2 text-brand-accent hover:text-blue-400 transition-colors duration-300"
                                            itemProp="email"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                            </svg>
                                            {member.email}
                                        </a>
                                    </div>
                                )}

                                {/* Metadata for schema */}
                                <meta itemProp="worksFor" content="Anóteros Lógos" />
                            </article>
                        ))}
                    </div>

                    {/* CTA */}
                    <div className="mt-16 text-center">
                        <p className="text-brand-text/60 mb-6">
                            Interested in joining our mission to redefine digital authority?
                        </p>
                        <a
                            href="#contact"
                            className="inline-flex items-center gap-2 bg-brand-accent hover:bg-blue-500 text-white px-8 py-4 rounded-full font-semibold transition-all duration-300 hover:shadow-lg hover:shadow-brand-accent/30 hover:-translate-y-1"
                        >
                            Get in Touch
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

export default Team;
