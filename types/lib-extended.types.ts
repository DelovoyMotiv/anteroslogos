/**
 * Extended Library Type Definitions - Production-Grade Type Safety
 * 
 * Additional type system for specialized library modules.
 * Eliminates remaining 'any' types with precise TypeScript definitions.
 * 
 * @module types/lib-extended.types
 */

import type { JSONValue, JSONObject } from './common.types';

// =====================================================
// UPSTASH REDIS TYPES
// =====================================================

/**
 * Upstash Redis client interface
 */
export interface UpstashRedisClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, options?: { ex?: number; px?: number }): Promise<'OK'>;
  setex(key: string, seconds: number, value: string): Promise<'OK'>;
  del(...keys: string[]): Promise<number>;
  exists(...keys: string[]): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
  ttl(key: string): Promise<number>;
  keys(pattern: string): Promise<string[]>;
  mget(...keys: string[]): Promise<(string | null)[]>;
  mset(data: Record<string, string>): Promise<'OK'>;
  incr(key: string): Promise<number>;
  decr(key: string): Promise<number>;
  hget(key: string, field: string): Promise<string | null>;
  hset(key: string, field: string, value: string | number): Promise<number>;
  hgetall(key: string): Promise<Record<string, string>>;
  hincrby(key: string, field: string, increment: number): Promise<number>;
  zadd(key: string, score: number, member: string): Promise<number>;
  zrange(key: string, start: number, stop: number): Promise<string[]>;
  pipeline(): UpstashRedisPipeline;
}

/**
 * Upstash Redis pipeline interface
 */
export interface UpstashRedisPipeline {
  get(key: string): this;
  set(key: string, value: string, options?: { ex?: number }): this;
  del(...keys: string[]): this;
  exec(): Promise<unknown[]>;
}

// =====================================================
// CAUSAL TRACER TYPES
// =====================================================

/**
 * Causal graph node
 */
export interface CausalGraphNode {
  id: string;
  type: string;
  label?: string;
  properties?: JSONObject;
  metadata?: JSONObject;
}

/**
 * Causal graph edge
 */
export interface CausalGraphEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  weight?: number;
  properties?: JSONObject;
  metadata?: JSONObject;
}

/**
 * Causal graph structure
 */
export interface CausalGraphInput {
  nodes: CausalGraphNode[];
  edges: CausalGraphEdge[];
  metadata?: {
    url?: string;
    domain?: string;
    timestamp?: string;
    version?: string;
  };
}

/**
 * Causal graph with maps (internal representation)
 */
export interface CausalGraph {
  domain: string;
  nodes: Map<string, CausalGraphNode>;
  edges: Map<string, CausalGraphEdge>;
  nodeCount: number;
  edgeCount: number;
  metadata?: JSONObject;
}

// =====================================================
// AI SYNDICATION TYPES
// =====================================================

/**
 * OpenAI assistant response
 */
export interface OpenAIAssistantResponse {
  data: OpenAIAssistant[];
  object: string;
  first_id?: string;
  last_id?: string;
  has_more: boolean;
}

/**
 * OpenAI assistant
 */
export interface OpenAIAssistant {
  id: string;
  object: string;
  created_at: number;
  name: string;
  description?: string;
  model: string;
  instructions?: string;
  tools?: OpenAITool[];
  file_ids?: string[];
  metadata?: JSONObject;
}

/**
 * OpenAI tool
 */
export interface OpenAITool {
  type: string;
  function?: {
    name: string;
    description?: string;
    parameters?: JSONObject;
  };
}

// =====================================================
// DASHBOARD API TYPES
// =====================================================

/**
 * User profile with subscription info
 */
export interface UserProfileWithSubscription {
  id: string;
  current_plan: 'free' | 'pro' | 'enterprise';
  api_keys_count: number;
  email?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Subscription with details
 */
export interface SubscriptionWithDetails {
  subscription_id: string;
  user_id: string;
  plan: string;
  status: 'active' | 'cancelled' | 'expired';
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
}

// =====================================================
// PAYMENTS TYPES
// =====================================================

/**
 * RPC provider client (minimal interface)
 * Matches viem PublicClient interface
 */
export interface MinimalRpcClient {
  getBlockNumber(): Promise<bigint>;
  getBlock(params: { blockNumber: bigint }): Promise<RpcBlock | null>;
  getTransaction(params: { hash: string }): Promise<RpcTransaction | null>;
  getTransactionReceipt(params: { hash: string }): Promise<RpcTransactionReceipt | null>;
  call(transaction: RpcTransactionRequest): Promise<string>;
  estimateGas(transaction: RpcTransactionRequest): Promise<bigint>;
  sendTransaction(signedTx: string): Promise<string>;
}

/**
 * RPC block
 */
export interface RpcBlock {
  number: bigint;
  hash: string;
  parentHash: string;
  timestamp: bigint;
  transactions: string[];
  miner?: string;
  difficulty?: bigint;
  totalDifficulty?: bigint;
  size?: bigint;
  gasLimit?: bigint;
  gasUsed?: bigint;
}

/**
 * RPC transaction
 */
export interface RpcTransaction {
  hash: string;
  from: string;
  to: string | null;
  value: bigint;
  gas: bigint;
  gasPrice: bigint;
  nonce: number;
  input: string;
  blockNumber?: bigint;
  blockHash?: string;
  transactionIndex?: number;
}

/**
 * RPC transaction receipt
 */
export interface RpcTransactionReceipt {
  transactionHash: string;
  blockNumber: bigint;
  blockHash: string;
  status: 'success' | 'reverted';
  from: string;
  to: string | null;
  gasUsed: bigint;
  cumulativeGasUsed: bigint;
  effectiveGasPrice: bigint;
  logs: RpcLog[];
  logsBloom: string;
  transactionIndex: number;
}

/**
 * RPC log
 */
export interface RpcLog {
  address: string;
  topics: string[];
  data: string;
  blockNumber: bigint;
  transactionHash: string;
  transactionIndex: number;
  blockHash: string;
  logIndex: number;
  removed: boolean;
}

/**
 * RPC transaction request
 */
export interface RpcTransactionRequest {
  from?: string;
  to?: string;
  gas?: string;
  gasPrice?: string;
  value?: string;
  data?: string;
  nonce?: number;
}

// =====================================================
// UAP DISCOVERY TYPES
// =====================================================

/**
 * Mesh router interface (minimal)
 */
export interface MeshRouter {
  dht?: {
    getClosestPeers(key?: string): Promise<MeshPeer[]>;
  };
  announcePeer?(announcement: PeerAnnouncement): Promise<void>;
  queryPeers?(query: PeerQuery): Promise<MeshPeer[]>;
  nodeId?: string;
  metadata?: JSONObject;
}

/**
 * Mesh peer
 */
export interface MeshPeer {
  id: string;
  nodeId: string;
  addresses?: string[];
  protocols?: string[];
  metadata?: JSONObject;
}

/**
 * Peer announcement
 */
export interface PeerAnnouncement {
  nodeId: string;
  capabilities: string[];
  endpoints: string[];
  metadata?: JSONObject;
  timestamp: string;
}

/**
 * Peer query
 */
export interface PeerQuery {
  capability?: string;
  protocol?: string;
  limit?: number;
  metadata?: JSONObject;
}

/**
 * Mesh node
 */
export interface MeshNode {
  nodeId: string;
  addresses: string[];
  protocols: string[];
  capabilities?: string[];
  metadata?: JSONObject;
}

// =====================================================
// TRACING TYPES
// =====================================================

/**
 * A2A message parameters (generic)
 */
export interface A2AMessageParams {
  [key: string]: JSONValue;
}

/**
 * Trace context
 */
export interface TraceContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  sampled: boolean;
  baggage?: Record<string, string>;
}

// =====================================================
// CASCADE STORAGE TYPES
// =====================================================

/**
 * Cascade entry result
 */
export interface CascadeEntryResult {
  key: string;
  value: string | null;
  ttl?: number;
  metadata?: JSONObject;
}

// =====================================================
// TYPE GUARDS
// =====================================================

/**
 * Type guard for UpstashRedisClient
 */
export function isUpstashRedisClient(obj: unknown): obj is UpstashRedisClient {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'get' in obj &&
    'set' in obj &&
    typeof (obj as UpstashRedisClient).get === 'function' &&
    typeof (obj as UpstashRedisClient).set === 'function'
  );
}

/**
 * Type guard for CausalGraphInput
 */
export function isCausalGraphInput(obj: unknown): obj is CausalGraphInput {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'nodes' in obj &&
    'edges' in obj &&
    Array.isArray((obj as CausalGraphInput).nodes) &&
    Array.isArray((obj as CausalGraphInput).edges)
  );
}

/**
 * Type guard for MeshRouter
 */
export function isMeshRouter(obj: unknown): obj is MeshRouter {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    ('dht' in obj || 'announcePeer' in obj || 'queryPeers' in obj)
  );
}

/**
 * Type guard for OpenAIAssistantResponse
 */
export function isOpenAIAssistantResponse(obj: unknown): obj is OpenAIAssistantResponse {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'data' in obj &&
    Array.isArray((obj as OpenAIAssistantResponse).data)
  );
}

/**
 * Type guard for UserProfileWithSubscription
 */
export function isUserProfileWithSubscription(obj: unknown): obj is UserProfileWithSubscription {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'current_plan' in obj &&
    'api_keys_count' in obj &&
    typeof (obj as UserProfileWithSubscription).id === 'string'
  );
}

// =====================================================
// UTILITY TYPES
// =====================================================

/**
 * Redis operation function
 */
export type RedisOperation<T> = (client: UpstashRedisClient) => Promise<T>;

/**
 * RPC operation function
 */
export type RpcOperation<T> = (client: MinimalRpcClient) => Promise<T>;

/**
 * Mesh query function
 */
export type MeshQueryFunction = (router: MeshRouter) => Promise<MeshNode[]>;

/**
 * Peer converter function
 */
export type PeerConverterFunction = (peer: MeshPeer) => MeshNode;

/**
 * Graph processor function
 */
export type GraphProcessorFunction = (graph: CausalGraph) => void;

/**
 * Assistant finder function
 */
export type AssistantFinderFunction = (
  assistants: OpenAIAssistant[],
  name: string
) => OpenAIAssistant | undefined;

/**
 * Subscription validator function
 */
export type SubscriptionValidatorFunction = (
  subscription: SubscriptionWithDetails
) => boolean;

/**
 * Trace wrapper function
 */
export type TraceWrapperFunction<T> = (
  operation: () => Promise<T>,
  context: TraceContext
) => Promise<T>;

/**
 * Cache key generator function
 */
export type CacheKeyGeneratorFunction = (input: JSONObject) => string;

/**
 * TTL calculator function
 */
export type TTLCalculatorFunction = (expiresAt: string | number) => number;
