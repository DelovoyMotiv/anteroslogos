/**
 * CSRF Protection Module
 * Implements CSRF token generation, validation, and middleware
 * 
 * @module lib/security/csrf
 * @version 1.0.0
 */

import { randomBytes, createHmac, timingSafeEqual } from 'crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// =====================================================
// CONFIGURATION
// =====================================================

const CSRF_TOKEN_LENGTH = 32; // 256 bits
const CSRF_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const CSRF_COOKIE_NAME = 'csrf_token';
const CSRF_HEADER_NAME = 'x-csrf-token';

// Get CSRF secret from environment or generate one
const CSRF_SECRET = process.env.CSRF_SECRET || (() => {
  const secret = randomBytes(32).toString('hex');
  console.warn('CSRF_SECRET not set in environment. Using generated secret (not suitable for production with multiple instances)');
  return secret;
})();

// =====================================================
// TOKEN STORAGE
// =====================================================

interface CsrfTokenData {
  token: string;
  createdAt: number;
  sessionId?: string;
}

// In-memory store for CSRF tokens (use Redis in production for multi-instance deployments)
const tokenStore = new Map<string, CsrfTokenData>();

// Cleanup expired tokens every hour
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of tokenStore.entries()) {
    if (now - data.createdAt > CSRF_TOKEN_TTL_MS) {
      tokenStore.delete(key);
    }
  }
}, 60 * 60 * 1000);

// =====================================================
// TOKEN GENERATION
// =====================================================

/**
 * Generate a cryptographically secure CSRF token
 * Token is HMAC-signed to prevent tampering
 */
export function generateCsrfToken(sessionId?: string): string {
  const randomToken = randomBytes(CSRF_TOKEN_LENGTH).toString('hex');
  const timestamp = Date.now().toString();
  const payload = `${randomToken}:${timestamp}${sessionId ? `:${sessionId}` : ''}`;
  
  // Sign the token with HMAC
  const signature = createHmac('sha256', CSRF_SECRET)
    .update(payload)
    .digest('hex');
  
  const token = `${payload}:${signature}`;
  
  // Store token
  tokenStore.set(randomToken, {
    token,
    createdAt: Date.now(),
    sessionId,
  });
  
  return token;
}

// =====================================================
// TOKEN VALIDATION
// =====================================================

/**
 * Validate CSRF token
 * Checks signature, expiration, and session binding
 */
export function validateCsrfToken(
  token: string,
  sessionId?: string
): { valid: boolean; reason?: string } {
  if (!token) {
    return { valid: false, reason: 'Token is missing' };
  }
  
  const parts = token.split(':');
  if (parts.length < 3) {
    return { valid: false, reason: 'Token format is invalid' };
  }
  
  const [randomToken, timestamp, ...rest] = parts;
  const signature = rest.pop();
  const tokenSessionId = rest.join(':') || undefined;
  
  // Reconstruct payload
  const payload = `${randomToken}:${timestamp}${tokenSessionId ? `:${tokenSessionId}` : ''}`;
  
  // Verify signature
  const expectedSignature = createHmac('sha256', CSRF_SECRET)
    .update(payload)
    .digest('hex');
  
  if (!timingSafeEqual(Buffer.from(signature!), Buffer.from(expectedSignature))) {
    return { valid: false, reason: 'Token signature is invalid' };
  }
  
  // Check expiration
  const tokenAge = Date.now() - parseInt(timestamp, 10);
  if (tokenAge > CSRF_TOKEN_TTL_MS) {
    tokenStore.delete(randomToken);
    return { valid: false, reason: 'Token has expired' };
  }
  
  // Check if token exists in store
  const storedData = tokenStore.get(randomToken);
  if (!storedData) {
    return { valid: false, reason: 'Token not found in store' };
  }
  
  // Verify session binding if provided
  if (sessionId && tokenSessionId && sessionId !== tokenSessionId) {
    return { valid: false, reason: 'Token session mismatch' };
  }
  
  return { valid: true };
}

/**
 * Consume (invalidate) a CSRF token after successful use
 * Prevents token reuse attacks
 */
export function consumeCsrfToken(token: string): void {
  if (!token) return;
  
  const parts = token.split(':');
  if (parts.length >= 3) {
    const randomToken = parts[0];
    tokenStore.delete(randomToken);
  }
}

// =====================================================
// COOKIE HELPERS
// =====================================================

/**
 * Set CSRF token cookie with secure options
 */
export function setCsrfCookie(res: VercelResponse, token: string): void {
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Cookie options for maximum security
  const cookieOptions = [
    `${CSRF_COOKIE_NAME}=${token}`,
    'HttpOnly', // Prevent JavaScript access
    'SameSite=Strict', // Strict CSRF protection
    `Max-Age=${CSRF_TOKEN_TTL_MS / 1000}`,
    'Path=/',
  ];
  
  // Add Secure flag in production (requires HTTPS)
  if (isProduction) {
    cookieOptions.push('Secure');
  }
  
  res.setHeader('Set-Cookie', cookieOptions.join('; '));
}

/**
 * Get CSRF token from cookie
 */
export function getCsrfTokenFromCookie(req: VercelRequest): string | null {
  const cookies = req.headers.cookie;
  if (!cookies) return null;
  
  const match = cookies.match(new RegExp(`${CSRF_COOKIE_NAME}=([^;]+)`));
  return match ? match[1] : null;
}

/**
 * Get CSRF token from header
 */
export function getCsrfTokenFromHeader(req: VercelRequest): string | null {
  return (req.headers[CSRF_HEADER_NAME] as string) || null;
}

// =====================================================
// ORIGIN/REFERER VALIDATION
// =====================================================

/**
 * Validate Origin or Referer header matches expected domain
 */
export function validateOrigin(req: VercelRequest): { valid: boolean; reason?: string } {
  const origin = req.headers.origin as string | undefined;
  const referer = req.headers.referer as string | undefined;
  const host = req.headers.host as string | undefined;
  
  // For same-origin requests, origin might be null
  // In that case, check referer
  const sourceUrl = origin || referer;
  
  if (!sourceUrl) {
    // If neither origin nor referer is present, reject
    // (except for safe methods like GET, which don't need CSRF protection)
    return { valid: false, reason: 'Missing Origin and Referer headers' };
  }
  
  try {
    const sourceHost = new URL(sourceUrl).host;
    
    // Check if source host matches request host
    if (sourceHost !== host) {
      return { valid: false, reason: `Origin mismatch: ${sourceHost} !== ${host}` };
    }
    
    return { valid: true };
  } catch (error) {
    return { valid: false, reason: 'Invalid Origin or Referer URL' };
  }
}

// =====================================================
// CSRF MIDDLEWARE
// =====================================================

/**
 * CSRF protection middleware
 * Validates CSRF tokens on state-changing requests (POST, PUT, DELETE, PATCH)
 */
export function withCsrfProtection(
  handler: (req: VercelRequest, res: VercelResponse) => Promise<void> | void,
  options: {
    excludeMethods?: string[];
    excludePaths?: string[];
    requireSessionBinding?: boolean;
  } = {}
) {
  const {
    excludeMethods = ['GET', 'HEAD', 'OPTIONS'],
    excludePaths = [],
    requireSessionBinding = false,
  } = options;
  
  return async (req: VercelRequest, res: VercelResponse) => {
    const method = req.method || 'GET';
    const path = new URL(req.url || '', `http://${req.headers.host}`).pathname;
    
    // Skip CSRF check for safe methods
    if (excludeMethods.includes(method)) {
      return handler(req, res);
    }
    
    // Skip CSRF check for excluded paths
    if (excludePaths.some(p => path.startsWith(p))) {
      return handler(req, res);
    }
    
    // Validate Origin/Referer
    const originValidation = validateOrigin(req);
    if (!originValidation.valid) {
      return res.status(403).json({
        error: 'CSRF validation failed',
        reason: originValidation.reason,
        code: 'INVALID_ORIGIN',
      });
    }
    
    // Get CSRF token from header
    const tokenFromHeader = getCsrfTokenFromHeader(req);
    if (!tokenFromHeader) {
      return res.status(403).json({
        error: 'CSRF validation failed',
        reason: 'CSRF token missing from request header',
        code: 'MISSING_CSRF_TOKEN',
        hint: `Include CSRF token in ${CSRF_HEADER_NAME} header`,
      });
    }
    
    // Get session ID if session binding is required
    let sessionId: string | undefined;
    if (requireSessionBinding) {
      // Extract session ID from Authorization header or cookie
      const authHeader = req.headers.authorization as string | undefined;
      if (authHeader?.startsWith('Bearer ')) {
        // Extract session ID from JWT (simplified - in production, decode JWT properly)
        sessionId = authHeader.substring(7);
      }
    }
    
    // Validate CSRF token
    const validation = validateCsrfToken(tokenFromHeader, sessionId);
    if (!validation.valid) {
      return res.status(403).json({
        error: 'CSRF validation failed',
        reason: validation.reason,
        code: 'INVALID_CSRF_TOKEN',
      });
    }
    
    // Token is valid - proceed with request
    return handler(req, res);
  };
}

/**
 * Middleware to generate and set CSRF token
 * Should be used on endpoints that render forms or return session data
 */
export function withCsrfTokenGeneration(
  handler: (req: VercelRequest, res: VercelResponse, csrfToken: string) => Promise<void> | void
) {
  return async (req: VercelRequest, res: VercelResponse) => {
    // Check if token already exists in cookie
    let token = getCsrfTokenFromCookie(req);
    
    // If no token exists or it's invalid, generate a new one
    if (!token || !validateCsrfToken(token).valid) {
      // Extract session ID if available
      const authHeader = req.headers.authorization as string | undefined;
      const sessionId = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined;
      
      token = generateCsrfToken(sessionId);
      setCsrfCookie(res, token);
    }
    
    return handler(req, res, token);
  };
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

/**
 * Get CSRF token for client-side use
 * Returns existing token from cookie or generates a new one
 */
export function getCsrfToken(req: VercelRequest): string {
  const existingToken = getCsrfTokenFromCookie(req);
  
  if (existingToken && validateCsrfToken(existingToken).valid) {
    return existingToken;
  }
  
  // Generate new token if none exists or existing is invalid
  return generateCsrfToken();
}

/**
 * Clear CSRF token (on logout)
 */
export function clearCsrfToken(res: VercelResponse): void {
  res.setHeader('Set-Cookie', `${CSRF_COOKIE_NAME}=; HttpOnly; SameSite=Strict; Max-Age=0; Path=/`);
}
