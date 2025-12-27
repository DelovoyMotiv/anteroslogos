/**
 * Tests for AUX Audit Serialization and Validation
 * 
 * Tests cover:
 * - Request validation
 * - Response validation
 * - Serialization/deserialization
 * - Error handling
 * - Schema compliance
 */

import { describe, it, expect } from 'vitest';
import {
  validateAUXAuditRequest,
  validateAUXAuditResults,
  validateAUXAuditError,
  serializeAUXAuditResults,
  deserializeAUXAuditResults,
  serializeAUXAuditRequest,
  deserializeAUXAuditRequest,
  serializeAUXAuditError,
  deserializeAUXAuditError,
  isValidAUXAuditRequest,
  isValidAUXAuditResults,
  isValidAUXAuditError,
} from '../serialization';
import type {
  AUXAuditRequest,
  AUXAuditResults,
  AUXAuditError,
} from '../types';

// ============================================================================
// Test Data Fixtures
// ============================================================================

const validRequest: AUXAuditRequest = {
  url: 'https://example.com',
};

const validResults: AUXAuditResults = {
  score: 75,
  classification: 'Agent-Capable',
  protocols: [
    {
      name: 'agents.json',
      available: true,
      url: 'https://example.com/agents.json',
    },
  ],
  ariaScore: 80,
  interactiveElements: [
    {
      tag: 'button',
      selector: 'button.submit',
      hasAriaLabel: true,
      ariaLabel: 'Submit form',
      role: 'button',
      text: 'Submit',
    },
  ],
  frictionPoints: [
    {
      type: 'captcha',
      description: 'reCAPTCHA detected',
      severity: 'high',
      location: 'form#login',
    },
  ],
  recommendations: [
    {
      title: 'Add agents.json manifest',
      description: 'Create an agents.json file to improve discoverability',
      priority: 'high',
      impact: 20,
      docLink: 'https://docs.example.com/agents-json',
    },
  ],
  intentTriggers: [
    {
      intent: 'login',
      selector: 'button#login',
      confidence: 'high',
      element: {
        tag: 'button',
        selector: 'button#login',
        hasAriaLabel: true,
        ariaLabel: 'Log in',
        role: 'button',
        text: 'Log in',
      },
    },
  ],
  summary: 'Site is agent-capable with some friction points',
  riskLevel: 'medium',
  analyzedAt: '2024-01-01T00:00:00.000Z',
};

const validError: AUXAuditError = {
  error: 'Invalid URL',
  code: 'INVALID_URL',
  details: 'The provided URL is not valid',
  timestamp: '2024-01-01T00:00:00.000Z',
  requestId: 'req_123',
};

// ============================================================================
// Request Validation Tests
// ============================================================================

describe('AUX Audit Request Validation', () => {
  describe('validateAUXAuditRequest', () => {
    it('should validate a valid request', () => {
      const result = validateAUXAuditRequest(validRequest);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(validRequest);
      expect(result.error).toBeUndefined();
    });

    it('should reject request without url field', () => {
      const result = validateAUXAuditRequest({});
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.data).toBeUndefined();
    });

    it('should reject request with invalid URL format', () => {
      const result = validateAUXAuditRequest({ url: '' });
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject request with non-string url', () => {
      const result = validateAUXAuditRequest({ url: 123 });
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject null input', () => {
      const result = validateAUXAuditRequest(null);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject undefined input', () => {
      const result = validateAUXAuditRequest(undefined);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('isValidAUXAuditRequest', () => {
    it('should return true for valid request', () => {
      expect(isValidAUXAuditRequest(validRequest)).toBe(true);
    });

    it('should return false for invalid request', () => {
      expect(isValidAUXAuditRequest({})).toBe(false);
      expect(isValidAUXAuditRequest({ url: '' })).toBe(false);
    });
  });
});

// ============================================================================
// Results Validation Tests
// ============================================================================

describe('AUX Audit Results Validation', () => {
  describe('validateAUXAuditResults', () => {
    it('should validate valid results', () => {
      const result = validateAUXAuditResults(validResults);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(validResults);
      expect(result.error).toBeUndefined();
    });

    it('should reject results with invalid score range', () => {
      const invalidResults = { ...validResults, score: 150 };
      const result = validateAUXAuditResults(invalidResults);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject results with negative score', () => {
      const invalidResults = { ...validResults, score: -10 };
      const result = validateAUXAuditResults(invalidResults);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject results with invalid classification', () => {
      const invalidResults = { ...validResults, classification: 'Invalid' as any };
      const result = validateAUXAuditResults(invalidResults);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject results with invalid ariaScore', () => {
      const invalidResults = { ...validResults, ariaScore: 150 };
      const result = validateAUXAuditResults(invalidResults);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject results with invalid riskLevel', () => {
      const invalidResults = { ...validResults, riskLevel: 'critical' as any };
      const result = validateAUXAuditResults(invalidResults);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject results with invalid datetime format', () => {
      const invalidResults = { ...validResults, analyzedAt: 'not-a-date' };
      const result = validateAUXAuditResults(invalidResults);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject results missing required fields', () => {
      const { score, ...incomplete } = validResults;
      const result = validateAUXAuditResults(incomplete);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should validate results with empty arrays', () => {
      const minimalResults = {
        ...validResults,
        protocols: [],
        interactiveElements: [],
        frictionPoints: [],
        recommendations: [],
        intentTriggers: [],
      };
      const result = validateAUXAuditResults(minimalResults);
      expect(result.success).toBe(true);
    });

    it('should reject results with invalid protocol URL', () => {
      const invalidResults = {
        ...validResults,
        protocols: [{ name: 'test', available: true, url: 'not-a-url' }],
      };
      const result = validateAUXAuditResults(invalidResults);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject results with invalid friction type', () => {
      const invalidResults = {
        ...validResults,
        frictionPoints: [{
          type: 'invalid' as any,
          description: 'test',
          severity: 'high',
        }],
      };
      const result = validateAUXAuditResults(invalidResults);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject results with invalid recommendation impact', () => {
      const invalidResults = {
        ...validResults,
        recommendations: [{
          title: 'test',
          description: 'test',
          priority: 'high',
          impact: 150, // Invalid: > 100
        }],
      };
      const result = validateAUXAuditResults(invalidResults);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('isValidAUXAuditResults', () => {
    it('should return true for valid results', () => {
      expect(isValidAUXAuditResults(validResults)).toBe(true);
    });

    it('should return false for invalid results', () => {
      expect(isValidAUXAuditResults({})).toBe(false);
      expect(isValidAUXAuditResults({ ...validResults, score: 150 })).toBe(false);
    });
  });
});

// ============================================================================
// Error Validation Tests
// ============================================================================

describe('AUX Audit Error Validation', () => {
  describe('validateAUXAuditError', () => {
    it('should validate valid error', () => {
      const result = validateAUXAuditError(validError);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(validError);
      expect(result.error).toBeUndefined();
    });

    it('should validate error with minimal fields', () => {
      const minimalError = {
        error: 'Test error',
        code: 'INTERNAL_ERROR',
      };
      const result = validateAUXAuditError(minimalError);
      expect(result.success).toBe(true);
    });

    it('should reject error with invalid code', () => {
      const invalidError = { ...validError, code: 'INVALID_CODE' as any };
      const result = validateAUXAuditError(invalidError);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject error missing required fields', () => {
      const result = validateAUXAuditError({ error: 'Test' });
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('isValidAUXAuditError', () => {
    it('should return true for valid error', () => {
      expect(isValidAUXAuditError(validError)).toBe(true);
    });

    it('should return false for invalid error', () => {
      expect(isValidAUXAuditError({})).toBe(false);
      expect(isValidAUXAuditError({ error: 'Test' })).toBe(false);
    });
  });
});

// ============================================================================
// Serialization Tests
// ============================================================================

describe('AUX Audit Serialization', () => {
  describe('serializeAUXAuditRequest', () => {
    it('should serialize valid request', () => {
      const result = serializeAUXAuditRequest(validRequest);
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(typeof result.data).toBe('string');
      expect(result.error).toBeUndefined();
    });

    it('should produce parseable JSON', () => {
      const result = serializeAUXAuditRequest(validRequest);
      expect(result.success).toBe(true);
      const parsed = JSON.parse(result.data!);
      expect(parsed).toEqual(validRequest);
    });

    it('should reject invalid request', () => {
      const result = serializeAUXAuditRequest({ url: '' } as any);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.data).toBeUndefined();
    });
  });

  describe('deserializeAUXAuditRequest', () => {
    it('should deserialize valid JSON', () => {
      const json = JSON.stringify(validRequest);
      const result = deserializeAUXAuditRequest(json);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(validRequest);
      expect(result.error).toBeUndefined();
    });

    it('should reject invalid JSON syntax', () => {
      const result = deserializeAUXAuditRequest('{ invalid json }');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject JSON with invalid schema', () => {
      const json = JSON.stringify({ url: '' });
      const result = deserializeAUXAuditRequest(json);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('serializeAUXAuditResults', () => {
    it('should serialize valid results', () => {
      const result = serializeAUXAuditResults(validResults);
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(typeof result.data).toBe('string');
      expect(result.error).toBeUndefined();
    });

    it('should produce parseable JSON', () => {
      const result = serializeAUXAuditResults(validResults);
      expect(result.success).toBe(true);
      const parsed = JSON.parse(result.data!);
      expect(parsed).toEqual(validResults);
    });

    it('should reject invalid results', () => {
      const invalidResults = { ...validResults, score: 150 };
      const result = serializeAUXAuditResults(invalidResults as any);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.data).toBeUndefined();
    });
  });

  describe('deserializeAUXAuditResults', () => {
    it('should deserialize valid JSON', () => {
      const json = JSON.stringify(validResults);
      const result = deserializeAUXAuditResults(json);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(validResults);
      expect(result.error).toBeUndefined();
    });

    it('should reject invalid JSON syntax', () => {
      const result = deserializeAUXAuditResults('{ invalid json }');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject JSON with invalid schema', () => {
      const json = JSON.stringify({ score: 150 });
      const result = deserializeAUXAuditResults(json);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('serializeAUXAuditError', () => {
    it('should serialize valid error', () => {
      const result = serializeAUXAuditError(validError);
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(typeof result.data).toBe('string');
      expect(result.error).toBeUndefined();
    });

    it('should produce parseable JSON', () => {
      const result = serializeAUXAuditError(validError);
      expect(result.success).toBe(true);
      const parsed = JSON.parse(result.data!);
      expect(parsed).toEqual(validError);
    });

    it('should reject invalid error', () => {
      const invalidError = { ...validError, code: 'INVALID' as any };
      const result = serializeAUXAuditError(invalidError);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('deserializeAUXAuditError', () => {
    it('should deserialize valid JSON', () => {
      const json = JSON.stringify(validError);
      const result = deserializeAUXAuditError(json);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(validError);
      expect(result.error).toBeUndefined();
    });

    it('should reject invalid JSON syntax', () => {
      const result = deserializeAUXAuditError('{ invalid json }');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject JSON with invalid schema', () => {
      const json = JSON.stringify({ error: 'Test' });
      const result = deserializeAUXAuditError(json);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});

// ============================================================================
// Round-Trip Tests (Requirement 15.5)
// ============================================================================

describe('Serialization Round-Trip Tests', () => {
  it('should round-trip request successfully', () => {
    const serialized = serializeAUXAuditRequest(validRequest);
    expect(serialized.success).toBe(true);
    
    const deserialized = deserializeAUXAuditRequest(serialized.data!);
    expect(deserialized.success).toBe(true);
    expect(deserialized.data).toEqual(validRequest);
  });

  it('should round-trip results successfully', () => {
    const serialized = serializeAUXAuditResults(validResults);
    expect(serialized.success).toBe(true);
    
    const deserialized = deserializeAUXAuditResults(serialized.data!);
    expect(deserialized.success).toBe(true);
    expect(deserialized.data).toEqual(validResults);
  });

  it('should round-trip error successfully', () => {
    const serialized = serializeAUXAuditError(validError);
    expect(serialized.success).toBe(true);
    
    const deserialized = deserializeAUXAuditError(serialized.data!);
    expect(deserialized.success).toBe(true);
    expect(deserialized.data).toEqual(validError);
  });

  it('should preserve all fields in results round-trip', () => {
    const serialized = serializeAUXAuditResults(validResults);
    const deserialized = deserializeAUXAuditResults(serialized.data!);
    
    expect(deserialized.data?.score).toBe(validResults.score);
    expect(deserialized.data?.classification).toBe(validResults.classification);
    expect(deserialized.data?.protocols).toEqual(validResults.protocols);
    expect(deserialized.data?.ariaScore).toBe(validResults.ariaScore);
    expect(deserialized.data?.interactiveElements).toEqual(validResults.interactiveElements);
    expect(deserialized.data?.frictionPoints).toEqual(validResults.frictionPoints);
    expect(deserialized.data?.recommendations).toEqual(validResults.recommendations);
    expect(deserialized.data?.intentTriggers).toEqual(validResults.intentTriggers);
    expect(deserialized.data?.summary).toBe(validResults.summary);
    expect(deserialized.data?.riskLevel).toBe(validResults.riskLevel);
    expect(deserialized.data?.analyzedAt).toBe(validResults.analyzedAt);
  });
});

// ============================================================================
// Edge Cases
// ============================================================================

describe('Serialization Edge Cases', () => {
  it('should handle results with optional fields missing', () => {
    const minimalResults: AUXAuditResults = {
      score: 50,
      classification: 'Agent-Capable',
      protocols: [],
      ariaScore: 0,
      interactiveElements: [],
      frictionPoints: [],
      recommendations: [],
      intentTriggers: [],
      summary: 'Minimal results',
      riskLevel: 'low',
      analyzedAt: '2024-01-01T00:00:00.000Z',
    };
    
    const serialized = serializeAUXAuditResults(minimalResults);
    expect(serialized.success).toBe(true);
    
    const deserialized = deserializeAUXAuditResults(serialized.data!);
    expect(deserialized.success).toBe(true);
    expect(deserialized.data).toEqual(minimalResults);
  });

  it('should handle error with optional fields missing', () => {
    const minimalError: AUXAuditError = {
      error: 'Test error',
      code: 'INTERNAL_ERROR',
    };
    
    const serialized = serializeAUXAuditError(minimalError);
    expect(serialized.success).toBe(true);
    
    const deserialized = deserializeAUXAuditError(serialized.data!);
    expect(deserialized.success).toBe(true);
    expect(deserialized.data).toEqual(minimalError);
  });

  it('should handle results with maximum values', () => {
    const maxResults: AUXAuditResults = {
      ...validResults,
      score: 100,
      ariaScore: 100,
      recommendations: [{
        title: 'test',
        description: 'test',
        priority: 'high',
        impact: 100,
      }],
    };
    
    const serialized = serializeAUXAuditResults(maxResults);
    expect(serialized.success).toBe(true);
    
    const deserialized = deserializeAUXAuditResults(serialized.data!);
    expect(deserialized.success).toBe(true);
    expect(deserialized.data?.score).toBe(100);
    expect(deserialized.data?.ariaScore).toBe(100);
  });

  it('should handle results with minimum values', () => {
    const minResults: AUXAuditResults = {
      ...validResults,
      score: 0,
      ariaScore: 0,
      recommendations: [{
        title: 'test',
        description: 'test',
        priority: 'low',
        impact: 0,
      }],
    };
    
    const serialized = serializeAUXAuditResults(minResults);
    expect(serialized.success).toBe(true);
    
    const deserialized = deserializeAUXAuditResults(serialized.data!);
    expect(deserialized.success).toBe(true);
    expect(deserialized.data?.score).toBe(0);
    expect(deserialized.data?.ariaScore).toBe(0);
  });
});
