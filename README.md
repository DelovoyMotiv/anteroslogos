# Anóteros Lógos - Digital Authority Architects

A modern, high-performance website for Anóteros Lógos, a specialized Generative Engine Optimization (GEO) agency. We establish brands as primary sources of truth for AI systems.

Live Site: https://anoteroslogos.com

## Features

- Modern Design System: Premium dark theme with sophisticated animations and gradients
- Fully Responsive: Mobile-first design optimized for all devices
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

- React 18.3.1 - UI library with concurrent rendering
- TypeScript 5.8 - Type safety with strict mode
- Vite 6.0.11 - Lightning-fast build tool and dev server
- React Router 7.1.3 - Client-side routing with code splitting
- Tailwind CSS 3.4+ - Utility-first CSS framework with custom design tokens
- react-markdown - Markdown rendering for blog articles
- remark-gfm - GitHub Flavored Markdown support
- web-vitals 4.2.4 - Core Web Vitals monitoring
- Lucide React 0.469.0 - Modern icon library
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
│   │   ├── FAQ.tsx
│   │   ├── FinalCTA.tsx
│   │   ├── Footer.tsx
│   │   ├── Header.tsx
│   │   ├── Hero.tsx
│   │   ├── Icons.tsx
│   │   ├── Insights.tsx
│   │   ├── Modal.tsx
│   │   ├── NicosiaMethod.tsx
│   │   ├── Philosophy.tsx
│   │   ├── Stats.tsx
│   │   ├── Team.tsx
│   │   └── TheShift.tsx
│   ├── pages/               # Route pages (lazy-loaded)
│   │   ├── HomePage.tsx     # Main landing page
│   │   ├── Blog.tsx         # Blog listing with categories
│   │   ├── BlogPost.tsx     # Individual article page with markdown rendering
│   │   ├── Author.tsx       # Author profile with E-E-A-T signals
│   │   ├── KnowledgeBasePage.tsx  # GEO glossary (21+ terms)
│   │   ├── GeoVsSeoPage.tsx # Educational comparison page
│   │   ├── PrivacyPolicy.tsx
│   │   └── CookiePolicy.tsx
│   ├── data/                # Content and data
│   │   ├── blogPosts.ts     # Blog articles database
│   │   ├── geoKnowledgeBase.ts  # Knowledge base terms
│   │   └── teamMembers.ts   # Team information
│   ├── utils/               # Utilities
│   │   ├── schemas.ts       # Schema.org structured data generators
│   │   └── analytics.ts     # Web vitals and analytics
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

### Utilities
- Header: Sticky navigation with smooth scroll and active states
- Footer: Site footer with navigation links, social links, and legal info
- Modal: Contact form with validation and accessibility features
- AnimatedSection: Intersection Observer wrapper for scroll-triggered animations
- DigitalBackground: Animated particle/grid background effect
- CookieConsent: GDPR-compliant cookie consent banner

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
- CSS: 58.26 kB (gzip: 9.05 kB)
- JS (main): 183.59 kB (gzip: 58.35 kB)
- JS (blog): 163.75 kB (gzip: 47.75 kB)
- JS (home): 73.53 kB (gzip: 22.14 kB)
- Total Bundle: approximately 500 kB (gzip: approximately 142 kB)
- Build Time: approximately 5-6s on CI/CD

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

## GEO Implementation

Key features implemented:
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

Built for the AI-first era
