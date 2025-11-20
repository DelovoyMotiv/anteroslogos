/**
 * UCPT Generator - COSE_Sign1 with Ed25519
 * RFC 9052 (COSE) + RFC 9053 (EdDSA)
 */

import { ed25519 } from '@noble/curves/ed25519.js';
import type { UCPTPayload, UCPTGenerationOptions, SerializedUCPT } from './types';
import {
  encodeCanonicalCBOR,
  hashCanonicalCBOR,
  base64urlEncode,
} from './serializer';

// COSE algorithm identifiers (RFC 9053)
const COSE_ALG_EDDSA = -8;  // EdDSA with Ed25519

/**
 * Generate UCPT token with COSE_Sign1 structure
 */
export async function generateUCPT(options: UCPTGenerationOptions): Promise<SerializedUCPT> {
  const {
    issuer_aid,
    tool_name,
    input,
    output,
    graph_commit,
    graph_version,
    causal_path_ids,
    private_key,
    public_key,
    ttl_seconds = 3600,
  } = options;
  
  // Validate keys
  if (private_key.length !== 32) {
    throw new Error(`Invalid private key length: ${private_key.length} (expected 32)`);
  }
  if (public_key.length !== 32) {
    throw new Error(`Invalid public key length: ${public_key.length} (expected 32)`);
  }
  
  // Generate timestamps
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + ttl_seconds;
  
  // Compute input and output hashes
  const input_hash = hashCanonicalCBOR(input);
  const deterministic_rerun_hash = hashCanonicalCBOR(output);
  
  // Sort causal_path_ids
  const sorted_path_ids = [...causal_path_ids].sort((a, b) => a - b);
  
  // Build payload (keys in canonical order)
  const payload: UCPTPayload = {
    1: issuer_aid,  // iss (integer key 1)
    6: iat,  // iat (integer key 6)
    7: exp,  // exp (integer key 7)
    causal_path_ids: sorted_path_ids,
    deterministic_rerun_hash,
    graph_commit,
    graph_version,
    input_hash,
    tool: tool_name,
    ucpt_version: 1,
  };
  
  // Build protected header
  const protected_header = {
    alg: COSE_ALG_EDDSA,
    kid: public_key,
  };
  
  // Encode protected header
  const protected_encoded = encodeCanonicalCBOR(protected_header);
  
  // Encode payload
  const payload_encoded = encodeCanonicalCBOR(payload);
  
  // Build Sig_structure for signing (RFC 9052 section 4.4)
  // Sig_structure = [
  //   context = "Signature1",
  //   body_protected = protected_encoded,
  //   external_aad = empty,
  //   payload = payload_encoded
  // ]
  const sig_structure = encodeCanonicalCBOR([
    'Signature1',
    protected_encoded,
    new Uint8Array(0),  // external_aad (empty)
    payload_encoded,
  ]);
  
  // Sign with Ed25519
  const signature = ed25519.sign(sig_structure, private_key);
  
  // Build COSE_Sign1 structure
  // COSE_Sign1 = [
  //   protected (bstr),
  //   unprotected (map),
  //   payload (bstr),
  //   signature (bstr)
  // ]
  const cose_sign1 = [
    protected_encoded,
    {},  // unprotected (empty map)
    payload_encoded,
    signature,
  ];
  
  // Encode to CBOR
  const token_bytes = encodeCanonicalCBOR(cose_sign1);
  
  // Encode to base64url
  const token = base64urlEncode(token_bytes);
  
  return {
    token,
    mime_type: 'application/cose; cose-type="cose-sign1"',
  };
}

/**
 * Get current git commit hash
 */
export async function getCurrentGitCommit(): Promise<string> {
  try {
    const { execSync } = await import('child_process');
    const commit = execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
    return commit;
  } catch (error) {
    console.warn('Failed to get git commit, using placeholder:', error);
    return '0000000000000000000000000000000000000000';
  }
}

/**
 * Get current git tag/version
 */
export async function getCurrentGitVersion(): Promise<string> {
  try {
    const { execSync } = await import('child_process');
    const version = execSync('git describe --tags --always', { encoding: 'utf-8' }).trim();
    return version;
  } catch (error) {
    console.warn('Failed to get git version, using default:', error);
    return 'v1.0.0';
  }
}
