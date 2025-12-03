# Production API Integration Guide

## Overview

The AAA-Level features currently use **simulation data** for demonstration purposes. This document provides implementation guides for integrating real production APIs.

## ⚠️ Current Status

| Feature | Status | Production Ready |
|---------|--------|------------------|
| AI Citation Tracker™ | SIMULATION | ❌ Requires API integration |
| Predictive GEO Score™ | REAL (uses audit history) | ✅ Production ready |
| AI Schema Generator | REAL (uses OpenRouter API) | ✅ Production ready |
| Real-time GEO Monitor™ | SIMULATION | ❌ Requires API integration |

---

## 1. AI Citation Tracker™ Integration

### Current Implementation
- **File**: `utils/ai/citationTracker.ts`
- **Method**: `detectCitations()`
- **Status**: Simulated citation data

### Production Options

#### Option A: Direct AI System APIs (Recommended)

**OpenAI API (ChatGPT)**
```typescript
// Requires: OpenAI Enterprise API access
import OpenAI from 'openai';

async function trackChatGPTCitations(domain: string): Promise<CitationSource[]> {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
  
  // Query OpenAI's usage logs API (enterprise only)
  const logs = await openai.usage.completions({
    date: new Date().toISOString().split('T')[0],
  });
  
  // Filter logs for citations mentioning your domain
  return logs.data
    .filter(log => log.content.includes(domain))
    .map(log => ({
      system: 'ChatGPT',
      timestamp: log.timestamp,
      query: log.prompt,
      citedURL: extractURL(log.content, domain),
      context: log.content,
      confidence: calculateConfidence(log),
    }));
}
```

**Anthropic API (Claude)**
```typescript
import Anthropic from '@anthropic-ai/sdk';

async function trackClaudeCitations(domain: string): Promise<CitationSource[]> {
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });
  
  // Monitor Claude API logs
  // Requires: Enterprise plan with log access
  const citations = await anthropic.messages.list({
    search: domain,
    limit: 100,
  });
  
  return parseClaudeCitations(citations, domain);
}
```

**Perplexity API**
```typescript
async function trackPerplexityCitations(domain: string): Promise<CitationSource[]> {
  const response = await fetch('https://api.perplexity.ai/search', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: `site:${domain}`,
      citations: true,
    }),
  });
  
  const data = await response.json();
  return parseCitations(data);
}
```

#### Option B: Web Scraping (Legal Compliance Required)

⚠️ **LEGAL WARNING**: Respect robots.txt and Terms of Service

```typescript
import puppeteer from 'puppeteer';

async function scrapeAICitations(domain: string): Promise<CitationSource[]> {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  // Search for domain mentions in AI responses
  const searches = [
    `site:chatgpt.com ${domain}`,
    `site:claude.ai ${domain}`,
    `site:perplexity.ai ${domain}`,
  ];
  
  const citations: CitationSource[] = [];
  
  for (const search of searches) {
    await page.goto(`https://www.google.com/search?q=${encodeURIComponent(search)}`);
    const results = await page.evaluate(() => {
      // Extract search results
      return Array.from(document.querySelectorAll('.g')).map(el => ({
        title: el.querySelector('h3')?.textContent,
        url: el.querySelector('a')?.href,
        snippet: el.querySelector('.VwiC3b')?.textContent,
      }));
    });
    
    citations.push(...parseScrapeResults(results));
  }
  
  await browser.close();
  return citations;
}
```

#### Option C: Third-Party Services (Easiest)

**BrightData Citation Monitoring**
```typescript
async function trackWithBrightData(domain: string): Promise<CitationSource[]> {
  const response = await fetch('https://api.brightdata.com/datasets/ai_citations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.BRIGHTDATA_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      domain,
      timeRange: '30d',
      systems: ['chatgpt', 'claude', 'gemini', 'perplexity'],
    }),
  });
  
  return await response.json();
}
```

### Implementation Steps

1. Choose integration option (API/Scraping/Third-party)
2. Replace `detectCitations()` in `utils/ai/citationTracker.ts`
3. Set up API keys in `.env`:
   ```env
   OPENAI_API_KEY=sk-...
   ANTHROPIC_API_KEY=sk-ant-...
   PERPLEXITY_API_KEY=pplx-...
   BRIGHTDATA_API_KEY=...
   ```
4. Remove simulation code and warnings
5. Test with real domain
6. Monitor API usage and costs

---

## 2. Real-time GEO Monitor™ Integration

### Current Implementation
- **File**: `utils/ai/realtimeMonitor.ts`
- **Methods**: `getCurrentHealth()`, `checkUptime()`, `getCrawlerActivity()`
- **Status**: Simulated monitoring data

### Production Implementation

#### A. Schema Validation (REAL API)

```typescript
async function validateRealSchema(url: string): Promise<boolean> {
  // Option 1: Google Rich Results Test API
  const response = await fetch('https://searchconsole.googleapis.com/v1/urlTestingTools/richResults:run', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.GOOGLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url }),
  });
  
  const result = await response.json();
  return result.richResultsResult.richResultsStatus === 'VALID';
}

// Option 2: Schema.org Validator
async function validateWithSchemaOrg(html: string): Promise<boolean> {
  const schemas = extractJSONLD(html);
  
  for (const schema of schemas) {
    const validation = await fetch('https://validator.schema.org/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ schema }),
    });
    
    if (!validation.ok) return false;
  }
  
  return true;
}
```

#### B. Uptime Monitoring (UptimeRobot API)

```typescript
async function getRealUptime(domain: string): Promise<UptimeStatus> {
  const response = await fetch('https://api.uptimerobot.com/v2/getMonitors', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: process.env.UPTIMEROBOT_API_KEY,
      format: 'json',
      logs: 1,
    }),
  });
  
  const data = await response.json();
  const monitor = data.monitors.find((m: any) => m.url.includes(domain));
  
  return {
    isOnline: monitor.status === 2,
    responseTime: monitor.average_response_time,
    statusCode: monitor.status === 2 ? 200 : 503,
    lastCheck: new Date(monitor.last_check * 1000).toISOString(),
    uptime: {
      percentage: parseFloat(monitor.custom_uptime_ratio),
      outages: monitor.logs.filter((l: any) => l.type === 1).length,
      totalDowntime: calculateDowntime(monitor.logs),
    },
  };
}
```

#### C. Crawler Activity (Server Logs)

```typescript
import fs from 'fs';
import readline from 'readline';

async function analyzeServerLogs(logPath: string): Promise<CrawlerActivity[]> {
  const crawlers = {
    'GPTBot': /GPTBot/i,
    'Claude-Web': /Claude-Web|anthropic/i,
    'PerplexityBot': /PerplexityBot/i,
    'Google-Extended': /Google-Extended/i,
    'Gemini': /Gemini|Bard/i,
  };
  
  const activity: Record<string, { requests: number; pages: Set<string> }> = {};
  
  // Initialize
  for (const crawler in crawlers) {
    activity[crawler] = { requests: 0, pages: new Set() };
  }
  
  // Parse logs
  const fileStream = fs.createReadStream(logPath);
  const rl = readline.createInterface({ input: fileStream });
  
  for await (const line of rl) {
    for (const [crawler, pattern] of Object.entries(crawlers)) {
      if (pattern.test(line)) {
        activity[crawler].requests++;
        const url = extractURLFromLog(line);
        activity[crawler].pages.add(url);
      }
    }
  }
  
  // Convert to CrawlerActivity format
  return Object.entries(activity).map(([crawler, data]) => ({
    crawler,
    lastSeen: new Date().toISOString(), // Extract from last log entry
    requestCount: data.requests,
    pagesIndexed: data.pages.size,
    status: data.requests > 0 ? 'active' : 'inactive',
  }));
}
```

#### D. HTTPS & Security Checks (Real Implementation)

```typescript
import https from 'https';
import tls from 'tls';

async function checkRealHTTPS(domain: string): Promise<{
  enabled: boolean;
  valid: boolean;
  expiresAt: string;
}> {
  return new Promise((resolve) => {
    const options = {
      host: domain,
      port: 443,
      method: 'GET',
    };
    
    const req = https.request(options, (res) => {
      const cert = res.socket.getPeerCertificate();
      
      resolve({
        enabled: true,
        valid: !cert.expired,
        expiresAt: cert.valid_to,
      });
    });
    
    req.on('error', () => {
      resolve({ enabled: false, valid: false, expiresAt: '' });
    });
    
    req.end();
  });
}
```

### Implementation Steps

1. **Schema Validation**: Integrate Google Rich Results Test API
2. **Uptime Monitoring**: Sign up for UptimeRobot/Pingdom and get API key
3. **Crawler Tracking**: Set up server log parsing (requires backend)
4. **HTTPS Checks**: Implement real SSL certificate validation
5. Replace simulation methods in `realtimeMonitor.ts`
6. Test with production domains
7. Set up alerting webhooks

---

## 3. Environment Variables

Update `.env` with production API keys:

```env
# AI Citation Tracking
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
PERPLEXITY_API_KEY=pplx-...
BRIGHTDATA_API_KEY=...

# Monitoring Services
UPTIMEROBOT_API_KEY=...
PINGDOM_API_KEY=...
GOOGLE_SEARCH_CONSOLE_KEY=...

# Schema Validation
GOOGLE_API_KEY=...
SCHEMA_ORG_VALIDATOR_KEY=...

# Server Access (if applicable)
SERVER_LOG_PATH=/var/log/nginx/access.log
CLOUDFLARE_API_KEY=...
```

---

## 4. Cost Estimates

| Service | Pricing | Recommended Plan |
|---------|---------|------------------|
| OpenAI Enterprise | Custom | Contact sales |
| Anthropic API | $11.02/M tokens | Team plan |
| Perplexity API | $5/1K searches | Pro plan |
| BrightData | $500/mo | Starter |
| UptimeRobot | $7/mo | Pro |
| Google APIs | Free tier | Standard |

**Total Monthly**: ~$550-800 for full production integration

---

## 5. Testing Checklist

- [ ] API keys configured in `.env`
- [ ] Real citation detection working
- [ ] Uptime monitoring connected
- [ ] Schema validation functional
- [ ] Crawler tracking accurate
- [ ] Error handling implemented
- [ ] Rate limiting configured
- [ ] Demo mode warnings removed
- [ ] Production deployment tested
- [ ] Monitoring alerts set up

---

## 6. Support & Contact

For production API integration support:
- Email: support@anoteroslogos.com
- Enterprise API setup: enterprise@anoteroslogos.com

**Last Updated**: November 4, 2025
