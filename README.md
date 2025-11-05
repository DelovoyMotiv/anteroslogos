# Anóteros Lógos - Generative Engine Optimization Platform

Enterprise-grade web platform for AI-powered search optimization and real-time GEO analytics.

**Production URL:** https://anoteroslogos.com

## Architecture

Modern React 19 SPA with TypeScript strict mode, serverless API architecture, and comprehensive monitoring capabilities.

### Core Stack

- **Frontend**: React 19.2, TypeScript 5.8, Vite 6.2
- **Routing**: React Router 7.9.5 with lazy loading
- **Styling**: Tailwind CSS 3.4+ with custom design system
- **Data Visualization**: Recharts 3.3
- **AI Integration**: OpenRouter API with LLM support
- **Validation**: Zod 3.x for runtime type checking
- **Deployment**: Vercel Edge Functions

### Technical Capabilities

**Performance:**
- Route-based code splitting with React.lazy
- LCP under 2.5s, CLS under 0.1, INP under 200ms
- Total bundle: ~1.4 MB (~410 kB gzipped)
- Build time: 13-15s in CI/CD

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
│   ├── AnalysisProgress.tsx
│   ├── ExecutiveSummary.tsx
│   ├── Header.tsx
│   ├── Footer.tsx
│   ├── Modal.tsx
│   ├── RealtimeMonitorPanel.tsx
│   └── SEOHead.tsx
├── pages/
│   ├── HomePage.tsx
│   ├── GeoAuditPage.tsx           # GEO Audit Tool with analytics
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
│   └── supabase.ts
├── utils/
│   ├── ai/
│   │   ├── openrouter.ts          # LLM integration
│   │   ├── geoMarketologAgent.ts  # AI recommendations
│   │   └── realtimeMonitor.ts
│   ├── geoAuditEnhanced.ts        # Audit engine (2000+ lines)
│   ├── advancedAnalytics.ts       # Trend analysis (418 lines)
│   ├── monitoringAlerts.ts        # Alert system (574 lines)
│   ├── competitiveIntelligence.ts # Benchmarking (614 lines)
│   ├── nlpContentAnalysis.ts      # NLP analysis (531 lines)
│   ├── pdfReportGenerator.ts      # PDF export (469 lines)
│   └── urlValidator.ts            # Security validation (333 lines)
├── data/
│   ├── blogPosts.ts
│   └── geoKnowledgeBase.ts
├── public/
│   ├── robots.txt
│   ├── sitemap.xml
│   ├── manifest.json
│   └── .well-known/
│       ├── ai.txt
│       └── security.txt
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql
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
- JS (GeoAudit): 877.42 kB (gzip: 263.06 kB)
- JS (blog): 163.35 kB (gzip: 47.75 kB)
- JS (home): 73.53 kB (gzip: 22.14 kB)
- Total Bundle: approximately 1.4 MB (gzip: approximately 410 kB)
- Build Time: approximately 13-15s on CI/CD

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

## GEO Audit Tool

Production-ready website analysis platform with advanced analytics capabilities and AI-powered recommendations.

### AI-Powered Recommendations (NEW)

**GEO Marketolog AI Agent** - Elite AI strategist integrated into the audit process:

**Technology Stack:**
- OpenRouter API for LLM access
- Current Model: MiniMax M2 (free tier) with multilingual support
- Graceful fallback to default recommendations if API unavailable
- 30-second timeout protection

**Expertise Areas:**
- AI/LLM architecture (ChatGPT, Claude, Gemini, Perplexity citation mechanics)
- Semantic web technologies (Schema.org ontologies, knowledge graphs)
- Information retrieval (TF-IDF, vector embeddings, RAG systems)
- E-E-A-T signals and authority patterns
- Citation probability optimization

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

### Core Analysis Engine (geoAuditEnhanced.ts - 2000+ lines)

Analyzes 10 key categories with weighted scoring:
- Schema Markup (16%): Detects 16+ schema types including Organization, Person, Article, Product, Review, HowTo, FAQ, LocalBusiness
- AI Crawlers (15%): Validates robots.txt for GPTBot, Claude-Web, Perplexity, Google-Extended, Gemini
- E-E-A-T (15%): Experience, Expertise, Authoritativeness, Trust signals
- Technical SEO (13%): HTTPS, canonicals, redirects, broken links
- Link Analysis (12%): Internal/external link quality, anchor text analysis
- Meta Tags (9%): Title, description, Open Graph, Twitter Cards
- Content Quality (9%): Word count, readability, semantic structure
- Structure (6%): HTML5 semantics, heading hierarchy
- Performance (5%): HTML size, script optimization, lazy loading
- Citation Potential (custom): Factual statements, data points, quotes

Grade System: Authority (96-100), Expert (86-95), Advanced (71-85), Intermediate (41-70), Beginner (0-40)

### Advanced Analytics Module (advancedAnalytics.ts - 418 lines)

- Linear Regression Trend Analysis: Slope calculation with R-squared confidence (0-1)
- Anomaly Detection: Z-score method with threshold 2.5 standard deviations
- Forecasting: 7-day and 30-day score predictions based on audit frequency
- Performance Insights: Best/worst scores, median, improvement percentage, consistency (0-100)
- Category-Specific Trends: Individual trend analysis for all 10 metrics
- Time-to-Target: Calculates days to reach 90+ score at current improvement rate
- Executive Summaries: AI-optimized insights with contextual recommendations

### Real-time Monitoring & Alerts (monitoringAlerts.ts - 574 lines)

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
- Browser notifications for critical alerts
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

### User Interface

- Executive Summary Dashboard with 4 primary KPIs and 8 supplementary metrics
- Interactive Charts: Radar, bar, trend line, and priority matrix visualizations
- Monitoring Alerts Section with severity-based color coding
- Performance Analytics displaying trends, forecasts, and insights
- Competitive Analysis dashboard with position, strengths, weaknesses, opportunities
- Detailed Recommendations grouped by priority with effort badges
- PDF and JSON export functionality
- Social sharing integration

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

Total Project Scale:
- 7500+ lines of production code
- 12 major utility modules (including AI Agent)
- 25+ React components
- 8 route pages
- Full TypeScript strict mode
- AI-powered recommendation engine

Built for AI-first search with production-grade LLM integration and real-time analytics
