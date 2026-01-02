/**
 * Scraping Service for Agent Manifest Generator
 * Handles web scraping and content extraction using the ExtractionEngine
 * 
 * @module lib/agentManifest/scraping
 * @version 1.0.0
 */

import { ExtractionEngine } from '../engine/extractor';
import type { ScrapedContent } from './types';
import { ScrapeError } from './errors';

/**
 * ScrapingService class
 * Orchestrates web scraping using the ExtractionEngine
 */
export class ScrapingService {
  private readonly extractionEngine: ExtractionEngine;

  /**
   * Constructor
   * @param extractionEngine - Optional ExtractionEngine instance (creates new one if not provided)
   */
  constructor(extractionEngine?: ExtractionEngine) {
    // Disable browser in serverless environment (Vercel)
    // Browser (Playwright) requires special setup in serverless and causes initialization failures
    const isServerless = typeof window === 'undefined' && process.env.VERCEL === '1';
    this.extractionEngine = extractionEngine || new ExtractionEngine({ 
      enableBrowser: !isServerless 
    });
  }

  /**
   * Scrapes a URL and extracts structured content for manifest generation
   * 
   * @param url - Target URL to scrape
   * @returns Scraped content with metadata
   * @throws ScrapeError if scraping fails or content is insufficient
   */
  async scrapeForManifest(url: string): Promise<ScrapedContent> {
    try {
      // Use ExtractionEngine with deep mode to get headings, links, and text
      const result = await this.extractionEngine.extract(url, {
        mode: 'deep',
        timeout: 15000, // 15 seconds as per requirements
        useBrowser: true,
      });

      // Extract title from <title> or first <h1>
      let title = result.metaTags.title || '';
      if (!title && result.content.headings && result.content.headings.length > 0) {
        title = result.content.headings[0];
      }
      if (!title) {
        title = 'Untitled';
      }

      // Extract description from meta description or first paragraph
      let description = result.metaTags.description || result.content.summary || '';
      
      // Extract headings (all h1-h6)
      const headings = result.content.headings || [];

      // Extract links (all href values)
      const links = result.content.links || [];

      // Extract text content and limit to first 2000 characters
      const textContent = (result.content.markdown || result.html || '').slice(0, 2000);

      // Determine extraction method
      const extractionMethod = result.browserMetadata?.usedBrowser ? 'browser' : 'static';

      // Build ScrapedContent object
      const scrapedContent: ScrapedContent = {
        url: result.url,
        title,
        description,
        headings,
        links,
        textContent,
        metadata: {
          contentLength: result.html.length,
          textLength: textContent.length,
          extractionMethod,
          timestamp: result.timestamp,
        },
      };

      return scrapedContent;
    } catch (error) {
      // Wrap extraction errors in ScrapeError
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      throw new ScrapeError(
        `Failed to scrape URL: ${errorMessage}`,
        'EMPTY_HTML',
        {
          url,
          contentLength: 0,
          textLength: 0,
        }
      );
    }
  }

  /**
   * Cleanup resources (browser instances)
   */
  async cleanup(): Promise<void> {
    await this.extractionEngine.cleanup();
  }
}
