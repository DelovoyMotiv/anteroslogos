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
                A2A v1.0.0
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
                → A2A Protocol
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
                  defaultOpen={true}
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
                <h3 className="text-xl font-semibold text-white mb-4">HTTPS Well-Known Endpoint (RFC 8615)</h3>
                <p className="text-sm text-white/70 mb-4">
                  Fallback discovery if DNS lookup fails. CORS-enabled, JSON format.
                </p>

                <CodeSample
                  title="GET /.well-known/agent.json"
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
                    title="agent.json Schema"
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
                          "a2a.discover"
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
              <h2 className="text-3xl font-bold text-white">A2A Protocol (JSON-RPC 2.0)</h2>
            </div>

            <p className="text-white/70 mb-6">
              Agent-to-Agent communication protocol. JSON-RPC 2.0 compliant with bearer token authentication.
            </p>

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
                          "a2a.status"
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

          {/* Interactive Explorer */}
          <section className="mb-16">
            <InteractiveExplorer />
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
