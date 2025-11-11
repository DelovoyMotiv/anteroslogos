/**
 * Ed25519 HTTP Message Signatures - RFC 9421 Implementation
 * Production-ready cryptographic signature verification for A2A Protocol
 * Provides domain ownership proof and request integrity validation
 */

import { createHash } from 'crypto';
import { subtle } from 'crypto';

// =====================================================
// TYPES
// =====================================================

export interface Ed25519KeyPair {
  publicKey: string; // Base64-encoded public key
  privateKey: string; // Base64-encoded private key
  keyId: string; // Key identifier (e.g., "agent.example.com-2025-01")
  algorithm: 'ed25519';
  created: string; // ISO timestamp
  expires?: string; // ISO timestamp
}

export interface SignatureComponents {
  '@method'?: string;
  '@target-uri'?: string;
  '@authority'?: string;
  '@scheme'?: string;
  '@request-target'?: string;
  '@path'?: string;
  '@query'?: string;
  'content-digest'?: string;
  'content-type'?: string;
  'content-length'?: string;
  [header: string]: string | undefined;
}

export interface SignatureParams {
  keyid: string;
  algorithm: 'ed25519';
  created: number; // Unix timestamp
  expires?: number; // Unix timestamp
  nonce?: string;
}

export interface SignatureMetadata {
  signature: string; // Base64-encoded signature
  params: SignatureParams;
  components: string[]; // List of signed components
}

export interface VerificationResult {
  valid: boolean;
  keyId?: string;
  algorithm?: string;
  created?: number;
  expires?: number;
  reason?: string;
  publicKey?: string;
}

// =====================================================
// KEY MANAGEMENT
// =====================================================

/**
 * Generate Ed25519 key pair
 */
export async function generateEd25519KeyPair(
  domain: string,
  expiresInDays?: number
): Promise<Ed25519KeyPair> {
  // Generate key pair using Web Crypto API
  const keyPair = await subtle.generateKey(
    {
      name: 'Ed25519',
      namedCurve: 'Ed25519',
    } as any,
    true,
    ['sign', 'verify']
  );
  
  // Export keys
  const publicKeyBuffer = await subtle.exportKey('raw', keyPair.publicKey);
  const privateKeyBuffer = await subtle.exportKey('pkcs8', keyPair.privateKey);
  
  // Convert to base64
  const publicKey = Buffer.from(publicKeyBuffer).toString('base64');
  const privateKey = Buffer.from(privateKeyBuffer).toString('base64');
  
  // Generate key ID
  const timestamp = new Date().toISOString().split('T')[0];
  const keyId = `${domain}-${timestamp}`;
  
  const created = new Date().toISOString();
  const expires = expiresInDays
    ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
    : undefined;
  
  return {
    publicKey,
    privateKey,
    keyId,
    algorithm: 'ed25519',
    created,
    expires,
  };
}

/**
 * Import public key from base64
 */
async function importPublicKey(base64Key: string): Promise<CryptoKey> {
  const keyBuffer = Buffer.from(base64Key, 'base64');
  
  return await subtle.importKey(
    'raw',
    keyBuffer,
    {
      name: 'Ed25519',
      namedCurve: 'Ed25519',
    } as any,
    true,
    ['verify']
  );
}

/**
 * Import private key from base64
 */
async function importPrivateKey(base64Key: string): Promise<CryptoKey> {
  const keyBuffer = Buffer.from(base64Key, 'base64');
  
  return await subtle.importKey(
    'pkcs8',
    keyBuffer,
    {
      name: 'Ed25519',
      namedCurve: 'Ed25519',
    } as any,
    true,
    ['sign']
  );
}

// =====================================================
// SIGNATURE BASE STRING CONSTRUCTION
// =====================================================

/**
 * Build signature base string according to RFC 9421
 */
function buildSignatureBase(
  components: SignatureComponents,
  componentNames: string[]
): string {
  const lines: string[] = [];
  
  for (const name of componentNames) {
    const value = components[name];
    if (value === undefined) {
      throw new Error(`Missing component: ${name}`);
    }
    
    // Component identifier (lowercase)
    const identifier = name.toLowerCase();
    
    // Component value (canonical)
    const canonicalValue = canonicalizeComponentValue(value);
    
    lines.push(`"${identifier}": ${canonicalValue}`);
  }
  
  // Add signature params line
  const paramsLine = `"@signature-params": ${buildSignatureParamsString(componentNames)}`;
  lines.push(paramsLine);
  
  return lines.join('\n');
}

/**
 * Canonicalize component value
 */
function canonicalizeComponentValue(value: string): string {
  // Remove leading/trailing whitespace
  const trimmed = value.trim();
  
  // Collapse multiple spaces to single space
  const collapsed = trimmed.replace(/\s+/g, ' ');
  
  return `"${collapsed}"`;
}

/**
 * Build signature params string
 */
function buildSignatureParamsString(
  componentNames: string[],
  created?: number,
  expires?: number,
  keyId?: string,
  nonce?: string
): string {
  const parts: string[] = [];
  
  // Component names
  const components = componentNames.map(name => `"${name.toLowerCase()}"`).join(' ');
  parts.push(`(${components})`);
  
  // Created timestamp
  if (created !== undefined) {
    parts.push(`created=${created}`);
  }
  
  // Expires timestamp
  if (expires !== undefined) {
    parts.push(`expires=${expires}`);
  }
  
  // Key ID
  if (keyId) {
    parts.push(`keyid="${keyId}"`);
  }
  
  // Nonce
  if (nonce) {
    parts.push(`nonce="${nonce}"`);
  }
  
  // Algorithm
  parts.push('alg="ed25519"');
  
  return parts.join(';');
}

// =====================================================
// SIGNING
// =====================================================

/**
 * Sign HTTP request
 */
export async function signRequest(
  components: SignatureComponents,
  componentNames: string[],
  privateKey: string,
  keyId: string,
  options?: {
    nonce?: string;
    ttlSeconds?: number;
  }
): Promise<SignatureMetadata> {
  // Prepare signature params
  const created = Math.floor(Date.now() / 1000);
  const expires = options?.ttlSeconds
    ? created + options.ttlSeconds
    : undefined;
  
  // Build signature base
  const signatureBase = buildSignatureBase(components, componentNames);
  const signatureBaseWithParams = signatureBase + '\n' + buildSignatureParamsString(
    componentNames,
    created,
    expires,
    keyId,
    options?.nonce
  );
  
  // Import private key
  const cryptoKey = await importPrivateKey(privateKey);
  
  // Sign
  const signatureBuffer = await subtle.sign(
    'Ed25519',
    cryptoKey,
    Buffer.from(signatureBaseWithParams, 'utf-8')
  );
  
  // Encode signature
  const signature = Buffer.from(signatureBuffer).toString('base64');
  
  return {
    signature,
    params: {
      keyid: keyId,
      algorithm: 'ed25519',
      created,
      expires,
      nonce: options?.nonce,
    },
    components: componentNames,
  };
}

/**
 * Format signature header value
 */
export function formatSignatureHeader(metadata: SignatureMetadata): string {
  const parts: string[] = [];
  
  // Signature value
  parts.push(`sig="${metadata.signature}"`);
  
  // Key ID
  parts.push(`keyid="${metadata.params.keyid}"`);
  
  // Algorithm
  parts.push('alg="ed25519"');
  
  // Created
  parts.push(`created=${metadata.params.created}`);
  
  // Expires
  if (metadata.params.expires) {
    parts.push(`expires=${metadata.params.expires}`);
  }
  
  // Nonce
  if (metadata.params.nonce) {
    parts.push(`nonce="${metadata.params.nonce}"`);
  }
  
  // Components
  const componentsList = metadata.components.map(c => `"${c.toLowerCase()}"`).join(' ');
  parts.push(`(${componentsList})`);
  
  return parts.join(';');
}

// =====================================================
// VERIFICATION
// =====================================================

/**
 * Parse signature header
 */
export function parseSignatureHeader(headerValue: string): {
  signature: string;
  params: SignatureParams;
  components: string[];
} | null {
  try {
    const parts: Record<string, string> = {};
    
    // Split by semicolon
    const segments = headerValue.split(';').map(s => s.trim());
    
    for (const segment of segments) {
      // Match key="value" or key=value
      const match = segment.match(/^([a-z0-9_-]+)=(")?([^"]+)\2$/i);
      
      if (match) {
        const key = match[1];
        const value = match[3];
        parts[key] = value;
      } else if (segment.startsWith('(')) {
        // Component list
        const componentMatch = segment.match(/^\((.+)\)$/);
        if (componentMatch) {
          parts['_components'] = componentMatch[1];
        }
      }
    }
    
    // Extract components
    const componentsList = parts['_components']
      ? parts['_components'].split(/\s+/).map(c => c.replace(/"/g, ''))
      : [];
    
    return {
      signature: parts['sig'] || '',
      params: {
        keyid: parts['keyid'] || '',
        algorithm: 'ed25519',
        created: parseInt(parts['created'] || '0', 10),
        expires: parts['expires'] ? parseInt(parts['expires'], 10) : undefined,
        nonce: parts['nonce'],
      },
      components: componentsList,
    };
  } catch {
    return null;
  }
}

/**
 * Verify HTTP request signature
 */
export async function verifySignature(
  components: SignatureComponents,
  signatureHeader: string,
  publicKey: string
): Promise<VerificationResult> {
  try {
    // Parse signature header
    const parsed = parseSignatureHeader(signatureHeader);
    
    if (!parsed) {
      return {
        valid: false,
        reason: 'Invalid signature header format',
      };
    }
    
    // Check algorithm
    if (parsed.params.algorithm !== 'ed25519') {
      return {
        valid: false,
        reason: `Unsupported algorithm: ${parsed.params.algorithm}`,
      };
    }
    
    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    
    if (parsed.params.expires && parsed.params.expires < now) {
      return {
        valid: false,
        keyId: parsed.params.keyid,
        reason: 'Signature expired',
        created: parsed.params.created,
        expires: parsed.params.expires,
      };
    }
    
    // Check created timestamp (not too old, not in future)
    const MAX_AGE_SECONDS = 300; // 5 minutes
    const FUTURE_TOLERANCE_SECONDS = 60; // 1 minute
    
    if (parsed.params.created > now + FUTURE_TOLERANCE_SECONDS) {
      return {
        valid: false,
        keyId: parsed.params.keyid,
        reason: 'Signature created timestamp is in the future',
        created: parsed.params.created,
      };
    }
    
    if (parsed.params.created < now - MAX_AGE_SECONDS) {
      return {
        valid: false,
        keyId: parsed.params.keyid,
        reason: 'Signature is too old',
        created: parsed.params.created,
      };
    }
    
    // Build signature base
    const signatureBase = buildSignatureBase(components, parsed.components);
    const signatureBaseWithParams = signatureBase + '\n' + buildSignatureParamsString(
      parsed.components,
      parsed.params.created,
      parsed.params.expires,
      parsed.params.keyid,
      parsed.params.nonce
    );
    
    // Import public key
    const cryptoKey = await importPublicKey(publicKey);
    
    // Verify signature
    const signatureBuffer = Buffer.from(parsed.signature, 'base64');
    const messageBuffer = Buffer.from(signatureBaseWithParams, 'utf-8');
    
    const valid = await subtle.verify(
      'Ed25519',
      cryptoKey,
      signatureBuffer,
      messageBuffer
    );
    
    return {
      valid,
      keyId: parsed.params.keyid,
      algorithm: parsed.params.algorithm,
      created: parsed.params.created,
      expires: parsed.params.expires,
      publicKey,
      reason: valid ? undefined : 'Signature verification failed',
    };
  } catch (error) {
    return {
      valid: false,
      reason: `Verification error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

// =====================================================
// CONTENT DIGEST
// =====================================================

/**
 * Calculate content digest (SHA-256)
 */
export function calculateContentDigest(body: string | Buffer): string {
  const hash = createHash('sha256');
  hash.update(body);
  const digest = hash.digest('base64');
  return `sha-256=:${digest}:`;
}

/**
 * Verify content digest
 */
export function verifyContentDigest(
  body: string | Buffer,
  digestHeader: string
): boolean {
  const calculated = calculateContentDigest(body);
  return calculated === digestHeader;
}

// =====================================================
// KEY STORAGE HELPERS
// =====================================================

export interface StoredKey {
  keyId: string;
  publicKey: string;
  algorithm: 'ed25519';
  domain: string;
  created: string;
  expires?: string;
  revoked: boolean;
}

/**
 * In-memory key storage (replace with database in production)
 */
class KeyStore {
  private keys: Map<string, StoredKey> = new Map();
  
  /**
   * Store public key
   */
  storeKey(key: StoredKey): void {
    this.keys.set(key.keyId, key);
  }
  
  /**
   * Get public key by key ID
   */
  getKey(keyId: string): StoredKey | null {
    const key = this.keys.get(keyId);
    
    if (!key) return null;
    
    // Check if expired
    if (key.expires) {
      const expiresDate = new Date(key.expires);
      if (expiresDate < new Date()) {
        return null;
      }
    }
    
    // Check if revoked
    if (key.revoked) {
      return null;
    }
    
    return key;
  }
  
  /**
   * Revoke key
   */
  revokeKey(keyId: string): boolean {
    const key = this.keys.get(keyId);
    if (!key) return false;
    
    key.revoked = true;
    this.keys.set(keyId, key);
    return true;
  }
  
  /**
   * List keys for domain
   */
  listKeysForDomain(domain: string): StoredKey[] {
    return Array.from(this.keys.values())
      .filter(key => key.domain === domain && !key.revoked);
  }
  
  /**
   * Get active key for domain
   */
  getActiveKeyForDomain(domain: string): StoredKey | null {
    const keys = this.listKeysForDomain(domain);
    
    if (keys.length === 0) return null;
    
    // Sort by created date (newest first)
    keys.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());
    
    return keys[0];
  }
}

// Global key store
export const keyStore = new KeyStore();

// =====================================================
// MIDDLEWARE
// =====================================================

/**
 * Express/Vercel middleware for signature verification
 */
export async function signatureVerificationMiddleware(
  req: any,
  res: any,
  next: any
): Promise<void> {
  const signatureHeader = req.headers['signature'];
  
  if (!signatureHeader) {
    res.status(401).json({
      error: 'Signature required',
      message: 'HTTP Message Signature (RFC 9421) required for this endpoint',
    });
    return;
  }
  
  // Parse signature to get key ID
  const parsed = parseSignatureHeader(signatureHeader);
  
  if (!parsed) {
    res.status(400).json({
      error: 'Invalid signature',
      message: 'Signature header format is invalid',
    });
    return;
  }
  
  // Get public key from key store
  const storedKey = keyStore.getKey(parsed.params.keyid);
  
  if (!storedKey) {
    res.status(401).json({
      error: 'Unknown key',
      message: `Public key not found for key ID: ${parsed.params.keyid}`,
    });
    return;
  }
  
  // Build components from request
  const components: SignatureComponents = {
    '@method': req.method,
    '@target-uri': req.url,
    '@authority': req.headers['host'] || '',
    'content-type': req.headers['content-type'],
  };
  
  // Add content digest if body exists
  if (req.body) {
    const bodyString = typeof req.body === 'string' 
      ? req.body 
      : JSON.stringify(req.body);
    
    components['content-digest'] = calculateContentDigest(bodyString);
  }
  
  // Verify signature
  const result = await verifySignature(
    components,
    signatureHeader,
    storedKey.publicKey
  );
  
  if (!result.valid) {
    res.status(401).json({
      error: 'Invalid signature',
      message: result.reason,
      keyId: result.keyId,
    });
    return;
  }
  
  // Attach verification result to request
  (req as any).signatureVerification = result;
  (req as any).verifiedDomain = storedKey.domain;
  
  next();
}

// =====================================================
// UTILITIES
// =====================================================

/**
 * Extract domain from key ID
 */
export function extractDomainFromKeyId(keyId: string): string | null {
  // Format: domain-YYYY-MM-DD
  const match = keyId.match(/^(.+)-\d{4}-\d{2}-\d{2}$/);
  return match ? match[1] : null;
}

/**
 * Validate key ID format
 */
export function isValidKeyId(keyId: string): boolean {
  // Format: domain-YYYY-MM-DD
  return /^[a-z0-9.-]+-\d{4}-\d{2}-\d{2}$/.test(keyId);
}
