import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Calendar, Clock, User, ArrowLeft, Tag, Share2 } from 'lucide-react';
import { generateBlogPostingSchema, injectSchema, MOSTAFA_ELBERMAWY } from '../utils/schemas';
import type { BlogPost } from './Blog';

// Mock content - in production, load from markdown files or CMS
const BLOG_CONTENT: Record<string, string> = {
  'intro-to-geo': `
# Introduction to Generative Engine Optimization

The digital landscape is undergoing a fundamental transformation. For over two decades, Search Engine Optimization (SEO) has been the cornerstone of digital visibility. But we're now entering an era where AI systems don't just rank content—they synthesize it, cite it, and integrate it into generated responses.

## The Paradigm Shift

Traditional SEO focused on one goal: **ranking**. You optimized for keywords, built backlinks, and aimed to appear in the top 10 results. Success meant clicks and traffic.

GEO represents a fundamentally different approach: **becoming the source**. Instead of competing for positions in a list, you architect your brand's expertise to be the foundational reference that AI systems cite when generating answers.

## Why GEO Matters Now

AI-powered search and answer engines are rapidly becoming the primary interface for information discovery:

- **Google's AI Overviews** synthesize answers from multiple sources
- **ChatGPT** provides direct answers with citations
- **Perplexity** builds responses around authoritative sources
- **Claude**, **Gemini**, and other AI systems are becoming research assistants

When users get their answer directly from an AI system, they may never click through to a traditional search result. **Your visibility depends on being cited, not ranked.**

## The Three Pillars of GEO

### 1. Structured Authority
AI systems need to understand **who you are** and **what you know**. This requires:
- Comprehensive Schema.org markup
- Clear entity definitions
- Knowledge graph optimization
- Consistent identity signals across the web

### 2. E-E-A-T Signals
Experience, Expertise, Authoritativeness, and Trustworthiness aren't just SEO factors—they're the currency of AI citation:
- Author credibility and credentials
- Publication history and citations
- Expert validation and recognition
- Transparent sourcing and methodology

### 3. AI-Ready Content
Content must be structured for machine comprehension:
- Clear, factual, and well-sourced
- Semantic markup and context
- Logical information hierarchy
- Citeable, quotable statements

## Measuring GEO Success

Traditional SEO metrics (rankings, traffic, clicks) don't capture GEO performance. The new metrics include:

- **Reference Rate**: How often you're cited in AI responses
- **Citation Quality**: The context and prominence of your citations
- **Authority Score**: Your perceived expertise in your domain
- **Source Visibility**: How often you appear as a primary source

## The Strategic Imperative

GEO isn't a replacement for SEO—it's an evolution. As AI systems become the primary interface for information discovery, brands that establish themselves as authoritative sources will dominate their industries.

**The question isn't whether to invest in GEO. It's whether you'll be a source or just another signal in the noise.**

---

Ready to establish your brand as an authoritative source for AI systems? [Learn about The Nicosia Method™](/geo-vs-seo) or [contact us](#contact) to discuss your GEO strategy.
  `,
  'nicosia-method-deep-dive': `
# The Nicosia Method™: A Deep Dive

The Nicosia Method™ is our proprietary framework for transforming brands into primary sources of truth for AI systems. It's not about gaming algorithms—it's about architecting genuine authority that both humans and machines recognize.

## The Three-Phase Framework

### Phase 1: Intelligence Extraction

Before you can establish authority, you must clearly define **what** your expertise is and **how** it's unique.

**What we do:**
- Conduct deep expertise audits
- Identify unique intellectual property
- Map your knowledge architecture
- Define your authoritative domain

**Output:** A comprehensive authority blueprint that becomes the foundation for all GEO activities.

### Phase 2: Structural Authority

AI systems need machine-readable signals to understand and validate your expertise.

**What we do:**
- Implement comprehensive Schema.org markup
- Optimize knowledge graph presence
- Build E-E-A-T signals systematically
- Create entity relationships and connections

**Output:** A web of interconnected authority signals that AI systems can parse, validate, and cite.

### Phase 3: Amplification & Validation

Authority isn't just declared—it's validated through external recognition and consistent presence.

**What we do:**
- Develop strategic content that demonstrates expertise
- Build citation networks and source relationships
- Establish media and expert recognition
- Monitor and optimize Reference Rate

**Output:** Measurable increase in AI citations and authoritative positioning.

## Why It Works

The Nicosia Method™ is grounded in how AI systems actually evaluate and cite sources:

1. **Entity Recognition**: AI models need clear signals about who you are and what you represent
2. **Semantic Understanding**: Content must be structured for machine comprehension
3. **Trust Validation**: External signals validate your claimed expertise
4. **Consistency**: Signals must be coherent across all touchpoints

## Real-World Application

Let's say you're a B2B SaaS company specializing in supply chain optimization:

**Phase 1** would identify your unique methodologies, proprietary frameworks, and expert team members.

**Phase 2** would structure this information with proper schemas, create author profiles with credentials, and establish your knowledge graph presence.

**Phase 3** would involve publishing expert content, building industry citations, and systematically increasing your Reference Rate in AI responses about supply chain topics.

## The Long-Term Advantage

Once established, authority is self-reinforcing. As AI systems cite you more frequently, your perceived authority increases, leading to more citations in a virtuous cycle.

**This is why early adoption matters.** The brands that establish authority now will have a compounding advantage as AI systems become the dominant interface for information discovery.

---

[Contact us](#contact) to learn how The Nicosia Method™ can establish your brand as a source of truth in your industry.
  `
};

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [content, setContent] = useState<string>('');

  useEffect(() => {
    // In production, fetch from API or load markdown file
    // Mock data for now
    const mockPosts: BlogPost[] = [
      {
        slug: 'intro-to-geo',
        title: 'Introduction to Generative Engine Optimization',
        excerpt: 'Understanding the fundamental shift from traditional SEO to GEO and why it matters for your brand\'s digital authority.',
        author: {
          name: 'Mostafa ElBermawy',
          slug: 'mostafa-elbermawy',
          image: '/images/authors/mostafa-elbermawy.jpg'
        },
        publishedDate: '2025-01-15',
        modifiedDate: '2025-01-15',
        readTime: 8,
        category: 'GEO Fundamentals',
        tags: ['GEO', 'AI Optimization', 'Digital Authority'],
        image: '/images/blog/intro-to-geo.jpg',
        featured: true
      }
    ];

    const foundPost = mockPosts.find(p => p.slug === slug);
    if (foundPost) {
      setPost(foundPost);
      setContent(BLOG_CONTENT[slug!] || '');
      
      // Inject Article schema
      const articleSchema = generateBlogPostingSchema({
        headline: foundPost.title,
        description: foundPost.excerpt,
        url: `https://anoteroslogos.com/blog/${foundPost.slug}`,
        datePublished: foundPost.publishedDate,
        dateModified: foundPost.modifiedDate,
        author: MOSTAFA_ELBERMAWY,
        image: foundPost.image ? {
          url: `https://anoteroslogos.com${foundPost.image}`,
          width: 1200,
          height: 630
        } : undefined,
        keywords: foundPost.tags,
        articleSection: foundPost.category,
        wordCount: content.split(/\s+/).length
      });
      injectSchema(articleSchema);
    }
  }, [slug, content]);

  if (!post) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center pt-24">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-brand-text mb-4">Article Not Found</h1>
          <Link to="/blog" className="text-brand-accent hover:underline">
            ← Back to Blog
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{post.title} | Anóteros Lógos Blog</title>
        <meta name="description" content={post.excerpt} />
        <meta name="author" content={post.author.name} />
        <link rel="canonical" href={`https://anoteroslogos.com/blog/${post.slug}`} />
        
        {/* Open Graph */}
        <meta property="og:type" content="article" />
        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={post.excerpt} />
        <meta property="og:url" content={`https://anoteroslogos.com/blog/${post.slug}`} />
        {post.image && <meta property="og:image" content={`https://anoteroslogos.com${post.image}`} />}
        <meta property="article:published_time" content={post.publishedDate} />
        <meta property="article:modified_time" content={post.modifiedDate} />
        <meta property="article:author" content={post.author.name} />
        {post.tags.map(tag => (
          <meta key={tag} property="article:tag" content={tag} />
        ))}
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={post.title} />
        <meta name="twitter:description" content={post.excerpt} />
        {post.image && <meta name="twitter:image" content={`https://anoteroslogos.com${post.image}`} />}
      </Helmet>

      <div className="min-h-screen bg-brand-bg pt-24 pb-16">
        <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back Link */}
          <Link 
            to="/blog"
            className="inline-flex items-center gap-2 text-brand-accent hover:text-brand-accent/80 transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Blog
          </Link>

          {/* Header */}
          <header className="mb-12">
            {post.image && (
              <div className="aspect-video rounded-2xl overflow-hidden mb-8">
                <img 
                  src={post.image} 
                  alt={post.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div className="flex items-center gap-2 text-brand-accent text-sm mb-4">
              <Tag className="w-4 h-4" />
              <span>{post.category}</span>
            </div>

            <h1 className="text-5xl font-bold text-brand-text mb-6">
              {post.title}
            </h1>

            <div className="flex flex-wrap items-center gap-6 text-brand-text/60 mb-6">
              <Link 
                to={`/author/${post.author.slug}`}
                className="flex items-center gap-3 hover:text-brand-accent transition-colors"
              >
                <img 
                  src={post.author.image} 
                  alt={post.author.name}
                  className="w-10 h-10 rounded-full"
                />
                <span className="font-medium">{post.author.name}</span>
              </Link>
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span>{new Date(post.publishedDate).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>{post.readTime} min read</span>
              </div>
              <button className="flex items-center gap-1 hover:text-brand-accent transition-colors">
                <Share2 className="w-4 h-4" />
                <span>Share</span>
              </button>
            </div>

            {post.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {post.tags.map(tag => (
                  <span 
                    key={tag}
                    className="text-sm bg-brand-accent/10 text-brand-accent px-4 py-2 rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </header>

          {/* Content */}
          <div className="prose prose-invert prose-lg max-w-none">
            <div 
              className="text-brand-text/90 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: content.replace(/\n/g, '<br />') }}
            />
          </div>

          {/* Author Bio */}
          <div className="mt-16 pt-12 border-t border-brand-accent/20">
            <Link 
              to={`/author/${post.author.slug}`}
              className="flex items-start gap-6 bg-brand-secondary/20 rounded-2xl p-6 hover:bg-brand-secondary/30 transition-colors group"
            >
              <img 
                src={post.author.image} 
                alt={post.author.name}
                className="w-20 h-20 rounded-full flex-shrink-0"
              />
              <div>
                <h3 className="text-2xl font-bold text-brand-text mb-2 group-hover:text-brand-accent transition-colors">
                  {post.author.name}
                </h3>
                <p className="text-brand-text/70 mb-3">
                  Founder & Chief GEO Architect at Anóteros Lógos. Creator of The Nicosia Method™.
                </p>
                <span className="text-brand-accent text-sm flex items-center gap-2">
                  View Profile
                  <ArrowLeft className="w-4 h-4 rotate-180" />
                </span>
              </div>
            </Link>
          </div>
        </article>
      </div>
    </>
  );
}
