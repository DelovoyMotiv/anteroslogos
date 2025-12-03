/**
 * JWT Authentication with Short TTL and Refresh Tokens
 * Production-grade JWT implementation with 15-minute access tokens
 * Implements token rotation and family tracking for security
 * 
 * Security Features:
 * - Short-lived access tokens (15 minutes)
 * - Long-lived refresh tokens (7 days) with rotation
 * - Token family tracking to detect reuse attacks
 * - Automatic revocation on suspicious activity
 * - SHA-256 hashing of refresh tokens in database
 */

// @ts-ignore - jsonwebtoken types are not available
import jwt from 'jsonwebtoken';
import { createHash, randomBytes } from 'crypto';
import { supabase } from '../supabase';
import { logAuthEvent } from './auditLogger';

// ============================================================================
// CONFIGURATION
// ============================================================================

// Getter functions to allow runtime configuration (useful for testing)
function getJWTSecret(): string | undefined {
  return process.env.JWT_SECRET || process.env.VITE_JWT_SECRET;
}

function getJWTRefreshSecret(): string | undefined {
  return process.env.JWT_REFRESH_SECRET || process.env.VITE_JWT_REFRESH_SECRET;
}

// Token expiration times
const ACCESS_TOKEN_TTL = 15 * 60; // 15 minutes in seconds
const REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60; // 7 days in seconds

// Warn if not configured (but only in non-test environments)
if (process.env.NODE_ENV !== 'test' && (!getJWTSecret() || !getJWTRefreshSecret())) {
  console.warn('JWT secrets not configured. JWT authentication will not work.');
}

// ============================================================================
// TYPES
// ============================================================================

export interface AccessTokenPayload {
  userId: string;
  email: string;
  role?: string;
  iat: number;
  exp: number;
}

export interface RefreshTokenPayload {
  userId: string;
  familyId: string;
  tokenId: string;
  iat: number;
  exp: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // seconds until access token expires
}

export interface VerifyResult {
  valid: boolean;
  payload?: AccessTokenPayload;
  error?: string;
}

// ============================================================================
// ACCESS TOKEN FUNCTIONS
// ============================================================================

/**
 * Generate JWT access token with 15-minute TTL
 * Property 4: JWT Short TTL - All access tokens expire in 15 minutes
 */
export function generateAccessToken(
  userId: string,
  email: string,
  role?: string
): string {
  const JWT_SECRET = getJWTSecret();
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET not configured');
  }

  const payload: Omit<AccessTokenPayload, 'iat' | 'exp'> = {
    userId,
    email,
    role,
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_TTL,
    algorithm: 'HS256',
  });
}

/**
 * Verify JWT access token
 * Returns payload if valid, null if invalid/expired
 */
export function verifyAccessToken(token: string): VerifyResult {
  const JWT_SECRET = getJWTSecret();
  if (!JWT_SECRET) {
    return { valid: false, error: 'JWT_SECRET not configured' };
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET, {
      algorithms: ['HS256'],
    }) as AccessTokenPayload;

    return { valid: true, payload };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return { valid: false, error: 'Token expired' };
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return { valid: false, error: 'Invalid token' };
    }
    return { valid: false, error: 'Token verification failed' };
  }
}

/**
 * Decode token without verification (for debugging)
 */
export function decodeAccessToken(token: string): AccessTokenPayload | null {
  try {
    return jwt.decode(token) as AccessTokenPayload;
  } catch {
    return null;
  }
}

// ============================================================================
// REFRESH TOKEN FUNCTIONS
// ============================================================================

/**
 * Generate cryptographically secure refresh token
 * Returns both the token and its SHA-256 hash
 */
function generateRefreshTokenString(): { token: string; hash: string } {
  const token = randomBytes(32).toString('base64url');
  const hash = createHash('sha256').update(token).digest('hex');
  return { token, hash };
}

/**
 * Hash refresh token for storage
 */
function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Generate JWT refresh token with 7-day TTL
 * Stores hashed token in database with family tracking
 */
export async function generateRefreshToken(
  userId: string,
  familyId?: string,
  ipAddress?: string,
  userAgent?: string
): Promise<{ token: string; familyId: string }> {
  const JWT_REFRESH_SECRET = getJWTRefreshSecret();
  if (!JWT_REFRESH_SECRET || !supabase) {
    throw new Error('JWT_REFRESH_SECRET or Supabase not configured');
  }

  // Generate new family ID if not provided (new login)
  const tokenFamilyId = familyId || randomBytes(16).toString('hex');
  const tokenId = randomBytes(16).toString('hex');

  // Generate refresh token string
  const { hash: tokenHash } = generateRefreshTokenString();

  // Create JWT with metadata
  const payload: Omit<RefreshTokenPayload, 'iat' | 'exp'> = {
    userId,
    familyId: tokenFamilyId,
    tokenId,
  };

  const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_TOKEN_TTL,
    algorithm: 'HS256',
  });

  // Store token hash in database
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL * 1000);

  const { error } = await supabase
    .from('refresh_tokens')
    .insert({
      user_id: userId,
      token_hash: tokenHash,
      family_id: tokenFamilyId,
      expires_at: expiresAt.toISOString(),
      ip_address: ipAddress,
      user_agent: userAgent,
    } as never);

  if (error) {
    console.error('Failed to store refresh token:', error);
    throw new Error('Failed to create refresh token');
  }

  return { token: refreshToken, familyId: tokenFamilyId };
}

/**
 * Verify and rotate refresh token
 * Implements token rotation: old token is revoked, new token is issued
 * Detects token reuse attacks by checking if token was already used
 */
export async function refreshAccessToken(
  refreshToken: string,
  ipAddress?: string,
  userAgent?: string
): Promise<TokenPair | null> {
  const JWT_REFRESH_SECRET = getJWTRefreshSecret();
  if (!JWT_REFRESH_SECRET || !supabase) {
    throw new Error('JWT_REFRESH_SECRET or Supabase not configured');
  }

  try {
    // Verify JWT signature and expiration
    const payload = jwt.verify(refreshToken, JWT_REFRESH_SECRET, {
      algorithms: ['HS256'],
    }) as RefreshTokenPayload;

    const { userId, familyId } = payload;

    // Hash the token to look it up in database
    const tokenHash = hashRefreshToken(refreshToken);

    // Check if token exists and is not revoked
    type TokenRow = {
      id: string;
      user_id: string;
      revoked_at: string | null;
      expires_at: string;
    };

    const { data: tokenData, error: tokenError } = await supabase
      .from('refresh_tokens')
      .select('id, user_id, revoked_at, expires_at')
      .eq('token_hash', tokenHash)
      .maybeSingle();

    if (tokenError) {
      console.error('Error checking refresh token:', tokenError);
      return null;
    }

    const storedToken = tokenData as TokenRow | null;

    // Token not found - might be reuse attack
    if (!storedToken) {
      console.warn('Refresh token not found - possible reuse attack', { userId, familyId });
      
      // Revoke entire token family as security measure
      await revokeTokenFamily(familyId, 'security');
      await logAuthEvent('session_expired', userId, {
        reason: 'token_reuse_detected',
        family_id: familyId,
      });
      
      return null;
    }

    // Token already revoked - possible reuse attack
    if (storedToken.revoked_at) {
      console.warn('Refresh token already revoked - possible reuse attack', { userId, familyId });
      
      // Revoke entire token family
      await revokeTokenFamily(familyId, 'security');
      await logAuthEvent('session_expired', userId, {
        reason: 'revoked_token_reuse',
        family_id: familyId,
      });
      
      return null;
    }

    // Check expiration (double-check even though JWT verifies)
    if (new Date(storedToken.expires_at) < new Date()) {
      await revokeRefreshToken(tokenHash, 'expired');
      return null;
    }

    // Get user email for access token
    const { data: userData } = await supabase.auth.admin.getUserById(userId);
    if (!userData?.user?.email) {
      return null;
    }

    // Revoke old token (rotation)
    await revokeRefreshToken(tokenHash, 'rotation');

    // Generate new token pair with same family ID
    const accessToken = generateAccessToken(userId, userData.user.email);
    const { token: newRefreshToken } = await generateRefreshToken(
      userId,
      familyId, // Keep same family
      ipAddress,
      userAgent
    );

    // Log successful refresh
    await logAuthEvent('session_refresh', userId, {
      family_id: familyId,
      ip_address: ipAddress,
    });

    return {
      accessToken,
      refreshToken: newRefreshToken,
      expiresIn: ACCESS_TOKEN_TTL,
    };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      console.log('Refresh token expired');
      return null;
    }
    if (error instanceof jwt.JsonWebTokenError) {
      console.warn('Invalid refresh token');
      return null;
    }
    console.error('Error refreshing token:', error);
    return null;
  }
}

// ============================================================================
// TOKEN MANAGEMENT
// ============================================================================

/**
 * Revoke a specific refresh token
 */
export async function revokeRefreshToken(
  tokenHash: string,
  reason: string
): Promise<void> {
  if (!supabase) return;

  await supabase
    .from('refresh_tokens')
    .update({
      revoked_at: new Date().toISOString(),
      revoked_reason: reason,
    } as never)
    .eq('token_hash', tokenHash);
}

/**
 * Revoke all refresh tokens for a user (logout all devices)
 */
export async function revokeAllUserTokens(
  userId: string,
  reason: string = 'logout'
): Promise<number> {
  if (!supabase) return 0;

  const { data, error } = await supabase
    .rpc('revoke_all_user_tokens', {
      p_user_id: userId,
      p_reason: reason,
    } as never);

  if (error) {
    console.error('Error revoking user tokens:', error);
    return 0;
  }

  await logAuthEvent('logout', userId, { reason, all_devices: true });

  return data || 0;
}

/**
 * Revoke entire token family (security breach detection)
 */
export async function revokeTokenFamily(
  familyId: string,
  reason: string = 'security'
): Promise<number> {
  if (!supabase) return 0;

  const { data, error } = await supabase
    .rpc('revoke_token_family', {
      p_family_id: familyId,
      p_reason: reason,
    } as never);

  if (error) {
    console.error('Error revoking token family:', error);
    return 0;
  }

  return data || 0;
}

/**
 * Get active refresh tokens for a user
 */
export async function getUserActiveTokens(userId: string): Promise<Array<{
  id: string;
  createdAt: string;
  expiresAt: string;
  ipAddress: string | null;
  userAgent: string | null;
}>> {
  if (!supabase) return [];

  type TokenRow = {
    id: string;
    created_at: string;
    expires_at: string;
    ip_address: string | null;
    user_agent: string | null;
  };

  const { data, error } = await supabase
    .from('refresh_tokens')
    .select('id, created_at, expires_at, ip_address, user_agent')
    .eq('user_id', userId)
    .is('revoked_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching user tokens:', error);
    return [];
  }

  return (data as TokenRow[]).map(token => ({
    id: token.id,
    createdAt: token.created_at,
    expiresAt: token.expires_at,
    ipAddress: token.ip_address,
    userAgent: token.user_agent,
  }));
}

// ============================================================================
// COMPLETE AUTH FLOW
// ============================================================================

/**
 * Complete login flow: generate both access and refresh tokens
 */
export async function login(
  userId: string,
  email: string,
  ipAddress?: string,
  userAgent?: string
): Promise<TokenPair> {
  const accessToken = generateAccessToken(userId, email);
  const { token: refreshToken } = await generateRefreshToken(
    userId,
    undefined, // New family
    ipAddress,
    userAgent
  );

  await logAuthEvent('login_success', userId, {
    ip_address: ipAddress,
    user_agent: userAgent,
  });

  return {
    accessToken,
    refreshToken,
    expiresIn: ACCESS_TOKEN_TTL,
  };
}

/**
 * Complete logout flow: revoke all tokens
 */
export async function logout(userId: string): Promise<void> {
  await revokeAllUserTokens(userId, 'logout');
}

/**
 * Validate access token TTL is 15 minutes or less
 * Property 4: JWT Short TTL validation
 */
export function validateTokenTTL(token: string): boolean {
  const decoded = decodeAccessToken(token);
  if (!decoded || !decoded.exp || !decoded.iat) {
    return false;
  }

  const ttl = decoded.exp - decoded.iat;
  return ttl <= ACCESS_TOKEN_TTL;
}
