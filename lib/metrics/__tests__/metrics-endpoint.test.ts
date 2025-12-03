/**
 * Integration Test for Metrics API Endpoint
 * 
 * Tests the /api/metrics endpoint
 */

import { describe, it, expect } from 'vitest';
import handler from '../../../api/metrics';
import type { VercelRequest, VercelResponse } from '@vercel/node';

describe('Metrics API Endpoint', () => {
  it('should return metrics in Prometheus format', async () => {
    const req = {
      method: 'GET',
    } as VercelRequest;
    
    let statusCode = 0;
    let responseBody = '';
    let contentType = '';
    
    const res = {
      status: (code: number) => {
        statusCode = code;
        return res;
      },
      send: (body: string) => {
        responseBody = body;
        return res;
      },
      setHeader: (name: string, value: string) => {
        if (name === 'Content-Type') {
          contentType = value;
        }
        return res;
      },
      json: (body: any) => {
        responseBody = JSON.stringify(body);
        return res;
      },
    } as unknown as VercelResponse;
    
    await handler(req, res);
    
    expect(statusCode).toBe(200);
    expect(contentType).toContain('text/plain');
    expect(responseBody).toContain('# HELP');
    expect(responseBody).toContain('# TYPE');
    expect(responseBody).toContain('anoteros_');
  });
  
  it('should reject non-GET requests', async () => {
    const req = {
      method: 'POST',
    } as VercelRequest;
    
    let statusCode = 0;
    let responseBody: any = {};
    
    const res = {
      status: (code: number) => {
        statusCode = code;
        return res;
      },
      json: (body: any) => {
        responseBody = body;
        return res;
      },
    } as unknown as VercelResponse;
    
    await handler(req, res);
    
    expect(statusCode).toBe(405);
    expect(responseBody.error).toBe('Method not allowed');
  });
});
