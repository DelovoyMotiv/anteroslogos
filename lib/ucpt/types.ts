/**
 * Universal Causal Provenance Token (UCPT) v1 - Type Definitions
 * RFC 9052 COSE_Sign1 + RFC 8949 CBOR canonical encoding
 * 
 * First-in-world cryptographically verifiable provenance standard for AI agents
 */

// =====================================================
// CBOR PAYLOAD STRUCTURE (canonical order)
// =====================================================

export interface UCPTPayload {
  // Standard COSE claims (integer keys per RFC 9052)
  1: string;  // iss - issuer AID URI (aid://domain/agent/<aid>)
  6: number;  // iat - issued at (unix timestamp)
  7: number;  // exp - expiration (iat + 3600)
  
  // UCPT-specific claims (string keys, alphabetically sorted for canonical CBOR)
  causal_path_ids: number[];  // Sorted int64 array of causal path node IDs
  deterministic_rerun_hash: string;  // base64url(SHA3-512(canonical_cbor(output)))
  graph_commit: string;  // Git commit hash of knowledge graph at execution time
  graph_version: string;  // Semantic version of graph (e.g., "v1.8.0")
  input_hash: string;  // base64url(SHA3-512(canonical_cbor(input)))
  tool: string;  // Tool name (e.g., "causal_citation_trace")
  ucpt_version: number;  // UCPT protocol version (currently 1)
}

// =====================================================
// COSE HEADER STRUCTURE
// =====================================================

export interface UCPTHeader {
  alg: number;  // Algorithm ID: -8 for EdDSA (Ed25519) per RFC 9053
  kid: Uint8Array;  // Key ID: raw bytes of public key
}

// =====================================================
// COMPLETE UCPT TOKEN
// =====================================================

export interface UCPT {
  // COSE_Sign1 structure
  protected: UCPTHeader;
  payload: UCPTPayload;
  signature: Uint8Array;
  
  // Metadata
  created_at: number;  // Unix timestamp when token was generated
  expires_at: number;  // Unix timestamp when token expires
}

// =====================================================
// SERIALIZED UCPT (wire format)
// =====================================================

export interface SerializedUCPT {
  token: string;  // base64url-encoded COSE_Sign1 CBOR
  mime_type: 'application/cose; cose-type="cose-sign1"';
}

// =====================================================
// VERIFICATION RESULT
// =====================================================

export interface UCPTVerificationResult {
  valid: boolean;
  payload?: UCPTPayload;
  error?: string;
  error_code?: UCPTErrorCode;
  verified_at?: number;
  issuer?: string;
}

export enum UCPTErrorCode {
  INVALID_SIGNATURE = 'INVALID_SIGNATURE',
  EXPIRED = 'EXPIRED',
  INVALID_FORMAT = 'INVALID_FORMAT',
  INVALID_CBOR = 'INVALID_CBOR',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  NONDETERMINISTIC_CBOR = 'NONDETERMINISTIC_CBOR',
  UNKNOWN_ISSUER = 'UNKNOWN_ISSUER',
  REPLAY_ATTACK = 'REPLAY_ATTACK',
}

// =====================================================
// GENERATION OPTIONS
// =====================================================

export interface UCPTGenerationOptions {
  issuer_aid: string;  // AID URI of the issuing agent
  tool_name: string;  // Tool being executed
  input: unknown;  // Raw input (will be canonicalized)
  output: unknown;  // Raw output (will be canonicalized)
  graph_commit: string;  // Current git commit of knowledge graph
  graph_version: string;  // Semantic version of graph
  causal_path_ids: number[];  // Causal reasoning path (sorted)
  private_key: Uint8Array;  // Ed25519 private key (32 bytes)
  public_key: Uint8Array;  // Ed25519 public key (32 bytes)
  ttl_seconds?: number;  // Time-to-live (default: 3600)
}

// =====================================================
// CACHE KEY
// =====================================================

export interface UCPTCacheKey {
  input_hash: string;
  graph_commit: string;
  tool: string;
}

export interface UCPTCacheEntry {
  result: unknown;
  ucpt: SerializedUCPT;
  cached_at: number;
  hit_count: number;
}

// =====================================================
// DETERMINISTIC EXECUTION CONTEXT
// =====================================================

export interface DeterministicContext {
  timestamp: number;  // Fixed timestamp for Date.now()
  random_seed: number;  // Fixed seed for Math.random() (always 0)
  graph_commit: string;  // Exact git commit
  disable_network: boolean;  // Force offline mode
  disable_filesystem: boolean;  // Force no FS access
}

// =====================================================
// UCPT CAPABILITY MANIFEST
// =====================================================

export interface UCPTCapability {
  version: 1;
  supported_algorithms: ['EdDSA'];
  supported_hash_functions: ['SHA3-512'];
  max_payload_size_bytes: 65536;  // 64KB limit
  default_ttl_seconds: 3600;
  cache_enabled: boolean;
  deterministic_execution: boolean;
}
