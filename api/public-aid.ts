/**
 * Legacy Public AID Alias Endpoint (`/api/public-aid`)
 *
 * A thin transport adapter (design AD1 & AD7 — no identity logic is
 * reimplemented) that retains the legacy public-AID path as a temporary
 * transition alias while routing every request to the single shared AIP
 * identity module (`lib/agentSurface/identity.ts`). There is exactly one
 * identity implementation; this file only adapts transport and delegates.
 *
 * Behavior (design Component 8):
 *   - `GET`/`POST /api/public-aid` → generate a fresh `aip://` identity: an
 *     Ed25519 keypair plus an initial challenge. The optional agent `name`
 *     (from the `name` query/body param, or the legacy `aid`/AIP `aip` name)
 *     seeds the human-readable portion of the `aip://` URI.
 *
 * Both the legacy `aid` parameter name and the AIP `aip` name are accepted as
 * temporary transition aliases (Requirement 5.5). Status codes mirror
 * `api/auth.ts`: 405 (wrong method), 429 (rate limited).
 *
 * Feature: agent-surface-truth
 * Requirements: 5.5
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withCors } from '../lib/validation/middleware';
import { generateIdentity, IDENTITY_ALGORITHM } from '../lib/agentSurface/identity';

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
 * Resolve an optional agent name from the `name` param, the AIP `aip` name, or
 * the legacy `aid` name (temporary transition alias). Returns the first
 * non-empty string found, or undefined so the identity module applies its
 * default.
 */
function resolveName(...candidates: unknown[]): string | undefined {
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

  if (req.method !== 'GET' && req.method !== 'POST') {
    res.status(405).json({
      error: 'Method not allowed',
      allowed: ['GET', 'POST'],
      received: req.method,
    });
    return;
  }

  try {
    const body = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<
      string,
      unknown
    >;
    // Accept the `name` param, plus the AIP `aip` / legacy `aid` names.
    const name = resolveName(
      req.query.name,
      body.name,
      req.query.aip,
      body.aip,
      req.query.aid,
      body.aid
    );

    const identity = generateIdentity(name);

    res.status(201).json({
      status: 'identity_created',
      aip: identity.aip,
      publicKey: identity.publicKey,
      privateKey: identity.privateKey,
      challenge: identity.challenge,
      challengeExpiresIn: Math.floor((identity.challengeExpiresAt - Date.now()) / 1000),
      algorithm: IDENTITY_ALGORITHM,
      warning: 'Store private key securely. It is only returned once.',
    });
  } catch (error) {
    console.error('[Public AID] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Apply CORS; OPTIONS handled by the middleware.
export default withCors(handler);
