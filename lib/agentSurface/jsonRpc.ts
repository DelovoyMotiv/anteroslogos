/**
 * Shared JSON-RPC 2.0 dispatcher for the agent surface.
 *
 * This module is the transport foundation shared by both the A2A gateway
 * (`/api/a2a`) and the MCP server (`/api/mcp`). It is intentionally pure and
 * dependency-light: it only handles envelope validation, method dispatch, id
 * echoing, and error classification. All business logic lives in the handlers
 * that callers register.
 *
 * Error codes mirror `A2AErrorCode` in `lib/a2a/protocol.ts`:
 *   -32700 parse error, -32600 invalid request, -32601 method not found,
 *   -32602 invalid params, -32603 internal error.
 *
 * Feature: agent-surface-truth (Requirements 2.1, 2.7, 2.8)
 */

// =====================================================
// ERROR CODES (JSON-RPC 2.0 standard subset)
// =====================================================

/** Standard JSON-RPC 2.0 error codes used by the dispatcher. */
export const JsonRpcErrorCode = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
} as const;

export type JsonRpcErrorCodeValue =
  (typeof JsonRpcErrorCode)[keyof typeof JsonRpcErrorCode];

// =====================================================
// TYPES
// =====================================================

/** JSON-RPC 2.0 request envelope. */
export interface JsonRpcRequest {
  jsonrpc: '2.0';
  method: string;
  params?: unknown;
  id?: string | number | null;
}

/** JSON-RPC 2.0 error object. */
export interface JsonRpcError {
  code: number;
  message: string;
  data?: unknown;
}

/**
 * JSON-RPC 2.0 response envelope.
 *
 * Exactly one of `result` or `error` is present on any response produced by
 * this module.
 */
export interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: string | number | null;
  result?: unknown;
  error?: JsonRpcError;
}

/**
 * Per-request context threaded to every handler. Kept transport-agnostic so
 * both A2A and MCP endpoints can populate the fields they have. All fields are
 * optional so the dispatcher itself stays free of transport assumptions.
 */
export interface RpcContext {
  /** Stable request identifier for logging/tracing. */
  requestId?: string;
  /** Which surface is invoking the dispatcher. */
  transport?: 'a2a' | 'mcp' | string;
  /** ISO timestamp for when the request was received. */
  timestamp?: string;
  /** Caller identity / API key tier, when known. */
  tier?: string;
  /** Detected agent user-agent string, when available. */
  userAgent?: string;
  /** Caller IP address, when available. */
  ipAddress?: string;
  /** Escape hatch for endpoint-specific context values. */
  [key: string]: unknown;
}

/** A registered method implementation. */
export type MethodHandler = (
  params: unknown,
  ctx: RpcContext
) => Promise<unknown>;

// =====================================================
// HELPERS
// =====================================================

const MAX_ERROR_MESSAGE_LENGTH = 200;

/** Type guard for plain, non-null objects. */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Normalize a request id to the JSON-RPC contract: a string, number, or null.
 * Anything else (including `undefined`) collapses to `null`.
 */
function normalizeId(id: unknown): string | number | null {
  if (typeof id === 'string' || typeof id === 'number') {
    return id;
  }
  return null;
}

/**
 * Produce a sanitized, caller-safe message for an internal error. Never
 * includes stack traces, environment values, or key material — only a short,
 * truncated summary suitable for an agent to read.
 */
function sanitizeInternalErrorMessage(error: unknown): string {
  let raw: string;
  if (error instanceof Error && typeof error.message === 'string') {
    raw = error.message;
  } else if (typeof error === 'string') {
    raw = error;
  } else {
    return 'Internal error';
  }

  // Collapse whitespace/newlines so no stack-like multi-line content leaks.
  const singleLine = raw.replace(/\s+/g, ' ').trim();
  if (singleLine.length === 0) {
    return 'Internal error';
  }
  if (singleLine.length <= MAX_ERROR_MESSAGE_LENGTH) {
    return singleLine;
  }
  return `${singleLine.slice(0, MAX_ERROR_MESSAGE_LENGTH)}…`;
}

/** Build a well-formed success response. */
export function createSuccessResponse(
  id: string | number | null,
  result: unknown
): JsonRpcResponse {
  return { jsonrpc: '2.0', id, result };
}

/** Build a well-formed error response. */
export function createErrorResponse(
  id: string | number | null,
  code: number,
  message: string,
  data?: unknown
): JsonRpcResponse {
  const error: JsonRpcError = { code, message };
  if (data !== undefined) {
    error.data = data;
  }
  return { jsonrpc: '2.0', id, error };
}

// =====================================================
// PUBLIC API
// =====================================================

/**
 * Validate a JSON-RPC 2.0 request envelope.
 *
 * Returns a `-32600` (invalid request) error response when the body is
 * missing, not an object, lacks `jsonrpc === '2.0'`, or lacks a string
 * `method`. Returns `null` when the envelope is valid.
 *
 * The returned error response echoes the request id when one is present and
 * usable (string/number), defaulting to `null` otherwise.
 *
 * Validates: Requirements 2.8
 */
export function validateEnvelope(body: unknown): JsonRpcResponse | null {
  const id = isPlainObject(body) ? normalizeId(body.id) : null;

  if (!isPlainObject(body)) {
    return createErrorResponse(
      id,
      JsonRpcErrorCode.INVALID_REQUEST,
      'Invalid Request: body must be a JSON-RPC 2.0 object'
    );
  }

  if (body.jsonrpc !== '2.0') {
    return createErrorResponse(
      id,
      JsonRpcErrorCode.INVALID_REQUEST,
      "Invalid Request: 'jsonrpc' must be '2.0'"
    );
  }

  if (typeof body.method !== 'string' || body.method.length === 0) {
    return createErrorResponse(
      id,
      JsonRpcErrorCode.INVALID_REQUEST,
      "Invalid Request: 'method' must be a non-empty string"
    );
  }

  return null;
}

/**
 * Dispatch a validated JSON-RPC request to the matching handler.
 *
 * - Unknown methods produce a `-32601` (method not found) error response.
 * - Handler throws are caught and converted to `-32603` (internal error) with
 *   a sanitized message (no stack traces, no secrets).
 * - Every response carries `jsonrpc: '2.0'`, echoes the request id (defaulting
 *   to `null` when absent), and contains exactly one of `result` or `error`.
 *
 * Validates: Requirements 2.1, 2.7
 */
export async function dispatch(
  req: JsonRpcRequest,
  handlers: Record<string, MethodHandler>,
  ctx: RpcContext
): Promise<JsonRpcResponse> {
  const id = normalizeId(req?.id);

  const handler =
    req && typeof req.method === 'string'
      ? handlers[req.method]
      : undefined;

  if (typeof handler !== 'function') {
    return createErrorResponse(
      id,
      JsonRpcErrorCode.METHOD_NOT_FOUND,
      `Method not found: ${req?.method ?? 'unknown'}`
    );
  }

  try {
    const result = await handler(req.params, ctx);
    return createSuccessResponse(id, result);
  } catch (error) {
    return createErrorResponse(
      id,
      JsonRpcErrorCode.INTERNAL_ERROR,
      sanitizeInternalErrorMessage(error)
    );
  }
}
