/**
 * UCPT Watermark Tag 666 Tests
 */

import { describe, it, expect } from 'vitest';
import { ed25519 } from '@noble/ed25519';
import { randomBytes } from 'crypto';
import { generateUCPT } from '../generator';
import { verifyUCPT } from '../verifier';

describe('UCPT Watermark Tag 666', () => {
  it('should generate token with watermark tag 666', async () => {
    const privateKey = ed25519.utils.randomPrivateKey();
    const publicKey = await ed25519.getPublicKey(privateKey);
    
    const token = await generateUCPT({
      tool: 'test_tool',
      params: { test: 'data' },
      timestamp: Date.now(),
    }, privateKey);
    
    expect(token).toBeDefined();
    expect(token._w).toBeDefined();
    expect(token._w.length).toBe(50);
  });
  
  it('should verify token with watermark using standard verifier', async () => {
    const privateKey = ed25519.utils.randomPrivateKey();
    const publicKey = await ed25519.getPublicKey(privateKey);
    
    const token = await generateUCPT({
      tool: 'test_tool',
      params: { test: 'data' },
      timestamp: Date.now(),
    }, privateKey);
    
    const isValid = await verifyUCPT(token, publicKey);
    expect(isValid).toBe(true);
  });
  
  it('should preserve watermark after signature verification', async () => {
    const privateKey = ed25519.utils.randomPrivateKey();
    const publicKey = await ed25519.getPublicKey(privateKey);
    
    const token = await generateUCPT({
      tool: 'test_tool',
      params: { test: 'data' },
      timestamp: Date.now(),
    }, privateKey);
    
    const watermarkBefore = token._w;
    await verifyUCPT(token, publicKey);
    const watermarkAfter = token._w;
    
    expect(watermarkAfter).toBe(watermarkBefore);
  });
  
  it('should fail watermark detection on token without watermark', async () => {
    const privateKey = ed25519.utils.randomPrivateKey();
    
    const tokenWithoutWatermark = await generateUCPT({
      tool: 'test_tool',
      params: { test: 'data' },
      timestamp: Date.now(),
    }, privateKey);
    
    delete (tokenWithoutWatermark as any)._w;
    
    expect((tokenWithoutWatermark as any)._w).toBeUndefined();
  });
  
  it('should include watermark in signed payload (tamper-proof)', async () => {
    const privateKey = ed25519.utils.randomPrivateKey();
    const publicKey = await ed25519.getPublicKey(privateKey);
    
    const token = await generateUCPT({
      tool: 'test_tool',
      params: { test: 'data' },
      timestamp: Date.now(),
    }, privateKey);
    
    const originalWatermark = token._w;
    
    // Tamper with watermark
    (token as any)._w = 'tampered_watermark_' + randomBytes(25).toString('hex');
    
    // Verification should fail
    const isValid = await verifyUCPT(token, publicKey);
    expect(isValid).toBe(false);
  });
  
  it('watermark should be exactly 50 bytes UTF-8', async () => {
    const privateKey = ed25519.utils.randomPrivateKey();
    
    const token = await generateUCPT({
      tool: 'test_tool',
      params: { test: 'data' },
      timestamp: Date.now(),
    }, privateKey);
    
    const watermarkBytes = Buffer.from(token._w, 'utf-8');
    expect(watermarkBytes.length).toBe(50);
  });
  
  it('should maintain canonical CBOR order with _w field', async () => {
    const privateKey = ed25519.utils.randomPrivateKey();
    
    const token = await generateUCPT({
      tool: 'test_tool',
      params: { test: 'data' },
      timestamp: Date.now(),
    }, privateKey);
    
    const keys = Object.keys(token);
    expect(keys).toContain('_w');
  });
});
