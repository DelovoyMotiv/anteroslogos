/**
 * Test Helpers for API Integration Tests
 * Provides mock request/response objects and utilities
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Create a mock VercelRequest object
 */
export function createMockRequest(overrides: Partial<VercelRequest> = {}): VercelRequest {
  const defaultHeaders = {
    host: 'localhost:3000',
    'content-type': 'application/json',
  };
  
  return {
    method: 'GET',
    url: 'http://localhost:3000/api/test',
    headers: {
      ...defaultHeaders,
      ...overrides.headers,
    },
    body: overrides.body || {},
    query: overrides.query || {},
    cookies: overrides.cookies || {},
    ...overrides,
  } as VercelRequest;
}

/**
 * Create a mock VercelResponse object with tracking
 */
export function createMockResponse(): VercelResponse & {
  statusCode?: number;
  jsonData?: any;
  headers: Record<string, string | string[]>;
  ended: boolean;
} {
  const headers: Record<string, string | string[]> = {};
  
  const res: any = {
    statusCode: undefined,
    jsonData: undefined,
    headers,
    ended: false,
    status: function(code: number) {
      this.statusCode = code;
      return this;
    },
    json: function(data: any) {
      this.jsonData = data;
      this.ended = true;
      return this;
    },
    send: function(data: any) {
      this.jsonData = data;
      this.ended = true;
      return this;
    },
    end: function(data?: any) {
      if (data) this.jsonData = data;
      this.ended = true;
      return this;
    },
    setHeader: function(name: string, value: string | string[]) {
      this.headers[name.toLowerCase()] = value;
      return this;
    },
    getHeader: function(name: string) {
      return this.headers[name.toLowerCase()];
    },
  };
  
  return res;
}

/**
 * Extract value from Set-Cookie header
 */
export function extractCookie(setCookieHeader: string | string[], cookieName: string): string | null {
  const headers = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
  
  for (const header of headers) {
    const match = header.match(new RegExp(`${cookieName}=([^;]+)`));
    if (match) {
      return match[1];
    }
  }
  
  return null;
}

/**
 * Wait for a specified duration
 */
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
