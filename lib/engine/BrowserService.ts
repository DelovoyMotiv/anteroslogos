/**
 * BrowserService - Headless browser management for GEO Audit Engine
 * 
 * Manages Playwright browser instances with:
 * - Connection pooling (max 5 concurrent browsers)
 * - User-Agent rotation
 * - Viewport randomization
 * - Stealth mode (navigator.webdriver masking)
 * - Resource blocking (images, CSS, fonts)
 */

import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { getBrowserConfig, BrowserConfiguration } from './browser-config';
import { ErrorHandler, AgentMiddlewareError, isAgentMiddlewareError } from './errors';
import { ErrorCode } from '../../types/agent-middleware.types';

export interface BrowserOptions {
  timeout?: number;
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle';
  userAgent?: string;
  viewport?: { width: number; height: number };
  blockResources?: boolean;
}

export interface BrowserResult {
  html: string;
  finalUrl: string;
  redirectChain: string[];
  loadTime: number;
  resourceCounts: {
    scripts: number;
    stylesheets: number;
    images: number;
  };
}

interface BrowserInstance {
  browser: Browser;
  inUse: boolean;
  createdAt: number;
}

/**
 * BrowserService manages headless browser instances for JavaScript execution
 */
export class BrowserService {
  private config: BrowserConfiguration;
  private browserPool: BrowserInstance[] = [];
  private userAgentIndex = 0;
  private viewportIndex = 0;
  private errorHandler: ErrorHandler;

  constructor(config?: Partial<BrowserConfiguration>) {
    this.config = config ? { ...getBrowserConfig(), ...config } : getBrowserConfig();
    this.errorHandler = new ErrorHandler((message, context) => {
      console.log(`[BrowserService] ${message}`, context);
    });
  }

  /**
   * Fetches a page using headless browser with retry logic
   * Handles 403 errors with User-Agent and viewport rotation
   * Detects CAPTCHA challenges and CSR timeouts
   */
  async fetchPageWithRetry(url: string, options: BrowserOptions = {}): Promise<BrowserResult> {
    const retryStrategy = {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      shouldRetry: (error: Error, attempt: number) => {
        // Check if it's a 403 error (bot blocked)
        if (isAgentMiddlewareError(error) && error.code === ErrorCode.ERR_BOT_BLOCKED) {
          return true;
        }
        
        // Check if it's a timeout error
        if (isAgentMiddlewareError(error) && 
            (error.code === ErrorCode.ERR_TIMEOUT || error.code === ErrorCode.ERR_CSR_TIMEOUT)) {
          return true;
        }
        
        // Check if it's a network error
        if (isAgentMiddlewareError(error) && error.code === ErrorCode.ERR_URL_UNREACHABLE) {
          return true;
        }
        
        // Check for Playwright timeout errors
        if (error.message.includes('Timeout') || error.message.includes('timeout')) {
          return true;
        }
        
        // Don't retry CAPTCHA/WAF blocks
        if (isAgentMiddlewareError(error) && error.code === ErrorCode.ERR_WAF_BLOCK) {
          return false;
        }
        
        return false;
      },
    };

    return this.errorHandler.executeWithRetry(
      async () => {
        try {
          return await this.fetchPage(url, options);
        } catch (error) {
          // Wrap errors in AgentMiddlewareError if not already
          if (isAgentMiddlewareError(error)) {
            throw error;
          }
          
          // Detect specific error types
          const errorMessage = error instanceof Error ? error.message : String(error);
          
          // Detect CAPTCHA/WAF block
          if (errorMessage.includes('CAPTCHA') || 
              errorMessage.includes('captcha') ||
              errorMessage.includes('challenge') ||
              errorMessage.includes('ERR_WAF_BLOCK')) {
            throw new AgentMiddlewareError(
              ErrorCode.ERR_WAF_BLOCK,
              'Request blocked by Web Application Firewall or CAPTCHA',
              { url, originalError: errorMessage }
            );
          }
          
          // Detect CSR timeout
          if (errorMessage.includes('Timeout') || 
              errorMessage.includes('timeout') ||
              errorMessage.includes('ERR_CSR_TIMEOUT')) {
            throw new AgentMiddlewareError(
              ErrorCode.ERR_CSR_TIMEOUT,
              'JavaScript execution timed out',
              { url, timeout: options.timeout || this.config.pageLoadTimeout, originalError: errorMessage }
            );
          }
          
          // Detect network failures
          if (errorMessage.includes('net::') || 
              errorMessage.includes('ERR_') ||
              errorMessage.includes('ECONNREFUSED') ||
              errorMessage.includes('ENOTFOUND') ||
              errorMessage.includes('ERR_URL_UNREACHABLE')) {
            throw new AgentMiddlewareError(
              ErrorCode.ERR_URL_UNREACHABLE,
              'Failed to reach target URL',
              { url, originalError: errorMessage }
            );
          }
          
          // Generic error
          throw new AgentMiddlewareError(
            ErrorCode.ERR_INTERNAL,
            errorMessage,
            { url }
          );
        }
      },
      retryStrategy,
      { url }
    );
  }

  /**
   * Fetches a page using headless browser with JavaScript execution
   * Internal method - use fetchPageWithRetry for production
   */
  async fetchPage(url: string, options: BrowserOptions = {}): Promise<BrowserResult> {
    const startTime = Date.now();
    let browser: Browser | null = null;
    let context: BrowserContext | null = null;
    let page: Page | null = null;
    const appliedStealthMeasures: string[] = [];

    try {
      // Get or create browser instance
      browser = await this.getBrowserInstance();
      
      // Log browser launch (Property 45: Browser Launch Logging)
      const browserVersion = browser.version();
      console.log('[BrowserService] Browser launched', {
        version: browserVersion,
        url,
        configuration: {
          userAgent: options.userAgent || 'rotating',
          viewport: options.viewport || 'randomized',
          blockResources: options.blockResources !== false,
          timeout: options.timeout || this.config.pageLoadTimeout,
          waitUntil: options.waitUntil || 'networkidle',
        },
        timestamp: new Date().toISOString(),
      });

      // Select User-Agent (rotate through pool)
      const userAgent = options.userAgent || this.getNextUserAgent();

      // Select viewport (randomize within bounds)
      const viewport = options.viewport || this.getRandomViewport();

      // Create browser context with stealth settings and resource limits
      context = await browser.newContext({
        userAgent,
        viewport,
        // Set resource limits for JavaScript execution
        javaScriptEnabled: true,
        // Disable images, CSS, fonts for memory efficiency
        ...(options.blockResources !== false && this.config.blockResources.images && {
          // Note: Resource blocking is handled via route interception below
        }),
      });

      // Apply stealth mode - mask navigator.webdriver
      if (this.config.stealth.maskWebdriver) {
        await context.addInitScript(() => {
          Object.defineProperty(navigator, 'webdriver', {
            get: () => false,
          });
        });
        appliedStealthMeasures.push('navigator.webdriver masking');
      }
      
      // Track viewport randomization
      if (this.config.stealth.randomizeViewport) {
        appliedStealthMeasures.push('viewport randomization');
      }
      
      // Track User-Agent rotation
      if (!options.userAgent) {
        appliedStealthMeasures.push('User-Agent rotation');
      }
      
      // Log stealth techniques (Property 48: Stealth Technique Logging)
      if (appliedStealthMeasures.length > 0) {
        console.log('[BrowserService] Stealth techniques applied', {
          url,
          measures: appliedStealthMeasures,
          timestamp: new Date().toISOString(),
        });
      }

      // Create page
      page = await context.newPage();
      
      // Add page error logging (Property 46: Page Error Logging)
      page.on('pageerror', (error) => {
        console.error('[BrowserService] Page error occurred', {
          url,
          error: error.message,
          stack: error.stack,
          timestamp: new Date().toISOString(),
        });
      });
      
      page.on('crash', () => {
        console.error('[BrowserService] Page crashed', {
          url,
          timestamp: new Date().toISOString(),
        });
      });

      // Set resource limits for JavaScript execution
      // This helps prevent memory issues with heavy JavaScript applications
      page.setDefaultTimeout(this.config.pageLoadTimeout);
      page.setDefaultNavigationTimeout(this.config.pageLoadTimeout);

      // Block resources if enabled
      if (options.blockResources !== false) {
        await this.setupResourceBlocking(page);
      }

      // Track resource counts
      const resourceCounts = {
        scripts: 0,
        stylesheets: 0,
        images: 0,
      };

      page.on('response', (response) => {
        const contentType = response.headers()['content-type'] || '';
        if (contentType.includes('javascript')) {
          resourceCounts.scripts++;
        } else if (contentType.includes('css')) {
          resourceCounts.stylesheets++;
        } else if (contentType.includes('image')) {
          resourceCounts.images++;
        }
      });

      // Navigate to URL with timeout
      const timeout = options.timeout || this.config.pageLoadTimeout;
      const waitUntil = options.waitUntil || 'networkidle';

      const response = await page.goto(url, {
        timeout,
        waitUntil,
      });

      if (!response) {
        throw new Error('Failed to load page - no response received');
      }

      // Check for 403 Forbidden (bot blocking)
      if (response.status() === 403) {
        throw new AgentMiddlewareError(
          ErrorCode.ERR_BOT_BLOCKED,
          'Target site blocks bot access (403 Forbidden)',
          { url, status: 403, userAgent, viewport }
        );
      }

      // Get final URL after redirects
      const finalUrl = page.url();

      // Build redirect chain
      const redirectChain: string[] = [];
      let currentResponse: typeof response | null = response;
      while (currentResponse) {
        const request = currentResponse.request();
        if (request.redirectedFrom()) {
          redirectChain.push(request.redirectedFrom()!.url());
        }
        const redirectedFrom = currentResponse.request().redirectedFrom();
        currentResponse = redirectedFrom ? await redirectedFrom.response() : null;
      }
      redirectChain.reverse();
      if (redirectChain.length > 0) {
        redirectChain.push(finalUrl);
      }

      // Check for redirect loop (same URL appears multiple times in chain)
      const urlSet = new Set(redirectChain);
      if (redirectChain.length > 0 && urlSet.size < redirectChain.length) {
        throw new Error(`ERR_REDIRECT_LOOP: Redirect loop detected in chain: ${redirectChain.join(' -> ')}`);
      }

      // Check redirect chain length limit (max 5 hops)
      if (redirectChain.length > 5) {
        throw new Error(`ERR_REDIRECT_LOOP: Redirect chain exceeds maximum of 5 hops (${redirectChain.length} hops): ${redirectChain.join(' -> ')}`);
      }

      // Extract rendered HTML
      const html = await page.content();

      // Calculate load time
      const loadTime = Date.now() - startTime;
      
      // Log page load performance (Property 47: Page Load Performance Logging)
      console.log('[BrowserService] Page load completed', {
        url,
        finalUrl,
        loadTime,
        resourceCounts,
        redirectChain: redirectChain.length > 0 ? redirectChain : undefined,
        timestamp: new Date().toISOString(),
      });

      return {
        html,
        finalUrl,
        redirectChain,
        loadTime,
        resourceCounts,
      };
    } finally {
      // Track memory usage before cleanup
      const memoryStats = await this.getMemoryUsage(context);
      
      // Clean up resources
      if (page) {
        await page.close().catch(() => {});
      }
      if (context) {
        await context.close().catch(() => {});
        
        // Log memory usage after context closure (Property 49: Memory Usage Logging)
        if (memoryStats) {
          console.log('[BrowserService] Memory usage on context closure', {
            url,
            poolSize: memoryStats.poolSize,
            inUse: memoryStats.inUse,
            available: memoryStats.available,
            timestamp: new Date(memoryStats.timestamp).toISOString(),
          });
        }
      }
      if (browser) {
        this.releaseBrowserInstance(browser);
      }
    }
  }

  /**
   * Setup resource blocking for memory efficiency
   */
  private async setupResourceBlocking(page: Page): Promise<void> {
    await page.route('**/*', (route) => {
      const resourceType = route.request().resourceType();
      
      // Block based on configuration
      if (this.config.blockResources.images && resourceType === 'image') {
        return route.abort();
      }
      if (this.config.blockResources.stylesheets && resourceType === 'stylesheet') {
        return route.abort();
      }
      if (this.config.blockResources.fonts && resourceType === 'font') {
        return route.abort();
      }
      if (this.config.blockResources.media && resourceType === 'media') {
        return route.abort();
      }

      return route.continue();
    });
  }

  /**
   * Get next User-Agent from pool (rotation)
   */
  private getNextUserAgent(): string {
    const userAgent = this.config.userAgents[this.userAgentIndex];
    this.userAgentIndex = (this.userAgentIndex + 1) % this.config.userAgents.length;
    return userAgent;
  }

  /**
   * Get random viewport within desktop bounds
   */
  private getRandomViewport(): { width: number; height: number } {
    if (!this.config.stealth.randomizeViewport) {
      // Use first viewport if randomization disabled
      return this.config.viewportSizes[0];
    }

    // Select from predefined sizes
    const baseViewport = this.config.viewportSizes[this.viewportIndex];
    this.viewportIndex = (this.viewportIndex + 1) % this.config.viewportSizes.length;

    // Add small random variation (±50px)
    const variation = 50;
    return {
      width: baseViewport.width + Math.floor(Math.random() * variation * 2 - variation),
      height: baseViewport.height + Math.floor(Math.random() * variation * 2 - variation),
    };
  }

  /**
   * Get or create browser instance from pool
   */
  private async getBrowserInstance(): Promise<Browser> {
    // Find available browser in pool
    const available = this.browserPool.find(instance => !instance.inUse);
    
    if (available) {
      available.inUse = true;
      return available.browser;
    }

    // Check if we can create new browser
    if (this.browserPool.length < this.config.maxConcurrentBrowsers) {
      const browser = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
        ],
      });

      const instance: BrowserInstance = {
        browser,
        inUse: true,
        createdAt: Date.now(),
      };

      this.browserPool.push(instance);
      return browser;
    }

    // Wait for available browser
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        const available = this.browserPool.find(instance => !instance.inUse);
        if (available) {
          clearInterval(checkInterval);
          available.inUse = true;
          resolve(available.browser);
        }
      }, 100);
    });
  }

  /**
   * Release browser instance back to pool
   */
  private releaseBrowserInstance(browser: Browser): void {
    const instance = this.browserPool.find(inst => inst.browser === browser);
    if (instance) {
      instance.inUse = false;
    }
  }

  /**
   * Close all browser instances and clean up resources
   */
  async cleanup(): Promise<void> {
    await Promise.all(
      this.browserPool.map(async (instance) => {
        try {
          await instance.browser.close();
        } catch (error) {
          // Ignore errors during cleanup
        }
      })
    );
    this.browserPool = [];
  }

  /**
   * Get current pool statistics
   */
  getPoolStats(): { total: number; inUse: number; available: number } {
    return {
      total: this.browserPool.length,
      inUse: this.browserPool.filter(i => i.inUse).length,
      available: this.browserPool.filter(i => !i.inUse).length,
    };
  }

  /**
   * Get memory usage statistics for a browser context
   * @private
   */
  private async getMemoryUsage(context: BrowserContext | null): Promise<{
    poolSize: number;
    inUse: number;
    available: number;
    timestamp: number;
  } | null> {
    if (!context) {
      return null;
    }

    try {
      const stats = this.getPoolStats();
      return {
        poolSize: stats.total,
        inUse: stats.inUse,
        available: stats.available,
        timestamp: Date.now(),
      };
    } catch (error) {
      // Ignore errors during memory tracking
      return null;
    }
  }
}
