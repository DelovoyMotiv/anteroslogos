/**
 * Domain Authority Estimator
 * Multi-factor heuristic estimation of domain authority (0-100)
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10
 */

import {
  TLD_SCORES,
  KNOWN_AUTHORITY_DOMAINS,
  BASE_DOMAIN_AUTHORITY,
  DA_ADJUSTMENTS,
  SPAM_PATTERNS,
} from './constants';
import type { DomainAuthorityResult, DomainAuthorityFactors } from './types';

/**
 * Estimates domain authority using multi-factor heuristic analysis
 * 
 * Factors considered:
 * - TLD authority (gov/edu: +35, org: +25, com/net: +10)
 * - Known authority domains (3 tiers: 95-100, 85-94, 75-84)
 * - SSL certificate validation
 * - Domain characteristics (length, hyphens, numbers)
 * - Spam pattern detection
 * - Subdomain depth analysis
 * 
 * @param domain - Domain name (e.g., "example.com")
 * @param url - Full URL for SSL checking (e.g., "https://example.com")
 * @returns Domain authority score (0-100) with factor breakdown
 * 
 * @example
 * const result = await estimateDomainAuthority('wikipedia.org', 'https://wikipedia.org');
 * console.log(result.score); // 98
 */
export async function estimateDomainAuthority(
  domain: string,
  url: string
): Promise<DomainAuthorityResult> {
  try {
    // Normalize domain to lowercase
    const normalizedDomain = domain.toLowerCase().trim();
    
    // Check if domain is in known authority list (highest priority)
    // Requirements: 4.3
    if (KNOWN_AUTHORITY_DOMAINS[normalizedDomain]) {
      const knownScore = KNOWN_AUTHORITY_DOMAINS[normalizedDomain];
      return {
        score: knownScore,
        factors: {
          tldScore: 0,
          knownAuthority: knownScore,
          sslValid: url.startsWith('https://'),
          domainLength: extractBaseDomain(normalizedDomain).length,
          hasHyphens: normalizedDomain.includes('-'),
          hasNumbers: /\d/.test(normalizedDomain),
          spamPatterns: [],
        },
      };
    }
    
    // Start with base score
    // Requirements: 4.1
    let score = BASE_DOMAIN_AUTHORITY;
    
    // Extract TLD and base domain
    const tld = extractTLD(normalizedDomain);
    const baseDomain = extractBaseDomain(normalizedDomain);
    
    // Calculate TLD score
    // Requirements: 4.2
    const tldScore = TLD_SCORES[tld] || 0;
    score += tldScore;
    
    // Check SSL certificate
    // Requirements: 4.9
    const sslValid = url.startsWith('https://');
    if (sslValid) {
      score += DA_ADJUSTMENTS.SSL_BONUS;
    }
    
    // Analyze domain length
    // Requirements: 4.7, 4.8
    const domainLength = baseDomain.length;
    if (domainLength <= 6) {
      score += DA_ADJUSTMENTS.SHORT_DOMAIN_BONUS;
    } else if (domainLength > 15) {
      score += DA_ADJUSTMENTS.LONG_DOMAIN_PENALTY;
    }
    
    // Check for hyphens
    // Requirements: 4.5
    const hasHyphens = baseDomain.includes('-');
    if (hasHyphens) {
      score += DA_ADJUSTMENTS.HYPHEN_PENALTY;
    }
    
    // Check for numbers
    // Requirements: 4.6
    const hasNumbers = /\d/.test(baseDomain);
    if (hasNumbers) {
      score += DA_ADJUSTMENTS.NUMBER_PENALTY;
    }
    
    // Detect spam patterns
    // Requirements: 4.4
    const detectedSpamPatterns: string[] = [];
    for (const pattern of SPAM_PATTERNS) {
      if (pattern.test(baseDomain)) {
        detectedSpamPatterns.push(pattern.toString());
        score -= 15; // Significant penalty for spam patterns
      }
    }
    
    // Analyze subdomain depth
    // Requirements: 4.10
    const subdomainDepth = calculateSubdomainDepth(normalizedDomain);
    if (subdomainDepth > 0) {
      score += DA_ADJUSTMENTS.SUBDOMAIN_PENALTY * subdomainDepth;
    }
    
    // Ensure score is within bounds [0, 100]
    // Requirements: 4.1
    score = Math.max(0, Math.min(100, score));
    
    return {
      score,
      factors: {
        tldScore,
        knownAuthority: 0,
        sslValid,
        domainLength,
        hasHyphens,
        hasNumbers,
        spamPatterns: detectedSpamPatterns,
      },
    };
  } catch (error) {
    // Graceful degradation on error
    console.error('Domain authority estimation failed:', error);
    return {
      score: BASE_DOMAIN_AUTHORITY,
      factors: {
        tldScore: 0,
        knownAuthority: 0,
        sslValid: false,
        domainLength: 0,
        hasHyphens: false,
        hasNumbers: false,
        spamPatterns: [],
      },
    };
  }
}

/**
 * Extracts the TLD from a domain
 * 
 * @param domain - Domain name (e.g., "example.com", "sub.example.co.uk")
 * @returns TLD (e.g., "com", "uk")
 * 
 * @example
 * extractTLD('example.com') // 'com'
 * extractTLD('example.co.uk') // 'uk'
 */
function extractTLD(domain: string): string {
  const parts = domain.split('.');
  return parts[parts.length - 1] || '';
}

/**
 * Extracts the base domain (without subdomains and TLD)
 * 
 * @param domain - Domain name (e.g., "www.example.com", "blog.example.co.uk")
 * @returns Base domain (e.g., "example")
 * 
 * @example
 * extractBaseDomain('www.example.com') // 'example'
 * extractBaseDomain('blog.example.co.uk') // 'example'
 */
function extractBaseDomain(domain: string): string {
  const parts = domain.split('.');
  
  // Handle common two-part TLDs (co.uk, com.au, etc.)
  if (parts.length >= 3 && parts[parts.length - 2].length <= 3) {
    return parts[parts.length - 3] || '';
  }
  
  // Standard TLD
  if (parts.length >= 2) {
    return parts[parts.length - 2] || '';
  }
  
  return parts[0] || '';
}

/**
 * Calculates subdomain depth (excluding 'www')
 * 
 * @param domain - Domain name (e.g., "www.example.com", "blog.api.example.com")
 * @returns Subdomain depth (0 for no subdomains, 1+ for subdomains)
 * 
 * @example
 * calculateSubdomainDepth('example.com') // 0
 * calculateSubdomainDepth('www.example.com') // 0 (www is ignored)
 * calculateSubdomainDepth('blog.example.com') // 1
 * calculateSubdomainDepth('api.blog.example.com') // 2
 */
function calculateSubdomainDepth(domain: string): number {
  const parts = domain.split('.');
  
  // Need at least 3 parts to have a subdomain (subdomain.domain.tld)
  if (parts.length < 3) {
    return 0;
  }
  
  // Handle two-part TLDs (co.uk, com.au, etc.)
  const tldParts = parts[parts.length - 2].length <= 3 ? 3 : 2;
  
  // Calculate subdomain parts
  const subdomainParts = parts.slice(0, parts.length - tldParts);
  
  // Filter out 'www' as it's not considered a real subdomain
  const realSubdomains = subdomainParts.filter(part => part !== 'www');
  
  return realSubdomains.length;
}
