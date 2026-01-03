/**
 * Tests for FallbackStrategy
 * Verifies fallback decision logic for browser rendering failures
 */

import { describe, it, expect } from 'vitest';
import { FallbackStrategy } from '../FallbackStrategy';
import { AgentMiddlewareError } from '../errors';
import { ErrorCode } from '../../../types/agent-middleware.types';

describe('FallbackStrategy', () => {
  const strategy = new FallbackStrategy();

  describe('shouldFallback', () => {
    it('should not fallback for WAF/CAPTCHA blocks (Requirement 4.2)', () => {
      const error = new AgentMiddlewareError(
        ErrorCode.ERR_WAF_BLOCK,
        'Request blocked by WAF'
      );

      const decision = strategy.shouldFallback(error);

      expect(decision.shouldFallback).toBe(false);
      expect(decision.reason).toContain('WAF/CAPTCHA');
    });

    it('should fallback for timeout errors (Requirement 4.1)', () => {
      const error = new AgentMiddlewareError(
        ErrorCode.ERR_TIMEOUT,
        'Request timed out',
        { timeout: 15000 }
      );

      const decision = strategy.shouldFallback(error);

      expect(decision.shouldFallback).toBe(true);
      expect(decision.reason).toContain('timed out');
      expect(decision.warningMessage).toBeDefined();
      expect(decision.warningMessage).toContain('timed out');
    });

    it('should fallback for CSR timeout errors (Requirement 4.1)', () => {
      const error = new AgentMiddlewareError(
        ErrorCode.ERR_CSR_TIMEOUT,
        'JavaScript execution timed out',
        { timeout: 15000, timeoutDuration: 15000 }
      );

      const decision = strategy.shouldFallback(error);

      expect(decision.shouldFallback).toBe(true);
      expect(decision.reason).toContain('timed out');
      expect(decision.warningMessage).toBeDefined();
      expect(decision.warningMessage).toContain('15000ms');
    });

    it('should fallback for network errors (Requirement 4.1)', () => {
      const error = new AgentMiddlewareError(
        ErrorCode.ERR_URL_UNREACHABLE,
        'Failed to reach URL'
      );

      const decision = strategy.shouldFallback(error);

      expect(decision.shouldFallback).toBe(true);
      expect(decision.reason).toContain('Network error');
      expect(decision.warningMessage).toBeDefined();
      expect(decision.warningMessage).toContain('network error');
    });

    it('should fallback for memory errors (Requirement 4.4)', () => {
      const error = new AgentMiddlewareError(
        ErrorCode.ERR_INTERNAL,
        'Out of memory: heap allocation failed'
      );

      const decision = strategy.shouldFallback(error);

      expect(decision.shouldFallback).toBe(true);
      expect(decision.reason).toContain('Memory limit');
      expect(decision.warningMessage).toBeDefined();
      expect(decision.warningMessage).toContain('memory limits');
    });

    it('should fallback for bot blocking errors', () => {
      const error = new AgentMiddlewareError(
        ErrorCode.ERR_BOT_BLOCKED,
        'Bot access blocked'
      );

      const decision = strategy.shouldFallback(error);

      expect(decision.shouldFallback).toBe(true);
      expect(decision.reason).toContain('Bot blocking');
      expect(decision.warningMessage).toBeDefined();
    });

    it('should fallback for generic timeout errors', () => {
      const error = new Error('Navigation timeout of 15000ms exceeded');

      const decision = strategy.shouldFallback(error);

      expect(decision.shouldFallback).toBe(true);
      expect(decision.reason).toContain('Timeout');
      expect(decision.warningMessage).toBeDefined();
    });

    it('should not fallback for CAPTCHA in generic errors', () => {
      const error = new Error('CAPTCHA challenge detected');

      const decision = strategy.shouldFallback(error);

      expect(decision.shouldFallback).toBe(false);
      expect(decision.reason).toContain('CAPTCHA');
    });

    it('should fallback for network errors in generic errors', () => {
      const error = new Error('net::ERR_CONNECTION_REFUSED');

      const decision = strategy.shouldFallback(error);

      expect(decision.shouldFallback).toBe(true);
      expect(decision.reason).toContain('Network error');
      expect(decision.warningMessage).toBeDefined();
    });

    it('should include timeout duration in warning message when available', () => {
      const error = new AgentMiddlewareError(
        ErrorCode.ERR_CSR_TIMEOUT,
        'Timeout',
        { timeoutDuration: 20000 }
      );

      const decision = strategy.shouldFallback(error);

      expect(decision.warningMessage).toContain('20000ms');
    });

    it('should provide generic warning when timeout duration not available', () => {
      const error = new AgentMiddlewareError(
        ErrorCode.ERR_TIMEOUT,
        'Timeout'
      );

      const decision = strategy.shouldFallback(error);

      expect(decision.warningMessage).toBeDefined();
      expect(decision.warningMessage).toContain('timed out');
    });
  });

  describe('getExtractionMethod', () => {
    it('should return "browser" when browser was used (Requirement 4.5)', () => {
      const method = strategy.getExtractionMethod(true);
      expect(method).toBe('browser');
    });

    it('should return "static" when browser was not used (Requirement 4.5)', () => {
      const method = strategy.getExtractionMethod(false);
      expect(method).toBe('static');
    });
  });
});

