import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Calendar, Clock, User, ArrowRight, Tag } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { BLOG_POSTS, getBlogCategories, getFeaturedPosts, getPostsByCategory } from '../data/blogPosts';
import type { BlogPost } from '../data/blogPosts';

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
      <div className="pt-32 sm:pt-36 md:pt-40 lg:pt-44 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Page Header */}
          <div className="mb-10 sm:mb-12">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-brand-text mb-4">
              Blog
            </h1>
            <p className="text-base sm:text-lg text-brand-text/60">
              Insights on Generative Engine Optimization
            </p>
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap justify-start gap-2 sm:gap-3 mb-12 sm:mb-14">
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

          {/* Featured Posts */}
          {selectedCategory === 'all' && featuredPosts.length > 0 && (
            <div className="mb-12 sm:mb-16">
              <h2 className="text-2xl sm:text-3xl font-bold text-brand-text mb-6 sm:mb-8 flex items-center gap-3">
                <span className="w-1 h-8 bg-brand-accent rounded-full"></span>
                Featured Articles
              </h2>
              <div className="grid sm:grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
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
                    <div className="p-4 sm:p-6">
                      <div className="flex items-center gap-2 text-brand-accent text-sm mb-3">
                        <Tag className="w-4 h-4" />
                        <span>{post.category}</span>
                      </div>
                      <h3 className="text-xl sm:text-2xl font-bold text-brand-text mb-3 group-hover:text-brand-accent transition-colors">
                        {post.title}
                      </h3>
                      <p className="text-brand-text/70 mb-4">{post.excerpt}</p>
                      <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-2 sm:gap-0 text-xs sm:text-sm text-brand-text/60">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4" />
                          <span>{post.author.name}</span>
                        </div>
                        <div className="flex items-center gap-3 sm:gap-4">
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
            <h2 className="text-2xl sm:text-3xl font-bold text-brand-text mb-6 sm:mb-8 flex items-center gap-3">
              <span className="w-1 h-8 bg-brand-accent rounded-full"></span>
              {selectedCategory === 'all' ? 'All Articles' : selectedCategory}
            </h2>
            <div className="grid gap-6">
              {filteredPosts.map(post => (
                <Link
                  key={post.slug}
                  to={`/blog/${post.slug}`}
                  className="group bg-brand-secondary/20 rounded-xl p-4 sm:p-6 border border-brand-accent/10 hover:border-brand-accent/30 hover:bg-brand-secondary/30 transition-all"
                >
                  <div className="flex flex-col md:flex-row gap-4 sm:gap-6">
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
                      <h3 className="text-xl sm:text-2xl font-bold text-brand-text mb-2 group-hover:text-brand-accent transition-colors flex items-center gap-2">
                        {post.title}
                        <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </h3>
                      <p className="text-brand-text/70 mb-4">{post.excerpt}</p>
                      <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-xs sm:text-sm text-brand-text/60">
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
