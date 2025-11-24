import type { VercelRequest, VercelResponse } from '@vercel/node';
import { readFileSync } from 'fs';
import { join } from 'path';

let cachedCapabilities: any = null;

function loadCapabilities() {
  if (cachedCapabilities) {
    return cachedCapabilities;
  }

  try {
    const publicDir = join(process.cwd(), 'public', '.well-known');
    
    const openaiTools = JSON.parse(readFileSync(join(publicDir, 'mcp-tools-openai.json'), 'utf-8'));
    const claudeTools = JSON.parse(readFileSync(join(publicDir, 'mcp-tools-claude.json'), 'utf-8'));
    const grokTools = JSON.parse(readFileSync(join(publicDir, 'mcp-tools-grok.json'), 'utf-8'));

    const tools = [...openaiTools.tools, ...claudeTools.tools, ...grokTools.tools];
    const uniqueTools = new Map();

    for (const tool of tools) {
      if (!uniqueTools.has(tool.name)) {
        uniqueTools.set(tool.name, tool);
      }
    }

    const paths: Record<string, any> = {};
    const schemas: Record<string, any> = {};

    for (const [name, tool] of uniqueTools.entries()) {
      const pathName = `/tools/${name}`;
      
      paths[pathName] = {
        post: {
          summary: tool.description,
          operationId: name,
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: tool.parameters?.properties || {},
                  required: tool.parameters?.required || []
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'Successful response',
              content: {
                'application/json': {
                  schema: { type: 'object' }
                }
              }
            }
          }
        }
      };

      schemas[`${name}Request`] = {
        type: 'object',
        properties: tool.parameters?.properties || {},
        required: tool.parameters?.required || []
      };
    }

    cachedCapabilities = {
      openapi: '3.1.0',
      info: {
        title: 'Anóteros Lógos Agent API',
        version: '1.0.0',
        description: 'Unified tool capabilities for AI agents'
      },
      servers: [
        { url: 'https://anoteroslogos.com/api', description: 'Production' }
      ],
      paths,
      components: {
        schemas,
        securitySchemes: {
          BearerAuth: {
            type: 'http',
            scheme: 'bearer'
          }
        }
      },
      'x-formats': {
        openai: openaiTools,
        claude: claudeTools,
        grok: grokTools
      }
    };

    return cachedCapabilities;
  } catch (error) {
    console.error('Failed to load capabilities:', error);
    throw error;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'public, max-age=3600');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const capabilities = loadCapabilities();
    return res.status(200).json(capabilities);
  } catch (error) {
    console.error('Capabilities error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to load capabilities'
    });
  }
}
