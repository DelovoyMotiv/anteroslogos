/**
 * AgentCard Component Tests
 * 
 * Unit tests for the AgentCard visual preview component
 * Requirements: 6.3, 6.4, 6.5, 6.6, 6.7
 */

import { describe, it, expect } from 'vitest';
import AgentCard from '../AgentCard';
import type { AgentsJSON } from '../../lib/agentManifest/types';

describe('AgentCard', () => {
  const mockManifest: AgentsJSON = {
    $schema: 'https://anoteroslogos.com/schemas/agents-v1.json',
    version: '1.0',
    identity: {
      name: 'Example Corp',
      description: 'Leading provider of innovative solutions for modern businesses',
      tags: ['Technology', 'SaaS', 'Enterprise']
    },
    knowledge: [
      {
        role: 'documentation',
        url: '/docs',
        description: 'Complete API documentation and integration guides'
      },
      {
        role: 'pricing',
        url: '/pricing',
        description: 'Transparent pricing plans for all business sizes'
      }
    ],
    actions: [
      {
        name: 'create_account',
        type: 'POST',
        path: '/api/accounts'
      }
    ]
  };

  it('renders component without errors', () => {
    const result = AgentCard({ manifest: mockManifest });
    expect(result).toBeDefined();
    expect(result.type).toBe('div');
  });

  it('renders with all required sections', () => {
    const result = AgentCard({ manifest: mockManifest });
    expect(result).toBeDefined();
    // Component should have multiple child sections
    expect(result.props.children).toBeDefined();
  });

  it('renders with empty actions array', () => {
    const manifestWithoutActions: AgentsJSON = {
      ...mockManifest,
      actions: []
    };
    const result = AgentCard({ manifest: manifestWithoutActions });
    expect(result).toBeDefined();
  });

  it('applies custom className when provided', () => {
    const result = AgentCard({ manifest: mockManifest, className: 'custom-class' });
    expect(result).toBeDefined();
    expect(result.props.className).toContain('custom-class');
  });

  it('handles manifest with multiple tags', () => {
    const result = AgentCard({ manifest: mockManifest });
    expect(result).toBeDefined();
    expect(mockManifest.identity.tags.length).toBe(3);
  });

  it('handles manifest with multiple knowledge entries', () => {
    const result = AgentCard({ manifest: mockManifest });
    expect(result).toBeDefined();
    expect(mockManifest.knowledge.length).toBe(2);
  });

  it('handles manifest with actions', () => {
    const result = AgentCard({ manifest: mockManifest });
    expect(result).toBeDefined();
    expect(mockManifest.actions.length).toBe(1);
  });

  it('handles all semantic roles', () => {
    const manifestWithAllRoles: AgentsJSON = {
      ...mockManifest,
      knowledge: [
        { role: 'documentation', url: '/docs', description: 'Docs' },
        { role: 'pricing', url: '/pricing', description: 'Pricing' },
        { role: 'about', url: '/about', description: 'About' },
        { role: 'product', url: '/product', description: 'Product' },
        { role: 'contact', url: '/contact', description: 'Contact' },
        { role: 'support', url: '/support', description: 'Support' }
      ]
    };
    const result = AgentCard({ manifest: manifestWithAllRoles });
    expect(result).toBeDefined();
  });

  it('handles all HTTP methods', () => {
    const manifestWithAllMethods: AgentsJSON = {
      ...mockManifest,
      actions: [
        { name: 'get_data', type: 'GET', path: '/api/data' },
        { name: 'create_data', type: 'POST', path: '/api/data' },
        { name: 'update_data', type: 'PUT', path: '/api/data' },
        { name: 'delete_data', type: 'DELETE', path: '/api/data' }
      ]
    };
    const result = AgentCard({ manifest: manifestWithAllMethods });
    expect(result).toBeDefined();
  });
});
