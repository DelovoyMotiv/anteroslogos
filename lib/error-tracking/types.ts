/**
 * Type definitions for error tracking
 */

import type { JSONValue } from '../../types/common.types';

/**
 * Sentry configuration options
 */
export interface SentryConfig {
  /** Sentry DSN (Data Source Name) */
  dsn: string;
  
  /** Environment name (development, staging, production) */
  environment: string;
  
  /** Application release version */
  release?: string;
  
  /** Sample rate for error events (0.0 to 1.0) */
  sampleRate?: number;
  
  /** Sample rate for performance traces (0.0 to 1.0) */
  tracesSampleRate?: number;
  
  /** Enable debug mode */
  debug?: boolean;
  
  /** Attach stack traces to messages */
  attachStacktrace?: boolean;
  
  /** Enable automatic session tracking */
  autoSessionTracking?: boolean;
  
  /** Server name for identification */
  serverName?: string;
  
  /** Maximum breadcrumbs to keep */
  maxBreadcrumbs?: number;
  
  /** Before send hook to filter/modify events */
  beforeSend?: (event: JSONValue, hint: JSONValue) => JSONValue | null;
  
  /** Before breadcrumb hook to filter/modify breadcrumbs */
  beforeBreadcrumb?: (breadcrumb: JSONValue, hint: JSONValue) => JSONValue | null;
}

/**
 * User context for error tracking
 */
export interface UserContext {
  /** User ID */
  id?: string;
  
  /** User email */
  email?: string;
  
  /** Username */
  username?: string;
  
  /** User IP address */
  ip_address?: string;
  
  /** Additional user data */
  [key: string]: JSONValue | undefined;
}

/**
 * Breadcrumb for tracking user actions
 */
export interface Breadcrumb {
  /** Breadcrumb type */
  type?: 'default' | 'debug' | 'error' | 'navigation' | 'http' | 'info' | 'query' | 'transaction' | 'ui' | 'user';
  
  /** Breadcrumb level */
  level?: 'fatal' | 'error' | 'warning' | 'log' | 'info' | 'debug';
  
  /** Breadcrumb message */
  message?: string;
  
  /** Breadcrumb category */
  category?: string;
  
  /** Breadcrumb data */
  data?: Record<string, JSONValue>;
  
  /** Timestamp */
  timestamp?: number;
}

/**
 * Error severity levels
 */
export type ErrorSeverity = 'fatal' | 'error' | 'warning' | 'log' | 'info' | 'debug';

/**
 * Error context for additional information
 */
export interface ErrorContext {
  /** Tags for categorization */
  tags?: Record<string, string>;
  
  /** Extra data */
  extra?: Record<string, JSONValue>;
  
  /** User context */
  user?: UserContext;
  
  /** Request context */
  request?: {
    url?: string;
    method?: string;
    headers?: Record<string, string>;
    data?: JSONValue;
  };
  
  /** Severity level */
  level?: ErrorSeverity;
}
