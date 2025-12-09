/**
 * Enhanced OpenAPI Documentation for Agent Middleware API
 * This file contains the comprehensive OpenAPI 3.0 specification
 */

export const AGENT_API_VERSION = '1.0.0';

export const openApiSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Agent Middleware API',
    version: AGENT_API_VERSION,
    description: `High-performance API for extracting structured, token-optimized data from web content.

## Authentication

All requests require a Bearer token in the Authorization header:
\`\`\`
Authorization: Bearer YOUR_API_KEY
\`\`\`

## Rate Limiting

- Per API Key: 100 requests per minute
- Global: 1000 requests per minute
- Rate limit headers are included in all responses:
  - X-RateLimit-Limit: Maximum requests allowed
  - X-RateLimit-Remaining: Requests remaining in current window
  - X-RateLimit-Reset: Unix timestamp when the limit resets

When rate limited, you'll receive a 429 status with a Retry-After header.

## Example Usage

### Fast Mode (Metadata Only)
\`\`\`bash
curl -X POST https://your-domain.com/api/v1/agent/wrap \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://example.com",
    "mode": "fast",
    "format": "compact"
  }'
\`\`\`

### Deep Mode (Full Content)
\`\`\`bash
curl -X POST https://your-domain.com/api/v1/agent/wrap \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://example.com",
    "mode": "deep",
    "format": "json-ld"
  }'
\`\`\`

### Get API Documentation
\`\`\`bash
curl -X GET https://your-domain.com/api/v1/agent/wrap
\`\`\`
`,
  },
  servers: [
    {
      url: '/api/v1/agent',
      description: 'Agent Middleware API',
    },
  ],
  paths: {
    '/wrap': {
      post: {
        summary: 'Extract and serialize web content',
        description: `Extracts structured data from a URL and returns it in a token-efficient format.

**Modes:**
- \`fast\`: Quick extraction of metadata and schema markup only (< 5 seconds)
- \`deep\`: Comprehensive extraction including full content and knowledge graph (< 15 seconds)

**Formats:**
- \`compact\`: Schema-separated columnar format for maximum token efficiency
- \`json-ld\`: Standard JSON-LD format with full verbosity

**Caching:**
Results are cached for 24 hours. Subsequent requests for the same URL return instantly from cache.`,
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
                    description: 'Target URL to extract (must be HTTP or HTTPS)',
                    example: 'https://example.com',
                  },
                  mode: {
                    type: 'string',
                    enum: ['fast', 'deep'],
                    default: 'fast',
                    description: 'Extraction mode: fast (metadata only) or deep (full content)',
                  },
                  format: {
                    type: 'string',
                    enum: ['json-ld', 'compact'],
                    default: 'compact',
                    description: 'Output format: compact (columnar) or json-ld (standard)',
                  },
                },
              },
              examples: {
                fast: {
                  summary: 'Fast mode extraction',
                  description: 'Quick extraction of metadata and schema markup',
                  value: {
                    url: 'https://example.com',
                    mode: 'fast',
                    format: 'compact',
                  },
                },
                deep: {
                  summary: 'Deep mode extraction',
                  description: 'Full content extraction with knowledge graph',
                  value: {
                    url: 'https://example.com',
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
                description: 'API protocol version',
              },
              'X-RateLimit-Limit': {
                schema: {
                  type: 'integer',
                },
                description: 'Maximum requests allowed per minute',
              },
              'X-RateLimit-Remaining': {
                schema: {
                  type: 'integer',
                },
                description: 'Requests remaining in current window',
              },
              'X-RateLimit-Reset': {
                schema: {
                  type: 'integer',
                },
                description: 'Unix timestamp when the limit resets',
              },
            },
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['meta', 'content', 'knowledge_graph'],
                  properties: {
                    meta: {
                      type: 'object',
                      description: 'Metadata about the extraction',
                      required: ['target_url', 'timestamp', 'latency_ms', 'cost_tokens', 'cache_hit', 'mode', 'format'],
                      properties: {
                        target_url: { type: 'string', description: 'The URL that was extracted' },
                        timestamp: { type: 'string', format: 'date-time', description: 'ISO 8601 timestamp of extraction' },
                        latency_ms: { type: 'number', description: 'Extraction latency in milliseconds' },
                        cost_tokens: { type: 'integer', description: 'Estimated token cost of response' },
                        cache_hit: { type: 'boolean', description: 'Whether result was served from cache' },
                        mode: { type: 'string', enum: ['fast', 'deep'], description: 'Extraction mode used' },
                        format: { type: 'string', enum: ['json-ld', 'compact'], description: 'Output format used' },
                      },
                    },
                    content: {
                      type: 'object',
                      description: 'Extracted content',
                      required: ['title', 'summary'],
                      properties: {
                        title: { type: 'string', description: 'Page title' },
                        summary: { type: 'string', description: 'Page summary/description' },
                        markdown: { type: 'string', description: 'Full content in markdown (deep mode only)' },
                        word_count: { type: 'integer', description: 'Word count of content (deep mode only)' },
                      },
                    },
                    knowledge_graph: {
                      type: 'object',
                      description: 'Extracted entities and relationships in columnar format',
                      required: ['schema', 'entities', 'relations'],
                      properties: {
                        schema: { 
                          type: 'array', 
                          items: { type: 'string' },
                          description: 'Field names for entity data',
                        },
                        entities: { 
                          type: 'array', 
                          items: { type: 'array' },
                          description: 'Entity data in columnar format',
                        },
                        relations: {
                          type: 'object',
                          description: 'Relationships between entities',
                          required: ['schema', 'data'],
                          properties: {
                            schema: { 
                              type: 'array', 
                              items: { type: 'string' },
                              description: 'Field names for relationship data',
                            },
                            data: { 
                              type: 'array', 
                              items: { type: 'array' },
                              description: 'Relationship data in triplet format [source, target, type]',
                            },
                          },
                        },
                      },
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
                        latency_ms: 1250,
                        cost_tokens: 450,
                        cache_hit: false,
                        mode: 'fast',
                        format: 'compact',
                      },
                      content: {
                        title: 'Example Domain',
                        summary: 'This domain is for use in illustrative examples in documents.',
                      },
                      knowledge_graph: {
                        schema: ['id', 'type', 'name'],
                        entities: [],
                        relations: {
                          schema: ['source', 'target', 'type'],
                          data: [],
                        },
                      },
                    },
                  },
                  deep_mode: {
                    summary: 'Deep mode response',
                    value: {
                      meta: {
                        target_url: 'https://example.com',
                        timestamp: '2024-01-15T10:30:00Z',
                        latency_ms: 8500,
                        cost_tokens: 2400,
                        cache_hit: false,
                        mode: 'deep',
                        format: 'compact',
                      },
                      content: {
                        title: 'Example Domain',
                        summary: 'This domain is for use in illustrative examples in documents.',
                        markdown: '# Example Domain\n\nThis domain is for use in illustrative examples...',
                        word_count: 150,
                      },
                      knowledge_graph: {
                        schema: ['id', 'type', 'name', 'confidence'],
                        entities: [
                          ['ent_01', 'Organization', 'Example Inc', 0.95],
                          ['ent_02', 'WebPage', 'Example Domain', 0.98],
                        ],
                        relations: {
                          schema: ['source', 'target', 'type'],
                          data: [
                            ['ent_01', 'ent_02', 'owns'],
                          ],
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Bad Request - Invalid URL format or request body',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error',
                },
                example: {
                  error: {
                    code: 'ERR_INVALID_URL',
                    message: 'URL format is invalid',
                    details: {
                      url: 'not-a-valid-url',
                      timestamp: '2024-01-15T10:30:00Z',
                    },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Unauthorized - Invalid or missing Bearer token',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error',
                },
                examples: {
                  missing_token: {
                    summary: 'Missing Authorization header',
                    value: {
                      error: {
                        code: 'ERR_AUTH_MISSING',
                        message: 'No Authorization header provided',
                        details: {
                          timestamp: '2024-01-15T10:30:00Z',
                        },
                      },
                    },
                  },
                  invalid_token: {
                    summary: 'Invalid Bearer token',
                    value: {
                      error: {
                        code: 'ERR_AUTH_INVALID',
                        message: 'Invalid Bearer token',
                        details: {
                          timestamp: '2024-01-15T10:30:00Z',
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          '402': {
            description: 'Payment Required - API key quota exceeded',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error',
                },
                example: {
                  error: {
                    code: 'ERR_QUOTA_EXCEEDED',
                    message: 'API key quota exhausted',
                    details: {
                      url: 'https://example.com',
                      remaining: 0,
                      timestamp: '2024-01-15T10:30:00Z',
                    },
                  },
                },
              },
            },
          },
          '422': {
            description: 'Unprocessable Entity - Extraction failed',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error',
                },
                examples: {
                  url_unreachable: {
                    summary: 'Target URL cannot be reached',
                    value: {
                      error: {
                        code: 'ERR_URL_UNREACHABLE',
                        message: 'Target URL cannot be reached',
                        details: {
                          url: 'https://nonexistent-domain-12345.com',
                          timestamp: '2024-01-15T10:30:00Z',
                        },
                      },
                    },
                  },
                  bot_blocked: {
                    summary: 'Target site blocks bot access',
                    value: {
                      error: {
                        code: 'ERR_BOT_BLOCKED',
                        message: 'Target site blocks bot access',
                        details: {
                          url: 'https://example.com',
                          timestamp: '2024-01-15T10:30:00Z',
                        },
                      },
                    },
                  },
                  dom_unreadable: {
                    summary: 'HTML parsing failed',
                    value: {
                      error: {
                        code: 'ERR_DOM_UNREADABLE',
                        message: 'HTML parsing failed',
                        details: {
                          url: 'https://example.com',
                          timestamp: '2024-01-15T10:30:00Z',
                        },
                      },
                    },
                  },
                  timeout: {
                    summary: 'Extraction exceeded timeout',
                    value: {
                      error: {
                        code: 'ERR_TIMEOUT',
                        message: 'Extraction exceeded timeout',
                        details: {
                          url: 'https://example.com',
                          timestamp: '2024-01-15T10:30:00Z',
                        },
                      },
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
                description: 'Seconds to wait before retrying',
              },
            },
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error',
                },
                example: {
                  error: {
                    code: 'ERR_RATE_LIMIT',
                    message: 'Too many requests',
                    details: {
                      retry_after: 60,
                      timestamp: '2024-01-15T10:30:00Z',
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
                  $ref: '#/components/schemas/Error',
                },
                example: {
                  error: {
                    code: 'ERR_INTERNAL',
                    message: 'Internal server error',
                    details: {
                      url: 'https://example.com',
                      timestamp: '2024-01-15T10:30:00Z',
                    },
                  },
                },
              },
            },
          },
        },
      },
      get: {
        summary: 'Get OpenAPI documentation',
        description: 'Returns the OpenAPI 3.0 specification for this API',
        responses: {
          '200': {
            description: 'OpenAPI specification',
            headers: {
              'X-Agent-Protocol-Version': {
                schema: {
                  type: 'string',
                },
                description: 'API protocol version',
              },
            },
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  description: 'OpenAPI 3.0 specification',
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
        description: 'API key for authentication. Include in Authorization header as: Bearer YOUR_API_KEY',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        required: ['error'],
        properties: {
          error: {
            type: 'object',
            required: ['code', 'message'],
            properties: {
              code: {
                type: 'string',
                enum: [
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
                ],
                description: 'Machine-readable error code',
              },
              message: { 
                type: 'string',
                description: 'Human-readable error message',
              },
              details: { 
                type: 'object',
                description: 'Additional error context',
              },
            },
          },
        },
      },
    },
  },
  'x-error-codes': {
    ERR_URL_UNREACHABLE: {
      description: 'Target URL cannot be reached',
      http_status: 422,
      recovery: 'Verify the URL is correct and accessible. Check network connectivity and DNS resolution.',
    },
    ERR_BOT_BLOCKED: {
      description: 'Target site blocks bot access',
      http_status: 422,
      recovery: 'Contact the site owner to whitelist the agent, or use an alternative access method.',
    },
    ERR_DOM_UNREADABLE: {
      description: 'HTML parsing failed due to malformed markup',
      http_status: 422,
      recovery: 'Verify the URL returns valid HTML. Check if the page requires JavaScript rendering.',
    },
    ERR_TIMEOUT: {
      description: 'Extraction exceeded the 15-second timeout',
      http_status: 422,
      recovery: 'Retry the request. Consider using fast mode for quicker results.',
    },
    ERR_INVALID_URL: {
      description: 'URL format is invalid',
      http_status: 400,
      recovery: 'Provide a valid HTTP or HTTPS URL.',
    },
    ERR_AUTH_MISSING: {
      description: 'No Authorization header provided',
      http_status: 401,
      recovery: 'Include a Bearer token in the Authorization header.',
    },
    ERR_AUTH_INVALID: {
      description: 'Invalid or expired Bearer token',
      http_status: 401,
      recovery: 'Verify your API key is correct and active. Generate a new key if needed.',
    },
    ERR_QUOTA_EXCEEDED: {
      description: 'API key quota exhausted',
      http_status: 402,
      recovery: 'Upgrade your plan or wait for quota reset. Check your usage dashboard.',
    },
    ERR_RATE_LIMIT: {
      description: 'Too many requests in the current time window',
      http_status: 429,
      recovery: 'Wait for the rate limit window to reset (see Retry-After header). Implement exponential backoff.',
    },
    ERR_INTERNAL: {
      description: 'Unexpected server error',
      http_status: 500,
      recovery: 'Retry the request. If the issue persists, contact support with the request_id from error details.',
    },
  },
};
