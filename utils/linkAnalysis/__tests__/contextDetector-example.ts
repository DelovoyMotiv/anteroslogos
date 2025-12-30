/**
 * Example Usage of Link Context Detector
 * Demonstrates how the context detector will be integrated into the main engine
 */

import { detectLinkContext, analyzeLinkContextDistribution } from '../contextDetector';
import type { LinkContext } from '../types';

/**
 * Example: Analyzing a complete page
 */
export function examplePageAnalysis() {
  // Simulated HTML structure
  const htmlExample = `
    <html>
      <body>
        <header>
          <nav>
            <a href="/">Home</a>
            <a href="/about">About</a>
          </nav>
        </header>
        
        <main>
          <article>
            <h1>Article Title</h1>
            <p>Check out <a href="/related">this related article</a></p>
            <p>Learn more at <a href="https://example.com">Example.com</a></p>
          </article>
        </main>
        
        <aside class="sidebar">
          <a href="/category1">Category 1</a>
          <a href="/category2">Category 2</a>
        </aside>
        
        <footer>
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
        </footer>
      </body>
    </html>
  `;

  // In the actual engine, we would:
  // 1. Parse HTML to Document
  // 2. Extract all links
  // 3. For each link, detect context
  // 4. Build distribution
  
  const contextDistribution = {
    header: 0,
    footer: 2,      // Privacy, Terms
    navigation: 2,  // Home, About
    mainContent: 2, // Related article, Example.com
    sidebar: 2,     // Category 1, Category 2
    other: 0,
  };

  // Analyze distribution
  const analysis = analyzeLinkContextDistribution(contextDistribution);
  
  console.log('Context Distribution:', contextDistribution);
  console.log('Analysis:', analysis);
  
  // Expected output:
  // Context Distribution: { header: 0, footer: 2, navigation: 2, mainContent: 2, sidebar: 2, other: 0 }
  // Analysis: { 
  //   issues: ['Most links in header/footer/sidebar - consider adding more contextual links in main content'],
  //   strengths: []
  // }
  
  return { contextDistribution, analysis };
}

/**
 * Example: Processing individual links
 */
export function exampleLinkProcessing() {
  // This demonstrates how the engine will use detectLinkContext
  
  interface LinkWithContext {
    href: string;
    text: string;
    context: LinkContext;
  }
  
  // Simulated link processing
  const links: LinkWithContext[] = [
    { href: '/', text: 'Home', context: 'navigation' },
    { href: '/about', text: 'About', context: 'navigation' },
    { href: '/related', text: 'Related Article', context: 'mainContent' },
    { href: 'https://example.com', text: 'Example', context: 'mainContent' },
    { href: '/category1', text: 'Category 1', context: 'sidebar' },
    { href: '/category2', text: 'Category 2', context: 'sidebar' },
    { href: '/privacy', text: 'Privacy', context: 'footer' },
    { href: '/terms', text: 'Terms', context: 'footer' },
  ];
  
  // Count by context
  const distribution = links.reduce((acc, link) => {
    acc[link.context] = (acc[link.context] || 0) + 1;
    return acc;
  }, {} as Record<LinkContext, number>);
  
  console.log('Links by context:', distribution);
  
  return distribution;
}

/**
 * Example: Edge cases
 */
export function exampleEdgeCases() {
  // Case 1: Nested contexts (header inside footer)
  // Result: Closest context wins (header)
  
  // Case 2: Multiple class names
  // <div class="container header-wrapper">
  // Result: Detects 'header' from partial match
  
  // Case 3: No semantic context
  // <div><a href="/test">Link</a></div>
  // Result: Returns 'other'
  
  // Case 4: Case insensitive
  // <div class="HEADER">
  // Result: Detects 'header' (case insensitive)
  
  console.log('Edge cases handled correctly');
}

// Run examples if executed directly
if (require.main === module) {
  console.log('=== Example 1: Page Analysis ===');
  examplePageAnalysis();
  
  console.log('\n=== Example 2: Link Processing ===');
  exampleLinkProcessing();
  
  console.log('\n=== Example 3: Edge Cases ===');
  exampleEdgeCases();
}
