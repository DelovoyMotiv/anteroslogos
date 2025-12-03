// @ts-nocheck - Example code with intentional type flexibility
/**
 * Example: Vercel Serverless Function Integration
 * 
 * Demonstrates how to use tracing in Vercel serverless functions
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeTracing, shutdownTracing } from '../tracer';
import { withTracingAsync, propagateTraceContext } from '../middleware';
import { traceDbQuery } from '../helpers';
import { getTracingConfig } from '../config';

// Initialize tracing (only once per cold start)
let initialized = false;

function ensureTracingInitialized() {
  if (!initialized) {
    const config = getTracingConfig();
    initializeTracing(config);
    initialized = true;
  }
}

/**
 * Example Vercel function with tracing
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  ensureTracingInitialized();
  
  try {
    // Wrap the entire handler in a trace
    const result = await withTracingAsync(
      'vercel.handler',
      async () => {
        // Extract method and path
        const method = req.method || 'GET';
        const path = req.url || '/';
        
        // Trace database query
        const data = await traceDbQuery('select', 'data', async () => {
          // Simulate database query
          return { message: 'Hello from Vercel with tracing!' };
        });
        
        return data;
      },
      {
        'http.method': req.method || 'GET',
        'http.url': req.url || '/',
        'vercel.region': process.env.VERCEL_REGION || 'unknown',
      }
    );
    
    res.status(200).json(result);
  } catch (error) {
    console.error('Handler error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    // Flush traces before function terminates
    await shutdownTracing();
  }
}

/**
 * Example: Tracing external API calls from Vercel
 */
export async function externalApiHandler(req: VercelRequest, res: VercelResponse) {
  ensureTracingInitialized();
  
  try {
    const result = await withTracingAsync(
      'vercel.external-api',
      async () => {
        // Propagate trace context to external service
        const headers = propagateTraceContext({
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.API_KEY}`,
        });
        
        const response = await fetch('https://api.example.com/data', {
          headers,
        });
        
        return response.json();
      },
      {
        'http.method': 'GET',
        'peer.service': 'external-api',
      }
    );
    
    res.status(200).json(result);
  } catch (error) {
    console.error('External API error:', error);
    res.status(500).json({ error: 'Failed to fetch external data' });
  } finally {
    await shutdownTracing();
  }
}
