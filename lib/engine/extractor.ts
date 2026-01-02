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
import { BrowserService } from './BrowserService';
import type { BrowserConfiguration } from './browser-config';

/**
 * ExtractionEngine class
 * Core service for fetching and parsing web content
 */
export class ExtractionEngine {
  private readonly defaultTimeout: number = 15000; // 15 seconds
  private readonly defaultUserAgent: string = 'Mozilla/5.0 (compatible; AgentMiddleware/1.0)';
  private readonly browserService: BrowserService | null;
  private readonly useBrowser: boolean;
  private fallbackWarnings: string[] = [];

  /**
   * Constructor
   * @param options - Configuration options
   */
  constructor(options?: { enableBrowser?: boolean; browserConfig?: Partial<BrowserConfiguration> }) {
    this.useBrowser = options?.enableBrowser ?? (process.env.BROWSER_ENABLED !== 'false');
    this.browserService = this.useBrowser ? new BrowserService(options?.browserConfig) : null;
  }

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
    
    // Reset fallback warnings for this extraction
    this.fallbackWarnings = [];
    
    // Fetch HTML with timeout
    const fetchStart = Date.now();
    let html: string;
    let usedBrowser = false;
    let browserMetadata: ExtractionResult['browserMetadata'];
    
    // Try browser-based fetching first if enabled
    if (this.useBrowser && this.browserService && options.useBrowser !== false) {
      try {
        const browserResult = await this.browserService.fetchPageWithRetry(normalizedUrl, {
          timeout,
          waitUntil: 'networkidle',
          blockResources: true,
        });
        html = browserResult.html;
        usedBrowser = true;
        
        // Capture browser metadata
        browserMetadata = {
          usedBrowser: true,
          finalUrl: browserResult.finalUrl,
          redirectChain: browserResult.redirectChain,
          loadTime: browserResult.loadTime,
          resourceCounts: browserResult.resourceCounts,
        };
      } catch (error) {
        // Check if it's a non-retryable error (WAF block, CAPTCHA)
        if (error instanceof AgentMiddlewareError && error.code === ErrorCode.ERR_WAF_BLOCK) {
          // Don't fallback for WAF blocks - throw the error
          throw error;
        }
        
        // Log browser failure and fallback to static fetching
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.warn(`[ExtractionEngine] Browser fetch failed for ${normalizedUrl}: ${errorMessage}. Falling back to static fetching.`);
        
        // Add fallback warning
        this.fallbackWarnings.push(
          'Browser-based rendering failed. Falling back to static HTML fetching. ' +
          'Client-side rendered (CSR) content may not be available.'
        );
        
        // Fallback to static fetching
        html = await this.fetchHTML(normalizedUrl, timeout, options.userAgent);
        
        // Mark as fallback
        browserMetadata = {
          usedBrowser: false,
        };
      }
    } else {
      // Use static fetching if browser disabled
      html = await this.fetchHTML(normalizedUrl, timeout, options.userAgent);
      
      // Mark as static fetching
      browserMetadata = {
        usedBrowser: false,
      };
    }
    
    const fetchTime = Date.now() - fetchStart;
    
    // Parse HTML
    const parseStart = Date.now();
    const parsed = await this.parseHTML(html, options.mode);
    const parseTime = Date.now() - parseStart;
    
    const totalTime = Date.now() - startTime;
    
    // Build result with fallback warnings if applicable
    const result: ExtractionResult = {
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
      // Browser metadata
      browserMetadata,
    };
    
    // Add fallback warnings to result if any
    if (this.fallbackWarnings.length > 0) {
      (result as any).warnings = this.fallbackWarnings;
      (result as any).csrSupport = 'unavailable';
    }
    
    return result;
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
      
      // Strategy 2: CORS proxy fallback with multiple proxies
      const proxies = [
        {
          url: `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
          parseResponse: async (res: Response) => {
            const data = await res.json();
            return data.contents;
          }
        },
        {
          url: `https://corsproxy.io/?${encodeURIComponent(url)}`,
          parseResponse: async (res: Response) => await res.text()
        },
        {
          url: `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
          parseResponse: async (res: Response) => await res.text()
        }
      ];
      
      let lastError: Error | null = null;
      
      for (const proxy of proxies) {
        try {
          // Create separate AbortController for each proxy with its own timeout
          const proxyController = new AbortController();
          const proxyTimeoutId = setTimeout(() => proxyController.abort(), 10000); // 10 seconds per proxy
          
          const proxyResponse = await fetch(proxy.url, {
            signal: proxyController.signal,
          });
          
          clearTimeout(proxyTimeoutId);
          
          if (proxyResponse.ok) {
            const html = await proxy.parseResponse(proxyResponse);
            
            if (html && html.length > 0) {
              clearTimeout(timeoutId);
              return html;
            }
          }
          
          lastError = new Error(`Proxy returned status ${proxyResponse.status}`);
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          console.warn(`CORS proxy ${proxy.url} failed:`, lastError.message);
          continue;
        }
      }
      
      // All proxies failed
      clearTimeout(timeoutId);
      throw new AgentMiddlewareError(
        ErrorCode.ERR_URL_UNREACHABLE,
        'All CORS proxies failed',
        { url, lastError: lastError?.message }
      );
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
      // Check if we're in a browser or Node.js environment
      const isBrowser = typeof window !== 'undefined' && typeof DOMParser !== 'undefined';
      
      if (isBrowser) {
        // Browser environment: use DOMParser
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // Check for parsing errors
        const parserError = doc.querySelector('parsererror');
        if (parserError) {
          throw new AgentMiddlewareError(
            ErrorCode.ERR_DOM_UNREADABLE,
            'HTML parsing failed',
            { error: parserError.textContent || 'Unknown parser error' }
          );
        }
        
        // Extract data using DOM methods
        const schemaMarkup = this.extractSchemaMarkup(doc);
        const metaTags = this.extractMetaTags(doc);
        const content = this.extractContent(doc, mode);
        const structure = this.extractStructure(doc, schemaMarkup);
        
        return {
          schemaMarkup,
          metaTags,
          content,
          structure,
        };
      } else {
        // Node.js environment: use cheerio
        const cheerio = await import('cheerio');
        const $ = cheerio.load(html);
        
        // Extract data using cheerio methods
        const schemaMarkup = this.extractSchemaMarkupCheerio($);
        const metaTags = this.extractMetaTagsCheerio($);
        const content = this.extractContentCheerio($, mode);
        const structure = this.extractStructureCheerio($, schemaMarkup);
        
        return {
          schemaMarkup,
          metaTags,
          content,
          structure,
        };
      }
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
   * Extracts Schema.org markup from document (cheerio version)
   */
  private extractSchemaMarkupCheerio($: any): SchemaMarkupData {
    const scripts = $('script[type="application/ld+json"]');
    const schemas: Record<string, unknown>[] = [];
    const types: string[] = [];
    
    scripts.each((_: number, script: any) => {
      try {
        const schema = JSON.parse($(script).html() || '{}');
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
    });
    
    return {
      types: [...new Set(types)], // Deduplicate types
      data: schemas,
    };
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
   * Extracts meta tags from document (cheerio version)
   */
  private extractMetaTagsCheerio($: any): MetaTagsData {
    const metaTags: MetaTagsData = {};
    
    // Title
    const title = $('title').first().text();
    if (title) {
      metaTags.title = title.trim();
    }
    
    // Description
    const description = $('meta[name="description"]').attr('content');
    if (description) {
      metaTags.description = description;
    }
    
    // Keywords
    const keywords = $('meta[name="keywords"]').attr('content');
    if (keywords) {
      metaTags.keywords = keywords.split(',').map(k => k.trim());
    }
    
    // Open Graph
    const ogTitle = $('meta[property="og:title"]').attr('content');
    if (ogTitle) {
      metaTags.ogTitle = ogTitle;
    }
    
    const ogDescription = $('meta[property="og:description"]').attr('content');
    if (ogDescription) {
      metaTags.ogDescription = ogDescription;
    }
    
    const ogImage = $('meta[property="og:image"]').attr('content');
    if (ogImage) {
      metaTags.ogImage = ogImage;
    }
    
    // Twitter Card
    const twitterCard = $('meta[name="twitter:card"]').attr('content');
    if (twitterCard) {
      metaTags.twitterCard = twitterCard;
    }
    
    // Canonical
    const canonical = $('link[rel="canonical"]').attr('href');
    if (canonical) {
      metaTags.canonical = canonical;
    }
    
    return metaTags;
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
   * Extracts content from document (cheerio version)
   */
  private extractContentCheerio($: any, mode: 'fast' | 'deep'): ContentData {
    // Get title
    const titleElement = $('title, h1').first();
    const title = titleElement.text().trim() || 'Untitled';
    
    // Get summary (from meta description or first paragraph)
    const metaDescription = $('meta[name="description"]').attr('content');
    let summary = metaDescription || '';
    
    if (!summary) {
      const firstParagraph = $('p').first();
      summary = firstParagraph.text().trim().slice(0, 200) || '';
    }
    
    const content: ContentData = {
      title,
      summary,
    };
    
    // Deep mode: extract additional content
    if (mode === 'deep') {
      // Extract headings
      const headings: string[] = [];
      $('h1, h2, h3, h4, h5, h6').each((_: number, elem: any) => {
        const text = $(elem).text().trim();
        if (text) {
          headings.push(text);
        }
      });
      content.headings = headings;
      
      // Extract links
      const links: string[] = [];
      $('a[href]').each((_: number, elem: any) => {
        const href = $(elem).attr('href');
        if (href) {
          links.push(href);
        }
      });
      content.links = links;
      
      // Extract text content for word count
      const bodyText = $('body').text() || '';
      const words = bodyText.trim().split(/\s+/).filter(w => w.length > 0);
      content.word_count = words.length;
      
      // TODO: Convert to markdown (simplified for now)
      content.markdown = bodyText.trim().slice(0, 5000); // Limit to 5000 chars
    }
    
    return content;
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
   * Extracts structure information from document (cheerio version)
   */
  private extractStructureCheerio($: any, schemaMarkup: SchemaMarkupData): StructureData {
    return {
      hasSchema: schemaMarkup.data.length > 0,
      schemaTypes: schemaMarkup.types,
      headingCount: $('h1, h2, h3, h4, h5, h6').length,
      linkCount: $('a[href]').length,
      imageCount: $('img').length,
    };
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

  /**
   * Validates robots.txt file
   * Checks for soft 404s (200 status with HTML content instead of plain text)
   * 
   * @param baseUrl - Base URL of the website
   * @returns Object with validation results
   */
  async validateRobotsTxt(baseUrl: string): Promise<{
    found: boolean;
    url: string;
    finalUrl?: string;
    redirectChain?: string[];
    content?: string;
    isSoft404: boolean;
  }> {
    const robotsUrl = new URL('/robots.txt', baseUrl).href;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    try {
      const response = await fetch(robotsUrl, {
        method: 'GET',
        redirect: 'follow',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      // Track redirect chain
      const redirectChain: string[] = [];
      let finalUrl = robotsUrl;
      
      // Note: fetch API doesn't expose redirect chain directly
      // We can only get the final URL
      if (response.url && response.url !== robotsUrl) {
        finalUrl = response.url;
        redirectChain.push(robotsUrl, finalUrl);
      }
      
      if (!response.ok) {
        return {
          found: false,
          url: robotsUrl,
          finalUrl: finalUrl !== robotsUrl ? finalUrl : undefined,
          redirectChain: redirectChain.length > 0 ? redirectChain : undefined,
          isSoft404: false,
        };
      }
      
      // Get content
      const content = await response.text();
      
      // Check for soft 404: 200 status but HTML content instead of plain text
      // Robots.txt should be plain text, not HTML
      const contentType = response.headers.get('content-type') || '';
      const looksLikeHTML = content.trim().toLowerCase().startsWith('<!doctype html') ||
                           content.trim().toLowerCase().startsWith('<html') ||
                           /<html[\s>]/i.test(content.slice(0, 200));
      
      const isSoft404 = looksLikeHTML || contentType.includes('text/html');
      
      return {
        found: !isSoft404,
        url: robotsUrl,
        finalUrl: finalUrl !== robotsUrl ? finalUrl : undefined,
        redirectChain: redirectChain.length > 0 ? redirectChain : undefined,
        content: !isSoft404 ? content : undefined,
        isSoft404,
      };
    } catch (error) {
      clearTimeout(timeoutId);
      
      // Timeout or network error
      return {
        found: false,
        url: robotsUrl,
        isSoft404: false,
      };
    }
  }

  /**
   * Validates sitemap.xml file
   * Verifies XML structure and follows redirects
   * 
   * @param baseUrl - Base URL of the website
   * @returns Object with validation results
   */
  async validateSitemapXml(baseUrl: string): Promise<{
    found: boolean;
    url: string;
    finalUrl?: string;
    redirectChain?: string[];
    isValidXml: boolean;
    content?: string;
  }> {
    const sitemapUrl = new URL('/sitemap.xml', baseUrl).href;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    try {
      const response = await fetch(sitemapUrl, {
        method: 'GET',
        redirect: 'follow',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      // Track redirect chain
      const redirectChain: string[] = [];
      let finalUrl = sitemapUrl;
      
      if (response.url && response.url !== sitemapUrl) {
        finalUrl = response.url;
        redirectChain.push(sitemapUrl, finalUrl);
      }
      
      if (!response.ok) {
        return {
          found: false,
          url: sitemapUrl,
          finalUrl: finalUrl !== sitemapUrl ? finalUrl : undefined,
          redirectChain: redirectChain.length > 0 ? redirectChain : undefined,
          isValidXml: false,
        };
      }
      
      // Get content
      const content = await response.text();
      
      // Validate XML structure
      // Check for XML declaration or root element
      const hasXmlDeclaration = content.trim().startsWith('<?xml');
      const hasUrlsetTag = /<urlset[\s>]/i.test(content);
      const hasSitemapindexTag = /<sitemapindex[\s>]/i.test(content);
      
      const isValidXml = (hasXmlDeclaration || hasUrlsetTag || hasSitemapindexTag) &&
                        !content.trim().toLowerCase().startsWith('<!doctype html') &&
                        !content.trim().toLowerCase().startsWith('<html');
      
      return {
        found: isValidXml,
        url: sitemapUrl,
        finalUrl: finalUrl !== sitemapUrl ? finalUrl : undefined,
        redirectChain: redirectChain.length > 0 ? redirectChain : undefined,
        isValidXml,
        content: isValidXml ? content : undefined,
      };
    } catch (error) {
      clearTimeout(timeoutId);
      
      // Timeout or network error
      return {
        found: false,
        url: sitemapUrl,
        isValidXml: false,
      };
    }
  }

  /**
   * Cleanup resources (browser instances)
   */
  async cleanup(): Promise<void> {
    if (this.browserService) {
      await this.browserService.cleanup();
    }
  }
}

/**
 * Creates a new ExtractionEngine instance
 * @param options - Configuration options
 */
export function createExtractionEngine(options?: { enableBrowser?: boolean; browserConfig?: Partial<BrowserConfiguration> }): ExtractionEngine {
  return new ExtractionEngine(options);
}
