/**
 * Link Extractor Module
 * Extracts and classifies all links from HTML documents
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7
 */

import type { ExtractedLink, LinkContext } from './types';
import { SPECIAL_PROTOCOLS } from './constants';

/**
 * Extracts all links from a parsed HTML document
 * 
 * @param doc - Parsed HTML document
 * @param baseUrl - Base URL for resolving relative links
 * @returns Array of extracted links with metadata
 * 
 * @example
 * ```typescript
 * const doc = new DOMParser().parseFromString(html, 'text/html');
 * const links = extractLinks(doc, 'https://example.com');
 * ```
 */
export function extractLinks(
  doc: Document,
  baseUrl: string
): ExtractedLink[] {
  const links: ExtractedLink[] = [];
  
  // Extract all <a> elements (Requirement 2.1)
  const anchorElements = doc.querySelectorAll('a[href]');
  
  anchorElements.forEach((element) => {
    const anchor = element as HTMLAnchorElement;
    const href = anchor.getAttribute('href');
    
    if (!href) return;
    
    // Skip special protocols that aren't navigational links
    if (isSpecialProtocol(href)) {
      return;
    }
    
    try {
      // Normalize relative URLs to absolute (Requirement 2.3)
      const absoluteUrl = normalizeUrl(href, baseUrl);
      
      // Extract link metadata (Requirements 2.4, 2.5)
      const extractedLink: ExtractedLink = {
        href: absoluteUrl,
        text: extractAnchorText(anchor),
        rel: anchor.getAttribute('rel') || '',
        isNofollow: isNofollowLink(anchor),
        hasImage: hasImageChild(anchor),
        context: 'other', // Will be set by context detector
        element: anchor,
      };
      
      links.push(extractedLink);
    } catch (error) {
      // Skip malformed URLs
      console.warn(`Failed to process link: ${href}`, error);
    }
  });
  
  // Extract JavaScript-based links (Requirements 2.6, 2.7)
  const jsLinks = extractJavaScriptLinks(doc, baseUrl);
  links.push(...jsLinks);
  
  return links;
}

/**
 * Checks if a URL uses a special protocol (mailto, tel, javascript, etc.)
 * 
 * @param href - URL to check
 * @returns True if URL uses special protocol
 */
function isSpecialProtocol(href: string): boolean {
  const lowerHref = href.toLowerCase().trim();
  
  // Check for special protocols
  if (lowerHref.startsWith(SPECIAL_PROTOCOLS.MAILTO)) return true;
  if (lowerHref.startsWith(SPECIAL_PROTOCOLS.TEL)) return true;
  if (lowerHref.startsWith(SPECIAL_PROTOCOLS.JAVASCRIPT)) return true;
  if (lowerHref.startsWith(SPECIAL_PROTOCOLS.DATA)) return true;
  
  // Pure anchor links (just #) are not navigational
  if (lowerHref === '#' || lowerHref === '') return true;
  
  return false;
}

/**
 * Normalizes a URL to absolute form
 * Handles relative URLs, protocol-relative URLs, and absolute URLs
 * 
 * @param href - URL to normalize
 * @param baseUrl - Base URL for resolution
 * @returns Absolute URL
 */
function normalizeUrl(href: string, baseUrl: string): string {
  const trimmedHref = href.trim();
  
  // Already absolute URL
  if (trimmedHref.startsWith('http://') || trimmedHref.startsWith('https://')) {
    return trimmedHref;
  }
  
  // Protocol-relative URL (//example.com)
  if (trimmedHref.startsWith('//')) {
    const baseProtocol = new URL(baseUrl).protocol;
    return `${baseProtocol}${trimmedHref}`;
  }
  
  // Use URL constructor for relative URL resolution
  try {
    const url = new URL(trimmedHref, baseUrl);
    return url.href;
  } catch (error) {
    // Fallback: manual resolution
    return resolveRelativeUrl(trimmedHref, baseUrl);
  }
}

/**
 * Manually resolves relative URLs (fallback method)
 * 
 * @param href - Relative URL
 * @param baseUrl - Base URL
 * @returns Absolute URL
 */
function resolveRelativeUrl(href: string, baseUrl: string): string {
  const base = new URL(baseUrl);
  
  // Absolute path (/path)
  if (href.startsWith('/')) {
    return `${base.protocol}//${base.host}${href}`;
  }
  
  // Relative path (path or ./path)
  const basePath = base.pathname.endsWith('/') 
    ? base.pathname 
    : base.pathname.substring(0, base.pathname.lastIndexOf('/') + 1);
  
  return `${base.protocol}//${base.host}${basePath}${href}`;
}

/**
 * Extracts anchor text from an element
 * Handles text content and image alt text
 * 
 * @param anchor - Anchor element
 * @returns Extracted text content
 */
function extractAnchorText(anchor: HTMLAnchorElement): string {
  // Get text content, trimmed
  let text = anchor.textContent?.trim() || '';
  
  // If no text but has image, use image alt text
  if (!text) {
    const img = anchor.querySelector('img');
    if (img) {
      text = img.getAttribute('alt') || '';
    }
  }
  
  return text;
}

/**
 * Checks if a link has rel="nofollow"
 * 
 * @param anchor - Anchor element
 * @returns True if link is nofollow
 */
function isNofollowLink(anchor: HTMLAnchorElement): boolean {
  const rel = anchor.getAttribute('rel') || '';
  return rel.toLowerCase().includes('nofollow');
}

/**
 * Checks if a link contains an image element
 * 
 * @param anchor - Anchor element
 * @returns True if link contains an image
 */
function hasImageChild(anchor: HTMLAnchorElement): boolean {
  return anchor.querySelector('img') !== null;
}

/**
 * Extracts JavaScript-based links from the document
 * Handles data-href attributes and onclick handlers
 * 
 * Requirements: 2.6, 2.7
 * 
 * @param doc - Parsed HTML document
 * @param baseUrl - Base URL for resolving relative links
 * @returns Array of extracted JavaScript links
 */
function extractJavaScriptLinks(
  doc: Document,
  baseUrl: string
): ExtractedLink[] {
  const jsLinks: ExtractedLink[] = [];
  
  // Extract data-href attributes (Requirement 2.6)
  const dataHrefElements = doc.querySelectorAll('[data-href]');
  dataHrefElements.forEach((element) => {
    const href = element.getAttribute('data-href');
    if (!href || isSpecialProtocol(href)) return;
    
    try {
      const absoluteUrl = normalizeUrl(href, baseUrl);
      
      // Create virtual anchor element
      const virtualAnchor = createVirtualAnchor(element, absoluteUrl);
      jsLinks.push(virtualAnchor);
    } catch (error) {
      console.warn(`Failed to process data-href: ${href}`, error);
    }
  });
  
  // Extract onclick with location.href (Requirement 2.7)
  const onclickElements = doc.querySelectorAll('[onclick]');
  onclickElements.forEach((element) => {
    const onclick = element.getAttribute('onclick');
    if (!onclick) return;
    
    // Extract URL from location.href patterns
    const url = extractUrlFromOnclick(onclick);
    if (!url || isSpecialProtocol(url)) return;
    
    try {
      const absoluteUrl = normalizeUrl(url, baseUrl);
      
      // Create virtual anchor element
      const virtualAnchor = createVirtualAnchor(element, absoluteUrl);
      jsLinks.push(virtualAnchor);
    } catch (error) {
      console.warn(`Failed to process onclick: ${onclick}`, error);
    }
  });
  
  return jsLinks;
}

/**
 * Creates a virtual anchor element from a non-anchor element
 * 
 * @param element - Source element
 * @param href - Extracted URL
 * @returns Virtual ExtractedLink
 */
function createVirtualAnchor(
  element: Element,
  href: string
): ExtractedLink {
  return {
    href,
    text: element.textContent?.trim() || '',
    rel: element.getAttribute('rel') || '',
    isNofollow: (element.getAttribute('rel') || '').toLowerCase().includes('nofollow'),
    hasImage: element.querySelector('img') !== null,
    context: 'other',
    element: element as unknown as HTMLAnchorElement, // Virtual anchor
  };
}

/**
 * Extracts URL from onclick handler
 * Supports patterns like:
 * - location.href='url'
 * - window.location='url'
 * - window.location.href='url'
 * 
 * @param onclick - onclick attribute value
 * @returns Extracted URL or null
 */
function extractUrlFromOnclick(onclick: string): string | null {
  // Pattern: location.href = 'url' or window.location.href = 'url'
  const patterns = [
    /location\.href\s*=\s*['"]([^'"]+)['"]/i,
    /window\.location\s*=\s*['"]([^'"]+)['"]/i,
    /window\.location\.href\s*=\s*['"]([^'"]+)['"]/i,
  ];
  
  for (const pattern of patterns) {
    const match = onclick.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return null;
}

/**
 * Classifies a link as internal or external
 * 
 * @param linkUrl - Link URL to classify
 * @param baseUrl - Base URL of the page
 * @returns True if link is internal
 */
export function isInternalLink(linkUrl: string, baseUrl: string): boolean {
  try {
    const link = new URL(linkUrl);
    const base = new URL(baseUrl);
    
    // Compare hostnames (including subdomains)
    return link.hostname === base.hostname;
  } catch (error) {
    // If URL parsing fails, assume external
    return false;
  }
}

/**
 * Classifies link type based on URL
 * 
 * @param href - Link URL
 * @param baseUrl - Base URL of the page
 * @returns Link type classification
 */
export function classifyLinkType(
  href: string,
  baseUrl: string
): 'internal' | 'external' | 'anchor' | 'mailto' | 'tel' {
  const lowerHref = href.toLowerCase().trim();
  
  // Check special protocols
  if (lowerHref.startsWith(SPECIAL_PROTOCOLS.MAILTO)) return 'mailto';
  if (lowerHref.startsWith(SPECIAL_PROTOCOLS.TEL)) return 'tel';
  
  // Check anchor links (same page)
  if (lowerHref.startsWith('#')) return 'anchor';
  
  // Check if URL contains anchor but also has path
  try {
    const linkUrl = new URL(href, baseUrl);
    const baseUrlObj = new URL(baseUrl);
    
    // If same page with anchor
    if (linkUrl.pathname === baseUrlObj.pathname && 
        linkUrl.hostname === baseUrlObj.hostname &&
        linkUrl.hash) {
      return 'anchor';
    }
  } catch (error) {
    // Continue to internal/external check
  }
  
  // Check internal vs external
  return isInternalLink(href, baseUrl) ? 'internal' : 'external';
}
