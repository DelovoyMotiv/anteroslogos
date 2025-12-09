/**
 * Agent Authentication Middleware
 * 
 * Provides Bearer token authentication for the Agent Middleware API.
 * Validates API keys against Supabase, checks quotas, and tracks usage.
 * 
 * Error Codes:
 * - ERR_AUTH_MISSING: No Authorization header provided
 * - ERR_AUTH_INVALID: Invalid or expired Bearer token
 * - ERR_QUOTA_EXCEEDED: API key has exhausted its quota
 * 
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 8.5**
 * 
 * @module lib/middleware/agentAuth
 */

import { supabase } from '../supabase';
import { createHash } from 'crypto';
import { logger, formatApiKey } from '../a2a/logger';

// ============================================================================
// TYPES
// ============================================================================

/**
 * API Key record from database
 */
export interface ApiKey {
  id: string;
  user_id: string;
  name: string;
  key_hash: string;
  key_prefix: string;
  scoped_tools: string[] | null;
  rate_limit_per_minute: number;
  rate_limit_per_hour: number;
  expires_at: string | null;
  last_used_at: string | null;
  usage_count: number;
  revoked: boolean;
  revoked_at: string | null;
  revoked_reason: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Authentication result
 */
export interface AuthResult {
  success: boolean;
  apiKey?: ApiKey;
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Quota check result
 */
export interface QuotaResult {
  available: boolean;
  remaining: number;
  error?: {
    code: string;
    message: string;
  };
}

// ============================================================================
// ERROR CODES
// ============================================================================

export const AUTH_ERROR_CODES = {
  ERR_AUTH_MISSING: 'ERR_AUTH_MISSING',
  ERR_AUTH_INVALID: 'ERR_AUTH_INVALID',
  ERR_QUOTA_EXCEEDED: 'ERR_QUOTA_EXCEEDED',
} as const;

// ============================================================================
// AUTHENTICATION MIDDLEWARE CLASS
// ============================================================================

export class AuthMiddleware {
  /**
   * Extract Bearer token from Authorization header
   */
  private extractToken(authHeader: string | undefined): string | null {
    if (!authHeader) {
      return null;
    }

    // Support both "Bearer <token>" and just "<token>"
    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7).trim()
      : authHeader.trim();

    // Return null for empty strings (treat as missing token)
    return token === '' ? null : token;
  }

  /**
   * Hash API key for database lookup
   * Uses SHA-256 to match the storage format
   */
  private hashApiKey(key: string): string {
    return createHash('sha256').update(key).digest('hex');
  }

  /**
   * Authenticate Bearer token against Supabase
   * 
   * Validates:
   * - Token is present
   * - Token exists in database
   * - Token is not revoked
   * - Token has not expired
   * 
   * @param token - Bearer token from Authorization header
   * @returns Authentication result with API key or error
   */
  async authenticate(token: string | undefined): Promise<AuthResult> {
    // Check if token is provided (undefined or null)
    if (token === undefined || token === null) {
      return {
        success: false,
        error: {
          code: AUTH_ERROR_CODES.ERR_AUTH_MISSING,
          message: 'No authentication token provided',
        },
      };
    }

    // Extract token from Bearer format
    const extractedToken = this.extractToken(token);
    if (!extractedToken) {
      return {
        success: false,
        error: {
          code: AUTH_ERROR_CODES.ERR_AUTH_INVALID,
          message: 'Invalid token format',
        },
      };
    }

    // Check if Supabase is configured
    if (!supabase) {
      return {
        success: false,
        error: {
          code: AUTH_ERROR_CODES.ERR_AUTH_INVALID,
          message: 'Authentication service not configured',
        },
      };
    }

    try {
      // Hash the token for database lookup
      const keyHash = this.hashApiKey(extractedToken);

      // Query database for API key
      const { data, error } = await supabase
        .from('api_keys')
        .select('*')
        .eq('key_hash', keyHash)
        .maybeSingle();

      if (error) {
        console.error('Database error during authentication:', error);
        return {
          success: false,
          error: {
            code: AUTH_ERROR_CODES.ERR_AUTH_INVALID,
            message: 'Authentication failed',
          },
        };
      }

      // Check if key exists
      if (!data) {
        return {
          success: false,
          error: {
            code: AUTH_ERROR_CODES.ERR_AUTH_INVALID,
            message: 'Invalid API key',
          },
        };
      }

      const apiKey = data as ApiKey;

      // Check if key is revoked
      if (apiKey.revoked) {
        return {
          success: false,
          error: {
            code: AUTH_ERROR_CODES.ERR_AUTH_INVALID,
            message: `API key has been revoked${apiKey.revoked_reason ? `: ${apiKey.revoked_reason}` : ''}`,
          },
        };
      }

      // Check if key has expired
      if (apiKey.expires_at) {
        const expiresAt = new Date(apiKey.expires_at);
        if (expiresAt < new Date()) {
          return {
            success: false,
            error: {
              code: AUTH_ERROR_CODES.ERR_AUTH_INVALID,
              message: 'API key has expired',
            },
          };
        }
      }

      // Authentication successful
      return {
        success: true,
        apiKey,
      };
    } catch (error) {
      console.error('Error during authentication:', error);
      return {
        success: false,
        error: {
          code: AUTH_ERROR_CODES.ERR_AUTH_INVALID,
          message: 'Authentication failed',
        },
      };
    }
  }

  /**
   * Check if API key has remaining quota
   * 
   * Queries the subscription system to verify the user has available quota.
   * For the agent middleware, we check against the subscription quota.
   * 
   * @param apiKey - Authenticated API key
   * @param requiredUnits - Number of quota units required (default: 1)
   * @returns Quota check result
   */
  async checkQuota(apiKey: ApiKey, requiredUnits: number = 1): Promise<QuotaResult> {
    if (!supabase) {
      return {
        available: false,
        remaining: 0,
        error: {
          code: AUTH_ERROR_CODES.ERR_QUOTA_EXCEEDED,
          message: 'Quota service not configured',
        },
      };
    }

    try {
      // Call the check_subscription_quota function
      const { data, error } = await supabase
        .rpc('check_subscription_quota', {
          p_user_id: apiKey.user_id,
          p_required_units: requiredUnits,
        } as never) as { data: unknown; error: unknown };

      if (error) {
        console.error('Error checking quota:', error);
        return {
          available: false,
          remaining: 0,
          error: {
            code: AUTH_ERROR_CODES.ERR_QUOTA_EXCEEDED,
            message: 'Failed to check quota',
          },
        };
      }

      // Parse the result
      // The function returns a single row with (available, remaining, subscription_id)
      const result = Array.isArray(data) ? data[0] : data;

      if (!result || typeof result !== 'object') {
        return {
          available: false,
          remaining: 0,
          error: {
            code: AUTH_ERROR_CODES.ERR_QUOTA_EXCEEDED,
            message: 'No active subscription found',
          },
        };
      }

      const available = (result as { available: boolean }).available;
      const remaining = (result as { remaining: number }).remaining;

      if (!available) {
        return {
          available: false,
          remaining,
          error: {
            code: AUTH_ERROR_CODES.ERR_QUOTA_EXCEEDED,
            message: `Quota exceeded. ${remaining} units remaining.`,
          },
        };
      }

      return {
        available: true,
        remaining,
      };
    } catch (error) {
      console.error('Error checking quota:', error);
      return {
        available: false,
        remaining: 0,
        error: {
          code: AUTH_ERROR_CODES.ERR_QUOTA_EXCEEDED,
          message: 'Failed to check quota',
        },
      };
    }
  }

  /**
   * Track usage for an API key
   * 
   * Updates the API key's usage counter and last_used_at timestamp.
   * Also consumes quota from the subscription system.
   * 
   * @param apiKey - Authenticated API key
   * @param units - Number of quota units to consume (default: 1)
   * @param requestId - Optional request ID for tracking
   * @returns Success status
   * 
   * **Validates: Requirements 8.5**
   */
  async trackUsage(apiKey: ApiKey, units: number = 1, requestId?: string): Promise<boolean> {
    if (!supabase) {
      logger.error('Supabase not configured, cannot track usage', {
        api_key_id: apiKey.id,
        request_id: requestId,
        tags: ['auth', 'usage', 'error'],
      });
      return false;
    }

    try {
      // First, get the subscription ID and remaining quota
      const quotaCheck = await supabase
        .rpc('check_subscription_quota', {
          p_user_id: apiKey.user_id,
          p_required_units: units,
        } as never) as { data: unknown; error: unknown };

      if (quotaCheck.error || !quotaCheck.data) {
        logger.error('Failed to get subscription for usage tracking', {
          api_key_id: apiKey.id,
          user_id: apiKey.user_id,
          request_id: requestId,
          tags: ['auth', 'usage', 'error'],
        }, quotaCheck.error instanceof Error ? quotaCheck.error : new Error(String(quotaCheck.error)));
        return false;
      }

      const result = Array.isArray(quotaCheck.data) ? quotaCheck.data[0] : quotaCheck.data;
      const subscriptionId = result && typeof result === 'object' ? (result as { subscription_id?: string }).subscription_id : undefined;
      const remainingBefore = result && typeof result === 'object' ? (result as { remaining?: number }).remaining : 0;

      if (!subscriptionId) {
        logger.error('No subscription ID found for usage tracking', {
          api_key_id: apiKey.id,
          user_id: apiKey.user_id,
          request_id: requestId,
          tags: ['auth', 'usage', 'error'],
        });
        return false;
      }

      // Consume quota from subscription
      const { error: consumeError } = await supabase
        .rpc('consume_subscription_quota', {
          p_subscription_id: subscriptionId,
          p_units: units,
          p_event_type: 'agent_api_call',
          p_metadata: {
            api_key_id: apiKey.id,
            api_key_name: apiKey.name,
          },
        } as never);

      if (consumeError) {
        logger.error('Failed to consume quota', {
          api_key_id: apiKey.id,
          subscription_id: subscriptionId,
          units,
          request_id: requestId,
          tags: ['auth', 'quota', 'error'],
        }, consumeError instanceof Error ? consumeError : new Error(String(consumeError)));
        return false;
      }

      // Calculate remaining quota after consumption
      const remainingAfter = Math.max(0, (remainingBefore || 0) - units);

      // Log quota consumption with remaining quota
      logger.info('API quota consumed', {
        api_key_id: apiKey.id,
        api_key_prefix: formatApiKey(apiKey.key_prefix),
        user_id: apiKey.user_id,
        subscription_id: subscriptionId,
        units_consumed: units,
        remaining_quota: remainingAfter,
        request_id: requestId,
        tags: ['auth', 'quota', 'consumed'],
      });

      // Update API key usage statistics
      const { error: updateError } = await supabase
        .from('api_keys')
        .update({
          last_used_at: new Date().toISOString(),
          usage_count: apiKey.usage_count + 1,
          updated_at: new Date().toISOString(),
        } as never)
        .eq('id', apiKey.id);

      if (updateError) {
        logger.warn('Failed to update API key usage statistics', {
          api_key_id: apiKey.id,
          request_id: requestId,
          tags: ['auth', 'usage', 'warning'],
        });
        // Don't return false here - quota was consumed successfully
      }

      return true;
    } catch (error) {
      logger.error('Error tracking usage', {
        api_key_id: apiKey.id,
        units,
        request_id: requestId,
        tags: ['auth', 'usage', 'error'],
      }, error instanceof Error ? error : new Error(String(error)));
      return false;
    }
  }
}

/**
 * Singleton instance for convenience
 */
export const authMiddleware = new AuthMiddleware();
