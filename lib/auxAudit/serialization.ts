/**
 * AUX Audit Serialization and Validation Utilities
 * 
 * Provides JSON schema validation for API requests and responses
 * 
 * Requirements:
 * - 15.1: Consistent JSON schema for encoding audit results
 * - 15.2: Schema validation for decoding JSON requests
 * - 15.3: Serialize all audit results
 * - 15.4: Return 500 error on serialization failure
 * - 15.5: Standard JSON parser compatibility
 */

import { z } from 'zod';
import type {
  AUXAuditRequest,
  AUXAuditResults,
  AUXAuditError,
} from './types';

// ============================================================================
// Zod Schemas for Runtime Validation
// ============================================================================

/**
 * Schema for Classification enum
 */
const ClassificationSchema = z.enum(['Agent-Blind', 'Agent-Capable', 'Agent-Ready']);

/**
 * Schema for RiskLevel enum
 */
const RiskLevelSchema = z.enum(['low', 'medium', 'high']);

/**
 * Schema for Priority enum
 */
const PrioritySchema = z.enum(['low', 'medium', 'high']);

/**
 * Schema for Confidence enum
 */
const ConfidenceSchema = z.enum(['low', 'medium', 'high']);

/**
 * Schema for Severity enum
 */
const SeveritySchema = z.enum(['low', 'medium', 'high']);

/**
 * Schema for FrictionType enum
 */
const FrictionTypeSchema = z.enum(['captcha', 'interstitial', 'canvas', 'auth-wall', 'other']);

/**
 * Schema for ErrorCode enum
 */
const ErrorCodeSchema = z.enum([
  'INVALID_URL',
  'TIMEOUT',
  'FETCH_FAILED',
  'PARSE_ERROR',
  'LLM_ERROR',
  'RATE_LIMIT_EXCEEDED',
  'SERIALIZATION_ERROR',
  'INTERNAL_ERROR',
]);

/**
 * Schema for ProtocolStatus
 */
const ProtocolStatusSchema = z.object({
  name: z.string(),
  available: z.boolean(),
  url: z.string().url(),
  content: z.any().optional(),
});

/**
 * Schema for InteractiveElement
 */
const InteractiveElementSchema = z.object({
  tag: z.string(),
  selector: z.string(),
  hasAriaLabel: z.boolean(),
  ariaLabel: z.string().optional(),
  role: z.string().optional(),
  text: z.string().optional(),
  type: z.string().optional(),
});

/**
 * Schema for FrictionPoint
 */
const FrictionPointSchema = z.object({
  type: FrictionTypeSchema,
  description: z.string(),
  severity: SeveritySchema,
  location: z.string().optional(),
});

/**
 * Schema for Recommendation
 */
const RecommendationSchema = z.object({
  title: z.string(),
  description: z.string(),
  priority: PrioritySchema,
  impact: z.number().min(0).max(100),
  codeExample: z.string().optional(),
  docLink: z.string().url().optional(),
});

/**
 * Schema for IntentTrigger
 */
const IntentTriggerSchema = z.object({
  intent: z.string(),
  selector: z.string(),
  confidence: ConfidenceSchema,
  element: InteractiveElementSchema,
});

/**
 * Schema for AUXAuditRequest
 * Requirement 15.2: Validate incoming JSON requests
 * Note: URL validation is lenient here - full validation happens in validateAndSanitizeUrl
 */
export const AUXAuditRequestSchema = z.object({
  url: z.string().min(1, 'URL is required'),
});

/**
 * Schema for AUXAuditResults
 * Requirement 15.1: Consistent schema for audit results
 */
export const AUXAuditResultsSchema = z.object({
  score: z.number().min(0).max(100),
  classification: ClassificationSchema,
  protocols: z.array(ProtocolStatusSchema),
  ariaScore: z.number().min(0).max(100),
  interactiveElements: z.array(InteractiveElementSchema),
  frictionPoints: z.array(FrictionPointSchema),
  recommendations: z.array(RecommendationSchema),
  intentTriggers: z.array(IntentTriggerSchema),
  summary: z.string(),
  riskLevel: RiskLevelSchema,
  analyzedAt: z.string().datetime(),
});

/**
 * Schema for AUXAuditError
 */
export const AUXAuditErrorSchema = z.object({
  error: z.string(),
  code: ErrorCodeSchema,
  details: z.string().optional(),
  timestamp: z.string().datetime().optional(),
  requestId: z.string().optional(),
});

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Result type for validation operations
 */
export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  details?: z.ZodError;
}

/**
 * Validate an AUX Audit request
 * Requirement 15.2: Schema validation for decoding JSON requests
 * 
 * @param data - Raw request data to validate
 * @returns Validation result with typed data or error
 */
export function validateAUXAuditRequest(data: unknown): ValidationResult<AUXAuditRequest> {
  try {
    const validated = AUXAuditRequestSchema.parse(data);
    return {
      success: true,
      data: validated as AUXAuditRequest,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      return {
        success: false,
        error: firstError?.message || 'Validation failed',
        details: error,
      };
    }
    return {
      success: false,
      error: 'Unknown validation error',
    };
  }
}

/**
 * Validate AUX Audit results before serialization
 * Requirement 15.3: Validate all audit results
 * 
 * @param data - Audit results to validate
 * @returns Validation result with typed data or error
 */
export function validateAUXAuditResults(data: unknown): ValidationResult<AUXAuditResults> {
  try {
    const validated = AUXAuditResultsSchema.parse(data);
    return {
      success: true,
      data: validated as AUXAuditResults,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      return {
        success: false,
        error: firstError?.message || 'Validation failed',
        details: error,
      };
    }
    return {
      success: false,
      error: 'Unknown validation error',
    };
  }
}

/**
 * Validate an error response
 * 
 * @param data - Error response to validate
 * @returns Validation result with typed data or error
 */
export function validateAUXAuditError(data: unknown): ValidationResult<AUXAuditError> {
  try {
    const validated = AUXAuditErrorSchema.parse(data);
    return {
      success: true,
      data: validated as AUXAuditError,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      return {
        success: false,
        error: firstError?.message || 'Validation failed',
        details: error,
      };
    }
    return {
      success: false,
      error: 'Unknown validation error',
    };
  }
}

// ============================================================================
// Serialization Functions
// ============================================================================

/**
 * Result type for serialization operations
 */
export interface SerializationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Serialize AUX Audit results to JSON string
 * Requirement 15.1: Consistent JSON encoding
 * Requirement 15.3: Serialize all audit results
 * Requirement 15.5: Standard JSON parser compatibility
 * 
 * @param results - Audit results to serialize
 * @returns Serialization result with JSON string or error
 */
export function serializeAUXAuditResults(results: AUXAuditResults): SerializationResult<string> {
  try {
    // First validate the data structure
    const validation = validateAUXAuditResults(results);
    if (!validation.success) {
      return {
        success: false,
        error: `Validation failed: ${validation.error}`,
      };
    }
    
    // Serialize to JSON
    const json = JSON.stringify(validation.data);
    
    return {
      success: true,
      data: json,
    };
  } catch (error) {
    // Requirement 15.4: Handle serialization failures
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Serialization failed',
    };
  }
}

/**
 * Deserialize JSON string to AUX Audit results
 * Requirement 15.2: Schema validation for decoding
 * Requirement 15.5: Standard JSON parser compatibility
 * 
 * @param json - JSON string to deserialize
 * @returns Serialization result with typed data or error
 */
export function deserializeAUXAuditResults(json: string): SerializationResult<AUXAuditResults> {
  try {
    // Parse JSON
    const parsed = JSON.parse(json);
    
    // Validate structure
    const validation = validateAUXAuditResults(parsed);
    if (!validation.success) {
      return {
        success: false,
        error: `Validation failed: ${validation.error}`,
      };
    }
    
    return {
      success: true,
      data: validation.data,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Deserialization failed',
    };
  }
}

/**
 * Serialize AUX Audit request to JSON string
 * 
 * @param request - Request to serialize
 * @returns Serialization result with JSON string or error
 */
export function serializeAUXAuditRequest(request: AUXAuditRequest): SerializationResult<string> {
  try {
    // Validate the data structure
    const validation = validateAUXAuditRequest(request);
    if (!validation.success) {
      return {
        success: false,
        error: `Validation failed: ${validation.error}`,
      };
    }
    
    // Serialize to JSON
    const json = JSON.stringify(validation.data);
    
    return {
      success: true,
      data: json,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Serialization failed',
    };
  }
}

/**
 * Deserialize JSON string to AUX Audit request
 * Requirement 15.2: Schema validation for decoding JSON requests
 * 
 * @param json - JSON string to deserialize
 * @returns Serialization result with typed data or error
 */
export function deserializeAUXAuditRequest(json: string): SerializationResult<AUXAuditRequest> {
  try {
    // Parse JSON
    const parsed = JSON.parse(json);
    
    // Validate structure
    const validation = validateAUXAuditRequest(parsed);
    if (!validation.success) {
      return {
        success: false,
        error: `Validation failed: ${validation.error}`,
      };
    }
    
    return {
      success: true,
      data: validation.data,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Deserialization failed',
    };
  }
}

/**
 * Serialize error response to JSON string
 * 
 * @param error - Error response to serialize
 * @returns Serialization result with JSON string or error
 */
export function serializeAUXAuditError(error: AUXAuditError): SerializationResult<string> {
  try {
    // Validate the data structure
    const validation = validateAUXAuditError(error);
    if (!validation.success) {
      return {
        success: false,
        error: `Validation failed: ${validation.error}`,
      };
    }
    
    // Serialize to JSON
    const json = JSON.stringify(validation.data);
    
    return {
      success: true,
      data: json,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Serialization failed',
    };
  }
}

/**
 * Deserialize JSON string to error response
 * 
 * @param json - JSON string to deserialize
 * @returns Serialization result with typed data or error
 */
export function deserializeAUXAuditError(json: string): SerializationResult<AUXAuditError> {
  try {
    // Parse JSON
    const parsed = JSON.parse(json);
    
    // Validate structure
    const validation = validateAUXAuditError(parsed);
    if (!validation.success) {
      return {
        success: false,
        error: `Validation failed: ${validation.error}`,
      };
    }
    
    return {
      success: true,
      data: validation.data,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Deserialization failed',
    };
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if a value is a valid AUX Audit request
 * 
 * @param data - Data to check
 * @returns True if valid, false otherwise
 */
export function isValidAUXAuditRequest(data: unknown): data is AUXAuditRequest {
  return validateAUXAuditRequest(data).success;
}

/**
 * Check if a value is valid AUX Audit results
 * 
 * @param data - Data to check
 * @returns True if valid, false otherwise
 */
export function isValidAUXAuditResults(data: unknown): data is AUXAuditResults {
  return validateAUXAuditResults(data).success;
}

/**
 * Check if a value is a valid error response
 * 
 * @param data - Data to check
 * @returns True if valid, false otherwise
 */
export function isValidAUXAuditError(data: unknown): data is AUXAuditError {
  return validateAUXAuditError(data).success;
}
