/**
 * Cost Tracker Tests
 * Unit tests for LLM cost tracking and budget management
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CostTracker, createCostTracker } from '../costTracker';
import type { TaskType, TokenUsage } from '../../types/llm.types';

describe('CostTracker', () => {
  let tracker: CostTracker;
  let alertCallback: ReturnType<typeof vi.fn>;
  
  beforeEach(() => {
    alertCallback = vi.fn();
    tracker = new CostTracker({
      budgetLimit: 100,
      alertThreshold: 0.8,
      enableLogging: false, // Disable DB logging for tests
      onAlert: alertCallback,
    });
  });
  
  // ==========================================================================
  // Constructor Tests
  // ==========================================================================
  
  describe('constructor', () => {
    it('should create tracker with valid configuration', () => {
      expect(tracker).toBeDefined();
      expect(tracker.getTotalCost()).toBe(0);
      expect(tracker.getBudgetUtilization()).toBe(0);
    });
    
    it('should throw error for invalid budget limit', () => {
      expect(() => {
        new CostTracker({
          budgetLimit: 0,
          alertThreshold: 0.8,
          enableLogging: false,
        });
      }).toThrow('Budget limit must be greater than 0');
      
      expect(() => {
        new CostTracker({
          budgetLimit: -10,
          alertThreshold: 0.8,
          enableLogging: false,
        });
      }).toThrow('Budget limit must be greater than 0');
    });
    
    it('should throw error for invalid alert threshold', () => {
      expect(() => {
        new CostTracker({
          budgetLimit: 100,
          alertThreshold: -0.1,
          enableLogging: false,
        });
      }).toThrow('Alert threshold must be between 0 and 1');
      
      expect(() => {
        new CostTracker({
          budgetLimit: 100,
          alertThreshold: 1.5,
          enableLogging: false,
        });
      }).toThrow('Alert threshold must be between 0 and 1');
    });
  });
  
  // ==========================================================================
  // Cost Calculation Tests
  // ==========================================================================
  
  describe('calculateCost', () => {
    it('should calculate cost correctly for Claude Sonnet 4.5', () => {
      const tokens: TokenUsage = {
        prompt: 1000,
        completion: 500,
        total: 1500,
      };
      
      const cost = tracker.calculateCost('anthropic/claude-sonnet-4.5', tokens);
      
      // Expected: (1000 * 3.0 / 1M) + (500 * 15.0 / 1M) = 0.003 + 0.0075 = 0.0105
      expect(cost).toBeCloseTo(0.0105, 6);
    });
    
    it('should calculate cost correctly for GPT-5.1', () => {
      const tokens: TokenUsage = {
        prompt: 2000,
        completion: 1000,
        total: 3000,
      };
      
      const cost = tracker.calculateCost('openai/gpt-5.1', tokens);
      
      // Expected: (2000 * 10.0 / 1M) + (1000 * 30.0 / 1M) = 0.02 + 0.03 = 0.05
      expect(cost).toBeCloseTo(0.05, 6);
    });
    
    it('should calculate cost correctly with cached tokens', () => {
      const tokens: TokenUsage = {
        prompt: 1000,
        completion: 500,
        total: 1500,
        cached: 500,
      };
      
      const cost = tracker.calculateCost('anthropic/claude-sonnet-4.5', tokens);
      
      // Expected: (1000 * 3.0 / 1M) + (500 * 15.0 / 1M) + (500 * 0.3 / 1M)
      //         = 0.003 + 0.0075 + 0.00015 = 0.01065
      expect(cost).toBeCloseTo(0.01065, 6);
    });
    
    it('should handle zero tokens', () => {
      const tokens: TokenUsage = {
        prompt: 0,
        completion: 0,
        total: 0,
      };
      
      const cost = tracker.calculateCost('anthropic/claude-sonnet-4.5', tokens);
      expect(cost).toBe(0);
    });
    
    it('should use default pricing for unknown model', () => {
      const tokens: TokenUsage = {
        prompt: 1000,
        completion: 500,
        total: 1500,
      };
      
      const cost = tracker.calculateCost('unknown/model', tokens);
      
      // Expected: (1000 * 5.0 / 1M) + (500 * 15.0 / 1M) = 0.005 + 0.0075 = 0.0125
      expect(cost).toBeCloseTo(0.0125, 6);
    });
  });
  
  // ==========================================================================
  // Request Tracking Tests
  // ==========================================================================
  
  describe('trackRequest', () => {
    it('should track request and update total cost', async () => {
      const tokens: TokenUsage = {
        prompt: 1000,
        completion: 500,
        total: 1500,
      };
      
      await tracker.trackRequest(
        'anthropic/claude-sonnet-4.5',
        'content_opt',
        tokens,
        true
      );
      
      expect(tracker.getTotalCost()).toBeCloseTo(0.0105, 6);
    });
    
    it('should track multiple requests and accumulate costs', async () => {
      const tokens1: TokenUsage = {
        prompt: 1000,
        completion: 500,
        total: 1500,
      };
      
      const tokens2: TokenUsage = {
        prompt: 2000,
        completion: 1000,
        total: 3000,
      };
      
      await tracker.trackRequest(
        'anthropic/claude-sonnet-4.5',
        'content_opt',
        tokens1,
        true
      );
      
      await tracker.trackRequest(
        'openai/gpt-5.1',
        'fact_check',
        tokens2,
        true
      );
      
      // Expected: 0.0105 + 0.05 = 0.0605
      expect(tracker.getTotalCost()).toBeCloseTo(0.0605, 6);
    });
    
    it('should add log to in-memory cache', async () => {
      const tokens: TokenUsage = {
        prompt: 1000,
        completion: 500,
        total: 1500,
      };
      
      await tracker.trackRequest(
        'anthropic/claude-sonnet-4.5',
        'content_opt',
        tokens,
        true,
        2500
      );
      
      const logs = tracker.getUsageLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].model).toBe('anthropic/claude-sonnet-4.5');
      expect(logs[0].taskType).toBe('content_opt');
      expect(logs[0].tokens).toEqual(tokens);
      expect(logs[0].success).toBe(true);
      expect(logs[0].durationMs).toBe(2500);
    });
    
    it('should track failed requests', async () => {
      const tokens: TokenUsage = {
        prompt: 1000,
        completion: 0,
        total: 1000,
      };
      
      await tracker.trackRequest(
        'anthropic/claude-sonnet-4.5',
        'content_opt',
        tokens,
        false,
        1000,
        'Rate limit exceeded'
      );
      
      const logs = tracker.getUsageLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].success).toBe(false);
      expect(logs[0].errorMessage).toBe('Rate limit exceeded');
    });
  });
  
  // ==========================================================================
  // Budget Management Tests
  // ==========================================================================
  
  describe('budget management', () => {
    it('should calculate budget utilization correctly', async () => {
      // Track $50 worth of requests
      const tokens: TokenUsage = {
        prompt: 10_000_000, // 10M tokens
        completion: 1_000_000, // 1M tokens
        total: 11_000_000,
      };
      
      await tracker.trackRequest(
        'anthropic/claude-sonnet-4.5',
        'content_opt',
        tokens,
        true
      );
      
      // Expected cost: (10M * 3.0 / 1M) + (1M * 15.0 / 1M) = 30 + 15 = 45
      // Utilization: 45 / 100 = 45%
      expect(tracker.getBudgetUtilization()).toBeCloseTo(45, 1);
    });
    
    it('should send warning alert at threshold', async () => {
      // Track $80 worth of requests (80% of $100 budget)
      const tokens: TokenUsage = {
        prompt: 16_000_000, // 16M tokens
        completion: 2_666_667, // ~2.67M tokens
        total: 18_666_667,
      };
      
      await tracker.trackRequest(
        'anthropic/claude-sonnet-4.5',
        'content_opt',
        tokens,
        true
      );
      
      expect(alertCallback).toHaveBeenCalledWith(
        'warning',
        expect.stringContaining('Budget utilization at'),
        expect.objectContaining({
          totalCost: expect.any(Number),
          budgetLimit: 100,
          utilization: expect.any(Number),
        })
      );
    });
    
    it('should send critical alert at 100%', async () => {
      // Track $100 worth of requests
      const tokens: TokenUsage = {
        prompt: 20_000_000, // 20M tokens
        completion: 5_333_333, // ~5.33M tokens
        total: 25_333_333,
      };
      
      await tracker.trackRequest(
        'anthropic/claude-sonnet-4.5',
        'content_opt',
        tokens,
        true
      );
      
      expect(alertCallback).toHaveBeenCalledWith(
        'critical',
        expect.stringContaining('Budget limit exceeded'),
        expect.objectContaining({
          totalCost: expect.any(Number),
          budgetLimit: 100,
          utilization: expect.any(Number),
          overage: expect.any(Number),
        })
      );
    });
    
    it('should not send duplicate alerts', async () => {
      // Track $80 worth of requests
      const tokens1: TokenUsage = {
        prompt: 16_000_000,
        completion: 2_666_667,
        total: 18_666_667,
      };
      
      await tracker.trackRequest(
        'anthropic/claude-sonnet-4.5',
        'content_opt',
        tokens1,
        true
      );
      
      // Track another $10
      const tokens2: TokenUsage = {
        prompt: 2_000_000,
        completion: 333_333,
        total: 2_333_333,
      };
      
      await tracker.trackRequest(
        'anthropic/claude-sonnet-4.5',
        'content_opt',
        tokens2,
        true
      );
      
      // Should only send warning alert once
      const warningCalls = alertCallback.mock.calls.filter(
        call => call[0] === 'warning'
      );
      expect(warningCalls).toHaveLength(1);
    });
    
    it('should check if alert should be sent', async () => {
      expect(tracker.shouldAlert()).toBe(false);
      
      // Track $80 worth of requests
      const tokens: TokenUsage = {
        prompt: 16_000_000,
        completion: 2_666_667,
        total: 18_666_667,
      };
      
      await tracker.trackRequest(
        'anthropic/claude-sonnet-4.5',
        'content_opt',
        tokens,
        true
      );
      
      // Alert already sent, so should return false
      expect(tracker.shouldAlert()).toBe(false);
    });
  });
  
  // ==========================================================================
  // Cost Reporting Tests
  // ==========================================================================
  
  describe('getCostReport', () => {
    beforeEach(async () => {
      // Track some requests
      await tracker.trackRequest(
        'anthropic/claude-sonnet-4.5',
        'content_opt',
        { prompt: 1000, completion: 500, total: 1500 },
        true
      );
      
      await tracker.trackRequest(
        'openai/gpt-5.1',
        'fact_check',
        { prompt: 2000, completion: 1000, total: 3000 },
        true
      );
      
      await tracker.trackRequest(
        'anthropic/claude-sonnet-4.5',
        'content_opt',
        { prompt: 1500, completion: 750, total: 2250 },
        true
      );
    });
    
    it('should generate cost report', async () => {
      const report = await tracker.getCostReport('month');
      
      expect(report.requestCount).toBe(3);
      expect(report.totalCost).toBeGreaterThan(0);
      expect(report.averageCostPerRequest).toBeGreaterThan(0);
      expect(report.totalTokens).toBe(1500 + 3000 + 2250);
    });
    
    it('should break down cost by model', async () => {
      const report = await tracker.getCostReport('month');
      
      expect(report.costByModel.size).toBe(2);
      expect(report.costByModel.has('anthropic/claude-sonnet-4.5')).toBe(true);
      expect(report.costByModel.has('openai/gpt-5.1')).toBe(true);
    });
    
    it('should break down cost by task type', async () => {
      const report = await tracker.getCostReport('month');
      
      expect(report.costByTaskType.size).toBe(2);
      expect(report.costByTaskType.has('content_opt')).toBe(true);
      expect(report.costByTaskType.has('fact_check')).toBe(true);
    });
    
    it('should calculate budget utilization', async () => {
      const report = await tracker.getCostReport('month');
      
      expect(report.budgetUtilization).toBeGreaterThan(0);
      expect(report.budgetUtilization).toBeLessThan(100);
    });
    
    it('should project monthly cost', async () => {
      const report = await tracker.getCostReport('month');
      
      expect(report.projectedMonthlyCost).toBeGreaterThan(0);
    });
    
    it('should filter by date range', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const report = await tracker.getCostReport('custom', yesterday, tomorrow);
      
      expect(report.requestCount).toBe(3);
    });
  });
  
  // ==========================================================================
  // Utility Methods Tests
  // ==========================================================================
  
  describe('utility methods', () => {
    it('should get usage logs', async () => {
      await tracker.trackRequest(
        'anthropic/claude-sonnet-4.5',
        'content_opt',
        { prompt: 1000, completion: 500, total: 1500 },
        true
      );
      
      const logs = tracker.getUsageLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].model).toBe('anthropic/claude-sonnet-4.5');
    });
    
    it('should get budget config', () => {
      const config = tracker.getBudgetConfig();
      
      expect(config.budgetLimit).toBe(100);
      expect(config.alertThreshold).toBe(0.8);
    });
    
    it('should update budget config', () => {
      tracker.updateBudgetConfig(200, 0.9);
      
      const config = tracker.getBudgetConfig();
      expect(config.budgetLimit).toBe(200);
      expect(config.alertThreshold).toBe(0.9);
    });
    
    it('should throw error for invalid budget update', () => {
      expect(() => {
        tracker.updateBudgetConfig(0);
      }).toThrow('Budget limit must be greater than 0');
      
      expect(() => {
        tracker.updateBudgetConfig(undefined, 1.5);
      }).toThrow('Alert threshold must be between 0 and 1');
    });
    
    it('should get period start', () => {
      const start = tracker.getPeriodStart();
      expect(start).toBeInstanceOf(Date);
    });
    
    it('should reset costs', async () => {
      await tracker.trackRequest(
        'anthropic/claude-sonnet-4.5',
        'content_opt',
        { prompt: 1000, completion: 500, total: 1500 },
        true
      );
      
      expect(tracker.getTotalCost()).toBeGreaterThan(0);
      
      tracker.resetCosts();
      
      expect(tracker.getTotalCost()).toBe(0);
      expect(tracker.getUsageLogs()).toHaveLength(0);
    });
    
    it('should reset alerts', async () => {
      // Track $80 worth of requests to trigger warning
      const tokens: TokenUsage = {
        prompt: 16_000_000,
        completion: 2_666_667,
        total: 18_666_667,
      };
      
      await tracker.trackRequest(
        'anthropic/claude-sonnet-4.5',
        'content_opt',
        tokens,
        true
      );
      
      expect(alertCallback).toHaveBeenCalled();
      alertCallback.mockClear();
      
      // Reset alerts
      tracker.resetAlerts();
      
      // Track another $10 - should trigger warning again
      const tokens2: TokenUsage = {
        prompt: 2_000_000,
        completion: 333_333,
        total: 2_333_333,
      };
      
      await tracker.trackRequest(
        'anthropic/claude-sonnet-4.5',
        'content_opt',
        tokens2,
        true
      );
      
      // Should send alert again after reset
      expect(alertCallback).toHaveBeenCalled();
    });
  });
  
  // ==========================================================================
  // Factory Function Tests
  // ==========================================================================
  
  describe('createCostTracker', () => {
    it('should create tracker with default config', () => {
      const tracker = createCostTracker();
      
      expect(tracker).toBeDefined();
      expect(tracker.getTotalCost()).toBe(0);
    });
    
    it('should create tracker with custom config', () => {
      const tracker = createCostTracker({
        budgetLimit: 200,
        alertThreshold: 0.9,
      });
      
      const config = tracker.getBudgetConfig();
      expect(config.budgetLimit).toBe(200);
      expect(config.alertThreshold).toBe(0.9);
    });
  });
});
