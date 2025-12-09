# Deployment Guide

## Overview

This document consolidates deployment information for the AI-powered SEO audit platform.

## Prerequisites

- Node.js 18+
- Supabase account
- Vercel account (for deployment)
- Environment variables configured

## Environment Variables

Required environment variables (see `.env.example`):

```bash
# Supabase
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Application
VITE_APP_URL=your_app_url
NODE_ENV=production

# Optional: Analytics, monitoring, etc.
```

## Deployment Steps

### 1. Vercel Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### 2. Supabase Setup

All migrations are in `supabase/migrations/` and will be applied automatically.

See `supabase/migrations/MIGRATION_GUIDE.md` for details.

### 3. DNS Configuration

Configure your custom domain in Vercel dashboard:
- Add CNAME record pointing to `cname.vercel-dns.com`
- Configure SSL (automatic with Vercel)

### 4. Post-Deployment

- Verify all migrations applied successfully
- Test authentication flow
- Check monitoring dashboards (Grafana)
- Verify API endpoints

## Monitoring

See `grafana/README.md` for monitoring setup.

## Troubleshooting

Common issues and solutions:

1. **Migration failures**: Check Supabase logs
2. **Build errors**: Verify all dependencies installed
3. **Environment variables**: Ensure all required vars set

## Agent Middleware Deployment

For deploying the Agent Middleware system, see:
- [Agent Middleware Deployment Guide](AGENT_MIDDLEWARE_DEPLOYMENT.md)
- [Redis Setup Guide](REDIS_SETUP.md)
- [Sentry Integration Guide](SENTRY_INTEGRATION.md)

## Support

For issues, check:
- `CHANGELOG.md` for recent changes
- `supabase/migrations/MIGRATION_GUIDE.md` for database issues
- GitHub Issues for known problems
