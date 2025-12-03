/**
 * Example: API Integration with Metrics
 * 
 * Shows how to integrate metrics into API endpoints
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withMetrics } from '../middleware';
import { recordAuditCompleted, recordPaymentTransaction } from '../index';

// Example 1: Using middleware wrapper (recommended)
export const handlerWithMiddleware = withMetrics(async function(req: VercelRequest, res: VercelResponse) {
  // Metrics are automatically tracked:
  // - Request count
  // - Request duration
  // - Status code
  // - Errors
  
  try {
    // Your business logic here
    const result = await performAudit(req.body.url);
    
    // Record custom business metrics
    recordAuditCompleted('success', result.duration);
    
    return res.status(200).json(result);
  } catch (error) {
    // Errors are automatically tracked
    recordAuditCompleted('failed', 0);
    return res.status(500).json({ error: 'Audit failed' });
  }
});

// Example 2: Manual metrics tracking
export async function handlerManual(req: VercelRequest, res: VercelResponse) {
  // @ts-expect-error - Reserved for future timing implementation
  const startTime = Date.now();
  
  try {
    const result = await processPayment(req.body);
    
    // Manually record metrics
    recordPaymentTransaction('success', 'USDC', result.amount);
    
    return res.status(200).json(result);
  } catch (error) {
    recordPaymentTransaction('failed', 'USDC', 0);
    return res.status(500).json({ error: 'Payment failed' });
  }
}

// Mock functions for example
async function performAudit(url: string) {
  return { url, score: 85, duration: 45.2 };
}

import type { PaymentData } from '../../../types/lib.types';

async function processPayment(_data: PaymentData) {
  return { amount: 100, status: 'success' };
}
