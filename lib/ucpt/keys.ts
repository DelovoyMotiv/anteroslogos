/**
 * UCPT Keypair Management
 * Load and validate Ed25519 keypair from environment
 */

import { config } from '../config';
import { validateEd25519Keys } from './validator';

// =====================================================
// KEYPAIR CACHE
// =====================================================

let cachedKeypair: {
  privateKey: Uint8Array;
  publicKey: Uint8Array;
} | null = null;

// =====================================================
// KEYPAIR LOADING
// =====================================================

/**
 * Load UCPT keypair from environment
 * Returns null if keys not configured (UCPT disabled)
 * Throws if keys invalid or mismatched
 */
export function loadUCPTKeypair(): {
  privateKey: Uint8Array;
  publicKey: Uint8Array;
} | null {
  // Return cached keypair if already loaded
  if (cachedKeypair) {
    return cachedKeypair;
  }
  
  // Check if UCPT disabled
  if (!config.ucpt.enabled) {
    console.log('ℹ️  UCPT disabled (UCPT_ENABLED=false)');
    return null;
  }
  
  // Check if keys configured
  if (!config.ucpt.privateKey || !config.ucpt.publicKey) {
    if (config.isProduction) {
      throw new Error(
        'UCPT keys not configured in production. ' +
        'Set UCPT_PRIVATE_KEY and UCPT_PUBLIC_KEY environment variables.'
      );
    }
    console.warn('⚠️  UCPT keys not configured. UCPT token generation disabled.');
    return null;
  }
  
  try {
    // Decode base64-encoded keys
    const privateKey = Buffer.from(config.ucpt.privateKey, 'base64');
    const publicKey = Buffer.from(config.ucpt.publicKey, 'base64');
    
    // Convert to Uint8Array
    const privateKeyBytes = new Uint8Array(privateKey);
    const publicKeyBytes = new Uint8Array(publicKey);
    
    // Validate keypair (length + cryptographic validity)
    validateEd25519Keys(privateKeyBytes, publicKeyBytes);
    
    // Cache for future use
    cachedKeypair = {
      privateKey: privateKeyBytes,
      publicKey: publicKeyBytes,
    };
    
    console.log('✅ UCPT keypair loaded and validated');
    return cachedKeypair;
  } catch (error) {
    throw new Error(
      `Failed to load UCPT keypair: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Check if UCPT is enabled and keys are configured
 */
export function isUCPTEnabled(): boolean {
  return config.ucpt.enabled && !!config.ucpt.privateKey && !!config.ucpt.publicKey;
}

/**
 * Get UCPT issuer AID
 */
export function getIssuerAID(): string {
  return config.ucpt.issuerAid;
}

/**
 * Get UCPT TTL in seconds
 */
export function getUCPTTTL(): number {
  return config.ucpt.ttlSeconds;
}

/**
 * Clear cached keypair (for testing only)
 */
export function clearKeypairCache(): void {
  cachedKeypair = null;
}
