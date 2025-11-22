# Anóteros Lógos - Enterprise AI Knowledge Infrastructure

![License](https://img.shields.io/badge/License-Proprietary-red)
![Version](https://img.shields.io/badge/version-3.1.0-blue)
![Node](https://img.shields.io/badge/node-20.x-green)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue)
![React](https://img.shields.io/badge/React-19.2-cyan)
![Build](https://img.shields.io/badge/build-passing-brightgreen)

Enterprise-grade AI knowledge infrastructure platform providing cryptographically verifiable provenance, deterministic execution, and **Agent-Pay-Agent (APA) micropayments layer.** First production implementation of USDC-based micropayments for autonomous AI agent interactions on Base L2 blockchain.

Production URL: https://anoteroslogos.com  
Codebase: 173 files | 60,867 lines

---

## Overview

Enterprise platform for optimizing digital content and brand presence for AI language models. Combines real-time audit capabilities, knowledge graph extraction, citation learning, competitive intelligence, and blockchain-based micropayments for autonomous agents.

**System Architecture:**

1. **GEO Audit Engine** - Real-time website analysis for AI visibility across Perplexity, ChatGPT, Claude, Gemini
2. **Knowledge Graph Engine** - Self-improving semantic graph with citation learning and cross-platform syndication
3. **Causal Citation Tracer** - Counterfactual reasoning for ROI attribution and path optimization
4. **Agent-to-Agent Protocol** - JSON-RPC 2.0 API with Ed25519 signatures and WebSocket streaming
5. **Agent-Pay-Agent Layer** - USDC micropayments on Base L2 with automatic detection
6. **Agent Mesh Network** - Distributed peer discovery, capability routing, trust propagation via DHT
7. **MCP Integration** - Model Context Protocol v2.0 with isolated execution sandbox
8. **Content Intelligence** - NLP analysis, query intent classification, competitive monitoring
9. **Gold Standard System** - Citation prediction, learning feedback, network effects amplification

---

## Core Modules

### 1. GEO Audit System (2,131 lines)

Real-time website analysis for generative engine visibility.

**Capabilities:**
- Multi-platform analysis (Perplexity, ChatGPT, Claude, Gemini, Google AI Overviews)
- Semantic structure evaluation (Schema.org, JSON-LD, RDFa, Microdata)
- Content depth scoring (E-E-A-T, factual claims, data points, expert quotes)
- Citation probability prediction per platform
- Technical optimization checks (Core Web Vitals, mobile optimization, internationalization)
- Security audit (HTTPS, CSP, HSTS, certificate validation)

**Analysis Depth Modes:**
- Quick (30s): Core metrics, schema validation, technical basics
- Standard (60s): Full semantic analysis, content scoring, platform-specific optimization
- Deep (120s): Citation prediction, competitive positioning, knowledge graph extraction

**Output:**
- Overall GEO Score (0-100)
- Grade classification (Beginner → Novice → Intermediate → Advanced → Expert)
- Category breakdown (Content, Technical, Authority, Citations, User Experience)
- Actionable recommendations with priority levels
- Platform-specific insights
- PDF report generation

**Files:**
- `utils/geoAuditEnhanced.ts` - Main audit engine (2,131 lines)
- `utils/geoAudit.ts` - Legacy audit logic (578 lines)
- `utils/advancedMetrics.ts` - Scoring algorithms (643 lines)
- `utils/advancedAnalytics.ts` - Trend analysis (360 lines)

### 2. Knowledge Graph Engine (2,376 lines)

Self-improving semantic graph with bidirectional learning.

**Capabilities:**
- Entity extraction from web pages (organizations, people, products, concepts)
- Relationship mapping (hierarchical, associative, causal)
- Citation link tracking
- Cross-platform authority propagation
- Real-time syndication (<60s to Perplexity, ChatGPT, Claude, Gemini)
- Network effects amplification across clients
- Self-improvement through citation feedback

**Components:**
- `utils/knowledgeGraph/builder.ts` - Graph extraction (736 lines)
- `utils/knowledgeGraph/selfImproving.ts` - Learning loop (646 lines)
- `utils/knowledgeGraph/realtimeSync.ts` - Platform syndication (541 lines)
- `utils/knowledgeGraph/networkEffects.ts` - Authority amplification (453 lines)

**Algorithms:**
- Entity recognition using NLP and Schema.org parsing
- Claim extraction with confidence scoring
- Citation path traversal (BFS/DFS hybrid)
- Authority score calculation with PageRank-inspired damping
- Temporal graph evolution tracking

### 3. Causal Citation Tracer (4,020 lines)

Counterfactual reasoning engine for ROI attribution.

**Capabilities:**
- Citation path discovery (BFS/DFS + A* heuristic)
- Counterfactual simulation (graph cloning with node removal)
- Platform-specific decision emulation (Perplexity, ChatGPT, Claude, Gemini)
- ROI calculation per content modification
- Visibility impact prediction
- Optimization prioritization

**Components:**
- `lib/causalTracer/pathFinder.ts` - Path discovery (506 lines)
- `lib/causalTracer/counterfactualSimulator.ts` - ROI calculation (568 lines)
- `lib/causalTracer/llmDecisionEmulator.ts` - Platform scoring (565 lines)
- `lib/causalTracer/engine.ts` - Orchestration (785 lines)

**Algorithms:**
- Hybrid BFS/DFS with A* heuristic for path optimization
- Deep graph cloning for counterfactual analysis
- Platform-specific scoring models (authority weight, recency decay, relevance)
- Impact quantification via differential analysis

### 4. Citation Intelligence (1,923 lines)

ML-based prediction, tracking, and learning systems.

**Capabilities:**
- **Citation Prediction** - Probability scoring per platform (Perplexity 0.87, ChatGPT 0.73, etc.)
- **Citation Tracking** - Real-time detection across AI platforms with screenshot proof
- **Learning Feedback** - Bidirectional intelligence exchange (AI → Platform → AI)
- **ROI Measurement** - Monetary value attribution per citation

**Components:**
- `utils/citationPrediction/engine.ts` - ML prediction (752 lines)
- `utils/citationProof/tracker.ts` - Citation monitoring (560 lines)
- `utils/citationLearning/feedbackEngine.ts` - Bidirectional learning (611 lines)

**Machine Learning:**
- Feature engineering (graph metrics, content quality, authority signals)
- Ensemble model (weighted combination of classifiers)
- Confidence intervals and prediction uncertainty
- Continuous model retraining from citation feedback

### 5. Content Intelligence (2,210 lines)

NLP analysis, competitive monitoring, query intent classification.

**Capabilities:**
- **NLP Analysis** - Entity extraction, sentiment analysis, readability scoring, semantic density
- **Query Intent** - ML classification (navigational, informational, transactional, commercial)
- **Competitive Intelligence** - Real-time monitoring of competitor citations in AI responses
- **Content Gap Detection** - Opportunity identification via query coverage analysis

**Components:**
- `utils/nlpContentAnalysis.ts` - NLP processing (506 lines)
- `utils/queryIntent/analyzer.ts` - Intent classification (808 lines)
- `utils/competitiveIntelligence.ts` - Competitor monitoring (595 lines)
- `utils/contentGap/detector.ts` - Gap analysis (726 lines)

**Algorithms:**
- TF-IDF for semantic density
- Named Entity Recognition (NER)
- Sentiment analysis via lexicon-based approach
- Query intent classification using feature extraction
- Competitive positioning via citation frequency analysis

### 6. A2A Protocol (10,464 lines)

JSON-RPC 2.0 API for agent-to-agent communication.

**Capabilities:**
- **Authentication** - Agent Registry with trust scoring (0-100)
- **Rate Limiting** - Token bucket per tier (10-1,000 req/min)
- **Caching** - ETag-based HTTP 304 with 1h TTL
- **Streaming** - WebSocket for real-time audit progress
- **Signatures** - Ed25519 per RFC 9421 for domain verification
- **Persistence** - Supabase PostgreSQL with 7 tables

**API Methods:**
```
a2a.discover           Service metadata and capabilities
a2a.capabilities       Full API documentation
geo.audit.request      Single URL audit (requires payment)
geo.audit.batch        Parallel processing (max 100 URLs)
a2a.ping               Health check
a2a.status             System status
a2a.mesh.discover      Find peers by capability
a2a.mesh.announce      Broadcast capabilities to mesh
a2a.mesh.sync          Sync knowledge graph/models
a2a.mesh.health        Mesh network statistics
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

**Components:**
- `lib/a2a/protocol.ts` - JSON-RPC 2.0 (526 lines)
- `lib/a2a/agentRegistry.ts` - Agent management (442 lines)
- `lib/a2a/rateLimiter.ts` - Token bucket (264 lines)
- `lib/a2a/ed25519Signatures.ts` - RFC 9421 (705 lines)
- `lib/a2a/websocketServer.ts` - Real-time streaming (568 lines)
- `lib/a2a/supabaseStorage.ts` - Persistence (668 lines)

### 7. APA Micropayments (4,700 lines)

USDC-based payments on Base L2 for autonomous agents.

**Capabilities:**
- ULID-based invoice generation
- Pay-per-request and pre-deposit modes
- Automatic payment detection via blockchain scanning
- Double-entry bookkeeping (append-only ledger)
- Reorg protection (<12 confirmations re-verified daily)
- RPC failover (Base → Alchemy → Infura → QuickNode)
- Database-driven pricing with temporal queries

**Payment Flow:**
```
1. Request → HTTP 402 with invoice
2. Agent pays USDC on Base L2
3. Retry with tx_hash
4. Receive HTTP 200 with results
```

**Database Schema:**
- `a2a_wallets` - EVM storage (AES-256-GCM encrypted)
- `a2a_invoices` - ULID-based tracking
- `a2a_ledger` - Double-entry bookkeeping
- `a2a_chain_watchers` - Blockchain scan state
- `a2a_pricing` - Temporal pricing
- `a2a_payment_detections` - Auto-detection log

**Components:**
- `lib/payments/wallet.ts` - Custodial/non-custodial (582 lines)
- `lib/payments/invoice.ts` - Invoice system (667 lines)
- `lib/payments/ledger.ts` - Bookkeeping (467 lines)
- `lib/payments/chainWatcher.ts` - Payment detection (528 lines)
- `lib/payments/paymentGuard.ts` - Enforcement (467 lines)
- `lib/payments/reorgMonitor.ts` - Reorg protection (363 lines)
- `lib/payments/rpcProvider.ts` - RPC failover (363 lines)

### 8. MCP Integration (1,659 lines)

Model Context Protocol v2.0 with isolated execution.

**Capabilities:**
- isolated-vm sandbox (256MB heap, 2s timeout)
- Ed25519 signature verification
- Universal tool schemas (OpenAI/Claude/Grok formats)
- Real-time streaming via SSE
- Memory leak prevention
- Billing hooks

**Tool Catalog:**
```
auditSite              Full GEO audit
getGraph               Knowledge graph extraction
predictCitation        ML-based probability
trackCitation          Citation monitoring
learnFromCitations     Feedback loop
discoverAgent          AID protocol detection
syncPlatforms          Real-time syndication
```

**Components:**
- `lib/mcp/sandbox.ts` - Enterprise sandbox (507 lines)
- `lib/mcp/schemas.ts` - Universal schemas (528 lines)
- `api/mcp/route.ts` - Unified endpoint (624 lines)

### 9. Gold Standard System (1,832 lines)

Production persistence, automation, and backend services.

**Capabilities:**
- Supabase persistence adapter
- Job scheduling (cron, delayed, recurring)
- Backend utilities (monitoring, webhooks, queue processing)
- Real-time competitive monitoring
- Citation prediction persistence
- Learning analysis storage

**Components:**
- `utils/goldStandard/persistence.ts` - Supabase adapter (387 lines)
- `utils/automation/scheduler.ts` - Job scheduling (284 lines)
- `utils/backend/auditStorage.ts` - Audit persistence (465 lines)
- `utils/competitiveIntelligence/realTimeMonitor.ts` - Monitoring (676 lines)

### 10. Agent Mesh Network (5,513 lines)

Decentralized peer-to-peer infrastructure for autonomous agent communication.

**Capabilities:**
- Distributed Hash Table with Kademlia-inspired k-bucket routing
- Capability-based routing with trust score propagation
- Multi-hop pathfinding with cost optimization
- Real-time health monitoring with jitter and packet loss tracking
- CBOR message compression achieving 30-50% size reduction
- Circuit breaker pattern for unreliable peers
- Supabase persistence with reputation history

**DHT Features:**
- 160-bit node IDs via SHA-1 hashing
- XOR distance metric with BigInt precision
- Automatic peer eviction using LRU policy
- Bucket refresh protocol every 24 hours
- Support for 1000+ agents in mesh network

**Routing Algorithms:**
- Dijkstra pathfinding with constraint satisfaction
- Weighted round-robin load balancing
- Path caching with 5-minute TTL
- QoS scoring based on trust, capability, RTT, and cost
- Multi-hop routing with up to 3 hops

**Health Monitor:**
- RTT measurement with exponential moving average
- Jitter calculation using standard deviation
- Health scoring from 0-100 with 4 states
- Periodic checks every 24 hours aligned with Vercel CRON

**Discovery Service:**
- DNS TXT record discovery for agent identities
- HTTPS well-known endpoint fallback
- Bootstrap node support
- Capability broadcasting to mesh

**Components:**
- `lib/mesh/dht.ts` - Distributed hash table (588 lines)
- `lib/mesh/network.ts` - Mesh router with circuit breaker (800 lines)
- `lib/mesh/routing.ts` - Advanced routing algorithms (561 lines)
- `lib/mesh/healthMonitor.ts` - Peer health tracking (572 lines)
- `lib/mesh/compression.ts` - CBOR encoding per RFC 8949 (626 lines)
- `lib/mesh/discovery.ts` - Peer discovery service (488 lines)
- `lib/mesh/peerStorage.ts` - Supabase persistence (656 lines)

### 11. Frontend Application (33 components)

React 19 SPA with route-based code splitting.

**Pages:**
- HomePage - Platform positioning with GEO knowledge base
- GeoAuditPage - SaaS audit interface (1,950+ lines)
- AgentIdentityPage - AID protocol documentation (750+ lines)
- InvestorRelationsPage - Infrastructure thesis (660 lines)
- KnowledgeBasePage - GEO terminology and concepts
- Dashboard - User portal (API keys, billing, usage, settings)
- Blog - Content marketing

**Key Components:**
- `components/AIVisibilityScore.tsx` - Citation probability (253 lines)
- `components/KnowledgeGraphDashboard.tsx` - Graph visualization (356 lines)
- `components/CitationLearningDashboard.tsx` - Learning UI (420 lines)
- `components/TracerViz.tsx` - Causal graph visualization (630 lines)
- `components/GEOHealthTracker.tsx` - Daily monitoring (398 lines)

---

## Technical Stack

**Runtime:**
- Node.js 20.x
- TypeScript 5.8 (strict mode)
- React 19.2
- Vite 6.2

**Backend:**
- Vercel Serverless Functions
- Supabase (PostgreSQL + Auth)
- Redis (optional distributed caching)
- Base L2 blockchain

**AI Integration:**
- OpenRouter API
- OpenAI, Anthropic Claude, Perplexity, Google Gemini
- Model Context Protocol v2.0

**Security:**
- Ed25519 signatures (RFC 9421)
- AES-256-GCM encryption
- TLS 1.3
- WCAG 2.1 AA compliance

**Data Processing:**
- Recharts (visualization)
- jsPDF (report generation)
- Sharp (image processing)
- html2canvas (screenshots)
- Zod (runtime validation)

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

# Stripe (optional)
STRIPE_SECRET_KEY=...
```

**Database Migrations:**
```bash
psql $DATABASE_URL < supabase/migrations/001_initial_schema.sql
psql $DATABASE_URL < supabase/migrations/002_gold_standard_schema.sql
psql $DATABASE_URL < supabase/migrations/003_auth_schema.sql
psql $DATABASE_URL < supabase/migrations/004_apa_payments_schema.sql
psql $DATABASE_URL < supabase/migrations/005_pricing_matrix_table.sql
psql $DATABASE_URL < supabase/migrations/006_payment_correlation_index.sql
```

---

## API Integration

**Endpoint:** `POST https://anoteroslogos.com/api/a2a`

**Authentication:** Bearer token format: `sk_{tier}_{32_chars}`

**Example Request:**
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
# 1. HTTP 402 response with invoice
# 2. Send 0.10 USDC to recipientAddress on Base L2
# 3. Retry with tx_hash in params
# 4. HTTP 200 with audit results
```

**Rate Limits:**
```
Free:       10 req/min   | 100 req/hour
Basic:      60 req/min   | 1,000 req/hour
Pro:        300 req/min  | 10,000 req/hour
Enterprise: 1,000 req/min| 50,000 req/hour
```

---

## Project Structure

```
api/
  a2a/index.ts                    # A2A Protocol (545 lines)
  mcp/route.ts                    # MCP Sandbox (624 lines)
  goldStandard.ts                 # Gold Standard API (344 lines)
  stripe.ts                       # Stripe integration (178 lines)
  agent-keys.ts                   # Agent key management
  cron/reorg-monitor/             # Blockchain reorg monitoring

lib/
  payments/                       # APA Layer (4,700 lines)
  a2a/                            # A2A Protocol (10,464 lines)
  mesh/                           # Agent Mesh Network (5,513 lines)
  causalTracer/                   # Citation Tracer (4,020 lines)
  mcp/                            # MCP Sandbox (1,659 lines)
  aiSyndication/                  # Platform sync (558 lines)
  nlu/                            # NLU Foundation (1,130 lines)

utils/
  geoAuditEnhanced.ts            # Audit engine (2,131 lines)
  knowledgeGraph/                 # KG engine (2,376 lines)
  citationPrediction/             # ML prediction (752 lines)
  citationProof/                  # Citation tracking (560 lines)
  citationLearning/               # Feedback loop (611 lines)
  queryIntent/                    # Intent classification (808 lines)
  contentGap/                     # Gap detection (726 lines)
  competitiveIntelligence/        # Monitoring (676 lines)
  nlpContentAnalysis.ts          # NLP processing (506 lines)
  advancedMetrics.ts             # Scoring (643 lines)
  monitoringAlerts.ts            # Alert system (521 lines)
  pdfReportGenerator.ts          # PDF export (390 lines)

components/
  AIVisibilityScore.tsx          # Citation probability (253 lines)
  KnowledgeGraphDashboard.tsx    # Graph viz (356 lines)
  CitationLearningDashboard.tsx  # Learning UI (420 lines)
  TracerViz.tsx                  # Causal graph (630 lines)
  GEOHealthTracker.tsx           # Daily monitoring (398 lines)
  [28 more components]

pages/
  HomePage.tsx                   # Platform homepage
  GeoAuditPage.tsx              # Audit interface (1,950+ lines)
  AgentIdentityPage.tsx         # AID protocol (750+ lines)
  InvestorRelationsPage.tsx     # Infrastructure thesis (660 lines)
  KnowledgeBasePage.tsx         # GEO knowledge base
  Dashboard/                    # User portal (6 pages)

data/
  geoKnowledgeBase.ts           # GEO terminology (150+ terms)
  blogPosts.ts                  # Content marketing

supabase/migrations/
  001-006                       # Database schema (6 migrations)
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
- Quick audit: 30s
- Standard audit: 60s
- Deep audit: 120s
- Payment detection: <60s from confirmation
- Knowledge graph sync: <60s to all platforms

---

## Documentation

**Core:**
- `lib/payments/README.md` - APA reference (659 lines)
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

## Statistics

**Codebase:**
- Total files: 173
- Total lines: 60,867
- TypeScript: 95.1%
- PLpgSQL: 3.8%

**Modules:**
- A2A Protocol: 10,464 lines
- Agent Mesh Network: 5,513 lines
- APA Payments: 4,700 lines
- Causal Tracer: 4,020 lines
- Knowledge Graph: 2,376 lines
- Content Intelligence: 2,210 lines
- GEO Audit: 2,131 lines
- Citation Intelligence: 1,923 lines
- Gold Standard: 1,832 lines
- MCP Sandbox: 1,659 lines
- NLU Foundation: 1,130 lines
- Frontend: 33 components

---

## License

Proprietary - All rights reserved

---

Last Updated: November 22, 2025  
Version: 3.1.0
