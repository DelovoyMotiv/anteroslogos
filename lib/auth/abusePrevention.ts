/**
 * Abuse Prevention System
 * 
 * Multi-layer protection against free tier abuse:
 * - Signup rate limiting (3 signups per IP per month)
 * - Email verification enforcement
 * - Audit cooldown (24 hours for free tier)
 * - Device fingerprinting
 */

import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

// Initialize Supabase client with service role (server-side only)
// This module should ONLY be imported in server-side code (API routes, Edge functions)
const getSupabaseClient = () => {
  const supabaseUrl = typeof process !== 'undefined' 
    ? process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL
    : import.meta.env?.VITE_SUPABASE_URL;
  
  const supabaseServiceKey = typeof process !== 'undefined'
    ? process.env.SUPABASE_SERVICE_ROLE_KEY
    : undefined;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase credentials. This module requires SUPABASE_SERVICE_ROLE_KEY and should only be used server-side.');
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
};

// Lazy initialization to avoid errors on module load
let supabase: ReturnType<typeof getSupabaseClient> | null = null;
const getSupabase = (): ReturnType<typeof getSupabaseClient> => {
  if (!supabase) {
    supabase = getSupabaseClient();
  }
  return supabase;
};

// ============================================================================
// TYPES & SCHEMAS
// ============================================================================

export const SignupRateLimitResultSchema = z.object({
  allowed: z.boolean(),
  count: z.number(),
  limit: z.number(),
  remaining: z.number(),
  reset_at: z.string().nullable()
});

export type SignupRateLimitResult = z.infer<typeof SignupRateLimitResultSchema>;

export const AuditCooldownResultSchema = z.object({
  allowed: z.boolean(),
  last_audit_at: z.string().nullable(),
  next_available_at: z.string().nullable(),
  wait_seconds: z.number(),
  cooldown_hours: z.number().optional()
});

export type AuditCooldownResult = z.infer<typeof AuditCooldownResultSchema>;

export const FingerprintAbuseResultSchema = z.object({
  suspicious: z.boolean(),
  user_count: z.number(),
  threshold: z.number(),
  reason: z.string().nullable()
});

export type FingerprintAbuseResult = z.infer<typeof FingerprintAbuseResultSchema>;

export interface RecordSignupInput {
  ipAddress: string;
  email: string;
  userAgent?: string;
}

export interface RecordFingerprintInput {
  userId: string;
  fingerprint: string;
  visitorId?: string;
  confidenceScore?: number;
  ipAddress?: string;
  userAgent?: string;
}

// ============================================================================
// SIGNUP RATE LIMITING
// ============================================================================

/**
 * Check if IP address is allowed to create new account
 * @param ipAddress - Client IP address
 * @returns Rate limit status
 */
export async function checkSignupRateLimit(
  ipAddress: string
): Promise<SignupRateLimitResult> {
  try {
    const { data, error } = await getSupabase().rpc('check_signup_rate_limit', {
      p_ip_address: ipAddress
    }) as { data: any; error: any };

    if (error) {
      console.error('Error checking signup rate limit:', error);
      // Fail open: allow signup if check fails
      return {
        allowed: true,
        count: 0,
        limit: 3,
        remaining: 3,
        reset_at: null
      };
    }

    return SignupRateLimitResultSchema.parse(data);
  } catch (error) {
    console.error('Exception in checkSignupRateLimit:', error);
    // Fail open
    return {
      allowed: true,
      count: 0,
      limit: 3,
      remaining: 3,
      reset_at: null
    };
  }
}

/**
 * Record successful signup attempt
 * @param input - Signup details
 */
export async function recordSignupAttempt(
  input: RecordSignupInput
): Promise<void> {
  try {
    const { error } = await getSupabase().rpc('record_signup_attempt', {
      p_ip_address: input.ipAddress,
      p_email: input.email,
      p_user_agent: input.userAgent || null
    }) as { error: any };

    if (error) {
      console.error('Error recording signup attempt:', error);
    }
  } catch (error) {
    console.error('Exception in recordSignupAttempt:', error);
  }
}

// ============================================================================
// AUDIT COOLDOWN (FREE TIER)
// ============================================================================

/**
 * Check if user can perform audit (24-hour cooldown for free tier)
 * @param userId - User UUID
 * @returns Cooldown status
 */
export async function checkAuditCooldown(
  userId: string
): Promise<AuditCooldownResult> {
  try {
    const { data, error } = await getSupabase().rpc('check_audit_cooldown', {
      p_user_id: userId
    }) as { data: any; error: any };

    if (error) {
      console.error('Error checking audit cooldown:', error);
      // Fail open: allow audit if check fails
      return {
        allowed: true,
        last_audit_at: null,
        next_available_at: null,
        wait_seconds: 0
      };
    }

    return AuditCooldownResultSchema.parse(data);
  } catch (error) {
    console.error('Exception in checkAuditCooldown:', error);
    // Fail open
    return {
      allowed: true,
      last_audit_at: null,
      next_available_at: null,
      wait_seconds: 0
    };
  }
}

/**
 * Get human-readable cooldown message
 * @param result - Cooldown result
 * @returns User-friendly message
 */
export function getCooldownMessage(result: AuditCooldownResult): string {
  if (result.allowed) {
    return 'You can perform an audit now.';
  }

  const hours = Math.floor(result.wait_seconds / 3600);
  const minutes = Math.floor((result.wait_seconds % 3600) / 60);

  if (hours > 0) {
    return `Please wait ${hours} hour${hours > 1 ? 's' : ''} and ${minutes} minute${minutes !== 1 ? 's' : ''} before your next audit.`;
  } else {
    return `Please wait ${minutes} minute${minutes !== 1 ? 's' : ''} before your next audit.`;
  }
}

// ============================================================================
// DEVICE FINGERPRINTING
// ============================================================================

/**
 * Check if device fingerprint is associated with suspicious activity
 * @param fingerprint - Device fingerprint hash
 * @returns Abuse detection result
 */
export async function checkFingerprintAbuse(
  fingerprint: string
): Promise<FingerprintAbuseResult> {
  try {
    const { data, error } = await getSupabase().rpc('check_fingerprint_abuse', {
      p_fingerprint: fingerprint
    }) as { data: any; error: any };

    if (error) {
      console.error('Error checking fingerprint abuse:', error);
      // Fail open: allow if check fails
      return {
        suspicious: false,
        user_count: 0,
        threshold: 3,
        reason: null
      };
    }

    return FingerprintAbuseResultSchema.parse(data);
  } catch (error) {
    console.error('Exception in checkFingerprintAbuse:', error);
    // Fail open
    return {
      suspicious: false,
      user_count: 0,
      threshold: 3,
      reason: null
    };
  }
}

/**
 * Record device fingerprint for user
 * @param input - Fingerprint details
 * @returns Fingerprint record ID
 */
export async function recordDeviceFingerprint(
  input: RecordFingerprintInput
): Promise<string | null> {
  try {
    const { data, error } = await getSupabase().rpc('record_device_fingerprint', {
      p_user_id: input.userId,
      p_fingerprint: input.fingerprint,
      p_visitor_id: input.visitorId || null,
      p_confidence_score: input.confidenceScore || null,
      p_ip_address: input.ipAddress || null,
      p_user_agent: input.userAgent || null
    }) as { data: any; error: any };

    if (error) {
      console.error('Error recording device fingerprint:', error);
      return null;
    }

    return data as string;
  } catch (error) {
    console.error('Exception in recordDeviceFingerprint:', error);
    return null;
  }
}

// ============================================================================
// EMAIL VERIFICATION CHECK
// ============================================================================

/**
 * Check if user has verified their email
 * @param userId - User UUID
 * @returns true if email is verified
 */
export async function isEmailVerified(userId: string): Promise<boolean> {
  try {
    const { data, error } = await getSupabase().auth.admin.getUserById(userId);

    if (error || !data.user) {
      console.error('Error checking email verification:', error);
      // Fail open: allow if check fails
      return true;
    }

    return data.user.email_confirmed_at !== null;
  } catch (error) {
    console.error('Exception in isEmailVerified:', error);
    // Fail open
    return true;
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get client IP address from request headers (Vercel Edge)
 * @param headers - Request headers
 * @returns IP address or '0.0.0.0' if not found
 */
export function getClientIP(headers: Headers): string {
  // Vercel Edge: x-forwarded-for
  const forwardedFor = headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  // Fallback: x-real-ip
  const realIP = headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }

  // Last resort
  return '0.0.0.0';
}

/**
 * Get user agent from request headers
 * @param headers - Request headers
 * @returns User agent string
 */
export function getUserAgent(headers: Headers): string {
  return headers.get('user-agent') || 'Unknown';
}

// ============================================================================
// COMBINED ABUSE CHECK
// ============================================================================

export interface AbuseCheckResult {
  allowed: boolean;
  reason?: string;
  details?: {
    signupRateLimit?: SignupRateLimitResult;
    auditCooldown?: AuditCooldownResult;
    fingerprintAbuse?: FingerprintAbuseResult;
    emailVerified?: boolean;
  };
}

/**
 * Perform comprehensive abuse check for signup
 * @param ipAddress - Client IP
 * @param _email - User email (reserved for future use)
 * @returns Combined abuse check result
 */
export async function checkSignupAbuse(
  ipAddress: string,
  _email: string
): Promise<AbuseCheckResult> {
  const rateLimitResult = await checkSignupRateLimit(ipAddress);

  if (!rateLimitResult.allowed) {
    const resetDate = rateLimitResult.reset_at 
      ? new Date(rateLimitResult.reset_at).toLocaleDateString()
      : 'in 30 days';
    
    return {
      allowed: false,
      reason: `Maximum 3 signups per IP address per month. Your limit will reset on ${resetDate}.`,
      details: { signupRateLimit: rateLimitResult }
    };
  }

  return {
    allowed: true,
    details: { signupRateLimit: rateLimitResult }
  };
}

/**
 * Perform comprehensive abuse check for audit request
 * @param userId - User UUID
 * @param planTier - User's subscription tier (free, starter, pro, enterprise)
 * @param fingerprint - Optional device fingerprint
 * @returns Combined abuse check result
 */
export async function checkAuditAbuse(
  userId: string,
  planTier: 'free' | 'starter' | 'pro' | 'enterprise',
  fingerprint?: string
): Promise<AbuseCheckResult> {
  const details: AbuseCheckResult['details'] = {};

  // Check email verification
  const emailVerified = await isEmailVerified(userId);
  details.emailVerified = emailVerified;

  if (!emailVerified) {
    return {
      allowed: false,
      reason: 'Please verify your email address before performing audits. Check your inbox for the verification link.',
      details
    };
  }

  // Check audit cooldown (free tier only)
  if (planTier === 'free') {
    const cooldownResult = await checkAuditCooldown(userId);
    details.auditCooldown = cooldownResult;

    if (!cooldownResult.allowed) {
      return {
        allowed: false,
        reason: getCooldownMessage(cooldownResult),
        details
      };
    }
  }

  // Check fingerprint abuse (optional)
  if (fingerprint) {
    const fingerprintResult = await checkFingerprintAbuse(fingerprint);
    details.fingerprintAbuse = fingerprintResult;

    if (fingerprintResult.suspicious) {
      return {
        allowed: false,
        reason: fingerprintResult.reason || 'Suspicious activity detected. Please contact support.',
        details
      };
    }
  }

  return {
    allowed: true,
    details
  };
}
