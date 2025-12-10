/**
 * Stripe Webhook Handler
 * Processes Stripe events for credit purchases
 * 
 * This is a Vercel serverless function that handles Stripe webhooks
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { BillingService } from '../lib/billing/BillingService';
import { verifyWebhookSignature, processWebhookEvent } from '../lib/billing/stripe';
import { WebhookRetryService } from '../lib/billing/webhookRetry';

/**
 * Webhook endpoint handler
 * POST /api/stripe-webhook
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // Only accept POST requests
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  
  try {
    // Get the raw body and signature
    const signature = req.headers['stripe-signature'];
    
    if (!signature || typeof signature !== 'string') {
      res.status(400).json({ error: 'Missing stripe-signature header' });
      return;
    }
    
    // Get raw body (Vercel provides this as req.body when it's a Buffer)
    const rawBody = req.body;
    
    // Verify webhook signature
    const event = verifyWebhookSignature(rawBody, signature);
    
    // Initialize billing service and retry service
    const billingService = new BillingService();
    const retryService = new WebhookRetryService(billingService);
    
    try {
      // Process the event
      await processWebhookEvent(event, billingService);
      
      // Return success
      res.status(200).json({ received: true, eventType: event.type });
    } catch (processingError) {
      // Processing failed, queue for retry
      console.error('Webhook processing failed, queueing for retry:', processingError);
      
      const retryResult = await retryService.queueRetry(
        event,
        processingError instanceof Error ? processingError : new Error('Unknown error')
      );
      
      if (retryResult.success) {
        console.log(`Webhook ${event.id} queued for retry (job ID: ${retryResult.jobId})`);
        // Return 200 to prevent Stripe's built-in retry (we handle retries ourselves)
        res.status(200).json({ 
          received: true, 
          eventType: event.type,
          queued_for_retry: true,
          retry_job_id: retryResult.jobId
        });
      } else {
        // Failed to queue retry, return 500 so Stripe will retry
        console.error('Failed to queue webhook for retry:', retryResult.error);
        res.status(500).json({ error: 'Processing failed and retry queue unavailable' });
      }
    }
  } catch (error) {
    console.error('Stripe webhook error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Return error but with 200 status to prevent Stripe retries for invalid requests
    if (errorMessage.includes('signature verification failed')) {
      res.status(400).json({ error: 'Invalid signature' });
    } else {
      // Return 500 for processing errors so Stripe will retry
      res.status(500).json({ error: errorMessage });
    }
  }
}

// Configure to receive raw body for signature verification
export const config = {
  api: {
    bodyParser: false,
  },
};
