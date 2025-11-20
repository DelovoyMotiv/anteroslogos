/**
 * Universal Causal Provenance Token (UCPT) v1
 * 
 * First-in-world cryptographically verifiable, deterministic provenance standard
 * for AI agent tool invocations.
 * 
 * Features:
 * - COSE_Sign1 (RFC 9052) with Ed25519 (RFC 9053)
 * - Canonical CBOR (RFC 8949 + RFC 8943)
 * - SHA3-512 hashing
 * - Deterministic execution context
 * - Cache-friendly (input_hash + graph_commit)
 * - Zero-trust verification
 * 
 * @module ucpt
 */

export type * from './types';
export * from './generator';
export * from './verifier';
export * from './serializer';
export const UCPT_VERSION = 1;
export const UCPT_MIME_TYPE = 'application/cose; cose-type="cose-sign1"' as const;
