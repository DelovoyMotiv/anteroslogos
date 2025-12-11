/**
 * React-specific error tracking utilities
 * 
 * Provides React error boundary and hooks for error tracking.
 */

import * as Sentry from '@sentry/react';
import type { SentryConfig } from './types';

let isInitialized = false;

/**
 * Initialize Sentry for React applications
 * 
 * @param config - Sentry configuration options
 */
export function initSentryReact(config: SentryConfig): void {
  if (isInitialized) {
    console.warn('Sentry React already initialized');
    return;
  }

  if (!config.dsn) {
    console.warn('Sentry DSN not provided, error tracking disabled');
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
      maxBreadcrumbs: config.maxBreadcrumbs ?? 100,
      
      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration({
          maskAllText: true,
          blockAllMedia: true,
        }),
      ],
      
      // Performance monitoring
      tracePropagationTargets: ['localhost', /^https:\/\/anoteroslogos\.com/],
      
      // Session replay
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
      
      // Filter sensitive data
      beforeSend: (event, hint) => {
        // Remove sensitive data from breadcrumbs
        if (event.breadcrumbs) {
          event.breadcrumbs = event.breadcrumbs.map(breadcrumb => {
            if (breadcrumb.data) {
              const sensitiveKeys = ['password', 'token', 'secret', 'apiKey'];
              for (const key of sensitiveKeys) {
                if (key in breadcrumb.data) {
                  breadcrumb.data[key] = '[REDACTED]';
                }
              }
            }
            return breadcrumb;
          });
        }
        
        // Call custom beforeSend if provided
        if (config.beforeSend) {
          return config.beforeSend(event as any, hint as any) as any;
        }
        
        return event;
      },
      
      beforeBreadcrumb: config.beforeBreadcrumb 
        ? (breadcrumb, hint) => {
            return config.beforeBreadcrumb!(breadcrumb as any, hint as any) as any;
          }
        : undefined,
    });

    isInitialized = true;
    console.log('Sentry React error tracking initialized');
  } catch (error) {
    console.error('Failed to initialize Sentry React', error);
  }
}

/**
 * React Error Boundary component
 * 
 * @example
 * ```tsx
 * import { ErrorBoundary } from '@/lib/error-tracking/react';
 * 
 * function App() {
 *   return (
 *     <ErrorBoundary fallback={<ErrorFallback />}>
 *       <YourApp />
 *     </ErrorBoundary>
 *   );
 * }
 * ```
 */
export const ErrorBoundary = Sentry.ErrorBoundary;

/**
 * Higher-order component to wrap components with error boundary
 * 
 * @example
 * ```tsx
 * const MyComponentWithErrorBoundary = withErrorBoundary(MyComponent, {
 *   fallback: <ErrorFallback />,
 *   showDialog: true,
 * });
 * ```
 */
export const withErrorBoundary = Sentry.withErrorBoundary;

/**
 * Hook to capture errors in React components
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const captureError = useSentryError();
 *   
 *   const handleClick = async () => {
 *     try {
 *       await riskyOperation();
 *     } catch (error) {
 *       captureError(error, { tags: { component: 'MyComponent' } });
 *     }
 *   };
 *   
 *   return <button onClick={handleClick}>Click me</button>;
 * }
 * ```
 */
export function useSentryError() {
  return (error: Error | unknown, context?: any) => {
    if (!isInitialized) {
      console.warn('Sentry not initialized, error not captured');
      return '';
    }
    
    return Sentry.captureException(error, context);
  };
}

/**
 * Hook to set user context
 * 
 * @example
 * ```tsx
 * function UserProfile({ user }) {
 *   const setUser = useSentryUser();
 *   
 *   useEffect(() => {
 *     setUser({
 *       id: user.id,
 *       email: user.email,
 *       username: user.username,
 *     });
 *   }, [user, setUser]);
 *   
 *   return <div>...</div>;
 * }
 * ```
 */
export function useSentryUser() {
  return (user: any) => {
    if (!isInitialized) {
      return;
    }
    
    Sentry.setUser(user);
  };
}

/**
 * Hook to add breadcrumbs
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const addBreadcrumb = useSentryBreadcrumb();
 *   
 *   const handleClick = () => {
 *     addBreadcrumb({
 *       type: 'user',
 *       category: 'action',
 *       message: 'User clicked button',
 *       level: 'info',
 *     });
 *   };
 *   
 *   return <button onClick={handleClick}>Click me</button>;
 * }
 * ```
 */
export function useSentryBreadcrumb() {
  return (breadcrumb: any, hint?: any) => {
    if (!isInitialized) {
      return;
    }
    
    Sentry.addBreadcrumb(breadcrumb, hint);
  };
}

/**
 * Create a Sentry-wrapped React Router v6
 */
export const wrapCreateBrowserRouter = Sentry.wrapCreateBrowserRouterV6;

/**
 * Profiler component for performance monitoring
 */
export const Profiler = Sentry.Profiler;

/**
 * Check if Sentry React is initialized
 */
export function isReady(): boolean {
  return isInitialized;
}
