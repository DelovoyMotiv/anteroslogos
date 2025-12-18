import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Calendar, Clock, User, ArrowRight, AlertCircle } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  author: {
    name: string;
    slug: string;
  };
  category?: {
    name: string;
    slug: string;
  };
  featured: boolean;
  status: string;
  published_date: string;
  read_time: number;
  tags?: string[];
}

interface BlogCategory {
  id: string;
  name: string;
  slug: string;
  post_count?: number;
}

export default function Blog() {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    // Set page title and meta
    document.title = 'Blog - GEO Insights & Strategies | Anóteros Lógos';
    
    // Set canonical URL
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = 'https://anoteroslogos.com/blog';
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    setRetrying(false);

    try {
      // Fetch categories
      const categoriesResponse = await fetch('/api/blog?action=categories');
      if (!categoriesResponse.ok) {
        throw new Error('Failed to fetch categories');
      }
      const categoriesData = await categoriesResponse.json();
      setCategories(categoriesData);

      // Fetch posts with optional category filter
      const postsUrl = selectedCategory === 'all' 
        ? '/api/blog?action=posts&limit=100'
        : `/api/blog?action=posts&limit=100&category=${selectedCategory}`;
      
      const postsResponse = await fetch(postsUrl);
      if (!postsResponse.ok) {
        throw new Error('Failed to fetch posts');
      }
      const postsData = await postsResponse.json();
      setPosts(postsData.posts || []);
    } catch (err) {
      console.error('Error fetching blog data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load blog content');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedCategory]);

  const handleRetry = () => {
    setRetrying(true);
    fetchData();
  };

  const categoryList = ['all', ...categories.map(c => c.slug)];
  const filteredPosts = posts;
  const featuredPosts = posts.filter(p => p.featured);

  // Error state
  if (error && !retrying) {
    return (
      <div className="min-h-screen bg-brand-bg">
        <Header 
          onMethodClick={() => navigate('/')} 
          onClientsClick={() => navigate('/')} 
          onContactClick={() => navigate('/')}
        />
        <div className="pb-16" style={{ paddingTop: 'calc(var(--header-height) + 2rem)' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
              <AlertCircle className="w-12 h-12 text-brand-accent mb-3" />
              <h2 className="text-xl font-bold text-brand-text mb-2">Unable to Load Content</h2>
              <p className="text-sm text-brand-text/60 mb-4 max-w-md">
                {error}
              </p>
              <button
                onClick={handleRetry}
                className="px-5 py-2 bg-brand-accent text-white text-sm rounded-lg font-medium hover:bg-brand-accent/90 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
        <Footer 
          onPhilosophyClick={() => navigate('/')}
          onMethodClick={() => navigate('/')}
          onClientsClick={() => navigate('/')}
          onFAQClick={() => navigate('/')}
          onContactClick={() => navigate('/')}
        />
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-brand-bg">
        <Header 
          onMethodClick={() => navigate('/')} 
          onClientsClick={() => navigate('/')} 
          onContactClick={() => navigate('/')}
        />
        <div className="pb-16" style={{ paddingTop: 'calc(var(--header-height) + 2rem)' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <div className="w-12 h-12 border-3 border-brand-accent/20 border-t-brand-accent rounded-full animate-spin mx-auto mb-3"></div>
                <p className="text-sm text-brand-text/60">Loading...</p>
              </div>
            </div>
          </div>
        </div>
        <Footer 
          onPhilosophyClick={() => navigate('/')}
          onMethodClick={() => navigate('/')}
          onClientsClick={() => navigate('/')}
          onFAQClick={() => navigate('/')}
          onContactClick={() => navigate('/')}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-bg">
      <Header 
        onMethodClick={() => navigate('/')} 
        onClientsClick={() => navigate('/')} 
        onContactClick={() => navigate('/')}
      />
      {/* Main Content */}
      <div className="pb-16" style={{ paddingTop: 'calc(var(--header-height) + 2rem)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Compact Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold text-brand-text mb-3 leading-tight">
              GEO Insights & Strategies
            </h1>
            <p className="text-base text-brand-text/60 max-w-2xl">
              Expert perspectives on Generative Engine Optimization, AI authority, and digital presence
            </p>
          </div>

          {/* Minimalist Category Filter */}
          <div className="flex items-center gap-2 mb-10 pb-6 border-b border-brand-accent/10">
            <span className="text-sm text-brand-text/50 mr-2">Filter:</span>
            {categoryList.map(category => {
              const categoryName = category === 'all' ? 'All' : categories.find(c => c.slug === category)?.name || category;
              const postCount = category === 'all' 
                ? posts.length 
                : categories.find(c => c.slug === category)?.post_count || posts.filter(p => p.category?.slug === category).length;
              
              return (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`group relative px-3 py-1.5 text-sm font-medium transition-all ${
                    selectedCategory === category
                      ? 'text-brand-accent'
                      : 'text-brand-text/60 hover:text-brand-text'
                  }`}
                >
                  <span>{categoryName}</span>
                  <span className="ml-1.5 text-xs opacity-60">({postCount})</span>
                  {selectedCategory === category && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-accent"></div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Featured Post - Compact Design */}
          {selectedCategory === 'all' && featuredPosts.length > 0 && (
            <div className="mb-12">
              <Link
                to={`/blog/${featuredPosts[0].slug}`}
                className="group block bg-gradient-to-br from-brand-secondary/30 to-brand-secondary/10 rounded-xl border border-brand-accent/20 hover:border-brand-accent/40 transition-all duration-300 hover:shadow-lg hover:shadow-brand-accent/5"
              >
                <div className="p-6 sm:p-7">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="px-2.5 py-0.5 bg-brand-accent/10 text-brand-accent text-xs font-semibold rounded uppercase tracking-wide">
                      Featured
                    </span>
                    <span className="text-xs text-brand-text/50">
                      {featuredPosts[0].category?.name || 'Uncategorized'}
                    </span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-brand-text mb-3 leading-tight group-hover:text-brand-accent transition-colors">
                    {featuredPosts[0].title}
                  </h2>
                  <p className="text-brand-text/70 text-base mb-4 line-clamp-2">
                    {featuredPosts[0].excerpt}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-brand-text/50">
                    <span>{featuredPosts[0].author.name}</span>
                    <span>•</span>
                    <span>{new Date(featuredPosts[0].published_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    <span>•</span>
                    <span>{featuredPosts[0].read_time} min read</span>
                  </div>
                </div>
              </Link>
            </div>
          )}

          {/* Articles List - Clean & Minimal */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-brand-text">
                {selectedCategory === 'all' ? 'All Articles' : categories.find(c => c.slug === selectedCategory)?.name || selectedCategory}
              </h2>
              <span className="text-xs text-brand-text/50">
                {filteredPosts.length} {filteredPosts.length === 1 ? 'article' : 'articles'}
              </span>
            </div>
            
            <div className="space-y-6">
              {filteredPosts.map(post => (
                <Link
                  key={post.slug}
                  to={`/blog/${post.slug}`}
                  className="group block border-b border-brand-accent/10 pb-6 hover:border-brand-accent/30 transition-all"
                >
                  <div className="flex items-start justify-between gap-6">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-xs text-brand-accent font-medium">
                          {post.category?.name || 'Uncategorized'}
                        </span>
                        <span className="text-xs text-brand-text/40">
                          {new Date(post.published_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                      <h3 className="text-xl font-bold text-brand-text mb-2 leading-tight group-hover:text-brand-accent transition-colors">
                        {post.title}
                      </h3>
                      <p className="text-brand-text/60 text-sm mb-3 line-clamp-2">
                        {post.excerpt}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-brand-text/50">
                        <span>{post.author.name}</span>
                        <span>•</span>
                        <span>{post.read_time} min read</span>
                      </div>
                    </div>
                    <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ArrowRight className="w-5 h-5 text-brand-accent" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
      <Footer 
        onPhilosophyClick={() => navigate('/')}
        onMethodClick={() => navigate('/')}
        onClientsClick={() => navigate('/')}
        onFAQClick={() => navigate('/')}
        onContactClick={() => navigate('/')}
      />
    </div>
  );
}
