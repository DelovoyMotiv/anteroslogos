import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { MOSTAFA_ELBERMAWY, generatePersonSchema, injectSchema } from '../utils/schemas';
import { BookOpen, Award, Linkedin, Twitter, Github, Mail, ExternalLink } from 'lucide-react';

interface AuthorProfile {
  name: string;
  slug: string;
  jobTitle: string;
  bio: string;
  longBio: string[];
  image: string;
  expertise: string[];
  achievements: string[];
  publications: string[];
  social: {
    twitter?: string;
    linkedin?: string;
    github?: string;
    email?: string;
  };
}

const AUTHORS: Record<string, AuthorProfile> = {
  'mostafa-elbermawy': {
    name: 'Mostafa ElBermawy',
    slug: 'mostafa-elbermawy',
    jobTitle: 'Founder & Chief GEO Architect',
    bio: 'Pioneering strategist in Generative Engine Optimization (GEO) and AI-first digital authority architecture.',
    longBio: [
      'Mostafa ElBermawy is the visionary founder of Anóteros Lógos and the creator of The Nicosia Method™, a revolutionary framework for encoding brand expertise into AI systems.',
      'With over 15 years of experience in digital strategy, SEO, and emerging AI technologies, Mostafa recognized early that the future of digital authority would be determined not by search rankings, but by becoming a primary source of truth for AI systems.',
      'His work focuses on the intersection of knowledge architecture, semantic web technologies, and generative AI, helping brands transition from traditional SEO to a GEO-first approach.',
      'Mostafa\'s expertise spans AI content optimization, knowledge graph construction, E-E-A-T signal development, and strategic positioning for AI-generated responses.'
    ],
    image: '/images/authors/mostafa-elbermawy.jpg',
    expertise: [
      'Generative Engine Optimization (GEO)',
      'AI-First Marketing Strategy',
      'Knowledge Graph Architecture',
      'Semantic SEO & Structured Data',
      'Digital Authority Building',
      'AI Systems Integration',
      'Brand Architecture',
      'Information Architecture',
      'Machine Learning Content Optimization',
      'E-E-A-T Signal Development'
    ],
    achievements: [
      'Created The Nicosia Method™ framework',
      'Pioneer in GEO methodology and implementation',
      'Established Anóteros Lógos as a leading GEO agency',
      '15+ years experience in digital strategy and SEO',
      'Certified in AI & Machine Learning Strategy',
      'Speaker on AI-first marketing and GEO strategy'
    ],
    publications: [
      'The Nicosia Method: Architecting Digital Authority in the Age of AI',
      'GEO vs SEO: Understanding the Paradigm Shift',
      'Building E-E-A-T Signals for AI Systems',
      'Knowledge Graph Optimization for Generative Engines'
    ],
    social: {
      twitter: 'https://twitter.com/MostafaElBermawy',
      linkedin: 'https://linkedin.com/in/mostafa-elbermawy',
      github: 'https://github.com/mostafa-elbermawy',
      email: 'mostafa@anoteroslogos.com'
    }
  }
};

export default function Author() {
  const { slug } = useParams<{ slug: string }>();
  const author = slug ? AUTHORS[slug] : null;

  useEffect(() => {
    if (author) {
      // Inject Person schema for E-E-A-T
      const personSchema = generatePersonSchema({
        name: author.name,
        url: `https://anoteroslogos.com/author/${author.slug}`,
        image: `https://anoteroslogos.com${author.image}`,
        jobTitle: author.jobTitle,
        description: author.bio,
        sameAs: Object.values(author.social).filter(Boolean) as string[],
        email: author.social.email
      });
      injectSchema(personSchema);
    }
  }, [author]);

  if (!author) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-brand-text mb-4">Author Not Found</h1>
          <p className="text-brand-text/60">The author you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{author.name} - Author | Anóteros Lógos</title>
        <meta name="description" content={author.bio} />
        <meta name="author" content={author.name} />
        <link rel="canonical" href={`https://anoteroslogos.com/author/${author.slug}`} />
        
        {/* Open Graph */}
        <meta property="og:type" content="profile" />
        <meta property="og:title" content={`${author.name} - ${author.jobTitle}`} />
        <meta property="og:description" content={author.bio} />
        <meta property="og:url" content={`https://anoteroslogos.com/author/${author.slug}`} />
        <meta property="og:image" content={`https://anoteroslogos.com${author.image}`} />
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={`${author.name} - ${author.jobTitle}`} />
        <meta name="twitter:description" content={author.bio} />
        <meta name="twitter:image" content={`https://anoteroslogos.com${author.image}`} />
      </Helmet>

      <div className="min-h-screen bg-brand-bg pt-24 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Author Header */}
          <div className="bg-brand-secondary/30 rounded-2xl p-8 mb-12 border border-brand-accent/10">
            <div className="flex flex-col md:flex-row gap-8 items-start">
              <img 
                src={author.image} 
                alt={author.name}
                className="w-32 h-32 rounded-full object-cover border-4 border-brand-accent/20"
              />
              <div className="flex-1">
                <h1 className="text-4xl font-bold text-brand-text mb-2">{author.name}</h1>
                <p className="text-xl text-brand-accent mb-4">{author.jobTitle}</p>
                <p className="text-brand-text/80 text-lg mb-6">{author.bio}</p>
                
                {/* Social Links */}
                <div className="flex flex-wrap gap-4">
                  {author.social.twitter && (
                    <a 
                      href={author.social.twitter}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-brand-text/60 hover:text-brand-accent transition-colors"
                    >
                      <Twitter className="w-5 h-5" />
                      <span>Twitter</span>
                    </a>
                  )}
                  {author.social.linkedin && (
                    <a 
                      href={author.social.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-brand-text/60 hover:text-brand-accent transition-colors"
                    >
                      <Linkedin className="w-5 h-5" />
                      <span>LinkedIn</span>
                    </a>
                  )}
                  {author.social.github && (
                    <a 
                      href={author.social.github}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-brand-text/60 hover:text-brand-accent transition-colors"
                    >
                      <Github className="w-5 h-5" />
                      <span>GitHub</span>
                    </a>
                  )}
                  {author.social.email && (
                    <a 
                      href={`mailto:${author.social.email}`}
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

          {/* Biography */}
          <section className="mb-12">
            <h2 className="text-3xl font-bold text-brand-text mb-6 flex items-center gap-3">
              <BookOpen className="w-8 h-8 text-brand-accent" />
              Biography
            </h2>
            <div className="space-y-4 text-brand-text/80 text-lg leading-relaxed">
              {author.longBio.map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>
          </section>

          {/* Expertise */}
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

          {/* Achievements */}
          <section className="mb-12">
            <h2 className="text-3xl font-bold text-brand-text mb-6 flex items-center gap-3">
              <Award className="w-8 h-8 text-brand-accent" />
              Achievements & Recognition
            </h2>
            <ul className="space-y-3">
              {author.achievements.map((achievement, index) => (
                <li 
                  key={index}
                  className="flex items-start gap-3 text-brand-text/80 text-lg"
                >
                  <span className="text-brand-accent mt-1">✓</span>
                  <span>{achievement}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Publications */}
          <section className="mb-12">
            <h2 className="text-3xl font-bold text-brand-text mb-6 flex items-center gap-3">
              <ExternalLink className="w-8 h-8 text-brand-accent" />
              Publications & Thought Leadership
            </h2>
            <ul className="space-y-3">
              {author.publications.map((publication, index) => (
                <li 
                  key={index}
                  className="flex items-start gap-3 text-brand-text/80 text-lg"
                >
                  <span className="text-brand-accent mt-1">→</span>
                  <span>{publication}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* CTA */}
          <div className="bg-gradient-to-br from-brand-accent/10 to-purple-600/10 rounded-2xl p-8 text-center border border-brand-accent/20">
            <h3 className="text-2xl font-bold text-brand-text mb-4">
              Connect with {author.name.split(' ')[0]}
            </h3>
            <p className="text-brand-text/70 mb-6 max-w-2xl mx-auto">
              Interested in learning more about GEO and The Nicosia Method™? 
              Reach out to discuss how we can help establish your brand as a source of truth for AI systems.
            </p>
            <a 
              href={`mailto:${author.social.email}`}
              className="inline-flex items-center gap-2 bg-brand-accent text-white px-8 py-3 rounded-full font-semibold hover:bg-brand-accent/90 transition-colors"
            >
              <Mail className="w-5 h-5" />
              Get in Touch
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
