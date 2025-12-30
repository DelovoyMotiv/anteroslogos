/**
 * Link Analysis Module - Constants
 * Configuration values and reference data for link analysis
 */

// ==================== TIMEOUTS ====================

/**
 * Default timeout for broken link checks (milliseconds)
 */
export const DEFAULT_BROKEN_LINK_TIMEOUT = 5000;

/**
 * Default timeout for entire link analysis operation (milliseconds)
 */
export const DEFAULT_ANALYSIS_TIMEOUT = 30000;

/**
 * Maximum number of redirects to follow
 */
export const MAX_REDIRECTS = 3;

// ==================== LIMITS ====================

/**
 * Default maximum number of broken links to check
 */
export const DEFAULT_MAX_BROKEN_LINK_CHECKS = 20;

/**
 * Maximum number of external links before limiting checks
 */
export const MAX_EXTERNAL_LINKS_THRESHOLD = 50;

// ==================== DOMAIN AUTHORITY SCORING ====================

/**
 * TLD (Top-Level Domain) authority scores
 */
export const TLD_SCORES: Record<string, number> = {
  'gov': 35,
  'edu': 35,
  'org': 25,
  'com': 10,
  'net': 10,
  'io': 10,
  'co': 10,
};

/**
 * Known high-authority domains with their estimated scores
 * Tier 1: 95-100 (Global authorities)
 * Tier 2: 85-94 (Major platforms)
 * Tier 3: 75-84 (Industry leaders)
 */
export const KNOWN_AUTHORITY_DOMAINS: Record<string, number> = {
  // Tier 1: Global Authorities (95-100)
  'wikipedia.org': 98,
  'google.com': 100,
  'youtube.com': 98,
  'facebook.com': 96,
  'twitter.com': 96,
  'linkedin.com': 96,
  'github.com': 95,
  'stackoverflow.com': 95,
  'medium.com': 95,
  'reddit.com': 95,
  
  // Tier 2: Major Platforms (85-94)
  'amazon.com': 94,
  'apple.com': 94,
  'microsoft.com': 94,
  'mozilla.org': 92,
  'w3.org': 92,
  'ietf.org': 92,
  'ieee.org': 90,
  'acm.org': 90,
  'nature.com': 90,
  'sciencedirect.com': 88,
  'springer.com': 88,
  'wiley.com': 88,
  'nytimes.com': 92,
  'bbc.com': 92,
  'theguardian.com': 90,
  'reuters.com': 90,
  'forbes.com': 88,
  'techcrunch.com': 88,
  'wired.com': 88,
  
  // Tier 3: Industry Leaders (75-84)
  'hubspot.com': 84,
  'salesforce.com': 84,
  'shopify.com': 82,
  'wordpress.org': 82,
  'npmjs.com': 80,
  'pypi.org': 80,
  'docker.com': 80,
  'aws.amazon.com': 85,
  'cloud.google.com': 85,
  'azure.microsoft.com': 85,
};

/**
 * Base domain authority score before adjustments
 */
export const BASE_DOMAIN_AUTHORITY = 50;

/**
 * Domain authority score adjustments
 */
export const DA_ADJUSTMENTS = {
  SSL_BONUS: 5,
  SHORT_DOMAIN_BONUS: 5,      // <= 6 chars
  LONG_DOMAIN_PENALTY: -5,    // > 15 chars
  HYPHEN_PENALTY: -10,
  NUMBER_PENALTY: -5,
  SUBDOMAIN_PENALTY: -5,      // Per subdomain level beyond www
};

/**
 * Domain authority thresholds
 */
export const DA_THRESHOLDS = {
  HIGH: 70,
  MEDIUM: 40,
  LOW: 0,
};

// ==================== ANCHOR TEXT PATTERNS ====================

/**
 * Generic anchor text phrases that should be avoided
 */
export const GENERIC_ANCHOR_PHRASES = [
  'click here',
  'read more',
  'learn more',
  'more info',
  'more information',
  'click this',
  'this link',
  'here',
  'link',
  'website',
  'page',
  'article',
  'post',
  'view',
  'see more',
  'continue reading',
  'find out more',
];

/**
 * Spam patterns in domain names
 */
export const SPAM_PATTERNS = [
  /\d{4,}/,                    // 4+ consecutive digits
  /[a-z]{20,}/i,               // 20+ consecutive letters
  /-{2,}/,                     // Multiple consecutive hyphens
  /\d+[a-z]+\d+/i,             // Mixed numbers and letters
  /(buy|cheap|discount|free|win|prize)/i,  // Spam keywords
];

// ==================== LINK CONTEXT SELECTORS ====================

/**
 * CSS selectors for detecting link context
 */
export const CONTEXT_SELECTORS = {
  header: ['header', '.header', '#header', '[role="banner"]'],
  footer: ['footer', '.footer', '#footer', '[role="contentinfo"]'],
  navigation: ['nav', '.nav', '.menu', '.navigation', '[role="navigation"]'],
  mainContent: ['main', 'article', '.content', '.main-content', '[role="main"]'],
  sidebar: ['aside', '.sidebar', '.side-bar', '[role="complementary"]'],
};

// ==================== QUALITY THRESHOLDS ====================

/**
 * Thresholds for link quality assessment
 */
export const QUALITY_THRESHOLDS = {
  // Anchor text quality
  EXACT_MATCH_WARNING: 0.3,        // > 30% exact match = over-optimization
  GENERIC_ANCHOR_WARNING: 0.4,     // > 40% generic = poor quality
  EMPTY_ANCHOR_WARNING: 0.1,       // > 10% empty = accessibility issue
  
  // Link distribution
  MAIN_CONTENT_GOOD: 0.6,          // >= 60% in main content = good
  MAIN_CONTENT_POOR: 0.3,          // < 30% in main content = poor
  
  // Link depth
  SHALLOW_THRESHOLD: 3,            // <= 3 unique internal pages
  DEEP_THRESHOLD: 10,              // >= 10 unique internal pages
  
  // Nofollow ratio
  NOFOLLOW_WARNING: 0.5,           // > 50% nofollow = issue
};

// ==================== HTTP STATUS CODES ====================

/**
 * HTTP status code ranges for link validation
 */
export const HTTP_STATUS = {
  SUCCESS_MIN: 200,
  SUCCESS_MAX: 299,
  REDIRECT_MIN: 300,
  REDIRECT_MAX: 399,
  CLIENT_ERROR_MIN: 400,
  CLIENT_ERROR_MAX: 499,
  SERVER_ERROR_MIN: 500,
  SERVER_ERROR_MAX: 599,
};

// ==================== LINK TYPES ====================

/**
 * Special link protocols to handle differently
 */
export const SPECIAL_PROTOCOLS = {
  MAILTO: 'mailto:',
  TEL: 'tel:',
  JAVASCRIPT: 'javascript:',
  DATA: 'data:',
  ANCHOR: '#',
};

// ==================== USER AGENT ====================

/**
 * User agent string for HTTP requests
 */
export const USER_AGENT = 'Mozilla/5.0 (compatible; GEOAuditBot/2.0; +https://geoaudit.ai)';

// ==================== PERFORMANCE ====================

/**
 * Performance-related constants
 */
export const PERFORMANCE = {
  /** Batch size for parallel broken link checks */
  PARALLEL_BATCH_SIZE: 10,
  
  /** Delay between batches (milliseconds) */
  BATCH_DELAY: 100,
  
  /** Maximum concurrent requests */
  MAX_CONCURRENT_REQUESTS: 5,
};
