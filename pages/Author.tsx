import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { generatePersonSchema, injectSchema } from '../utils/schemas';
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
  'nadezhda-nikolaeva': {
    name: 'Nadezhda Nikolaeva',
    slug: 'nadezhda-nikolaeva',
    jobTitle: 'Co-founder & CEO Marketing',
    bio: 'Leading the strategic vision and marketing direction of Anóteros Lógos with expertise in brand architecture and digital authority positioning.',
    longBio: [
      'Nadezhda Nikolaeva is the co-founder and CEO Marketing of Anóteros Lógos, leading the strategic vision and marketing direction of the agency.',
      'With deep expertise in strategic marketing, brand development, and client relations, Nadezhda brings a unique perspective to Generative Engine Optimization (GEO), focusing on how brands can establish meaningful presence in AI-driven ecosystems.',
      'Her work emphasizes the intersection of brand architecture, digital authority positioning, and AI-first marketing strategies, ensuring clients achieve not just visibility, but genuine authority in their domains.',
      'Nadezhda\'s expertise spans strategic marketing planning, GEO strategy, brand architecture, client relations, and translating complex technical concepts into actionable marketing initiatives that drive measurable results.'
    ],
    image: '/images/authors/nadezhda-nikolaeva.jpg',
    expertise: [
      'Strategic Marketing',
      'Brand Development',
      'Client Relations',
      'GEO Strategy',
      'Digital Authority Positioning',
      'Brand Architecture',
      'AI-First Marketing',
      'Marketing Leadership',
      'Strategic Partnerships',
      'Business Development'
    ],
    achievements: [
      'Co-founded Anóteros Lógos GEO agency',
      'Pioneered brand architecture for AI ecosystems',
      'Leading strategic marketing for Fortune 500 clients',
      'Expert in translating GEO into business value',
      'Speaker on brand authority in the AI era',
      'Established Anóteros Lógos as a thought leader in GEO'
    ],
    publications: [
      'Introduction to Generative Engine Optimization',
      'The Nicosia Method™: A Deep Dive',
      'Building E-E-A-T Signals That AI Systems Trust',
      'Knowledge Graphs: The Foundation of AI Authority'
    ],
    social: {
      linkedin: 'https://linkedin.com/in/nadezhda-nikolaeva',
      email: 'nadezhda@anoteroslogos.com'
    }
  },
  // Alias for backward compatibility
  'mostafa-elbermawy': {
    name: 'Nadezhda Nikolaeva',
    slug: 'nadezhda-nikolaeva',
    jobTitle: 'Co-founder & CEO Marketing',
    bio: 'Leading the strategic vision and marketing direction of Anóteros Lógos.',
    longBio: ['Redirecting to Nadezhda Nikolaeva profile...'],
    image: '/images/authors/nadezhda-nikolaeva.jpg',
    expertise: ['Strategic Marketing', 'GEO Strategy'],
    achievements: [],
    publications: [],
    social: {
      email: 'nadezhda@anoteroslogos.com'
    }
  }
};

export default function Author() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const author = slug ? AUTHORS[slug] : null;

  useEffect(() => {
    if (author) {
      // Set page title
      document.title = `${author.name} - Author | Anóteros Lógos`;
      
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
    <div className="min-h-screen bg-brand-bg">
      <Header 
        onMethodClick={() => navigate('/')} 
        onClientsClick={() => navigate('/')} 
        onInsightsClick={() => navigate('/')} 
        onTeamClick={() => navigate('/')} 
        onContactClick={() => navigate('/')}
      />
      <div className="pt-28 sm:pt-32 md:pt-36 lg:pt-40 pb-16">
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
