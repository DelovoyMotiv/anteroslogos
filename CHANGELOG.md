# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2025-11-05

### Added
- **GEO Audit Tool**: Production-grade website analysis with 10 weighted categories
  - Schema Markup (16%), AI Crawlers (15%), E-E-A-T (15%), Technical SEO (13%)
  - Link Analysis (12%), Meta Tags (9%), Content Quality (9%), Structure (6%)
  - Performance (5%), Citation Potential (custom)
  - Grade system: Authority (96-100), Expert (86-95), Advanced (71-85), Intermediate (41-70), Beginner (0-40)
- **AI-Powered Recommendations**: GEO Marketolog AI Agent via OpenRouter
  - MiniMax M2 model with multilingual support
  - 3-7 expert recommendations per audit with priority/effort levels
  - Root cause analysis and competitive context
  - 30-second timeout with graceful fallback
- **A2A Protocol API**: JSON-RPC 2.0 endpoint for AI agent integration
  - 2,361 lines across 5 components (protocol, adapter, endpoint, queue, cache)
  - Support for Perplexity, ChatGPT, Claude, Gemini, Grok
  - 4-tier rate limiting (free: 10/min, basic: 60/min, pro: 300/min, enterprise: 1000/min)
  - 1-hour TTL caching with ETag/304 support
  - Semantic extraction: entities, topics, keywords, industry detection
- **Advanced Analytics**: Trend analysis and forecasting (418 lines)
  - Linear regression with R-squared confidence (0-1)
  - Anomaly detection using Z-score (2.5 SD threshold)
  - 7-day and 30-day score predictions
  - Time-to-target calculation for 90+ score
- **Real-time Monitoring & Alerts** (574 lines)
  - 8 alert types: score_drop, schema_error, broken_link, performance, security, content, accessibility, seo
  - 5 severity levels with configurable thresholds
  - Browser notifications for critical alerts
  - Alert trend analysis and filtering
- **Competitive Intelligence** (614 lines)
  - Track up to 20 competitors
  - 6 industry benchmarks (E-commerce, SaaS, Media, Healthcare, Finance, Education)
  - SWOT-like analysis with percentile positioning
  - Category-level competitive breakdown
- **NLP Content Analysis** (531 lines)
  - Keyword extraction with density calculation
  - Topic clustering: Technology, Business, Science, Medical, Legal
  - Sentiment analysis with tone detection
  - Entity recognition and uniqueness scoring (0-100)
- **Advanced Metrics Module** (723 lines)
  - Core Web Vitals: LCP, FID, CLS, FCP, TTFB, TTI
  - Security audit: HTTPS, TLS, headers (HSTS, CSP, X-Frame)
  - Mobile-first analysis: viewport, responsive, AMP, PWA
  - Accessibility: ARIA, WCAG AAA/AA/A compliance
  - International SEO: hreflang, multi-language
- **Multi-format Export**
  - PDF reports with charts (469 lines, jsPDF)
  - JSON, CSV, HTML, Markdown formats
  - Executive summary with KPI grid
- **Security & Validation** (333 lines)
  - 18-level URL validation
  - XSS, SQL injection, command injection prevention
  - SSRF protection: blocks localhost, private IPs
  - Rate limiting: 5/min, 20/hour (localStorage)
  - Protocol blocking: javascript:, data:, vbscript:, file:

### Changed
- Migrated to React 19.2 with concurrent rendering
- Upgraded to TypeScript 5.8 with strict mode
- Optimized bundle: ~1.4 MB total (~410 kB gzipped)
- Improved Core Web Vitals: LCP < 2.5s, CLS < 0.1, INP < 200ms
- Updated schema.org with Knowledge Graph properties
- Enhanced robots.txt with 15+ AI crawlers
- Streamlined README (removed marketing, added engineering focus)
- Removed Insights & Research section from homepage

### Fixed
- Build errors in auditStorage.ts (type mismatches, JSON serialization)
- Production content issues (removed emojis, AI clichés from GeoAuditPage)
- Grade mapping for database (Authority → A+, Expert → A, etc.)
- Schema detection logic for new AuditResult structure

### Security
- WCAG 2.1 AA compliance verified
- SSRF protection active
- Dangerous protocol blocking
- API key format validation (regex-based)
- Security headers configured

## [1.0.0] - 2025-01-30

### Added
- Initial platform launch
- Homepage with core sections (Hero, Philosophy, Nicosia Method, Team, FAQ)
- Blog platform with markdown rendering
- Author profiles with E-E-A-T signals
- Knowledge Base with GEO glossary (21+ terms)
- GEO vs SEO comparison page
- Privacy Policy and Cookie Policy pages
- AI-optimized robots.txt and sitemap.xml
- Share functionality for blog posts
- Reading progress indicator
- Cookie consent banner (GDPR compliant)
- Enhanced Schema.org markup

### Infrastructure
- React 18 + TypeScript 5.3
- Tailwind CSS 3.4 with custom design system
- Vite 5 build system
- React Router 6 for client-side routing
- Vercel deployment

### Changed
- Updated README.md with project overview
- Enhanced .gitignore for production files only
- Improved Schema.org structures for AI systems

### Removed
- Internal documentation and reports
- Audit analysis files
- Implementation summaries
- Deployment scripts
- Test files
- Temporary metadata files

---

## Roadmap

### Phase 2 - WebSocket Streaming (Planned Q1 2026)
- Real-time progress updates for audits
- Subscription management
- WebSocket server endpoint

### Phase 3 - Async Job Processing (Planned Q1 2026)
- Queue integration with audit engine
- Job status tracking API
- Webhook callbacks

### Phase 4 - Advanced Insights (Planned Q2 2026)
- Global insights aggregation
- Industry benchmarking with percentiles
- Trend analysis endpoints

### Phase 5 - Production Hardening (Planned Q2 2026)
- Replace in-memory storage with Redis
- Distributed tracing (OpenTelemetry)
- Monitoring & alerting (Sentry)
- API key management UI
- Developer portal

---

## Technical Stats (v2.0.0)

**Codebase:**
- 7,500+ lines of production code
- 12 major utility modules
- 25+ React components
- 8 route pages
- Full TypeScript strict mode

**Performance:**
- Build time: 13-15s
- LCP: < 2.5s
- FID/INP: < 200ms
- CLS: < 0.1

**Security:**
- WCAG 2.1 AA compliant
- 18-level URL validation
- Rate limiting active
- SSRF protection enabled
