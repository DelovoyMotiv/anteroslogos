/**
 * Link Context Detector
 * Determines the semantic context of link placement within page structure
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7
 */

import type { LinkContext } from './types';

/**
 * Detects the semantic context of a link by traversing up the DOM tree
 * 
 * Algorithm:
 * 1. Start from the link element
 * 2. Traverse up the DOM tree (parentElement)
 * 3. Check each ancestor for semantic indicators:
 *    - Tag names: <header>, <footer>, <nav>, <main>, <article>, <aside>
 *    - Class names: header, footer, nav, menu, content, sidebar
 *    - ID attributes: header, footer, nav, menu, content, sidebar
 * 4. Return first matching context
 * 5. Fallback to 'other' if no context found
 * 
 * @param element - The link element to analyze
 * @returns The detected link context
 * 
 * @example
 * ```typescript
 * const link = document.querySelector('a');
 * const context = detectLinkContext(link);
 * console.log(context); // 'header' | 'footer' | 'navigation' | 'mainContent' | 'sidebar' | 'other'
 * ```
 */
export function detectLinkContext(element: Element): LinkContext {
  let current: Element | null = element;
  
  // Traverse up the DOM tree
  while (current) {
    const tagName = current.tagName?.toLowerCase();
    const className = current.className?.toLowerCase() || '';
    const id = current.id?.toLowerCase() || '';
    
    // Check for header context
    // Requirements: 6.2
    if (
      tagName === 'header' ||
      className.includes('header') ||
      id.includes('header')
    ) {
      return 'header';
    }
    
    // Check for footer context
    // Requirements: 6.3
    if (
      tagName === 'footer' ||
      className.includes('footer') ||
      id.includes('footer')
    ) {
      return 'footer';
    }
    
    // Check for navigation context
    // Requirements: 6.4
    if (
      tagName === 'nav' ||
      className.includes('nav') ||
      className.includes('menu') ||
      id.includes('nav') ||
      id.includes('menu')
    ) {
      return 'navigation';
    }
    
    // Check for main content context
    // Requirements: 6.5
    if (
      tagName === 'main' ||
      tagName === 'article' ||
      className.includes('content') ||
      className.includes('main') ||
      id.includes('content') ||
      id.includes('main')
    ) {
      return 'mainContent';
    }
    
    // Check for sidebar context
    // Requirements: 6.6
    if (
      tagName === 'aside' ||
      className.includes('sidebar') ||
      className.includes('side-bar') ||
      id.includes('sidebar') ||
      id.includes('side-bar')
    ) {
      return 'sidebar';
    }
    
    // Move to parent element
    current = current.parentElement;
  }
  
  // Fallback to 'other' if no context detected
  // Requirements: 6.7
  return 'other';
}

/**
 * Analyzes link context distribution and generates insights
 * 
 * @param contextDistribution - Distribution of links across contexts
 * @returns Array of issues and strengths based on distribution
 */
export function analyzeLinkContextDistribution(contextDistribution: {
  header: number;
  footer: number;
  navigation: number;
  mainContent: number;
  sidebar: number;
  other: number;
}): { issues: string[]; strengths: string[] } {
  const issues: string[] = [];
  const strengths: string[] = [];
  
  const totalLinks = Object.values(contextDistribution).reduce((sum, count) => sum + count, 0);
  
  if (totalLinks === 0) {
    return { issues, strengths };
  }
  
  const mainContentPercentage = (contextDistribution.mainContent / totalLinks) * 100;
  
  // Requirements: 6.8 - High quality link placement
  if (mainContentPercentage >= 60) {
    strengths.push('High quality link placement: Most links are in main content');
  }
  
  // Requirements: 6.9 - Poor link placement
  if (mainContentPercentage < 30) {
    issues.push('Most links in header/footer/sidebar - consider adding more contextual links in main content');
  }
  
  return { issues, strengths };
}
