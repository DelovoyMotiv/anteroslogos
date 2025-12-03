# OAuth and Environment Configuration Guide

## Overview

Production-ready OAuth configuration with environment-specific redirect URIs, proper security settings, and deployment best practices.

## Environment Configuration

### Development (.env.local)
```bash
# Supabase
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Auth
VITE_AUTH_REDIRECT_URL=http://localhost:5173/auth/callback
VITE_SITE_URL=http://localhost:5173
```

### Staging (.env.staging)
```bash
# Supabase
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Auth
VITE_AUTH_REDIRECT_URL=https://staging.anoteroslogos.com/auth/callback
VITE_SITE_URL=https://staging.anoteroslogos.com
```

### Production (.env.production)
```bash
# Supabase
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Auth
VITE_AUTH_REDIRECT_URL=https://anoteroslogos.com/auth/callback
VITE_SITE_URL=https://anoteroslogos.com
```

## Supabase OAuth Configuration

### 1. Google OAuth Setup

**Step 1: Create Google OAuth Credentials**
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create new project or select existing
3. Enable Google+ API
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
5. Application type: **Web application**
6. Authorized JavaScript origins:
   - Development: `http://localhost:5173`
   - Staging: `https://staging.anoteroslogos.com`
   - Production: `https://anoteroslogos.com`
7. Authorized redirect URIs:
   - Development: `http://localhost:5173/auth/callback`
   - Staging: `https://staging.anoteroslogos.com/auth/callback`
   - Production: `https://anoteroslogos.com/auth/callback`
   - **PLUS Supabase callback**: `https://your-project-id.supabase.co/auth/v1/callback`

**Step 2: Configure in Supabase**
1. Go to Supabase Dashboard → **Authentication** → **Providers**
2. Enable **Google**
3. Paste **Client ID** and **Client Secret**
4. Click **Save**

**Step 3: Configure Redirect URLs in Supabase**
1. Go to **Authentication** → **URL Configuration**
2. Add to **Redirect URLs**:
   ```
   http://localhost:5173/auth/callback
   https://staging.anoteroslogos.com/auth/callback
   https://anoteroslogos.com/auth/callback
   ```
3. Set **Site URL**: `https://anoteroslogos.com`

### 2. GitHub OAuth Setup (Optional)

**Step 1: Create GitHub OAuth App**
1. Go to GitHub Settings → **Developer settings** → **OAuth Apps** → **New OAuth App**
2. Application name: `Anóteros Lógos GEO Audit`
3. Homepage URL: `https://anoteroslogos.com`
4. Authorization callback URL: `https://your-project-id.supabase.co/auth/v1/callback`
5. Click **Register application**

**Step 2: Configure in Supabase**
1. Go to Supabase Dashboard → **Authentication** → **Providers**
2. Enable **GitHub**
3. Paste **Client ID** and **Client Secret**
4. Click **Save**

**Step 3: Enable in Application**
```typescript
// lib/config/env.ts
export const features = {
  oauthGithub: true,  // Set to true
};
```

### 3. GitLab OAuth Setup (Optional)

Similar to GitHub, create OAuth application in GitLab.

## Application Configuration

### Environment Detection

The app automatically detects environment based on:
1. `VITE_SITE_URL` contains:
   - `anoteroslogos.com` (not staging) → **Production**
   - `staging.anoteroslogos.com` → **Staging**
   - Anything else → **Development**

### Redirect URL Resolution

Priority order:
1. `VITE_AUTH_REDIRECT_URL` (explicit)
2. `VITE_SITE_URL + /auth/callback` (derived)
3. `window.location.origin + /auth/callback` (runtime)
4. `http://localhost:5173/auth/callback` (SSR fallback)

### Configuration Validation

On app startup, configuration is validated:

```typescript
// Automatic in App.tsx
useEffect(() => {
  logConfig();  // Development only
  
  const validation = validateConfig();
  if (!validation.valid) {
    console.error('Configuration errors:', validation.errors);
  }
}, []);
```

**Production Validation Rules:**
- ✅ Supabase URL required
- ✅ Supabase anon key required
- ✅ Site URL must not contain `localhost`
- ✅ Auth redirect URL must not contain `localhost`
- ✅ All URLs must be valid

## Deployment

### Vercel

**Environment Variables:**
1. Go to Vercel Dashboard → Your Project → **Settings** → **Environment Variables**
2. Add variables for each environment:
   - Production: `anoteroslogos.com`
   - Preview: `*.vercel.app`
   - Development: local only

**Build Configuration:**
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm install"
}
```

**Redirect URLs:**
Add preview deployment URLs to Supabase:
```
https://your-app-*.vercel.app/auth/callback
```

### Netlify

**Environment Variables:**
1. Site settings → **Environment variables**
2. Context: Production, Deploy Previews, Branch deploys
3. Add same variables as Vercel

**Build Configuration (netlify.toml):**
```toml
[build]
  command = "npm run build"
  publish = "dist"

[context.production.environment]
  VITE_SITE_URL = "https://anoteroslogos.com"
  VITE_AUTH_REDIRECT_URL = "https://anoteroslogos.com/auth/callback"

[context.deploy-preview.environment]
  VITE_AUTH_REDIRECT_URL = "$DEPLOY_PRIME_URL/auth/callback"
```

### Custom Server (nginx, Apache)

**Environment Variables:**
Use `.env.production` file or system environment variables.

**Build:**
```bash
npm run build
```

**Server Configuration (nginx):**
```nginx
server {
    listen 443 ssl http2;
    server_name anoteroslogos.com;

    root /var/www/anoteroslogos/dist;
    index index.html;

    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # SSL configuration
    ssl_certificate /etc/letsencrypt/live/anoteroslogos.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/anoteroslogos.com/privkey.pem;
}
```

## OAuth Flow

### Complete Flow Diagram

```
User → Click "Sign in with Google"
  ↓
LoginPage.tsx → signInWithOAuth('google')
  ↓
lib/supabase.ts → signInWithOAuth()
  - Uses config.authRedirectUrl
  - Adds queryParams (access_type, prompt)
  ↓
Redirect to Google → User authorizes
  ↓
Google redirects to: config.authRedirectUrl
  (e.g. https://anoteroslogos.com/auth/callback?code=...)
  ↓
CallbackPage.tsx
  - Supabase auto-extracts token from URL
  - getSession() retrieves user
  - Check onboarding_completed
    - TRUE → /dashboard
    - FALSE → /onboarding
  ↓
AuthGuard.tsx
  - Verify email_confirmed_at
  - Check session validity
  - Enforce auth policies
  ↓
Dashboard
```

### OAuth Parameters

**Google:**
```typescript
{
  provider: 'google',
  redirectTo: config.authRedirectUrl,
  queryParams: {
    access_type: 'offline',  // Get refresh token
    prompt: 'consent',       // Force consent screen
  }
}
```

**Why these params?**
- `access_type: 'offline'` - Allows getting refresh token for long-lived sessions
- `prompt: 'consent'` - Forces user to see consent screen (required for offline access)

## Security Best Practices

### 1. HTTPS Required
- ❌ NEVER use HTTP in production
- ✅ Always use HTTPS for OAuth
- ✅ Enable HSTS header

### 2. Validate Redirect URLs
- ✅ Whitelist all redirect URLs in Supabase
- ❌ Never use wildcard redirects
- ✅ Use exact match URLs

### 3. Rotate Secrets
- 🔄 Rotate OAuth secrets every 90 days
- 🔄 Update Supabase anon keys if compromised
- 🔄 Generate new API keys regularly

### 4. Monitor OAuth Events
```sql
-- Check recent OAuth attempts
SELECT * FROM audit_log
WHERE action LIKE 'auth.oauth.%'
  AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;

-- Failed OAuth attempts
SELECT user_id, metadata->>'provider', COUNT(*)
FROM audit_log
WHERE action = 'auth.oauth.failure'
  AND created_at > NOW() - INTERVAL '1 hour'
GROUP BY user_id, metadata->>'provider'
HAVING COUNT(*) > 5;
```

### 5. Rate Limiting
OAuth requests are rate limited (see RATE_LIMITING.md):
- 10 attempts per 15 minutes
- No automatic blocking (availability priority)

## Troubleshooting

### "Redirect URI mismatch" Error

**Cause:** Callback URL doesn't match OAuth provider settings

**Fix:**
1. Check Google Cloud Console → Authorized redirect URIs
2. Must include **both**:
   - Application callback: `https://anoteroslogos.com/auth/callback`
   - Supabase callback: `https://your-project-id.supabase.co/auth/v1/callback`
3. Wait 5 minutes for Google to propagate changes

### "Invalid redirect URL" Error

**Cause:** Redirect URL not whitelisted in Supabase

**Fix:**
1. Supabase Dashboard → Authentication → URL Configuration
2. Add URL to **Redirect URLs** list
3. Must be exact match (including protocol)

### OAuth works locally but fails in production

**Cause:** Environment variables not set correctly

**Checks:**
1. Verify `VITE_AUTH_REDIRECT_URL` is set
2. Check browser console for config errors
3. Ensure production URL is HTTPS
4. Verify OAuth provider has production URL

**Debug:**
```typescript
// In browser console
import { config } from './lib/config/env';
console.log(config);
```

### User redirected to wrong URL after OAuth

**Cause:** Misconfigured redirect URL

**Fix:**
1. Check `VITE_SITE_URL` is correct
2. Verify `VITE_AUTH_REDIRECT_URL` matches
3. Clear localStorage and retry

## Testing

### Local Testing
```bash
# Start dev server
npm run dev

# Test OAuth flow
1. Go to http://localhost:5173/auth/login
2. Click "Sign in with Google"
3. Should redirect to: http://localhost:5173/auth/callback
4. Should land on: /dashboard or /onboarding
```

### Staging Testing
```bash
# Build for staging
npm run build

# Deploy to staging
vercel --prod

# Test OAuth flow
1. Go to https://staging.anoteroslogos.com/auth/login
2. Complete OAuth
3. Verify redirect
```

### Production Testing
Use separate Google OAuth app for production testing:
1. Create test user
2. Test full signup → onboarding → dashboard flow
3. Test logout → login flow
4. Verify email verification (if enabled)

## Monitoring

### Key Metrics

Track these OAuth metrics:
- OAuth conversion rate (attempt → success)
- Average OAuth completion time
- Failed OAuth attempts by provider
- Redirect errors

### Logging

OAuth events logged to audit_log:
```sql
-- OAuth success rate (last 24h)
SELECT 
  metadata->>'provider' as provider,
  COUNT(CASE WHEN action = 'auth.oauth.success' THEN 1 END) as success,
  COUNT(CASE WHEN action = 'auth.oauth.failure' THEN 1 END) as failure,
  ROUND(
    COUNT(CASE WHEN action = 'auth.oauth.success' THEN 1 END)::numeric /
    NULLIF(COUNT(*), 0) * 100,
    2
  ) as success_rate
FROM audit_log
WHERE action LIKE 'auth.oauth.%'
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY metadata->>'provider';
```

## References

- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [Google OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)
- [OAuth 2.0 RFC 6749](https://datatracker.ietf.org/doc/html/rfc6749)
- [OWASP OAuth Security](https://cheatsheetseries.owasp.org/cheatsheets/OAuth2_Cheat_Sheet.html)
