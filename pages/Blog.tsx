import { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, AlertCircle, ChevronRight, TrendingUp } from 'lucide-react';
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
    job_title?: string | null;
    image_url?: string | null;
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
  og_image_url?: string | null;
}

interface BlogCategory {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  post_count?: number;
}

/** Format date as "Dec 20, 2025" */
function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/** Generate initials from author name */
function getInitials(name: string): string {
  return name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/** Deterministic color from string */
function getAuthorColor(name: string): string {
  const colors = [
    'from-blue-500 to-cyan-500',
    'from-violet-500 to-purple-500',
    'from-emerald-500 to-teal-500',
    'from-amber-500 to-orange-500',
    'from-rose-500 to-pink-500',
    'from-indigo-500 to-blue-500',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

function AuthorAvatar({ name, size = 'sm' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'w-6 h-6 text-[10px]',
    md: 'w-8 h-8 text-xs',
    lg: 'w-10 h-10 text-sm',
  };
  return (
    <div
      className={`${sizeClasses[size]} rounded-full bg-gradient-to-br ${getAuthorColor(name)} flex items-center justify-center text-white font-semibold flex-shrink-0 ring-2 ring-white/5`}
    >
      {getInitials(name)}
    </div>
  );
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
    document.title = 'Blog — GEO Insights & Strategies | Anóteros Lógos';
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
      const categoriesResponse = await fetch('/api/blog?action=categories');
      if (!categoriesResponse.ok) throw new Error('Failed to fetch categories');
      const categoriesData = await categoriesResponse.json();
      setCategories(categoriesData);

      const postsUrl =
        selectedCategory === 'all'
          ? '/api/blog?action=posts&limit=100'
          : `/api/blog?action=posts&limit=100&category=${selectedCategory}`;
      const postsResponse = await fetch(postsUrl);
      if (!postsResponse.ok) throw new Error('Failed to fetch posts');
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

  const featuredPosts = useMemo(() => posts.filter(p => p.featured), [posts]);
  const latestPosts = useMemo(() => {
    const nonFeatured = posts.filter(p => !p.featured || selectedCategory !== 'all');
    return selectedCategory === 'all' ? nonFeatured : posts;
  }, [posts, selectedCategory]);

  // Split latest into hero (first 2) and rest for grid layout
  const topPosts = useMemo(() => latestPosts.slice(0, 2), [latestPosts]);
  const remainingPosts = useMemo(() => latestPosts.slice(2), [latestPosts]);

  const totalCount = posts.length;

  // Shared layout wrapper
  const PageShell = ({ children }: { children: React.ReactNode }) => (
    <div className="min-h-screen bg-brand-bg">
      <Header
        onMethodClick={() => navigate('/')}
        onClientsClick={() => navigate('/')}
        onContactClick={() => navigate('/')}
      />
      <div className="pb-20" style={{ paddingTop: 'calc(var(--header-height) + 2rem)' }}>
        {children}
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

  // Error state
  if (error && !retrying) {
    return (
      <PageShell>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
            <AlertCircle className="w-12 h-12 text-brand-accent mb-3" />
            <h2 className="text-xl font-bold text-brand-text mb-2">Unable to Load Content</h2>
            <p className="text-sm text-brand-text/60 mb-4 max-w-md">{error}</p>
            <button
              onClick={handleRetry}
              className="px-5 py-2 bg-brand-accent text-white text-sm rounded-lg font-medium hover:bg-brand-accent/90 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </PageShell>
    );
  }

  // Loading state
  if (loading) {
    return (
      <PageShell>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Skeleton header */}
          <div className="mb-10 border-b border-white/5 pb-8">
            <div className="h-8 w-80 bg-white/5 rounded-lg animate-pulse mb-3" />
            <div className="h-4 w-96 bg-white/5 rounded animate-pulse" />
          </div>
          {/* Skeleton cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
            {[1, 2].map(i => (
              <div key={i} className="bg-white/[0.02] rounded-2xl border border-white/5 p-6 animate-pulse">
                <div className="h-4 w-24 bg-white/5 rounded mb-4" />
                <div className="h-6 w-full bg-white/5 rounded mb-3" />
                <div className="h-4 w-3/4 bg-white/5 rounded mb-6" />
                <div className="h-3 w-40 bg-white/5 rounded" />
              </div>
            ))}
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-white/[0.02] rounded-xl border border-white/5 animate-pulse" />
            ))}
          </div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* ── Masthead ── */}
        <div className="mb-8 pb-6 border-b border-white/[0.06]">
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-brand-text tracking-tight leading-none mb-2">
                GEO Insights & Strategies
              </h1>
              <p className="text-sm sm:text-base text-brand-text/50 max-w-xl leading-relaxed">
                Expert perspectives on Generative Engine Optimization, AI authority, and digital presence
              </p>
            </div>
            <div className="text-xs text-brand-text/30 tabular-nums">
              {totalCount} {totalCount === 1 ? 'article' : 'articles'} published
            </div>
          </div>
        </div>

        {/* ── Category Navigation ── */}
        <nav className="mb-10 -mx-4 px-4 overflow-x-auto scrollbar-hide" aria-label="Article categories">
          <div className="flex items-center gap-1.5 min-w-max">
            {['all', ...categories.map(c => c.slug)].map(slug => {
              const isActive = selectedCategory === slug;
              const cat = categories.find(c => c.slug === slug);
              const name = slug === 'all' ? 'All' : cat?.name || slug;
              const count =
                slug === 'all'
                  ? totalCount
                  : cat?.post_count || posts.filter(p => p.category?.slug === slug).length;

              return (
                <button
                  key={slug}
                  onClick={() => setSelectedCategory(slug)}
                  className={`relative px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                    isActive
                      ? 'bg-brand-accent/10 text-brand-accent'
                      : 'text-brand-text/50 hover:text-brand-text/80 hover:bg-white/[0.03]'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {name}
                  <span className={`ml-1.5 text-xs ${isActive ? 'text-brand-accent/60' : 'opacity-40'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* ── Featured Hero (only on "All" tab) ── */}
        {selectedCategory === 'all' && featuredPosts.length > 0 && (
          <section className="mb-14" aria-label="Featured articles">
            <div className={`grid gap-5 ${featuredPosts.length > 1 ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
              {featuredPosts.slice(0, 2).map((post, idx) => (
                <Link
                  key={post.slug}
                  to={`/blog/${post.slug}`}
                  className="group relative flex flex-col justify-between rounded-2xl border border-white/[0.06] bg-gradient-to-br from-white/[0.03] to-transparent p-6 sm:p-8 transition-all duration-300 hover:border-brand-accent/30 hover:shadow-xl hover:shadow-brand-accent/5 hover:-translate-y-0.5 min-h-[220px]"
                >
                  {/* Top row */}
                  <div>
                    <div className="flex items-center gap-2.5 mb-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-brand-accent/10 text-brand-accent text-[11px] font-semibold rounded-md uppercase tracking-wider">
                        <TrendingUp className="w-3 h-3" />
                        Featured
                      </span>
                      <span className="text-xs text-brand-text/40">
                        {post.category?.name}
                      </span>
                    </div>
                    <h2 className={`font-bold text-brand-text leading-tight mb-3 group-hover:text-brand-accent transition-colors duration-200 ${
                      idx === 0 && featuredPosts.length === 1 ? 'text-2xl sm:text-3xl' : 'text-xl sm:text-2xl'
                    }`}>
                      {post.title}
                    </h2>
                    <p className="text-brand-text/55 text-sm leading-relaxed line-clamp-2 mb-5">
                      {post.excerpt}
                    </p>
                  </div>
                  {/* Bottom row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <AuthorAvatar name={post.author.name} size="md" />
                      <div className="flex flex-col">
                        <span className="text-xs font-medium text-brand-text/80">{post.author.name}</span>
                        <span className="text-[11px] text-brand-text/40">
                          {formatDate(post.published_date)} · {post.read_time} min read
                        </span>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-brand-accent opacity-0 group-hover:opacity-100 transition-all duration-200 group-hover:translate-x-1" />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── Section Divider ── */}
        <div className="flex items-center gap-4 mb-8">
          <h2 className="text-lg font-semibold text-brand-text whitespace-nowrap">
            {selectedCategory === 'all' ? 'Latest Articles' : categories.find(c => c.slug === selectedCategory)?.name || 'Articles'}
          </h2>
          <div className="flex-1 h-px bg-white/[0.06]" />
          <span className="text-xs text-brand-text/30 tabular-nums whitespace-nowrap">
            {selectedCategory === 'all' ? latestPosts.length : posts.length} articles
          </span>
        </div>

        {/* ── Top 2 Articles Grid ── */}
        {topPosts.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
            {topPosts.map(post => (
              <ArticleCard key={post.slug} post={post} variant="card" />
            ))}
          </div>
        )}

        {/* ── Remaining Articles List ── */}
        {remainingPosts.length > 0 && (
          <div className="space-y-0 divide-y divide-white/[0.04]">
            {remainingPosts.map(post => (
              <ArticleCard key={post.slug} post={post} variant="row" />
            ))}
          </div>
        )}

        {/* Empty state */}
        {posts.length === 0 && (
          <div className="text-center py-20">
            <p className="text-brand-text/40 text-sm">No articles found in this category.</p>
          </div>
        )}
      </div>
    </PageShell>
  );
}

/* ── Article Card Component ── */
function ArticleCard({ post, variant }: { post: BlogPost; variant: 'card' | 'row' }) {
  if (variant === 'card') {
    return (
      <Link
        to={`/blog/${post.slug}`}
        className="group flex flex-col justify-between rounded-xl border border-white/[0.05] bg-white/[0.015] p-5 sm:p-6 transition-all duration-200 hover:border-white/[0.12] hover:bg-white/[0.025] min-h-[180px]"
      >
        <div>
          <div className="flex items-center gap-2.5 mb-3">
            <span className="text-[11px] font-semibold text-brand-accent uppercase tracking-wider">
              {post.category?.name || 'Uncategorized'}
            </span>
            <span className="text-[11px] text-brand-text/30">{formatDate(post.published_date)}</span>
          </div>
          <h3 className="text-lg font-bold text-brand-text leading-snug mb-2 group-hover:text-brand-accent transition-colors duration-200 line-clamp-2">
            {post.title}
          </h3>
          <p className="text-sm text-brand-text/50 leading-relaxed line-clamp-2 mb-4">
            {post.excerpt}
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <AuthorAvatar name={post.author.name} size="sm" />
          <span className="text-xs text-brand-text/60">{post.author.name}</span>
          <span className="text-brand-text/20">·</span>
          <span className="text-xs text-brand-text/35">{post.read_time} min read</span>
        </div>
      </Link>
    );
  }

  // Row variant
  return (
    <Link
      to={`/blog/${post.slug}`}
      className="group flex items-start gap-4 sm:gap-5 py-5 transition-colors duration-150"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2.5 mb-1.5">
          <span className="text-[11px] font-semibold text-brand-accent uppercase tracking-wider">
            {post.category?.name || 'Uncategorized'}
          </span>
          <span className="text-[11px] text-brand-text/30">{formatDate(post.published_date)}</span>
        </div>
        <h3 className="text-base font-bold text-brand-text leading-snug mb-1 group-hover:text-brand-accent transition-colors duration-200">
          {post.title}
        </h3>
        <p className="text-sm text-brand-text/45 leading-relaxed line-clamp-1 mb-2">
          {post.excerpt}
        </p>
        <div className="flex items-center gap-2.5">
          <AuthorAvatar name={post.author.name} size="sm" />
          <span className="text-xs text-brand-text/55">{post.author.name}</span>
          <span className="text-brand-text/20">·</span>
          <span className="text-xs text-brand-text/30">{post.read_time} min</span>
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-brand-text/20 group-hover:text-brand-accent flex-shrink-0 mt-6 transition-colors duration-200" />
    </Link>
  );
}
