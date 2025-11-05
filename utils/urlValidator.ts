/**
 * URL Validation and Sanitization
 * Production-grade security checks for user input
 */

export interface ValidationResult {
  isValid: boolean;
  sanitizedUrl?: string;
  error?: string;
  warnings?: string[];
}

/**
 * Comprehensive URL validation with security checks
 */
export function validateAndSanitizeUrl(input: string): ValidationResult {
  const warnings: string[] = [];

  // 1. Input sanitation - remove dangerous characters
  if (!input || typeof input !== 'string') {
    return {
      isValid: false,
      error: 'Please enter a valid URL',
    };
  }

  // 2. Trim whitespace
  let sanitized = input.trim();

  // 3. Check for empty input after trim
  if (sanitized.length === 0) {
    return {
      isValid: false,
      error: 'URL cannot be empty',
    };
  }

  // 4. Check length limits (prevent DOS attacks)
  if (sanitized.length > 2048) {
    return {
      isValid: false,
      error: 'URL is too long (max 2048 characters)',
    };
  }

  // 5. Block dangerous protocols
  const dangerousProtocols = [
    'javascript:',
    'data:',
    'vbscript:',
    'file:',
    'about:',
    'blob:',
    'chrome:',
    'chrome-extension:',
  ];

  const lowerInput = sanitized.toLowerCase();
  for (const protocol of dangerousProtocols) {
    if (lowerInput.startsWith(protocol)) {
      return {
        isValid: false,
        error: 'Invalid protocol detected. Only HTTP(S) URLs are allowed',
      };
    }
  }

  // 6. Block XSS attempts - check for script injection patterns
  const xssPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i, // event handlers like onclick=
    /<iframe/i,
    /<embed/i,
    /<object/i,
    /&#/i, // HTML entity encoding attempts
    /%3C/i, // URL-encoded <
    /%3E/i, // URL-encoded >
  ];

  for (const pattern of xssPatterns) {
    if (pattern.test(sanitized)) {
      return {
        isValid: false,
        error: 'Invalid characters detected. Please enter a clean URL',
      };
    }
  }

  // 7. Block SQL injection attempts
  const sqlPatterns = [
    /(\s|^)(union|select|insert|update|delete|drop|create|alter|exec|execute)(\s|$)/i,
    /--/,
    /;.*$/,
    /\/\*/,
  ];

  for (const pattern of sqlPatterns) {
    if (pattern.test(sanitized)) {
      return {
        isValid: false,
        error: 'Invalid input detected',
      };
    }
  }

  // 8. Block command injection attempts
  const commandInjectionPatterns = [
    /[|&;`$(){}[\]]/,
    /\$\(/,
    /\${/,
    /\\\\/,
  ];

  for (const pattern of commandInjectionPatterns) {
    if (pattern.test(sanitized)) {
      return {
        isValid: false,
        error: 'Invalid characters detected in URL',
      };
    }
  }

  // 9. Normalize URL - add protocol if missing
  if (!sanitized.startsWith('http://') && !sanitized.startsWith('https://')) {
    sanitized = 'https://' + sanitized;
    warnings.push('Protocol added (HTTPS)');
  }

  // 10. URL format validation
  let urlObject: URL;
  try {
    urlObject = new URL(sanitized);
  } catch (error) {
    return {
      isValid: false,
      error: 'Invalid URL format',
    };
  }

  // 11. Protocol must be HTTP or HTTPS
  if (urlObject.protocol !== 'http:' && urlObject.protocol !== 'https:') {
    return {
      isValid: false,
      error: 'Only HTTP and HTTPS protocols are allowed',
    };
  }

  // 12. Hostname validation
  const hostname = urlObject.hostname;

  // Block localhost and internal IPs (SSRF prevention)
  const internalPatterns = [
    /^localhost$/i,
    /^127\./,
    /^10\./,
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
    /^192\.168\./,
    /^169\.254\./, // link-local
    /^0\.0\.0\.0$/,
    /^\[::/i, // IPv6 localhost
    /^::1$/i, // IPv6 localhost
  ];

  for (const pattern of internalPatterns) {
    if (pattern.test(hostname)) {
      return {
        isValid: false,
        error: 'Internal/private IP addresses are not allowed',
      };
  }
  }

  // 13. Hostname must contain at least one dot (except localhost which is blocked)
  if (!hostname.includes('.') && hostname !== 'localhost') {
    return {
      isValid: false,
      error: 'Invalid domain name format',
    };
  }

  // 14. Check for valid TLD (basic check)
  const tldParts = hostname.split('.');
  const tld = tldParts[tldParts.length - 1];
  if (tld.length < 2 || tld.length > 63) {
    return {
      isValid: false,
      error: 'Invalid top-level domain',
    };
  }

  // 15. Hostname should only contain valid characters
  const validHostnameRegex = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/i;
  if (!validHostnameRegex.test(hostname)) {
    return {
      isValid: false,
      error: 'Invalid characters in domain name',
    };
  }

  // 16. Check for suspicious patterns in path/query
  const fullUrl = urlObject.toString();
  
  // Block URLs with too many redirects or suspicious parameters
  if ((fullUrl.match(/redirect/gi) || []).length > 2) {
    warnings.push('URL contains multiple redirect parameters');
  }

  // 17. Keep URL as-is (don't remove trailing slash - some sites need it)
  const finalUrl = urlObject.toString();

  // 18. Final security check - ensure URL hasn't been corrupted
  try {
    new URL(finalUrl);
  } catch {
    return {
      isValid: false,
      error: 'URL validation failed',
    };
  }

  return {
    isValid: true,
    sanitizedUrl: finalUrl,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Rate limiting check (client-side)
 */
const RATE_LIMIT_KEY = 'geo_audit_rate_limit';
const MAX_REQUESTS_PER_MINUTE = 5;
const MAX_REQUESTS_PER_HOUR = 20;

export interface RateLimitResult {
  allowed: boolean;
  error?: string;
  resetIn?: number; // seconds
}

export function checkRateLimit(): RateLimitResult {
  try {
    const now = Date.now();
    const stored = localStorage.getItem(RATE_LIMIT_KEY);
    
    let timestamps: number[] = [];
    if (stored) {
      timestamps = JSON.parse(stored);
      // Remove timestamps older than 1 hour
      timestamps = timestamps.filter(ts => now - ts < 3600000);
    }

    // Check per-minute limit
    const lastMinute = timestamps.filter(ts => now - ts < 60000);
    if (lastMinute.length >= MAX_REQUESTS_PER_MINUTE) {
      const oldestInMinute = Math.min(...lastMinute);
      const resetIn = Math.ceil((60000 - (now - oldestInMinute)) / 1000);
      return {
        allowed: false,
        error: `Rate limit exceeded. Please wait ${resetIn} seconds`,
        resetIn,
      };
    }

    // Check per-hour limit
    if (timestamps.length >= MAX_REQUESTS_PER_HOUR) {
      const oldestInHour = Math.min(...timestamps);
      const resetIn = Math.ceil((3600000 - (now - oldestInHour)) / 1000);
      return {
        allowed: false,
        error: `Hourly limit reached. Please wait ${Math.ceil(resetIn / 60)} minutes`,
        resetIn,
      };
    }

    // Add current timestamp
    timestamps.push(now);
    localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(timestamps));

    return { allowed: true };
  } catch (error) {
    // If localStorage fails, allow the request but log error
    console.error('Rate limit check failed:', error);
    return { allowed: true };
  }
}

/**
 * Sanitize output for display (XSS prevention)
 */
export function sanitizeForDisplay(text: string): string {
  if (!text) return '';
  
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Validate that result data hasn't been tampered with
 */
export function validateAuditResult(result: any): boolean {
  if (!result || typeof result !== 'object') return false;
  
  // Check required fields
  const requiredFields = ['url', 'timestamp', 'overallScore', 'grade', 'scores', 'details'];
  for (const field of requiredFields) {
    if (!(field in result)) return false;
  }

  // Validate score ranges
  if (typeof result.overallScore !== 'number' || 
      result.overallScore < 0 || 
      result.overallScore > 100) {
    return false;
  }

  // Validate scores object
  if (typeof result.scores !== 'object') return false;
  
  for (const score of Object.values(result.scores)) {
    if (typeof score !== 'number' || score < 0 || score > 100) {
      return false;
    }
  }

  return true;
}
