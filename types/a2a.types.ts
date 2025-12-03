/**
 * A2A Protocol Type Definitions
 * Linux Foundation Agent-to-Agent Protocol v1.0
 * 
 * @module types/a2a.types
 */

import type { JSONValue, JSONObject, Params } from './common.types';
export type { JSONValue, JSONObject, Params };

/**
 * JSON-RPC 2.0 Request
 */
export interface JSONRPCRequest {
  jsonrpc: '2.0';
  method: string;
  params?: Params;
  id: string | number | null;
}

/**
 * JSON-RPC 2.0 Response (Success)
 */
export interface JSONRPCSuccessResponse {
  jsonrpc: '2.0';
  result: JSONValue;
  id: string | number | null;
}

/**
 * JSON-RPC 2.0 Response (Error)
 */
export interface JSONRPCErrorResponse {
  jsonrpc: '2.0';
  error: {
    code: number;
    message: string;
    data?: JSONValue;
  };
  id: string | number | null;
}

/**
 * JSON-RPC 2.0 Response (Union)
 */
export type JSONRPCResponse = JSONRPCSuccessResponse | JSONRPCErrorResponse;

/**
 * Tool parameter schema
 */
export interface ToolParameterSchema {
  type: string;
  description?: string;
  required?: boolean;
  properties?: Record<string, ToolParameterSchema>;
  items?: ToolParameterSchema;
  enum?: JSONValue[];
  default?: JSONValue;
}

/**
 * Tool definition
 */
export interface ToolDefinition {
  name: string;
  description: string;
  params_schema: Record<string, ToolParameterSchema>;
  result_schema: Record<string, ToolParameterSchema>;
}

/**
 * MCP execution result
 */
export interface MCPExecutionResult {
  success: boolean;
  returnValue: JSONValue;
  output: string;
  error?: string;
}

/**
 * MCP sandbox context
 */
export type MCPSandboxContext = Record<string, JSONValue>;

/**
 * Orchestration step result
 */
export interface OrchestrationStepResult {
  stepId: string;
  agentId: string;
  method: string;
  result?: JSONValue;
  error?: {
    code: string;
    message: string;
    details?: JSONValue;
  };
  timestamp: string;
  duration: number;
}

/**
 * WebSocket message
 */
export interface WebSocketMessage {
  type: string;
  data: JSONValue;
  timestamp?: string;
  correlationId?: string;
}

/**
 * Payment extension params
 */
export interface PaymentParams {
  amount: string;
  currency: string;
  recipient: string;
  metadata?: JSONObject;
}

/**
 * Streaming chunk
 */
export interface StreamingChunk {
  type: 'data' | 'error' | 'complete';
  data: JSONValue;
  timestamp: string;
}

/**
 * Agent registration
 */
export interface AgentRegistration {
  agentId: string;
  name: string;
  capabilities: string[];
  endpoint: string;
  publicKey: string;
  metadata: JSONObject;
}

/**
 * Audit job data
 */
export interface AuditJobData {
  url: string;
  userId: string;
  options?: JSONObject;
}

/**
 * Batch job data
 */
export interface BatchJobData {
  jobs: AuditJobData[];
  priority: 'high' | 'normal' | 'low';
}

// =====================================================
// TOOL CALL TYPES (for mcpClient.ts)
// =====================================================

/**
 * Tool call parameters (generic)
 */
export type ToolCallParams = Record<string, JSONValue>;

/**
 * Tool call result
 */
export interface ToolCallResult<T = JSONValue> {
  success: boolean;
  result?: T;
  error?: string;
  executionTimeMs: number;
}

// =====================================================
// MCP ADAPTER TYPES
// =====================================================

/**
 * JSON Schema property definition
 */
export interface JSONSchemaProperty {
  type: string;
  description?: string;
  format?: string;
  enum?: (string | number | boolean)[];
  default?: JSONValue;
  items?: JSONSchemaProperty;
}

/**
 * MCP Tool input schema
 */
export interface MCPToolInputSchema {
  type: 'object';
  properties: Record<string, JSONSchemaProperty>;
  required?: string[];
}

/**
 * MCP Tool output schema
 */
export interface MCPToolOutputSchema {
  type: 'object';
  properties: Record<string, JSONSchemaProperty>;
}

// =====================================================
// CODE EXECUTION TYPES
// =====================================================

/**
 * Code execution context
 */
export type CodeExecutionContext = Record<string, JSONValue>;

/**
 * Code execution result
 */
export interface CodeExecutionResult {
  success: boolean;
  output: JSONValue;
  logs: string[];
  errors: string[];
  tokensUsed: {
    input: number;
    output: number;
    saved: number;
  };
}

// =====================================================
// WEBSOCKET TYPES
// =====================================================

/**
 * WebSocket message metadata
 */
export interface WebSocketMetadata {
  ip_address?: string;
  user_agent?: string;
  connected_at: number;
  [key: string]: JSONValue | undefined;
}

/**
 * Progress event metadata
 */
export interface ProgressMetadata {
  total_steps?: number;
  completed_steps?: number;
  [key: string]: JSONValue | undefined;
}

/**
 * Error event metadata
 */
export interface ErrorMetadata {
  code?: string | number;
  stack?: string;
  [key: string]: JSONValue | undefined;
}

// =====================================================
// LOGGER TYPES
// =====================================================

/**
 * Log context (structured logging)
 */
export interface LogMetadata {
  [key: string]: JSONValue;
}
