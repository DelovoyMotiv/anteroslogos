/**
 * URL validation and sanitization utilities for Agent Manifest Generator
 * Reuses existing URL validation infrastructure with manifest-specific enhancements
 * 
 * @module lib/agentManifest/urlUtils
 * @version 1.0.0
 */

import { validateAndSanitizeUrl, type ValidationResult } from '../../utils/urlValidator';

/**
 * Validates and sanitizes a URL for manifest generation
 * Wraps the existing URL validator with manifest-specific requirements
 * 
 * @param url - The URL to validate and sanitize
 * @returns Validation result with sanitized URL or error
 */
export function validateManifestUrl(url: string): ValidationResult {
  // Use existing comprehensive URL validation
  const result = validateAndSanitizeUrl(url);
  
  if (!result.isValid) {
    return result;
  }
  
  // Additional manifest-specific validation
  try {
    const urlObject = new URL(result.sanitizedUrl!);
    
    // Ensure URL has a valid hostname (not just IP)
    const hostname = urlObject.hostname;
    
    // Check if hostname is an IP address (basic check)
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
    
    return result;
  } catch (error) {
    return {
      isValid: false,
      error: 'Invalid URL format',
    };
  }
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
