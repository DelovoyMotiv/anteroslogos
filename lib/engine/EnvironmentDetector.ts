/**
 * EnvironmentDetector - Detects runtime environment and provides appropriate configuration
 * 
 * Handles:
 * - Vercel vs local environment detection
 * - Chromium executable path resolution
 * - Environment-specific browser launch configuration
 */

import chromium from '@sparticuz/chromium';

export interface BrowserLaunchOptions {
  executablePath?: string;
  headless: boolean;
  args: string[];
}

/**
 * EnvironmentDetector detects the runtime environment and provides
 * appropriate configuration for browser launching
 */
export class EnvironmentDetector {
  /**
   * Detects if running in Vercel serverless environment
   * @returns true if running in Vercel
   */
  isVercel(): boolean {
    return process.env.VERCEL === '1' || process.env.VERCEL === 'true';
  }

  /**
   * Detects if running in local development
   * @returns true if running locally
   */
  isLocal(): boolean {
    return !this.isVercel();
  }

  /**
   * Gets the appropriate Chromium executable path
   * @returns Path to Chromium executable
   */
  async getChromiumPath(): Promise<string | undefined> {
    if (this.isVercel()) {
      try {
        // Use @sparticuz/chromium for Vercel serverless
        const path = await chromium.executablePath();
        console.log('[EnvironmentDetector] Vercel Chromium path:', path);
        return path;
      } catch (error) {
        console.error('[EnvironmentDetector] Failed to get Chromium path:', error);
        throw new Error(`Failed to get Chromium executable path: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    
    // Use Playwright's bundled Chromium for local development
    // Playwright will use its default path when executablePath is undefined
    console.log('[EnvironmentDetector] Using Playwright bundled Chromium');
    return undefined;
  }

  /**
   * Gets environment-specific browser configuration
   * @returns Browser launch options
   */
  async getBrowserConfig(): Promise<BrowserLaunchOptions> {
    const isVercelEnv = this.isVercel();
    console.log('[EnvironmentDetector] Getting browser config for environment:', {
      isVercel: isVercelEnv,
      VERCEL: process.env.VERCEL,
    });
    
    const executablePath = await this.getChromiumPath();
    
    // Serverless-optimized launch flags
    const args = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-accelerated-2d-canvas',
    ];

    // Add Vercel-specific optimizations
    if (isVercelEnv) {
      args.push(
        '--single-process',
        '--no-zygote',
        '--disable-software-rasterizer',
      );
      console.log('[EnvironmentDetector] Added Vercel-specific flags');
    }

    const config = {
      executablePath,
      headless: true,
      args,
    };
    
    console.log('[EnvironmentDetector] Browser config ready:', {
      hasExecutablePath: !!config.executablePath,
      headless: config.headless,
      argsCount: config.args.length,
    });

    return config;
  }
}
