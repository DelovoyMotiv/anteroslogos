/**
 * Unit Tests for EnvironmentDetector
 * Feature: csr-scraping-vercel-optimization
 * 
 * Tests environment detection and Chromium path resolution
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EnvironmentDetector } from '../EnvironmentDetector';

describe('EnvironmentDetector', () => {
  let detector: EnvironmentDetector;
  let originalVercelEnv: string | undefined;

  beforeEach(() => {
    detector = new EnvironmentDetector();
    originalVercelEnv = process.env.VERCEL;
  });

  afterEach(() => {
    // Restore original environment
    if (originalVercelEnv !== undefined) {
      process.env.VERCEL = originalVercelEnv;
    } else {
      delete process.env.VERCEL;
    }
  });

  describe('isVercel', () => {
    it('should detect Vercel environment when VERCEL=1', () => {
      process.env.VERCEL = '1';
      expect(detector.isVercel()).toBe(true);
    });

    it('should detect Vercel environment when VERCEL=true', () => {
      process.env.VERCEL = 'true';
      expect(detector.isVercel()).toBe(true);
    });

    it('should not detect Vercel when VERCEL is not set', () => {
      delete process.env.VERCEL;
      expect(detector.isVercel()).toBe(false);
    });

    it('should not detect Vercel when VERCEL=false', () => {
      process.env.VERCEL = 'false';
      expect(detector.isVercel()).toBe(false);
    });
  });

  describe('isLocal', () => {
    it('should detect local environment when VERCEL is not set', () => {
      delete process.env.VERCEL;
      expect(detector.isLocal()).toBe(true);
    });

    it('should not detect local when in Vercel', () => {
      process.env.VERCEL = '1';
      expect(detector.isLocal()).toBe(false);
    });
  });

  describe('getChromiumPath', () => {
    it('should return undefined for local environment (Playwright default)', async () => {
      delete process.env.VERCEL;
      const path = await detector.getChromiumPath();
      expect(path).toBeUndefined();
    });

    it('should return a path for Vercel environment', async () => {
      process.env.VERCEL = '1';
      const path = await detector.getChromiumPath();
      // @sparticuz/chromium should return a string path
      expect(typeof path).toBe('string');
      expect(path).toBeTruthy();
    });
  });

  describe('getBrowserConfig', () => {
    it('should return config with headless=true', async () => {
      const config = await detector.getBrowserConfig();
      expect(config.headless).toBe(true);
    });

    it('should include required serverless flags', async () => {
      const config = await detector.getBrowserConfig();
      expect(config.args).toContain('--no-sandbox');
      expect(config.args).toContain('--disable-setuid-sandbox');
      expect(config.args).toContain('--disable-dev-shm-usage');
      expect(config.args).toContain('--disable-gpu');
      expect(config.args).toContain('--disable-accelerated-2d-canvas');
    });

    it('should include Vercel-specific flags when in Vercel', async () => {
      process.env.VERCEL = '1';
      const config = await detector.getBrowserConfig();
      expect(config.args).toContain('--single-process');
      expect(config.args).toContain('--no-zygote');
      expect(config.args).toContain('--disable-software-rasterizer');
    });

    it('should not include Vercel-specific flags when local', async () => {
      delete process.env.VERCEL;
      const config = await detector.getBrowserConfig();
      expect(config.args).not.toContain('--single-process');
      expect(config.args).not.toContain('--no-zygote');
    });

    it('should set executablePath for Vercel', async () => {
      process.env.VERCEL = '1';
      const config = await detector.getBrowserConfig();
      expect(config.executablePath).toBeTruthy();
      expect(typeof config.executablePath).toBe('string');
    });

    it('should not set executablePath for local', async () => {
      delete process.env.VERCEL;
      const config = await detector.getBrowserConfig();
      expect(config.executablePath).toBeUndefined();
    });
  });
});
