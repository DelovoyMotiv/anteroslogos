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
import { resolvePublicKey } from './registry';
import { checkAndRecordToken } from './replay';
import { checkRateLimit } from './ratelimit';

/**
 * Verify UCPT token
 * Full zero-trust verification with registry lookup, replay protection, and rate limiting
 */
export async function verifyUCPT(
  serialized: SerializedUCPT,
  options?: {
    skipRateLimit?: boolean;
    skipReplayCheck?: boolean;
    skipRegistryCheck?: boolean;
  }
): Promise<UCPTVerificationResult> {
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
    
    // Validate required fields (including jti and nbf)
    if (!payload[1] || !payload[4] || !payload[6] || !payload[7] || !payload.tool || !payload.jti) {
      return {
        valid: false,
        error: 'Missing required fields in payload (iss, nbf, iat, exp, tool, jti)',
        error_code: UCPTErrorCode.MISSING_REQUIRED_FIELD,
      };
    }
    
    // Validate timestamps (nbf ≤ iat ≤ now ≤ exp)
    const now = Math.floor(Date.now() / 1000);
    const nbf = payload[4];
    const iat = payload[6];
    const exp = payload[7];
    
    // Check not-before (prevent time-travel attacks)
    if (nbf > now) {
      return {
        valid: false,
        error: `Token not yet valid (nbf: ${new Date(nbf * 1000).toISOString()})`,
        error_code: UCPTErrorCode.INVALID_FORMAT,
        payload,
      };
    }
    
    // Check expiration
    if (exp < now) {
      return {
        valid: false,
        error: `Token expired at ${new Date(exp * 1000).toISOString()}`,
        error_code: UCPTErrorCode.EXPIRED,
        payload,
      };
    }
    
    // Validate timestamp ordering (nbf ≤ iat ≤ exp)
    if (nbf > iat || iat > exp) {
      return {
        valid: false,
        error: `Invalid timestamp ordering (nbf: ${nbf}, iat: ${iat}, exp: ${exp})`,
        error_code: UCPTErrorCode.INVALID_FORMAT,
        payload,
      };
    }
    
    const issuerAid = payload[1];
    
    // Rate limiting (per issuer)
    if (!options?.skipRateLimit) {
      const rateLimitOk = await checkRateLimit(issuerAid);
      if (!rateLimitOk) {
        return {
          valid: false,
          error: 'Rate limit exceeded for issuer',
          error_code: UCPTErrorCode.INVALID_FORMAT,
        };
      }
    }
    
    // Registry check: verify issuer AID → public key mapping
    if (!options?.skipRegistryCheck) {
      const registeredKey = await resolvePublicKey(issuerAid);
      if (registeredKey) {
        // Compare with public key in token
        let keysMatch = true;
        if (registeredKey.length !== public_key.length) {
          keysMatch = false;
        } else {
          for (let i = 0; i < registeredKey.length; i++) {
            if (registeredKey[i] !== public_key[i]) {
              keysMatch = false;
              break;
            }
          }
        }
        
        if (!keysMatch) {
          return {
            valid: false,
            error: 'Public key does not match registered key for issuer',
            error_code: UCPTErrorCode.UNKNOWN_ISSUER,
          };
        }
      } else {
        // Issuer not registered (warning only, not rejection)
        console.warn(`⚠️  Issuer ${issuerAid} not registered in public key registry`);
      }
    }
    
    // Rebuild Sig_structure for signature verification
    const sig_structure = encodeCanonicalCBOR([
      'Signature1',
      protected_encoded,
      new Uint8Array(0),
      payload_encoded,
    ]);
    
    // Verify Ed25519 signature
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
    
    // Replay protection: check if token already used
    if (!options?.skipReplayCheck) {
      const isNew = await checkAndRecordToken(serialized.token, exp);
      if (!isNew) {
        return {
          valid: false,
          error: 'Token replay detected (token already used)',
          error_code: UCPTErrorCode.REPLAY_ATTACK,
          payload,
        };
      }
    }
    
    return {
      valid: true,
      payload,
      verified_at: now,
      issuer: issuerAid,
    };
  } catch (error) {
    return {
      valid: false,
      error: `Verification error: ${error instanceof Error ? error.message : String(error)}`,
      error_code: UCPTErrorCode.INVALID_FORMAT,
    };
  }
}
