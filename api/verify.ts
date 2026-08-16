/**
 * Independent Verification Endpoint (`/api/verify`)
 *
 * A thin transport adapter (design AD1 & AD6 — no crypto or watermark logic is
 * reimplemented) that lets an autonomous agent independently confirm the
 * cryptographic provenance of a response without trusting the platform's own
 * assertion. It re-derives validity from primitives:
 *   - `mode: 'signature'` → `ed25519.verify` from `@noble/curves/ed25519`.
 *   - `mode: 'ucpt'`      → `detectWatermark` (CBOR tag 666 `_w`) from
 *                           `scripts/detect-watermark.ts` plus `verifyUCPT`
 *                           (signature/structure) from `lib/ucpt/verifier`.
 *
 * This endpoint NEVER throws to the caller. Verification failure is HTTP 200
 * data, not a 500 — malformed hex, wrong-length keys, undecodable CBOR, or a
 * token missing the `_w` watermark all resolve to a `valid: false` result with
 * a descriptive `reason` (design Component 6, Requirement 6.3).
 *
 * Feature: agent-surface-truth
 * Requirements: 6.1, 6.2, 6.3
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ed25519 } from '@noble/curves/ed25519.js';
import { withCors } from '../lib/validation/middleware';
import { detectWatermark } from '../scripts/detect-watermark';
import { verifyUCPT } from '../lib/ucpt/verifier';
import type { SerializedUCPT } from '../lib/ucpt/types';

// =====================================================
// RESULT TYPES (design Component 6)
// =====================================================

interface VerifySignatureResult {
  mode: 'signature';
  valid: boolean;
  reason?: string;
}

interface VerifyUcptResult {
  mode: 'ucpt';
  valid: boolean; // signature + structure valid
  watermark: { found: boolean; value?: string; valid: boolean };
  reason?: string;
}

type VerifyResult = VerifySignatureResult | VerifyUcptResult;

const UCPT_MIME: SerializedUCPT['mime_type'] =
  'application/cose; cose-type="cose-sign1"';

// =====================================================
// HELPERS (pure, never throw)
// =====================================================

/**
 * Decode a hex string to bytes. Returns null (rather than throwing) for
 * malformed/odd-length/non-hex input so callers can surface a `reason`.
 */
function tryDecodeHex(input: unknown): Uint8Array | null {
  if (typeof input !== 'string') {
    return null;
  }
  // Allow an optional 0x prefix; reject odd-length or non-hex content.
  const hex = input.startsWith('0x') || input.startsWith('0X') ? input.slice(2) : input;
  if (hex.length === 0 || hex.length % 2 !== 0 || !/^[0-9a-fA-F]+$/.test(hex)) {
    return null;
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/**
 * Verify a raw Ed25519 signature over a UTF-8 message. Returns `valid: true`
 * ONLY when the signature genuinely verifies against the message and public
 * key (Requirement 6.1). All malformed/undecodable input resolves to
 * `valid: false` with a descriptive reason (Requirement 6.3); never throws.
 */
function verifySignatureMode(body: Record<string, unknown>): VerifySignatureResult {
  const { message, publicKey, signature } = body as {
    message?: unknown;
    publicKey?: unknown;
    signature?: unknown;
  };

  if (typeof message !== 'string') {
    return { mode: 'signature', valid: false, reason: 'message must be a string' };
  }

  const pubKeyBytes = tryDecodeHex(publicKey);
  if (!pubKeyBytes) {
    return {
      mode: 'signature',
      valid: false,
      reason: 'publicKey must be a valid (even-length) hex string',
    };
  }
  if (pubKeyBytes.length !== 32) {
    return {
      mode: 'signature',
      valid: false,
      reason: `publicKey must be 32 bytes, received ${pubKeyBytes.length}`,
    };
  }

  const sigBytes = tryDecodeHex(signature);
  if (!sigBytes) {
    return {
      mode: 'signature',
      valid: false,
      reason: 'signature must be a valid (even-length) hex string',
    };
  }
  if (sigBytes.length !== 64) {
    return {
      mode: 'signature',
      valid: false,
      reason: `signature must be 64 bytes, received ${sigBytes.length}`,
    };
  }

  try {
    const msgBytes = new TextEncoder().encode(message);
    const valid = ed25519.verify(sigBytes, msgBytes, pubKeyBytes);
    return valid
      ? { mode: 'signature', valid: true }
      : {
          mode: 'signature',
          valid: false,
          reason: 'Signature does not verify against message and public key',
        };
  } catch (error) {
    return {
      mode: 'signature',
      valid: false,
      reason: `Verification error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Verify a UCPT token: extract the CBOR tag 666 watermark and re-check the
 * COSE_Sign1 signature/structure. Replay, rate-limit, and registry checks are
 * skipped (design Component 6) so verification is a pure provenance check. A
 * missing or malformed watermark yields `watermark.valid === false` with a
 * descriptive reason (Requirements 6.2, 6.3). Never throws.
 */
async function verifyUcptMode(body: Record<string, unknown>): Promise<VerifyUcptResult> {
  const { token } = body as { token?: unknown };

  if (typeof token !== 'string' || token.length === 0) {
    return {
      mode: 'ucpt',
      valid: false,
      watermark: { found: false, valid: false },
      reason: 'token must be a non-empty base64url string',
    };
  }

  // Watermark extraction (CBOR tag 666 `_w`).
  const wm = detectWatermark(token);

  // Signature + structure verification (provenance only).
  let ucptValid = false;
  let ucptReason: string | undefined;
  try {
    const serialized: SerializedUCPT = { token, mime_type: UCPT_MIME };
    const result = await verifyUCPT(serialized, {
      skipReplayCheck: true,
      skipRateLimit: true,
      skipRegistryCheck: true,
    });
    ucptValid = result.valid;
    ucptReason = result.error;
  } catch (error) {
    ucptValid = false;
    ucptReason = `Verification error: ${error instanceof Error ? error.message : String(error)}`;
  }

  // The watermark is valid only when it was found AND it belongs to a token
  // whose signature/structure genuinely verifies.
  const watermarkValid = wm.found && ucptValid;

  const watermark: VerifyUcptResult['watermark'] = {
    found: wm.found,
    valid: watermarkValid,
  };
  if (wm.found && typeof wm.watermark === 'string') {
    watermark.value = wm.watermark;
  }

  // Assemble a descriptive reason for any failure.
  let reason: string | undefined;
  if (!wm.found) {
    reason = wm.error ?? 'Watermark not found';
  } else if (!ucptValid) {
    reason = ucptReason ?? 'UCPT signature/structure verification failed';
  }

  const out: VerifyUcptResult = {
    mode: 'ucpt',
    valid: ucptValid,
    watermark,
  };
  if (reason) {
    out.reason = reason;
  }
  return out;
}

// =====================================================
// HANDLER
// =====================================================

async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  // Only POST carries a verification request; anything else is not allowed.
  if (req.method !== 'POST') {
    res.status(405).json({
      error: 'Method not allowed',
      allowed: ['POST'],
      received: req.method,
    });
    return;
  }

  // Everything below resolves to HTTP 200 data — verification failure is never
  // a 500 (design Component 6 / Requirement 6.3).
  try {
    const body: Record<string, unknown> =
      req.body && typeof req.body === 'object' ? (req.body as Record<string, unknown>) : {};

    const mode = body.mode;

    let result: VerifyResult;
    if (mode === 'signature') {
      result = verifySignatureMode(body);
    } else if (mode === 'ucpt') {
      result = await verifyUcptMode(body);
    } else {
      res.status(200).json({
        valid: false,
        reason: "mode must be 'signature' or 'ucpt'",
      });
      return;
    }

    res.status(200).json(result);
  } catch (error) {
    // Defensive backstop: even an unexpected failure resolves to 200 data so a
    // caller never sees a 500 for a verification request.
    res.status(200).json({
      valid: false,
      reason: `Unexpected verification error: ${
        error instanceof Error ? error.message : String(error)
      }`,
    });
  }
}

// Apply CORS (verified side-effect-free); OPTIONS handled by the middleware.
export default withCors(handler);
