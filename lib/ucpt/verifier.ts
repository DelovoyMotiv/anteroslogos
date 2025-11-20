/**
 * UCPT Verifier - COSE_Sign1 signature verification
 */

import { ed25519 } from '@noble/curves/ed25519.js';
import type { UCPTPayload, UCPTVerificationResult, SerializedUCPT } from './types';
import { UCPTErrorCode } from './types';
import {
  decodeCanonicalCBOR,
  encodeCanonicalCBOR,
  base64urlDecode,
  validateCanonicalCBOR,
} from './serializer';

/**
 * Verify UCPT token
 */
export async function verifyUCPT(serialized: SerializedUCPT): Promise<UCPTVerificationResult> {
  try {
    // Decode base64url
    const token_bytes = base64urlDecode(serialized.token);
    
    // Validate canonical CBOR
    const canonicalCheck = validateCanonicalCBOR(token_bytes);
    if (!canonicalCheck.valid) {
      return {
        valid: false,
        error: canonicalCheck.error,
        error_code: UCPTErrorCode.NONDETERMINISTIC_CBOR,
      };
    }
    
    // Decode COSE_Sign1
    const cose_sign1 = decodeCanonicalCBOR<unknown[]>(token_bytes);
    
    if (!Array.isArray(cose_sign1) || cose_sign1.length !== 4) {
      return {
        valid: false,
        error: 'Invalid COSE_Sign1 structure',
        error_code: UCPTErrorCode.INVALID_FORMAT,
      };
    }
    
    const [protected_encoded, _unprotected, payload_encoded, signature] = cose_sign1;
    
    // Decode protected header
    const protected_header = decodeCanonicalCBOR<{ alg: number; kid: Uint8Array }>(
      protected_encoded as Uint8Array
    );
    
    // Verify algorithm
    if (protected_header.alg !== -8) {
      return {
        valid: false,
        error: `Unsupported algorithm: ${protected_header.alg}`,
        error_code: UCPTErrorCode.INVALID_FORMAT,
      };
    }
    
    // Extract public key
    const public_key = protected_header.kid;
    if (!(public_key instanceof Uint8Array) || public_key.length !== 32) {
      return {
        valid: false,
        error: 'Invalid public key',
        error_code: UCPTErrorCode.INVALID_FORMAT,
      };
    }
    
    // Decode payload
    const payload = decodeCanonicalCBOR<UCPTPayload>(payload_encoded as Uint8Array);
    
    // Validate required fields
    if (!payload[1] || !payload[6] || !payload[7] || !payload.tool) {
      return {
        valid: false,
        error: 'Missing required fields in payload',
        error_code: UCPTErrorCode.MISSING_REQUIRED_FIELD,
      };
    }
    
    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload[7] < now) {
      return {
        valid: false,
        error: `Token expired at ${new Date(payload[7] * 1000).toISOString()}`,
        error_code: UCPTErrorCode.EXPIRED,
        payload,
      };
    }
    
    // Rebuild Sig_structure
    const sig_structure = encodeCanonicalCBOR([
      'Signature1',
      protected_encoded,
      new Uint8Array(0),
      payload_encoded,
    ]);
    
    // Verify signature
    const valid_signature = ed25519.verify(
      signature as Uint8Array,
      sig_structure,
      public_key
    );
    
    if (!valid_signature) {
      return {
        valid: false,
        error: 'Signature verification failed',
        error_code: UCPTErrorCode.INVALID_SIGNATURE,
      };
    }
    
    return {
      valid: true,
      payload,
      verified_at: now,
      issuer: payload[1],
    };
  } catch (error) {
    return {
      valid: false,
      error: `Verification error: ${error instanceof Error ? error.message : String(error)}`,
      error_code: UCPTErrorCode.INVALID_FORMAT,
    };
  }
}
