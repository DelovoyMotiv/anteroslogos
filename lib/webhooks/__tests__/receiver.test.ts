/**
 * @file lib/webhooks/__tests__/receiver.test.ts
 * @description Unit tests for webhook signature verification
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  verifyWebhook,
  verifySignature,
  generateWebhookSignature,
  type WebhookRequest,
} from '../receiver';

describe('Webhook Receiver', () => {
  const secret = 'test-secret-key';
  const payload = JSON.stringify({ event: 'test', data: { id: 123 } });

  describe('verifySignature', () => {
    it('should verify valid signature', () => {
      const { signature } = generateWebhookSignature(payload, secret);
      const valid = verifySignature(payload, signature, secret);
      expect(valid).toBe(true);
    });

    it('should reject invalid signature', () => {
      const valid = verifySignature(payload, 'sha256=invalid', secret);
      expect(valid).toBe(false);
    });

    it('should reject signature with wrong secret', () => {
      const { signature } = generateWebhookSignature(payload, 'wrong-secret');
      const valid = verifySignature(payload, signature, secret);
      expect(valid).toBe(false);
    });

    it('should reject signature without sha256 prefix', () => {
      const { signature } = generateWebhookSignature(payload, secret);
      const hashOnly = signature.replace('sha256=', '');
      const valid = verifySignature(payload, hashOnly, secret);
      expect(valid).toBe(false);
    });

    it('should reject malformed signature', () => {
      const valid = verifySignature(payload, 'sha256=not-hex', secret);
      expect(valid).toBe(false);
    });

    it('should reject signature with wrong length', () => {
      const valid = verifySignature(payload, 'sha256=abc123', secret);
      expect(valid).toBe(false);
    });

    it('should handle empty payload', () => {
      const { signature } = generateWebhookSignature('', secret);
      const valid = verifySignature('', signature, secret);
      expect(valid).toBe(true);
    });
  });

  describe('verifyWebhook', () => {
    let currentTime: number;

    beforeEach(() => {
      currentTime = Math.floor(Date.now() / 1000);
    });

    it('should verify valid webhook with recent timestamp', () => {
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

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject webhook without signature header', () => {
      const result = verifyWebhook(
        {
          body: payload,
          headers: {
            'x-webhook-timestamp': String(currentTime),
          },
        },
        secret
      );

      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('MISSING_SIGNATURE');
      expect(result.error).toContain('Missing X-Webhook-Signature');
    });

    it('should reject webhook without timestamp header', () => {
      const { signature } = generateWebhookSignature(payload, secret);
      
      const result = verifyWebhook(
        {
          body: payload,
          headers: {
            'x-webhook-signature': signature,
          },
        },
        secret
      );

      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('MISSING_TIMESTAMP');
      expect(result.error).toContain('Missing X-Webhook-Timestamp');
    });

    it('should reject webhook with invalid timestamp format', () => {
      const { signature } = generateWebhookSignature(payload, secret);
      
      const result = verifyWebhook(
        {
          body: payload,
          headers: {
            'x-webhook-signature': signature,
            'x-webhook-timestamp': 'not-a-number',
          },
        },
        secret
      );

      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('INVALID_TIMESTAMP');
    });

    it('should reject webhook with old timestamp (replay attack)', () => {
      const oldTimestamp = currentTime - 400; // 400 seconds ago (> 5 min default)
      const { signature } = generateWebhookSignature(payload, secret, oldTimestamp);
      
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

      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('REPLAY_ATTACK');
      expect(result.error).toContain('too old');
    });

    it('should reject webhook with future timestamp', () => {
      const futureTimestamp = currentTime + 100; // 100 seconds in future
      const { signature } = generateWebhookSignature(payload, secret, futureTimestamp);
      
      const result = verifyWebhook(
        {
          body: payload,
          headers: {
            'x-webhook-signature': signature,
            'x-webhook-timestamp': String(futureTimestamp),
          },
        },
        secret,
        { allowFutureTimestamps: false, clockSkewTolerance: 30 }
      );

      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('REPLAY_ATTACK');
      expect(result.error).toContain('future');
    });

    it('should accept webhook with future timestamp within tolerance', () => {
      const futureTimestamp = currentTime + 20; // 20 seconds in future (within 30s tolerance)
      const { signature } = generateWebhookSignature(payload, secret, futureTimestamp);
      
      const result = verifyWebhook(
        {
          body: payload,
          headers: {
            'x-webhook-signature': signature,
            'x-webhook-timestamp': String(futureTimestamp),
          },
        },
        secret,
        { clockSkewTolerance: 30 }
      );

      expect(result.valid).toBe(true);
    });

    it('should accept webhook with future timestamp when allowed', () => {
      const futureTimestamp = currentTime + 100;
      const { signature } = generateWebhookSignature(payload, secret, futureTimestamp);
      
      const result = verifyWebhook(
        {
          body: payload,
          headers: {
            'x-webhook-signature': signature,
            'x-webhook-timestamp': String(futureTimestamp),
          },
        },
        secret,
        { allowFutureTimestamps: true }
      );

      expect(result.valid).toBe(true);
    });

    it('should respect custom maxAge option', () => {
      const oldTimestamp = currentTime - 70; // 70 seconds ago
      const { signature } = generateWebhookSignature(payload, secret, oldTimestamp);
      
      // Should fail with maxAge=60
      const result1 = verifyWebhook(
        {
          body: payload,
          headers: {
            'x-webhook-signature': signature,
            'x-webhook-timestamp': String(oldTimestamp),
          },
        },
        secret,
        { maxAge: 60 }
      );
      expect(result1.valid).toBe(false);

      // Should pass with maxAge=120
      const result2 = verifyWebhook(
        {
          body: payload,
          headers: {
            'x-webhook-signature': signature,
            'x-webhook-timestamp': String(oldTimestamp),
          },
        },
        secret,
        { maxAge: 120 }
      );
      expect(result2.valid).toBe(true);
    });

    it('should reject webhook with invalid signature', () => {
      const result = verifyWebhook(
        {
          body: payload,
          headers: {
            'x-webhook-signature': 'sha256=invalid',
            'x-webhook-timestamp': String(currentTime),
          },
        },
        secret
      );

      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('INVALID_SIGNATURE');
    });

    it('should reject webhook with tampered payload', () => {
      const { signature, timestamp } = generateWebhookSignature(payload, secret);
      const tamperedPayload = payload.replace('123', '456');
      
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

      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('INVALID_SIGNATURE');
    });
  });

  describe('generateWebhookSignature', () => {
    it('should generate valid signature', () => {
      const { signature, timestamp } = generateWebhookSignature(payload, secret);
      
      expect(signature).toMatch(/^sha256=[a-f0-9]{64}$/);
      expect(timestamp).toBeGreaterThan(0);
    });

    it('should use provided timestamp', () => {
      const customTimestamp = 1234567890;
      const { timestamp } = generateWebhookSignature(payload, secret, customTimestamp);
      
      expect(timestamp).toBe(customTimestamp);
    });

    it('should generate different signatures for different payloads', () => {
      const { signature: sig1 } = generateWebhookSignature('payload1', secret);
      const { signature: sig2 } = generateWebhookSignature('payload2', secret);
      
      expect(sig1).not.toBe(sig2);
    });

    it('should generate different signatures for different secrets', () => {
      const { signature: sig1 } = generateWebhookSignature(payload, 'secret1');
      const { signature: sig2 } = generateWebhookSignature(payload, 'secret2');
      
      expect(sig1).not.toBe(sig2);
    });

    it('should generate same signature for same inputs', () => {
      const timestamp = 1234567890;
      const { signature: sig1 } = generateWebhookSignature(payload, secret, timestamp);
      const { signature: sig2 } = generateWebhookSignature(payload, secret, timestamp);
      
      expect(sig1).toBe(sig2);
    });
  });
});
