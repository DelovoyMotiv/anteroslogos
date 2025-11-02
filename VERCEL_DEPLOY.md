# Vercel Deployment Instructions

## Current Issue
The site at https://anoteroslogos.com/geo-vs-seo returns 404, showing old cached version with Google Fonts instead of self-hosted fonts.

## Quick Fix - Manual Deployment

### Option 1: Vercel CLI (Recommended)
```bash
# Install Vercel CLI globally (if not installed)
npm i -g vercel

# Login to Vercel
vercel login

# Deploy to production
vercel --prod
```

### Option 2: Through Vercel Dashboard

1. Go to https://vercel.com/dashboard
2. Find your project "anteroslogos" or "anoteroslogos"
3. Click on the project
4. Go to "Settings" > "Git"
5. Verify:
   - Repository: `DelovoyMotiv/anteroslogos`
   - Branch: `main`
   - Root Directory: `./` (leave empty or set to root)
6. Go to "Deployments" tab
7. Click "Redeploy" on the latest deployment
8. Check "Use existing Build Cache" is **UNCHECKED**
9. Click "Redeploy"

### Option 3: Force Rebuild via Settings

1. Go to Vercel Dashboard > Your Project
2. Settings > General
3. Build & Development Settings:
   - Framework Preset: `Vite`
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`
4. Save changes
5. Go to Deployments > Latest > ⋯ Menu > Redeploy

## Verification Checklist

After deployment completes:

1. **Check deployment logs** for errors
2. **Visit**: https://anoteroslogos.com/geo-vs-seo
3. **View page source** - should see:
   - `<!-- Fonts are now self-hosted via @fontsource packages -->`
   - NOT Google Fonts links
4. **Check Network tab** - should load:
   - `GeoVsSeoPage-BE6SagOl.js` (25.41 kB)
5. **No 404 error** - full page should load

## Clearing Vercel CDN Cache

If page still shows old version after deployment:

1. Vercel Dashboard > Project
2. Settings > Domains
3. Click on your domain `anoteroslogos.com`
4. Scroll down to "Purge Cache"
5. Click "Purge Cache" button
6. Wait 30-60 seconds
7. Hard refresh browser: `Ctrl + Shift + R`

## Common Issues

### Issue: "Build succeeds but shows old version"
**Cause**: CDN cache not cleared  
**Fix**: Purge cache in Vercel dashboard + hard refresh browser

### Issue: "404 on /geo-vs-seo"
**Cause**: SPA routing not configured  
**Fix**: Verify `vercel.json` rewrites are present (already fixed in repo)

### Issue: "Shows Google Fonts instead of self-hosted"
**Cause**: Deploying from wrong branch or old build  
**Fix**: Check Git settings point to `main` branch, redeploy without cache

## Files Changed in This Update

```
pages/GeoVsSeoPage.tsx          - NEW (3800+ words comparison page)
App.tsx                         - MODIFIED (added route)
index.html                      - MODIFIED (removed Google Fonts, fixed meta)
public/sitemap.xml              - MODIFIED (added /geo-vs-seo)
vercel.json                     - MODIFIED (explicit build settings)
```

## Expected Build Output

Successful build should show:
```
dist/assets/GeoVsSeoPage-BE6SagOl.js    25.41 kB │ gzip: 7.48 kB
✓ built in ~4s
```

## Testing Locally

To verify everything works before deployment:

```bash
# Clean build
rm -rf dist
npm run build

# Test production build locally
npm run preview

# Visit http://localhost:4173/geo-vs-seo
# Should show full comparison page
```

## Contact Points

If issues persist after following above steps:

1. **Check Vercel deployment logs** for specific errors
2. **Verify GitHub webhook** is triggering deployments
3. **Check domain DNS** settings point to Vercel

---

**Last Updated**: November 2, 2025  
**Build Verification**: ✅ Local build successful  
**Deployment Status**: ⏳ Awaiting manual Vercel redeploy
