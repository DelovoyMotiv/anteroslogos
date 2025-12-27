# AUX Audit Module - Testing Documentation

## Overview

This directory contains property-based tests for the AUX (Agent Experience) Audit module using **fast-check** for property-based testing and **Vitest** as the test runner.

## Test Configuration

### Property-Based Testing Setup

- **Library**: fast-check v4.3.0
- **Test Runner**: Vitest v4.0.14
- **Minimum Iterations**: 100 runs per property test
- **Configuration**: Inherits from root `vitest.config.ts`

### Test File Naming Convention

- Property-based tests: `*.property.test.ts`
- Unit tests: `*.test.ts`
- Integration tests: `*.integration.test.ts`

## Custom Generators (Arbitraries)

The `setup.test.ts` file exports custom generators for all AUX Audit types:

### Basic Type Generators
- `classificationArbitrary` - Generates Classification values
- `riskLevelArbitrary` - Generates RiskLevel values
- `priorityArbitrary` - Generates Priority values
- `confidenceArbitrary` - Generates Confidence values
- `severityArbitrary` - Generates Severity values
- `frictionTypeArbitrary` - Generates FrictionType values

### Complex Object Generators
- `protocolStatusArbitrary` - Generates ProtocolStatus objects
- `interactiveElementArbitrary` - Generates InteractiveElement objects
- `frictionPointArbitrary` - Generates FrictionPoint objects
- `recommendationArbitrary` - Generates Recommendation objects
- `intentTriggerArbitrary` - Generates IntentTrigger objects
- `auxAuditResultsArbitrary` - Generates complete AUXAuditResults objects

### Utility Generators
- `urlArbitrary` - Generates valid URLs
- `auxScoreArbitrary` - Generates AUX scores (0-100)

## Usage Example

```typescript
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { auxScoreArbitrary, classificationArbitrary } from './setup.test';

describe('Feature: aux-audit-module, Property 13: Score Classification Correctness', () => {
  it('should correctly classify scores', () => {
    fc.assert(
      fc.property(auxScoreArbitrary, (score) => {
        const classification = classifyScore(score);
        
        if (score < 50) {
          expect(classification).toBe('Agent-Blind');
        } else if (score <= 80) {
          expect(classification).toBe('Agent-Capable');
        } else {
          expect(classification).toBe('Agent-Ready');
        }
      }),
      { numRuns: 100 }
    );
  });
});
```

## Property Test Tagging

Each property test must include a comment tag referencing the design document:

```typescript
/**
 * Feature: aux-audit-module, Property {number}: {property_text}
 * Validates: Requirements X.Y, X.Z
 */
```

## Running Tests

```bash
# Run all AUX Audit tests
npm test -- lib/auxAudit

# Run specific test file
npm test -- lib/auxAudit/__tests__/setup.test.ts

# Run with coverage
npm run test:coverage -- lib/auxAudit

# Run in watch mode (development)
npm run test:watch -- lib/auxAudit
```

## Test Coverage Goals

- **Unit test coverage**: >80% of lines
- **Property test coverage**: All 23 correctness properties from design document
- **Integration test coverage**: All major user flows
- **Error path coverage**: All error codes and recovery paths

## Correctness Properties

The design document defines 23 correctness properties that must be validated:

1. Protocol Discovery Completeness
2. Robots.txt Parsing Accuracy
3. Interactive Element Extraction Completeness
4. ARIA Attribute Identification
5. ARIA Density Calculation Correctness
6. CAPTCHA Detection Accuracy
7. Friction Point Categorization
8. API Request Validation
9. API Success Response Structure
10. LLM Prompt Data Completeness
11. LLM Response Parsing Robustness
12. AUX Score Range Constraint
13. Score Classification Correctness
14. UI Score Color Coding
15. Recommendation Prioritization
16. Recommendation Completeness
17. Timeout Error Handling
18. Protocol Cache Consistency
19. Rate Limiting Enforcement
20. Error Response Consistency
21. Error Logging Completeness
22. JSON Serialization Round-Trip
23. Request Schema Validation

Each property will have a corresponding property-based test as implementation progresses.

## Best Practices

1. **Always use generators**: Import and use the custom generators from `setup.test.ts`
2. **Minimum 100 runs**: Configure `{ numRuns: 100 }` for all property tests
3. **Tag your tests**: Include the feature and property number in test descriptions
4. **Test real functionality**: Avoid mocks when possible; test actual implementations
5. **Focus on properties**: Property tests should validate universal rules, not specific examples
6. **Complement with unit tests**: Use unit tests for specific examples and edge cases

## Troubleshooting

### Tests timing out
- Increase timeout in test configuration
- Check for infinite loops in generators
- Verify external service mocks are working

### Generators producing invalid data
- Review generator constraints
- Add filters to exclude invalid cases
- Check type definitions match implementation

### Property tests failing inconsistently
- Increase number of runs to find edge cases
- Add logging to see generated values
- Use `fc.sample()` to inspect generator output

## References

- [fast-check Documentation](https://fast-check.dev/)
- [Vitest Documentation](https://vitest.dev/)
- [AUX Audit Design Document](../../.kiro/specs/aux-audit-module/design.md)
- [AUX Audit Requirements](../../.kiro/specs/aux-audit-module/requirements.md)
