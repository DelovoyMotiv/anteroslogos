# Anóteros Lógos - Enterprise AI Knowledge Infrastructure

[![License](https://img.shields.io/badge/License-Proprietary-red.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-3.0.0-blue.svg)](CHANGELOG.md)
[![Node](https://img.shields.io/badge/node-20.x-brightgreen.svg)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.2-61dafb.svg)](https://react.dev)
[![Build](https://img.shields.io/badge/build-passing-brightgreen.svg)](https://github.com/DelovoyMotiv/anteroslogos)

Enterprise-grade AI knowledge infrastructure platform with cryptographically verifiable provenance, deterministic execution, and **Agent-Pay-Agent (APA) micropayments layer**. First production implementation of USDC-based micropayments for autonomous AI agent interactions on Base L2 blockchain.

**Production URL:** https://anoteroslogos.com  
**Codebase:** 189 files | **60,189 lines of code**

---

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Type check
npm run typecheck
```

**Environment Variables:** Copy `.env.example` to `.env` and configure Supabase, OpenRouter API, and APA payment credentials.

---

## 🏗️ Architecture Overview

### Core Technology Stack

**Frontend:**
- React 19.2 + TypeScript 5.8 (strict mode)
- Vite 6.2 (build tool)
- React Router 7.9.5 (lazy loading)
- Tailwind CSS 3.4 (design system)
- Recharts 3.3 (data visualization)
- jsPDF (PDF generation)

**Backend:**
- Vercel Serverless Functions (Edge runtime)
- Supabase (PostgreSQL database + Auth)
- Redis (optional, for distributed rate limiting)

**AI Integration:**
- OpenRouter API (LLM aggregation)
- Direct LLM: OpenAI, Anthropic Claude, Perplexity, Google Gemini
- Model Context Protocol (MCP) with Enterprise Sandbox v2

**Blockchain:**
- Base L2 (Chain ID: 8453)
- Viem + Ethers.js (blockchain interaction)
- USDC payments (ERC-20)

### Performance Metrics

- **Bundle Size:** ~1.6 MB (445 KB gzipped)
- **Build Time:** 12-15s in CI/CD
- **LCP:** <2.5s | **CLS:** <0.1 | **INP:** <200ms
- **Code Splitting:** Route-based with React.lazy

### Security Features

- WCAG 2.1 AA compliant
- XSS/SQL injection prevention
- SSRF protection with IP blocklisting
- Rate limiting: 5 req/min (free), up to 1,000 req/min (enterprise)
- Ed25519 cryptographic signatures (RFC 9421)
- AES-256-GCM wallet encryption

---

## 📦 Project Structure

```
F:\air\
├── api/                           # Vercel Serverless Functions
│   ├── a2a/index.ts              # A2A Protocol endpoint (545 lines) ⚡ APA integrated
│   ├── cron/reorg-monitor/       # Blockchain reorg monitoring
│   ├── mcp/route.ts              # MCP Sandbox v2 (624 lines)
│   ├── goldStandard.ts           # Gold Standard API (344 lines)
│   ├── agent-keys.ts             # Agent key management
│   ├── keys.ts                   # API key generation
│   └── stripe.ts                 # Stripe payment integration
│
├── lib/                           # Core Business Logic
│   ├── payments/                  # ⚡ APA Micropayments Layer (4,700 lines)
│   │   ├── wallet.ts             # Custodial/non-custodial wallets (582 lines)
│   │   ├── invoice.ts            # ULID-based invoice system (667 lines)
│   │   ├── ledger.ts             # Double-entry bookkeeping (467 lines)
│   │   ├── chainWatcher.ts       # Auto-payment detection (528 lines)
│   │   ├── paymentGuard.ts       # Payment enforcement (467 lines)
│   │   ├── reorgMonitor.ts       # Reorg protection (363 lines)
│   │   ├── rpcProvider.ts        # RPC failover (363 lines)
│   │   ├── detectionAnalytics.ts # Payment analytics (321 lines)
│   │   └── types.ts              # TypeScript schemas (320 lines)
│   ├── a2a/                       # A2A Protocol (10,464 lines)
│   │   ├── protocol.ts           # JSON-RPC 2.0 (526 lines)
│   │   ├── agentRegistry.ts      # Agent management (442 lines)
│   │   ├── rateLimiter.ts        # Token bucket (264 lines)
│   │   ├── cache.ts              # TTL cache (478 lines)
│   │   ├── queue.ts              # Job queue (467 lines)
│   │   ├── logger.ts             # Structured logging (486 lines)
│   │   ├── ed25519Signatures.ts  # RFC 9421 signatures (705 lines)
│   │   ├── ed25519KeyStorage.ts  # Key persistence (423 lines)
│   │   ├── websocketServer.ts    # Real-time streaming (568 lines)
│   │   ├── supabaseStorage.ts    # Database persistence (668 lines)
│   │   ├── mcpAdapter.ts         # MCP integration (597 lines)
│   │   └── mcpSandbox.ts         # Code execution (362 lines)
│   ├── causalTracer/              # Causal Citation Tracer (4,020 lines)
│   │   ├── pathFinder.ts         # BFS/DFS + A* (506 lines)
│   │   ├── counterfactualSimulator.ts # ROI calculator (568 lines)
│   │   ├── llmDecisionEmulator.ts # Platform scoring (565 lines)
│   │   └── engine.ts             # Orchestration (785 lines)
│   ├── mcp/                       # MCP Sandbox v2 (1,659 lines)
│   │   ├── sandbox.ts            # Enterprise sandbox (507 lines)
│   │   └── schemas.ts            # Universal tool schemas (528 lines)
│   └── aiSyndication/            # AI platform sync (558 lines)
│
├── components/                    # React Components (33 total)
│   ├── charts/                   # Recharts visualizations
│   ├── AIVisibilityScore.tsx    # Citation probability (253 lines)
│   ├── KnowledgeGraphDashboard.tsx # KG visualization (356 lines)
│   ├── CitationLearningDashboard.tsx # Learning UI (420 lines)
│   ├── TracerViz.tsx            # Causal graph viz (630 lines)
│   ├── GEOHealthTracker.tsx     # Daily monitoring (398 lines)
│   └── [28 more components]
│
├── pages/                         # Application Pages
│   ├── HomePage.tsx              # Platform positioning
│   ├── GeoAuditPage.tsx          # GEO SaaS (1,950+ lines)
│   ├── AgentIdentityPage.tsx    # AID protocol (750+ lines)
│   ├── InvestorRelationsPage.tsx # Infrastructure thesis (660 lines)
│   └── [4 more pages]
│
├── utils/                         # Utility Functions
│   ├── knowledgeGraph/           # Self-improving KG (2,288 lines)
│   ├── citationPrediction/       # ML prediction (765 lines)
│   ├── citationLearning/         # Feedback engine (705 lines)
│   ├── citationProof/            # ROI tracking (465 lines)
│   ├── goldStandard/             # Persistence (444 lines)
│   ├── queryIntent/              # Intent classification (828 lines)
│   ├── contentGap/               # Gap detection (748 lines)
│   ├── competitiveIntelligence/  # Real-time monitoring (687 lines)
│   ├── geoAuditEnhanced.ts      # Audit engine (2,100+ lines)
│   └── [10 more utilities]
│
├── supabase/                      # Database Migrations
│   └── migrations/
│       ├── 001_initial_schema.sql
│       ├── 002_gold_standard_schema.sql (487 lines)
│       ├── 003_auth_schema.sql
│       ├── 004_apa_payments_schema.sql ⚡ (416 lines)
│       ├── 005_pricing_matrix_table.sql ⚡ (150 lines)
│       └── 006_payment_correlation_index.sql ⚡ (347 lines)
│
├── examples/
│   └── agent-client.ts           ⚡ Working AI agent client (252 lines)
│
├── public/
│   ├── .well-known/
│   │   ├── agent.json            # AID protocol discovery
│   │   ├── mcp-manifest.json     # MCP discovery
│   │   └── mcp-*.json            # Tool schemas (OpenAI/Claude/Grok)
│   ├── robots.txt
│   └── sitemap.xml
│
├── scripts/
│   └── ed25519KeyManager.ts      # CLI key manager (398 lines)
│
└── types/
    ├── database.types.ts         # Supabase types
    ├── causalTracer.types.ts    # Tracer types (596 lines)
    └── goldStandard.types.ts    # Gold Standard types (326 lines)
```

**⚡ = New APA Integration (November 2025)**

---

## 💰 Agent-Pay-Agent (APA) Micropayments Layer

**Status:** ✅ Production Ready (9/10)  
**Blockchain:** Base L2 (Chain ID: 8453)  
**Token:** USDC (ERC-20)  
**Launch Date:** November 21, 2025

### Overview

First production implementation of **blockchain-based micropayments for autonomous AI agents**. Agents can pay for API calls using USDC on Base L2 with automatic payment detection, invoice generation, and balance management.

### Key Features

**Payment Modes:**
- **Pay-Per-Request:** Agent receives HTTP 402 invoice → pays on Base L2 → retries with tx_hash
- **Pre-Deposit:** Agent deposits USDC → balance auto-debited per request
- **Free Tier:** $0.00 for basic methods (discovery, ping, status)

**Core Capabilities:**
- ✅ ULID-based invoice IDs (`inv_{ULID}`)
- ✅ Automatic payment detection via blockchain scanning
- ✅ Double-entry bookkeeping ledger (append-only)
- ✅ Atomic balance operations (race condition prevention)
- ✅ Idempotency protection (replay attack prevention)
- ✅ Reorg monitoring (<12 confirmations re-verified)
- ✅ RPC failover resilience (Base → Alchemy → Infura → QuickNode)
- ✅ Database-driven pricing with temporal queries
- ✅ Custodial + non-custodial wallet support (AES-256-GCM encryption)

### Pricing Matrix

| Method | Free Tier | Basic Tier | Pro Tier |
|--------|-----------|------------|----------|
| `geo.audit.request` | $0.00 | $0.10 | $0.00 |
| `causal_citation_trace` | $0.00 | $0.50 | $0.25 |
| `a2a.discover` | $0.00 | $0.00 | $0.00 |

### Payment Flow Example

```bash
# 1. Agent requests audit (no payment)
curl -X POST https://anoteroslogos.com/api/a2a \
  -H "Authorization: Bearer sk_basic_..." \
  -d '{"method":"geo.audit.request","params":{"url":"https://example.com"}}'

# Response: HTTP 402 Payment Required
{
  "invoiceId": "inv_01JDKP5R2G4M8QYX3WTNZHF9V7",
  "amount": 0.10,
  "token": "USDC",
  "recipientAddress": "0x...",
  "expiresAt": "2025-11-21T17:00:00Z"
}

# 2. Agent pays 0.10 USDC on Base L2
# (gets tx_hash: 0xabc...)

# 3. Agent retries with tx_hash
curl -X POST https://anoteroslogos.com/api/a2a \
  -H "Authorization: Bearer sk_basic_..." \
  -d '{"method":"geo.audit.request","params":{"url":"https://example.com","tx_hash":"0xabc..."}}'

# Response: HTTP 200 OK with audit results
```

### Auto-Detection Algorithm

Blockchain watcher scans Base L2 for USDC transfers:
- **Recipient match:** 50 points
- **Amount match:** 30 points (±0.01 USDC tolerance)
- **Token match:** 10 points
- **Recency bonus:** 10 points (<5 min)
- **Confidence threshold:** 60% minimum

### Database Tables

**Core Tables:**
- `a2a_wallets` - EVM wallet storage (custodial/non-custodial)
- `a2a_invoices` - Invoice lifecycle tracking
- `a2a_ledger` - Double-entry bookkeeping (append-only)
- `a2a_chain_watchers` - Blockchain scanning state
- `a2a_pricing` - Database-driven pricing
- `a2a_payment_detections` - Auto-detection audit log

### Security Features

1. **Idempotency:** UNIQUE constraint on (tx_hash, user_id)
2. **Race Conditions:** PostgreSQL `SELECT FOR UPDATE` in atomic functions
3. **Reorg Protection:** Daily cron re-verifies invoices with <12 confirmations
4. **Wallet Encryption:** AES-256-GCM with `WALLET_ENCRYPTION_KEY` env var
5. **Params Integrity:** SHA3-512 hash prevents request tampering

### Documentation

- **API Reference:** `lib/payments/README.md` (659 lines)
- **Deployment Guide:** `lib/payments/DEPLOYMENT_GUIDE.md` (610 lines)
- **Integration Summary:** `lib/payments/INTEGRATION_SUMMARY.md` (666 lines)
- **Example Client:** `examples/agent-client.ts` (252 lines)

### Limitations (Vercel Hobby Plan)

⚠️ **Cron Jobs:** Hobby plan supports **daily cron only** (not every 5 minutes)
- Current: Reorg monitor runs daily at midnight UTC
- Recommended: Use external cron service (cron-job.org) or upgrade to Vercel Pro

**Environment Variables (Required):**
```bash
PLATFORM_WALLET_ADDRESS=0x...  # Base L2 wallet receiving USDC
WALLET_ENCRYPTION_KEY=...      # 64-char hex (32 bytes)
CRON_SECRET=...                # Vercel cron authentication
```

---

## 🤖 A2A Protocol - Agent-to-Agent API

Production-ready **JSON-RPC 2.0** API for AI agent integration with Ed25519 signatures, WebSocket streaming, and Supabase persistence.

### Key Features

- **16 Core Components** (10,464 lines total)
- **Rate Limiting:** Token bucket with burst support
- **Authentication:** Agent Registry with trust scoring (0-100)
- **Caching:** ETag-based HTTP 304 responses
- **Real-Time:** WebSocket streaming for audit progress
- **Persistence:** Supabase PostgreSQL with 7 tables
- **Cryptography:** Ed25519 signatures (RFC 9421) for domain proof

### API Methods

**Discovery:**
- `a2a.discover` - Service metadata
- `a2a.capabilities` - API documentation
- `a2a.ping` - Health check

**GEO Audit:**
- `geo.audit.request` - Single URL audit (⚡ requires payment)
- `geo.audit.batch` - Batch audit (max 100 URLs)

### Rate Limits

| Tier | Req/Min | Req/Hour | Price |
|------|---------|----------|-------|
| Free | 10 | 100 | $0 |
| Basic | 60 | 1,000 | $99/mo |
| Pro | 300 | 10,000 | $299/mo |
| Enterprise | 1,000 | 50,000 | Custom |

### AI Agent Detection

Automatic optimization for:
- Perplexity AI (search with citations)
- ChatGPT (conversational)
- Claude (analysis focus)
- Google Gemini (multimodal)
- Grok (real-time data)

---

## 🔐 AID Protocol - Agent Identity & Discovery

DNS-first approach for making AI agents discoverable. One TXT record = instant global discovery.

### Implementation

**1. DNS TXT Record** (`_agent.anoteroslogos.com`)
```
v=1.1;p=a2a,http;u=https://anoteroslogos.com/api/a2a;s=geoaudit
```

**2. Well-Known Discovery** (`/.well-known/agent.json`)
- Agent capabilities enumeration
- Protocol version information
- Ed25519 key metadata

**3. Documentation** (`/agent-identity` page)

### Market Context

- **Adoption:** 5,000+ domains (3 months post-v1.0)
- **Standards:** IETF RFC discussion (expected 2026)
- **Specification:** agentcommunity.org v1.1 (October 2025)

---

## 🧪 MCP Sandbox v2 - Universal Tool Platform

Enterprise-grade **Model Context Protocol** implementation with cryptographic signatures and universal schema generation.

### Core Components

- **Enterprise Sandbox:** isolated-vm execution (no unsafe eval)
- **Universal Schemas:** 7 graph tools with multi-platform support
- **Ed25519 Signatures:** RFC 9421 for request authentication
- **Memory Limits:** 256MB heap, 2s CPU timeout
- **Real-Time Streaming:** Server-Sent Events (SSE)

### Tool Catalog

1. `auditSite` - Full GEO audit
2. `getGraph` - Knowledge graph retrieval
3. `predictCitation` - ML-based prediction
4. `trackCitation` - Citation monitoring
5. `learnFromCitations` - Feedback loop
6. `discoverAgent` - AID protocol detection
7. `syncPlatforms` - Real-time platform sync

---

## 📊 Knowledge Graph Engine

Self-improving knowledge graph with citation learning and cross-client network effects.

### Features

- **Bidirectional Learning:** AI ↔ Platform intelligence exchange
- **Real-Time Sync:** <60s to Perplexity, ChatGPT, Claude, Gemini
- **Network Effects:** Cross-client authority amplification
- **ML Prediction:** Citation probability scoring
- **ROI Tracking:** Citation value measurement

### Components

- `knowledgeGraph/builder.ts` (618 lines)
- `knowledgeGraph/selfImproving.ts` (656 lines)
- `knowledgeGraph/realtimeSync.ts` (551 lines)
- `knowledgeGraph/networkEffects.ts` (463 lines)
- `citationPrediction/engine.ts` (765 lines)
- `citationLearning/feedbackEngine.ts` (705 lines)

---

## 🚀 Deployment

### Vercel (Current Production)

**Configuration:**
- **Framework:** Vite
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Node Version:** 20.x
- **Auto-Deploy:** Enabled on `main` branch

**Manual Deploy:**
```bash
vercel --prod
```

### Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...

# APA Payments (NEW)
PLATFORM_WALLET_ADDRESS=0x...
WALLET_ENCRYPTION_KEY=...
CRON_SECRET=...

# AI Integration
VITE_OPENROUTER_API_KEY=...
VITE_OPENROUTER_MODEL=minimax/minimax-m2:free

# Site Configuration
VITE_SITE_URL=https://anoteroslogos.com
VITE_APP_URL=https://anoteroslogos.com
```

### Database Migrations

```bash
# Apply APA migrations
psql $DATABASE_URL < supabase/migrations/004_apa_payments_schema.sql
psql $DATABASE_URL < supabase/migrations/005_pricing_matrix_table.sql
psql $DATABASE_URL < supabase/migrations/006_payment_correlation_index.sql
```

---

## 📈 SEO & AI Optimization

**Schema.org Types:** Organization, Person, Article, Product, Review, HowTo, FAQ, SoftwareApplication

**AI Crawlers Supported (20+):**
- GPTBot, Claude-Web, ClaudeBot
- Perplexity, Google-Extended, Gemini
- Anthropic-AI, Cohere-AI, Diffbot
- [+12 more]

**Zero-Competition Keywords:**
- Knowledge Graph Engine for GEO
- AI knowledge infrastructure
- Direct LLM integration
- Citation intelligence platform
- Agent-Pay-Agent micropayments
- Base L2 USDC payments for AI

**Positioning:** Platform/Infrastructure (not agency)

---

## 🔧 Troubleshooting

### Build Errors
```bash
rm -rf node_modules dist .vite
npm install
npm run build
```

### TypeScript Errors
```bash
npm run typecheck
npm install typescript@latest
```

### Deployment Issues
```bash
vercel logs
vercel --force
```

### APA Payment Issues

**Invoice not detected:**
1. Check Vercel Cron logs (daily at midnight UTC)
2. Verify tx is on Base mainnet (not testnet)
3. Wait for 2 confirmations (~4-6 seconds)

**Environment variable missing:**
```bash
vercel env add PLATFORM_WALLET_ADDRESS production
```

---

## 📚 Documentation

**Core Documentation:**
- **APA Payments:** `lib/payments/README.md` (659 lines)
- **APA Deployment:** `lib/payments/DEPLOYMENT_GUIDE.md` (610 lines)
- **APA Integration:** `lib/payments/INTEGRATION_SUMMARY.md` (666 lines)
- **Knowledge Graph:** `KNOWLEDGE_GRAPH_ENGINE.md` (450 lines)
- **Citation Learning:** `CITATION_LEARNING_ENGINE.md` (417 lines)
- **Gold Standard:** `GOLD_STANDARD_INNOVATIONS.md` (417 lines)

**Example Implementations:**
- **AI Agent Client:** `examples/agent-client.ts` (252 lines)
- **Ed25519 Key Manager:** `scripts/ed25519KeyManager.ts` (398 lines)

---

## 📊 Project Statistics

**Codebase Size:**
- **Total Files:** 189
- **Total Lines:** 60,189
- **Languages:** TypeScript 94.9%, PLpgSQL 3.9%

**Major Components:**
- A2A Protocol: 10,464 lines
- APA Payments: 4,700 lines
- Causal Tracer: 4,020 lines
- MCP Sandbox: 1,659 lines
- Knowledge Graph: 2,288 lines
- Components: 33 React components

**Performance:**
- Bundle: 1.6 MB (~445 KB gzipped)
- Build: 12-15s
- LCP: <2.5s | CLS: <0.1 | INP: <200ms

---

## 🎯 Roadmap

**Phase 1 - Core Platform** ✅
- GEO Audit Engine
- A2A Protocol
- AID Discovery
- MCP Sandbox v2

**Phase 2 - Payments** ✅ (November 2025)
- Agent-Pay-Agent (APA) micropayments
- Base L2 USDC integration
- Auto-payment detection
- Database-driven pricing

**Phase 3 - Advanced Features** (Q1 2026)
- ETH payment support (Chainlink oracle)
- Webhooks for payment notifications
- Multi-chain support (Optimism, Arbitrum)
- Advanced analytics dashboard

**Phase 4 - Scale** (Q2 2026)
- Distributed tracing (OpenTelemetry)
- Monitoring (Sentry integration)
- API key management UI
- Developer portal

---

## 📄 License

Proprietary - All rights reserved.

---

## 🔗 Links

- **Production:** https://anoteroslogos.com
- **GitHub:** https://github.com/DelovoyMotiv/anteroslogos
- **Documentation:** https://anoteroslogos.com/docs
- **AID Protocol:** https://agentcommunity.org

---

**Last Updated:** November 21, 2025  
**Version:** 3.0.0  
**Build Status:** ✅ Passing
