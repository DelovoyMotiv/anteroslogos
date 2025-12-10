/**
 * Billing Middleware Presets
 * 
 * Pre-configured billing middleware for common operations.
 * Provides convenient wrappers for frequently used billing scenarios.
 * 
 * @module lib/middleware/billingPresets
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withBilling, type BillingMiddlewareOptions } from './billingMiddleware';

// ============================================================================
// PRESET CONFIGURATIONS
// ============================================================================

/**
 * Billing middleware for GEO audit endpoints
 * Cost: 50 CCC (~$10 USD)
 * 
 * @example
 * ```typescript
 * import { withGeoAuditBilling } from '@/lib/middleware/billingPresets';
 * 
 * export default withGeoAuditBilling(handler);
 * ```
 */
export function withGeoAuditBilling(
  handler: (req: VercelRequest, res: VercelResponse) => Promise<void> | void,
  options?: Partial<BillingMiddlewareOptions>
) {
  return withBilling(handler, {
    operationType: 'GEO_AUDIT',
    description: 'GEO Audit - Comprehensive website analysis',
    ...options,
  });
}

/**
 * Billing middleware for API wrapper endpoints
 * Cost: 0.5 CCC (~$0.10 USD) for advanced operations
 * 
 * @example
 * ```typescript
 * import { withApiWrapperBilling } from '@/lib/middleware/billingPresets';
 * 
 * export default withApiWrapperBilling(handler);
 * ```
 */
export function withApiWrapperBilling(
  handler: (req: VercelRequest, res: VercelResponse) => Promise<void> | void,
  options?: Partial<BillingMiddlewareOptions>
) {
  return withBilling(handler, {
    operationType: 'API_CALL_ADVANCED',
    description: 'API Wrapper - Content extraction and processing',
    ...options,
  });
}

/**
 * Billing middleware for agent consensus endpoints
 * Cost: 5 CCC (~$1 USD)
 * 
 * @example
 * ```typescript
 * import { withAgentConsensusBilling } from '@/lib/middleware/billingPresets';
 * 
 * export default withAgentConsensusBilling(handler);
 * ```
 */
export function withAgentConsensusBilling(
  handler: (req: VercelRequest, res: VercelResponse) => Promise<void> | void,
  options?: Partial<BillingMiddlewareOptions>
) {
  return withBilling(handler, {
    operationType: 'AGENT_CONSENSUS',
    description: 'Agent Consensus - Byzantine fault-tolerant coordination',
    ...options,
  });
}

/**
 * Billing middleware for basic API calls
 * Cost: 0.1 CCC (~$0.02 USD)
 * 
 * @example
 * ```typescript
 * import { withBasicApiBilling } from '@/lib/middleware/billingPresets';
 * 
 * export default withBasicApiBilling(handler);
 * ```
 */
export function withBasicApiBilling(
  handler: (req: VercelRequest, res: VercelResponse) => Promise<void> | void,
  options?: Partial<BillingMiddlewareOptions>
) {
  return withBilling(handler, {
    operationType: 'API_CALL_BASIC',
    description: 'API Call - Basic operation',
    ...options,
  });
}

/**
 * Billing middleware for citation intelligence
 * Cost: 2 CCC (~$0.40 USD)
 * 
 * @example
 * ```typescript
 * import { withCitationIntelligenceBilling } from '@/lib/middleware/billingPresets';
 * 
 * export default withCitationIntelligenceBilling(handler);
 * ```
 */
export function withCitationIntelligenceBilling(
  handler: (req: VercelRequest, res: VercelResponse) => Promise<void> | void,
  options?: Partial<BillingMiddlewareOptions>
) {
  return withBilling(handler, {
    operationType: 'CITATION_INTELLIGENCE',
    description: 'Citation Intelligence - Predictive recommendations',
    ...options,
  });
}

/**
 * Billing middleware for knowledge graph sync
 * Cost: 10 CCC (~$2 USD)
 * 
 * @example
 * ```typescript
 * import { withKnowledgeGraphBilling } from '@/lib/middleware/billingPresets';
 * 
 * export default withKnowledgeGraphBilling(handler);
 * ```
 */
export function withKnowledgeGraphBilling(
  handler: (req: VercelRequest, res: VercelResponse) => Promise<void> | void,
  options?: Partial<BillingMiddlewareOptions>
) {
  return withBilling(handler, {
    operationType: 'KNOWLEDGE_GRAPH_SYNC',
    description: 'Knowledge Graph Sync - Graph database update',
    ...options,
  });
}

/**
 * Billing middleware for real-time content analysis
 * Cost: 1 CCC (~$0.20 USD)
 * 
 * @example
 * ```typescript
 * import { withContentAnalysisBilling } from '@/lib/middleware/billingPresets';
 * 
 * export default withContentAnalysisBilling(handler);
 * ```
 */
export function withContentAnalysisBilling(
  handler: (req: VercelRequest, res: VercelResponse) => Promise<void> | void,
  options?: Partial<BillingMiddlewareOptions>
) {
  return withBilling(handler, {
    operationType: 'REALTIME_CONTENT_ANALYSIS',
    description: 'Real-time Content Analysis - Live scoring',
    ...options,
  });
}

/**
 * Billing middleware for competitive intelligence
 * Cost: 25 CCC (~$5 USD)
 * 
 * @example
 * ```typescript
 * import { withCompetitiveIntelligenceBilling } from '@/lib/middleware/billingPresets';
 * 
 * export default withCompetitiveIntelligenceBilling(handler);
 * ```
 */
export function withCompetitiveIntelligenceBilling(
  handler: (req: VercelRequest, res: VercelResponse) => Promise<void> | void,
  options?: Partial<BillingMiddlewareOptions>
) {
  return withBilling(handler, {
    operationType: 'COMPETITIVE_INTELLIGENCE',
    description: 'Competitive Intelligence - Market analysis',
    ...options,
  });
}

/**
 * Billing middleware for causal tracer
 * Cost: 15 CCC (~$3 USD)
 * 
 * @example
 * ```typescript
 * import { withCausalTracerBilling } from '@/lib/middleware/billingPresets';
 * 
 * export default withCausalTracerBilling(handler);
 * ```
 */
export function withCausalTracerBilling(
  handler: (req: VercelRequest, res: VercelResponse) => Promise<void> | void,
  options?: Partial<BillingMiddlewareOptions>
) {
  return withBilling(handler, {
    operationType: 'CAUSAL_TRACER',
    description: 'Causal Tracer - Counterfactual simulation',
    ...options,
  });
}

/**
 * Billing middleware for A2A operations
 * Cost: 0.2 CCC (~$0.04 USD)
 * 
 * @example
 * ```typescript
 * import { withA2ABilling } from '@/lib/middleware/billingPresets';
 * 
 * export default withA2ABilling(handler);
 * ```
 */
export function withA2ABilling(
  handler: (req: VercelRequest, res: VercelResponse) => Promise<void> | void,
  options?: Partial<BillingMiddlewareOptions>
) {
  return withBilling(handler, {
    operationType: 'A2A_OPERATION',
    description: 'Agent-to-Agent Protocol - Message processing',
    ...options,
  });
}
