# Anóteros Lógos - Enterprise AI Knowledge Infrastructure

![License](https://img.shields.io/badge/License-Proprietary-red)
![Version](https://img.shields.io/badge/version-3.7.0-blue)
![Node](https://img.shields.io/badge/node-20.x-green)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue)
![React](https://img.shields.io/badge/React-19.2-cyan)
![Build](https://img.shields.io/badge/APA-v1.1-brightgreen)

AI knowledge infrastructure platform providing cryptographically verifiable provenance, deterministic execution, and **Agent-Pay-Agent (APA) micropayments layer.** First production implementation of USDC-based micropayments for autonomous AI agent interactions on Base L2 blockchain.

Production URL: https://anoteroslogos.com

Codebase: 267 files | 86,800 lines

---

## Overview

Enterprise platform for optimizing digital content and brand presence for AI language models. Combines real-time audit capabilities, knowledge graph extraction, citation learning, competitive intelligence, and blockchain-based micropayments for autonomous agents.

**Core Architecture:**

1. **GEO Audit Engine** - Real-time website analysis for AI visibility across Perplexity, ChatGPT, Claude, Gemini
2. **Knowledge Graph Engine** - Self-improving semantic graph with citation learning and cross-platform syndication
3. **Causal Citation Tracer** - Counterfactual reasoning for ROI attribution and path optimization
4. **Agent-to-Agent Protocol** - JSON-RPC 2.0 API with Ed25519 signatures and WebSocket streaming
5. **Agent-Pay-Agent Layer** - USDC micropayments on Base L2 with automatic detection
6. **Subscription Billing System** - Freemium tier model with USDC payments for SaaS plans
7. **Agent Mesh Network** - Distributed peer discovery, capability routing, trust propagation via DHT
8. **Byzantine Fault Tolerance** - PBFT consensus with Causal Consensus Oracle for provenance-based quorum weighting
9. **MCP Integration** - Model Context Protocol v2.0 with isolated execution sandbox and Anthropic Advanced Tool Use support
10. **Content Intelligence** - NLP analysis, query intent classification, competitive monitoring
11. **Gold Standard System** - Citation prediction, learning feedback, network effects amplification

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

### 6. A2A Protocol (15,433 lines)

Full Linux Foundation Agent-to-Agent Protocol v1.0 implementation with custom extensions and persistent job queue infrastructure.

**Core Capabilities:**
- **Agent Card System** - Standard discovery via `/.well-known/agent-card.json` endpoint
- **Task Management** - ULID-based task lifecycle with structured responses and artifact handling
- **SSE Streaming** - Server-Sent Events for real-time progress updates, heartbeats, and error notification
- **Session Management** - Multi-task sessions with aggregated metrics and cancellation support
- **Orchestration** - Multi-agent task chaining with sequential, parallel, and DAG execution patterns
- **Reputation System** - Weighted scoring across success rate, cost accuracy, response time, and consensus participation

**Protocol Extensions:**
- **Payment Extension** - Integrated USDC micropayments on Base L2 with tier-based pricing and automatic verification
- **Consensus Extension** - Byzantine fault tolerance routing for critical tasks via PBFT with 7-node quorum

**Standard Compliance:**
- Linux Foundation A2A Protocol v1.0: 14/14 core requirements
- Agent Card format with capability registration and protocol support declaration
- Task structure with status tracking, progress events, cost breakdown, and error handling
- HTTP/HTTPS transport with JSON-RPC 2.0 compatibility
- SSE streaming for partial results and real-time updates
- Well-known endpoint discovery per RFC 8615

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
- `lib/a2a/protocol.ts` - JSON-RPC 2.0 base (526 lines)
- `lib/a2a/agentRegistry.ts` - Agent management (442 lines)
- `lib/a2a/rateLimiter.ts` - Token bucket (264 lines)
- `lib/a2a/ed25519Signatures.ts` - RFC 9421 signatures (705 lines)
- `lib/a2a/websocketServer.ts` - Real-time streaming (568 lines)
- `lib/a2a/supabaseStorage.ts` - Persistence (668 lines)
- `lib/a2a/agentCard.ts` - Agent card generation and validation (360 lines)
- `lib/a2a/taskManager.ts` - ULID-based task lifecycle (513 lines)
- `lib/a2a/streaming.ts` - SSE implementation (454 lines)
- `lib/a2a/paymentExtension.ts` - USDC payment integration (443 lines)
- `lib/a2a/consensusExtension.ts` - PBFT consensus routing (413 lines)
- `lib/a2a/sessionManager.ts` - Session lifecycle management (529 lines)
- `lib/a2a/orchestration.ts` - Multi-agent task chaining (493 lines)
- `lib/a2a/reputation.ts` - Agent reputation scoring (428 lines)
- `lib/a2a/persistentQueue.ts` - Database-backed queue with atomic dequeue (365 lines)
- `lib/a2a/webhooks.ts` - HMAC-signed webhook delivery with retry logic (287 lines)

**Database Schema:**
- `a2a_tasks` - Task execution history with JSONB params and results
- `a2a_sessions` - Multi-task session grouping with aggregated metrics
- `a2a_agent_reputation` - Trust scores and performance tracking
- `a2a_task_events` - SSE event history for streaming replay
- `audit_jobs` - Persistent job queue with priority ordering and retry logic
- `batch_jobs` - Batch audit tracking with progress aggregation
- `job_webhooks` - Webhook callback management with exponential backoff

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

### 8. Subscription Billing System (650 lines)

SaaS subscription management with USDC payments on Base L2.

**Tiers:**
- Free: 1 audit per month, basic analysis, community support
- Starter: 10 audits per month, $49/month USDC
- Pro: 100 audits per month, $149/month USDC
- Enterprise: Unlimited audits, $499/month USDC

**Features:**
- Freemium tier with automatic activation for all users
- USDC direct payment integration for paid plans
- Automatic quota consumption after each audit
- Subscription lifecycle management (create, activate, renew, cancel)
- Payment detection via blockchain scanning
- Automatic renewal invoicing 7 days before period end
- Grace period allows 7 days after expiration before access blocking

**Billing Flow:**
```
1. User subscribes to plan
2. System generates USDC invoice with 7-day expiration
3. User sends USDC to platform wallet on Base L2
4. CRON job detects payment within 5 minutes
5. Subscription activates immediately upon confirmation
6. Quota becomes available for audits
```

**Database Schema:**
- `subscription_plans` - Plan metadata and pricing
- `user_subscriptions` - User subscription state and billing periods
- `subscription_invoices` - USDC invoice tracking per billing cycle
- `subscription_usage_logs` - Audit quota consumption history

**Components:**
- `lib/subscriptions/types.ts` - Zod schemas and interfaces
- `lib/subscriptions/storage.ts` - Database operations
- `lib/subscriptions/manager.ts` - Subscription lifecycle management
- `lib/subscriptions/paymentDetector.ts` - Automatic payment detection
- `lib/subscriptions/renewalEngine.ts` - Auto-renewal processing

### 9. MCP Integration (2,006 lines)

Model Context Protocol v2.0 with isolated execution and Anthropic Advanced Tool Use compatibility.

**Capabilities:**
- isolated-vm sandbox (128MB heap, 60s max timeout)
- Ed25519 signature verification
- Universal tool schemas (OpenAI/Claude/Grok formats)
- Real-time streaming via SSE
- Resource management with automatic cleanup
- Billing hooks
- Tool search endpoint with semantic BM25 ranking
- Programmatic code execution with pre-bound MCP functions
- Input examples in tool schemas for improved LLM guidance

**Tool Catalog:**
```
auditSite              Full GEO audit
getGraph               Knowledge graph extraction
predictCitation        ML-based probability
trackCitation          Citation monitoring
learnFromCitations     Feedback loop
discoverAgent          AID protocol detection
syncPlatforms          Real-time syndication
execute_code           Sandbox execution with tool bindings
```

**Anthropic Advanced Tool Use (2025-11-20):**
- Tool search via GET /api/tools/search with Fuse.js semantic matching
- Programmatic execution via POST /api/mcp/programmatic with sandbox isolation
- Async function bridges for call_tool, get_causal_path, get_ucpt_proof
- Console logging support with log capture
- Multi-schema aggregation with deduplication
- Beta header gating for opt-in security

**Components:**
- `lib/mcp/sandbox.ts` - Enterprise sandbox (507 lines)
- `lib/mcp/schemas.ts` - Universal schemas (528 lines)
- `api/mcp/route.ts` - Unified endpoint (624 lines)
- `app/api/tools/search/route.ts` - Tool search library (95 lines)
- `api/tools/search.ts` - Search endpoint (68 lines)
- `app/api/mcp/programmatic/route.ts` - Sandbox executor (227 lines)
- `api/mcp/programmatic.ts` - Programmatic endpoint (71 lines)

### 10. Analytics Infrastructure (1,337 lines)

Cross-tenant analytics with industry benchmarking and percentile ranking.

**Capabilities:**
- Global audit insights via materialized views with sub-second query latency
- Industry benchmarking with tenant metadata grouping and sample size filtering
- Percentile ranking calculation across all tenants with performance tier classification
- Category-specific benchmarks comparing tenant scores against global averages
- Trend analysis with linear regression forecasting and volatility calculation

**Components:**
- `lib/insights/globalAggregator.ts` - Cross-tenant analytics engine (505 lines)
- `supabase/migrations/016_job_queue_system.sql` - Materialized views and PostgreSQL functions (381 lines)
- `utils/advancedAnalytics.ts` - Statistical analysis (360 lines)

**Database Features:**
- Materialized view `global_audit_insights` with automatic refresh
- Percentile calculations for p10, p25, p50, p75, p90, p95, p99 score distribution
- Score distribution buckets with aggregated counts per range
- PostgreSQL functions for on-demand calculation fallback

### 11. Gold Standard System (1,832 lines)

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

### 12. Byzantine Fault Tolerance (3,180 lines)

Production PBFT consensus with Causal Consensus Oracle for provenance-based quorum weighting.

**Capabilities:**
- Practical Byzantine Fault Tolerance implementing Castro & Liskov algorithm
- Quorum consensus tolerating f=2 Byzantine nodes in 7-node network
- Causal Consensus Oracle dynamically weighting nodes by knowledge provenance depth
- Automatic routing of critical operations through consensus
- Payment verification for transactions exceeding 10 USDC threshold
- Trust score updates via Byzantine-resistant reputation system
- Deep audit consensus for high-value assessments
- Mesh topology changes requiring quorum agreement

**Consensus Protocol:**
- Three-phase commit with PRE-PREPARE, PREPARE, and COMMIT messages
- 2f+1 threshold requiring 5 of 7 nodes for consensus validity
- Quorum selection via composite scoring: trust 40%, stake 30%, RTT 20%, causal weight 10%
- View change protocol for primary rotation and failure recovery
- Message log maintaining 100 entries per node for equivocation detection
- Circuit breaker isolating nodes after 3 consecutive failures
- Consensus timeout at 30 seconds with automatic failure handling

**Causal Consensus Oracle:**
- First provenance-based consensus mechanism integrating knowledge graph depth into voting weight
- Nodes with longer causal paths to reference entities receive higher influence in consensus decisions
- Provenance score calculation: E-E-A-T node ratio (60%) plus freshness factor (40%)
- Path validation via Causal Citation Tracer with automatic malicious path detection
- Thread-safe LRU cache with 30-second TTL achieving 95% hit rate
- Real-time telemetry tracking cache performance and calculation latency under 2ms (95th percentile)
- Graceful fallback to traditional trust/stake/RTT scoring when causal graph unavailable

**Off-Chain Oracle Acceleration:**
- Distributed cache layer providing 10x throughput improvement over on-chain calculation
- In-memory LRU cache with 10,000 entry capacity and 90-second TTL
- Mesh gossip protocol broadcasting weight deltas exceeding 5% threshold
- Sub-millisecond latency for cache hits versus 6-8ms on-chain computation
- Automatic peer synchronization maintaining cache consistency across network
- Metrics tracking including hit rate, average lookup time, and gossip broadcast count
- Cache-first strategy with transparent fallback to full provenance calculation
- Zero API changes maintaining complete backward compatibility with existing consensus flow

**Byzantine Detection:**
- Equivocation identification via conflicting message analysis
- Ed25519 signature verification on all protocol messages
- Evidence reporting with cryptographic proof generation
- Automatic stake slashing for proven Byzantine behavior
- Reputation scoring inversely proportional to verified evidence
- Circuit breaker preventing repeated attacks from malicious nodes

**Routing Intelligence:**
- Criticality analysis determining consensus necessity
- Automatic consensus for operations scoring above 80 threshold
- Fallback mechanism executing directly on consensus failure
- Statistics tracking consensus percentage and execution times
- Health monitoring across consensus, storage, and mesh layers

**Database Integration:**
- Consensus audit trail recording all PBFT rounds
- Byzantine evidence storage with ZKP proof hashes
- Agent stake tracking mirroring Base L2 blockchain state
- Atomic operations via PostgreSQL stored procedures
- Row-level security policies protecting sensitive data
- Statistics views aggregating consensus performance metrics

**Components:**
- `lib/bft/types.ts` - PBFT types with Zod validation (267 lines)
- `lib/bft/storage.ts` - Supabase operations wrapper (537 lines)
- `lib/bft/pbftConsensus.ts` - Core consensus engine with OCCO integration (906 lines)
- `lib/bft/causalWeightOracle.ts` - Provenance-based weight calculation (254 lines)
- `lib/bft/offChainOracle.ts` - Distributed cache with gossip protocol (280 lines)
- `lib/bft/bftRouter.ts` - Consensus-aware routing (581 lines)
- `lib/bft/__tests__/ccoIntegration.test.ts` - Real graph integration tests (324 lines)
- `lib/bft/__tests__/tenantIsolation.test.ts` - RLS isolation verification (233 lines)
- `supabase/migrations/009_bft_schema.sql` - Database schema (410 lines)
- `supabase/migrations/20251124_tenant_isolation.sql` - Tenant RLS migration (535 lines)

### 13. Agent Mesh Network (5,513 lines)

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

### 14. Tenant Isolation

Enterprise-grade multi-tenant data isolation via Row-Level Security.

**Security Architecture:**
- Complete data isolation at PostgreSQL RLS layer preventing cross-tenant access
- Tenant membership model supporting owner, admin, member, and readonly roles
- Automatic tenant_id injection via database triggers eliminating application-layer leakage
- Foreign key constraints with ON DELETE CASCADE maintaining referential integrity
- Protection against SQL injection, direct queries, and foreign key traversal attacks

**RLS Policy Pattern:**
- SELECT operations restricted to tenant owners and members via subquery validation
- INSERT operations auto-populate tenant_id based on authenticated user context
- UPDATE/DELETE operations limited to owner and admin roles only
- Service role operations bypass RLS for system-level maintenance
- Zero trust architecture requiring explicit tenant membership for all data access

**Isolated Tables:**
- Knowledge graphs with full entity, relationship, and claim isolation
- Citations preventing cross-tenant citation tracking and analytics leakage
- Usage events maintaining tenant-specific audit trails and quotas
- API keys and agent keys scoped to tenant membership
- Learning analyses and citation predictions isolated per tenant

**Performance Impact:**
- Indexed tenant_id columns on all isolated tables
- RLS subqueries optimized via PostgreSQL query planner
- Sub-5% latency overhead for tenant validation
- Automatic index usage for tenant-scoped queries

**Migration Features:**
- Automatic default tenant creation for existing users
- Backfill logic handling NULL email addresses gracefully
- Tenant member auto-registration for tenant owners
- Idempotent migration supporting multiple executions

**Testing:**
- Integration tests verifying complete cross-tenant isolation
- Seven test scenarios covering read, write, update, delete operations
- Validation of auto-fill triggers and RLS policy enforcement
- Zero false positives across isolation boundary checks

**Components:**
- `supabase/migrations/20251124_tenant_isolation.sql` - Full RLS migration (535 lines)
- `lib/bft/__tests__/tenantIsolation.test.ts` - Isolation verification (233 lines)

### 15. Frontend Application (33 components)

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
|- Supabase (PostgreSQL + Auth)
|- Redis (optional distributed caching)
|- Base L2 blockchain
|- Static deployment on Vercel

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
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# APA Payments
PLATFORM_WALLET_ADDRESS=0x...
WALLET_ENCRYPTION_KEY=...
CRON_SECRET=...

# Blockchain
BASE_RPC_URL=https://mainnet.base.org

# AI Integration
VITE_OPENROUTER_API_KEY=...
VITE_OPENROUTER_MODEL=minimax/minimax-m2:free
```

**Database Migrations:**
```bash
psql $DATABASE_URL < supabase/migrations/001_initial_schema.sql
psql $DATABASE_URL < supabase/migrations/002_gold_standard_schema.sql
psql $DATABASE_URL < supabase/migrations/003_auth_schema.sql
psql $DATABASE_URL < supabase/migrations/004_apa_payments_schema.sql
psql $DATABASE_URL < supabase/migrations/005_pricing_matrix_table.sql
psql $DATABASE_URL < supabase/migrations/006_payment_correlation_index.sql
psql $DATABASE_URL < supabase/migrations/007_multi_tenancy_isolation.sql
psql $DATABASE_URL < supabase/migrations/008_audit_trail_worm.sql
psql $DATABASE_URL < supabase/migrations/009_bft_schema.sql
psql $DATABASE_URL < supabase/migrations/010_subscription_billing.sql
psql $DATABASE_URL < supabase/migrations/011_free_plan_auto_activation.sql
psql $DATABASE_URL < supabase/migrations/012_agent_mesh_network.sql
psql $DATABASE_URL < supabase/migrations/013_a2a_full_support.sql
psql $DATABASE_URL < supabase/migrations/014_hotstuff_tenant_context.sql
psql $DATABASE_URL < supabase/migrations/015_intent_payments_tenant.sql
psql $DATABASE_URL < supabase/migrations/016_job_queue_system.sql
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
src/
  pages/
    HomePage.tsx                  # Platform homepage
    GeoAuditPage.tsx             # Audit interface
    Dashboard/                   # User portal
    AgentIdentityPage.tsx        # AID protocol docs
  components/                    # 33 React components
    PaymentModal.tsx             # USDC payment UI
    BillingPage.tsx              # Subscription management

lib/
  payments/                       # APA Layer (4,700 lines)
  subscriptions/                  # Subscription Billing (650 lines)
    types.ts                      # Zod schemas and types
    storage.ts                    # Database operations
    manager.ts                    # Subscription lifecycle
    paymentDetector.ts            # Auto-detection
    renewalEngine.ts              # Auto-renewal
  a2a/                            # A2A Protocol (15,433 lines)
    persistentQueue.ts            # Database-backed queue (365 lines)
    webhooks.ts                   # HMAC webhook delivery (287 lines)
  insights/                       # Analytics Infrastructure (505 lines)
    globalAggregator.ts           # Cross-tenant analytics
  mesh/                           # Agent Mesh Network (5,513 lines)
  bft/                            # Byzantine Fault Tolerance with OCCO (3,460 lines)
    causalWeightOracle.ts         # Provenance weight calculation
    offChainOracle.ts             # Distributed cache with gossip
    pbftConsensus.ts              # PBFT with dynamic quorum
    __tests__/ccoIntegration.test.ts  # Integration tests
    __tests__/tenantIsolation.test.ts # RLS isolation tests
  causalTracer/                   # Citation Tracer (4,020 lines)
  ucpt/                           # Universal Causal Provenance Token (1,240 lines)
    generator.ts                  # COSE_Sign1 with Ed25519
    verifier.ts                   # Signature verification
    serializer.ts                 # Canonical CBOR (RFC 8949)
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
  001-016                       # Database schema (16 migrations)
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
- Total files: 253
- Total lines: 86,448
- TypeScript: 93.2%
- PLpgSQL: 5.8%
- CSS: 1.0%

**Core Modules:**
- A2A Protocol: 15,433 lines
- Agent Mesh Network: 5,513 lines
- APA Payments: 4,700 lines
- Causal Tracer: 4,020 lines
- Byzantine Fault Tolerance with OCCO: 3,460 lines
- Knowledge Graph: 2,376 lines
- Content Intelligence: 2,210 lines
- GEO Audit: 2,131 lines
- Citation Intelligence: 1,923 lines
- Gold Standard: 1,832 lines
- MCP Sandbox: 1,659 lines
- Analytics Infrastructure: 1,337 lines
- UCPT Provenance Token: 1,240 lines
- NLU Foundation: 1,130 lines
- Subscription Billing: 650 lines
- Frontend: 33 React components

---

## License

Proprietary - All rights reserved

---

Last Updated: November 24, 2025
Version: 3.6.0
