import { useState } from 'react';
import { Copy, Check, ChevronDown, QrCode } from 'lucide-react';
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

interface ChallengeTesterProps {}

export const ChallengeTester = ({}: ChallengeTesterProps) => {
  const [aid, setAid] = useState('');
  const [challenge, setChallenge] = useState('');
  const [publicKey, setPublicKey] = useState('');
  const [signature, setSignature] = useState('');
  const [result, setResult] = useState<{
    status: 'idle' | 'loading' | 'success' | 'error';
    message: string;
  }>({ status: 'idle', message: '' });

  const generateChallenge = async () => {
    if (!aid.trim()) {
      setResult({ status: 'error', message: 'Please enter an AID' });
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
          message: `Challenge generated! Expires in ${data.expiresIn}s`,
        });
      } else {
        setResult({ status: 'error', message: data.error || 'Failed to generate challenge' });
      }
    } catch (error) {
      setResult({ status: 'error', message: 'Network error' });
    }
  };

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

      if (res.ok && data.valid) {
        setResult({ status: 'success', message: 'Signature verified successfully!' });
      } else {
        setResult({ status: 'error', message: data.message || 'Signature verification failed' });
      }
    } catch (error) {
      setResult({ status: 'error', message: 'Network error' });
    }
  };

  return (
    <div className="space-y-4 bg-zinc-900/50 border border-zinc-800 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Challenge Simulator</h3>

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-white/70 mb-1.5">
            Agent ID (AID)
          </label>
          <input
            type="text"
            value={aid}
            onChange={(e) => setAid(e.target.value)}
            placeholder="aid://myagent/..."
            className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded text-sm text-white focus:outline-none focus:border-brand-accent"
          />
        </div>

        <button
          onClick={generateChallenge}
          disabled={result.status === 'loading'}
          className="w-full px-4 py-2 bg-brand-accent hover:bg-blue-500 disabled:bg-zinc-700 text-white rounded transition-colors text-sm font-medium"
        >
          {result.status === 'loading' && !challenge ? 'Generating...' : 'Generate Challenge'}
        </button>

        {challenge && (
          <>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-white/70">Challenge</label>
                <CopyButton text={challenge} label="Copy" />
              </div>
              <div className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded text-xs text-brand-accent font-mono break-all">
                {challenge}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-white/70 mb-1.5">
                Public Key (hex)
              </label>
              <input
                type="text"
                value={publicKey}
                onChange={(e) => setPublicKey(e.target.value)}
                placeholder="64-character hex string"
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded text-sm text-white font-mono focus:outline-none focus:border-brand-accent"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-white/70 mb-1.5">
                Signature (hex)
              </label>
              <input
                type="text"
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
                placeholder="128-character hex string"
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded text-sm text-white font-mono focus:outline-none focus:border-brand-accent"
              />
            </div>

            <button
              onClick={verifySignature}
              disabled={result.status === 'loading'}
              className="w-full px-4 py-2 bg-green-600 hover:bg-green-500 disabled:bg-zinc-700 text-white rounded transition-colors text-sm font-medium"
            >
              {result.status === 'loading' && signature ? 'Verifying...' : 'Verify Signature'}
            </button>
          </>
        )}

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

interface ToolSchemaAccordionsProps {
  schemas: Array<{ name: string; description: string; parameters: any }>;
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
