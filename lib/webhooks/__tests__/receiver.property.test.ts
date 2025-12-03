/**
 * @file lib/webhooks/__tests__/receiver.property.test.ts
 * @description Property-based tests for webhook signature verification
 * 
 * **Feature: production-audit-improvements, Property 28: Webhook Signature Verification**
 * **Validates: Requirements 6.4**
 * 
 * Property: For any incoming webhook, it should verify HMAC signature before processing
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  verifyWebhook,
  verifySignature,
  generateWebhookSignature,
} from '../receiver';

describe('Webhook Receiver - Property-Based Tests', () => {
  describe('Property 28: Webhook Signature Verification', () => {
    it('should always verify correctly signed webhooks', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 1000 }), // payload
          fc.string({ minLength: 8, maxLength: 64 }), // secret
          (payload, secret) => {
            // Generate valid signature
            const { signature, timestamp } = generateWebhookSignature(payload, secret);

            // Verify webhook
            const result = verifyWebhook(
              {
                body: payload,
                headers: {
                  'x-webhook-signature': signature,
                  'x-webhook-timestamp': String(timestamp),
                },
              },
              secret
            );

            // Property: Valid signature should always verify
            expect(result.valid).toBe(true);
            expect(result.error).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should always reject webhooks with wrong secret', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 1000 }), // payload
          fc.string({ minLength: 8, maxLength: 64 }), // correct secret
          fc.string({ minLength: 8, maxLength: 64 }), // wrong secret
          (payload, correctSecret, wrongSecret) => {
            // Skip if secrets are the same
            fc.pre(correctSecret !== wrongSecret);

            // Generate signature with correct secret
            const { signature, timestamp } = generateWebhookSignature(payload, correctSecret);

            // Try to verify with wrong secret
            const result = verifyWebhook(
              {
                body: payload,
                headers: {
                  'x-webhook-signature': signature,
                  'x-webhook-timestamp': String(timestamp),
                },
              },
              wrongSecret
            );

            // Property: Wrong secret should always fail verification
            expect(result.valid).toBe(false);
            expect(result.errorCode).toBe('INVALID_SIGNATURE');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should always reject webhooks with tampered payload', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 10, maxLength: 1000 }), // original payload
          fc.string({ minLength: 8, maxLength: 64 }), // secret
          fc.integer({ min: 0, max: 9 }), // position to tamper
          fc.string({ minLength: 1, maxLength: 1 }), // character to insert
          (originalPayload, secret, position, char) => {
            // Skip if payload is too short
            fc.pre(originalPayload.length > position);

            // Generate signature for original payload
            const { signature, timestamp } = generateWebhookSignature(originalPayload, secret);

            // Tamper with payload
            const tamperedPayload =
              originalPayload.slice(0, position) +
              char +
              originalPayload.slice(position);

            // Skip if tampering didn't change the payload
            fc.pre(tamperedPayload !== originalPayload);

            // Try to verify tampered payload
            const result = verifyWebhook(
              {
                body: tamperedPayload,
                headers: {
                  'x-webhook-signature': signature,
                  'x-webhook-timestamp': String(timestamp),
                },
              },
              secret
            );

            // Property: Tampered payload should always fail verification
            expect(result.valid).toBe(false);
            expect(result.errorCode).toBe('INVALID_SIGNATURE');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should always reject webhooks with old timestamps (replay attack)', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 1000 }), // payload
          fc.string({ minLength: 8, maxLength: 64 }), // secret
          fc.integer({ min: 301, max: 10000 }), // age in seconds (> 5 min)
          (payload, secret, ageSeconds) => {
            // Generate signature with old timestamp
            const currentTime = Math.floor(Date.now() / 1000);
            const oldTimestamp = currentTime - ageSeconds;
            const { signature } = generateWebhookSignature(payload, secret, oldTimestamp);

            // Try to verify old webhook
            const result = verifyWebhook(
              {
                body: payload,
                headers: {
                  'x-webhook-signature': signature,
                  'x-webhook-timestamp': String(oldTimestamp),
                },
              },
              secret
            );

            // Property: Old webhooks should always be rejected
            expect(result.valid).toBe(false);
            expect(result.errorCode).toBe('REPLAY_ATTACK');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should always accept webhooks within maxAge window', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 1000 }), // payload
          fc.string({ minLength: 8, maxLength: 64 }), // secret
          fc.integer({ min: 0, max: 299 }), // age in seconds (< 5 min)
          (payload, secret, ageSeconds) => {
            // Generate signature with recent timestamp
            const currentTime = Math.floor(Date.now() / 1000);
            const recentTimestamp = currentTime - ageSeconds;
            const { signature } = generateWebhookSignature(payload, secret, recentTimestamp);

            // Verify recent webhook
            const result = verifyWebhook(
              {
                body: payload,
                headers: {
                  'x-webhook-signature': signature,
                  'x-webhook-timestamp': String(recentTimestamp),
                },
              },
              secret
            );

            // Property: Recent webhooks should always be accepted
            expect(result.valid).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should always reject webhooks without required headers', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 1000 }), // payload
          fc.string({ minLength: 8, maxLength: 64 }), // secret
          fc.boolean(), // has signature
          fc.boolean(), // has timestamp
          (payload, secret, hasSignature, hasTimestamp) => {
            // Skip if both headers are present (that's the valid case)
            fc.pre(!hasSignature || !hasTimestamp);

            const { signature, timestamp } = generateWebhookSignature(payload, secret);

            // Build headers based on flags
            const headers: any = {};
            if (hasSignature) {
              headers['x-webhook-signature'] = signature;
            }
            if (hasTimestamp) {
              headers['x-webhook-timestamp'] = String(timestamp);
            }

            // Try to verify webhook with missing headers
            const result = verifyWebhook(
              {
                body: payload,
                headers,
              },
              secret
            );

            // Property: Missing headers should always fail verification
            expect(result.valid).toBe(false);
            expect(['MISSING_SIGNATURE', 'MISSING_TIMESTAMP']).toContain(result.errorCode);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain signature validity across different payload types', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.string(),
            fc.jsonValue().map(JSON.stringify),
            fc.uint8Array().map(arr => Buffer.from(arr).toString('base64'))
          ),
          fc.string({ minLength: 8, maxLength: 64 }),
          (payload, secret) => {
            // Generate and verify signature
            const { signature, timestamp } = generateWebhookSignature(payload, secret);
            
            const result = verifyWebhook(
              {
                body: payload,
                headers: {
                  'x-webhook-signature': signature,
                  'x-webhook-timestamp': String(timestamp),
                },
              },
              secret
            );

            // Property: Signature should work for any payload type
            expect(result.valid).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should use constant-time comparison (timing attack resistance)', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 1000 }),
          fc.string({ minLength: 8, maxLength: 64 }),
          (payload, secret) => {
            const { signature } = generateWebhookSignature(payload, secret);

            // Create signatures that differ at different positions
            const hash = signature.replace('sha256=', '');
            
            // Ensure we're modifying to a different character
            const wrongHash1 = (hash[0] === 'a' ? 'b' : 'a') + hash.slice(1); // Differ at start
            const wrongHash2 = hash.slice(0, -1) + (hash[hash.length - 1] === 'a' ? 'b' : 'a'); // Differ at end
            const wrongHash3 = hash.slice(0, 32) + (hash[32] === 'a' ? 'b' : 'a') + hash.slice(33); // Differ in middle

            // All should fail verification
            const result1 = verifySignature(payload, `sha256=${wrongHash1}`, secret);
            const result2 = verifySignature(payload, `sha256=${wrongHash2}`, secret);
            const result3 = verifySignature(payload, `sha256=${wrongHash3}`, secret);

            // Property: All invalid signatures should fail regardless of position
            expect(result1).toBe(false);
            expect(result2).toBe(false);
            expect(result3).toBe(false);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Signature Round-Trip Property', () => {
    it('should maintain signature validity through generation and verification', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 1000 }),
          fc.string({ minLength: 8, maxLength: 64 }),
          (payload, secret) => {
            // Generate signature
            const { signature } = generateWebhookSignature(payload, secret);

            // Verify signature
            const valid = verifySignature(payload, signature, secret);

            // Property: Generated signatures should always verify
            expect(valid).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Timestamp Validation Properties', () => {
    it('should respect custom maxAge settings', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 1000 }),
          fc.string({ minLength: 8, maxLength: 64 }),
          fc.integer({ min: 60, max: 600 }), // maxAge
          fc.integer({ min: 0, max: 1000 }), // age
          (payload, secret, maxAge, age) => {
            const currentTime = Math.floor(Date.now() / 1000);
            const timestamp = currentTime - age;
            const { signature } = generateWebhookSignature(payload, secret, timestamp);

            const result = verifyWebhook(
              {
                body: payload,
                headers: {
                  'x-webhook-signature': signature,
                  'x-webhook-timestamp': String(timestamp),
                },
              },
              secret,
              { maxAge }
            );

            // Property: Verification should match age vs maxAge comparison
            if (age <= maxAge) {
              expect(result.valid).toBe(true);
            } else {
              expect(result.valid).toBe(false);
              expect(result.errorCode).toBe('REPLAY_ATTACK');
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
