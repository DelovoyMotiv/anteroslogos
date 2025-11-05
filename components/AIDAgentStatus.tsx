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
      return <XCircle className="w-6 h-6 text-red-500" />;
    }
    if (aidInfo.errors.length > 0) {
      return <AlertTriangle className="w-6 h-6 text-yellow-500" />;
    }
    return <CheckCircle className="w-6 h-6 text-green-500" />;
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
    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Bot className="w-8 h-8 text-blue-500" />
          <div>
            <h3 className="text-xl font-bold text-gray-900">AI Agent Discovery (AID)</h3>
            <p className="text-sm text-gray-500">Agent Identity & Discovery Protocol v1.1</p>
          </div>
        </div>
        
        <div className={`flex items-center gap-3 px-4 py-2 rounded-lg border ${getScoreBg(score)}`}>
          <span className={`text-2xl font-bold ${getScoreColor(score)}`}>{score}</span>
          <span className="text-sm text-gray-600">/100</span>
        </div>
      </div>

      {/* Status Card */}
      <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getStatusIcon()}
            <div>
              <div className="font-semibold text-gray-900">{getStatusText()}</div>
              <div className="text-sm text-gray-600">
                {aidInfo.detected 
                  ? `Version ${aidInfo.version || 'Unknown'}`
                  : 'No AI agent found via DNS or HTTPS'}
              </div>
            </div>
          </div>
          {getDiscoveryMethodBadge()}
        </div>
      </div>

      {/* Agent Details - Only show if detected */}
      {aidInfo.detected && (
        <div className="space-y-4 mb-6">
          {/* Agent Name & Description */}
          {aidInfo.agentName && (
            <div className="border-l-4 border-blue-500 pl-4">
              <div className="font-semibold text-gray-900">{aidInfo.agentName}</div>
              {aidInfo.agentDescription && (
                <div className="text-sm text-gray-600 mt-1">{aidInfo.agentDescription}</div>
              )}
            </div>
          )}

          {/* Discovery Methods */}
          <div className="grid grid-cols-2 gap-4">
            <div className={`p-3 rounded-lg border ${aidInfo.discoveryMethod === 'both' || aidInfo.discoveryMethod === 'dns' ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
              <div className="flex items-center gap-2 mb-1">
                <Globe className={`w-4 h-4 ${aidInfo.discoveryMethod === 'both' || aidInfo.discoveryMethod === 'dns' ? 'text-green-600' : 'text-gray-400'}`} />
                <span className="text-sm font-medium">DNS TXT Record</span>
              </div>
              <div className="text-xs text-gray-600">
                {aidInfo.discoveryMethod === 'both' || aidInfo.discoveryMethod === 'dns' 
                  ? `✓ _agent.${aidInfo.domain || 'domain'}` 
                  : '✗ Not configured'}
              </div>
            </div>

            <div className={`p-3 rounded-lg border ${aidInfo.discoveryMethod === 'both' || aidInfo.discoveryMethod === 'https' ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
              <div className="flex items-center gap-2 mb-1">
                <FileJson className={`w-4 h-4 ${aidInfo.discoveryMethod === 'both' || aidInfo.discoveryMethod === 'https' ? 'text-green-600' : 'text-gray-400'}`} />
                <span className="text-sm font-medium">HTTPS Well-Known</span>
              </div>
              <div className="text-xs text-gray-600">
                {aidInfo.discoveryMethod === 'both' || aidInfo.discoveryMethod === 'https' 
                  ? '✓ /.well-known/agent.json' 
                  : '✗ Not found'}
              </div>
            </div>
          </div>

          {/* Protocols */}
          {aidInfo.protocols && aidInfo.protocols.length > 0 && (
            <div>
              <div className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Network className="w-4 h-4" />
                Supported Protocols
              </div>
              <div className="flex flex-wrap gap-2">
                {aidInfo.protocols.map((protocol) => (
                  <span
                    key={protocol}
                    className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-medium uppercase"
                  >
                    {protocol}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Capabilities */}
          {aidInfo.capabilities && aidInfo.capabilities.length > 0 && (
            <div>
              <div className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Agent Capabilities
              </div>
              <div className="flex flex-wrap gap-2">
                {aidInfo.capabilities.slice(0, 6).map((capability) => (
                  <span
                    key={capability}
                    className="text-xs bg-purple-100 text-purple-700 px-3 py-1 rounded font-mono"
                  >
                    {capability}
                  </span>
                ))}
                {aidInfo.capabilities.length > 6 && (
                  <span className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded">
                    +{aidInfo.capabilities.length - 6} more
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Endpoint */}
          {aidInfo.endpoint && (
            <div className="bg-gray-900 rounded-lg p-3">
              <div className="text-xs text-gray-400 mb-1">Agent Endpoint</div>
              <div className="text-sm font-mono text-green-400 break-all">{aidInfo.endpoint}</div>
            </div>
          )}

          {/* Organization Info */}
          {aidInfo.metadata?.organization && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Organization:</span>
              <span className="font-medium text-gray-900">{aidInfo.metadata.organization}</span>
            </div>
          )}

          {aidInfo.metadata?.industry && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Industry:</span>
              <span className="font-medium text-gray-900">{aidInfo.metadata.industry}</span>
            </div>
          )}
        </div>
      )}

      {/* Errors */}
      {aidInfo.errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <XCircle className="w-5 h-5 text-red-600" />
            <span className="font-semibold text-red-900">Issues Detected</span>
          </div>
          <ul className="space-y-1">
            {aidInfo.errors.map((error, index) => (
              <li key={index} className="text-sm text-red-700">• {error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Warnings */}
      {aidInfo.warnings.length > 0 && !aidInfo.errors.length && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
            <span className="font-semibold text-yellow-900">Warnings</span>
          </div>
          <ul className="space-y-1">
            {aidInfo.warnings.slice(0, 3).map((warning, index) => (
              <li key={index} className="text-sm text-yellow-700">• {warning}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Info Section - Always Show */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="text-sm text-blue-900">
          <strong>What is AID?</strong> The Agent Identity & Discovery protocol makes your services discoverable 
          by AI agents across the agentic web ecosystem (ChatGPT, Claude, Perplexity, Gemini agents). 
          It's the DNS for AI agents - one TXT record makes your agent visible to 5,000+ registered domains.
        </div>
        {!aidInfo.detected && (
          <div className="mt-3 pt-3 border-t border-blue-200">
            <a 
              href="/agent-identity" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm font-medium text-blue-600 hover:text-blue-700 underline"
            >
              Learn how to implement AID protocol →
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIDAgentStatus;
