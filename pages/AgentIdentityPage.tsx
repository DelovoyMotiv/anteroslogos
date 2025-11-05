import SEOHead from '../components/SEOHead';
import {
  Bot, 
  Network, 
  Shield, 
  Search, 
  Globe, 
  Code, 
  CheckCircle2, 
  ArrowRight, 
  Terminal,
  FileJson,
  Database,
  Lock
} from 'lucide-react';

const AgentIdentityPage = () => {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <>
      <SEOHead
        title="Agent Identity & Discovery (AID) - Anóteros Lógos"
        description="AID protocol implementation for agent discovery. DNS-first approach for AI agent identification with cryptographic proof of ownership and protocol-agnostic service discovery."
        keywords="AID protocol, agent discovery, DNS agent, agent identity, A2A protocol, agent-to-agent, agent marketplace, AI agent discovery, agent registry"
        type="website"
        url="https://anoteroslogos.com/agent-identity"
      />

      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 pt-20 sm:pt-24 pb-12 sm:pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Hero Section */}
          <div className="text-center mb-12 sm:mb-16">
            <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-xs sm:text-sm font-medium mb-4 sm:mb-6">
              <Bot className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>AID v1.1 Protocol Implemented</span>
            </div>
            
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 mb-4 sm:mb-6">
              Agent Identity & Discovery
            </h1>
            
            <p className="text-base sm:text-lg lg:text-xl text-slate-600 max-w-3xl mx-auto mb-6 sm:mb-8">
              DNS-first approach for AI agent identification. One TXT record makes our agent instantly discoverable across the agentic web ecosystem.
            </p>

            <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
              <a 
                href="/.well-known/agent.json" 
                target="_blank"
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors text-sm sm:text-base"
              >
                <FileJson className="w-4 h-4 sm:w-5 sm:h-5" />
                View Agent Identity
              </a>
              <a 
                href="https://github.com/agentcommunity/aid-protocol" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-slate-700 text-white px-6 py-3 rounded-lg hover:bg-slate-800 transition-colors text-sm sm:text-base"
              >
                <Code className="w-4 h-4 sm:w-5 sm:h-5" />
                AID Specification
              </a>
            </div>
          </div>

          {/* Protocol Overview */}
          <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8 mb-8 sm:mb-12">
            <div className="flex items-center gap-3 mb-6">
              <Network className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900">
                Protocol Overview
              </h2>
            </div>

            <p className="text-sm sm:text-base text-slate-700 mb-6 leading-relaxed">
              AID (Agent Identity & Discovery) is a DNS-based protocol for agent identification. Developed by agentcommunity.org, it solves the fundamental question: "Given a domain, where is its AI agent?"
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 sm:p-6 rounded-lg">
                <Globe className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 mb-3" />
                <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-2">DNS-First</h3>
                <p className="text-xs sm:text-sm text-slate-600">
                  Single TXT record at _agent.domain makes agent instantly discoverable
                </p>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 sm:p-6 rounded-lg">
                <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-green-600 mb-3" />
                <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-2">Cryptographic Proof</h3>
                <p className="text-xs sm:text-sm text-slate-600">
                  Ed25519 signatures (RFC 9421) verify domain ownership
                </p>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 sm:p-6 rounded-lg">
                <Database className="w-6 h-6 sm:w-8 sm:h-8 text-purple-600 mb-3" />
                <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-2">Protocol-Agnostic</h3>
                <p className="text-xs sm:text-sm text-slate-600">
                  Supports A2A, MCP, ANP, HTTP and future protocols
                </p>
              </div>
            </div>
          </div>

          {/* DNS Configuration */}
          <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8 mb-8 sm:mb-12">
            <div className="flex items-center gap-3 mb-6">
              <Terminal className="w-6 h-6 sm:w-8 sm:h-8 text-slate-700" />
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900">
                DNS TXT Record
              </h2>
            </div>

            <p className="text-sm sm:text-base text-slate-700 mb-6">
              Our agent is discoverable via a single TXT record. Single-letter aliases fit within the 255-byte DNS limit.
            </p>

            <div className="bg-slate-900 rounded-lg p-4 sm:p-6 overflow-x-auto">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <span className="text-green-400 font-mono text-xs sm:text-sm">_agent.anoteroslogos.com TXT</span>
                <button 
                  onClick={() => copyToClipboard('v=1.1;p=a2a,http;u=https://anoteroslogos.com/api/a2a;s=geoaudit;d=anoteroslogos.com')}
                  className="text-xs bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded transition-colors self-start sm:self-auto"
                >
                  Copy
                </button>
              </div>
              <pre className="text-xs sm:text-sm text-slate-200 font-mono overflow-x-auto whitespace-pre-wrap break-all">
                v=1.1;p=a2a,http;u=https://anoteroslogos.com/api/a2a;s=geoaudit;d=anoteroslogos.com
              </pre>
            </div>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
              <div className="bg-blue-50 p-3 sm:p-4 rounded-lg">
                <span className="font-mono text-xs sm:text-sm font-semibold text-blue-700">v=1.1</span>
                <p className="text-xs text-slate-600 mt-1">Protocol version</p>
              </div>
              <div className="bg-green-50 p-3 sm:p-4 rounded-lg">
                <span className="font-mono text-xs sm:text-sm font-semibold text-green-700">p=a2a,http</span>
                <p className="text-xs text-slate-600 mt-1">Supported protocols</p>
              </div>
              <div className="bg-purple-50 p-3 sm:p-4 rounded-lg">
                <span className="font-mono text-xs sm:text-sm font-semibold text-purple-700">u=...</span>
                <p className="text-xs text-slate-600 mt-1">Endpoint URL</p>
              </div>
              <div className="bg-orange-50 p-3 sm:p-4 rounded-lg">
                <span className="font-mono text-xs sm:text-sm font-semibold text-orange-700">s=geoaudit</span>
                <p className="text-xs text-slate-600 mt-1">Service identifier</p>
              </div>
              <div className="bg-pink-50 p-3 sm:p-4 rounded-lg">
                <span className="font-mono text-xs sm:text-sm font-semibold text-pink-700">d=...</span>
                <p className="text-xs text-slate-600 mt-1">Domain ownership</p>
              </div>
            </div>
          </div>

          {/* Agent Capabilities */}
          <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8 mb-8 sm:mb-12">
            <div className="flex items-center gap-3 mb-6">
              <Bot className="w-6 h-6 sm:w-8 sm:h-8 text-indigo-600" />
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900">
                Agent Capabilities
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <div className="border border-slate-200 rounded-lg p-4 sm:p-6">
                <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-4">Core Operations</h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-mono text-xs sm:text-sm text-slate-700">geo.audit.request</span>
                      <p className="text-xs text-slate-600">Single URL GEO audit</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-mono text-xs sm:text-sm text-slate-700">geo.audit.batch</span>
                      <p className="text-xs text-slate-600">Batch processing support</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-mono text-xs sm:text-sm text-slate-700">geo.insights.global</span>
                      <p className="text-xs text-slate-600">Market intelligence</p>
                    </div>
                  </li>
                </ul>
              </div>

              <div className="border border-slate-200 rounded-lg p-4 sm:p-6">
                <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-4">Discovery & Status</h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-mono text-xs sm:text-sm text-slate-700">a2a.discover</span>
                      <p className="text-xs text-slate-600">Agent discovery protocol</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-mono text-xs sm:text-sm text-slate-700">a2a.capabilities</span>
                      <p className="text-xs text-slate-600">Capability enumeration</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-mono text-xs sm:text-sm text-slate-700">a2a.status</span>
                      <p className="text-xs text-slate-600">Health monitoring</p>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Discovery Mechanisms */}
          <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8 mb-8 sm:mb-12">
            <div className="flex items-center gap-3 mb-6">
              <Search className="w-6 h-6 sm:w-8 sm:h-8 text-purple-600" />
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900">
                Discovery Mechanisms
              </h2>
            </div>

            <p className="text-sm sm:text-base text-slate-700 mb-6">
              AID uses a hybrid approach with DNS as primary and HTTPS well-known as fallback.
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-lg">
                <div className="flex items-center gap-2 mb-4">
                  <div className="bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
                    Primary
                  </div>
                  <h3 className="text-base sm:text-lg font-semibold text-slate-900">DNS TXT Record</h3>
                </div>
                <div className="bg-slate-900 rounded p-4 mb-4">
                  <code className="text-xs sm:text-sm text-green-400 font-mono break-all">
                    dig _agent.anoteroslogos.com TXT
                  </code>
                </div>
                <p className="text-xs sm:text-sm text-slate-600">
                  Fast, distributed lookup via global DNS infrastructure. Response time under 50ms.
                </p>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-lg">
                <div className="flex items-center gap-2 mb-4">
                  <div className="bg-green-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
                    Fallback
                  </div>
                  <h3 className="text-base sm:text-lg font-semibold text-slate-900">HTTPS Well-Known</h3>
                </div>
                <div className="bg-slate-900 rounded p-4 mb-4">
                  <code className="text-xs sm:text-sm text-green-400 font-mono break-all">
                    GET /.well-known/agent.json
                  </code>
                </div>
                <p className="text-xs sm:text-sm text-slate-600">
                  RFC 8615 compliant well-known URI. Automatic fallback if DNS lookup fails.
                </p>
              </div>
            </div>
          </div>

          {/* Security & Verification */}
          <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8 mb-8 sm:mb-12">
            <div className="flex items-center gap-3 mb-6">
              <Lock className="w-6 h-6 sm:w-8 sm:h-8 text-red-600" />
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900">
                Security & Verification
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
              <div className="border-l-4 border-blue-600 pl-4">
                <h3 className="text-sm sm:text-base font-semibold text-slate-900 mb-2">DNS Control</h3>
                <p className="text-xs sm:text-sm text-slate-600">
                  Ability to set TXT records proves domain ownership and administrative access.
                </p>
              </div>

              <div className="border-l-4 border-green-600 pl-4">
                <h3 className="text-sm sm:text-base font-semibold text-slate-900 mb-2">TLS Certificate</h3>
                <p className="text-xs sm:text-sm text-slate-600">
                  Valid SSL/TLS certificate verifies HTTPS endpoint authenticity and encryption.
                </p>
              </div>

              <div className="border-l-4 border-purple-600 pl-4">
                <h3 className="text-sm sm:text-base font-semibold text-slate-900 mb-2">Ed25519 Signatures</h3>
                <p className="text-xs sm:text-sm text-slate-600">
                  RFC 9421 HTTP Message Signatures provide cryptographic proof for requests.
                </p>
              </div>
            </div>

            <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-xs sm:text-sm text-yellow-800">
                <strong>Note:</strong> Ed25519 signature implementation requires backend key management. Key ID is declared but verification is not yet implemented in this version.
              </p>
            </div>
          </div>

          {/* Market Adoption */}
          <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-xl shadow-lg p-6 sm:p-8 mb-8 sm:mb-12 text-white">
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-6">Market Adoption</h2>
            
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
              <div className="text-center">
                <div className="text-3xl sm:text-4xl font-bold mb-2">5,000+</div>
                <div className="text-xs sm:text-sm text-indigo-100">Registered domains</div>
              </div>
              <div className="text-center">
                <div className="text-3xl sm:text-4xl font-bold mb-2">3 months</div>
                <div className="text-xs sm:text-sm text-indigo-100">Since v1.0 launch</div>
              </div>
              <div className="text-center">
                <div className="text-3xl sm:text-4xl font-bold mb-2">2026</div>
                <div className="text-xs sm:text-sm text-indigo-100">Expected RFC</div>
              </div>
              <div className="text-center">
                <div className="text-3xl sm:text-4xl font-bold mb-2">100%</div>
                <div className="text-xs sm:text-sm text-indigo-100">AID compliant</div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-4">
                <h3 className="font-semibold mb-2 text-sm sm:text-base">Protocol Integration</h3>
                <p className="text-xs sm:text-sm text-indigo-100">MCP, A2A, ANP servers</p>
              </div>
              <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-4">
                <h3 className="font-semibold mb-2 text-sm sm:text-base">Marketplace Support</h3>
                <p className="text-xs sm:text-sm text-indigo-100">OpenAI, Claude, Vertex AI</p>
              </div>
              <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-4">
                <h3 className="font-semibold mb-2 text-sm sm:text-base">Standards Track</h3>
                <p className="text-xs sm:text-sm text-indigo-100">IETF RFC discussion</p>
              </div>
            </div>
          </div>

          {/* CTA Section */}
          <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8 text-center">
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 mb-4">
              Try Our Agent
            </h2>
            <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto mb-6 sm:mb-8">
              Experience GEO audit capabilities through our A2A API. Request comprehensive analysis, competitive intelligence, and AI visibility optimization recommendations.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
              <a 
                href="/geo-audit" 
                className="inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-lg hover:bg-blue-700 transition-colors text-sm sm:text-base font-medium"
              >
                Start GEO Audit
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
              </a>
              <a 
                href="/knowledge-base" 
                className="inline-flex items-center justify-center gap-2 bg-slate-100 text-slate-900 px-6 sm:px-8 py-3 sm:py-4 rounded-lg hover:bg-slate-200 transition-colors text-sm sm:text-base font-medium"
              >
                Documentation
              </a>
            </div>
          </div>

        </div>
      </div>
    </>
  );
};

export default AgentIdentityPage;
