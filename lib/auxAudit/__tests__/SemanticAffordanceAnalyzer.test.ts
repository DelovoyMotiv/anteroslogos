/**
 * Tests for SemanticAffordanceAnalyzer
 */

import { describe, it, expect } from 'vitest';
import { SemanticAffordanceAnalyzer } from '../SemanticAffordanceAnalyzer';

describe('SemanticAffordanceAnalyzer', () => {
  const analyzer = new SemanticAffordanceAnalyzer();

  describe('analyzeHTML', () => {
    it('should analyze simple HTML with interactive elements', async () => {
      const html = `
        <html>
          <body>
            <button aria-label="Submit">Click me</button>
            <a href="/home">Home</a>
            <input type="text" name="username" />
          </body>
        </html>
      `;

      const result = await analyzer.analyzeHTML(html);

      expect(result.totalElements).toBe(3);
      expect(result.interactiveElements).toHaveLength(3);
      expect(result.labeledElements).toBe(1); // Only button has aria-label
      expect(result.ariaScore).toBeCloseTo(33.33, 1);
    });

    it('should handle empty HTML', async () => {
      const html = '<html><body></body></html>';

      const result = await analyzer.analyzeHTML(html);

      expect(result.totalElements).toBe(0);
      expect(result.interactiveElements).toHaveLength(0);
      expect(result.labeledElements).toBe(0);
      expect(result.ariaScore).toBe(0);
    });

    it('should handle HTML with no interactive elements', async () => {
      const html = `
        <html>
          <body>
            <div>Just text</div>
            <p>More text</p>
          </body>
        </html>
      `;

      const result = await analyzer.analyzeHTML(html);

      expect(result.totalElements).toBe(0);
      expect(result.ariaScore).toBe(0);
    });

    it('should handle HTML with 100% ARIA coverage', async () => {
      const html = `
        <html>
          <body>
            <button aria-label="Submit">Submit</button>
            <a aria-label="Home" href="/">Home</a>
            <input aria-label="Username" type="text" />
          </body>
        </html>
      `;

      const result = await analyzer.analyzeHTML(html);

      expect(result.totalElements).toBe(3);
      expect(result.labeledElements).toBe(3);
      expect(result.ariaScore).toBe(100);
    });
  });

  describe('extractInteractiveElements', () => {
    it('should extract button elements', async () => {
      const html = '<button aria-label="Click">Click me</button>';
      const cheerio = await import('cheerio');
      const dom = cheerio.load(html);

      const elements = analyzer.extractInteractiveElements(dom);

      expect(elements).toHaveLength(1);
      expect(elements[0].tag).toBe('button');
      expect(elements[0].hasAriaLabel).toBe(true);
      expect(elements[0].ariaLabel).toBe('Click');
      expect(elements[0].text).toBe('Click me');
    });

    it('should extract link elements', async () => {
      const html = '<a href="/home">Home</a>';
      const cheerio = await import('cheerio');
      const dom = cheerio.load(html);

      const elements = analyzer.extractInteractiveElements(dom);

      expect(elements).toHaveLength(1);
      expect(elements[0].tag).toBe('a');
      expect(elements[0].hasAriaLabel).toBe(false);
      expect(elements[0].text).toBe('Home');
    });

    it('should extract input elements with type', async () => {
      const html = '<input type="email" name="email" aria-label="Email" />';
      const cheerio = await import('cheerio');
      const dom = cheerio.load(html);

      const elements = analyzer.extractInteractiveElements(dom);

      expect(elements).toHaveLength(1);
      expect(elements[0].tag).toBe('input');
      expect(elements[0].type).toBe('email');
      expect(elements[0].hasAriaLabel).toBe(true);
      expect(elements[0].ariaLabel).toBe('Email');
    });

    it('should extract select elements', async () => {
      const html = '<select role="listbox"><option>Option 1</option></select>';
      const cheerio = await import('cheerio');
      const dom = cheerio.load(html);

      const elements = analyzer.extractInteractiveElements(dom);

      expect(elements).toHaveLength(1);
      expect(elements[0].tag).toBe('select');
      expect(elements[0].role).toBe('listbox');
    });

    it('should identify elements with ARIA roles', async () => {
      const html = '<button role="menuitem">Menu</button>';
      const cheerio = await import('cheerio');
      const dom = cheerio.load(html);

      const elements = analyzer.extractInteractiveElements(dom);

      expect(elements).toHaveLength(1);
      expect(elements[0].role).toBe('menuitem');
    });
  });

  describe('calculateARIADensity', () => {
    it('should calculate 0% for empty array', () => {
      const density = analyzer.calculateARIADensity([]);
      expect(density).toBe(0);
    });

    it('should calculate 0% when no elements have ARIA', () => {
      const elements = [
        { tag: 'button', selector: 'button', hasAriaLabel: false, text: 'Click' },
        { tag: 'a', selector: 'a', hasAriaLabel: false, text: 'Link' }
      ];

      const density = analyzer.calculateARIADensity(elements);
      expect(density).toBe(0);
    });

    it('should calculate 100% when all elements have ARIA', () => {
      const elements = [
        { tag: 'button', selector: 'button', hasAriaLabel: true, ariaLabel: 'Submit', text: 'Submit' },
        { tag: 'a', selector: 'a', hasAriaLabel: true, ariaLabel: 'Home', text: 'Home' }
      ];

      const density = analyzer.calculateARIADensity(elements);
      expect(density).toBe(100);
    });

    it('should calculate 50% when half have ARIA', () => {
      const elements = [
        { tag: 'button', selector: 'button', hasAriaLabel: true, ariaLabel: 'Submit', text: 'Submit' },
        { tag: 'a', selector: 'a', hasAriaLabel: false, text: 'Link' }
      ];

      const density = analyzer.calculateARIADensity(elements);
      expect(density).toBe(50);
    });

    it('should count elements with roles as labeled', () => {
      const elements = [
        { tag: 'button', selector: 'button', hasAriaLabel: false, role: 'menuitem', text: 'Menu' },
        { tag: 'a', selector: 'a', hasAriaLabel: false, text: 'Link' }
      ];

      const density = analyzer.calculateARIADensity(elements);
      expect(density).toBe(50);
    });

    it('should handle fractional percentages', () => {
      const elements = [
        { tag: 'button', selector: 'button', hasAriaLabel: true, ariaLabel: 'Submit', text: 'Submit' },
        { tag: 'a', selector: 'a', hasAriaLabel: false, text: 'Link 1' },
        { tag: 'a', selector: 'a', hasAriaLabel: false, text: 'Link 2' }
      ];

      const density = analyzer.calculateARIADensity(elements);
      expect(density).toBeCloseTo(33.33, 2);
    });
  });
});
