/**
 * Unit Tests for Link Context Detector
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7
 */

import { describe, it, expect } from 'vitest';
import { detectLinkContext, analyzeLinkContextDistribution } from '../contextDetector';
import { JSDOM } from 'jsdom';

describe('detectLinkContext', () => {
  // Helper to create a DOM element from HTML
  function createElementFromHTML(html: string): Element {
    const dom = new JSDOM(html);
    const link = dom.window.document.querySelector('a');
    if (!link) {
      throw new Error('No link found in HTML');
    }
    return link;
  }

  it('should detect header context from <header> tag', () => {
    // Requirements: 6.2
    const html = '<header><a href="/test">Link</a></header>';
    const link = createElementFromHTML(html);
    expect(detectLinkContext(link)).toBe('header');
  });

  it('should detect header context from class name', () => {
    // Requirements: 6.2
    const html = '<div class="header"><a href="/test">Link</a></div>';
    const link = createElementFromHTML(html);
    expect(detectLinkContext(link)).toBe('header');
  });

  it('should detect header context from id', () => {
    // Requirements: 6.2
    const html = '<div id="header"><a href="/test">Link</a></div>';
    const link = createElementFromHTML(html);
    expect(detectLinkContext(link)).toBe('header');
  });

  it('should detect footer context from <footer> tag', () => {
    // Requirements: 6.3
    const html = '<footer><a href="/test">Link</a></footer>';
    const link = createElementFromHTML(html);
    expect(detectLinkContext(link)).toBe('footer');
  });

  it('should detect footer context from class name', () => {
    // Requirements: 6.3
    const html = '<div class="footer"><a href="/test">Link</a></div>';
    const link = createElementFromHTML(html);
    expect(detectLinkContext(link)).toBe('footer');
  });

  it('should detect navigation context from <nav> tag', () => {
    // Requirements: 6.4
    const html = '<nav><a href="/test">Link</a></nav>';
    const link = createElementFromHTML(html);
    expect(detectLinkContext(link)).toBe('navigation');
  });

  it('should detect navigation context from class "nav"', () => {
    // Requirements: 6.4
    const html = '<div class="nav"><a href="/test">Link</a></div>';
    const link = createElementFromHTML(html);
    expect(detectLinkContext(link)).toBe('navigation');
  });

  it('should detect navigation context from class "menu"', () => {
    // Requirements: 6.4
    const html = '<div class="menu"><a href="/test">Link</a></div>';
    const link = createElementFromHTML(html);
    expect(detectLinkContext(link)).toBe('navigation');
  });

  it('should detect main content context from <main> tag', () => {
    // Requirements: 6.5
    const html = '<main><a href="/test">Link</a></main>';
    const link = createElementFromHTML(html);
    expect(detectLinkContext(link)).toBe('mainContent');
  });

  it('should detect main content context from <article> tag', () => {
    // Requirements: 6.5
    const html = '<article><a href="/test">Link</a></article>';
    const link = createElementFromHTML(html);
    expect(detectLinkContext(link)).toBe('mainContent');
  });

  it('should detect main content context from class "content"', () => {
    // Requirements: 6.5
    const html = '<div class="content"><a href="/test">Link</a></div>';
    const link = createElementFromHTML(html);
    expect(detectLinkContext(link)).toBe('mainContent');
  });

  it('should detect sidebar context from <aside> tag', () => {
    // Requirements: 6.6
    const html = '<aside><a href="/test">Link</a></aside>';
    const link = createElementFromHTML(html);
    expect(detectLinkContext(link)).toBe('sidebar');
  });

  it('should detect sidebar context from class "sidebar"', () => {
    // Requirements: 6.6
    const html = '<div class="sidebar"><a href="/test">Link</a></div>';
    const link = createElementFromHTML(html);
    expect(detectLinkContext(link)).toBe('sidebar');
  });

  it('should return "other" when no context is detected', () => {
    // Requirements: 6.7
    const html = '<div><a href="/test">Link</a></div>';
    const link = createElementFromHTML(html);
    expect(detectLinkContext(link)).toBe('other');
  });

  it('should detect context from nested elements', () => {
    // Requirements: 6.1 - DOM traversal
    const html = '<header><div><span><a href="/test">Link</a></span></div></header>';
    const link = createElementFromHTML(html);
    expect(detectLinkContext(link)).toBe('header');
  });

  it('should prioritize closest context (header over footer)', () => {
    // Requirements: 6.1 - DOM traversal
    const html = '<footer><header><a href="/test">Link</a></header></footer>';
    const link = createElementFromHTML(html);
    expect(detectLinkContext(link)).toBe('header');
  });

  it('should handle case-insensitive class names', () => {
    const html = '<div class="HEADER"><a href="/test">Link</a></div>';
    const link = createElementFromHTML(html);
    expect(detectLinkContext(link)).toBe('header');
  });

  it('should handle multiple class names', () => {
    const html = '<div class="container header-wrapper"><a href="/test">Link</a></div>';
    const link = createElementFromHTML(html);
    expect(detectLinkContext(link)).toBe('header');
  });
});

describe('analyzeLinkContextDistribution', () => {
  it('should identify high quality link placement when mainContent >= 60%', () => {
    // Requirements: 6.8
    const distribution = {
      header: 5,
      footer: 5,
      navigation: 10,
      mainContent: 60,
      sidebar: 10,
      other: 10,
    };
    
    const result = analyzeLinkContextDistribution(distribution);
    expect(result.strengths).toContain('High quality link placement: Most links are in main content');
    expect(result.issues).toHaveLength(0);
  });

  it('should identify poor link placement when mainContent < 30%', () => {
    // Requirements: 6.9
    const distribution = {
      header: 30,
      footer: 30,
      navigation: 20,
      mainContent: 10,
      sidebar: 10,
      other: 0,
    };
    
    const result = analyzeLinkContextDistribution(distribution);
    expect(result.issues).toContain('Most links in header/footer/sidebar - consider adding more contextual links in main content');
    expect(result.strengths).toHaveLength(0);
  });

  it('should handle zero total links', () => {
    const distribution = {
      header: 0,
      footer: 0,
      navigation: 0,
      mainContent: 0,
      sidebar: 0,
      other: 0,
    };
    
    const result = analyzeLinkContextDistribution(distribution);
    expect(result.issues).toHaveLength(0);
    expect(result.strengths).toHaveLength(0);
  });

  it('should handle balanced distribution (30-60% mainContent)', () => {
    const distribution = {
      header: 10,
      footer: 10,
      navigation: 10,
      mainContent: 40,
      sidebar: 20,
      other: 10,
    };
    
    const result = analyzeLinkContextDistribution(distribution);
    expect(result.issues).toHaveLength(0);
    expect(result.strengths).toHaveLength(0);
  });
});
