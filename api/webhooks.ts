/**
 * @file api/webhooks.ts
 * @description Generic Webhook Receiver Endpoint
 * 
 * This endpoint demonstrates webhook signature verification.
 * Actual webhook handlers should be implemented in separate endpoints.
 * 
 * @version 1.0.0
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyWebhook } from '../lib/webhooks/receiver';

/**
 * Generic webhook receiver with signature verification
 * 
 * Security:
 * - Validates HMAC-SHA256 signature
 * - Checks timestamp to prevent replay attacks
 * - Returns 401 for invalid signatures
 * 
 * Usage:
 * POST /api/webhooks
 * Headers:
 *   X-Webhook-Signature: sha256=<hmac-sha256-hex>
 *   X-Webhook-Timestamp: <unix-timestamp>
 * Body: <json-payload>
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get webhook secret from environment
    const secret = process.env.WEBHOOK_SECRET;
    if (!secret) {
      console.error('[Webhook] WEBHOOK_SECRET not configured');
      return res.status(500).json({ error: 'Webhook secret not configured' });
    }

    // Get raw body
    const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);

    // Verify webhook signature and timestamp
    const verification = verifyWebhook(
      {
        body,
        headers: {
          'x-webhook-signature': req.headers['x-webhook-signature'] as string,
          'x-webhook-timestamp': req.headers['x-webhook-timestamp'] as string,
        },
      },
      secret,
      {
        maxAge: 300, // 5 minutes
        allowFutureTimestamps: false,
        clockSkewTolerance: 30, // 30 seconds
      }
    );

    // Return 401 for invalid signatures
    if (!verification.valid) {
      console.warn('[Webhook] Verification failed:', verification.error);
      return res.status(401).json({
        error: 'Unauthorized',
        message: verification.error,
        code: verification.errorCode,
      });
    }

    // Parse payload
    const payload = JSON.parse(body);

    // Log successful webhook receipt
    console.log('[Webhook] Received verified webhook:', {
      event: payload.event,
      timestamp: req.headers['x-webhook-timestamp'],
    });

    // Process webhook based on event type
    // In production, route to specific handlers based on payload.event
    switch (payload.event) {
      case 'job.completed':
        // Handle job completion
        break;
      case 'job.failed':
        // Handle job failure
        break;
      case 'batch.completed':
        // Handle batch completion
        break;
      default:
        console.warn('[Webhook] Unknown event type:', payload.event);
    }

    // Return success
    return res.status(200).json({
      received: true,
      event: payload.event,
    });
  } catch (error) {
    console.error('[Webhook] Error processing webhook:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
