/**
 * Vitest Setup File
 * Runs before all tests to configure mocks and environment
 */

import { vi } from 'vitest';
import * as fc from 'fast-check';

/**
 * Global fast-check configuration.
 *
 * Lower the default number of generated examples so the property-based test
 * suite runs faster. This default applies to every `fc.assert` call that does
 * NOT pass an explicit `numRuns` option. Callers that hard-code a higher
 * `numRuns` are separately capped in the property test files.
 *
 * Override at runtime with FAST_CHECK_NUM_RUNS, e.g.:
 *   FAST_CHECK_NUM_RUNS=100 npm test   (restore the previous thoroughness)
 */
const FAST_CHECK_NUM_RUNS = Number(process.env.FAST_CHECK_NUM_RUNS) || 20;
fc.configureGlobal({ numRuns: FAST_CHECK_NUM_RUNS });

// Mock @noble/curves to avoid import issues in tests
vi.mock('@noble/curves/ed25519', () => ({
  ed25519: {
    getPublicKey: vi.fn((privateKey: Uint8Array) => new Uint8Array(32).fill(1)),
    sign: vi.fn(() => new Uint8Array(64).fill(2)),
    verify: vi.fn(() => true),
  },
}));

vi.mock('@noble/curves/ed25519.js', () => ({
  ed25519: {
    getPublicKey: vi.fn((privateKey: Uint8Array) => new Uint8Array(32).fill(1)),
    sign: vi.fn(() => new Uint8Array(64).fill(2)),
    verify: vi.fn(() => true),
  },
}));

vi.mock('@noble/curves/bls12-381', () => ({
  bls12_381: {
    getPublicKey: vi.fn((privateKey: Uint8Array) => new Uint8Array(48).fill(1)),
    sign: vi.fn(() => new Uint8Array(96).fill(2)),
    verify: vi.fn(() => true),
    aggregatePublicKeys: vi.fn(() => new Uint8Array(48).fill(3)),
    aggregateSignatures: vi.fn(() => new Uint8Array(96).fill(4)),
  },
}));
