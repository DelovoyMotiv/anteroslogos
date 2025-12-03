/**
 * Sentry configuration helper
 * 
 * Provides environment-based configuration for Sentry.
 */

import type { SentryConfig } from './types';

/**
 * Get Sentry configuration from environment variables
 * 
 * Environment variables:
 * - SENTRY_DSN: Sentry Data Source Name
 * - SENTRY_ENVIRONMENT: Environment name (development, staging, production)
 * - SENTRY_RELEASE: Release version (e.g., git commit SHA)
 * - SENTRY_SAMPLE_RATE: Error sample rate (0.0 to 1.0)
 * - SENTRY_TRACES_SAMPLE_RATE: Traces sample rate (0.0 to 1.0)
 * - SENTRY_DEBUG: Enable debug mode (true/false)
 * 
 * @returns Sentry configuration
 */
export function getSentryConfig(): SentryConfig {
  const environment = process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development';
  const isDevelopment = environment === 'development';
  const isProduction = environment === 'production';

  return {
    dsn: process.env.SENTRY_DSN || '',
    environment,
    release: process.env.SENTRY_RELEASE || process.env.VERCEL_GIT_COMMIT_SHA || 'unknown',
    
    // Sample rates
    sampleRate: parseFloat(process.env.SENTRY_SAMPLE_RATE || '1.0'),
    tracesSampleRate: parseFloat(
      process.env.SENTRY_TRACES_SAMPLE_RATE || (isProduction ? '0.1' : '1.0')
    ),
    
    // Debug mode
    debug: process.env.SENTRY_DEBUG === 'true' || isDevelopment,
    
    // Options
    attachStacktrace: true,
    autoSessionTracking: true,
    maxBreadcrumbs: 100,
    
    // Server name for identification
    serverName: process.env.VERCEL_REGION || process.env.HOSTNAME || 'unknown',
  };
}

/**
 * Validate Sentry configuration
 * 
 * @param config - Sentry configuration
 * @returns True if configuration is valid
 */
export function validateSentryConfig(config: SentryConfig): boolean {
  if (!config.dsn) {
    console.warn('Sentry DSN is not configured');
    return false;
  }

  if (!config.dsn.startsWith('https://')) {
    console.error('Invalid Sentry DSN format');
    return false;
  }

  if (config.sampleRate !== undefined && (config.sampleRate < 0 || config.sampleRate > 1)) {
    console.error('Sentry sample rate must be between 0.0 and 1.0');
    return false;
  }

  if (config.tracesSampleRate !== undefined && (config.tracesSampleRate < 0 || config.tracesSampleRate > 1)) {
    console.error('Sentry traces sample rate must be between 0.0 and 1.0');
    return false;
  }

  return true;
}

/**
 * Get recommended Sentry configuration for different environments
 */
export const SENTRY_CONFIGS = {
  development: {
    sampleRate: 1.0,
    tracesSampleRate: 1.0,
    debug: true,
    attachStacktrace: true,
  },
  
  staging: {
    sampleRate: 1.0,
    tracesSampleRate: 0.5,
    debug: false,
    attachStacktrace: true,
  },
  
  production: {
    sampleRate: 1.0,
    tracesSampleRate: 0.1,
    debug: false,
    attachStacktrace: true,
  },
} as const;
