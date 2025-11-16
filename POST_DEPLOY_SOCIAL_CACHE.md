# Post-Deployment: Clear Social Media Caches

After deploying Open Graph changes to production, follow these steps to ensure social networks display the new preview image immediately.

## Status

✅ Code deployed to GitHub (commits b9c61f5, d2c9e59)  
✅ OG image generated: `public/images/og-image.jpg` (93 KB, 1200x630px)  
✅ All OG tags validated  
⏳ Waiting for Vercel deployment  
⏳ Social media cache clearing required  

## Step 1: Verify Vercel Deployment

Wait for Vercel to deploy the latest commit:

```bash
# Check deployment status
vercel ls
```

Or visit: https://vercel.com/your-project/deployments

**Wait until deployment status shows "Ready"** before proceeding to cache clearing.

## Step 2: Verify OG Image Is Accessible

Once deployed, verify the image is publicly accessible:

```bash
curl -I https://anoteroslogos.com/images/og-image.jpg
```

**Expected response:**
```
HTTP/2 200
content-type: image/jpeg
content-length: 95707
```

If you get 404, wait a few minutes for CDN propagation.

## Step 3: Clear Facebook Cache

Visit: https://developers.facebook.com/tools/debug/

1. Enter URL: `https://anoteroslogos.com/`
2. Click **"Debug"**
3. Review the preview (should show new image)
4. Click **"Scrape Again"** to force Facebook to re-fetch
5. Wait 10-30 seconds
6. Verify the image appears in preview

**Alternative (API method):**
```bash
curl -X POST "https://graph.facebook.com/?id=https://anoteroslogos.com/&scrape=true"
```

## Step 4: Clear LinkedIn Cache

Visit: https://www.linkedin.com/post-inspector/

1. Enter URL: `https://anoteroslogos.com/`
2. Click **"Inspect"**
3. Review the preview (should show new image)
4. Click **"Refresh"** to clear LinkedIn's cache
5. Wait 10-20 seconds
6. Verify the image appears in preview

## Step 5: Verify Twitter/X Preview

Visit: https://cards-dev.twitter.com/validator

1. Enter URL: `https://anoteroslogos.com/`
2. Click **"Preview card"**
3. Review the preview (should show new image with `summary_large_image` card type)

**Note:** Twitter Card Validator requires authentication. If unavailable, proceed to Step 6.

## Step 6: Test Real Share

The ultimate test is sharing the link on actual social networks:

### Twitter/X:
1. Compose new tweet
2. Paste: `https://anoteroslogos.com/`
3. Wait for preview to load (5-10 seconds)
4. **Verify:** Image, title, and description appear correctly
5. Delete draft (don't post yet)

### Facebook:
1. Create new post
2. Paste: `https://anoteroslogos.com/`
3. Wait for preview to load
4. **Verify:** Image, title, and description appear correctly
5. Delete draft (don't post yet)

### LinkedIn:
1. Create new post
2. Paste: `https://anoteroslogos.com/`
3. Wait for preview to load
4. **Verify:** Image, title, and description appear correctly
5. Delete draft (don't post yet)

## Step 7: Universal Validation

Use OpenGraph.xyz for multi-platform preview:

Visit: https://www.opengraph.xyz/

1. Enter URL: `https://anoteroslogos.com/`
2. Click **"Preview"**
3. Review how link appears on:
   - Facebook
   - Twitter
   - LinkedIn
   - WhatsApp
   - Telegram
   - Discord
   - Slack

## Troubleshooting

### Image Still Not Showing

**Possible causes:**
1. Vercel deployment not complete → Wait 5-10 minutes
2. CDN propagation delay → Wait up to 1 hour
3. Social network cache not cleared → Re-run cache clearing steps
4. Browser cache → Hard refresh (Ctrl+Shift+R / Cmd+Shift+R)

**Verify image URL directly:**
```bash
curl -I https://anoteroslogos.com/images/og-image.jpg
```

If 404, check Vercel deployment logs.

### Old Image Still Showing

Social networks cache aggressively. If old image persists:

1. Clear cache on Facebook Sharing Debugger (click "Scrape Again" multiple times)
2. Wait 1-2 hours for LinkedIn/Twitter cache expiration
3. Try incognito/private browsing mode to rule out browser cache

### Title/Description Not Updated

If image shows but text is outdated:

1. Check `index.html` meta tags are correct
2. Verify Vercel deployed latest commit
3. Clear caches (see Steps 3-4 above)

## Expected Results

After completing all steps, sharing `https://anoteroslogos.com/` should display:

**Image:**
- Anóteros Lógos branding
- "Knowledge Graph Engine for GEO" title
- "AI Knowledge Infrastructure Platform" subtitle
- "Don't rank. Become the source." tagline
- AID Protocol, A2A Protocol, RFC 9421 badges
- Professional blue gradient background

**Title:**
- Facebook/LinkedIn: "Knowledge Graph Engine for GEO | AI Knowledge Infrastructure | Anóteros Lógos"
- Twitter: "Knowledge Graph Engine for GEO | AI Knowledge Infrastructure Platform"

**Description:**
- Facebook/LinkedIn: "Citation intelligence platform with Direct LLM Integration. AI knowledge infrastructure for ChatGPT, Claude, Perplexity."
- Twitter: "Citation intelligence platform with Direct LLM Integration for ChatGPT, Claude, Perplexity. AID protocol discovery + AI platform syndication."

## Timeline

- **Immediate (0-5 min):** Vercel deployment completes
- **5-10 min:** CDN propagation globally
- **10-30 min:** Facebook cache cleared via Sharing Debugger
- **30-60 min:** LinkedIn cache cleared via Post Inspector
- **1-2 hours:** Twitter cache naturally expires (no manual clear)

## Next Actions

Once all platforms show correct preview:

1. ✅ Verify image appears on all platforms
2. ✅ Post official announcement on Twitter/X (see `marketing/x_post_launch.txt`)
3. ✅ Share on LinkedIn company page
4. ✅ Update internal documentation
5. ✅ Monitor engagement metrics

## Validation Checklist

- [ ] Vercel deployment status: Ready
- [ ] OG image accessible: `curl -I https://anoteroslogos.com/images/og-image.jpg` → 200
- [ ] Facebook cache cleared: Sharing Debugger shows new image
- [ ] LinkedIn cache cleared: Post Inspector shows new image
- [ ] Twitter preview validated: Card Validator shows `summary_large_image`
- [ ] Real share test on Twitter/X: Image + text correct
- [ ] Real share test on Facebook: Image + text correct
- [ ] Real share test on LinkedIn: Image + text correct
- [ ] OpenGraph.xyz universal preview: All platforms correct

## Reference

Full setup documentation: `OPEN_GRAPH_SETUP.md`

**Testing tools:**
- Facebook: https://developers.facebook.com/tools/debug/
- Twitter: https://cards-dev.twitter.com/validator
- LinkedIn: https://www.linkedin.com/post-inspector/
- Universal: https://www.opengraph.xyz/
