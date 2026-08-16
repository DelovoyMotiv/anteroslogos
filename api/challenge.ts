/**
 * Legacy AID Challenge Alias Endpoint (`/api/challenge`)
 *
 * A thin transport adapter (design AD1 & AD7 — no identity logic is
 * reimplemented) that retains the legacy AID challenge path as a temporary
 * transition alias while routing every request to the single shared AIP
 * identity module (`lib/agentSurface/identity.ts`). There is exactly one
 * identity implementation; this file only adapts transport and delegates.
 *
 * Behavior (design Component 8):
 *   - `GET  /api/challenge?aid=...` or `?aip=...` → issue an Ed25519 challenge
 *     for the identity, returning an `aip://`-scheme result.
 *   - `POST /api/challenge` with `{ aid|aip, challenge, publicKey, signature }`
 *     → verify the signed challenge and, on success, mint an identity token.
 *
 * Both the legacy `aid` parameter name and the AIP `aip` name are accepted as
 * temporary transition aliases (Requirement 5.5). Status codes mirror
 * `api/auth.ts`: 400 (missing fields), 401 (bad/expired challenge or bad
 * signature), 405 (wrong method), 429 (rate limited).
 *
 * Feature: agent-surface-truth
 * Requirements: 5.5
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withCors } from '../lib/validation/middleware';
import {
  CHALLENGE_TTL_MS,
  IDENTITY_ALGORITHM,
  issueChallenge,
  verifyAndIssueToken,
} from '../lib/agentSurface/identity';

// =====================================================
// RATE LIMITING (in-memory; production: Redis/KV)
// =====================================================

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 30;

function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(ip);

  if (!entry || entry.resetAt < now) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1 };
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return { allowed: false, remaining: 0 };
  }

  entry.count++;
  return { allowed: true, remaining: RATE_LIMIT_MAX - entry.count };
}

// =====================================================
// HELPERS
// =====================================================

/**
 * Resolve the identity value from either the AIP `aip` name (preferred) or the
 * legacy `aid` name (temporary transition alias). Returns the first non-empty
 * string found, or undefined when neither is present.
 */
function resolveIdentity(...candidates: unknown[]): string | undefined {
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.length > 0) {
      return candidate;
    }
  }
  return undefined;
}

// =====================================================
// HANDLER
// =====================================================

async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  // Rate limiting (429), mirroring api/auth.ts.
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || 'unknown';
  if (!checkRateLimit(ip).allowed) {
    res.status(429).json({ error: 'Too many requests' });
    return;
  }

  try {
    if (req.method === 'GET') {
      // Accept both the AIP `aip` name and the legacy `aid` name.
      const identity = resolveIdentity(req.query.aip, req.query.aid);
      if (!identity) {
        res.status(400).json({ error: 'Missing aip parameter' });
        return;
      }

      const { aip, challenge, expiresAt } = issueChallenge(identity);
      res.status(200).json({
        aip,
        challenge,
        expiresIn: Math.floor(CHALLENGE_TTL_MS / 1000),
        expiresAt: new Date(expiresAt).toISOString(),
        algorithm: IDENTITY_ALGORITHM,
        signatureFormat: 'hex (128 characters)',
      });
      return;
    }

    if (req.method === 'POST') {
      const body = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<
        string,
        unknown
      >;
      const identity = resolveIdentity(body.aip, body.aid);
      const { challenge, publicKey, signature } = body;

      if (!identity || !challenge || !publicKey || !signature) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      const result = verifyAndIssueToken(
        identity,
        challenge as string,
        publicKey as string,
        signature as string
      );
      if (!result.verified) {
        const message =
          result.reason === 'challenge_not_found'
            ? 'Challenge expired or not found'
            : result.reason === 'challenge_mismatch'
            ? 'Challenge mismatch'
            : 'Invalid signature';
        res.status(401).json({ error: message });
        return;
      }

      res.status(200).json({
        verified: true,
        aip: result.aip,
        jwt: result.jwt,
        expiresAt: result.expiresAt,
      });
      return;
    }

    res.status(405).json({
      error: 'Method not allowed',
      allowed: ['GET', 'POST'],
      received: req.method,
    });
  } catch (error) {
    console.error('[Challenge] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Apply CORS; OPTIONS handled by the middleware.
export default withCors(handler);
