import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import type { Components } from 'react-markdown';

interface MarkdownRendererProps {
  content: string;
  className?: string;
  components?: Partial<Components>;
}

/**
 * Shared Markdown renderer component with support for:
 * - GitHub Flavored Markdown (tables, task lists, strikethrough, autolinks)
 * - Mathematical notation (LaTeX via KaTeX)
 * - Consistent typography styling
 * 
 * @param content - Markdown content to render
 * @param className - Additional CSS classes to apply (applied to wrapper div)
 * @param components - Custom component overrides for ReactMarkdown
 */
function MarkdownRenderer({ 
  content, 
  className = '', 
  components 
}: MarkdownRendererProps) {
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

export { MarkdownRenderer };
export default MarkdownRenderer;
