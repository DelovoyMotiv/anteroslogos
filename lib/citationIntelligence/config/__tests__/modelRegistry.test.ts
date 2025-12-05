/**
 * Unit Tests for Model Registry
 * 
 * Tests for:
 * - Model selection by task type
 * - Fallback model resolution
 * - Pricing information retrieval
 * - Cost calculation
 * - Environment variable integration
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  MODEL_PRICING,
  MODEL_REGISTRY,
  getModelForTask,
  getFallbackModel,
  getModelPricing,
  getModelConfig,
  getAvailableTaskTypes,
  isTaskTypeSupported,
  getAllModels,
  calculateEstimatedCost,
  getModelFromEnv,
  validateEnvironmentConfig,
} from '../modelRegistry';
import type { TaskType } from '../../types/llm.types';

describe('Model Registry', () => {
  describe('MODEL_PRICING', () => {
    it('should have pricing for all primary models', () => {
      const primaryModels = Object.values(MODEL_REGISTRY).map(config => config.primary);
      
      for (const model of primaryModels) {
        expect(MODEL_PRICING[model]).toBeDefined();
        expect(MODEL_PRICING[model].input).toBeGreaterThan(0);
        expect(MODEL_PRICING[model].output).toBeGreaterThan(0);
      }
    });
    
    it('should have pricing for all fallback models', () => {
      const fallbackModels = Object.values(MODEL_REGISTRY).map(config => config.fallback);
      
      for (const model of fallbackModels) {
        expect(MODEL_PRICING[model]).toBeDefined();
        expect(MODEL_PRICING[model].input).toBeGreaterThan(0);
        expect(MODEL_PRICING[model].output).toBeGreaterThan(0);
      }
    });
    
    it('should have unknown model pricing as fallback', () => {
      expect(MODEL_PRICING['unknown']).toBeDefined();
      expect(MODEL_PRICING['unknown'].input).toBe(5.0);
      expect(MODEL_PRICING['unknown'].output).toBe(15.0);
    });
  });
  
  describe('MODEL_REGISTRY', () => {
    it('should have configurations for all task types', () => {
      const expectedTaskTypes: TaskType[] = ['content_opt', 'fact_check', 'schema_gen', 'analysis'];
      
      for (const taskType of expectedTaskTypes) {
        expect(MODEL_REGISTRY[taskType]).toBeDefined();
        expect(MODEL_REGISTRY[taskType].primary).toBeTruthy();
        expect(MODEL_REGISTRY[taskType].fallback).toBeTruthy();
        expect(MODEL_REGISTRY[taskType].pricing).toBeDefined();
      }
    });
    
    it('should have correct model assignments', () => {
      expect(MODEL_REGISTRY.content_opt.primary).toBe('anthropic/claude-sonnet-4.5');
      expect(MODEL_REGISTRY.fact_check.primary).toBe('openai/gpt-5.1');
      expect(MODEL_REGISTRY.schema_gen.primary).toBe('google/gemini-3-pro-preview');
      expect(MODEL_REGISTRY.analysis.primary).toBe('x-ai/grok-4');
    });
    
    it('should have valid fallback models', () => {
      expect(MODEL_REGISTRY.content_opt.fallback).toBe('anthropic/claude-3.5-sonnet');
      expect(MODEL_REGISTRY.fact_check.fallback).toBe('openai/gpt-4-turbo');
      expect(MODEL_REGISTRY.schema_gen.fallback).toBe('google/gemini-pro-1.5');
      expect(MODEL_REGISTRY.analysis.fallback).toBe('anthropic/claude-3.5-sonnet');
    });
  });
  
  describe('getModelForTask()', () => {
    it('should return correct model for content_opt', () => {
      const model = getModelForTask('content_opt');
      expect(model).toBe('anthropic/claude-sonnet-4.5');
    });
    
    it('should return correct model for fact_check', () => {
      const model = getModelForTask('fact_check');
      expect(model).toBe('openai/gpt-5.1');
    });
    
    it('should return correct model for schema_gen', () => {
      const model = getModelForTask('schema_gen');
      expect(model).toBe('google/gemini-3-pro-preview');
    });
    
    it('should return correct model for analysis', () => {
      const model = getModelForTask('analysis');
      expect(model).toBe('x-ai/grok-4');
    });
    
    it('should throw error for unknown task type', () => {
      expect(() => getModelForTask('unknown' as TaskType)).toThrow('Unknown task type');
    });
  });
  
  describe('getFallbackModel()', () => {
    it('should return correct fallback for Claude Sonnet 4.5', () => {
      const fallback = getFallbackModel('anthropic/claude-sonnet-4.5');
      expect(fallback).toBe('anthropic/claude-3.5-sonnet');
    });
    
    it('should return correct fallback for GPT-5.1', () => {
      const fallback = getFallbackModel('openai/gpt-5.1');
      expect(fallback).toBe('openai/gpt-4-turbo');
    });
    
    it('should return correct fallback for Gemini 3 Pro', () => {
      const fallback = getFallbackModel('google/gemini-3-pro-preview');
      expect(fallback).toBe('google/gemini-pro-1.5');
    });
    
    it('should return correct fallback for Grok 4', () => {
      const fallback = getFallbackModel('x-ai/grok-4');
      expect(fallback).toBe('anthropic/claude-3.5-sonnet');
    });
    
    it('should return default fallback for unknown model', () => {
      const fallback = getFallbackModel('unknown-model');
      expect(fallback).toBe('anthropic/claude-3.5-sonnet');
    });
  });
  
  describe('getModelPricing()', () => {
    it('should return correct pricing for Claude Sonnet 4.5', () => {
      const pricing = getModelPricing('anthropic/claude-sonnet-4.5');
      expect(pricing.input).toBe(3.0);
      expect(pricing.output).toBe(15.0);
      expect(pricing.cached).toBe(0.3);
    });
    
    it('should return correct pricing for GPT-5.1', () => {
      const pricing = getModelPricing('openai/gpt-5.1');
      expect(pricing.input).toBe(10.0);
      expect(pricing.output).toBe(30.0);
    });
    
    it('should return correct pricing for Gemini 3 Pro', () => {
      const pricing = getModelPricing('google/gemini-3-pro-preview');
      expect(pricing.input).toBe(1.25);
      expect(pricing.output).toBe(5.0);
      expect(pricing.cached).toBe(0.125);
    });
    
    it('should return correct pricing for Grok 4', () => {
      const pricing = getModelPricing('x-ai/grok-4');
      expect(pricing.input).toBe(5.0);
      expect(pricing.output).toBe(15.0);
    });
    
    it('should return default pricing for unknown model', () => {
      const pricing = getModelPricing('unknown-model');
      expect(pricing.input).toBe(5.0);
      expect(pricing.output).toBe(15.0);
    });
  });
  
  describe('getModelConfig()', () => {
    it('should return complete config for content_opt', () => {
      const config = getModelConfig('content_opt');
      expect(config.modelId).toBe('anthropic/claude-sonnet-4.5');
      expect(config.displayName).toBe('Claude Sonnet 4.5');
      expect(config.primary).toBe('anthropic/claude-sonnet-4.5');
      expect(config.fallback).toBe('anthropic/claude-3.5-sonnet');
      expect(config.pricing).toBeDefined();
      expect(config.taskTypes).toContain('content_opt');
      expect(config.parameters).toBeDefined();
      expect(config.capabilities).toBeDefined();
    });
    
    it('should throw error for unknown task type', () => {
      expect(() => getModelConfig('unknown' as TaskType)).toThrow('Unknown task type');
    });
  });
  
  describe('getAvailableTaskTypes()', () => {
    it('should return all task types', () => {
      const taskTypes = getAvailableTaskTypes();
      expect(taskTypes).toHaveLength(4);
      expect(taskTypes).toContain('content_opt');
      expect(taskTypes).toContain('fact_check');
      expect(taskTypes).toContain('schema_gen');
      expect(taskTypes).toContain('analysis');
    });
  });
  
  describe('isTaskTypeSupported()', () => {
    it('should return true for supported task types', () => {
      expect(isTaskTypeSupported('content_opt')).toBe(true);
      expect(isTaskTypeSupported('fact_check')).toBe(true);
      expect(isTaskTypeSupported('schema_gen')).toBe(true);
      expect(isTaskTypeSupported('analysis')).toBe(true);
    });
    
    it('should return false for unsupported task types', () => {
      expect(isTaskTypeSupported('unknown')).toBe(false);
      expect(isTaskTypeSupported('invalid')).toBe(false);
    });
  });
  
  describe('getAllModels()', () => {
    it('should return all primary models', () => {
      const models = getAllModels();
      expect(models).toHaveLength(4);
      expect(models).toContain('anthropic/claude-sonnet-4.5');
      expect(models).toContain('openai/gpt-5.1');
      expect(models).toContain('google/gemini-3-pro-preview');
      expect(models).toContain('x-ai/grok-4');
    });
  });
  
  describe('calculateEstimatedCost()', () => {
    it('should calculate cost correctly for Claude Sonnet 4.5', () => {
      const cost = calculateEstimatedCost('anthropic/claude-sonnet-4.5', 1000, 500);
      // 1000 * 3.0 / 1M + 500 * 15.0 / 1M = 0.003 + 0.0075 = 0.0105
      expect(cost).toBeCloseTo(0.0105, 4);
    });
    
    it('should calculate cost correctly for GPT-5.1', () => {
      const cost = calculateEstimatedCost('openai/gpt-5.1', 2000, 1000);
      // 2000 * 10.0 / 1M + 1000 * 30.0 / 1M = 0.02 + 0.03 = 0.05
      expect(cost).toBeCloseTo(0.05, 4);
    });
    
    it('should calculate cost with cached tokens', () => {
      const cost = calculateEstimatedCost('anthropic/claude-sonnet-4.5', 1000, 500, 500);
      // 1000 * 3.0 / 1M + 500 * 15.0 / 1M + 500 * 0.3 / 1M = 0.003 + 0.0075 + 0.00015 = 0.01065
      expect(cost).toBeCloseTo(0.01065, 5);
    });
    
    it('should handle zero tokens', () => {
      const cost = calculateEstimatedCost('anthropic/claude-sonnet-4.5', 0, 0);
      expect(cost).toBe(0);
    });
    
    it('should use default pricing for unknown model', () => {
      const cost = calculateEstimatedCost('unknown-model', 1000, 500);
      // 1000 * 5.0 / 1M + 500 * 15.0 / 1M = 0.005 + 0.0075 = 0.0125
      expect(cost).toBeCloseTo(0.0125, 4);
    });
  });
  
  describe('getModelFromEnv()', () => {
    beforeEach(() => {
      // Clear environment variables
      vi.stubEnv('VITE_OPENROUTER_MODEL_CONTENT_OPT', '');
      vi.stubEnv('VITE_OPENROUTER_MODEL_FACT_CHECK', '');
      vi.stubEnv('VITE_OPENROUTER_MODEL_SCHEMA', '');
      vi.stubEnv('VITE_OPENROUTER_MODEL_ANALYSIS', '');
    });
    
    it('should return environment value if set', () => {
      vi.stubEnv('VITE_OPENROUTER_MODEL_CONTENT_OPT', 'custom/model');
      const model = getModelFromEnv('content_opt');
      expect(model).toBe('custom/model');
    });
    
    it('should return registry default if env not set', () => {
      const model = getModelFromEnv('content_opt');
      expect(model).toBe('anthropic/claude-sonnet-4.5');
    });
  });
  
  describe('validateEnvironmentConfig()', () => {
    it('should validate environment configuration', () => {
      const validation = validateEnvironmentConfig();
      expect(validation).toHaveProperty('valid');
      expect(validation).toHaveProperty('missing');
      expect(validation).toHaveProperty('warnings');
      expect(Array.isArray(validation.missing)).toBe(true);
      expect(Array.isArray(validation.warnings)).toBe(true);
    });
  });
});
