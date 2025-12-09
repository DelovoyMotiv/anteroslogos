/**
 * Tests for OpenAPI documentation endpoint
 * 
 * **Validates: Requirements 7.1, 7.3, 7.4, 7.5**
 */

import { describe, it, expect } from 'vitest';
import { openApiSpec } from '../wrap-openapi';

describe('OpenAPI Documentation', () => {
  it('should have valid OpenAPI 3.0 structure', () => {
    expect(openApiSpec.openapi).toBe('3.0.0');
    expect(openApiSpec.info).toBeDefined();
    expect(openApiSpec.info.title).toBe('Agent Middleware API');
    expect(openApiSpec.info.version).toBeDefined();
  });

  it('should document authentication requirements', () => {
    expect(openApiSpec.components.securitySchemes.bearerAuth).toBeDefined();
    expect(openApiSpec.components.securitySchemes.bearerAuth.type).toBe('http');
    expect(openApiSpec.components.securitySchemes.bearerAuth.scheme).toBe('bearer');
  });

  it('should include rate limiting information in description', () => {
    const description = openApiSpec.info.description;
    expect(description).toContain('Rate Limiting');
    expect(description).toContain('100 requests per minute');
    expect(description).toContain('1000 requests per minute');
  });

  it('should include curl examples in description', () => {
    const description = openApiSpec.info.description;
    expect(description).toContain('curl');
    expect(description).toContain('Authorization: Bearer');
    expect(description).toContain('Fast Mode');
    expect(description).toContain('Deep Mode');
  });

  it('should document all error codes with descriptions and recovery actions', () => {
    const errorCodes = openApiSpec['x-error-codes'];
    
    const expectedErrorCodes = [
      'ERR_URL_UNREACHABLE',
      'ERR_BOT_BLOCKED',
      'ERR_DOM_UNREADABLE',
      'ERR_TIMEOUT',
      'ERR_INVALID_URL',
      'ERR_AUTH_MISSING',
      'ERR_AUTH_INVALID',
      'ERR_QUOTA_EXCEEDED',
      'ERR_RATE_LIMIT',
      'ERR_INTERNAL',
    ];

    expectedErrorCodes.forEach((code) => {
      expect(errorCodes[code]).toBeDefined();
      expect(errorCodes[code].description).toBeDefined();
      expect(errorCodes[code].http_status).toBeDefined();
      expect(errorCodes[code].recovery).toBeDefined();
    });
  });

  it('should include request/response examples for fast and deep modes', () => {
    const postEndpoint = openApiSpec.paths['/wrap'].post;
    
    // Check request examples
    expect(postEndpoint.requestBody.content['application/json'].examples.fast).toBeDefined();
    expect(postEndpoint.requestBody.content['application/json'].examples.deep).toBeDefined();
    
    // Check response examples
    const responseExamples = postEndpoint.responses['200'].content['application/json'].examples;
    expect(responseExamples.fast_mode).toBeDefined();
    expect(responseExamples.deep_mode).toBeDefined();
  });

  it('should document rate limit headers', () => {
    const responseHeaders = openApiSpec.paths['/wrap'].post.responses['200'].headers;
    
    expect(responseHeaders['X-RateLimit-Limit']).toBeDefined();
    expect(responseHeaders['X-RateLimit-Remaining']).toBeDefined();
    expect(responseHeaders['X-RateLimit-Reset']).toBeDefined();
  });

  it('should document all HTTP status codes', () => {
    const responses = openApiSpec.paths['/wrap'].post.responses;
    
    expect(responses['200']).toBeDefined(); // Success
    expect(responses['400']).toBeDefined(); // Bad Request
    expect(responses['401']).toBeDefined(); // Unauthorized
    expect(responses['402']).toBeDefined(); // Payment Required
    expect(responses['422']).toBeDefined(); // Unprocessable Entity
    expect(responses['429']).toBeDefined(); // Too Many Requests
    expect(responses['500']).toBeDefined(); // Internal Server Error
  });

  it('should include Retry-After header for 429 responses', () => {
    const response429 = openApiSpec.paths['/wrap'].post.responses['429'];
    
    expect(response429.headers['Retry-After']).toBeDefined();
    expect(response429.headers['Retry-After'].description).toContain('wait before retrying');
  });

  it('should document both fast and deep mode behaviors', () => {
    const postDescription = openApiSpec.paths['/wrap'].post.description;
    
    expect(postDescription).toContain('fast');
    expect(postDescription).toContain('deep');
    expect(postDescription).toContain('metadata');
    expect(postDescription).toContain('knowledge graph');
  });

  it('should document caching behavior', () => {
    const postDescription = openApiSpec.paths['/wrap'].post.description;
    
    expect(postDescription).toContain('cached');
    expect(postDescription).toContain('24 hours');
  });

  it('should include GET endpoint documentation', () => {
    const getEndpoint = openApiSpec.paths['/wrap'].get;
    
    expect(getEndpoint).toBeDefined();
    expect(getEndpoint.summary).toBe('Get OpenAPI documentation');
    expect(getEndpoint.responses['200']).toBeDefined();
  });
});
