# Anóteros Lógos - Enterprise AI Knowledge Infrastructure

![License](https://img.shields.io/badge/License-Proprietary-red)
![Version](https://img.shields.io/badge/version-4.0.0-blue)
![Node](https://img.shields.io/badge/node-20.x-green)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue)
![React](https://img.shields.io/badge/React-19.2-cyan)
![Build](https://img.shields.io/badge/UAP-v1.0-brightgreen)

AI knowledge infrastructure platform providing cryptographically verifiable provenance, deterministic execution, and **Agent-Pay-Agent (APA) micropayments layer.** First production implementation of USDC-based micropayments for autonomous AI agent interactions on Base L2 blockchain.

Production URL: https://anoteroslogos.com

Codebase: 819 files | 157,573 lines

---

## Overview

Enterprise platform for optimizing digital content and brand presence for AI language models. Combines real-time audit capabilities, knowledge graph extraction, citation learning, competitive intelligence, and blockchain-based micropayments for autonomous agents.

**Core Architecture:**

1. **GEO Audit Engine** - Real-time website analysis for AI visibility across Perplexity, ChatGPT, Claude, Gemini
2. **Knowledge Graph Engine** - Self-improving semantic graph with citation learning and cross-platform syndication
3. **Causal Citation Tracer** - Counterfactual reasoning for ROI attribution and path optimization
4. **Agent-to-Agent Protocol** - JSON-RPC 2.0 API with Ed25519 signatures and WebSocket streaming
5. **Universal Agent Protocol** - UAP v1.0 transport layer with cryptographic trust attestation
6. **Agent-Pay-Agent Layer** - USDC micropayments on Base L2 with automatic detection
7. **Causal Contribution Credits** - Contribution-based economic layer with integrated trust scoring and APA payment discounts
8. **Subscription Billing System** - Freemium tier model with USDC payments for SaaS plans
9. **Agent Mesh Network** - Distributed peer discovery, capability routing, trust propagation via DHT
10. **Byzantine Fault Tolerance** - PBFT consensus with Causal Consensus Oracle for provenance-based quorum weighting
11. **MCP Integration** - Model Context Protocol v2.0 with isolated execution sandbox and Anthropic Advanced Tool Use support
12. **Content Intelligence** - NLP analysis, query intent classification, competitive monitoring
13. **Gold Standard System** - Citation prediction, learning feedback, network effects amplification
14. **TypeScript SDK** - Production-grade client library with resilience patterns and type-safe API integration

### Production Hardening

Enterprise-grade security, performance, and reliability improvements:

**Security:**
- JWT authentication with 15-minute TTL and refresh token rotation
- CSRF protection with token validation on state-changing operations
- Input validation using Zod schemas on all API endpoints
- SQL injection prevention via parameterized queries
- Rate limiting with token bucket algorithm (60 req/min authenticated, 10 req/min anonymous)
- Environment variable validation at startup

**Performance:**
- Database query optimization with N+1 query elimination
- Strategic indexing on high-traffic columns
- Redis caching for hot data with cache invalidation
- Algorithm optimization replacing O(n²) with O(n log n) implementations
- Connection pooling for database efficiency
- CDN integration for static assets

**Reliability:**
- Retry logic with exponential backoff and jitter
- Circuit breakers for external service isolation
- Race condition prevention with optimistic locking
- Health check endpoints for liveness and readiness probes
- Graceful shutdown with connection draining
- Custom error hierarchy with correlation IDs

**Observability:**
- Structured JSON logging with sensitive data masking
- Prometheus metrics export for all API endpoints
- OpenTelemetry distributed tracing with context propagation
- Sentry error tracking with source maps
- Grafana dashboards for operations, security, and business metrics

**Database:**
- Idempotent migrations with IF NOT EXISTS checks
- Rollback scripts for all schema changes
- Foreign key and check constraints for data integrity
- Automated testing for migration idempotency

**Code Quality:**
- Zero hardcoded secrets (environment variables only)
- Comprehensive TypeScript typing (no any types)
- Design pattern implementation (Factory, Builder, Observer)
- Code duplication under 5% threshold
- Property-based testing for core algorithms

---

## Core Modules

### 1. GEO Audit System

Real-time website analysis for generative engine visibility with advanced tabbed interface.

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

**Interface Features:**
- Tabbed navigation with Overview, Analysis, Insights, and Technical views
- Category-by-category detailed analysis with sidebar navigation
- Filterable recommendations by priority, category, and effort level
- Quick wins identification with ROI calculation
- Correlation analysis between metrics
- Mobile-optimized with swipe gestures and touch-friendly controls
- Raw data export in JSON format with syntax highlighting

**Output:**
- Overall GEO Score (0-100 with 3 decimal precision)
- Grade classification (Beginner → Novice → Intermediate → Advanced → Expert → Authority)
- Category breakdown across 11 dimensions
- Actionable recommendations with priority levels and code examples
- Platform-specific insights
- PDF report generation

**Files:**
- `utils/geoAuditEnhanced.ts` - Main audit engine
- `utils/geoAudit.ts` - Legacy audit logic
- `utils/advancedMetrics.ts` - Scoring algorithms
- `utils/advancedAnalytics.ts` - Trend analysis
- `src/pages/dashboard/audit/tabs/` - Tabbed interface components
- `src/pages/dashboard/audit/hooks/` - Navigation and gesture hooks

### 2. Knowledge Graph Engine

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
- `utils/knowledgeGraph/builder.ts` - Graph extraction
- `utils/knowledgeGraph/selfImproving.ts` - Learning loop
- `utils/knowledgeGraph/realtimeSync.ts` - Platform syndication
- `utils/knowledgeGraph/networkEffects.ts` - Authority amplification

**Algorithms:**
- Entity recognition using NLP and Schema.org parsing
- Claim extraction with confidence scoring
- Citation path traversal (BFS/DFS hybrid)
- Authority score calculation with PageRank-inspired damping
- Temporal graph evolution tracking

### 3. Causal Citation Tracer

Counterfactual reasoning engine for ROI attribution.

**Capabilities:**
- Citation path discovery (BFS/DFS + A* heuristic)
- Counterfactual simulation (graph cloning with node removal)
- Platform-specific decision emulation (Perplexity, ChatGPT, Claude, Gemini)
- ROI calculation per content modification
- Visibility impact prediction
- Optimization prioritization

**Components:**
- `lib/causalTracer/pathFinder.ts` - Path discovery
- `lib/causalTracer/counterfactualSimulator.ts` - ROI calculation
- `lib/causalTracer/llmDecisionEmulator.ts` - Platform scoring
- `lib/causalTracer/engine.ts` - Orchestration

**Algorithms:**
- Hybrid BFS/DFS with A* heuristic for path optimization
- Deep graph cloning for counterfactual analysis
- Platform-specific scoring models (authority weight, recency decay, relevance)
- Impact quantification via differential analysis

### 4. Citation Intelligence

ML-based prediction, tracking, and learning systems.

**Capabilities:**
- **Citation Prediction** - Probability scoring per platform (Perplexity 0.87, ChatGPT 0.73, etc.)
- **Citation Tracking** - Real-time detection across AI platforms with screenshot proof
- **Learning Feedback** - Bidirectional intelligence exchange (AI → Platform → AI)
- **ROI Measurement** - Monetary value attribution per citation

**Components:**
- `utils/citationPrediction/engine.ts` - ML prediction
- `utils/citationProof/tracker.ts` - Citation monitoring
- `utils/citationLearning/feedbackEngine.ts` - Bidirectional learning

**Machine Learning:**
- Feature engineering (graph metrics, content quality, authority signals)
- Ensemble model (weighted combination of classifiers)
- Confidence intervals and prediction uncertainty
- Continuous model retraining from citation feedback

### 5. Content Intelligence

NLP analysis, competitive monitoring, query intent classification.

**Capabilities:**
- **NLP Analysis** - Entity extraction, sentiment analysis, readability scoring, semantic density
- **Query Intent** - ML classification (navigational, informational, transactional, commercial)
- **Competitive Intelligence** - Real-time monitoring of competitor citations in AI responses
- **Content Gap Detection** - Opportunity identification via query coverage analysis

**Components:**
- `utils/nlpContentAnalysis.ts` - NLP processing
- `utils/queryIntent/analyzer.ts` - Intent classification
- `utils/competitiveIntelligence.ts` - Competitor monitoring
- `utils/contentGap/detector.ts` - Gap analysis

**Algorithms:**
- TF-IDF for semantic density
- Named Entity Recognition (NER)
- Sentiment analysis via lexicon-based approach
- Query intent classification using feature extraction
- Competitive positioning via citation frequency analysis

### 6. Universal Agent Protocol

Production-grade UAP v1.0 implementation with proprietary trust layer.

**Core Capabilities:**
- HTTP/2 transport on port 8443 with bidirectional streaming
- WebSocket transport on port 8080 for real-time communication
- Cryptographic trust attestation via BFT watermark verification
- Client SDK with automatic reconnection and session management
- Rate limiting with token bucket algorithm
- Circuit breaker pattern with exponential backoff
- Correlation ID tracking for request-response matching

**Trust Layer:**
- BFT watermark ledger verification via PBFT consensus
- Trust score computation: 0.35×consensus + 0.25×watermark + 0.15×uptime + 0.10×endorsements + 0.15×causalContribution
- Ed25519 cryptographic signatures on all attestations
- Byzantine behavior detection and automatic rejection
- Tenant isolation with cross-tenant access validation
- Causal contribution scoring based on knowledge graph participation and economic activity

**Transport Architecture:**
- Message router with Zod schema validation
- Rate limits: 600 requests/min, 60 handshakes/hour
- Circuit breaker: 5 failures trigger exponential backoff (1s to 60s)
- Graceful shutdown with SIGINT/SIGTERM handlers

**Client Features:**
- Connection manager with heartbeat and RTT tracking
- Session manager implementing full handshake protocol
- Auto-reconnect with exponential backoff on failures
- Correlation ID matching for async request-response

**Components:**
- `src/protocols/uap/types.ts` - Complete type system
- `src/protocols/uap/constants.ts` - Protocol constants
- `src/protocols/uap/schemas.ts` - Zod validation
- `src/core/trust/middleware.ts` - Trust verification
- `src/core/trust/ledger.ts` - Watermark ledger client
- `src/core/trust/types.ts` - Attestation types
- `src/protocols/uap/transport/http2Adapter.ts` - HTTP/2 transport
- `src/protocols/uap/transport/wsAdapter.ts` - WebSocket transport
- `src/protocols/uap/client/connectionManager.ts` - Connection handling
- `src/protocols/uap/client/sessionManager.ts` - Session lifecycle
- `src/protocols/uap/client/uapClient.ts` - High-level client
- `src/protocols/uap/server.ts` - Server initialization
- `src/protocols/uap/discovery.ts` - Mesh network integration

### 7. A2A Protocol

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
a2a.ccc.balance        Query CCC account balance
a2a.ccc.history        Transaction history
a2a.ccc.transfer       Transfer CCC between agents
a2a.ccc.stake          Stake CCC for trust weight
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
- `lib/a2a/protocol.ts` - JSON-RPC 2.0 base
- `lib/a2a/agentRegistry.ts` - Agent management
- `lib/a2a/rateLimiter.ts` - Token bucket
- `lib/a2a/ed25519Signatures.ts` - RFC 9421 signatures
- `lib/a2a/websocketServer.ts` - Real-time streaming
- `lib/a2a/supabaseStorage.ts` - Persistence
- `lib/a2a/agentCard.ts` - Agent card generation and validation
- `lib/a2a/taskManager.ts` - ULID-based task lifecycle
- `lib/a2a/streaming.ts` - SSE implementation
- `lib/a2a/paymentExtension.ts` - USDC payment integration
- `lib/a2a/consensusExtension.ts` - PBFT consensus routing
- `lib/a2a/sessionManager.ts` - Session lifecycle management
- `lib/a2a/orchestration.ts` - Multi-agent task chaining
- `lib/a2a/reputation.ts` - Agent reputation scoring
- `lib/a2a/persistentQueue.ts` - Database-backed queue with atomic dequeue
- `lib/a2a/webhooks.ts` - HMAC-signed webhook delivery with retry logic

**Database Schema:**
- `a2a_tasks` - Task execution history with JSONB params and results
- `a2a_sessions` - Multi-task session grouping with aggregated metrics
- `a2a_agent_reputation` - Trust scores and performance tracking
- `a2a_task_events` - SSE event history for streaming replay
- `audit_jobs` - Persistent job queue with priority ordering and retry logic
- `batch_jobs` - Batch audit tracking with progress aggregation
- `job_webhooks` - Webhook callback management with exponential backoff

### 8. Causal Contribution Credits

Contribution-based economic mechanism solving agent ecosystem cold-start problem.

**Capabilities:**
- Graph-theoretic reward computation based on knowledge contribution value
- Novelty scoring via entity/relationship fingerprinting and deduplication
- Connectivity scoring using PageRank algorithm on causal graph structure
- Prediction improvement tracking with differential analysis
- Temporal relevance decay for maintaining data freshness incentives
- ACID-compliant ledger with thread-safe atomic operations
- Discount system for APA payments based on accumulated contribution
- Integrated trust scoring via contribution component weight

**Economic Model:**
- Agents earn CCC by syncing valuable knowledge to mesh network
- CCC reduces audit costs through tiered discount system (Bronze 25% to Platinum 90%)
- Lower costs incentivize more contribution creating positive flywheel effect
- Staking mechanism allows long-term commitment for trust weight bonus
- Consensus participation auto-rewards 0.1 CCC per valid PBFT round

**Components:**
- `src/core/ccc/types.ts` - Complete type system
- `src/core/ccc/ledger.ts` - ACID ledger with deterministic locking
- `src/core/ccc/causalValue.ts` - Graph algorithms and scoring
- `src/core/ccc/integration.ts` - Mesh sync and A2A integration
- `src/core/ccc/index.ts` - Public API exports

### 9. APA Micropayments

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
- `lib/payments/wallet.ts` - Custodial/non-custodial
- `lib/payments/invoice.ts` - Invoice system
- `lib/payments/ledger.ts` - Bookkeeping
- `lib/payments/chainWatcher.ts` - Payment detection
- `lib/payments/paymentGuard.ts` - Enforcement
- `lib/payments/reorgMonitor.ts` - Reorg protection
- `lib/payments/rpcProvider.ts` - RPC failover

### 10. Subscription Billing System

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

### 11. MCP Integration

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
- `lib/mcp/sandbox.ts` - Enterprise sandbox
- `lib/mcp/schemas.ts` - Universal schemas
- `api/mcp/route.ts` - Unified endpoint
- `app/api/tools/search/route.ts` - Tool search library
- `api/tools/search.ts` - Search endpoint
- `app/api/mcp/programmatic/route.ts` - Sandbox executor
- `api/mcp/programmatic.ts` - Programmatic endpoint

### 12. Analytics Infrastructure

Cross-tenant analytics with industry benchmarking and percentile ranking.

**Capabilities:**
- Global audit insights via materialized views with sub-second query latency
- Industry benchmarking with tenant metadata grouping and sample size filtering
- Percentile ranking calculation across all tenants with performance tier classification
- Category-specific benchmarks comparing tenant scores against global averages
- Trend analysis with linear regression forecasting and volatility calculation

**Components:**
- `lib/insights/globalAggregator.ts` - Cross-tenant analytics engine
- `supabase/migrations/016_job_queue_system.sql` - Materialized views and PostgreSQL functions
- `utils/advancedAnalytics.ts` - Statistical analysis

**Database Features:**
- Materialized view `global_audit_insights` with automatic refresh
- Percentile calculations for p10, p25, p50, p75, p90, p95, p99 score distribution
- Score distribution buckets with aggregated counts per range
- PostgreSQL functions for on-demand calculation fallback

### 13. Gold Standard System

Production persistence, automation, and backend services.

**Capabilities:**
- Supabase persistence adapter
- Job scheduling (cron, delayed, recurring)
- Backend utilities (monitoring, webhooks, queue processing)
- Real-time competitive monitoring
- Citation prediction persistence
- Learning analysis storage

**Components:**
- `utils/goldStandard/persistence.ts` - Supabase adapter
- `utils/automation/scheduler.ts` - Job scheduling
- `utils/backend/auditStorage.ts` - Audit persistence
- `utils/competitiveIntelligence/realTimeMonitor.ts` - Monitoring

### 14. Byzantine Fault Tolerance

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
- `lib/bft/types.ts` - PBFT types with Zod validation
- `lib/bft/storage.ts` - Supabase operations wrapper
- `lib/bft/pbftConsensus.ts` - Core consensus engine with OCCO integration
- `lib/bft/causalWeightOracle.ts` - Provenance-based weight calculation
- `lib/bft/offChainOracle.ts` - Distributed cache with gossip protocol
- `lib/bft/bftRouter.ts` - Consensus-aware routing
- `lib/bft/__tests__/ccoIntegration.test.ts` - Real graph integration tests
- `lib/bft/__tests__/tenantIsolation.test.ts` - RLS isolation verification
- `supabase/migrations/009_bft_schema.sql` - Database schema
- `supabase/migrations/20251124_tenant_isolation.sql` - Tenant RLS migration

### 15. Agent Mesh Network

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
- `lib/mesh/dht.ts` - Distributed hash table
- `lib/mesh/network.ts` - Mesh router with circuit breaker
- `lib/mesh/routing.ts` - Advanced routing algorithms
- `lib/mesh/healthMonitor.ts` - Peer health tracking
- `lib/mesh/compression.ts` - CBOR encoding per RFC 8949
- `lib/mesh/discovery.ts` - Peer discovery service
- `lib/mesh/peerStorage.ts` - Supabase persistence

### 16. Tenant Isolation

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
- `supabase/migrations/20251124_tenant_isolation.sql` - Full RLS migration
- `lib/bft/__tests__/tenantIsolation.test.ts` - Isolation verification

### 17. TypeScript SDK

Official client library for programmatic API access.

**Capabilities:**
- Type-safe API integration with Zod runtime validation
- Automatic retry with exponential backoff and jitter
- Circuit breaker pattern with per-service isolation
- Idempotency layer with request deduplication
- HTTP transport with configurable timeout handling
- Browser and Node.js compatibility with dynamic imports
- Service modules for Audit, Knowledge Graph, Citation, and CCC operations

**Resilience Features:**
- Retry policy with 3 attempts and exponential backoff (base 2s, max 30s)
- Circuit breaker with 5-failure threshold and 60s cooldown period
- Idempotency cache with LRU eviction (1000 entry limit, 24h TTL)
- Request timeout enforcement via AbortController with cleanup
- Cross-platform hash generation (Web Crypto API, Node.js crypto, FNV-1a fallback)

**Components:**
- `packages/sdk/src/client.ts` - Main client initialization
- `packages/sdk/src/transport/http.ts` - HTTP adapter with timeout handling
- `packages/sdk/src/resilience/factory.ts` - Isolated circuit breakers
- `packages/sdk/src/resilience/retry.ts` - Exponential backoff
- `packages/sdk/src/resilience/circuit-breaker.ts` - Fault isolation
- `packages/sdk/src/resilience/idempotency.ts` - Request deduplication
- `packages/sdk/src/services/audit.ts` - GEO Audit integration
- `packages/sdk/src/services/knowledge-graph.ts` - Knowledge Graph operations
- `packages/sdk/src/services/citation.ts` - Citation Intelligence
- `packages/sdk/src/services/ccc.ts` - CCC balance and transfer

### 18. Frontend Application

React 19 SPA with route-based code splitting and production-grade UI components.

**Pages:**
- HomePage - Platform positioning with GEO knowledge base
- GeoAuditPage - Advanced tabbed audit interface with mobile optimization
- AgentIdentityPage - AID protocol documentation
- InvestorRelationsPage - Infrastructure thesis
- KnowledgeBasePage - GEO terminology and concepts
- Dashboard - User portal (API keys, billing, usage, settings)
- Blog - Content marketing

**Audit Interface:**
- Tabbed navigation with URL state synchronization and browser history support
- Overview tab with precise scoring, quick summary, and category grid
- Analysis tab with 11-category sidebar navigation and detailed metrics
- Insights tab with AI recommendations, filtering, and quick wins calculator
- Technical tab with raw data viewer, AID protocol details, and schema validation
- Mobile-responsive with dropdown navigation and swipe gesture support
- Correlation analysis identifying metric relationships
- ROI calculator for recommendation prioritization

**Key Components:**
- `components/AIVisibilityScore.tsx` - Citation probability
- `components/KnowledgeGraphDashboard.tsx` - Graph visualization
- `components/CitationLearningDashboard.tsx` - Learning UI
- `components/TracerViz.tsx` - Causal graph visualization
- `components/GEOHealthTracker.tsx` - Daily monitoring
- `src/pages/dashboard/audit/tabs/` - Tabbed interface system
- `src/pages/dashboard/audit/hooks/` - State management and gestures

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
      audit/
        tabs/                    # Tabbed navigation system
          OverviewTab.tsx        # Score overview and summary
          AnalysisTab.tsx        # Category-by-category analysis
          InsightsTab.tsx        # AI recommendations and filtering
          TechnicalTab.tsx       # Raw data and technical details
          CategorySidebar.tsx    # 11-category navigation
          QuickSummary.tsx       # Top insights display
          QuickWins.tsx          # ROI-based prioritization
          CorrelationAnalysis.tsx # Metric relationships
          ROICalculator.tsx      # Recommendation scoring
          MobileTabDropdown.tsx  # Mobile navigation
        hooks/
          useAuditNavigation.ts  # State management with URL sync
          useSwipeGesture.ts     # Touch gesture support
    AgentIdentityPage.tsx        # AID protocol docs
  components/                    # Production-grade UI
    PaymentModal.tsx             # USDC payment UI
    BillingPage.tsx              # Subscription management

lib/
  payments/                       # APA Layer
  subscriptions/                  # Subscription Billing
    types.ts                      # Zod schemas and types
    storage.ts                    # Database operations
    manager.ts                    # Subscription lifecycle
    paymentDetector.ts            # Auto-detection
    renewalEngine.ts              # Auto-renewal
  a2a/                            # A2A Protocol
    persistentQueue.ts            # Database-backed queue
    webhooks.ts                   # HMAC webhook delivery
  insights/                       # Analytics Infrastructure
    globalAggregator.ts           # Cross-tenant analytics
  mesh/                           # Agent Mesh Network
  bft/                            # Byzantine Fault Tolerance with OCCO
    causalWeightOracle.ts         # Provenance weight calculation
    offChainOracle.ts             # Distributed cache with gossip
    pbftConsensus.ts              # PBFT with dynamic quorum
    __tests__/ccoIntegration.test.ts  # Integration tests
    __tests__/tenantIsolation.test.ts # RLS isolation tests
  causalTracer/                   # Citation Tracer
  ucpt/                           # Universal Causal Provenance Token
    generator.ts                  # COSE_Sign1 with Ed25519
    verifier.ts                   # Signature verification
    serializer.ts                 # Canonical CBOR (RFC 8949)
  mcp/                            # MCP Sandbox
  aiSyndication/                  # Platform sync
  nlu/                            # NLU Foundation
  security/                       # CSRF protection
  auth/                           # JWT authentication
  validation/                     # Input validation
  middleware/                     # Rate limiting
  database/                       # Query optimization
  reliability/                    # Circuit breakers and retry
  logging/                        # Structured logging
  metrics/                        # Prometheus metrics
  tracing/                        # OpenTelemetry tracing
  error-tracking/                 # Sentry integration
  webhooks/                       # Webhook receiver
  accessibility/                  # Keyboard navigation
  patterns/                       # Design patterns

src/
  protocols/uap/                  # Universal Agent Protocol
    types.ts                      # Complete type system
    constants.ts                  # Protocol constants
    schemas.ts                    # Zod validation
    server.ts                     # Server initialization
    discovery.ts                  # Mesh integration
    transport/                    # Transport layer
      messageRouter.ts            # Message routing
      http2Adapter.ts             # HTTP/2 transport
      wsAdapter.ts                # WebSocket transport
      rateLimiter.ts              # Token bucket
      circuitBreaker.ts           # Exponential backoff
      uapServer.ts                # Server orchestration
    client/                       # Client SDK
      connectionManager.ts        # Connection handling
      sessionManager.ts           # Session lifecycle
      uapClient.ts                # High-level API
  core/trust/                     # Trust Layer
    middleware.ts                 # Trust verification
    ledger.ts                     # Watermark ledger
    types.ts                      # Attestation types
  core/ccc/                       # Causal Contribution Credits
    types.ts                      # Type system
    ledger.ts                     # ACID ledger
    causalValue.ts                # Graph algorithms
    integration.ts                # Mesh sync integration
    index.ts                      # Public API

utils/
  geoAuditEnhanced.ts            # Audit engine
  knowledgeGraph/                 # KG engine
  citationPrediction/             # ML prediction
  citationProof/                  # Citation tracking
  citationLearning/               # Feedback loop
  queryIntent/                    # Intent classification
  contentGap/                     # Gap detection
  competitiveIntelligence/        # Monitoring
  nlpContentAnalysis.ts          # NLP processing
  advancedMetrics.ts             # Scoring
  monitoringAlerts.ts            # Alert system
  pdfReportGenerator.ts          # PDF export

components/
  AIVisibilityScore.tsx          # Citation probability
  KnowledgeGraphDashboard.tsx    # Graph viz
  CitationLearningDashboard.tsx  # Learning UI
  TracerViz.tsx                  # Causal graph
  GEOHealthTracker.tsx           # Daily monitoring
  UIStates.tsx                   # Loading, error, empty states
  AsyncComponentWrapper.tsx      # Async component wrapper
  [31 more components]

pages/
  HomePage.tsx                   # Platform homepage
  GeoAuditPage.tsx              # Audit interface
  AgentIdentityPage.tsx         # AID protocol
  InvestorRelationsPage.tsx     # Infrastructure thesis
  KnowledgeBasePage.tsx         # GEO knowledge base
  Dashboard/                    # User portal

data/
  geoKnowledgeBase.ts           # GEO terminology
  blogPosts.ts                  # Content marketing

supabase/migrations/
  001-023                       # Database schema with rollback scripts

packages/sdk/                   # TypeScript SDK
  src/
    client.ts                   # Main client
    transport/
      http.ts                   # HTTP adapter
    resilience/
      factory.ts                # Circuit breaker factory
      retry.ts                  # Exponential backoff
      circuit-breaker.ts        # Fault isolation
      idempotency.ts            # Request deduplication
    services/
      audit.ts                  # GEO Audit
      knowledge-graph.ts        # Knowledge Graph
      citation.ts               # Citation Intelligence
      ccc.ts                    # CCC operations
    types/
      audit.ts                  # Audit schemas
      knowledge-graph.ts        # Graph schemas
      citation.ts               # Citation schemas
      ccc.ts                    # CCC schemas
    errors/
      index.ts                  # Error hierarchy

tests/
  property-based/               # Property-based tests
  integration/                  # Integration tests
  unit/                         # Unit tests
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
- `lib/payments/README.md` - APA reference
- `lib/payments/DEPLOYMENT_GUIDE.md` - Production setup
- `lib/payments/INTEGRATION_SUMMARY.md` - Technical overview

**Specifications:**
- `KNOWLEDGE_GRAPH_ENGINE.md` - KG architecture
- `CITATION_LEARNING_ENGINE.md` - ML feedback loop
- `GOLD_STANDARD_INNOVATIONS.md` - Persistence layer

**Examples:**
- `examples/agent-client.ts` - AI agent implementation
- `scripts/ed25519KeyManager.ts` - Key lifecycle CLI

---

## Statistics

**Codebase:**
- Total files: 819
- Total lines: 157,573
- TypeScript: 94.2%
- PLpgSQL: 5.0%
- CSS: 0.8%

**Test Coverage:**
- Test pass rate: 97.1%
- Total tests: 656
- Passing tests: 637
- Property-based tests: Comprehensive coverage for core algorithms
- Integration tests: API endpoints, database operations, external services

**Core Modules:**
- A2A Protocol with persistent queue and webhooks
- Universal Agent Protocol with trust attestation
- Agent Mesh Network with DHT routing
- APA Micropayments on Base L2
- Causal Citation Tracer with counterfactual analysis
- Byzantine Fault Tolerance with Causal Consensus Oracle
- Knowledge Graph with self-improvement
- Content Intelligence with NLP analysis
- GEO Audit Engine with advanced tabbed interface
- Citation Intelligence with ML prediction
- TypeScript SDK with resilience patterns
- Gold Standard System with automation
- MCP Integration with isolated sandbox
- Causal Contribution Credits with graph algorithms
- Analytics Infrastructure with cross-tenant insights
- UCPT Provenance Token with Ed25519 signatures
- NLU Foundation with intent classification
- Subscription Billing with USDC payments
- Frontend: Production-grade UI with mobile optimization

---

## License

Proprietary - All rights reserved

---

Last Updated: December 4, 2025
Version: 4.0.0
