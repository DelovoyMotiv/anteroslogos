/**
 * UAP Server Initialization & Integration
 * Bridges UAP transport layer with existing A2A protocol and agent infrastructure
 * 
 * @module src/protocols/uap/server
 * @version 1.0.0
 */

import { UAPServer } from './transport/uapServer';
import { getTrustMiddleware } from '../../core/trust/middleware';
import { getMessageRouter } from './transport/messageRouter';
import type { UAPMessage, DIDString, AgentCapabilities, RequestPayload } from './types';
import { MESSAGE_TYPES } from './constants';

// =====================================================
// CONFIGURATION
// =====================================================

const UAP_HTTP2_PORT = process.env.UAP_HTTP2_PORT ? parseInt(process.env.UAP_HTTP2_PORT) : 8443;
const UAP_WS_PORT = process.env.UAP_WS_PORT ? parseInt(process.env.UAP_WS_PORT) : 8080;
const UAP_ENABLED = process.env.UAP_ENABLE !== 'false'; // Enabled by default

// Server DID
const SERVER_DID = (process.env.UAP_SERVER_DID || 'did:aid:anoteroslogos') as DIDString;

// Server capabilities (exported for discovery announcements)
export const SERVER_CAPABILITIES: AgentCapabilities = {
  capabilities: [
    'geo.audit',
    'knowledge.graph',
    'citation.prediction',
    'content.synthesis',
    'causal.reasoning',
    'authority.verification',
  ],
  protocols: ['uap/1.0', 'a2a/1.0'],
  name: 'Anóteros Lógos GEO Agent',
  version: '1.0.0',
  endpoints: {
    message: `https://anoteroslogos.com/uap/v1/message`,
    stream: `wss://anoteroslogos.com/uap/v1/stream`,
  },
  'x-anoteros': {
    causalRelayEnabled: true,
    bftConsensus: 'pbft',
    trustLayerVersion: '1.0',
    watermarkLedger: 'https://anoteroslogos.com/api/ledger',
  },
};

// =====================================================
// SERVER INSTANCE (SINGLETON)
// =====================================================

let serverInstance: UAPServer | null = null;

/**
 * Initialize and start UAP server
 */
export async function startUAPServer(): Promise<UAPServer> {
  if (serverInstance) {
    console.log('[UAP Server] Already running');
    return serverInstance;
  }

  if (!UAP_ENABLED) {
    console.log('[UAP Server] Disabled via environment variable');
    throw new Error('UAP server disabled');
  }

  console.log('[UAP Server] Starting...');

  // Initialize trust middleware
  getTrustMiddleware();
  console.log('[UAP Server] Trust middleware initialized');

  // Initialize message router with custom handlers
  const router = getMessageRouter();
  registerApplicationHandlers(router);
  console.log('[UAP Server] Message router configured');

  // Create server instance
  serverInstance = new UAPServer({
    http2: {
      port: UAP_HTTP2_PORT,
    },
    ws: {
      port: UAP_WS_PORT,
    },
    serverDID: SERVER_DID,
  });

  // Start server
  await serverInstance.start();

  console.log('[UAP Server] ✅ Started successfully');
  console.log(`[UAP Server] HTTP/2: port ${UAP_HTTP2_PORT}`);
  console.log(`[UAP Server] WebSocket: port ${UAP_WS_PORT}`);

  return serverInstance;
}

/**
 * Stop UAP server
 */
export async function stopUAPServer(): Promise<void> {
  if (!serverInstance) {
    return;
  }

  console.log('[UAP Server] Stopping...');
  await serverInstance.stop();
  serverInstance = null;
  console.log('[UAP Server] Stopped');
}

/**
 * Get running server instance
 */
export function getUAPServer(): UAPServer | null {
  return serverInstance;
}

// =====================================================
// APPLICATION-SPECIFIC HANDLERS
// =====================================================

/**
 * Register application-specific message handlers
 * Bridges UAP messages to existing agent logic
 */
function registerApplicationHandlers(router: ReturnType<typeof getMessageRouter>): void {
  // GEO Audit Handler
  router.registerRoute({
    type: 'geo.audit.request',
    handler: async (message: UAPMessage) => {
      const payload = message.payload as RequestPayload & {
        url: string;
        options?: { depth?: string; timeout?: number };
      };

      console.log(`[UAP Handler] GEO audit request for ${payload.url}`);

      try {
        // Import GEO audit engine dynamically to avoid circular dependencies
        const { auditWebsite } = await import('../../../utils/geoAudit');
        
        // Perform actual GEO audit
        const auditResult = await auditWebsite(payload.url);
        
        // Calculate grade from score
        const grade = 
          auditResult.overallScore >= 90 ? 'A+' :
          auditResult.overallScore >= 80 ? 'A' :
          auditResult.overallScore >= 70 ? 'B' :
          auditResult.overallScore >= 60 ? 'C' :
          auditResult.overallScore >= 50 ? 'D' : 'F';

        const result = {
          url: auditResult.url,
          score: auditResult.overallScore,
          grade,
          timestamp: auditResult.timestamp,
          scores: auditResult.scores,
          details: auditResult.details,
          recommendations: auditResult.recommendations,
        };

        return {
          header: {
            version: message.header.version,
            messageType: MESSAGE_TYPES.RESPONSE,
            messageId: crypto.randomUUID(),
            senderId: SERVER_DID,
            recipientId: message.header.senderId,
            timestamp: new Date().toISOString(),
            signature: '',
            correlationId: message.header.messageId,
          },
          payload: {
            taskId: payload.taskId || 'audit-' + Date.now(),
            status: 'accepted' as const,
            result,
          },
        } as UAPMessage;
      } catch (error) {
        console.error('[UAP Handler] GEO audit failed:', error);
        throw error;
      }
    },
    rateLimitType: 'request',
  });

  // Knowledge Graph Handler
  router.registerRoute({
    type: 'knowledge.graph.query',
    handler: async (message: UAPMessage) => {
      const payload = message.payload as RequestPayload & { 
        query: string;
        url?: string; // Optional URL to build graph from
      };

      console.log(`[UAP Handler] Knowledge graph query: ${payload.query}`);

      try {
        // Import knowledge graph builder dynamically
        const { KnowledgeGraphBuilder } = await import('../../../utils/knowledgeGraph/builder');
        
        let result;
        
        if (payload.url) {
          // Build knowledge graph from URL
          const domain = new URL(payload.url).hostname;
          const builder = new KnowledgeGraphBuilder(domain);
          
          // Fetch HTML content
          const response = await fetch(payload.url);
          if (!response.ok) {
            throw new Error(`Failed to fetch URL: ${response.statusText}`);
          }
          const html = await response.text();
          
          // Build knowledge graph
          const knowledgeGraph = await builder.buildFromHTML(html, payload.url);
          
          result = {
            query: payload.query,
            url: payload.url,
            graph: knowledgeGraph,
            timestamp: new Date().toISOString(),
          };
        } else {
          // Query existing knowledge graph (would need database integration)
          // For now, return empty result with message
          result = {
            query: payload.query,
            entities: [],
            relationships: [],
            claims: [],
            timestamp: new Date().toISOString(),
            message: 'Knowledge graph query requires URL parameter or database integration',
          };
        }

        return {
          header: {
            version: message.header.version,
            messageType: MESSAGE_TYPES.RESPONSE,
            messageId: crypto.randomUUID(),
            senderId: SERVER_DID,
            recipientId: message.header.senderId,
            timestamp: new Date().toISOString(),
            signature: '',
            correlationId: message.header.messageId,
          },
          payload: {
            taskId: payload.taskId || 'kg-' + Date.now(),
            status: 'accepted' as const,
            result,
          },
        } as UAPMessage;
      } catch (error) {
        console.error('[UAP Handler] Knowledge graph query failed:', error);
        throw error;
      }
    },
    rateLimitType: 'request',
  });

  console.log('[UAP Server] Application handlers registered');
}

// =====================================================
// GRACEFUL SHUTDOWN
// =====================================================

// Handle process termination
process.on('SIGINT', async () => {
  console.log('\n[UAP Server] SIGINT received, shutting down gracefully...');
  await stopUAPServer();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n[UAP Server] SIGTERM received, shutting down gracefully...');
  await stopUAPServer();
  process.exit(0);
});

// =====================================================
// EXPORTS
// =====================================================

export default {
  start: startUAPServer,
  stop: stopUAPServer,
  getServer: getUAPServer,
};
