/**
 * Integration tests for correlation ID middleware
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  correlationIdMiddleware,
  addCorrelationId,
  getRequestCorrelationId,
  CORRELATION_ID_HEADER,
} from '../middleware';
import { getCorrelationId } from '../logger';

// Mock request and response
function createMockRequest(headers: Record<string, string> = {}): VercelRequest {
  return {
    method: 'GET',
    url: '/test',
    headers,
  } as VercelRequest;
}

function createMockResponse(): VercelResponse {
  const headers: Record<string, string> = {};
  
  return {
    statusCode: 200,
    setHeader: vi.fn((name: string, value: string) => {
      headers[name] = value;
    }),
    getHeader: vi.fn((name: string) => headers[name]),
    json: vi.fn(),
    status: vi.fn(function(code: number) {
      this.statusCode = code;
      return this;
    }),
  } as any;
}

describe('Correlation ID Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  it('should generate correlation ID if not provided', async () => {
    const req = createMockRequest();
    const res = createMockResponse();
    
    const handler = vi.fn(async () => {
      res.json({ success: true });
    });
    
    const wrappedHandler = correlationIdMiddleware(handler);
    await wrappedHandler(req, res);
    
    expect(res.setHeader).toHaveBeenCalledWith(
      CORRELATION_ID_HEADER,
      expect.any(String)
    );
  });
  
  it('should use provided correlation ID from header', async () => {
    const correlationId = 'test-correlation-id-123';
    const req = createMockRequest({
      [CORRELATION_ID_HEADER]: correlationId,
    });
    const res = createMockResponse();
    
    const handler = vi.fn(async () => {
      res.json({ success: true });
    });
    
    const wrappedHandler = correlationIdMiddleware(handler);
    await wrappedHandler(req, res);
    
    expect(res.setHeader).toHaveBeenCalledWith(
      CORRELATION_ID_HEADER,
      correlationId
    );
  });
  
  it('should propagate correlation ID to handler context', async () => {
    const correlationId = 'test-correlation-id-456';
    const req = createMockRequest({
      [CORRELATION_ID_HEADER]: correlationId,
    });
    const res = createMockResponse();
    
    let capturedId: string | undefined;
    
    const handler = vi.fn(async () => {
      capturedId = getCorrelationId();
      res.json({ success: true });
    });
    
    const wrappedHandler = correlationIdMiddleware(handler);
    await wrappedHandler(req, res);
    
    expect(capturedId).toBe(correlationId);
  });
  
  it('should handle handler errors', async () => {
    const req = createMockRequest();
    const res = createMockResponse();
    
    const error = new Error('Handler error');
    const handler = vi.fn(async () => {
      throw error;
    });
    
    const wrappedHandler = correlationIdMiddleware(handler);
    
    await expect(wrappedHandler(req, res)).rejects.toThrow('Handler error');
  });
  
  it('should add correlation ID to response headers even on error', async () => {
    const req = createMockRequest();
    const res = createMockResponse();
    
    const handler = vi.fn(async () => {
      throw new Error('Test error');
    });
    
    const wrappedHandler = correlationIdMiddleware(handler);
    
    try {
      await wrappedHandler(req, res);
    } catch (error) {
      // Expected
    }
    
    expect(res.setHeader).toHaveBeenCalledWith(
      CORRELATION_ID_HEADER,
      expect.any(String)
    );
  });
});

describe('addCorrelationId', () => {
  it('should add correlation ID to request', () => {
    const req = createMockRequest();
    
    const correlationId = addCorrelationId(req);
    
    expect(correlationId).toBeTruthy();
    expect((req as any).correlationId).toBe(correlationId);
  });
  
  it('should use existing correlation ID from header', () => {
    const existingId = 'existing-correlation-id';
    const req = createMockRequest({
      [CORRELATION_ID_HEADER]: existingId,
    });
    
    const correlationId = addCorrelationId(req);
    
    expect(correlationId).toBe(existingId);
  });
});

describe('getRequestCorrelationId', () => {
  it('should get correlation ID from request object', () => {
    const req = createMockRequest();
    const expectedId = 'test-id-123';
    (req as any).correlationId = expectedId;
    
    const correlationId = getRequestCorrelationId(req);
    
    expect(correlationId).toBe(expectedId);
  });
  
  it('should get correlation ID from header if not in request object', () => {
    const expectedId = 'header-id-456';
    const req = createMockRequest({
      [CORRELATION_ID_HEADER]: expectedId,
    });
    
    const correlationId = getRequestCorrelationId(req);
    
    expect(correlationId).toBe(expectedId);
  });
  
  it('should return undefined if no correlation ID', () => {
    const req = createMockRequest();
    
    const correlationId = getRequestCorrelationId(req);
    
    expect(correlationId).toBeUndefined();
  });
});
