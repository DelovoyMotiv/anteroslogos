/**
 * Stripe Integration for CCC Credit Purchases
 * Handles checkout session creation and webhook processing
 */

import Stripe from 'stripe';
import { BillingService } from './BillingService';

// Anchor price: 100 CCC = $20 USD, so 1 CCC = $0.20
export const ANCHOR_PRICE_USD_PER_CCC = 0.20;

/**
 * Credit package configuration
 */
export interface CreditPackage {
  id: string;
  name: string;
  cccAmount: number;
  usdCost: number;
  stripePriceId?: string;
}

/**
 * Initialize Stripe client
 */
function getStripeClient(): Stripe {
  const apiKey = process.env.STRIPE_SECRET_KEY;
  
  if (!apiKey) {
    throw new Error('Missing STRIPE_SECRET_KEY environment variable');
  }
  
  return new Stripe(apiKey, {
    apiVersion: '2025-11-17.clover',
    typescript: true,
  });
}

/**
 * Calculate CCC amount from USD payment amount
 * Uses the anchor price: amount / 0.20
 */
export function calculateCCCFromUSD(usdAmount: number): number {
  if (usdAmount <= 0) {
    throw new Error('USD amount must be positive');
  }
  
  return usdAmount / ANCHOR_PRICE_USD_PER_CCC;
}

/**
 * Calculate USD amount from CCC
 */
export function calculateUSDFromCCC(cccAmount: number): number {
  if (cccAmount <= 0) {
    throw new Error('CCC amount must be positive');
  }
  
  return cccAmount * ANCHOR_PRICE_USD_PER_CCC;
}

/**
 * Create Stripe checkout session for credit purchase
 */
export async function createCheckoutSession(
  userId: string,
  packageId: string,
  packageName: string,
  cccAmount: number,
  usdCost: number,
  successUrl: string,
  cancelUrl: string
): Promise<{ sessionId: string; url: string }> {
  const stripe = getStripeClient();
  
  // Convert USD cost to cents for Stripe
  const amountInCents = Math.round(usdCost * 100);
  
  // Create checkout session
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: packageName,
            description: `${cccAmount} CCC Credits`,
          },
          unit_amount: amountInCents,
        },
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      user_id: userId,
      package_id: packageId,
      package_name: packageName,
      ccc_amount: cccAmount.toString(),
    },
  });
  
  if (!session.id || !session.url) {
    throw new Error('Failed to create Stripe checkout session');
  }
  
  return {
    sessionId: session.id,
    url: session.url,
  };
}

/**
 * Verify Stripe webhook signature
 */
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  const stripe = getStripeClient();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  if (!webhookSecret) {
    throw new Error('Missing STRIPE_WEBHOOK_SECRET environment variable');
  }
  
  try {
    return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (error) {
    throw new Error(`Webhook signature verification failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Handle checkout.session.completed webhook event
 */
export async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
  billingService: BillingService
): Promise<void> {
  // Extract metadata
  const userId = session.metadata?.user_id;
  const packageId = session.metadata?.package_id;
  const packageName = session.metadata?.package_name;
  const cccAmountStr = session.metadata?.ccc_amount;
  
  if (!userId || !cccAmountStr) {
    throw new Error('Missing required metadata in checkout session');
  }
  
  const cccAmount = parseFloat(cccAmountStr);
  
  if (isNaN(cccAmount) || cccAmount <= 0) {
    throw new Error('Invalid CCC amount in metadata');
  }
  
  // Verify payment was successful
  if (session.payment_status !== 'paid') {
    throw new Error(`Payment not completed. Status: ${session.payment_status}`);
  }
  
  // Get the amount paid (in cents)
  const amountPaidCents = session.amount_total;
  
  if (!amountPaidCents) {
    throw new Error('Missing amount_total in session');
  }
  
  // Convert to USD
  const amountPaidUSD = amountPaidCents / 100;
  
  // Calculate CCC from payment amount as verification
  const calculatedCCC = calculateCCCFromUSD(amountPaidUSD);
  
  // Use the metadata CCC amount (which should match calculated)
  // Log if there's a discrepancy
  if (Math.abs(calculatedCCC - cccAmount) > 0.01) {
    console.warn(
      `CCC amount mismatch: metadata=${cccAmount}, calculated=${calculatedCCC}, using metadata value`
    );
  }
  
  // Deposit credits to user account
  await billingService.depositCredits(
    userId,
    cccAmount,
    'DEPOSIT_STRIPE',
    {
      package_id: packageId,
      package_name: packageName,
      stripe_session_id: session.id,
      stripe_payment_intent: session.payment_intent,
      amount_paid_usd: amountPaidUSD,
      amount_paid_cents: amountPaidCents,
    }
  );
  
  console.log(
    `Successfully processed Stripe payment for user ${userId}: ${cccAmount} CCC from ${packageName}`
  );
}

/**
 * Process Stripe webhook event
 */
export async function processWebhookEvent(
  event: Stripe.Event,
  billingService: BillingService
): Promise<void> {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      await handleCheckoutCompleted(session, billingService);
      break;
    }
    
    case 'payment_intent.succeeded': {
      // Optional: handle payment_intent.succeeded for additional verification
      console.log('Payment intent succeeded:', event.data.object.id);
      break;
    }
    
    default:
      console.log(`Unhandled webhook event type: ${event.type}`);
  }
}
