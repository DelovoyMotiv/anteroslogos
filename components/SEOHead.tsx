import { useEffect } from 'react';

export interface SEOProps {
  title: string;
  description: string;
  url: string;
  type?: 'website' | 'article' | 'product';
  image?: string;
  imageAlt?: string;
  keywords?: string;
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
  schema?: object;
  noindex?: boolean;
}

/**
 * SEOHead Component
 * Dynamically injects meta tags and structured data for each page
 * Critical for proper GEO and SEO optimization
 */
export const SEOHead = ({
  title,
  description,
  url,
  type = 'website',
  image = 'https://anoteroslogos.com/images/og-image.jpg',
  imageAlt = 'Anóteros Lógos - Architects of Digital Authority',
  keywords,
  author,
  publishedTime,
  modifiedTime,
  schema,
  noindex = false
}: SEOProps) => {
  useEffect(() => {
    // Update title
    document.title = title;

    // Helper function to set or update meta tag
    const setMetaTag = (name: string, content: string, property?: boolean) => {
      const attribute = property ? 'property' : 'name';
      let element = document.querySelector(`meta[${attribute}="${name}"]`) as HTMLMetaElement;
      
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attribute, name);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    // Set canonical link
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = url;

    // Basic meta tags
    setMetaTag('description', description);
    if (keywords) setMetaTag('keywords', keywords);
    if (author) setMetaTag('author', author);
    
    // Robots
    if (noindex) {
      setMetaTag('robots', 'noindex, nofollow');
    } else {
      setMetaTag('robots', 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1');
    }

    // Open Graph
    setMetaTag('og:title', title, true);
    setMetaTag('og:description', description, true);
    setMetaTag('og:url', url, true);
    setMetaTag('og:type', type, true);
    setMetaTag('og:image', image, true);
    setMetaTag('og:image:alt', imageAlt, true);
    setMetaTag('og:site_name', 'Anóteros Lógos', true);
    setMetaTag('og:locale', 'en_US', true);

    // Twitter Card
    setMetaTag('twitter:card', 'summary_large_image');
    setMetaTag('twitter:site', '@anoteroslogos');
    setMetaTag('twitter:creator', '@anoteroslogos');
    setMetaTag('twitter:title', title);
    setMetaTag('twitter:description', description);
    setMetaTag('twitter:image', image);
    setMetaTag('twitter:image:alt', imageAlt);

    // Article specific
    if (type === 'article') {
      if (publishedTime) setMetaTag('article:published_time', publishedTime, true);
      if (modifiedTime) setMetaTag('article:modified_time', modifiedTime, true);
      if (author) setMetaTag('article:author', author, true);
    }

    // Inject structured data if provided
    if (schema) {
      const scriptId = 'page-structured-data';
      let script = document.getElementById(scriptId) as HTMLScriptElement;
      
      if (!script) {
        script = document.createElement('script');
        script.id = scriptId;
        script.type = 'application/ld+json';
        document.head.appendChild(script);
      }
      
      script.textContent = JSON.stringify(schema, null, 2);
    }

    // Cleanup function
    return () => {
      // Remove page-specific structured data on unmount
      const script = document.getElementById('page-structured-data');
      if (script) {
        script.remove();
      }
    };
  }, [title, description, url, type, image, imageAlt, keywords, author, publishedTime, modifiedTime, schema, noindex]);

  return null;
};

export default SEOHead;
