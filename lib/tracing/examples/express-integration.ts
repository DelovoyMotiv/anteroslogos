// @ts-nocheck - Example code with intentional type flexibility
/**
 * Example: Express Integration with OpenTelemetry Tracing
 * 
 * Demonstrates how to integrate tracing into an Express application
 */

import express from 'express';
import { initializeTracing, shutdownTracing } from '../tracer';
import { tracingMiddleware } from '../middleware';
import { traceDbQuery, traceExternalApiCall } from '../helpers';
import { getTracingConfig } from '../config';

// Initialize tracing at startup
const tracingConfig = getTracingConfig();
initializeTracing(tracingConfig);

const app = express();

// Add tracing middleware early in the chain
app.use(tracingMiddleware);

// Example: Simple endpoint with automatic tracing
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy' });
});

// Example: Endpoint with database query tracing
app.get('/api/users/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Trace database query
    const user = await traceDbQuery('select', 'profiles', async () => {
      // Simulate database query
      return { id: userId, name: 'John Doe', email: 'john@example.com' };
    });
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Example: Endpoint with external API call tracing
app.get('/api/external-data', async (req, res) => {
  try {
    const data = await traceExternalApiCall(
      'jsonplaceholder',
      'https://jsonplaceholder.typicode.com/posts/1',
      'GET',
      async () => {
        const response = await fetch('https://jsonplaceholder.typicode.com/posts/1');
        return response.json();
      }
    );
    
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch external data' });
  }
});

// Example: Complex endpoint with multiple traced operations
app.post('/api/audit', async (req, res) => {
  try {
    const { url } = req.body;
    
    // 1. Trace database query to check quota
    const quota = await traceDbQuery('select', 'user_quotas', async () => {
      return { remaining: 10 };
    });
    
    if (quota.remaining <= 0) {
      return res.status(429).json({ error: 'Quota exceeded' });
    }
    
    // 2. Trace external API call to perform audit
    const auditResult = await traceExternalApiCall(
      'audit-engine',
      '/audit',
      'POST',
      async () => {
        // Simulate audit
        return { score: 85, recommendations: [] };
      }
    );
    
    // 3. Trace database insert to save result
    await traceDbQuery('insert', 'audit_results', async () => {
      // Simulate insert
      return { id: '123' };
    });
    
    // 4. Trace database update to decrement quota
    await traceDbQuery('update', 'user_quotas', async () => {
      // Simulate update
      return { remaining: quota.remaining - 1 };
    });
    
    res.json(auditResult);
  } catch (error) {
    res.status(500).json({ error: 'Audit failed' });
  }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await shutdownTracing();
  process.exit(0);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Tracing enabled: ${tracingConfig.enabled}`);
  console.log(`OTLP endpoint: ${tracingConfig.otlpEndpoint}`);
});

export default app;
