/**
 * Sentry Error Tracking Implementation
 * 
 * Provides centralized error tracking and monitoring using Sentry.
 * Integrates with custom error classes and logging system.
 */

import * as Sentry from '@sentry/node';
import type { SentryConfig, UserContext, Breadcrumb, ErrorContext } from './types';

let isInitialized = false;

import type { JSONValue } from '../../types/common.types';

// Simple logger fallback to avoid circular dependencies
const log = {
  info: (msg: string, data?: JSONValue) => console.log(`[INFO] ${msg}`, data || ''),
  warn: (msg: string, data?: JSONValue) => console.warn(`[WARN] ${msg}`, data || ''),
  error: (msg: string, data?: JSONValue) => console.error(`[ERROR] ${msg}`, data || ''),
};

/**
 * Initialize Sentry error tracking
 * 
 * @param config - Sentry configuration options
 * 
 * @example
 * ```typescript
 * initSentry({
 *   dsn: process.env.SENTRY_DSN,
 *   environment: process.env.NODE_ENV || 'development',
 *   release: process.env.VERCEL_GIT_COMMIT_SHA,
 *   tracesSampleRate: 0.1,
 * });
 * ```
 */
export function initSentry(config: SentryConfig): void {
  if (isInitialized) {
    log.warn('Sentry already initialized');
    return;
  }

  if (!config.dsn) {
    log.warn('Sentry DSN not provided, error tracking disabled');
    return;
  }

  try {
    Sentry.init({
      dsn: config.dsn,
      environment: config.environment,
      release: config.release,
      sampleRate: config.sampleRate ?? 1.0,
      tracesSampleRate: config.tracesSampleRate ?? 0.1,
      debug: config.debug ?? false,
      attachStacktrace: config.attachStacktrace ?? true,
      // autoSessionTracking: config.autoSessionTracking ?? true, // Not available in @sentry/node
      serverName: config.serverName,
      maxBreadcrumbs: config.maxBreadcrumbs ?? 100,
      
      // Integrate with OpenTelemetry if available
      integrations: [
        Sentry.httpIntegration(),
        Sentry.nativeNodeFetchIntegration(),
        Sentry.expressIntegration(),
      ],
      
      // Filter sensitive data
      beforeSend: (event: any, hint: any) => {
        // Remove sensitive headers
        if (event.request?.headers) {
          delete event.request.headers['authorization'];
          delete event.request.headers['cookie'];
          delete event.request.headers['x-api-key'];
        }
        
        // Remove sensitive data from extra
        if (event.extra) {
          const sensitiveKeys = ['password', 'token', 'secret', 'apiKey', 'privateKey'];
          for (const key of sensitiveKeys) {
            if (key in event.extra) {
              event.extra[key] = '[REDACTED]';
            }
          }
        }
        
        // Call custom beforeSend if provided
        if (config.beforeSend) {
          return config.beforeSend(event, hint);
        }
        
        return event;
      },
      
      // Filter breadcrumbs
      beforeBreadcrumb: (breadcrumb: any, hint: any) => {
        // Don't log health check requests
        if (breadcrumb.category === 'http' && breadcrumb.data?.url) {
          const url = breadcrumb.data.url as string;
          if (url.includes('/health') || url.includes('/ready')) {
            return null;
          }
        }
        
        // Call custom beforeBreadcrumb if provided
        if (config.beforeBreadcrumb) {
          return config.beforeBreadcrumb(breadcrumb, hint);
        }
        
        return breadcrumb;
      },
    });

    isInitialized = true;
    log.info('Sentry error tracking initialized', {
      environment: config.environment,
      release: config.release,
    } as any);
  } catch (error) {
    log.error('Failed to initialize Sentry', { error } as any);
  }
}

/**
 * Capture an error with context
 * 
 * @param error - Error to capture
 * @param context - Additional context
 * 
 * @example
 * ```typescript
 * try {
 *   await riskyOperation();
 * } catch (error) {
 *   captureError(error, {
 *     tags: { operation: 'riskyOperation' },
 *     extra: { userId: user.id },
 *   });
 * }
 * ```
 */
export function captureError(error: Error | unknown, context?: ErrorContext): string {
  if (!isInitialized) {
    log.warn('Sentry not initialized, error not captured');
    return '';
  }

  return Sentry.captureException(error, {
    level: context?.level || 'error',
    tags: context?.tags,
    extra: context?.extra,
    user: context?.user,
    contexts: {
      request: context?.request,
    },
  });
}

/**
 * Capture an exception (alias for captureError)
 */
export const captureException = captureError;

/**
 * Capture a message
 * 
 * @param message - Message to capture
 * @param level - Severity level
 * @param context - Additional context
 */
export function captureMessage(
  message: string,
  level: 'fatal' | 'error' | 'warning' | 'log' | 'info' | 'debug' = 'info',
  context?: ErrorContext
): string {
  if (!isInitialized) {
    log.warn('Sentry not initialized, message not captured');
    return '';
  }

  return Sentry.captureMessage(message, {
    level,
    tags: context?.tags,
    extra: context?.extra,
    user: context?.user,
    contexts: {
      request: context?.request,
    },
  });
}

/**
 * Set user context for error tracking
 * 
 * @param user - User context
 * 
 * @example
 * ```typescript
 * setUserContext({
 *   id: user.id,
 *   email: user.email,
 *   username: user.username,
 * });
 * ```
 */
export function setUserContext(user: UserContext | null): void {
  if (!isInitialized) {
    return;
  }

  Sentry.setUser(user);
}

/**
 * Add a breadcrumb for tracking user actions
 * 
 * @param breadcrumb - Breadcrumb data
 * 
 * @example
 * ```typescript
 * addBreadcrumb({
 *   type: 'user',
 *   category: 'action',
 *   message: 'User clicked submit button',
 *   level: 'info',
 *   data: { formId: 'audit-form' },
 * });
 * ```
 */
export function addBreadcrumb(breadcrumb: Breadcrumb): void {
  if (!isInitialized) {
    return;
  }

  Sentry.addBreadcrumb(breadcrumb);
}

/**
 * Set a tag for categorization
 * 
 * @param key - Tag key
 * @param value - Tag value
 */
export function setTag(key: string, value: string): void {
  if (!isInitialized) {
    return;
  }

  Sentry.setTag(key, value);
}

/**
 * Set multiple tags at once
 * 
 * @param tags - Tags object
 */
export function setTags(tags: Record<string, string>): void {
  if (!isInitialized) {
    return;
  }

  Sentry.setTags(tags);
}

/**
 * Set extra context data
 * 
 * @param key - Context key
 * @param value - Context value
 */
export function setExtra(key: string, value: JSONValue): void {
  if (!isInitialized) {
    return;
  }

  Sentry.setExtra(key, value);
}

/**
 * Set multiple extra context data at once
 * 
 * @param extras - Extras object
 */
export function setExtras(extras: Record<string, JSONValue>): void {
  if (!isInitialized) {
    return;
  }

  Sentry.setExtras(extras);
}

/**
 * Set context for a specific category
 * 
 * @param name - Context name
 * @param context - Context data
 */
export function setContext(name: string, context: Record<string, JSONValue> | null): void {
  if (!isInitialized) {
    return;
  }

  Sentry.setContext(name, context);
}

/**
 * Start a new transaction for performance monitoring
 * 
 * @param name - Transaction name
 * @param op - Operation type
 * @returns Transaction object
 * 
 * @deprecated Use Sentry.startSpan instead in newer versions
 */
export function startTransaction(_name: string, _op: string = 'http.server') {
  if (!isInitialized) {
    return null;
  }

  // startTransaction is deprecated in newer Sentry versions
  // Use Sentry.startSpan instead
  return null;
}

/**
 * Flush pending events to Sentry
 * 
 * @param timeout - Timeout in milliseconds
 * @returns Promise that resolves when flush is complete
 */
export async function flush(timeout: number = 2000): Promise<boolean> {
  if (!isInitialized) {
    return true;
  }

  return Sentry.flush(timeout);
}

/**
 * Close Sentry client
 * 
 * @param timeout - Timeout in milliseconds
 * @returns Promise that resolves when close is complete
 */
export async function close(timeout: number = 2000): Promise<boolean> {
  if (!isInitialized) {
    return true;
  }

  const result = await Sentry.close(timeout);
  isInitialized = false;
  return result;
}

/**
 * Check if Sentry is initialized
 */
export function isReady(): boolean {
  return isInitialized;
}

/**
 * Wrap an async function with error tracking
 * 
 * @param fn - Function to wrap
 * @param context - Error context
 * @returns Wrapped function
 */
export function withErrorTracking<TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>,
  context?: ErrorContext
): (...args: TArgs) => Promise<TReturn> {
  return async (...args: TArgs) => {
    try {
      return await fn(...args);
    } catch (error) {
      captureError(error, context);
      throw error;
    }
  };
}

/**
 * Express middleware for error tracking
 * 
 * @deprecated Handlers API changed in newer Sentry versions
 */
export function sentryErrorMiddleware() {
  // Handlers API changed in newer Sentry versions
  // Use Sentry.setupExpressErrorHandler instead
  return (_err: any, _req: any, _res: any, next: any) => {
    next();
  };
}

/**
 * Express middleware for request tracking
 * 
 * @deprecated Handlers API changed in newer Sentry versions
 */
export function sentryRequestMiddleware() {
  // Handlers API changed in newer Sentry versions
  // Use Sentry.setupExpressErrorHandler instead
  return (_req: any, _res: any, next: any) => {
    next();
  };
}

/**
 * Express middleware for tracing
 * 
 * @deprecated Handlers API changed in newer Sentry versions
 */
export function sentryTracingMiddleware() {
  // Handlers API changed in newer Sentry versions
  return (_req: any, _res: any, next: any) => {
    next();
  };
}
