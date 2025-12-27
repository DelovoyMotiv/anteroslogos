/**
 * Friction Analyzer
 * 
 * Identifies barriers that prevent or hinder AI agent interaction with websites.
 * Detects CAPTCHAs, interstitials, canvas-based UIs, and other friction points.
 */

import type { CheerioAPI } from 'cheerio';
import type { FrictionPoint } from './types';

/**
 * FrictionAnalyzer class
 * 
 * Detects barriers to agent interaction including:
 * - CAPTCHAs (Turnstile, reCAPTCHA)
 * - Intrusive interstitials (modals, overlays)
 * - Canvas-based UIs
 * - Authentication walls
 */
export class FrictionAnalyzer {
  /**
   * Detects all friction points in the HTML content
   * 
   * @param html - Raw HTML string to analyze
   * @param dom - Cheerio DOM instance
   * @returns Array of detected friction points
   */
  async detectFriction(html: string, dom: CheerioAPI): Promise<FrictionPoint[]> {
    const frictionPoints: FrictionPoint[] = [];
    
    // Detect CAPTCHAs
    if (this.detectCAPTCHA(html)) {
      frictionPoints.push({
        type: 'captcha',
        description: 'CAPTCHA detected - blocks automated agent interaction',
        severity: 'high',
        location: 'Page contains CAPTCHA implementation (Turnstile or reCAPTCHA)'
      });
    }
    
    // Detect interstitials
    if (this.detectInterstitials(dom)) {
      frictionPoints.push({
        type: 'interstitial',
        description: 'Intrusive interstitial detected - may block agent navigation',
        severity: 'medium',
        location: 'Modal or overlay element found'
      });
    }
    
    // Detect canvas-based UI
    if (this.detectCanvasUI(dom)) {
      frictionPoints.push({
        type: 'canvas',
        description: 'Canvas-based UI detected - not accessible to agents',
        severity: 'high',
        location: 'Page contains significant canvas elements'
      });
    }
    
    return frictionPoints;
  }

  /**
   * Detects CAPTCHA implementations
   * 
   * Searches for keywords: "turnstile" or "recaptcha"
   * 
   * @param html - Raw HTML string
   * @returns true if CAPTCHA is detected
   */
  detectCAPTCHA(html: string): boolean {
    const lowerHtml = html.toLowerCase();
    return lowerHtml.includes('turnstile') || lowerHtml.includes('recaptcha');
  }

  /**
   * Detects intrusive interstitials
   * 
   * Looks for modal dialogs, overlays, and popups that may block content
   * 
   * @param dom - Cheerio DOM instance
   * @returns true if interstitials are detected
   */
  detectInterstitials(dom: CheerioAPI): boolean {
    // Common selectors for modals and overlays
    const interstitialSelectors = [
      '[role="dialog"]',
      '[role="alertdialog"]',
      '.modal',
      '.overlay',
      '.popup',
      '[class*="modal"]',
      '[class*="overlay"]',
      '[class*="popup"]',
      '[id*="modal"]',
      '[id*="overlay"]',
      '[id*="popup"]'
    ];
    
    // Check if any interstitial elements exist
    for (const selector of interstitialSelectors) {
      const elements = dom(selector);
      if (elements.length > 0) {
        // Check if the element is visible (not display:none)
        // Note: We can't check computed styles in Cheerio, so we check inline styles
        let hasVisibleElement = false;
        elements.each((_, el) => {
          const style = dom(el).attr('style') || '';
          const isHidden = style.includes('display: none') || style.includes('display:none');
          if (!isHidden) {
            hasVisibleElement = true;
            return false; // Break the loop
          }
        });
        
        if (hasVisibleElement) {
          return true;
        }
      }
    }
    
    return false;
  }

  /**
   * Detects extensive canvas-based UIs
   * 
   * Canvas elements are not accessible to agents as they don't expose DOM structure
   * 
   * @param dom - Cheerio DOM instance
   * @returns true if significant canvas usage is detected
   */
  detectCanvasUI(dom: CheerioAPI): boolean {
    const canvasElements = dom('canvas');
    
    // If there are no canvas elements, no friction
    if (canvasElements.length === 0) {
      return false;
    }
    
    // Consider it significant if:
    // 1. There are multiple canvas elements (3 or more)
    // 2. Or there's a large canvas element (width or height > 500px)
    
    if (canvasElements.length >= 3) {
      return true;
    }
    
    // Check for large canvas elements
    let hasLargeCanvas = false;
    canvasElements.each((_, el) => {
      const $canvas = dom(el);
      const width = parseInt($canvas.attr('width') || '0', 10);
      const height = parseInt($canvas.attr('height') || '0', 10);
      
      if (width > 500 || height > 500) {
        hasLargeCanvas = true;
        return false; // Break the loop
      }
    });
    
    return hasLargeCanvas;
  }
}
