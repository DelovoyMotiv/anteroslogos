/**
 * MCP Type Definitions - Production-Grade Type Safety
 * 
 * Eliminates all 'any' types from lib/mcp/ module with precise TypeScript types
 * for sandbox execution, tool schemas, and MCP protocol compliance.
 * 
 * @module types/mcp.types
 */

// =====================================================
// JSON SCHEMA TYPES (Draft 2020-12 compliant)
// =====================================================

/**
 * JSON Schema primitive types
 */
export type JSONSchemaPrimitiveType = 
  | 'string' 
  | 'number' 
  | 'integer'
  | 'boolean' 
  | 'null';

/**
 * JSON Schema complex types
 */
export type JSONSchemaComplexType = 
  | 'object' 
  | 'array';

/**
 * All JSON Schema types
 */
export type JSONSchemaType = 
  | JSONSchemaPrimitiveType 
  | JSONSchemaComplexType;

/**
 * JSON Schema definition (recursive)
 */
export interface JSONSchema {
  type?: JSONSchemaType | JSONSchemaType[];
  description?: string;
  enum?: (string | number | boolean | null)[];
  const?: string | number | boolean | null;
  
  // String validation
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: string;
  
  // Number validation
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number;
  exclusiveMaximum?: number;
  multipleOf?: number;
  
  // Array validation
  items?: JSONSchema | JSONSchema[];
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;
  
  // Object validation
  properties?: Record<string, JSONSchema>;
  required?: string[];
  additionalProperties?: boolean | JSONSchema;
  minProperties?: number;
  maxProperties?: number;
  
  // Composition
  allOf?: JSONSchema[];
  anyOf?: JSONSchema[];
  oneOf?: JSONSchema[];
  not?: JSONSchema;
  
  // Metadata
  title?: string;
  default?: unknown;
  examples?: unknown[];
  deprecated?: boolean;
  readOnly?: boolean;
  writeOnly?: boolean;
  
  // References
  $ref?: string;
  $id?: string;
  $schema?: string;
  $defs?: Record<string, JSONSchema>;
}

// =====================================================
// SANDBOX EXECUTION TYPES
// =====================================================

/**
 * Serializable primitive values
 */
export type SerializablePrimitive = 
  | string 
  | number 
  | boolean 
  | null 
  | undefined;

/**
 * Serializable array
 */
export type SerializableArray = SerializableValue[];

/**
 * Serializable object
 */
export interface SerializableObject {
  [key: string]: SerializableValue;
}

/**
 * Any value that can be safely serialized to JSON
 */
export type SerializableValue = 
  | SerializablePrimitive 
  | SerializableArray 
  | SerializableObject;

/**
 * Execution context metadata
 */
export interface ExecutionMetadata {
  requestId: string;
  agentId?: string;
  userId?: string;
  tenantId?: string;
  timestamp?: number;
  tags?: string[];
  [key: string]: SerializableValue;
}

/**
 * Environment variables for sandbox
 */
export interface SandboxEnvironment {
  [key: string]: string | number | boolean;
}

// =====================================================
// MCP TOOL SCHEMA TYPES
// =====================================================

/**
 * Tool parameter schema (simplified from JSONSchema)
 */
export interface ToolParameterSchema {
  type: JSONSchemaType;
  description: string;
  enum?: (string | number | boolean)[];
  items?: ToolParameterSchema;
  properties?: Record<string, ToolParameterSchema>;
  required?: string[];
  default?: SerializableValue;
  examples?: SerializableValue[];
}

/**
 * Tool input/output example
 */
export interface ToolExample {
  input: SerializableObject;
  output: SerializableValue;
  description?: string;
}

/**
 * Tool return type specification
 */
export interface ToolReturnType {
  type: JSONSchemaType;
  description: string;
  schema?: JSONSchema;
}

/**
 * Tool invocation arguments
 */
export type ToolArguments = Record<string, SerializableValue>;

// =====================================================
// OPENAI FUNCTION CALLING TYPES
// =====================================================

/**
 * OpenAI function parameter schema
 */
export interface OpenAIFunctionParameters {
  type: 'object';
  properties: Record<string, JSONSchema>;
  required?: string[];
  additionalProperties?: boolean;
}

/**
 * OpenAI function definition
 */
export interface OpenAIFunction {
  name: string;
  description: string;
  parameters: OpenAIFunctionParameters;
}

/**
 * OpenAI tool definition (wrapper)
 */
export interface OpenAITool {
  type: 'function';
  function: OpenAIFunction;
}

// =====================================================
// CLAUDE TOOL TYPES
// =====================================================

/**
 * Claude cache control (3.5+ feature)
 */
export interface ClaudeCacheControl {
  type: 'ephemeral';
}

/**
 * Claude input schema
 */
export interface ClaudeInputSchema {
  type: 'object';
  properties: Record<string, JSONSchema>;
  required: string[];
}

/**
 * Claude tool definition
 */
export interface ClaudeTool {
  name: string;
  description: string;
  input_schema: ClaudeInputSchema;
  cache_control?: ClaudeCacheControl;
}

/**
 * Claude tool choice configuration
 */
export type ClaudeToolChoice = 
  | { type: 'auto' }
  | { type: 'any' }
  | { type: 'tool'; name: string };

// =====================================================
// GROK TOOL TYPES
// =====================================================

/**
 * Grok function parameters (similar to OpenAI)
 */
export interface GrokFunctionParameters {
  type: 'object';
  properties: Record<string, JSONSchema>;
  required?: string[];
}

/**
 * Grok function definition with examples
 */
export interface GrokFunction {
  name: string;
  description: string;
  parameters: GrokFunctionParameters;
  examples?: ToolExample[];
}

/**
 * Grok tool definition
 */
export interface GrokTool {
  type: 'function';
  function: GrokFunction;
}

// =====================================================
// OPENAPI TYPES
// =====================================================

/**
 * OpenAPI server configuration
 */
export interface OpenAPIServer {
  url: string;
  description?: string;
  variables?: Record<string, {
    default: string;
    description?: string;
    enum?: string[];
  }>;
}

/**
 * OpenAPI security scheme
 */
export interface OpenAPISecurityScheme {
  type: 'http' | 'apiKey' | 'oauth2' | 'openIdConnect';
  scheme?: string;
  bearerFormat?: string;
  description?: string;
  name?: string;
  in?: 'query' | 'header' | 'cookie';
}

/**
 * OpenAPI request body
 */
export interface OpenAPIRequestBody {
  required?: boolean;
  content: Record<string, {
    schema: JSONSchema;
    examples?: Record<string, {
      value: SerializableValue;
      summary?: string;
      description?: string;
    }>;
  }>;
}

/**
 * OpenAPI response
 */
export interface OpenAPIResponse {
  description: string;
  content?: Record<string, {
    schema: JSONSchema;
    examples?: Record<string, {
      value: SerializableValue;
      summary?: string;
      description?: string;
    }>;
  }>;
  headers?: Record<string, JSONSchema>;
}

/**
 * OpenAPI operation
 */
export interface OpenAPIOperation {
  operationId?: string;
  summary?: string;
  description?: string;
  tags?: string[];
  requestBody?: OpenAPIRequestBody;
  responses: Record<string, OpenAPIResponse>;
  security?: Array<Record<string, string[]>>;
  parameters?: Array<{
    name: string;
    in: 'query' | 'header' | 'path' | 'cookie';
    required?: boolean;
    schema: JSONSchema;
    description?: string;
  }>;
}

/**
 * OpenAPI path item
 */
export interface OpenAPIPathItem {
  get?: OpenAPIOperation;
  post?: OpenAPIOperation;
  put?: OpenAPIOperation;
  delete?: OpenAPIOperation;
  patch?: OpenAPIOperation;
  options?: OpenAPIOperation;
  head?: OpenAPIOperation;
  trace?: OpenAPIOperation;
}

/**
 * OpenAPI specification (3.1.0)
 */
export interface OpenAPISpec {
  openapi: '3.1.0';
  info: {
    title: string;
    version: string;
    description?: string;
    contact?: {
      name?: string;
      url?: string;
      email?: string;
    };
    license?: {
      name: string;
      url?: string;
    };
  };
  servers?: OpenAPIServer[];
  paths: Record<string, OpenAPIPathItem>;
  components?: {
    schemas?: Record<string, JSONSchema>;
    securitySchemes?: Record<string, OpenAPISecurityScheme>;
    responses?: Record<string, OpenAPIResponse>;
    parameters?: Record<string, JSONSchema>;
  };
  tags?: Array<{
    name: string;
    description?: string;
  }>;
  security?: Array<Record<string, string[]>>;
}

// =====================================================
// CONTENT TYPES (MCP Protocol)
// =====================================================

/**
 * Text content
 */
export interface TextContent {
  type: 'text';
  text: string;
}

/**
 * Image content (base64 encoded)
 */
export interface ImageContent {
  type: 'image';
  data: string; // base64
  mimeType?: string;
}

/**
 * MCP content union type
 */
export type MCPContent = TextContent | ImageContent;

// =====================================================
// MESSAGE TYPES (MCP Protocol)
// =====================================================

/**
 * Message role
 */
export type MessageRole = 'user' | 'assistant' | 'system';

/**
 * MCP message
 */
export interface MCPMessage {
  role: MessageRole;
  content: MCPContent[];
  name?: string;
  timestamp?: number;
}

// =====================================================
// STREAMING TYPES
// =====================================================

/**
 * Stream event type
 */
export type StreamEventType = 
  | 'progress' 
  | 'data' 
  | 'complete' 
  | 'error' 
  | 'log';

/**
 * Progress event data
 */
export interface ProgressEventData {
  stage: string;
  progress: number; // 0-100
  message?: string;
}

/**
 * Data event payload
 */
export interface DataEventData {
  output: SerializableValue;
  metrics?: {
    executionTimeMs: number;
    memoryUsedMB: number;
    cpuTimeMs?: number;
  };
  billing?: {
    cost: number;
    computeUnits: number;
    tokenCount?: number;
  };
}

/**
 * Error event data
 */
export interface ErrorEventData {
  error: string;
  code?: string;
  stack?: string;
}

/**
 * Log event data
 */
export interface LogEventData {
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  context?: SerializableObject;
}

/**
 * Complete event data
 */
export interface CompleteEventData {
  success: boolean;
  summary?: string;
}

/**
 * Stream event data union
 */
export type StreamEventData = 
  | ProgressEventData 
  | DataEventData 
  | ErrorEventData 
  | LogEventData
  | CompleteEventData;

// =====================================================
// EXPORT FORMATS
// =====================================================

/**
 * All tool export formats
 */
export interface ToolExportFormats {
  openai: OpenAITool[];
  claude: ClaudeTool[];
  grok: GrokTool[];
  openapi: OpenAPISpec;
}

/**
 * Tool conversion options
 */
export interface ToolConversionOptions {
  enableCache?: boolean;
  cacheType?: 'ephemeral';
  includeExamples?: boolean;
  includeMetadata?: boolean;
}
