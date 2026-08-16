/**
 * Watermark response header middleware for the agent surface.
 *
 * When a handler produces a response that carries a signed/watermarked UCPT
 * token, this module extracts the CBOR tag 666 watermark (`_w`) via
 * `detectWatermark` and sets the `x-anoteros-watermark` header on the outgoing
 * response (Requirement 6.4). Publishing the watermark on the header closes the
 * round-trip loop described in Requirement 6.5: the header value (or the token
 * it came from) re-submitted to `/api/verify` re-validates.
 *
 * Design constraints:
 *   - This is a thin adapter (design AD1). It reuses `detectWatermark` from
 *     `scripts/detect-watermark.ts`; it does not reimplement CBOR/COSE parsing.
 *   - It is best-effort and MUST NOT throw to the caller. Any decode/extraction
 *     failure (or a payload with no token) is a silent no-op, never a crash
 *     (mirrors the "verification never throws" posture in `/api/verify`).
 *   - `detectWatermark` is lazy-loaded so importing this module stays light and
 *     the CBOR dependency only loads on a request that actually carries a token.
 *
 * Feature: agent-surface-truth
 * Requirements: 6.4 (6.5 round-trip)
 */

/** The canonical response header used to publish a UCPT watermark. */
export const WATERMARK_HEADER = 'x-anoteros-watermark';

/**
 * The conventional carrier fields under which a handler result may expose a
 * serialized UCPT token string. Checked in priority order.
 *
 * `token` matches `SerializedUCPT.token` (`lib/ucpt/types.ts`); the others
 * cover the ad-hoc field names handlers use when embedding a provenance token
 * in a larger response object.
 */
const TOKEN_CARRIER_FIELDS = [
  'ucpt',
  'token',
  '_ucpt',
  'provenance_token',
] as const;

/**
 * Minimal response contract this middleware needs. `VercelResponse` (and most
 * Node/http response objects) structurally satisfy this, so the module stays
 * decoupled from any specific server framework.
 */
export interface WatermarkResponseLike {
  setHeader(name: string, value: string): unknown;
}

/**
 * Extract a candidate UCPT token string from a handler result.
 *
 * Handles the two common shapes:
 *   - the result *is* the token string, or
 *   - the result is an object that carries the token under a conventional field
 *     (including a nested `{ token }` such as a `SerializedUCPT`).
 *
 * Returns `undefined` when no plausible token is present.
 */
export function extractTokenCandidate(result: unknown): string | undefined {
  if (typeof result === 'string') {
    return result.length > 0 ? result : undefined;
  }

  if (!result || typeof result !== 'object') {
    return undefined;
  }

  const record = result as Record<string, unknown>;

  for (const field of TOKEN_CARRIER_FIELDS) {
    const value = record[field];
    if (typeof value === 'string' && value.length > 0) {
      return value;
    }
    // Support nested carriers like `{ ucpt: { token, mime_type } }`.
    if (value && typeof value === 'object') {
      const nested = (value as Record<string, unknown>).token;
      if (typeof nested === 'string' && nested.length > 0) {
        return nested;
      }
    }
  }

  return undefined;
}

/**
 * Attach the `x-anoteros-watermark` response header when `result` carries a
 * UCPT token whose watermark can be extracted (Requirement 6.4).
 *
 * Never throws: a missing token, an undetectable watermark, or any decode error
 * results in the header simply not being set. Returns `true` when the header was
 * set, `false` otherwise (useful for tests/telemetry; callers may ignore it).
 */
export async function attachWatermarkHeader(
  res: WatermarkResponseLike,
  result: unknown
): Promise<boolean> {
  try {
    const token = extractTokenCandidate(result);
    if (!token) {
      return false;
    }

    const { detectWatermark } = await import('../../scripts/detect-watermark');
    const detected = detectWatermark(token);

    if (detected.found && typeof detected.watermark === 'string') {
      res.setHeader(WATERMARK_HEADER, detected.watermark);
      return true;
    }
  } catch {
    // Best-effort: watermark extraction failure must not fail the response.
  }
  return false;
}
