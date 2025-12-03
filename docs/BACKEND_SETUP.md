# Backend Setup Guide - Supabase PostgreSQL

## 🚀 Quick Start (5 minutes)

### Step 1: Get Supabase Credentials

You're already logged into Supabase. Now:

1. **Select your project** (or create new if needed)
2. Go to **Settings** (⚙️ icon in sidebar) → **API**
3. Copy these two values:

```
Project URL: https://[your-project-id].supabase.co
anon public key: eyJhbGc....[long string]
```

### Step 2: Configure Environment Variables

1. Create `.env` file in project root:
```bash
cp .env.example .env
```

2. Edit `.env` and add your credentials:
```env
VITE_SUPABASE_URL=https://[your-project-id].supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc....[your-anon-key]
```

### Step 3: Run Database Migration

In Supabase Dashboard:

1. Go to **SQL Editor** (left sidebar)
2. Click **+ New query**
3. Copy entire content from `supabase/migrations/001_initial_schema.sql`
4. Paste into SQL editor
5. Click **Run** button (or `Ctrl+Enter`)

Expected output:
```
Success. No rows returned
```

**Note:** This creates:
- 4 tables: `profiles`, `audits`, `global_insights`, `audit_alerts`
- Row Level Security policies
- Indexes for performance
- Triggers for auto-updates
- Views for analytics

### Step 4: Enable Authentication Providers

In Supabase Dashboard:

1. Go to **Authentication** → **Providers**
2. Enable these providers:

**Email (Required):**
- Toggle **Enable Email Provider** → ON
- Enable **Confirm email** → OFF (for faster testing, turn ON for production)

**Optional OAuth Providers:**
- **Google**: 
  - Get credentials from [Google Cloud Console](https://console.cloud.google.com/)
  - Add: `https://[your-project-id].supabase.co/auth/v1/callback` to Authorized redirect URIs
- **GitHub**:
  - Get credentials from [GitHub OAuth Apps](https://github.com/settings/developers)
  - Add callback URL: `https://[your-project-id].supabase.co/auth/v1/callback`

### Step 5: Configure Vercel Environment Variables

```bash
# Install Vercel CLI if not installed
npm i -g vercel

# Set environment variables
vercel env add VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_ANON_KEY production
```

Or manually in Vercel Dashboard:
1. Go to Project → Settings → Environment Variables
2. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
3. Select all environments (Production, Preview, Development)

### Step 6: Test the Connection

```bash
# Restart dev server
npm run dev
```

Open browser console (F12), you should see:
```
✅ Supabase client initialized
```

If you see errors:
```
❌ Missing VITE_SUPABASE_URL environment variable
```
→ Check your `.env` file

---

## 📊 Verify Database Setup

### Check Tables Created

In Supabase Dashboard → **Table Editor**:

You should see:
- ✅ profiles
- ✅ audits
- ✅ global_insights
- ✅ audit_alerts

### Check Row Level Security (RLS)

In Supabase Dashboard → **Authentication** → **Policies**:

For `audits` table, you should see:
- ✅ Users can view own audits
- ✅ Users can insert own audits
- ✅ Users can update own audits
- ✅ Users can delete own audits

### Test First Audit

1. Run GEO Audit on any website
2. Check Supabase Dashboard → **Table Editor** → `audits`
3. You should see new row with your audit data

---

## 🔐 Security Configuration

### Database Roles & Permissions

Already configured by migration:
- ✅ `anon` role: Can read public data only
- ✅ `authenticated` role: Can read/write own data
- ✅ RLS policies: Enforce user isolation

### API Key Security

**anon key** (public):
- ✅ Safe to expose in frontend
- ✅ Rate-limited by Supabase
- ✅ Cannot bypass RLS policies

**service_role key** (secret):
- ⚠️ **NEVER** expose in frontend
- ⚠️ **NEVER** commit to git
- Use only in backend/serverless functions

### Content Security Policy (CSP)

Add to your `index.html`:
```html
<meta http-equiv="Content-Security-Policy" 
      content="connect-src 'self' https://*.supabase.co;">
```

---

## 📈 Performance Optimization

### Indexes Created

By migration script:
- `idx_audits_user_id` - Fast user queries
- `idx_audits_normalized_url` - URL deduplication
- `idx_audits_domain` - Domain grouping
- `idx_audits_timestamp` - Time-based queries
- `idx_audits_overall_score` - Score filtering
- GIN indexes on JSONB columns

### Caching Strategy

1. **Client-side**: localStorage fallback for offline
2. **Database**: Materialized views for global stats
3. **Application**: React Query (to be added)

### Query Optimization Tips

```typescript
// ❌ Bad: Fetch all columns
const { data } = await supabase.from('audits').select('*')

// ✅ Good: Select only needed columns
const { data } = await supabase.from('audits')
  .select('id, url, overall_score, timestamp')
```

---

## 🧪 Testing & Debugging

### Enable Realtime Logs

In Supabase Dashboard:
1. Go to **Settings** → **Database**
2. Enable **Postgres Logs**
3. Go to **Logs** → **Postgres Logs**

You'll see:
- All queries executed
- Performance metrics
- Error messages

### Test Authentication Flow

```typescript
// Test signup
import { signUpWithEmail } from './lib/supabase';
const result = await signUpWithEmail('test@example.com', 'password123');
console.log('Signup result:', result);

// Test signin
import { signInWithEmail } from './lib/supabase';
const result = await signInWithEmail('test@example.com', 'password123');
console.log('Signin result:', result);
```

### Test Audit Save

```typescript
import { saveAuditToCloud } from './utils/backend/auditStorage';

const testAudit = {
  url: 'https://example.com',
  timestamp: new Date().toISOString(),
  overallScore: 85,
  grade: 'A',
  scores: {
    schemaMarkup: 90,
    metaTags: 85,
    // ... other scores
  },
  // ... other data
};

const result = await saveAuditToCloud(testAudit);
console.log('Save result:', result);
```

---

## 📊 Monitoring & Analytics

### Database Usage

In Supabase Dashboard → **Settings** → **Usage**:
- Database size
- API requests count
- Bandwidth used

**Free tier limits:**
- Database: 500 MB
- API requests: 50,000/month  
- Bandwidth: 2 GB/month

### Upgrade When Needed

**Pro plan ($25/month):**
- Database: 8 GB
- API requests: 100,000/month
- Bandwidth: 50 GB/month
- Daily backups
- Point-in-time recovery

---

## 🔄 Data Migration

### Migrate LocalStorage to Cloud

For existing users with localStorage data:

```typescript
import { syncLocalStorageToCloud } from './utils/backend/auditStorage';

// Run once after user signs in
const { synced, errors } = await syncLocalStorageToCloud();
console.log(`Synced ${synced} audits, ${errors} errors`);
```

This automatically:
1. Reads localStorage history
2. Checks for duplicates
3. Uploads to Supabase
4. Preserves local copy

---

## 🚨 Troubleshooting

### Error: "Missing environment variables"

**Solution:**
```bash
# Check if .env exists
ls -la .env

# If not, create from template
cp .env.example .env

# Restart dev server
npm run dev
```

### Error: "Failed to fetch"

**Causes:**
1. Supabase URL incorrect
2. Network/firewall blocking
3. Project paused (free tier inactive >1 week)

**Solution:**
1. Verify URL in Supabase Dashboard → Settings → API
2. Check browser console for CORS errors
3. "Unpause" project in Supabase Dashboard

### Error: "new row violates row-level security policy"

**Cause:** User not authenticated

**Solution:**
```typescript
// Check auth state
const user = await getCurrentUser();
if (!user) {
  // Redirect to login
  window.location.href = '/login';
}
```

### Error: "relation does not exist"

**Cause:** Migration not run

**Solution:**
Run migration script in SQL Editor (Step 3 above)

---

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Performance Tips](https://supabase.com/docs/guides/database/performance)

---

## ✅ Verification Checklist

Before going to production:

- [ ] Database migration applied successfully
- [ ] RLS policies enabled on all tables
- [ ] Environment variables set in Vercel
- [ ] Authentication providers configured
- [ ] First audit saved to cloud successfully
- [ ] User profile created automatically on signup
- [ ] No console errors in browser
- [ ] Tested with real user signup/signin
- [ ] Backup strategy configured (Pro plan)
- [ ] Monitoring alerts set up

---

**Last Updated:** 2025-11-04  
**Status:** Production Ready  
**Estimated Setup Time:** 5-10 minutes
