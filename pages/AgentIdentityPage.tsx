/**
 * Agent Identity & Documentation Page
 * Enterprise-Grade Machine-Readable API Specification
 * 
 * Target Audience: AI Agents (LLMs, AutoGen, LangChain, CrewAI)
 * Purpose: Complete protocol specification for autonomous integration
 * Standards: AID v1.1, A2A v1.0.0, MCP v2.0, RFC 8615, RFC 9421
 */

import SEOHead from '../components/SEOHead';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { SchemaBlock } from '../components/AgentDocs/SchemaBlock';
import { CodeSample } from '../components/AgentDocs/CodeSample';
import { InteractiveExplorer } from '../components/AgentDocs/InteractiveExplorer';
import {
  Network, Shield, Code, Terminal, Zap, Database,
  CheckCircle2, AlertTriangle, Clock, Lock, Key, FileJson,
  BookOpen, ChevronRight, Server, Cpu, Globe
} from 'lucide-react';

const AgentIdentityPage = () => {
  return (
    <>
      <SEOHead
        title="AI Agent Integration Specification | A2A, MCP, AID Protocols | Anóteros Lógos"
        description="Complete enterprise-grade API specification for AI agents. A2A JSON-RPC 2.0 protocol, MCP tool integration, AID discovery. TypeScript/Python/Rust examples. LangChain, AutoGen, CrewAI integration patterns."
        keywords="AI agent API, A2A protocol, MCP integration, agent discovery, JSON-RPC 2.0, Ed25519 signatures, LangChain tools, AutoGen functions, CrewAI integration, AI agent authentication, rate limiting, GEO audit API"
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
              Enterprise-grade protocol documentation for autonomous agent integration. A2A (Agent-to-Agent), MCP (Model Context Protocol), and AID (Agent Identity & Discovery) v1.1 with complete schemas, error handling, and code samples.
            </p>

            <div className="flex flex-wrap gap-3">
              <span className="px-3 py-1 bg-blue-500/10 border border-blue-500/30 rounded text-xs font-mono text-blue-400">
                AID v1.1
              </span>
              <span className="px-3 py-1 bg-green-500/10 border border-green-500/30 rounded text-xs font-mono text-green-400">
                A2A v1.0 (Linux Foundation)
              </span>
              <span className="px-3 py-1 bg-purple-500/10 border border-purple-500/30 rounded text-xs font-mono text-purple-400">
                MCP v2.0
              </span>
              <span className="px-3 py-1 bg-orange-500/10 border border-orange-500/30 rounded text-xs font-mono text-orange-400">
                RFC 8615 Compliant
              </span>
            </div>
          </div>

          {/* Quick Navigation */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6 mb-12">
            <h2 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Quick Navigation</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <a href="#protocol-discovery" className="text-xs text-brand-accent hover:text-blue-400 transition-colors font-medium">
                → Protocol Discovery
              </a>
              <a href="#a2a-protocol" className="text-xs text-brand-accent hover:text-blue-400 transition-colors font-medium">
                → A2A Protocol v1.0
              </a>
              <a href="#a2a-tasks" className="text-xs text-brand-accent hover:text-blue-400 transition-colors font-medium">
                → Task Lifecycle
              </a>
              <a href="#apa-payments" className="text-xs text-brand-accent hover:text-blue-400 transition-colors font-medium">
                → APA Micropayments
              </a>
              <a href="#mesh-network" className="text-xs text-brand-accent hover:text-blue-400 transition-colors font-medium">
                → Agent Mesh Network
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

          {/* Section 1: Protocol Discovery (AID v1.1) */}
          <section id="protocol-discovery" className="mb-16">
            <div className="flex items-center gap-3 mb-6">
              <Globe className="w-8 h-8 text-brand-accent" />
              <h2 className="text-3xl font-bold text-white">Protocol Discovery (AID v1.1)</h2>
            </div>

            <p className="text-white/70 mb-6">
              AID (Agent Identity & Discovery) protocol enables DNS-based agent discovery with HTTPS fallback. Compliant with RFC 8615 (Well-Known URIs).
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
                  Two discovery endpoints: agent.json (AID v1.1) and agent-card.json (Linux Foundation A2A v1.0). CORS-enabled, JSON format.
                </p>

                <CodeSample
                  title="GET /.well-known/agent.json (AID v1.1)"
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
                    title="agent.json Schema (AID v1.1)"
                    schema={{
                      v: "1.1",
                      p: ["a2a", "http"],
                      u: "https://anoteroslogos.com/api/a2a",
                      s: "geoaudit",
                      a: {
                        name: "Anóteros Lógos GEO Agent",
                        version: "2.0.0",
                        capabilities: [
                          "geo.audit.request",
                          "geo.audit.batch",
                          "a2a.discover",
                          "a2a.mesh.discover",
                          "a2a.mesh.announce",
                          "a2a.mesh.sync",
                          "a2a.mesh.health"
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
                  <h4 className="text-lg font-semibold text-white mb-3">Linux Foundation Agent Card</h4>
                  <p className="text-sm text-white/70 mb-4">
                    Standard A2A Protocol v1.0 discovery format with extensions for payment and consensus verification.
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
console.log(agentCard.capabilities); // 18 capabilities
console.log(agentCard.extensions.payment); // USDC on Base L2`
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
                          "geo.audit.request",
                          "geo.audit.status",
                          "geo.audit.stream",
                          "knowledge.graph.query",
                          "citation.predict",
                          "agent.mesh.discover",
                          "...18 total capabilities"
                        ],
                        protocols: ["a2a/1.0", "jsonrpc/2.0", "mcp/2.0"],
                        endpoints: {
                          http: "https://anoteroslogos.com/api/a2a",
                          websocket: "wss://anoteroslogos.com/api/a2a/ws",
                          stream: "https://anoteroslogos.com/api/a2a/stream"
                        },
                        authentication: ["bearer", "api_key", "ed25519"],
                        pricing: {
                          model: "pay-per-request",
                          currency: "USDC",
                          base_price: "0.10"
                        },
                        extensions: {
                          payment: {
                            supported: true,
                            network: "base-l2",
                            token: "USDC"
                          },
                          verification: {
                            supported: true,
                            method: "pbft-consensus",
                            quorum_size: 7
                          }
                        }
                      }}
                      defaultOpen={true}
                      description="Linux Foundation standard with payment and consensus extensions"
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

          {/* Section 2: A2A Protocol */}
          <section id="a2a-protocol" className="mb-16">
            <div className="flex items-center gap-3 mb-6">
              <Network className="w-8 h-8 text-green-400" />
              <h2 className="text-3xl font-bold text-white">A2A Protocol v1.0 (Linux Foundation)</h2>
            </div>

            <p className="text-white/70 mb-6">
              Full Linux Foundation Agent-to-Agent Protocol v1.0 implementation. 14/14 core requirements met with custom extensions for payment (USDC on Base L2) and Byzantine consensus (PBFT with 7-node quorum).
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
                        description: "AI-native GEO audit service for analyzing websites visibility to AI systems",
                        capabilities: [
                          "geo.audit.request",
                          "geo.audit.batch",
                          "geo.insights.global",
                          "a2a.discover",
                          "a2a.capabilities",
                          "a2a.ping",
                          "a2a.status",
                          "a2a.mesh.discover",
                          "a2a.mesh.announce",
                          "a2a.mesh.sync",
                          "a2a.mesh.health"
                        ],
                        endpoints: {
                          http: "/api/a2a",
                          websocket: "/api/a2a/ws"
                        },
                        rate_limits: {
                          free: { requests_per_minute: 10, burst: 5 },
                          basic: { requests_per_minute: 60, burst: 20 },
                          pro: { requests_per_minute: 300, burst: 100 },
                          enterprise: { requests_per_minute: 1000, burst: 500 }
                        }
                      },
                      id: 1
                    }}
                    defaultOpen={true}
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
                <h3 className="text-xl font-semibold text-white mb-4">Method: geo.audit.batch</h3>
                <p className="text-sm text-white/70 mb-4">
                  Process multiple URLs in parallel. Max 100 URLs per batch. Concurrency limit: 5 simultaneous audits.
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
                <h3 className="text-xl font-semibold text-white mb-4">Rate Limits by Tier</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-zinc-900/30 border border-zinc-800 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                      <h4 className="text-sm font-semibold text-white">Free Tier</h4>
                    </div>
                    <div className="space-y-1 text-xs text-white/60">
                      <p><span className="text-white">10</span> req/min</p>
                      <p><span className="text-white">5</span> burst capacity</p>
                      <p><span className="text-white">100</span> req/hour</p>
                    </div>
                  </div>
                  
                  <div className="bg-zinc-900/30 border border-blue-500/30 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                      <h4 className="text-sm font-semibold text-white">Basic - $99/mo</h4>
                    </div>
                    <div className="space-y-1 text-xs text-white/60">
                      <p><span className="text-white">60</span> req/min</p>
                      <p><span className="text-white">20</span> burst capacity</p>
                      <p><span className="text-white">1,000</span> req/hour</p>
                    </div>
                  </div>
                  
                  <div className="bg-zinc-900/30 border border-purple-500/30 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                      <h4 className="text-sm font-semibold text-white">Pro - $299/mo</h4>
                    </div>
                    <div className="space-y-1 text-xs text-white/60">
                      <p><span className="text-white">300</span> req/min</p>
                      <p><span className="text-white">100</span> burst capacity</p>
                      <p><span className="text-white">10,000</span> req/hour</p>
                    </div>
                  </div>
                  
                  <div className="bg-zinc-900/30 border border-orange-500/30 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                      <h4 className="text-sm font-semibold text-white">Enterprise</h4>
                    </div>
                    <div className="space-y-1 text-xs text-white/60">
                      <p><span className="text-white">1,000</span> req/min</p>
                      <p><span className="text-white">500</span> burst capacity</p>
                      <p><span className="text-white">50,000</span> req/hour</p>
                    </div>
                  </div>
                </div>

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
                    description="Real-time mesh network diagnostics with per-capability peer counts"
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
                      <li>• 160-bit node IDs generated via SHA-1 hash of AID URI</li>
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
            </div>

            <p className="text-white/70 mb-6">
              First production implementation of USDC-based micropayments for autonomous AI agent interactions. Pay-per-request or pre-deposit modes with automatic blockchain verification on Base L2.
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

              {/* Pricing */}
              <div>
                <h3 className="text-xl font-semibold text-white mb-4">Pricing (USDC)</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-zinc-900/30 border border-zinc-800 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-white mb-2">geo.audit.request</h4>
                    <div className="space-y-1 text-xs text-white/60">
                      <p>Quick: <span className="text-white">$0.05 USDC</span></p>
                      <p>Standard: <span className="text-white">$0.10 USDC</span></p>
                      <p>Deep: <span className="text-white">$0.25 USDC</span></p>
                    </div>
                  </div>
                  <div className="bg-zinc-900/30 border border-zinc-800 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-white mb-2">geo.audit.batch</h4>
                    <p className="text-xs text-white/60">Per-URL pricing × quantity</p>
                    <p className="text-xs text-white mt-1">Max 100 URLs/batch</p>
                  </div>
                  <div className="bg-zinc-900/30 border border-zinc-800 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-white mb-2">MCP Tools</h4>
                    <p className="text-xs text-white/60">auditSite: <span className="text-white">$0.10</span></p>
                    <p className="text-xs text-white/60 mt-1">predictCitation: <span className="text-white">$0.05</span></p>
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

          {/* Section 3: MCP Protocol - Simplified summary for space */}
          <section id="mcp-protocol" className="mb-16">
            <div className="flex items-center gap-3 mb-6">
              <Database className="w-8 h-8 text-purple-400" />
              <h2 className="text-3xl font-bold text-white">MCP Protocol (Model Context Protocol v2.0)</h2>
            </div>

            <p className="text-white/70 mb-6">
              Tool integration protocol for LLMs. OpenAI/Claude/Grok compatible. Supports streaming, UCPT provenance, and Zero-Knowledge Proofs.
            </p>

            <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-white mb-4">Available Tools (7 total, 3 unique)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border-l-2 border-brand-accent pl-4">
                  <code className="text-sm font-mono text-brand-accent">auditSite</code>
                  <p className="text-xs text-white/60 mt-1">GEO audit for AI visibility analysis</p>
                </div>
                <div className="border-l-2 border-green-400 pl-4">
                  <code className="text-sm font-mono text-green-400">getGraph</code>
                  <p className="text-xs text-white/60 mt-1">Build knowledge graph with entities/relationships</p>
                </div>
                <div className="border-l-2 border-purple-400 pl-4">
                  <code className="text-sm font-mono text-purple-400">predictCitation</code>
                  <p className="text-xs text-white/60 mt-1">Predict citation probability by platform</p>
                </div>
                <div className="border-l-2 border-orange-400 pl-4">
                  <code className="text-sm font-mono text-orange-400">synthesizeNode</code>
                  <p className="text-xs text-white/60 mt-1">Generate content recommendations</p>
                </div>
                <div className="border-l-2 border-pink-400 pl-4">
                  <code className="text-sm font-mono text-pink-400">causal_citation_trace</code>
                  <p className="text-xs text-white/60 mt-1">🌟 UNIQUE: Causal reasoning for citations</p>
                </div>
                <div className="border-l-2 border-indigo-400 pl-4">
                  <code className="text-sm font-mono text-indigo-400">predictive_synthesis</code>
                  <p className="text-xs text-white/60 mt-1">🌟 UNIQUE: Visibility impact prediction</p>
                </div>
                <div className="border-l-2 border-emerald-400 pl-4">
                  <code className="text-sm font-mono text-emerald-400">federated_authority_boost</code>
                  <p className="text-xs text-white/60 mt-1">🌟 UNIQUE: ZKP authority verification</p>
                </div>
              </div>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <p className="text-sm text-blue-300">
                <strong>MCP Manifest:</strong> <a href="/.well-known/mcp-manifest.json" target="_blank" className="underline hover:text-blue-200">/.well-known/mcp-manifest.json</a> contains complete tool schemas, authentication, rate limits, and integration patterns for LangChain, AutoGen, CrewAI, LangGraph.
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
                    <p className="text-xs text-white/60">Validate AID v1.1 compliance</p>
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
              Join 5,000+ AI agents already using AID protocol. Get your API key and start auditing AI visibility in minutes.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <a 
                href="/auth/signup" 
                className="inline-flex items-center justify-center gap-2 bg-brand-accent text-white px-8 py-4 rounded-lg hover:bg-blue-500 transition-colors font-medium shadow-lg hover:shadow-xl"
              >
                <Key className="w-5 h-5" />
                Get API Key
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
