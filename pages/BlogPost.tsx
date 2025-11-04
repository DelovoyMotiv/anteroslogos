import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Calendar, Clock, User, ArrowLeft, Share2, BookOpen, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { generateBlogPostingSchema, injectSchema } from '../utils/schemas';
import { getPostBySlug, getRelatedPosts, NADEZHDA_AUTHOR } from '../data/blogPosts';
import type { BlogPost } from '../data/blogPosts';

// Content now comes from blogPosts.ts data structure

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<BlogPost[]>([]);
  const [readingProgress, setReadingProgress] = useState(0);
  const [showShareToast, setShowShareToast] = useState(false);

  useEffect(() => {
    if (!slug) return;
    
    const foundPost = getPostBySlug(slug);
    if (foundPost) {
      setPost(foundPost);
      setRelatedPosts(getRelatedPosts(slug, 3));
      
      // Set page title
      document.title = `${foundPost.title} | Anóteros Lógos Blog`;
      
      // Inject Article schema with Nadezhda as author
      const articleSchema = generateBlogPostingSchema({
        headline: foundPost.title,
        description: foundPost.excerpt,
        url: `https://anoteroslogos.com/blog/${foundPost.slug}`,
        datePublished: foundPost.publishedDate,
        dateModified: foundPost.modifiedDate,
        author: {
          name: NADEZHDA_AUTHOR.name,
          url: `https://anoteroslogos.com/author/${NADEZHDA_AUTHOR.slug}`,
          image: NADEZHDA_AUTHOR.image ? `https://anoteroslogos.com${NADEZHDA_AUTHOR.image}` : undefined,
          jobTitle: 'Co-founder & CEO Marketing',
          description: NADEZHDA_AUTHOR.bio,
          email: 'nadezhda@anoteroslogos.com',
          expertise: ['Strategic Marketing', 'Brand Development', 'GEO Strategy', 'Digital Authority'],
          knowsAbout: ['Generative Engine Optimization', 'Brand Architecture', 'AI Marketing', 'E-E-A-T Signals'],
          affiliation: {
            name: 'Anóteros Lógos',
            url: 'https://anoteroslogos.com'
          }
        },
        image: foundPost.image ? {
          url: `https://anoteroslogos.com${foundPost.image}`,
          width: 1200,
          height: 630
        } : undefined,
        keywords: foundPost.tags,
        articleSection: foundPost.category,
        wordCount: foundPost.content.split(/\s+/).length,
        isAccessibleForFree: true,
        speakable: {
          cssSelector: ['h1', 'h2', 'p']
        },
        about: [
          { type: 'Thing', name: 'Generative Engine Optimization' },
          { type: 'Thing', name: foundPost.category }
        ]
      });
      injectSchema(articleSchema);
    }
  }, [slug]);

  const handleShare = async () => {
    const shareData = {
      title: post?.title || '',
      text: post?.excerpt || '',
      url: window.location.href
    };

    try {
      if (navigator.share && navigator.canShare(shareData)) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        setShowShareToast(true);
        setTimeout(() => setShowShareToast(false), 3000);
      }
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        await navigator.clipboard.writeText(window.location.href);
        setShowShareToast(true);
        setTimeout(() => setShowShareToast(false), 3000);
      }
    }
  };

  useEffect(() => {
    const updateReadingProgress = () => {
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight - windowHeight;
      const scrolled = window.scrollY;
      const progress = (scrolled / documentHeight) * 100;
      setReadingProgress(progress);
    };

    window.addEventListener('scroll', updateReadingProgress);
    return () => window.removeEventListener('scroll', updateReadingProgress);
  }, []);

  if (!post) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center pt-28 sm:pt-32 md:pt-36 lg:pt-40">
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
    <div className="min-h-screen bg-brand-bg">
      {/* Share Toast Notification */}
      {showShareToast && (
        <div className="fixed top-24 right-4 z-50 bg-brand-accent text-white px-6 py-3 rounded-lg shadow-lg animate-fade-in">
          Link copied to clipboard!
        </div>
      )}
      {/* Reading Progress Bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-brand-secondary/20 z-40">
        <div 
          className="h-full bg-gradient-to-r from-brand-accent to-blue-500 transition-all duration-150"
          style={{ width: `${readingProgress}%` }}
        />
      </div>
      
      <Header 
        onMethodClick={() => navigate('/')} 
        onClientsClick={() => navigate('/')} 
        onContactClick={() => navigate('/')}
      />
      <div className="pb-16" style={{ paddingTop: 'calc(var(--header-height) + 3rem)' }}>
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
          <header className="mb-16">
            {/* Category Badge */}
            <div className="flex items-center gap-3 mb-6">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-brand-accent/10 border border-brand-accent/30 rounded-full">
                <Sparkles className="w-3.5 h-3.5 text-brand-accent" />
                <span className="text-xs font-semibold text-brand-accent uppercase tracking-wider">{post.category}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-brand-text/60">
                <BookOpen className="w-3.5 h-3.5" />
                <span>{post.readTime} min read</span>
              </div>
            </div>

            {/* Title */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-brand-text mb-6 leading-tight">
              {post.title}
            </h1>

            {/* Excerpt */}
            <p className="text-xl text-brand-text/70 mb-8 leading-relaxed">
              {post.excerpt}
            </p>

            {/* Author & Meta */}
            <div className="flex flex-wrap items-center gap-4 sm:gap-6 pb-8 mb-8 border-b border-brand-accent/10">
              <Link 
                to={`/author/${post.author.slug}`}
                className="flex items-center gap-3 text-brand-text hover:text-brand-accent transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-brand-accent/10 flex items-center justify-center border-2 border-brand-accent/20">
                  <User className="w-5 h-5 text-brand-accent" />
                </div>
                <div className="flex flex-col">
                  <span className="font-semibold text-sm">{post.author.name}</span>
                  <span className="text-xs text-brand-text/60">Co-founder & CEO Marketing</span>
                </div>
              </Link>
              <div className="h-8 w-px bg-brand-accent/20 hidden sm:block" />
              <div className="flex items-center gap-1 text-sm">
                <Calendar className="w-4 h-4" />
                <span>{new Date(post.publishedDate).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}</span>
              </div>
              <button 
                onClick={handleShare}
                className="flex items-center gap-2 px-4 py-2 bg-brand-accent/10 hover:bg-brand-accent/20 text-brand-accent rounded-lg transition-colors ml-auto"
              >
                <Share2 className="w-4 h-4" />
                <span className="text-sm font-medium">Share</span>
              </button>
            </div>
          </header>

          {/* Tags */}
          {post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-12 pb-12 border-b border-brand-accent/10">
              {post.tags.map(tag => (
                <span 
                  key={tag}
                  className="px-4 py-2 bg-brand-secondary/30 hover:bg-brand-secondary/40 text-brand-text/80 text-sm rounded-lg border border-brand-accent/10 transition-colors cursor-pointer"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Content */}
          <div className="prose prose-invert prose-lg prose-headings:text-brand-text prose-headings:font-bold prose-h1:text-4xl prose-h1:mt-0 prose-h1:mb-8 prose-h2:text-3xl prose-h2:mt-12 prose-h2:mb-6 prose-h3:text-2xl prose-h3:mt-8 prose-h3:mb-4 prose-p:text-brand-text/80 prose-p:leading-relaxed prose-p:mb-6 prose-strong:text-brand-text prose-strong:font-semibold prose-a:text-brand-accent hover:prose-a:text-brand-accent/80 prose-ul:my-6 prose-ul:list-disc prose-ul:pl-6 prose-li:text-brand-text/80 prose-li:mb-2 prose-code:text-brand-accent prose-code:bg-brand-secondary/30 prose-code:px-2 prose-code:py-1 prose-code:rounded prose-pre:bg-brand-secondary/20 prose-pre:border prose-pre:border-brand-accent/10 prose-pre:rounded-lg prose-pre:p-4 max-w-none mb-16">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {post.content}
            </ReactMarkdown>
          </div>

          {/* Related Posts */}
          {relatedPosts.length > 0 && (
            <div className="mt-16 pt-12 border-t border-brand-accent/20">
              <h3 className="text-2xl sm:text-3xl font-bold text-brand-text mb-8 flex items-center gap-3">
                <span className="w-1 h-8 bg-brand-accent rounded-full"></span>
                Related Articles
              </h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {relatedPosts.map(relatedPost => (
                  <Link
                    key={relatedPost.slug}
                    to={`/blog/${relatedPost.slug}`}
                    className="group bg-gradient-to-br from-brand-secondary/30 to-brand-secondary/10 rounded-xl p-5 border border-brand-accent/10 hover:border-brand-accent/30 hover:shadow-lg hover:shadow-brand-accent/5 transition-all"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <span className="px-2 py-1 bg-brand-accent/10 text-brand-accent text-xs font-semibold rounded-md uppercase tracking-wider">
                        {relatedPost.category}
                      </span>
                    </div>
                    <h4 className="text-lg font-bold text-brand-text mb-2 line-clamp-2 group-hover:text-brand-accent transition-colors">
                      {relatedPost.title}
                    </h4>
                    <p className="text-brand-text/60 text-sm line-clamp-2 mb-3">{relatedPost.excerpt}</p>
                    <div className="flex items-center gap-2 text-xs text-brand-text/50">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{relatedPost.readTime} min read</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Author Bio */}
          <div className="mt-16 pt-12 border-t border-brand-accent/20">
            <Link 
              to={`/author/${post.author.slug}`}
              className="flex items-start gap-6 bg-brand-secondary/20 rounded-2xl p-6 hover:bg-brand-secondary/30 transition-colors group"
            >
              <div className="w-20 h-20 rounded-full bg-brand-accent/10 flex items-center justify-center border-2 border-brand-accent/20 flex-shrink-0">
                <User className="w-10 h-10 text-brand-accent" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-brand-text mb-2 group-hover:text-brand-accent transition-colors">
                  {post.author.name}
                </h3>
                <p className="text-brand-text/70 mb-3">
                  {post.author.bio || 'Co-founder & CEO Marketing at Anóteros Lógos.'}
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
