/**
 * Schema.org Utilities for SEO/GEO
 * Provides reusable structured data generation for AI crawlers
 */

export interface AuthorData {
  name: string;
  url: string;
  image?: string;
  jobTitle?: string;
  description?: string;
  sameAs?: string[];
  email?: string;
}

export interface ArticleData {
  headline: string;
  description: string;
  url: string;
  datePublished: string;
  dateModified: string;
  author: AuthorData;
  image?: {
    url: string;
    width?: number;
    height?: number;
  };
  keywords?: string[];
  articleSection?: string;
  wordCount?: number;
}

/**
 * Generate Person schema for authors
 * Critical for E-E-A-T signals in AI systems
 */
export function generatePersonSchema(author: AuthorData) {
  return {
    "@type": "Person",
    "@id": author.url,
    "name": author.name,
    "url": author.url,
    ...(author.image && {
      "image": {
        "@type": "ImageObject",
        "url": author.image
      }
    }),
    ...(author.jobTitle && { "jobTitle": author.jobTitle }),
    ...(author.description && { "description": author.description }),
    ...(author.sameAs && author.sameAs.length > 0 && { "sameAs": author.sameAs }),
    ...(author.email && {
      "contactPoint": {
        "@type": "ContactPoint",
        "contactType": "professional",
        "email": author.email
      }
    })
  };
}

/**
 * Generate Article schema with author attribution
 * Enables proper content categorization for AI systems
 */
export function generateArticleSchema(article: ArticleData) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": article.headline,
    "description": article.description,
    "url": article.url,
    "datePublished": article.datePublished,
    "dateModified": article.dateModified,
    "author": generatePersonSchema(article.author),
    "publisher": {
      "@type": "Organization",
      "@id": "https://anoteroslogos.com/#organization",
      "name": "Anóteros Lógos",
      "logo": {
        "@type": "ImageObject",
        "url": "https://anoteroslogos.com/logo.png",
        "width": 512,
        "height": 512
      }
    },
    ...(article.image && {
      "image": {
        "@type": "ImageObject",
        "url": article.image.url,
        ...(article.image.width && { "width": article.image.width }),
        ...(article.image.height && { "height": article.image.height })
      }
    }),
    ...(article.keywords && article.keywords.length > 0 && {
      "keywords": article.keywords.join(", ")
    }),
    ...(article.articleSection && { "articleSection": article.articleSection }),
    ...(article.wordCount && { "wordCount": article.wordCount }),
    "inLanguage": "en-US",
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": article.url
    }
  };
}

/**
 * Generate BlogPosting schema (extends Article)
 * Optimized for blog content and knowledge base articles
 */
export function generateBlogPostingSchema(article: ArticleData) {
  const schema = generateArticleSchema(article);
  return {
    ...schema,
    "@type": "BlogPosting"
  };
}

/**
 * Generate NewsArticle schema
 * For time-sensitive news and announcements
 */
export function generateNewsArticleSchema(article: ArticleData) {
  const schema = generateArticleSchema(article);
  return {
    ...schema,
    "@type": "NewsArticle"
  };
}

/**
 * Inject schema into page head
 */
export function injectSchema(schema: object) {
  if (typeof document === 'undefined') return;
  
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify(schema, null, 2);
  document.head.appendChild(script);
}

/**
 * Default author - Mostafa ElBermawy
 */
export const MOSTAFA_ELBERMAWY: AuthorData = {
  name: "Mostafa ElBermawy",
  url: "https://anoteroslogos.com/author/mostafa-elbermawy",
  image: "https://anoteroslogos.com/images/authors/mostafa-elbermawy.jpg",
  jobTitle: "Founder & Chief GEO Architect",
  description: "Pioneering strategist in Generative Engine Optimization (GEO) and AI-first digital authority architecture.",
  sameAs: [
    "https://x.com/MostafaElBermawy",
    "https://twitter.com/MostafaElBermawy",
    "https://linkedin.com/in/mostafa-elbermawy",
    "https://github.com/mostafa-elbermawy"
  ],
  email: "mostafa@anoteroslogos.com"
};
