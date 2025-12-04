/**
 * RawDataView Component
 * 
 * Displays the complete audit result as formatted JSON with advanced features.
 * 
 * Features:
 * - Formatted JSON display with proper indentation
 * - Syntax highlighting using CSS classes
 * - Copy to clipboard functionality
 * - Expand/collapse sections for better navigation
 * - Scrollable container with max height
 * - Search/filter capability (future enhancement)
 * 
 * Requirements:
 * - JSON display: Full audit result with formatting
 * - Usability: Copy button, expand/collapse, syntax highlighting
 * 
 * Usage:
 * ```tsx
 * <RawDataView result={auditResult} />
 * ```
 */

import { useState, useMemo } from 'react';
import { 
  FileJson, 
  Copy, 
  Check,
  ChevronDown,
  ChevronRight,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import type { AuditResult } from '../../../../../utils/geoAuditEnhanced';

interface RawDataViewProps {
  /** Complete audit result data */
  result: AuditResult;
}

export function RawDataView({ result }: RawDataViewProps) {
  const [copied, setCopied] = useState(false);
  const [expandedSections, setExpandedSections] = useState(() => new Set(['root']));
  const [viewMode, setViewMode] = useState<'formatted' | 'compact'>('formatted');

  // Memoize JSON string to avoid re-computation
  const jsonString = useMemo(() => {
    return JSON.stringify(result, null, 2);
  }, [result]);

  const compactJsonString = useMemo(() => {
    return JSON.stringify(result);
  }, [result]);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(jsonString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const toggleSection = (section: string) => {
    const next = new Set(expandedSections);
    if (next.has(section)) {
      next.delete(section);
    } else {
      next.add(section);
    }
    setExpandedSections(next);
  };

  const expandAll = () => {
    const allSections = new Set([
      'root',
      'scores',
      'details',
      'details.schemaMarkup',
      'details.contentQuality',
      'details.citationPotential',
      'details.linkAnalysis',
      'details.performance',
      'details.structure',
      'details.aiCrawlers',
      'details.eeat',
      'details.technicalSEO',
      'details.aidAgent',
      'insights',
      'recommendations',
      'knowledgeGraph',
    ]);
    setExpandedSections(allSections);
  };

  const collapseAll = () => {
    setExpandedSections(new Set(['root']));
  };

  return (
    <div className="bg-black/20 border border-slate-800/50 rounded overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/50 bg-black/30">
        <div className="flex items-center gap-2">
          <FileJson className="w-4 h-4 text-blue-400" />
          <h3 className="text-xs font-mono text-slate-300 uppercase tracking-wider">
            Complete Audit Result (JSON)
          </h3>
        </div>
        
        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <button
            onClick={() => setViewMode(viewMode === 'formatted' ? 'compact' : 'formatted')}
            className="text-xs font-mono uppercase tracking-wider px-3 py-1.5 rounded border transition-all text-slate-400 border-slate-700/50 hover:text-slate-300 hover:border-slate-600/50 hover:bg-black/30"
            title={viewMode === 'formatted' ? 'Switch to compact view' : 'Switch to formatted view'}
          >
            {viewMode === 'formatted' ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          {/* Expand/Collapse All */}
          {viewMode === 'formatted' && (
            <>
              <button
                onClick={expandAll}
                className="text-xs font-mono uppercase tracking-wider px-3 py-1.5 rounded border transition-all text-slate-400 border-slate-700/50 hover:text-slate-300 hover:border-slate-600/50 hover:bg-black/30"
                title="Expand all sections"
              >
                Expand All
              </button>
              <button
                onClick={collapseAll}
                className="text-xs font-mono uppercase tracking-wider px-3 py-1.5 rounded border transition-all text-slate-400 border-slate-700/50 hover:text-slate-300 hover:border-slate-600/50 hover:bg-black/30"
                title="Collapse all sections"
              >
                Collapse All
              </button>
            </>
          )}

          {/* Copy Button */}
          <button
            onClick={copyToClipboard}
            className={`
              text-xs font-mono uppercase tracking-wider px-3 py-1.5 rounded border transition-all flex items-center gap-2
              ${copied
                ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
                : 'text-slate-400 border-slate-700/50 hover:text-slate-300 hover:border-slate-600/50 hover:bg-black/30'
              }
            `}
            title="Copy JSON to clipboard"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* JSON Content */}
      <div className="p-4 overflow-x-auto max-h-[600px] overflow-y-auto bg-slate-950/50">
        {viewMode === 'compact' ? (
          <pre className="text-xs text-slate-300 font-mono leading-relaxed">
            {compactJsonString}
          </pre>
        ) : (
          <CollapsibleJSON 
            data={result} 
            expandedSections={expandedSections}
            toggleSection={toggleSection}
            path="root"
          />
        )}
      </div>

      {/* Footer Info */}
      <div className="px-4 py-2 border-t border-slate-800/50 bg-black/30 flex items-center justify-between">
        <div className="text-[10px] font-mono text-slate-500">
          Size: {(jsonString.length / 1024).toFixed(2)} KB
        </div>
        <div className="text-[10px] font-mono text-slate-500">
          {Object.keys(result).length} top-level properties
        </div>
      </div>
    </div>
  );
}

/**
 * CollapsibleJSON Component
 * 
 * Renders JSON with collapsible sections and syntax highlighting.
 */
interface CollapsibleJSONProps {
  data: unknown;
  expandedSections: Set<string>;
  toggleSection: (section: string) => void;
  path: string;
  level?: number;
}

function CollapsibleJSON({ 
  data, 
  expandedSections, 
  toggleSection, 
  path,
  level = 0,
}: CollapsibleJSONProps) {
  const indent = '  '.repeat(level);
  const isExpanded = expandedSections.has(path);

  // Handle null
  if (data === null) {
    return <span className="text-purple-400">null</span>;
  }

  // Handle undefined
  if (data === undefined) {
    return <span className="text-purple-400">undefined</span>;
  }

  // Handle primitives
  if (typeof data === 'string') {
    return <span className="text-emerald-400">"{data}"</span>;
  }

  if (typeof data === 'number') {
    return <span className="text-blue-400">{data}</span>;
  }

  if (typeof data === 'boolean') {
    return <span className="text-purple-400">{data.toString()}</span>;
  }

  // Handle arrays
  if (Array.isArray(data)) {
    if (data.length === 0) {
      return <span className="text-slate-400">[]</span>;
    }

    return (
      <div className="inline">
        <button
          onClick={() => toggleSection(path)}
          className="inline-flex items-center gap-1 hover:bg-slate-800/30 rounded px-1 -ml-1 transition-colors"
        >
          {isExpanded ? (
            <ChevronDown className="w-3 h-3 text-slate-500" />
          ) : (
            <ChevronRight className="w-3 h-3 text-slate-500" />
          )}
          <span className="text-slate-400">[</span>
          {!isExpanded && (
            <span className="text-slate-600 text-[10px]">{data.length} items</span>
          )}
        </button>
        
        {isExpanded && (
          <>
            <div className="ml-4">
              {data.map((item, index) => (
                <div key={index} className="leading-relaxed">
                  <span className="text-slate-600">{indent}  </span>
                  <CollapsibleJSON
                    data={item}
                    expandedSections={expandedSections}
                    toggleSection={toggleSection}
                    path={`${path}[${index}]`}
                    level={level + 1}
                  />
                  {index < data.length - 1 && <span className="text-slate-400">,</span>}
                </div>
              ))}
            </div>
            <div>
              <span className="text-slate-600">{indent}</span>
              <span className="text-slate-400">]</span>
            </div>
          </>
        )}
        
        {!isExpanded && <span className="text-slate-400">]</span>}
      </div>
    );
  }

  // Handle objects
  if (typeof data === 'object') {
    const entries = Object.entries(data);
    
    if (entries.length === 0) {
      return <span className="text-slate-400">{'{}'}</span>;
    }

    return (
      <div className="inline">
        <button
          onClick={() => toggleSection(path)}
          className="inline-flex items-center gap-1 hover:bg-slate-800/30 rounded px-1 -ml-1 transition-colors"
        >
          {isExpanded ? (
            <ChevronDown className="w-3 h-3 text-slate-500" />
          ) : (
            <ChevronRight className="w-3 h-3 text-slate-500" />
          )}
          <span className="text-slate-400">{'{'}</span>
          {!isExpanded && (
            <span className="text-slate-600 text-[10px]">{entries.length} properties</span>
          )}
        </button>
        
        {isExpanded && (
          <>
            <div className="ml-4">
              {entries.map(([key, value], index) => (
                <div key={key} className="leading-relaxed">
                  <span className="text-slate-600">{indent}  </span>
                  <span className="text-yellow-400">"{key}"</span>
                  <span className="text-slate-400">: </span>
                  <CollapsibleJSON
                    data={value}
                    expandedSections={expandedSections}
                    toggleSection={toggleSection}
                    path={`${path}.${key}`}
                    level={level + 1}
                  />
                  {index < entries.length - 1 && <span className="text-slate-400">,</span>}
                </div>
              ))}
            </div>
            <div>
              <span className="text-slate-600">{indent}</span>
              <span className="text-slate-400">{'}'}</span>
            </div>
          </>
        )}
        
        {!isExpanded && <span className="text-slate-400">{'}'}</span>}
      </div>
    );
  }

  // Fallback
  return <span className="text-slate-400">{String(data)}</span>;
}
