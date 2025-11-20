/**
 * UCPT Input Validation - Enterprise-grade constraints
 * Fail-fast validation for all UCPT inputs
 */

import { ed25519 } from '@noble/curves/ed25519.js';
import { encodeCanonicalCBOR } from './serializer';

// =====================================================
// VALIDATION CONSTANTS
// =====================================================

const MAX_PAYLOAD_SIZE_BYTES = 65536; // 64KB CBOR limit
const MIN_TTL_SECONDS = 60; // 1 minute minimum
const MAX_TTL_SECONDS = 86400; // 24 hours maximum
const GIT_COMMIT_REGEX = /^[0-9a-f]{40}$/; // SHA-1 hex
const AID_URI_REGEX = /^aid:\/\/[a-z0-9.-]+\/agent\/[a-z0-9-]+$/i; // aid://domain/agent/<aid>
const SEMANTIC_VERSION_REGEX = /^v?\d+\.\d+\.\d+(-[a-z0-9.-]+)?(\+[a-z0-9.-]+)?$/i; // Semantic versioning

// =====================================================
// VALIDATION ERRORS
// =====================================================

export class UCPTValidationError extends Error {
  constructor(
    message: string,
    public readonly field: string,
    public readonly code: string
  ) {
    super(message);
    this.name = 'UCPTValidationError';
  }
}

// =====================================================
// AID URI VALIDATION
// =====================================================

/**
 * Validate AID URI format (RFC-compliant)
 * Format: aid://domain/agent/<aid>
 * @example aid://example.com/agent/geo-audit-platform
 */
export function validateAID(aid: string): void {
  if (!aid || typeof aid !== 'string') {
    throw new UCPTValidationError(
      'AID must be a non-empty string',
      'issuer_aid',
      'INVALID_AID_TYPE'
    );
  }

  if (!AID_URI_REGEX.test(aid)) {
    throw new UCPTValidationError(
      `Invalid AID URI format: ${aid}. Expected format: aid://domain/agent/<aid>`,
      'issuer_aid',
      'INVALID_AID_FORMAT'
    );
  }

  // Extract and validate domain
  const domain = aid.split('//')[1]?.split('/')[0];
  if (!domain || domain.length < 3 || domain.length > 253) {
    throw new UCPTValidationError(
      `Invalid AID domain: ${domain}. Must be 3-253 characters`,
      'issuer_aid',
      'INVALID_AID_DOMAIN'
    );
  }
}

// =====================================================
// PAYLOAD SIZE VALIDATION
// =====================================================

/**
 * Validate payload size (enforce 64KB CBOR limit)
 */
export function validatePayloadSize(payload: unknown): void {
  try {
    const encoded = encodeCanonicalCBOR(payload);
    if (encoded.length > MAX_PAYLOAD_SIZE_BYTES) {
      throw new UCPTValidationError(
        `Payload exceeds size limit: ${encoded.length} bytes (max ${MAX_PAYLOAD_SIZE_BYTES})`,
        'payload',
        'PAYLOAD_TOO_LARGE'
      );
    }
  } catch (error) {
    if (error instanceof UCPTValidationError) {
      throw error;
    }
    throw new UCPTValidationError(
      `Failed to encode payload: ${error instanceof Error ? error.message : String(error)}`,
      'payload',
      'PAYLOAD_ENCODING_ERROR'
    );
  }
}

// =====================================================
// TTL VALIDATION
// =====================================================

/**
 * Validate TTL bounds (60s ≤ TTL ≤ 86400s)
 */
export function validateTTL(ttl: number): void {
  if (!Number.isFinite(ttl) || ttl < MIN_TTL_SECONDS || ttl > MAX_TTL_SECONDS) {
    throw new UCPTValidationError(
      `Invalid TTL: ${ttl}. Must be between ${MIN_TTL_SECONDS} and ${MAX_TTL_SECONDS} seconds`,
      'ttl_seconds',
      'INVALID_TTL'
    );
  }
}

// =====================================================
// ED25519 KEY VALIDATION
// =====================================================

/**
 * Validate Ed25519 keypair (length + cryptographic validity)
 */
export function validateEd25519Keys(
  privateKey: Uint8Array,
  publicKey: Uint8Array
): void {
  // Length validation
  if (privateKey.length !== 32) {
    throw new UCPTValidationError(
      `Invalid private key length: ${privateKey.length} bytes (expected 32)`,
      'private_key',
      'INVALID_PRIVATE_KEY_LENGTH'
    );
  }

  if (publicKey.length !== 32) {
    throw new UCPTValidationError(
      `Invalid public key length: ${publicKey.length} bytes (expected 32)`,
      'public_key',
      'INVALID_PUBLIC_KEY_LENGTH'
    );
  }

  // Cryptographic validation: derive public key from private key and compare
  try {
    const derivedPublicKey = ed25519.getPublicKey(privateKey);
    
    // Compare byte-by-byte
    for (let i = 0; i < 32; i++) {
      if (derivedPublicKey[i] !== publicKey[i]) {
        throw new UCPTValidationError(
          'Public key does not match private key (keypair mismatch)',
          'public_key',
          'KEYPAIR_MISMATCH'
        );
      }
    }
  } catch (error) {
    if (error instanceof UCPTValidationError) {
      throw error;
    }
    throw new UCPTValidationError(
      `Cryptographic validation failed: ${error instanceof Error ? error.message : String(error)}`,
      'private_key',
      'INVALID_KEYPAIR'
    );
  }
}

// =====================================================
// GIT COMMIT VALIDATION
// =====================================================

/**
 * Validate git commit hash (40-character hex SHA-1)
 */
export function validateGraphCommit(commit: string): void {
  if (!commit || typeof commit !== 'string') {
    throw new UCPTValidationError(
      'Graph commit must be a non-empty string',
      'graph_commit',
      'INVALID_COMMIT_TYPE'
    );
  }

  if (!GIT_COMMIT_REGEX.test(commit)) {
    throw new UCPTValidationError(
      `Invalid git commit hash: ${commit}. Expected 40-character hex SHA-1`,
      'graph_commit',
      'INVALID_COMMIT_FORMAT'
    );
  }
}

// =====================================================
// SEMANTIC VERSION VALIDATION
// =====================================================

/**
 * Validate semantic version (semver 2.0.0)
 */
export function validateGraphVersion(version: string): void {
  if (!version || typeof version !== 'string') {
    throw new UCPTValidationError(
      'Graph version must be a non-empty string',
      'graph_version',
      'INVALID_VERSION_TYPE'
    );
  }

  if (!SEMANTIC_VERSION_REGEX.test(version)) {
    throw new UCPTValidationError(
      `Invalid semantic version: ${version}. Expected format: v1.2.3 or 1.2.3`,
      'graph_version',
      'INVALID_VERSION_FORMAT'
    );
  }
}

// =====================================================
// TOOL NAME VALIDATION
// =====================================================

/**
 * Validate tool name (kebab-case, alphanumeric + hyphens)
 */
export function validateToolName(tool: string): void {
  if (!tool || typeof tool !== 'string') {
    throw new UCPTValidationError(
      'Tool name must be a non-empty string',
      'tool_name',
      'INVALID_TOOL_TYPE'
    );
  }

  if (tool.length < 2 || tool.length > 64) {
    throw new UCPTValidationError(
      `Invalid tool name length: ${tool.length}. Must be 2-64 characters`,
      'tool_name',
      'INVALID_TOOL_LENGTH'
    );
  }

  if (!/^[a-z0-9-]+$/.test(tool)) {
    throw new UCPTValidationError(
      `Invalid tool name: ${tool}. Must be kebab-case (lowercase alphanumeric + hyphens)`,
      'tool_name',
      'INVALID_TOOL_FORMAT'
    );
  }
}

// =====================================================
// CAUSAL PATH IDS VALIDATION
// =====================================================

/**
 * Validate causal path IDs (non-empty array of positive integers)
 */
export function validateCausalPathIds(pathIds: number[]): void {
  if (!Array.isArray(pathIds)) {
    throw new UCPTValidationError(
      'Causal path IDs must be an array',
      'causal_path_ids',
      'INVALID_PATH_IDS_TYPE'
    );
  }

  if (pathIds.length === 0) {
    throw new UCPTValidationError(
      'Causal path IDs array cannot be empty',
      'causal_path_ids',
      'EMPTY_PATH_IDS'
    );
  }

  for (let i = 0; i < pathIds.length; i++) {
    const id = pathIds[i];
    if (!Number.isInteger(id) || id < 0) {
      throw new UCPTValidationError(
        `Invalid causal path ID at index ${i}: ${id}. Must be a non-negative integer`,
        'causal_path_ids',
        'INVALID_PATH_ID'
      );
    }
  }
}

// =====================================================
// COMPOSITE VALIDATION
// =====================================================

/**
 * Validate all UCPT generation options
 */
export function validateGenerationOptions(options: {
  issuer_aid: string;
  tool_name: string;
  input: unknown;
  output: unknown;
  graph_commit: string;
  graph_version: string;
  causal_path_ids: number[];
  private_key: Uint8Array;
  public_key: Uint8Array;
  ttl_seconds?: number;
}): void {
  validateAID(options.issuer_aid);
  validateToolName(options.tool_name);
  validateGraphCommit(options.graph_commit);
  validateGraphVersion(options.graph_version);
  validateCausalPathIds(options.causal_path_ids);
  validateEd25519Keys(options.private_key, options.public_key);
  
  if (options.ttl_seconds !== undefined) {
    validateTTL(options.ttl_seconds);
  }

  // Validate payload size (will be checked during generation)
  const payload = {
    1: options.issuer_aid,
    6: Math.floor(Date.now() / 1000),
    7: Math.floor(Date.now() / 1000) + (options.ttl_seconds || 3600),
    causal_path_ids: options.causal_path_ids,
    deterministic_rerun_hash: 'placeholder',
    graph_commit: options.graph_commit,
    graph_version: options.graph_version,
    input_hash: 'placeholder',
    tool: options.tool_name,
    ucpt_version: 1,
  };
  validatePayloadSize(payload);
}
