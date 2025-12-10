/**
 * Cost Center Configuration
 * Centralized definition of all operation costs in CCC (Causal Contribution Credits)
 * 
 * This configuration serves as the single source of truth for pricing across the platform.
 * All billable operations must reference costs from this file to ensure consistency.
 * 
 * Pricing Philosophy:
 * - 100 CCC ≈ $20 USD (anchor price: $0.20 per CCC)
 * - Costs are designed to align with computational resources and value delivered
 * - Higher-value operations (GEO audits, consensus) cost more than simple API calls
 * 
 * @see Requirements 5.1, 5.2, 5.5
 */

/**
 * Operation cost configuration object
 * All costs are in CCC (Causal Contribution Credits)
 */
export const OPERATION_COSTS = {
  /**
   * GEO Audit - Comprehensive generative engine optimization analysis
   * Cost: 50 CCC (~$10 USD)
   * Includes: Full site crawl, AI visibility scoring, competitive analysis, recommendations
   */
  GEO_AUDIT: 50,

  /**
   * Basic API Call - Simple read operations, lightweight queries
   * Cost: 0.1 CCC (~$0.02 USD)
   * Examples: Get balance, fetch transaction history, read user profile
   */
  API_CALL_BASIC: 0.1,

  /**
   * Advanced API Call - Complex operations, data processing, AI inference
   * Cost: 0.5 CCC (~$0.10 USD)
   * Examples: Content analysis, NLP processing, citation prediction
   */
  API_CALL_ADVANCED: 0.5,

  /**
   * Agent Consensus - Byzantine fault-tolerant consensus operation
   * Cost: 5 CCC (~$1 USD)
   * Includes: Multi-agent coordination, PBFT consensus, reputation scoring
   */
  AGENT_CONSENSUS: 5,

  /**
   * Knowledge Graph Sync - Update knowledge graph with new data
   * Cost: 10 CCC (~$2 USD)
   * Includes: Graph database updates, relationship inference, entity resolution
   */
  KNOWLEDGE_GRAPH_SYNC: 10,

  /**
   * Citation Intelligence Analysis - Predictive citation recommendations
   * Cost: 2 CCC (~$0.40 USD)
   * Includes: Authority gap analysis, citation prediction, content optimization
   */
  CITATION_INTELLIGENCE: 2,

  /**
   * Real-time Content Analysis - Live content scoring and feedback
   * Cost: 1 CCC (~$0.20 USD)
   * Includes: NLP analysis, readability scoring, SEO recommendations
   */
  REALTIME_CONTENT_ANALYSIS: 1,

  /**
   * Competitive Intelligence Report - Market analysis and competitor tracking
   * Cost: 25 CCC (~$5 USD)
   * Includes: Multi-site analysis, trend detection, strategic recommendations
   */
  COMPETITIVE_INTELLIGENCE: 25,

  /**
   * Causal Tracer Analysis - Counterfactual simulation and path finding
   * Cost: 15 CCC (~$3 USD)
   * Includes: Decision tree analysis, counterfactual generation, impact assessment
   */
  CAUSAL_TRACER: 15,

  /**
   * Agent-to-Agent Protocol Operation - A2A message processing
   * Cost: 0.2 CCC (~$0.04 USD)
   * Includes: Message routing, protocol validation, session management
   */
  A2A_OPERATION: 0.2,
} as const;

/**
 * Type representing all valid operation types
 * Ensures type safety when referencing operations
 */
export type OperationType = keyof typeof OPERATION_COSTS;

/**
 * Get the cost for a specific operation
 * 
 * This function provides centralized cost lookups with type safety.
 * All billing operations should use this function rather than accessing
 * OPERATION_COSTS directly to ensure consistency.
 * 
 * @param operation - The operation type to get the cost for
 * @returns The cost in CCC for the specified operation
 * @throws Error if operation type is invalid (TypeScript prevents this at compile time)
 * 
 * @example
 * ```typescript
 * const auditCost = getOperationCost('GEO_AUDIT'); // Returns 50
 * const apiCost = getOperationCost('API_CALL_BASIC'); // Returns 0.1
 * ```
 * 
 * @see Requirements 5.2 - Centralized cost configuration
 */
export function getOperationCost(operation: OperationType): number {
  return OPERATION_COSTS[operation];
}

/**
 * Get metadata about an operation including cost and description
 * Useful for displaying operation details to users
 * 
 * @param operation - The operation type to get metadata for
 * @returns Object containing cost and human-readable description
 * 
 * @example
 * ```typescript
 * const metadata = getOperationMetadata('GEO_AUDIT');
 * // Returns: { cost: 50, description: 'GEO Audit - Comprehensive analysis', usdEquivalent: 10 }
 * ```
 */
export function getOperationMetadata(operation: OperationType): {
  cost: number;
  description: string;
  usdEquivalent: number;
} {
  const cost = OPERATION_COSTS[operation];
  const usdEquivalent = cost * 0.2; // Anchor price: $0.20 per CCC

  const descriptions: Record<OperationType, string> = {
    GEO_AUDIT: 'GEO Audit - Comprehensive generative engine optimization analysis',
    API_CALL_BASIC: 'Basic API Call - Simple read operations',
    API_CALL_ADVANCED: 'Advanced API Call - Complex operations and AI inference',
    AGENT_CONSENSUS: 'Agent Consensus - Byzantine fault-tolerant coordination',
    KNOWLEDGE_GRAPH_SYNC: 'Knowledge Graph Sync - Graph database updates',
    CITATION_INTELLIGENCE: 'Citation Intelligence - Predictive recommendations',
    REALTIME_CONTENT_ANALYSIS: 'Real-time Content Analysis - Live scoring and feedback',
    COMPETITIVE_INTELLIGENCE: 'Competitive Intelligence - Market analysis report',
    CAUSAL_TRACER: 'Causal Tracer - Counterfactual simulation',
    A2A_OPERATION: 'Agent-to-Agent Protocol - Message processing',
  };

  return {
    cost,
    description: descriptions[operation],
    usdEquivalent,
  };
}

/**
 * Get all operation costs as an array for display purposes
 * Useful for pricing pages, documentation, and admin dashboards
 * 
 * @returns Array of operation metadata objects
 */
export function getAllOperationCosts(): Array<{
  operation: OperationType;
  cost: number;
  description: string;
  usdEquivalent: number;
}> {
  return (Object.keys(OPERATION_COSTS) as OperationType[]).map((operation) => ({
    operation,
    ...getOperationMetadata(operation),
  }));
}

/**
 * Validate that an operation type is valid
 * Runtime validation for dynamic operation types
 * 
 * @param operation - The operation string to validate
 * @returns True if the operation is valid, false otherwise
 */
export function isValidOperationType(operation: string): operation is OperationType {
  return operation in OPERATION_COSTS;
}
