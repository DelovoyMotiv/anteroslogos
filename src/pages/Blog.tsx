import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Calendar, Clock, User, ArrowRight, Tag } from 'lucide-react';

export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  content?: string;
  author: {
    name: string;
    slug: string;
    image: string;
  };
  publishedDate: string;
  modifiedDate: string;
  readTime: number;
  category: string;
  tags: string[];
  image?: string;
  featured?: boolean;
}

// Mock blog posts - in production, fetch from CMS or markdown files
const BLOG_POSTS: BlogPost[] = [
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
  },
  {
    slug: 'nicosia-method-deep-dive',
    title: 'The Nicosia Method™: A Deep Dive',
    excerpt: 'Explore the three-phase framework that transforms brands into primary sources of truth for AI systems.',
    author: {
      name: 'Mostafa ElBermawy',
      slug: 'mostafa-elbermawy',
      image: '/images/authors/mostafa-elbermawy.jpg'
    },
    publishedDate: '2025-01-20',
    modifiedDate: '2025-01-22',
    readTime: 12,
    category: 'Methodology',
    tags: ['Nicosia Method', 'GEO Strategy', 'Framework'],
    image: '/images/blog/nicosia-method.jpg',
    featured: true
  },
  {
    slug: 'e-e-a-t-signals-for-ai',
    title: 'Building E-E-A-T Signals That AI Systems Trust',
    excerpt: 'Learn how to establish Experience, Expertise, Authoritativeness, and Trustworthiness signals that AI models recognize and value.',
    author: {
      name: 'Mostafa ElBermawy',
      slug: 'mostafa-elbermawy',
      image: '/images/authors/mostafa-elbermawy.jpg'
    },
    publishedDate: '2025-01-25',
    modifiedDate: '2025-01-25',
    readTime: 10,
    category: 'E-E-A-T',
    tags: ['E-E-A-T', 'Authority Building', 'AI Trust'],
    featured: false
  },
  {
    slug: 'knowledge-graphs-explained',
    title: 'Knowledge Graphs: The Foundation of AI Authority',
    excerpt: 'How knowledge graphs work and why optimizing your presence in them is critical for GEO success.',
    author: {
      name: 'Mostafa ElBermawy',
      slug: 'mostafa-elbermawy',
      image: '/images/authors/mostafa-elbermawy.jpg'
    },
    publishedDate: '2025-02-01',
    modifiedDate: '2025-02-01',
    readTime: 15,
    category: 'Technical GEO',
    tags: ['Knowledge Graphs', 'Semantic Web', 'Structured Data'],
    featured: false
  }
];

export default function Blog() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    // In production, fetch from API or load markdown files
    setPosts(BLOG_POSTS);
  }, []);

  const categories = ['all', ...Array.from(new Set(posts.map(p => p.category)))];
  const filteredPosts = selectedCategory === 'all' 
    ? posts 
    : posts.filter(p => p.category === selectedCategory);
  const featuredPosts = posts.filter(p => p.featured);

  return (
    <>
      <Helmet>
        <title>Blog - GEO Insights & Strategies | Anóteros Lógos</title>
        <meta 
          name="description" 
          content="Expert insights on Generative Engine Optimization, AI-first marketing, and digital authority building. Learn how to become the source." 
        />
        <link rel="canonical" href="https://anoteroslogos.com/blog" />
        
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Blog - GEO Insights & Strategies" />
        <meta property="og:url" content="https://anoteroslogos.com/blog" />
      </Helmet>

      <div className="min-h-screen bg-brand-bg pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-16">
            <h1 className="text-5xl font-bold text-brand-text mb-6">
              GEO Insights & Strategies
            </h1>
            <p className="text-xl text-brand-text/70 max-w-3xl mx-auto">
              Expert perspectives on Generative Engine Optimization, AI authority, and the future of digital presence
            </p>
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap justify-center gap-3 mb-12">
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-6 py-2 rounded-full font-medium transition-colors ${
                  selectedCategory === category
                    ? 'bg-brand-accent text-white'
                    : 'bg-brand-secondary/30 text-brand-text/70 hover:bg-brand-secondary/50'
                }`}
              >
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </button>
            ))}
          </div>

          {/* Featured Posts */}
          {selectedCategory === 'all' && featuredPosts.length > 0 && (
            <div className="mb-16">
              <h2 className="text-3xl font-bold text-brand-text mb-8">Featured Articles</h2>
              <div className="grid md:grid-cols-2 gap-8">
                {featuredPosts.map(post => (
                  <Link
                    key={post.slug}
                    to={`/blog/${post.slug}`}
                    className="group bg-brand-secondary/30 rounded-2xl overflow-hidden border border-brand-accent/10 hover:border-brand-accent/30 transition-all"
                  >
                    {post.image && (
                      <div className="aspect-video bg-brand-secondary/50 overflow-hidden">
                        <img 
                          src={post.image} 
                          alt={post.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    )}
                    <div className="p-6">
                      <div className="flex items-center gap-2 text-brand-accent text-sm mb-3">
                        <Tag className="w-4 h-4" />
                        <span>{post.category}</span>
                      </div>
                      <h3 className="text-2xl font-bold text-brand-text mb-3 group-hover:text-brand-accent transition-colors">
                        {post.title}
                      </h3>
                      <p className="text-brand-text/70 mb-4">{post.excerpt}</p>
                      <div className="flex items-center justify-between text-sm text-brand-text/60">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4" />
                          <span>{post.author.name}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>{new Date(post.publishedDate).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span>{post.readTime} min</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* All Posts */}
          <div>
            <h2 className="text-3xl font-bold text-brand-text mb-8">
              {selectedCategory === 'all' ? 'All Articles' : selectedCategory}
            </h2>
            <div className="grid gap-6">
              {filteredPosts.map(post => (
                <Link
                  key={post.slug}
                  to={`/blog/${post.slug}`}
                  className="group bg-brand-secondary/20 rounded-xl p-6 border border-brand-accent/10 hover:border-brand-accent/30 hover:bg-brand-secondary/30 transition-all"
                >
                  <div className="flex flex-col md:flex-row gap-6">
                    {post.image && (
                      <div className="md:w-64 aspect-video md:aspect-square bg-brand-secondary/50 rounded-lg overflow-hidden flex-shrink-0">
                        <img 
                          src={post.image} 
                          alt={post.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 text-brand-accent text-sm mb-2">
                        <Tag className="w-4 h-4" />
                        <span>{post.category}</span>
                      </div>
                      <h3 className="text-2xl font-bold text-brand-text mb-2 group-hover:text-brand-accent transition-colors flex items-center gap-2">
                        {post.title}
                        <ArrowRight className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </h3>
                      <p className="text-brand-text/70 mb-4">{post.excerpt}</p>
                      <div className="flex items-center gap-6 text-sm text-brand-text/60">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4" />
                          <span>{post.author.name}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>{new Date(post.publishedDate).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>{post.readTime} min read</span>
                        </div>
                      </div>
                      {post.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-4">
                          {post.tags.map(tag => (
                            <span 
                              key={tag}
                              className="text-xs bg-brand-accent/10 text-brand-accent px-3 py-1 rounded-full"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
