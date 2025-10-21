# Anóteros Lógos - GEO Agency Website

A modern, premium website for **Anóteros Lógos**, a Generative Engine Optimization (GEO) agency. Built with React, TypeScript, Vite, and Tailwind CSS.

## 🚀 Features

- **Modern Design System**: Premium dark theme with subtle animations and gradients
- **Fully Responsive**: Mobile-first design optimized for all screen sizes
- **SEO & GEO Optimized**: 
  - Comprehensive meta tags (Open Graph, Twitter Cards)
  - Structured data with Schema.org JSON-LD
  - AI-crawler friendly (robots.txt supporting 15+ AI crawlers)
  - Complete sitemap.xml
- **Accessible**: WCAG 2.1 AA compliant with proper ARIA labels and semantic HTML
- **Performance**: Optimized build with code splitting and lazy loading
- **Type-Safe**: Full TypeScript implementation

## 🏗️ Tech Stack

- **React 19.2** - UI library
- **TypeScript 5.8** - Type safety
- **Vite 6.2** - Build tool and dev server
- **Tailwind CSS 3.4** - Utility-first CSS framework
- **ESLint** - Code quality and consistency

## 📦 Installation

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

## 🔧 Environment Variables

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

## 📁 Project Structure

```
F:\air\
├── components/          # React components
│   ├── AnimatedSection.tsx
│   ├── ClientProfile.tsx
│   ├── DigitalBackground.tsx
│   ├── FAQ.tsx
│   ├── FinalCTA.tsx
│   ├── Footer.tsx
│   ├── Header.tsx
│   ├── Hero.tsx
│   ├── Icons.tsx
│   ├── Modal.tsx
│   ├── NicosiaMethod.tsx
│   ├── Philosophy.tsx
│   ├── Stats.tsx
│   └── TheShift.tsx
├── public/              # Static assets
│   ├── robots.txt       # AI & search crawler configuration
│   ├── sitemap.xml      # Site structure for search engines
│   └── logo.png         # Brand logo
├── App.tsx              # Main application component
├── index.tsx            # Application entry point
├── index.css            # Global styles and Tailwind imports
├── tailwind.config.js   # Tailwind configuration
├── tsconfig.json        # TypeScript configuration
├── vite.config.ts       # Vite configuration
├── package.json         # Dependencies and scripts
└── README.md            # This file
```

## 🎨 Component Overview

### Core Sections
- **Hero**: Main landing section with CTA
- **TheShift**: Problem statement (SEO → GEO transition)
- **Philosophy**: Solution overview (Extract → Structure → Deploy)
- **Stats**: Social proof metrics
- **NicosiaMethod™**: Detailed 3-phase process
- **ClientProfile**: Target audience segments
- **FAQ**: 12 comprehensive Q&A items
- **FinalCTA**: Conversion section

### Utilities
- **Header**: Sticky navigation with smooth scroll
- **Footer**: Site footer with navigation and social links
- **Modal**: Contact form with validation
- **AnimatedSection**: Intersection Observer based animations

## 🌐 SEO & GEO Features

### Meta Tags
- Complete Open Graph tags for social sharing
- Twitter Card support
- Dynamic meta descriptions
- Canonical URLs

### Structured Data (Schema.org)
- Organization schema
- WebSite schema with search action
- WebPage schema for each page
- Service schema for GEO services
- FAQPage schema with all Q&A
- BreadcrumbList for navigation

### AI Crawler Support
Configured in `robots.txt` for:
- GPTBot (OpenAI)
- ChatGPT-User
- Claude-Web (Anthropic)
- PerplexityBot
- Google-Extended
- Gemini (Google Bard)
- And 10+ more AI crawlers

## 🚢 Deployment

### Vercel (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Netlify
```bash
# Build command
npm run build

# Publish directory
dist
```

### Traditional Hosting
```bash
# Build
npm run build

# Upload dist/ folder to your hosting
```

## 📝 Customization

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

## ✅ Pre-Production Checklist

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

## 🐛 Troubleshooting

### Build Errors
```bash
# Clear cache and reinstall
rm -rf node_modules dist
npm install
npm run build
```

### TypeScript Errors
```bash
# Check types without building
npm run typecheck
```

### Lint Issues
```bash
# Auto-fix where possible
npm run lint -- --fix
```

## 📈 Performance

Current production build:
- **HTML**: 11.83 kB (gzip: 3.03 kB)
- **CSS**: 39.57 kB (gzip: 6.76 kB)
- **JS (vendor)**: 11.18 kB (gzip: 3.95 kB)
- **JS (main)**: 247.65 kB (gzip: 72.71 kB)
- **Build time**: ~3s

## 📄 License

Proprietary - © 2025 Anóteros Lógos. All rights reserved.

## 🤝 Support

For technical support or customization requests, contact the development team.

---

**Built with ❤️ for the AI-first era**
