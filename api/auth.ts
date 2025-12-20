/**
 * Unified Authentication Endpoint
 * Combines challenge-response and handshake authentication
 * 
 * Routes:
 * - /api/auth?flow=challenge - Challenge-response flow
 * - /api/auth?flow=handshake - One-step handshake flow
 * - /api/auth - Default handshake flow
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ed25519 } from '@noble/curves/ed25519.js';
import { randomBytes, createHash } from 'crypto';

// In-memory stores (production: use Redis/KV)
const challengeStore = new Map<string, { challenge: string; expiresAt: number; publicKey?: string }>();
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 30;
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

function generateToken(aip: string, publicKey: string): { token: string; expiresAt: string } {
  const expiresAt = new Date(Date.now() + JWT_TTL_MS);
  const payload = {
    aip,
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

function generateKeyPair(): { publicKey: string; privateKey: string } {
  const privateKeyBytes = randomBytes(32);
  const publicKeyBytes = ed25519.getPublicKey(privateKeyBytes);
  return {
    privateKey: Buffer.from(privateKeyBytes).toString('hex'),
    publicKey: Buffer.from(publicKeyBytes).toString('hex'),
  };
}

function generateAipUri(name: string, publicKey: string): string {
  const normalizedName = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').substring(0, 32) || 'agent';
  const suffix = createHash('sha256').update(publicKey).digest('hex').substring(0, 12);
  return `aip://${normalizedName}/${suffix}`;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Rate limiting
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || 'unknown';
  const rateLimit = checkRateLimit(ip);
  
  if (!rateLimit.allowed) {
    return res.status(429).json({ error: 'Too many requests' });
  }

  const { flow } = req.query;
  const flowType = typeof flow === 'string' ? flow : 'handshake';

  try {
    if (flowType === 'challenge') {
      // Challenge-response flow
      if (req.method === 'GET') {
        const { aip } = req.query;
        if (!aip || typeof aip !== 'string') {
          return res.status(400).json({ error: 'Missing aip parameter' });
        }
        
        const challenge = generateChallenge();
        const expiresAt = Date.now() + CHALLENGE_TTL_MS;
        challengeStore.set(aip, { challenge, expiresAt });
        
        return res.status(200).json({
          aip,
          challenge,
          expiresIn: Math.floor(CHALLENGE_TTL_MS / 1000),
          expiresAt: new Date(expiresAt).toISOString(),
          algorithm: 'Ed25519',
          signatureFormat: 'hex (128 characters)',
        });
      }

      if (req.method === 'POST') {
        const { aip, challenge, publicKey, signature } = req.body || {};
        
        if (!aip || !challenge || !publicKey || !signature) {
          return res.status(400).json({ error: 'Missing required fields' });
        }
        
        const stored = challengeStore.get(aip);
        if (!stored || stored.expiresAt < Date.now()) {
          return res.status(401).json({ error: 'Challenge expired or not found' });
        }
        
        if (stored.challenge !== challenge) {
          return res.status(401).json({ error: 'Challenge mismatch' });
        }
        
        if (!verifySignature(challenge, publicKey, signature)) {
          return res.status(401).json({ error: 'Invalid signature' });
        }
        
        challengeStore.delete(aip);
        const { token, expiresAt } = generateToken(aip, publicKey);
        
        return res.status(200).json({
          verified: true,
          aip,
          jwt: token,
          expiresAt,
        });
      }
    } else {
      // Handshake flow
      if (req.method === 'GET') {
        return res.status(200).json({
          endpoint: '/api/auth?flow=handshake',
          description: 'One-step agent integration',
          flows: {
            newAgent: { 
              request: { name: 'my-agent' }, 
              response: ['aip', 'publicKey', 'privateKey', 'challenge'] 
            },
            authenticate: { 
              request: { aip: '...', publicKey: '...', challenge: '...', signature: '...' }, 
              response: ['token'] 
            }
          }
        });
      }

      if (req.method === 'POST') {
        const { aip, publicKey, challenge, signature, name } = req.body || {};
        const now = Date.now();

        // Case 1: Verify signature
        if (aip && publicKey && challenge && signature) {
          const stored = challengeStore.get(aip);
          if (!stored || stored.expiresAt < now || stored.challenge !== challenge) {
            return res.status(401).json({ error: 'Challenge expired or invalid' });
          }
          if (!verifySignature(challenge, publicKey, signature)) {
            return res.status(401).json({ error: 'Invalid signature' });
          }
          challengeStore.delete(aip);
          const { token, expiresAt } = generateToken(aip, publicKey);
          return res.status(200).json({ 
            status: 'authenticated', 
            aip, 
            token, 
            tokenType: 'Bearer', 
            expiresAt 
          });
        }

        // Case 2: Get challenge for existing AIP
        if (aip && !signature) {
          const ch = generateChallenge();
          challengeStore.set(aip, { challenge: ch, expiresAt: now + CHALLENGE_TTL_MS });
          return res.status(200).json({ 
            status: 'challenge_issued', 
            aip, 
            challenge: ch, 
            expiresIn: 300, 
            algorithm: 'Ed25519' 
          });
        }

        // Case 3: Generate new identity
        const { publicKey: pk, privateKey: sk } = generateKeyPair();
        const newAip = generateAipUri(name || 'agent', pk);
        const ch = generateChallenge();
        challengeStore.set(newAip, { challenge: ch, expiresAt: now + CHALLENGE_TTL_MS });

        return res.status(201).json({
          status: 'identity_created',
          aip: newAip,
          publicKey: pk,
          privateKey: sk,
          challenge: ch,
          challengeExpiresIn: 300,
          algorithm: 'Ed25519',
          warning: 'Store private key securely. It is only returned once.'
        });
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('[Auth] Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
