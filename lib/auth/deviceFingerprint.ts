/**
 * Device Fingerprinting Client Module
 * Uses FingerprintJS for browser fingerprinting
 * 
 * Installation: npm install @fingerprintjs/fingerprintjs
 */

import FingerprintJS from '@fingerprintjs/fingerprintjs';

// FingerprintJS returns dynamic result, using generic Promise
let fpPromise: ReturnType<typeof FingerprintJS.load> | null = null;

/**
 * Initialize FingerprintJS (call once on app load)
 */
export async function initFingerprint(): Promise<void> {
  if (!fpPromise) {
    fpPromise = FingerprintJS.load();
  }
  await fpPromise;
}

/**
 * Get device fingerprint
 * @returns Fingerprint hash and visitor ID
 */
export async function getDeviceFingerprint(): Promise<{
  fingerprint: string;
  visitorId: string;
  confidence: number;
}> {
  try {
    if (!fpPromise) {
      await initFingerprint();
    }

    if (!fpPromise) {
      throw new Error('Failed to initialize fingerprint');
    }

    const fp = await fpPromise;
    const result = await fp.get();

    return {
      fingerprint: result.visitorId,
      visitorId: result.visitorId,
      confidence: result.confidence?.score || 1.0
    };
  } catch (error) {
    console.error('Error getting device fingerprint:', error);
    
    // Fallback to basic browser fingerprint
    const fallbackFingerprint = `${navigator.userAgent}_${navigator.language}_${screen.width}x${screen.height}`;
    const hash = await simpleHash(fallbackFingerprint);
    
    return {
      fingerprint: hash,
      visitorId: hash,
      confidence: 0.5
    };
  }
}

/**
 * Simple hash function for fallback fingerprinting
 */
async function simpleHash(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
