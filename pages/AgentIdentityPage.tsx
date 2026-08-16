/**
 * Agent Identity & Documentation Page
 * Enterprise-Grade Machine-Readable API Specification
 * 
 * Target Audience: AI Agents (LLMs, AutoGen, LangChain, CrewAI)
 * Purpose: Complete protocol specification for autonomous integration
 * Standards: AIP v1.1, A2A v1.0.0, MCP 2025-06-18, RFC 8615, RFC 9421
 */

import { useEffect } from 'react';
import SEOHead from '../components/SEOHead';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { SchemaBlock } from '../components/AgentDocs/SchemaBlock';
import { CodeSample } from '../components/AgentDocs/CodeSample';
import { InteractiveExplorer } from '../components/AgentDocs/InteractiveExplorer';
import { CopyButton, QRCodeDisplay, ChallengeTester } from '../components/AgentDocs/AgentGatewayUI';
import {
  Network, Shield, Code, Terminal, Zap, Database,
  CheckCircle2, AlertTriangle, Clock, Lock, Key, FileJson,
  BookOpen, ChevronRight, Server, Cpu, Globe
} from 'lucide-react';

const AgentIdentityPage = () => {
  // Add machine-readable metadata to <head>
  useEffect(() => {
    // Link rel for agent manifest
    const manifestLink = document.createElement('link');
    manifestLink.rel = 'agent-manifest';
    manifestLink.href = '/.well-known/agent.json';
    document.head.appendChild(manifestLink);

    // Meta tag for capabilities
    const capabilitiesMeta = document.createElement('meta');
    capabilitiesMeta.name = 'agent-capabilities';
    capabilitiesMeta.content = '/api/capabilities';
    document.head.appendChild(capabilitiesMeta);

    // JSON-LD structured data
    const jsonLdScript = document.createElement('script');
    jsonLdScript.type = 'application/ld+json';
    jsonLdScript.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      'name': 'Anóteros Lógos Agent API',
      'applicationCategory': 'DeveloperApplication',
      'operatingSystem': 'All',
      'offers': {
        '@type': 'Offer',
        'price': '0',
        'priceCurrency': 'USD'
      },
      'featureList': [
        'UAP v1.0 (Universal Agent Protocol)',
        'A2A Protocol v1.0',
        'MCP 2025-06-18 Integration',
        'Ed25519 Authentication',
        'Public AIP Generation',
        'Challenge-Response Auth',
        'OpenAPI 3.1 Spec'
      ]
    });
    document.body.appendChild(jsonLdScript);

    return () => {
      document.head.removeChild(manifestLink);
      document.head.removeChild(capabilitiesMeta);
      document.body.removeChild(jsonLdScript);
    };
  }, []);

  return (
    <>
      <SEOHead
        title="AI Agent Integration Specification | UAP, A2A, MCP Protocols | Anóteros Lógos"
        description="Protocol documentation for AI agents integrating with Anóteros Lógos. Live surface: AIP discovery, A2A JSON-RPC 2.0 gateway (GEO audit, knowledge graph, citation prediction, identity), capabilities, watermark verification, and MCP tools. Design-stage reference implementations: UAP v1.0 transport, BFT trust layer, agent mesh, and micropayments. TypeScript/Python examples. LangChain, AutoGen, CrewAI integration patterns."
        keywords="Anóteros Lógos Protocol, cryptographic verification, semantic data, UAP protocol, Universal Agent Protocol, AI agent API, A2A protocol, MCP integration, agent discovery, JSON-RPC 2.0, Ed25519 signatures, BFT consensus, trust layer, LangChain tools, AutoGen functions, CrewAI integration, AI agent authentication, rate limiting, GEO audit API, Zero-Knowledge Proofs"
        type="article"
        url="https://anoteroslogos.com/agent-identity"
      />

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
            <span className="text-white font-medium">Agent Documentation</span>
          </nav>

          {/* Hero Section */}
          <div className="mb-12">
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-4">
              Machine-Readable Specification
            </p>
            
            <h1 className="text-4xl lg:text-5xl font-bold text-white mb-4">
              AI Agent Integration Specification
            </h1>
            
            <p className="text-lg text-white/70 max-w-3xl mb-6">
              Protocol documentation for autonomous agent integration. Covers the live agent surface — AIP (Anóteros Identity Protocol) v1.1 discovery, the A2A (Agent-to-Agent) JSON-RPC gateway, and MCP (Model Context Protocol) tools — alongside the reference implementations for UAP v1.0, mesh, consensus, and payments. Each subsystem is labelled LIVE or DESIGN so you always know what is callable today.
            </p>

            <div className="flex flex-wrap gap-3">
              <span className="px-3 py-1 bg-blue-500/10 border border-blue-500/30 rounded text-xs font-mono text-blue-400">
                AIP v1.1
              </span>
              <span className="px-3 py-1 bg-cyan-500/10 border border-cyan-500/30 rounded text-xs font-mono text-cyan-400">
                UAP v1.0
              </span>
              <span className="px-3 py-1 bg-green-500/10 border border-green-500/30 rounded text-xs font-mono text-green-400">
                A2A v1.0 (Linux Foundation)
              </span>
              <span className="px-3 py-1 bg-purple-500/10 border border-purple-500/30 rounded text-xs font-mono text-purple-400">
                MCP 2025-06-18
              </span>
              <span className="px-3 py-1 bg-orange-500/10 border border-orange-500/30 rounded text-xs font-mono text-orange-400">
                RFC 8615 Compliant
              </span>
            </div>

            {/* Machine-readable, JavaScript-free mirror for agents */}
            <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
              <span className="font-mono uppercase tracking-wider text-zinc-500">Machine-readable:</span>
              <a href="/llms.txt" className="font-mono text-brand-accent hover:text-blue-400 transition-colors">/llms.txt</a>
              <a href="/llms-full.txt" className="font-mono text-brand-accent hover:text-blue-400 transition-colors">/llms-full.txt</a>
              <a href="/.well-known/agent.json" className="font-mono text-brand-accent hover:text-blue-400 transition-colors">/.well-known/agent.json</a>
              <a href="/api/capabilities" className="font-mono text-brand-accent hover:text-blue-400 transition-colors">/api/capabilities</a>
            </div>
          </div>

          {/* Capability Status Banner */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
            {/* Live now */}
            <div className="bg-emerald-500/5 border border-emerald-500/30 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <h2 className="text-sm font-semibold text-emerald-300 uppercase tracking-wider">Live now</h2>
              </div>
              <p className="text-xs text-white/60 mb-4">
                Callable in production today. No signup required.
              </p>
              <ul className="space-y-1.5 text-sm text-white/80">
                <li className="flex items-start gap-2"><span className="text-emerald-400 mt-0.5">•</span><span>Protocol Discovery (AIP v1.1)</span></li>
                <li className="flex items-start gap-2"><span className="text-emerald-400 mt-0.5">•</span><span>Agent Gateway (identity generate / challenge / verify)</span></li>
                <li className="flex items-start gap-2"><span className="text-emerald-400 mt-0.5">•</span><span>A2A gateway: GEO audit, knowledge graph, citation prediction, identity</span></li>
                <li className="flex items-start gap-2"><span className="text-emerald-400 mt-0.5">•</span><span>Capabilities descriptor (<code className="font-mono text-xs text-emerald-300">/api/capabilities</code>)</span></li>
                <li className="flex items-start gap-2"><span className="text-emerald-400 mt-0.5">•</span><span>Verify — Ed25519 + UCPT watermark (<code className="font-mono text-xs text-emerald-300">/api/verify</code>)</span></li>
                <li className="flex items-start gap-2"><span className="text-emerald-400 mt-0.5">•</span><span>MCP tools: auditSite / getGraph / predictCitation</span></li>
              </ul>
            </div>

            {/* Design / reference implementation */}
            <div className="bg-amber-500/5 border border-amber-500/30 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                <h2 className="text-sm font-semibold text-amber-300 uppercase tracking-wider">Design / reference implementation</h2>
              </div>
              <p className="text-xs text-white/60 mb-4">
                Implemented as libraries and specified in full, but not running on the current serverless deployment; a persistent host is required.
              </p>
              <ul className="space-y-1.5 text-sm text-white/70">
                <li className="flex items-start gap-2"><span className="text-amber-400 mt-0.5">•</span><span>UAP v1.0 transport (HTTP/2 + WebSocket sessions)</span></li>
                <li className="flex items-start gap-2"><span className="text-amber-400 mt-0.5">•</span><span>BFT / PBFT consensus &amp; Trust Layer</span></li>
                <li className="flex items-start gap-2"><span className="text-amber-400 mt-0.5">•</span><span>Agent Mesh Network (DHT / libp2p)</span></li>
                <li className="flex items-start gap-2"><span className="text-amber-400 mt-0.5">•</span><span>CCC credit/penalty economy</span></li>
                <li className="flex items-start gap-2"><span className="text-amber-400 mt-0.5">•</span><span>APA micropayments (USDC on Base L2)</span></li>
                <li className="flex items-start gap-2"><span className="text-amber-400 mt-0.5">•</span><span>MCP advanced tools (code_execution, synthesizeNode, causal_citation_trace, predictive_synthesis, federated_authority_boost)</span></li>
              </ul>
            </div>
          </div>

          {/* Quick Navigation */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6 mb-12">
            <h2 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Quick Navigation</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <a href="#protocol-discovery" className="text-xs text-brand-accent hover:text-blue-400 transition-colors font-medium">
                → Protocol Discovery
              </a>
              <a href="#agent-gateway" className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors font-medium">
                → Agent Gateway (New)
              </a>
              <a href="#uap-protocol" className="text-xs text-amber-400 hover:text-amber-300 transition-colors font-medium">
                → UAP v1.0 Protocol (Design)
              </a>
              <a href="#a2a-protocol" className="text-xs text-brand-accent hover:text-blue-400 transition-colors font-medium">
                → A2A Protocol v1.0
              </a>
              <a href="#a2a-tasks" className="text-xs text-brand-accent hover:text-blue-400 transition-colors font-medium">
                → Task Lifecycle
              </a>
              <a href="#apa-payments" className="text-xs text-amber-400 hover:text-amber-300 transition-colors font-medium">
                → APA Micropayments (Design)
              </a>
              <a href="#mesh-network" className="text-xs text-amber-400 hover:text-amber-300 transition-colors font-medium">
                → Agent Mesh Network (Design)
              </a>
              <a href="#mcp-protocol" className="text-xs text-brand-accent hover:text-blue-400 transition-colors font-medium">
                → MCP Protocol
              </a>
              <a href="#authentication" className="text-xs text-brand-accent hover:text-blue-400 transition-colors font-medium">
                → Authentication
              </a>
              <a href="#integration" className="text-xs text-brand-accent hover:text-blue-400 transition-colors font-medium">
                → Integration Cookbook
              </a>
              <a href="#schemas" className="text-xs text-brand-accent hover:text-blue-400 transition-colors font-medium">
                → Response Schemas
              </a>
              <a href="#performance" className="text-xs text-brand-accent hover:text-blue-400 transition-colors font-medium">
                → Performance & Reliability
              </a>
              <a href="#testing" className="text-xs text-brand-accent hover:text-blue-400 transition-colors font-medium">
                → Testing & Validation
              </a>
            </div>
          </div>

          {/* Section 1: Protocol Discovery (AIP v1.1) */}
          <section id="protocol-discovery" className="mb-16">
            <div className="flex items-center gap-3 mb-6">
              <Globe className="w-8 h-8 text-brand-accent" />
              <h2 className="text-3xl font-bold text-white">Protocol Discovery (AIP v1.1)</h2>
              <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded text-xs font-semibold text-emerald-400">
                LIVE
              </span>
            </div>

            <p className="text-white/70 mb-6">
              AIP (Anóteros Identity Protocol) enables DNS-based agent discovery with HTTPS fallback. Compliant with RFC 8615 (Well-Known URIs).
            </p>

            <div className="space-y-6">
              {/* DNS TXT Record */}
              <div>
                <h3 className="text-xl font-semibold text-white mb-4">DNS TXT Record Discovery</h3>
                <p className="text-sm text-white/70 mb-4">
                  Primary discovery method. Single TXT record at <code className="bg-zinc-950 px-2 py-0.5 rounded text-brand-accent font-mono text-xs">_agent.domain.com</code>
                </p>
                
                <SchemaBlock
                  title="_agent.anoteroslogos.com TXT"
                  schema="v=1.1;p=a2a,http;u=https://anoteroslogos.com/api/a2a;s=geoaudit;d=anoteroslogos.com"
                  defaultOpen={false}
                  description="Compact format fitting within 255-byte DNS limit"
                />

                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-zinc-900/30 border border-zinc-800 rounded-lg p-4">
                    <code className="text-xs font-mono text-brand-accent">v=1.1</code>
                    <p className="text-xs text-white/60 mt-2">Protocol version. REQUIRED.</p>
                  </div>
                  <div className="bg-zinc-900/30 border border-zinc-800 rounded-lg p-4">
                    <code className="text-xs font-mono text-green-400">p=a2a,http</code>
                    <p className="text-xs text-white/60 mt-2">Supported protocols (comma-separated)</p>
                  </div>
                  <div className="bg-zinc-900/30 border border-zinc-800 rounded-lg p-4">
                    <code className="text-xs font-mono text-purple-400">u=https://...</code>
                    <p className="text-xs text-white/60 mt-2">Primary endpoint URL. REQUIRED.</p>
                  </div>
                </div>
              </div>

              {/* HTTPS Well-Known */}
              <div>
                <h3 className="text-xl font-semibold text-white mb-4">HTTPS Well-Known Endpoints (RFC 8615)</h3>
                <p className="text-sm text-white/70 mb-4">
                  Two discovery endpoints: agent.json (AIP v1.1) and agent-card.json (Linux Foundation A2A v1.0). CORS-enabled, JSON format.
                </p>

                <CodeSample
                  title="GET /.well-known/agent.json (AIP v1.1)"
                  samples={[
                    {
                      language: 'bash',
                      label: 'cURL',
                      code: `curl -H "Accept: application/json" \\
  https://anoteroslogos.com/.well-known/agent.json`
                    },
                    {
                      language: 'typescript',
                      code: `const response = await fetch(
  'https://anoteroslogos.com/.well-known/agent.json',
  { headers: { 'Accept': 'application/json' } }
);
const agentInfo = await response.json();
console.log(agentInfo);`
                    },
                    {
                      language: 'python',
                      code: `import requests

response = requests.get(
    'https://anoteroslogos.com/.well-known/agent.json',
    headers={'Accept': 'application/json'}
)
agent_info = response.json()
print(agent_info)`
                    }
                  ]}
                />

                <div className="mt-4">
                  <SchemaBlock
                    title="agent.json Schema (AIP v1.1)"
                    schema={{
                      v: "1.1",
                      p: ["a2a", "http"],
                      u: "https://anoteroslogos.com/api/a2a",
                      s: "geoaudit",
                      a: {
                        name: "Anóteros Lógos GEO Agent",
                        version: "2.1.0",
                        capabilities: [
                          "a2a.discover",
                          "a2a.capabilities",
                          "a2a.ping",
                          "a2a.status",
                          "geo.audit.request",
                          "knowledge.graph.query",
                          "citation.predict",
                          "identity.generate",
                          "identity.challenge",
                          "identity.verify"
                        ]
                      },
                      d: "anoteroslogos.com",
                      k: {
                        alg: "Ed25519",
                        kid: "anoteroslogos-2025-primary"
                      }
                    }}
                    description="Complete agent metadata with capabilities and cryptographic keys"
                  />
                </div>

                <div className="mt-6">
                  <h4 className="text-lg font-semibold text-white mb-2">Agent Card</h4>
                  <p className="text-xs text-white/50 mb-3">
                    Linux Foundation A2A Protocol v1.0 standard
                  </p>
                  <p className="text-sm text-white/70 mb-4">
                    Standard discovery format with extensions for payment and consensus verification. Provides structured agent metadata for autonomous discovery and integration.
                  </p>
                  
                  <CodeSample
                    title="GET /.well-known/agent-card.json (A2A v1.0)"
                    samples={[
                      {
                        language: 'bash',
                        label: 'cURL',
                        code: `curl -H "Accept: application/json" \\
  https://anoteroslogos.com/.well-known/agent-card.json`
                      },
                      {
                        language: 'typescript',
                        code: `const response = await fetch(
  'https://anoteroslogos.com/.well-known/agent-card.json',
  { headers: { 'Accept': 'application/json' } }
);
const agentCard = await response.json();
console.log(agentCard.capabilities); // live A2A methods
// extensions.payment / verification describe design-stage subsystems`
                      }
                    ]}
                  />

                  <div className="mt-4">
                    <SchemaBlock
                      title="agent-card.json Schema (Linux Foundation A2A v1.0)"
                      schema={{
                        id: "agent://anoteroslogos.com/geo-audit",
                        name: "Anóteros Lógos GEO Audit Agent",
                        version: "1.0.0",
                        capabilities: [
                          "a2a.discover",
                          "a2a.capabilities",
                          "a2a.ping",
                          "a2a.status",
                          "geo.audit.request",
                          "knowledge.graph.query",
                          "citation.predict",
                          "identity.generate",
                          "identity.challenge",
                          "identity.verify"
                        ],
                        protocols: ["a2a/1.0", "jsonrpc/2.0", "mcp/2.0"],
                        endpoints: {
                          http: "https://anoteroslogos.com/api/a2a"
                        },
                        authentication: ["ed25519"],
                        extensions: {
                          payment: {
                            status: "DESIGN",
                            network: "base-l2",
                            token: "USDC",
                            note: "APA micropayments are a reference implementation; payment enforcement is not live on serverless."
                          },
                          verification: {
                            watermark: { status: "LIVE", endpoint: "/api/verify" },
                            consensus: {
                              status: "DESIGN",
                              method: "pbft-consensus",
                              quorum_size: 7,
                              note: "Consensus needs multiple long-lived peers; not runnable on stateless serverless."
                            }
                          }
                        }
                      }}
                      defaultOpen={true}
                      description="Live A2A capabilities. The payment and consensus extensions describe design-stage subsystems (labelled DESIGN); watermark verification is LIVE via /api/verify."
                    />
                  </div>
                </div>
              </div>

              {/* Discovery Flow */}
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Discovery Flow Algorithm</h3>
                <div className="space-y-3 text-sm text-white/70 font-mono">
                  <div className="flex items-start gap-3">
                    <span className="text-brand-accent">1.</span>
                    <span>Attempt DNS TXT lookup: <code className="text-green-400">dig _agent.domain.com TXT</code></span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-brand-accent">2.</span>
                    <span>If DNS fails (timeout &gt; 5s): Fallback to HTTPS</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-brand-accent">3.</span>
                    <span>GET <code className="text-purple-400">https://domain.com/.well-known/agent.json</code></span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-brand-accent">4.</span>
                    <span>If HTTPS fails: Agent not discoverable</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-brand-accent">5.</span>
                    <span>Parse endpoint URL from <code className="text-orange-400">u</code> field</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-brand-accent">6.</span>
                    <span>Initiate A2A connection to discovered endpoint</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Agent Gateway Section (NEW) */}
          <section id="agent-gateway" className="mb-16">
            <div className="flex items-center gap-3 mb-6">
              <Key className="w-8 h-8 text-emerald-400" />
              <h2 className="text-3xl font-bold text-white">Agent Gateway v1.0</h2>
              <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded text-xs font-semibold text-emerald-400">
                LIVE
              </span>
            </div>

            <p className="text-white/70 mb-6">
              Stateless, machine-first agent authentication and discovery. Generate credentials, verify signatures, and explore capabilities, all without human intervention.
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Lock className="w-5 h-5 text-brand-accent" />
                  <h3 className="text-base font-semibold text-white">Public AIP Generation</h3>
                </div>
                <p className="text-sm text-white/60 mb-2">Ed25519 keypair generation</p>
                <code className="text-xs text-brand-accent font-mono">POST /api/public-aip</code>
                <p className="text-xs text-white/50 mt-2">10 req/min per IP</p>
              </div>

              <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="w-5 h-5 text-purple-400" />
                  <h3 className="text-base font-semibold text-white">Challenge-Response</h3>
                </div>
                <p className="text-sm text-white/60 mb-2">Ed25519 signature verification</p>
                <code className="text-xs text-purple-400 font-mono">GET/POST /api/challenge</code>
                <p className="text-xs text-white/50 mt-2">20 req/min per IP</p>
              </div>

              <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-5">
                <div className="flex items-center gap-2 mb-3">
                  <FileJson className="w-5 h-5 text-green-400" />
                  <h3 className="text-base font-semibold text-white">Tool Capabilities</h3>
                </div>
                <p className="text-sm text-white/60 mb-2">OpenAPI 3.1 merged spec</p>
                <code className="text-xs text-green-400 font-mono">GET /api/capabilities</code>
                <p className="text-xs text-white/50 mt-2">Cached, no limit</p>
              </div>
            </div>

            <div className="space-y-6">
              {/* Public AIP Generation */}
              <div>
                <h3 className="text-xl font-semibold text-white mb-4">1. Generate Agent Identity (AIP)</h3>
                <p className="text-sm text-white/70 mb-4">
                  Create Ed25519 keypair without authentication. Private key cached in-memory for 1 hour.
                </p>

                <CodeSample
                  title="POST /api/public-aip"
                  samples={[
                    {
                      language: 'bash',
                      code: `curl -X POST https://anoteroslogos.com/api/public-aip \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "MyAgent",
    "description": "Optional description",
    "capabilities": ["geo.audit"]
  }'`
                    },
                    {
                      language: 'typescript',
                      code: `const aip = await fetch('https://anoteroslogos.com/api/public-aip', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'MyAgent',
    capabilities: ['geo.audit']
  })
}).then(r => r.json());

console.log(aip.aip); // aip://myagent/...
console.log(aip.publicKey); // 64-char hex
console.log(aip.privateKey); // 64-char hex (store securely!)`
                    },
                    {
                      language: 'python',
                      code: `import requests

res = requests.post(
    'https://anoteroslogos.com/api/public-aip',
    json={
        'name': 'MyAgent',
        'capabilities': ['geo.audit']
    }
)
aip = res.json()
print(aip['aip'])
print(aip['publicKey'])`
                    }
                  ]}
                />

                <div className="mt-4 flex items-center gap-3">
                  <CopyButton 
                    text="https://anoteroslogos.com/api/public-aip" 
                    label="Copy Endpoint" 
                  />
                </div>
              </div>

              {/* Capabilities Endpoint */}
              <div>
                <h3 className="text-xl font-semibold text-white mb-4">2. Fetch Tool Capabilities</h3>
                <p className="text-sm text-white/70 mb-4">
                  OpenAPI 3.1 spec merging all MCP tools (OpenAI, Claude, Grok formats).
                </p>

                <CodeSample
                  title="GET /api/capabilities"
                  samples={[
                    {
                      language: 'bash',
                      code: `curl https://anoteroslogos.com/api/capabilities`
                    },
                    {
                      language: 'typescript',
                      code: `const caps = await fetch('https://anoteroslogos.com/api/capabilities')
  .then(r => r.json());

console.log(caps.paths); // All tool endpoints
console.log(caps.components.schemas); // Parameter schemas`
                    }
                  ]}
                />

                <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <CopyButton 
                    text="https://anoteroslogos.com/api/capabilities" 
                    label="Copy Endpoint" 
                  />
                  <QRCodeDisplay url="https://anoteroslogos.com/.well-known/agent.json" />
                </div>
              </div>

              {/* Challenge Simulator */}
              <div>
                <h3 className="text-xl font-semibold text-white mb-4">3. Test Challenge-Response Auth</h3>
                <p className="text-sm text-white/70 mb-4">
                  Interactive simulator for Ed25519 signature verification.
                </p>

                <ChallengeTester />
              </div>

              {/* Integration Flow */}
              <div className="bg-gradient-to-br from-brand-accent/10 via-purple-600/10 to-pink-600/10 border border-brand-accent/20 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Terminal className="w-5 h-5" />
                  Complete Integration Flow
                </h3>
                <ol className="space-y-3 text-sm text-white/70">
                  <li className="flex gap-3">
                    <span className="text-brand-accent font-mono">1.</span>
                    <span><strong className="text-white">Discovery:</strong> Fetch <code className="bg-zinc-950 px-1.5 py-0.5 rounded font-mono text-xs">/.well-known/agent.json</code></span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-brand-accent font-mono">2.</span>
                    <span><strong className="text-white">Capabilities:</strong> GET <code className="bg-zinc-950 px-1.5 py-0.5 rounded font-mono text-xs">/api/capabilities</code></span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-brand-accent font-mono">3.</span>
                    <span><strong className="text-white">Generate AIP:</strong> POST <code className="bg-zinc-950 px-1.5 py-0.5 rounded font-mono text-xs">/api/public-aip</code></span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-brand-accent font-mono">4.</span>
                    <span><strong className="text-white">Get Challenge:</strong> GET <code className="bg-zinc-950 px-1.5 py-0.5 rounded font-mono text-xs">/api/challenge?aip=...</code></span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-brand-accent font-mono">5.</span>
                    <span><strong className="text-white">Sign:</strong> Use private key to sign challenge with Ed25519</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-brand-accent font-mono">6.</span>
                    <span><strong className="text-white">Verify:</strong> POST <code className="bg-zinc-950 px-1.5 py-0.5 rounded font-mono text-xs">/api/challenge</code> with signature</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-brand-accent font-mono">7.</span>
                    <span><strong className="text-white">Use API:</strong> Call protected endpoints with verified credentials</span>
                  </li>
                </ol>
                <div className="mt-4">
                  <a 
                    href="/docs/agent-gateway.md" 
                    className="inline-flex items-center gap-2 text-sm text-brand-accent hover:text-blue-400 transition-colors font-medium"
                  >
                    <BookOpen className="w-4 h-4" />
                    View Full Documentation →
                  </a>
                </div>
              </div>
            </div>
          </section>

          {/* UAP Protocol Section (NEW) */}
          <section id="uap-protocol" className="mb-16">
            <div className="flex items-center gap-3 mb-6">
              <Network className="w-8 h-8 text-cyan-400" />
              <h2 className="text-3xl font-bold text-white">UAP v1.0 (Universal Agent Protocol)</h2>
              <span className="px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded text-xs font-semibold text-amber-400">
                DESIGN
              </span>
            </div>

            <div className="bg-amber-500/5 border border-amber-500/30 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5" />
                <p className="text-sm text-amber-200/90">
                  <strong className="text-amber-300">Reference implementation — not live.</strong> UAP is implemented as a library and specified in full, but it is not running on the current serverless deployment. The stateful session transport (HTTP/2 :8443, WebSocket :8080) and the BFT Trust Layer require a persistent host and long-lived peers, which stateless serverless functions cannot provide. The schemas, ports, and flows below describe the design.
                </p>
              </div>
            </div>

            <p className="text-white/70 mb-6">
              Stateful agent-to-agent communication protocol with a BFT Trust Layer. Session-based messaging over HTTP/2 and WebSocket with Ed25519 authentication, watermark verification, and consensus routing. Designed for autonomous agents requiring trust attestation and cryptographic proof.
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Server className="w-5 h-5 text-cyan-400" />
                  <h3 className="text-base font-semibold text-white">Transport Adapters</h3>
                </div>
                <p className="text-sm text-white/60 mb-2">HTTP/2 + WebSocket multiplexing</p>
                <code className="text-xs text-cyan-400 font-mono block">:8443 (HTTP/2), :8080 (WS)</code>
                <p className="text-xs text-white/50 mt-2">CBOR binary, 600 req/min</p>
              </div>

              <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="w-5 h-5 text-purple-400" />
                  <h3 className="text-base font-semibold text-white">Trust Layer (Anóteros)</h3>
                </div>
                <p className="text-sm text-white/60 mb-2">BFT consensus + watermark verification</p>
                <code className="text-xs text-purple-400 font-mono block">Trust Score: 0-100</code>
                <p className="text-xs text-white/50 mt-2">7-node quorum, 2f+1 threshold</p>
              </div>

              <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Lock className="w-5 h-5 text-green-400" />
                  <h3 className="text-base font-semibold text-white">Session Management</h3>
                </div>
                <p className="text-sm text-white/60 mb-2">ULID-based sessions with correlation IDs</p>
                <code className="text-xs text-green-400 font-mono block">TTL: 1h (sliding window)</code>
                <p className="text-xs text-white/50 mt-2">Auto-reconnect, backoff retry</p>
              </div>
            </div>

            <div className="space-y-6">
              {/* Protocol Architecture */}
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Protocol Architecture</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <h4 className="text-sm font-semibold text-white mb-2">Message Types</h4>
                    <code className="text-xs text-cyan-400 font-mono">HandshakeSYN/ACK/FIN</code>
                    <p className="text-xs text-white/60 mt-1">3-way handshake with trust attestation</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white mb-2">Serialization</h4>
                    <code className="text-xs text-green-400 font-mono">CBOR (RFC 8949)</code>
                    <p className="text-xs text-white/60 mt-1">40-60% smaller than JSON</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white mb-2">Reliability</h4>
                    <code className="text-xs text-purple-400 font-mono">Circuit Breaker</code>
                    <p className="text-xs text-white/60 mt-1">5 failures → 60s open state</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white mb-2">Identifiers</h4>
                    <code className="text-xs text-orange-400 font-mono">ULID (timestamp-sorted)</code>
                    <p className="text-xs text-white/60 mt-1">Correlation tracking, 128-bit UUID</p>
                  </div>
                </div>
              </div>

              {/* Handshake Flow */}
              <div>
                <h3 className="text-xl font-semibold text-white mb-4">1. Three-Way Handshake with Trust Attestation</h3>
                <p className="text-sm text-white/70 mb-4">
                  UAP establishes sessions via HandshakeSYN/ACK/FIN sequence. Each message includes BFT watermark and Ed25519 signature. Trust middleware validates consensus participation and computes trust score before accepting connection.
                </p>

                <div className="bg-zinc-900/30 border border-zinc-800 rounded-lg p-6 mb-4">
                  <div className="space-y-3 text-sm text-white/70 font-mono">
                    <div className="flex items-start gap-3">
                      <span className="text-cyan-400">1.</span>
                      <span><strong className="text-white">Client → Server:</strong> HandshakeSYN with <code className="text-purple-400">agentId</code>, <code className="text-green-400">capabilities[]</code>, <code className="text-orange-400">ed25519Signature</code></span>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="text-cyan-400">2.</span>
                      <span><strong className="text-white">Server validates:</strong> Signature, BFT watermark, trust score (must be ≥50/100)</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="text-cyan-400">3.</span>
                      <span><strong className="text-white">Server → Client:</strong> HandshakeACK with <code className="text-blue-400">sessionId</code>, <code className="text-purple-400">serverCapabilities[]</code>, <code className="text-green-400">trustScore</code></span>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="text-cyan-400">4.</span>
                      <span><strong className="text-white">Client → Server:</strong> HandshakeFIN confirms session, begins message exchange</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="text-cyan-400">5.</span>
                      <span><strong className="text-white">Ongoing:</strong> MessageSEND/RECV with <code className="text-orange-400">correlationId</code> for request-response tracking</span>
                    </div>
                  </div>
                </div>

                <CodeSample
                  title="HandshakeSYN Example (TypeScript UAP Client)"
                  samples={[
                    {
                      language: 'typescript',
                      code: `import { UAPClient } from '@anoteroslogos/uap-client';

const client = new UAPClient({
  agentId: 'agent://myagent.example.com',
  privateKey: process.env.AGENT_PRIVATE_KEY!,
  serverUrl: 'https://anoteroslogos.com:8443'
});

// Automatic handshake on connect
await client.connect({
  capabilities: ['geo.audit', 'knowledge.graph'],
  metadata: {
    version: '1.0.0',
    environment: 'production'
  }
});

console.log('Session ID:', client.sessionId);
console.log('Trust Score:', client.trustScore); // 0-100`
                    },
                    {
                      language: 'python',
                      code: `from anoteroslogos_uap import UAPClient
import os

client = UAPClient(
    agent_id='agent://myagent.example.com',
    private_key=os.getenv('AGENT_PRIVATE_KEY'),
    server_url='https://anoteroslogos.com:8443'
)

# Automatic handshake
await client.connect(
    capabilities=['geo.audit', 'knowledge.graph'],
    metadata={'version': '1.0.0'}
)

print(f"Session ID: {client.session_id}")
print(f"Trust Score: {client.trust_score}")`
                    }
                  ]}
                />

                <div className="mt-4">
                  <SchemaBlock
                    title="HandshakeSYN Message Schema"
                    schema={{
                      type: "HandshakeSYN",
                      version: "1.0.0",
                      timestamp: "2025-11-27T10:00:00.000Z",
                      agentId: "agent://myagent.example.com",
                      capabilities: ["geo.audit", "knowledge.graph"],
                      metadata: {
                        version: "1.0.0",
                        environment: "production"
                      },
                      signature: "64-byte-ed25519-signature-hex",
                      watermark: {
                        consensusHash: "0xa3f9c2e1d8b4f6a5",
                        nodeId: "node_7",
                        sequenceNumber: 42,
                        timestamp: "2025-11-27T10:00:00.000Z"
                      }
                    }}
                    defaultOpen={false}
                    description="Complete handshake initiation with cryptographic proof"
                  />
                </div>
              </div>

              {/* Trust Layer Integration */}
              <div>
                <h3 className="text-xl font-semibold text-white mb-4">2. Anóteros Trust Layer</h3>
                <p className="text-sm text-white/70 mb-4">
                  Every UAP message passes through trust middleware before routing. Trust score formula: 0.4×consensus + 0.3×watermark + 0.2×uptime + 0.1×endorsements. Agents with trust score &lt;50 are rejected, 50-70 are rate-limited, 70+ receive priority routing.
                </p>

                <div className="bg-zinc-900/30 border border-zinc-800 rounded-lg p-6 mb-4">
                  <h4 className="text-sm font-semibold text-white mb-3">Trust Score Components</h4>
                  <div className="space-y-2 text-sm text-white/70">
                    <div className="flex justify-between">
                      <span><strong className="text-white">Consensus Participation:</strong> 40% weight</span>
                      <code className="text-cyan-400 font-mono text-xs">BFT round participation rate</code>
                    </div>
                    <div className="flex justify-between">
                      <span><strong className="text-white">Watermark Validity:</strong> 30% weight</span>
                      <code className="text-green-400 font-mono text-xs">Signature verification + timestamp freshness</code>
                    </div>
                    <div className="flex justify-between">
                      <span><strong className="text-white">Historical Uptime:</strong> 20% weight</span>
                      <code className="text-purple-400 font-mono text-xs">30-day availability metric</code>
                    </div>
                    <div className="flex justify-between">
                      <span><strong className="text-white">Peer Endorsements:</strong> 10% weight</span>
                      <code className="text-orange-400 font-mono text-xs">Vouches from trusted agents</code>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-amber-300/80 mb-2 italic">
                  Illustrative example of the designed response shape — not live production telemetry. The Trust Layer is a design-stage subsystem.
                </p>
                <SchemaBlock
                  title="Trust Attestation Response"
                  schema={{
                    agentId: "agent://myagent.example.com",
                    trustScore: 87,
                    components: {
                      consensusParticipation: 0.92,
                      watermarkValidity: 0.88,
                      historicalUptime: 0.95,
                      peerEndorsements: 0.65
                    },
                    tier: "high",
                    rateLimits: {
                      requestsPerMinute: 600,
                      burstCapacity: 100
                    },
                    endorsements: [
                      { from: "agent://trusted.example.com", weight: 0.8, timestamp: "2025-11-20T10:00:00.000Z" }
                    ],
                    watermarkVerification: {
                      valid: true,
                      consensusHash: "0xa3f9c2e1d8b4f6a5",
                      verifiedAt: "2025-11-27T10:00:01.000Z"
                    }
                  }}
                  defaultOpen={true}
                  description="Complete trust attestation with scoring breakdown"
                />
              </div>

              {/* Transport Adapters */}
              <div>
                <h3 className="text-xl font-semibold text-white mb-4">3. Transport Layer (HTTP/2 + WebSocket)</h3>
                <p className="text-sm text-white/70 mb-4">
                  Dual transport support: HTTP/2 for request-response (port 8443), WebSocket for persistent streaming (port 8080). Automatic protocol negotiation via ALPN. CBOR binary serialization with fallback to JSON for debugging.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="bg-zinc-900/30 border border-zinc-800 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                      <Server className="w-4 h-4 text-cyan-400" />
                      HTTP/2 Adapter
                    </h4>
                    <code className="text-xs text-cyan-400 font-mono block mb-2">https://anoteroslogos.com:8443</code>
                    <p className="text-xs text-white/60">Request-response RPC, ALPN negotiation, server push for streaming responses</p>
                    <p className="text-xs text-white/50 mt-2">Rate: 600 req/min, TLS 1.3 only</p>
                  </div>
                  <div className="bg-zinc-900/30 border border-zinc-800 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                      <Network className="w-4 h-4 text-purple-400" />
                      WebSocket Adapter
                    </h4>
                    <code className="text-xs text-purple-400 font-mono block mb-2">wss://anoteroslogos.com:8080</code>
                    <p className="text-xs text-white/60">Full-duplex streaming, pub/sub patterns, heartbeat ping/pong every 30s</p>
                    <p className="text-xs text-white/50 mt-2">Rate: 60 handshakes/hr, persistent sessions</p>
                  </div>
                </div>

                <CodeSample
                  title="UAP Client with Auto-Reconnect"
                  samples={[
                    {
                      language: 'typescript',
                      code: `import { UAPClient } from '@anoteroslogos/uap-client';

const client = new UAPClient({
  agentId: 'agent://myagent.example.com',
  privateKey: process.env.AGENT_PRIVATE_KEY!,
  serverUrl: 'wss://anoteroslogos.com:8080', // WebSocket
  options: {
    autoReconnect: true,
    maxReconnectAttempts: 5,
    reconnectBackoff: 'exponential', // 1s, 2s, 4s, 8s, 16s
    heartbeatInterval: 30000
  }
});

client.on('connected', (session) => {
  console.log('Connected, session:', session.id);
});

client.on('disconnected', (reason) => {
  console.log('Disconnected:', reason);
});

client.on('reconnecting', (attempt) => {
  console.log('Reconnecting attempt', attempt);
});

// Send message with correlation tracking
const response = await client.sendMessage({
  type: 'Request',
  method: 'geo.audit',
  params: { url: 'https://example.com' },
  correlationId: client.generateCorrelationId()
});

console.log('GEO Score:', response.result.score);`
                    },
                    {
                      language: 'bash',
                      label: 'HTTP/2 Direct (curl)',
                      code: `# Requires HTTP/2 capable curl
curl --http2-prior-knowledge \\
  -X POST https://anoteroslogos.com:8443/uap \\
  -H "Content-Type: application/cbor" \\
  -H "UAP-Agent-Id: agent://myagent.example.com" \\
  -H "UAP-Signature: $(sign_message)" \\
  --data-binary @handshake_syn.cbor`
                    }
                  ]}
                />
              </div>

              {/* Message Types */}
              <div>
                <h3 className="text-xl font-semibold text-white mb-4">4. Message Types & Routing</h3>
                <p className="text-sm text-white/70 mb-4">
                  UAP defines 8 core message types for session management, requests, streaming, and errors. All messages include correlation IDs for request-response tracking and watermarks for trust verification.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  {[
                    { type: 'HandshakeSYN', color: 'cyan', desc: 'Session initiation' },
                    { type: 'HandshakeACK', color: 'green', desc: 'Session acceptance' },
                    { type: 'HandshakeFIN', color: 'blue', desc: 'Session confirmation' },
                    { type: 'Request', color: 'purple', desc: 'RPC call' },
                    { type: 'Response', color: 'emerald', desc: 'RPC result' },
                    { type: 'StreamChunk', color: 'orange', desc: 'Streaming data' },
                    { type: 'Error', color: 'red', desc: 'Error response' },
                    { type: 'Ping/Pong', color: 'gray', desc: 'Heartbeat' }
                  ].map((item) => (
                    <div key={item.type} className={`bg-${item.color}-500/10 border border-${item.color}-500/30 rounded-lg p-3`}>
                      <code className={`text-xs font-mono text-${item.color}-400 block mb-1`}>{item.type}</code>
                      <p className="text-xs text-white/60">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Rate Limiting & Circuit Breaker */}
              <div>
                <h3 className="text-xl font-semibold text-white mb-4">5. Rate Limiting & Reliability</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="bg-zinc-900/30 border border-zinc-800 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-white mb-2">Rate Limits</h4>
                    <div className="space-y-1 text-xs text-white/60">
                      <p>General: <span className="text-white">600</span> req/min</p>
                      <p>Handshakes: <span className="text-white">60</span> per hour</p>
                      <p>Burst: <span className="text-white">100</span> requests</p>
                    </div>
                  </div>
                  <div className="bg-zinc-900/30 border border-zinc-800 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-white mb-2">Circuit Breaker</h4>
                    <div className="space-y-1 text-xs text-white/60">
                      <p>Failure threshold: <span className="text-white">5</span> consecutive</p>
                      <p>Open duration: <span className="text-white">60s</span></p>
                      <p>Half-open test: <span className="text-white">3</span> requests</p>
                    </div>
                  </div>
                  <div className="bg-zinc-900/30 border border-zinc-800 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-white mb-2">Retry Strategy</h4>
                    <div className="space-y-1 text-xs text-white/60">
                      <p>Backoff: <span className="text-white">Exponential</span></p>
                      <p>Max retries: <span className="text-white">5</span></p>
                      <p>Jitter: <span className="text-white">±500ms</span></p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Integration with Existing Protocols */}
              <div className="bg-gradient-to-br from-cyan-500/10 via-purple-600/10 to-pink-600/10 border border-cyan-500/20 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Network className="w-5 h-5" />
                  Integration with A2A & MCP
                </h3>
                <p className="text-sm text-white/70 mb-4">
                  UAP serves as transport layer for A2A JSON-RPC and MCP tool calls. Agents can establish UAP session, then invoke A2A methods within trusted channel. Trust scores from UAP handshake propagate to rate limiting and payment verification in A2A.
                </p>
                <div className="space-y-2 text-sm text-white/70">
                  <div className="flex gap-3">
                    <span className="text-cyan-400 font-mono">1.</span>
                    <span>Establish UAP session (HandshakeSYN/ACK/FIN)</span>
                  </div>
                  <div className="flex gap-3">
                    <span className="text-cyan-400 font-mono">2.</span>
                    <span>In the design, a higher trust score raises the A2A rate-limit ceiling (design-stage; the Trust Layer is not live)</span>
                  </div>
                  <div className="flex gap-3">
                    <span className="text-cyan-400 font-mono">3.</span>
                    <span>Send A2A JSON-RPC as UAP Request message</span>
                  </div>
                  <div className="flex gap-3">
                    <span className="text-cyan-400 font-mono">4.</span>
                    <span>Receive A2A result as UAP Response message</span>
                  </div>
                  <div className="flex gap-3">
                    <span className="text-cyan-400 font-mono">5.</span>
                    <span>APA payments verified against UAP agent identity</span>
                  </div>
                </div>
              </div>

              {/* Security & Best Practices */}
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <Shield className="w-4 h-4 text-yellow-400 mt-0.5" />
                  <div className="text-sm text-yellow-300">
                    <strong>Security Best Practices:</strong>
                    <ul className="list-disc ml-4 mt-2 space-y-1">
                      <li>Generate Ed25519 keypairs in secure enclave (never transmit private keys)</li>
                      <li>Verify BFT watermark signatures on every message before trust scoring</li>
                      <li>Implement session timeout handling (1h TTL with sliding window)</li>
                      <li>Use correlation IDs for request-response tracking to prevent replay attacks</li>
                      <li>Monitor trust score degradation and re-handshake if score drops &lt;50</li>
                      <li>Cache trust attestations for 5 minutes to reduce consensus load</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Code Example: Complete UAP Flow */}
              <div>
                <h3 className="text-xl font-semibold text-white mb-4">Complete Example: UAP + A2A GEO Audit</h3>
                <CodeSample
                  title="TypeScript: Full UAP Session with A2A JSON-RPC"
                  samples={[
                    {
                      language: 'typescript',
                      code: `import { UAPClient } from '@anoteroslogos/uap-client';

// 1. Initialize UAP client
const uap = new UAPClient({
  agentId: 'agent://myagent.example.com',
  privateKey: process.env.AGENT_PRIVATE_KEY!,
  serverUrl: 'wss://anoteroslogos.com:8080'
});

// 2. Connect with capabilities (automatic handshake)
await uap.connect({
  capabilities: ['geo.audit', 'a2a.rpc'],
  metadata: { version: '1.0.0' }
});

console.log('UAP Session ID:', uap.sessionId);
console.log('Trust Score:', uap.trustScore); // Must be ≥50

// 3. Send A2A JSON-RPC via UAP Request message
const correlationId = uap.generateCorrelationId();
const response = await uap.sendMessage({
  type: 'Request',
  correlationId,
  payload: {
    jsonrpc: '2.0',
    method: 'geo.audit.request',
    params: {
      url: 'https://example.com',
      depth: 'standard'
    },
    id: 1
  }
});

// 4. Extract A2A result from UAP Response
const a2aResult = response.payload.result;
console.log('GEO Score:', a2aResult.score);
console.log('Issues:', a2aResult.issues.length);

// 5. Trust attestation included in response
console.log('Response Trust Score:', response.metadata.trustScore);
console.log('Watermark Valid:', response.metadata.watermarkValid);

// 6. Graceful session termination
await uap.disconnect();`
                    },
                    {
                      language: 'python',
                      code: `from anoteroslogos_uap import UAPClient
import asyncio
import os

async def audit_with_uap():
    # 1. Initialize UAP client
    uap = UAPClient(
        agent_id='agent://myagent.example.com',
        private_key=os.getenv('AGENT_PRIVATE_KEY'),
        server_url='wss://anoteroslogos.com:8080'
    )
    
    # 2. Connect with handshake
    await uap.connect(
        capabilities=['geo.audit', 'a2a.rpc'],
        metadata={'version': '1.0.0'}
    )
    
    print(f"Session ID: {uap.session_id}")
    print(f"Trust Score: {uap.trust_score}")
    
    # 3. Send A2A JSON-RPC
    correlation_id = uap.generate_correlation_id()
    response = await uap.send_message(
        type='Request',
        correlation_id=correlation_id,
        payload={
            'jsonrpc': '2.0',
            'method': 'geo.audit.request',
            'params': {
                'url': 'https://example.com',
                'depth': 'standard'
            },
            'id': 1
        }
    )
    
    # 4. Extract result
    a2a_result = response['payload']['result']
    print(f"GEO Score: {a2a_result['score']}")
    
    # 5. Disconnect
    await uap.disconnect()

asyncio.run(audit_with_uap())`
                    }
                  ]}
                />
              </div>
            </div>
          </section>

          {/* Section 2: A2A Protocol */}
          <section id="a2a-protocol" className="mb-16">
            <div className="flex items-center gap-3 mb-6">
              <Network className="w-8 h-8 text-green-400" />
              <h2 className="text-3xl font-bold text-white">A2A Protocol v1.0 (Linux Foundation)</h2>
              <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded text-xs font-semibold text-emerald-400">
                LIVE
              </span>
            </div>

            <p className="text-white/70 mb-6">
              Linux Foundation Agent-to-Agent Protocol v1.0 implementation over JSON-RPC 2.0. The live gateway methods are <code className="bg-zinc-950 px-1.5 py-0.5 rounded font-mono text-xs">a2a.discover</code>, <code className="bg-zinc-950 px-1.5 py-0.5 rounded font-mono text-xs">a2a.capabilities</code>, <code className="bg-zinc-950 px-1.5 py-0.5 rounded font-mono text-xs">a2a.ping</code>, <code className="bg-zinc-950 px-1.5 py-0.5 rounded font-mono text-xs">a2a.status</code>, <code className="bg-zinc-950 px-1.5 py-0.5 rounded font-mono text-xs">geo.audit</code> (alias <code className="bg-zinc-950 px-1.5 py-0.5 rounded font-mono text-xs">geo.audit.request</code>), <code className="bg-zinc-950 px-1.5 py-0.5 rounded font-mono text-xs">knowledge.graph.query</code>, <code className="bg-zinc-950 px-1.5 py-0.5 rounded font-mono text-xs">citation.predict</code>, and the identity methods. Payment (USDC on Base L2) and Byzantine consensus (PBFT, 7-node quorum) are custom extensions implemented as reference libraries — they are design-stage and not enforced on the serverless deployment.
            </p>

            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-400 mt-0.5" />
                <div className="text-sm text-blue-300">
                  <strong>Standards Compliance:</strong> Agent Card discovery, ULID-based task IDs, SSE streaming, session management, multi-agent orchestration, reputation scoring, payment integration, and consensus routing. Full specification: <code className="bg-zinc-950 px-1.5 py-0.5 rounded font-mono text-xs">lib/a2a/A2A_SPEC_COMPLIANCE.md</code>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {/* Endpoint Information */}
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-semibold text-white mb-2">Endpoint</h4>
                    <code className="text-xs text-brand-accent font-mono">POST https://anoteroslogos.com/api/a2a</code>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white mb-2">Content-Type</h4>
                    <code className="text-xs text-green-400 font-mono">application/json</code>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white mb-2">Authorization</h4>
                    <code className="text-xs text-purple-400 font-mono">Bearer sk_tier_key32chars</code>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white mb-2">JSON-RPC Version</h4>
                    <code className="text-xs text-orange-400 font-mono">2.0</code>
                  </div>
                </div>
              </div>

              {/* Method: a2a.discover */}
              <div>
                <h3 className="text-xl font-semibold text-white mb-4">Method: a2a.discover</h3>
                <p className="text-sm text-white/70 mb-4">
                  Discover service capabilities, rate limits, and available methods. No authentication required.
                </p>

                <CodeSample
                  title="Request: a2a.discover"
                  samples={[
                    {
                      language: 'bash',
                      code: `curl -X POST https://anoteroslogos.com/api/a2a \\
  -H "Content-Type: application/json" \\
  -d '{
    "jsonrpc": "2.0",
    "method": "a2a.discover",
    "params": {},
    "id": 1
  }'`
                    },
                    {
                      language: 'typescript',
                      code: `const response = await fetch('https://anoteroslogos.com/api/a2a', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    jsonrpc: '2.0',
    method: 'a2a.discover',
    params: {},
    id: 1
  })
});
const result = await response.json();`
                    },
                    {
                      language: 'python',
                      code: `import requests

response = requests.post(
    'https://anoteroslogos.com/api/a2a',
    json={
        'jsonrpc': '2.0',
        'method': 'a2a.discover',
        'params': {},
        'id': 1
    }
)
result = response.json()`
                    }
                  ]}
                />

                <div className="mt-4">
                  <SchemaBlock
                    title="Response: a2a.discover"
                    schema={{
                      jsonrpc: "2.0",
                      result: {
                        protocol: "A2A",
                        version: "1.0.0",
                        service: "GEO Audit Platform",
                        description: "AI-native GEO audit service for analyzing website visibility to AI systems",
                        capabilities: [
                          "a2a.discover",
                          "a2a.capabilities",
                          "a2a.ping",
                          "a2a.status",
                          "geo.audit",
                          "geo.audit.request",
                          "knowledge.graph.query",
                          "citation.predict",
                          "identity.generate",
                          "identity.challenge",
                          "identity.verify"
                        ],
                        endpoints: {
                          http: "/api/a2a"
                        },
                        rate_limits: {
                          requests_per_minute: 10
                        }
                      },
                      id: 1
                    }}
                    defaultOpen={true}
                    description="Live A2A discovery. a2a.mesh.*, geo.audit.batch, geo.insights.global, and geo.audit.stream are design-stage and are not advertised as callable."
                  />
                </div>
              </div>

              {/* Method: geo.audit.request */}
              <div>
                <h3 className="text-xl font-semibold text-white mb-4">Method: geo.audit.request</h3>
                <p className="text-sm text-white/70 mb-4">
                  Perform GEO audit on single URL. Returns comprehensive analysis with score, issues, and recommendations. Requires API key.
                </p>

                <CodeSample
                  title="Request: geo.audit.request"
                  samples={[
                    {
                      language: 'bash',
                      code: `curl -X POST https://anoteroslogos.com/api/a2a \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer sk_pro_abc123..." \\
  -d '{
    "jsonrpc": "2.0",
    "method": "geo.audit.request",
    "params": {
      "url": "https://example.com",
      "depth": "standard",
      "include_recommendations": true
    },
    "id": 2
  }'`
                    },
                    {
                      language: 'typescript',
                      code: `const apiKey = process.env.ANOTEROS_API_KEY;
const response = await fetch('https://anoteroslogos.com/api/a2a', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': \`Bearer \${apiKey}\`
  },
  body: JSON.stringify({
    jsonrpc: '2.0',
    method: 'geo.audit.request',
    params: {
      url: 'https://example.com',
      depth: 'standard',
      include_recommendations: true
    },
    id: 2
  })
});
const audit = await response.json();`
                    },
                    {
                      language: 'python',
                      code: `import os
import requests

api_key = os.getenv('ANOTEROS_API_KEY')
response = requests.post(
    'https://anoteroslogos.com/api/a2a',
    headers={'Authorization': f'Bearer {api_key}'},
    json={
        'jsonrpc': '2.0',
        'method': 'geo.audit.request',
        'params': {
            'url': 'https://example.com',
            'depth': 'standard',
            'include_recommendations': True
        },
        'id': 2
    }
)
audit = response.json()`
                    }
                  ]}
                />

                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-zinc-900/30 border border-zinc-800 rounded-lg p-4">
                    <code className="text-xs font-mono text-brand-accent">url: string</code>
                    <p className="text-xs text-white/60 mt-2">Target URL to audit. REQUIRED. Must be valid HTTP/HTTPS.</p>
                  </div>
                  <div className="bg-zinc-900/30 border border-zinc-800 rounded-lg p-4">
                    <code className="text-xs font-mono text-green-400">depth: "quick" | "standard" | "deep"</code>
                    <p className="text-xs text-white/60 mt-2">Analysis depth. Default: "standard". Affects processing time.</p>
                  </div>
                  <div className="bg-zinc-900/30 border border-zinc-800 rounded-lg p-4">
                    <code className="text-xs font-mono text-purple-400">include_recommendations: boolean</code>
                    <p className="text-xs text-white/60 mt-2">Include actionable recommendations. Default: true.</p>
                  </div>
                </div>
              </div>

              {/* Method: geo.audit.batch */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="text-xl font-semibold text-white">Method: geo.audit.batch</h3>
                  <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/30 rounded text-[10px] font-semibold text-amber-400">
                    DESIGN
                  </span>
                </div>
                <p className="text-sm text-white/70 mb-4">
                  Design-stage method (not advertised as callable on the live gateway). In the design, it processes multiple URLs in parallel — max 100 URLs per batch, concurrency limit 5 simultaneous audits.
                </p>

                <CodeSample
                  title="Request: geo.audit.batch"
                  samples={[
                    {
                      language: 'typescript',
                      code: `const response = await fetch('https://anoteroslogos.com/api/a2a', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': \`Bearer \${apiKey}\`
  },
  body: JSON.stringify({
    jsonrpc: '2.0',
    method: 'geo.audit.batch',
    params: {
      urls: [
        'https://site1.com',
        'https://site2.com',
        'https://site3.com'
      ]
    },
    id: 3
  })
});`
                    },
                    {
                      language: 'python',
                      code: `response = requests.post(
    'https://anoteroslogos.com/api/a2a',
    headers={'Authorization': f'Bearer {api_key}'},
    json={
        'jsonrpc': '2.0',
        'method': 'geo.audit.batch',
        'params': {
            'urls': [
                'https://site1.com',
                'https://site2.com',
                'https://site3.com'
            ]
        },
        'id': 3
    }
)`
                    }
                  ]}
                />
              </div>

              {/* Rate Limits */}
              <div>
                <h3 className="text-xl font-semibold text-white mb-4">Rate Limits</h3>
                <p className="text-sm text-white/70 mb-4">
                  The public A2A gateway applies a default protocol rate limit of <span className="text-white">10 requests/minute</span> per client. Callers should read the rate-limit response headers and back off on <code className="bg-zinc-950 px-1.5 py-0.5 rounded font-mono text-xs">429</code> rather than assume a fixed ceiling.
                </p>

                <div className="mt-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5" />
                    <div className="text-sm text-yellow-300">
                      <strong>Rate Limit Headers:</strong> All responses include <code className="bg-zinc-950 px-1.5 py-0.5 rounded font-mono text-xs">X-RateLimit-Limit</code>, <code className="bg-zinc-950 px-1.5 py-0.5 rounded font-mono text-xs">X-RateLimit-Remaining</code>, <code className="bg-zinc-950 px-1.5 py-0.5 rounded font-mono text-xs">X-RateLimit-Reset</code>. Implement exponential backoff on 429 responses.
                    </div>
                  </div>
                </div>
              </div>

              {/* Error Codes */}
              <div>
                <h3 className="text-xl font-semibold text-white mb-4">Error Codes (JSON-RPC 2.0)</h3>
                <div className="space-y-2">
                  {[
                    { code: -32700, name: 'Parse Error', description: 'Invalid JSON received' },
                    { code: -32600, name: 'Invalid Request', description: 'JSON-RPC request malformed' },
                    { code: -32601, name: 'Method Not Found', description: 'Method does not exist' },
                    { code: -32602, name: 'Invalid Params', description: 'Invalid method parameters' },
                    { code: -32603, name: 'Internal Error', description: 'Server internal error' },
                    { code: -32000, name: 'Rate Limit Exceeded', description: 'Too many requests, retry after reset' },
                    { code: -32001, name: 'Authentication Required', description: 'Missing or invalid API key' },
                  ].map((error) => (
                    <div key={error.code} className="bg-zinc-900/30 border border-zinc-800 rounded p-3 flex items-start gap-3">
                      <code className="text-xs font-mono text-red-400 min-w-[60px]">{error.code}</code>
                      <div>
                        <div className="text-sm font-semibold text-white">{error.name}</div>
                        <div className="text-xs text-white/60">{error.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Section 2.5: A2A Task Lifecycle */}
          <section id="a2a-tasks" className="mb-16">
            <div className="flex items-center gap-3 mb-6">
              <Terminal className="w-8 h-8 text-cyan-400" />
              <h2 className="text-3xl font-bold text-white">Task Lifecycle & SSE Streaming</h2>
            </div>

            <p className="text-white/70 mb-6">
              Linux Foundation A2A Protocol task management with ULID-based IDs, structured responses, real-time progress via Server-Sent Events, and artifact tracking.
            </p>

            <div className="space-y-6">
              {/* Task Structure */}
              <div>
                <h3 className="text-xl font-semibold text-white mb-4">Task Structure</h3>
                <p className="text-sm text-white/70 mb-4">
                  Every A2A request creates a task with ULID identifier. Tasks track status, progress, cost breakdown, artifacts, and errors.
                </p>

                <p className="text-xs text-amber-300/80 mb-2 italic">
                  Illustrative example of the designed response shape — not live production telemetry. The <code className="font-mono">cost</code> / USDC fields describe the design-stage APA payment model, which is not enforced on serverless.
                </p>
                <SchemaBlock
                  title="Task Response Schema"
                  schema={{
                    task_id: "01JDKP5R2G4M8QYX3WTNZHF9V7",
                    status: "running",
                    method: "geo.audit.request",
                    params: { url: "https://example.com", depth: "standard" },
                    progress: 0.65,
                    result: null,
                    cost: {
                      base: 0.10,
                      priority_multiplier: 1.0,
                      tier_discount: 0.0,
                      total: 0.10,
                      currency: "USDC"
                    },
                    artifacts: [],
                    error: null,
                    created_at: "2025-11-23T17:30:00.000Z",
                    updated_at: "2025-11-23T17:30:15.000Z",
                    completed_at: null
                  }}
                  defaultOpen={true}
                  description="Task lifecycle from pending → running → completed/failed/cancelled"
                />
              </div>

              {/* SSE Streaming */}
              <div>
                <h3 className="text-xl font-semibold text-white mb-4">Server-Sent Events (SSE) Streaming</h3>
                <p className="text-sm text-white/70 mb-4">
                  Real-time task progress via SSE. EventSource-compatible format with automatic reconnection and heartbeat.
                </p>

                <CodeSample
                  title="SSE Streaming Client"
                  samples={[
                    {
                      language: 'typescript',
                      code: `const eventSource = new EventSource(
  \`https://anoteroslogos.com/api/a2a/tasks/\${taskId}/stream\`,
  { headers: { 'Authorization': \`Bearer \${apiKey}\` } }
);

eventSource.addEventListener('task.progress', (event) => {
  const data = JSON.parse(event.data);
  console.log(\`Progress: \${data.progress * 100}%\`);
});

eventSource.addEventListener('task.completed', (event) => {
  const data = JSON.parse(event.data);
  console.log('Result:', data.result);
  eventSource.close();
});

eventSource.addEventListener('task.failed', (event) => {
  const data = JSON.parse(event.data);
  console.error('Error:', data.error);
  eventSource.close();
});

eventSource.onerror = (error) => {
  console.error('Stream error:', error);
  eventSource.close();
};`
                    },
                    {
                      language: 'python',
                      code: `import sseclient
import requests

response = requests.get(
    f'https://anoteroslogos.com/api/a2a/tasks/{task_id}/stream',
    headers={'Authorization': f'Bearer {api_key}'},
    stream=True
)

client = sseclient.SSEClient(response)

for event in client.events():
    if event.event == 'task.progress':
        data = json.loads(event.data)
        print(f"Progress: {data['progress'] * 100}%")
    elif event.event == 'task.completed':
        data = json.loads(event.data)
        print('Result:', data['result'])
        break
    elif event.event == 'task.failed':
        data = json.loads(event.data)
        print('Error:', data['error'])
        break`
                    }
                  ]}
                />

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { event: 'task.created', color: 'blue', desc: 'Task initialized' },
                    { event: 'task.started', color: 'green', desc: 'Execution began' },
                    { event: 'task.progress', color: 'cyan', desc: 'Progress update' },
                    { event: 'task.completed', color: 'emerald', desc: 'Task finished' },
                    { event: 'task.failed', color: 'red', desc: 'Task error' },
                    { event: 'task.cancelled', color: 'yellow', desc: 'User cancelled' },
                    { event: 'heartbeat', color: 'gray', desc: 'Connection alive' },
                    { event: 'error', color: 'orange', desc: 'Stream error' }
                  ].map((item) => (
                    <div key={item.event} className={`bg-${item.color}-500/10 border border-${item.color}-500/30 rounded-lg p-3`}>
                      <code className={`text-xs font-mono text-${item.color}-400`}>{item.event}</code>
                      <p className="text-xs text-white/60 mt-1">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Session Management */}
              <div>
                <h3 className="text-xl font-semibold text-white mb-4">Session Management</h3>
                <p className="text-sm text-white/70 mb-4">
                  Group multiple tasks into sessions for conversation history, aggregated metrics, and batch cancellation.
                </p>

                <div className="bg-zinc-900/30 border border-zinc-800 rounded-lg p-6">
                  <div className="space-y-3 text-sm text-white/70 font-mono">
                    <div className="flex items-start gap-3">
                      <span className="text-brand-accent">1.</span>
                      <span>Create session: <code className="text-green-400">POST /api/a2a/sessions</code> returns <code className="text-purple-400">session_id</code></span>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="text-brand-accent">2.</span>
                      <span>Execute tasks with <code className="text-orange-400">session_id</code> parameter</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="text-brand-accent">3.</span>
                      <span>Query session metrics: total cost, execution time, success rate</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="text-brand-accent">4.</span>
                      <span>Cancel all tasks in session with single API call</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Orchestration */}
              <div>
                <h3 className="text-xl font-semibold text-white mb-4">Multi-Agent Orchestration</h3>
                <p className="text-sm text-white/70 mb-4">
                  Chain multiple agent tasks with sequential, parallel, or DAG execution patterns. Results automatically passed between agents.
                </p>

                <CodeSample
                  title="Orchestration Example: GEO Audit → Knowledge Graph → Citation Prediction"
                  samples={[
                    {
                      language: 'typescript',
                      code: `import { orchestrate } from '@anoteroslogos/a2a-sdk';

const result = await orchestrate({
  execution: 'sequential',
  steps: [
    {
      agent: 'geo-audit',
      method: 'geo.audit.request',
      params: { url: 'https://example.com', depth: 'deep' }
    },
    {
      agent: 'knowledge-graph',
      method: 'knowledge.graph.extract',
      params: { url: 'https://example.com' }
    },
    {
      agent: 'citation-predictor',
      method: 'citation.predict',
      params: {
        domain: 'example.com',
        graph: '{{steps[1].result}}' // Reference previous step
      }
    }
  ]
});

console.log('GEO Score:', result.steps[0].result.score);
console.log('Entities:', result.steps[1].result.entities.length);
console.log('Citation Probability:', result.steps[2].result.probability);`
                    }
                  ]}
                />

                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-zinc-900/30 border border-zinc-800 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-white mb-2">Sequential</h4>
                    <p className="text-xs text-white/60">Execute steps in order. Each step receives previous results.</p>
                  </div>
                  <div className="bg-zinc-900/30 border border-zinc-800 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-white mb-2">Parallel</h4>
                    <p className="text-xs text-white/60">Execute all steps concurrently. Wait for all to complete.</p>
                  </div>
                  <div className="bg-zinc-900/30 border border-zinc-800 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-white mb-2">DAG</h4>
                    <p className="text-xs text-white/60">Directed acyclic graph with dependencies between arbitrary steps.</p>
                  </div>
                </div>
              </div>

              {/* Reputation System */}
              <div>
                <h3 className="text-xl font-semibold text-white mb-4">Agent Reputation System</h3>
                <p className="text-sm text-white/70 mb-4">
                  Weighted reputation scoring across success rate (40%), cost accuracy (25%), response time (20%), and consensus participation (15%). Grades: S/A/B/C/D/F.
                </p>

                <p className="text-xs text-amber-300/80 mb-2 italic">
                  Illustrative example of the designed response shape — not live production telemetry. Reputation scoring depends on the design-stage consensus/mesh subsystems; the numbers below (including <code className="font-mono">total_agents</code>) are examples, not real current counts.
                </p>
                <SchemaBlock
                  title="Agent Reputation Response"
                  schema={{
                    agent_id: "agent://anoteroslogos.com/geo-audit",
                    reputation: {
                      score: 87.3,
                      grade: "A",
                      metrics: {
                        success_rate: 0.963,
                        cost_accuracy: 0.891,
                        avg_response_time: 42.7,
                        consensus_participation: 0.812
                      },
                      weights: {
                        success_rate: 0.40,
                        cost_accuracy: 0.25,
                        response_time: 0.20,
                        consensus: 0.15
                      }
                    },
                    rank: 12,
                    total_agents: 342,
                    updated_at: "2025-11-23T17:30:00.000Z"
                  }}
                  description="Reputation calculated from historical task execution data"
                />
              </div>
            </div>
          </section>

          {/* Section 2.7: Agent Mesh Network */}
          <section id="mesh-network" className="mb-16">
            <div className="flex items-center gap-3 mb-6">
              <Network className="w-8 h-8 text-purple-400" />
              <h2 className="text-3xl font-bold text-white">Agent Mesh Network</h2>
              <span className="px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded text-xs font-semibold text-amber-400">
                DESIGN
              </span>
            </div>

            <div className="bg-amber-500/5 border border-amber-500/30 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5" />
                <p className="text-sm text-amber-200/90">
                  <strong className="text-amber-300">Reference implementation — not live.</strong> The mesh (DHT/libp2p) is implemented as a library and specified in full, but it is not running on the current serverless deployment. A live swarm requires a persistent libp2p host, which stateless serverless functions cannot provide, so the <code className="font-mono">a2a.mesh.*</code> methods below are not advertised as callable. The requests, responses, and numbers shown are illustrative of the design.
                </p>
              </div>
            </div>

            <p className="text-white/70 mb-6">
              Decentralized peer-to-peer infrastructure for autonomous agent discovery and communication. DHT-based capability routing with trust propagation and circuit breaker protection.
            </p>

            <div className="space-y-6">
              {/* Core Features */}
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <h4 className="text-sm font-semibold text-white mb-2">DHT Algorithm</h4>
                    <code className="text-xs text-brand-accent font-mono">Kademlia k-bucket</code>
                    <p className="text-xs text-white/60 mt-1">160-bit node IDs, XOR distance</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white mb-2">Network Scale</h4>
                    <code className="text-xs text-green-400 font-mono">1000+ agents</code>
                    <p className="text-xs text-white/60 mt-1">Mesh routing latency: &lt;500ms</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white mb-2">Compression</h4>
                    <code className="text-xs text-purple-400 font-mono">CBOR (RFC 8949)</code>
                    <p className="text-xs text-white/60 mt-1">30-50% size reduction vs JSON</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white mb-2">Health Monitoring</h4>
                    <code className="text-xs text-orange-400 font-mono">RTT + Jitter + Loss</code>
                    <p className="text-xs text-white/60 mt-1">Health scoring: 0-100</p>
                  </div>
                </div>
              </div>

              {/* Method: a2a.mesh.discover */}
              <div>
                <h3 className="text-xl font-semibold text-white mb-4">Method: a2a.mesh.discover</h3>
                <p className="text-sm text-white/70 mb-4">
                  Find peers with specific capability. Returns list of nodes sorted by trust score and RTT.
                </p>

                <CodeSample
                  title="Request: a2a.mesh.discover"
                  samples={[
                    {
                      language: 'bash',
                      code: `curl -X POST https://anoteroslogos.com/api/a2a \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer sk_basic_..." \\
  -d '{
    "jsonrpc": "2.0",
    "method": "a2a.mesh.discover",
    "params": {
      "capability": "geo.audit",
      "max_peers": 10
    },
    "id": 1
  }'`
                    },
                    {
                      language: 'typescript',
                      code: `const response = await fetch('https://anoteroslogos.com/api/a2a', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': \`Bearer \${apiKey}\`
  },
  body: JSON.stringify({
    jsonrpc: '2.0',
    method: 'a2a.mesh.discover',
    params: {
      capability: 'geo.audit',
      max_peers: 10
    },
    id: 1
  })
});
const { result } = await response.json();
console.log('Found peers:', result.peers.length);`
                    },
                    {
                      language: 'python',
                      code: `import requests

response = requests.post(
    'https://anoteroslogos.com/api/a2a',
    headers={'Authorization': f'Bearer {api_key}'},
    json={
        'jsonrpc': '2.0',
        'method': 'a2a.mesh.discover',
        'params': {
            'capability': 'geo.audit',
            'max_peers': 10
        },
        'id': 1
    }
)
result = response.json()['result']
print(f"Found peers: {len(result['peers'])}")`
                    }
                  ]}
                />

                <div className="mt-4">
                  <SchemaBlock
                    title="Response: a2a.mesh.discover"
                    schema={{
                      jsonrpc: "2.0",
                      result: {
                        capability: "geo.audit",
                        peers: [
                          {
                            node_id: "a3f9c2e1d8b4f6a5c9e2f1a3b5c7d9e0a1b2c3d4",
                            aid_uri: "agent://geoaudit.example.com",
                            endpoint: "https://geoaudit.example.com/api/a2a",
                            capabilities: ["geo.audit", "kg.extract"],
                            trust_score: 87,
                            rtt: 45,
                            cost_per_call: {
                              token: "USDC",
                              amount: 0.08
                            }
                          }
                        ],
                        total: 1
                      },
                      id: 1
                    }}
                    defaultOpen={true}
                    description="Peers sorted by trust score descending, then RTT ascending"
                  />
                </div>
              </div>

              {/* Method: a2a.mesh.announce */}
              <div>
                <h3 className="text-xl font-semibold text-white mb-4">Method: a2a.mesh.announce</h3>
                <p className="text-sm text-white/70 mb-4">
                  Announce own capabilities to mesh network. Broadcasts to bootstrap nodes for peer discovery.
                </p>

                <CodeSample
                  title="Request: a2a.mesh.announce"
                  samples={[
                    {
                      language: 'typescript',
                      code: `const response = await fetch('https://anoteroslogos.com/api/a2a', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': \`Bearer \${apiKey}\`
  },
  body: JSON.stringify({
    jsonrpc: '2.0',
    method: 'a2a.mesh.announce',
    params: {
      capabilities: ['geo.audit', 'citation.predict'],
      cost_per_call: {
        token: 'USDC',
        amount: 0.10
      }
    },
    id: 1
  })
});
const { result } = await response.json();
console.log('Announced as:', result.node_id);`
                    }
                  ]}
                />

                <div className="mt-4">
                  <SchemaBlock
                    title="Response: a2a.mesh.announce"
                    schema={{
                      jsonrpc: "2.0",
                      result: {
                        success: true,
                        node_id: "b4e8d3f2a1c5e9b7d6f4a2c8e1b5d9f3",
                        aid_uri: "agent://myagent.example.com",
                        announced_capabilities: ["geo.audit", "citation.predict"]
                      },
                      id: 1
                    }}
                    description="Node registered in mesh DHT with 24-hour TTL"
                  />
                </div>
              </div>

              {/* Method: a2a.mesh.sync */}
              <div>
                <h3 className="text-xl font-semibold text-white mb-4">Method: a2a.mesh.sync</h3>
                <p className="text-sm text-white/70 mb-4">
                  Synchronize knowledge graph updates, citation learning data, or model parameters across mesh network.
                </p>

                <CodeSample
                  title="Request: a2a.mesh.sync"
                  samples={[
                    {
                      language: 'typescript',
                      code: `// Broadcast knowledge graph delta to all peers
const response = await fetch('https://anoteroslogos.com/api/a2a', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': \`Bearer \${apiKey}\`
  },
  body: JSON.stringify({
    jsonrpc: '2.0',
    method: 'a2a.mesh.sync',
    params: {
      type: 'knowledge_graph',
      payload: {
        entities: [{id: 'ent_123', type: 'Organization', name: 'ACME Corp'}],
        relationships: [{from: 'ent_123', to: 'ent_456', type: 'owns'}]
      }
    },
    id: 1
  })
});
const { result } = await response.json();
console.log('Broadcast to', result.broadcast, 'peers');`
                    }
                  ]}
                />

                <div className="mt-4">
                  <SchemaBlock
                    title="Response: a2a.mesh.sync"
                    schema={{
                      jsonrpc: "2.0",
                      result: {
                        success: true,
                        type: "knowledge_graph",
                        broadcast: true,
                        compression_stats: {
                          originalSize: 1024,
                          compressedSize: 387,
                          compressionRatio: 0.378,
                          timeTaken: 12
                        }
                      },
                      id: 1
                    }}
                    description="CBOR compression applied automatically, payload sent to all active peers"
                  />
                </div>

                <div className="mt-4 bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <Database className="w-4 h-4 text-blue-400 mt-0.5" />
                    <div className="text-sm text-blue-300">
                      <strong>Sync Types:</strong> <code className="bg-zinc-950 px-1.5 py-0.5 rounded font-mono text-xs">knowledge_graph</code>, <code className="bg-zinc-950 px-1.5 py-0.5 rounded font-mono text-xs">citation_learning</code>, <code className="bg-zinc-950 px-1.5 py-0.5 rounded font-mono text-xs">model_update</code>, <code className="bg-zinc-950 px-1.5 py-0.5 rounded font-mono text-xs">peer_update</code>. Targeted sync via <code className="bg-zinc-950 px-1.5 py-0.5 rounded font-mono text-xs">target_peer</code> parameter.
                    </div>
                  </div>
                </div>
              </div>

              {/* Method: a2a.mesh.health */}
              <div>
                <h3 className="text-xl font-semibold text-white mb-4">Method: a2a.mesh.health</h3>
                <p className="text-sm text-white/70 mb-4">
                  Get mesh network statistics including peer health, DHT metrics, and circuit breaker states.
                </p>

                <CodeSample
                  title="Request: a2a.mesh.health"
                  samples={[
                    {
                      language: 'bash',
                      code: `curl -X POST https://anoteroslogos.com/api/a2a \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer sk_pro_..." \\
  -d '{
    "jsonrpc": "2.0",
    "method": "a2a.mesh.health",
    "params": {},
    "id": 1
  }'`
                    }
                  ]}
                />

                <p className="text-xs text-amber-300/80 mt-4 mb-2 italic">
                  Illustrative example of the designed response shape — not live production telemetry. These peer counts, trust scores, and circuit-breaker states are examples, not real current numbers.
                </p>
                <div className="mt-4">
                  <SchemaBlock
                    title="Response: a2a.mesh.health"
                    schema={{
                      jsonrpc: "2.0",
                      result: {
                        mesh: {
                          total_peers: 342,
                          peers_by_capability: {
                            "geo.audit": 87,
                            "kg.extract": 56,
                            "citation.predict": 34
                          },
                          avg_trust_score: 73.4,
                          avg_rtt: 67,
                          dht_nodes: 342,
                          dht_buckets: 8
                        },
                        health: {
                          total_monitored: 342,
                          healthy: 298,
                          degraded: 32,
                          unhealthy: 8,
                          down: 4,
                          avg_health_score: 81.2,
                          avg_success_rate: 0.947
                        },
                        circuit_breakers: {
                          total: 342,
                          open: 4,
                          half_open: 2,
                          closed: 336
                        }
                      },
                      id: 1
                    }}
                    defaultOpen={true}
                    description="Example (design-stage) mesh network diagnostics with per-capability peer counts — not live telemetry"
                  />
                </div>
              </div>

              {/* Technical Details */}
              <div>
                <h3 className="text-xl font-semibold text-white mb-4">Technical Architecture</h3>
                <div className="space-y-4">
                  <div className="bg-zinc-900/30 border border-zinc-800 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-white mb-2">DHT (Distributed Hash Table)</h4>
                    <ul className="text-xs text-white/60 space-y-1">
                      <li>• 160-bit node IDs generated via SHA-1 hash of AIP URI</li>
                      <li>• K-bucket routing with k=20 peers per bucket</li>
                      <li>• XOR distance metric for peer selection</li>
                      <li>• Automatic peer eviction using LRU policy (30-minute timeout)</li>
                      <li>• Bucket refresh protocol every 24 hours</li>
                    </ul>
                  </div>

                  <div className="bg-zinc-900/30 border border-zinc-800 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-white mb-2">Routing Algorithms</h4>
                    <ul className="text-xs text-white/60 space-y-1">
                      <li>• Dijkstra pathfinding with constraint satisfaction</li>
                      <li>• Multi-hop routing up to 3 hops with path optimization</li>
                      <li>• QoS scoring: trust (40%), capability (30%), RTT (20%), cost (10%)</li>
                      <li>• Path caching with 5-minute TTL (1000 entry limit)</li>
                      <li>• Weighted round-robin load balancing</li>
                    </ul>
                  </div>

                  <div className="bg-zinc-900/30 border border-zinc-800 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-white mb-2">Circuit Breaker</h4>
                    <ul className="text-xs text-white/60 space-y-1">
                      <li>• Failure threshold: 5 consecutive failures</li>
                      <li>• Open state duration: 60 seconds</li>
                      <li>• Half-open state: allows 3 test requests</li>
                      <li>• Automatic peer exclusion for unreliable nodes</li>
                      <li>• Per-peer failure tracking with exponential backoff</li>
                    </ul>
                  </div>

                  <div className="bg-zinc-900/30 border border-zinc-800 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-white mb-2">Health Monitoring</h4>
                    <ul className="text-xs text-white/60 space-y-1">
                      <li>• RTT measurement via HTTP HEAD requests</li>
                      <li>• Jitter calculation using standard deviation (last 10 samples)</li>
                      <li>• Health scoring: success rate (40%), RTT (30%), jitter (20%), failures (10%)</li>
                      <li>• Periodic checks every 24 hours (Vercel CRON aligned)</li>
                      <li>• Four health states: healthy (80+), degraded (50-79), unhealthy (20-49), down (&lt;20)</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Best Practices */}
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5" />
                  <div className="text-sm text-green-300">
                    <strong>Best Practices:</strong>
                    <ul className="list-disc ml-4 mt-2 space-y-1">
                      <li>Announce capabilities immediately after agent initialization</li>
                      <li>Implement retry logic with exponential backoff for mesh.discover failures</li>
                      <li>Cache peer lists locally with 5-minute TTL to reduce discovery overhead</li>
                      <li>Use mesh.sync for knowledge graph deltas, not full snapshots (reduces bandwidth)</li>
                      <li>Monitor mesh.health periodically to detect network degradation</li>
                      <li>Set trust score thresholds based on criticality (critical: 80+, standard: 50+)</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Interactive Explorer */}
          <section className="mb-16">
            <InteractiveExplorer />
          </section>

          {/* Section 2.5: APA Micropayments */}
          <section id="apa-payments" className="mb-16">
            <div className="flex items-center gap-3 mb-6">
              <Zap className="w-8 h-8 text-yellow-400" />
              <h2 className="text-3xl font-bold text-white">APA Micropayments (Agent-Pay-Agent)</h2>
              <span className="px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded text-xs font-semibold text-amber-400">
                DESIGN
              </span>
            </div>

            <div className="bg-amber-500/5 border border-amber-500/30 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5" />
                <p className="text-sm text-amber-200/90">
                  <strong className="text-amber-300">Reference implementation — not live.</strong> The USDC-on-Base-L2 micropayment flow is implemented as a library and specified in full, but payment enforcement is deferred and not active on the current serverless deployment. The HTTP 402 flow, invoice schema, and amounts below describe the design.
                </p>
              </div>
            </div>

            <p className="text-white/70 mb-6">
              A reference design for USDC-based micropayments between autonomous AI agents. Pay-per-request or pre-deposit modes with blockchain verification on Base L2.
            </p>

            <div className="space-y-6">
              {/* Core Information */}
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <h4 className="text-sm font-semibold text-white mb-2">Blockchain</h4>
                    <code className="text-xs text-brand-accent font-mono">Base L2 (Chain ID 8453)</code>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white mb-2">Token</h4>
                    <code className="text-xs text-green-400 font-mono">USDC Only</code>
                    <p className="text-xs text-white/60 mt-1">0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white mb-2">Confirmations</h4>
                    <code className="text-xs text-purple-400 font-mono">2 blocks (4s)</code>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white mb-2">Invoice ID Format</h4>
                    <code className="text-xs text-orange-400 font-mono">inv_ULID</code>
                  </div>
                </div>
              </div>

              {/* Payment Flow */}
              <div>
                <h3 className="text-xl font-semibold text-white mb-4">Payment Flow (Pay-Per-Request)</h3>
                <div className="bg-zinc-900/30 border border-zinc-800 rounded-lg p-6">
                  <div className="space-y-3 text-sm text-white/70 font-mono">
                    <div className="flex items-start gap-3">
                      <span className="text-brand-accent">1.</span>
                      <span>Agent sends JSON-RPC request without <code className="text-purple-400">invoice_id</code></span>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="text-brand-accent">2.</span>
                      <span>Server responds with <code className="text-red-400">HTTP 402 Payment Required</code></span>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="text-brand-accent">3.</span>
                      <span>Response includes invoice: <code className="text-green-400">{'{invoiceId, amount, recipientAddress, memoHash}'}</code></span>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="text-brand-accent">4.</span>
                      <span>Agent sends USDC to <code className="text-orange-400">recipientAddress</code> on Base L2</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="text-brand-accent">5.</span>
                      <span>Agent retries request with <code className="text-purple-400">invoice_id</code> and <code className="text-blue-400">tx_hash</code></span>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="text-brand-accent">6.</span>
                      <span>Server verifies payment (2 confirmations), returns <code className="text-green-400">HTTP 200</code> with audit result</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* HTTP 402 Response Example */}
              <div>
                <h3 className="text-xl font-semibold text-white mb-4">HTTP 402 Response Schema</h3>
                <SchemaBlock
                  title="Payment Required Response"
                  schema={{
                    jsonrpc: "2.0",
                    error: {
                      code: -32002,
                      message: "Payment required",
                      data: {
                        invoiceId: "inv_01JDKP5R2G4M8QYX3WTNZHF9V7",
                        amount: 0.10,
                        token: "USDC",
                        chainId: 8453,
                        recipientAddress: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
                        memoHash: "0x9a7b3c2e1f8d4b6a5c9e2f1a3b5c7d9e",
                        expiresAt: "2025-11-21T18:00:00.000Z",
                        status: "pending"
                      }
                    },
                    id: 1
                  }}
                  defaultOpen={true}
                  description="Agent must send USDC payment before retrying request"
                />
              </div>

              {/* Code Example: Full Payment Flow */}
              <div>
                <h3 className="text-xl font-semibold text-white mb-4">Implementation Example</h3>
                <CodeSample
                  title="TypeScript: Autonomous Payment Flow"
                  samples={[
                    {
                      language: 'typescript',
                      code: `import { ethers } from 'ethers';

const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const BASE_RPC = 'https://mainnet.base.org';

async function auditWithPayment(url: string) {
  const apiKey = process.env.ANOTEROS_API_KEY;
  const wallet = new ethers.Wallet(process.env.AGENT_PRIVATE_KEY!);
  const provider = new ethers.JsonRpcProvider(BASE_RPC);
  const signer = wallet.connect(provider);

  // Step 1: Initial request (will return HTTP 402)
  let response = await fetch('https://anoteroslogos.com/api/a2a', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': \`Bearer \${apiKey}\`
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'geo.audit.request',
      params: { url, depth: 'standard' },
      id: 1
    })
  });

  if (response.status === 402) {
    const error = await response.json();
    const invoice = error.error.data;

    // Step 2: Send USDC payment
    const usdcContract = new ethers.Contract(
      USDC_ADDRESS,
      ['function transfer(address to, uint256 amount) returns (bool)'],
      signer
    );

    const amountInUnits = ethers.parseUnits(invoice.amount.toString(), 6); // USDC has 6 decimals
    const tx = await usdcContract.transfer(
      invoice.recipientAddress,
      amountInUnits
    );

    console.log('Payment sent:', tx.hash);

    // Step 3: Wait for 2 confirmations
    await tx.wait(2);

    // Step 4: Retry request with payment proof
    response = await fetch('https://anoteroslogos.com/api/a2a', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': \`Bearer \${apiKey}\`
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'geo.audit.request',
        params: {
          url,
          depth: 'standard',
          invoice_id: invoice.invoiceId,
          tx_hash: tx.hash
        },
        id: 1
      })
    });
  }

  // Step 5: Get audit result
  const result = await response.json();
  return result.result;
}

// Usage
const audit = await auditWithPayment('https://example.com');
console.log('GEO Score:', audit.score);`
                    },
                    {
                      language: 'python',
                      code: `from web3 import Web3
import requests
import os

USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
BASE_RPC = 'https://mainnet.base.org'

def audit_with_payment(url: str):
    api_key = os.getenv('ANOTEROS_API_KEY')
    w3 = Web3(Web3.HTTPProvider(BASE_RPC))
    account = w3.eth.account.from_key(os.getenv('AGENT_PRIVATE_KEY'))
    
    # Step 1: Initial request
    response = requests.post(
        'https://anoteroslogos.com/api/a2a',
        headers={'Authorization': f'Bearer {api_key}'},
        json={
            'jsonrpc': '2.0',
            'method': 'geo.audit.request',
            'params': {'url': url, 'depth': 'standard'},
            'id': 1
        }
    )
    
    if response.status_code == 402:
        error = response.json()
        invoice = error['error']['data']
        
        # Step 2: Send USDC payment
        usdc = w3.eth.contract(
            address=USDC_ADDRESS,
            abi=[{
                'constant': False,
                'inputs': [
                    {'name': 'to', 'type': 'address'},
                    {'name': 'value', 'type': 'uint256'}
                ],
                'name': 'transfer',
                'outputs': [{'name': '', 'type': 'bool'}],
                'type': 'function'
            }]
        )
        
        amount_in_units = int(invoice['amount'] * 1_000_000)  # USDC 6 decimals
        tx = usdc.functions.transfer(
            invoice['recipientAddress'],
            amount_in_units
        ).build_transaction({
            'from': account.address,
            'nonce': w3.eth.get_transaction_count(account.address),
            'gas': 100000,
            'gasPrice': w3.eth.gas_price
        })
        
        signed = account.sign_transaction(tx)
        tx_hash = w3.eth.send_raw_transaction(signed.rawTransaction)
        
        # Step 3: Wait for confirmations
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
        
        # Step 4: Retry with payment proof
        response = requests.post(
            'https://anoteroslogos.com/api/a2a',
            headers={'Authorization': f'Bearer {api_key}'},
            json={
                'jsonrpc': '2.0',
                'method': 'geo.audit.request',
                'params': {
                    'url': url,
                    'depth': 'standard',
                    'invoice_id': invoice['invoiceId'],
                    'tx_hash': tx_hash.hex()
                },
                'id': 1
            }
        )
    
    # Step 5: Return result
    return response.json()['result']

# Usage
audit = audit_with_payment('https://example.com')
print(f"GEO Score: {audit['score']}")`
                    }
                  ]}
                />
              </div>

              {/* Pre-Deposit Mode */}
              <div>
                <h3 className="text-xl font-semibold text-white mb-4">Pre-Deposit Mode (Faster)</h3>
                <p className="text-sm text-white/70 mb-4">
                  For high-frequency usage, agents can pre-deposit USDC. Subsequent requests use balance without on-chain transactions (latency: &lt;500ms vs 2-3s).
                </p>
                
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <Zap className="w-4 h-4 text-blue-400 mt-0.5" />
                    <div className="text-sm text-blue-300">
                      <strong>How it works:</strong> Send USDC to platform wallet once. Each API call deducts from balance. Automatic top-up when balance &lt; $5. Check balance via <code className="bg-zinc-950 px-1.5 py-0.5 rounded font-mono text-xs">a2a.balance</code> method.
                    </div>
                  </div>
                </div>
              </div>

              {/* Security & Best Practices */}
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <Shield className="w-4 h-4 text-yellow-400 mt-0.5" />
                  <div className="text-sm text-yellow-300">
                    <strong>Security Best Practices:</strong>
                    <ul className="list-disc ml-4 mt-2 space-y-1">
                      <li>Always verify <code className="bg-zinc-950 px-1.5 py-0.5 rounded font-mono text-xs">recipientAddress</code> matches platform wallet</li>
                      <li>Include <code className="bg-zinc-950 px-1.5 py-0.5 rounded font-mono text-xs">memoHash</code> in transaction memo/data field for automatic detection</li>
                      <li>Implement exponential backoff if payment detection fails (max 3 retries)</li>
                      <li>Store private keys in secure enclave (HSM/KMS), never in code</li>
                      <li>Monitor for blockchain reorgs (&lt;12 confirmations may be re-verified)</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Error Handling */}
              <div>
                <h3 className="text-xl font-semibold text-white mb-4">Payment Error Codes</h3>
                <div className="space-y-2">
                  {[
                    { code: -32002, name: 'Payment Required', description: 'Invoice generated, awaiting payment' },
                    { code: -32003, name: 'Payment Pending', description: 'Transaction submitted but <2 confirmations' },
                    { code: -32004, name: 'Insufficient Balance', description: 'Pre-deposit balance too low' },
                    { code: -32005, name: 'Invoice Expired', description: 'Payment window (1h) exceeded' },
                    { code: -32006, name: 'Invalid Transaction', description: 'tx_hash not found or incorrect amount' },
                  ].map((error) => (
                    <div key={error.code} className="bg-zinc-900/30 border border-zinc-800 rounded p-3 flex items-start gap-3">
                      <code className="text-xs font-mono text-red-400 min-w-[60px]">{error.code}</code>
                      <div>
                        <div className="text-sm font-semibold text-white">{error.name}</div>
                        <div className="text-xs text-white/60">{error.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Additional Methods */}
              <div>
                <h3 className="text-xl font-semibold text-white mb-4">Additional APA Methods</h3>
                <div className="space-y-3">
                  <div className="bg-zinc-900/30 border border-zinc-800 rounded-lg p-4">
                    <code className="text-sm font-mono text-brand-accent">a2a.balance</code>
                    <p className="text-xs text-white/60 mt-2">Check pre-deposit balance: <code className="bg-zinc-950 px-1.5 py-0.5 rounded font-mono text-xs">{'{"method": "a2a.balance", "params": {}}'}</code></p>
                  </div>
                  <div className="bg-zinc-900/30 border border-zinc-800 rounded-lg p-4">
                    <code className="text-sm font-mono text-green-400">a2a.invoice.status</code>
                    <p className="text-xs text-white/60 mt-2">Check invoice payment status: <code className="bg-zinc-950 px-1.5 py-0.5 rounded font-mono text-xs">{'{"method": "a2a.invoice.status", "params": {"invoice_id": "inv_..."}}'}</code></p>
                  </div>
                  <div className="bg-zinc-900/30 border border-zinc-800 rounded-lg p-4">
                    <code className="text-sm font-mono text-purple-400">a2a.wallet.create</code>
                    <p className="text-xs text-white/60 mt-2">Create custodial wallet (platform manages keys): <code className="bg-zinc-950 px-1.5 py-0.5 rounded font-mono text-xs">{'{"method": "a2a.wallet.create", "params": {"type": "custodial"}}'}</code></p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Section 3: MCP Protocol */}
          <section id="mcp-protocol" className="mb-16">
            <div className="flex items-center gap-3 mb-6">
              <Database className="w-8 h-8 text-purple-400" />
<h2 className="text-3xl font-bold text-white">MCP Protocol (Model Context Protocol 2025-06-18)</h2>
              <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded text-xs font-semibold text-emerald-400">
                LIVE core tools
              </span>
            </div>

<p className="text-white/70 mb-6">
              Access the Anóteros Lógos Protocol to retrieve cryptographically verified semantic data over MCP. The live MCP tools are <code className="bg-zinc-950 px-1.5 py-0.5 rounded font-mono text-xs">auditSite</code> (alias <code className="bg-zinc-950 px-1.5 py-0.5 rounded font-mono text-xs">anoteros_logos</code>), <code className="bg-zinc-950 px-1.5 py-0.5 rounded font-mono text-xs">getGraph</code>, and <code className="bg-zinc-950 px-1.5 py-0.5 rounded font-mono text-xs">predictCitation</code> — GEO audit, knowledge graphs, and citation prediction. The advanced tools (<code className="bg-zinc-950 px-1.5 py-0.5 rounded font-mono text-xs">code_execution</code>, <code className="bg-zinc-950 px-1.5 py-0.5 rounded font-mono text-xs">synthesizeNode</code>, <code className="bg-zinc-950 px-1.5 py-0.5 rounded font-mono text-xs">causal_citation_trace</code>, <code className="bg-zinc-950 px-1.5 py-0.5 rounded font-mono text-xs">predictive_synthesis</code>, <code className="bg-zinc-950 px-1.5 py-0.5 rounded font-mono text-xs">federated_authority_boost</code>) are design-stage: implemented and specified but not runnable on serverless. Send MCP-Protocol-Version: 2025-06-18 (and optional Mcp-Session-Id) headers when calling JSON-RPC.
            </p>

            <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6 mb-6">
<h3 className="text-lg font-semibold text-white mb-4">Tools</h3>
<p className="text-xs text-white/60 mb-4">
                <span className="text-emerald-400 font-semibold">LIVE</span> tools are callable now via <code className="font-mono">/api/mcp</code>. <span className="text-amber-400 font-semibold">DESIGN</span> tools are implemented and specified but not runnable on the serverless deployment.
              </p>
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border-l-2 border-emerald-400 pl-4">
                  <div className="flex items-center gap-2">
                    <code className="text-sm font-mono text-emerald-400">auditSite</code>
                    <span className="px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/30 rounded text-[10px] font-semibold text-emerald-400">LIVE</span>
                  </div>
                  <p className="text-xs text-white/60 mt-1">GEO audit for AI visibility analysis (alias <code className="font-mono">anoteros_logos</code>)</p>
                </div>
                <div className="border-l-2 border-emerald-400 pl-4">
                  <div className="flex items-center gap-2">
                    <code className="text-sm font-mono text-emerald-400">getGraph</code>
                    <span className="px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/30 rounded text-[10px] font-semibold text-emerald-400">LIVE</span>
                  </div>
                  <p className="text-xs text-white/60 mt-1">Build knowledge graph with entities/relationships</p>
                </div>
                <div className="border-l-2 border-emerald-400 pl-4">
                  <div className="flex items-center gap-2">
                    <code className="text-sm font-mono text-emerald-400">predictCitation</code>
                    <span className="px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/30 rounded text-[10px] font-semibold text-emerald-400">LIVE</span>
                  </div>
                  <p className="text-xs text-white/60 mt-1">Predict citation probability by platform</p>
                </div>
                <div className="border-l-2 border-amber-400 pl-4">
                  <div className="flex items-center gap-2">
                    <code className="text-sm font-mono text-amber-300">synthesizeNode</code>
                    <span className="px-1.5 py-0.5 bg-amber-500/10 border border-amber-500/30 rounded text-[10px] font-semibold text-amber-400">DESIGN</span>
                  </div>
                  <p className="text-xs text-white/60 mt-1">Generate content recommendations</p>
                </div>
                <div className="border-l-2 border-amber-400 pl-4">
                  <div className="flex items-center gap-2">
                    <code className="text-sm font-mono text-amber-300">causal_citation_trace</code>
                    <span className="px-1.5 py-0.5 bg-amber-500/10 border border-amber-500/30 rounded text-[10px] font-semibold text-amber-400">DESIGN</span>
                  </div>
                  <p className="text-xs text-white/60 mt-1">Causal reasoning for citations</p>
                </div>
                <div className="border-l-2 border-amber-400 pl-4">
                  <div className="flex items-center gap-2">
                    <code className="text-sm font-mono text-amber-300">predictive_synthesis</code>
                    <span className="px-1.5 py-0.5 bg-amber-500/10 border border-amber-500/30 rounded text-[10px] font-semibold text-amber-400">DESIGN</span>
                  </div>
                  <p className="text-xs text-white/60 mt-1">Visibility impact prediction</p>
                </div>
                <div className="border-l-2 border-amber-400 pl-4">
                  <div className="flex items-center gap-2">
                    <code className="text-sm font-mono text-amber-300">federated_authority_boost</code>
                    <span className="px-1.5 py-0.5 bg-amber-500/10 border border-amber-500/30 rounded text-[10px] font-semibold text-amber-400">DESIGN</span>
                  </div>
                  <p className="text-xs text-white/60 mt-1">ZKP authority verification (requires a live peer mesh)</p>
                </div>
                <div className="border-l-2 border-amber-400 pl-4">
                  <div className="flex items-center gap-2">
                    <code className="text-sm font-mono text-amber-300">code_execution</code>
                    <span className="px-1.5 py-0.5 bg-amber-500/10 border border-amber-500/30 rounded text-[10px] font-semibold text-amber-400">DESIGN</span>
                  </div>
                  <p className="text-xs text-white/60 mt-1">Programmatic code execution (isolated-vm sandbox; native binding unavailable on serverless)</p>
                </div>
              </div>
</div>

            {/* Endpoint & Headers Quickstart */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-white mb-4">Endpoint & Headers</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="bg-zinc-900/30 border border-zinc-800 rounded-lg p-4">
                  <div className="text-white/70">JSON-RPC</div>
                  <code className="text-brand-accent font-mono">POST /api/mcp</code>
                </div>
                <div className="bg-zinc-900/30 border border-zinc-800 rounded-lg p-4">
                  <div className="text-white/70">Headers</div>
                  <code className="text-purple-400 font-mono block">MCP-Protocol-Version: 2025-06-18</code>
                  <code className="text-purple-400 font-mono block">Mcp-Session-Id: ulid-optional</code>
                </div>
                <div className="bg-zinc-900/30 border border-zinc-800 rounded-lg p-4">
                  <div className="text-white/70">Formats</div>
                  <code className="text-green-400 font-mono block">GET /api/mcp?format=openai|claude|mcp</code>
                </div>
              </div>
              <div className="mt-4">
                <CodeSample
                  title="Initialize (JSON-RPC)"
                  samples={[
                    { language: 'bash', code: `curl -X POST https://anoteroslogos.com/api/mcp \\\n  -H 'Content-Type: application/json' \\\n  -H 'MCP-Protocol-Version: 2025-06-18' \\\n  -d '{"jsonrpc":"2.0","method":"initialize","params":{"clientInfo":{"name":"demo","version":"1.0"}},"id":1}'` },
                    { language: 'typescript', code: `await fetch('https://anoteroslogos.com/api/mcp', {\n  method: 'POST',\n  headers: { 'Content-Type': 'application/json', 'MCP-Protocol-Version': '2025-06-18' },\n  body: JSON.stringify({ jsonrpc: '2.0', method: 'initialize', params: { clientInfo: { name: 'demo', version: '1.0' } }, id: 1 })\n});` }
                  ]}
                />
              </div>
            </div>

            <div className="space-y-6">
              {/* Advanced Tool Use Section */}
              <div>
                <h3 className="text-xl font-semibold text-white mb-4">Anthropic Advanced Tool Use (2025-11-20)</h3>
                <p className="text-sm text-white/70 mb-4">
                  Reference implementation of the Anthropic Advanced Tool Use standard with semantic tool search, programmatic execution, and enhanced LLM guidance. Tool search (<code className="bg-zinc-950 px-1.5 py-0.5 rounded font-mono text-xs">/api/tools/search</code>) is live; programmatic execution / <code className="bg-zinc-950 px-1.5 py-0.5 rounded font-mono text-xs">code_execution</code> is design-stage (the isolated-vm sandbox is not available on serverless).
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-zinc-900/30 border border-zinc-800 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                      <Code className="w-4 h-4 text-brand-accent" />
                      Tool Search
                    </h4>
                    <code className="text-xs text-brand-accent font-mono">GET /api/tools/search</code>
                    <p className="text-xs text-white/60 mt-2">Semantic BM25 search across OpenAI/Claude/Grok schemas with Fuse.js ranking</p>
                  </div>

                  <div className="bg-zinc-900/30 border border-zinc-800 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-purple-400" />
                      Programmatic Execution
                    </h4>
                    <code className="text-xs text-purple-400 font-mono">POST /api/mcp/programmatic</code>
                    <p className="text-xs text-white/60 mt-2">JavaScript execution in isolated-vm sandbox (128MB, 60s max) with pre-bound tool functions</p>
                  </div>

                  <div className="bg-zinc-900/30 border border-zinc-800 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                      <FileJson className="w-4 h-4 text-green-400" />
                      Input Examples
                    </h4>
                    <code className="text-xs text-green-400 font-mono">input_examples[]</code>
                    <p className="text-xs text-white/60 mt-2">3 examples per tool in schemas for improved LLM parameter understanding</p>
                  </div>
                </div>

<CodeSample
                  title="Tool Search Examples"
                  samples={[
                    {
                      language: 'bash',
                      label: 'HTTP (BM25/Fuse.js)',
                      code: `curl "https://anoteroslogos.com/api/tools/search?query=audit&limit=3"`
                    },
                    {
                      language: 'typescript',
                      label: 'JSON-RPC (MCP tool_search_tool_regex)',
                      code: `await fetch('https://anoteroslogos.com/api/mcp', {\n  method: 'POST',\n  headers: { 'Content-Type': 'application/json', 'MCP-Protocol-Version': '2025-06-18' },\n  body: JSON.stringify({\n    jsonrpc: '2.0',\n    method: 'tools/call',\n    params: { name: 'tool_search_tool_regex', arguments: { query: 'graph|citation', top_k: 5 } },\n    id: 2\n  })\n});`
                    }
                  ]}
                />

                <div className="mt-4">
<CodeSample
                    title="Programmatic Execution with Sandbox (Requires anthropic-beta header)"
                    samples={[
                      {
                        language: 'typescript',
                        code: `const result = await fetch(\n  'https://anoteroslogos.com/api/mcp/programmatic',\n  {\n    method: 'POST',\n    headers: {\n      'Content-Type': 'application/json',\n      'anthropic-beta': 'advanced-tool-use-2025-11-20',\n      'x-tenant-id': 'your_tenant_id'\n    },\n    body: JSON.stringify({\n      code: \`\n        const audit = await call_tool('auditSite', { url: 'https://example.com' });\n        const path = await get_causal_path('AI optimization');\n        return { score: audit.geoScore, pathLength: path.length };\n      \`,\n      language: 'javascript',\n      timeout: 30000\n    })\n  }\n).then(r => r.json());\n\nconsole.log(result.result); // Execution result\nconsole.log(result.logs);   // Console output\nconsole.log(result.ucpt);   // Cryptographic proof`
                      },
                      {
                        language: 'typescript',
                        label: 'JSON-RPC (tools/call code_execution)',
                        code: `await fetch('https://anoteroslogos.com/api/mcp', {\n  method: 'POST',\n  headers: { 'Content-Type': 'application/json', 'MCP-Protocol-Version': '2025-06-18' },\n  body: JSON.stringify({\n    jsonrpc: '2.0',\n    method: 'tools/call',\n    params: {\n      name: 'code_execution',\n      arguments: {\n        code: \`const res = await call_tool('predictCitation', { url: 'https://example.com', platform: 'Claude' }); return res;\`\n      }\n    },\n    id: 3\n  })\n});`
                      }
                    ]}
                  />
                </div>

                <div className="mt-4 bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <Shield className="w-4 h-4 text-purple-400 mt-0.5" />
                    <div className="text-sm text-purple-300">
                      <strong>Sandbox Security:</strong> Isolated execution with 128MB memory limit, 60s max timeout, no file system or network access. Pre-bound functions: <code className="bg-zinc-950 px-1.5 py-0.5 rounded font-mono text-xs">call_tool(name, params)</code>, <code className="bg-zinc-950 px-1.5 py-0.5 rounded font-mono text-xs">get_causal_path(query)</code>, <code className="bg-zinc-950 px-1.5 py-0.5 rounded font-mono text-xs">get_ucpt_proof()</code>. All executions generate UCPT cryptographic proof for auditability.
                    </div>
                  </div>
                </div>
              </div>

              {/* Tool Schemas Access */}
<div>
                <h3 className="text-xl font-semibold text-white mb-4">Tool Schemas & Manifests</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-zinc-900/30 border border-zinc-800 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-white mb-2">OpenAI Format</h4>
                    <code className="text-xs text-brand-accent font-mono">/.well-known/mcp-tools-openai.json</code>
                    <p className="text-xs text-white/60 mt-2">Function calling schema with input_examples</p>
                    <p className="text-xs text-white/50 mt-1">Also: <code className="font-mono">/api/mcp?format=openai</code></p>
                  </div>
                  <div className="bg-zinc-900/30 border border-zinc-800 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-white mb-2">Claude Format</h4>
                    <code className="text-xs text-green-400 font-mono">/.well-known/mcp-tools-claude.json</code>
                    <p className="text-xs text-white/60 mt-2">Anthropic tool schema format</p>
                    <p className="text-xs text-white/50 mt-1">Also: <code className="font-mono">/api/mcp?format=claude</code></p>
                  </div>
                  <div className="bg-zinc-900/30 border border-zinc-800 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-white mb-2">Grok Format</h4>
                    <code className="text-xs text-purple-400 font-mono">/.well-known/mcp-tools-grok.json</code>
                    <p className="text-xs text-white/60 mt-2">X.ai Grok schema format</p>
                  </div>
                  <div className="bg-zinc-900/30 border border-zinc-800 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-white mb-2">Unified Capabilities</h4>
                    <code className="text-xs text-orange-400 font-mono">/.well-known/capabilities.json</code>
                    <p className="text-xs text-white/60 mt-2">Merged spec with all tools and endpoints</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <p className="text-sm text-blue-300">
                <strong>Complete Documentation:</strong> <a href="/docs/advanced-tool-use.md" target="_blank" className="underline hover:text-blue-200">docs/advanced-tool-use.md</a> contains full specification of Anthropic Advanced Tool Use integration, security considerations, performance characteristics, and testing guides.
              </p>
            </div>
          </section>

          {/* Section 4: Authentication & Security */}
          <section id="authentication" className="mb-16">
            <div className="flex items-center gap-3 mb-6">
              <Lock className="w-8 h-8 text-green-400" />
              <h2 className="text-3xl font-bold text-white">Authentication & Security</h2>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-white mb-4">API Key Format</h3>
                <p className="text-sm text-white/70 mb-4">
                  Bearer token format: <code className="bg-zinc-950 px-2 py-0.5 rounded text-brand-accent font-mono text-xs">sk_tier_key32characters</code>
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-zinc-900/30 border border-zinc-800 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-white mb-2">Header Format</h4>
                    <code className="text-xs text-brand-accent font-mono">Authorization: Bearer sk_pro_abc123...</code>
                  </div>
                  <div className="bg-zinc-900/30 border border-zinc-800 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-white mb-2">Key Rotation</h4>
                    <p className="text-xs text-white/60">90-day expiry, 7-day overlap for zero-downtime</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-white mb-4">Ed25519 Signatures (RFC 9421)</h3>
                <p className="text-sm text-white/70 mb-4">
                  HTTP Message Signatures provide cryptographic proof of request authenticity. Optional but recommended for production.
                </p>
                
                <CodeSample
                  title="Signature Generation (TypeScript)"
                  samples={[
                    {
                      language: 'typescript',
                      code: `import { sign } from 'tweetnacl';
import { encodeBase64 } from 'tweetnacl-util';

const privateKey = Uint8Array.from(/* your Ed25519 private key */);
const message = \`(request-target): post /api/a2a
date: \${new Date().toUTCString()}
digest: SHA-256=\${digest}\`;

const signature = sign.detached(
  new TextEncoder().encode(message),
  privateKey
);

const authHeader = \`Signature keyId="anoteroslogos-2025-primary",algorithm="ed25519",headers="(request-target) date digest",signature="\${encodeBase64(signature)}"\`;`
                    }
                  ]}
                />
              </div>

              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <Shield className="w-4 h-4 text-yellow-400 mt-0.5" />
                  <div className="text-sm text-yellow-300">
                    <strong>Security Best Practices:</strong> Always use TLS 1.3+. Store API keys in environment variables, never in code. Implement request replay protection (nonce + timestamp within 5min window). Rotate keys every 90 days.
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Section 5: Integration Cookbook - Abridged */}
          <section id="integration" className="mb-16">
            <div className="flex items-center gap-3 mb-6">
              <Code className="w-8 h-8 text-orange-400" />
              <h2 className="text-3xl font-bold text-white">Integration Cookbook</h2>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-white mb-4">LangChain Tool Integration</h3>
                <CodeSample
                  samples={[
                    {
                      language: 'typescript',
                      code: `import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";

const geoAuditTool = new DynamicStructuredTool({
  name: "audit_site_geo",
  description: "Audit website for AI visibility (GEO score)",
  schema: z.object({
    url: z.string().url(),
    depth: z.enum(["quick", "standard", "deep"]).default("standard")
  }),
  func: async ({ url, depth }) => {
    const response = await fetch('https://anoteroslogos.com/api/a2a', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': \`Bearer \${process.env.ANOTEROS_API_KEY}\`
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'geo.audit.request',
        params: { url, depth },
        id: Date.now()
      })
    });
    const result = await response.json();
    return JSON.stringify(result.result);
  }
});`
                    },
                    {
                      language: 'python',
                      code: `from langchain.tools import StructuredTool
from pydantic import BaseModel, Field
import requests
import os

class AuditInput(BaseModel):
    url: str = Field(description="URL to audit")
    depth: str = Field(default="standard", description="Analysis depth")

def audit_site(url: str, depth: str = "standard") -> str:
    response = requests.post(
        'https://anoteroslogos.com/api/a2a',
        headers={'Authorization': f'Bearer {os.getenv("ANOTEROS_API_KEY")}'},
        json={
            'jsonrpc': '2.0',
            'method': 'geo.audit.request',
            'params': {'url': url, 'depth': depth},
            'id': 1
        }
    )
    return str(response.json()['result'])

audit_tool = StructuredTool.from_function(
    func=audit_site,
    name="audit_site_geo",
    description="Audit website for AI visibility",
    args_schema=AuditInput
)`
                    }
                  ]}
                />
              </div>

              <div>
                <h3 className="text-xl font-semibold text-white mb-4">Claude Desktop MCP Server Config</h3>
                <CodeSample
                  samples={[
                    {
                      language: 'json',
                      code: `{
  "mcpServers": {
    "anteroslogos": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-fetch"],
      "env": {
        "ANOTEROS_API_KEY": "sk_pro_...",
        "MCP_SERVER_URL": "https://anoteroslogos.com/api/mcp"
      }
    }
  }
}`
                    }
                  ]}
                />
              </div>
            </div>
          </section>

          {/* Section 6: Performance & Reliability */}
          <section id="performance" className="mb-16">
            <div className="flex items-center gap-3 mb-6">
              <Zap className="w-8 h-8 text-yellow-400" />
              <h2 className="text-3xl font-bold text-white">Performance & Reliability</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-zinc-900/30 border border-zinc-800 rounded-lg p-6">
                <Clock className="w-6 h-6 text-brand-accent mb-3" />
                <h3 className="text-lg font-semibold text-white mb-2">Timeouts</h3>
                <div className="space-y-2 text-sm text-white/70">
                  <p>Quick: <span className="text-white">30s</span></p>
                  <p>Standard: <span className="text-white">60s</span></p>
                  <p>Deep: <span className="text-white">120s</span></p>
                </div>
              </div>

              <div className="bg-zinc-900/30 border border-zinc-800 rounded-lg p-6">
                <Server className="w-6 h-6 text-green-400 mb-3" />
                <h3 className="text-lg font-semibold text-white mb-2">Retry Strategy</h3>
                <div className="text-sm text-white/70">
                  <p>Exponential backoff: <code className="bg-zinc-950 px-1.5 py-0.5 rounded font-mono text-xs">2^n * 100ms</code></p>
                  <p className="mt-2">Max retries: <span className="text-white">5</span></p>
                </div>
              </div>

              <div className="bg-zinc-900/30 border border-zinc-800 rounded-lg p-6">
                <Cpu className="w-6 h-6 text-purple-400 mb-3" />
                <h3 className="text-lg font-semibold text-white mb-2">Circuit Breaker</h3>
                <div className="text-sm text-white/70">
                  <p>Threshold: <span className="text-white">5</span> failures</p>
                  <p className="mt-2">Open duration: <span className="text-white">60s</span></p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 7: Testing & Validation */}
          <section id="testing" className="mb-16">
            <div className="flex items-center gap-3 mb-6">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              <h2 className="text-3xl font-bold text-white">Testing & Validation</h2>
            </div>

            <div className="space-y-6">
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Sandbox Environment</h3>
                <code className="text-sm text-brand-accent font-mono">https://anoteroslogos.com/api/a2a?env=sandbox</code>
                <p className="text-sm text-white/60 mt-2">Test API keys (<code className="bg-zinc-950 px-1.5 py-0.5 rounded font-mono text-xs">sk_test_...</code>) have no rate limits in sandbox.</p>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-white mb-4">Validation Tools</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-zinc-900/30 border border-brand-accent/30 rounded-lg p-4">
                    <FileJson className="w-5 h-5 text-brand-accent mb-2" />
                    <h4 className="text-sm font-semibold text-white mb-1">agent.json Validator</h4>
                    <p className="text-xs text-white/60">Validate AIP v1.1 compliance</p>
                  </div>
                  <div className="bg-zinc-900/30 border border-green-500/30 rounded-lg p-4">
                    <Terminal className="w-5 h-5 text-green-400 mb-2" />
                    <h4 className="text-sm font-semibold text-white mb-1">DNS Checker</h4>
                    <p className="text-xs text-white/60">Verify TXT record configuration</p>
                  </div>
                  <div className="bg-zinc-900/30 border border-purple-500/30 rounded-lg p-4">
                    <Shield className="w-5 h-5 text-purple-400 mb-2" />
                    <h4 className="text-sm font-semibold text-white mb-1">Signature Verifier</h4>
                    <p className="text-xs text-white/60">Test Ed25519 signature generation</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* CTA Section */}
          <div className="bg-gradient-to-br from-brand-accent/20 via-purple-600/20 to-pink-600/20 border border-brand-accent/30 rounded-xl p-8 text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              Start Building with Anóteros Lógos
            </h2>
            <p className="text-white/70 max-w-2xl mx-auto mb-8">
              Generate an AIP identity and call the live endpoints below — no signup required. Start with the machine-readable capability descriptor to see exactly what is callable today.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <a 
                href="/api/capabilities" 
                target="_blank"
                className="inline-flex items-center justify-center gap-2 bg-brand-accent text-white px-8 py-4 rounded-lg hover:bg-blue-500 transition-colors font-medium shadow-lg hover:shadow-xl"
              >
                <FileJson className="w-5 h-5" />
                View /api/capabilities
              </a>
              <a 
                href="/.well-known/agent.json" 
                target="_blank"
                className="inline-flex items-center justify-center gap-2 bg-white/10 text-white px-8 py-4 rounded-lg hover:bg-white/15 transition-colors font-medium border border-white/20"
              >
                <FileJson className="w-5 h-5" />
                View agent.json
              </a>
              <a 
                href="/knowledge-base" 
                className="inline-flex items-center justify-center gap-2 bg-white/10 text-white px-8 py-4 rounded-lg hover:bg-white/15 transition-colors font-medium border border-white/20"
              >
                <BookOpen className="w-5 h-5" />
                Documentation
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
