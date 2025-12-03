/**
 * Vercel Serverless Function - Agent Identity Generation
 * POST /api/public-aid - Generate Ed25519 keypair and AID
 * GET /api/public-aid - Documentation
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ed25519 } from '@noble/curves/ed25519.js';
import { randomBytes, createHash } from 'crypto';
import { withCors, withRateLimit, withValidation, compose } from '../lib/validation/middleware';
import { PublicAidCreateSchema } from '../lib/validation/apiSchemas';

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 10;

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

function generateKeyPair(): { publicKey: string; privateKey: string } {
  const privateKeyBytes = randomBytes(32);
  const publicKeyBytes = ed25519.getPublicKey(privateKeyBytes);
  return {
    privateKey: Buffer.from(privateKeyBytes).toString('hex'),
    publicKey: Buffer.from(publicKeyBytes).toString('hex'),
  };
}

function generateAidUri(name: string, publicKey: string): string {
  const normalizedName = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 32) || 'agent';
  
  const suffix = createHash('sha256')
    .update(publicKey)
    .digest('hex')
    .substring(0, 12);
  
  return `aid://${normalizedName}/${suffix}`;
}

import type { PublicAidValidated, ValidatedApiHandler } from '../types/api.types';

async function mainHandler(
  req: VercelRequest,
  res: VercelResponse,
  validated: PublicAidValidated
): Promise<void> {
  // GET - Documentation
  if (req.method === 'GET') {
    return res.status(200).json({
      endpoint: '/api/public-aid',
      method: 'POST',
      description: 'Generate new Agent Identity (AID) with Ed25519 keypair',
      rateLimit: { requests: 10, window: '1 minute' },
      requestBody: {
        name: { type: 'string', description: 'Agent name', default: 'agent' },
        description: { type: 'string', description: 'Optional description' },
      },
      response: {
        aid: 'aid://agent-name/abc123',
        publicKey: '64-character hex',
        privateKey: '64-character hex (store securely!)',
      },
    });
  }

  // POST - Generate identity
  if (req.method === 'POST') {
    const { name = 'agent', description = '' } = validated.body || {};
    const { publicKey, privateKey } = generateKeyPair();
    const aid = generateAidUri(name, publicKey);

    return res.status(201).json({
      aid,
      name,
      description,
      publicKey,
      privateKey,
      algorithm: 'Ed25519',
      keyFormat: 'hex',
      warning: 'Store private key securely. It is only returned once.',
      nextSteps: {
        step1: 'Store private key securely',
        step2: `GET /api/challenge?aid=${encodeURIComponent(aid)}`,
        step3: 'Sign challenge with private key',
        step4: 'POST /api/challenge with signature',
      },
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

// Apply middleware: CORS -> Rate Limiting -> Validation
export default compose(
  withCors,
  (handler) => withRateLimit(handler, { maxRequests: 10, windowMs: 60000 }),
  (handler) => withValidation(
    {
      bodySchema: PublicAidCreateSchema.optional(),
      allowedMethods: ['GET', 'POST'],
    },
    handler as ValidatedApiHandler<PublicAidValidated>
  )
)(mainHandler);
