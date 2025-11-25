/**
 * Vercel Serverless Function - One-Step Agent Handshake
 * POST /api/handshake - Complete agent registration and auth in one request
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ed25519 } from '@noble/curves/ed25519';
import { randomBytes, createHash } from 'crypto';

const challengeStore = new Map<string, { challenge: string; expiresAt: number }>();
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

const RATE_LIMIT_MAX = 30;
const CHALLENGE_TTL_MS = 5 * 60 * 1000;
const JWT_TTL_MS = 24 * 60 * 60 * 1000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(ip);
  if (!entry || entry.resetAt < now) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + 60000 });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

function generateKeyPair(): { publicKey: string; privateKey: string } {
  const privateKeyBytes = randomBytes(32);
  const publicKeyBytes = ed25519.getPublicKey(privateKeyBytes);
  return {
    privateKey: Buffer.from(privateKeyBytes).toString('hex'),
    publicKey: Buffer.from(publicKeyBytes).toString('hex'),
  };
}

function generateAidUri(name: string, publicKey: string): string {
  const normalizedName = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').substring(0, 32) || 'agent';
  const suffix = createHash('sha256').update(publicKey).digest('hex').substring(0, 12);
  return `aid://${normalizedName}/${suffix}`;
}

function generateChallenge(): string {
  return `anoteroslogos:${Date.now().toString(36)}:${randomBytes(16).toString('hex')}:${randomBytes(8).toString('hex')}`;
}

function verifySignature(challenge: string, publicKey: string, signature: string): boolean {
  try {
    return ed25519.verify(
      Buffer.from(signature, 'hex'),
      new TextEncoder().encode(challenge),
      Buffer.from(publicKey, 'hex')
    );
  } catch { return false; }
}

function generateToken(aid: string, publicKey: string): { token: string; expiresAt: string } {
  const expiresAt = new Date(Date.now() + JWT_TTL_MS);
  const header = Buffer.from(JSON.stringify({ alg: 'EdDSA', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify({ aid, publicKey, iat: Math.floor(Date.now() / 1000), exp: Math.floor(expiresAt.getTime() / 1000), iss: 'anoteroslogos.com' })).toString('base64url');
  const sig = createHash('sha256').update(`${header}.${body}`).digest('base64url');
  return { token: `${header}.${body}.${sig}`, expiresAt: expiresAt.toISOString() };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(204).end();
  
  // GET - Documentation
  if (req.method === 'GET') {
    return res.status(200).json({
      endpoint: '/api/handshake',
      description: 'One-step agent integration',
      flows: {
        newAgent: { request: { name: 'my-agent' }, response: ['aid', 'publicKey', 'privateKey', 'challenge'] },
        authenticate: { request: { aid: '...', publicKey: '...', challenge: '...', signature: '...' }, response: ['token'] }
      }
    });
  }
  
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || 'unknown';
  if (!checkRateLimit(ip)) return res.status(429).json({ error: 'Rate limit exceeded' });

  const { aid, publicKey, challenge, signature, name } = req.body || {};
  const now = Date.now();

  // Case 1: Verify signature
  if (aid && publicKey && challenge && signature) {
    const stored = challengeStore.get(aid);
    if (!stored || stored.expiresAt < now || stored.challenge !== challenge) {
      return res.status(401).json({ error: 'Challenge expired or invalid' });
    }
    if (!verifySignature(challenge, publicKey, signature)) {
      return res.status(401).json({ error: 'Invalid signature' });
    }
    challengeStore.delete(aid);
    const { token, expiresAt } = generateToken(aid, publicKey);
    return res.status(200).json({ status: 'authenticated', aid, token, tokenType: 'Bearer', expiresAt });
  }

  // Case 2: Get challenge for existing AID
  if (aid && !signature) {
    const ch = generateChallenge();
    challengeStore.set(aid, { challenge: ch, expiresAt: now + CHALLENGE_TTL_MS });
    return res.status(200).json({ status: 'challenge_issued', aid, challenge: ch, expiresIn: 300, algorithm: 'Ed25519' });
  }

  // Case 3: Generate new identity
  const { publicKey: pk, privateKey: sk } = generateKeyPair();
  const newAid = generateAidUri(name || 'agent', pk);
  const ch = generateChallenge();
  challengeStore.set(newAid, { challenge: ch, expiresAt: now + CHALLENGE_TTL_MS });

  return res.status(201).json({
    status: 'identity_created',
    aid: newAid,
    publicKey: pk,
    privateKey: sk,
    challenge: ch,
    challengeExpiresIn: 300,
    algorithm: 'Ed25519',
    warning: 'Store private key securely. It is only returned once.'
  });
}
