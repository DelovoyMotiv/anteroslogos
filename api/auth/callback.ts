/**
 * Auth Callback Handler
 * Handles Supabase email verification and magic link redirects
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only accept GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { token_hash, type, next } = req.query;

    // Validate required parameters
    if (!token_hash || !type) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Determine redirect URL based on type
    let redirectUrl = '/dashboard';

    if (type === 'signup') {
      redirectUrl = '/dashboard?welcome=true';
    } else if (type === 'magiclink') {
      redirectUrl = next ? String(next) : '/dashboard';
    } else if (type === 'recovery') {
      redirectUrl = '/auth/reset-password';
    }

    // Build final redirect with token
    const baseUrl = req.headers.host?.includes('localhost')
      ? `http://${req.headers.host}`
      : `https://${req.headers.host}`;

    const callbackUrl = `${baseUrl}${redirectUrl}#access_token=${token_hash}&type=${type}`;

    // Redirect to frontend with token in hash
    return res.redirect(307, callbackUrl);
  } catch (error: any) {
    console.error('Auth callback error:', error);
    
    // Redirect to error page
    return res.redirect(307, '/auth/error?message=verification_failed');
  }
}
