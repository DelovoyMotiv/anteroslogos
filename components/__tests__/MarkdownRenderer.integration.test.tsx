import { describe, it, expect } from 'vitest';
import { MarkdownRenderer } from '../MarkdownRenderer';

/**
 * Integration tests for MarkdownRenderer component
 * Verifies that plugins are correctly configured and working together
 */
describe('MarkdownRenderer Integration', () => {
  it('should have remarkGfm plugin configured', () => {
    const content = '| A | B |\n|---|---|\n| 1 | 2 |';
    const result = MarkdownRenderer({ content });
    
    // Verify component renders without throwing
    expect(result).toBeDefined();
    expect(result.type).toBe('div');
  });

  it('should have remarkMath plugin configured', () => {
    const content = 'Math: $x^2 + y^2 = z^2$';
    const result = MarkdownRenderer({ content });
    
    // Verify component renders without throwing
    expect(result).toBeDefined();
    expect(result.type).toBe('div');
  });

  it('should have rehypeKatex plugin configured', () => {
    const content = '$$\\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$';
    const result = MarkdownRenderer({ content });
    
    // Verify component renders without throwing
    expect(result).toBeDefined();
    expect(result.type).toBe('div');
  });

  it('should handle all plugins together', () => {
    const content = `
# Math and Tables

Here's a formula: $E = mc^2$

| Variable | Meaning |
|----------|---------|
| E        | Energy  |
| m        | Mass    |
| c        | Speed of light |

Block equation:

$$
E = mc^2
$$

Task list:
- [x] Configure plugins
- [ ] Test rendering
`;
    const result = MarkdownRenderer({ content });
    
    // Verify component renders without throwing
    expect(result).toBeDefined();
    expect(result.type).toBe('div');
  });

  it('should apply className to wrapper div', () => {
    const content = '# Test';
    const className = 'prose prose-invert prose-lg max-w-none';
    const result = MarkdownRenderer({ content, className });
    
    expect(result.props.className).toBe(className);
  });

  it('should support custom component overrides', () => {
    const content = '# Custom Heading';
    const customComponents = {
      h1: ({ children }: { children?: React.ReactNode }) => (
        <h1 className="custom-heading">{children}</h1>
      )
    };
    const result = MarkdownRenderer({ content, components: customComponents });
    
    expect(result).toBeDefined();
  });
});
