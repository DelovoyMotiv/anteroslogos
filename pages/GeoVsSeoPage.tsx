import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import AnimatedSection from '../components/AnimatedSection';

const GeoVsSeoPage: React.FC = () => {
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <div className="bg-brand-bg text-brand-text font-sans antialiased">
            <Header 
                onMethodClick={() => window.location.href = '/#nicosia-method'}
                onClientsClick={() => window.location.href = '/#clients'}
                onContactClick={() => {}}
            />
            
            <main className="relative z-10">
                {/* Hero Section */}
                <section className="pb-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto" style={{ paddingTop: 'calc(var(--header-height) + 3rem)' }}>
                    <AnimatedSection>
                        <nav className="text-sm text-white/60 mb-6" aria-label="Breadcrumb">
                            <Link to="/" className="hover:text-brand-accent transition-colors">Home</Link>
                            <span className="mx-2">/</span>
                            <span className="text-white">GEO vs SEO</span>
                        </nav>
                        
                        <h1 className="font-display font-bold text-4xl sm:text-5xl lg:text-6xl leading-tight mb-6">
                            GEO vs SEO: The Evolution of Search Optimization in the AI Era
                        </h1>
                        
                        <p className="text-xl text-white/80 leading-relaxed">
                            Search is fundamentally changing. While SEO optimizes for ranking positions, 
                            Generative Engine Optimization targets something more valuable: becoming the 
                            source AI systems cite and trust. This guide explains the critical differences 
                            and why forward-thinking brands are making the shift.
                        </p>
                    </AnimatedSection>
                </section>

                {/* Quick Comparison Table */}
                <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
                    <AnimatedSection>
                        <h2 className="font-display font-bold text-3xl sm:text-4xl mb-8">
                            Quick Comparison
                        </h2>
                        
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="border-b border-white/10">
                                        <th className="text-left py-4 px-6 text-white/60 font-medium">Aspect</th>
                                        <th className="text-left py-4 px-6 text-white/90 font-semibold">Traditional SEO</th>
                                        <th className="text-left py-4 px-6 text-brand-accent font-semibold">Generative Engine Optimization</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/10">
                                    <tr>
                                        <td className="py-4 px-6 text-white/80 font-medium">Primary Goal</td>
                                        <td className="py-4 px-6 text-white/70">Rank higher in search results</td>
                                        <td className="py-4 px-6 text-white/90">Become cited source in AI responses</td>
                                    </tr>
                                    <tr>
                                        <td className="py-4 px-6 text-white/80 font-medium">Target Platform</td>
                                        <td className="py-4 px-6 text-white/70">Google, Bing search engines</td>
                                        <td className="py-4 px-6 text-white/90">ChatGPT, Claude, Perplexity, AI Overviews</td>
                                    </tr>
                                    <tr>
                                        <td className="py-4 px-6 text-white/80 font-medium">Success Metric</td>
                                        <td className="py-4 px-6 text-white/70">Rankings, traffic, click-through rate</td>
                                        <td className="py-4 px-6 text-white/90">Citation frequency, attribution, share of AI voice</td>
                                    </tr>
                                    <tr>
                                        <td className="py-4 px-6 text-white/80 font-medium">Content Focus</td>
                                        <td className="py-4 px-6 text-white/70">Keywords, backlinks, technical optimization</td>
                                        <td className="py-4 px-6 text-white/90">Authoritative statements, structured data, factual accuracy</td>
                                    </tr>
                                    <tr>
                                        <td className="py-4 px-6 text-white/80 font-medium">User Behavior</td>
                                        <td className="py-4 px-6 text-white/70">Click and visit website</td>
                                        <td className="py-4 px-6 text-white/90">Receive synthesized answer with attribution</td>
                                    </tr>
                                    <tr>
                                        <td className="py-4 px-6 text-white/80 font-medium">Competition</td>
                                        <td className="py-4 px-6 text-white/70">10 blue links, paid ads</td>
                                        <td className="py-4 px-6 text-white/90">2-5 cited sources in single response</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </AnimatedSection>
                </section>

                {/* The Fundamental Shift */}
                <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
                    <AnimatedSection>
                        <h2 className="font-display font-bold text-3xl sm:text-4xl mb-6">
                            The Fundamental Shift
                        </h2>
                        
                        <div className="space-y-6 text-lg text-white/80 leading-relaxed">
                            <p>
                                For two decades, SEO followed a simple premise: rank higher in search results 
                                to earn more clicks. Brands competed for position one, knowing that visibility 
                                in the top three results drove the majority of traffic. The game was clear, 
                                measurable, and increasingly expensive.
                            </p>
                            
                            <p>
                                AI systems changed everything. When users ask ChatGPT, Claude, or Perplexity 
                                a question, they receive a synthesized answer drawn from multiple sources. 
                                The AI does not present ten blue links. It presents a direct response, often 
                                citing two to five authoritative sources. The question is no longer where you 
                                rank, but whether you get cited at all.
                            </p>
                            
                            <p>
                                This shift represents more than a new platform. It represents a fundamental 
                                change in how information flows. Traditional search connected users to sources. 
                                Generative AI synthesizes information from sources and presents conclusions. 
                                The winners in this new paradigm are not the highest ranking pages, but the 
                                most authoritative voices that AI systems trust enough to reference.
                            </p>
                        </div>
                    </AnimatedSection>
                </section>

                {/* Traditional SEO Explained */}
                <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto bg-white/5 rounded-2xl">
                    <AnimatedSection>
                        <h2 className="font-display font-bold text-3xl sm:text-4xl mb-6">
                            Understanding Traditional SEO
                        </h2>
                        
                        <div className="space-y-6 text-lg text-white/80 leading-relaxed">
                            <p>
                                Search Engine Optimization emerged in the late 1990s as websites competed 
                                for visibility in search results. The core principle has remained consistent: 
                                optimize your content and technical infrastructure to signal relevance and 
                                authority to search engine algorithms.
                            </p>
                            
                            <h3 className="font-display font-semibold text-2xl text-white mt-8 mb-4">
                                Core Components of SEO
                            </h3>
                            
                            <p>
                                <strong className="text-white">Keyword Research and Targeting.</strong> SEO 
                                begins with identifying search terms your audience uses. You optimize pages 
                                to rank for specific keywords, balancing search volume with competition. The 
                                goal is matching your content to user intent as expressed through search queries.
                            </p>
                            
                            <p>
                                <strong className="text-white">On-Page Optimization.</strong> This includes 
                                title tags, meta descriptions, header structure, internal linking, and content 
                                quality. Every element signals to search engines what your page covers and why 
                                it deserves to rank.
                            </p>
                            
                            <p>
                                <strong className="text-white">Technical SEO.</strong> Site speed, mobile 
                                responsiveness, crawlability, and structured data help search engines understand 
                                and index your content efficiently. Technical excellence removes barriers to ranking.
                            </p>
                            
                            <p>
                                <strong className="text-white">Off-Page SEO and Link Building.</strong> Backlinks 
                                from authoritative sites signal trust and relevance. Quality backlinks remain one 
                                of the strongest ranking factors, acting as votes of confidence from the broader web.
                            </p>
                            
                            <h3 className="font-display font-semibold text-2xl text-white mt-8 mb-4">
                                The SEO Success Model
                            </h3>
                            
                            <p>
                                SEO success follows a clear path. You identify valuable keywords, create optimized 
                                content, build authoritative backlinks, and track your rankings. As rankings improve, 
                                organic traffic increases. Higher traffic typically correlates with more conversions, 
                                completing the return on investment cycle.
                            </p>
                            
                            <p>
                                This model worked because user behavior was predictable. Someone searching for 
                                information would scan results, click promising titles, and visit websites to find 
                                answers. The click was the unit of value, and rankings determined click probability.
                            </p>
                        </div>
                    </AnimatedSection>
                </section>

                {/* GEO Explained */}
                <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
                    <AnimatedSection>
                        <h2 className="font-display font-bold text-3xl sm:text-4xl mb-6">
                            Understanding Generative Engine Optimization
                        </h2>
                        
                        <div className="space-y-6 text-lg text-white/80 leading-relaxed">
                            <p>
                                Generative Engine Optimization targets a different outcome. Instead of optimizing 
                                for rank position, GEO optimizes for citation and attribution. When an AI system 
                                generates a response, it needs authoritative sources to ground its answer. GEO 
                                ensures your brand becomes that authoritative source.
                            </p>
                            
                            <h3 className="font-display font-semibold text-2xl text-white mt-8 mb-4">
                                How AI Systems Select Sources
                            </h3>
                            
                            <p>
                                Large language models use Retrieval-Augmented Generation. When you ask a question, 
                                the AI first searches its knowledge base or the web for relevant information. It 
                                retrieves several candidate passages, evaluates their relevance and authority, then 
                                synthesizes an answer while citing its sources.
                            </p>
                            
                            <p>
                                The selection process differs fundamentally from traditional search ranking. AI 
                                systems evaluate semantic relevance rather than keyword matching. They assess 
                                content authenticity, factual accuracy, and source credibility. They favor clear, 
                                quotable statements over keyword-optimized prose. Most importantly, they value 
                                comprehensive expertise over targeted keyword coverage.
                            </p>
                            
                            <h3 className="font-display font-semibold text-2xl text-white mt-8 mb-4">
                                Core Components of GEO
                            </h3>
                            
                            <p>
                                <strong className="text-white">Authoritative Content Structure.</strong> GEO 
                                content prioritizes clear, definitive statements that AI systems can confidently 
                                cite. This means writing with authority, backing claims with data, and structuring 
                                information for easy extraction and attribution.
                            </p>
                            
                            <p>
                                <strong className="text-white">Enhanced Structured Data.</strong> While SEO uses 
                                Schema.org markup for rich results, GEO extends this to comprehensive entity 
                                definition. You are not just marking up a product or article. You are defining 
                                relationships, establishing expertise, and creating machine-readable knowledge graphs.
                            </p>
                            
                            <p>
                                <strong className="text-white">Experience, Expertise, Authoritativeness, Trust.</strong> Google's 
                                E-E-A-T framework becomes even more critical for GEO. AI systems actively evaluate 
                                these signals when selecting sources. Demonstrating first-hand experience, displaying 
                                credentials, building authoritative backlinks, and maintaining transparency directly 
                                impact citation likelihood.
                            </p>
                            
                            <p>
                                <strong className="text-white">Semantic SEO and Topic Clusters.</strong> GEO requires 
                                comprehensive topic coverage rather than isolated keyword targeting. AI systems favor 
                                sources that demonstrate deep domain expertise through interconnected content covering 
                                all aspects of a subject.
                            </p>
                            
                            <h3 className="font-display font-semibold text-2xl text-white mt-8 mb-4">
                                The GEO Success Model
                            </h3>
                            
                            <p>
                                GEO success looks different. You establish comprehensive authority in your domain 
                                through interconnected, well-structured content. You optimize for citation rather 
                                than clicks. As AI systems begin citing your brand, you measure share of AI voice - 
                                the percentage of relevant queries where your brand appears in responses.
                            </p>
                            
                            <p>
                                The value extends beyond direct traffic. When ChatGPT cites your research in a 
                                business decision, when Claude references your framework in a technical explanation, 
                                when Perplexity attributes an insight to your brand, you establish authority that 
                                compounds over time. The AI system itself becomes a distribution channel for your 
                                expertise.
                            </p>
                        </div>
                    </AnimatedSection>
                </section>

                {/* Zero-Click Search */}
                <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto bg-white/5 rounded-2xl">
                    <AnimatedSection>
                        <h2 className="font-display font-bold text-3xl sm:text-4xl mb-6">
                            The Rise of Zero-Click Search Optimization
                        </h2>
                        
                        <div className="space-y-6 text-lg text-white/80 leading-relaxed">
                            <p>
                                Zero-click searches occur when users get their answer without clicking any result. 
                                Featured snippets, knowledge panels, and AI-generated summaries all contribute to 
                                this trend. Studies show that over 50% of Google searches now end without a click 
                                to another website.
                            </p>
                            
                            <p>
                                Traditional SEO treated zero-click results with ambivalence. Yes, your content 
                                might appear in a featured snippet, but you lose the click and the opportunity to 
                                engage the visitor on your site. Many brands viewed zero-click as a threat to their 
                                traffic-based business models.
                            </p>
                            
                            <p>
                                GEO embraces zero-click reality. If users increasingly consume information through 
                                AI-synthesized answers, the goal shifts from driving clicks to earning attribution. 
                                When your brand is cited as the source, even without a click, you build awareness, 
                                credibility, and authority. Over time, this attribution compounds into brand equity 
                                that transcends any single interaction.
                            </p>
                            
                            <p>
                                Zero-click optimization requires different content strategies. Instead of teasing 
                                information to encourage clicks, you provide clear, complete answers that AI systems 
                                can confidently cite. Instead of gating expertise, you demonstrate it openly, trusting 
                                that authority and attribution will drive long-term value.
                            </p>
                        </div>
                    </AnimatedSection>
                </section>

                {/* When to Use Each */}
                <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
                    <AnimatedSection>
                        <h2 className="font-display font-bold text-3xl sm:text-4xl mb-6">
                            When to Use SEO vs GEO
                        </h2>
                        
                        <div className="space-y-8 text-lg text-white/80 leading-relaxed">
                            <div>
                                <h3 className="font-display font-semibold text-2xl text-white mb-4">
                                    Scenarios Where Traditional SEO Still Dominates
                                </h3>
                                
                                <p className="mb-4">
                                    <strong className="text-white">Transactional Search Intent.</strong> When users 
                                    search with clear purchase intent, they want to visit websites, compare options, 
                                    and complete transactions. E-commerce and lead generation still rely heavily on 
                                    traditional SEO to drive qualified traffic to conversion-optimized pages.
                                </p>
                                
                                <p className="mb-4">
                                    <strong className="text-white">Local Search.</strong> Finding nearby businesses, 
                                    checking hours, reading reviews - local search remains click-driven. Google Maps 
                                    integration and local pack optimization continue to deliver direct business value 
                                    through traditional SEO channels.
                                </p>
                                
                                <p>
                                    <strong className="text-white">Visual and Media Search.</strong> Image search, 
                                    video discovery, and visual platforms still require traditional optimization. Users 
                                    browsing Pinterest, searching YouTube, or looking for images on Google need to click 
                                    through to consume content.
                                </p>
                            </div>
                            
                            <div>
                                <h3 className="font-display font-semibold text-2xl text-white mb-4">
                                    Scenarios Where GEO Provides Maximum Value
                                </h3>
                                
                                <p className="mb-4">
                                    <strong className="text-white">Informational and Research Queries.</strong> When 
                                    users seek knowledge, explanations, or insights, AI systems increasingly provide 
                                    direct answers. Being cited as the authoritative source in these responses builds 
                                    long-term brand equity and positions you as a thought leader.
                                </p>
                                
                                <p className="mb-4">
                                    <strong className="text-white">Complex Decision-Making.</strong> B2B buyers, 
                                    enterprise software selection, strategic business decisions - these complex processes 
                                    increasingly involve consultation with AI systems. When executives ask ChatGPT for 
                                    frameworks or analysis, being the cited expert influences decisions at scale.
                                </p>
                                
                                <p className="mb-4">
                                    <strong className="text-white">Technical Documentation and Education.</strong> Developers 
                                    consulting AI coding assistants, researchers using AI for literature review, students 
                                    learning new concepts - all represent scenarios where AI citation drives real value 
                                    and establishes authority.
                                </p>
                                
                                <p>
                                    <strong className="text-white">Brand Authority Building.</strong> When your primary 
                                    goal is establishing domain expertise and thought leadership rather than immediate 
                                    conversions, GEO delivers compounding returns through repeated citations across 
                                    thousands of AI-mediated interactions.
                                </p>
                            </div>
                            
                            <div className="bg-brand-accent/10 border border-brand-accent/30 rounded-xl p-6 mt-8">
                                <h3 className="font-display font-semibold text-xl text-white mb-3">
                                    The Reality: You Need Both
                                </h3>
                                <p className="text-white/90">
                                    Most brands benefit from integrating both approaches. SEO continues to drive 
                                    transactional value and immediate conversions. GEO builds long-term authority 
                                    and influences decisions at scale. The question is not which to choose, but how 
                                    to balance resources based on your business model, audience behavior, and strategic 
                                    goals.
                                </p>
                            </div>
                        </div>
                    </AnimatedSection>
                </section>

                {/* Migration Strategy */}
                <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto bg-white/5 rounded-2xl">
                    <AnimatedSection>
                        <h2 className="font-display font-bold text-3xl sm:text-4xl mb-6">
                            Migrating from SEO to GEO: A Practical Approach
                        </h2>
                        
                        <div className="space-y-6 text-lg text-white/80 leading-relaxed">
                            <p>
                                You do not abandon SEO overnight. Instead, you evolve your strategy to incorporate 
                                GEO while maintaining existing SEO foundations. This migration follows a structured path.
                            </p>
                            
                            <h3 className="font-display font-semibold text-2xl text-white mt-8 mb-4">
                                Phase 1: Foundation Enhancement
                            </h3>
                            
                            <p>
                                Start by strengthening elements that benefit both SEO and GEO. Implement comprehensive 
                                Schema.org markup beyond basic requirements. Enhance author profiles with detailed 
                                credentials and expertise signals. Improve E-E-A-T indicators through better about pages, 
                                transparent processes, and clear authorship attribution.
                            </p>
                            
                            <p>
                                Audit existing content for factual accuracy and clarity. AI systems penalize ambiguity 
                                and reward definitive, well-sourced statements. Update content to remove hedging language, 
                                add supporting data, and structure information more clearly.
                            </p>
                            
                            <h3 className="font-display font-semibold text-2xl text-white mt-8 mb-4">
                                Phase 2: Content Transformation
                            </h3>
                            
                            <p>
                                Begin creating GEO-optimized content alongside traditional SEO content. Develop comprehensive 
                                topic cluster strategies that demonstrate deep expertise rather than targeting isolated keywords. 
                                Create pillar pages that could serve as authoritative references for AI systems.
                            </p>
                            
                            <p>
                                Focus on original research, data-driven insights, and unique frameworks. AI systems heavily 
                                favor original sources over aggregated content. Publishing primary research or novel analysis 
                                significantly increases citation probability.
                            </p>
                            
                            <h3 className="font-display font-semibold text-2xl text-white mt-8 mb-4">
                                Phase 3: Measurement and Optimization
                            </h3>
                            
                            <p>
                                Establish new metrics alongside traditional SEO KPIs. Begin tracking brand mentions in AI 
                                responses, citation frequency, and share of AI voice in your domain. These metrics require 
                                different measurement approaches, often involving systematic querying of AI platforms with 
                                domain-relevant prompts.
                            </p>
                            
                            <p>
                                Use insights from AI citation patterns to guide content strategy. Which topics earn citations? 
                                What content structures work best? How do different platforms select sources differently? Let 
                                data drive iterative optimization.
                            </p>
                            
                            <h3 className="font-display font-semibold text-2xl text-white mt-8 mb-4">
                                Phase 4: Strategic Integration
                            </h3>
                            
                            <p>
                                Fully integrate GEO into your content operations. New content gets created with both SEO and 
                                GEO in mind from the start. Content briefs include AI citation goals alongside traditional 
                                keyword targets. Success metrics balance traditional traffic and conversions with AI attribution 
                                and authority signals.
                            </p>
                            
                            <p>
                                At this stage, GEO is not a separate initiative. It is simply how you approach digital authority 
                                in an AI-mediated information landscape. Your content naturally serves both human visitors 
                                through search engines and AI systems synthesizing knowledge.
                            </p>
                        </div>
                    </AnimatedSection>
                </section>

                {/* Future Outlook */}
                <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
                    <AnimatedSection>
                        <h2 className="font-display font-bold text-3xl sm:text-4xl mb-6">
                            The Future: Search in an AI-First World
                        </h2>
                        
                        <div className="space-y-6 text-lg text-white/80 leading-relaxed">
                            <p>
                                The trajectory is clear. Information discovery increasingly happens through conversational 
                                interfaces powered by large language models. Google itself is integrating AI-generated answers 
                                directly into search results. Microsoft has tightly coupled Bing with ChatGPT. Perplexity has 
                                demonstrated that many users prefer AI answers to traditional search results.
                            </p>
                            
                            <p>
                                This does not mean traditional search disappears. It means the balance shifts. More information 
                                needs get satisfied through AI synthesis. The percentage of zero-click searches continues rising. 
                                Brands that established strong GEO foundations early will benefit from compounding authority as 
                                AI systems repeatedly cite them.
                            </p>
                            
                            <p>
                                Think of this transition like the shift from desktop to mobile. Companies that recognized mobile 
                                importance early and optimized accordingly gained years of competitive advantage. Those who 
                                dismissed mobile as a fad or waited too long to adapt paid the price in lost market position.
                            </p>
                            
                            <p>
                                GEO represents a similar inflection point. The brands investing now in becoming authoritative, 
                                citable sources for AI systems are establishing positions that will compound over years. Those 
                                who wait until AI-mediated search fully dominates will face entrenched competitors with superior 
                                authority signals.
                            </p>
                            
                            <p>
                                The question is not whether to invest in GEO. The question is how quickly you can adapt your 
                                content strategy, technical infrastructure, and measurement frameworks to succeed in this new 
                                paradigm. Every month of delay is a month your competitors use to establish stronger positions 
                                in AI knowledge bases.
                            </p>
                        </div>
                    </AnimatedSection>
                </section>

                {/* CTA Section */}
                <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
                    <AnimatedSection>
                        <div className="bg-gradient-to-br from-brand-accent/20 to-blue-500/20 border border-brand-accent/30 rounded-2xl p-8 sm:p-12">
                            <h2 className="font-display font-bold text-3xl sm:text-4xl mb-4">
                                Ready to Establish AI Authority?
                            </h2>
                            <p className="text-xl text-white/80 mb-8 leading-relaxed">
                                We help brands transition from traditional SEO to comprehensive GEO strategies. 
                                Our proprietary Nicosia Method structures your expertise for maximum AI visibility 
                                and citation frequency.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4">
                                <Link 
                                    to="/"
                                    className="inline-block px-8 py-4 bg-white text-black font-semibold rounded-full hover:bg-white/90 transition-all text-center"
                                >
                                    Explore The Nicosia Method
                                </Link>
                                <Link 
                                    to="/knowledge-base"
                                    className="inline-block px-8 py-4 border-2 border-white/20 text-white font-semibold rounded-full hover:border-white/40 hover:bg-white/5 transition-all text-center"
                                >
                                    Learn More in Knowledge Base
                                </Link>
                            </div>
                        </div>
                    </AnimatedSection>
                </section>
            </main>

            <Footer 
                onPhilosophyClick={() => window.location.href = '/#philosophy'}
                onMethodClick={() => window.location.href = '/#nicosia-method'}
                onClientsClick={() => window.location.href = '/#clients'}
                onFAQClick={() => window.location.href = '/#faq'}
                onContactClick={() => {}}
            />

            {/* Schema.org Structured Data */}
            <script type="application/ld+json">
                {JSON.stringify({
                    "@context": "https://schema.org",
                    "@type": "Article",
                    "headline": "GEO vs SEO: The Evolution of Search Optimization in the AI Era",
                    "description": "Comprehensive comparison of Generative Engine Optimization (GEO) and traditional SEO, explaining how AI-powered search is changing digital marketing strategy.",
                    "author": {
                        "@type": "Organization",
                        "name": "Anóteros Lógos",
                        "url": "https://anoteroslogos.com"
                    },
                    "publisher": {
                        "@type": "Organization",
                        "name": "Anóteros Lógos",
                        "logo": {
                            "@type": "ImageObject",
                            "url": "https://anoteroslogos.com/logo.png"
                        }
                    },
                    "datePublished": "2025-11-02",
                    "dateModified": "2025-11-02",
                    "mainEntityOfPage": {
                        "@type": "WebPage",
                        "@id": "https://anoteroslogos.com/geo-vs-seo"
                    },
                    "about": [
                        {
                            "@type": "Thing",
                            "name": "Generative Engine Optimization",
                            "description": "Optimization strategy for AI-powered search systems"
                        },
                        {
                            "@type": "Thing",
                            "name": "Search Engine Optimization",
                            "description": "Traditional optimization for search engine rankings"
                        }
                    ],
                    "keywords": "GEO, SEO, generative engine optimization, AI search, zero-click search, ChatGPT, Claude, Perplexity"
                })}
            </script>
        </div>
    );
};

export default GeoVsSeoPage;
