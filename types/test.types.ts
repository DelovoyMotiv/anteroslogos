/**
 * Test Utilities Type Definitions - Production-Grade Type Safety
 * 
 * Comprehensive type system for test assertion helpers and utilities.
 * Eliminates 'any' types with precise TypeScript definitions.
 * 
 * @module types/test.types
 */

import type { JSONValue } from './common.types';

// =====================================================
// ASSERTION TYPES
// =====================================================

/**
 * Comparable value - any value that can be compared for equality
 */
export type ComparableValue = JSONValue | undefined | null | boolean | number | string | Date | RegExp;

/**
 * Assertion error with detailed context
 */
export interface AssertionError extends Error {
  name: 'AssertionError';
  actual?: ComparableValue;
  expected?: ComparableValue;
  operator?: string;
  message: string;
  stack?: string;
}

/**
 * Test result metadata
 */
export interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration?: number;
  timestamp?: number;
}

/**
 * Test suite configuration
 */
export interface TestSuiteConfig {
  name: string;
  timeout?: number;
  retries?: number;
  parallel?: boolean;
  beforeAll?: () => Promise<void> | void;
  afterAll?: () => Promise<void> | void;
  beforeEach?: () => Promise<void> | void;
  afterEach?: () => Promise<void> | void;
}

// =====================================================
// ASSERTION FUNCTION TYPES
// =====================================================

/**
 * Assert equality between two values
 */
export type AssertEquals = <T extends ComparableValue>(
  actual: T,
  expected: T,
  message?: string
) => void | never;

/**
 * Assert value exists (not null/undefined)
 */
export type AssertExists = <T>(
  value: T | null | undefined,
  message?: string
) => asserts value is T;

/**
 * Assert value is truthy
 */
export type AssertTruthy = (
  value: unknown,
  message?: string
) => asserts value;

/**
 * Assert value is falsy
 */
export type AssertFalsy = (
  value: unknown,
  message?: string
) => void | never;

/**
 * Assert boolean is true
 */
export type AssertTrue = (
  value: boolean,
  message?: string
) => void | never;

/**
 * Assert boolean is false
 */
export type AssertFalse = (
  value: boolean,
  message?: string
) => void | never;

/**
 * Assert string matches pattern
 */
export type AssertMatch = (
  value: string,
  pattern: RegExp,
  message?: string
) => void | never;

/**
 * Assert value is instance of class
 */
export type AssertInstanceOf = <T>(
  value: unknown,
  constructor: new (...args: unknown[]) => T,
  message?: string
) => asserts value is T;

/**
 * Assert function throws error
 */
export type AssertThrows = (
  fn: () => unknown,
  errorClass?: new (...args: unknown[]) => Error,
  message?: string
) => void | never;

/**
 * Assert async function throws error
 */
export type AssertThrowsAsync = (
  fn: () => Promise<unknown>,
  errorClass?: new (...args: unknown[]) => Error,
  message?: string
) => Promise<void>;

/**
 * Assert array contains value
 */
export type AssertContains = <T>(
  array: T[],
  value: T,
  message?: string
) => void | never;

/**
 * Assert object has property
 */
export type AssertHasProperty = <T extends object, K extends PropertyKey>(
  obj: T,
  property: K,
  message?: string
) => asserts obj is T & Record<K, unknown>;

/**
 * Assert value is within range
 */
export type AssertInRange = (
  value: number,
  min: number,
  max: number,
  message?: string
) => void | never;

/**
 * Assert arrays are equal (deep comparison)
 */
export type AssertArrayEquals = <T extends ComparableValue>(
  actual: T[],
  expected: T[],
  message?: string
) => void | never;

/**
 * Assert objects are equal (deep comparison)
 */
export type AssertObjectEquals = <T extends Record<string, ComparableValue>>(
  actual: T,
  expected: T,
  message?: string
) => void | never;

// =====================================================
// TEST RUNNER TYPES
// =====================================================

/**
 * Test function
 */
export type TestFunction = () => Promise<void> | void;

/**
 * Test wrapper that captures results
 */
export type TestWrapper = (
  name: string,
  fn: TestFunction
) => () => Promise<void>;

/**
 * Test suite runner
 */
export interface TestRunner {
  test: TestWrapper;
  describe: (name: string, fn: () => void) => void;
  beforeAll: (fn: () => Promise<void> | void) => void;
  afterAll: (fn: () => Promise<void> | void) => void;
  beforeEach: (fn: () => Promise<void> | void) => void;
  afterEach: (fn: () => Promise<void> | void) => void;
  run: () => Promise<TestResult[]>;
}

// =====================================================
// MOCK TYPES
// =====================================================

/**
 * Mock function call record
 */
export interface MockCall<TArgs extends unknown[] = unknown[], TReturn = unknown> {
  args: TArgs;
  result?: TReturn;
  error?: Error;
  timestamp: number;
}

/**
 * Mock function
 */
export interface MockFunction<TArgs extends unknown[] = unknown[], TReturn = unknown> {
  (...args: TArgs): TReturn;
  calls: MockCall<TArgs, TReturn>[];
  mockReturnValue: (value: TReturn) => MockFunction<TArgs, TReturn>;
  mockReturnValueOnce: (value: TReturn) => MockFunction<TArgs, TReturn>;
  mockResolvedValue: (value: TReturn) => MockFunction<TArgs, Promise<TReturn>>;
  mockRejectedValue: (error: Error) => MockFunction<TArgs, Promise<TReturn>>;
  mockImplementation: (fn: (...args: TArgs) => TReturn) => MockFunction<TArgs, TReturn>;
  mockClear: () => void;
  mockReset: () => void;
}

/**
 * Spy on object method
 */
export type SpyFunction<T extends object, K extends keyof T> = T[K] extends (...args: infer TArgs) => infer TReturn
  ? MockFunction<TArgs, TReturn>
  : never;

// =====================================================
// FIXTURE TYPES
// =====================================================

/**
 * Test fixture data
 */
export interface TestFixture<T = unknown> {
  name: string;
  data: T;
  setup?: () => Promise<void> | void;
  teardown?: () => Promise<void> | void;
}

/**
 * Test fixture loader
 */
export type FixtureLoader<T = unknown> = (name: string) => Promise<TestFixture<T>> | TestFixture<T>;

// =====================================================
// HTTP TEST TYPES
// =====================================================

/**
 * HTTP test request options
 */
export interface HTTPTestRequest {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
  url: string;
  headers?: Record<string, string>;
  body?: JSONValue;
  query?: Record<string, string | string[]>;
  timeout?: number;
}

/**
 * HTTP test response
 */
export interface HTTPTestResponse<T = JSONValue> {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: T;
  duration: number;
}

/**
 * HTTP test client
 */
export interface HTTPTestClient {
  request: <T = JSONValue>(options: HTTPTestRequest) => Promise<HTTPTestResponse<T>>;
  get: <T = JSONValue>(url: string, options?: Partial<HTTPTestRequest>) => Promise<HTTPTestResponse<T>>;
  post: <T = JSONValue>(url: string, body?: JSONValue, options?: Partial<HTTPTestRequest>) => Promise<HTTPTestResponse<T>>;
  put: <T = JSONValue>(url: string, body?: JSONValue, options?: Partial<HTTPTestRequest>) => Promise<HTTPTestResponse<T>>;
  delete: <T = JSONValue>(url: string, options?: Partial<HTTPTestRequest>) => Promise<HTTPTestResponse<T>>;
}

// =====================================================
// CRYPTO TEST TYPES
// =====================================================

/**
 * Cryptographic key pair for testing
 */
export interface TestKeyPair {
  publicKey: string;
  privateKey: string;
  algorithm: 'ed25519' | 'rsa' | 'ecdsa';
}

/**
 * Signature verification result
 */
export interface SignatureVerification {
  valid: boolean;
  publicKey: string;
  signature: string;
  message: string;
  algorithm: string;
}

/**
 * Challenge test data
 */
export interface ChallengeTestData {
  challenge: string;
  signature: string;
  publicKey: string;
  expiresAt: number;
  nonce?: string;
}

// =====================================================
// PERFORMANCE TEST TYPES
// =====================================================

/**
 * Performance benchmark result
 */
export interface BenchmarkResult {
  name: string;
  iterations: number;
  totalTime: number;
  averageTime: number;
  minTime: number;
  maxTime: number;
  standardDeviation: number;
  operationsPerSecond: number;
}

/**
 * Performance test configuration
 */
export interface PerformanceTestConfig {
  iterations?: number;
  warmupIterations?: number;
  timeout?: number;
  minSampleSize?: number;
}

// =====================================================
// SNAPSHOT TEST TYPES
// =====================================================

/**
 * Snapshot test data
 */
export interface Snapshot<T = unknown> {
  name: string;
  value: T;
  timestamp: number;
  metadata?: Record<string, ComparableValue>;
}

/**
 * Snapshot matcher
 */
export type SnapshotMatcher = <T>(
  value: T,
  snapshotName?: string
) => void | never;

// =====================================================
// PROPERTY-BASED TEST TYPES
// =====================================================

/**
 * Property test generator
 */
export type PropertyGenerator<T> = () => T;

/**
 * Property test configuration
 */
export interface PropertyTestConfig {
  iterations?: number;
  seed?: number;
  shrink?: boolean;
  timeout?: number;
}

/**
 * Property test result
 */
export interface PropertyTestResult {
  passed: boolean;
  iterations: number;
  counterexample?: unknown;
  shrunkCounterexample?: unknown;
  error?: Error;
}

// =====================================================
// UTILITY TYPES
// =====================================================

/**
 * Deep partial - make all properties optional recursively
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Deep readonly - make all properties readonly recursively
 */
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

/**
 * Awaited type - unwrap Promise type
 */
export type Awaited<T> = T extends Promise<infer U> ? U : T;

/**
 * Extract function parameters
 */
export type Parameters<T extends (...args: unknown[]) => unknown> = T extends (...args: infer P) => unknown ? P : never;

/**
 * Extract function return type
 */
export type ReturnType<T extends (...args: unknown[]) => unknown> = T extends (...args: unknown[]) => infer R ? R : never;
