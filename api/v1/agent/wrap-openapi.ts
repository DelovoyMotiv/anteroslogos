/**
 * OpenAPI 3.0 Specification for Agent Middleware API
 * 
 * Comprehensive documentation including:
 * - Authentication and authorization
 * - Rate limiting and quotas
 * - Error codes and recovery actions
 * - Request/response examples
 * - Curl examples
 * 
 * **Validates: Requirements 7.1, 7.3, 7.4, 7.5**
 */

export const openApiSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Agent Middleware API',
    version: '1.0.0',
    description: `
# Agent Middleware API

Structured, token-optimized data extraction for autonomous AI agents.

## Features

- **Fast Mode**: Quick metadata extraction with minimal token cost
- **Deep Mode**: Comprehensive content extraction with knowledge graph
- **Smart Caching**: 24 hours cache for repeated requests
- **Rate Limiting**: Automatic rate limit management with retry headers

## Rate Limiting

- **Free Tier**: 100 requests per minute
- **Pro Tier**: 1000 requests per minute

Rate limit headers are included in all responses:
- \`X-RateLimit-Limit\`: Maximum requests per minute
- \`X-RateLimit-Remaining\`: Remaining requests in current window
- \`X-RateLimit-Reset\`: Timestamp when the rate limit resets

## Authentication

All requests require a Bearer token in the Authorization header:

\`\`\`
Authorization: Bearer YOUR_API_KEY
\`\`\`

## Quick Start Examples

### Fast Mode (Minimal Token Cost)

\`\`\`bash
curl -X POST https://your-domain.com/api/v1/agent/wrap \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -d '{
    "url": "https://example.com",
    "mode": "fast",
    "format": "compact"
  }'
\`\`\`

### Deep Mode (Full Content + Knowledge Graph)

\`\`\`bash
curl -X POST https://your-domain.com/api/v1/agent/wrap \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -d '{
    "url": "https://example.com/article",
    "mode": "deep",
    "format": "json-ld"
  }'
\`\`\`

## Error Handling

All errors follow a consistent structure with:
- Error code for programmatic handling
- Human-readable message
- Recovery actions
- Request ID for tracking

See error codes section below for details.
    `.trim(),
    contact: {
      name: 'API Support',
      email: 'support@example.com',
    },
  },
  servers: [
    {
      url: 'https://your-domain.com/api/v1/agent',
      description: 'Production server',
    },
  ],
  paths: {
    '/wrap': {
      get: {
        summary: 'Get OpenAPI documentation',
        description: 'Returns the complete OpenAPI specification for this API',
        responses: {
          '200': {
            description: 'OpenAPI specification',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                },
              },
            },
          },
        },
      },
      post: {
        summary: 'Extract and serialize web content',
        description: `
Extract structured data from web pages with token optimization.

**Fast Mode**: Returns metadata, title, and summary only. Minimal token cost.

**Deep Mode**: Returns full markdown content, word count, and comprehensive knowledge graph with entities and relationships.

**Caching**: Results are cached for 24 hours. Cache hits return instantly with \`cache_hit: true\`.
        `.trim(),
        security: [
          {
            bearerAuth: [],
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['url'],
                properties: {
                  url: {
                    type: 'string',
                    format: 'uri',
                    description: 'Target URL to extract content from',
                    example: 'https://example.com/article',
                  },
                  mode: {
                    type: 'string',
                    enum: ['fast', 'deep'],
                    default: 'fast',
                    description: 'Extraction mode: fast (metadata only) or deep (full content + knowledge graph)',
                  },
                  format: {
                    type: 'string',
                    enum: ['compact', 'json-ld'],
                    default: 'compact',
                    description: 'Output format: compact (minimal) or json-ld (semantic)',
                  },
                },
              },
              examples: {
                fast: {
                  summary: 'Fast mode extraction',
                  value: {
                    url: 'https://example.com',
                    mode: 'fast',
                    format: 'compact',
                  },
                },
                deep: {
                  summary: 'Deep mode extraction',
                  value: {
                    url: 'https://example.com/article',
                    mode: 'deep',
                    format: 'json-ld',
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Successful extraction',
            headers: {
              'X-Agent-Protocol-Version': {
                schema: {
                  type: 'string',
                },
                description: 'API version',
              },
              'X-RateLimit-Limit': {
                schema: {
                  type: 'integer',
                },
                description: 'Maximum requests per minute',
              },
              'X-RateLimit-Remaining': {
                schema: {
                  type: 'integer',
                },
                description: 'Remaining requests in current window',
              },
              'X-RateLimit-Reset': {
                schema: {
                  type: 'string',
                  format: 'date-time',
                },
                description: 'Timestamp when rate limit resets',
              },
            },
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    meta: {
                      type: 'object',
                      properties: {
                        target_url: { type: 'string' },
                        timestamp: { type: 'string', format: 'date-time' },
                        latency_ms: { type: 'number' },
                        cost_tokens: { type: 'number' },
                        cache_hit: { type: 'boolean' },
                        mode: { type: 'string', enum: ['fast', 'deep'] },
                        format: { type: 'string', enum: ['compact', 'json-ld'] },
                      },
                    },
                    content: {
                      type: 'object',
                      properties: {
                        title: { type: 'string' },
                        summary: { type: 'string' },
                        markdown: { type: 'string' },
                        word_count: { type: 'number' },
                      },
                    },
                    knowledge_graph: {
                      type: 'object',
                      description: 'Serialized knowledge graph with entities and relationships',
                    },
                  },
                },
                examples: {
                  fast_mode: {
                    summary: 'Fast mode response',
                    value: {
                      meta: {
                        target_url: 'https://example.com',
                        timestamp: '2024-01-15T10:30:00Z',
                        latency_ms: 450,
                        cost_tokens: 120,
                        cache_hit: false,
                        mode: 'fast',
                        format: 'compact',
                      },
                      content: {
                        title: 'Example Domain',
                        summary: 'This domain is for use in illustrative examples in documents.',
                      },
                      knowledge_graph: {
                        entities: [],
                        relationships: [],
                      },
                    },
                  },
                  deep_mode: {
                    summary: 'Deep mode response',
                    value: {
                      meta: {
                        target_url: 'https://example.com/article',
                        timestamp: '2024-01-15T10:30:00Z',
                        latency_ms: 1200,
                        cost_tokens: 850,
                        cache_hit: false,
                        mode: 'deep',
                        format: 'json-ld',
                      },
                      content: {
                        title: 'Understanding Web Scraping',
                        summary: 'A comprehensive guide to web scraping techniques and best practices.',
                        markdown: '# Understanding Web Scraping\n\nWeb scraping is...',
                        word_count: 1500,
                      },
                      knowledge_graph: {
                        entities: [
                          {
                            id: 'e1',
                            type: 'Organization',
                            name: 'Example Corp',
                            properties: {},
                          },
                        ],
                        relationships: [
                          {
                            source: 'e1',
                            target: 'e2',
                            type: 'mentions',
                          },
                        ],
                      },
                    },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Bad Request - Invalid URL or request body',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
                example: {
                  error: {
                    code: 'ERR_INVALID_URL',
                    message: 'Invalid request body',
                    details: {
                      timestamp: '2024-01-15T10:30:00Z',
                      request_id: 'req_1234567890_abc123',
                      errors: [
                        {
                          path: ['url'],
                          message: 'Invalid URL format',
                        },
                      ],
                    },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Unauthorized - Missing or invalid API key',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
                example: {
                  error: {
                    code: 'ERR_AUTH_INVALID',
                    message: 'Invalid API key',
                    details: {
                      timestamp: '2024-01-15T10:30:00Z',
                      request_id: 'req_1234567890_abc123',
                    },
                  },
                },
              },
            },
          },
          '402': {
            description: 'Payment Required - Quota exceeded',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
                example: {
                  error: {
                    code: 'ERR_QUOTA_EXCEEDED',
                    message: 'Monthly quota exceeded',
                    details: {
                      timestamp: '2024-01-15T10:30:00Z',
                      request_id: 'req_1234567890_abc123',
                      remaining: 0,
                    },
                  },
                },
              },
            },
          },
          '422': {
            description: 'Unprocessable Entity - URL unreachable or content extraction failed',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
                example: {
                  error: {
                    code: 'ERR_URL_UNREACHABLE',
                    message: 'Failed to reach target URL',
                    details: {
                      timestamp: '2024-01-15T10:30:00Z',
                      request_id: 'req_1234567890_abc123',
                      url: 'https://example.com',
                    },
                  },
                },
              },
            },
          },
          '429': {
            description: 'Too Many Requests - Rate limit exceeded',
            headers: {
              'Retry-After': {
                schema: {
                  type: 'integer',
                },
                description: 'Number of seconds to wait before retrying',
              },
              'X-RateLimit-Limit': {
                schema: {
                  type: 'integer',
                },
                description: 'Maximum requests per minute',
              },
              'X-RateLimit-Remaining': {
                schema: {
                  type: 'integer',
                },
                description: 'Remaining requests (will be 0)',
              },
              'X-RateLimit-Reset': {
                schema: {
                  type: 'string',
                  format: 'date-time',
                },
                description: 'Timestamp when rate limit resets',
              },
            },
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
                example: {
                  error: {
                    code: 'ERR_RATE_LIMIT',
                    message: 'Rate limit exceeded. Please retry after 45 seconds.',
                    details: {
                      timestamp: '2024-01-15T10:30:00Z',
                      request_id: 'req_1234567890_abc123',
                      retryAfter: 45,
                      limit: 100,
                      reset: '2024-01-15T10:31:00Z',
                    },
                  },
                },
              },
            },
          },
          '500': {
            description: 'Internal Server Error',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
                example: {
                  error: {
                    code: 'ERR_INTERNAL',
                    message: 'Internal server error',
                    details: {
                      timestamp: '2024-01-15T10:30:00Z',
                      request_id: 'req_1234567890_abc123',
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'API Key',
        description: 'API key authentication. Include your API key in the Authorization header as: `Bearer YOUR_API_KEY`',
      },
    },
    schemas: {
      ErrorResponse: {
        type: 'object',
        properties: {
          error: {
            type: 'object',
            properties: {
              code: {
                type: 'string',
                description: 'Machine-readable error code',
              },
              message: {
                type: 'string',
                description: 'Human-readable error message',
              },
              details: {
                type: 'object',
                description: 'Additional error context',
                properties: {
                  timestamp: {
                    type: 'string',
                    format: 'date-time',
                  },
                  request_id: {
                    type: 'string',
                    description: 'Unique request identifier for tracking',
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  'x-error-codes': {
    ERR_URL_UNREACHABLE: {
      description: 'Target URL could not be reached',
      http_status: 422,
      recovery: 'Verify the URL is correct and accessible. Check for network issues or DNS problems.',
    },
    ERR_BOT_BLOCKED: {
      description: 'Website blocked automated access',
      http_status: 403,
      recovery: 'The target website has anti-bot protection. Contact support for assistance.',
    },
    ERR_DOM_UNREADABLE: {
      description: 'Page content could not be parsed',
      http_status: 422,
      recovery: 'The page structure is incompatible. Try a different URL or contact support.',
    },
    ERR_TIMEOUT: {
      description: 'Request exceeded time limit',
      http_status: 504,
      recovery: 'The page took too long to load. Try again or use a faster-loading page.',
    },
    ERR_INVALID_URL: {
      description: 'Invalid URL format or missing required parameters',
      http_status: 400,
      recovery: 'Check the URL format and ensure all required parameters are provided.',
    },
    ERR_AUTH_MISSING: {
      description: 'Authorization header is missing',
      http_status: 401,
      recovery: 'Include your API key in the Authorization header: `Authorization: Bearer YOUR_API_KEY`',
    },
    ERR_AUTH_INVALID: {
      description: 'API key is invalid or expired',
      http_status: 401,
      recovery: 'Verify your API key is correct and active. Generate a new key if needed.',
    },
    ERR_QUOTA_EXCEEDED: {
      description: 'Monthly API quota has been exceeded',
      http_status: 402,
      recovery: 'Upgrade your plan or wait until the quota resets next month.',
    },
    ERR_RATE_LIMIT: {
      description: 'Too many requests in a short time period',
      http_status: 429,
      recovery: 'Wait for the time specified in the Retry-After header before making another request.',
    },
    ERR_INTERNAL: {
      description: 'Unexpected server error',
      http_status: 500,
      recovery: 'Try again later. If the problem persists, contact support with the request_id.',
    },
  },
};
