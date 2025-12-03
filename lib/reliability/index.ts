/**
 * Reliability Module - Production-Ready Fault Tolerance
 * 
 * This module provides comprehensive reliability utilities for production systems:
 * - Custom error classes with correlation IDs
 * - Retry logic with exponential backoff and jitter
 * - Circuit breaker pattern
 * - Health check system
 * - Graceful shutdown management
 * - Concurrency control (locks, mutexes)
 * - External API integration with resilience
 * 
 * @module lib/reliability
 */

// Error classes
export * from './errors';

// Retry logic
export * from './retry';

// Circuit breaker
export * from './circuitBreaker';

// Health checks
export * from './health';

// Graceful shutdown
export * from './shutdown';

// Concurrency control
export * from './concurrency';

// External API integration
export * from './externalApi';
