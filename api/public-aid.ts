import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ed25519 } from '@noble/curves/ed25519';
import { randomBytes } from 'crypto';

// In-memory storage for private keys (TTL: 1 hour)
const privateKeyCache = new Map<string, { key: string; expiresAt: number }>();

// Cleanup expired keys every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [aid, data] of privateKeyCache.entries()) {
    if (data.expiresAt < now) {
      privateKeyCache.delete(aid);
    }
  }
}, 5 * 60 * 1000);

// Rate limiting (simple IP-based, 10 req/min)
const rateLimiter = new Map<string, number[]>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const requests = rateLimiter.get(ip) || [];
  const recentRequests = requests.filter(t => t > now - 60 * 1000);
  
  if (recentRequests.length >= 10) {
    return false;
  }
  
  recentRequests.push(now);
  rateLimiter.set(ip, recentRequests);
  return true;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate limiting
  const ip = req.headers['x-forwarded-for']?.toString() || req.socket?.remoteAddress || 'unknown';
  if (!checkRateLimit(ip)) {
    return res.status(429).json({
      error: 'Rate limit exceeded',
      message: 'Maximum 10 requests per minute per IP'
    });
  }

  try {
    const { name, description, capabilities = [] } = req.body;

    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid "name" field' });
    }

    // Generate Ed25519 keypair
    const privateKey = ed25519.utils.randomPrivateKey();
    const publicKey = ed25519.getPublicKey(privateKey);

    // Convert to hex
    const privateKeyHex = Buffer.from(privateKey).toString('hex');
    const publicKeyHex = Buffer.from(publicKey).toString('hex');

    // Generate AID
    const randomId = randomBytes(8).toString('hex');
    const nameLower = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const aid = `aid://${nameLower}/${randomId}`;

    // Store private key in memory with TTL
    const expiresAt = Date.now() + 60 * 60 * 1000; // 1 hour
    privateKeyCache.set(aid, { key: privateKeyHex, expiresAt });

    // 1-step handshake: Generate pre-signed challenge
    const challenge = randomBytes(32).toString('hex');
    const challengeBytes = Buffer.from(challenge, 'hex');
    const challengeSignature = ed25519.sign(challengeBytes, privateKey);
    const challengeSignatureHex = Buffer.from(challengeSignature).toString('hex');
    const challengeExpiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

    // Generate manifest
    const manifest = {
      v: '1.1',
      name,
      description: description || '',
      capabilities: Array.isArray(capabilities) ? capabilities : [],
      publicKey: publicKeyHex,
      aid,
      createdAt: new Date().toISOString()
    };

    return res.status(200).json({
      aid,
      publicKey: publicKeyHex,
      privateKey: privateKeyHex,
      manifest,
      expiresIn: 3600,
      challenge,
      challengeSignature: challengeSignatureHex,
      challengeExpiresAt
    });
  } catch (error) {
    console.error('AID generation error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to generate AID'
    });
  }
}
