/**
 * Link Analysis Module - Type Definitions
 * Ph.D.-level engineering standards for link structure analysis
 */

// ==================== CORE TYPES ====================

/**
 * Link context within page structure
 */
export type LinkContext = 'header' | 'footer' | 'navigation' | 'mainContent' | 'sidebar' | 'other';

/**
 * Anchor text classification types
 */
export type AnchorType = 'exact' | 'partial' | 'branded' | 'generic' | 'naked' | 'image' | 'empty';

/**
 * Link depth classification
 */
export type LinkDepth = 'shallow' | 'balanced' | 'deep';

/**
 * Link distribution quality
 */
export type LinkDistribution = 'poor' | 'fair' | 'good' | 'excellent';

// ==================== EXTRACTED LINK ====================

/**
 * Represents a single extracted link with all metadata
 */
export interface ExtractedLink {
  /** Absolute URL of the link */
  href: string;
  /** Anchor text content */
  text: string;
  /** rel attribute value */
  rel: string;
  /** Whether link has rel="nofollow" */
  isNofollow: boolean;
  /** Whether link contains an image */
  hasImage: boolean;
  /** Detected context of link placement */
  context: LinkContext;
  /** Reference to the anchor element */
  element: HTMLAnchorElement;
}

// ==================== BROKEN LINK DETECTION ====================

/**
 * Result of broken link check
 */
export interface BrokenLinkResult {
  /** URL that was checked */
  url: string;
  /** HTTP status code (or 0 if failed) */
  status: number;
  /** Whether link is broken */
  broken: boolean;
  /** Whether link was redirected */
  redirected: boolean;
  /** Final URL after redirects */
  finalUrl?: string;
  /** Error message if check failed */
  error?: string;
}

// ==================== DOMAIN AUTHORITY ====================

/**
 * Factors contributing to domain authority estimation
 */
export interface DomainAuthorityFactors {
  /** Score from TLD (.gov, .edu, etc.) */
  tldScore: number;
  /** Score from known authority list */
  knownAuthority: number;
  /** Whether SSL certificate is valid */
  sslValid: boolean;
  /** Length of domain name */
  domainLength: number;
  /** Whether domain contains hyphens */
  hasHyphens: boolean;
  /** Whether domain contains numbers */
  hasNumbers: boolean;
  /** Detected spam patterns */
  spamPatterns: string[];
}

/**
 * Domain authority estimation result
 */
export interface DomainAuthorityResult {
  /** Estimated authority score (0-100) */
  score: number;
  /** Breakdown of factors */
  factors: DomainAuthorityFactors;
}

// ==================== LINK ANALYSIS OPTIONS ====================

/**
 * Configuration options for link analysis
 */
export interface LinkAnalysisOptions {
  /** Whether to check for broken links (increases analysis time) */
  checkBrokenLinks?: boolean;
  /** Maximum number of broken links to check */
  maxBrokenLinkChecks?: number;
  /** Whether to use Puppeteer for dynamic content */
  usePuppeteer?: boolean;
  /** Timeout for analysis operations (milliseconds) */
  timeout?: number;
}

// ==================== LINK ANALYSIS DETAILS ====================

/**
 * Complete link analysis results
 * This interface maintains backward compatibility with existing system
 */
export interface LinkAnalysisDetails {
  // Basic metrics
  totalLinks: number;
  internalLinks: number;
  externalLinks: number;
  nofollowLinks: number;
  nofollowRatio: number;
  uniqueInternalLinks: number;
  uniqueExternalLinks: number;
  
  // Broken link detection (NEW)
  brokenLinks: number;
  brokenLinkDetails?: BrokenLinkResult[];
  
  // Link quality
  linkDepth: LinkDepth;
  anchorTextQuality: number;
  emptyAnchors: number;
  imageLinks: number;
  linkDistribution: LinkDistribution;
  
  // External domains
  externalDomains: string[];
  topInternalPages: Array<{ url: string; count: number }>;
  
  // Anchor text patterns
  anchorTextPatterns: {
    exactMatch: number;
    partialMatch: number;
    branded: number;
    generic: number;
    nakedUrl: number;
    image: number;
  };
  
  // Link context distribution
  linkContextDistribution: {
    header: number;
    footer: number;
    navigation: number;
    mainContent: number;
    sidebar: number;
    other: number;
  };
  
  // External domain quality
  externalDomainQuality: {
    highAuthority: number;    // Estimated DA 70+
    mediumAuthority: number;  // Estimated DA 40-69
    lowAuthority: number;     // Estimated DA 0-39
    topDomains: Array<{
      domain: string;
      estimatedAuthority: number;
      linkCount: number;
    }>;
  };
  
  // Follow/Nofollow distribution
  followDistribution: {
    internalFollow: number;
    internalNofollow: number;
    externalFollow: number;
    externalNofollow: number;
  };
  
  // Issues and strengths
  issues: string[];
  strengths: string[];
}
