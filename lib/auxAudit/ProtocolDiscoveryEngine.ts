/**
 * Protocol Discovery Engine
 * 
 * Discovers agent-specific protocols and manifests on target websites.
 * Checks for agents.json, ai-plugin.json, mcp.json, and robots.txt directives.
 * 
 * Includes caching layer with 24-hour TTL to reduce redundant network requests.
 */

import { ProtocolStatus, RobotsTxtDirectives } from './types';
import { ProtocolCache } from './ProtocolCache';

/**
 * Engine for discovering agent-specific protocols on websites
 */
export class ProtocolDiscoveryEngine {
  private cache: ProtocolCache;
  
  constructor() {
    this.cache = new ProtocolCache();
  }
  /**
   * Discover all agent protocols available on a given URL
   * Uses cache with 24-hour TTL to reduce redundant network requests
   * 
   * @param url - The base URL to check for protocols
   * @returns Array of protocol statuses
   */
  async discoverProtocols(url: string): Promise<ProtocolStatus[]> {
    // Check cache first
    const cached = await this.cache.get(url);
    if (cached) {
      return cached;
    }
    
    // Cache miss - perform discovery
    const protocols = await this.performDiscovery(url);
    
    // Store in cache
    await this.cache.set(url, protocols);
    
    return protocols;
  }
  
  /**
   * Perform actual protocol discovery (bypasses cache)
   * 
   * @param url - The base URL to check for protocols
   * @returns Array of protocol statuses
   */
  private async performDiscovery(url: string): Promise<ProtocolStatus[]> {
    // Normalize URL to ensure it has a protocol
    const baseUrl = this.normalizeUrl(url);
    
    // Define all protocol paths to check
    const protocolPaths = [
      { name: 'agents.json', path: '/agents.json' },
      { name: 'ai-plugin.json', path: '/.well-known/ai-plugin.json' },
      { name: 'mcp.json', path: '/.well-known/mcp.json' }
    ];
    
    // Check all protocols in parallel
    const protocolChecks = protocolPaths.map(async ({ name, path }) => {
      try {
        const fullUrl = new URL(path, baseUrl).toString();
        const available = await this.checkManifest(baseUrl, path);
        
        return {
          name,
          available,
          url: fullUrl,
          content: available ? await this.fetchManifestContent(fullUrl) : undefined
        };
      } catch {
        // If there's an error checking this protocol, mark it as unavailable
        return {
          name,
          available: false,
          url: new URL(path, baseUrl).toString()
        };
      }
    });
    
    // Also check robots.txt for agent directives
    let robotsStatus: ProtocolStatus;
    try {
      const robotsDirectives = await this.parseRobotsTxt(baseUrl);
      robotsStatus = {
        name: 'robots.txt',
        available: robotsDirectives.allowsOAI || robotsDirectives.allowsCCBot,
        url: new URL('/robots.txt', baseUrl).toString(),
        content: robotsDirectives
      };
    } catch {
      robotsStatus = {
        name: 'robots.txt',
        available: false,
        url: new URL('/robots.txt', baseUrl).toString()
      };
    }
    
    const protocols = await Promise.all(protocolChecks);
    return [...protocols, robotsStatus];
  }
  
  /**
   * Check if a manifest file exists at the given path
   * 
   * @param url - Base URL
   * @param path - Path to the manifest file
   * @returns True if manifest exists and is accessible
   */
  async checkManifest(url: string, path: string): Promise<boolean> {
    try {
      const baseUrl = this.normalizeUrl(url);
      const fullUrl = new URL(path, baseUrl).toString();
      
      const response = await fetch(fullUrl, {
        method: 'HEAD',
        headers: {
          'User-Agent': 'AUX-Audit-Bot/1.0'
        },
        // Set a reasonable timeout
        signal: AbortSignal.timeout(5000)
      });
      
      // Consider 200 and 304 as success
      return response.ok || response.status === 304;
    } catch {
      // Network errors, timeouts, or other issues mean manifest is not available
      return false;
    }
  }
  
  /**
   * Parse robots.txt and check for agent-specific directives
   * 
   * @param url - Base URL
   * @returns Parsed robots.txt directives
   */
  async parseRobotsTxt(url: string): Promise<RobotsTxtDirectives> {
    try {
      const baseUrl = this.normalizeUrl(url);
      const robotsUrl = new URL('/robots.txt', baseUrl).toString();
      
      const response = await fetch(robotsUrl, {
        headers: {
          'User-Agent': 'AUX-Audit-Bot/1.0'
        },
        signal: AbortSignal.timeout(5000)
      });
      
      if (!response.ok) {
        // If robots.txt doesn't exist, assume all agents are allowed
        return {
          allowsOAI: true,
          allowsCCBot: true,
          directives: []
        };
      }
      
      const content = await response.text();
      const lines = content.split('\n').map(line => line.trim());
      
      let allowsOAI = true;  // Default to allowed
      let allowsCCBot = true;  // Default to allowed
      const directives: string[] = [];
      
      let currentUserAgent: string | null = null;
      
      for (const line of lines) {
        // Skip comments and empty lines
        if (line.startsWith('#') || line === '') {
          continue;
        }
        
        // Parse User-agent directive
        if (line.toLowerCase().startsWith('user-agent:')) {
          currentUserAgent = line.substring(11).trim().toLowerCase();
          directives.push(line);
        }
        // Parse Disallow directive
        else if (line.toLowerCase().startsWith('disallow:') && currentUserAgent) {
          const disallowPath = line.substring(9).trim();
          directives.push(line);
          
          // Check if this applies to our target agents
          if (currentUserAgent === 'oai-searchbot' || currentUserAgent === '*') {
            if (disallowPath === '/' || disallowPath === '') {
              allowsOAI = false;
            }
          }
          
          if (currentUserAgent === 'ccbot' || currentUserAgent === '*') {
            if (disallowPath === '/' || disallowPath === '') {
              allowsCCBot = false;
            }
          }
        }
        // Parse Allow directive (overrides Disallow)
        else if (line.toLowerCase().startsWith('allow:') && currentUserAgent) {
          const allowPath = line.substring(6).trim();
          directives.push(line);
          
          // Check if this applies to our target agents
          if (currentUserAgent === 'oai-searchbot') {
            if (allowPath === '/' || allowPath === '') {
              allowsOAI = true;
            }
          }
          
          if (currentUserAgent === 'ccbot') {
            if (allowPath === '/' || allowPath === '') {
              allowsCCBot = true;
            }
          }
        }
      }
      
      return {
        allowsOAI,
        allowsCCBot,
        directives
      };
    } catch {
      // If we can't fetch robots.txt, assume all agents are allowed
      return {
        allowsOAI: true,
        allowsCCBot: true,
        directives: []
      };
    }
  }
  
  /**
   * Normalize a URL to ensure it has a protocol
   * 
   * @param url - URL to normalize
   * @returns Normalized URL string
   */
  private normalizeUrl(url: string): string {
    // If URL doesn't start with http:// or https://, add https://
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return `https://${url}`;
    }
    return url;
  }
  
  /**
   * Fetch and parse manifest content
   * 
   * @param url - Full URL to the manifest
   * @returns Parsed JSON content or undefined
   */
  private async fetchManifestContent(url: string): Promise<any> {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'AUX-Audit-Bot/1.0'
        },
        signal: AbortSignal.timeout(5000)
      });
      
      if (!response.ok) {
        return undefined;
      }
      
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }
      
      return undefined;
    } catch {
      return undefined;
    }
  }
}
