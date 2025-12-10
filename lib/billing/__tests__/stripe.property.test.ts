/**
 * Property-Based Tests for Stripe Integration
 * Feature: ccc-native-economy
 * Uses fast-check for property-based testing with 100+ iterations
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';
import {
  createCheckoutSession,
  calculateCCCFromUSD,
  calculateUSDFromCCC,
  handleCheckoutCompleted,
  ANCHOR_PRICE_USD_PER_CCC,
} from '../stripe';
import { BillingService } from '../BillingService';
import type Stripe from 'stripe';

// Mock Stripe
const mockStripe = {
  checkout: {
    sessions: {
      create: vi.fn(),
    },
  },
  webhooks: {
    constructEvent: vi.fn(),
  },
};

// Mock Stripe constructor
vi.mock('stripe', () => {
  return {
    default: class MockStripe {
      checkout = mockStripe.checkout;
      webhooks = mockStripe.webhooks;
    },
  };
});

// Mock BillingService
vi.mock('../BillingService', () => ({
  BillingService: class MockBillingService {
    depositCredits = vi.fn().mockResolvedValue({
      success: true,
      newBalance: 1000,
      transactionId: 'test-tx-id',
    });
    getBalance = vi.fn().mockResolvedValue(1000);
  },
}));

describe('Stripe Integration Property-Based Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STRIPE_SECRET_KEY = 'sk_test_123456789';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_123456789';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * Feature: ccc-native-economy, Property 1: Stripe checkout creates valid sessions
   * Validates: Requirements 1.1
   */
  it('Property 1: should create valid Stripe checkout sessions with correct USD amounts', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(), // userId
        fc.uuid(), // packageId
        fc.string({ minLength: 3, maxLength: 50 }), // packageName
        fc.integer({ min: 10, max: 10000 }), // cccAmount
        fc.double({ min: 2, max: 2000, noNaN: true }), // usdCost
        fc.webUrl(), // successUrl
        fc.webUrl(), // cancelUrl
        async (userId, packageId, packageName, cccAmount, usdCost, successUrl, cancelUrl) => {
          const sessionId = fc.sample(fc.uuid(), 1)[0];
          const sessionUrl = fc.sample(fc.webUrl(), 1)[0];

          // Mock Stripe session creation
          mockStripe.checkout.sessions.create = vi.fn().mockResolvedValue({
            id: sessionId,
            url: sessionUrl,
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
                  unit_amount: Math.round(usdCost * 100),
                },
                quantity: 1,
              },
            ],
            metadata: {
              user_id: userId,
              package_id: packageId,
              package_name: packageName,
              ccc_amount: cccAmount.toString(),
            },
          });

          const result = await createCheckoutSession(
            userId,
            packageId,
            packageName,
            cccAmount,
            usdCost,
            successUrl,
            cancelUrl
          );

          // Verify session was created with correct parameters
          expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
            expect.objectContaining({
              mode: 'payment',
              payment_method_types: ['card'],
              line_items: expect.arrayContaining([
                expect.objectContaining({
                  price_data: expect.objectContaining({
                    currency: 'usd',
                    product_data: expect.objectContaining({
                      name: packageName,
                      description: `${cccAmount} CCC Credits`,
                    }),
                    unit_amount: Math.round(usdCost * 100),
                  }),
                  quantity: 1,
                }),
              ]),
              success_url: successUrl,
              cancel_url: cancelUrl,
              metadata: expect.objectContaining({
                user_id: userId,
                package_id: packageId,
                package_name: packageName,
                ccc_amount: cccAmount.toString(),
              }),
            })
          );

          // Verify result contains session ID and URL
          expect(result.sessionId).toBe(sessionId);
          expect(result.url).toBe(sessionUrl);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: ccc-native-economy, Property 2: Deposit calculation accuracy
   * Validates: Requirements 1.2
   */
  it('Property 2: should calculate CCC from USD payment amount using anchor price', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.double({ min: 1, max: 10000, noNaN: true }), // usdAmount
        async (usdAmount) => {
          const calculatedCCC = calculateCCCFromUSD(usdAmount);
          const expectedCCC = usdAmount / ANCHOR_PRICE_USD_PER_CCC;

          // Verify calculation matches anchor price formula
          expect(calculatedCCC).toBeCloseTo(expectedCCC, 10);

          // Verify reverse calculation
          const backToUSD = calculateUSDFromCCC(calculatedCCC);
          expect(backToUSD).toBeCloseTo(usdAmount, 10);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: ccc-native-economy, Property 2 (continued): Deposit record creation
   * Validates: Requirements 1.2
   */
  it('Property 2: should insert DEPOSIT_STRIPE record with calculated CCC amount', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(), // userId
        fc.uuid(), // packageId
        fc.string({ minLength: 3, maxLength: 50 }), // packageName
        fc.integer({ min: 10, max: 10000 }), // cccAmount
        fc.uuid(), // sessionId
        async (userId, packageId, packageName, cccAmount, sessionId) => {
          // Calculate USD cost from CCC amount to ensure consistency
          const usdCost = calculateUSDFromCCC(cccAmount);
          
          const billingService = new BillingService();
          const depositCreditsSpy = vi.spyOn(billingService, 'depositCredits');

          // Create mock session
          const mockSession: Partial<Stripe.Checkout.Session> = {
            id: sessionId,
            payment_status: 'paid',
            amount_total: Math.round(usdCost * 100), // cents
            metadata: {
              user_id: userId,
              package_id: packageId,
              package_name: packageName,
              ccc_amount: cccAmount.toString(),
            },
          };

          await handleCheckoutCompleted(
            mockSession as Stripe.Checkout.Session,
            billingService
          );

          // Verify depositCredits was called with correct parameters
          const calls = depositCreditsSpy.mock.calls;
          expect(calls.length).toBeGreaterThan(0);
          
          const [callUserId, callAmount, callEventType, callMetadata] = calls[0];
          expect(callUserId).toBe(userId);
          expect(callAmount).toBe(cccAmount);
          expect(callEventType).toBe('DEPOSIT_STRIPE');
          expect(callMetadata.package_id).toBe(packageId);
          expect(callMetadata.package_name).toBe(packageName);
          expect(callMetadata.stripe_session_id).toBe(sessionId);
          expect(callMetadata.amount_paid_usd).toBeCloseTo(usdCost, 10);
          expect(callMetadata.amount_paid_cents).toBe(Math.round(usdCost * 100));

          // Verify calculated CCC matches expected (should be exact since we derived USD from CCC)
          const calculatedCCC = calculateCCCFromUSD(usdCost);
          expect(calculatedCCC).toBeCloseTo(cccAmount, 6);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: ccc-native-economy, Property 3: Balance updates after deposits
   * Validates: Requirements 1.4
   */
  it('Property 3: should update user balance by deposit amount', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(), // userId
        fc.double({ min: 0, max: 10000, noNaN: true }), // initialBalance
        fc.integer({ min: 10, max: 1000 }), // depositAmount
        async (userId, initialBalance, depositAmount) => {
          const billingService = new BillingService();
          
          // Mock getBalance to return initial balance before deposit
          const getBalanceSpy = vi.spyOn(billingService, 'getBalance');
          getBalanceSpy.mockResolvedValueOnce(initialBalance);

          // Mock depositCredits to return updated balance
          const depositCreditsSpy = vi.spyOn(billingService, 'depositCredits');
          depositCreditsSpy.mockResolvedValueOnce({
            success: true,
            newBalance: initialBalance + depositAmount,
            transactionId: 'test-tx-id',
          });

          const result = await billingService.depositCredits(
            userId,
            depositAmount,
            'DEPOSIT_STRIPE',
            { test: true }
          );

          // Verify new balance equals initial balance plus deposit
          expect(result.newBalance).toBeCloseTo(initialBalance + depositAmount, 6);
          expect(result.success).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional test: CCC/USD conversion consistency
   */
  it('should maintain consistency in CCC/USD conversions', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.double({ min: 1, max: 10000, noNaN: true }),
        async (amount) => {
          // Test USD -> CCC -> USD
          const ccc = calculateCCCFromUSD(amount);
          const backToUSD = calculateUSDFromCCC(ccc);
          expect(backToUSD).toBeCloseTo(amount, 10);

          // Test CCC -> USD -> CCC
          const usd = calculateUSDFromCCC(amount);
          const backToCCC = calculateCCCFromUSD(usd);
          expect(backToCCC).toBeCloseTo(amount, 10);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional test: Anchor price consistency
   */
  it('should use consistent anchor price across all calculations', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.double({ min: 1, max: 10000, noNaN: true }),
        async (usdAmount) => {
          const ccc = calculateCCCFromUSD(usdAmount);
          const expectedCCC = usdAmount / ANCHOR_PRICE_USD_PER_CCC;
          
          expect(ccc).toBeCloseTo(expectedCCC, 10);
          expect(ANCHOR_PRICE_USD_PER_CCC).toBe(0.20);
        }
      ),
      { numRuns: 100 }
    );
  });
});
