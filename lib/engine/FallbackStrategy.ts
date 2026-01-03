/**
 * FallbackStrategy - Determines when to fallback from browser to static fetching
 * 
 * Implements fallback logic for CSR scraping optimization:
 * - Fallback for timeout and network errors
 * - No fallback for WAF/CAPTCHA blocks
 * - Provides warning messages for fallback scenarios
 */

import { AgentMiddlewareError, isAgentMiddlewareError } from './errors';
import { ErrorCode } from '../../types/agent-middleware.types';

/**
 * Fallback decision result
 */
export interface FallbackDecision {
  shouldFallback: boolean;
  reason: string;
  warningMessage?: string;
}

/**
 * FallbackStrategy class
 * Determines when browser rendering should fallback to static fetching
 */
export class FallbackStrategy {
  /**
   * Determines if an error should trigger fallback to static fetching
   * 
   * Requirement 4.1: Fallback for timeout errors
   * Requirement 4.2: No fallback for WAF/CAPTCHA blocks
   * Requirement 4.4: Fallback for memory errors
   * 
   * @param error - Error from browser rendering
   * @returns FallbackDecision with shouldFallback flag and warning message
   */
  shouldFallback(error: Error): FallbackDecision {
    // Check if it's an AgentMiddlewareError
    if (isAgentMiddlewareError(error)) {
      return this.handleAgentMiddlewareError(error);
    }

    // Handle generic errors
    return this.handleGenericError(error);
  }

  /**
   * Handles AgentMiddlewareError instances
   * @private
   */
  private handleAgentMiddlewareError(error: AgentMiddlewareError): FallbackDecision {
    switch (error.code) {
      // Requirement 4.2: No fallback for WAF/CAPTCHA blocks
      case ErrorCode.ERR_WAF_BLOCK:
        return {
          shouldFallback: false,
          reason: 'WAF/CAPTCHA block detected - fallback not applicable',
        };

      // Requirement 4.1: Fallback for timeout errors
      case ErrorCode.ERR_TIMEOUT:
      case ErrorCode.ERR_CSR_TIMEOUT:
        return {
          shouldFallback: true,
          reason: 'Browser rendering timed out',
          warningMessage: this.getTimeoutWarning(error),
        };

      // Requirement 4.1: Fallback for network errors
      case ErrorCode.ERR_URL_UNREACHABLE:
        return {
          shouldFallback: true,
          reason: 'Network error during browser rendering',
          warningMessage: 'Browser rendering failed due to network error. Falling back to static HTML. CSR content may be unavailable.',
        };

      // Requirement 4.4: Fallback for memory errors
      case ErrorCode.ERR_INTERNAL:
        // Check if it's a memory-related error
        if (this.isMemoryError(error)) {
          return {
            shouldFallback: true,
            reason: 'Memory limit exceeded during browser rendering',
            warningMessage: 'Browser rendering failed due to memory limits. Falling back to static HTML. CSR content may be unavailable.',
          };
        }
        // Generic internal error - attempt fallback
        return {
          shouldFallback: true,
          reason: 'Internal error during browser rendering',
          warningMessage: 'Browser rendering failed. Falling back to static HTML. CSR content may be unavailable.',
        };

      // Bot blocking - attempt fallback (static fetch might work)
      case ErrorCode.ERR_BOT_BLOCKED:
        return {
          shouldFallback: true,
          reason: 'Bot blocking detected',
          warningMessage: 'Browser rendering blocked by bot detection. Falling back to static HTML. CSR content may be unavailable.',
        };

      // Other errors - attempt fallback
      default:
        return {
          shouldFallback: true,
          reason: `Browser error: ${error.code}`,
          warningMessage: 'Browser rendering failed. Falling back to static HTML. CSR content may be unavailable.',
        };
    }
  }

  /**
   * Handles generic Error instances
   * @private
   */
  private handleGenericError(error: Error): FallbackDecision {
    const errorMessage = error.message.toLowerCase();

    // Check for timeout-related errors
    if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
      return {
        shouldFallback: true,
        reason: 'Timeout error',
        warningMessage: 'Browser rendering timed out. Falling back to static HTML. CSR content may be unavailable.',
      };
    }

    // Check for memory-related errors
    if (this.isMemoryError(error)) {
      return {
        shouldFallback: true,
        reason: 'Memory error',
        warningMessage: 'Browser rendering failed due to memory limits. Falling back to static HTML. CSR content may be unavailable.',
      };
    }

    // Check for network-related errors
    if (this.isNetworkError(error)) {
      return {
        shouldFallback: true,
        reason: 'Network error',
        warningMessage: 'Browser rendering failed due to network error. Falling back to static HTML. CSR content may be unavailable.',
      };
    }

    // Check for CAPTCHA/WAF indicators
    if (this.isCaptchaError(error)) {
      return {
        shouldFallback: false,
        reason: 'CAPTCHA/WAF detected',
      };
    }

    // Default: attempt fallback for unknown errors
    return {
      shouldFallback: true,
      reason: 'Unknown browser error',
      warningMessage: 'Browser rendering failed. Falling back to static HTML. CSR content may be unavailable.',
    };
  }

  /**
   * Checks if an error is memory-related
   * @private
   */
  private isMemoryError(error: Error): boolean {
    const errorMessage = error.message.toLowerCase();
    const memoryIndicators = [
      'out of memory',
      'memory limit',
      'heap',
      'allocation failed',
      'enomem',
    ];
    return memoryIndicators.some(indicator => errorMessage.includes(indicator));
  }

  /**
   * Checks if an error is network-related
   * @private
   */
  private isNetworkError(error: Error): boolean {
    const errorMessage = error.message.toLowerCase();
    const networkIndicators = [
      'econnrefused',
      'enotfound',
      'econnreset',
      'etimedout',
      'network',
      'net::',
      'err_',
    ];
    return networkIndicators.some(indicator => errorMessage.includes(indicator));
  }

  /**
   * Checks if an error is CAPTCHA/WAF-related
   * @private
   */
  private isCaptchaError(error: Error): boolean {
    const errorMessage = error.message.toLowerCase();
    const captchaIndicators = [
      'captcha',
      'challenge',
      'cloudflare',
      'recaptcha',
      'hcaptcha',
    ];
    return captchaIndicators.some(indicator => errorMessage.includes(indicator));
  }

  /**
   * Gets a timeout-specific warning message
   * @private
   */
  private getTimeoutWarning(error: AgentMiddlewareError): string {
    const timeout = error.details?.timeout || error.details?.timeoutDuration;
    if (timeout) {
      return `Browser rendering timed out after ${timeout}ms. Falling back to static HTML. CSR content may be unavailable.`;
    }
    return 'Browser rendering timed out. Falling back to static HTML. CSR content may be unavailable.';
  }

  /**
   * Gets the extraction method based on whether browser was used
   * 
   * @param usedBrowser - Whether browser rendering was used
   * @returns 'browser' or 'static'
   */
  getExtractionMethod(usedBrowser: boolean): 'browser' | 'static' {
    return usedBrowser ? 'browser' : 'static';
  }
}

