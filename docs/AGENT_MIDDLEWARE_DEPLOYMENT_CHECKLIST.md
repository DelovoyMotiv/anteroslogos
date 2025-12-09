# Agent Middleware Deployment Checklist

Use this checklist to ensure a smooth deployment of the Agent Middleware system.

## Pre-Deployment Setup

### Redis Configuration

- [ ] Choose Redis provider (Upstash recommended for Vercel)
- [ ] Create Redis instance
- [ ] Copy Redis connection URL
- [ ] Test Redis connection locally
- [ ] Configure Redis persistence (if self-hosted)
- [ ] Set up Redis monitoring

**Resources**: [REDIS_SETUP.md](REDIS_SETUP.md)

### Sentry Configuration (Optional but Recommended)

- [ ] Create Sentry account
- [ ] Create Node.js project
- [ ] Copy Sentry DSN
- [ ] Configure sample rates
- [ ] Set up alert rules
- [ ] Create custom dashboard

**Resources**: [SENTRY_INTEGRATION.md](SENTRY_INTEGRATION.md)

### Environment Variables

- [ ] Copy `.env.example` to `.env`
- [ ] Set `REDIS_URL`
- [ ] Set `AGENT_API_VERSION` (default: 1.0.0)
- [ ] Set `AGENT_API_TIMEOUT` (default: 15000)
- [ ] Set `ENABLE_HEADLESS_BROWSER` (default: false)
- [ ] Set `ENABLE_DEEP_MODE` (default: true)
- [ ] Set `SENTRY_DSN` (optional)
- [ ] Set `SENTRY_ENVIRONMENT` (production/staging/development)
- [ ] Set `SENTRY_SAMPLE_RATE` (default: 1.0)
- [ ] Set `SENTRY_TRACES_SAMPLE_RATE` (default: 0.1)

**Resources**: `.env.example`, [AGENT_MIDDLEWARE_DEPLOYMENT.md](AGENT_MIDDLEWARE_DEPLOYMENT.md)

### API Keys

- [ ] Access Supabase Dashboard
- [ ] Create test API key in `agent_api_keys` table
- [ ] Verify key hash is correct (SHA-256)
- [ ] Set appropriate quota limits
- [ ] Test authentication locally

**SQL Example**:
```sql
INSERT INTO agent_api_keys (
  tenant_id,
  key_hash,
  quota_limit,
  quota_used,
  is_active
) VALUES (
  'your-tenant-id',
  encode(digest('your-secret-key', 'sha256'), 'hex'),
  10000,
  0,
  true
);
```

## Local Testing

### Installation

- [ ] Run `npm install`
- [ ] Verify all dependencies installed
- [ ] Check for any security vulnerabilities

### Redis Connection

- [ ] Start Redis (Docker or local)
- [ ] Test connection: `redis-cli -u $REDIS_URL ping`
- [ ] Verify Redis is accessible from application

### Development Server

- [ ] Start dev server: `npm run dev`
- [ ] Verify server starts without errors
- [ ] Check console for any warnings

### API Testing

- [ ] Test OpenAPI endpoint: `GET /api/v1/agent/wrap`
- [ ] Test fast mode extraction
- [ ] Test deep mode extraction
- [ ] Test compact format
- [ ] Test JSON-LD format
- [ ] Test authentication (valid key)
- [ ] Test authentication (invalid key)
- [ ] Test rate limiting
- [ ] Test cache hit scenario
- [ ] Test error handling

**Test Commands**:
```bash
# OpenAPI docs
curl http://localhost:5173/api/v1/agent/wrap

# Fast mode
curl -X POST http://localhost:5173/api/v1/agent/wrap \
  -H "Authorization: Bearer test-key-123" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "mode": "fast"}'

# Deep mode
curl -X POST http://localhost:5173/api/v1/agent/wrap \
  -H "Authorization: Bearer test-key-123" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "mode": "deep"}'
```

### Test Suite

- [ ] Run all tests: `npm test`
- [ ] Verify all tests pass
- [ ] Run property-based tests
- [ ] Run integration tests
- [ ] Check test coverage

## Vercel Configuration

### Environment Variables

- [ ] Log into Vercel Dashboard
- [ ] Navigate to Project Settings → Environment Variables
- [ ] Add `REDIS_URL` (Production)
- [ ] Add `AGENT_API_VERSION` (Production)
- [ ] Add `AGENT_API_TIMEOUT` (Production)
- [ ] Add `ENABLE_HEADLESS_BROWSER` (Production)
- [ ] Add `ENABLE_DEEP_MODE` (Production)
- [ ] Add `SENTRY_DSN` (Production, optional)
- [ ] Add `SENTRY_ENVIRONMENT` (Production)
- [ ] Add `SENTRY_SAMPLE_RATE` (Production)
- [ ] Add `SENTRY_TRACES_SAMPLE_RATE` (Production)
- [ ] Verify all Supabase variables are set
- [ ] Save changes

### Function Configuration

- [ ] Verify `vercel.json` has agent middleware config
- [ ] Check `maxDuration` is set to 30 seconds
- [ ] Check `memory` is set to 1024 MB
- [ ] Commit `vercel.json` changes

## Deployment

### Pre-Deployment

- [ ] Commit all changes to git
- [ ] Push to main branch
- [ ] Create deployment tag (optional)
- [ ] Notify team of deployment

### Deploy

- [ ] Install Vercel CLI: `npm i -g vercel`
- [ ] Login: `vercel login`
- [ ] Deploy: `vercel --prod`
- [ ] Wait for deployment to complete
- [ ] Note deployment URL

### Verification

- [ ] Test OpenAPI endpoint on production
- [ ] Test fast mode extraction on production
- [ ] Test deep mode extraction on production
- [ ] Verify cache is working (check Redis)
- [ ] Verify authentication is working
- [ ] Verify rate limiting is working
- [ ] Check Sentry for any errors
- [ ] Monitor response times

**Production Test Commands**:
```bash
# OpenAPI docs
curl https://your-domain.com/api/v1/agent/wrap

# Fast mode
curl -X POST https://your-domain.com/api/v1/agent/wrap \
  -H "Authorization: Bearer your-production-key" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "mode": "fast"}'
```

## Post-Deployment

### Monitoring Setup

- [ ] Verify Sentry is receiving events
- [ ] Check Sentry dashboard for errors
- [ ] Set up Sentry alerts
- [ ] Monitor Redis metrics
- [ ] Check cache hit rate
- [ ] Monitor API response times
- [ ] Set up uptime monitoring (optional)

### Performance Verification

- [ ] Check P50 latency (target: < 2s for fast mode)
- [ ] Check P95 latency (target: < 10s for deep mode)
- [ ] Check P99 latency
- [ ] Verify cache hit rate (target: > 70%)
- [ ] Check Redis memory usage
- [ ] Monitor error rate (target: < 1%)

### Documentation

- [ ] Update deployment notes
- [ ] Document any custom configuration
- [ ] Update API documentation if needed
- [ ] Share deployment details with team
- [ ] Update runbook with any issues encountered

### Security Review

- [ ] Verify API keys are secure
- [ ] Check rate limiting is working
- [ ] Verify input validation
- [ ] Check error messages don't leak sensitive data
- [ ] Verify HTTPS is enforced
- [ ] Review Sentry data for PII

## Ongoing Maintenance

### Daily

- [ ] Check Sentry for new errors
- [ ] Monitor error rate
- [ ] Check API response times
- [ ] Verify cache hit rate

### Weekly

- [ ] Review Redis metrics
- [ ] Check quota usage by API key
- [ ] Review performance trends
- [ ] Check for any security alerts

### Monthly

- [ ] Rotate API keys (if needed)
- [ ] Update dependencies
- [ ] Review and optimize cache TTL
- [ ] Review Sentry costs
- [ ] Review Redis costs
- [ ] Update documentation

## Rollback Plan

If issues occur after deployment:

- [ ] Identify the issue (check Sentry, logs, metrics)
- [ ] Determine if rollback is needed
- [ ] Revert to previous deployment: `vercel rollback`
- [ ] Verify rollback was successful
- [ ] Investigate root cause
- [ ] Fix issue in development
- [ ] Test thoroughly
- [ ] Redeploy when ready

## Troubleshooting

### Common Issues

**Redis Connection Failed**
- [ ] Verify `REDIS_URL` is correct
- [ ] Check Redis server is running
- [ ] Test connection: `redis-cli -u $REDIS_URL ping`
- [ ] Check network connectivity
- [ ] Verify Redis credentials

**Authentication Failed**
- [ ] Verify API key exists in database
- [ ] Check key hash is correct
- [ ] Verify key is active
- [ ] Check Bearer token format
- [ ] Verify Supabase connection

**Timeout Errors**
- [ ] Increase `AGENT_API_TIMEOUT`
- [ ] Use fast mode instead of deep mode
- [ ] Check target URL response time
- [ ] Verify network connectivity

**High Error Rate**
- [ ] Check Sentry dashboard
- [ ] Review error logs
- [ ] Verify Redis connection
- [ ] Check Supabase connection
- [ ] Monitor resource usage

**Low Cache Hit Rate**
- [ ] Check Redis memory limits
- [ ] Verify cache TTL is appropriate
- [ ] Check for cache evictions
- [ ] Monitor cache key distribution

## Resources

- [Full Deployment Guide](AGENT_MIDDLEWARE_DEPLOYMENT.md)
- [Quick Start Guide](AGENT_MIDDLEWARE_QUICKSTART.md)
- [Redis Setup Guide](REDIS_SETUP.md)
- [Sentry Integration Guide](SENTRY_INTEGRATION.md)
- [Design Document](../.kiro/specs/agent-middleware/design.md)
- [Requirements Document](../.kiro/specs/agent-middleware/requirements.md)

## Support Contacts

- **Development Team**: [contact info]
- **DevOps Team**: [contact info]
- **On-Call**: [contact info]

## Sign-Off

- [ ] Deployment completed successfully
- [ ] All tests passing
- [ ] Monitoring configured
- [ ] Documentation updated
- [ ] Team notified

**Deployed by**: _______________  
**Date**: _______________  
**Version**: _______________  
**Notes**: _______________
