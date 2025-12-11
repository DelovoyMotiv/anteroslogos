/**
 * Library Type Definitions - Production-Grade Type Safety
 * 
 * Comprehensive type system for library modules.
 * Eliminates 'any' types with precise TypeScript definitions.
 * 
 * @module types/lib.types
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { JSONValue, JSONObject } from './common.types';

// =====================================================
// WEBHOOK TYPES
// =====================================================

/**
 * Webhook request handler
 */
export type WebhookHandler = (
  req: VercelRequest,
  res: VercelResponse
) => Promise<void>;

/**
 * Webhook headers
 */
export interface WebhookHeaders {
  'x-webhook-signature'?: string;
  'x-webhook-timestamp'?: string;
  'x-webhook-id'?: string;
  [key: string]: string | undefined;
}

// =====================================================
// VALIDATION TYPES
// =====================================================

/**
 * Request with params (for dynamic routes)
 */
export interface RequestWithParams extends VercelRequest {
  params: Record<string, string>;
}

/**
 * Type guard for request with params
 */
export function isRequestWithParams(req: VercelRequest): req is RequestWithParams {
  return 'params' in req && typeof (req as RequestWithParams).params === 'object';
}

// =====================================================
// TRACING TYPES
// =====================================================

/**
 * Response end arguments
 */
export type ResponseEndArgs = [
  chunk?: unknown,
  encoding?: BufferEncoding | (() => void),
  callback?: () => void
];

// =====================================================
// SUBSCRIPTION TYPES
// =====================================================

/**
 * Subscription plan features
 */
export interface SubscriptionPlanFeatures {
  maxAgents?: number;
  maxApiCalls?: number;
  maxStorage?: number;
  customDomain?: boolean;
  prioritySupport?: boolean;
  advancedAnalytics?: boolean;
  [key: string]: JSONValue | undefined;
}

/**
 * Usage record metadata
 */
export interface UsageRecordMetadata {
  source?: string;
  category?: string;
  description?: string;
  [key: string]: JSONValue | undefined;
}

// =====================================================
// SECURITY TYPES
// =====================================================

/**
 * Mock response for testing
 */
export interface MockResponse extends Partial<VercelResponse> {
  statusCode?: number;
  jsonData?: JSONValue;
  headers?: Record<string, string | string[]>;
}

/**
 * CSRF token response data
 */
export interface CsrfTokenData {
  token: string;
  expiresAt: string;
}

// =====================================================
// RELIABILITY TYPES
// =====================================================

/**
 * External API request body
 */
export type ApiRequestBody = JSONValue;

/**
 * Supabase query result
 */
export interface SupabaseQueryResult<T = JSONValue> {
  data: T | null;
  error: SupabaseError | null;
}

/**
 * Supabase error
 */
export interface SupabaseError {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
}

/**
 * Supabase client interface (minimal)
 */
export interface MinimalSupabaseClient {
  from(table: string): unknown;
  rpc(fn: string, params?: JSONObject): unknown;
  [key: string]: any;
}

/**
 * Database cleanup function
 */
export type DatabaseCleanup = () => Promise<void>;

// =====================================================
// AXIOS TYPES (for client examples)
// =====================================================

/**
 * Axios request config
 */
export interface AxiosRequestConfig {
  method?: string;
  url?: string;
  headers?: Record<string, string>;
  data?: JSONValue;
  params?: Record<string, string>;
  [key: string]: unknown;
}

/**
 * Axios response
 */
export interface AxiosResponse<T = JSONValue> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  config: AxiosRequestConfig;
}

/**
 * Axios error
 */
export interface AxiosError {
  response?: AxiosResponse;
  request?: unknown;
  message: string;
  config?: AxiosRequestConfig;
}

/**
 * Axios interceptor
 */
export interface AxiosInterceptor {
  request: {
    use(
      onFulfilled?: (config: AxiosRequestConfig) => AxiosRequestConfig | Promise<AxiosRequestConfig>,
      onRejected?: (error: AxiosError) => unknown
    ): number;
  };
  response: {
    use(
      onFulfilled?: (response: AxiosResponse) => AxiosResponse | Promise<AxiosResponse>,
      onRejected?: (error: AxiosError) => unknown
    ): number;
  };
}

/**
 * Axios instance
 */
export interface AxiosInstance {
  interceptors: AxiosInterceptor;
  request<T = JSONValue>(config: AxiosRequestConfig): Promise<AxiosResponse<T>>;
  get<T = JSONValue>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
  post<T = JSONValue>(url: string, data?: JSONValue, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
  put<T = JSONValue>(url: string, data?: JSONValue, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
  patch<T = JSONValue>(url: string, data?: JSONValue, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
  delete<T = JSONValue>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
}

// =====================================================
// MIDDLEWARE TYPES
// =====================================================

/**
 * Rate limiter request with user
 */
export interface RequestWithUser extends VercelRequest {
  user?: {
    id: string;
    email?: string;
    [key: string]: unknown;
  };
}

/**
 * Type guard for request with user
 */
export function isRequestWithUser(req: VercelRequest): req is RequestWithUser {
  return 'user' in req && typeof (req as RequestWithUser).user === 'object';
}

/**
 * Metrics response with intercepted methods
 */
export interface MetricsResponse extends VercelResponse {
  json(body: JSONValue): MetricsResponse;
  send(body: JSONValue): MetricsResponse;
}

// =====================================================
// METRICS TYPES
// =====================================================

/**
 * Database query function
 */
export type DatabaseQueryFunction<T = JSONValue> = () => Promise<SupabaseQueryResult<T>>;

/**
 * Payment data
 */
export interface PaymentData {
  amount: number;
  currency?: string;
  customerId?: string;
  metadata?: JSONObject;
}

// =====================================================
// INSIGHTS TYPES
// =====================================================

/**
 * Aggregation job result
 */
export interface AggregationJob {
  id: string;
  tenants?: {
    metadata?: {
      industry?: string;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  result?: {
    overallScore?: number;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

/**
 * Industry aggregation
 */
export interface IndustryAggregation {
  scores: number[];
  tenants: Set<string>;
}

// =====================================================
// INVOICE TYPES
// =====================================================

/**
 * Invoice method parameters
 */
export interface InvoiceMethodParams {
  agentId?: string;
  method: string;
  params: JSONObject; // JSONB in database
}

// =====================================================
// TYPE GUARDS
// =====================================================

/**
 * Type guard for Supabase error
 */
export function isSupabaseError(error: unknown): error is SupabaseError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as SupabaseError).message === 'string'
  );
}

/**
 * Type guard for Axios error
 */
export function isAxiosError(error: unknown): error is AxiosError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    ('response' in error || 'request' in error)
  );
}

// =====================================================
// HELPER TYPES
// =====================================================

/**
 * Async function
 */
export type AsyncFunction<TArgs extends unknown[] = unknown[], TReturn = unknown> = (
  ...args: TArgs
) => Promise<TReturn>;

/**
 * Cleanup function
 */
export type CleanupFunction = () => void | Promise<void>;

/**
 * Error handler
 */
export type ErrorHandler = (error: Error) => void | Promise<void>;

/**
 * Success handler
 */
export type SuccessHandler<T = unknown> = (result: T) => void | Promise<void>;

/**
 * Callback function
 */
export type Callback<T = unknown> = (error: Error | null, result?: T) => void;

/**
 * Predicate function
 */
export type Predicate<T = unknown> = (value: T) => boolean;

/**
 * Transformer function
 */
export type Transformer<TInput = unknown, TOutput = unknown> = (input: TInput) => TOutput;

/**
 * Async transformer function
 */
export type AsyncTransformer<TInput = unknown, TOutput = unknown> = (
  input: TInput
) => Promise<TOutput>;

/**
 * Validator function
 */
export type Validator<T = unknown> = (value: T) => boolean | Promise<boolean>;

/**
 * Serializer function
 */
export type Serializer<T = unknown> = (value: T) => string;

/**
 * Deserializer function
 */
export type Deserializer<T = unknown> = (value: string) => T;

/**
 * Comparator function
 */
export type Comparator<T = unknown> = (a: T, b: T) => number;

/**
 * Mapper function
 */
export type Mapper<TInput = unknown, TOutput = unknown> = (
  value: TInput,
  index: number
) => TOutput;

/**
 * Reducer function
 */
export type Reducer<TValue = unknown, TAccumulator = unknown> = (
  accumulator: TAccumulator,
  value: TValue,
  index: number
) => TAccumulator;

/**
 * Filter function
 */
export type Filter<T = unknown> = (value: T, index: number) => boolean;

/**
 * ForEach function
 */
export type ForEach<T = unknown> = (value: T, index: number) => void;
