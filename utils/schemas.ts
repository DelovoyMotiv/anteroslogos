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
  expertise?: string[];
  knowsAbout?: string[];
  hasCredential?: Array<{
    name: string;
    credentialCategory?: string;
  }>;
  affiliation?: {
    name: string;
    url: string;
  };
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
  isAccessibleForFree?: boolean;
  speakable?: {
    cssSelector?: string[];
  };
  about?: Array<{
    type: string;
    name: string;
  }>;
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
    ...(author.expertise && author.expertise.length > 0 && { "expertise": author.expertise }),
    ...(author.knowsAbout && author.knowsAbout.length > 0 && { "knowsAbout": author.knowsAbout }),
    ...(author.hasCredential && author.hasCredential.length > 0 && {
      "hasCredential": author.hasCredential.map(cred => ({
        "@type": "EducationalOccupationalCredential",
        "name": cred.name,
        ...(cred.credentialCategory && { "credentialCategory": cred.credentialCategory })
      }))
    }),
    ...(author.affiliation && {
      "affiliation": {
        "@type": "Organization",
        "name": author.affiliation.name,
        "url": author.affiliation.url
      }
    }),
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
    "@type": "BlogPosting",
    "isAccessibleForFree": article.isAccessibleForFree !== false,
    ...(article.speakable && {
      "speakable": {
        "@type": "SpeakableSpecification",
        ...(article.speakable.cssSelector && { "cssSelector": article.speakable.cssSelector })
      }
    }),
    ...(article.about && article.about.length > 0 && {
      "about": article.about.map(item => ({
        "@type": item.type,
        "name": item.name
      }))
    })
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
 * Generate Organization schema with Knowledge Graph connections
 * Critical for entity recognition and AI understanding
 */
export interface OrganizationData {
  name: string;
  url: string;
  logo?: string;
  description?: string;
  foundingDate?: string;
  founder?: AuthorData[];
  sameAs?: string[];
  knowsAbout?: string[];
  about?: string[];
  slogan?: string;
  contactPoint?: {
    email: string;
    contactType: string;
  };
}

export function generateOrganizationSchema(org: OrganizationData) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${org.url}/#organization`,
    "name": org.name,
    "url": org.url,
    "legalName": org.name,
    ...(org.logo && {
      "logo": {
        "@type": "ImageObject",
        "url": org.logo,
        "width": 512,
        "height": 512
      }
    }),
    ...(org.description && { "description": org.description }),
    ...(org.foundingDate && { "foundingDate": org.foundingDate }),
    ...(org.slogan && { "slogan": org.slogan }),
    ...(org.founder && org.founder.length > 0 && {
      "founder": org.founder.map(f => generatePersonSchema(f))
    }),
    ...(org.sameAs && org.sameAs.length > 0 && { "sameAs": org.sameAs }),
    ...(org.knowsAbout && org.knowsAbout.length > 0 && { "knowsAbout": org.knowsAbout }),
    ...(org.about && org.about.length > 0 && { "about": org.about }),
    ...(org.contactPoint && {
      "contactPoint": {
        "@type": "ContactPoint",
        "contactType": org.contactPoint.contactType,
        "email": org.contactPoint.email
      }
    })
  };
}

/**
 * Generate BreadcrumbList schema for navigation
 */
export interface BreadcrumbItem {
  name: string;
  url: string;
}

export function generateBreadcrumbSchema(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.name,
      "item": item.url
    }))
  };
}

/**
 * Generate FAQPage schema for knowledge base
 */
export interface FAQItem {
  question: string;
  answer: string;
}

export function generateFAQSchema(faqs: FAQItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  };
}

/**
 * Default author - Nadezhda Nikolaeva
 */
export const NADEZHDA_NIKOLAEVA: AuthorData = {
  name: "Nadezhda Nikolaeva",
  url: "https://anoteroslogos.com/author/nadezhda-nikolaeva",
  jobTitle: "Co-founder & CEO Marketing",
  description: "Leading strategic vision and marketing direction at Anóteros Lógos with expertise in brand architecture and digital authority positioning.",
  expertise: ["Strategic Marketing", "Brand Development", "GEO Strategy", "Digital Authority"],
  knowsAbout: ["Generative Engine Optimization", "Brand Architecture", "AI Marketing", "E-E-A-T Signals"],
  affiliation: {
    name: "Anóteros Lógos",
    url: "https://anoteroslogos.com"
  },
  email: "nadezhda@anoteroslogos.com"
};

/**
 * Generate VideoObject schema for multimodal content
 * Enables video content discovery by AI systems
 */
export interface VideoData {
  name: string;
  description: string;
  thumbnailUrl: string;
  uploadDate: string;
  contentUrl: string;
  embedUrl?: string;
  duration?: string;
  transcript?: string;
}

export function generateVideoSchema(video: VideoData) {
  return {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    "name": video.name,
    "description": video.description,
    "thumbnailUrl": video.thumbnailUrl,
    "uploadDate": video.uploadDate,
    "contentUrl": video.contentUrl,
    ...(video.embedUrl && { "embedUrl": video.embedUrl }),
    ...(video.duration && { "duration": video.duration }),
    ...(video.transcript && { "transcript": video.transcript })
  };
}

/**
 * Generate HowTo schema for tutorial content
 */
export interface HowToStep {
  name: string;
  text: string;
  url?: string;
}

export interface HowToData {
  name: string;
  description: string;
  totalTime?: string;
  steps: HowToStep[];
}

export function generateHowToSchema(howto: HowToData) {
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    "name": howto.name,
    "description": howto.description,
    ...(howto.totalTime && { "totalTime": howto.totalTime }),
    "step": howto.steps.map((step, index) => ({
      "@type": "HowToStep",
      "position": index + 1,
      "name": step.name,
      "text": step.text,
      ...(step.url && { "url": step.url })
    }))
  };
}

/**
 * Default author - Mostafa ElBermawy (alias for backward compatibility)
 */
export const MOSTAFA_ELBERMAWY: AuthorData = NADEZHDA_NIKOLAEVA;
