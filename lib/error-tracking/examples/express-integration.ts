/**
 * Example: Express Integration with Sentry Error Tracking
 * 
 * Demonstrates how to integrate Sentry error tracking with Express.js
 */

import express from 'express';
import { 
  initSentry, 
  setUserContext,
  addBreadcrumb,
  captureError,
} from '../index';
import { getSentryConfig } from '../config';
import { ApplicationError, DatabaseError } from '../../reliability/errors';

const app = express();

// Initialize Sentry FIRST
const sentryConfig = getSentryConfig();
initSentry(sentryConfig);

// Add Sentry middleware BEFORE other middleware
// app.use(sentryRequestMiddleware());
// app.use(sentryTracingMiddleware());

// Body parser
app.use(express.json());

// Authentication middleware (example)
app.use((req, _res, next) => {
  // Simulate authentication
  const user = {
    id: 'user-123',
    email: 'user@example.com',
    username: 'testuser',
  };
  
  // Set user context for error tracking
  setUserContext(user);
  
  // Add breadcrumb
  addBreadcrumb({
    type: 'http',
    category: 'request',
    message: `${req.method} ${req.path}`,
    data: {
      method: req.method,
      url: req.url,
      ip: req.ip || 'unknown',
    },
  });
  
  next();
});

// Example route with error handling
app.get('/api/users/:id', async (req, res, next) => {
  try {
    const userId = req.params.id;
    
    // Add breadcrumb for this operation
    addBreadcrumb({
      type: 'user',
      category: 'action',
      message: 'Fetching user data',
      data: { userId },
    });
    
    // Simulate database query
    if (userId === 'error') {
      throw new DatabaseError(
        'Failed to fetch user',
        req.headers['x-correlation-id'] as string,
        new Error('Connection timeout')
      );
    }
    
    const user = { id: userId, name: 'Test User' };
    res.json(user);
  } catch (error) {
    // Capture error with context
    captureError(error, {
      tags: {
        endpoint: '/api/users/:id',
        operation: 'fetch_user',
      },
      extra: {
        userId: req.params.id,
        correlationId: req.headers['x-correlation-id'] as string || 'unknown',
      },
    });
    
    next(error);
  }
});

// Example route with custom error
app.post('/api/payments', async (req, res, next) => {
  try {
    const { amount, currency } = req.body;
    
    // Validate input
    if (!amount || amount <= 0) {
      throw new ApplicationError(
        'Invalid payment amount',
        'INVALID_AMOUNT',
        400,
        req.headers['x-correlation-id'] as string,
        { amount, currency }
      );
    }
    
    // Add breadcrumb
    addBreadcrumb({
      type: 'user',
      category: 'payment',
      message: 'Processing payment',
      data: { amount, currency },
    });
    
    // Simulate payment processing
    const payment = { id: 'pay-123', amount, currency, status: 'success' };
    res.json(payment);
  } catch (error) {
    // Capture error with payment context
    captureError(error, {
      tags: {
        endpoint: '/api/payments',
        operation: 'process_payment',
      },
      extra: {
        amount: req.body.amount,
        currency: req.body.currency,
      },
      level: 'error',
    });
    
    next(error);
  }
});

// Example route that throws unhandled error
app.get('/api/crash', () => {
  // This will be caught by Sentry error handler
  throw new Error('Intentional crash for testing');
});

// Add Sentry error handler AFTER all routes
// app.use(sentryErrorMiddleware());

// Custom error handler (after Sentry)
app.use((err: Error, _req: express.Request, res: express.Response) => {
  if (err instanceof ApplicationError) {
    res.status(err.statusCode).json(err.toAPIResponse());
  } else {
    res.status(500).json({
      error: 'Internal Server Error',
      message: process.env.NODE_ENV === 'production' ? 'An error occurred' : err.message,
    });
  }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  
  // Flush pending Sentry events
  const { flush, close } = await import('../sentry');
  await flush(2000);
  await close(2000);
  
  process.exit(0);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Sentry error tracking enabled: ${sentryConfig.dsn ? 'Yes' : 'No'}`);
});

export default app;
