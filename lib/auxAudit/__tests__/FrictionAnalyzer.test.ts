/**
 * FrictionAnalyzer Tests
 * 
 * Tests for the FrictionAnalyzer class that detects barriers to agent interaction.
 */

import { describe, it, expect } from 'vitest';
import * as cheerio from 'cheerio';
import { FrictionAnalyzer } from '../FrictionAnalyzer';

describe('FrictionAnalyzer', () => {
  let analyzer: FrictionAnalyzer;

  beforeEach(() => {
    analyzer = new FrictionAnalyzer();
  });

  describe('detectCAPTCHA', () => {
    it('should detect Turnstile CAPTCHA', () => {
      const html = '<div class="cf-turnstile"></div>';
      expect(analyzer.detectCAPTCHA(html)).toBe(true);
    });

    it('should detect reCAPTCHA', () => {
      const html = '<div class="g-recaptcha"></div>';
      expect(analyzer.detectCAPTCHA(html)).toBe(true);
    });

    it('should detect CAPTCHA case-insensitively', () => {
      const html = '<script src="https://challenges.cloudflare.com/turnstile/v0/api.js"></script>';
      expect(analyzer.detectCAPTCHA(html)).toBe(true);
    });

    it('should return false when no CAPTCHA is present', () => {
      const html = '<div>Regular content</div>';
      expect(analyzer.detectCAPTCHA(html)).toBe(false);
    });
  });

  describe('detectInterstitials', () => {
    it('should detect modal with role="dialog"', () => {
      const html = '<div role="dialog">Modal content</div>';
      const dom = cheerio.load(html);
      expect(analyzer.detectInterstitials(dom)).toBe(true);
    });

    it('should detect modal with class="modal"', () => {
      const html = '<div class="modal">Modal content</div>';
      const dom = cheerio.load(html);
      expect(analyzer.detectInterstitials(dom)).toBe(true);
    });

    it('should detect overlay elements', () => {
      const html = '<div class="overlay">Overlay content</div>';
      const dom = cheerio.load(html);
      expect(analyzer.detectInterstitials(dom)).toBe(true);
    });

    it('should not detect hidden modals', () => {
      const html = '<div class="modal" style="display: none">Hidden modal</div>';
      const dom = cheerio.load(html);
      expect(analyzer.detectInterstitials(dom)).toBe(false);
    });

    it('should return false when no interstitials are present', () => {
      const html = '<div>Regular content</div>';
      const dom = cheerio.load(html);
      expect(analyzer.detectInterstitials(dom)).toBe(false);
    });
  });

  describe('detectCanvasUI', () => {
    it('should detect multiple canvas elements', () => {
      const html = `
        <canvas width="100" height="100"></canvas>
        <canvas width="100" height="100"></canvas>
        <canvas width="100" height="100"></canvas>
      `;
      const dom = cheerio.load(html);
      expect(analyzer.detectCanvasUI(dom)).toBe(true);
    });

    it('should detect large canvas element', () => {
      const html = '<canvas width="800" height="600"></canvas>';
      const dom = cheerio.load(html);
      expect(analyzer.detectCanvasUI(dom)).toBe(true);
    });

    it('should not detect small single canvas', () => {
      const html = '<canvas width="100" height="100"></canvas>';
      const dom = cheerio.load(html);
      expect(analyzer.detectCanvasUI(dom)).toBe(false);
    });

    it('should return false when no canvas elements are present', () => {
      const html = '<div>Regular content</div>';
      const dom = cheerio.load(html);
      expect(analyzer.detectCanvasUI(dom)).toBe(false);
    });
  });

  describe('detectFriction', () => {
    it('should detect CAPTCHA friction', async () => {
      const html = '<div class="cf-turnstile"></div>';
      const dom = cheerio.load(html);
      const friction = await analyzer.detectFriction(html, dom);
      
      expect(friction).toHaveLength(1);
      expect(friction[0].type).toBe('captcha');
      expect(friction[0].severity).toBe('high');
    });

    it('should detect interstitial friction', async () => {
      const html = '<div role="dialog">Modal</div>';
      const dom = cheerio.load(html);
      const friction = await analyzer.detectFriction(html, dom);
      
      expect(friction).toHaveLength(1);
      expect(friction[0].type).toBe('interstitial');
      expect(friction[0].severity).toBe('medium');
    });

    it('should detect canvas friction', async () => {
      const html = '<canvas width="800" height="600"></canvas>';
      const dom = cheerio.load(html);
      const friction = await analyzer.detectFriction(html, dom);
      
      expect(friction).toHaveLength(1);
      expect(friction[0].type).toBe('canvas');
      expect(friction[0].severity).toBe('high');
    });

    it('should detect multiple friction points', async () => {
      const html = `
        <div class="g-recaptcha"></div>
        <div role="dialog">Modal</div>
        <canvas width="800" height="600"></canvas>
      `;
      const dom = cheerio.load(html);
      const friction = await analyzer.detectFriction(html, dom);
      
      expect(friction).toHaveLength(3);
      expect(friction.map(f => f.type)).toContain('captcha');
      expect(friction.map(f => f.type)).toContain('interstitial');
      expect(friction.map(f => f.type)).toContain('canvas');
    });

    it('should return empty array when no friction is detected', async () => {
      const html = '<div>Regular content</div>';
      const dom = cheerio.load(html);
      const friction = await analyzer.detectFriction(html, dom);
      
      expect(friction).toHaveLength(0);
    });
  });
});
