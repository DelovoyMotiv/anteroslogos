import { useState, useCallback } from 'react';
import { Copy, Check, ChevronDown, QrCode, KeyRound, Loader2, RefreshCw } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface AccordionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

const Accordion = ({ title, children, defaultOpen = false }: AccordionProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-zinc-800 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-zinc-900/50 hover:bg-zinc-900 transition-colors text-left"
      >
        <span className="text-sm font-semibold text-white">{title}</span>
        <ChevronDown
          className={`w-5 h-5 text-white/60 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>
      {isOpen && <div className="p-4 bg-zinc-950/50">{children}</div>}
    </div>
  );
};

interface CopyButtonProps {
  text: string;
  label?: string;
}

export const CopyButton = ({ text, label = 'Copy' }: CopyButtonProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white/80 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded transition-colors"
    >
      {copied ? (
        <>
          <Check className="w-3.5 h-3.5 text-green-400" />
          Copied
        </>
      ) : (
        <>
          <Copy className="w-3.5 h-3.5" />
          {label}
        </>
      )}
    </button>
  );
};

interface QRCodeDisplayProps {
  url: string;
}

export const QRCodeDisplay = ({ url }: QRCodeDisplayProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
      >
        <QrCode className="w-4 h-4" />
        {isOpen ? 'Hide QR Code' : 'Show QR Code'}
      </button>
      {isOpen && (
        <div className="mt-4 p-4 bg-white rounded-lg inline-block">
          <QRCodeSVG
            value={url}
            size={256}
            level="M"
            fgColor="#3b82f6"
            bgColor="#ffffff"
          />
        </div>
      )}
    </div>
  );
};

interface ChallengeTesterProps {
  enableAutoKeygen?: boolean;
}

/**
 * Helper to convert hex string to Uint8Array
 */
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

/**
 * Helper to convert Uint8Array to hex string
 */
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export const ChallengeTester = ({ enableAutoKeygen = true }: ChallengeTesterProps) => {
  const [aid, setAid] = useState('');
  const [challenge, setChallenge] = useState('');
  const [publicKey, setPublicKey] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [signature, setSignature] = useState('');
  const [isGeneratingKeys, setIsGeneratingKeys] = useState(false);
  const [isAutoSigning, setIsAutoSigning] = useState(false);
  const [result, setResult] = useState<{
    status: 'idle' | 'loading' | 'success' | 'error';
    message: string;
  }>({ status: 'idle', message: '' });

  /**
   * Generate new Ed25519 keypair via API
   */
  const generateNewIdentity = useCallback(async () => {
    setIsGeneratingKeys(true);
    setResult({ status: 'loading', message: 'Generating new identity...' });

    try {
      const res = await fetch('/api/public-aid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'test-agent' }),
      });
      const data = await res.json();

      if (res.ok) {
        setAid(data.aid);
        setPublicKey(data.publicKey);
        setPrivateKey(data.privateKey);
        setChallenge('');
        setSignature('');
        setResult({
          status: 'success',
          message: `Identity created: ${data.aid}`,
        });
      } else {
        setResult({ status: 'error', message: data.error || 'Failed to generate identity' });
      }
    } catch {
      setResult({ status: 'error', message: 'Network error generating identity' });
    } finally {
      setIsGeneratingKeys(false);
    }
  }, []);

  /**
   * Generate challenge for current AID
   */
  const generateChallenge = async () => {
    if (!aid.trim()) {
      setResult({ status: 'error', message: 'Please enter an AID or generate a new identity' });
      return;
    }

    setResult({ status: 'loading', message: 'Generating challenge...' });

    try {
      const res = await fetch(`/api/challenge?aid=${encodeURIComponent(aid)}`);
      const data = await res.json();

      if (res.ok) {
        setChallenge(data.challenge);
        setResult({
          status: 'success',
          message: `Challenge generated! Expires in ${data.expiresIn || 300}s`,
        });
      } else {
        setResult({ status: 'error', message: data.error || 'Failed to generate challenge' });
      }
    } catch {
      setResult({ status: 'error', message: 'Network error' });
    }
  };

  /**
   * Auto-sign challenge using stored private key (client-side Ed25519)
   * Requires @noble/curves loaded dynamically
   */
  const autoSignChallenge = useCallback(async () => {
    if (!challenge || !privateKey) {
      setResult({ status: 'error', message: 'Challenge and private key required for auto-sign' });
      return;
    }

    setIsAutoSigning(true);
    setResult({ status: 'loading', message: 'Signing challenge...' });

    try {
      // Dynamically import @noble/curves for client-side signing
      const { ed25519 } = await import('@noble/curves/ed25519.js');
      
      // Sign the challenge
      const messageBytes = new TextEncoder().encode(challenge);
      const privateKeyBytes = hexToBytes(privateKey);
      const signatureBytes = ed25519.sign(messageBytes, privateKeyBytes);
      const signatureHex = bytesToHex(signatureBytes);
      
      setSignature(signatureHex);
      setResult({
        status: 'success',
        message: 'Challenge signed! Click "Verify Signature" to test.',
      });
    } catch (error) {
      setResult({ 
        status: 'error', 
        message: `Signing failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      });
    } finally {
      setIsAutoSigning(false);
    }
  }, [challenge, privateKey]);

  /**
   * Verify signature with server
   */
  const verifySignature = async () => {
    if (!aid.trim() || !challenge.trim() || !publicKey.trim() || !signature.trim()) {
      setResult({ status: 'error', message: 'All fields are required' });
      return;
    }

    setResult({ status: 'loading', message: 'Verifying signature...' });

    try {
      const res = await fetch('/api/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aid, challenge, publicKey, signature }),
      });
      const data = await res.json();

      if (res.ok && data.verified) {
        setResult({ 
          status: 'success', 
          message: data.jwt 
            ? `✓ Verified! JWT issued (expires ${new Date(data.expiresAt).toLocaleTimeString()})` 
            : 'Signature verified successfully!' 
        });
      } else {
        setResult({ status: 'error', message: data.error || 'Signature verification failed' });
      }
    } catch {
      setResult({ status: 'error', message: 'Network error' });
    }
  };

  /**
   * One-click full flow: generate identity -> get challenge -> sign -> verify
   */
  const runFullFlow = useCallback(async () => {
    setResult({ status: 'loading', message: 'Running full authentication flow...' });
    
    try {
      // Step 1: Generate identity
      const identityRes = await fetch('/api/public-aid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'flow-test' }),
      });
      const identity = await identityRes.json();
      if (!identityRes.ok) throw new Error(identity.error || 'Identity generation failed');
      
      setAid(identity.aid);
      setPublicKey(identity.publicKey);
      setPrivateKey(identity.privateKey);

      // Step 2: Get challenge
      const challengeRes = await fetch(`/api/challenge?aid=${encodeURIComponent(identity.aid)}`);
      const challengeData = await challengeRes.json();
      if (!challengeRes.ok) throw new Error(challengeData.error || 'Challenge generation failed');
      
      setChallenge(challengeData.challenge);

      // Step 3: Sign challenge
      const { ed25519 } = await import('@noble/curves/ed25519.js');
      const messageBytes = new TextEncoder().encode(challengeData.challenge);
      const privateKeyBytes = hexToBytes(identity.privateKey);
      const signatureBytes = ed25519.sign(messageBytes, privateKeyBytes);
      const signatureHex = bytesToHex(signatureBytes);
      
      setSignature(signatureHex);

      // Step 4: Verify signature
      const verifyRes = await fetch('/api/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aid: identity.aid,
          challenge: challengeData.challenge,
          publicKey: identity.publicKey,
          signature: signatureHex,
        }),
      });
      const verifyData = await verifyRes.json();

      if (verifyRes.ok && verifyData.verified) {
        setResult({
          status: 'success',
          message: `✓ Full flow completed! Agent ${identity.aid} authenticated.`,
        });
      } else {
        throw new Error(verifyData.error || 'Verification failed');
      }
    } catch (err) {
      setResult({ status: 'error', message: `Flow failed: ${err instanceof Error ? err.message : 'Unknown error'}` });
    }
  }, []);

  return (
    <div className="space-y-4 bg-zinc-900/50 border border-zinc-800 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Ed25519 Challenge-Response Tester</h3>
        {enableAutoKeygen && (
          <button
            onClick={runFullFlow}
            className="px-3 py-1.5 text-xs font-medium text-white/80 hover:text-white bg-gradient-to-r from-brand-accent to-purple-500 hover:from-blue-500 hover:to-purple-400 rounded transition-colors flex items-center gap-1.5"
          >
            <RefreshCw className="w-3 h-3" />
            Run Full Flow
          </button>
        )}
      </div>

      <div className="space-y-3">
        {/* Step 1: Identity */}
        <div className="p-3 bg-zinc-950/50 rounded border border-zinc-800">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-5 h-5 bg-brand-accent text-white text-xs font-bold rounded-full flex items-center justify-center">1</span>
            <span className="text-sm font-medium text-white">Agent Identity</span>
          </div>
          
          <div className="space-y-2">
            <div>
              <label className="block text-xs font-medium text-white/70 mb-1">
                Agent ID (AID)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={aid}
                  onChange={(e) => setAid(e.target.value)}
                  placeholder="aid://myagent/..."
                  className="flex-1 px-3 py-2 bg-zinc-950 border border-zinc-700 rounded text-sm text-white focus:outline-none focus:border-brand-accent font-mono text-xs"
                />
                {enableAutoKeygen && (
                  <button
                    onClick={generateNewIdentity}
                    disabled={isGeneratingKeys}
                    className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-800 text-white rounded transition-colors text-xs font-medium flex items-center gap-1.5"
                  >
                    {isGeneratingKeys ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <KeyRound className="w-3.5 h-3.5" />
                    )}
                    Generate
                  </button>
                )}
              </div>
            </div>

            {publicKey && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-white/70">Public Key</label>
                  <CopyButton text={publicKey} label="Copy" />
                </div>
                <div className="px-2 py-1.5 bg-zinc-950 border border-zinc-700 rounded text-xs text-green-400 font-mono break-all">
                  {publicKey}
                </div>
              </div>
            )}

            {privateKey && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-yellow-400/70">Private Key (keep secret!)</label>
                  <CopyButton text={privateKey} label="Copy" />
                </div>
                <div className="px-2 py-1.5 bg-zinc-950 border border-yellow-500/30 rounded text-xs text-yellow-400 font-mono break-all">
                  {privateKey}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Step 2: Challenge */}
        <div className="p-3 bg-zinc-950/50 rounded border border-zinc-800">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-5 h-5 bg-brand-accent text-white text-xs font-bold rounded-full flex items-center justify-center">2</span>
            <span className="text-sm font-medium text-white">Challenge</span>
          </div>

          <button
            onClick={generateChallenge}
            disabled={result.status === 'loading' || !aid}
            className="w-full px-4 py-2 bg-brand-accent hover:bg-blue-500 disabled:bg-zinc-700 disabled:text-zinc-400 text-white rounded transition-colors text-sm font-medium mb-2"
          >
            Get Challenge from Server
          </button>

          {challenge && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-white/70">Challenge String</label>
                <CopyButton text={challenge} label="Copy" />
              </div>
              <div className="px-2 py-1.5 bg-zinc-950 border border-zinc-700 rounded text-xs text-brand-accent font-mono break-all">
                {challenge}
              </div>
            </div>
          )}
        </div>

        {/* Step 3: Sign */}
        {challenge && (
          <div className="p-3 bg-zinc-950/50 rounded border border-zinc-800">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-5 h-5 bg-brand-accent text-white text-xs font-bold rounded-full flex items-center justify-center">3</span>
              <span className="text-sm font-medium text-white">Signature</span>
            </div>

            {privateKey && (
              <button
                onClick={autoSignChallenge}
                disabled={isAutoSigning}
                className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-zinc-700 text-white rounded transition-colors text-sm font-medium mb-2 flex items-center justify-center gap-2"
              >
                {isAutoSigning ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Signing...
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    Auto-Sign with Private Key
                  </>
                )}
              </button>
            )}

            <div>
              <label className="block text-xs font-medium text-white/70 mb-1">
                Signature (hex, 128 chars)
              </label>
              <input
                type="text"
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
                placeholder="Enter signature or use auto-sign"
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded text-xs text-white font-mono focus:outline-none focus:border-brand-accent"
              />
            </div>
          </div>
        )}

        {/* Step 4: Verify */}
        {signature && (
          <div className="p-3 bg-zinc-950/50 rounded border border-zinc-800">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-5 h-5 bg-brand-accent text-white text-xs font-bold rounded-full flex items-center justify-center">4</span>
              <span className="text-sm font-medium text-white">Verify</span>
            </div>

            {!publicKey && (
              <div className="mb-2">
                <label className="block text-xs font-medium text-white/70 mb-1">
                  Public Key (hex)
                </label>
                <input
                  type="text"
                  value={publicKey}
                  onChange={(e) => setPublicKey(e.target.value)}
                  placeholder="64-character hex string"
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded text-xs text-white font-mono focus:outline-none focus:border-brand-accent"
                />
              </div>
            )}

            <button
              onClick={verifySignature}
              disabled={result.status === 'loading'}
              className="w-full px-4 py-2 bg-green-600 hover:bg-green-500 disabled:bg-zinc-700 text-white rounded transition-colors text-sm font-medium"
            >
              Verify Signature on Server
            </button>
          </div>
        )}

        {/* Result */}
        {result.message && (
          <div
            className={`px-4 py-3 rounded text-sm ${
              result.status === 'success'
                ? 'bg-green-500/10 border border-green-500/30 text-green-400'
                : result.status === 'error'
                ? 'bg-red-500/10 border border-red-500/30 text-red-400'
                : 'bg-blue-500/10 border border-blue-500/30 text-blue-400'
            }`}
          >
            {result.message}
          </div>
        )}
      </div>
    </div>
  );
};

import type { JSONValue } from '../../types/common.types';

interface ToolSchema {
  name: string;
  description: string;
  parameters: JSONValue;
}

interface ToolSchemaAccordionsProps {
  schemas: ToolSchema[];
}

export const ToolSchemaAccordions = ({ schemas }: ToolSchemaAccordionsProps) => {
  return (
    <div className="space-y-3">
      {schemas.map((schema, index) => (
        <Accordion key={index} title={schema.name} defaultOpen={index === 0}>
          <div className="space-y-3">
            <p className="text-sm text-white/70">{schema.description}</p>
            <div className="bg-zinc-900 border border-zinc-800 rounded p-3 overflow-x-auto">
              <pre className="text-xs text-brand-accent font-mono">
                {JSON.stringify(schema.parameters, null, 2)}
              </pre>
            </div>
            <CopyButton text={JSON.stringify(schema, null, 2)} label="Copy Schema" />
          </div>
        </Accordion>
      ))}
    </div>
  );
};
