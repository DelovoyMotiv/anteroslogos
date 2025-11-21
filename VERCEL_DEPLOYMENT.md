# Vercel Deployment Guide

## Critical Environment Variables

Before deploying to Vercel, ensure these environment variables are set in **Project Settings → Environment Variables**:

### Required for Authentication & Database
```bash
# Client-side (exposed to browser)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key

# Server-side (API routes only, NOT exposed)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Required for Stripe Billing
```bash
# Server-side (API routes only, NEVER expose to client)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_PRO=price_...
STRIPE_PRICE_AGENCY=price_...

# Client-side (safe to expose)
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

### Optional (Site Meta)
```bash
VITE_SITE_URL=https://anoteroslogos.com
VITE_SITE_NAME=Anóteros Lógos
VITE_SITE_DESCRIPTION=Generative Engine Optimization Agency
```

### Optional (AI Agent - if using OpenRouter)
```bash
VITE_OPENROUTER_API_KEY=sk-or-...
VITE_OPENROUTER_MODEL=meta-llama/llama-3.2-3b-instruct:free
```

---

## Build Configuration

Vercel uses these settings automatically:

- **Build Command**: `npm run build` (runs `tsc && vite build`)
- **Output Directory**: `dist`
- **Install Command**: `npm install`
- **Node Version**: 18.x or 20.x (auto-detected from package.json engines)

---

## API Routes

API routes are in `/api` directory and are automatically deployed as **Vercel Serverless Functions**.

### Structure:
```
/api
  /auth
    callback.ts          → POST /api/auth/callback
  /keys
    create.ts            → POST /api/keys/create
    list.ts              → GET  /api/keys/list
    revoke.ts            → POST /api/keys/revoke
  /agent-keys
    register.ts          → POST /api/agent-keys/register
    list.ts              → GET  /api/agent-keys/list
    revoke.ts            → POST /api/agent-keys/revoke
  /stripe
    create-checkout.ts   → POST /api/stripe/create-checkout
    create-portal.ts     → POST /api/stripe/create-portal
    webhook.ts           → POST /api/stripe/webhook
  goldStandard.ts        → GET  /api/goldStandard (aliased from /api/gold-standard)
  /a2a
    index.ts             → POST /api/a2a
  /mcp
    route.ts             → POST /api/mcp
```

**Important**: API routes use `lib/dashboard/billing.ts` and `lib/dashboard/api-keys.ts` which require **Node.js crypto** and **Stripe SDK**. These are server-only modules and MUST NOT be imported in client code.

---

## Stripe Webhook Configuration

After deploying to Vercel, configure Stripe webhook:

1. Go to **Stripe Dashboard** → **Webhooks** → **Add endpoint**
2. Endpoint URL: `https://YOUR_DOMAIN/api/stripe/webhook`
3. Listen to events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copy the **Webhook Signing Secret** and add it to Vercel as `STRIPE_WEBHOOK_SECRET`

---

## Deployment Checklist

- [ ] All environment variables are set in Vercel Dashboard
- [ ] Supabase project is live with correct RLS policies
- [ ] Stripe products and prices are created (Pro, Agency)
- [ ] Stripe webhook is configured with correct endpoint URL
- [ ] Database tables exist: `profiles`, `subscriptions`, `api_keys`, `agent_keys`, `audit_log`
- [ ] Build succeeds locally: `npm run build`
- [ ] TypeScript compiles: `npm run typecheck`
- [ ] No console errors during local preview: `npm run preview`

---

## Common Deployment Issues

### Issue: API routes return 404
**Cause**: Rewrites in `vercel.json` catching API routes  
**Fix**: Ensure rewrite excludes `/api/*`:
```json
{ "source": "/((?!api/).*)", "destination": "/index.html" }
```

### Issue: Build fails with "Cannot find module 'crypto'"
**Cause**: Client code importing server-only modules  
**Fix**: Use `lib/dashboard/billing-client.ts` and `lib/dashboard/api-keys-client.ts` in React components

### Issue: Stripe webhook fails signature verification
**Cause**: Wrong `STRIPE_WEBHOOK_SECRET` or body parser issue  
**Fix**: Ensure `api/stripe/webhook.ts` has `export const config = { api: { bodyParser: false } }`

### Issue: Authentication redirects fail
**Cause**: Supabase redirect URLs not whitelisted  
**Fix**: Add production domain to Supabase → Authentication → URL Configuration → Redirect URLs

---

## Post-Deployment

After successful deployment:

1. Test authentication flow: Sign up → Email verification → Login
2. Test API key creation in Dashboard
3. Test Agent key generation (Ed25519 keypair)
4. Test Stripe checkout (use test mode first)
5. Test webhook events with Stripe CLI:
   ```bash
   stripe listen --forward-to https://YOUR_DOMAIN/api/stripe/webhook
   stripe trigger checkout.session.completed
   ```
6. Monitor Vercel Functions logs for errors
7. Check Supabase logs for authentication/database issues

---

## Monitoring

- **Vercel Logs**: Project → Deployments → [Latest] → Runtime Logs
- **Supabase Logs**: Project → Logs → Database / Auth / API
- **Stripe Events**: Dashboard → Webhooks → [Your Endpoint] → Events

---

## Support

If deployment fails:
1. Check Vercel build logs for specific error messages
2. Verify all environment variables are set correctly (no trailing spaces, correct format)
3. Ensure Supabase project is accessible (not paused or over quota)
4. Test API routes locally using `vercel dev`
5. Check this repository's Issues tab for known problems
