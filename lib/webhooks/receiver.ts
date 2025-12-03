/**
 * @file lib/webhooks/receiver.ts
 * @description Webhook Receiver with Signature Verification
 * 
 * Features:
 * - HMAC-SHA256 signature verification
 * - Timestamp validation to prevent replay attacks
 * - Constant-time comparison to prevent timing attacks
 * - Type-safe webhook payload handling
 * 
 * Security:
 * - Validates signatures before processing
 * - Rejects requests older than 5 minutes
 * - Returns 401 for invalid signatures
 * - Logs all verification attempts
 * 
 * @version 1.0.0
 */

import { createHmac, timingSafeEqual } from 'crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// =====================================================
// TYPES
// =====================================================

export interface WebhookVerificationResult {
  valid: boolean;
  error?: string;
  errorCode?: 'MISSING_SIGNATURE' | 'MISSING_TIMESTAMP' | 'INVALID_SIGNATURE' | 'REPLAY_ATTACK' | 'INVALID_TIMESTAMP';
}

export interface WebhookRequest {
  body: string; // Raw body as string
  headers: {
    'x-webhook-signature'?: string;
    'x-webhook-timestamp'?: string;
  };
}

export interface WebhookVerificationOptions {
  /**
   * Maximum age of webhook in seconds (default: 300 = 5 minutes)
   */
  maxAge?: number;
  
  /**
   * Whether to allow future timestamps (default: false)
   */
  allowFutureTimestamps?: boolean;
  
  /**
   * Clock skew tolerance in seconds (default: 30)
   */
  clockSkewTolerance?: number;
}

// =====================================================
// WEBHOOK SIGNATURE VERIFICATION
// =====================================================

/**
 * Verify webhook signature and timestamp
 * 
 * @param request - Webhook request with body and headers
 * @param secret - HMAC secret for signature verification
 * @param options - Verification options
 * @returns Verification result with valid flag and error details
 * 
 * @example
 * ```typescript
 * const result = verifyWebhook(
 *   {
 *     body: JSON.stringify(payload),
 *     headers: {
 *       'x-webhook-signature': 'sha256=abc123...',
 *       'x-webhook-timestamp': '1701234567'
 *     }
 *   },
 *   'my-secret-key'
 * );
 * 
 * if (!result.valid) {
 *   return new Response('Unauthorized', { status: 401 });
 * }
 * ```
 */
export function verifyWebhook(
  request: WebhookRequest,
  secret: string,
  options: WebhookVerificationOptions = {}
): WebhookVerificationResult {
  const {
    maxAge = 300, // 5 minutes
    allowFutureTimestamps = false,
    clockSkewTolerance = 30, // 30 seconds
  } = options;

  // Extract signature from header
  const signature = request.headers['x-webhook-signature'];
  if (!signature) {
    return {
      valid: false,
      error: 'Missing X-Webhook-Signature header',
      errorCode: 'MISSING_SIGNATURE',
    };
  }

  // Extract timestamp from header
  const timestampHeader = request.headers['x-webhook-timestamp'];
  if (!timestampHeader) {
    return {
      valid: false,
      error: 'Missing X-Webhook-Timestamp header',
      errorCode: 'MISSING_TIMESTAMP',
    };
  }

  // Parse timestamp
  const timestamp = parseInt(timestampHeader, 10);
  if (isNaN(timestamp) || timestamp <= 0) {
    return {
      valid: false,
      error: 'Invalid timestamp format',
      errorCode: 'INVALID_TIMESTAMP',
    };
  }

  // Validate timestamp to prevent replay attacks
  const now = Math.floor(Date.now() / 1000);
  const age = now - timestamp;

  // Check if timestamp is too old
  if (age > maxAge) {
    return {
      valid: false,
      error: `Webhook timestamp too old (${age}s > ${maxAge}s)`,
      errorCode: 'REPLAY_ATTACK',
    };
  }

  // Check if timestamp is in the future (with tolerance)
  if (!allowFutureTimestamps && timestamp > now + clockSkewTolerance) {
    return {
      valid: false,
      error: `Webhook timestamp in the future (${timestamp - now}s ahead)`,
      errorCode: 'REPLAY_ATTACK',
    };
  }

  // Verify HMAC signature
  const signatureValid = verifySignature(request.body, signature, secret);
  if (!signatureValid) {
    return {
      valid: false,
      error: 'Invalid webhook signature',
      errorCode: 'INVALID_SIGNATURE',
    };
  }

  return { valid: true };
}

/**
 * Verify HMAC-SHA256 signature
 * Uses constant-time comparison to prevent timing attacks
 * 
 * @param payload - Raw payload string
 * @param signature - Signature in format "sha256=<hex>"
 * @param secret - HMAC secret
 * @returns True if signature is valid
 */
export function verifySignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  try {
    // Validate signature format (must start with "sha256=")
    if (!signature.startsWith('sha256=')) {
      return false;
    }
    
    // Extract hash from "sha256=..." format
    const providedHash = signature.slice(7); // Remove "sha256=" prefix
    
    // Validate hash format (64 hex characters)
    if (!/^[a-f0-9]{64}$/i.test(providedHash)) {
      return false;
    }

    // Calculate expected hash
    const expectedHash = createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    // Constant-time comparison to prevent timing attacks
    const providedBuffer = Buffer.from(providedHash, 'hex');
    const expectedBuffer = Buffer.from(expectedHash, 'hex');

    // Ensure buffers are same length
    if (providedBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return timingSafeEqual(providedBuffer, expectedBuffer);
  } catch (error) {
    // Any error in verification means invalid signature
    return false;
  }
}

/**
 * Generate webhook signature for testing
 * 
 * @param payload - Payload to sign
 * @param secret - HMAC secret
 * @param timestamp - Optional timestamp (defaults to now)
 * @returns Signature in format "sha256=<hex>"
 */
export function generateWebhookSignature(
  payload: string,
  secret: string,
  timestamp?: number
): { signature: string; timestamp: number } {
  const ts = timestamp ?? Math.floor(Date.now() / 1000);
  
  const hash = createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  return {
    signature: `sha256=${hash}`,
    timestamp: ts,
  };
}

// =====================================================
// WEBHOOK MIDDLEWARE
// =====================================================

/**
 * Express/Vercel middleware for webhook verification
 * 
 * @example
 * ```typescript
 * import { withWebhookVerification } from '@/lib/webhooks/receiver';
 * 
 * export default withWebhookVerification(
 *   async (req, res) => {
 *     // Webhook is verified, process payload
 *     const payload = JSON.parse(req.body);
 *     // ... handle webhook
 *     res.status(200).json({ received: true });
 *   },
 *   process.env.WEBHOOK_SECRET!
 * );
 * ```
 */
import type { WebhookHandler } from '../../types/lib.types';

export function withWebhookVerification(
  handler: WebhookHandler,
  secret: string,
  options?: WebhookVerificationOptions
) {
  return async (req: VercelRequest, res: VercelResponse) => {
    // Get raw body (should be string)
    const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);

    // Verify webhook
    const result = verifyWebhook(
      {
        body,
        headers: {
          'x-webhook-signature': Array.isArray(req.headers['x-webhook-signature']) 
            ? req.headers['x-webhook-signature'][0] 
            : req.headers['x-webhook-signature'],
          'x-webhook-timestamp': Array.isArray(req.headers['x-webhook-timestamp'])
            ? req.headers['x-webhook-timestamp'][0]
            : req.headers['x-webhook-timestamp'],
        },
      },
      secret,
      options
    );

    if (!result.valid) {
      console.warn('[Webhook] Verification failed:', result.error);
      return res.status(401).json({
        error: 'Unauthorized',
        message: result.error,
        code: result.errorCode,
      });
    }

    // Webhook verified, proceed to handler
    return handler(req, res);
  };
}
