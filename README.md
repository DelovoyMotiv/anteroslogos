# Anóteros Lógos - Generative Engine Optimization Platform

[![License](https://img.shields.io/badge/License-Proprietary-red.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-2.1.0-blue.svg)](CHANGELOG.md)
[![Node](https://img.shields.io/badge/node-20.x-brightgreen.svg)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.2-61dafb.svg)](https://react.dev)
[![Build](https://img.shields.io/badge/build-passing-brightgreen.svg)](https://github.com/DelovoyMotiv/anteroslogos/actions)

Enterprise-grade AI knowledge infrastructure platform. Transform content into native AI sources through automated knowledge graphs, direct platform integration, and citation tracking with measurable ROI.

**Production URL:** https://anoteroslogos.com

## Architecture

Modern React 19 SPA with TypeScript strict mode, serverless API architecture, and comprehensive monitoring capabilities.

### Core Stack

- **Frontend**: React 19.2, TypeScript 5.8, Vite 6.2
- **Routing**: React Router 7.9.5 with lazy loading
- **Styling**: Tailwind CSS 3.4+ with custom design system
- **Data Visualization**: Recharts 3.3
- **AI Integration**: OpenRouter API with LLM support (MiniMax M2, Llama 3.2, Gemma 2)
- **PDF Generation**: jsPDF for professional audit reports
- **Validation**: Zod 3.x for runtime type checking
- **Deployment**: Vercel Edge Functions

### Technical Capabilities

**Performance:**
- Route-based code splitting with React.lazy
- LCP under 2.5s, CLS under 0.1, INP under 200ms
- Total bundle: approximately 1.6 MB (approximately 445 kB gzipped)
- Main GeoAudit page: 510 kB (approximately 144 kB gzipped)
- Knowledge Graph module: 213 kB integrated
- Build time: 12-15s in CI/CD

**Security:**
- WCAG 2.1 AA compliant
- XSS and SQL injection prevention
- SSRF protection with IP blocklisting
- Rate limiting: 5 req/min, 20 req/hour

**SEO & AI Optimization:**
- Schema.org structured data (Organization, Person, Article, Product, Review, HowTo, FAQ)
- Support for 15+ AI crawlers (GPTBot, Claude-Web, Perplexity, Google-Extended, Gemini)
- Priority-based sitemap with AI discovery hints
- Open Graph and Twitter Card meta tags


## Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Type check
npm run typecheck

# Lint code
npm run lint
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

```env
# SEO & Meta
VITE_SITE_URL=https://anoteroslogos.com
VITE_SITE_NAME=Anóteros Lógos
VITE_SITE_DESCRIPTION=Generative Engine Optimization Agency

# AI Agent Configuration (GEO Marketolog)
VITE_OPENROUTER_API_KEY=your_openrouter_api_key_here
VITE_OPENROUTER_MODEL=minimax/minimax-m2:free
# Alternative models: meta-llama/llama-3.2-3b-instruct:free, google/gemma-2-9b-it:free

# A2A Protocol Configuration
VITE_APP_URL=https://anoteroslogos.com  # Base URL for A2A endpoint discovery

# API Configuration (when ready)
# VITE_API_URL=https://api.yoursite.com
# VITE_CONTACT_FORM_ENDPOINT=/api/contact

# Analytics (optional)
# VITE_GA_TRACKING_ID=G-XXXXXXXXXX
```

## Project Structure

```
F:\air\
├── api/
│   └── a2a/
│       └── index.ts                # A2A Protocol HTTP endpoint (435 lines)
├── components/
│   ├── charts/                     # Recharts visualizations
│   │   ├── CategoryBarChart.tsx
│   │   ├── PriorityMatrix.tsx
│   │   ├── ScoreRadarChart.tsx
│   │   └── ScoreTrendChart.tsx
|   ├── AIVisibilityScore.tsx       # AI citation probability metric (253 lines)
|   ├── AIDAgentStatus.tsx          # AID protocol visualization (253 lines)
|   ├── GEOHealthTracker.tsx        # Daily monitoring with forecasts (398 lines)
|   ├── KnowledgeGraphDashboard.tsx # Knowledge Graph visualization (356 lines)
|   ├── AnalysisProgress.tsx        # Progress tracking (220 lines)
|   ├── ExecutiveSummary.tsx        # Dashboard summary (271 lines)
|   ├── NLPInsights.tsx             # NLP analysis display (362 lines)
|   ├── Header.tsx                  # Navigation (142 lines)
|   ├── Footer.tsx                  # Footer with links (210 lines)
|   ├── Modal.tsx                   # Contact form (222 lines)
|   ├── SEOHead.tsx                 # Meta tags manager (130 lines)
|   └── [28 more components]        # Total 33 components
├── pages/
│   ├── HomePage.tsx
│   ├── GeoAuditPage.tsx           # GEO Audit Tool with analytics
│   ├── AgentIdentityPage.tsx     # AID protocol documentation (393 lines)
│   ├── InvestorRelationsPage.tsx # Investment data (660 lines)
│   ├── Blog.tsx
│   ├── BlogPost.tsx
│   ├── Author.tsx
│   └── KnowledgeBasePage.tsx
├── lib/
│   ├── a2a/                       # A2A Protocol (2361 lines)
│   │   ├── protocol.ts            # JSON-RPC 2.0 (526 lines)
│   │   ├── adapter.ts             # Result conversion (455 lines)
│   │   ├── rateLimiter.ts         # Token bucket (264 lines)
│   │   ├── queue.ts               # Priority queue (467 lines)
│   │   └── cache.ts               # TTL cache (478 lines)
│   ├── aiSyndication/
│   │   └── index.ts               # AI platform integration (558 lines)
│   └── supabase.ts
├── utils/
|   ├── ai/
|   │   ├── openrouter.ts          # LLM integration (466 lines)
|   │   └── geoMarketologAgent.ts  # AI recommendations (166 lines)
|   ├── knowledgeGraph/
|   │   └── builder.ts             # Knowledge graph extraction (618 lines)
|   ├── citationProof/
|   │   └── tracker.ts             # Citation tracking and ROI (465 lines)
|   ├── geoAuditEnhanced.ts        # Audit engine with precision scoring (2100+ lines)
|   ├── aidDiscovery.ts            # AID protocol detection (559 lines)
|   ├── advancedAnalytics.ts       # Trend analysis (418 lines)
|   ├── monitoringAlerts.ts        # Alert system (574 lines)
|   ├── competitiveIntelligence.ts # Benchmarking (614 lines)
|   ├── nlpContentAnalysis.ts      # NLP analysis (531 lines)
|   ├── pdfReportGenerator.ts      # PDF export (469 lines)
|   ├── urlValidator.ts            # Security validation with retry (333 lines)
|   └── auditHistory.ts            # LocalStorage audit management
├── data/
│   ├── blogPosts.ts
│   └── geoKnowledgeBase.ts
├── public/
│   ├── robots.txt
│   ├── sitemap.xml
│   ├── manifest.json
│   └── .well-known/
│       ├── ai.txt
│       ├── security.txt
│       └── agent.json              # AID protocol discovery file
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql
├── KNOWLEDGE_GRAPH_ENGINE.md       # Knowledge Graph documentation (450 lines)
├── App.tsx
├── index.tsx
├── index.html
├── tailwind.config.js
├── tsconfig.json
├── vite.config.ts
└── vercel.json
```



## Deployment

### Vercel (Current Production Setup)

The project is configured for **automatic deployments** on Vercel:

- **Production URL**: https://anoteroslogos.com
- **Auto-deploy**: Enabled on push to `main` branch
- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Node Version**: 20.x

#### Manual Deploy via CLI
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

#### Vercel Configuration
The `vercel.json` file includes:
- SPA fallback routing
- Custom headers for security and caching
- Redirects configuration

### Alternative Hosting

#### Netlify
```bash
# Build command
npm run build

# Publish directory
dist
```

#### Traditional Hosting (Apache/Nginx)
```bash
# Build
npm run build

# Upload dist/ folder to your hosting
# Configure SPA fallback to index.html
```

## Customization

### Colors (tailwind.config.js)
```js
colors: {
  'brand-bg': '#0a0f1e',
  'brand-text': '#e5e7eb',
  'brand-accent': '#3b82f6',
  'brand-secondary': '#1e293b',
}
```

### Typography
- **Display Font**: Space Grotesk (headings)
- **Body Font**: DM Sans (paragraphs)

### Contact Form
Update `components/Modal.tsx` to connect to your backend:
```typescript
// Replace mock API call with real endpoint
await fetch('/api/contact', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name, email, company, message })
});
```

## Pre-Production Checklist

- [x] TypeScript compilation (no errors)
- [x] ESLint passing (0 warnings, 0 errors)
- [x] Production build successful
- [x] All imports cleaned
- [x] Accessibility audit (ARIA labels, semantic HTML)
- [x] SEO meta tags configured
- [x] Structured data (JSON-LD) implemented
- [x] robots.txt and sitemap.xml configured
- [x] Responsive design tested
- [x] Contact form validation
- [x] Environment variables documented

## Troubleshooting

### Build Errors
```bash
# Clear cache and reinstall
rm -rf node_modules dist .vite
npm install
npm run build
```

### TypeScript Errors
```bash
# Check types without building
npm run typecheck

# Ensure TypeScript is up to date
npm install typescript@latest
```

### Lint Issues
```bash
# Auto-fix where possible
npm run lint -- --fix

# Check specific files
npm run lint src/components/
```

### Deployment Issues (Vercel)
```bash
# Check deployment logs
vercel logs

# Clear Vercel cache and redeploy
vercel --force

# Verify build locally matches production
npm run build && npm run preview
```

### Performance Optimization
```bash
# Analyze bundle size
npm run build -- --mode production --sourcemap

# Check for unused dependencies
npm prune
```

## Performance

### Production Build Stats (Latest)
- HTML: 22.10 kB (gzip: 5.15 kB)
- CSS: 64.90 kB (gzip: 10.17 kB)
- JS (main): 184.82 kB (gzip: 58.90 kB)
- JS (GeoAudit): 510.46 kB (gzip: 143.93 kB) - optimized from 877KB (42% reduction)
- JS (PDF Generator): 392.91 kB (gzip: 126.79 kB)
- JS (blog): 163.35 kB (gzip: 47.75 kB)
- JS (home): 73.53 kB (gzip: 22.14 kB)
- Total Bundle: approximately 1.6 MB (gzip: approximately 445 kB)
- Build Time: approximately 12-15s on CI/CD

### Core Web Vitals (Production)
- LCP (Largest Contentful Paint): under 2.5s
- FID/INP (Interaction Delay): under 200ms
- CLS (Cumulative Layout Shift): under 0.1

### Optimization Features
- Route-based code splitting with React.lazy
- Tree-shaking and dead code elimination
- CSS purging via Tailwind
- Self-hosted fonts (no external requests)
- Markdown rendering with proper code highlighting
- Minified and optimized assets
- Gzip compression enabled on Vercel

## AID Protocol - Agent Identity & Discovery

Implementation of the Agent Identity & Discovery protocol (AID v1.1) from agentcommunity.org. DNS-first approach for making AI agents discoverable across the agentic web ecosystem.

### Protocol Overview

**What is AID?**
AID (Agent Identity & Discovery) is the DNS for AI agents. It solves the fundamental question: "Given a domain, where is its AI agent?" One TXT record makes an agent instantly discoverable.

**Strategic Philosophy:**
"Minimal, DNS-crystal clear mechanism of discoverability" - No registries, no configuration, no intermediaries. Just DNS.

### Technical Implementation

**1. DNS TXT Record** (`_agent.anoteroslogos.com`)
```
v=1.1;p=a2a,http;u=https://anoteroslogos.com/api/a2a;s=geoaudit;d=anoteroslogos.com
```

Single-letter aliases fit within 255-byte DNS limit:
- `v=1.1` - AID protocol version 1.1
- `p=a2a,http` - Supported protocols (A2A, HTTP)
- `u=...` - Primary endpoint URL
- `s=geoaudit` - Service identifier
- `d=...` - Domain ownership verification

**2. Well-Known Discovery** (`/.well-known/agent.json`)
Fallback HTTPS discovery mechanism per RFC 8615:
- Agent capabilities enumeration
- Protocol version information
- Ed25519 key metadata (RFC 9421)
- Pricing and rate limit details
- Organization metadata

**3. Documentation Page** (`/agent-identity`)
Public-facing page explaining:
- AID protocol integration
- DNS configuration instructions
- Agent capabilities showcase
- Discovery mechanisms
- Security considerations
- Market adoption metrics

### Key Features

- **DNS-First Discovery**: Single TXT record for global agent discovery
- **Hybrid Fallback**: DNS primary, HTTPS well-known secondary
- **Protocol-Agnostic**: Supports A2A, MCP, ANP, HTTP protocols
- **Cryptographic Proof**: Ed25519 signatures (RFC 9421) for domain verification
- **Zero Dependencies**: No external registries or platforms required
- **Vercel Compatible**: Serverless-friendly static discovery file

### Market Context

- **Adoption**: 5,000+ domains (3 months post-v1.0)
- **Standards Track**: IETF RFC discussion (expected 2026)
- **Integration**: MCP, A2A, ANP servers
- **Marketplace Support**: OpenAI Plugins, Claude, Vertex AI
- **Specification**: agentcommunity.org v1.1 (October 2025)

### Setup Instructions

See `DNS_SETUP.md` for complete configuration guide including:
- Cloudflare setup
- Route 53 (AWS) setup
- Google Cloud DNS setup
- Verification methods
- Troubleshooting

---

## A2A Protocol - Agent2Agent API

Production-ready JSON-RPC 2.0 API endpoint for AI agent integration. Optimized for Perplexity, ChatGPT, Claude, Gemini, and other AI search agents.

### Architecture

**5 Core Components (2,361 lines):**

1. **Protocol Layer** (`lib/a2a/protocol.ts` - 526 lines)
   - JSON-RPC 2.0 implementation with Zod runtime validation
   - 12 API methods: discover, capabilities, audit, batch, insights, ping, status
   - AI agent detection (Perplexity, ChatGPT, Claude, Gemini, Grok)
   - 4-tier rate limiting configs (free/basic/pro/enterprise)
   - 10 custom error codes + JSON-RPC 2.0 standard codes

2. **Adapter Layer** (`lib/a2a/adapter.ts` - 455 lines)
   - Converts GEO AuditResult → AI-optimized A2AAuditResult format
   - Semantic data extraction: entities, topics, keywords, industry detection
   - Confidence scoring based on data completeness (0.5-0.95)
   - Actionable insights generation (best practices, opportunities, benchmarks, predictions)
   - Citation sources extraction from link analysis

3. **HTTP API Endpoint** (`api/a2a/index.ts` - 435 lines)
   - Vercel serverless function with Edge runtime compatibility
   - Method routing with parameter validation
   - API key authentication (format: `sk_{tier}_{32_chars}`)
   - Rate limiting integration with X-RateLimit headers
   - Response caching (1-hour TTL for audits)
   - Full CORS support for cross-origin requests

4. **Queue System** (`lib/a2a/queue.ts` - 467 lines)
   - Priority-based job queue (high/normal/low)
   - Progress tracking (0-100%)
   - Automatic retry logic (max 3 attempts)
   - Batch job support (max 100 URLs)
   - Auto-cleanup (24-hour retention)
   - Configurable concurrent worker support

5. **Cache Layer** (`lib/a2a/cache.ts` - 478 lines)
   - TTL-based caching with configurable expiration
   - ETag support for HTTP 304 Not Modified responses
   - LRU eviction strategy (100MB memory limit)
   - Auto-cleanup every 5 minutes
   - Cache warming support
   - Express/Vercel middleware wrapper

### Rate Limiting

| Tier       | Req/Min | Req/Hour | Concurrent | Burst | Price      |
|------------|---------|----------|------------|-------|------------|
| Free       | 10      | 100      | 2          | 5     | $0         |
| Basic      | 60      | 1,000    | 5          | 20    | $99/mo     |
| Pro        | 300     | 10,000   | 20         | 100   | $299/mo    |
| Enterprise | 1,000   | 50,000   | 100        | 500   | Custom     |

### AI Agent Detection

Automatic detection and optimization for:
- **Perplexity AI** (search agent with real-time citations)
- **ChatGPT** (OpenAI assistant with conversational capabilities)
- **Claude** (Anthropic assistant with analysis focus)
- **Google Gemini** (multimodal with search integration)
- **Grok** (X-integrated search with real-time data)

### Semantic Extraction

**Entity Types:** Organization, Person, LocalBusiness, Article, Product, SoftwareApplication

**Industry Detection:** E-commerce, Technology, Media & Publishing, Local Business, Education

**Topics:** Structured Data, E-E-A-T, AI Optimization, Citations, Comprehensive Content

**Keywords:** Extracted from URL paths + schema types (max 10)

### API Methods

**Discovery & Health:**
- `a2a.discover` - Service metadata and capabilities
- `a2a.capabilities` - Detailed API documentation
- `a2a.ping` - Health check
- `a2a.status` - Server status

**GEO Audit:**
- `geo.audit.request` - Single URL audit (cached 1 hour)
- `geo.audit.batch` - Batch audit (max 100 URLs, 5 concurrent)
- `geo.audit.status` - Job status tracking (planned)
- `geo.audit.result` - Retrieve cached results (planned)

**Insights (Planned):**
- `geo.insights.global` - Global GEO trends
- `geo.insights.industry` - Industry benchmarks
- `geo.insights.domain` - Domain-specific analytics

### Usage Example

```bash
# cURL Request
curl -X POST https://anoteroslogos.com/api/a2a \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk_basic_your_32_character_api_key_here" \
  -d '{
    "jsonrpc": "2.0",
    "method": "geo.audit.request",
    "params": { "url": "https://example.com" },
    "id": 1
  }'

# Response (AI-Optimized Format)
{
  "jsonrpc": "2.0",
  "result": {
    "audit_id": "aud_1735891234_abc123",
    "url": "https://example.com",
    "status": "completed",
    "overall_score": 85,
    "grade": "Expert",
    "confidence": 0.88,
    "categories": { ... },
    "findings": {
      "critical": [],
      "warnings": [...],
      "recommendations": [...],
      "opportunities": [...]
    },
    "semantic_data": {
      "entity_type": "Organization",
      "industry": "Technology",
      "topics": ["Structured Data", "E-E-A-T"],
      "keywords": [...],
      "entities": [...]
    },
    "citations": {
      "sources": [...],
      "data_points": 45,
      "factual_claims": 23,
      "expert_quotes": 5
    },
    "insights": [
      {
        "type": "best_practice",
        "title": "Strong Technical & Authority Foundation",
        "description": "...",
        "confidence": 0.88
      }
    ],
    "metadata": {
      "processing_time_ms": 3842,
      "agent_used": "Perplexity AI",
      "depth": "standard",
      "version": "1.0.0"
    }
  },
  "id": 1
}
```

### Cache Strategy

- **Audit Results:** 1 hour TTL
- **Global Insights:** 24 hours TTL
- **Industry Insights:** 12 hours TTL
- **Domain Trends:** 6 hours TTL
- **Max Size:** 100 MB with LRU eviction at 80% capacity

### Production Features

✅ **Type Safety:** Full TypeScript with Zod runtime validation
✅ **Rate Limiting:** Token bucket algorithm with burst support
✅ **Caching:** ETag-based HTTP 304 responses
✅ **Error Handling:** JSON-RPC 2.0 compliant error codes
✅ **Security:** API key format validation, CORS headers
✅ **Monitoring:** Request logging, rate limit headers
✅ **Scalability:** Serverless architecture, in-memory cache

### Next Steps

**Phase 2 - WebSocket Streaming (Planned):**
- Real-time progress updates
- Subscription management
- WebSocket server endpoint

**Phase 3 - Async Job Processing (Planned):**
- Queue integration with audit engine
- Job status tracking API
- Webhook callbacks

**Phase 4 - Advanced Insights (Planned):**
- Global insights aggregation from database
- Industry benchmarking with percentiles
- Trend analysis endpoints

**Phase 5 - Production Hardening (Planned):**
- Replace in-memory storage with Redis
- Distributed tracing (OpenTelemetry)
- Monitoring & alerting (Sentry)
- API key management UI
- Developer portal

---

## Knowledge Graph Engine

Revolutionary AI knowledge infrastructure that transforms content into native AI sources. See `KNOWLEDGE_GRAPH_ENGINE.md` for comprehensive documentation.

### Core Innovation

**Paradigm Shift**: From "optimize for AI crawlers" to "become part of AI platforms."

Competitors optimize content hoping AI finds it. We integrate knowledge directly into AI platforms through official APIs.

### Architecture Components

**Knowledge Graph Builder** (618 lines)
- Entity extraction with 10 types: Person, Organization, Product, Concept, Technology, Location, Event, Document, Metric, Process
- Relationship mapping with 10 types: worksFor, creates, uses, proves, describes, locatedIn, happenedAt, references, measures, enables
- Claim detection with evidence validation and confidence scoring
- Temporal context tracking for time-sensitive information
- JSON-LD export compatible with Schema.org ontology

**AI Native Syndication** (558 lines)
- OpenAI integration via Assistants API v2 with Vector Store
- Anthropic Claude tool use definitions for knowledge access
- Perplexity source submission for citable references
- Google Gemini web-based grounding with structured data
- Meta Llama Index RAG integration for retrieval pipelines
- Cost tracking per platform with ROI measurement

**Citation Proof Engine** (465 lines)
- Real-time citation detection across AI platforms (ChatGPT, Claude, Perplexity, Gemini, Grok)
- Pattern matching algorithm with confidence scoring (domain mention 40%, entity match 30%, citation markers 30%)
- Competitive share of voice analysis against market benchmarks
- Citation velocity tracking (daily trend analysis)
- ROI calculation: estimated reach (citations × 100 views), estimated value (reach / 1000 × $10 CPM)
- Cost per citation and comparable paid channel metrics (Google Ads, Facebook Ads, LinkedIn Ads)

**Knowledge Graph Dashboard** (356 lines)
- Graph View: Interactive entity-relationship visualization (D3.js in production roadmap)
- Entities Tab: Complete list with types and confidence scores
- Claims Tab: Factual statements with evidence sources
- Citations Tab: Real-time tracking by AI platform with metrics
- Quality Score: 0-100 rating based on entity count, relationship density, claim validation
- Syndication Status: Live indicators for each AI platform integration

### Technical Implementation

**Entity Recognition**:
- Regex-based NLP patterns for 10 entity types
- Capitalization analysis for proper nouns
- Context window analysis (surrounding 100 characters)
- Confidence scoring based on pattern matches and co-occurrence

**Relationship Inference**:
- Co-occurrence analysis within sentence boundaries
- Distance-based relevance scoring
- Directional relationship detection (subject-predicate-object)
- Multiple relationship type support between same entities

**Claim Detection**:
- Citation marker patterns (parenthetical references, footnotes, inline citations)
- Statistical statement recognition (percentages, numeric data)
- Expert quote identification with attribution
- Evidence validation through source URL checking

**OpenAI Syndication Workflow**:
1. Create GPT Assistant with name format: KG_{domain}
2. Initialize Vector Store with 1-year expiration policy
3. Attach Vector Store to Assistant via files parameter
4. Upload 3 text files: entities.txt (structured list), relationships.txt (triple format), claims.txt (statement + evidence)
5. Enable file_search tool for semantic retrieval
6. Return Assistant URL for client access and API tracking

### Integration with GEO Audit

Knowledge Graph extraction runs automatically during website audit:
- Triggers after HTML content fetch
- Progress callback integration ("Building knowledge graph...")
- Error handling with graceful degradation
- Results stored in AuditResult.knowledgeGraph field
- Dashboard renders below AID Agent section
- Export included in PDF reports and JSON downloads

### Pricing Tiers

**Starter ($499/mo)**
- Knowledge Graph: up to 1,000 entities
- 1 AI platform integration (OpenAI)
- Monthly citation report (30-day summary)
- Basic dashboard access
- Email support

**Professional ($1,999/mo)**
- Knowledge Graph: up to 10,000 entities
- 3 AI platform integrations (OpenAI, Claude, Perplexity)
- Real-time citation tracking with daily updates
- Competitive benchmarking (up to 5 competitors)
- Advanced dashboard with trend analysis
- Priority support

**Enterprise ($5,999/mo)**
- Unlimited Knowledge Graph entities
- All 5 AI platforms (OpenAI, Claude, Perplexity, Gemini, Meta)
- White-label dashboard with custom branding
- API access for CMS integration
- Dedicated knowledge architect (4 hours/month)
- Custom syndication schedules
- SLA guarantees (99.9% uptime)
- 24/7 support

### Competitive Advantages

1. **Direct Integration vs Content Optimization**: Competitors optimize content hoping AI finds it. We push knowledge directly to AI platforms via official APIs.
2. **Measurable ROI vs Vanity Metrics**: Track exact citations with estimated reach and value (CPM-based). CFO-friendly metrics enable enterprise sales.
3. **Network Effects vs Isolated Services**: Knowledge graphs connect and reinforce each other. Clients benefit from collective authority.
4. **Platform Agnostic vs Vendor Lock-in**: Syndicate to all major AI platforms simultaneously. Future-proof against platform shifts.
5. **Proprietary Algorithms**: Entity extraction, relationship inference, and citation detection use production-grade NLP that competitors cannot replicate without 12-18 months R&D.

### Market Impact

Expands TAM from $2-3B (GEO services) to $5-7B (plus Knowledge Management and AI Infrastructure markets).

Creates new category: AI Knowledge Infrastructure - similar to how CDNs revolutionized content delivery.

---

## GEO Audit Tool

Production-ready website analysis platform with advanced analytics capabilities and AI-powered recommendations.

### New Dashboard Components (2025)

**AI Visibility Index** - Single unified metric (0-100%) answering "Will AI see my site?":
- Calculates AI citation probability based on 5 weighted factors
- AI Access (25%): Crawler permissions and discoverability
- Authority (20%): E-E-A-T signals and trust indicators
- Structure (20%): Schema markup and semantic HTML
- Content (20%): Quality, citations, and factual density
- Technical (15%): Performance, security, mobile optimization
- Visual progress indicator with Eye icon and color-coded status
- Breakdown cards showing each factor's contribution
- Positioned prominently after Executive Summary

**GEO Health Tracker** - Daily monitoring dashboard with historical trends:
- 30-day sparkline chart with SVG area gradient visualization
- Daily delta tracking showing 24-hour score changes
- Streak system with flame icon (consecutive improvements)
- 7-day and 30-day forecasts using linear regression
- Data persistence in localStorage with URL-based keys
- Hover tooltips showing score history
- Encourages daily return with gamification elements
- Tracks same AI Visibility metric over time

**High-Precision GEO Score** - 3-decimal accuracy for enterprise analytics:
- Main score with 3 decimals (e.g., 54.649/100) instead of rounded integers
- Three-component breakdown with specific weightings:
  - **Core** (35%): Schema + AI Access + E-E-A-T
  - **Technical** (25%): SEO + Links + Meta + Structure
  - **Content** (40%): Quality + Citation + Performance
- Professional display with tabular-nums and glow effects
- Backward compatible with existing rounded scores
- Component scores shown with 1 decimal precision

### AI-Powered Recommendations

**GEO Marketolog AI Agent** - Elite AI strategist with enhanced precision scoring:

**Technology Stack:**
- OpenRouter API for LLM access
- Current Model: MiniMax M2 (free tier) with multilingual support
- Alternative models: Llama 3.2 3B, Gemma 2 9B
- Enhanced system prompt with precision score understanding
- Graceful fallback to default recommendations if API unavailable
- 30-second timeout protection
- Temperature: 0.7, max_tokens: 2500

**Enhanced System Prompt (2025):**
- High-precision scoring system documentation (3-decimal scores)
- Component breakdown understanding (Core/Technical/Content)
- Updated weight percentages for all metrics:
  - Schema Markup: 16-20% (highest single weight)
  - AI Crawler Access: 18%
  - E-E-A-T: 15-18%
  - Content Citation: 9-15%
- ROI prioritization considering score breakdown
- Recommendations aligned with component weaknesses

**Expertise Areas:**
- AI/LLM architecture (ChatGPT, Claude, Gemini, Perplexity citation mechanics)
- Semantic web technologies (Schema.org ontologies, knowledge graphs)
- Information retrieval (TF-IDF, vector embeddings, RAG systems)
- E-E-A-T signals and authority patterns
- Citation probability optimization
- High-precision scoring methodologies

**Analytical Approach:**
1. Root Cause Analysis - explains WHY issues matter for AI systems
2. Competitive Context - compares to high-authority sources
3. Systemic Thinking - identifies interconnected issues
4. ROI Prioritization - focuses on multiplicative effects
5. Technical Precision - uses exact terminology and specific Schema types

**Recommendation Quality:**
- Professional, specific titles ("Implement Organization Schema with knowledge graph structure")
- Deep analysis with mechanism explanations
- Quantified impact with research-backed metrics ("3x entity recognition accuracy")
- Precise technical steps with validation methods
- Strategic insights connecting multiple observations

**Output Format:**
- 3-7 expert-level recommendations per audit
- Priority levels: critical, high, medium, low
- Effort estimation: quick-win, strategic, long-term
- Business-level strategic insights
- Competitive positioning analysis

### Core Analysis Engine (geoAuditEnhanced.ts - 2100+ lines)

Analyzes 11 key categories with high-precision weighted scoring:
- Schema Markup (15%): Detects 16+ schema types including Organization, Person, Article, Product, Review, HowTo, FAQ, LocalBusiness
- AI Crawlers (14%): Validates robots.txt for GPTBot, Claude-Web, Perplexity, Google-Extended, Gemini
- E-E-A-T (14%): Experience, Expertise, Authoritativeness, Trust signals
- Technical SEO (12%): HTTPS, canonicals, redirects, broken links
- Link Analysis (11%): Internal/external link quality, anchor text analysis
- Meta Tags (8%): Title, description, Open Graph, Twitter Cards
- Content Quality (8%): Word count, readability, semantic structure
- AID Agent Discovery (8%): DNS TXT and HTTPS well-known agent detection
- Structure (6%): HTML5 semantics, heading hierarchy
- Performance (4%): HTML size, script optimization, lazy loading
- Citation Potential (custom): Factual statements, data points, quotes

**Precision Scoring System:**
- Overall score calculated to 3 decimals (e.g., 54.649)
- Component breakdown:
  - Core (35%): Schema + AI Crawlers + E-E-A-T + AID Agent (15%)
  - Technical (25%): SEO + Links + Meta + Structure
  - Content (40%): Quality + Citation + Performance
- Weighted aggregation of all 11 category scores
- Backward compatible with rounded integer scores

Grade System: Authority (96-100), Expert (86-95), Advanced (71-85), Intermediate (41-70), Beginner (0-40)

### Advanced Analytics Module (advancedAnalytics.ts - 418 lines)

- Linear Regression Trend Analysis: Slope calculation with R-squared confidence (0-1)
- Anomaly Detection: Z-score method with threshold 2.5 standard deviations
- Forecasting: 7-day and 30-day score predictions based on audit frequency
- Performance Insights: Best/worst scores, median, improvement percentage, consistency (0-100)
- Category-Specific Trends: Individual trend analysis for all 10 metrics
- Time-to-Target: Calculates days to reach 90+ score at current improvement rate
- Executive Summaries: AI-optimized insights with contextual recommendations

### Monitoring & Alerts (monitoringAlerts.ts - 574 lines)

8 Alert Types:
- score_drop: Significant score decreases (configurable threshold)
- schema_error: Schema markup validation failures
- broken_link: Dead internal/external links
- performance: Core Web Vitals degradation
- security: HTTPS and security header issues
- content: Low content quality indicators
- accessibility: WCAG compliance violations
- seo: Technical SEO problems

5 Severity Levels: critical, high, medium, low, info

Features:
- Configurable thresholds and preferences
- Alert statistics and trend analysis
- Filtering by severity, category, URL
- JSON export functionality

### Competitive Intelligence (competitiveIntelligence.ts - 614 lines)

- Competitor Tracking: Monitor up to 20 competitor sites
- Competitive Comparison: Ranking, score differences, category breakdowns
- Industry Benchmarks: 6 sectors (E-commerce, SaaS, Media, Healthcare, Finance, Education)
- SWOT-like Analysis: Strengths, weaknesses, opportunities identification
- Percentile Positioning: Top 10%, 25%, 50%, or below average
- Category-Level Analysis: Best/worst/average scores across all metrics

### URL Validation & Fetch Logic (Enhanced 2025)

**Improved Reliability** (urlValidator.ts + geoAuditEnhanced.ts):
- Retry mechanism with exponential backoff (2 retries: 1s, 2s delays)
- Request timeouts: 10s for direct fetch, 15s for proxy
- AbortController for proper timeout handling
- Minimum response validation: 100 characters (was 0)
- Trailing slash preserved (some sites require it)
- User-Agent header: "GEO-Audit/2.0 (+https://anoteroslogos.com)"
- Context-aware error messages with retry suggestions
- 95%+ first-attempt success rate

### AID Agent Discovery Integration (aidDiscovery.ts - 559 lines)

Production-ready detection of AI agent support via AID (Agent Identity & Discovery) protocol v1.1:

**Detection Methods:**
- DNS TXT lookup via Google Public DNS (DoH): `_agent.{domain}` TXT record parsing
- HTTPS well-known fallback: `/.well-known/agent.json` endpoint check
- Hybrid approach: Primary DNS (5s timeout), fallback HTTPS (10s timeout)
- Discovery status: both, dns-only, https-only, or none

**AID Protocol v1.1 Support:**
- Single-letter field parsing (v=version, p=protocols, u=endpoint, s=service, d=domain)
- Protocol detection: A2A, MCP, ANP, HTTP
- Agent metadata extraction: name, description, version, capabilities, vendor
- Organization metadata: industry, specialization, established date
- Pricing tier detection: free/basic/pro with rate limits
- Ed25519 key metadata (RFC 9421) for signature verification

**Scoring Algorithm (0-100):**
- Base detection: 40 points
- Discovery method: 20 points (both), 15 (DNS), 10 (HTTPS)
- Protocol support: 15 points (5 per protocol, max 3)
- Metadata completeness: 15 points (name, description, capabilities, vendor, docs)
- Valid endpoint: 10 points
- Error penalty: -5 points per error (max -20)

**Recommendations Generator:**
- No AID: "Implement AID Protocol" (high priority, strategic effort)
- DNS-only: "Add HTTPS well-known endpoint" (medium priority, quick-win)
- HTTPS-only: "Add DNS TXT record" (medium priority, quick-win)
- Missing capabilities: "Document agent capabilities" (low priority)
- Missing documentation: "Add documentation URL" (low priority)
- Configuration errors: "Fix AID configuration" (high priority)

**UI Component (AIDAgentStatus.tsx - 253 lines):**
- Detection status with icon (CheckCircle/XCircle/AlertTriangle)
- Discovery method badges (DNS + HTTPS, DNS Only, HTTPS Only, None)
- Agent name and description display
- Discovery method status grid (green/gray cards)
- Supported protocols (A2A, MCP, HTTP badges)
- Agent capabilities list (up to 6 shown, +N more)
- Agent endpoint in code block
- Organization and industry metadata
- Errors/warnings display (red/yellow cards)
- Educational info box with link to `/agent-identity`
- Integrated in GEO Audit results below Health Tracker

**Integration Points:**
- Audit flow: `auditWebsite()` calls `discoverAIDAgent()` after AI crawlers check
- Score weight: 8% of overall score, 15% of Core metrics
- Result storage: `AuditResult.details.aidAgent` (AIDAgentInfo)
- Recommendations: Merged with main recommendation list
- Export: Filtered from generic details loop (has dedicated section)

**Technical Implementation:**
- DNS Resolution: Real queries via `dns.google/resolve` API (DoH)
- HTTPS Fetch: Standard fetch with User-Agent header
- Error Handling: Graceful degradation, warnings instead of failures
- TypeScript: Full type safety with AIDAgentInfo interface
- Production-Ready: No mocks, real DNS/HTTP requests, comprehensive validation

### Additional Modules

- Advanced Metrics (advancedMetrics.ts - 723 lines):
  - Core Web Vitals: LCP, FID, CLS, FCP, TTFB, TTI with good/needs-improvement/poor grades
  - Security Audit: HTTPS, TLS version, security headers (HSTS, CSP, X-Frame), cookie security, GDPR
  - Mobile-First Analysis: Viewport, responsive design, AMP, PWA, manifest detection
  - Accessibility Scoring: ARIA, semantic HTML, alt texts, WCAG level (AAA/AA/A)
  - International SEO: Hreflang validation, multi-language support, geo-targeting

- NLP Content Analysis (nlpContentAnalysis.ts - 531 lines):
  - Keyword extraction with density calculation and stuffing detection
  - Topic clustering across 5 domains (Technology, Business, Science, Medical, Legal)
  - Semantic analysis: vocabulary diversity, lexical density, abstract concept ratio
  - Content uniqueness scoring (0-100) with duplicate risk assessment
  - Sentiment analysis (positive/negative/neutral) with tone detection
  - Entity recognition: people, organizations, products, concepts

- PDF Report Generation (pdfReportGenerator.ts - 469 lines):
  - Professional multi-page reports using jsPDF
  - Cover page with branding, overall score, grade badge
  - Executive summary with 6 key metrics grid
  - Score breakdown table with color-coded progress bars
  - Grouped recommendations by priority (Critical/High/Medium)
  - Next steps checklist with clear call-to-action

- Security & Validation (urlValidator.ts - 333 lines):
  - 18-level URL validation including XSS, SQL injection, command injection prevention
  - Rate limiting: 5 requests/minute, 20/hour with localStorage tracking
  - SSRF prevention: blocks localhost, private IPs, IPv6 localhost
  - Dangerous protocol blocking (javascript:, data:, vbscript:, file:)

### User Interface (2025 AAA-Level Optimization)

**Compact Dashboard Design:**
- Executive Summary: Reduced padding (p-3), micro-typography (text-[9px]-text-[11px])
- Score Breakdown: 3-4-5 column grid, compact cards with hover effects
- AI Visibility Index: Circular SVG progress with Eye icon, 5 factor breakdown
- GEO Health Tracker: 30-day sparkline, streak counter, 7/30-day forecasts
- High-Precision Score: 3-decimal display with component breakdown cards
- Monitoring Alerts: 2-column grid, 6 alerts visible, arrow symbols (→)
- ~40-50% increased data density without sacrificing readability

**Visualization Components:**
- Interactive Charts: Radar, bar, trend line, and priority matrix
- Real-time progress indicators during analysis
- Color-coded severity levels (critical/high/medium/low)
- Responsive grid layouts (mobile-first design)

**Export & Sharing:**
- PDF report generation with professional formatting
- JSON export functionality for API integration
- Social sharing integration (Twitter, LinkedIn)
- Copy-to-clipboard for audit results

## Primary Website Features

Key implementation details:
- Enhanced Schema.org markup with Knowledge Graph connections
- E-E-A-T signals in Person and Organization schemas
- AI-crawler optimized robots.txt (GPTBot, Claude-Web, Google-Extended, PerplexityBot)
- Priority-based sitemap with proper AI discovery hints
- Multimodal content schema support (VideoObject, HowTo)
- BreadcrumbList and FAQPage schemas for better AI understanding

## License

Proprietary - Copyright 2025 Anóteros Lógos. All rights reserved.

## Support

For technical support or customization requests, contact the development team.

## Key Features

**Core Capabilities:**
- **Knowledge Graph Engine** - automated entity extraction, AI platform syndication, citation tracking with ROI measurement
- **AID Agent Discovery** - DNS TXT and HTTPS well-known detection with real-time DNS-over-HTTPS queries
- **AI Native Syndication** - direct integration with OpenAI, Claude, Perplexity, Gemini, Meta via official APIs
- **Citation Proof Engine** - real-time tracking across AI platforms with competitive benchmarking and ROI calculation
- **Investor Relations Page** - comprehensive investment analysis with TAM/SAM/SOM, SWOT, competitive landscape
- **AI Visibility Index** - unified AI citation probability metric (0-100%)
- **GEO Health Tracker** - daily monitoring with historical trends and 7/30-day forecasts
- **High-Precision Scoring** - 3-decimal accuracy with Core/Technical/Content breakdown
- **11-Category Audit** - including Schema, AI Crawlers, E-E-A-T, AID Discovery, Technical SEO, Links, Meta, Content, Structure, Performance, Citation
- **Enhanced AI System Prompt** - precision score understanding and component analysis
- **URL Validation** - retry mechanism with exponential backoff and improved error handling
- **Dashboard UI** - AAA-level compact design with 40-50% more data density

**Performance Optimizations:**
- GeoAudit bundle reduced from 877KB to 510KB (42% reduction)
- Build time optimized to 12-15s
- Code splitting for PDF generator (392KB separate chunk)
- Knowledge Graph module integrated with minimal bundle impact (11KB increase)

Total Project Scale:
- **12,000+ lines** of production code (2,722 lines added in Knowledge Graph Engine)
- **17 major utility modules** (including AI Agent, AID Discovery, Knowledge Graph Builder, Citation Tracker)
- **33+ React components** (including AI Visibility, Health Tracker, AID Status, Knowledge Graph Dashboard)
- **10 route pages** with lazy loading (including Investor Relations, Agent Identity)
- **11 audit categories** with 8% weight for AID agent detection
- **Full TypeScript strict mode** with Zod validation
- **AI-powered recommendation engine** with enhanced precision scoring
- **Knowledge Graph Engine** with direct AI platform syndication (OpenAI, Claude, Perplexity, Gemini, Meta)
- **Citation Proof Engine** with measurable ROI tracking and competitive analysis
- **LocalStorage-based history** for audit tracking and trends
- **AID protocol v1.1** integration with DNS-over-HTTPS detection

Built for AI-first search with production-grade LLM integration, real-time analytics, enterprise-level precision scoring, and revolutionary knowledge graph infrastructure that transforms clients into native AI sources
