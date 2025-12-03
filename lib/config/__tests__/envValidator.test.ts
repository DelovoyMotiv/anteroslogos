/**
 * Property-Based Tests for Environment Variable Validation
 * 
 * **Feature: production-audit-improvements, Property 1: Zero Hardcoded Secrets**
 * **Feature: production-audit-improvements, Property 54: Environment Variable Validation**
 * **Validates: Requirements 2.1, 10.1**
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import { validateEnv, getEnv, hasEnv, getEnvVar, clearEnvCache } from '../envValidator';

describe('Environment Variable Validation', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
    // Clear cached environment
    clearEnvCache();
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
    // Clear cache again
    clearEnvCache();
  });

  describe('Property 1: Zero Hardcoded Secrets', () => {
    it('should reject placeholder values in production', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            'your-api-key',
            'your_secret_key',
            'placeholder',
            'example-key',
            'test-secret',
            'xxx-key-xxx'
          ),
          (placeholderValue) => {
            // Set up production environment with placeholder
            process.env.NODE_ENV = 'production';
            process.env.VITE_SUPABASE_URL = 'https://test.supabase.co';
            process.env.VITE_SUPABASE_ANON_KEY = placeholderValue;
            process.env.VITE_SITE_URL = 'https://example.com';
            process.env.SUPABASE_SERVICE_ROLE_KEY = 'real-key-12345678901234567890';
            process.env.PLATFORM_WALLET_ADDRESS = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e';
            process.env.CRON_SECRET = 'a'.repeat(32);

            // Should throw error for placeholder values
            expect(() => validateEnv()).toThrow();
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should accept valid secrets in production', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 32, maxLength: 64 }).filter(s => 
            !s.match(/your[-_]?.*[-_]?(key|secret|token|id)/i) &&
            !s.match(/placeholder/i) &&
            !s.match(/example/i) &&
            !s.match(/test/i) &&
            !s.match(/xxx/i)
          ),
          (validSecret) => {
            // Set up production environment with valid secret
            process.env.NODE_ENV = 'production';
            process.env.VITE_SUPABASE_URL = 'https://test.supabase.co';
            process.env.VITE_SUPABASE_ANON_KEY = validSecret;
            process.env.VITE_SITE_URL = 'https://example.com';
            process.env.SUPABASE_SERVICE_ROLE_KEY = validSecret;
            process.env.PLATFORM_WALLET_ADDRESS = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e';
            process.env.CRON_SECRET = validSecret;

            // Should not throw
            expect(() => validateEnv()).not.toThrow();
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe('Property 54: Environment Variable Validation', () => {
    it('should validate required variables are present', () => {
      fc.assert(
        fc.property(
          fc.record({
            supabaseUrl: fc.webUrl(),
            supabaseKey: fc.string({ minLength: 20 }),
            siteUrl: fc.webUrl(),
          }),
          ({ supabaseUrl, supabaseKey, siteUrl }) => {
            // Set required variables
            process.env.NODE_ENV = 'development';
            process.env.VITE_SUPABASE_URL = supabaseUrl;
            process.env.VITE_SUPABASE_ANON_KEY = supabaseKey;
            process.env.VITE_SITE_URL = siteUrl;

            // Should validate successfully
            const env = validateEnv();
            expect(env.VITE_SUPABASE_URL).toBe(supabaseUrl);
            expect(env.VITE_SUPABASE_ANON_KEY).toBe(supabaseKey);
            expect(env.VITE_SITE_URL).toBe(siteUrl);
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should reject invalid URLs', () => {
      fc.assert(
        fc.property(
          fc.string().filter(s => {
            try {
              new URL(s);
              return false;
            } catch {
              return true;
            }
          }),
          (invalidUrl) => {
            process.env.NODE_ENV = 'development';
            process.env.VITE_SUPABASE_URL = invalidUrl;
            process.env.VITE_SUPABASE_ANON_KEY = 'test-key';
            process.env.VITE_SITE_URL = 'https://example.com';

            // Should throw validation error
            expect(() => validateEnv()).toThrow();
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should validate Ethereum addresses', () => {
      // Test with a few valid Ethereum addresses
      const validAddresses = [
        '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
        '0x0000000000000000000000000000000000000000',
        '0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF',
      ];

      for (const address of validAddresses) {
        process.env.NODE_ENV = 'development';
        process.env.VITE_SUPABASE_URL = 'https://test.supabase.co';
        process.env.VITE_SUPABASE_ANON_KEY = 'test-key';
        process.env.VITE_SITE_URL = 'https://example.com';
        process.env.PLATFORM_WALLET_ADDRESS = address;
        clearEnvCache();

        const env = validateEnv();
        expect(env.PLATFORM_WALLET_ADDRESS).toBe(address);
      }
    });

    it('should reject invalid Ethereum addresses', () => {
      fc.assert(
        fc.property(
          fc.string().filter(s => !s.match(/^0x[a-fA-F0-9]{40}$/)),
          (invalidAddress) => {
            process.env.NODE_ENV = 'development';
            process.env.VITE_SUPABASE_URL = 'https://test.supabase.co';
            process.env.VITE_SUPABASE_ANON_KEY = 'test-key';
            process.env.VITE_SITE_URL = 'https://example.com';
            process.env.PLATFORM_WALLET_ADDRESS = invalidAddress;

            expect(() => validateEnv()).toThrow();
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should validate Stripe keys have correct prefixes', () => {
      fc.assert(
        fc.property(
          fc.record({
            secretKey: fc.string({ minLength: 20 }).map(s => `sk_test_${s}`),
            webhookSecret: fc.string({ minLength: 20 }).map(s => `whsec_${s}`),
            priceId: fc.string({ minLength: 10 }).map(s => `price_${s}`),
            publishableKey: fc.string({ minLength: 20 }).map(s => `pk_test_${s}`),
          }),
          ({ secretKey, webhookSecret, priceId, publishableKey }) => {
            process.env.NODE_ENV = 'development';
            process.env.VITE_SUPABASE_URL = 'https://test.supabase.co';
            process.env.VITE_SUPABASE_ANON_KEY = 'test-key';
            process.env.VITE_SITE_URL = 'https://example.com';
            process.env.STRIPE_SECRET_KEY = secretKey;
            process.env.STRIPE_WEBHOOK_SECRET = webhookSecret;
            process.env.STRIPE_PRICE_PRO = priceId;
            process.env.VITE_STRIPE_PUBLISHABLE_KEY = publishableKey;

            const env = validateEnv();
            expect(env.STRIPE_SECRET_KEY).toBe(secretKey);
            expect(env.STRIPE_WEBHOOK_SECRET).toBe(webhookSecret);
            expect(env.STRIPE_PRICE_PRO).toBe(priceId);
            expect(env.VITE_STRIPE_PUBLISHABLE_KEY).toBe(publishableKey);
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should validate OpenRouter API keys have correct prefix', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 30 }).map(s => `sk-or-${s}`),
          (apiKey) => {
            process.env.NODE_ENV = 'development';
            process.env.VITE_SUPABASE_URL = 'https://test.supabase.co';
            process.env.VITE_SUPABASE_ANON_KEY = 'test-key';
            process.env.VITE_SITE_URL = 'https://example.com';
            process.env.VITE_OPENROUTER_API_KEY = apiKey;

            const env = validateEnv();
            expect(env.VITE_OPENROUTER_API_KEY).toBe(apiKey);
          }
        ),
        { numRuns: 5 }
      );
    });

    it('should require critical variables in production', () => {
      process.env.NODE_ENV = 'production';
      process.env.VITE_SUPABASE_URL = 'https://test.supabase.co';
      process.env.VITE_SUPABASE_ANON_KEY = 'valid-key-12345678901234567890';
      process.env.VITE_SITE_URL = 'https://example.com';
      // Missing SUPABASE_SERVICE_ROLE_KEY, PLATFORM_WALLET_ADDRESS, CRON_SECRET

      expect(() => validateEnv()).toThrow(/Production environment requires/);
    });

    it('should transform numeric string values to numbers', () => {
      fc.assert(
        fc.property(
          fc.record({
            timeout: fc.integer({ min: 1000, max: 60000 }),
            f: fc.integer({ min: 1, max: 10 }),
            stake: fc.integer({ min: 1, max: 1000 }),
            slashPct: fc.integer({ min: 0, max: 100 }),
          }),
          ({ timeout, f, stake, slashPct }) => {
            process.env.NODE_ENV = 'development';
            process.env.VITE_SUPABASE_URL = 'https://test.supabase.co';
            process.env.VITE_SUPABASE_ANON_KEY = 'test-key';
            process.env.VITE_SITE_URL = 'https://example.com';
            process.env.HOTSTUFF_VIEW_TIMEOUT = timeout.toString();
            process.env.HOTSTUFF_F = f.toString();
            process.env.MIN_STAKE = stake.toString();
            process.env.SLASH_PERCENTAGE = slashPct.toString();

            const env = validateEnv();
            expect(env.HOTSTUFF_VIEW_TIMEOUT).toBe(timeout);
            expect(env.HOTSTUFF_F).toBe(f);
            expect(env.MIN_STAKE).toBe(stake);
            expect(env.SLASH_PERCENTAGE).toBe(slashPct);
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  describe('Helper Functions', () => {
    it('should cache validated environment', () => {
      process.env.NODE_ENV = 'development';
      process.env.VITE_SUPABASE_URL = 'https://test.supabase.co';
      process.env.VITE_SUPABASE_ANON_KEY = 'test-key';
      process.env.VITE_SITE_URL = 'https://example.com';

      const env1 = getEnv();
      const env2 = getEnv();

      // Should return same cached instance
      expect(env1).toBe(env2);
    });

    it('should check if environment variable is set', () => {
      process.env.NODE_ENV = 'development';
      process.env.VITE_SUPABASE_URL = 'https://test.supabase.co';
      process.env.VITE_SUPABASE_ANON_KEY = 'test-key';
      process.env.VITE_SITE_URL = 'https://example.com';

      expect(hasEnv('VITE_SUPABASE_URL')).toBe(true);
      expect(hasEnv('STRIPE_SECRET_KEY')).toBe(false);
    });

    it('should get environment variable with default', () => {
      process.env.NODE_ENV = 'development';
      process.env.VITE_SUPABASE_URL = 'https://test.supabase.co';
      process.env.VITE_SUPABASE_ANON_KEY = 'test-key';
      process.env.VITE_SITE_URL = 'https://example.com';
      // Don't set VITE_OPENROUTER_MODEL to test default value
      delete process.env.VITE_OPENROUTER_MODEL;

      const model = getEnvVar('VITE_OPENROUTER_MODEL', 'default-model');
      expect(model).toBe('meta-llama/llama-3.2-3b-instruct:free');
    });
  });
});
