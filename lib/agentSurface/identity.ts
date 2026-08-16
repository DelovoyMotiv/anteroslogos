/**
 * Shared AIP (Agent Identity Protocol) module for the agent surface.
 *
 * This is the single identity implementation shared by `api/auth.ts` and the
 * legacy AID alias endpoints (`api/challenge.ts`, `api/public-aid.ts`) as well
 * as the A2A gateway identity methods. It centralizes the Ed25519 keypair
 * generation, challenge issuance, signature verification, JWT-style token
 * minting, and `aip://` URI derivation that previously lived inline in
 * `api/auth.ts`.
 *
 * The logic here is a verbatim extraction of the behavior in `api/auth.ts` —
 * there are no behavioral changes. The in-memory challenge store is exported so
 * every identity surface shares one source of truth for issued challenges.
 *
 * Identity model (standardized on AIP):
 *   Generate  -> { aip: 'aip://<name>/<suffix>', publicKey, privateKey, challenge, expiresAt }
 *   Challenge -> { aip, challenge, expiresAt }
 *   Verify    -> { verified: true, aip, jwt, expiresAt } | { verified: false, reason }
 *   AIP URI   -> 'aip://' + normalized-name + sha256(publicKey)[0:12]
 *
 * Feature: agent-surface-truth (Requirements 5.2, 5.4)
 */

import { ed25519 } from '@noble/curves/ed25519.js';
import { randomBytes, createHash } from 'crypto';

// =====================================================
// CONFIGURATION
// =====================================================

/** How long an issued challenge remains valid. */
export const CHALLENGE_TTL_MS = 5 * 60 * 1000;

/** How long a minted identity token remains valid. */
export const JWT_TTL_MS = 24 * 60 * 60 * 1000;

/** Signature algorithm advertised to callers. */
export const IDENTITY_ALGORITHM = 'Ed25519';

// =====================================================
// SHARED STATE
// =====================================================

/** A challenge issued for an identity, pending verification. */
export interface StoredChallenge {
  challenge: string;
  expiresAt: number;
  publicKey?: string;
}

/**
 * In-memory challenge store (production: use Redis/KV).
 *
 * Exported so `api/auth.ts` and the legacy alias endpoints share exactly one
 * store, keeping challenge issuance and verification consistent across every
 * identity surface.
 */
export const challengeStore = new Map<string, StoredChallenge>();

// =====================================================
// PRIMITIVES
// =====================================================

/** Generate an opaque, single-use challenge string. */
export function generateChallenge(): string {
  const timestamp = Date.now().toString(36);
  const random = randomBytes(16).toString('hex');
  const nonce = randomBytes(8).toString('hex');
  return `anoteroslogos:${timestamp}:${random}:${nonce}`;
}

/** Verify an Ed25519 signature over a challenge string. */
export function verifySignature(
  challenge: string,
  publicKey: string,
  signature: string
): boolean {
  try {
    const messageBytes = new TextEncoder().encode(challenge);
    const publicKeyBytes = Buffer.from(publicKey, 'hex');
    const signatureBytes = Buffer.from(signature, 'hex');
    return ed25519.verify(signatureBytes, messageBytes, publicKeyBytes);
  } catch {
    return false;
  }
}

/** Mint a JWT-style identity token bound to an AIP identity and public key. */
export function generateToken(
  aip: string,
  publicKey: string
): { token: string; expiresAt: string } {
  const expiresAt = new Date(Date.now() + JWT_TTL_MS);
  const payload = {
    aip,
    publicKey,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(expiresAt.getTime() / 1000),
    iss: 'anoteroslogos.com',
  };

  const header = Buffer.from(
    JSON.stringify({ alg: 'EdDSA', typ: 'JWT' })
  ).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = createHash('sha256').update(`${header}.${body}`).digest('base64url');

  return { token: `${header}.${body}.${sig}`, expiresAt: expiresAt.toISOString() };
}

/** Generate a fresh Ed25519 keypair as hex strings. */
export function generateKeyPair(): { publicKey: string; privateKey: string } {
  const privateKeyBytes = randomBytes(32);
  const publicKeyBytes = ed25519.getPublicKey(privateKeyBytes);
  return {
    privateKey: Buffer.from(privateKeyBytes).toString('hex'),
    publicKey: Buffer.from(publicKeyBytes).toString('hex'),
  };
}

/**
 * Derive a canonical `aip://` identity URI from an agent name and public key.
 *
 * The URI is `aip://` + a normalized, slugified name (max 32 chars, defaulting
 * to `agent`) + `/` + the first 12 hex chars of sha256(publicKey).
 */
export function generateAipUri(name: string, publicKey: string): string {
  const normalizedName =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 32) || 'agent';
  const suffix = createHash('sha256').update(publicKey).digest('hex').substring(0, 12);
  return `aip://${normalizedName}/${suffix}`;
}

// =====================================================
// HIGHER-LEVEL OPERATIONS
// =====================================================

/** Result of generating a brand-new AIP identity. */
export interface GeneratedIdentity {
  aip: string;
  publicKey: string;
  privateKey: string;
  challenge: string;
  /** Absolute expiry timestamp (ms since epoch) of the issued challenge. */
  challengeExpiresAt: number;
}

/**
 * Generate a new AIP identity: keypair, `aip://` URI, and an initial challenge.
 * The challenge is recorded in the shared store so it can be verified later.
 */
export function generateIdentity(name?: string): GeneratedIdentity {
  const { publicKey, privateKey } = generateKeyPair();
  const aip = generateAipUri(name || 'agent', publicKey);
  const challenge = generateChallenge();
  const challengeExpiresAt = Date.now() + CHALLENGE_TTL_MS;
  challengeStore.set(aip, { challenge, expiresAt: challengeExpiresAt });
  return { aip, publicKey, privateKey, challenge, challengeExpiresAt };
}

/** Result of issuing a challenge for an existing identity. */
export interface IssuedChallenge {
  aip: string;
  challenge: string;
  /** Absolute expiry timestamp (ms since epoch) of the issued challenge. */
  expiresAt: number;
}

/**
 * Issue (and store) a fresh challenge for an existing AIP identity.
 */
export function issueChallenge(aip: string): IssuedChallenge {
  const challenge = generateChallenge();
  const expiresAt = Date.now() + CHALLENGE_TTL_MS;
  challengeStore.set(aip, { challenge, expiresAt });
  return { aip, challenge, expiresAt };
}

/**
 * Reasons a challenge verification can fail. Callers map these to their own
 * status codes / messages so existing endpoint behavior is preserved.
 */
export type VerifyFailureReason =
  | 'challenge_not_found'
  | 'challenge_mismatch'
  | 'invalid_signature';

/** Discriminated result of verifying a signed challenge. */
export type VerifyResult =
  | { verified: true; aip: string; jwt: string; expiresAt: string }
  | { verified: false; reason: VerifyFailureReason };

/**
 * Verify a signed challenge for an AIP identity and, on success, mint a token.
 *
 * On success the challenge is consumed (removed from the store). Failure cases
 * are distinguished so callers can preserve their existing HTTP semantics:
 *   - `challenge_not_found`: no stored challenge, or it has expired.
 *   - `challenge_mismatch`:  stored challenge differs from the presented one.
 *   - `invalid_signature`:   the Ed25519 signature does not verify.
 */
export function verifyAndIssueToken(
  aip: string,
  challenge: string,
  publicKey: string,
  signature: string
): VerifyResult {
  const stored = challengeStore.get(aip);

  if (!stored || stored.expiresAt < Date.now()) {
    return { verified: false, reason: 'challenge_not_found' };
  }

  if (stored.challenge !== challenge) {
    return { verified: false, reason: 'challenge_mismatch' };
  }

  if (!verifySignature(challenge, publicKey, signature)) {
    return { verified: false, reason: 'invalid_signature' };
  }

  challengeStore.delete(aip);
  const { token, expiresAt } = generateToken(aip, publicKey);
  return { verified: true, aip, jwt: token, expiresAt };
}
