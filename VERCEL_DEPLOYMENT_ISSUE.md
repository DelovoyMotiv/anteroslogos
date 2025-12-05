# Vercel Deployment Issue - Serverless Function Limit

## Problem

Deployment failed with error:
```
Error: No more than 12 Serverless Functions can be added to a Deployment on the Hobby plan.
```

## Current State

The project has **23 serverless functions** in the `api/` directory, which exceeds the Vercel Hobby plan limit of 12 functions.

## Root Cause

The `vercel.json` configuration treats every `.ts` file in `api/` as a separate serverless function:
```json
"functions": {
  "api/**/*.ts": {
    "maxDuration": 10
  }
}
```

## Solutions

### Option 1: Upgrade to Vercel Pro Plan (Recommended)
- **Cost**: $20/month per member
- **Benefits**:
  - Up to 100 serverless functions
  - Better performance
  - More build minutes
  - Priority support
- **Action**: Upgrade at https://vercel.com/pricing

### Option 2: Consolidate More Endpoints
Combine related endpoints into single files with query parameter routing (like we did with subscriptions).

**Candidates for consolidation**:
1. **Auth endpoints** (`auth.ts`, `challenge.ts`, `handshake.ts`) → `api/auth/manage.ts`
2. **Keys endpoints** (`api-keys.ts`, `agent-keys.ts`, `keys.ts`) → `api/keys/manage.ts`
3. **Status endpoints** (`health.ts`, `ready.ts`, `status.ts`, `metrics.ts`) → `api/system/status.ts`
4. **AID endpoints** (`aid-registry.ts`, `public-aid.ts`) → `api/aid/manage.ts`

This could reduce from 23 to ~12 functions.

### Option 3: Move to Different Hosting
- **Cloudflare Workers**: 100,000 requests/day free
- **AWS Lambda**: 1M requests/month free
- **Railway**: $5/month for unlimited functions
- **Fly.io**: Pay-as-you-go pricing

## Temporary Fix Applied

Consolidated subscription endpoints:
- ❌ Removed: `api/subscriptions/subscribe.ts`
- ❌ Removed: `api/subscriptions/cancel.ts`
- ❌ Removed: `api/subscriptions/status.ts`
- ❌ Removed: `api/subscriptions/verify-payment.ts`
- ✅ Created: `api/subscriptions/manage.ts` (single endpoint with query routing)

**New endpoint usage**:
```typescript
// Subscribe
POST /api/subscriptions/manage?action=subscribe
Body: { planTier: 'starter' | 'pro' | 'enterprise' }

// Cancel
POST /api/subscriptions/manage?action=cancel

// Verify payment
POST /api/subscriptions/manage?action=verify
Body: { invoiceId: string, txHash: string }

// Get status
GET /api/subscriptions/manage?action=status
```

## Current Function Count

```
api/a2a.ts
api/agent-keys.ts
api/aid-registry.ts
api/api-keys.ts
api/audit-trail.ts
api/auth.ts
api/capabilities.ts
api/challenge.ts
api/csrf.ts
api/handshake.ts
api/health.ts
api/keys.ts
api/metrics.ts
api/public-aid.ts
api/ready.ts
api/status.ts
api/subscriptions.ts
api/tenants.ts
api/webhooks.ts
api/mcp/index.ts
api/mcp/programmatic.ts
api/subscriptions/manage.ts
api/tools/search.ts
```

**Total**: 23 functions (11 over limit)

## Recommendation

For a production enterprise-grade application, **upgrading to Vercel Pro** is the recommended solution. It provides:
- Sufficient serverless function capacity
- Better performance and reliability
- Professional support
- Room for future growth

The consolidation approach works but makes the codebase less maintainable and goes against REST API best practices.
