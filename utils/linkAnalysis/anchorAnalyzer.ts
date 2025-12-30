/**
 * Anchor Text Analyzer
 * Classifies anchor text patterns for SEO and accessibility analysis
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7
 */

import { AnchorType } from './types';
import { GENERIC_ANCHOR_PHRASES } from './constants';

/**
 * Classifies anchor text into one of the defined types
 * 
 * Classification logic:
 * 1. empty: No text content
 * 2. image: Contains image but no/minimal text
 * 3. naked: Text is a URL
 * 4. generic: Contains generic phrases like "click here"
 * 5. branded: Contains brand name
 * 6. exact: Matches page title closely (70%+)
 * 7. partial: Contains significant words from page title
 * 
 * @param text - The anchor text content
 * @param href - The link URL
 * @param brandName - The brand name to check for branded anchors
 * @param pageTitle - The page title for exact/partial matching
 * @param hasImage - Whether the anchor contains an image
 * @returns The classified anchor type
 * 
 * @example
 * classifyAnchorText('', 'https://example.com', 'Example', 'Example Page', false)
 * // Returns: 'empty'
 * 
 * classifyAnchorText('click here', 'https://example.com', 'Example', 'Example Page', false)
 * // Returns: 'generic'
 * 
 * classifyAnchorText('https://example.com', 'https://example.com', 'Example', 'Example Page', false)
 * // Returns: 'naked'
 */
export function classifyAnchorText(
  text: string,
  href: string,
  brandName: string,
  pageTitle: string,
  hasImage: boolean
): AnchorType {
  // Normalize text for analysis
  const normalizedText = text.trim().toLowerCase();
  const normalizedTitle = pageTitle.trim().toLowerCase();
  const normalizedBrand = brandName.trim().toLowerCase();
  
  // 1. Empty anchor detection (Requirement 5.2)
  if (normalizedText === '') {
    return 'empty';
  }
  
  // 2. Image anchor detection
  // If has image and text is very short (likely alt text or minimal label)
  if (hasImage && normalizedText.length <= 3) {
    return 'image';
  }
  
  // 3. Naked URL detection (Requirement 5.4)
  // Check if text looks like a URL
  if (isNakedUrl(normalizedText, href)) {
    return 'naked';
  }
  
  // 4. Generic phrase detection (Requirement 5.3)
  if (isGenericAnchor(normalizedText)) {
    return 'generic';
  }
  
  // 5. Branded anchor detection (Requirement 5.5)
  if (normalizedBrand && normalizedText.includes(normalizedBrand)) {
    return 'branded';
  }
  
  // 6. Exact match detection (Requirement 5.6)
  // Calculate similarity between anchor text and page title
  const similarity = calculateTextSimilarity(normalizedText, normalizedTitle);
  if (similarity >= 0.7) {
    return 'exact';
  }
  
  // 7. Partial match detection (Requirement 5.7)
  // Check if anchor contains 2+ significant words from title
  if (hasPartialMatch(normalizedText, normalizedTitle)) {
    return 'partial';
  }
  
  // Default: treat as partial if we can't classify otherwise
  return 'partial';
}

/**
 * Checks if anchor text is a naked URL
 * 
 * @param text - Normalized anchor text
 * @param href - The link URL
 * @returns True if text appears to be a URL
 */
function isNakedUrl(text: string, href: string): boolean {
  // Check if text starts with common URL patterns
  const urlPatterns = [
    /^https?:\/\//,
    /^www\./,
    /^[a-z0-9-]+\.[a-z]{2,}/,  // domain.tld pattern
  ];
  
  if (urlPatterns.some(pattern => pattern.test(text))) {
    return true;
  }
  
  // Check if text matches the href domain
  try {
    const hrefUrl = new URL(href);
    const hrefDomain = hrefUrl.hostname.replace(/^www\./, '');
    
    // Remove protocol and www from text for comparison
    const cleanText = text.replace(/^https?:\/\//, '').replace(/^www\./, '');
    
    // If text contains the domain, it's likely a naked URL
    if (cleanText.includes(hrefDomain) || hrefDomain.includes(cleanText)) {
      return true;
    }
  } catch {
    // Invalid URL, continue with other checks
  }
  
  return false;
}

/**
 * Checks if anchor text contains generic phrases
 * 
 * @param text - Normalized anchor text
 * @returns True if text is generic
 */
function isGenericAnchor(text: string): boolean {
  // Check against known generic phrases
  return GENERIC_ANCHOR_PHRASES.some(phrase => {
    // Exact match or text is just the phrase
    if (text === phrase) {
      return true;
    }
    
    // Check if text is very short and contains the phrase
    // e.g., "click here!" or "read more..."
    if (text.length <= phrase.length + 5 && text.includes(phrase)) {
      return true;
    }
    
    return false;
  });
}

/**
 * Calculates text similarity using word overlap
 * 
 * @param text1 - First text (anchor text)
 * @param text2 - Second text (page title)
 * @returns Similarity score between 0 and 1
 */
function calculateTextSimilarity(text1: string, text2: string): number {
  // Tokenize into words (remove punctuation)
  const words1 = tokenizeText(text1);
  const words2 = tokenizeText(text2);
  
  if (words1.length === 0 || words2.length === 0) {
    return 0;
  }
  
  // Count matching words
  const matches = words1.filter(word => words2.includes(word)).length;
  
  // Calculate Jaccard similarity: intersection / union
  const union = new Set([...words1, ...words2]).size;
  
  return matches / union;
}

/**
 * Checks if anchor text has partial match with page title
 * Must contain 2+ significant words from title
 * 
 * @param text - Normalized anchor text
 * @param title - Normalized page title
 * @returns True if partial match found
 */
function hasPartialMatch(text: string, title: string): boolean {
  const textWords = tokenizeText(text);
  const titleWords = tokenizeText(title);
  
  // Filter out stop words for more meaningful matching
  const significantTitleWords = titleWords.filter(word => !isStopWord(word));
  
  if (significantTitleWords.length === 0) {
    return false;
  }
  
  // Count how many significant title words appear in anchor text
  const matchCount = significantTitleWords.filter(word => 
    textWords.includes(word)
  ).length;
  
  // Require at least 2 matching significant words
  return matchCount >= 2;
}

/**
 * Tokenizes text into words, removing punctuation and filtering short words
 * 
 * @param text - Text to tokenize
 * @returns Array of normalized words
 */
function tokenizeText(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')  // Remove punctuation
    .split(/\s+/)               // Split on whitespace
    .filter(word => word.length >= 3);  // Filter out very short words
}

/**
 * Checks if a word is a common stop word
 * 
 * @param word - Word to check
 * @returns True if word is a stop word
 */
function isStopWord(word: string): boolean {
  const stopWords = [
    'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'her',
    'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how',
    'its', 'may', 'new', 'now', 'old', 'see', 'two', 'who', 'boy', 'did',
    'she', 'use', 'way', 'with', 'from', 'have', 'this', 'that', 'will',
    'your', 'what', 'when', 'make', 'like', 'time', 'just', 'know', 'take',
    'into', 'year', 'some', 'them', 'than', 'then', 'these', 'about', 'would',
  ];
  
  return stopWords.includes(word.toLowerCase());
}

/**
 * Analyzes anchor text distribution across a set of links
 * 
 * @param anchors - Array of classified anchor types
 * @returns Distribution statistics
 */
export function analyzeAnchorDistribution(anchors: AnchorType[]): {
  exactMatch: number;
  partialMatch: number;
  branded: number;
  generic: number;
  nakedUrl: number;
  image: number;
  empty: number;
  total: number;
} {
  const distribution = {
    exactMatch: 0,
    partialMatch: 0,
    branded: 0,
    generic: 0,
    nakedUrl: 0,
    image: 0,
    empty: 0,
    total: anchors.length,
  };
  
  for (const anchor of anchors) {
    switch (anchor) {
      case 'exact':
        distribution.exactMatch++;
        break;
      case 'partial':
        distribution.partialMatch++;
        break;
      case 'branded':
        distribution.branded++;
        break;
      case 'generic':
        distribution.generic++;
        break;
      case 'naked':
        distribution.nakedUrl++;
        break;
      case 'image':
        distribution.image++;
        break;
      case 'empty':
        distribution.empty++;
        break;
    }
  }
  
  return distribution;
}

/**
 * Generates recommendations based on anchor text analysis
 * 
 * @param distribution - Anchor text distribution statistics
 * @returns Array of issues and strengths
 */
export function generateAnchorRecommendations(distribution: {
  exactMatch: number;
  partialMatch: number;
  branded: number;
  generic: number;
  nakedUrl: number;
  image: number;
  empty: number;
  total: number;
}): { issues: string[]; strengths: string[] } {
  const issues: string[] = [];
  const strengths: string[] = [];
  
  if (distribution.total === 0) {
    return { issues, strengths };
  }
  
  // Calculate percentages
  const exactPercent = distribution.exactMatch / distribution.total;
  const genericPercent = distribution.generic / distribution.total;
  const emptyPercent = distribution.empty / distribution.total;
  const descriptivePercent = (distribution.partialMatch + distribution.branded) / distribution.total;
  
  // Check for over-optimization (Requirement 5.8)
  if (exactPercent > 0.3) {
    issues.push(`${(exactPercent * 100).toFixed(0)}% exact match anchors may indicate over-optimization`);
  }
  
  // Check for generic anchors (Requirement 5.9)
  if (genericPercent > 0.4) {
    issues.push(`${(genericPercent * 100).toFixed(0)}% generic anchors - improve descriptiveness`);
  }
  
  // Check for empty anchors (accessibility issue)
  if (emptyPercent > 0.1) {
    issues.push(`${(emptyPercent * 100).toFixed(0)}% empty anchors - accessibility concern`);
  }
  
  // Positive signals
  if (descriptivePercent >= 0.6) {
    strengths.push('Good use of descriptive anchor text');
  }
  
  if (genericPercent < 0.2) {
    strengths.push('Low percentage of generic anchors');
  }
  
  if (emptyPercent === 0) {
    strengths.push('No empty anchors - good accessibility');
  }
  
  return { issues, strengths };
}
