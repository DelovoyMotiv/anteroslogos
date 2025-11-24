import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ed25519 } from '@noble/curves/ed25519';
import { randomBytes } from 'crypto';

// In-memory challenge storage (TTL: 5 minutes)
const challengeCache = new Map<string, { challenge: string; aid: string; expiresAt: number }>();

// Cleanup expired challenges every minute
setInterval(() => {
  const now = Date.now();
  for (const [id, data] of challengeCache.entries()) {
    if (data.expiresAt < now) {
      challengeCache.delete(id);
    }
  }
}, 60 * 1000);

// Rate limiting (20 req/min per IP)
const rateLimiter = new Map<string, number[]>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const requests = rateLimiter.get(ip) || [];
  const recentRequests = requests.filter(t => t > now - 60 * 1000);
  
  if (recentRequests.length >= 20) {
    return false;
  }
  
  recentRequests.push(now);
  rateLimiter.set(ip, recentRequests);
  return true;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Rate limiting
  const ip = req.headers['x-forwarded-for']?.toString() || req.socket?.remoteAddress || 'unknown';
  if (!checkRateLimit(ip)) {
    return res.status(429).json({
      error: 'Rate limit exceeded',
      message: 'Maximum 20 requests per minute per IP'
    });
  }

  if (req.method === 'GET') {
    // Generate challenge
    const aid = req.query.aid?.toString();
    
    if (!aid) {
      return res.status(400).json({ error: 'Missing "aid" query parameter' });
    }

    const challenge = randomBytes(32).toString('hex');
    const nonce = Date.now();
    const expiresAt = nonce + 5 * 60 * 1000; // 5 minutes
    const challengeId = randomBytes(16).toString('hex');

    challengeCache.set(challengeId, { challenge, aid, expiresAt });

    return res.status(200).json({
      challenge,
      nonce,
      expiresIn: 300,
      challengeId
    });
  }

  if (req.method === 'POST') {
    // Verify signature
    const { aid, signature, challenge, publicKey } = req.body;

    if (!aid || !signature || !challenge || !publicKey) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Required: aid, signature, challenge, publicKey'
      });
    }

    // Find challenge in cache
    let found = false;
    for (const [id, data] of challengeCache.entries()) {
      if (data.challenge === challenge && data.aid === aid) {
        if (data.expiresAt < Date.now()) {
          challengeCache.delete(id);
          return res.status(400).json({
            valid: false,
            message: 'Challenge expired'
          });
        }
        found = true;
        challengeCache.delete(id); // One-time use
        break;
      }
    }

    if (!found) {
      return res.status(400).json({
        valid: false,
        message: 'Invalid or expired challenge'
      });
    }

    try {
      // Verify Ed25519 signature
      const publicKeyBytes = Buffer.from(publicKey, 'hex');
      const signatureBytes = Buffer.from(signature, 'hex');
      const messageBytes = Buffer.from(challenge, 'hex');

      const isValid = ed25519.verify(signatureBytes, messageBytes, publicKeyBytes);

      if (isValid) {
        return res.status(200).json({
          valid: true,
          message: 'Signature verified',
          aid
        });
      } else {
        return res.status(400).json({
          valid: false,
          message: 'Invalid signature'
        });
      }
    } catch (error) {
      console.error('Signature verification error:', error);
      return res.status(400).json({
        valid: false,
        message: 'Signature verification failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
