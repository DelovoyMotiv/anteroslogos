/**
 * Tracing Configuration
 * 
 * Provides default configuration and environment-based setup
 */

import type { TracingConfig } from './tracer';

/**
 * Get tracing configuration from environment variables
 */
export function getTracingConfig(): TracingConfig {
  return {
    serviceName: process.env.OTEL_SERVICE_NAME || 'anoteros-logos',
    serviceVersion: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    otlpEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
    enabled: process.env.OTEL_TRACING_ENABLED !== 'false',
    sampleRate: parseFloat(process.env.OTEL_SAMPLE_RATE || '1.0'),
  };
}

/**
 * Default tracing configuration for development
 */
export const defaultTracingConfig: TracingConfig = {
  serviceName: 'anoteros-logos',
  serviceVersion: '1.0.0',
  environment: 'development',
  otlpEndpoint: 'http://localhost:4318/v1/traces',
  enabled: true,
  sampleRate: 1.0,
};

/**
 * Production tracing configuration
 */
export const productionTracingConfig: TracingConfig = {
  serviceName: 'anoteros-logos',
  serviceVersion: '1.0.0',
  environment: 'production',
  otlpEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'https://api.honeycomb.io',
  enabled: true,
  sampleRate: 0.1, // Sample 10% of traces in production
};
