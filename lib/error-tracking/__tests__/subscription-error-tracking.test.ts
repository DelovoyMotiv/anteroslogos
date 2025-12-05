/**
 * @file lib/error-tracking/__tests__/subscription-error-tracking.test.ts
 * @description Tests for subscription-specific error tracking
 * 
 * **Feature: billing-system-enhancement, Task 2.4**
 * **Validates: Requirements 8.5**
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as Sentry from '@sentry/node';
import {
  setSubscriptionContext,
  clearSubscriptionContext,
  addPaymentBreadcrumb,
  captureSubscriptionError,
  capturePaymentDetectionError,
  initSentry,
} from '../sentry';

// Mock Sentry
vi.mock('@sentry/node', () => ({
  init: vi.fn(),
  captureException: vi.fn(() => 'event-id-123'),
  captureMessage: vi.fn(() => 'event-id-456'),
  setUser: vi.fn(),
  addBreadcrumb: vi.fn(),
  setTag: vi.fn(),
  setTags: vi.fn(),
  setExtra: vi.fn(),
  setExtras: vi.fn(),
  setContext: vi.fn(),
  flush: vi.fn(() => Promise.resolve(true)),
  close: vi.fn(() => Promise.resolve(true)),
  httpIntegration: vi.fn(() => ({})),
  nativeNodeFetchIntegration: vi.fn(() => ({})),
  expressIntegration: vi.fn(() => ({})),
}));

describe('Subscription Error Tracking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Initialize Sentry for tests
    initSentry({
      dsn: 'https://test@sentry.io/123',
      environment: 'test',
      debug: false,
    });
  });

  describe('setSubscriptionContext', () => {
    it('should set user_id tag', () => {
      setSubscriptionContext('user-123');
      
      expect(Sentry.setTags).toHaveBeenCalledWith({
        user_id: 'user-123',
      });
    });

    it('should set subscription_id tag when provided', () => {
      setSubscriptionContext('user-123', 'sub-456');
      
      expect(Sentry.setTags).toHaveBeenCalledWith({
        user_id: 'user-123',
        subscription_id: 'sub-456',
      });
    });

    it('should set invoice_id tag when provided', () => {
      setSubscriptionContext('user-123', 'sub-456', 'inv-789');
      
      expect(Sentry.setTags).toHaveBeenCalledWith({
        user_id: 'user-123',
        subscription_id: 'sub-456',
        invoice_id: 'inv-789',
      });
    });

    it('should set subscription context', () => {
      setSubscriptionContext('user-123', 'sub-456', 'inv-789');
      
      expect(Sentry.setContext).toHaveBeenCalledWith('subscription', {
        userId: 'user-123',
        subscriptionId: 'sub-456',
        invoiceId: 'inv-789',
      });
    });
  });

  describe('clearSubscriptionContext', () => {
    it('should clear subscription tags', () => {
      clearSubscriptionContext();
      
      expect(Sentry.setTag).toHaveBeenCalledWith('user_id', '');
      expect(Sentry.setTag).toHaveBeenCalledWith('subscription_id', '');
      expect(Sentry.setTag).toHaveBeenCalledWith('invoice_id', '');
    });

    it('should clear subscription context', () => {
      clearSubscriptionContext();
      
      expect(Sentry.setContext).toHaveBeenCalledWith('subscription', null);
    });
  });

  describe('addPaymentBreadcrumb', () => {
    it('should add breadcrumb for verification_started', () => {
      addPaymentBreadcrumb('verification_started', {
        invoiceId: 'inv-123',
        txHash: '0xabc',
      });
      
      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
        type: 'default',
        category: 'payment_verification',
        message: 'Payment verification: verification_started',
        level: 'info',
        data: {
          invoiceId: 'inv-123',
          txHash: '0xabc',
        },
      });
    });

    it('should add breadcrumb for verification_failed with error level', () => {
      addPaymentBreadcrumb('verification_failed', {
        reason: 'insufficient_confirmations',
      });
      
      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
        type: 'default',
        category: 'payment_verification',
        message: 'Payment verification: verification_failed',
        level: 'error',
        data: {
          reason: 'insufficient_confirmations',
        },
      });
    });

    it('should filter sensitive data from breadcrumb', () => {
      addPaymentBreadcrumb('verification_started', {
        invoiceId: 'inv-123',
        email: 'user@example.com',
        wallet_address: '0x123',
      });
      
      const call = (Sentry.addBreadcrumb as any).mock.calls[0][0];
      expect(call.data).not.toHaveProperty('email');
      expect(call.data).not.toHaveProperty('wallet_address');
      expect(call.data).toHaveProperty('invoiceId');
    });
  });

  describe('captureSubscriptionError', () => {
    it('should capture error with subscription context', () => {
      const error = new Error('Test error');
      
      captureSubscriptionError(
        error,
        'user-123',
        'sub-456',
        'inv-789',
        {
          operation: 'activate_subscription',
          amount: 100,
        }
      );
      
      expect(Sentry.captureException).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          level: 'error',
          tags: {
            user_id: 'user-123',
            subscription_id: 'sub-456',
            invoice_id: 'inv-789',
            operation: 'activate_subscription',
          },
          extra: {
            operation: 'activate_subscription',
            amount: 100,
          },
          contexts: {
            subscription: {
              userId: 'user-123',
              subscriptionId: 'sub-456',
              invoiceId: 'inv-789',
            },
          },
        })
      );
    });

    it('should filter sensitive data from extra', () => {
      const error = new Error('Test error');
      
      captureSubscriptionError(
        error,
        'user-123',
        'sub-456',
        'inv-789',
        {
          operation: 'test',
          email: 'user@example.com',
          wallet_address: '0x123',
          password: 'secret',
        }
      );
      
      const call = (Sentry.captureException as any).mock.calls[0][1];
      expect(call.extra.email).toBe('[REDACTED]');
      expect(call.extra.wallet_address).toBe('[REDACTED]');
      expect(call.extra.password).toBe('[REDACTED]');
      expect(call.extra.operation).toBe('test');
    });

    it('should handle optional subscription_id and invoice_id', () => {
      const error = new Error('Test error');
      
      captureSubscriptionError(error, 'user-123');
      
      expect(Sentry.captureException).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          tags: {
            user_id: 'user-123',
            subscription_id: '',
            invoice_id: '',
            operation: 'unknown',
          },
        })
      );
    });
  });

  describe('capturePaymentDetectionError', () => {
    it('should capture error with payment detection context', () => {
      const error = new Error('Detection failed');
      
      capturePaymentDetectionError(
        error,
        'inv-123',
        'scan_payments',
        {
          blockNumber: '1000',
        }
      );
      
      expect(Sentry.captureException).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          level: 'error',
          tags: {
            invoice_id: 'inv-123',
            operation: 'scan_payments',
            component: 'payment_detector',
          },
          extra: {
            blockNumber: '1000',
          },
          contexts: {
            payment_detection: {
              invoiceId: 'inv-123',
              operation: 'scan_payments',
            },
          },
        })
      );
    });

    it('should filter sensitive data', () => {
      const error = new Error('Detection failed');
      
      capturePaymentDetectionError(
        error,
        'inv-123',
        'scan_payments',
        {
          blockNumber: '1000',
          email: 'user@example.com',
          wallet_address: '0x123',
        }
      );
      
      const call = (Sentry.captureException as any).mock.calls[0][1];
      expect(call.extra.email).toBe('[REDACTED]');
      expect(call.extra.wallet_address).toBe('[REDACTED]');
      expect(call.extra.blockNumber).toBe('1000');
    });
  });

  describe('Sensitive Data Filtering', () => {
    it('should not log sensitive fields in extra data', () => {
      const error = new Error('Test error');
      
      captureSubscriptionError(
        error,
        'user-123',
        'sub-456',
        'inv-789',
        {
          operation: 'test',
          password: 'secret123',
          token: 'abc123',
          email: 'user@example.com',
          amount: 100,
        }
      );
      
      const call = (Sentry.captureException as any).mock.calls[0][1];
      
      // Sensitive fields should be redacted
      expect(call.extra.password).toBe('[REDACTED]');
      expect(call.extra.token).toBe('[REDACTED]');
      expect(call.extra.email).toBe('[REDACTED]');
      
      // Non-sensitive fields should remain
      expect(call.extra.operation).toBe('test');
      expect(call.extra.amount).toBe(100);
    });

    it('should not log wallet addresses', () => {
      const error = new Error('Test error');
      
      captureSubscriptionError(
        error,
        'user-123',
        'sub-456',
        'inv-789',
        {
          operation: 'test',
          billing_wallet_address: '0x123abc',
          billingWalletAddress: '0x456def',
          amount: 100,
        }
      );
      
      const call = (Sentry.captureException as any).mock.calls[0][1];
      
      // Wallet addresses should be redacted
      expect(call.extra.billing_wallet_address).toBe('[REDACTED]');
      expect(call.extra.billingWalletAddress).toBe('[REDACTED]');
      
      // Non-sensitive fields should remain
      expect(call.extra.operation).toBe('test');
      expect(call.extra.amount).toBe(100);
    });
  });
});
