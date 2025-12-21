/**
 * URL validation and sanitization utilities for Agent Manifest Generator
 * Minimal implementation for serverless functions
 * 
 * @module lib/agentManifest/urlUtils
 * @version 1.0.0
 */

export interface ValidationResult {
  isValid: boolean;
  sanitizedUrl?: string;
  error?: string;
}

/**
 * Validates and sanitizes a URL for manifest generation
 * Minimal implementation to reduce bundle size for serverless functions
 * 
 * @param url - The URL to validate and sanitize
 * @returns Validation result with sanitized URL or error
 */
export function validateManifestUrl(url: string): ValidationResult {
  // Basic input validation
  if (!url || typeof url !== 'string') {
    return {
      isValid: false,
      error: 'Please enter a valid URL',
    };
  }

  let sanitized = url.trim();

  if (sanitized.length === 0) {
    return {
      isValid: false,
      error: 'URL cannot be empty',
    };
  }

  if (sanitized.length > 2048) {
    return {
      isValid: false,
      error: 'URL is too long (max 2048 characters)',
    };
  }

  // Add protocol if missing
  if (!sanitized.startsWith('http://') && !sanitized.startsWith('https://')) {
    sanitized = 'https://' + sanitized;
  }

  // Validate URL format
  let urlObject: URL;
  try {
    urlObject = new URL(sanitized);
  } catch {
    return {
      isValid: false,
      error: 'Invalid URL format',
    };
  }

  // Protocol must be HTTP or HTTPS
  if (urlObject.protocol !== 'http:' && urlObject.protocol !== 'https:') {
    return {
      isValid: false,
      error: 'Only HTTP and HTTPS protocols are allowed',
    };
  }

  const hostname = urlObject.hostname;

  // Block localhost and internal IPs
  const internalPatterns = [
    /^localhost$/i,
    /^127\./,
    /^10\./,
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
    /^192\.168\./,
    /^0\.0\.0\.0$/,
  ];

  for (const pattern of internalPatterns) {
    if (pattern.test(hostname)) {
      return {
        isValid: false,
        error: 'Internal/private IP addresses are not allowed',
      };
    }
  }

  // Check if hostname is an IP address
  const isIpAddress = /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname);
  if (isIpAddress) {
    return {
      isValid: false,
      error: 'Please provide a domain name, not an IP address',
    };
  }

  // Ensure URL doesn't have authentication credentials
  if (urlObject.username || urlObject.password) {
    return {
      isValid: false,
      error: 'URLs with authentication credentials are not allowed',
    };
  }

  // Hostname must contain at least one dot
  if (!hostname.includes('.')) {
    return {
      isValid: false,
      error: 'Invalid domain name format',
    };
  }

  return {
    isValid: true,
    sanitizedUrl: urlObject.toString(),
  };
}

/**
 * Normalizes a URL for consistent manifest generation
 * Removes trailing slashes, fragments, and query parameters
 * 
 * @param url - The URL to normalize
 * @returns Normalized URL string
 */
export function normalizeManifestUrl(url: string): string {
  try {
    const urlObject = new URL(url);
    
    // Remove fragment
    urlObject.hash = '';
    
    // Remove query parameters
    urlObject.search = '';
    
    // Get the base URL
    let normalized = urlObject.toString();
    
    // Remove trailing slash (except for root domain)
    if (normalized.endsWith('/') && urlObject.pathname !== '/') {
      normalized = normalized.slice(0, -1);
    }
    
    return normalized;
  } catch {
    return url;
  }
}

/**
 * Extracts the domain name from a URL
 * 
 * @param url - The URL to extract domain from
 * @returns Domain name or empty string if invalid
 */
export function extractDomain(url: string): string {
  try {
    const urlObject = new URL(url);
    return urlObject.hostname;
  } catch {
    return '';
  }
}

/**
 * Checks if a URL is accessible (basic format check)
 * Does not perform actual HTTP requests
 * 
 * @param url - The URL to check
 * @returns True if URL appears to be accessible
 */
export function isAccessibleUrl(url: string): boolean {
  try {
    const urlObject = new URL(url);
    
    // Must be HTTP or HTTPS
    if (urlObject.protocol !== 'http:' && urlObject.protocol !== 'https:') {
      return false;
    }
    
    // Must have a valid hostname
    if (!urlObject.hostname || urlObject.hostname.length === 0) {
      return false;
    }
    
    return true;
  } catch {
    return false;
  }
}
