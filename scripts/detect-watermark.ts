#!/usr/bin/env tsx
/**
 * UCPT Watermark Detector
 * Extracts CBOR tag 666 watermark from UCPT tokens
 */

import { decode } from 'cbor-x';
import { base64urlDecode } from '../lib/ucpt/serializer';

interface WatermarkResult {
  found: boolean;
  watermark?: string;
  error?: string;
}

/**
 * Detect watermark in UCPT token
 */
export function detectWatermark(token: string): WatermarkResult {
  try {
    // Decode base64url to CBOR bytes
    const cose_bytes = base64urlDecode(token);
    
    // Decode COSE_Sign1 structure: [protected, unprotected, payload, signature]
    const cose_sign1 = decode(cose_bytes);
    
    if (!Array.isArray(cose_sign1) || cose_sign1.length !== 4) {
      return {
        found: false,
        error: 'Invalid COSE_Sign1 structure',
      };
    }
    
    // Extract payload (index 2)
    const payload_bytes = cose_sign1[2];
    
    if (!(payload_bytes instanceof Uint8Array)) {
      return {
        found: false,
        error: 'Invalid payload format',
      };
    }
    
    // Decode payload
    const payload = decode(payload_bytes);
    
    if (typeof payload !== 'object' || payload === null) {
      return {
        found: false,
        error: 'Invalid payload structure',
      };
    }
    
    // Check for watermark field (_w)
    const watermark_field = (payload as Record<string, unknown>)._w;
    
    if (!watermark_field) {
      return {
        found: false,
        error: 'No watermark field found',
      };
    }
    
    // Extract tag 666 content
    // cbor-x represents tags as objects with 'tag' and 'value' properties
    if (
      typeof watermark_field === 'object' &&
      watermark_field !== null &&
      'tag' in watermark_field &&
      'value' in watermark_field
    ) {
      const tag_obj = watermark_field as { tag: number; value: unknown };
      
      if (tag_obj.tag === 666 && typeof tag_obj.value === 'string') {
        return {
          found: true,
          watermark: tag_obj.value,
        };
      }
    }
    
    return {
      found: false,
      error: 'Watermark field exists but not tag 666',
    };
  } catch (error) {
    return {
      found: false,
      error: `Decode error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const token = process.argv[2];
  
  if (!token) {
    console.error('Usage: tsx scripts/detect-watermark.ts <UCPT_TOKEN>');
    process.exit(1);
  }
  
  const result = detectWatermark(token);
  
  if (result.found) {
    console.log('✓ Watermark found');
    console.log('Content:', result.watermark);
    process.exit(0);
  } else {
    console.error('✗ No watermark detected');
    if (result.error) {
      console.error('Error:', result.error);
    }
    process.exit(1);
  }
}
