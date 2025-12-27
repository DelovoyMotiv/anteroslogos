/**
 * AUX Audit Module - Test Setup Verification
 * 
 * This test file verifies that the testing framework is properly configured
 * for property-based testing with fast-check.
 * 
 * @module lib/auxAudit/__tests__/setup.test.ts
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import type {
  AUXAuditResults,
  ProtocolStatus,
  InteractiveElement,
  FrictionPoint,
  Recommendation,
  IntentTrigger,
  Classification,
  RiskLevel,
  Priority,
  Confidence,
  Severity,
  FrictionType,
} from '../types';

describe('AUX Audit Module - Test Setup', () => {
  it('should have fast-check properly configured', () => {
    // Simple property test to verify fast-check is working
    fc.assert(
      fc.property(fc.integer(), (n) => {
        expect(typeof n).toBe('number');
        return true;
      }),
      { numRuns: 10 }
    );
  });

  it('should be able to import all type definitions', () => {
    // Verify all types are properly exported
    const classification: Classification = 'Agent-Ready';
    const riskLevel: RiskLevel = 'low';
    const priority: Priority = 'high';
    const confidence: Confidence = 'high';
    const severity: Severity = 'medium';
    const frictionType: FrictionType = 'captcha';

    expect(classification).toBe('Agent-Ready');
    expect(riskLevel).toBe('low');
    expect(priority).toBe('high');
    expect(confidence).toBe('high');
    expect(severity).toBe('medium');
    expect(frictionType).toBe('captcha');
  });

  it('should support property-based testing with minimum 100 iterations', () => {
    let runCount = 0;
    
    fc.assert(
      fc.property(fc.nat(100), (score) => {
        runCount++;
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);
        return true;
      }),
      { numRuns: 100 }
    );

    expect(runCount).toBe(100);
  });
});

/**
 * Custom Generators (Arbitraries) for AUX Audit Types
 * 
 * These generators will be used in property-based tests throughout the module.
 */

/**
 * Generator for Classification values
 */
export const classificationArbitrary = fc.constantFrom<Classification>(
  'Agent-Blind',
  'Agent-Capable',
  'Agent-Ready'
);

/**
 * Generator for RiskLevel values
 */
export const riskLevelArbitrary = fc.constantFrom<RiskLevel>(
  'low',
  'medium',
  'high'
);

/**
 * Generator for Priority values
 */
export const priorityArbitrary = fc.constantFrom<Priority>(
  'low',
  'medium',
  'high'
);

/**
 * Generator for Confidence values
 */
export const confidenceArbitrary = fc.constantFrom<Confidence>(
  'low',
  'medium',
  'high'
);

/**
 * Generator for Severity values
 */
export const severityArbitrary = fc.constantFrom<Severity>(
  'low',
  'medium',
  'high'
);

/**
 * Generator for FrictionType values
 */
export const frictionTypeArbitrary = fc.constantFrom<FrictionType>(
  'captcha',
  'interstitial',
  'canvas',
  'auth-wall',
  'other'
);

/**
 * Generator for valid URLs
 */
export const urlArbitrary = fc.webUrl();

/**
 * Generator for ProtocolStatus objects
 */
export const protocolStatusArbitrary: fc.Arbitrary<ProtocolStatus> = fc.record({
  name: fc.constantFrom('agents.json', 'ai-plugin.json', 'mcp.json', 'robots.txt'),
  available: fc.boolean(),
  url: urlArbitrary,
  content: fc.option(fc.jsonValue(), { nil: undefined }),
});

/**
 * Generator for InteractiveElement objects
 */
export const interactiveElementArbitrary: fc.Arbitrary<InteractiveElement> = fc.record({
  tag: fc.constantFrom('button', 'a', 'input', 'select'),
  selector: fc.string({ minLength: 1, maxLength: 50 }),
  hasAriaLabel: fc.boolean(),
  ariaLabel: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
  role: fc.option(fc.string({ minLength: 1, maxLength: 30 }), { nil: undefined }),
  text: fc.option(fc.string({ minLength: 0, maxLength: 100 }), { nil: undefined }),
  type: fc.option(fc.constantFrom('text', 'email', 'password', 'submit', 'button'), { nil: undefined }),
});

/**
 * Generator for FrictionPoint objects
 */
export const frictionPointArbitrary: fc.Arbitrary<FrictionPoint> = fc.record({
  type: frictionTypeArbitrary,
  description: fc.string({ minLength: 10, maxLength: 200 }),
  severity: severityArbitrary,
  location: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
});

/**
 * Generator for Recommendation objects
 */
export const recommendationArbitrary: fc.Arbitrary<Recommendation> = fc.record({
  title: fc.string({ minLength: 5, maxLength: 100 }),
  description: fc.string({ minLength: 20, maxLength: 500 }),
  priority: priorityArbitrary,
  impact: fc.nat(100),
  codeExample: fc.option(fc.string({ minLength: 10, maxLength: 500 }), { nil: undefined }),
  docLink: fc.option(urlArbitrary, { nil: undefined }),
});

/**
 * Generator for IntentTrigger objects
 */
export const intentTriggerArbitrary: fc.Arbitrary<IntentTrigger> = fc.record({
  intent: fc.constantFrom('buy', 'book', 'login', 'signup', 'search', 'contact'),
  selector: fc.string({ minLength: 1, maxLength: 50 }),
  confidence: confidenceArbitrary,
  element: interactiveElementArbitrary,
});

/**
 * Generator for AUX Score (0-100)
 */
export const auxScoreArbitrary = fc.nat(100);

/**
 * Generator for complete AUXAuditResults objects
 */
export const auxAuditResultsArbitrary: fc.Arbitrary<AUXAuditResults> = fc.record({
  score: auxScoreArbitrary,
  classification: classificationArbitrary,
  protocols: fc.array(protocolStatusArbitrary, { minLength: 0, maxLength: 4 }),
  ariaScore: fc.nat(100),
  interactiveElements: fc.array(interactiveElementArbitrary, { minLength: 0, maxLength: 50 }),
  frictionPoints: fc.array(frictionPointArbitrary, { minLength: 0, maxLength: 10 }),
  recommendations: fc.array(recommendationArbitrary, { minLength: 0, maxLength: 10 }),
  intentTriggers: fc.array(intentTriggerArbitrary, { minLength: 0, maxLength: 20 }),
  summary: fc.string({ minLength: 50, maxLength: 500 }),
  riskLevel: riskLevelArbitrary,
  analyzedAt: fc.date().map(d => d.toISOString()),
});

describe('AUX Audit Module - Generator Tests', () => {
  it('should generate valid ProtocolStatus objects', () => {
    fc.assert(
      fc.property(protocolStatusArbitrary, (protocol) => {
        expect(protocol).toHaveProperty('name');
        expect(protocol).toHaveProperty('available');
        expect(protocol).toHaveProperty('url');
        expect(['agents.json', 'ai-plugin.json', 'mcp.json', 'robots.txt']).toContain(protocol.name);
        expect(typeof protocol.available).toBe('boolean');
        expect(typeof protocol.url).toBe('string');
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('should generate valid InteractiveElement objects', () => {
    fc.assert(
      fc.property(interactiveElementArbitrary, (element) => {
        expect(element).toHaveProperty('tag');
        expect(element).toHaveProperty('selector');
        expect(element).toHaveProperty('hasAriaLabel');
        expect(['button', 'a', 'input', 'select']).toContain(element.tag);
        expect(typeof element.hasAriaLabel).toBe('boolean');
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('should generate valid AUXAuditResults objects', () => {
    fc.assert(
      fc.property(auxAuditResultsArbitrary, (results) => {
        expect(results.score).toBeGreaterThanOrEqual(0);
        expect(results.score).toBeLessThanOrEqual(100);
        expect(results.ariaScore).toBeGreaterThanOrEqual(0);
        expect(results.ariaScore).toBeLessThanOrEqual(100);
        expect(['Agent-Blind', 'Agent-Capable', 'Agent-Ready']).toContain(results.classification);
        expect(['low', 'medium', 'high']).toContain(results.riskLevel);
        expect(Array.isArray(results.protocols)).toBe(true);
        expect(Array.isArray(results.interactiveElements)).toBe(true);
        expect(Array.isArray(results.frictionPoints)).toBe(true);
        expect(Array.isArray(results.recommendations)).toBe(true);
        expect(Array.isArray(results.intentTriggers)).toBe(true);
        return true;
      }),
      { numRuns: 100 }
    );
  });
});
