/**
 * Vitest Setup File
 * Runs before all tests to configure mocks and environment
 */

import { vi } from 'vitest';

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
