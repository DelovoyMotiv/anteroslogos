/**
 * @file lib/subscriptions/__tests__/paymentDetector.test.ts
 * @description Tests for payment detector with retry logic
 * 
 * **Feature: billing-system-enhancement, Task 2.2: Retry logic for blockchain RPC calls**
 * **Validates: Requirements 4.1, 8.1**
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies BEFORE importing the module under test
vi.mock("../storage", () => ({
  getPendingInvoices: vi.fn(),
  getSubscriptionInvoice: vi.fn(),
  updateSubscriptionInvoice: vi.fn(),
  getStuckInvoices: vi.fn(),
  getSubscriptionById: vi.fn(),
}));

vi.mock("../manager", () => ({
  activateSubscription: vi.fn(),
}));

vi.mock("../../payments/rpcProvider", () => ({
  getRpcProviderManager: vi.fn(),
}));

vi.mock("../../database/redisCache", () => ({
  getRedisCache: vi.fn(() => ({
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(true),
  })),
  CacheTTL: {
    DAY: 86400,
  },
}));

vi.mock("../webhooks", () => ({
  dispatchWebhookEvent: vi.fn(),
}));

vi.mock("../../error-tracking", () => ({
  capturePaymentDetectionError: vi.fn(),
  addBreadcrumb: vi.fn(),
}));

// Now import the modules
import * as paymentDetector from "../paymentDetector";
import * as storage from "../storage";
import * as manager from "../manager";
import { getRpcProviderManager } from "../../payments/rpcProvider";

describe("Payment Detector - Retry Logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("scanSubscriptionPayments", () => {
    it("should handle empty pending invoices", async () => {
      // Arrange
      vi.mocked(storage.getPendingInvoices).mockResolvedValue([]);

      // Act
      const result = await paymentDetector.scanSubscriptionPayments();

      // Assert
      expect(result).toEqual({
        scanned: 0,
        detected: 0,
        activated: 0,
        errors: [],
      });
    });

    it("should use RPC provider manager for resilient calls", async () => {
      // Arrange
      const mockInvoice = {
        id: "uuid-123",
        invoiceId: "sub_inv_test123",
        subscriptionId: "sub-123",
        userId: "user-123",
        recipientAddress: "0x1234567890123456789012345678901234567890",
        amount: 19,
        token: "USDC",
        chainId: 8453 as const,
        memoHash: "0x1234567890123456789012345678901234567890123456789012345678901234",
        status: "pending" as const,
        confirmations: 0,
        billingPeriodStart: new Date(),
        billingPeriodEnd: new Date(),
        expiresAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(storage.getPendingInvoices).mockResolvedValue([mockInvoice]);

      const mockClient = {
        getBlockNumber: vi.fn().mockResolvedValue(BigInt(1000)),
        getLogs: vi.fn().mockResolvedValue([]),
      };

      const mockRpcManager = {
        executeWithResilience: vi.fn().mockImplementation(async (fn) => {
          return await fn(mockClient);
        }),
      };

      vi.mocked(getRpcProviderManager).mockReturnValue(mockRpcManager as any);

      // Act
      const result = await paymentDetector.scanSubscriptionPayments();

      // Assert
      expect(mockRpcManager.executeWithResilience).toHaveBeenCalled();
      expect(result.scanned).toBe(1);
      expect(result.detected).toBe(0);
    });

    it("should handle RPC errors gracefully", async () => {
      // Arrange
      const mockInvoice = {
        id: "uuid-123",
        invoiceId: "sub_inv_test123",
        subscriptionId: "sub-123",
        userId: "user-123",
        recipientAddress: "0x1234567890123456789012345678901234567890",
        amount: 19,
        token: "USDC",
        chainId: 8453 as const,
        memoHash: "0x1234567890123456789012345678901234567890123456789012345678901234",
        status: "pending" as const,
        confirmations: 0,
        billingPeriodStart: new Date(),
        billingPeriodEnd: new Date(),
        expiresAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(storage.getPendingInvoices).mockResolvedValue([mockInvoice]);

      const mockRpcManager = {
        executeWithResilience: vi.fn().mockRejectedValue(new Error("RPC connection failed")),
      };

      vi.mocked(getRpcProviderManager).mockReturnValue(mockRpcManager as any);

      // Act & Assert
      // Note: This test will take time due to retry delays (exponential backoff)
      await expect(paymentDetector.scanSubscriptionPayments()).rejects.toThrow(
        "Payment detection failed"
      );
    }, 60000); // 60 second timeout to allow for retries
  });

  describe("detectPaymentForInvoice", () => {
    it("should return early if invoice is already paid", async () => {
      // Arrange
      const mockInvoice = {
        invoiceId: "sub_inv_test123",
        status: "paid" as const,
        txHash: "0xabc123",
      };

      vi.mocked(storage.getSubscriptionInvoice).mockResolvedValue(mockInvoice as any);

      // Act
      const result = await paymentDetector.detectPaymentForInvoice("sub_inv_test123");

      // Assert
      expect(result).toEqual({
        detected: true,
        txHash: "0xabc123",
      });
      expect(getRpcProviderManager).not.toHaveBeenCalled();
    });

    it("should throw error if invoice not found", async () => {
      // Arrange
      vi.mocked(storage.getSubscriptionInvoice).mockResolvedValue(null);

      // Act & Assert
      await expect(
        paymentDetector.detectPaymentForInvoice("sub_inv_nonexistent")
      ).rejects.toThrow("Invoice sub_inv_nonexistent not found");
    });

    it("should use RPC provider manager for manual detection", async () => {
      // Arrange
      const mockInvoice = {
        id: "uuid-123",
        invoiceId: "sub_inv_test123",
        subscriptionId: "sub-123",
        userId: "user-123",
        recipientAddress: "0x1234567890123456789012345678901234567890",
        amount: 19,
        token: "USDC",
        chainId: 8453 as const,
        memoHash: "0x1234567890123456789012345678901234567890123456789012345678901234",
        status: "pending" as const,
        confirmations: 0,
        billingPeriodStart: new Date(),
        billingPeriodEnd: new Date(),
        expiresAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(storage.getSubscriptionInvoice).mockResolvedValue(mockInvoice);

      const mockClient = {
        getBlockNumber: vi.fn().mockResolvedValue(BigInt(1000)),
        getLogs: vi.fn().mockResolvedValue([]),
      };

      const mockRpcManager = {
        executeWithResilience: vi.fn().mockImplementation(async (fn) => {
          return await fn(mockClient);
        }),
      };

      vi.mocked(getRpcProviderManager).mockReturnValue(mockRpcManager as any);

      // Act
      const result = await paymentDetector.detectPaymentForInvoice("sub_inv_test123");

      // Assert
      expect(mockRpcManager.executeWithResilience).toHaveBeenCalled();
      expect(result.detected).toBe(false);
    });
  });
});
