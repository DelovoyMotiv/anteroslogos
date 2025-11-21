/**
 * InteractiveExplorer Component
 * Live API tester for a2a.discover method
 * Allows agents to test endpoint without leaving documentation
 */

import { useState } from 'react';
import { Play, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export function InteractiveExplorer() {
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleTest = async () => {
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const res = await fetch('https://anoteroslogos.com/api/a2a', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey && { 'Authorization': `Bearer ${apiKey}` }),
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'a2a.discover',
          params: {},
          id: 1,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setError(data.error?.message || `HTTP ${res.status}: ${res.statusText}`);
      } else {
        setResponse(data);
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border-2 border-brand-accent/30 rounded-lg bg-zinc-900/30 p-6">
      <div className="flex items-center gap-3 mb-4">
        <Play className="w-5 h-5 text-brand-accent" />
        <h3 className="text-lg font-semibold text-white">Interactive API Explorer</h3>
      </div>

      <p className="text-sm text-zinc-400 mb-4">
        Test the <code className="bg-zinc-950 px-2 py-0.5 rounded text-brand-accent font-mono text-xs">a2a.discover</code> method live. API key optional for discovery.
      </p>

      {/* API Key Input */}
      <div className="mb-4">
        <label className="block text-xs font-medium text-zinc-400 mb-2">
          API Key (Optional)
        </label>
        <input
          type="text"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="sk_free_..."
          className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded text-sm text-white placeholder:text-zinc-600 focus:border-brand-accent focus:ring-1 focus:ring-brand-accent/50 focus:outline-none transition-colors font-mono"
        />
      </div>

      {/* Execute Button */}
      <button
        onClick={handleTest}
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
            Execute a2a.discover
          </>
        )}
      </button>

      {/* Response Display */}
      {response && (
        <div className="mt-4 border border-green-500/30 rounded-lg bg-green-500/5 p-4">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-4 h-4 text-green-400" />
            <span className="text-sm font-medium text-green-400">Success</span>
          </div>
          <pre className="bg-zinc-950 p-3 rounded text-xs font-mono text-zinc-300 overflow-x-auto">
            {JSON.stringify(response, null, 2)}
          </pre>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mt-4 border border-red-500/30 rounded-lg bg-red-500/5 p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-4 h-4 text-red-400" />
            <span className="text-sm font-medium text-red-400">Error</span>
          </div>
          <p className="text-xs text-red-300">{error}</p>
        </div>
      )}
    </div>
  );
}
