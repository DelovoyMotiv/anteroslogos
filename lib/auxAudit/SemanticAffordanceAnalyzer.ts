/**
 * Semantic Affordance Analyzer
 * 
 * Analyzes HTML content to evaluate DOM structure and ARIA accessibility.
 * Extracts interactive elements and calculates ARIA density scores.
 */

import * as cheerio from 'cheerio';
import type { CheerioAPI } from 'cheerio';
import type { InteractiveElement, SemanticAnalysis } from './types';

/**
 * SemanticAffordanceAnalyzer class
 * 
 * Evaluates website accessibility for AI agents by analyzing:
 * - Interactive elements (buttons, links, inputs, selects)
 * - ARIA labels and roles
 * - Semantic structure
 */
export class SemanticAffordanceAnalyzer {
  /**
   * Analyzes HTML content for semantic affordance
   * 
   * @param html - Raw HTML string to analyze
   * @returns SemanticAnalysis with ARIA score and interactive elements
   */
  async analyzeHTML(html: string): Promise<SemanticAnalysis> {
    // Load HTML into Cheerio
    const dom = cheerio.load(html);
    
    // Extract all interactive elements
    const interactiveElements = this.extractInteractiveElements(dom);
    
    // Calculate ARIA density score
    const ariaScore = this.calculateARIADensity(interactiveElements);
    
    // Count labeled elements
    const labeledElements = interactiveElements.filter(
      el => el.hasAriaLabel || el.role
    ).length;
    
    return {
      ariaScore,
      interactiveElements,
      totalElements: interactiveElements.length,
      labeledElements
    };
  }

  /**
   * Extracts all interactive elements from the DOM
   * 
   * Interactive elements are: button, a, input, select
   * 
   * @param dom - Cheerio DOM instance
   * @returns Array of InteractiveElement objects
   */
  extractInteractiveElements(dom: CheerioAPI): InteractiveElement[] {
    const elements: InteractiveElement[] = [];
    
    // Define interactive element selectors
    const interactiveSelectors = ['button', 'a', 'input', 'select'];
    
    // Process each type of interactive element
    interactiveSelectors.forEach(tag => {
      dom(tag).each((index, element) => {
        const $el = dom(element);
        
        // Get ARIA label
        const ariaLabel = $el.attr('aria-label');
        const hasAriaLabel = !!ariaLabel;
        
        // Get ARIA role
        const role = $el.attr('role');
        
        // Get visible text content
        const text = $el.text().trim();
        
        // Get input type (for input elements)
        const type = tag === 'input' ? $el.attr('type') : undefined;
        
        // Generate a CSS selector for this element
        const selector = this.generateSelector($el, dom, tag, index);
        
        // Create InteractiveElement object
        const interactiveElement: InteractiveElement = {
          tag,
          selector,
          hasAriaLabel,
          ariaLabel,
          role,
          text: text || undefined,
          type
        };
        
        elements.push(interactiveElement);
      });
    });
    
    return elements;
  }

  /**
   * Calculates ARIA density score
   * 
   * Formula: (Elements with aria-label or distinct role) / (Total Interactive Elements) * 100
   * 
   * @param elements - Array of interactive elements
   * @returns ARIA density score (0-100)
   */
  calculateARIADensity(elements: InteractiveElement[]): number {
    // Handle empty array case
    if (elements.length === 0) {
      return 0;
    }
    
    // Count elements with ARIA labels or roles
    const labeledCount = elements.filter(
      el => el.hasAriaLabel || el.role
    ).length;
    
    // Calculate percentage
    const density = (labeledCount / elements.length) * 100;
    
    // Round to 2 decimal places
    return Math.round(density * 100) / 100;
  }

  /**
   * Generates a CSS selector for an element
   * 
   * Attempts to create a unique, readable selector
   * 
   * @param $el - Cheerio element
   * @param dom - Cheerio DOM instance
   * @param tag - Element tag name
   * @param index - Element index within its tag type
   * @returns CSS selector string
   */
  private generateSelector(
    $el: cheerio.Cheerio<any>,
    dom: CheerioAPI,
    tag: string,
    index: number
  ): string {
    // Try to use ID if available
    const id = $el.attr('id');
    if (id) {
      return `#${id}`;
    }
    
    // Try to use class if available
    const className = $el.attr('class');
    if (className) {
      const firstClass = className.split(' ')[0];
      return `${tag}.${firstClass}`;
    }
    
    // Try to use name attribute (for inputs)
    const name = $el.attr('name');
    if (name) {
      return `${tag}[name="${name}"]`;
    }
    
    // Fall back to nth-of-type selector
    return `${tag}:nth-of-type(${index + 1})`;
  }
}
