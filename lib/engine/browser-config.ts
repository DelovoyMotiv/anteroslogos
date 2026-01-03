/**
 * Browser Configuration for GEO Audit Engine
 * Defines settings for headless browser operations
 * 
 * Environment Variables:
 * - BROWSER_ENABLED: Enable/disable browser mode (default: true)
 * - BROWSER_TIMEOUT: Page load timeout in ms (default: 15000) - Requirement 5.5
 * - BROWSER_PAGE_TIMEOUT: (deprecated, use BROWSER_TIMEOUT) Page load timeout in ms
 * - BROWSER_MAX_CONCURRENT: Max concurrent browser instances (default: 3)
 * - BROWSER_BLOCK_IMAGES: Block image loading (default: true)
 * - BROWSER_BLOCK_CSS: Block CSS loading (default: true)
 * - BROWSER_BLOCK_FONTS: Block font loading (default: true)
 * - BROWSER_BLOCK_MEDIA: Block media loading (default: true)
 * - BROWSER_MASK_WEBDRIVER: Mask navigator.webdriver (default: true)
 * - BROWSER_RANDOMIZE_VIEWPORT: Randomize viewport sizes (default: true)
 */

export interface BrowserConfiguration {
  // User-Agent pool for rotation
  userAgents: string[];
  
  // Viewport configurations
  viewportSizes: Array<{ width: number; height: number }>;
  
  // Resource blocking settings
  blockResources: {
    images: boolean;
    stylesheets: boolean;
    fonts: boolean;
    media: boolean;
  };
  
  // Stealth settings
  stealth: {
    maskWebdriver: boolean;
    randomizeViewport: boolean;
    injectMouseMovement: boolean;
  };
  
  // Performance settings
  maxConcurrentBrowsers: number;
  browserTimeout: number;
  pageLoadTimeout: number;
}

/**
 * Configuration validation error
 */
export class BrowserConfigurationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'BrowserConfigurationError';
  }
}

/**
 * Default browser configuration
 * Optimized for memory efficiency and bot detection evasion
 */
export const DEFAULT_BROWSER_CONFIG: BrowserConfiguration = {
  userAgents: [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
  ],
  viewportSizes: [
    { width: 1920, height: 1080 },
    { width: 1366, height: 768 },
    { width: 1536, height: 864 },
  ],
  blockResources: {
    images: true,
    stylesheets: true,
    fonts: true,
    media: true,
  },
  stealth: {
    maskWebdriver: true,
    randomizeViewport: true,
    injectMouseMovement: false, // Optional, not implemented in MVP
  },
  maxConcurrentBrowsers: 3,
  browserTimeout: 30000, // 30 seconds
  pageLoadTimeout: 15000, // 15 seconds
};

/**
 * Validates browser configuration
 * Throws BrowserConfigurationError if invalid
 */
export function validateBrowserConfig(config: BrowserConfiguration): void {
  // Validate user agents
  if (!Array.isArray(config.userAgents) || config.userAgents.length === 0) {
    throw new BrowserConfigurationError('userAgents must be a non-empty array', 'userAgents');
  }
  
  for (const ua of config.userAgents) {
    if (typeof ua !== 'string' || ua.trim().length === 0) {
      throw new BrowserConfigurationError('All userAgents must be non-empty strings', 'userAgents');
    }
  }
  
  // Validate viewport sizes
  if (!Array.isArray(config.viewportSizes) || config.viewportSizes.length === 0) {
    throw new BrowserConfigurationError('viewportSizes must be a non-empty array', 'viewportSizes');
  }
  
  for (const viewport of config.viewportSizes) {
    if (!viewport.width || !viewport.height) {
      throw new BrowserConfigurationError('Each viewport must have width and height', 'viewportSizes');
    }
    
    if (viewport.width < 320 || viewport.width > 3840) {
      throw new BrowserConfigurationError(
        `Viewport width must be between 320 and 3840 (got ${viewport.width})`,
        'viewportSizes'
      );
    }
    
    if (viewport.height < 240 || viewport.height > 2160) {
      throw new BrowserConfigurationError(
        `Viewport height must be between 240 and 2160 (got ${viewport.height})`,
        'viewportSizes'
      );
    }
  }
  
  // Validate resource blocking settings
  if (typeof config.blockResources !== 'object' || config.blockResources === null) {
    throw new BrowserConfigurationError('blockResources must be an object', 'blockResources');
  }
  
  const blockResourceKeys = ['images', 'stylesheets', 'fonts', 'media'];
  for (const key of blockResourceKeys) {
    if (typeof config.blockResources[key as keyof typeof config.blockResources] !== 'boolean') {
      throw new BrowserConfigurationError(
        `blockResources.${key} must be a boolean`,
        `blockResources.${key}`
      );
    }
  }
  
  // Validate stealth settings
  if (typeof config.stealth !== 'object' || config.stealth === null) {
    throw new BrowserConfigurationError('stealth must be an object', 'stealth');
  }
  
  const stealthKeys = ['maskWebdriver', 'randomizeViewport', 'injectMouseMovement'];
  for (const key of stealthKeys) {
    if (typeof config.stealth[key as keyof typeof config.stealth] !== 'boolean') {
      throw new BrowserConfigurationError(
        `stealth.${key} must be a boolean`,
        `stealth.${key}`
      );
    }
  }
  
  // Validate performance settings
  if (typeof config.maxConcurrentBrowsers !== 'number' || 
      config.maxConcurrentBrowsers < 1 || 
      config.maxConcurrentBrowsers > 20) {
    throw new BrowserConfigurationError(
      `maxConcurrentBrowsers must be between 1 and 20 (got ${config.maxConcurrentBrowsers})`,
      'maxConcurrentBrowsers'
    );
  }
  
  if (typeof config.browserTimeout !== 'number' || 
      config.browserTimeout < 1000 || 
      config.browserTimeout > 300000) {
    throw new BrowserConfigurationError(
      `browserTimeout must be between 1000 and 300000 ms (got ${config.browserTimeout})`,
      'browserTimeout'
    );
  }
  
  if (typeof config.pageLoadTimeout !== 'number' || 
      config.pageLoadTimeout < 1000 || 
      config.pageLoadTimeout > 300000) {
    throw new BrowserConfigurationError(
      `pageLoadTimeout must be between 1000 and 300000 ms (got ${config.pageLoadTimeout})`,
      'pageLoadTimeout'
    );
  }
}

/**
 * Parse boolean from environment variable
 * Returns true for 'true', '1', 'yes'
 * Returns false for 'false', '0', 'no'
 * Returns defaultValue for undefined or other values
 */
function parseBooleanEnv(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) {
    return defaultValue;
  }
  
  const normalized = value.toLowerCase().trim();
  
  if (normalized === 'true' || normalized === '1' || normalized === 'yes') {
    return true;
  }
  
  if (normalized === 'false' || normalized === '0' || normalized === 'no') {
    return false;
  }
  
  return defaultValue;
}

/**
 * Parse integer from environment variable with validation
 */
function parseIntEnv(
  value: string | undefined,
  defaultValue: number,
  min: number,
  max: number,
  fieldName: string
): number {
  if (value === undefined) {
    return defaultValue;
  }
  
  const parsed = parseInt(value, 10);
  
  if (isNaN(parsed)) {
    throw new BrowserConfigurationError(
      `${fieldName} must be a valid integer (got "${value}")`,
      fieldName
    );
  }
  
  if (parsed < min || parsed > max) {
    throw new BrowserConfigurationError(
      `${fieldName} must be between ${min} and ${max} (got ${parsed})`,
      fieldName
    );
  }
  
  return parsed;
}

/**
 * Get browser configuration from environment variables
 * Falls back to defaults if not specified
 * Validates the final configuration
 * 
 * @throws {BrowserConfigurationError} If configuration is invalid
 */
export function getBrowserConfig(): BrowserConfiguration {
  const config: BrowserConfiguration = {
    ...DEFAULT_BROWSER_CONFIG,
    blockResources: { ...DEFAULT_BROWSER_CONFIG.blockResources },
    stealth: { ...DEFAULT_BROWSER_CONFIG.stealth },
  };
  
  // Override with environment variables if present
  // Requirement 5.5: Support BROWSER_TIMEOUT environment variable
  // Also support BROWSER_PAGE_TIMEOUT for backward compatibility
  const timeoutEnvValue = process.env.BROWSER_TIMEOUT || process.env.BROWSER_PAGE_TIMEOUT;
  if (timeoutEnvValue !== undefined) {
    config.pageLoadTimeout = parseIntEnv(
      timeoutEnvValue,
      DEFAULT_BROWSER_CONFIG.pageLoadTimeout,
      1000,
      300000,
      'BROWSER_TIMEOUT'
    );
  }
  
  if (process.env.BROWSER_TIMEOUT !== undefined) {
    config.browserTimeout = parseIntEnv(
      process.env.BROWSER_TIMEOUT,
      DEFAULT_BROWSER_CONFIG.browserTimeout,
      1000,
      300000,
      'BROWSER_TIMEOUT'
    );
  }
  
  config.maxConcurrentBrowsers = parseIntEnv(
    process.env.BROWSER_MAX_CONCURRENT,
    DEFAULT_BROWSER_CONFIG.maxConcurrentBrowsers,
    1,
    20,
    'BROWSER_MAX_CONCURRENT'
  );
  
  // Handle resource blocking environment variables
  config.blockResources.images = parseBooleanEnv(
    process.env.BROWSER_BLOCK_IMAGES,
    DEFAULT_BROWSER_CONFIG.blockResources.images
  );
  
  config.blockResources.stylesheets = parseBooleanEnv(
    process.env.BROWSER_BLOCK_CSS,
    DEFAULT_BROWSER_CONFIG.blockResources.stylesheets
  );
  
  config.blockResources.fonts = parseBooleanEnv(
    process.env.BROWSER_BLOCK_FONTS,
    DEFAULT_BROWSER_CONFIG.blockResources.fonts
  );
  
  config.blockResources.media = parseBooleanEnv(
    process.env.BROWSER_BLOCK_MEDIA,
    DEFAULT_BROWSER_CONFIG.blockResources.media
  );
  
  // Handle stealth settings
  config.stealth.maskWebdriver = parseBooleanEnv(
    process.env.BROWSER_MASK_WEBDRIVER,
    DEFAULT_BROWSER_CONFIG.stealth.maskWebdriver
  );
  
  config.stealth.randomizeViewport = parseBooleanEnv(
    process.env.BROWSER_RANDOMIZE_VIEWPORT,
    DEFAULT_BROWSER_CONFIG.stealth.randomizeViewport
  );
  
  // Validate the configuration
  validateBrowserConfig(config);
  
  return config;
}

/**
 * Get browser configuration with custom overrides for testing
 * Merges overrides with environment-based config
 * Validates the final configuration
 * 
 * @param overrides - Partial configuration to override defaults
 * @throws {BrowserConfigurationError} If configuration is invalid
 */
export function getBrowserConfigWithOverrides(
  overrides: Partial<BrowserConfiguration>
): BrowserConfiguration {
  const baseConfig = getBrowserConfig();
  
  const config: BrowserConfiguration = {
    ...baseConfig,
    ...overrides,
    blockResources: {
      ...baseConfig.blockResources,
      ...(overrides.blockResources || {}),
    },
    stealth: {
      ...baseConfig.stealth,
      ...(overrides.stealth || {}),
    },
  };
  
  // Validate the merged configuration
  validateBrowserConfig(config);
  
  return config;
}

/**
 * Check if browser mode is enabled
 * Browser mode can be disabled via BROWSER_ENABLED=false environment variable
 */
export function isBrowserEnabled(): boolean {
  return parseBooleanEnv(process.env.BROWSER_ENABLED, true);
}
