/**
 * CodeSample Component
 * Multi-language tabbed code viewer for integration examples
 * Supports TypeScript, Python, Rust with syntax-aware display
 */

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export type Language = 'typescript' | 'python' | 'rust' | 'bash' | 'json';

export interface CodeSampleProps {
  title?: string;
  samples: {
    language: Language;
    code: string;
    label?: string;
  }[];
  defaultLanguage?: Language;
}

const LANGUAGE_LABELS: Record<Language, string> = {
  typescript: 'TypeScript',
  python: 'Python',
  rust: 'Rust',
  bash: 'cURL',
  json: 'JSON',
};

export function CodeSample({ title, samples, defaultLanguage }: CodeSampleProps) {
  const [activeLanguage, setActiveLanguage] = useState<Language>(
    defaultLanguage || samples[0]?.language || 'typescript'
  );
  const [copied, setCopied] = useState(false);

  const activeSample = samples.find(s => s.language === activeLanguage) || samples[0];

  const handleCopy = () => {
    navigator.clipboard.writeText(activeSample.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="border border-zinc-800 rounded-lg overflow-hidden bg-zinc-900/30">
      {/* Header with tabs */}
      <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900/50">
        <div className="flex items-center">
          {title && (
            <span className="px-4 py-2 text-sm font-medium text-zinc-400">
              {title}
            </span>
          )}
          <div className="flex items-center gap-1 px-2">
            {samples.map((sample) => (
              <button
                key={sample.language}
                onClick={() => setActiveLanguage(sample.language)}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                  activeLanguage === sample.language
                    ? 'bg-zinc-800 text-white'
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
                }`}
              >
                {sample.label || LANGUAGE_LABELS[sample.language]}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={handleCopy}
          className="mr-3 px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded text-xs text-white transition-colors flex items-center gap-1.5"
          aria-label="Copy code to clipboard"
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

      {/* Code block */}
      <pre className="bg-zinc-950 p-4 overflow-x-auto text-xs font-mono text-zinc-300">
        <code>{activeSample.code}</code>
      </pre>
    </div>
  );
}
