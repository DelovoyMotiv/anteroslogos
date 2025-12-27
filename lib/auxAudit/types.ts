/**
 * AUX Audit Module - Type Definitions
 * 
 * This file contains all TypeScript interfaces and types for the AUX (Agent Experience) Audit system.
 */

// ============================================================================
// Core Result Types
// ============================================================================

/**
 * Classification of a website's agent readiness based on AUX Score
 */
export type Classification = 'Agent-Blind' | 'Agent-Capable' | 'Agent-Ready';

/**
 * Risk level assessment for agent interaction
 */
export type RiskLevel = 'low' | 'medium' | 'high';

/**
 * Priority level for recommendations
 */
export type Priority = 'low' | 'medium' | 'high';

/**
 * Confidence level for detected actions
 */
export type Confidence = 'low' | 'medium' | 'high';

/**
 * Severity level for friction points
 */
export type Severity = 'low' | 'medium' | 'high';

/**
 * Types of friction that can block agent interaction
 */
export type FrictionType = 'captcha' | 'interstitial' | 'canvas' | 'auth-wall' | 'other';

/**
 * Error codes for audit failures
 */
export type ErrorCode = 
  | 'INVALID_URL'
  | 'TIMEOUT'
  | 'FETCH_FAILED'
  | 'PARSE_ERROR'
  | 'LLM_ERROR'
  | 'RATE_LIMIT_EXCEEDED'
  | 'SERIALIZATION_ERROR'
  | 'INTERNAL_ERROR';

// ============================================================================
// Primary Data Models
// ============================================================================

/**
 * Complete audit results returned by the AUX Audit system
 */
export interface AUXAuditResults {
  /** AUX Score from 0-100 */
  score: number;
  
  /** Classification based on score */
  classification: Classification;
  
  /** Discovered agent protocols */
  protocols: ProtocolStatus[];
  
  /** ARIA accessibility score (0-100) */
  ariaScore: number;
  
  /** All interactive elements found on the page */
  interactiveElements: InteractiveElement[];
  
  /** Detected barriers to agent interaction */
  frictionPoints: FrictionPoint[];
  
  /** Actionable improvement recommendations */
  recommendations: Recommendation[];
  
  /** Detected actions agents can perform */
  intentTriggers: IntentTrigger[];
  
  /** Summary of the audit findings */
  summary: string;
  
  /** Overall risk assessment */
  riskLevel: RiskLevel;
  
  /** ISO 8601 timestamp of when audit was performed */
  analyzedAt: string;
}

/**
 * Status of an agent-specific protocol
 */
export interface ProtocolStatus {
  /** Protocol name (e.g., 'agents.json', 'ai-plugin.json') */
  name: string;
  
  /** Whether the protocol file was found */
  available: boolean;
  
  /** Full URL to the protocol file */
  url: string;
  
  /** Parsed content of the protocol file (if available) */
  content?: any;
}

/**
 * An interactive HTML element that accepts user interaction
 */
export interface InteractiveElement {
  /** HTML tag name */
  tag: string;
  
  /** CSS selector to locate the element */
  selector: string;
  
  /** Whether element has an aria-label attribute */
  hasAriaLabel: boolean;
  
  /** Value of aria-label attribute (if present) */
  ariaLabel?: string;
  
  /** ARIA role attribute (if present) */
  role?: string;
  
  /** Visible text content */
  text?: string;
  
  /** Input type (for input elements) */
  type?: string;
}

/**
 * A barrier that prevents or hinders agent interaction
 */
export interface FrictionPoint {
  /** Type of friction */
  type: FrictionType;
  
  /** Human-readable description */
  description: string;
  
  /** Severity of the friction */
  severity: Severity;
  
  /** CSS selector or location description */
  location?: string;
}

/**
 * An actionable recommendation for improving agent experience
 */
export interface Recommendation {
  /** Short title of the recommendation */
  title: string;
  
  /** Detailed description */
  description: string;
  
  /** Priority level */
  priority: Priority;
  
  /** Estimated AUX Score improvement (0-100) */
  impact: number;
  
  /** Example code snippet (if applicable) */
  codeExample?: string;
  
  /** Link to documentation */
  docLink?: string;
}

/**
 * A detected action that agents can perform
 */
export interface IntentTrigger {
  /** Type of intent (e.g., 'buy', 'book', 'login') */
  intent: string;
  
  /** CSS selector to locate the trigger element */
  selector: string;
  
  /** Confidence level of the detection */
  confidence: Confidence;
  
  /** The interactive element associated with this trigger */
  element: InteractiveElement;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

/**
 * Request body for POST /api/audit/aux
 */
export interface AUXAuditRequest {
  /** URL to audit */
  url: string;
}

/**
 * Error response from the audit API
 */
export interface AUXAuditError {
  /** Human-readable error message */
  error: string;
  
  /** Machine-readable error code */
  code: ErrorCode;
  
  /** Additional error details */
  details?: string;
  
  /** ISO 8601 timestamp */
  timestamp?: string;
  
  /** Request ID for tracking */
  requestId?: string;
}

// ============================================================================
// Analysis Engine Types
// ============================================================================

/**
 * Robots.txt parsing results
 */
export interface RobotsTxtDirectives {
  /** Whether OAI-SearchBot is allowed */
  allowsOAI: boolean;
  
  /** Whether CCBot is allowed */
  allowsCCBot: boolean;
  
  /** Raw directives found */
  directives: string[];
}

/**
 * Results from semantic affordance analysis
 */
export interface SemanticAnalysis {
  /** ARIA density score (0-100) */
  ariaScore: number;
  
  /** All interactive elements found */
  interactiveElements: InteractiveElement[];
  
  /** Total number of interactive elements */
  totalElements: number;
  
  /** Number of elements with ARIA labels or roles */
  labeledElements: number;
}

/**
 * HTML form element information
 */
export interface FormElement {
  /** CSS selector */
  selector: string;
  
  /** Form action URL */
  action?: string;
  
  /** Form method (GET/POST) */
  method?: string;
  
  /** Input fields in the form */
  inputs: InteractiveElement[];
}

/**
 * Data collected from web scraping
 */
export interface ScrapedData {
  /** ARIA density score */
  ariaScore: number;
  
  /** Discovered protocols */
  protocols: ProtocolStatus[];
  
  /** Interactive elements */
  interactiveElements: InteractiveElement[];
  
  /** Detected friction points */
  frictionPoints: FrictionPoint[];
  
  /** Forms found on the page */
  forms: FormElement[];
}

/**
 * Analysis results from LLM reasoning
 */
export interface LLMAnalysis {
  /** AUX Score (0-100) */
  score: number;
  
  /** Friction points identified by LLM */
  frictionPoints: string[];
  
  /** Risk level assessment */
  riskLevel: RiskLevel;
  
  /** Summary of findings */
  summary: string;
  
  /** Generated recommendations */
  recommendations: Recommendation[];
  
  /** Detected intent triggers */
  intentTriggers: IntentTrigger[];
}

// ============================================================================
// Component Props Types
// ============================================================================

/**
 * Props for AUXScoreCard component
 */
export interface AUXScoreCardProps {
  /** AUX Score (0-100) */
  score: number;
  
  /** Classification label */
  classification: Classification;
  
  /** Summary text */
  summary: string;
}

/**
 * Props for ProtocolGrid component
 */
export interface ProtocolGridProps {
  /** List of protocol statuses */
  protocols: ProtocolStatus[];
}

/**
 * Props for FrictionPointsList component
 */
export interface FrictionPointsListProps {
  /** List of friction points */
  frictionPoints: FrictionPoint[];
}

/**
 * Props for RecommendationsList component
 */
export interface RecommendationsListProps {
  /** List of recommendations */
  recommendations: Recommendation[];
}

/**
 * Props for IntentTriggersList component
 */
export interface IntentTriggersListProps {
  /** List of intent triggers */
  intentTriggers: IntentTrigger[];
}

/**
 * State for AUXAuditPage component
 */
export interface AUXAuditPageState {
  /** URL being audited */
  url: string;
  
  /** Whether audit is in progress */
  loading: boolean;
  
  /** Audit results (null if not yet run) */
  results: AUXAuditResults | null;
  
  /** Error message (null if no error) */
  error: string | null;
}
