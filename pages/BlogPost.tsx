import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Calendar, Clock, User, ArrowLeft, Tag, Share2 } from 'lucide-react';
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
          image: `https://anoteroslogos.com${NADEZHDA_AUTHOR.image}`,
          jobTitle: 'Co-founder & CEO Marketing',
          description: NADEZHDA_AUTHOR.bio,
          email: 'nadezhda@anoteroslogos.com'
        },
        image: foundPost.image ? {
          url: `https://anoteroslogos.com${foundPost.image}`,
          width: 1200,
          height: 630
        } : undefined,
        keywords: foundPost.tags,
        articleSection: foundPost.category,
        wordCount: foundPost.content.split(/\s+/).length
      });
      injectSchema(articleSchema);
    }
  }, [slug]);

  if (!post) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center pt-24 sm:pt-28">
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
      <Header 
        onMethodClick={() => navigate('/')} 
        onClientsClick={() => navigate('/')} 
        onInsightsClick={() => navigate('/')} 
        onTeamClick={() => navigate('/')} 
        onContactClick={() => navigate('/')}
      />
      <div className="pt-24 sm:pt-28 pb-16">
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
              className="text-brand-text/90 leading-relaxed whitespace-pre-wrap"
            >
              {post.content}
            </div>
          </div>

          {/* Related Posts */}
          {relatedPosts.length > 0 && (
            <div className="mt-16 pt-12 border-t border-brand-accent/20">
              <h3 className="text-2xl font-bold text-brand-text mb-8">Related Articles</h3>
              <div className="grid md:grid-cols-3 gap-6">
                {relatedPosts.map(relatedPost => (
                  <Link
                    key={relatedPost.slug}
                    to={`/blog/${relatedPost.slug}`}
                    className="group bg-brand-secondary/20 rounded-xl p-4 border border-brand-accent/10 hover:border-brand-accent/30 transition-all"
                  >
                    <div className="flex items-center gap-2 text-brand-accent text-xs mb-2">
                      <Tag className="w-3 h-3" />
                      <span>{relatedPost.category}</span>
                    </div>
                    <h4 className="text-lg font-bold text-brand-text mb-2 group-hover:text-brand-accent transition-colors">
                      {relatedPost.title}
                    </h4>
                    <p className="text-brand-text/60 text-sm line-clamp-2">{relatedPost.excerpt}</p>
                    <div className="flex items-center gap-2 mt-3 text-xs text-brand-text/50">
                      <Clock className="w-3 h-3" />
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
