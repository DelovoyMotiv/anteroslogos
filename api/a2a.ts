/**
 * A2A Protocol Cascade Endpoint
 * Handles incoming UCPT cascade messages from mesh network
 * 
 * Method: a2a.mesh.cascade
 * Silent receiver: validates, stores, rebroadcasts with TTL-1, never returns to client
 * 
 * @module api/a2a
 * @version 1.0.0
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { UCPTCascadeMessage } from '../lib/mesh/network';
import type { InitializableRouter, ValidatedApiHandler } from '../types/api.types';
import { MeshNetworkRouter } from '../lib/mesh/network';
import { storeCascadeToken, recordRebroadcast } from '../lib/cascade/storage';
import { withCors, withRateLimit, withJsonRpcValidation, withCsrfProtection, compose } from '../lib/validation/middleware';
import { UCPTCascadeMessageSchema } from '../lib/validation/apiSchemas';
import { isInitializableRouter } from '../types/api.types';

// =====================================================
// JSON-RPC 2.0 TYPES
// =====================================================

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: Record<string, unknown>;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: string | number | null;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

// =====================================================
// MESH ROUTER INSTANCE
// =====================================================

let meshRouter: MeshNetworkRouter | null = null;

function getMeshRouter(): MeshNetworkRouter {
  if (!meshRouter) {
    // Initialize with this agent's AID
    const localAid = process.env.AGENT_AID || 'aid://anoteroslogos.com/geo-audit';
    meshRouter = new MeshNetworkRouter(localAid, { useLibp2p: true });
  }
  return meshRouter;
}

// =====================================================
// CASCADE MESSAGE HANDLER
// =====================================================

/**
 * Handle incoming a2a.mesh.cascade message
 * Silent processing: validate → store → rebroadcast → return minimal ack
 */
async function handleCascadeMessage(params: UCPTCascadeMessage): Promise<void> {
  console.log(
    `[A2ACascade] Received cascade message from ${params.sourceAid} (tool: ${params.tool}, TTL: ${params.ttl})`
  );
  
  // Validate TTL
  if (params.ttl < 0 || params.ttl > 7) {
    console.warn(`[A2ACascade] Invalid TTL: ${params.ttl}, rejecting`);
    return;
  }
  
  // If TTL is 0, just store and don't rebroadcast
  if (params.ttl === 0) {
    console.log('[A2ACascade] TTL=0, storing only (no rebroadcast)');
    await storeCascadeToken(
      { token: params.ucpt, mime_type: 'application/cose; cose-type="cose-sign1"' },
      params.sourceAid,
      params.tool,
      params.ttl
    );
    return;
  }
  
  // Store token in cascade cache
  const stored = await storeCascadeToken(
    { token: params.ucpt, mime_type: 'application/cose; cose-type="cose-sign1"' },
    params.sourceAid,
    params.tool,
    params.ttl
  );
  
  if (!stored) {
    // Token was duplicate or invalid, don't rebroadcast
    console.log('[A2ACascade] Token not stored (duplicate/invalid), skipping rebroadcast');
    return;
  }
  
  // Rebroadcast with decremented TTL
  const router = getMeshRouter();
  
  // Check if router is initialized
  if (isInitializableRouter(router) && !router.initialized) {
    try {
      await router.initialize();
    } catch (error) {
      console.error('[A2ACascade] Failed to initialize mesh router:', error);
      // Still return success - we stored the token
      return;
    }
  }
  
  const cascadeMessage: UCPTCascadeMessage = {
    type: 'ucpt-cascade',
    ucpt: params.ucpt,
    sourceAid: params.sourceAid,
    tool: params.tool,
    ttl: params.ttl - 1,
    timestamp: Date.now(),
  };
  
  try {
    const { sent, failed } = await router.broadcast(cascadeMessage, {
      maxHops: params.ttl - 1,
      filter: 'ucpt-capable',
    });
    
    console.log(
      `[A2ACascade] Rebroadcast complete: ${sent} sent, ${failed} failed (TTL now ${params.ttl - 1})`
    );
    
    if (sent > 0) {
      await recordRebroadcast();
    }
  } catch (error) {
    console.error('[A2ACascade] Rebroadcast failed:', error);
    // Don't throw - we still successfully stored the token
  }
}

// =====================================================
// MAIN HANDLER
// =====================================================

async function mainHandler(
  req: VercelRequest,
  res: VercelResponse,
  validated: { method: string; params: unknown; id: string | number }
) {
  // Handle a2a.mesh.cascade method
  if (validated.method === 'a2a.mesh.cascade') {
    try {
      const params = validated.params as UCPTCascadeMessage;
      
      // Process cascade message (async, don't wait)
      // Fire-and-forget for maximum throughput
      handleCascadeMessage(params).catch(err => {
        console.error('[A2ACascade] Error processing cascade:', err);
      });
      
      // Return immediate acknowledgment (silent success)
      return res.status(200).json({
        jsonrpc: '2.0',
        id: validated.id,
        result: {
          accepted: true,
          timestamp: Date.now(),
        },
      } satisfies JsonRpcResponse);
    } catch (error) {
      console.error('[A2ACascade] Handler error:', error);
      return res.status(500).json({
        jsonrpc: '2.0',
        id: validated.id,
        error: {
          code: -32603,
          message: 'Internal error',
          data: error instanceof Error ? error.message : String(error),
        },
      } satisfies JsonRpcResponse);
    }
  }
  
  // Method not found
  return res.status(404).json({
    jsonrpc: '2.0',
    id: validated.id,
    error: {
      code: -32601,
      message: 'Method not found',
      data: `Unknown method: ${validated.method}`,
    },
  } satisfies JsonRpcResponse);
}

// Apply middleware: CORS -> Rate Limiting -> CSRF Protection -> JSON-RPC Validation
export default compose(
  withCors,
  (handler) => withRateLimit(handler, { maxRequests: 100, windowMs: 60000 }),
  (handler) => withCsrfProtection(handler, { 
    excludeMethods: ['GET', 'OPTIONS'],
    excludePaths: [] 
  }),
  (handler) => withJsonRpcValidation(
    {
      'a2a.mesh.cascade': UCPTCascadeMessageSchema,
    },
    handler as ValidatedApiHandler
  )
)(mainHandler);
