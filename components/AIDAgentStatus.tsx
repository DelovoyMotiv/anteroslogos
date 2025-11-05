import { Bot, CheckCircle, XCircle, AlertTriangle, Globe, Network, FileJson, Zap } from 'lucide-react';
import type { AIDAgentInfo } from '../utils/aidDiscovery';

interface AIDAgentStatusProps {
  aidInfo: AIDAgentInfo;
  score: number;
}

const AIDAgentStatus = ({ aidInfo, score }: AIDAgentStatusProps) => {
  const getScoreColor = (s: number): string => {
    if (s >= 80) return 'text-green-500';
    if (s >= 60) return 'text-yellow-500';
    if (s >= 40) return 'text-orange-500';
    return 'text-red-500';
  };

  const getScoreBg = (s: number): string => {
    if (s >= 80) return 'bg-green-500/10 border-green-500/30';
    if (s >= 60) return 'bg-yellow-500/10 border-yellow-500/30';
    if (s >= 40) return 'bg-orange-500/10 border-orange-500/30';
    return 'bg-red-500/10 border-red-500/30';
  };

  const getStatusIcon = () => {
    if (!aidInfo.detected) {
      return <XCircle className="w-4 h-4 text-red-400" />;
    }
    if (aidInfo.errors.length > 0) {
      return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
    }
    return <CheckCircle className="w-4 h-4 text-green-400" />;
  };

  const getStatusText = () => {
    if (!aidInfo.detected) return 'Not Detected';
    if (aidInfo.errors.length > 0) return 'Detected with Issues';
    return 'Detected';
  };

  const getDiscoveryMethodBadge = () => {
    if (aidInfo.discoveryMethod === 'both') {
      return <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">DNS + HTTPS</span>;
    }
    if (aidInfo.discoveryMethod === 'dns') {
      return <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">DNS Only</span>;
    }
    if (aidInfo.discoveryMethod === 'https') {
      return <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded">HTTPS Only</span>;
    }
    return <span className="text-xs bg-gray-500/20 text-gray-400 px-2 py-1 rounded">None</span>;
  };

  return (
    <div className="bg-white/5 border border-brand-secondary rounded-lg p-4">
      {/* Header - Compact */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-brand-accent" />
          <div>
            <h3 className="text-sm font-bold text-white">AI Agent Discovery (AID)</h3>
            <p className="text-[10px] text-white/50">Protocol v1.1</p>
          </div>
        </div>
        
        <div className={`flex items-center gap-2 px-3 py-1 rounded border ${getScoreBg(score)}`}>
          <span className={`text-lg font-bold ${getScoreColor(score)}`}>{score}</span>
          <span className="text-[10px] text-white/40">/100</span>
        </div>
      </div>

      {/* Status Card - Compact */}
      <div className="bg-white/5 border border-white/10 rounded p-3 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <div>
              <div className="font-semibold text-white text-xs">{getStatusText()}</div>
              <div className="text-[10px] text-white/50">
                {aidInfo.detected 
                  ? `v${aidInfo.version || '?'}`
                  : 'Not found'}
              </div>
            </div>
          </div>
          {getDiscoveryMethodBadge()}
        </div>
      </div>

      {/* Agent Details - Only show if detected */}
      {aidInfo.detected && (
        <div className="space-y-3 mb-4">
          {/* Agent Name & Description - Compact */}
          {aidInfo.agentName && (
            <div className="border-l-2 border-brand-accent pl-2">
              <div className="font-semibold text-white text-xs">{aidInfo.agentName}</div>
              {aidInfo.agentDescription && (
                <div className="text-[10px] text-white/60 mt-0.5">{aidInfo.agentDescription}</div>
              )}
            </div>
          )}

          {/* Discovery Methods - Compact Grid */}
          <div className="grid grid-cols-2 gap-2">
            <div className={`p-2 rounded border ${aidInfo.discoveryMethod === 'both' || aidInfo.discoveryMethod === 'dns' ? 'bg-green-500/10 border-green-500/30' : 'bg-white/5 border-white/10'}`}>
              <div className="flex items-center gap-1 mb-0.5">
                <Globe className={`w-3 h-3 ${aidInfo.discoveryMethod === 'both' || aidInfo.discoveryMethod === 'dns' ? 'text-green-400' : 'text-white/40'}`} />
                <span className="text-[10px] font-medium text-white">DNS TXT</span>
              </div>
              <div className="text-[9px] text-white/50">
                {aidInfo.discoveryMethod === 'both' || aidInfo.discoveryMethod === 'dns' 
                  ? `✓ _agent.${aidInfo.domain || 'domain'}` 
                  : '✗ Missing'}
              </div>
            </div>

            <div className={`p-2 rounded border ${aidInfo.discoveryMethod === 'both' || aidInfo.discoveryMethod === 'https' ? 'bg-green-500/10 border-green-500/30' : 'bg-white/5 border-white/10'}`}>
              <div className="flex items-center gap-1 mb-0.5">
                <FileJson className={`w-3 h-3 ${aidInfo.discoveryMethod === 'both' || aidInfo.discoveryMethod === 'https' ? 'text-green-400' : 'text-white/40'}`} />
                <span className="text-[10px] font-medium text-white">HTTPS</span>
              </div>
              <div className="text-[9px] text-white/50">
                {aidInfo.discoveryMethod === 'both' || aidInfo.discoveryMethod === 'https' 
                  ? '✓ /.well-known' 
                  : '✗ Missing'}
              </div>
            </div>
          </div>

          {/* Protocols - Compact */}
          {aidInfo.protocols && aidInfo.protocols.length > 0 && (
            <div>
              <div className="text-[10px] font-medium text-white/60 mb-1 flex items-center gap-1">
                <Network className="w-3 h-3" />
                Protocols
              </div>
              <div className="flex flex-wrap gap-1">
                {aidInfo.protocols.map((protocol) => (
                  <span
                    key={protocol}
                    className="text-[9px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded font-medium uppercase"
                  >
                    {protocol}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Capabilities - Compact, limit to 4 */}
          {aidInfo.capabilities && aidInfo.capabilities.length > 0 && (
            <div>
              <div className="text-[10px] font-medium text-white/60 mb-1 flex items-center gap-1">
                <Zap className="w-3 h-3" />
                Capabilities
              </div>
              <div className="flex flex-wrap gap-1">
                {aidInfo.capabilities.slice(0, 4).map((capability) => (
                  <span
                    key={capability}
                    className="text-[9px] bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded font-mono"
                  >
                    {capability}
                  </span>
                ))}
                {aidInfo.capabilities.length > 4 && (
                  <span className="text-[9px] bg-white/10 text-white/50 px-2 py-0.5 rounded">
                    +{aidInfo.capabilities.length - 4}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Endpoint - Compact */}
          {aidInfo.endpoint && (
            <div className="bg-slate-900 rounded p-2">
              <div className="text-[9px] text-white/40 mb-0.5">Endpoint</div>
              <div className="text-[10px] font-mono text-green-400 break-all">{aidInfo.endpoint}</div>
            </div>
          )}

          {/* Organization Info - Compact */}
          <div className="flex items-center gap-3 text-[10px]">
            {aidInfo.metadata?.organization && (
              <div>
                <span className="text-white/50">Org:</span>
                <span className="font-medium text-white ml-1">{aidInfo.metadata.organization}</span>
              </div>
            )}
            {aidInfo.metadata?.industry && (
              <div>
                <span className="text-white/50">Industry:</span>
                <span className="font-medium text-white ml-1">{aidInfo.metadata.industry}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Errors - Compact */}
      {aidInfo.errors.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded p-2 mb-3">
          <div className="flex items-center gap-1 mb-1">
            <XCircle className="w-3 h-3 text-red-400" />
            <span className="font-semibold text-red-400 text-[10px]">Issues</span>
          </div>
          <ul className="space-y-0.5">
            {aidInfo.errors.slice(0, 2).map((error, index) => (
              <li key={index} className="text-[10px] text-red-300">• {error}</li>
            ))}
            {aidInfo.errors.length > 2 && (
              <li className="text-[9px] text-red-400/70">+{aidInfo.errors.length - 2} more</li>
            )}
          </ul>
        </div>
      )}

      {/* Warnings - Compact */}
      {aidInfo.warnings.length > 0 && !aidInfo.errors.length && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded p-2 mb-3">
          <div className="flex items-center gap-1 mb-1">
            <AlertTriangle className="w-3 h-3 text-yellow-400" />
            <span className="font-semibold text-yellow-400 text-[10px]">Warnings</span>
          </div>
          <ul className="space-y-0.5">
            {aidInfo.warnings.slice(0, 2).map((warning, index) => (
              <li key={index} className="text-[10px] text-yellow-300">• {warning}</li>
            ))}
            {aidInfo.warnings.length > 2 && (
              <li className="text-[9px] text-yellow-400/70">+{aidInfo.warnings.length - 2} more</li>
            )}
          </ul>
        </div>
      )}

      {/* Info Section - Compact */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded p-2">
        <div className="text-[10px] text-white/70">
          <strong className="text-blue-400">AID Protocol:</strong> Makes your services discoverable 
          by AI agents (ChatGPT, Claude, Perplexity). One TXT record = visibility to 5,000+ domains.
        </div>
        {!aidInfo.detected && (
          <div className="mt-2 pt-2 border-t border-blue-500/20">
            <a 
              href="/agent-identity" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-[10px] font-medium text-brand-accent hover:text-blue-400 underline"
            >
              Implement AID →
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIDAgentStatus;
