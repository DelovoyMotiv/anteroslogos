/**
 * Protocol Grid Component
 * 
 * Displays a grid of agent-specific protocol statuses with visual indicators.
 * Shows which protocols (agents.json, ai-plugin.json, mcp.json, robots.txt) 
 * are available on the target website.
 * 
 * Requirements: 9.2
 */

import React from 'react';
import { CheckCircle, XCircle, FileJson, FileText, ExternalLink } from 'lucide-react';
import type { ProtocolGridProps } from '../../lib/auxAudit/types';

/**
 * Get icon for protocol based on name
 */
function getProtocolIcon(name: string): typeof FileJson {
  if (name.includes('robots.txt')) {
    return FileText;
  }
  return FileJson;
}

/**
 * Get display name for protocol
 */
function getProtocolDisplayName(name: string): string {
  // Extract just the filename from the full path
  const filename = name.split('/').pop() || name;
  return filename;
}

/**
 * Get description for protocol
 */
function getProtocolDescription(name: string): string {
  if (name.includes('agents.json')) {
    return 'Agent-specific configuration and capabilities';
  }
  if (name.includes('ai-plugin.json')) {
    return 'OpenAI plugin manifest for agent integration';
  }
  if (name.includes('mcp.json')) {
    return 'Model Context Protocol configuration';
  }
  if (name.includes('robots.txt')) {
    return 'Crawler directives for AI agents';
  }
  return 'Agent protocol configuration';
}

export default function ProtocolGrid({ protocols }: ProtocolGridProps) {
  const availableCount = protocols.filter(p => p.available).length;
  const totalCount = protocols.length;

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xl font-bold flex items-center gap-2 text-slate-100">
          <FileJson className="w-5 h-5 text-blue-400" />
          Agent Protocols
        </h3>
        <span className="text-sm text-slate-400">
          {availableCount} of {totalCount} available
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {protocols.map((protocol) => {
          const Icon = getProtocolIcon(protocol.name);
          const displayName = getProtocolDisplayName(protocol.name);
          const description = getProtocolDescription(protocol.name);
          const StatusIcon = protocol.available ? CheckCircle : XCircle;
          const statusColor = protocol.available 
            ? 'text-green-400 bg-green-500/20 border-green-500/30' 
            : 'text-red-400 bg-red-500/20 border-red-500/30';
          const statusText = protocol.available ? 'Available' : 'Not Found';

          return (
            <div
              key={protocol.name}
              className={`p-4 bg-gradient-to-br from-slate-900/80 to-slate-900/40 border rounded-lg ${
                protocol.available ? 'border-green-500/30' : 'border-slate-700'
              }`}
            >
              {/* Header with icon and status */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Icon className="w-5 h-5 text-slate-400" />
                  <h4 className="font-semibold text-slate-200">
                    {displayName}
                  </h4>
                </div>
                <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-full ${statusColor}`}>
                  <StatusIcon className="w-3 h-3" />
                  {statusText}
                </span>
              </div>

              {/* Description */}
              <p className="text-xs text-slate-400 mb-3 leading-relaxed">
                {description}
              </p>

              {/* URL */}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500 font-mono truncate flex-1">
                  {protocol.url}
                </span>
                {protocol.available && (
                  <a
                    href={protocol.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 transition-colors flex-shrink-0"
                    title="View protocol file"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary footer */}
      <div className="mt-4 p-3 bg-slate-900/40 border border-slate-700 rounded-lg">
        <p className="text-xs text-slate-500 leading-snug">
          {availableCount === totalCount ? (
            <>
              <span className="text-green-400 font-semibold">Excellent!</span> All agent protocols are available. 
              Your site is well-configured for autonomous agent discovery.
            </>
          ) : availableCount > 0 ? (
            <>
              <span className="text-yellow-400 font-semibold">Partial support.</span> Some agent protocols are available. 
              Consider adding missing protocols to improve agent discoverability.
            </>
          ) : (
            <>
              <span className="text-red-400 font-semibold">No protocols found.</span> Add agent-specific manifests 
              to help autonomous agents understand your site's capabilities.
            </>
          )}
        </p>
      </div>
    </div>
  );
}
