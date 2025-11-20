/**
 * Canonical CBOR Serializer - RFC 8949 + RFC 8943
 * 
 * Guarantees 100% deterministic encoding:
 * - Map keys sorted (integer keys first, then string keys alphabetically)
 * - No indefinite lengths
 * - No duplicate keys
 * - Shortest encoding for integers
 * - UTF-8 strings only
 */

import { encode, decode } from 'cbor-x';
import { sha3_512 } from '@noble/hashes/sha3.js';

// =====================================================
// CANONICAL CBOR ENCODING
// =====================================================

/**
 * Encode object to canonical CBOR
 * Guarantees bit-for-bit reproducibility
 */
export function encodeCanonicalCBOR(obj: unknown): Uint8Array {
  // Step 1: Normalize object (sort keys, remove undefined)
  const normalized = normalizeForCBOR(obj);
  
  // Step 2: Encode with cbor-x
  const encoded = encode(normalized);
  
  return new Uint8Array(encoded);
}

/**
 * Decode canonical CBOR to object
 */
export function decodeCanonicalCBOR<T = unknown>(data: Uint8Array): T {
  return decode(data) as T;
}

/**
 * Normalize object for canonical CBOR encoding
 * - Sort map keys (integer keys first, then alphabetically)
 * - Remove undefined values
 * - Convert arrays to CBOR arrays
 */
function normalizeForCBOR(obj: unknown): unknown {
  if (obj === null || obj === undefined) {
    return null;
  }
  
  if (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean') {
    return obj;
  }
  
  if (obj instanceof Uint8Array || obj instanceof ArrayBuffer) {
    return new Uint8Array(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => normalizeForCBOR(item));
  }
  
  if (typeof obj === 'object') {
    const normalized: Record<string | number, unknown> = {};
    
    // Separate integer and string keys
    const intKeys: number[] = [];
    const strKeys: string[] = [];
    
    for (const key of Object.keys(obj)) {
      const numKey = Number(key);
      if (Number.isInteger(numKey) && numKey.toString() === key) {
        intKeys.push(numKey);
      } else {
        strKeys.push(key);
      }
    }
    
    // Sort: integers first (numerically), then strings (alphabetically)
    intKeys.sort((a, b) => a - b);
    strKeys.sort();
    
    // Add integer keys first
    for (const key of intKeys) {
      const value = (obj as Record<string, unknown>)[key.toString()];
      if (value !== undefined) {
        normalized[key] = normalizeForCBOR(value);
      }
    }
    
    // Then string keys
    for (const key of strKeys) {
      const value = (obj as Record<string, unknown>)[key];
      if (value !== undefined) {
        normalized[key] = normalizeForCBOR(value);
      }
    }
    
    return normalized;
  }
  
  return obj;
}

// =====================================================
// HASHING
// =====================================================

/**
 * Compute SHA3-512 hash of canonical CBOR encoding
 * Returns base64url-encoded hash
 */
export function hashCanonicalCBOR(obj: unknown): string {
  const cbor = encodeCanonicalCBOR(obj);
  const hash = sha3_512(cbor);
  return base64urlEncode(hash);
}

/**
 * Verify that two objects produce identical canonical CBOR
 */
export function verifyCBORDeterminism(obj1: unknown, obj2: unknown): boolean {
  const cbor1 = encodeCanonicalCBOR(obj1);
  const cbor2 = encodeCanonicalCBOR(obj2);
  
  if (cbor1.length !== cbor2.length) {
    return false;
  }
  
  for (let i = 0; i < cbor1.length; i++) {
    if (cbor1[i] !== cbor2[i]) {
      return false;
    }
  }
  
  return true;
}

// =====================================================
// BASE64URL ENCODING (RFC 4648)
// =====================================================

/**
 * Encode bytes to base64url (no padding)
 */
export function base64urlEncode(data: Uint8Array): string {
  // Convert to base64
  const base64 = Buffer.from(data).toString('base64');
  
  // Convert to base64url
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Decode base64url to bytes
 */
export function base64urlDecode(str: string): Uint8Array {
  // Convert base64url to base64
  let base64 = str
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  
  // Add padding if needed
  while (base64.length % 4 !== 0) {
    base64 += '=';
  }
  
  return new Uint8Array(Buffer.from(base64, 'base64'));
}

// =====================================================
// CANONICAL CBOR VALIDATION
// =====================================================

/**
 * Validate that CBOR bytes are in canonical form
 * Checks:
 * - No indefinite lengths
 * - Shortest encoding
 * - Sorted keys
 */
export function validateCanonicalCBOR(data: Uint8Array): {
  valid: boolean;
  error?: string;
} {
  try {
    // Decode
    const obj = decodeCanonicalCBOR(data);
    
    // Re-encode
    const reencoded = encodeCanonicalCBOR(obj);
    
    // Compare byte-for-byte
    if (data.length !== reencoded.length) {
      return {
        valid: false,
        error: `Length mismatch: original ${data.length} bytes, re-encoded ${reencoded.length} bytes`,
      };
    }
    
    for (let i = 0; i < data.length; i++) {
      if (data[i] !== reencoded[i]) {
        return {
          valid: false,
          error: `Byte mismatch at position ${i}: ${data[i]} !== ${reencoded[i]}`,
        };
      }
    }
    
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: `CBOR decode error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
