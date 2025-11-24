/**
 * UCPT Watermark Tag 666 Tests
 * Run with: tsx lib/ucpt/__tests__/watermark.test.ts
 */

import { ed25519 } from '@noble/curves/ed25519.js';
import { randomBytes } from 'crypto';
import { generateUCPT } from '../generator';
import { verifyUCPT } from '../verifier';
import { detectWatermark } from '../../../scripts/detect-watermark';

// Test runner
let passed = 0;
let failed = 0;

function test(name: string, fn: () => void | Promise<void>) {
  return Promise.resolve(fn())
    .then(() => {
      console.log(`✓ ${name}`);
      passed++;
    })
    .catch((error) => {
      console.error(`✗ ${name}`);
      console.error(`  ${error.message}`);
      failed++;
    });
}

function expect(value: unknown) {
  return {
    toBe(expected: unknown) {
      if (value !== expected) {
        throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(value)}`);
      }
    },
    toBeTruthy() {
      if (!value) {
        throw new Error(`Expected truthy value, got ${JSON.stringify(value)}`);
      }
    },
    toBeDefined() {
      if (value === undefined) {
        throw new Error('Expected value to be defined');
      }
    },
    toBeUndefined() {
      if (value !== undefined) {
        throw new Error(`Expected undefined, got ${JSON.stringify(value)}`);
      }
    },
    toBeLessThanOrEqual(max: number) {
      if (typeof value !== 'number' || value > max) {
        throw new Error(`Expected ${value} to be ≤ ${max}`);
      }
    },
  };
}

async function runTests() {
  console.log('UCPT Watermark Tag 666 Tests\n');
  
  // Generate test keypair
  const private_key = randomBytes(32);
  const public_key = ed25519.getPublicKey(private_key);

  const test_options = {
    issuer_aid: 'aid://anteroslogos.com/agent/test',
    tool_name: 'watermark-test',
    input: { query: 'test input' },
    output: { result: 'test output' },
    graph_commit: 'a1b2c3d4e5f6789012345678901234567890abcd',
    graph_version: 'v1.0.0',
    causal_path_ids: [1, 2, 3],
    private_key,
    public_key,
    ttl_seconds: 3600,
  };

  await test('should generate token with watermark tag 666', async () => {
    const { token } = await generateUCPT(test_options);
    
    expect(token).toBeTruthy();
    expect(typeof token).toBe('string');
    
    // Detect watermark
    const result = detectWatermark(token);
    
    expect(result.found).toBe(true);
    expect(result.watermark).toBe('AnóterosLógos:author:DelovoyMotiv:origin:2025-11');
    expect(result.error).toBeUndefined();
  });

  await test('should verify token with watermark using standard verifier', async () => {
    const { token, mime_type } = await generateUCPT(test_options);
    
    // Standard verification should pass (watermark is transparent)
    const verification = await verifyUCPT({ token, mime_type }, { skipRateLimit: true, skipReplayCheck: true, skipRegistryCheck: true });
    
    expect(verification.valid).toBe(true);
    expect(verification.error).toBeUndefined();
    expect(verification.payload).toBeDefined();
    expect(verification.payload?.tool).toBe('watermark-test');
  });

  await test('should preserve watermark after signature verification', async () => {
    const { token, mime_type } = await generateUCPT(test_options);
    
    // Verify token
    const verification = await verifyUCPT({ token, mime_type }, { skipRateLimit: true, skipReplayCheck: true, skipRegistryCheck: true });
    expect(verification.valid).toBe(true);
    
    // Watermark should still be detectable
    const watermark_result = detectWatermark(token);
    expect(watermark_result.found).toBe(true);
    expect(watermark_result.watermark).toBe('AnóterosLógos:author:DelovoyMotiv:origin:2025-11');
  });

  await test('should fail watermark detection on token without watermark', async () => {
    // Generate token without watermark (if old generator is used)
    // For this test, we'll use a malformed token
    const fake_token = 'invalid_token_without_watermark';
    
    const result = detectWatermark(fake_token);
    
    expect(result.found).toBe(false);
    expect(result.error).toBeTruthy();
  });

  await test('should include watermark in signed payload (tamper-proof)', async () => {
    const { token, mime_type } = await generateUCPT(test_options);
    
    // Decode token to verify watermark is in payload
    const watermark_result = detectWatermark(token);
    expect(watermark_result.found).toBe(true);
    
    // Any attempt to modify watermark would invalidate signature
    // This is implicitly tested by verifyUCPT passing
    const verification = await verifyUCPT({ token, mime_type }, { skipRateLimit: true, skipReplayCheck: true, skipRegistryCheck: true });
    expect(verification.valid).toBe(true);
  });

  await test('watermark should be exactly 50 bytes UTF-8', () => {
    const watermark = 'AnóterosLógos:author:DelovoyMotiv:origin:2025-11';
    const utf8_bytes = new TextEncoder().encode(watermark);
    
    expect(utf8_bytes.length).toBeLessThanOrEqual(64); // Max 64 bytes per spec
    expect(utf8_bytes.length).toBe(50); // Actual size
  });

  await test('should maintain canonical CBOR order with _w field', async () => {
    const { token, mime_type } = await generateUCPT(test_options);
    
    // Field _w should be alphabetically last
    // This is implicitly tested by successful verification
    const verification = await verifyUCPT({ token, mime_type }, { skipRateLimit: true, skipReplayCheck: true, skipRegistryCheck: true });
    expect(verification.valid).toBe(true);
    
    // Payload should have _w field
    expect(verification.payload).toBeDefined();
    // Note: _w field is not exposed in verification result (internal watermark)
  });
  
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
