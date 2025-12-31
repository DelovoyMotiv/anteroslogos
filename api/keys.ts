/**
 * Unified Keys Management Endpoint
 * Handles both API keys and Agent keys to optimize Vercel function count
 * 
 * Routes:
 * - /api/keys?type=api - API key operations
 * - /api/keys?type=agent - Agent key operations
 * 
 * Methods: GET, POST, PUT, DELETE
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createHash, randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';
import { supabaseServer as supabase } from '../lib/supabase-server';

const scryptAsync = promisify(scrypt);

// API key format: sk_{tier}_{32_random_chars}
const TIER_PREFIXES = {
  free: 'fre',
  pro: 'pro',
  agency: 'agc',
} as const;

/**
 * Generate a cryptographically secure API key
 */
function generateAPIKey(tier: 'free' | 'pro' | 'agency'): string {
  const prefix = TIER_PREFIXES[tier];
  const randomPart = randomBytes(24).toString('base64url'); // 32 chars
  return `sk_${prefix}_${randomPart}`;
}

/**
 * Hash API key using scrypt (N=16384, r=8, p=1)
 * Returns base64-encoded hash + salt
 */
async function hashAPIKey(key: string): Promise<string> {
  const salt = randomBytes(16);
  const derivedKey = (await scryptAsync(key, salt, 64)) as Buffer;
  
  // Store salt + derived key together (salt:key format)
  return `${salt.toString('base64')}:${derivedKey.toString('base64')}`;
}

/**
 * Get plan-based rate limits
 */
function getPlanRateLimits(plan: 'free' | 'pro' | 'agency') {
  const limits = {
    free: { per_minute: 10, per_hour: 100 },
    pro: { per_minute: 60, per_hour: 1000 },
    agency: { per_minute: 300, per_hour: 10000 },
  };
  return limits[plan];
}

/**
 * Get authenticated user from request
 */
async function getAuthenticatedUser(req: VercelRequest) {
  if (!supabase) {
    return null;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return null;
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return null;
  }

  return user;
}

/**
 * Main handler
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log('[API Keys] Request received:', {
    method: req.method,
    query: req.query,
    hasAuth: !!req.headers.authorization,
  });

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (!supabase) {
    console.error('[API Keys] Supabase not configured');
    return res.status(503).json({ error: 'Service unavailable' });
  }

  console.log('[API Keys] Supabase configured, authenticating user...');
  const user = await getAuthenticatedUser(req);
  if (!user) {
    console.error('[API Keys] Authentication failed');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  console.log('[API Keys] User authenticated:', user.id);

  const { type, id } = req.query;
  const keyType = typeof type === 'string' ? type : 'api';

  if (keyType !== 'api' && keyType !== 'agent') {
    return res.status(400).json({ error: 'Invalid key type. Must be "api" or "agent"' });
  }

  const tableName = keyType === 'api' ? 'api_keys' : 'agent_keys';

  try {
    switch (req.method) {
      case 'GET':
        if (id && typeof id === 'string') {
          // Get specific key
          const { data: key, error } = await supabase
            .from(tableName)
            .select('*')
            .eq('id', id)
            .eq('user_id', user.id)
            .single();

          if (error || !key) {
            return res.status(404).json({ error: `${keyType} key not found` });
          }

          return res.status(200).json(key);
        } else {
          // List keys with pagination
          const { limit, offset } = req.query;
          const limitNum = typeof limit === 'string' ? Math.min(parseInt(limit, 10), 100) : 50;
          const offsetNum = typeof offset === 'string' ? parseInt(offset, 10) : 0;

          const { data: keys, error, count } = await supabase
            .from(tableName)
            .select('*', { count: 'exact' })
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .range(offsetNum, offsetNum + limitNum - 1);

          if (error) {
            return res.status(500).json({ error: `Failed to fetch ${keyType} keys` });
          }

          return res.status(200).json({
            keys: keys || [],
            pagination: {
              total: count || 0,
              limit: limitNum,
              offset: offsetNum,
              has_more: (count || 0) > offsetNum + limitNum,
            },
          });
        }

      case 'POST':
        // Create new key
        if (keyType === 'api') {
          try {
            console.log('[API Keys] Creating API key for user:', user.id);
            console.log('[API Keys] Request body:', req.body);

            // Get profile
            console.log('[API Keys] Fetching profile...');
            const { data: profile, error: profileError } = await supabase
              .from('profiles')
              .select('current_plan, api_keys_count')
              .eq('id', user.id)
              .single();

            if (profileError || !profile) {
              console.error('[API Keys] Profile fetch error:', profileError);
              return res.status(404).json({ error: 'Profile not found' });
            }

            console.log('[API Keys] Profile found:', { plan: profile.current_plan, count: profile.api_keys_count });

            // Check plan limits
            const planLimits = {
              free: 1,
              pro: 5,
              agency: 20,
            };
            
            if (profile.api_keys_count >= planLimits[profile.current_plan as keyof typeof planLimits]) {
              console.log('[API Keys] Plan limit reached');
              return res.status(400).json({ 
                error: `Plan limit reached: ${planLimits[profile.current_plan as keyof typeof planLimits]} API keys max` 
              });
            }

            // Generate key
            console.log('[API Keys] Generating key...');
            const plaintextKey = generateAPIKey(profile.current_plan as 'free' | 'pro' | 'agency');
            console.log('[API Keys] Key generated, hashing...');
            const keyHash = await hashAPIKey(plaintextKey);
            const keyPrefix = plaintextKey.substring(0, 11); // sk_xxx_abc...

            // Get rate limits based on plan
            const rateLimits = getPlanRateLimits(profile.current_plan as 'free' | 'pro' | 'agency');

            // Calculate expiration
            const expiresAt = req.body.expires_in_days
              ? new Date(Date.now() + req.body.expires_in_days * 24 * 60 * 60 * 1000).toISOString()
              : null;

            console.log('[API Keys] Inserting into database...');
            // Insert into database
            const { data: key, error: insertError } = await supabase
              .from('api_keys')
              .insert({
                user_id: user.id,
                name: req.body.name,
                key_hash: keyHash,
                key_prefix: keyPrefix,
                scoped_tools: req.body.scoped_tools || null,
                rate_limit_per_minute: rateLimits.per_minute,
                rate_limit_per_hour: rateLimits.per_hour,
                expires_at: expiresAt,
              })
              .select()
              .single();

            if (insertError || !key) {
              console.error('[API Keys] Insert error:', insertError);
              return res.status(500).json({ error: 'Failed to create API key' });
            }

            console.log('[API Keys] Key created successfully:', key.id);

            // Log audit event
            await supabase.from('audit_log').insert({
              user_id: user.id,
              action: 'api_key.created',
              resource_type: 'api_key',
              resource_id: key.id,
              metadata: { name: req.body.name, scoped_tools: req.body.scoped_tools },
            });

            console.log('[API Keys] Returning success response');
            return res.status(201).json({
              key,
              plaintext_key: plaintextKey,
            });
          } catch (error) {
            console.error('[API Keys] Unexpected error:', error);
            return res.status(500).json({ error: 'Internal server error' });
          }
        } else {
          // Agent keys not supported in serverless functions yet
          return res.status(501).json({ error: 'Agent key creation not implemented for serverless functions' });
        }

      case 'PUT': {
        // Update key
        if (!id || typeof id !== 'string') {
          return res.status(400).json({ error: 'Missing key ID' });
        }

        // Verify ownership
        const { data: existing, error: fetchError } = await supabase
          .from(tableName)
          .select('id')
          .eq('id', id)
          .eq('user_id', user.id)
          .single();

        if (fetchError || !existing) {
          return res.status(404).json({ error: `${keyType} key not found` });
        }

        // Update key
        const { data: updated, error: updateError } = await supabase
          .from(tableName)
          .update({
            ...req.body,
            updated_at: new Date().toISOString(),
          } as any)
          .eq('id', id)
          .eq('user_id', user.id)
          .select()
          .single();

        if (updateError || !updated) {
          return res.status(500).json({ error: `Failed to update ${keyType} key` });
        }

        // Log audit event
        await supabase.from('audit_log').insert({
          user_id: user.id,
          action: `${keyType}_key.updated`,
          resource_type: `${keyType}_key`,
          resource_id: id,
          metadata: req.body,
        } as any);

        return res.status(200).json(updated);
      }

      case 'DELETE': {
        // Delete key
        if (!id || typeof id !== 'string') {
          return res.status(400).json({ error: 'Missing key ID' });
        }

        if (keyType === 'api') {
          // Delete API key
          const { error } = await supabase
            .from('api_keys')
            .delete()
            .eq('id', id)
            .eq('user_id', user.id);

          if (error) {
            console.error('deleteAPIKey error:', error);
            return res.status(500).json({ error: 'Failed to delete API key' });
          }

          // Log audit event
          await supabase.from('audit_log').insert({
            user_id: user.id,
            action: 'api_key.deleted',
            resource_type: 'api_key',
            resource_id: id,
          });

          return res.status(204).end();
        } else {
          // Agent keys not supported in serverless functions yet
          return res.status(501).json({ error: 'Agent key deletion not implemented for serverless functions' });
        }
      }

      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error(`Error in keys endpoint:`, error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
