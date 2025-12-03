// @ts-nocheck - Example code with intentional type flexibility
/**
 * CSRF Protection Client-Side Example
 * Example implementation for using CSRF tokens in client applications
 * 
 * @module lib/security/csrf-client-example
 */

/**
 * CSRF Token Manager for Client-Side Applications
 * Handles fetching, storing, and including CSRF tokens in requests
 */
export class CsrfTokenManager {
  private token: string | null = null;
  private tokenExpiry: number | null = null;
  private readonly tokenEndpoint: string;
  private readonly headerName: string = 'x-csrf-token';
  
  constructor(tokenEndpoint: string = '/api/csrf') {
    this.tokenEndpoint = tokenEndpoint;
  }
  
  /**
   * Fetch CSRF token from server
   */
  async fetchToken(): Promise<string> {
    try {
      const response = await fetch(this.tokenEndpoint, {
        method: 'GET',
        credentials: 'include', // Include cookies
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch CSRF token: ${response.statusText}`);
      }
      
      const data = await response.json();
      this.token = data.csrfToken;
      this.tokenExpiry = Date.now() + (data.expiresIn * 1000);
      
      return this.token;
    } catch (error) {
      console.error('Error fetching CSRF token:', error);
      throw error;
    }
  }
  
  /**
   * Get current CSRF token, fetching a new one if needed
   */
  async getToken(): Promise<string> {
    // If token exists and hasn't expired, return it
    if (this.token && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.token;
    }
    
    // Otherwise, fetch a new token
    return this.fetchToken();
  }
  
  /**
   * Clear stored token (e.g., on logout)
   */
  clearToken(): void {
    this.token = null;
    this.tokenExpiry = null;
  }
  
  /**
   * Make a CSRF-protected request
   */
  async fetch(url: string, options: RequestInit = {}): Promise<Response> {
    const method = options.method?.toUpperCase() || 'GET';
    
    // Safe methods don't need CSRF token
    if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      return fetch(url, {
        ...options,
        credentials: 'include',
      });
    }
    
    // Get CSRF token for state-changing methods
    const token = await this.getToken();
    
    // Add CSRF token to headers
    const headers = new Headers(options.headers);
    headers.set(this.headerName, token);
    
    return fetch(url, {
      ...options,
      headers,
      credentials: 'include', // Include cookies
    });
  }
}

// =====================================================
// USAGE EXAMPLES
// =====================================================

/**
 * Example 1: Basic Usage
 */
export async function exampleBasicUsage() {
  const csrfManager = new CsrfTokenManager();
  
  // Make a protected POST request
  const response = await csrfManager.fetch('/api/endpoint', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ data: 'test' }),
  });
  
  const result = await response.json();
  console.log('Response:', result);
}

/**
 * Example 2: React Hook
 */
export function useCsrfToken() {
  const [csrfManager] = React.useState(() => new CsrfTokenManager());
  
  React.useEffect(() => {
    // Fetch token on mount
    csrfManager.fetchToken().catch(console.error);
    
    // Clear token on unmount (optional)
    return () => {
      csrfManager.clearToken();
    };
  }, [csrfManager]);
  
  return csrfManager;
}

/**
 * Example 3: Axios Interceptor
 */
import type { AxiosInstance, AxiosRequestConfig, AxiosError, AxiosResponse } from '../../types/lib.types';

export function setupAxiosCsrfInterceptor(axios: AxiosInstance) {
  const csrfManager = new CsrfTokenManager();
  
  // Request interceptor to add CSRF token
  axios.interceptors.request.use(
    async (config: AxiosRequestConfig) => {
      const method = config.method?.toUpperCase();
      
      // Add CSRF token for state-changing methods
      if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
        const token = await csrfManager.getToken();
        config.headers['x-csrf-token'] = token;
      }
      
      return config;
    },
    (error: AxiosError) => Promise.reject(error)
  );
  
  // Response interceptor to handle CSRF errors
  axios.interceptors.response.use(
    (response: AxiosResponse) => response,
    async (error: AxiosError) => {
      if (error.response?.status === 403 && 
          error.response?.data?.code === 'INVALID_CSRF_TOKEN') {
        // Token expired or invalid - fetch new token and retry
        csrfManager.clearToken();
        const token = await csrfManager.getToken();
        
        // Retry original request with new token
        error.config.headers['x-csrf-token'] = token;
        return axios.request(error.config);
      }
      
      return Promise.reject(error);
    }
  );
}

/**
 * Example 4: Fetch Wrapper
 */
export function createCsrfFetch() {
  const csrfManager = new CsrfTokenManager();
  
  return async function csrfFetch(
    url: string,
    options?: RequestInit
  ): Promise<Response> {
    return csrfManager.fetch(url, options);
  };
}

/**
 * Example 5: Form Submission
 */
export async function exampleFormSubmission() {
  const csrfManager = new CsrfTokenManager();
  
  // Get CSRF token
  const token = await csrfManager.getToken();
  
  // Add token to form
  const form = document.querySelector('form');
  if (form) {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = 'csrf_token';
    input.value = token;
    form.appendChild(input);
  }
  
  // Or include in fetch request
  const formData = new FormData(form!);
  const response = await csrfManager.fetch('/api/submit', {
    method: 'POST',
    body: formData,
  });
  
  return response.json();
}

/**
 * Example 6: Global Fetch Override (Advanced)
 */
export function setupGlobalCsrfProtection() {
  const csrfManager = new CsrfTokenManager();
  const originalFetch = window.fetch;
  
  // Override global fetch
  window.fetch = async function(
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    const url = typeof input === 'string' ? input : input.toString();
    
    // Only protect same-origin requests
    if (url.startsWith('/') || url.startsWith(window.location.origin)) {
      return csrfManager.fetch(url, init);
    }
    
    // Use original fetch for cross-origin requests
    return originalFetch(input, init);
  };
}

// =====================================================
// TYPESCRIPT DECLARATIONS
// =====================================================

declare global {
  namespace React {
    function useState<T>(initialState: T | (() => T)): [T, (value: T) => void];
    function useEffect(effect: () => void | (() => void), deps: unknown[]): void;
  }
}
