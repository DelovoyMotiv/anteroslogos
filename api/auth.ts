/**
 * Unified Authentication Endpoint
 * Combines challenge-response and handshake authentication
 * 
 * Routes:
 * - /api/auth?flow=challenge - Challenge-response flow
 * - /api/auth?flow=handshake - One-step handshake flow
 * - /api/auth?action=user-role - Get user role
 * - /api/auth - Default handshake flow
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import {
  CHALLENGE_TTL_MS,
  generateIdentity,
  issueChallenge,
  verifyAndIssueToken,
} from '../lib/agentSurface/identity';

// In-memory store (production: use Redis/KV). The challenge store lives in the
// shared identity module so every identity surface shares one source of truth.
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

async function handleUserRole(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.substring(7);

    // Initialize Supabase client
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    // Get user from token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Get user role from user_metadata or app_metadata
    // Default role is 'user'
    const role = user.app_metadata?.role || user.user_metadata?.role || 'user';

    return res.status(200).json({
      userId: user.id,
      email: user.email,
      role,
    });
  } catch (error) {
    console.error('[User Role] Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
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

  // Check if this is a user-role request
  const { action } = req.query;
  if (action === 'user-role') {
    return handleUserRole(req, res);
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
        
        const { challenge, expiresAt } = issueChallenge(aip);
        
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
        
        const result = verifyAndIssueToken(aip, challenge, publicKey, signature);
        if (!result.verified) {
          const message =
            result.reason === 'challenge_not_found'
              ? 'Challenge expired or not found'
              : result.reason === 'challenge_mismatch'
              ? 'Challenge mismatch'
              : 'Invalid signature';
          return res.status(401).json({ error: message });
        }
        
        return res.status(200).json({
          verified: true,
          aip: result.aip,
          jwt: result.jwt,
          expiresAt: result.expiresAt,
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

        // Case 1: Verify signature
        if (aip && publicKey && challenge && signature) {
          const result = verifyAndIssueToken(aip, challenge, publicKey, signature);
          if (!result.verified) {
            if (result.reason === 'invalid_signature') {
              return res.status(401).json({ error: 'Invalid signature' });
            }
            return res.status(401).json({ error: 'Challenge expired or invalid' });
          }
          return res.status(200).json({ 
            status: 'authenticated', 
            aip, 
            token: result.jwt, 
            tokenType: 'Bearer', 
            expiresAt: result.expiresAt 
          });
        }

        // Case 2: Get challenge for existing AIP
        if (aip && !signature) {
          const { challenge: ch } = issueChallenge(aip);
          return res.status(200).json({ 
            status: 'challenge_issued', 
            aip, 
            challenge: ch, 
            expiresIn: 300, 
            algorithm: 'Ed25519' 
          });
        }

        // Case 3: Generate new identity
        const identity = generateIdentity(name);

        return res.status(201).json({
          status: 'identity_created',
          aip: identity.aip,
          publicKey: identity.publicKey,
          privateKey: identity.privateKey,
          challenge: identity.challenge,
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
