import { useState } from 'react';
import SEOHead from '../components/SEOHead';
import Header from '../components/Header';
import Footer from '../components/Footer';
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
  Check,
  Copy,
  ChevronRight,
  BookOpen,
  Zap
} from 'lucide-react';

const AgentIdentityPage = () => {
  const [copied, setCopied] = useState(false);
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <SEOHead
        title="Agent Identity & Discovery (AID Protocol v1.1) - DNS-Based AI Agent Discovery | Anóteros Lógos"
        description="Production AID v1.1 implementation with DNS TXT and HTTPS well-known discovery. Enable AI agents (ChatGPT, Claude, Perplexity) to find your services via single TXT record. RFC 8615 compliant, Ed25519 signatures, A2A/MCP/ANP protocol support."
        keywords="AID protocol v1.1, agent discovery, DNS TXT agent, AI agent identity, A2A protocol, agent-to-agent, MCP protocol, ANP protocol, agent marketplace, AI agent discovery, agent registry, agentcommunity.org, RFC 8615, Ed25519 signatures, DNS-over-HTTPS"
        type="article"
        url="https://anoteroslogos.com/agent-identity"
      />
      
      {/* Schema.org Article markup for GEO */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "TechArticle",
          "headline": "Agent Identity & Discovery (AID) Protocol Implementation",
          "description": "Complete guide to AID v1.1 protocol for AI agent discovery via DNS TXT records and HTTPS well-known endpoints",
          "author": {
            "@type": "Organization",
            "name": "Anóteros Lógos",
            "url": "https://anoteroslogos.com"
          },
          "publisher": {
            "@type": "Organization",
            "name": "Anóteros Lógos",
            "logo": {
              "@type": "ImageObject",
              "url": "https://anoteroslogos.com/logo.svg"
            }
          },
          "about": {
            "@type": "SoftwareApplication",
            "name": "AID Protocol",
            "applicationCategory": "DeveloperApplication",
            "operatingSystem": "Any",
            "description": "DNS-first agent discovery protocol for AI systems"
          },
          "mainEntityOfPage": {
            "@type": "WebPage",
            "@id": "https://anoteroslogos.com/agent-identity"
          },
          "datePublished": "2025-01-30",
          "dateModified": "2025-01-30",
          "keywords": "AID protocol, agent discovery, DNS TXT, AI agents, A2A protocol"
        })}
      </script>
      
      {/* Schema.org HowTo for implementation guide */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "HowTo",
          "name": "How to Implement AID Protocol for AI Agent Discovery",
          "description": "Step-by-step guide to make your AI agent discoverable via AID protocol v1.1",
          "step": [
            {
              "@type": "HowToStep",
              "name": "Create agent.json file",
              "text": "Create /.well-known/agent.json with AID v1.1 metadata including protocols, capabilities, and endpoint"
            },
            {
              "@type": "HowToStep",
              "name": "Add DNS TXT record",
              "text": "Add TXT record at _agent.yourdomain.com with version, protocols, endpoint URL, service ID, and domain"
            },
            {
              "@type": "HowToStep",
              "name": "Configure CORS headers",
              "text": "Set Access-Control-Allow-Origin: * for /.well-known/agent.json endpoint"
            },
            {
              "@type": "HowToStep",
              "name": "Verify discovery",
              "text": "Test DNS lookup via dig command and HTTPS endpoint accessibility"
            }
          ],
          "totalTime": "PT30M"
        })}
      </script>
      
      <Header 
        onMethodClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        onClientsClick={() => window.location.href = '/#clients'}
        onContactClick={() => window.location.href = '/#contact'}
      />

      <div className="min-h-screen bg-brand-bg text-brand-text pt-20 sm:pt-24 pb-12 sm:pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Breadcrumbs */}
          <nav className="flex items-center gap-2 text-sm text-white/60 mb-6" aria-label="Breadcrumb">
            <a href="/" className="hover:text-brand-accent transition-colors">Home</a>
            <ChevronRight className="w-4 h-4" />
            <span className="text-white font-medium">Agent Identity</span>
          </nav>
          
          {/* Hero Section */}
          <div className="text-center mb-12 sm:mb-16">
            <div className="inline-flex items-center gap-2 bg-brand-accent/10 border border-brand-accent/20 px-4 py-2 rounded-full text-xs sm:text-sm font-medium mb-4 sm:mb-6 text-brand-accent">
              <Bot className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>AID v1.1 Protocol Implemented</span>
            </div>
            
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 sm:mb-6">
              Agent Identity & Discovery
            </h1>
            
            <p className="text-base sm:text-lg lg:text-xl text-white/70 max-w-3xl mx-auto mb-6 sm:mb-8">
              DNS-first approach for AI agent identification. One TXT record makes our agent instantly discoverable across the agentic web ecosystem.
            </p>

            <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
              <a 
                href="/.well-known/agent.json" 
                target="_blank"
                className="inline-flex items-center gap-2 bg-brand-accent text-white px-6 py-3 rounded-lg hover:bg-blue-500 transition-colors text-sm sm:text-base"
              >
                <FileJson className="w-4 h-4 sm:w-5 sm:h-5" />
                View Agent Identity
              </a>
              <a 
                href="https://github.com/agentcommunity/aid-protocol" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-brand-secondary text-white px-6 py-3 rounded-lg hover:bg-white/10 transition-colors text-sm sm:text-base"
              >
                <Code className="w-4 h-4 sm:w-5 sm:h-5" />
                AID Specification
              </a>
            </div>
          </div>

          {/* Protocol Overview */}
          <div className="bg-white/5 border border-brand-secondary rounded-xl p-6 sm:p-8 mb-8 sm:mb-12">
            <div className="flex items-center gap-3 mb-6">
              <Network className="w-6 h-6 sm:w-8 sm:h-8 text-brand-accent" />
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white">
                Protocol Overview
              </h2>
            </div>

            <p className="text-sm sm:text-base text-white/70 mb-6 leading-relaxed">
              AID (Agent Identity & Discovery) is a DNS-based protocol for agent identification. Developed by agentcommunity.org, it solves the fundamental question: "Given a domain, where is its AI agent?"
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              <div className="bg-white/5 border border-white/10 p-4 sm:p-6 rounded-lg hover:border-brand-accent/30 transition-colors">
                <Globe className="w-6 h-6 sm:w-8 sm:h-8 text-brand-accent mb-3" />
                <h3 className="text-base sm:text-lg font-semibold text-white mb-2">DNS-First</h3>
                <p className="text-xs sm:text-sm text-white/60">
                  Single TXT record at _agent.domain makes agent instantly discoverable
                </p>
              </div>

              <div className="bg-white/5 border border-white/10 p-4 sm:p-6 rounded-lg hover:border-green-500/30 transition-colors">
                <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-green-400 mb-3" />
                <h3 className="text-base sm:text-lg font-semibold text-white mb-2">Cryptographic Proof</h3>
                <p className="text-xs sm:text-sm text-white/60">
                  Ed25519 signatures (RFC 9421) verify domain ownership
                </p>
              </div>

              <div className="bg-white/5 border border-white/10 p-4 sm:p-6 rounded-lg hover:border-purple-500/30 transition-colors">
                <Database className="w-6 h-6 sm:w-8 sm:h-8 text-purple-400 mb-3" />
                <h3 className="text-base sm:text-lg font-semibold text-white mb-2">Protocol-Agnostic</h3>
                <p className="text-xs sm:text-sm text-white/60">
                  Supports A2A, MCP, ANP, HTTP and future protocols
                </p>
              </div>
            </div>
          </div>

          {/* DNS Configuration */}
          <div className="bg-white/5 border border-brand-secondary rounded-xl p-6 sm:p-8 mb-8 sm:mb-12">
            <div className="flex items-center gap-3 mb-6">
              <Terminal className="w-6 h-6 sm:w-8 sm:h-8 text-brand-accent" />
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white">
                DNS TXT Record
              </h2>
            </div>

            <p className="text-sm sm:text-base text-white/70 mb-6">
              Our agent is discoverable via a single TXT record. Single-letter aliases fit within the 255-byte DNS limit.
            </p>

            <div className="bg-slate-900 rounded-lg p-4 sm:p-6 overflow-x-auto">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <span className="text-green-400 font-mono text-xs sm:text-sm">_agent.anoteroslogos.com TXT</span>
                <button 
                  onClick={() => copyToClipboard('v=1.1;p=a2a,http;u=https://anoteroslogos.com/api/a2a;s=geoaudit;d=anoteroslogos.com')}
                  className="inline-flex items-center gap-2 text-xs bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded transition-all self-start sm:self-auto"
                  aria-label="Copy DNS TXT record to clipboard"
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      Copy
                    </>
                  )}
                </button>
              </div>
              <pre className="text-xs sm:text-sm text-slate-200 font-mono overflow-x-auto whitespace-pre-wrap break-all">
                v=1.1;p=a2a,http;u=https://anoteroslogos.com/api/a2a;s=geoaudit;d=anoteroslogos.com
              </pre>
            </div>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
              <div className="bg-white/5 border border-blue-500/30 p-3 sm:p-4 rounded-lg">
                <span className="font-mono text-xs sm:text-sm font-semibold text-blue-400">v=1.1</span>
                <p className="text-xs text-white/60 mt-1">Protocol version</p>
              </div>
              <div className="bg-white/5 border border-green-500/30 p-3 sm:p-4 rounded-lg">
                <span className="font-mono text-xs sm:text-sm font-semibold text-green-400">p=a2a,http</span>
                <p className="text-xs text-white/60 mt-1">Supported protocols</p>
              </div>
              <div className="bg-white/5 border border-purple-500/30 p-3 sm:p-4 rounded-lg">
                <span className="font-mono text-xs sm:text-sm font-semibold text-purple-400">u=...</span>
                <p className="text-xs text-white/60 mt-1">Endpoint URL</p>
              </div>
              <div className="bg-white/5 border border-orange-500/30 p-3 sm:p-4 rounded-lg">
                <span className="font-mono text-xs sm:text-sm font-semibold text-orange-400">s=geoaudit</span>
                <p className="text-xs text-white/60 mt-1">Service identifier</p>
              </div>
              <div className="bg-white/5 border border-pink-500/30 p-3 sm:p-4 rounded-lg">
                <span className="font-mono text-xs sm:text-sm font-semibold text-pink-400">d=...</span>
                <p className="text-xs text-white/60 mt-1">Domain ownership</p>
              </div>
            </div>
          </div>

          {/* Agent Capabilities */}
          <div className="bg-white/5 border border-brand-secondary rounded-xl p-6 sm:p-8 mb-8 sm:mb-12">
            <div className="flex items-center gap-3 mb-6">
              <Bot className="w-6 h-6 sm:w-8 sm:h-8 text-brand-accent" />
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white">
                Agent Capabilities
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <div className="border border-white/10 rounded-lg p-4 sm:p-6 bg-white/5">
                <h3 className="text-base sm:text-lg font-semibold text-white mb-4">Core Operations</h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-mono text-xs sm:text-sm text-white">geo.audit.request</span>
                      <p className="text-xs text-white/60">Single URL GEO audit</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-mono text-xs sm:text-sm text-white">geo.audit.batch</span>
                      <p className="text-xs text-white/60">Batch processing support</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-mono text-xs sm:text-sm text-white">geo.insights.global</span>
                      <p className="text-xs text-white/60">Market intelligence</p>
                    </div>
                  </li>
                </ul>
              </div>

              <div className="border border-white/10 rounded-lg p-4 sm:p-6 bg-white/5">
                <h3 className="text-base sm:text-lg font-semibold text-white mb-4">Discovery & Status</h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-mono text-xs sm:text-sm text-white">a2a.discover</span>
                      <p className="text-xs text-white/60">Agent discovery protocol</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-mono text-xs sm:text-sm text-white">a2a.capabilities</span>
                      <p className="text-xs text-white/60">Capability enumeration</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-mono text-xs sm:text-sm text-white">a2a.status</span>
                      <p className="text-xs text-white/60">Health monitoring</p>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Discovery Mechanisms */}
          <div className="bg-white/5 border border-brand-secondary rounded-xl p-6 sm:p-8 mb-8 sm:mb-12">
            <div className="flex items-center gap-3 mb-6">
              <Search className="w-6 h-6 sm:w-8 sm:h-8 text-brand-accent" />
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white">
                Discovery Mechanisms
              </h2>
            </div>

            <p className="text-sm sm:text-base text-white/70 mb-6">
              AID uses a hybrid approach with DNS as primary and HTTPS well-known as fallback.
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
              <div className="bg-white/5 border border-blue-500/30 p-6 rounded-lg hover:border-blue-500/50 transition-colors">
                <div className="flex items-center gap-2 mb-4">
                  <div className="bg-brand-accent text-white px-3 py-1 rounded-full text-xs font-semibold">
                    Primary
                  </div>
                  <h3 className="text-base sm:text-lg font-semibold text-white">DNS TXT Record</h3>
                </div>
                <div className="bg-slate-900 rounded p-4 mb-4">
                  <code className="text-xs sm:text-sm text-green-400 font-mono break-all">
                    dig _agent.anoteroslogos.com TXT
                  </code>
                </div>
                <p className="text-xs sm:text-sm text-white/60">
                  Fast, distributed lookup via global DNS infrastructure. Response time under 50ms.
                </p>
              </div>

              <div className="bg-white/5 border border-green-500/30 p-6 rounded-lg hover:border-green-500/50 transition-colors">
                <div className="flex items-center gap-2 mb-4">
                  <div className="bg-green-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
                    Fallback
                  </div>
                  <h3 className="text-base sm:text-lg font-semibold text-white">HTTPS Well-Known</h3>
                </div>
                <div className="bg-slate-900 rounded p-4 mb-4">
                  <code className="text-xs sm:text-sm text-green-400 font-mono break-all">
                    GET /.well-known/agent.json
                  </code>
                </div>
                <p className="text-xs sm:text-sm text-white/60">
                  RFC 8615 compliant well-known URI. Automatic fallback if DNS lookup fails.
                </p>
              </div>
            </div>
          </div>

          {/* Security & Verification */}
          <div className="bg-white/5 border border-brand-secondary rounded-xl p-6 sm:p-8 mb-8 sm:mb-12">
            <div className="flex items-center gap-3 mb-6">
              <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-green-400" />
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white">
                Security & Verification
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
              <div className="border-l-4 border-brand-accent pl-4">
                <h3 className="text-sm sm:text-base font-semibold text-white mb-2">DNS Control</h3>
                <p className="text-xs sm:text-sm text-white/60">
                  Ability to set TXT records proves domain ownership and administrative access.
                </p>
              </div>

              <div className="border-l-4 border-green-500 pl-4">
                <h3 className="text-sm sm:text-base font-semibold text-white mb-2">TLS Certificate</h3>
                <p className="text-xs sm:text-sm text-white/60">
                  Valid SSL/TLS certificate verifies HTTPS endpoint authenticity and encryption.
                </p>
              </div>

              <div className="border-l-4 border-purple-500 pl-4">
                <h3 className="text-sm sm:text-base font-semibold text-white mb-2">Ed25519 Signatures</h3>
                <p className="text-xs sm:text-sm text-white/60">
                  RFC 9421 HTTP Message Signatures provide cryptographic proof for requests.
                </p>
              </div>
            </div>

            <div className="mt-6 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
              <p className="text-xs sm:text-sm text-yellow-300">
                <strong>Note:</strong> Ed25519 signature implementation requires backend key management. Key ID is declared but verification is not yet implemented in this version.
              </p>
            </div>
          </div>

          {/* Market Adoption */}
          <div className="bg-gradient-to-br from-brand-accent/20 via-purple-600/20 to-pink-600/20 border border-brand-accent/30 rounded-xl p-6 sm:p-8 mb-8 sm:mb-12 text-white">
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
              <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-4">
                <h3 className="font-semibold mb-2 text-sm sm:text-base">Protocol Integration</h3>
                <p className="text-xs sm:text-sm text-white/70">MCP, A2A, ANP servers</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-4">
                <h3 className="font-semibold mb-2 text-sm sm:text-base">Marketplace Support</h3>
                <p className="text-xs sm:text-sm text-white/70">OpenAI, Claude, Vertex AI</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-4">
                <h3 className="font-semibold mb-2 text-sm sm:text-base">Standards Track</h3>
                <p className="text-xs sm:text-sm text-white/70">IETF RFC discussion</p>
              </div>
            </div>
          </div>

          {/* Quick Start Guide */}
          <div className="bg-white/5 border-2 border-emerald-500/30 rounded-xl p-6 sm:p-8 mb-8 sm:mb-12">
            <div className="flex items-center gap-3 mb-6">
              <Zap className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-400" />
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white">
                Quick Start Guide
              </h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white/5 border border-white/10 rounded-lg p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-sm">1</div>
                  <h3 className="font-semibold text-white">Create agent.json</h3>
                </div>
                <p className="text-sm text-white/70 mb-2">Add to <code className="bg-slate-900 px-2 py-0.5 rounded text-xs font-mono text-green-400">public/.well-known/agent.json</code></p>
                <p className="text-xs text-white/50">Include version, protocols, endpoint, capabilities</p>
              </div>
              
              <div className="bg-white/5 border border-white/10 rounded-lg p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-sm">2</div>
                  <h3 className="font-semibold text-white">Add DNS TXT Record</h3>
                </div>
                <p className="text-sm text-white/70 mb-2">At <code className="bg-slate-900 px-2 py-0.5 rounded text-xs font-mono text-green-400">_agent.yourdomain.com</code></p>
                <p className="text-xs text-white/50">Use compact format: v=1.1;p=a2a,http;u=...</p>
              </div>
              
              <div className="bg-white/5 border border-white/10 rounded-lg p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-sm">3</div>
                  <h3 className="font-semibold text-white">Configure CORS</h3>
                </div>
                <p className="text-sm text-white/70 mb-2">Enable cross-origin access</p>
                <p className="text-xs text-white/50">Add Access-Control-Allow-Origin: * header</p>
              </div>
              
              <div className="bg-white/5 border border-white/10 rounded-lg p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-sm">4</div>
                  <h3 className="font-semibold text-white">Verify Setup</h3>
                </div>
                <p className="text-sm text-white/70 mb-2">Test DNS and HTTPS endpoints</p>
                <p className="text-xs text-white/50">Use dig command or online DNS tools</p>
              </div>
            </div>
            
            <div className="mt-6 flex flex-wrap gap-3 justify-center">
              <a 
                href="/.well-known/agent.json"
                target="_blank"
                className="inline-flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium"
              >
                <FileJson className="w-4 h-4" />
                View Example
              </a>
              <a 
                href="https://github.com/agentcommunity/aid-protocol"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-white/10 text-emerald-400 px-5 py-2.5 rounded-lg hover:bg-white/15 transition-colors text-sm font-medium border-2 border-emerald-500/50"
              >
                <BookOpen className="w-4 h-4" />
                Full Documentation
              </a>
            </div>
          </div>
          
          {/* CTA Section */}
          <div className="bg-white/5 border border-brand-secondary rounded-xl p-6 sm:p-8 text-center">
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-4">
              Test AID Discovery on Your Domain
            </h2>
            <p className="text-sm sm:text-base text-white/70 max-w-2xl mx-auto mb-6 sm:mb-8">
              Use our GEO Audit tool to check if your domain has AID protocol configured. Get instant feedback on DNS TXT records, HTTPS endpoints, and agent metadata completeness.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
              <a 
                href="/geo-audit" 
                className="inline-flex items-center justify-center gap-2 bg-brand-accent text-white px-6 sm:px-8 py-3 sm:py-4 rounded-lg hover:bg-blue-500 transition-colors text-sm sm:text-base font-medium shadow-lg hover:shadow-xl"
              >
                Test Your Domain
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
              </a>
              <a 
                href="/knowledge-base" 
                className="inline-flex items-center justify-center gap-2 bg-white/10 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-lg hover:bg-white/15 transition-colors text-sm sm:text-base font-medium border border-white/20"
              >
                <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
                Learn More
              </a>
            </div>
          </div>

        </div>
      </div>
      
      <Footer 
        onPhilosophyClick={() => window.location.href = '/#philosophy'}
        onMethodClick={() => window.location.href = '/#nicosia-method'}
        onClientsClick={() => window.location.href = '/#clients'}
        onFAQClick={() => window.location.href = '/#faq'}
        onContactClick={() => window.location.href = '/#contact'}
      />
    </>
  );
};

export default AgentIdentityPage;
