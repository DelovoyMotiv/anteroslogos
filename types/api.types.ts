/**
 * API Type Definitions - Production-Grade Type Safety
 * 
 * Comprehensive type system for API endpoints and handlers.
 * Eliminates 'any' types with precise TypeScript definitions.
 * 
 * @module types/api.types
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { JSONValue, JSONObject } from './common.types';

// =====================================================
// VALIDATION TYPES
// =====================================================

/**
 * Validated request body
 */
export interface ValidatedBody<T = JSONObject> {
  body: T;
}

/**
 * Validated request query
 */
export interface ValidatedQuery<T = JSONObject> {
  query: T;
}

/**
 * Validated request (body + query)
 */
export interface ValidatedRequest<TBody = JSONObject, TQuery = JSONObject> {
  body?: TBody;
  query?: TQuery;
}

/**
 * Generic validated data
 */
export type ValidatedData<T = JSONObject> = T | ValidatedBody<T> | ValidatedQuery<T> | ValidatedRequest<T>;

// =====================================================
// HANDLER TYPES
// =====================================================

/**
 * Base API handler without validation
 */
export type ApiHandler = (
  req: VercelRequest,
  res: VercelResponse
) => Promise<void> | void;

/**
 * API handler with validated data
 */
export type ValidatedApiHandler<T = JSONObject> = (
  req: VercelRequest,
  res: VercelResponse,
  validated: T
) => Promise<void> | void;

/**
 * API handler with optional validated data
 */
export type OptionalValidatedApiHandler<T = JSONObject> = (
  req: VercelRequest,
  res: VercelResponse,
  validated?: T
) => Promise<void | VercelResponse> | void | VercelResponse;

/**
 * Typed API handler (generic)
 */
export type TypedApiHandler<TValidated = JSONObject, TResponse = JSONValue> = (
  req: VercelRequest,
  res: VercelResponse,
  validated?: TValidated
) => Promise<TResponse | void> | TResponse | void;

// =====================================================
// MIDDLEWARE TYPES
// =====================================================

/**
 * Middleware function
 */
export type Middleware = (
  req: VercelRequest,
  res: VercelResponse,
  next: () => void | Promise<void>
) => void | Promise<void>;

/**
 * Middleware with handler
 */
export type MiddlewareWithHandler<T = JSONObject> = (
  handler: ValidatedApiHandler<T>
) => ApiHandler;

/**
 * Composed middleware result
 */
export type ComposedHandler = ApiHandler;

// =====================================================
// HANDSHAKE API TYPES
// =====================================================

/**
 * Handshake request body
 */
export interface HandshakeRequestBody {
  agentId: string;
  publicKey: string;
  capabilities?: string[];
  metadata?: JSONObject;
}

/**
 * Handshake response
 */
export interface HandshakeResponse {
  success: boolean;
  sessionId?: string;
  serverPublicKey?: string;
  expiresAt?: string;
  error?: string;
}

/**
 * Handshake validated data
 */
export type HandshakeValidated = ValidatedBody<HandshakeRequestBody>;

// =====================================================
// CHALLENGE API TYPES
// =====================================================

/**
 * Challenge request body
 */
export interface ChallengeRequestBody {
  agentId: string;
  response?: string;
}

/**
 * Challenge request query
 */
export interface ChallengeRequestQuery {
  agentId?: string;
}

/**
 * Challenge response
 */
export interface ChallengeResponse {
  success: boolean;
  challenge?: string;
  verified?: boolean;
  error?: string;
}

/**
 * Challenge validated data
 */
export type ChallengeValidated = ValidatedRequest<ChallengeRequestBody, ChallengeRequestQuery>;

// =====================================================
// MCP API TYPES
// =====================================================

/**
 * MCP tool call request
 */
export interface McpToolCallRequest {
  method: string;
  params: JSONObject;
  caller?: {
    type: string;
    id?: string;
  };
}

/**
 * MCP tool call response
 */
export interface McpToolCallResponse {
  success: boolean;
  result?: JSONValue;
  error?: string;
}

/**
 * MCP programmatic request body
 */
export interface McpProgrammaticRequestBody {
  tool: string;
  arguments: JSONObject;
  caller?: {
    type: string;
    id?: string;
  };
}

/**
 * MCP programmatic validated data
 */
export type McpProgrammaticValidated = ValidatedBody<McpProgrammaticRequestBody>;

// =====================================================
// PUBLIC AID API TYPES
// =====================================================

/**
 * Public AID request body
 */
export interface PublicAidRequestBody {
  domain: string;
  metadata?: JSONObject;
}

/**
 * Public AID response
 */
export interface PublicAidResponse {
  success: boolean;
  aid?: string;
  publicKey?: string;
  error?: string;
}

/**
 * Public AID validated data
 */
export type PublicAidValidated = ValidatedBody<PublicAidRequestBody | undefined>;

// =====================================================
// TENANT API TYPES
// =====================================================

/**
 * Tenant creation request
 */
export interface TenantCreateRequest {
  name: string;
  domain?: string;
  settings?: JSONObject;
  metadata?: JSONObject;
}

/**
 * Tenant update request
 */
export interface TenantUpdateRequest {
  name?: string;
  domain?: string;
  settings?: JSONObject;
  metadata?: JSONObject;
  active?: boolean;
}

/**
 * Tenant response
 */
export interface TenantResponse {
  id: string;
  name: string;
  domain?: string;
  settings: JSONObject;
  metadata: JSONObject;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Tenant validated data
 */
export type TenantValidated = ValidatedRequest<TenantCreateRequest | TenantUpdateRequest>;

// =====================================================
// SUBSCRIPTION API TYPES
// =====================================================

/**
 * Subscription creation request
 */
export interface SubscriptionCreateRequest {
  tenantId: string;
  planId: string;
  billingCycle: 'monthly' | 'yearly';
  metadata?: JSONObject;
}

/**
 * Subscription update request
 */
export interface SubscriptionUpdateRequest {
  planId?: string;
  billingCycle?: 'monthly' | 'yearly';
  status?: 'active' | 'cancelled' | 'suspended';
  metadata?: JSONObject;
}

/**
 * Subscription response
 */
export interface SubscriptionResponse {
  id: string;
  tenantId: string;
  planId: string;
  billingCycle: string;
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  metadata: JSONObject;
  createdAt: string;
  updatedAt: string;
}

/**
 * Subscription validated data
 */
export type SubscriptionValidated = ValidatedRequest<SubscriptionCreateRequest | SubscriptionUpdateRequest>;

// =====================================================
// API KEY TYPES
// =====================================================

/**
 * API key creation request
 */
export interface ApiKeyCreateRequest {
  name: string;
  scopes: string[];
  expiresAt?: string;
  metadata?: JSONObject;
}

/**
 * API key update request
 */
export interface ApiKeyUpdateRequest {
  name?: string;
  scopes?: string[];
  active?: boolean;
  metadata?: JSONObject;
}

/**
 * API key response
 */
export interface ApiKeyResponse {
  id: string;
  name: string;
  key?: string; // Only returned on creation
  scopes: string[];
  active: boolean;
  expiresAt?: string;
  metadata: JSONObject;
  createdAt: string;
  updatedAt: string;
}

/**
 * API key validated data
 */
export type ApiKeyValidated = ValidatedRequest<ApiKeyCreateRequest | ApiKeyUpdateRequest>;

// =====================================================
// AGENT KEY TYPES
// =====================================================

/**
 * Agent key creation request
 */
export interface AgentKeyCreateRequest {
  agentId: string;
  publicKey: string;
  capabilities: string[];
  metadata?: JSONObject;
}

/**
 * Agent key update request
 */
export interface AgentKeyUpdateRequest {
  capabilities?: string[];
  active?: boolean;
  metadata?: JSONObject;
}

/**
 * Agent key response
 */
export interface AgentKeyResponse {
  id: string;
  agentId: string;
  publicKey: string;
  capabilities: string[];
  active: boolean;
  metadata: JSONObject;
  createdAt: string;
  updatedAt: string;
}

/**
 * Agent key validated data
 */
export type AgentKeyValidated = ValidatedRequest<AgentKeyCreateRequest | AgentKeyUpdateRequest>;

// =====================================================
// AID REGISTRY TYPES
// =====================================================

/**
 * AID registration request
 */
export interface AidRegistrationRequest {
  aid: string;
  domain: string;
  publicKey: string;
  protocols: string[];
  metadata?: JSONObject;
}

/**
 * AID registration update request
 */
export interface AidRegistrationUpdateRequest {
  publicKey?: string;
  protocols?: string[];
  active?: boolean;
  metadata?: JSONObject;
}

/**
 * AID registration response
 */
export interface AidRegistrationResponse {
  id: string;
  aid: string;
  domain: string;
  publicKey: string;
  protocols: string[];
  active: boolean;
  metadata: JSONObject;
  createdAt: string;
  updatedAt: string;
}

/**
 * AID registry validated data
 */
export type AidRegistryValidated = ValidatedRequest<AidRegistrationRequest | AidRegistrationUpdateRequest>;

// =====================================================
// AUDIT TRAIL TYPES
// =====================================================

/**
 * Audit trail entry
 */
export interface AuditTrailEntry {
  id: string;
  tenantId: string;
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  metadata: JSONObject;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
}

/**
 * Audit trail query
 */
export interface AuditTrailQuery {
  tenantId?: string;
  userId?: string;
  action?: string;
  resource?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

/**
 * Audit trail validated data
 */
export type AuditTrailValidated = ValidatedRequest<never, AuditTrailQuery>;

// =====================================================
// CSRF TYPES
// =====================================================

/**
 * CSRF token response
 */
export interface CsrfTokenResponse {
  token: string;
  expiresAt: string;
}

// =====================================================
// A2A TYPES
// =====================================================

/**
 * A2A message request
 */
export interface A2aMessageRequest {
  from: string;
  to: string;
  type: string;
  payload: JSONObject;
  signature?: string;
}

/**
 * A2A message response
 */
export interface A2aMessageResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * A2A validated data
 */
export type A2aValidated = ValidatedBody<A2aMessageRequest>;

// =====================================================
// ROUTER TYPES
// =====================================================

/**
 * Router with initialization state
 */
export interface InitializableRouter {
  initialized: boolean;
  initialize(): Promise<void>;
  [key: string]: unknown;
}

/**
 * Type guard for initializable router
 */
export function isInitializableRouter(obj: unknown): obj is InitializableRouter {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'initialized' in obj &&
    typeof (obj as InitializableRouter).initialize === 'function'
  );
}

// =====================================================
// WEB VITALS TYPES
// =====================================================

/**
 * Web vitals metric
 */
export interface WebVitalsMetric {
  id: string;
  name: 'CLS' | 'FCP' | 'INP' | 'LCP' | 'TTFB';
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  entries: PerformanceEntry[];
  navigationType: 'navigate' | 'reload' | 'back-forward' | 'prerender';
}

/**
 * Web vitals callback
 */
export type WebVitalsCallback = (metric: WebVitalsMetric) => void;

// =====================================================
// RESPONSE HELPERS
// =====================================================

/**
 * Success response
 */
export interface SuccessResponse<T = JSONValue> {
  success: true;
  data: T;
  metadata?: JSONObject;
}

/**
 * Error response
 */
export interface ErrorResponse {
  success: false;
  error: string;
  code?: string;
  details?: JSONObject;
}

/**
 * API response (success or error)
 */
export type ApiResponse<T = JSONValue> = SuccessResponse<T> | ErrorResponse;

/**
 * Paginated response
 */
export interface PaginatedResponse<T = JSONValue> {
  success: true;
  data: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

// =====================================================
// TYPE GUARDS
// =====================================================

/**
 * Type guard for success response
 */
export function isSuccessResponse<T = JSONValue>(
  response: ApiResponse<T>
): response is SuccessResponse<T> {
  return response.success === true;
}

/**
 * Type guard for error response
 */
export function isErrorResponse(response: ApiResponse): response is ErrorResponse {
  return response.success === false;
}

/**
 * Type guard for validated body
 */
export function isValidatedBody<T = JSONObject>(
  validated: unknown
): validated is ValidatedBody<T> {
  return (
    typeof validated === 'object' &&
    validated !== null &&
    'body' in validated
  );
}

/**
 * Type guard for validated query
 */
export function isValidatedQuery<T = JSONObject>(
  validated: unknown
): validated is ValidatedQuery<T> {
  return (
    typeof validated === 'object' &&
    validated !== null &&
    'query' in validated
  );
}

// =====================================================
// HELPER TYPES
// =====================================================

/**
 * HTTP methods
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS' | 'HEAD';

/**
 * HTTP status codes
 */
export type HttpStatusCode = 200 | 201 | 204 | 400 | 401 | 403 | 404 | 405 | 409 | 422 | 429 | 500 | 502 | 503;

/**
 * Content types
 */
export type ContentType = 
  | 'application/json'
  | 'application/x-www-form-urlencoded'
  | 'multipart/form-data'
  | 'text/plain'
  | 'text/html';

/**
 * API endpoint configuration
 */
export interface ApiEndpointConfig {
  path: string;
  methods: HttpMethod[];
  requiresAuth?: boolean;
  requiresTenant?: boolean;
  rateLimit?: {
    requests: number;
    window: number;
  };
  validation?: {
    body?: unknown;
    query?: unknown;
  };
}

/**
 * API error codes
 */
export enum ApiErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
}
