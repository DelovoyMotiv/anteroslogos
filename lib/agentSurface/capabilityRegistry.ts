/**
 * Capability Registry for the agent surface.
 *
 * This module is the SINGLE SOURCE OF TRUTH for what the agent surface can do
 * and whether each thing is callable now (`LIVE`) or is implemented/specified
 * but not runnable in the production serverless environment (`DESIGN`).
 *
 * `/api/capabilities` serves from this registry, the A2A/MCP gateways register
 * only its `LIVE` methods, and the discovery/mirror generator + validator keep
 * the static artifacts in agreement with it. This is what turns truthfulness
 * into an enforceable invariant rather than a manual promise.
 *
 * Core invariant (enforced at module load, see `assertRegistryInvariants`):
 *   an entry carries a resolving `endpoint` IF AND ONLY IF `status === 'LIVE'`;
 *   `DESIGN` entries never carry a resolving endpoint.
 *
 * Subsystem matrix (declared as capability entries with ids mesh/pbft/ccc/
 * watermark): Mesh is ALWAYS `DESIGN` (a live swarm needs a persistent libp2p
 * host and cannot run on stateless serverless); Watermark provenance is `LIVE`
 * because deterministic extraction/verification runs in-function at
 * `/api/verify`.
 *
 * Feature: agent-surface-truth
 * Requirements: 3.2, 3.3, 7.1, 7.3, 7.4, 9.1, 9.4
 */

// =====================================================
// TYPES
// =====================================================

/**
 * Declared lifecycle label for a capability, tool, transport, or subsystem.
 * `LIVE`   — callable and working in the production environment.
 * `DESIGN` — implemented as library code and/or specified, but not runnable
 *            in the production serverless environment.
 */
export type CapabilityStatus = 'LIVE' | 'DESIGN';

/** A single capability, method, tool, or subsystem entry. */
export interface CapabilityEntry {
  /** Stable capability id, e.g. "geo.audit" or "mesh". */
  id: string;
  /** Human/agent-readable description. */
  description: string;
  status: CapabilityStatus;
  /** Backing endpoint path, present iff status === 'LIVE'. */
  endpoint?: string;
  /** For A2A/MCP methods: the JSON-RPC method / tool name this answers to. */
  method?: string;
  /** For subsystems (mesh/pbft/ccc/watermark): rationale for DESIGN. */
  note?: string;
}

export interface CapabilityRegistry {
  version: string;
  capabilities: CapabilityEntry[];
}

// =====================================================
// REGISTRY DATA
// =====================================================

/**
 * A2A JSON-RPC methods that route to a working implementation, exposed through
 * the `/api/a2a` gateway. Only methods listed here are advertised as callable
 * (Requirement 2.9); production-unrunnable methods (streaming, subscribe, mesh)
 * are deliberately absent.
 */
const A2A_ENDPOINT = '/api/a2a';

const a2aMethods: CapabilityEntry[] = [
  {
    id: 'a2a.discover',
    description: 'Return the agent discovery descriptor built from the registry.',
    status: 'LIVE',
    endpoint: A2A_ENDPOINT,
    method: 'a2a.discover',
  },
  {
    id: 'a2a.ping',
    description: 'Liveness check; returns { pong: true, timestamp }.',
    status: 'LIVE',
    endpoint: A2A_ENDPOINT,
    method: 'a2a.ping',
  },
  {
    id: 'a2a.status',
    description: 'Return the gateway status descriptor.',
    status: 'LIVE',
    endpoint: A2A_ENDPOINT,
    method: 'a2a.status',
  },
  {
    id: 'a2a.capabilities',
    description: 'Enumerate available capabilities from the registry.',
    status: 'LIVE',
    endpoint: A2A_ENDPOINT,
    method: 'a2a.capabilities',
  },
  {
    id: 'geo.audit',
    description: 'Run a GEO/SEO audit via performGeoAudit and return A2A-formatted results.',
    status: 'LIVE',
    endpoint: A2A_ENDPOINT,
    method: 'geo.audit',
  },
  {
    id: 'geo.audit.request',
    description: 'Advertised alias of geo.audit for compatibility with discovery files.',
    status: 'LIVE',
    endpoint: A2A_ENDPOINT,
    method: 'geo.audit.request',
  },
  {
    id: 'knowledge.graph.query',
    description: 'Build a knowledge graph from HTML via KnowledgeGraphBuilder.',
    status: 'LIVE',
    endpoint: A2A_ENDPOINT,
    method: 'knowledge.graph.query',
  },
  {
    id: 'citation.predict',
    description: 'Predict citations for a knowledge graph via CitationPredictionEngine.',
    status: 'LIVE',
    endpoint: A2A_ENDPOINT,
    method: 'citation.predict',
  },
  {
    id: 'identity.generate',
    description: 'Generate an aip:// identity + keypair + challenge.',
    status: 'LIVE',
    endpoint: A2A_ENDPOINT,
    method: 'identity.generate',
  },
  {
    id: 'identity.challenge',
    description: 'Issue an Ed25519 challenge for an aip:// identity.',
    status: 'LIVE',
    endpoint: A2A_ENDPOINT,
    method: 'identity.challenge',
  },
  {
    id: 'identity.verify',
    description: 'Verify an Ed25519 signature and issue a token.',
    status: 'LIVE',
    endpoint: A2A_ENDPOINT,
    method: 'identity.verify',
  },
];

/**
 * MCP tools. Executable tools route through `/api/mcp` (LIVE); stub / native-
 * dependency tools are `DESIGN` and carry no resolving endpoint — invoking them
 * returns a structured design-stage result (Requirements 4.6, 9.1).
 */
const MCP_ENDPOINT = '/api/mcp';

const mcpTools: CapabilityEntry[] = [
  {
    id: 'mcp.auditSite',
    description: 'MCP tool auditSite (alias anoteros_logos): run a GEO/SEO site audit.',
    status: 'LIVE',
    endpoint: MCP_ENDPOINT,
    method: 'auditSite',
  },
  {
    id: 'mcp.anoteros_logos',
    description: 'Advertised alias of the auditSite MCP tool.',
    status: 'LIVE',
    endpoint: MCP_ENDPOINT,
    method: 'anoteros_logos',
  },
  {
    id: 'mcp.getGraph',
    description: 'MCP tool getGraph: build a knowledge graph from a page.',
    status: 'LIVE',
    endpoint: MCP_ENDPOINT,
    method: 'getGraph',
  },
  {
    id: 'mcp.predictCitation',
    description: 'MCP tool predictCitation: predict citations for a graph.',
    status: 'LIVE',
    endpoint: MCP_ENDPOINT,
    method: 'predictCitation',
  },
  {
    id: 'mcp.code_execution',
    description: 'Sandboxed code execution (isolated-vm). Not runnable on serverless.',
    status: 'DESIGN',
    method: 'code_execution',
    note: 'Requires the native isolated-vm binding and Supabase; unavailable in production serverless.',
  },
  {
    id: 'mcp.synthesizeNode',
    description: 'Synthesize a new knowledge-graph node. Design-stage.',
    status: 'DESIGN',
    method: 'synthesizeNode',
    note: 'Design-stage tool; no production-runnable implementation.',
  },
  {
    id: 'mcp.causal_citation_trace',
    description: 'Trace causal citation chains. Design-stage.',
    status: 'DESIGN',
    method: 'causal_citation_trace',
    note: 'Design-stage tool; no production-runnable implementation.',
  },
  {
    id: 'mcp.predictive_synthesis',
    description: 'Predictive synthesis over the graph. Design-stage.',
    status: 'DESIGN',
    method: 'predictive_synthesis',
    note: 'Design-stage tool; no production-runnable implementation.',
  },
  {
    id: 'mcp.federated_authority_boost',
    description: 'Federated authority boosting across peers. Design-stage.',
    status: 'DESIGN',
    method: 'federated_authority_boost',
    note: 'Requires a live peer mesh; unavailable in production serverless.',
  },
];

/**
 * Standalone LIVE endpoints (non-JSON-RPC or gateway roots) that MUST resolve
 * to a deployed `api/**` handler. These have no single `method` name.
 */
const endpointCapabilities: CapabilityEntry[] = [
  {
    id: 'gateway.a2a',
    description: 'A2A JSON-RPC 2.0 gateway.',
    status: 'LIVE',
    endpoint: A2A_ENDPOINT,
  },
  {
    id: 'gateway.mcp',
    description: 'MCP transport endpoint (tools/list, resources/list, prompts/list, tools/call).',
    status: 'LIVE',
    endpoint: MCP_ENDPOINT,
  },
  {
    id: 'capabilities',
    description: 'Machine-readable capability descriptor for the agent surface.',
    status: 'LIVE',
    endpoint: '/api/capabilities',
  },
  {
    id: 'verify',
    description: 'Independent Ed25519 + UCPT watermark verification.',
    status: 'LIVE',
    endpoint: '/api/verify',
  },
  {
    id: 'tools.search',
    description: 'Tool search endpoint.',
    status: 'LIVE',
    endpoint: '/api/tools/search',
  },
  {
    id: 'identity.auth',
    description: 'Canonical AIP identity service (generate, challenge, verify, token).',
    status: 'LIVE',
    endpoint: '/api/auth',
  },
  {
    id: 'identity.challenge.alias',
    description: 'Legacy AID challenge alias delegating to the AIP identity service.',
    status: 'LIVE',
    endpoint: '/api/challenge',
  },
  {
    id: 'identity.public-aid.alias',
    description: 'Legacy AID identity-generation alias delegating to the AIP identity service.',
    status: 'LIVE',
    endpoint: '/api/public-aid',
  },
  {
    id: 'system',
    description: 'System endpoint including the dependency-free health check.',
    status: 'LIVE',
    endpoint: '/api/system',
  },
];

/**
 * Subsystem status matrix. Declared as capability entries with stable ids so
 * discovery/mirror artifacts declare identical statuses (Requirements 7.1,
 * 8.4). Mesh is ALWAYS DESIGN; Watermark provenance is LIVE.
 */
const subsystems: CapabilityEntry[] = [
  {
    id: 'mesh',
    description: 'DHT/libp2p peer mesh with discovery, announce, sync, and health.',
    status: 'DESIGN',
    note: 'Requires a persistent libp2p host; a running swarm cannot run on stateless serverless functions.',
  },
  {
    id: 'pbft',
    description: 'Practical Byzantine Fault Tolerance consensus.',
    status: 'DESIGN',
    note: 'Consensus needs multiple long-lived peers; not runnable on stateless serverless.',
  },
  {
    id: 'ccc',
    description: 'Credit/penalty economy: atomic credit/debit/stake/transfer ledger.',
    status: 'DESIGN',
    note: 'No persistent shared ledger in production.',
  },
  {
    id: 'watermark',
    description: 'UCPT watermark provenance: deterministic extraction and verification.',
    status: 'LIVE',
    endpoint: '/api/verify',
    note: 'Deterministic extraction/verification runs in-function via /api/verify and the x-anoteros-watermark header.',
  },
];

/**
 * The registry: the single source of truth for LIVE/DESIGN labels across the
 * agent surface.
 */
export const CAPABILITY_REGISTRY: CapabilityRegistry = {
  version: '1.0.0',
  capabilities: [
    ...endpointCapabilities,
    ...a2aMethods,
    ...mcpTools,
    ...subsystems,
  ],
};

// =====================================================
// INVARIANT ENFORCEMENT
// =====================================================

/**
 * Assert the core registry invariants. Throws at module load if violated so a
 * dishonest registry can never ship:
 *   1. An entry has a non-empty `endpoint` IF AND ONLY IF `status === 'LIVE'`.
 *      DESIGN entries never carry a resolving endpoint (Requirements 3.3, 7.4,
 *      9.4).
 *   2. Every entry carries a valid status label (Requirements 3.2, 7.1).
 *   3. The Mesh subsystem is ALWAYS DESIGN; Watermark is LIVE (Requirement 7.2).
 *   4. Entry ids are unique.
 */
export function assertRegistryInvariants(
  registry: CapabilityRegistry = CAPABILITY_REGISTRY
): void {
  const seenIds = new Set<string>();

  for (const entry of registry.capabilities) {
    // (2) Valid status label.
    if (entry.status !== 'LIVE' && entry.status !== 'DESIGN') {
      throw new Error(
        `CapabilityRegistry: entry "${entry.id}" has invalid status "${String(
          entry.status
        )}"; must be 'LIVE' or 'DESIGN'.`
      );
    }

    // (4) Unique ids.
    if (seenIds.has(entry.id)) {
      throw new Error(
        `CapabilityRegistry: duplicate capability id "${entry.id}".`
      );
    }
    seenIds.add(entry.id);

    // (1) endpoint iff LIVE.
    const hasEndpoint =
      typeof entry.endpoint === 'string' && entry.endpoint.length > 0;
    if (entry.status === 'LIVE' && !hasEndpoint) {
      throw new Error(
        `CapabilityRegistry: LIVE entry "${entry.id}" must carry a resolving endpoint.`
      );
    }
    if (entry.status === 'DESIGN' && hasEndpoint) {
      throw new Error(
        `CapabilityRegistry: DESIGN entry "${entry.id}" must not carry a resolving endpoint (found "${entry.endpoint}").`
      );
    }
  }

  // (3) Subsystem matrix guarantees.
  const mesh = registry.capabilities.find((c) => c.id === 'mesh');
  if (!mesh || mesh.status !== 'DESIGN') {
    throw new Error(
      "CapabilityRegistry: the 'mesh' subsystem must always be DESIGN."
    );
  }
  const watermark = registry.capabilities.find((c) => c.id === 'watermark');
  if (!watermark || watermark.status !== 'LIVE') {
    throw new Error(
      "CapabilityRegistry: the 'watermark' subsystem must be LIVE."
    );
  }
}

// Enforce the invariants by construction at module load.
assertRegistryInvariants();

// =====================================================
// PUBLIC API
// =====================================================

/**
 * All method names that route to a working implementation: the `method` names
 * of `LIVE` entries. These are exactly the methods that may be advertised as
 * callable and registered in the A2A/MCP dispatcher handler maps
 * (Requirement 2.9).
 */
export function liveMethods(): string[] {
  const methods: string[] = [];
  for (const entry of CAPABILITY_REGISTRY.capabilities) {
    if (entry.status === 'LIVE' && typeof entry.method === 'string') {
      methods.push(entry.method);
    }
  }
  return methods;
}

/**
 * The unique set of endpoint paths that MUST resolve: the `endpoint` values of
 * all `LIVE` entries (Requirements 1.1, 9.2).
 */
export function advertisedEndpoints(): string[] {
  const endpoints = new Set<string>();
  for (const entry of CAPABILITY_REGISTRY.capabilities) {
    if (entry.status === 'LIVE' && typeof entry.endpoint === 'string') {
      endpoints.add(entry.endpoint);
    }
  }
  return [...endpoints];
}
