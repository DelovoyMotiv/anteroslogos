# Error Tracking Module

Comprehensive error tracking and monitoring using Sentry for both Node.js and React applications.

## Features

- ✅ Automatic error capture and reporting
- ✅ User context tracking
- ✅ Performance monitoring
- ✅ Source map support for production
- ✅ Environment-based configuration
- ✅ Sensitive data filtering
- ✅ Breadcrumb tracking
- ✅ React Error Boundary
- ✅ Express middleware integration

**Feature: production-audit-improvements, Property 46: Error Tracking Integration**  
**Validates: Requirements 8.5**

## Installation

```bash
npm install @sentry/node @sentry/react
```

## Environment Variables

Add these to your `.env` file:

```bash
# Required
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id

# Optional
SENTRY_ENVIRONMENT=production
SENTRY_RELEASE=v1.0.0
SENTRY_SAMPLE_RATE=1.0
SENTRY_TRACES_SAMPLE_RATE=0.1
SENTRY_DEBUG=false
```

## Usage

### Node.js / Express

```typescript
import express from 'express';
import { initSentry, sentryRequestMiddleware, sentryTracingMiddleware, sentryErrorMiddleware } from '@/lib/error-tracking';
import { getSentryConfig } from '@/lib/error-tracking/config';

const app = express();

// Initialize Sentry
const config = getSentryConfig();
initSentry(config);

// Add Sentry middleware BEFORE other middleware
app.use(sentryRequestMiddleware());
app.use(sentryTracingMiddleware());

// Your routes
app.get('/api/users', async (req, res) => {
  // Errors will be automatically captured
  const users = await getUsers();
  res.json(users);
});

// Add Sentry error handler AFTER all routes
app.use(sentryErrorMiddleware());

app.listen(3000);
```

### React Application

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { initSentryReact, ErrorBoundary } from '@/lib/error-tracking/react';
import { getSentryConfig } from '@/lib/error-tracking/config';
import App from './App';

// Initialize Sentry
const config = getSentryConfig();
initSentryReact(config);

// Wrap your app with ErrorBoundary
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary
      fallback={({ error, resetError }) => (
        <div>
          <h1>Something went wrong</h1>
          <p>{error.message}</p>
          <button onClick={resetError}>Try again</button>
        </div>
      )}
      showDialog
    >
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
```

### Manual Error Capture

```typescript
import { captureError, captureMessage } from '@/lib/error-tracking';

try {
  await riskyOperation();
} catch (error) {
  captureError(error, {
    tags: { operation: 'riskyOperation' },
    extra: { userId: user.id },
    level: 'error',
  });
  throw error;
}

// Capture a message
captureMessage('User completed onboarding', 'info', {
  tags: { feature: 'onboarding' },
  extra: { userId: user.id },
});
```

### User Context

```typescript
import { setUserContext } from '@/lib/error-tracking';

// Set user context after authentication
setUserContext({
  id: user.id,
  email: user.email,
  username: user.username,
});

// Clear user context on logout
setUserContext(null);
```

### Breadcrumbs

```typescript
import { addBreadcrumb } from '@/lib/error-tracking';

// Track user actions
addBreadcrumb({
  type: 'user',
  category: 'action',
  message: 'User clicked submit button',
  level: 'info',
  data: { formId: 'audit-form' },
});

// Track navigation
addBreadcrumb({
  type: 'navigation',
  category: 'navigation',
  message: 'Navigated to /dashboard',
  level: 'info',
});
```

### React Hooks

```tsx
import { useSentryError, useSentryUser, useSentryBreadcrumb } from '@/lib/error-tracking/react';

function MyComponent() {
  const captureError = useSentryError();
  const setUser = useSentryUser();
  const addBreadcrumb = useSentryBreadcrumb();

  useEffect(() => {
    // Set user context
    setUser({
      id: user.id,
      email: user.email,
    });
  }, [user, setUser]);

  const handleClick = async () => {
    addBreadcrumb({
      type: 'user',
      message: 'User clicked button',
    });

    try {
      await riskyOperation();
    } catch (error) {
      captureError(error, {
        tags: { component: 'MyComponent' },
      });
    }
  };

  return <button onClick={handleClick}>Click me</button>;
}
```

### Integration with Custom Errors

```typescript
import { ApplicationError, DatabaseError } from '@/lib/reliability/errors';
import { captureError } from '@/lib/error-tracking';

try {
  await database.query('SELECT * FROM users');
} catch (error) {
  const dbError = new DatabaseError(
    'Failed to fetch users',
    correlationId,
    error as Error
  );
  
  // Capture with full context
  captureError(dbError, {
    tags: {
      errorType: 'database',
      operation: 'query',
    },
    extra: {
      correlationId: dbError.correlationId,
      query: 'SELECT * FROM users',
    },
  });
  
  throw dbError;
}
```

### Performance Monitoring

```typescript
import { startTransaction } from '@/lib/error-tracking';

const transaction = startTransaction('api.users.list', 'http.server');

try {
  const span = transaction?.startChild({
    op: 'db.query',
    description: 'SELECT * FROM users',
  });
  
  const users = await database.query('SELECT * FROM users');
  
  span?.finish();
  transaction?.setStatus('ok');
} catch (error) {
  transaction?.setStatus('internal_error');
  throw error;
} finally {
  transaction?.finish();
}
```

## Source Maps for Production

To enable source maps in production for better error stack traces:

### Vite Configuration

```typescript
// vite.config.ts
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    sourcemap: true, // Enable source maps
  },
});
```

### Upload Source Maps to Sentry

```bash
# Install Sentry CLI
npm install -g @sentry/cli

# Configure Sentry CLI
export SENTRY_AUTH_TOKEN=your-auth-token
export SENTRY_ORG=your-org
export SENTRY_PROJECT=your-project

# Upload source maps after build
sentry-cli releases new $RELEASE_VERSION
sentry-cli releases files $RELEASE_VERSION upload-sourcemaps ./dist
sentry-cli releases finalize $RELEASE_VERSION
```

### Automated Upload in CI/CD

```yaml
# .github/workflows/deploy.yml
- name: Upload source maps to Sentry
  env:
    SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
    SENTRY_ORG: your-org
    SENTRY_PROJECT: your-project
  run: |
    npm run build
    export RELEASE_VERSION=${{ github.sha }}
    sentry-cli releases new $RELEASE_VERSION
    sentry-cli releases files $RELEASE_VERSION upload-sourcemaps ./dist
    sentry-cli releases finalize $RELEASE_VERSION
```

## Best Practices

### 1. Filter Sensitive Data

Always filter sensitive data before sending to Sentry:

```typescript
initSentry({
  dsn: process.env.SENTRY_DSN,
  beforeSend: (event) => {
    // Remove sensitive data
    if (event.request?.data) {
      delete event.request.data.password;
      delete event.request.data.creditCard;
    }
    return event;
  },
});
```

### 2. Set Appropriate Sample Rates

Use different sample rates for different environments:

```typescript
const config = {
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  sampleRate: 1.0, // Capture all errors
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
};
```

### 3. Add Context to Errors

Always add relevant context to errors:

```typescript
captureError(error, {
  tags: {
    feature: 'payment',
    operation: 'charge',
  },
  extra: {
    amount: payment.amount,
    currency: payment.currency,
    userId: user.id,
  },
  user: {
    id: user.id,
    email: user.email,
  },
});
```

### 4. Use Breadcrumbs

Track user actions leading up to errors:

```typescript
// Track important user actions
addBreadcrumb({
  type: 'user',
  category: 'action',
  message: 'User initiated payment',
  data: { amount: 100, currency: 'USD' },
});
```

### 5. Graceful Shutdown

Flush pending events before shutdown:

```typescript
import { flush, close } from '@/lib/error-tracking';

process.on('SIGTERM', async () => {
  await flush(2000); // Wait up to 2 seconds
  await close(2000);
  process.exit(0);
});
```

## Testing

The module includes comprehensive tests:

```bash
# Run all tests
npm test lib/error-tracking

# Run with coverage
npm run test:coverage lib/error-tracking
```

## Property-Based Tests

**Property 46: Error Tracking Integration**

*For any* unhandled error, it should be sent to Sentry with user context

This property is validated through integration tests that verify:
- Errors are captured and sent to Sentry
- User context is attached to error reports
- Sensitive data is filtered
- Source maps are uploaded for production

## API Reference

### Core Functions

- `initSentry(config)` - Initialize Sentry
- `captureError(error, context?)` - Capture an error
- `captureException(error, context?)` - Alias for captureError
- `captureMessage(message, level?, context?)` - Capture a message
- `setUserContext(user)` - Set user context
- `addBreadcrumb(breadcrumb)` - Add a breadcrumb
- `setTag(key, value)` - Set a tag
- `setExtra(key, value)` - Set extra data
- `startTransaction(name, op)` - Start a performance transaction
- `flush(timeout?)` - Flush pending events
- `close(timeout?)` - Close Sentry client

### React Functions

- `initSentryReact(config)` - Initialize Sentry for React
- `ErrorBoundary` - React error boundary component
- `withErrorBoundary(Component, options)` - HOC for error boundary
- `useSentryError()` - Hook to capture errors
- `useSentryUser()` - Hook to set user context
- `useSentryBreadcrumb()` - Hook to add breadcrumbs

### Middleware

- `sentryRequestMiddleware()` - Express request handler
- `sentryTracingMiddleware()` - Express tracing handler
- `sentryErrorMiddleware()` - Express error handler

## Troubleshooting

### Errors Not Appearing in Sentry

1. Check that `SENTRY_DSN` is set correctly
2. Verify Sentry is initialized before errors occur
3. Check sample rates (set to 1.0 for testing)
4. Look for console warnings about initialization

### Source Maps Not Working

1. Ensure source maps are generated (`sourcemap: true` in build config)
2. Verify source maps are uploaded to Sentry
3. Check that release version matches between app and uploaded maps
4. Ensure `SENTRY_RELEASE` environment variable is set

### Too Many Events

1. Adjust sample rates to reduce volume
2. Filter out noisy errors in `beforeSend`
3. Use error grouping to consolidate similar errors
4. Set up alert rules to focus on critical issues

## Related Modules

- [Logging](../logging/README.md) - Structured logging
- [Metrics](../metrics/README.md) - Prometheus metrics
- [Tracing](../tracing/README.md) - OpenTelemetry tracing
- [Reliability](../reliability/README.md) - Error handling and retry logic

## License

MIT
