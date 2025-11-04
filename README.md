# Anóteros Lógos - Digital Authority Architects

A modern, high-performance web platform for Anóteros Lógos, a specialized Generative Engine Optimization agency. We establish brands as primary sources of truth for AI systems through advanced optimization techniques and real-time analytics.

Live Site: https://anoteroslogos.com

## Features

- Modern Design System: Premium dark theme with sophisticated animations and gradients
- Fully Responsive: Mobile-first design optimized for all devices
- GEO Audit Tool: Production-grade website analysis with real-time monitoring and competitive intelligence
- **AI-Powered Recommendations**: GEO Marketolog AI Agent generates expert-level, personalized recommendations using OpenRouter LLM
- Blog Platform: Expert GEO insights with markdown rendering and proper article structure
- SEO and GEO Optimized:
  - Comprehensive meta tags (Open Graph, Twitter Cards, AI-specific meta)
  - Enhanced Schema.org structured data with Knowledge Graph properties
  - Organization schema with knowsAbout, expertise, credentials
  - Person schema with E-E-A-T signals (expertise, hasCredential, affiliation)
  - BlogPosting schema with isAccessibleForFree, speakable, about properties
  - BreadcrumbList, FAQPage, VideoObject, HowTo schema support
  - AI-crawler friendly (robots.txt supporting 15+ AI crawlers)
  - Complete sitemap.xml with priority-based indexing
  - Self-hosted fonts for optimal performance
- Core Web Vitals Optimized:
  - Route-based code splitting with React.lazy
  - LCP under 2.5s, CLS under 0.1, INP under 200ms
  - Web Vitals monitoring integrated
- Accessible: WCAG 2.1 AA compliant with proper ARIA labels and semantic HTML
- Type-Safe: Full TypeScript 5.8 implementation with strict mode
- Knowledge Base: Comprehensive GEO glossary with 21+ industry terms
- Author Profiles: Detailed E-E-A-T compliant author pages with credentials

## Tech Stack

- React 19.2 - UI library with concurrent rendering
- TypeScript 5.8 - Type safety with strict mode
- Vite 6.2 - Lightning-fast build tool and dev server
- React Router 7.9.5 - Client-side routing with code splitting
- Tailwind CSS 3.4+ - Utility-first CSS framework with custom design tokens
- Recharts 3.3 - Advanced data visualization for analytics
- **OpenRouter API** - AI-powered recommendation engine with LLM integration
- jsPDF 3.0.3 - PDF report generation
- react-markdown - Markdown rendering for blog articles
- remark-gfm - GitHub Flavored Markdown support
- web-vitals 5.1.0 - Core Web Vitals monitoring
- Lucide React 0.552.0 - Modern icon library
- ESLint 9+ - Code quality and consistency

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

# API Configuration (when ready)
# VITE_API_URL=https://api.yoursite.com
# VITE_CONTACT_FORM_ENDPOINT=/api/contact

# Analytics (optional)
# VITE_GA_TRACKING_ID=G-XXXXXXXXXX
```

## Project Structure

```
F:\air\
├── src/
│   ├── components/          # React components
│   │   ├── AnimatedSection.tsx
│   │   ├── ClientProfile.tsx
│   │   ├── CookieConsent.tsx
│   │   ├── DigitalBackground.tsx
│   │   ├── ExecutiveSummary.tsx    # Audit dashboard KPI cards
│   │   ├── FAQ.tsx
│   │   ├── FinalCTA.tsx
│   │   ├── Footer.tsx
│   │   ├── Header.tsx
│   │   ├── Hero.tsx
│   │   ├── Icons.tsx
│   │   ├── Insights.tsx
│   │   ├── Modal.tsx
│   │   ├── NicosiaMethod.tsx
│   │   ├── NLPInsights.tsx         # NLP content analysis display
│   │   ├── Philosophy.tsx
│   │   ├── SkeletonLoader.tsx      # Loading state animations
│   │   ├── Stats.tsx
│   │   ├── Team.tsx
│   │   ├── TheShift.tsx
│   │   ├── Tooltip.tsx             # Contextual help system
│   │   └── charts/                 # Data visualization
│   │       ├── CategoryBarChart.tsx
│   │       ├── PriorityMatrix.tsx
│   │       ├── ScoreRadarChart.tsx
│   │       └── ScoreTrendChart.tsx
│   ├── pages/               # Route pages (lazy-loaded)
│   │   ├── HomePage.tsx     # Main landing page
│   │   ├── GeoAuditPage.tsx # GEO Audit Tool with analytics
│   │   ├── Blog.tsx         # Blog listing with categories
│   │   ├── BlogPost.tsx     # Individual article page
│   │   ├── Author.tsx       # Author profile with E-E-A-T
│   │   ├── KnowledgeBasePage.tsx  # GEO glossary (21+ terms)
│   │   ├── GeoVsSeoPage.tsx # Educational comparison
│   │   ├── PrivacyPolicy.tsx
│   │   └── CookiePolicy.tsx
│   ├── data/                # Content and data
│   │   ├── blogPosts.ts     # Blog articles database
│   │   ├── geoKnowledgeBase.ts  # Knowledge base terms
│   │   └── teamMembers.ts   # Team information
│   ├── utils/               # Utilities and services
│   │   ├── ai/                     # AI Agent modules
│   │   │   ├── openrouter.ts       # OpenRouter API client with LLM integration
│   │   │   └── geoMarketologAgent.ts  # AI recommendation engine
│   │   ├── advancedAnalytics.ts    # Trend analysis, regression, forecasting
│   │   ├── advancedMetrics.ts      # Core Web Vitals, security audit
│   │   ├── auditHistory.ts         # Historical performance tracking
│   │   ├── competitiveIntelligence.ts  # Competitor analysis
│   │   ├── geoAuditEnhanced.ts     # Main audit engine (2000+ lines, AI-integrated)
│   │   ├── monitoringAlerts.ts     # Real-time alerts system
│   │   ├── nlpContentAnalysis.ts   # Natural language processing
│   │   ├── pdfReportGenerator.ts   # PDF export functionality
│   │   ├── urlValidator.ts         # Security validation, rate limiting
│   │   ├── schemas.ts       # Schema.org structured data
│   │   └── analytics.ts     # Web vitals monitoring
│   ├── App.tsx              # Main application with routing
│   ├── main.tsx             # Application entry point
│   ├── index.css            # Global styles, Tailwind, and custom fonts
│   └── vite-env.d.ts        # Vite type definitions
├── public/                  # Static assets
│   ├── robots.txt           # AI and search crawler configuration (15+ crawlers)
│   ├── sitemap.xml          # Priority-based site structure
│   ├── favicon.svg          # Brand favicon
│   ├── manifest.json        # Web app manifest
│   └── privacy-policy.pdf   # Privacy policy document
├── index.html               # Main HTML with enhanced structured data
├── tailwind.config.js       # Tailwind with custom animations
├── tsconfig.json            # TypeScript strict configuration
├── vite.config.ts           # Vite with optimizations
├── package.json             # Dependencies and scripts
├── vercel.json              # Vercel deployment config
└── README.md                # Project documentation
```

## Component Overview

### Pages (Route Components)
- HomePage: Main landing page with all core sections
- GeoAuditPage: Production-grade website analysis tool with real-time analytics
- Blog: Article listing with category filters and featured posts
- BlogPost: Individual article page with markdown rendering, reading progress, share functionality
- Author: Author profile pages with credentials, expertise, publications
- KnowledgeBasePage: Educational GEO glossary with 21+ industry terms and definitions
- GeoVsSeoPage: Comprehensive comparison page explaining the evolution from SEO to GEO
- PrivacyPolicy: Privacy policy and data handling information
- CookiePolicy: Cookie usage and consent information

### Core Sections (Home Page)
- Hero: Main landing with animated CTA and value proposition
- TheShift: Problem statement showcasing the SEO to GEO paradigm shift
- Philosophy: Solution overview with Extract, Structure, Deploy framework
- Stats: Social proof metrics with animated counters
- NicosiaMethod: Detailed 3-phase process (Intelligence, Authority, Amplification)
- ClientProfile: Target audience segments with hover states
- Insights: Latest research and industry insights
- Team: Team member profiles with expertise areas
- FAQ: 12 comprehensive Q&A items with structured data
- FinalCTA: High-conversion section with contact form modal

### Utilities and Components
- Header: Sticky navigation with smooth scroll and active states
- Footer: Site footer with navigation links, social links, and legal info
- Modal: Contact form with validation and accessibility features
- AnimatedSection: Intersection Observer wrapper for scroll-triggered animations
- DigitalBackground: Animated particle/grid background effect
- CookieConsent: GDPR-compliant cookie consent banner
- ExecutiveSummary: KPI dashboard with 4 primary and 8 secondary metrics
- SkeletonLoader: Loading states with 6 variants and gradient animation
- Tooltip: Context-aware help system with 4 positions and auto-adjustment
- Charts: Radar, bar, trend, and priority matrix visualizations using Recharts

## SEO and GEO Features

### Meta Tags
- Complete Open Graph tags for social sharing
- Twitter Card support
- Dynamic meta descriptions
- Canonical URLs

### Structured Data (Schema.org)
- Organization schema with Knowledge Graph properties (knowsAbout, about, sameAs, founder)
- Person schema with E-E-A-T signals (expertise, knowsAbout, hasCredential, affiliation)
- BlogPosting schema with AI-optimized properties (isAccessibleForFree, speakable, about)
- Article schema for knowledge base content
- WebSite schema with search action
- Service schema for GEO services
- FAQPage schema with all questions and answers
- BreadcrumbList for site navigation hierarchy
- VideoObject schema prepared for multimodal content
- HowTo schema for tutorial content

### AI Crawler Support
Configured in `robots.txt` for:
- GPTBot (OpenAI)
- ChatGPT-User
- Claude-Web (Anthropic)
- PerplexityBot
- Google-Extended
- Gemini (Google Bard)
- And 10+ more AI crawlers

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

Built for the AI-first era with cutting-edge LLM integration
