/**
 * Standalone test to isolate import issues
 */

import { describe, it, expect } from 'vitest';

describe('Standalone test', () => {
  it('should import maskSensitiveString', async () => {
    const { maskSensitiveString } = await import('../logger');
    
    const input = 'password: secret123';
    const masked = maskSensitiveString(input);
    
    expect(masked).not.toContain('secret123');
  });
});
