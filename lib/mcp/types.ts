/**
 * MCP Strict Type Definitions
 * Enterprise-grade type safety for MCP Sandbox v2
 */

// =====================================================
// TOOL PARAMETER TYPES
// =====================================================

export type ToolParameterValue = 
  | string
  | number
  | boolean
  | string[]
  | Record<string, string | number | boolean>;

export type ToolParameters = Record<string, ToolParameterValue>;

// =====================================================
// GRAPH NODE & EDGE TYPES
// =====================================================

export type NodeType = 
  | 'authority'
  | 'structured_data'
  | 'content_quality'
  | 'eeat_signal'
  | 'citation_decision'
  | 'entity'
  | 'claim'
  | 'source';

export interface GraphNode {
  id: string;
  type: NodeType;
  label: string;
  weight: number;
  metadata: {
    score?: number;
    source?: string;
    query?: string;
    platform?: string;
    [key: string]: string | number | boolean | undefined;
  };
}

export type EdgeType =
  | 'enhances'
  | 'validates'
  | 'influences'
  | 'supports'
  | 'relates_to'
  | 'cites';

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: EdgeType;
  weight: number;
}

export interface CausalGraph {
  id: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  metadata: {
    url: string;
    query: string;
    created: string;
    [key: string]: string | number | boolean;
  };
}

// =====================================================
// TOOL EXECUTION TYPES
// =====================================================

export interface ToolExecutionContext {
  requestId: string;
  agentId: string;
  apiKey?: string;
  tier?: string;
}

export interface ToolExecutionResult<T = unknown> {
  success: true;
  result: T;
  metadata: {
    executionTimeMs: number;
    billing?: {
      cost: number;
      computeUnits: number;
    };
  };
}

export interface ToolExecutionError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  metadata: {
    executionTimeMs: number;
  };
}

export type ToolExecutionResponse<T = unknown> = 
  | ToolExecutionResult<T>
  | ToolExecutionError;

// =====================================================
// AUDIT TYPES
// =====================================================

export interface AuditScores {
  schemaMarkup: number;
  metaTags: number;
  aiCrawlers: number;
  eeat: number;
  contentQuality: number;
  citationPotential: number;
  technicalSeo: number;
}

export interface AuditResult {
  url: string;
  overallScore: number;
  grade: string;
  scores: AuditScores;
}

// =====================================================
// CAUSAL TRACE TYPES
// =====================================================

export interface CausalPath {
  nodes: string[];
  score: number;
  causalStrength: number;
  criticalNodes: string[];
}

export interface CitationTrace {
  paths: CausalPath[];
  overallProbability: number;
  confidenceLevel: 'low' | 'medium' | 'high';
}

export interface KeyFactor {
  factor: string;
  impact: number;
  evidence: string;
}

export interface CompetitivePosition {
  position: 'leader' | 'challenger' | 'follower';
  advantage?: number;
}

export interface NearMiss {
  competitorUrl: string;
  scoreGap: number;
}

export interface CitationExplanation {
  reasonChosen: string;
  keyFactors: KeyFactor[];
  platformBias: string;
  competitivePosition: CompetitivePosition;
  nearMisses: NearMiss[];
}

export interface CausalCitationTraceResult {
  url: string;
  query: string;
  platform: string;
  trace: CitationTrace;
  explanation: CitationExplanation;
  metadata: {
    graphNodes: number;
    graphEdges: number;
    processingTimeMs: number;
  };
}

// =====================================================
// KNOWLEDGE GRAPH TYPES
// =====================================================

export interface KnowledgeGraphEntity {
  id: string;
  type: string;
  name: string;
  confidence: number;
  properties?: Record<string, string | number | boolean>;
}

export interface KnowledgeGraphRelationship {
  source: string;
  target: string;
  type: string;
  confidence: number;
}

export interface KnowledgeGraphClaim {
  statement: string;
  confidence: number;
  evidence: Array<{
    type: string;
    source: string;
    url?: string;
  }>;
}

export interface KnowledgeGraph {
  id: string;
  domain: string;
  entities: KnowledgeGraphEntity[];
  relationships: KnowledgeGraphRelationship[];
  claims: KnowledgeGraphClaim[];
  metadata: {
    created: string;
    sourceUrl: string;
    [key: string]: string | number | boolean;
  };
}

// =====================================================
// PREDICTIVE SYNTHESIS TYPES
// =====================================================

export interface ContentRecommendation {
  type: 'schema_addition' | 'content_gap' | 'eeat_enhancement';
  schema?: string;
  topic?: string;
  action?: string;
  impact: string;
  effort: 'quick-win' | 'moderate' | 'complex';
  priority: number;
}

export interface PredictiveSynthesisResult {
  url: string;
  currentScore: number;
  targetScore: number;
  targetIncrease: number;
  recommendedChanges: ContentRecommendation[];
  totalPredictedIncrease: number;
  confidence: number;
  timelineEstimate: string;
}

// =====================================================
// AUTHORITY PROOF TYPES
// =====================================================

export interface AuthorityProofResult {
  proof: string;
  authorityScore: number | 'hidden';
  participatesInNetwork: boolean;
  verifiable: boolean;
  expiresAt: string;
  networkNodes: number;
  verificationUrl: string;
}
