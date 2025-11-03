import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Calendar, Clock, User, ArrowRight } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { getBlogCategories, getFeaturedPosts, getPostsByCategory } from '../data/blogPosts';

export default function Blog() {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    // Set page title and meta
    document.title = 'Blog - GEO Insights & Strategies | Anóteros Lógos';
  }, []);

  const blogCategories = getBlogCategories();
  const categories = ['all', ...blogCategories.map(c => c.name)];
  const filteredPosts = getPostsByCategory(selectedCategory);
  const featuredPosts = getFeaturedPosts();

  return (
    <div className="min-h-screen bg-brand-bg">
      <Header 
        onMethodClick={() => navigate('/')} 
        onClientsClick={() => navigate('/')} 
        onInsightsClick={() => navigate('/')} 
        onTeamClick={() => navigate('/')} 
        onContactClick={() => navigate('/')}
      />
      {/* Main Content */}
      <div className="pt-36 sm:pt-40 md:pt-44 lg:pt-48 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Page Header */}
          <div className="mb-12 sm:mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-brand-accent/5 border border-brand-accent/20 rounded-full mb-6">
              <div className="w-1.5 h-1.5 rounded-full bg-brand-accent animate-pulse"></div>
              <span className="text-xs font-semibold text-brand-accent uppercase tracking-wider">Blog</span>
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-brand-text mb-5 leading-tight">
              GEO Insights & Strategies
            </h1>
            <p className="text-lg sm:text-xl text-brand-text/60 max-w-3xl leading-relaxed">
              Expert perspectives on Generative Engine Optimization, AI authority, and the future of digital presence
            </p>
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap gap-2 sm:gap-3 mb-12 sm:mb-16">
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 sm:px-6 py-1.5 sm:py-2 text-sm sm:text-base rounded-full font-medium transition-colors ${
                  selectedCategory === category
                    ? 'bg-brand-accent text-white'
                    : 'bg-brand-secondary/30 text-brand-text/70 hover:bg-brand-secondary/50'
                }`}
              >
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </button>
            ))}
          </div>

          {/* Hero Section - Featured Post + Recent Posts Sidebar */}
          {selectedCategory === 'all' && featuredPosts.length > 0 && (
            <div className="mb-16 sm:mb-20">
              <div className="grid lg:grid-cols-3 gap-8">
                {/* Main Featured Post */}
                <div className="lg:col-span-2">
                  <Link
                    to={`/blog/${featuredPosts[0].slug}`}
                    className="group relative bg-gradient-to-br from-brand-secondary/40 to-brand-secondary/20 rounded-2xl overflow-hidden border border-brand-accent/20 hover:border-brand-accent/40 transition-all duration-300 hover:shadow-2xl hover:shadow-brand-accent/10"
                  >
                    <div className="p-6 sm:p-8">
                      {/* Featured Badge */}
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-brand-accent/10 rounded-full mb-5">
                        <div className="w-1 h-1 rounded-full bg-brand-accent"></div>
                        <span className="text-xs font-bold text-brand-accent uppercase tracking-wider">Featured</span>
                      </div>
                      <div className="flex items-center gap-2 mb-4">
                        <span className="px-3 py-1 bg-brand-accent/10 text-brand-accent text-xs font-semibold rounded-full uppercase tracking-wider">
                          {featuredPosts[0].category}
                        </span>
                      </div>
                      <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-brand-text mb-4 leading-tight group-hover:text-brand-accent transition-colors">
                        {featuredPosts[0].title}
                      </h2>
                      <p className="text-brand-text/70 text-base sm:text-lg mb-6 line-clamp-3">
                        {featuredPosts[0].excerpt}
                      </p>
                      <div className="flex flex-wrap items-center gap-3 pt-4 mt-4 border-t border-brand-accent/10 text-xs text-brand-text/60">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3 h-3" />
                          <span>{featuredPosts[0].author.name}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>{new Date(featuredPosts[0].publishedDate).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{featuredPosts[0].readTime} min read</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                </div>

                {/* Sidebar - Recent Posts */}
                <div className="lg:col-span-1">
                  <div className="flex items-center gap-2 mb-6">
                    <div className="w-1 h-6 bg-brand-accent rounded-full"></div>
                    <h3 className="text-xl font-bold text-brand-text">
                      Latest Articles
                    </h3>
                  </div>
                  <div className="space-y-4">
                    {filteredPosts.slice(0, 4).map((post, idx) => (
                      <Link
                        key={post.slug}
                        to={`/blog/${post.slug}`}
                        className="group block p-4 bg-brand-secondary/20 hover:bg-brand-secondary/30 rounded-xl border border-brand-accent/10 hover:border-brand-accent/30 transition-all"
                      >
                        <div className="flex items-start gap-3">
                          <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-brand-accent/10 text-brand-accent font-bold text-sm rounded-lg">
                            {idx + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-brand-text text-sm mb-1 line-clamp-2 group-hover:text-brand-accent transition-colors">
                              {post.title}
                            </h4>
                            <div className="flex items-center gap-3 text-xs text-brand-text/60">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(post.publishedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {post.readTime} min
                              </span>
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* All Posts Grid */}
          <div>
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl sm:text-3xl font-bold text-brand-text flex items-center gap-3">
                <span className="w-1 h-8 bg-brand-accent rounded-full"></span>
                {selectedCategory === 'all' ? 'All Articles' : selectedCategory}
              </h2>
              <span className="text-sm text-brand-text/60">
                {filteredPosts.length} {filteredPosts.length === 1 ? 'article' : 'articles'}
              </span>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPosts.map(post => (
                <Link
                  key={post.slug}
                  to={`/blog/${post.slug}`}
                  className="group relative bg-gradient-to-br from-brand-secondary/30 to-brand-secondary/10 rounded-xl overflow-hidden border border-brand-accent/10 hover:border-brand-accent/30 hover:shadow-xl hover:shadow-brand-accent/5 transition-all duration-300"
                >
                  <div className="p-5 sm:p-6">
                    {/* Category Indicator */}
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-brand-accent/10 rounded-full mb-4">
                      <div className="w-1 h-1 rounded-full bg-brand-accent"></div>
                      <span className="text-xs font-semibold text-brand-accent uppercase tracking-wider">
                        {post.category}
                      </span>
                    </div>
                    <h3 className="text-xl sm:text-2xl font-bold text-brand-text mb-3 leading-tight group-hover:text-brand-accent transition-colors">
                      {post.title}
                    </h3>
                    <p className="text-brand-text/70 text-sm sm:text-base mb-4 line-clamp-2">
                      {post.excerpt}
                    </p>
                    <div className="flex items-center justify-between pt-3 border-t border-brand-accent/5">
                      <div className="flex items-center gap-1.5 text-xs text-brand-text/60">
                        <User className="w-3 h-3" />
                        <span>{post.author.name}</span>
                      </div>
                      <div className="flex items-center gap-2.5 text-xs text-brand-text/60">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(post.publishedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {post.readTime} min
                        </span>
                      </div>
                    </div>
                    {post.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-brand-accent/10">
                        {post.tags.slice(0, 3).map(tag => (
                          <span 
                            key={tag}
                            className="text-xs bg-brand-accent/5 text-brand-accent/80 px-2 py-1 rounded-md font-medium"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ArrowRight className="w-4 h-4 text-brand-accent" />
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
