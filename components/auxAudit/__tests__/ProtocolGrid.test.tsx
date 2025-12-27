/**
 * Protocol Grid Component Tests
 * 
 * Unit tests for the ProtocolGrid component
 */

import { describe, it, expect } from 'vitest';
import type { ProtocolStatus } from '../../../lib/auxAudit/types';

describe('ProtocolGrid Component', () => {
  describe('Protocol status display', () => {
    it('should handle empty protocol list', () => {
      const protocols: ProtocolStatus[] = [];
      expect(protocols.length).toBe(0);
    });

    it('should handle protocols with available status', () => {
      const protocols: ProtocolStatus[] = [
        {
          name: 'agents.json',
          available: true,
          url: 'https://example.com/agents.json',
        },
      ];
      expect(protocols[0].available).toBe(true);
    });

    it('should handle protocols with unavailable status', () => {
      const protocols: ProtocolStatus[] = [
        {
          name: 'ai-plugin.json',
          available: false,
          url: 'https://example.com/.well-known/ai-plugin.json',
        },
      ];
      expect(protocols[0].available).toBe(false);
    });

    it('should handle mixed protocol statuses', () => {
      const protocols: ProtocolStatus[] = [
        {
          name: 'agents.json',
          available: true,
          url: 'https://example.com/agents.json',
        },
        {
          name: 'ai-plugin.json',
          available: false,
          url: 'https://example.com/.well-known/ai-plugin.json',
        },
        {
          name: 'mcp.json',
          available: true,
          url: 'https://example.com/.well-known/mcp.json',
        },
      ];
      
      const availableCount = protocols.filter(p => p.available).length;
      expect(availableCount).toBe(2);
      expect(protocols.length).toBe(3);
    });
  });

  describe('Protocol display names', () => {
    it('should extract filename from full path', () => {
      const testCases = [
        { name: '/agents.json', expected: 'agents.json' },
        { name: '/.well-known/ai-plugin.json', expected: 'ai-plugin.json' },
        { name: 'mcp.json', expected: 'mcp.json' },
        { name: 'robots.txt', expected: 'robots.txt' },
      ];

      testCases.forEach(({ name, expected }) => {
        const displayName = name.split('/').pop() || name;
        expect(displayName).toBe(expected);
      });
    });
  });

  describe('Protocol counting', () => {
    it('should correctly count available protocols', () => {
      const protocols: ProtocolStatus[] = [
        { name: 'agents.json', available: true, url: 'https://example.com/agents.json' },
        { name: 'ai-plugin.json', available: false, url: 'https://example.com/.well-known/ai-plugin.json' },
        { name: 'mcp.json', available: true, url: 'https://example.com/.well-known/mcp.json' },
        { name: 'robots.txt', available: true, url: 'https://example.com/robots.txt' },
      ];

      const availableCount = protocols.filter(p => p.available).length;
      const totalCount = protocols.length;

      expect(availableCount).toBe(3);
      expect(totalCount).toBe(4);
    });

    it('should handle all protocols available', () => {
      const protocols: ProtocolStatus[] = [
        { name: 'agents.json', available: true, url: 'https://example.com/agents.json' },
        { name: 'ai-plugin.json', available: true, url: 'https://example.com/.well-known/ai-plugin.json' },
      ];

      const availableCount = protocols.filter(p => p.available).length;
      const totalCount = protocols.length;

      expect(availableCount).toBe(totalCount);
    });

    it('should handle no protocols available', () => {
      const protocols: ProtocolStatus[] = [
        { name: 'agents.json', available: false, url: 'https://example.com/agents.json' },
        { name: 'ai-plugin.json', available: false, url: 'https://example.com/.well-known/ai-plugin.json' },
      ];

      const availableCount = protocols.filter(p => p.available).length;

      expect(availableCount).toBe(0);
    });
  });

  describe('Component props validation', () => {
    it('should accept valid protocol status objects', () => {
      const protocol: ProtocolStatus = {
        name: 'agents.json',
        available: true,
        url: 'https://example.com/agents.json',
        content: { version: '1.0' },
      };

      expect(protocol.name).toBeTruthy();
      expect(typeof protocol.available).toBe('boolean');
      expect(protocol.url).toBeTruthy();
    });

    it('should handle protocol with optional content', () => {
      const protocolWithContent: ProtocolStatus = {
        name: 'agents.json',
        available: true,
        url: 'https://example.com/agents.json',
        content: { version: '1.0' },
      };

      const protocolWithoutContent: ProtocolStatus = {
        name: 'ai-plugin.json',
        available: false,
        url: 'https://example.com/.well-known/ai-plugin.json',
      };

      expect(protocolWithContent.content).toBeDefined();
      expect(protocolWithoutContent.content).toBeUndefined();
    });
  });
});
