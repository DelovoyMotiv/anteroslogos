import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { generatePersonSchema, injectSchema } from '../utils/schemas';
import { BookOpen, Award, Linkedin, Twitter, Github, Mail, ExternalLink, AlertCircle, Calendar, Clock } from 'lucide-react';

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category?: {
    name: string;
    slug: string;
  };
  published_date: string;
  read_time: number;
}

interface Author {
  id: string;
  name: string;
  slug: string;
  bio?: string;
  image_url?: string;
  email?: string;
  job_title?: string;
  expertise?: string[];
  knows_about?: string[];
}

interface AuthorData {
  author: Author;
  posts: BlogPost[];
}

export default function Author() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [authorData, setAuthorData] = useState<AuthorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;

    const fetchAuthor = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/blog?action=author&slug=${slug}`);
        
        if (response.status === 404) {
          setError('Author not found');
          setLoading(false);
          return;
        }

        if (!response.ok) {
          throw new Error('Failed to fetch author');
        }

        const data = await response.json();
        setAuthorData(data);

        // Set page title
        document.title = `${data.author.name} - Author | Anóteros Lógos`;
        
        // Set canonical URL
        let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
        if (!canonical) {
          canonical = document.createElement('link');
          canonical.rel = 'canonical';
          document.head.appendChild(canonical);
        }
        canonical.href = `https://anoteroslogos.com/author/${data.author.slug}`;
        
        // Inject Person schema for E-E-A-T
        const personSchema = generatePersonSchema({
          name: data.author.name,
          url: `https://anoteroslogos.com/author/${data.author.slug}`,
          image: data.author.image_url,
          jobTitle: data.author.job_title || 'Author',
          description: data.author.bio,
          sameAs: data.author.email ? [`mailto:${data.author.email}`] : [],
          email: data.author.email
        });
        injectSchema(personSchema);
      } catch (err) {
        console.error('Error fetching author:', err);
        setError(err instanceof Error ? err.message : 'Failed to load author');
      } finally {
        setLoading(false);
      }
    };

    fetchAuthor();
  }, [slug]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-brand-bg">
        <Header 
          onMethodClick={() => navigate('/')} 
          onClientsClick={() => navigate('/')} 
          onContactClick={() => navigate('/')}
        />
        <div className="pb-16" style={{ paddingTop: 'calc(var(--header-height) + 3rem)' }}>
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <div className="w-16 h-16 border-4 border-brand-accent/20 border-t-brand-accent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-brand-text/60">Loading author profile...</p>
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

  // Error state
  if (error || !authorData) {
    return (
      <div className="min-h-screen bg-brand-bg">
        <Header 
          onMethodClick={() => navigate('/')} 
          onClientsClick={() => navigate('/')} 
          onContactClick={() => navigate('/')}
        />
        <div className="pb-16" style={{ paddingTop: 'calc(var(--header-height) + 3rem)' }}>
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
              <AlertCircle className="w-16 h-16 text-brand-accent mb-4" />
              <h1 className="text-4xl font-bold text-brand-text mb-4">Author Not Found</h1>
              <p className="text-brand-text/60 mb-6">The author you're looking for doesn't exist.</p>
              <Link 
                to="/blog" 
                className="px-6 py-3 bg-brand-accent text-white rounded-lg font-semibold hover:bg-brand-accent/90 transition-colors"
              >
                Back to Blog
              </Link>
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

  const { author, posts } = authorData;

  return (
    <div className="min-h-screen bg-brand-bg">
      <Header 
        onMethodClick={() => navigate('/')} 
        onClientsClick={() => navigate('/')} 
        onContactClick={() => navigate('/')}
      />
      <div className="pb-16" style={{ paddingTop: 'calc(var(--header-height) + 3rem)' }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Author Header */}
          <div className="bg-brand-secondary/30 rounded-2xl p-8 mb-12 border border-brand-accent/10">
            <div className="flex flex-col md:flex-row gap-8 items-start">
              {author.image_url ? (
                <img 
                  src={author.image_url} 
                  alt={author.name}
                  className="w-32 h-32 rounded-full object-cover border-4 border-brand-accent/20"
                />
              ) : (
                <div className="w-32 h-32 rounded-full bg-brand-accent/10 flex items-center justify-center border-4 border-brand-accent/20">
                  <span className="text-4xl font-bold text-brand-accent">
                    {author.name.charAt(0)}
                  </span>
                </div>
              )}
              <div className="flex-1">
                <h1 className="text-4xl font-bold text-brand-text mb-2">{author.name}</h1>
                <p className="text-xl text-brand-accent mb-4">{author.job_title || 'Author'}</p>
                {author.bio && (
                  <p className="text-brand-text/80 text-lg mb-6">{author.bio}</p>
                )}
                
                {/* Social Links */}
                <div className="flex flex-wrap gap-4">
                  {author.email && (
                    <a 
                      href={`mailto:${author.email}`}
                      className="flex items-center gap-2 text-brand-text/60 hover:text-brand-accent transition-colors"
                    >
                      <Mail className="w-5 h-5" />
                      <span>Email</span>
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Expertise */}
          {author.expertise && author.expertise.length > 0 && (
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-brand-text mb-6">Areas of Expertise</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {author.expertise.map((skill, index) => (
                  <div 
                    key={index}
                    className="bg-brand-secondary/30 rounded-lg p-4 border border-brand-accent/10 hover:border-brand-accent/30 transition-colors"
                  >
                    <p className="text-brand-text">{skill}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Knowledge Areas */}
          {author.knows_about && author.knows_about.length > 0 && (
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-brand-text mb-6 flex items-center gap-3">
                <BookOpen className="w-8 h-8 text-brand-accent" />
                Knowledge Areas
              </h2>
              <div className="flex flex-wrap gap-3">
                {author.knows_about.map((topic, index) => (
                  <span 
                    key={index}
                    className="px-4 py-2 bg-brand-accent/10 text-brand-accent rounded-lg border border-brand-accent/20"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Published Articles */}
          {posts.length > 0 && (
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-brand-text mb-6 flex items-center gap-3">
                <ExternalLink className="w-8 h-8 text-brand-accent" />
                Published Articles ({posts.length})
              </h2>
              <div className="space-y-4">
                {posts.map(post => (
                  <Link
                    key={post.id}
                    to={`/blog/${post.slug}`}
                    className="block bg-brand-secondary/20 hover:bg-brand-secondary/30 rounded-xl p-6 border border-brand-accent/10 hover:border-brand-accent/30 transition-all group"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        {post.category && (
                          <span className="inline-block px-3 py-1 bg-brand-accent/10 text-brand-accent text-xs font-semibold rounded-full uppercase tracking-wider mb-3">
                            {post.category.name}
                          </span>
                        )}
                        <h3 className="text-xl font-bold text-brand-text mb-2 group-hover:text-brand-accent transition-colors">
                          {post.title}
                        </h3>
                        <p className="text-brand-text/70 mb-3">{post.excerpt}</p>
                        <div className="flex items-center gap-4 text-sm text-brand-text/60">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {new Date(post.published_date).toLocaleDateString('en-US', { 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric' 
                            })}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {post.read_time} min read
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* CTA */}
          {author.email && (
            <div className="bg-gradient-to-br from-brand-accent/10 to-purple-600/10 rounded-2xl p-8 text-center border border-brand-accent/20">
              <h3 className="text-2xl font-bold text-brand-text mb-4">
                Connect with {author.name.split(' ')[0]}
              </h3>
              <p className="text-brand-text/70 mb-6 max-w-2xl mx-auto">
                Interested in learning more about GEO and The Nicosia Method™? 
                Reach out to discuss how we can help establish your brand as a source of truth for AI systems.
              </p>
              <a 
                href={`mailto:${author.email}`}
                className="inline-flex items-center gap-2 bg-brand-accent text-white px-8 py-3 rounded-full font-semibold hover:bg-brand-accent/90 transition-colors"
              >
                <Mail className="w-5 h-5" />
                Get in Touch
              </a>
            </div>
          )}
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
