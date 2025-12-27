/**
 * AgentCard Component
 * 
 * Visual preview of an agents.json manifest in a user-friendly card format.
 * Displays brand identity, tags, description, knowledge entries, and actions.
 * 
 * Features:
 * - Brand name as header
 * - Tags as styled badges
 * - Description text in body
 * - Knowledge entries as list with icons
 * - Actions display (if present)
 * - Follows platform design system (brutalist, technical aesthetic)
 * 
 * Requirements: 6.3, 6.4, 6.5, 6.6, 6.7
 */

import { 
  FileText, 
  DollarSign, 
  Info, 
  Package, 
  Mail, 
  HelpCircle,
  ExternalLink,
  Zap
} from 'lucide-react';
import type { AgentsJSON, WebSemanticRole } from '../lib/agentManifest/types';

interface AgentCardProps {
  manifest: AgentsJSON;
  className?: string;
}

/**
 * Get icon component for a semantic role
 */
function getRoleIcon(role: WebSemanticRole): React.ReactNode {
  const iconClass = "w-4 h-4 flex-shrink-0";
  
  switch (role) {
    case 'documentation':
      return <FileText className={iconClass} />;
    case 'pricing':
      return <DollarSign className={iconClass} />;
    case 'about':
      return <Info className={iconClass} />;
    case 'product':
      return <Package className={iconClass} />;
    case 'contact':
      return <Mail className={iconClass} />;
    case 'support':
      return <HelpCircle className={iconClass} />;
    default:
      return <FileText className={iconClass} />;
  }
}

/**
 * Get color classes for HTTP method badges
 */
function getMethodColor(method: string): string {
  switch (method) {
    case 'GET':
      return 'text-green-400 border-green-900 bg-green-950/30';
    case 'POST':
      return 'text-blue-400 border-blue-900 bg-blue-950/30';
    case 'PUT':
      return 'text-yellow-400 border-yellow-900 bg-yellow-950/30';
    case 'DELETE':
      return 'text-red-400 border-red-900 bg-red-950/30';
    default:
      return 'text-slate-400 border-slate-900 bg-slate-950/30';
  }
}

export default function AgentCard({ manifest, className = '' }: AgentCardProps) {
  return (
    <div className={`bg-slate-950 border border-slate-800 ${className}`}>
      {/* Header - Brand Name */}
      <div className="border-b border-slate-800 p-4 sm:p-6">
        <h2 className="text-2xl sm:text-3xl font-mono font-bold text-white mb-3">
          {manifest.identity.name}
        </h2>
        
        {/* Tags as Badges */}
        <div className="flex flex-wrap gap-2">
          {manifest.identity.tags.map((tag, index) => (
            <span
              key={index}
              className="px-2 sm:px-3 py-1 border border-slate-700 bg-slate-900/50 font-mono text-[10px] sm:text-xs text-slate-300 uppercase tracking-wider"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Body - Description */}
      <div className="p-4 sm:p-6 border-b border-slate-800">
        <p className="text-sm sm:text-base font-mono text-slate-400 leading-relaxed">
          {manifest.identity.description}
        </p>
      </div>

      {/* Knowledge Entries */}
      <div className="p-4 sm:p-6 border-b border-slate-800">
        <h3 className="text-xs sm:text-sm font-mono font-bold text-slate-500 uppercase tracking-wider mb-4">
          Knowledge Entries
        </h3>
        <div className="space-y-3">
          {manifest.knowledge.map((entry, index) => (
            <div
              key={index}
              className="flex items-start gap-3 p-3 bg-slate-900/30 border border-slate-800/50 hover:border-slate-700 transition-colors"
            >
              {/* Icon */}
              <div className="text-slate-500 mt-0.5">
                {getRoleIcon(entry.role)}
              </div>
              
              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs text-slate-400 uppercase">
                    {entry.role}
                  </span>
                  <ExternalLink className="w-3 h-3 text-slate-600" />
                </div>
                <p className="text-xs sm:text-sm font-mono text-slate-300 mb-1">
                  {entry.url}
                </p>
                <p className="text-[10px] sm:text-xs text-slate-500 leading-relaxed">
                  {entry.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions (if present) */}
      {manifest.actions && manifest.actions.length > 0 && (
        <div className="p-4 sm:p-6">
          <h3 className="text-xs sm:text-sm font-mono font-bold text-slate-500 uppercase tracking-wider mb-4">
            Available Actions
          </h3>
          <div className="space-y-2">
            {manifest.actions.map((action, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 bg-slate-900/30 border border-slate-800/50"
              >
                {/* Icon */}
                <Zap className="w-4 h-4 text-slate-500 flex-shrink-0" />
                
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs sm:text-sm text-slate-300">
                      {action.name}
                    </span>
                    <span className={`px-2 py-0.5 border font-mono text-[9px] sm:text-[10px] uppercase ${getMethodColor(action.type)}`}>
                      {action.type}
                    </span>
                  </div>
                  <p className="text-[10px] sm:text-xs font-mono text-slate-500 mt-1">
                    {action.path}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
