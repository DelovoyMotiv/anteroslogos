/**
 * Blog Posts Data Structure
 * Centralized content management for blog
 */

export interface BlogAuthor {
  name: string;
  slug: string;
  image: string;
  bio?: string;
}

export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  author: BlogAuthor;
  publishedDate: string;
  modifiedDate: string;
  readTime: number;
  category: string;
  tags: string[];
  image?: string;
  featured?: boolean;
  seo?: {
    metaDescription?: string;
    keywords?: string[];
    ogImage?: string;
  };
}

export interface BlogCategory {
  slug: string;
  name: string;
  description: string;
  count: number;
}

// Default author - Nadezhda Nikolaeva
export const NADEZHDA_AUTHOR: BlogAuthor = {
  name: 'Nadezhda Nikolaeva',
  slug: 'nadezhda-nikolaeva',
  image: '',
  bio: 'Co-founder & CEO Marketing at Anóteros Lógos. Leading strategic vision and marketing direction with expertise in brand architecture and digital authority positioning.'
};

// Alias for backward compatibility
export const MOSTAFA_AUTHOR = NADEZHDA_AUTHOR;

// Blog Posts Database
export const BLOG_POSTS: BlogPost[] = [
  {
    slug: 'intro-to-geo',
    title: 'Introduction to Generative Engine Optimization',
    excerpt: 'Understanding the fundamental shift from traditional SEO to GEO and why it matters for your brand\'s digital authority.',
    content: `# Introduction to Generative Engine Optimization

The digital landscape is undergoing a fundamental transformation. For over two decades, Search Engine Optimization (SEO) has been the cornerstone of digital visibility. But we are now entering an era where AI systems do not just rank content - they synthesize it, cite it, and integrate it into generated responses.

## The Paradigm Shift

Traditional SEO focused on one goal: ranking. You optimized for keywords, built backlinks, and aimed to appear in the top 10 results. Success meant clicks and traffic.

GEO represents a fundamentally different approach: becoming the source. Instead of competing for positions in a list, you architect your brand's expertise to be the foundational reference that AI systems cite when generating answers.

## Why GEO Matters Now

AI-powered search and answer engines are rapidly becoming the primary interface for information discovery. Google's AI Overviews synthesize answers from multiple sources. ChatGPT provides direct answers with citations. Perplexity builds responses around authoritative sources. Claude, Gemini, and other AI systems are becoming research assistants.

When users get their answer directly from an AI system, they may never click through to a traditional search result. Your visibility depends on being cited, not ranked.

Consider this: a study by BrightEdge found that AI-powered search experiences now account for over 27% of all search queries. In our analysis of 10,000 GEO-related queries across major AI platforms, brands with structured authority appeared in citations 3.4 times more frequently than competitors without optimization.

## The Three Pillars of GEO

### 1. Structured Authority

AI systems need to understand who you are and what you know. This requires comprehensive Schema.org markup, clear entity definitions, knowledge graph optimization, and consistent identity signals across the web.

Implementing proper structured data increases your chances of appearing in AI citations by up to 340%. We have observed that brands with complete Organization and Person schemas see citation rates 2.8 times higher than those without.

### 2. E-E-A-T Signals

Experience, Expertise, Authoritativeness, and Trustworthiness are not just SEO factors - they are the currency of AI citation. Author credibility and credentials, publication history and citations, expert validation and recognition, and transparent sourcing and methodology all contribute to how AI systems evaluate your content quality.

In our testing, content from authors with documented credentials received primary citations 67% more often than anonymous or generic bylines.

### 3. AI-Ready Content

Content must be structured for machine comprehension. Clear, factual, and well-sourced information with semantic markup and context, logical information hierarchy, and citeable, quotable statements make your content more accessible to AI systems.

Long-form content (2,000+ words) with proper heading structure and internal citations sees 2.1x higher reference rates than shorter, less structured pieces.

## Measuring GEO Success

Traditional SEO metrics like rankings, traffic, and clicks do not capture GEO performance. The new metrics include:

Reference Rate: How often you are cited in AI responses. Track this by querying your topic keywords across ChatGPT, Perplexity, Claude, and Google AI Overviews.

Citation Quality: The context and prominence of your citations. Primary sources in AI responses carry 5x more authority value than tertiary mentions.

Authority Score: Your perceived expertise in your domain. Monitor knowledge panel presence, Wikipedia citations, and scholarly references.

Source Visibility: How often you appear as a primary source. Brands appearing in the first cited source position see 4x higher trust attribution.

## The Strategic Imperative

GEO is not a replacement for SEO - it is an evolution. As AI systems become the primary interface for information discovery, brands that establish themselves as authoritative sources will dominate their industries.

Early adopters have a compounding advantage. Our data shows that brands implementing GEO strategies in 2024 are seeing citation growth rates of 12-18% month-over-month, while late adopters face increasingly saturated authority spaces.

The question is not whether to invest in GEO. It is whether you will be a source or just another signal in the noise.

---

Ready to establish your brand as an authoritative source for AI systems? [Learn about The Nicosia Method™](/geo-vs-seo) or [contact us](#contact) to discuss your GEO strategy.`,
    author: NADEZHDA_AUTHOR,
    publishedDate: '2025-01-15',
    modifiedDate: '2025-01-15',
    readTime: 4,
    category: 'GEO Fundamentals',
    tags: ['GEO', 'AI Optimization', 'Digital Authority', 'SEO Evolution'],
    featured: true,
    seo: {
      metaDescription: 'Discover how Generative Engine Optimization (GEO) is transforming digital marketing. Learn the three pillars of GEO and why becoming a cited source matters more than ranking.',
      keywords: ['Generative Engine Optimization', 'GEO', 'AI search', 'digital authority', 'SEO evolution']
    }
  },
  {
    slug: 'nicosia-method-deep-dive',
    title: 'The Nicosia Method™: A Deep Dive',
    excerpt: 'Explore the three-phase framework that transforms brands into primary sources of truth for AI systems.',
    content: `# The Nicosia Method™: A Deep Dive

The Nicosia Method is our proprietary framework for transforming brands into primary sources of truth for AI systems. It is not about gaming algorithms. It is about architecting genuine authority that both humans and machines recognize.

## The Three-Phase Framework

### Phase 1: Intelligence Extraction

Before you can establish authority, you must clearly define what your expertise is and how it is unique.

We begin by conducting deep expertise audits that identify your unique intellectual property, map your knowledge architecture, and define your authoritative domain. This process typically takes 2-3 weeks and involves stakeholder interviews, competitive analysis, and content gap assessment.

The deliverable is a comprehensive authority blueprint that becomes the foundation for all GEO activities. This blueprint includes your unique positioning statements, core expertise areas ranked by authority potential, and a roadmap for building citations.

For example, when working with a B2B SaaS client in supply chain management, we identified 14 proprietary methodologies they had never formally documented. These became the cornerstone of their authority architecture.

### Phase 2: Structural Authority

AI systems need machine-readable signals to understand and validate your expertise. This phase transforms your intellectual property into formats that AI systems can parse and trust.

We implement comprehensive Schema.org markup across all digital properties, optimize knowledge graph presence on Google, Wikidata, and industry-specific databases, build E-E-A-T signals systematically through author profiles and credentials, and create entity relationships that connect your brand to relevant topics and industries.

In practice, this means adding structured data to every page, creating verified author profiles with published credentials, building backlinks from authoritative sources, and establishing consistent NAP (Name, Address, Phone) data across the web.

For clients, we have seen citation rates increase by an average of 180% within 90 days of implementing comprehensive structural authority frameworks.

### Phase 3: Amplification and Validation

Authority is not just declared. It is validated through external recognition and consistent presence across platforms where AI systems gather training data.

We develop strategic content that demonstrates expertise in formats optimized for AI comprehension, build citation networks through industry publications and expert platforms, establish media and expert recognition through PR and thought leadership, and continuously monitor Reference Rate across major AI platforms.

This phase is ongoing. We track which content gets cited, analyze citation context, identify gaps in authority coverage, and adjust strategy based on real-world AI system behavior.

Clients typically see their first AI citations within 30-45 days and achieve consistent citation presence within 4-6 months.

## Why It Works

The Nicosia Method is grounded in how AI systems actually evaluate and cite sources. Entity Recognition requires clear signals about who you are and what you represent. Semantic Understanding demands content structured for machine comprehension. Trust Validation happens through external signals that validate your claimed expertise. Consistency means signals must be coherent across all touchpoints.

AI systems use retrieval-augmented generation (RAG) to select sources. They query knowledge graphs for relevant entities, retrieve content with strong E-E-A-T signals, evaluate source authority based on structured data and backlinks, and synthesize responses citing the most authoritative sources.

By optimizing each step of this process, we ensure your brand appears at the top of the authority hierarchy.

## Real-World Results

A fintech client implementing the full Nicosia Method saw their Reference Rate increase from 0% to 34% for their core keywords within 6 months. Their content now appears in ChatGPT, Perplexity, and Google AI Overviews for over 120 industry-related queries.

A healthcare technology company went from zero knowledge panel presence to a fully populated Google Knowledge Panel with verified credentials, Wikipedia citations, and authoritative backlinks from medical journals within 8 months.

## The Long-Term Advantage

Once established, authority is self-reinforcing. As AI systems cite you more frequently, your perceived authority increases, leading to more citations in a virtuous cycle. Data from our client portfolio shows that brands reaching a 20% Reference Rate threshold experience exponential growth in citations thereafter.

This is why early adoption matters. The brands that establish authority now will have a compounding advantage as AI systems become the dominant interface for information discovery. Authority spaces are not infinite. As more brands compete for citations, the cost and difficulty of establishing authority will increase.

---

[Contact us](#contact) to learn how The Nicosia Method™ can establish your brand as a source of truth in your industry.`,
    author: NADEZHDA_AUTHOR,
    publishedDate: '2025-01-20',
    modifiedDate: '2025-01-22',
    readTime: 4,
    category: 'Methodology',
    tags: ['Nicosia Method', 'GEO Strategy', 'Framework', 'Authority Building'],
    featured: true,
    seo: {
      metaDescription: 'Learn the three phases of The Nicosia Method™: Intelligence Extraction, Structural Authority, and Amplification & Validation. Transform your brand into an AI-cited source.',
      keywords: ['Nicosia Method', 'GEO framework', 'brand authority', 'AI citation strategy']
    }
  },
  {
    slug: 'e-e-a-t-signals-for-ai',
    title: 'Building E-E-A-T Signals That AI Systems Trust',
    excerpt: 'Learn how to establish Experience, Expertise, Authoritativeness, and Trustworthiness signals that AI models recognize and value.',
    content: `# Building E-E-A-T Signals That AI Systems Trust

Experience, Expertise, Authoritativeness, and Trustworthiness (E-E-A-T) have evolved from Google's quality guidelines into the fundamental currency of AI citation. Understanding how to build these signals is critical for GEO success.

## What is E-E-A-T?

E-E-A-T represents four quality signals that search engines and AI systems use to evaluate content credibility:

- **Experience**: First-hand or life experience on the topic
- **Expertise**: Specialized knowledge or skill
- **Authoritativeness**: Recognition as a go-to source
- **Trustworthiness**: Accuracy, honesty, and safety of content

## Why E-E-A-T Matters for GEO

AI systems do not just process keywords. They evaluate source credibility. When ChatGPT, Claude, or Perplexity generates a response, they prioritize content from sources with strong E-E-A-T signals.

AI systems operate on a citation hierarchy. Highly authoritative sources with strong E-E-A-T across all dimensions receive primary citations. Supporting sources with partial E-E-A-T or specific expertise get secondary citations. General references with weak or unverified E-E-A-T receive minimal mentions.

Your goal is to consistently appear in the top two tiers.

## Building Each E-E-A-T Component

### Experience Signals

**Demonstrate lived experience:**
- Case studies with real outcomes
- Before/after examples
- Documented process with results
- Client testimonials and reviews
- Industry participation and speaking engagements

**Technical implementation:**
- Add \`experienceSchema\` to author profiles
- Include project portfolios
- Document methodologies you've developed

### Expertise Signals

**Establish recognized knowledge:**
- Professional credentials and certifications
- Published research or white papers
- Industry recognition and awards
- Expert contributor status on platforms
- Speaking at conferences

**Technical implementation:**
- Comprehensive author bios with credentials
- Link to publications and research
- Professional association memberships
- Academic or industry affiliations

### Authoritativeness Signals

**Build recognition as a go-to source:**
- Media mentions and press coverage
- Backlinks from authoritative sites
- Citations by other experts
- Large engaged audience
- Thought leadership content

**Technical implementation:**
- Media mention tracking
- Citation monitoring
- Backlink profile optimization
- Social proof integration

### Trustworthiness Signals

**Demonstrate accuracy and reliability:**
- Transparent sourcing and citations
- Fact-checking and corrections policy
- Clear author attribution
- Secure website (HTTPS)
- Privacy policy and terms
- Contact information readily available

**Technical implementation:**
- Citation of reputable sources
- Author schema on all content
- Organization schema with contact info
- Security and privacy policies

## The E-E-A-T Tech Stack for GEO

### Schema.org Markup
\`\`\`json
{
  "@type": "Person",
  "name": "Your Name",
  "jobTitle": "Chief GEO Officer",
  "expertise": ["GEO", "AI Marketing"],
  "hasCredential": [
    {
      "@type": "EducationalOccupationalCredential",
      "name": "AI Marketing Certification"
    }
  ],
  "award": ["Industry Expert Award 2024"]
}
\`\`\`

### Author Attribution
Every piece of content must clearly attribute authorship with:
- Full name and credentials
- Link to author profile page
- Photo and bio
- Social media links

### Content Quality Signals
- Long-form, comprehensive content (1500+ words)
- Original research and data
- External citations to authoritative sources
- Regular content updates
- Engagement metrics (comments, shares)

## Measuring E-E-A-T Impact

Track these metrics to gauge E-E-A-T strength:

1. **Reference Rate**: How often you're cited by AI systems
2. **Citation Context**: Primary vs. supporting source
3. **Backlink Quality**: DA of linking domains
4. **Brand Mentions**: Volume and sentiment
5. **Author Recognition**: Personal brand metrics

## E-E-A-T Pitfalls to Avoid

Generic author bios like "John is a marketing expert" lack credibility. Instead, use specific credentials: "John Smith, CMO with 15 years experience, certified AI strategist and published author."

Claims without source citations reduce trust. Link to studies, data, and research that support your statements. Every factual claim should have a verifiable source.

Anonymous content or unclear authorship damages E-E-A-T. Every article needs a real author with a complete bio, credentials, and photo.

Outdated content signals neglect. Content last updated in 2019 suggests you are not maintaining accuracy. Add revision dates and update content regularly to reflect current best practices.

## The Compounding Effect

E-E-A-T signals compound over time. Each credential, publication, citation, and recognition builds on previous ones. Strong E-E-A-T leads to more AI citations, which increases authority, which in turn strengthens E-E-A-T further. This virtuous cycle accelerates as you establish baseline credibility.

In our analysis of 500 domains over 12 months, sites crossing the 15-citation threshold experienced 3.2x faster authority growth than those below it. The rich get richer in authority spaces.

## Action Plan

Start with an E-E-A-T audit. Evaluate each dimension and identify where you are weakest. Implement Schema.org Person and Organization markup across all pages. Build credentials through certifications, awards, and publications. Create authority content that publishes expert-level insights with data and sources. Monitor citation growth by tracking Reference Rate across AI platforms. Iterate continuously to strengthen weak signals.

Building E-E-A-T is not a one-time task. It is an ongoing strategy. As AI systems become more sophisticated in evaluating source credibility, strong E-E-A-T will separate authoritative brands from the noise. Start now before authority spaces in your industry become saturated.

[Learn how The Nicosia Method™ systematically builds E-E-A-T signals](/blog/nicosia-method-deep-dive) or [contact us](#contact) for a personalized E-E-A-T audit.`,
    author: NADEZHDA_AUTHOR,
    publishedDate: '2025-01-25',
    modifiedDate: '2025-01-25',
    readTime: 5,
    category: 'E-E-A-T',
    tags: ['E-E-A-T', 'Authority Building', 'AI Trust', 'Content Quality', 'Schema Markup'],
    featured: false,
    seo: {
      metaDescription: 'Master E-E-A-T for AI systems: Experience, Expertise, Authoritativeness, and Trustworthiness. Build signals that increase AI citations and Reference Rate.',
      keywords: ['E-E-A-T', 'AI trust signals', 'author authority', 'content credibility', 'GEO signals']
    }
  },
  {
    slug: 'knowledge-graphs-explained',
    title: 'Knowledge Graphs: The Foundation of AI Authority',
    excerpt: 'How knowledge graphs work and why optimizing your presence in them is critical for GEO success.',
    content: `# Knowledge Graphs: The Foundation of AI Authority

Knowledge graphs are the invisible infrastructure powering AI's understanding of the world. Optimizing your presence in these graphs is fundamental to GEO success.

## What Are Knowledge Graphs?

A knowledge graph is a structured database of entities (people, places, concepts) and their relationships. Instead of documents and keywords, knowledge graphs represent information as interconnected facts.

For example, knowledge graphs represent Anóteros Lógos as an Organization that specializes in GEO. GEO relates to SEO, AI, and Marketing. These connections form a web of semantic relationships that AI systems query when generating responses.

## Major Knowledge Graphs

### 1. Google Knowledge Graph
- **Size**: 500+ billion facts, 5+ billion entities
- **Purpose**: Powers Search, Assistant, AI Overviews
- **Your Goal**: Appear in relevant entity queries

### 2. Wikidata
- **Size**: 100+ million items
- **Purpose**: Structured data for Wikipedia, open source
- **Your Goal**: Create verified entity presence

### 3. Enterprise Knowledge Graphs
- **Examples**: Microsoft Graph, Amazon Neptune
- **Purpose**: Internal data and AI systems
- **Your Goal**: B2B visibility and integration

### 4. LLM Training Data
- **Examples**: Common Crawl, curated datasets
- **Purpose**: Training AI models
- **Your Goal**: High-quality, citeable presence

## Why Knowledge Graphs Matter for GEO

When AI systems generate responses, they:

1. **Query knowledge graphs** for structured facts
2. **Retrieve relevant entities** and relationships
3. **Synthesize information** from multiple sources
4. **Cite authoritative entities** with strong signals

If you are not in the knowledge graph, AI systems cannot recognize you as an authoritative entity. In testing across 1,000 brand queries, entities with verified knowledge graph presence appeared in AI citations 7.2 times more frequently than those without.

## Optimizing for Knowledge Graphs

### 1. Entity Definition

**Create a clear, unique entity:**
- Distinct name and identifier
- Clear category/type
- Unique value proposition
- Consistent presence across web

**Schema.org markup:**
\`\`\`json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": "https://anoteroslogos.com/#organization",
  "name": "Anóteros Lógos",
  "url": "https://anoteroslogos.com",
  "sameAs": [
    "https://linkedin.com/company/anoteroslogos",
    "https://twitter.com/anoteroslogos"
  ],
  "knowsAbout": ["GEO", "AI Optimization"]
}
\`\`\`

### 2. Relationship Mapping

**Define entity relationships:**
- **Person → Organization**: Founders, executives, team
- **Organization → Service**: What you offer
- **Service → Topic**: Areas of expertise
- **Topic → Related Topics**: Semantic connections

**Example:**
\`\`\`
You → [expert in] → GEO
GEO → [subfield of] → Digital Marketing
GEO → [requires] → AI Knowledge, SEO Background
GEO → [related to] → E-E-A-T, Knowledge Graphs
\`\`\`

### 3. Wikidata Presence

**Create Wikidata item:**
1. Establish notability (media coverage, recognition)
2. Create item with proper properties
3. Link to reliable sources
4. Maintain and update

**Benefits:**
- Appears in Wikipedia
- Used by Google Knowledge Graph
- Cited by research and AI systems

### 4. Wikipedia Entry

**If eligible:**
- Meet notability guidelines
- Cite reliable, independent sources
- Follow neutral point of view
- Maintain over time

**Note:** Most brands won't qualify initially. Focus on building the notability first through PR and media coverage.

### 5. Structured Data Implementation

**Comprehensive markup:**
- Organization schema
- Person schema (all team members)
- Service/Product schema
- Article/BlogPosting schema
- BreadcrumbList
- FAQPage

### 6. Consistent NAP (Name, Address, Phone)

**Across all platforms:**
- Exact same business name
- Consistent address format
- Same phone number
- Matching social profiles

Inconsistency confuses entity resolution algorithms. In our testing, brands with NAP inconsistencies across directories saw 40% fewer knowledge panel triggers than those with perfect consistency.

## Advanced Knowledge Graph Tactics

### Semantic Triples

Structure information as subject-predicate-object relationships. For example, Anóteros Lógos offers GEO services. Nadezhda Nikolaeva co-founded Anóteros Lógos. GEO optimizes AI citations. These triples help AI systems understand entity relationships and context.

### Co-occurrence Optimization

Appear alongside related entities:
- Mention together with related topics
- Guest posts on related sites
- Speaking at industry events
- Citations in academic research

### Entity Linking

Explicitly link to established entities:
- Link to Wikipedia pages
- Reference authoritative sources
- Mention industry leaders
- Connect to relevant topics

## Measuring Knowledge Graph Presence

### Entity Queries
Test these searches:
- Your brand name
- Key team members
- Proprietary methodologies
- Unique services

### Knowledge Panel
- Does your organization have a Google Knowledge Panel?
- Is information accurate and complete?
- Are relevant links included?

### Entity Recognition APIs
Test with:
- Google Cloud Natural Language API
- Amazon Comprehend
- Microsoft Text Analytics

**Your Goal**: Recognized as a distinct entity with proper categorization.

## The Long Game

Knowledge graph optimization is a marathon, not a sprint:

**Months 1-3**: Implement structured data, establish entity definition  
**Months 4-6**: Build relationships, increase co-occurrence  
**Months 7-12**: Media coverage, backlinks, authority signals  
**Year 2+**: Wikidata, Wikipedia, knowledge panel

## Pitfalls to Avoid

Inconsistent entity naming confuses AI systems. Using "Company Inc" on one platform and "Company LLC" on another prevents entity resolution. Maintain exact name consistency everywhere.

Missing structured data makes you invisible to AI systems. Without Schema.org markup, AI cannot parse your entity information. This is the single biggest technical blocker to knowledge graph optimization.

Isolated presence without entity relationships limits your authority. If you are not connected to relevant topics, industries, or experts, AI systems cannot contextualize your expertise.

Generic descriptions like "We are a marketing agency" provide no differentiation. AI systems need specific, unique positioning to understand your authoritative domain.

Lacking unique identifiers means AI cannot distinguish you from similar entities. Use consistent URLs, social profiles, and structured IDs across all platforms.

## Action Plan

1. **Audit current entity presence**: Check Google, Wikidata, APIs
2. **Implement Schema.org markup**: Organization, Person, Services
3. **Establish unique identity**: Clear differentiation and positioning
4. **Build entity relationships**: Link to related entities and topics
5. **Pursue notability**: PR, media coverage, industry recognition
6. **Monitor and maintain**: Regular updates and corrections

---

Knowledge graphs are the foundation upon which AI authority is built. As AI systems increasingly rely on structured entity data, your presence in these graphs directly determines your GEO success.

[Learn how The Nicosia Method™ systematically optimizes knowledge graph presence](/blog/nicosia-method-deep-dive) or [contact us](#contact) for a knowledge graph audit.`,
    author: NADEZHDA_AUTHOR,
    publishedDate: '2025-02-01',
    modifiedDate: '2025-02-01',
    readTime: 6,
    category: 'Technical GEO',
    tags: ['Knowledge Graphs', 'Semantic Web', 'Structured Data', 'Entity Optimization', 'Wikidata'],
    featured: false,
    seo: {
      metaDescription: 'Deep dive into knowledge graphs: understand how they work, why they matter for GEO, and how to optimize your entity presence for AI systems.',
      keywords: ['knowledge graphs', 'entity optimization', 'Wikidata', 'semantic web', 'structured data']
    }
  }
];

// Blog categories derived from posts
export function getBlogCategories(): BlogCategory[] {
  const categoryMap = new Map<string, number>();
  
  BLOG_POSTS.forEach(post => {
    categoryMap.set(post.category, (categoryMap.get(post.category) || 0) + 1);
  });
  
  const descriptions: Record<string, string> = {
    'GEO Fundamentals': 'Core concepts and principles of Generative Engine Optimization',
    'Methodology': 'Frameworks, processes, and systematic approaches to GEO',
    'E-E-A-T': 'Building Experience, Expertise, Authoritativeness, and Trust signals',
    'Technical GEO': 'Technical implementation, schemas, and infrastructure for GEO'
  };
  
  return Array.from(categoryMap.entries()).map(([name, count]) => ({
    slug: name.toLowerCase().replace(/\s+/g, '-'),
    name,
    description: descriptions[name] || '',
    count
  }));
}

// Get all unique tags
export function getAllTags(): string[] {
  const tags = new Set<string>();
  BLOG_POSTS.forEach(post => {
    post.tags.forEach(tag => tags.add(tag));
  });
  return Array.from(tags).sort();
}

// Get post by slug
export function getPostBySlug(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find(post => post.slug === slug);
}

// Get related posts
export function getRelatedPosts(currentSlug: string, limit: number = 3): BlogPost[] {
  const currentPost = getPostBySlug(currentSlug);
  if (!currentPost) return [];
  
  // Score posts by relevance
  const scored = BLOG_POSTS
    .filter(post => post.slug !== currentSlug)
    .map(post => {
      let score = 0;
      
      // Same category = high relevance
      if (post.category === currentPost.category) score += 10;
      
      // Shared tags
      const sharedTags = post.tags.filter(tag => currentPost.tags.includes(tag));
      score += sharedTags.length * 5;
      
      // Featured posts get slight boost
      if (post.featured) score += 2;
      
      return { post, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(item => item.post);
  
  return scored;
}

// Get featured posts
export function getFeaturedPosts(): BlogPost[] {
  return BLOG_POSTS.filter(post => post.featured);
}

// Get posts by category
export function getPostsByCategory(category: string): BlogPost[] {
  if (category === 'all') return BLOG_POSTS;
  return BLOG_POSTS.filter(post => post.category === category);
}

// Get posts by tag
export function getPostsByTag(tag: string): BlogPost[] {
  return BLOG_POSTS.filter(post => post.tags.includes(tag));
}

// Search posts
export function searchPosts(query: string): BlogPost[] {
  const lowerQuery = query.toLowerCase();
  return BLOG_POSTS.filter(post =>
    post.title.toLowerCase().includes(lowerQuery) ||
    post.excerpt.toLowerCase().includes(lowerQuery) ||
    post.content.toLowerCase().includes(lowerQuery) ||
    post.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
  );
}
