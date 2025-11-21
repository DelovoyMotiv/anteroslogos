# Anóteros Lógos

**AI Knowledge Infrastructure Platform**

Production URL: https://anoteroslogos.com  
Codebase: 189 files | 60,189 lines

---

## Overview

Enterprise AI knowledge infrastructure with cryptographically verifiable provenance, deterministic execution, and blockchain-based micropayments. Autonomous agent integration via JSON-RPC 2.0, Model Context Protocol (MCP), and Agent Identity & Discovery (AID) standards.

**Core Capabilities:**

- **A2A Protocol** - JSON-RPC 2.0 API for agent-to-agent communication with Ed25519 signatures (RFC 9421)
- **APA Micropayments** - USDC-based payments on Base L2 (Chain ID: 8453) with automatic detection
- **MCP Integration** - Model Context Protocol v2.0 with isolated execution sandbox
- **Knowledge Graph** - Self-improving graph with citation learning and cross-platform sync
- **Causal Tracer** - Counterfactual reasoning engine for citation path analysis

---

## Technical Stack

**Runtime:**
- Node.js 20.x
- TypeScript 5.8 (strict mode)
- React 19.2 (client)
- Vercel Serverless Functions (API)

**Data Layer:**
- Supabase (PostgreSQL + Auth)
- Redis (distributed caching)
- Base L2 blockchain (payments)

**AI Integration:**
- OpenRouter API
- OpenAI, Anthropic Claude, Perplexity, Google Gemini
- Model Context Protocol v2.0

**Security:**
- Ed25519 cryptographic signatures
- AES-256-GCM encryption
- TLS 1.3
- WCAG 2.1 AA compliance

---

## Architecture

### A2A Protocol (JSON-RPC 2.0)

**Endpoint:** `POST https://anoteroslogos.com/api/a2a`

**Authentication:**  
Bearer token format: `sk_{tier}_{32_chars}`

**Methods:**
```
a2a.discover           Service metadata
a2a.capabilities       API documentation
geo.audit.request      Single URL audit (requires payment)
geo.audit.batch        Batch processing (max 100 URLs)
a2a.ping              Health check
a2a.status            System status
```

**Rate Limits:**
```
Free:       10 req/min   | 100 req/hour
Basic:      60 req/min   | 1,000 req/hour
Pro:        300 req/min  | 10,000 req/hour
Enterprise: 1,000 req/min| 50,000 req/hour
```

**Error Codes:**
```
-32700  Parse error
-32600  Invalid request
-32601  Method not found
-32602  Invalid params
-32603  Internal error
-32000  Rate limit exceeded
```

### APA Micropayments

**Blockchain:** Base L2 (Chain ID: 8453)  
**Token:** USDC (ERC-20)  
**Status:** Production

**Payment Modes:**

1. **Pay-Per-Request**
   - HTTP 402 response with invoice
   - Agent pays on-chain
   - Retry with tx_hash

2. **Pre-Deposit**
   - Agent deposits USDC to custodial wallet
   - Balance auto-debited per request

**Invoice Format:**
```json
{
  "invoiceId": "inv_01JDKP5R2G4M8QYX3WTNZHF9V7",
  "amount": 0.10,
  "token": "USDC",
  "recipientAddress": "0x...",
  "expiresAt": "2025-11-21T17:00:00Z"
}
```

**Pricing:**
```
geo.audit.request:       $0.10 (basic), $0.00 (pro)
causal_citation_trace:   $0.50 (basic), $0.25 (pro)
```

**Database Schema:**
- `a2a_wallets` - EVM wallet storage (AES-256-GCM encrypted)
- `a2a_invoices` - ULID-based invoice tracking
- `a2a_ledger` - Double-entry bookkeeping (append-only)
- `a2a_chain_watchers` - Blockchain scan state
- `a2a_pricing` - Temporal pricing queries
- `a2a_payment_detections` - Auto-detection audit log

**Security:**
- Idempotency: UNIQUE constraint on (tx_hash, user_id)
- Race conditions: PostgreSQL `SELECT FOR UPDATE`
- Reorg protection: Daily re-verification for <12 confirmations
- Params integrity: SHA3-512 hash verification

### MCP Protocol

**Endpoint:** `POST https://anoteroslogos.com/api/mcp`

**Execution:**
- isolated-vm sandbox (256MB heap, 2s timeout)
- No unsafe eval
- Memory leak prevention
- Signature verification (Ed25519)

**Tool Catalog:**
```
auditSite              Full GEO audit
getGraph               Knowledge graph retrieval
predictCitation        ML-based citation probability
trackCitation          Citation monitoring
learnFromCitations     Feedback loop
discoverAgent          AID protocol detection
syncPlatforms          Real-time platform sync (<60s)
```

### Agent Identity & Discovery (AID v1.1)

**DNS TXT Record:**  
`_agent.anoteroslogos.com`
```
v=1.1;p=a2a,http;u=https://anoteroslogos.com/api/a2a;s=geoaudit
```

**Well-Known Discovery:**  
`/.well-known/agent.json`

**Specification:** agentcommunity.org v1.1

---

## Installation

```bash
npm install
npm run build
npm run typecheck
```

**Environment Variables:**
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...

# APA Payments
PLATFORM_WALLET_ADDRESS=0x...
WALLET_ENCRYPTION_KEY=...
CRON_SECRET=...

# AI Integration
VITE_OPENROUTER_API_KEY=...
VITE_OPENROUTER_MODEL=minimax/minimax-m2:free
```

**Database Migrations:**
```bash
psql $DATABASE_URL < supabase/migrations/004_apa_payments_schema.sql
psql $DATABASE_URL < supabase/migrations/005_pricing_matrix_table.sql
psql $DATABASE_URL < supabase/migrations/006_payment_correlation_index.sql
```

---

## Project Structure

```
api/
  a2a/index.ts                    # A2A Protocol endpoint (545 lines)
  cron/reorg-monitor/             # Blockchain reorg monitoring
  mcp/route.ts                    # MCP Sandbox v2 (624 lines)
  goldStandard.ts                 # Gold Standard API (344 lines)

lib/
  payments/                       # APA Layer (4,700 lines)
    wallet.ts                     # Custodial/non-custodial (582 lines)
    invoice.ts                    # ULID-based invoices (667 lines)
    ledger.ts                     # Double-entry ledger (467 lines)
    chainWatcher.ts               # Payment detection (528 lines)
    paymentGuard.ts               # Enforcement (467 lines)
    reorgMonitor.ts               # Reorg protection (363 lines)
    rpcProvider.ts                # RPC failover (363 lines)
  
  a2a/                            # A2A Protocol (10,464 lines)
    protocol.ts                   # JSON-RPC 2.0 (526 lines)
    agentRegistry.ts              # Agent management (442 lines)
    rateLimiter.ts                # Token bucket (264 lines)
    ed25519Signatures.ts          # RFC 9421 (705 lines)
    websocketServer.ts            # Real-time streaming (568 lines)
    supabaseStorage.ts            # Persistence (668 lines)
  
  causalTracer/                   # Citation Tracer (4,020 lines)
    pathFinder.ts                 # BFS/DFS + A* (506 lines)
    counterfactualSimulator.ts    # ROI calculator (568 lines)
    llmDecisionEmulator.ts        # Platform scoring (565 lines)
  
  mcp/                            # MCP Sandbox v2 (1,659 lines)
    sandbox.ts                    # Enterprise sandbox (507 lines)
    schemas.ts                    # Universal schemas (528 lines)

supabase/migrations/
  004_apa_payments_schema.sql     # Core APA tables (416 lines)
  005_pricing_matrix_table.sql    # Dynamic pricing (150 lines)
  006_payment_correlation_index.sql # Auto-detection (347 lines)
```

---

## Performance

**Build:**
- Bundle: 1.6 MB (445 KB gzipped)
- Build time: 12-15s
- LCP: <2.5s
- CLS: <0.1
- INP: <200ms

**Runtime:**
- Audit processing: 30-120s depending on depth
- Payment detection: <60s from blockchain confirmation
- Knowledge graph sync: <60s to all platforms

---

## Documentation

**Core:**
- `lib/payments/README.md` - APA API reference (659 lines)
- `lib/payments/DEPLOYMENT_GUIDE.md` - Production setup (610 lines)
- `lib/payments/INTEGRATION_SUMMARY.md` - Technical overview (666 lines)

**Specifications:**
- `KNOWLEDGE_GRAPH_ENGINE.md` - KG architecture (450 lines)
- `CITATION_LEARNING_ENGINE.md` - ML feedback loop (417 lines)
- `GOLD_STANDARD_INNOVATIONS.md` - Persistence layer (417 lines)

**Examples:**
- `examples/agent-client.ts` - AI agent implementation (252 lines)
- `scripts/ed25519KeyManager.ts` - Key lifecycle CLI (398 lines)

---

## Integration

**cURL Example:**
```bash
curl -X POST https://anoteroslogos.com/api/a2a \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk_basic_..." \
  -d '{
    "jsonrpc": "2.0",
    "method": "geo.audit.request",
    "params": {"url": "https://example.com"},
    "id": 1
  }'
```

**Payment Flow:**
```bash
# 1. Request returns HTTP 402 with invoice
# 2. Send USDC to recipientAddress on Base L2
# 3. Retry with tx_hash in params
# 4. Receive HTTP 200 with audit results
```

**LangChain Tool:**
```typescript
import { Tool } from "langchain/tools";

class GeoAuditTool extends Tool {
  name = "geo_audit";
  description = "Audit website for AI visibility";
  
  async _call(url: string): Promise<string> {
    const response = await fetch("https://anoteroslogos.com/api/a2a", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer sk_basic_..."
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "geo.audit.request",
        params: { url },
        id: 1
      })
    });
    return JSON.stringify(await response.json());
  }
}
```

---

## Security

**Cryptography:**
- Ed25519 signatures per RFC 9421
- SHA-256 content digests
- AES-256-GCM wallet encryption
- Keccak256 invoice memos

**Authentication:**
- API key format validation
- Trust score enforcement (0-100)
- Agent status validation (not banned, trust ≥20)

**Network:**
- TLS 1.3 required
- CORS headers configured
- Rate limiting per tier
- Replay protection (5min timestamp window)

**Database:**
- Row-level security
- Append-only ledger
- Foreign key constraints
- Atomic transactions with SELECT FOR UPDATE

---

## Troubleshooting

**Build Errors:**
```bash
rm -rf node_modules dist .vite
npm install
npm run build
```

**TypeScript Errors:**
```bash
npm run typecheck
```

**Payment Detection:**
1. Verify tx on Base mainnet (not testnet)
2. Wait 2 confirmations (~4-6 seconds)
3. Check Vercel Cron logs (runs daily at midnight UTC)

**Environment Variables:**
```bash
vercel env add PLATFORM_WALLET_ADDRESS production
vercel env add WALLET_ENCRYPTION_KEY production
```

---

## Statistics

**Codebase:**
- Total files: 189
- Total lines: 60,189
- TypeScript: 94.9%
- PLpgSQL: 3.9%

**Components:**
- A2A Protocol: 10,464 lines
- APA Payments: 4,700 lines
- Causal Tracer: 4,020 lines
- MCP Sandbox: 1,659 lines
- Knowledge Graph: 2,288 lines
- React UI: 33 components

---

## License

Proprietary - All rights reserved

---

## Links

- Production: https://anoteroslogos.com
- GitHub: https://github.com/DelovoyMotiv/anteroslogos
- AID Specification: https://agentcommunity.org

---

Last Updated: November 21, 2025  
Version: 3.0.0
