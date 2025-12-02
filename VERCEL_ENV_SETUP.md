# Vercel Environment Variables Setup

## ✅ Quick Fix Applied

**Problem**: Homepage showing only background  
**Cause**: Missing `VITE_SUPABASE_URL` environment variable  
**Solution**: App now works WITHOUT Supabase credentials (auth features disabled)

**Status**: Main website now fully functional on Vercel ✅

---

## 🔧 Optional: Enable Authentication Features

If you want to enable authentication (login/signup), follow these steps:

### 1. Get Supabase Credentials

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project (or create new one)
3. Go to **Settings** → **API**
4. Copy:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon/public key** (starts with `eyJ...`)

### 2. Add to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project: **anteroslogos**
3. Go to **Settings** → **Environment Variables**
4. Add the following variables:

#### Required for Auth:

```
VITE_SUPABASE_URL
Value: https://your-project.supabase.co
Environments: Production, Preview, Development
```

```
VITE_SUPABASE_ANON_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Environments: Production, Preview, Development
```

#### Optional (for proper redirects):

```
VITE_SITE_URL
Value: https://anoteroslogos.com
Environments: Production
```

```
VITE_AUTH_REDIRECT_URL
Value: https://anoteroslogos.com/auth/callback
Environments: Production
```

### 3. Redeploy

After adding environment variables:

1. Go to **Deployments** tab
2. Click "..." on latest deployment
3. Click **Redeploy**

Or trigger new deployment by pushing to GitHub (auto-deploys).

---

## 🎯 Current Status

### ✅ Working (No Supabase):
- ✅ Homepage with all sections
- ✅ Hero, Process, Stats, Method, Team, FAQ
- ✅ Contact form (Modal)
- ✅ Navigation
- ✅ Footer
- ✅ All marketing pages
- ✅ Knowledge Base
- ✅ Blog
- ✅ Pricing

### ⚠️ Disabled (Without Supabase):
- ❌ User signup
- ❌ User login
- ❌ OAuth (Google)
- ❌ Password reset
- ❌ Email verification
- ❌ Dashboard access
- ❌ API key management

### ✅ Will Work (With Supabase configured):
All authentication features will be enabled automatically once you add the environment variables.

---

## 🔍 Verify Setup

### Check if Auth is Enabled:

1. Open browser console (F12)
2. Look for logs on page load:

**Without Supabase** (current):
```
⚠️ Configuration warnings: [
  "VITE_SUPABASE_URL not set - authentication features disabled",
  "VITE_SUPABASE_ANON_KEY not set - authentication features disabled"
]
```

**With Supabase** (after setup):
```
✅ Configuration valid
🔧 Environment Configuration
- Supabase URL: https://xxxxx.supabase.co
- Auth features: enabled
```

---

## 📝 Notes

1. **App works WITHOUT Supabase**: Main website is fully functional
2. **Auth is OPTIONAL**: Only needed if you want user accounts
3. **No code changes needed**: Just add env vars and redeploy
4. **Graceful degradation**: Login/Signup buttons hidden when auth disabled

---

## 🆘 Troubleshooting

### Still seeing blank page?

1. **Check Vercel deployment logs**:
   - Go to Vercel → Deployments → Click latest
   - Look for build errors

2. **Hard refresh browser**:
   - Windows: `Ctrl + Shift + R`
   - Mac: `Cmd + Shift + R`

3. **Clear cache**:
   - Chrome: Settings → Privacy → Clear browsing data
   - Select "Cached images and files"

### Auth not working after adding vars?

1. **Verify variables are set**:
   - Vercel → Settings → Environment Variables
   - Should see both `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

2. **Check if redeployed**:
   - Environment variables only apply to NEW deployments
   - Must redeploy after adding variables

3. **Test with incognito window**:
   - Eliminates cache issues

---

**Last Updated**: December 2, 2025  
**Status**: ✅ Main site working, auth optional
