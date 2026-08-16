/**
 * A2A JSON-RPC 2.0 Gateway (`/api/a2a`)
 *
 * A thin transport adapter (design AD1 — no business logic reimplemented) that
 * validates a JSON-RPC 2.0 envelope, dispatches by method name via the shared
 * dispatcher (`lib/agentSurface/jsonRpc.ts`), and routes each LIVE method to an
 * existing library implementation:
 *
 *   a2a.discover           -> discovery descriptor built from the registry
 *   a2a.ping               -> { pong: true, timestamp }
 *   a2a.status             -> status descriptor
 *   a2a.capabilities       -> capability list from the registry
 *   geo.audit              -> performGeoAudit(url, options) + convertToA2AFormat
 *   geo.audit.request      -> advertised alias of geo.audit
 *   knowledge.graph.query  -> new KnowledgeGraphBuilder(domain).buildFromHTML(html, url)
 *   citation.predict       -> new CitationPredictionEngine().predict(graph, ...)
 *   identity.generate      -> shared AIP identity module
 *   identity.challenge     -> shared AIP identity module
 *   identity.verify        -> shared AIP identity module
 *
 * Production-unrunnable methods (`geo.audit.stream`, `a2a.subscribe`,
 * `a2a.mesh.*`, `geo.insights.global`) are deliberately NOT registered
 * (Requirement 2.9); only methods that route to a working implementation are
 * exposed.
 *
 * Heavy/native-adjacent implementations (audit, knowledge-graph, citation) are
 * lazy-loaded inside the branch that needs them (design AD5) so cold start
 * stays light and a missing optional dependency degrades a single method rather
 * than crashing the whole function.
 *
 * Feature: agent-surface-truth
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withCors, withRateLimit, compose } from '../lib/validation/middleware';
import {
  validateEnvelope,
  dispatch,
  createErrorResponse,
  JsonRpcErrorCode,
  type JsonRpcRequest,
  type JsonRpcResponse,
  type MethodHandler,
  type RpcContext,
} from '../lib/agentSurface/jsonRpc';
import {
  CAPABILITY_REGISTRY,
  liveMethods,
} from '../lib/agentSurface/capabilityRegistry';
import {
  generateIdentity,
  issueChallenge,
  verifyAndIssueToken,
  IDENTITY_ALGORITHM,
} from '../lib/agentSurface/identity';
import {
  A2A_VERSION,
  A2A_PROTOCOL,
  detectAgent,
  generateRequestId,
  type A2AContext,
} from '../lib/a2a/protocol';
import { attachWatermarkHeader } from '../lib/agentSurface/watermarkHeader';

// =====================================================
// DESCRIPTOR BUILDERS (registry-backed, dependency-light)
// =====================================================

/**
 * Build the discovery descriptor from the Capability Registry. Only LIVE
 * methods (entries with a `method` and `status === 'LIVE'`) are advertised.
 */
function buildDiscoveryDescriptor() {
  const methods = CAPABILITY_REGISTRY.capabilities
    .filter((c) => c.status === 'LIVE' && typeof c.method === 'string')
    .map((c) => ({
      id: c.id,
      method: c.method,
      description: c.description,
      status: c.status,
    }));

  return {
    service: {
      name: 'Anóteros Lógos A2A Gateway',
      version: A2A_VERSION,
      description:
        'JSON-RPC 2.0 gateway routing agent calls to GEO audit, knowledge-graph, citation-prediction, and AIP identity implementations.',
      provider: 'anoteroslogos.com',
      homepage: 'https://anoteroslogos.com',
    },
    protocol: {
      version: A2A_VERSION,
      spec: A2A_PROTOCOL,
    },
    endpoints: {
      http: '/api/a2a',
    },
    methods,
  };
}

/** Build the capabilities descriptor straight from the registry. */
function buildCapabilitiesDescriptor() {
  return {
    version: CAPABILITY_REGISTRY.version,
    protocol: `A2A ${A2A_VERSION}`,
    capabilities: CAPABILITY_REGISTRY.capabilities,
  };
}

/** Build the gateway status descriptor. */
function buildStatusDescriptor() {
  return {
    status: 'operational',
    version: A2A_VERSION,
    protocol: A2A_PROTOCOL,
    timestamp: new Date().toISOString(),
    liveMethods: liveMethods(),
  };
}

/** Translate the per-request RpcContext into the A2AContext the adapter wants. */
function buildA2AContext(ctx: RpcContext): A2AContext {
  const userAgent = typeof ctx.userAgent === 'string' ? ctx.userAgent : '';
  return {
    request_id: ctx.requestId || generateRequestId(),
    tier: typeof ctx.tier === 'string' ? ctx.tier : 'free',
    timestamp: ctx.timestamp || new Date().toISOString(),
    ip_address: typeof ctx.ipAddress === 'string' ? ctx.ipAddress : undefined,
    agent_info: userAgent ? detectAgent(userAgent) || undefined : undefined,
  };
}

// =====================================================
// METHOD HANDLERS (thin adapters over existing libraries)
// =====================================================

type Params = Record<string, unknown>;

function asParams(params: unknown): Params {
  return params && typeof params === 'object' && !Array.isArray(params)
    ? (params as Params)
    : {};
}

/** a2a.discover — discovery descriptor from the registry. */
const handleDiscover: MethodHandler = async () => buildDiscoveryDescriptor();

/** a2a.ping — liveness check. */
const handlePing: MethodHandler = async () => ({
  pong: true,
  timestamp: Date.now(),
});

/** a2a.status — gateway status descriptor. */
const handleStatus: MethodHandler = async () => buildStatusDescriptor();

/** a2a.capabilities — capability list from the registry. */
const handleCapabilities: MethodHandler = async () =>
  buildCapabilitiesDescriptor();

/**
 * geo.audit (and alias geo.audit.request) — run the existing GEO audit and
 * convert the result to A2A format. Heavy implementation is lazy-loaded.
 */
const handleGeoAudit: MethodHandler = async (params, ctx) => {
  const { url, options } = asParams(params) as {
    url?: unknown;
    options?: unknown;
  };
  if (typeof url !== 'string' || url.length === 0) {
    throw new Error('Missing required parameter: url (string)');
  }

  const [{ performGeoAudit }, { convertToA2AFormat }] = await Promise.all([
    import('../utils/geoAuditEnhanced'),
    import('../lib/a2a/adapter'),
  ]);

  const startedAt = Date.now();
  const auditResult = await performGeoAudit(
    url,
    (options as Record<string, unknown> | undefined) ?? undefined
  );
  const processingTimeMs = Date.now() - startedAt;

  return convertToA2AFormat(auditResult, buildA2AContext(ctx), processingTimeMs);
};

/**
 * knowledge.graph.query — build a knowledge graph from HTML via the existing
 * KnowledgeGraphBuilder.
 */
const handleKnowledgeGraphQuery: MethodHandler = async (params) => {
  const { html, url, domain } = asParams(params) as {
    html?: unknown;
    url?: unknown;
    domain?: unknown;
  };
  if (typeof html !== 'string' || html.length === 0) {
    throw new Error('Missing required parameter: html (string)');
  }
  if (typeof url !== 'string' || url.length === 0) {
    throw new Error('Missing required parameter: url (string)');
  }

  const { KnowledgeGraphBuilder } = await import(
    '../utils/knowledgeGraph/builder'
  );
  const resolvedDomain =
    typeof domain === 'string' && domain.length > 0
      ? domain
      : new URL(url).hostname;

  const builder = new KnowledgeGraphBuilder(resolvedDomain);
  return builder.buildFromHTML(html, url);
};

/**
 * citation.predict — predict citations for a knowledge graph via the existing
 * CitationPredictionEngine. Accepts a pre-built `graph`, or `html` + `url` to
 * build one first for convenience.
 */
const handleCitationPredict: MethodHandler = async (params) => {
  const { graph, html, url, domain, historicalData } = asParams(params) as {
    graph?: unknown;
    html?: unknown;
    url?: unknown;
    domain?: unknown;
    historicalData?: unknown;
  };

  const { CitationPredictionEngine } = await import(
    '../utils/citationPrediction/engine'
  );

  let knowledgeGraph = graph as
    | Awaited<
        ReturnType<
          InstanceType<
            typeof import('../utils/knowledgeGraph/builder').KnowledgeGraphBuilder
          >['buildFromHTML']
        >
      >
    | undefined;

  if (!knowledgeGraph) {
    if (typeof html !== 'string' || typeof url !== 'string') {
      throw new Error(
        'Missing required parameter: graph (or html + url to build one)'
      );
    }
    const { KnowledgeGraphBuilder } = await import(
      '../utils/knowledgeGraph/builder'
    );
    const resolvedDomain =
      typeof domain === 'string' && domain.length > 0
        ? domain
        : new URL(url).hostname;
    knowledgeGraph = await new KnowledgeGraphBuilder(resolvedDomain).buildFromHTML(
      html,
      url
    );
  }

  const engine = new CitationPredictionEngine();
  return engine.predict(
    knowledgeGraph,
    historicalData as Parameters<CitationPredictionEngine['predict']>[1]
  );
};

/** identity.generate — generate an aip:// identity + keypair + challenge. */
const handleIdentityGenerate: MethodHandler = async (params) => {
  const { name } = asParams(params) as { name?: unknown };
  const identity = generateIdentity(typeof name === 'string' ? name : undefined);
  return {
    status: 'identity_created',
    aip: identity.aip,
    publicKey: identity.publicKey,
    privateKey: identity.privateKey,
    challenge: identity.challenge,
    challengeExpiresAt: new Date(identity.challengeExpiresAt).toISOString(),
    algorithm: IDENTITY_ALGORITHM,
    warning: 'Store the private key securely. It is only returned once.',
  };
};

/** identity.challenge — issue an Ed25519 challenge for an aip:// identity. */
const handleIdentityChallenge: MethodHandler = async (params) => {
  const { aip } = asParams(params) as { aip?: unknown };
  if (typeof aip !== 'string' || aip.length === 0) {
    throw new Error('Missing required parameter: aip (string)');
  }
  const issued = issueChallenge(aip);
  return {
    aip: issued.aip,
    challenge: issued.challenge,
    expiresAt: new Date(issued.expiresAt).toISOString(),
    algorithm: IDENTITY_ALGORITHM,
  };
};

/** identity.verify — verify an Ed25519 signature and issue a token. */
const handleIdentityVerify: MethodHandler = async (params) => {
  const { aip, challenge, publicKey, signature } = asParams(params) as {
    aip?: unknown;
    challenge?: unknown;
    publicKey?: unknown;
    signature?: unknown;
  };
  if (
    typeof aip !== 'string' ||
    typeof challenge !== 'string' ||
    typeof publicKey !== 'string' ||
    typeof signature !== 'string'
  ) {
    throw new Error(
      'Missing required parameters: aip, challenge, publicKey, signature (all strings)'
    );
  }

  const result = verifyAndIssueToken(aip, challenge, publicKey, signature);
  if (!result.verified) {
    return { verified: false, reason: result.reason };
  }
  return {
    verified: true,
    aip: result.aip,
    jwt: result.jwt,
    expiresAt: result.expiresAt,
  };
};

/**
 * Handler map — ONLY LIVE methods that route to a working implementation
 * (Requirement 2.9). Any method absent here yields a -32601 (method not found)
 * from the shared dispatcher.
 */
const HANDLERS: Record<string, MethodHandler> = {
  'a2a.discover': handleDiscover,
  'a2a.ping': handlePing,
  'a2a.status': handleStatus,
  'a2a.capabilities': handleCapabilities,
  'geo.audit': handleGeoAudit,
  'geo.audit.request': handleGeoAudit,
  'knowledge.graph.query': handleKnowledgeGraphQuery,
  'citation.predict': handleCitationPredict,
  'identity.generate': handleIdentityGenerate,
  'identity.challenge': handleIdentityChallenge,
  'identity.verify': handleIdentityVerify,
};

// =====================================================
// HTTP STATUS MAPPING
// =====================================================

/**
 * Map a JSON-RPC response to an HTTP status per the design's error-handling
 * table: envelope/param/method errors are client errors (400); a handler's
 * internal error (-32603) is a well-formed JSON-RPC response returned with 200.
 */
function httpStatusForResponse(response: JsonRpcResponse): number {
  if (!response.error) {
    return 200;
  }
  switch (response.error.code) {
    case JsonRpcErrorCode.INTERNAL_ERROR:
      return 200;
    default:
      return 400;
  }
}

// =====================================================
// HANDLER
// =====================================================

async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  // Friendly discovery on GET so agents can browse the gateway without a body.
  if (req.method === 'GET') {
    res.status(200).json(buildDiscoveryDescriptor());
    return;
  }

  if (req.method !== 'POST') {
    res
      .status(405)
      .json(
        createErrorResponse(
          null,
          JsonRpcErrorCode.INVALID_REQUEST,
          'Method not allowed: use POST with a JSON-RPC 2.0 body'
        )
      );
    return;
  }

  // Validate the JSON-RPC envelope (-32600 for malformed requests).
  const envelopeError = validateEnvelope(req.body);
  if (envelopeError) {
    res.status(400).json(envelopeError);
    return;
  }

  const rpcRequest = req.body as JsonRpcRequest;

  const ipHeader = req.headers['x-forwarded-for'];
  const ipAddress = Array.isArray(ipHeader)
    ? ipHeader[0]
    : (ipHeader || '').split(',')[0].trim() || undefined;

  const ctx: RpcContext = {
    requestId: generateRequestId(),
    transport: 'a2a',
    timestamp: new Date().toISOString(),
    userAgent:
      typeof req.headers['user-agent'] === 'string'
        ? req.headers['user-agent']
        : undefined,
    ipAddress,
  };

  const response = await dispatch(rpcRequest, HANDLERS, ctx);

  if (!response.error) {
    await attachWatermarkHeader(res, response.result);
  }

  res.status(httpStatusForResponse(response)).json(response);
}

// Apply middleware: CORS -> Rate limiting -> handler.
export default compose(
  withCors,
  (h) =>
    withRateLimit(h, {
      anonymousConfig: { requestsPerMinute: 60 },
      authenticatedConfig: { requestsPerMinute: 300 },
    })
)(handler);
