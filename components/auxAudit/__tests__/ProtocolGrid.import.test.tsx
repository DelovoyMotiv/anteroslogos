/**
 * Protocol Grid Import Test
 * 
 * Verify the component can be imported correctly
 */

import { describe, it, expect } from 'vitest';
import ProtocolGrid from '../ProtocolGrid';
import { ProtocolGrid as ProtocolGridFromIndex } from '../index';

describe('ProtocolGrid Import', () => {
  it('should be importable from direct path', () => {
    expect(ProtocolGrid).toBeDefined();
    expect(typeof ProtocolGrid).toBe('function');
  });

  it('should be importable from index', () => {
    expect(ProtocolGridFromIndex).toBeDefined();
    expect(typeof ProtocolGridFromIndex).toBe('function');
  });

  it('should be the same component from both imports', () => {
    expect(ProtocolGrid).toBe(ProtocolGridFromIndex);
  });
});
