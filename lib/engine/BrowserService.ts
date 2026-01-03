/**
 * BrowserService - Headless browser management for GEO Audit Engine
 * 
 * Manages Playwright browser instances with:
 * - Connection pooling (max 3 concurrent browsers)
 * - User-Agent rotation
 * - Viewport randomization
 * - Stealth mode (navigator.webdriver masking)
 * - Resource blocking (images, CSS, fonts)
 * - Idle browser cleanup (30-second timeout)
 */

import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { getBrowserConfig, BrowserConfiguration } from './browser-config';
import { ErrorHandler, AgentMiddlewareError, isAgentMiddlewareError } from './errors';
import { ErrorCode } from '../../types/agent-middleware.types';
import { EnvironmentDetector } from './EnvironmentDetector';
import { CSRDetector, CSRFrameworkInfo } from './CSRDetector';

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
  csrFramework?: CSRFrameworkInfo;
}

interface BrowserInstance {
  browser: Browser;
  inUse: boolean;
  createdAt: number;
  lastUsed: number;
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
  private environmentDetector: EnvironmentDetector;
  private csrDetector: CSRDetector;
  private idleCleanupInterval: NodeJS.Timeout | null = null;
  private readonly IDLE_TIMEOUT_MS = 30000; // 30 seconds

  constructor(config?: Partial<BrowserConfiguration>) {
    this.config = config ? { ...getBrowserConfig(), ...config } : getBrowserConfig();
    this.errorHandler = new ErrorHandler((message, context) => {
      console.log(`[BrowserService] ${message}`, context);
    });
    this.environmentDetector = new EnvironmentDetector();
    this.csrDetector = new CSRDetector();
    
    // Start idle browser cleanup interval
    this.startIdleCleanup();
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
          
          // Detect CSR timeout (Requirement 2.3: Include timeout duration)
          if (errorMessage.includes('Timeout') || 
              errorMessage.includes('timeout') ||
              errorMessage.includes('ERR_CSR_TIMEOUT')) {
            const timeoutValue = options.timeout || this.config.pageLoadTimeout;
            throw new AgentMiddlewareError(
              ErrorCode.ERR_CSR_TIMEOUT,
              `JavaScript execution timed out after ${timeoutValue}ms`,
              { url, timeout: timeoutValue, timeoutDuration: timeoutValue, originalError: errorMessage }
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
      const actualWaitUntil = options.waitUntil || 'networkidle';
      console.log('[BrowserService] Browser launched', {
        version: browserVersion,
        url,
        configuration: {
          userAgent: options.userAgent || 'rotating',
          viewport: options.viewport || 'randomized',
          blockResources: options.blockResources !== false,
          timeout: options.timeout || this.config.pageLoadTimeout,
          waitUntil: actualWaitUntil,
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

      // Navigate to URL with timeout (Property 9: Navigation Timeout Configuration)
      // Requirement 3.1: Enforce maximum timeout of 15 seconds
      const timeout = options.timeout || this.config.pageLoadTimeout;
      // Use networkidle for CSR support (Property 5: Network Idle Wait Strategy)
      // Note: Playwright uses 'networkidle' (not 'networkidle2' like Puppeteer)
      const waitUntil = options.waitUntil || 'networkidle';

      let response;
      try {
        response = await page.goto(url, {
          timeout,
          waitUntil,
        });
      } catch (error) {
        // Requirement 2.3, 3.2: Throw CSR_TIMEOUT error with timeout duration and ensure cleanup
        if (error instanceof Error && (error.message.includes('Timeout') || error.message.includes('timeout'))) {
          // Property 10: Timeout Cleanup - browser cleanup will happen in finally block
          throw new AgentMiddlewareError(
            ErrorCode.ERR_CSR_TIMEOUT,
            `Page navigation timed out after ${timeout}ms`,
            { url, timeout, timeoutDuration: timeout }
          );
        }
        throw error;
      }

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

      // Detect CSR framework (Property 34-36: Framework Detection)
      const csrFramework = await this.csrDetector.detectFramework(page);
      
      // Log CSR detection (Property 8: CSR Detection Logging, Property 37: Framework Detection Logging)
      if (csrFramework.framework) {
        console.log('[BrowserService] CSR framework detected', {
          url,
          framework: csrFramework.framework,
          version: csrFramework.version,
          markers: csrFramework.markers,
          timestamp: new Date().toISOString(),
        });
      }

      // Wait for hydration if CSR framework detected (Property 6: CSR Hydration Wait)
      const hydrationWaitTime = this.csrDetector.getHydrationWaitTime(csrFramework.framework);
      if (hydrationWaitTime > 0) {
        console.log('[BrowserService] Waiting for CSR hydration', {
          url,
          framework: csrFramework.framework,
          waitTime: hydrationWaitTime,
          timestamp: new Date().toISOString(),
        });
        await page.waitForTimeout(hydrationWaitTime);
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
      let html = await page.content();
      
      // Requirement 6.5: Limit content size to 5MB (Property 24: Content Size Limit)
      const MAX_CONTENT_SIZE = 5 * 1024 * 1024; // 5MB in bytes
      const contentSize = Buffer.byteLength(html, 'utf8');
      
      if (contentSize > MAX_CONTENT_SIZE) {
        console.warn('[BrowserService] Content size exceeds limit', {
          url,
          contentSize,
          maxSize: MAX_CONTENT_SIZE,
          truncated: true,
          timestamp: new Date().toISOString(),
        });
        
        // Truncate to 5MB
        // Use Buffer to ensure we truncate at valid UTF-8 boundaries
        const buffer = Buffer.from(html, 'utf8');
        html = buffer.slice(0, MAX_CONTENT_SIZE).toString('utf8');
      }

      // Calculate load time
      const loadTime = Date.now() - startTime;
      
      // Log page load performance (Property 47: Page Load Performance Logging)
      console.log('[BrowserService] Page load completed', {
        url,
        finalUrl,
        loadTime,
        resourceCounts,
        redirectChain: redirectChain.length > 0 ? redirectChain : undefined,
        csrFramework: csrFramework.framework || undefined,
        timestamp: new Date().toISOString(),
      });

      return {
        html,
        finalUrl,
        redirectChain,
        loadTime,
        resourceCounts,
        csrFramework: csrFramework.framework ? csrFramework : undefined,
      };
    } finally {
      // Requirement 3.3: Close browser instances immediately after content extraction
      // Requirement 3.2: Close browser instance on timeout (Property 10: Timeout Cleanup)
      // Property 11: Post-Extraction Cleanup
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
  /**
   * Get or create browser instance from pool
   */
  private async getBrowserInstance(): Promise<Browser> {
    // Find available browser in pool
    const available = this.browserPool.find(instance => !instance.inUse);
    
    if (available) {
      available.inUse = true;
      available.lastUsed = Date.now();
      return available.browser;
    }

    // Check if we can create new browser
    if (this.browserPool.length < this.config.maxConcurrentBrowsers) {
      try {
        // Get environment-specific browser configuration
        const browserConfig = await this.environmentDetector.getBrowserConfig();
        
        console.log('[BrowserService] Launching browser with config:', {
          hasExecutablePath: !!browserConfig.executablePath,
          executablePath: browserConfig.executablePath,
          headless: browserConfig.headless,
          argsCount: browserConfig.args.length,
          isVercel: this.environmentDetector.isVercel(),
          nodeVersion: process.version,
          platform: process.platform,
          arch: process.arch,
        });
        
        // Add timeout to browser launch (30 seconds max)
        const launchPromise = chromium.launch(browserConfig);
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Browser launch timeout after 30 seconds')), 30000);
        });
        
        const browser = await Promise.race([launchPromise, timeoutPromise]);

        const instance: BrowserInstance = {
          browser,
          inUse: true,
          createdAt: Date.now(),
          lastUsed: Date.now(),
        };

        this.browserPool.push(instance);
        
        console.log('[BrowserService] Browser launched successfully');
        
        return browser;
      } catch (error) {
        console.error('[BrowserService] Failed to launch browser:', {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          isVercel: this.environmentDetector.isVercel(),
          nodeVersion: process.version,
          platform: process.platform,
          arch: process.arch,
        });
        
        throw new AgentMiddlewareError(
          ErrorCode.ERR_INTERNAL,
          `Failed to launch browser in ${this.environmentDetector.isVercel() ? 'Vercel' : 'local'} environment: ${error instanceof Error ? error.message : String(error)}`,
          { 
            originalError: error,
            isVercel: this.environmentDetector.isVercel(),
            nodeVersion: process.version,
            platform: process.platform,
            arch: process.arch,
          }
        );
      }
    }

    // Wait for available browser
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        const available = this.browserPool.find(instance => !instance.inUse);
        if (available) {
          clearInterval(checkInterval);
          available.inUse = true;
          available.lastUsed = Date.now();
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
      instance.lastUsed = Date.now();
    }
  }

  /**
   * Start idle browser cleanup interval
   * Closes browsers that have been idle for more than 30 seconds
   */
  private startIdleCleanup(): void {
    // Clear any existing interval
    if (this.idleCleanupInterval) {
      clearInterval(this.idleCleanupInterval);
    }

    // Run cleanup every 10 seconds
    this.idleCleanupInterval = setInterval(() => {
      this.cleanupIdleBrowsers().catch((error) => {
        console.error('[BrowserService] Error during idle cleanup:', error);
      });
    }, 10000);
  }

  /**
   * Clean up idle browser instances
   * Closes browsers that have been idle for more than 30 seconds
   */
  async cleanupIdleBrowsers(): Promise<void> {
    const now = Date.now();
    const instancesToClose: BrowserInstance[] = [];

    // Find idle browsers
    for (const instance of this.browserPool) {
      if (!instance.inUse && (now - instance.lastUsed) > this.IDLE_TIMEOUT_MS) {
        instancesToClose.push(instance);
      }
    }

    // Close idle browsers
    for (const instance of instancesToClose) {
      try {
        // Log memory usage before closing (Property 29: Memory Usage Logging)
        const stats = this.getPoolStats();
        console.log('[BrowserService] Closing idle browser instance', {
          idleTime: now - instance.lastUsed,
          poolSize: stats.total,
          inUse: stats.inUse,
          available: stats.available,
          timestamp: new Date().toISOString(),
        });

        await instance.browser.close();
        
        // Remove from pool
        const index = this.browserPool.indexOf(instance);
        if (index > -1) {
          this.browserPool.splice(index, 1);
        }
      } catch (error) {
        console.error('[BrowserService] Error closing idle browser:', error);
      }
    }
  }

  /**
   * Close all browser instances and clean up resources
   */
  async cleanup(): Promise<void> {
    // Stop idle cleanup interval
    if (this.idleCleanupInterval) {
      clearInterval(this.idleCleanupInterval);
      this.idleCleanupInterval = null;
    }

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
