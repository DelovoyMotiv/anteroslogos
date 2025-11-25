/**
 * Vercel Serverless Function - Challenge-Response Authentication
 * GET /api/challenge?aid=... - Generate challenge
 * POST /api/challenge - Verify signature
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ed25519 } from '@noble/curves/ed25519';
import { randomBytes, createHash } from 'crypto';

// In-memory stores (production: use Redis/KV)
const challengeStore = new Map<string, { challenge: string; expiresAt: number; publicKey?: string }>();
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 20;
const CHALLENGE_TTL_MS = 5 * 60 * 1000;
const JWT_TTL_MS = 24 * 60 * 60 * 1000;

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

function generateChallenge(): string {
  const timestamp = Date.now().toString(36);
  const random = randomBytes(16).toString('hex');
  const nonce = randomBytes(8).toString('hex');
  return `anoteroslogos:${timestamp}:${random}:${nonce}`;
}

function verifySignature(challenge: string, publicKey: string, signature: string): boolean {
  try {
    const messageBytes = new TextEncoder().encode(challenge);
    const publicKeyBytes = Buffer.from(publicKey, 'hex');
    const signatureBytes = Buffer.from(signature, 'hex');
    return ed25519.verify(signatureBytes, messageBytes, publicKeyBytes);
  } catch {
    return false;
  }
}

function generateToken(aid: string, publicKey: string): { token: string; expiresAt: string } {
  const expiresAt = new Date(Date.now() + JWT_TTL_MS);
  const payload = {
    aid,
    publicKey,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(expiresAt.getTime() / 1000),
    iss: 'anoteroslogos.com',
  };
  
  const header = Buffer.from(JSON.stringify({ alg: 'EdDSA', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = createHash('sha256').update(`${header}.${body}`).digest('base64url');
  
  return { token: `${header}.${body}.${sig}`, expiresAt: expiresAt.toISOString() };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || 
             req.headers['x-real-ip'] as string || 
             'unknown';
  
  const rateLimit = checkRateLimit(ip);
  if (!rateLimit.allowed) {
    return res.status(429).json({ error: 'Rate limit exceeded', retryAfter: 60 });
  }

  // GET - Generate challenge
  if (req.method === 'GET') {
    const aid = String(req.query.aid || '').trim();
    
    if (!aid || !aid.startsWith('aid://')) {
      return res.status(400).json({ error: 'Invalid AID format', example: 'aid://agent/abc123' });
    }
    
    const challenge = generateChallenge();
    const expiresAt = Date.now() + CHALLENGE_TTL_MS;
    challengeStore.set(aid, { challenge, expiresAt });
    
    return res.status(200).json({
      aid,
      challenge,
      expiresIn: Math.floor(CHALLENGE_TTL_MS / 1000),
      expiresAt: new Date(expiresAt).toISOString(),
      algorithm: 'Ed25519',
      signatureFormat: 'hex (128 characters)',
    });
  }

  // POST - Verify signature
  if (req.method === 'POST') {
    const { aid, challenge, publicKey, signature } = req.body || {};
    
    if (!aid || !challenge || !publicKey || !signature) {
      return res.status(400).json({ 
        error: 'Missing fields', 
        required: ['aid', 'challenge', 'publicKey', 'signature'] 
      });
    }
    
    const stored = challengeStore.get(aid);
    if (!stored || stored.expiresAt < Date.now()) {
      return res.status(401).json({ error: 'Challenge expired or not found' });
    }
    
    if (stored.challenge !== challenge) {
      return res.status(401).json({ error: 'Challenge mismatch' });
    }
    
    if (!verifySignature(challenge, publicKey, signature)) {
      return res.status(401).json({ error: 'Invalid signature' });
    }
    
    challengeStore.delete(aid);
    const { token, expiresAt } = generateToken(aid, publicKey);
    
    return res.status(200).json({
      verified: true,
      aid,
      jwt: token,
      expiresAt,
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
