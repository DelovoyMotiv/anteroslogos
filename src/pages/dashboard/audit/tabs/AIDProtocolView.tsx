/**
 * AIDProtocolView Component
 * 
 * Displays comprehensive AID (Agent Identity & Discovery) Protocol information.
 * Shows discovery method, protocols, capabilities, endpoints, errors, and technical debugging details.
 * 
 * Features:
 * - Detection status with color-coded indicators
 * - Discovery method (DNS, HTTPS, Both, None)
 * - Protocol support badges
 * - Endpoint information with validation
 * - Capabilities listing
 * - Error and warning displays
 * - Technical debugging information
 * - Registry verification status
 * - Tenant isolation details
 * 
 * Requirements:
 * - Technical detail display: Full AID agent details
 * - Discovery information: Method, protocols, capabilities
 * - Endpoint details: URL, service ID, agent name
 * - Error handling: Errors and warnings display
 * - Debugging: Technical information for developers
 * 
 * Usage:
 * ```tsx
 * <AIDProtocolView result={auditResult} />
 * ```
 */

import { 
  Zap,
  CheckCircle,
  XCircle,
  AlertCircle,
  Globe,
  Server,
  Shield,
  Code,
  Network,
  Info,
} from 'lucide-react';
import type { AuditResult } from '../../../../../utils/geoAuditEnhanced';

interface AIDProtocolViewProps {
  /** Complete audit result data */
  result: AuditResult;
}

export function AIDProtocolView({ result }: AIDProtocolViewProps) {
  const aid = result.details.aidAgent;

  // Calculate detection quality
  const detectionQuality = getDetectionQuality(aid);

  return (
    <div className="space-y-4">
      {/* Detection Status Overview */}
      <div className="bg-black/20 border border-slate-800/50 rounded p-4">
        <h3 className="text-xs font-mono text-blue-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Zap className="w-4 h-4" />
          AID Protocol Detection Status
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            label="Detection"
            value={aid.detected ? 'Detected' : 'Not Detected'}
            color={aid.detected ? 'emerald' : 'red'}
            icon={aid.detected ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
            isText
          />
          <StatCard
            label="Discovery Method"
            value={aid.discoveryMethod.toUpperCase()}
            color={getMethodColor(aid.discoveryMethod)}
            icon={<Globe className="w-4 h-4" />}
            isText
          />
          {aid.version && (
            <StatCard
              label="Protocol Version"
              value={aid.version}
              color="purple"
              icon={<Code className="w-4 h-4" />}
              isText
            />
          )}
          <StatCard
            label="Score"
            value={result.scores.aidAgent.toFixed(1)}
            color={getScoreColor(result.scores.aidAgent)}
            icon={<Shield className="w-4 h-4" />}
            isText
          />
        </div>

        {/* Detection Quality Indicator */}
        {aid.detected && (
          <div className="mt-3 pt-3 border-t border-slate-700/50">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-mono">Detection Quality:</span>
              <span className={`text-xs font-mono font-bold ${
                detectionQuality === 'excellent' ? 'text-emerald-400' :
                detectionQuality === 'good' ? 'text-blue-400' :
                detectionQuality === 'fair' ? 'text-yellow-400' :
                'text-orange-400'
              }`}>
                {detectionQuality.toUpperCase()}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Protocols Supported */}
      {aid.protocols && aid.protocols.length > 0 && (
        <div className="bg-black/20 border border-slate-800/50 rounded p-4">
          <h3 className="text-xs font-mono text-blue-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Network className="w-4 h-4" />
            Supported Protocols ({aid.protocols.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {aid.protocols.map((protocol) => (
              <span
                key={protocol}
                className="text-xs bg-blue-500/10 border border-blue-500/30 px-3 py-1.5 rounded text-blue-400 font-mono uppercase flex items-center gap-2"
              >
                <Code className="w-3 h-3" />
                {protocol}
              </span>
            ))}
          </div>
          
          {/* Protocol Descriptions */}
          <div className="mt-3 pt-3 border-t border-slate-700/50 space-y-2">
            {aid.protocols.map((protocol) => (
              <div key={protocol} className="text-xs text-slate-400">
                <span className="text-blue-400 font-mono">{protocol.toUpperCase()}:</span>{' '}
                {getProtocolDescription(protocol)}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Endpoint Information */}
      {aid.endpoint && (
        <div className="bg-black/20 border border-slate-800/50 rounded p-4">
          <h3 className="text-xs font-mono text-emerald-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Server className="w-4 h-4" />
            Endpoint Information
          </h3>
          <div className="space-y-2">
            <InfoField
              label="Endpoint URL"
              value={aid.endpoint}
              icon={<Globe className="w-3 h-3" />}
              copyable
            />
            {aid.serviceId && (
              <InfoField
                label="Service ID"
                value={aid.serviceId}
                icon={<Server className="w-3 h-3" />}
              />
            )}
            {aid.agentName && (
              <InfoField
                label="Agent Name"
                value={aid.agentName}
                icon={<Zap className="w-3 h-3" />}
              />
            )}
            {aid.agentDescription && (
              <InfoField
                label="Description"
                value={aid.agentDescription}
                icon={<Info className="w-3 h-3" />}
              />
            )}
            {aid.agentVersion && (
              <InfoField
                label="Agent Version"
                value={aid.agentVersion}
                icon={<Code className="w-3 h-3" />}
              />
            )}
            {aid.domain && (
              <InfoField
                label="Domain"
                value={aid.domain}
                icon={<Globe className="w-3 h-3" />}
              />
            )}
          </div>
        </div>
      )}

      {/* Capabilities */}
      {aid.capabilities && aid.capabilities.length > 0 && (
        <div className="bg-black/20 border border-slate-800/50 rounded p-4">
          <h3 className="text-xs font-mono text-emerald-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Agent Capabilities ({aid.capabilities.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {aid.capabilities.map((cap, idx) => (
              <span
                key={idx}
                className="text-xs bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded text-emerald-400 font-mono"
              >
                {cap}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Registry & Verification Status */}
      {aid.detected && (
        <div className="bg-black/20 border border-slate-800/50 rounded p-4">
          <h3 className="text-xs font-mono text-purple-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Registry & Verification
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <StatCard
              label="Registry Status"
              value={aid.registeredInRegistry ? 'Registered' : 'Not Registered'}
              color={aid.registeredInRegistry ? 'emerald' : 'slate'}
              isText
            />
            {aid.registeredInRegistry && (
              <StatCard
                label="Verified"
                value={aid.verified ? 'Yes' : 'No'}
                color={aid.verified ? 'emerald' : 'yellow'}
                isText
              />
            )}
            {aid.tenantId && (
              <StatCard
                label="Tenant ID"
                value={aid.tenantId.substring(0, 8) + '...'}
                color="blue"
                isText
              />
            )}
          </div>
          
          {aid.federationAllowed !== undefined && (
            <div className="mt-3 pt-3 border-t border-slate-700/50">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-mono">Federation Allowed:</span>
                <span className={`text-xs font-mono font-bold ${
                  aid.federationAllowed ? 'text-emerald-400' : 'text-slate-500'
                }`}>
                  {aid.federationAllowed ? 'YES' : 'NO'}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Additional Metadata */}
      {(aid.vendor || aid.homepage || aid.documentation || aid.contact) && (
        <div className="bg-black/20 border border-slate-800/50 rounded p-4">
          <h3 className="text-xs font-mono text-blue-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Info className="w-4 h-4" />
            Additional Information
          </h3>
          <div className="space-y-2">
            {aid.vendor && (
              <InfoField
                label="Vendor"
                value={aid.vendor}
                icon={<Server className="w-3 h-3" />}
              />
            )}
            {aid.homepage && (
              <InfoField
                label="Homepage"
                value={aid.homepage}
                icon={<Globe className="w-3 h-3" />}
                copyable
                isLink
              />
            )}
            {aid.documentation && (
              <InfoField
                label="Documentation"
                value={aid.documentation}
                icon={<Code className="w-3 h-3" />}
                copyable
                isLink
              />
            )}
            {aid.contact && (
              <InfoField
                label="Contact"
                value={aid.contact}
                icon={<Info className="w-3 h-3" />}
                copyable
              />
            )}
          </div>
        </div>
      )}

      {/* Metadata */}
      {aid.metadata && Object.keys(aid.metadata).length > 0 && (
        <div className="bg-black/20 border border-slate-800/50 rounded p-4">
          <h3 className="text-xs font-mono text-purple-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Info className="w-4 h-4" />
            Metadata
          </h3>
          <div className="space-y-2">
            {aid.metadata.organization && (
              <InfoField
                label="Organization"
                value={aid.metadata.organization}
              />
            )}
            {aid.metadata.industry && (
              <InfoField
                label="Industry"
                value={aid.metadata.industry}
              />
            )}
            {aid.metadata.established && (
              <InfoField
                label="Established"
                value={aid.metadata.established}
              />
            )}
            {aid.metadata.specialization && aid.metadata.specialization.length > 0 && (
              <div className="bg-black/30 border border-slate-800/30 rounded p-3">
                <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-2">
                  Specialization
                </div>
                <div className="flex flex-wrap gap-2">
                  {aid.metadata.specialization.map((spec, idx) => (
                    <span
                      key={idx}
                      className="text-xs bg-purple-500/10 border border-purple-500/30 px-2 py-1 rounded text-purple-400"
                    >
                      {spec}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Pricing Information */}
      {aid.pricing && Object.keys(aid.pricing).length > 0 && (
        <div className="bg-black/20 border border-slate-800/50 rounded p-4">
          <h3 className="text-xs font-mono text-emerald-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Info className="w-4 h-4" />
            Pricing Tiers
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {Object.entries(aid.pricing).map(([tier, details]) => (
              <div
                key={tier}
                className="bg-emerald-500/5 border border-emerald-500/20 rounded p-3"
              >
                <div className="text-xs font-mono text-emerald-400 uppercase mb-2">
                  {tier}
                </div>
                <div className="space-y-1 text-[10px] text-slate-400">
                  {typeof details === 'object' && details !== null && (
                    <>
                      {Object.entries(details as Record<string, unknown>).map(([key, value]) => (
                        <div key={key} className="flex justify-between">
                          <span>{key.replace(/_/g, ' ')}:</span>
                          <span className="text-slate-300">{String(value)}</span>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Errors */}
      {aid.errors && aid.errors.length > 0 && (
        <div className="bg-black/20 border border-red-500/30 rounded p-4">
          <h3 className="text-xs font-mono text-red-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <XCircle className="w-4 h-4" />
            Errors ({aid.errors.length})
          </h3>
          <div className="space-y-2">
            {aid.errors.map((error, idx) => (
              <div
                key={idx}
                className="bg-red-500/5 border border-red-500/20 rounded p-3 text-xs text-red-400 flex items-start gap-2"
              >
                <XCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Warnings */}
      {aid.warnings && aid.warnings.length > 0 && (
        <div className="bg-black/20 border border-yellow-500/30 rounded p-4">
          <h3 className="text-xs font-mono text-yellow-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Warnings ({aid.warnings.length})
          </h3>
          <div className="space-y-2">
            {aid.warnings.map((warning, idx) => (
              <div
                key={idx}
                className="bg-yellow-500/5 border border-yellow-500/20 rounded p-3 text-xs text-yellow-400 flex items-start gap-2"
              >
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <span>{warning}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Technical Debugging Info */}
      <div className="bg-black/20 border border-slate-800/50 rounded p-4">
        <h3 className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Code className="w-4 h-4" />
          Technical Debugging Information
        </h3>
        <div className="space-y-2 text-xs font-mono">
          <DebugField label="Detection Method" value={aid.discoveryMethod} />
          <DebugField label="Detected" value={String(aid.detected)} />
          <DebugField label="Version" value={aid.version || 'N/A'} />
          <DebugField label="Protocols" value={aid.protocols?.join(', ') || 'N/A'} />
          <DebugField label="Endpoint" value={aid.endpoint || 'N/A'} />
          <DebugField label="Service ID" value={aid.serviceId || 'N/A'} />
          <DebugField label="Domain" value={aid.domain || 'N/A'} />
          <DebugField label="Registered" value={String(aid.registeredInRegistry || false)} />
          <DebugField label="Verified" value={String(aid.verified || false)} />
          <DebugField label="Tenant ID" value={aid.tenantId || 'N/A'} />
          <DebugField label="Error Count" value={String(aid.errors?.length || 0)} />
          <DebugField label="Warning Count" value={String(aid.warnings?.length || 0)} />
        </div>
      </div>
    </div>
  );
}

/**
 * StatCard Component
 * 
 * Compact stat display with icon and color coding.
 */
interface StatCardProps {
  label: string;
  value: string | number;
  color: 'blue' | 'emerald' | 'purple' | 'red' | 'yellow' | 'slate' | 'orange';
  icon?: React.ReactNode;
  isText?: boolean;
}

function StatCard({ label, value, color, icon, isText = false }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
    emerald: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
    purple: 'bg-purple-500/10 border-purple-500/30 text-purple-400',
    red: 'bg-red-500/10 border-red-500/30 text-red-400',
    yellow: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400',
    slate: 'bg-slate-500/10 border-slate-500/30 text-slate-400',
    orange: 'bg-orange-500/10 border-orange-500/30 text-orange-400',
  };

  return (
    <div className={`${colorClasses[color]} border rounded p-3`}>
      <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
        {icon}
        {label}
      </div>
      <div className={`${isText ? 'text-sm' : 'text-xl'} font-bold font-mono leading-none`}>
        {value}
      </div>
    </div>
  );
}

/**
 * InfoField Component
 * 
 * Displays a labeled information field with optional copy and link functionality.
 */
interface InfoFieldProps {
  label: string;
  value: string;
  icon?: React.ReactNode;
  copyable?: boolean;
  isLink?: boolean;
}

function InfoField({ label, value, icon, copyable = false, isLink = false }: InfoFieldProps) {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  return (
    <div className="bg-black/30 border border-slate-800/30 rounded p-3">
      <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
        {icon}
        {label}
      </div>
      <div className="flex items-center justify-between gap-2">
        {isLink ? (
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-400 font-mono break-all hover:text-blue-300 underline"
          >
            {value}
          </a>
        ) : (
          <div className="text-xs text-slate-300 font-mono break-all">
            {value}
          </div>
        )}
        {copyable && (
          <button
            onClick={handleCopy}
            className="text-slate-500 hover:text-slate-300 transition-colors flex-shrink-0"
            title="Copy to clipboard"
          >
            <Code className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * DebugField Component
 * 
 * Displays a debug field in key-value format.
 */
interface DebugFieldProps {
  label: string;
  value: string;
}

function DebugField({ label, value }: DebugFieldProps) {
  return (
    <div className="flex items-start justify-between gap-4 py-1 border-b border-slate-800/30">
      <span className="text-slate-500">{label}:</span>
      <span className="text-slate-300 text-right break-all">{value}</span>
    </div>
  );
}

/**
 * Helper Functions
 */

function getScoreColor(score: number): 'emerald' | 'yellow' | 'orange' | 'red' {
  if (score >= 80) return 'emerald';
  if (score >= 60) return 'yellow';
  if (score >= 40) return 'orange';
  return 'red';
}

function getMethodColor(method: string): 'emerald' | 'blue' | 'yellow' | 'slate' {
  if (method === 'both') return 'emerald';
  if (method === 'dns') return 'blue';
  if (method === 'https') return 'yellow';
  return 'slate';
}

function getDetectionQuality(aid: { detected: boolean; discoveryMethod: string; errors: string[]; warnings: string[] }): 'excellent' | 'good' | 'fair' | 'poor' {
  if (!aid.detected) return 'poor';
  
  const errorCount = aid.errors?.length || 0;
  const warningCount = aid.warnings?.length || 0;
  
  if (aid.discoveryMethod === 'both' && errorCount === 0 && warningCount === 0) {
    return 'excellent';
  }
  
  if (aid.discoveryMethod === 'both' && errorCount === 0) {
    return 'good';
  }
  
  if ((aid.discoveryMethod === 'dns' || aid.discoveryMethod === 'https') && errorCount === 0) {
    return 'fair';
  }
  
  return 'poor';
}

function getProtocolDescription(protocol: string): string {
  const descriptions: Record<string, string> = {
    'a2a': 'Agent-to-Agent communication protocol for direct AI agent interactions',
    'http': 'Standard HTTP/REST API for web-based integrations',
    'grpc': 'High-performance RPC framework for efficient service communication',
    'mcp': 'Model Context Protocol for AI model interactions',
    'graphql': 'Query language for flexible API data fetching',
  };
  
  return descriptions[protocol.toLowerCase()] || 'Custom protocol implementation';
}
