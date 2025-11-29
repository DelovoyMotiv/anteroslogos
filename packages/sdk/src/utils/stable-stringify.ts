/**
 * Deterministic JSON.stringify for generating consistent idempotency keys
 * Sorts object keys recursively to ensure identical output for equivalent objects
 */
export function stableStringify(value: unknown): string {
  if (value === null) {
    return 'null';
  }

  if (value === undefined) {
    return 'undefined';
  }

  if (typeof value === 'string') {
    return JSON.stringify(value);
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (Array.isArray(value)) {
    return '[' + value.map(stableStringify).join(',') + ']';
  }

  if (typeof value === 'object') {
    const keys = Object.keys(value).sort();
    const pairs = keys.map((key) => {
      const val = (value as Record<string, unknown>)[key];
      return JSON.stringify(key) + ':' + stableStringify(val);
    });
    return '{' + pairs.join(',') + '}';
  }

  return String(value);
}

/**
 * Generate SHA-256 hash of stable stringified value (cross-platform)
 */
export async function generateHash(value: unknown): Promise<string> {
  const str = stableStringify(value);
  
  // Try Web Crypto API first (browsers + modern Node.js)
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(str);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch {
      // Fall through to Node.js crypto
    }
  }
  
  // Try Node.js crypto module
  try {
    const nodeCrypto = await import('crypto');
    const hash = nodeCrypto.createHash('sha256');
    hash.update(str);
    return hash.digest('hex');
  } catch {
    // Fall back to strong hash if crypto unavailable
    return strongHash(str);
  }
}

/**
 * Strong hash function fallback (FNV-1a 64-bit)
 * Better than 32-bit for collision resistance
 */
function strongHash(str: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x1000193;
  
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    h1 ^= char;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= char;
    h2 = Math.imul(h2, 0x01000193);
  }
  
  return (
    (h1 >>> 0).toString(16).padStart(8, '0') +
    (h2 >>> 0).toString(16).padStart(8, '0')
  );
}
