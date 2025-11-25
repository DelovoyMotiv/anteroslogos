/**
 * InteractiveExplorer Component
 * Live API tester for A2A, MCP, and identity endpoints
 * Allows AI agents to test all endpoints without leaving documentation
 */

import { useState, useCallback } from 'react';
import { Play, Loader2, CheckCircle2, AlertCircle, ChevronDown, Copy, Check, Zap, Globe, Key, Database, Link2 } from 'lucide-react';

type ApiMethod = {
  id: string;
  name: string;
  description: string;
  category: 'a2a' | 'mcp' | 'identity' | 'discovery';
  endpoint: string;
  method: 'GET' | 'POST';
  body?: object;
  requiresAuth?: boolean;
};

const API_METHODS: ApiMethod[] = [
  // A2A Methods
  {
    id: 'a2a.discover',
    name: 'a2a.discover',
    description: 'Discover agent capabilities and metadata',
    category: 'a2a',
    endpoint: '/api/a2a',
    method: 'POST',
    body: { jsonrpc: '2.0', method: 'a2a.discover', params: {}, id: 1 },
  },
  {
    id: 'a2a.ping',
    name: 'a2a.ping',
    description: 'Check agent health and latency',
    category: 'a2a',
    endpoint: '/api/a2a',
    method: 'POST',
    body: { jsonrpc: '2.0', method: 'a2a.ping', id: 2 },
  },
  {
    id: 'a2a.capabilities',
    name: 'a2a.capabilities',
    description: 'Get detailed capabilities list',
    category: 'a2a',
    endpoint: '/api/a2a',
    method: 'POST',
    body: { jsonrpc: '2.0', method: 'a2a.capabilities', id: 3 },
  },
  // Discovery Endpoints
  {
    id: 'agent.json',
    name: '.well-known/agent.json',
    description: 'AID v1.1 agent manifest',
    category: 'discovery',
    endpoint: '/.well-known/agent.json',
    method: 'GET',
  },
  {
    id: 'agent-card.json',
    name: '.well-known/agent-card.json',
    description: 'Linux Foundation A2A v1.0 agent card',
    category: 'discovery',
    endpoint: '/.well-known/agent-card.json',
    method: 'GET',
  },
  {
    id: 'capabilities.json',
    name: '.well-known/capabilities.json',
    description: 'Advanced tool use capabilities',
    category: 'discovery',
    endpoint: '/.well-known/capabilities.json',
    method: 'GET',
  },
  {
    id: 'mcp-manifest.json',
    name: '.well-known/mcp-manifest.json',
    description: 'MCP v2.0 manifest',
    category: 'discovery',
    endpoint: '/.well-known/mcp-manifest.json',
    method: 'GET',
  },
  // Identity Endpoints
  {
    id: 'public-aid.generate',
    name: 'Generate AID',
    description: 'Generate new Ed25519 keypair and AID',
    category: 'identity',
    endpoint: '/api/public-aid',
    method: 'POST',
    body: { name: 'test-agent' },
  },
  {
    id: 'capabilities.openapi',
    name: 'OpenAPI Spec',
    description: 'Full OpenAPI 3.1 specification',
    category: 'identity',
    endpoint: '/api/capabilities',
    method: 'GET',
  },
  // MCP
  {
    id: 'tools.search',
    name: 'Search Tools',
    description: 'Search available MCP tools',
    category: 'mcp',
    endpoint: '/api/tools/search?q=audit&limit=5',
    method: 'GET',
  },
];

const CATEGORY_ICONS = {
  a2a: Globe,
  mcp: Zap,
  identity: Key,
  discovery: Database,
};

const CATEGORY_COLORS = {
  a2a: 'text-blue-400 bg-blue-400/10 border-blue-400/30',
  mcp: 'text-purple-400 bg-purple-400/10 border-purple-400/30',
  identity: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',
  discovery: 'text-green-400 bg-green-400/10 border-green-400/30',
};

export function InteractiveExplorer() {
  const [selectedMethod, setSelectedMethod] = useState<ApiMethod>(API_METHODS[0]);
  const [apiKey, setApiKey] = useState('');
  const [customBody, setCustomBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<{ data: any; status: number; time: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showMethodDropdown, setShowMethodDropdown] = useState(false);

  const handleMethodChange = useCallback((method: ApiMethod) => {
    setSelectedMethod(method);
    setCustomBody(method.body ? JSON.stringify(method.body, null, 2) : '');
    setResponse(null);
    setError(null);
    setShowMethodDropdown(false);
  }, []);

  const handleExecute = async () => {
    setLoading(true);
    setError(null);
    setResponse(null);

    const startTime = performance.now();

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }

      const options: RequestInit = {
        method: selectedMethod.method,
        headers,
      };

      if (selectedMethod.method === 'POST') {
        options.body = customBody || JSON.stringify(selectedMethod.body);
      }

      const res = await fetch(selectedMethod.endpoint, options);
      const endTime = performance.now();
      const data = await res.json();

      if (!res.ok || data.error) {
        setError(data.error?.message || data.error || `HTTP ${res.status}: ${res.statusText}`);
      } else {
        setResponse({
          data,
          status: res.status,
          time: Math.round(endTime - startTime),
        });
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const copyResponse = async () => {
    if (response) {
      await navigator.clipboard.writeText(JSON.stringify(response.data, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const generateCurlCommand = useCallback(() => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://anoteroslogos.com';
    let cmd = `curl -X ${selectedMethod.method} '${baseUrl}${selectedMethod.endpoint}'`;
    
    if (selectedMethod.method === 'POST') {
      cmd += ` \\
  -H 'Content-Type: application/json'`;
      if (apiKey) {
        cmd += ` \\
  -H 'Authorization: Bearer ${apiKey}'`;
      }
      cmd += ` \\
  -d '${customBody || JSON.stringify(selectedMethod.body)}'`;
    }
    
    return cmd;
  }, [selectedMethod, apiKey, customBody]);

  const CategoryIcon = CATEGORY_ICONS[selectedMethod.category];

  return (
    <div className="border-2 border-brand-accent/30 rounded-lg bg-zinc-900/30 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-900/50">
        <div className="flex items-center gap-3">
          <Link2 className="w-5 h-5 text-brand-accent" />
          <h3 className="text-lg font-semibold text-white">API Explorer</h3>
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <span className="px-2 py-0.5 rounded bg-zinc-800">Live</span>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Method Selector */}
        <div className="relative">
          <button
            onClick={() => setShowMethodDropdown(!showMethodDropdown)}
            className="w-full flex items-center justify-between px-4 py-3 bg-zinc-950 border border-zinc-700 rounded-lg hover:border-zinc-600 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className={`px-2 py-1 text-xs font-mono rounded border ${CATEGORY_COLORS[selectedMethod.category]}`}>
                {selectedMethod.method}
              </span>
              <div className="flex items-center gap-2">
                <CategoryIcon className="w-4 h-4 text-zinc-400" />
                <code className="text-sm text-brand-accent font-mono">{selectedMethod.name}</code>
              </div>
            </div>
            <ChevronDown className={`w-5 h-5 text-zinc-400 transition-transform ${showMethodDropdown ? 'rotate-180' : ''}`} />
          </button>

          {showMethodDropdown && (
            <div className="absolute z-10 mt-1 w-full bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl overflow-hidden">
              {(['a2a', 'discovery', 'identity', 'mcp'] as const).map((category) => (
                <div key={category}>
                  <div className="px-3 py-1.5 text-xs font-medium text-zinc-500 uppercase bg-zinc-950">
                    {category === 'a2a' ? 'A2A Protocol' : category === 'mcp' ? 'MCP Tools' : category.charAt(0).toUpperCase() + category.slice(1)}
                  </div>
                  {API_METHODS.filter((m) => m.category === category).map((method) => {
                    const Icon = CATEGORY_ICONS[method.category];
                    return (
                      <button
                        key={method.id}
                        onClick={() => handleMethodChange(method)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-800 transition-colors text-left ${
                          selectedMethod.id === method.id ? 'bg-zinc-800' : ''
                        }`}
                      >
                        <span className={`px-1.5 py-0.5 text-xs font-mono rounded border ${CATEGORY_COLORS[method.category]}`}>
                          {method.method}
                        </span>
                        <Icon className="w-4 h-4 text-zinc-500" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-white font-mono truncate">{method.name}</div>
                          <div className="text-xs text-zinc-500 truncate">{method.description}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Endpoint Display */}
        <div className="flex items-center gap-2 px-3 py-2 bg-zinc-950 rounded border border-zinc-800">
          <span className="text-xs text-zinc-500">Endpoint:</span>
          <code className="text-xs text-zinc-300 font-mono flex-1">{selectedMethod.endpoint}</code>
        </div>

        {/* API Key Input */}
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">
            Authorization (Optional)
          </label>
          <input
            type="text"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Bearer token or API key"
            className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded text-sm text-white placeholder:text-zinc-600 focus:border-brand-accent focus:outline-none transition-colors font-mono"
          />
        </div>

        {/* Request Body (for POST) */}
        {selectedMethod.method === 'POST' && (
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">
              Request Body (JSON)
            </label>
            <textarea
              value={customBody || JSON.stringify(selectedMethod.body, null, 2)}
              onChange={(e) => setCustomBody(e.target.value)}
              rows={5}
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded text-xs text-white font-mono focus:border-brand-accent focus:outline-none transition-colors resize-none"
            />
          </div>
        )}

        {/* Execute Button */}
        <button
          onClick={handleExecute}
          disabled={loading}
          className="w-full py-2.5 bg-brand-accent hover:bg-blue-500 text-white text-sm font-medium rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Executing...
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              Execute Request
            </>
          )}
        </button>

        {/* cURL Command */}
        <details className="group">
          <summary className="cursor-pointer text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
            Show cURL command
          </summary>
          <pre className="mt-2 p-3 bg-zinc-950 rounded text-xs font-mono text-zinc-400 overflow-x-auto">
            {generateCurlCommand()}
          </pre>
        </details>

        {/* Response Display */}
        {response && (
          <div className="border border-green-500/30 rounded-lg bg-green-500/5 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 border-b border-green-500/20">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                <span className="text-sm font-medium text-green-400">Success</span>
                <span className="text-xs text-zinc-500">HTTP {response.status}</span>
                <span className="text-xs text-zinc-500">{response.time}ms</span>
              </div>
              <button
                onClick={copyResponse}
                className="flex items-center gap-1.5 px-2 py-1 text-xs text-zinc-400 hover:text-white transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 text-green-400" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    Copy
                  </>
                )}
              </button>
            </div>
            <pre className="p-4 text-xs font-mono text-zinc-300 overflow-x-auto max-h-80">
              {JSON.stringify(response.data, null, 2)}
            </pre>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="border border-red-500/30 rounded-lg bg-red-500/5 p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4 text-red-400" />
              <span className="text-sm font-medium text-red-400">Error</span>
            </div>
            <p className="text-xs text-red-300 font-mono">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}
