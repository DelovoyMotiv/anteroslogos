# Vercel Deployment Setup

## Environment Variables Configuration

For the Agent Manifest Generator to work on Vercel, you need to configure environment variables in the Vercel dashboard.

### Required Variables

Go to your Vercel project → Settings → Environment Variables and add:

#### OpenRouter API Key (Required)
```
OPENROUTER_API_KEY=your_openrouter_api_key_here
```

**Note:** Use `OPENROUTER_API_KEY` (without `VITE_` prefix) for Vercel Serverless Functions. The `VITE_` prefix only works for client-side code.

#### Optional: Budget and Rate Limiting
```
OPENROUTER_BUDGET_LIMIT=100
OPENROUTER_ALERT_THRESHOLD=80
OPENROUTER_RATE_LIMIT_RPM=10
```

### Why Two Versions?

- **`VITE_OPENROUTER_API_KEY`** - Used by client-side code (browser)
- **`OPENROUTER_API_KEY`** - Used by server-side code (Vercel Serverless Functions)

The code automatically checks both versions, so you can set both in Vercel for maximum compatibility.

### How to Add Variables in Vercel

1. Go to https://vercel.com/dashboard
2. Select your project
3. Go to Settings → Environment Variables
4. Add each variable with:
   - **Name:** Variable name (e.g., `OPENROUTER_API_KEY`)
   - **Value:** Your actual value
   - **Environment:** Select all (Production, Preview, Development)
5. Click "Save"
6. Redeploy your application

### Verification

After adding the variables and redeploying:

1. Visit your deployed site
2. Go to the Agent Manifest Generator page
3. Try generating a manifest
4. If you see "AI service is currently unavailable", check:
   - Variable name is correct (no typos)
   - Variable is set for Production environment
   - You've redeployed after adding the variable

### Troubleshooting

If the error persists:

1. Check Vercel logs:
   - Go to your project → Deployments
   - Click on the latest deployment
   - Go to Functions tab
   - Check logs for `/api/tools`

2. Verify the API key is valid:
   - Go to https://openrouter.ai/keys
   - Check if your key is active
   - Try regenerating the key if needed

3. Check the error message in browser console:
   - Open DevTools (F12)
   - Go to Console tab
   - Look for error messages

### API Endpoint Limit

Vercel Hobby plan limits Serverless Functions to 12 endpoints. This project uses a unified `/api/tools` endpoint to stay within this limit.

Current API endpoints count: 12 (at limit)

If you need to add more endpoints, consider:
- Consolidating more endpoints into `/api/tools`
- Upgrading to Vercel Pro plan
- Using Edge Functions instead of Serverless Functions
