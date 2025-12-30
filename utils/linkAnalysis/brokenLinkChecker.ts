/**
 * Broken Link Checker Module
 * Validates link accessibility via HTTP requests
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9
 */

import {
  DEFAULT_BROKEN_LINK_TIMEOUT,
  DEFAULT_MAX_BROKEN_LINK_CHECKS,
  MAX_REDIRECTS,
  HTTP_STATUS,
  USER_AGENT,
} from './constants';
import type { BrokenLinkResult } from './types';

/**
 * Check a single link for broken status
 * 
 * @param url - URL to check
 * @param timeout - Timeout in milliseconds (default: 5000)
 * @returns BrokenLinkResult with status and error information
 * 
 * Requirements:
 * - 3.1: HEAD request with timeout
 * - 3.2: Fallback to GET if HEAD not supported
 * - 3.3: Classify status codes
 * - 3.4: Handle redirects (max 3)
 * - 3.5: Detect client errors (400-499)
 * - 3.6: Detect server errors (500-599)
 * - 3.7: Handle timeouts
 */
async function checkSingleLink(
  url: string,
  timeout: number = DEFAULT_BROKEN_LINK_TIMEOUT
): Promise<BrokenLinkResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    // Requirement 3.1: HEAD request with timeout
    let response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      redirect: 'manual', // Handle redirects manually to count them
      headers: {
        'User-Agent': USER_AGENT,
      },
    });

    clearTimeout(timeoutId);

    // Requirement 3.2: Fallback to GET if HEAD returns 405 (Method Not Allowed)
    if (response.status === 405) {
      const getController = new AbortController();
      const getTimeoutId = setTimeout(() => getController.abort(), timeout);
      
      try {
        response = await fetch(url, {
          method: 'GET',
          signal: getController.signal,
          redirect: 'manual',
          headers: {
            'User-Agent': USER_AGENT,
          },
        });
        clearTimeout(getTimeoutId);
      } catch (error) {
        clearTimeout(getTimeoutId);
        throw error;
      }
    }

    // Requirement 3.4: Handle redirects (maximum 3)
    let redirectCount = 0;
    let currentUrl = url;
    let finalResponse = response;

    while (
      finalResponse.status >= HTTP_STATUS.REDIRECT_MIN &&
      finalResponse.status <= HTTP_STATUS.REDIRECT_MAX &&
      redirectCount < MAX_REDIRECTS
    ) {
      const location = finalResponse.headers.get('location');
      if (!location) {
        break;
      }

      // Resolve relative redirects
      currentUrl = new URL(location, currentUrl).href;
      redirectCount++;

      const redirectController = new AbortController();
      const redirectTimeoutId = setTimeout(() => redirectController.abort(), timeout);

      try {
        finalResponse = await fetch(currentUrl, {
          method: 'HEAD',
          signal: redirectController.signal,
          redirect: 'manual',
          headers: {
            'User-Agent': USER_AGENT,
          },
        });
        clearTimeout(redirectTimeoutId);
      } catch (error) {
        clearTimeout(redirectTimeoutId);
        throw error;
      }
    }

    const status = finalResponse.status;
    const redirected = redirectCount > 0;
    const finalUrl = redirected ? currentUrl : undefined;

    // Requirement 3.3: Classify status codes
    // Requirement 3.5: 400-499 = broken (client error)
    // Requirement 3.6: 500-599 = broken (server error)
    const broken =
      (status >= HTTP_STATUS.CLIENT_ERROR_MIN && status <= HTTP_STATUS.CLIENT_ERROR_MAX) ||
      (status >= HTTP_STATUS.SERVER_ERROR_MIN && status <= HTTP_STATUS.SERVER_ERROR_MAX);

    return {
      url,
      status,
      broken,
      redirected,
      finalUrl,
    };
  } catch (error) {
    clearTimeout(timeoutId);

    // Requirement 3.7: Handle timeouts
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        url,
        status: 0,
        broken: true,
        redirected: false,
        error: 'Request timeout',
      };
    }

    // Handle other network errors
    return {
      url,
      status: 0,
      broken: true,
      redirected: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check multiple links for broken status in parallel
 * 
 * @param urls - Array of URLs to check
 * @param maxChecks - Maximum number of links to check (default: 20)
 * @returns Array of BrokenLinkResult
 * 
 * Requirements:
 * - 3.8: Parallel checking via Promise.allSettled
 * - 3.9: Limit number of checks (maxChecks)
 * 
 * @example
 * ```typescript
 * const results = await checkBrokenLinks([
 *   'https://example.com',
 *   'https://broken-link.com',
 * ]);
 * 
 * const brokenCount = results.filter(r => r.broken).length;
 * ```
 */
export async function checkBrokenLinks(
  urls: string[],
  maxChecks: number = DEFAULT_MAX_BROKEN_LINK_CHECKS
): Promise<BrokenLinkResult[]> {
  // Requirement 3.9: Limit number of checks
  const linksToCheck = urls.slice(0, maxChecks);

  // Requirement 3.8: Parallel checking via Promise.allSettled
  const results = await Promise.allSettled(
    linksToCheck.map(url => checkSingleLink(url))
  );

  // Extract results from settled promises
  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      // If promise rejected, return broken link result
      return {
        url: linksToCheck[index],
        status: 0,
        broken: true,
        redirected: false,
        error: result.reason instanceof Error ? result.reason.message : 'Check failed',
      };
    }
  });
}
