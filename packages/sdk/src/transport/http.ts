import { SDK_VERSION, DEFAULT_BASE_URL, DEFAULT_TIMEOUT } from '../utils/constants.js';
import { parseError } from '../errors/types.js';
import { TimeoutError, NetworkError } from '../errors/types.js';

export interface HTTPClientConfig {
  baseURL?: string;
  apiKey?: string;
  timeout?: number;
  headers?: Record<string, string>;
}

export interface RequestConfig {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  body?: unknown;
  query?: Record<string, string | number | boolean>;
  headers?: Record<string, string>;
}

export class HTTPClient {
  private readonly baseURL: string;
  private readonly apiKey: string | undefined;
  private readonly timeout: number;
  private readonly defaultHeaders: Record<string, string>;

  constructor(config: HTTPClientConfig) {
    this.baseURL = config.baseURL ?? DEFAULT_BASE_URL;
    this.apiKey = config.apiKey ?? undefined;
    this.timeout = config.timeout !== undefined ? config.timeout : DEFAULT_TIMEOUT;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'User-Agent': `anteroslogos-sdk-ts/${SDK_VERSION}`,
      ...config.headers,
    };

    if (this.apiKey) {
      this.defaultHeaders['Authorization'] = `Bearer ${this.apiKey}`;
    }
  }

  /**
   * Execute HTTP request
   */
  async request<T>(config: RequestConfig): Promise<T> {
    const url = this.buildURL(config.path, config.query);
    const controller = new AbortController();
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    try {
      // Set timeout with proper cleanup
      timeoutId = setTimeout(() => {
        controller.abort();
      }, this.timeout);

      const requestInit: RequestInit = {
        method: config.method,
        headers: {
          ...this.defaultHeaders,
          ...config.headers,
        },
        signal: controller.signal,
      };

      if (config.body) {
        requestInit.body = JSON.stringify(config.body);
      }

      const response = await fetch(url, requestInit);

      // Clear timeout immediately after response
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
        timeoutId = undefined;
      }

      const contentType = response.headers.get('content-type');
      const isJSON = contentType?.includes('application/json');

      if (!response.ok) {
        let body: unknown;
        try {
          body = isJSON ? await response.json() : await response.text();
        } catch {
          body = { error: 'Failed to parse error response' };
        }
        throw parseError(response.status, body, response.headers);
      }

      // Parse response based on content type
      if (isJSON) {
        const data = await response.json();
        return data as T;
      }

      // For non-JSON responses, return as text
      const text = await response.text();
      return text as T;
    } catch (error) {
      // Ensure timeout is always cleared
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }

      // Re-throw AnterosError instances directly
      if (error instanceof Error && error.constructor.name.includes('Error')) {
        // Check if already an AnterosError or our custom error
        if ('status' in error || 'code' in error) {
          throw error;
        }

        // Handle AbortError
        if (error.name === 'AbortError') {
          throw new TimeoutError(`Request timeout after ${this.timeout}ms`, this.timeout);
        }
        
        // Handle network errors
        if (
          error.message.toLowerCase().includes('fetch') ||
          error.message.toLowerCase().includes('network') ||
          error.message.toLowerCase().includes('failed to fetch') ||
          error.message.toLowerCase().includes('econnrefused') ||
          error.message.toLowerCase().includes('enotfound')
        ) {
          throw new NetworkError('Network request failed', error);
        }
      }

      throw error;
    }
  }

  /**
   * Build full URL with query parameters and validate
   */
  private buildURL(path: string, query?: Record<string, string | number | boolean>): string {
    // Validate path doesn't contain null bytes or other dangerous characters
    if (path.includes('\0') || path.includes('\r') || path.includes('\n')) {
      throw new Error('Invalid characters in request path');
    }

    let url: URL;
    try {
      // Handle both absolute and relative paths
      url = path.startsWith('http') ? new URL(path) : new URL(path, this.baseURL);
    } catch (error) {
      throw new Error(`Invalid URL: ${path}`);
    }

    if (query) {
      for (const [key, value] of Object.entries(query)) {
        // Validate query parameter keys
        if (!key || typeof key !== 'string') {
          throw new Error('Invalid query parameter key');
        }
        url.searchParams.set(key, String(value));
      }
    }

    return url.toString();
  }
}
