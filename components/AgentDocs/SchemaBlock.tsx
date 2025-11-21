/**
 * SchemaBlock Component
 * Collapsible JSON schema viewer for agent documentation
 * Dark theme, monospace, copy-to-clipboard
 */

import { useState } from 'react';
import { Copy, Check, ChevronDown, ChevronRight } from 'lucide-react';

interface SchemaBlockProps {
  title: string;
  schema: object | string;
  defaultOpen?: boolean;
  language?: 'json' | 'typescript' | 'python' | 'rust';
  description?: string;
}

export function SchemaBlock({ 
  title, 
  schema, 
  defaultOpen = false,
  language = 'json',
  description 
}: SchemaBlockProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [copied, setCopied] = useState(false);

  const schemaString = typeof schema === 'string' 
    ? schema 
    : JSON.stringify(schema, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(schemaString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="border border-zinc-800 rounded-lg overflow-hidden bg-zinc-900/30">
      {/* Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-zinc-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {isOpen ? (
            <ChevronDown className="w-4 h-4 text-zinc-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-zinc-400" />
          )}
          <div className="text-left">
            <h3 className="text-sm font-semibold text-white font-mono">{title}</h3>
            {description && (
              <p className="text-xs text-zinc-500 mt-0.5">{description}</p>
            )}
          </div>
        </div>
        <span className="text-xs text-zinc-500 uppercase tracking-wider">{language}</span>
      </button>

      {/* Schema Content */}
      {isOpen && (
        <div className="relative">
          <div className="absolute top-3 right-3 z-10">
            <button
              onClick={handleCopy}
              className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded text-xs text-white transition-colors flex items-center gap-1.5"
              aria-label="Copy schema to clipboard"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  Copy
                </>
              )}
            </button>
          </div>
          <pre className="bg-zinc-950 p-4 overflow-x-auto text-xs font-mono text-zinc-300 border-t border-zinc-800">
            <code>{schemaString}</code>
          </pre>
        </div>
      )}
    </div>
  );
}
