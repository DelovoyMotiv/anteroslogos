/**
 * JWT Authentication Middleware
 * Express/Vercel middleware for JWT token validation
 * Supports both access tokens and refresh token rotation
 */

import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, refreshAccessToken, type AccessTokenPayload } from './jwtAuth';

// Extend Express Request type to include user
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AccessTokenPayload;
      userId?: string;
    }
  }
}

/**
 * Extract JWT token from Authorization header
 */
function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return null;
  }

  // Support both "Bearer <token>" and just "<token>"
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  return authHeader;
}

/**
 * JWT Authentication Middleware
 * Validates access token and attaches user to request
 * 
 * Usage:
 *   app.get('/api/protected', requireAuth, (req, res) => {
 *     res.json({ userId: req.userId });
 *   });
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = extractToken(req);

  if (!token) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'No authentication token provided',
    });
    return;
  }

  const result = verifyAccessToken(token);

  if (!result.valid) {
    res.status(401).json({
      error: 'Unauthorized',
      message: result.error || 'Invalid token',
    });
    return;
  }

  // Attach user to request
  req.user = result.payload;
  req.userId = result.payload!.userId;

  next();
}

/**
 * Optional JWT Authentication Middleware
 * Validates token if present, but doesn't require it
 * Useful for endpoints that work for both authenticated and anonymous users
 * 
 * Usage:
 *   app.get('/api/public', optionalAuth, (req, res) => {
 *     if (req.userId) {
 *       // User is authenticated
 *     } else {
 *       // Anonymous user
 *     }
 *   });
 */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = extractToken(req);

  if (!token) {
    next();
    return;
  }

  const result = verifyAccessToken(token);

  if (result.valid) {
    req.user = result.payload;
    req.userId = result.payload!.userId;
  }

  next();
}

/**
 * Role-based authorization middleware
 * Requires authentication and specific role
 * 
 * Usage:
 *   app.delete('/api/admin/users', requireRole('admin'), (req, res) => {
 *     // Only admins can access
 *   });
 */
export function requireRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // First check authentication
    const token = extractToken(req);

    if (!token) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'No authentication token provided',
      });
      return;
    }

    const result = verifyAccessToken(token);

    if (!result.valid) {
      res.status(401).json({
        error: 'Unauthorized',
        message: result.error || 'Invalid token',
      });
      return;
    }

    // Attach user to request
    req.user = result.payload;
    req.userId = result.payload!.userId;

    // Check role
    const userRole = result.payload!.role;

    if (!userRole || !allowedRoles.includes(userRole)) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Insufficient permissions',
      });
      return;
    }

    next();
  };
}

/**
 * Refresh token endpoint handler
 * Handles token rotation and returns new token pair
 * 
 * Usage:
 *   app.post('/api/auth/refresh', handleRefreshToken);
 */
export async function handleRefreshToken(req: Request, res: Response): Promise<void> {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    res.status(400).json({
      error: 'Bad Request',
      message: 'Refresh token required',
    });
    return;
  }

  // Get client info for audit
  const ipAddress = req.ip || req.headers['x-forwarded-for'] as string || undefined;
  const userAgent = req.headers['user-agent'] || undefined;

  const tokens = await refreshAccessToken(refreshToken, ipAddress, userAgent);

  if (!tokens) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or expired refresh token',
    });
    return;
  }

  res.json({
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresIn: tokens.expiresIn,
    tokenType: 'Bearer',
  });
}

/**
 * Get current user info from token
 * Requires authentication
 * 
 * Usage:
 *   app.get('/api/auth/me', requireAuth, handleGetCurrentUser);
 */
export function handleGetCurrentUser(req: Request, res: Response): void {
  if (!req.user) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Not authenticated',
    });
    return;
  }

  res.json({
    userId: req.user.userId,
    email: req.user.email,
    role: req.user.role,
  });
}

/**
 * Logout endpoint handler
 * Revokes all refresh tokens for user
 * 
 * Usage:
 *   app.post('/api/auth/logout', requireAuth, handleLogout);
 */
export async function handleLogout(req: Request, res: Response): Promise<void> {
  if (!req.userId) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Not authenticated',
    });
    return;
  }

  const { logout } = await import('./jwtAuth');
  await logout(req.userId);

  res.json({
    message: 'Logged out successfully',
  });
}

/**
 * Logout all devices endpoint handler
 * Revokes all refresh tokens for user across all devices
 * 
 * Usage:
 *   app.post('/api/auth/logout-all', requireAuth, handleLogoutAll);
 */
export async function handleLogoutAll(req: Request, res: Response): Promise<void> {
  if (!req.userId) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Not authenticated',
    });
    return;
  }

  const { revokeAllUserTokens } = await import('./jwtAuth');
  const count = await revokeAllUserTokens(req.userId, 'logout_all_devices');

  res.json({
    message: 'Logged out from all devices',
    revokedTokens: count,
  });
}
