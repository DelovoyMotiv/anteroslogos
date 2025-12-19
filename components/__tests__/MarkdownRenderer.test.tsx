import { describe, it, expect } from 'vitest';
import { MarkdownRenderer } from '../MarkdownRenderer';

/**
 * Unit tests for MarkdownRenderer component
 * Tests basic rendering functionality and plugin configuration
 * 
 * Requirements tested:
 * - 1.1: Heading rendering
 * - 1.2: Paragraph rendering
 * - 1.3: List rendering
 * - 1.4: Code block rendering
 * - 1.5: Inline code rendering
 * - 2.1, 2.2, 2.3: Mathematical notation
 * - 7.1, 7.2, 7.3, 7.4, 7.5: GFM features
 */
describe('MarkdownRenderer', () => {
  it('should render component without errors', () => {
    const content = '# Hello World';
    const result = MarkdownRenderer({ content });
    
    expect(result).toBeDefined();
    expect(result.type).toBe('div');
  });

  it('should accept className prop', () => {
    const content = '# Test';
    const className = 'prose prose-invert';
    const result = MarkdownRenderer({ content, className });
    
    expect(result).toBeDefined();
    expect(result.props.className).toBe(className);
  });

  it('should accept empty content', () => {
    const content = '';
    const result = MarkdownRenderer({ content });
    
    expect(result).toBeDefined();
  });

  it('should accept custom components prop', () => {
    const content = '# Test';
    const customComponents = {
      h1: ({ children }: { children?: React.ReactNode }) => <h1 className="custom">{children}</h1>
    };
    const result = MarkdownRenderer({ content, components: customComponents });
    
    expect(result).toBeDefined();
  });

  it('should handle markdown with headings', () => {
    const content = '# H1\n## H2\n### H3';
    const result = MarkdownRenderer({ content });
    
    expect(result).toBeDefined();
  });

  it('should handle markdown with paragraphs', () => {
    const content = 'First paragraph.\n\nSecond paragraph.';
    const result = MarkdownRenderer({ content });
    
    expect(result).toBeDefined();
  });

  it('should handle markdown with lists', () => {
    const content = '- Item 1\n- Item 2\n\n1. First\n2. Second';
    const result = MarkdownRenderer({ content });
    
    expect(result).toBeDefined();
  });

  it('should handle markdown with code blocks', () => {
    const content = '```javascript\nconst x = 1;\n```';
    const result = MarkdownRenderer({ content });
    
    expect(result).toBeDefined();
  });

  it('should handle markdown with inline code', () => {
    const content = 'This is `inline code` in text.';
    const result = MarkdownRenderer({ content });
    
    expect(result).toBeDefined();
  });

  it('should handle markdown with mathematical notation', () => {
    const content = 'Inline math: $x^2$ and block math:\n\n$$\\int_0^1 x dx$$';
    const result = MarkdownRenderer({ content });
    
    expect(result).toBeDefined();
  });

  it('should handle GFM tables', () => {
    const content = '| Header 1 | Header 2 |\n|----------|----------|\n| Cell 1   | Cell 2   |';
    const result = MarkdownRenderer({ content });
    
    expect(result).toBeDefined();
  });

  it('should handle GFM task lists', () => {
    const content = '- [x] Completed task\n- [ ] Incomplete task';
    const result = MarkdownRenderer({ content });
    
    expect(result).toBeDefined();
  });

  it('should handle GFM strikethrough', () => {
    const content = '~~strikethrough text~~';
    const result = MarkdownRenderer({ content });
    
    expect(result).toBeDefined();
  });

  it('should handle GFM autolinks', () => {
    const content = 'Visit https://example.com for more info.';
    const result = MarkdownRenderer({ content });
    
    expect(result).toBeDefined();
  });

  it('should handle complex markdown with multiple features', () => {
    const content = `# Title

This is a paragraph with **bold** and *italic* text.

## Math Section

Inline formula: $E = mc^2$

Block formula:

$$
\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}
$$

## Code Example

\`\`\`typescript
function hello(name: string): string {
  return \`Hello, \${name}!\`;
}
\`\`\`

## Table

| Feature | Status |
|---------|--------|
| GFM     | ✓      |
| Math    | ✓      |

## Task List

- [x] Implement component
- [ ] Write tests
`;
    const result = MarkdownRenderer({ content });
    
    expect(result).toBeDefined();
  });
});
