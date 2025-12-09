/**
 * Extraction Engine for Agent Middleware
 * Handles web scraping and HTML parsing, decoupled from database operations
 */

import type {
  ExtractionOptions,
  ExtractionResult,
  SchemaMarkupData,
  MetaTagsData,
  ContentData,
  StructureData,
} from '../../types/agent-middleware.types';
import { ErrorCode } from '../../types/agent-middleware.types';
import { AgentMiddlewareError } from './errors';
import { normalizeUrl } from './utils';

/**
 * ExtractionEngine class
 * Core service for fetching and parsing web content
 */
export class ExtractionEngine {
  private readonly defaultTimeout: number = 15000; // 15 seconds
  private readonly defaultUserAgent: string = 'Mozilla/5.0 (compatible; AgentMiddleware/1.0)';

  /**
   * Main extraction method
   * Orchestrates fetching and parsing of web content
   * 
   * @param url - Target URL to extract
   * @param options - Extraction options
   * @returns ExtractionResult with parsed data
   * @throws AgentMiddlewareError on failure
   */
  async extract(url: string, options: ExtractionOptions): Promise<ExtractionResult> {
    const startTime = Date.now();
    
    // Normalize URL
    const normalizedUrl = normalizeUrl(url);
    
    // Set timeout
    const timeout = options.timeout || this.defaultTimeout;
    
    // Fetch HTML with timeout
    const fetchStart = Date.now();
    const html = await this.fetchHTML(normalizedUrl, timeout, options.userAgent);
    const fetchTime = Date.now() - fetchStart;
    
    // Parse HTML
    const parseStart = Date.now();
    const parsed = await this.parseHTML(html, options.mode);
    const parseTime = Date.now() - parseStart;
    
    const totalTime = Date.now() - startTime;
    
    return {
      url: normalizedUrl,
      timestamp: new Date().toISOString(),
      html,
      schemaMarkup: parsed.schemaMarkup,
      metaTags: parsed.metaTags,
      content: parsed.content,
      structure: parsed.structure,
      performance: {
        fetchTime,
        parseTime,
        totalTime,
      },
      // Deep mode fields will be populated by EntityExtractor
      entities: options.mode === 'deep' ? [] : undefined,
      relationships: options.mode === 'deep' ? [] : undefined,
      knowledgeGraph: options.mode === 'deep' ? {
        entities: [],
        relationships: [],
        metadata: {
          entity_count: 0,
          relationship_count: 0,
          entity_types: {},
          relationship_types: {},
        },
      } : undefined,
    };
  }

  /**
   * Fetches HTML content with fallback strategies
   * Strategy: direct fetch → CORS proxy
   * 
   * @param url - Target URL
   * @param timeout - Request timeout in milliseconds
   * @param userAgent - Optional custom user agent
   * @returns HTML content as string
   * @throws AgentMiddlewareError on failure
   */
  async fetchHTML(url: string, timeout: number, userAgent?: string): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      // Strategy 1: Direct fetch
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'User-Agent': userAgent || this.defaultUserAgent,
          },
          signal: controller.signal,
        });
        
        if (response.ok) {
          const html = await response.text();
          clearTimeout(timeoutId);
          return html;
        }
        
        // Check for bot blocking
        if (response.status === 403 || response.status === 401) {
          throw new AgentMiddlewareError(
            ErrorCode.ERR_BOT_BLOCKED,
            'Target site blocks bot access',
            { url, status: response.status }
          );
        }
      } catch (error) {
        // If it's already an AgentMiddlewareError, rethrow
        if (error instanceof AgentMiddlewareError) {
          throw error;
        }
        
        // Check for timeout
        if (error instanceof Error && error.name === 'AbortError') {
          throw new AgentMiddlewareError(
            ErrorCode.ERR_TIMEOUT,
            'Request timed out',
            { url, timeout }
          );
        }
        
        // CORS error or network error - try proxy fallback
      }
      
      // Strategy 2: CORS proxy fallback
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
      const proxyResponse = await fetch(proxyUrl, {
        signal: controller.signal,
      });
      
      if (!proxyResponse.ok) {
        throw new AgentMiddlewareError(
          ErrorCode.ERR_URL_UNREACHABLE,
          'Failed to fetch URL via proxy',
          { url, proxyStatus: proxyResponse.status }
        );
      }
      
      const data = await proxyResponse.json();
      clearTimeout(timeoutId);
      
      if (!data.contents) {
        throw new AgentMiddlewareError(
          ErrorCode.ERR_URL_UNREACHABLE,
          'Proxy returned empty content',
          { url }
        );
      }
      
      return data.contents;
    } catch (error) {
      clearTimeout(timeoutId);
      
      // Rethrow AgentMiddlewareError
      if (error instanceof AgentMiddlewareError) {
        throw error;
      }
      
      // Check for timeout
      if (error instanceof Error && error.name === 'AbortError') {
        throw new AgentMiddlewareError(
          ErrorCode.ERR_TIMEOUT,
          'Request timed out',
          { url, timeout }
        );
      }
      
      // Generic network error
      throw new AgentMiddlewareError(
        ErrorCode.ERR_URL_UNREACHABLE,
        'Failed to fetch URL',
        { url, error: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Parses HTML and extracts structured data
   * 
   * @param html - HTML content to parse
   * @param mode - Extraction mode (fast or deep)
   * @returns Parsed data structures
   * @throws AgentMiddlewareError if parsing fails
   */
  async parseHTML(html: string, mode: 'fast' | 'deep'): Promise<{
    schemaMarkup: SchemaMarkupData;
    metaTags: MetaTagsData;
    content: ContentData;
    structure: StructureData;
  }> {
    try {
      // Parse HTML using DOMParser (browser) or jsdom (Node.js)
      let doc: Document;
      
      if (typeof DOMParser !== 'undefined') {
        // Browser environment
        const parser = new DOMParser();
        doc = parser.parseFromString(html, 'text/html');
        
        // Check for parsing errors
        const parserError = doc.querySelector('parsererror');
        if (parserError) {
          throw new AgentMiddlewareError(
            ErrorCode.ERR_DOM_UNREADABLE,
            'HTML parsing failed',
            { error: parserError.textContent || 'Unknown parser error' }
          );
        }
      } else {
        // Node.js environment - use jsdom
        const { JSDOM } = await import('jsdom');
        const dom = new JSDOM(html);
        doc = dom.window.document;
      }
      
      // Extract schema markup
      const schemaMarkup = this.extractSchemaMarkup(doc);
      
      // Extract meta tags
      const metaTags = this.extractMetaTags(doc);
      
      // Extract content
      const content = this.extractContent(doc, mode);
      
      // Extract structure
      const structure = this.extractStructure(doc, schemaMarkup);
      
      return {
        schemaMarkup,
        metaTags,
        content,
        structure,
      };
    } catch (error) {
      // Rethrow AgentMiddlewareError
      if (error instanceof AgentMiddlewareError) {
        throw error;
      }
      
      // Wrap other errors
      throw new AgentMiddlewareError(
        ErrorCode.ERR_DOM_UNREADABLE,
        'Failed to parse HTML',
        { error: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Extracts Schema.org markup from document
   */
  private extractSchemaMarkup(doc: Document): SchemaMarkupData {
    const scripts = Array.from(doc.querySelectorAll('script[type="application/ld+json"]'));
    const schemas: Record<string, unknown>[] = [];
    const types: string[] = [];
    
    for (const script of scripts) {
      try {
        const schema = JSON.parse(script.textContent || '{}');
        if (schema && typeof schema === 'object') {
          schemas.push(schema);
          
          // Extract @type
          if (schema['@type']) {
            const type = Array.isArray(schema['@type']) 
              ? schema['@type'] 
              : [schema['@type']];
            types.push(...type);
          }
        }
      } catch {
        // Skip invalid JSON
      }
    }
    
    return {
      types: [...new Set(types)], // Deduplicate types
      data: schemas,
    };
  }

  /**
   * Extracts meta tags from document
   */
  private extractMetaTags(doc: Document): MetaTagsData {
    const metaTags: MetaTagsData = {};
    
    // Title
    const title = doc.querySelector('title');
    if (title?.textContent) {
      metaTags.title = title.textContent.trim();
    }
    
    // Description
    const description = doc.querySelector('meta[name="description"]');
    if (description) {
      metaTags.description = description.getAttribute('content') || undefined;
    }
    
    // Keywords
    const keywords = doc.querySelector('meta[name="keywords"]');
    if (keywords) {
      const content = keywords.getAttribute('content');
      if (content) {
        metaTags.keywords = content.split(',').map(k => k.trim());
      }
    }
    
    // Open Graph
    const ogTitle = doc.querySelector('meta[property="og:title"]');
    if (ogTitle) {
      metaTags.ogTitle = ogTitle.getAttribute('content') || undefined;
    }
    
    const ogDescription = doc.querySelector('meta[property="og:description"]');
    if (ogDescription) {
      metaTags.ogDescription = ogDescription.getAttribute('content') || undefined;
    }
    
    const ogImage = doc.querySelector('meta[property="og:image"]');
    if (ogImage) {
      metaTags.ogImage = ogImage.getAttribute('content') || undefined;
    }
    
    // Twitter Card
    const twitterCard = doc.querySelector('meta[name="twitter:card"]');
    if (twitterCard) {
      metaTags.twitterCard = twitterCard.getAttribute('content') || undefined;
    }
    
    // Canonical
    const canonical = doc.querySelector('link[rel="canonical"]');
    if (canonical) {
      metaTags.canonical = canonical.getAttribute('href') || undefined;
    }
    
    return metaTags;
  }

  /**
   * Extracts content from document
   */
  private extractContent(doc: Document, mode: 'fast' | 'deep'): ContentData {
    // Get title
    const titleElement = doc.querySelector('title, h1');
    const title = titleElement?.textContent?.trim() || 'Untitled';
    
    // Get summary (from meta description or first paragraph)
    const metaDescription = doc.querySelector('meta[name="description"]');
    let summary = metaDescription?.getAttribute('content') || '';
    
    if (!summary) {
      const firstParagraph = doc.querySelector('p');
      summary = firstParagraph?.textContent?.trim().slice(0, 200) || '';
    }
    
    const content: ContentData = {
      title,
      summary,
    };
    
    // Deep mode: extract additional content
    if (mode === 'deep') {
      // Extract headings
      const headings = Array.from(doc.querySelectorAll('h1, h2, h3, h4, h5, h6'))
        .map(h => h.textContent?.trim())
        .filter(Boolean) as string[];
      content.headings = headings;
      
      // Extract links
      const links = Array.from(doc.querySelectorAll('a[href]'))
        .map(a => a.getAttribute('href'))
        .filter(Boolean) as string[];
      content.links = links;
      
      // Extract text content for word count
      const bodyText = doc.body?.textContent || '';
      const words = bodyText.trim().split(/\s+/).filter(w => w.length > 0);
      content.word_count = words.length;
      
      // TODO: Convert to markdown (simplified for now)
      content.markdown = bodyText.trim().slice(0, 5000); // Limit to 5000 chars
    }
    
    return content;
  }

  /**
   * Extracts structure information from document
   */
  private extractStructure(doc: Document, schemaMarkup: SchemaMarkupData): StructureData {
    return {
      hasSchema: schemaMarkup.data.length > 0,
      schemaTypes: schemaMarkup.types,
      headingCount: doc.querySelectorAll('h1, h2, h3, h4, h5, h6').length,
      linkCount: doc.querySelectorAll('a[href]').length,
      imageCount: doc.querySelectorAll('img').length,
    };
  }
}

/**
 * Creates a new ExtractionEngine instance
 */
export function createExtractionEngine(): ExtractionEngine {
  return new ExtractionEngine();
}
