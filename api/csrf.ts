/**
 * CSRF Token Endpoint
 * GET /api/csrf - Returns CSRF token for client-side use
 * 
 * @module api/csrf
 * @version 1.0.0
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withCors, withCsrfTokenGeneration, compose } from '../lib/validation/middleware';

/**
 * Main handler - returns CSRF token
 */
async function mainHandler(
  req: VercelRequest,
  res: VercelResponse,
  csrfToken: string
) {
  // GET - Return CSRF token
  if (req.method === 'GET') {
    return res.status(200).json({
      csrfToken,
      expiresIn: 24 * 60 * 60, // 24 hours in seconds
      headerName: 'x-csrf-token',
      cookieName: 'csrf_token',
    });
  }
  
  // Method not allowed
  return res.status(405).json({
    error: 'Method not allowed',
    allowed: ['GET'],
  });
}

// Apply middleware: CORS -> CSRF Token Generation
export default compose(
  withCors,
  withCsrfTokenGeneration
import type { ApiHandler } from '../types/api.types';

)(mainHandler as ApiHandler);
