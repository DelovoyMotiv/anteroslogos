/**
 * Vercel Serverless Function - Agent Capabilities (OpenAPI 3.1)
 * GET /api/capabilities - Returns OpenAPI spec
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

let cachedSpec: object | null = null;

function buildOpenApiSpec(): object {
  return {
    openapi: '3.1.0',
    info: {
      title: 'Anóteros Lógos Agent API',
      version: '2.1.0',
      description: 'Enterprise AI Knowledge Infrastructure Platform with A2A, MCP, Ed25519 identity, and USDC payments.',
    },
    servers: [{ url: 'https://anoteroslogos.com', description: 'Production' }],
    tags: [
      { name: 'Identity', description: 'Agent identity management' },
      { name: 'A2A', description: 'Agent-to-Agent Protocol' },
      { name: 'MCP', description: 'Model Context Protocol' },
      { name: 'Discovery', description: 'Agent discovery endpoints' },
    ],
    paths: {
      '/api/public-aid': {
        post: {
          operationId: 'generateAid',
          tags: ['Identity'],
          summary: 'Generate new Agent Identity',
          requestBody: {
            content: { 'application/json': { schema: { type: 'object', properties: { name: { type: 'string' } } } } }
          },
          responses: { '201': { description: 'AID created' } }
        }
      },
      '/api/challenge': {
        get: {
          operationId: 'getChallenge',
          tags: ['Identity'],
          summary: 'Get authentication challenge',
          parameters: [{ name: 'aid', in: 'query', required: true, schema: { type: 'string' } }],
          responses: { '200': { description: 'Challenge generated' } }
        },
        post: {
          operationId: 'verifyChallenge',
          tags: ['Identity'],
          summary: 'Verify signature',
          responses: { '200': { description: 'Signature verified' } }
        }
      },
      '/api/handshake': {
        post: {
          operationId: 'handshake',
          tags: ['Identity'],
          summary: 'One-step agent integration',
          responses: { '200': { description: 'Handshake complete' } }
        }
      },
      '/api/a2a': {
        post: {
          operationId: 'a2aRpc',
          tags: ['A2A'],
          summary: 'A2A JSON-RPC endpoint',
          responses: { '200': { description: 'JSON-RPC response' } }
        }
      },
      '/api/mcp/programmatic': {
        post: {
          operationId: 'mcpProgrammatic',
          tags: ['MCP'],
          summary: 'Programmatic tool execution',
          responses: { '200': { description: 'Execution result' } }
        }
      },
      '/api/tools/search': {
        get: {
          operationId: 'searchTools',
          tags: ['MCP'],
          summary: 'Search available tools',
          responses: { '200': { description: 'Search results' } }
        }
      },
      '/.well-known/agent.json': {
        get: { operationId: 'agentJson', tags: ['Discovery'], summary: 'AID v1.1 manifest' }
      },
      '/.well-known/agent-card.json': {
        get: { operationId: 'agentCard', tags: ['Discovery'], summary: 'A2A Agent Card' }
      }
    },
    components: {
      securitySchemes: {
        ed25519: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        apiKey: { type: 'apiKey', in: 'header', name: 'X-API-Key' }
      }
    },
    'x-agent-protocols': ['a2a/1.0', 'mcp/2.0', 'jsonrpc/2.0'],
    'x-agent-authentication': ['ed25519', 'bearer', 'api_key'],
    'x-agent-payment': { network: 'base-l2', chainId: 8453, token: 'USDC' }
  };
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, max-age=300');
  
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  if (!cachedSpec) {
    cachedSpec = buildOpenApiSpec();
  }
  
  return res.status(200).json(cachedSpec);
}
