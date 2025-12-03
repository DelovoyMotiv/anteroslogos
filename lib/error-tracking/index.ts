/**
 * Error Tracking Module - Sentry Integration
 * 
 * Features:
 * - Automatic error capture and reporting
 * - User context tracking
 * - Performance monitoring
 * - Source map support
 * - Environment-based configuration
 * 
 * **Feature: production-audit-improvements, Property 46: Error Tracking Integration**
 * **Validates: Requirements 8.5**
 * 
 * @module lib/error-tracking
 */

export { initSentry, captureError, captureException, setUserContext, addBreadcrumb } from './sentry';
export type { SentryConfig, UserContext, Breadcrumb } from './types';
