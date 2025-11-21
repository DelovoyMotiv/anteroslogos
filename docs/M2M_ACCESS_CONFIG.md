# M2M (Machine-to-Machine) Access Configuration Guide

**Goal**: Make https://anoteroslogos.com universally accessible to autonomous AI agents, headless browsers, and datacenter-based execution environments.

---

## Problem Statement

External AI agents (Perplexity bot, OpenAI crawlers, Python requests from AWS/GCP/Azure) are experiencing:
- **DNS Resolution Errors** (NameResolutionError)
- **Connection Refused** (blocked by WAF/Cloudflare)
- **403 Forbidden** (missing browser headers)

While the site works perfectly for human browsers, machine agents are being blocked.

---

## Root Causes Identified

### 1. ✅ FIXED: robots.txt Blocking (Critical)
**Issue**: Lines 103-105 blocked `/api/` and `/*.json$`
```diff
- Disallow: /api/
- Disallow: /*.json$
+ Allow: /.well-known/
+ Allow: /api/a2a
+ Allow: /api/mcp
```

### 2. ✅ FIXED: Missing CORS Headers
**Issue**: Only `agent.json` had CORS, not all `.well-known/*` files
**Fix**: Updated `vercel.json` with wildcard `.well-known/:path*` rule

### 3. ✅ FIXED: No Middleware Bypass for Bots
**Issue**: No logic to bypass WAF checks for known AI User-Agents
**Fix**: Created `middleware.ts` with AI agent detection

---

## Vercel Dashboard Configuration

### Step 1: Deployment Protection (CRITICAL)

**Navigate to**: Vercel Dashboard → Project Settings → Deployment Protection

**Current Status**: Check if ANY of these are enabled:
- ❌ **"Vercel Authentication"** - MUST BE DISABLED (causes 401 for bots)
- ❌ **"Password Protection"** - MUST BE DISABLED
- ⚠️ **"DDoS Protection"** - Can stay enabled, but check "Allow Known Bots"

**Action**:
1. Go to https://vercel.com/[your-org]/anoteroslogos/settings/deployment-protection
2. **Disable** "Vercel Authentication" for production deployment
3. **Disable** "Password Protection"
4. If DDoS Protection enabled: Check "Allow Known Bots" checkbox

### Step 2: Firewall Rules

**Navigate to**: Vercel Dashboard → Project Settings → Firewall

**Check for**:
- ❌ **"Attack Challenge Mode"** - MUST BE OFF for AI agents
- ❌ **"Block Data Center IPs"** - MUST BE OFF
- ✅ **"Rate Limiting"** - OK to keep (adjust if needed)

**Action**:
1. Go to https://vercel.com/[your-org]/anoteroslogos/settings/firewall
2. Set Attack Challenge Mode to **"Off"** or **"Monitor Only"**
3. Disable "Block Data Center IPs"
4. Add IP Whitelist (optional): Known AI crawler IPs from OpenAI, Anthropic, Perplexity

### Step 3: Edge Config (Optional but Recommended)

Create Edge Config to dynamically update allowed User-Agents without redeployment.

**Action**:
1. Go to https://vercel.com/[your-org]/edge-config
2. Create new config: `ai-agents-whitelist`
3. Add key-value:
   ```json
   {
     "allowed_user_agents": [
       "GPTBot",
       "ClaudeBot",
       "PerplexityBot",
       "python-requests",
       "curl"
     ]
   }
   ```
4. Connect to project
5. Update `middleware.ts` to fetch from Edge Config

---

## Cloudflare Configuration (If Using)

### Step 1: Security Level

**Navigate to**: Cloudflare Dashboard → Security → Settings

**Current Status**: Check Security Level
- ❌ **"I'm Under Attack"** - MUST TURN OFF (blocks all bots)
- ⚠️ **"High"** - May block bots, set to **"Medium"** or **"Low"**
- ✅ **"Essentially Off"** - Best for API-first sites

**Action**:
1. Go to https://dash.cloudflare.com/[account]/[domain]/security/settings
2. Set Security Level to **"Medium"** or **"Low"**

### Step 2: Bot Fight Mode

**Navigate to**: Cloudflare Dashboard → Security → Bots

**Check for**:
- ❌ **"Super Bot Fight Mode"** - MUST BE OFF (free plan only, blocks all non-browsers)
- ⚠️ **"Bot Fight Mode"** - Check "Allow Verified Bots"

**Action**:
1. Go to https://dash.cloudflare.com/[account]/[domain]/security/bots
2. If on Free plan: **Disable** "Super Bot Fight Mode"
3. If on Pro plan: Enable "Bot Management" with rule:
   ```
   (cf.bot_management.verified_bot) → Allow
   ```

### Step 3: Firewall Rules

**Navigate to**: Cloudflare Dashboard → Security → WAF

**Create Rule**: "Allow AI Agents"
```
Expression:
(http.user_agent contains "GPTBot") or
(http.user_agent contains "ClaudeBot") or
(http.user_agent contains "PerplexityBot") or
(http.user_agent contains "python-requests") or
(http.user_agent contains "curl") or
(http.request.uri.path contains "/.well-known/") or
(http.request.uri.path eq "/api/a2a") or
(http.request.uri.path eq "/api/mcp")

Action: Allow
```

### Step 4: Page Rules (Bypass for API)

**Navigate to**: Cloudflare Dashboard → Rules → Page Rules

**Create Rule**: Bypass Cache and Security for API
```
URL: anoteroslogos.com/api/*
Settings:
- Cache Level: Bypass
- Security Level: Essentially Off
- Disable Performance
```

---

## Testing Checklist

### Test 1: cURL (No User-Agent)
```bash
curl -v https://anoteroslogos.com/.well-known/agent.json
# Expected: HTTP 200, JSON response
```

### Test 2: Python requests (Datacenter IP)
```python
import requests

response = requests.get('https://anoteroslogos.com/agent-identity')
print(response.status_code)  # Expected: 200
print(response.text[:100])   # Should return HTML
```

### Test 3: Headless Browser (Playwright)
```typescript
import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto('https://anoteroslogos.com/agent-identity');
console.log(await page.title()); // Should load successfully
await browser.close();
```

### Test 4: A2A Protocol (JSON-RPC 2.0)
```bash
curl -X POST https://anoteroslogos.com/api/a2a \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "a2a.discover",
    "params": {},
    "id": 1
  }'
# Expected: HTTP 200, JSON-RPC response with capabilities
```

### Test 5: MCP Endpoint
```bash
curl -X POST https://anoteroslogos.com/api/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk_test_..." \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/list",
    "id": 1
  }'
# Expected: HTTP 200, list of MCP tools
```

---

## DNS Verification

### Check A/AAAA Records
```bash
dig anoteroslogos.com A
dig anoteroslogos.com AAAA
```
**Expected**: Should resolve to Vercel IPs (76.76.21.x or 76.223.x.x)

### Check TXT Records (AID Protocol)
```bash
dig _agent.anoteroslogos.com TXT
```
**Expected**: Should return AID v1.1 record if configured

---

## Monitoring

### Set Up Alerts

**Vercel Functions**: Monitor for 403/401 errors from non-browser User-Agents
```bash
vercel logs --follow --filter="status:403" --filter="user-agent:python"
```

**Cloudflare Analytics**: Check "Bot Traffic" tab for blocked requests

---

## Emergency Rollback

If changes break human traffic:

1. **Revert robots.txt**: Re-add `Disallow: /api/`
2. **Disable middleware.ts**: Comment out `export function middleware`
3. **Cloudflare**: Set Security Level back to "High"
4. **Vercel**: Re-enable "Attack Challenge Mode"

---

## Success Criteria

✅ cURL can access `/.well-known/agent.json`
✅ Python requests from AWS Lambda can fetch `/agent-identity`
✅ Perplexity bot can crawl site (check logs)
✅ OpenAI GPTBot can access `/api/a2a`
✅ No increase in malicious bot traffic (monitor Cloudflare Analytics)

---

## Additional Resources

- [Vercel Firewall Docs](https://vercel.com/docs/security/vercel-firewall)
- [Cloudflare Bot Management](https://developers.cloudflare.com/bots/)
- [robots.txt Tester](https://en.ryte.com/free-tools/robots-txt/)
- [RFC 9309 - robots.txt](https://datatracker.ietf.org/doc/html/rfc9309)

---

**Last Updated**: 2025-11-21  
**Maintainer**: DevOps Team
