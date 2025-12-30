/**
 * Link Analysis Engine
 * Main orchestrator for comprehensive link structure analysis
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9, 7.10
 *              8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7
 *              9.1, 9.3, 9.4
 */

import { JSDOM } from 'jsdom';
import { getDefaultLinkAnalysisDetails } from '../geoAuditDefaults';
import type {
  LinkAnalysisDetails,
  LinkAnalysisOptions,
  ExtractedLink,
  AnchorType,
  LinkContext,
  LinkDepth,
  LinkDistribution,
} from './types';
import { extractLinks, isInternalLink, classifyLinkType } from './extractor';
import { checkBrokenLinks as checkBrokenLinksFunc } from './brokenLinkChecker';
import { estimateDomainAuthority } from './domainAuthority';
import { classifyAnchorText, analyzeAnchorDistribution, generateAnchorRecommendations } from './anchorAnalyzer';
import { detectLinkContext, analyzeLinkContextDistribution } from './contextDetector';
import {
  DEFAULT_ANALYSIS_TIMEOUT,
  DEFAULT_MAX_BROKEN_LINK_CHECKS,
  DA_THRESHOLDS,
  QUALITY_THRESHOLDS,
} from './constants';

/**
 * Analyzes the complete link structure of an HTML document
 * 
 * This is the main entry point for link analysis. It orchestrates all
 * sub-components to provide comprehensive link analysis including:
 * - Link extraction and classification
 * - Broken link detection (optional)
 * - Domain authority estimation
 * - Anchor text analysis
 * - Link context detection
 * - Metrics calculation
 * - Issue and strength identification
 * 
 * @param url - The URL of the page being analyzed
 * @param htmlContent - The HTML content to analyze
 * @param options - Configuration options for analysis
 * @returns Complete link analysis details
 * 
 * @example
 * ```typescript
 * const result = await analyzeLinkStructure(
 *   'https://example.com',
 *   htmlContent,
 *   { checkBrokenLinks: true, maxBrokenLinkChecks: 20 }
 * );
 * ```
 */
export async function analyzeLinkStructure(
  url: string,
  htmlContent: string,
  options: LinkAnalysisOptions = {}
): Promise<LinkAnalysisDetails> {
  // Set default options
  const {
    checkBrokenLinks = false,
    maxBrokenLinkChecks = DEFAULT_MAX_BROKEN_LINK_CHECKS,
    timeout = DEFAULT_ANALYSIS_TIMEOUT,
  } = options;

  // Create abort controller for timeout management (Requirement 9.3, 9.4)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    // Parse HTML into Document (Requirement 7.1)
    // Requirement 8.2: Try-catch for HTML parsing
    let doc: Document;
    try {
      const dom = new JSDOM(htmlContent);
      doc = dom.window.document;
    } catch (error) {
      // Requirement 8.2: Structured logging
      console.error('Link analysis - HTML parsing failed:', {
        url,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
      
      // Requirement 8.3: Graceful degradation
      clearTimeout(timeoutId);
      return getDefaultLinkAnalysisDetails();
    }

    // Extract page metadata for anchor text analysis
    const pageTitle = doc.querySelector('title')?.textContent || '';
    const brandName = extractBrandName(doc, url);

    // Extract all links (Requirement 7.2)
    // Requirement 8.2: Try-catch for link extraction
    let links: ExtractedLink[] = [];
    try {
      links = extractLinks(doc, url);
    } catch (error) {
      // Requirement 8.2: Structured logging
      console.error('Link analysis - Link extraction failed:', {
        url,
        operation: 'extractLinks',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
      
      // Requirement 8.3: Continue with empty links array
      links = [];
    }

    // Detect context for each link (Requirement 7.8)
    // Requirement 8.4: Try-catch for context detection
    try {
      links = links.map(link => ({
        ...link,
        context: detectLinkContext(link.element),
      }));
    } catch (error) {
      // Requirement 8.2: Structured logging
      console.error('Link analysis - Context detection failed:', {
        url,
        operation: 'detectLinkContext',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
      
      // Requirement 8.3: Continue with default context
      links = links.map(link => ({
        ...link,
        context: 'other' as LinkContext,
      }));
    }

    // Classify links as internal/external (Requirement 7.3)
    const internalLinks = links.filter(link => isInternalLink(link.href, url));
    const externalLinks = links.filter(link => !isInternalLink(link.href, url));

    // Count unique links (Requirement 7.4, 7.5)
    const uniqueInternalUrls = new Set(internalLinks.map(l => l.href));
    const uniqueExternalUrls = new Set(externalLinks.map(l => l.href));

    // Check for broken links (optional) (Requirement 7.10)
    // Requirement 8.4: Try-catch for broken link checking
    // Requirement 9.3, 9.4: Timeout control for broken link checks
    let brokenLinkResults: any[] = [];
    let brokenLinksCount = 0;
    
    if (checkBrokenLinks && externalLinks.length > 0) {
      try {
        const urlsToCheck = Array.from(uniqueExternalUrls).slice(0, maxBrokenLinkChecks);
        
        // Create a timeout promise for broken link checks
        const brokenLinkPromise = checkBrokenLinksFunc(urlsToCheck, maxBrokenLinkChecks);
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Broken link check timeout')), timeout / 2);
        });
        
        // Race between broken link check and timeout
        brokenLinkResults = await Promise.race([brokenLinkPromise, timeoutPromise]);
        brokenLinksCount = brokenLinkResults.filter(r => r.broken).length;
      } catch (error) {
        // Requirement 8.2: Structured logging
        console.error('Link analysis - Broken link check failed:', {
          url,
          operation: 'checkBrokenLinks',
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        });
        
        // Requirement 8.3: Continue with default values
        brokenLinksCount = 0;
        brokenLinkResults = [];
      }
    }

    // Estimate domain authority for external domains (Requirement 7.7)
    // Requirement 8.4: Try-catch for domain authority estimation
    // Requirement 9.3, 9.4: Timeout control for domain authority checks
    const externalDomains = Array.from(uniqueExternalUrls).map(extractDomain);
    const uniqueDomains = Array.from(new Set(externalDomains));
    
    const domainAuthorityMap = new Map<string, number>();
    const domainAuthorityTimeout = timeout / 4; // Allocate 1/4 of total timeout per domain
    
    for (const domain of uniqueDomains) {
      try {
        // Create a timeout promise for domain authority check
        const daPromise = estimateDomainAuthority(domain, `https://${domain}`);
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Domain authority check timeout')), domainAuthorityTimeout);
        });
        
        // Race between DA check and timeout
        const result = await Promise.race([daPromise, timeoutPromise]);
        domainAuthorityMap.set(domain, result.score);
      } catch (error) {
        // Requirement 8.2: Structured logging
        console.error('Link analysis - Domain authority estimation failed:', {
          url,
          operation: 'estimateDomainAuthority',
          domain,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        });
        
        // Requirement 8.3: Use default score
        domainAuthorityMap.set(domain, 50);
      }
    }

    // Classify anchor text for all links (Requirement 7.8)
    // Requirement 8.4: Try-catch for anchor text classification
    const anchorTypes: AnchorType[] = [];
    for (const link of links) {
      try {
        const anchorType = classifyAnchorText(
          link.text,
          link.href,
          brandName,
          pageTitle,
          link.hasImage
        );
        anchorTypes.push(anchorType);
      } catch (error) {
        // Requirement 8.2: Structured logging
        console.error('Link analysis - Anchor text classification failed:', {
          url,
          operation: 'classifyAnchorText',
          linkHref: link.href,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        });
        
        // Requirement 8.3: Use default type
        anchorTypes.push('partial');
      }
    }

    // Analyze anchor text distribution
    const anchorDistribution = analyzeAnchorDistribution(anchorTypes);

    // Calculate metrics (Requirements 7.6, 7.9)
    const totalLinks = links.length;
    const nofollowLinks = links.filter(l => l.isNofollow).length;
    const nofollowRatio = totalLinks > 0 ? (nofollowLinks / totalLinks) * 100 : 0;
    
    const emptyAnchors = anchorTypes.filter(t => t === 'empty').length;
    const imageLinks = links.filter(l => l.hasImage).length;

    // Calculate anchor text quality (percentage of descriptive anchors)
    const descriptiveAnchors = anchorDistribution.partialMatch + anchorDistribution.branded;
    const anchorTextQuality = totalLinks > 0 
      ? (descriptiveAnchors / totalLinks) * 100 
      : 50;

    // Calculate link depth
    const linkDepth = calculateLinkDepth(uniqueInternalUrls.size);

    // Calculate link distribution quality
    const linkContextDistribution = calculateContextDistribution(links);
    const linkDistribution = calculateLinkDistribution(linkContextDistribution, totalLinks);

    // Calculate follow/nofollow distribution
    const followDistribution = calculateFollowDistribution(links, url);

    // Analyze external domain quality
    const externalDomainQuality = analyzeExternalDomainQuality(
      externalLinks,
      domainAuthorityMap
    );

    // Calculate top internal pages
    const topInternalPages = calculateTopInternalPages(internalLinks);

    // Generate issues and strengths
    const { issues, strengths } = generateIssuesAndStrengths({
      totalLinks,
      internalLinks: internalLinks.length,
      externalLinks: externalLinks.length,
      nofollowRatio,
      anchorDistribution,
      linkContextDistribution,
      brokenLinksCount,
      anchorTextQuality,
      emptyAnchors,
      linkDepth,
      linkDistribution,
    });

    // Clear timeout
    clearTimeout(timeoutId);

    // Return complete analysis (Requirement 7.1-7.10)
    return {
      totalLinks,
      internalLinks: internalLinks.length,
      externalLinks: externalLinks.length,
      nofollowLinks,
      nofollowRatio,
      uniqueInternalLinks: uniqueInternalUrls.size,
      uniqueExternalLinks: uniqueExternalUrls.size,
      brokenLinks: brokenLinksCount,
      brokenLinkDetails: checkBrokenLinks ? brokenLinkResults : undefined,
      linkDepth,
      anchorTextQuality,
      emptyAnchors,
      imageLinks,
      linkDistribution,
      externalDomains: uniqueDomains,
      topInternalPages,
      anchorTextPatterns: {
        exactMatch: anchorDistribution.exactMatch,
        partialMatch: anchorDistribution.partialMatch,
        branded: anchorDistribution.branded,
        generic: anchorDistribution.generic,
        nakedUrl: anchorDistribution.nakedUrl,
        image: anchorDistribution.image,
      },
      linkContextDistribution,
      externalDomainQuality,
      followDistribution,
      issues,
      strengths,
    };
  } catch (error) {
    // Requirement 8.1, 8.6: Critical error handling
    // Requirement 8.7: Structured logging
    console.error('Link analysis - Critical failure:', {
      url,
      operation: 'analyzeLinkStructure',
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
      } : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
    
    // Clear timeout on error
    clearTimeout(timeoutId);
    
    // Requirement 8.6: Return default values on critical error
    return getDefaultLinkAnalysisDetails();
  }
}

/**
 * Extracts brand name from document or URL
 */
function extractBrandName(doc: Document, url: string): string {
  // Try to get from meta tags
  const ogSiteName = doc.querySelector('meta[property="og:site_name"]')?.getAttribute('content');
  if (ogSiteName) return ogSiteName;

  // Try to get from title
  const title = doc.querySelector('title')?.textContent || '';
  const titleParts = title.split(/[-|–—]/);
  if (titleParts.length > 1) {
    return titleParts[titleParts.length - 1].trim();
  }

  // Fallback to domain name
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.replace(/^www\./, '');
    const domainParts = hostname.split('.');
    return domainParts[0] || '';
  } catch {
    return '';
  }
}

/**
 * Extracts domain from URL
 */
function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return '';
  }
}

/**
 * Calculates link depth classification
 */
function calculateLinkDepth(uniqueInternalLinks: number): LinkDepth {
  if (uniqueInternalLinks <= QUALITY_THRESHOLDS.SHALLOW_THRESHOLD) {
    return 'shallow';
  } else if (uniqueInternalLinks >= QUALITY_THRESHOLDS.DEEP_THRESHOLD) {
    return 'deep';
  } else {
    return 'balanced';
  }
}

/**
 * Calculates link context distribution
 */
function calculateContextDistribution(links: ExtractedLink[]): {
  header: number;
  footer: number;
  navigation: number;
  mainContent: number;
  sidebar: number;
  other: number;
} {
  const distribution = {
    header: 0,
    footer: 0,
    navigation: 0,
    mainContent: 0,
    sidebar: 0,
    other: 0,
  };

  for (const link of links) {
    distribution[link.context]++;
  }

  return distribution;
}

/**
 * Calculates link distribution quality
 */
function calculateLinkDistribution(
  contextDistribution: Record<LinkContext, number>,
  totalLinks: number
): LinkDistribution {
  if (totalLinks === 0) return 'poor';

  const mainContentPercentage = contextDistribution.mainContent / totalLinks;

  if (mainContentPercentage >= QUALITY_THRESHOLDS.MAIN_CONTENT_GOOD) {
    return 'excellent';
  } else if (mainContentPercentage >= 0.4) {
    return 'good';
  } else if (mainContentPercentage >= QUALITY_THRESHOLDS.MAIN_CONTENT_POOR) {
    return 'fair';
  } else {
    return 'poor';
  }
}

/**
 * Calculates follow/nofollow distribution
 */
function calculateFollowDistribution(links: ExtractedLink[], baseUrl: string): {
  internalFollow: number;
  internalNofollow: number;
  externalFollow: number;
  externalNofollow: number;
} {
  const distribution = {
    internalFollow: 0,
    internalNofollow: 0,
    externalFollow: 0,
    externalNofollow: 0,
  };

  for (const link of links) {
    const isInternal = isInternalLink(link.href, baseUrl);
    
    if (isInternal) {
      if (link.isNofollow) {
        distribution.internalNofollow++;
      } else {
        distribution.internalFollow++;
      }
    } else {
      if (link.isNofollow) {
        distribution.externalNofollow++;
      } else {
        distribution.externalFollow++;
      }
    }
  }

  return distribution;
}

/**
 * Analyzes external domain quality based on estimated authority
 */
function analyzeExternalDomainQuality(
  externalLinks: ExtractedLink[],
  domainAuthorityMap: Map<string, number>
): {
  highAuthority: number;
  mediumAuthority: number;
  lowAuthority: number;
  topDomains: Array<{
    domain: string;
    estimatedAuthority: number;
    linkCount: number;
  }>;
} {
  const domainCounts = new Map<string, number>();
  
  // Count links per domain
  for (const link of externalLinks) {
    const domain = extractDomain(link.href);
    domainCounts.set(domain, (domainCounts.get(domain) || 0) + 1);
  }

  // Classify domains by authority
  let highAuthority = 0;
  let mediumAuthority = 0;
  let lowAuthority = 0;

  const topDomains: Array<{
    domain: string;
    estimatedAuthority: number;
    linkCount: number;
  }> = [];

  for (const [domain, count] of domainCounts.entries()) {
    const authority = domainAuthorityMap.get(domain) || 50;
    
    if (authority >= DA_THRESHOLDS.HIGH) {
      highAuthority += count;
    } else if (authority >= DA_THRESHOLDS.MEDIUM) {
      mediumAuthority += count;
    } else {
      lowAuthority += count;
    }

    topDomains.push({
      domain,
      estimatedAuthority: authority,
      linkCount: count,
    });
  }

  // Sort by authority and take top 10
  topDomains.sort((a, b) => b.estimatedAuthority - a.estimatedAuthority);
  const top10Domains = topDomains.slice(0, 10);

  return {
    highAuthority,
    mediumAuthority,
    lowAuthority,
    topDomains: top10Domains,
  };
}

/**
 * Calculates top internal pages by link count
 */
function calculateTopInternalPages(
  internalLinks: ExtractedLink[]
): Array<{ url: string; count: number }> {
  const pageCounts = new Map<string, number>();

  for (const link of internalLinks) {
    // Remove fragment from URL for counting
    const url = link.href.split('#')[0];
    pageCounts.set(url, (pageCounts.get(url) || 0) + 1);
  }

  // Convert to array and sort by count
  const pages = Array.from(pageCounts.entries()).map(([url, count]) => ({
    url,
    count,
  }));

  pages.sort((a, b) => b.count - a.count);

  // Return top 10
  return pages.slice(0, 10);
}

/**
 * Generates issues and strengths based on analysis results
 */
function generateIssuesAndStrengths(data: {
  totalLinks: number;
  internalLinks: number;
  externalLinks: number;
  nofollowRatio: number;
  anchorDistribution: ReturnType<typeof analyzeAnchorDistribution>;
  linkContextDistribution: Record<LinkContext, number>;
  brokenLinksCount: number;
  anchorTextQuality: number;
  emptyAnchors: number;
  linkDepth: LinkDepth;
  linkDistribution: LinkDistribution;
}): { issues: string[]; strengths: string[] } {
  const issues: string[] = [];
  const strengths: string[] = [];

  // Check total links
  if (data.totalLinks === 0) {
    issues.push('No links found on page');
    return { issues, strengths };
  }

  // Check link depth
  if (data.linkDepth === 'shallow') {
    issues.push('Shallow link structure - consider adding more internal links');
  } else if (data.linkDepth === 'deep') {
    strengths.push('Deep link structure with good internal linking');
  }

  // Check nofollow ratio
  if (data.nofollowRatio > QUALITY_THRESHOLDS.NOFOLLOW_WARNING * 100) {
    issues.push(`High nofollow ratio (${data.nofollowRatio.toFixed(0)}%) - may limit link equity flow`);
  }

  // Check anchor text quality
  const anchorRecommendations = generateAnchorRecommendations(data.anchorDistribution);
  issues.push(...anchorRecommendations.issues);
  strengths.push(...anchorRecommendations.strengths);

  // Check link context distribution
  const contextRecommendations = analyzeLinkContextDistribution(data.linkContextDistribution);
  issues.push(...contextRecommendations.issues);
  strengths.push(...contextRecommendations.strengths);

  // Check broken links
  if (data.brokenLinksCount > 0) {
    issues.push(`${data.brokenLinksCount} broken links detected - fix to improve user experience`);
  }

  // Check link distribution
  if (data.linkDistribution === 'excellent') {
    strengths.push('Excellent link distribution across page sections');
  } else if (data.linkDistribution === 'poor') {
    issues.push('Poor link distribution - most links outside main content');
  }

  // Check internal vs external balance
  const internalRatio = data.totalLinks > 0 
    ? (data.internalLinks / data.totalLinks) * 100 
    : 0;
  
  if (internalRatio < 30) {
    issues.push('Low internal link ratio - consider adding more internal links');
  } else if (internalRatio >= 60) {
    strengths.push('Good internal link ratio for site navigation');
  }

  return { issues, strengths };
}
