# Agent Middleware Deployment Guide

## Overview

This guide covers the deployment of the Agent Middleware system, a high-performance API layer that provides structured, token-optimized data extraction for autonomous AI agents.

## Architecture

The Agent Middleware consists of:
- **API Endpoint**: `/api/v1/agent/wrap` (POST for extraction, GET for OpenAPI docs)
- **Extraction Engine**: Web scraping and HTML parsing
- **Entity Extractor**: Semantic entity identification and normalization
- **Semantic Serializer**: Token-efficient format conversion
- **Cache Layer**: Redis-based caching (24-hour TTL)
- **Authentication**: Bearer token validation via Supabase
- **Rate Limiting**: Per-API-key and global rate limits

## Prerequisites

### Required Services

1. **Supabase** (already configured)
   - API key authentication and quota management
   - User and tenant management

2. **Redis** (required for production)
   - Caching extraction results
   - Rate limiting state
   - Choose one:
     - **Upstash Redis** (recommended for Vercel)
     - **Self-hosted Redis** (for custom infrastructure)

3. **Sentry** (optional but recommended)
   - Error tracking and monitoring
   - Performance monitoring

### Required Tools

- Node.js 18+
- Vercel CLI (for deployment)
- Redis CLI (for testing)

## Environment Configuration

### 1. Redis Setup

#### Option A: Upstash Redis (Recommended for Vercel)

1. Create account at [console.upstash.com](https://console.upstash.com)
2. Create a new Redis database
3. Copy the connection URL
4. Add to environment variables:

```bash
REDIS_URL=redis://default:your-password@region.upstash.io:port
```

#### Option B: Self-Hosted Redis

1. Install Redis:
```bash
# Ubuntu/Debian
sudo apt-get install redis-server

# macOS
brew install redis

# Docker
docker run -d -p 6379:6379 redis:7-alpine
```

2. Configure connection:
```bash
REDIS_URL=redis://localhost:6379
```

### 2. Sentry Setup (Optional)

1. Create account at [sentry.io](https://sentry.io)
2. Create a new project (Node.js)
3. Copy the DSN
4. Add to environment variables:

```bash
SENTRY_DSN=https://your-key@sentry.io/your-project-id
SENTRY_ENVIRONMENT=production
SENTRY_SAMPLE_RATE=1.0
SENTRY_TRACES_SAMPLE_RATE=0.1
```

### 3. Agent Middleware Configuration

Add these variables to your `.env` file (see `.env.example` for reference):

```bash
# ==================== AGENT MIDDLEWARE CONFIGURATION ====================

# Redis URL for caching (required for production)
REDIS_URL=redis://default:password@region.upstash.io:port

# Agent API version
AGENT_API_VERSION=1.0.0

# Extraction timeout (milliseconds)
AGENT_API_TIMEOUT=15000

# Enable headless browser for dynamic content
ENABLE_HEADLESS_BROWSER=false

# Enable deep mode extraction
ENABLE_DEEP_MODE=true

# Sentry configuration (optional)
SENTRY_DSN=
SENTRY_ENVIRONMENT=production
SENTRY_SAMPLE_RATE=1.0
SENTRY_TRACES_SAMPLE_RATE=0.1
```

## Deployment Steps

### 1. Local Testing

Before deploying, test locally:

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Run tests
npm test

# Start development server
npm run dev
```

Test the endpoint:
```bash
# Get OpenAPI documentation
curl http://localhost:5173/api/v1/agent/wrap

# Test extraction (requires valid API key)
curl -X POST http://localhost:5173/api/v1/agent/wrap \
  -H "Authorization: Bearer your-api-key" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "mode": "fast", "format": "compact"}'
```

### 2. Vercel Deployment

#### Configure Environment Variables

In Vercel Dashboard:
1. Go to Project Settings → Environment Variables
2. Add all required variables from `.env.example`
3. Ensure these are set for Production environment:

```
REDIS_URL
AGENT_API_VERSION
AGENT_API_TIMEOUT
ENABLE_HEADLESS_BROWSER
ENABLE_DEEP_MODE
SENTRY_DSN (optional)
SENTRY_ENVIRONMENT
```

#### Deploy

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy to production
vercel --prod
```

#### Verify Deployment

```bash
# Check OpenAPI documentation
curl https://your-domain.com/api/v1/agent/wrap

# Test extraction
curl -X POST https://your-domain.com/api/v1/agent/wrap \
  -H "Authorization: Bearer your-api-key" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "mode": "fast"}'
```

### 3. Redis Connection Verification

Test Redis connection:

```bash
# Using redis-cli
redis-cli -u $REDIS_URL ping
# Should return: PONG

# Check connection from Node.js
node -e "
const Redis = require('ioredis');
const redis = new Redis(process.env.REDIS_URL);
redis.ping().then(console.log).catch(console.error);
"
```

### 4. API Key Setup

Create API keys for consumers:

1. Log into Supabase Dashboard
2. Navigate to your `agent_api_keys` table
3. Insert a new key:

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

## Configuration Options

### Performance Tuning

#### Timeout Configuration

Adjust based on your needs:
- **Fast mode**: 5-10 seconds
- **Deep mode**: 15-30 seconds

```bash
AGENT_API_TIMEOUT=15000  # 15 seconds
```

#### Memory Allocation

For Vercel, the function memory is configured in `vercel.json`:

```json
{
  "functions": {
    "api/v1/agent/wrap.ts": {
      "maxDuration": 30,
      "memory": 1024
    }
  }
}
```

#### Cache TTL

Cache TTL is hardcoded to 24 hours (86400 seconds) in `lib/engine/cache.ts`. To modify:

```typescript
// lib/engine/cache.ts
const CACHE_TTL = 86400; // 24 hours in seconds
```

### Feature Flags

#### Headless Browser

Enable for JavaScript-rendered content:

```bash
ENABLE_HEADLESS_BROWSER=true
```

**Note**: Headless browser increases:
- Memory usage (~200MB per instance)
- Latency (~2-5 seconds additional)
- Resource costs

#### Deep Mode

Enable comprehensive extraction:

```bash
ENABLE_DEEP_MODE=true
```

Deep mode includes:
- Full entity extraction
- Relationship mapping
- Knowledge graph construction
- Higher token costs

### Rate Limiting

Rate limits are configured in `lib/middleware/agentRateLimiter.ts`:

- **Per-API-key**: 100 requests/minute
- **Global**: 1000 requests/minute

To modify, edit the configuration:

```typescript
// lib/middleware/agentRateLimiter.ts
const PER_KEY_LIMIT = 100;
const GLOBAL_LIMIT = 1000;
```

## Monitoring

### Sentry Integration

If Sentry is configured, you'll automatically get:

1. **Error Tracking**
   - Unhandled exceptions
   - API errors with context
   - Stack traces

2. **Performance Monitoring**
   - Request latency
   - Cache hit rates
   - Extraction performance

3. **Alerts**
   - Error rate spikes
   - Performance degradation
   - Quota exhaustion

### Custom Metrics

The system logs structured data for monitoring:

```typescript
// Request logging
{
  url: string,
  mode: 'fast' | 'deep',
  format: 'compact' | 'json-ld',
  api_key_id: string,
  timestamp: string
}

// Extraction logging
{
  latency_ms: number,
  cache_hit: boolean,
  token_savings: number,
  entity_count: number,
  relationship_count: number
}

// Error logging
{
  error_code: string,
  error_message: string,
  stack_trace: string,
  url: string,
  request_id: string
}
```

### Health Checks

Monitor these endpoints:

```bash
# API health
curl https://your-domain.com/api/v1/agent/wrap

# Redis health
redis-cli -u $REDIS_URL ping

# Supabase health
curl https://your-project.supabase.co/rest/v1/
```

## Troubleshooting

### Common Issues

#### 1. Redis Connection Failures

**Symptom**: `ERR_CACHE_UNAVAILABLE` errors

**Solutions**:
- Verify `REDIS_URL` is correct
- Check Redis server is running
- Verify network connectivity
- Check Redis memory limits

```bash
# Test connection
redis-cli -u $REDIS_URL ping

# Check memory
redis-cli -u $REDIS_URL INFO memory
```

#### 2. Timeout Errors

**Symptom**: `ERR_TIMEOUT` errors

**Solutions**:
- Increase `AGENT_API_TIMEOUT`
- Use fast mode instead of deep mode
- Enable caching for repeated requests
- Check target URL response time

#### 3. Authentication Failures

**Symptom**: `ERR_AUTH_INVALID` errors

**Solutions**:
- Verify API key is correct
- Check key is active in database
- Verify Bearer token format
- Check Supabase connection

```sql
-- Check API key status
SELECT * FROM agent_api_keys WHERE key_hash = encode(digest('your-key', 'sha256'), 'hex');
```

#### 4. Rate Limiting

**Symptom**: `ERR_RATE_LIMIT` errors (HTTP 429)

**Solutions**:
- Wait for rate limit window to reset
- Implement exponential backoff
- Request quota increase
- Use caching to reduce requests

#### 5. Memory Issues

**Symptom**: Function crashes or OOM errors

**Solutions**:
- Increase Vercel function memory
- Disable headless browser
- Use fast mode instead of deep mode
- Implement request queuing

### Debug Mode

Enable verbose logging:

```bash
# Set log level
LOG_LEVEL=debug

# Enable Sentry debug
SENTRY_DEBUG=true
```

### Performance Optimization

#### Cache Hit Rate

Monitor cache hit rate:

```bash
# Redis stats
redis-cli -u $REDIS_URL INFO stats | grep keyspace_hits
```

Target: 70%+ cache hit rate

#### Response Time

Monitor p95 latency:
- **Fast mode**: < 2 seconds
- **Deep mode**: < 10 seconds
- **Cache hit**: < 100ms

## Security Considerations

### API Key Management

1. **Rotation**: Rotate keys regularly
2. **Hashing**: Keys are SHA-256 hashed in database
3. **Revocation**: Set `is_active = false` to revoke
4. **Quotas**: Enforce usage limits

### Rate Limiting

Prevents abuse:
- Per-key limits
- Global limits
- Exponential backoff
- IP-based limiting (future)

### Input Validation

All inputs are validated:
- URL format (HTTP/HTTPS only)
- Parameter types (Zod schemas)
- Size limits (max URL length)
- Injection prevention

### Data Privacy

- No PII stored in cache
- Cache expires after 24 hours
- HTTPS-only communication
- GDPR-compliant handling

## Scaling

### Horizontal Scaling

The system is stateless and scales horizontally:

1. **Vercel**: Automatic scaling
2. **Redis**: Use Redis Cluster for high throughput
3. **Load Balancing**: Vercel handles automatically

### Vertical Scaling

Increase resources per instance:

```json
// vercel.json
{
  "functions": {
    "api/v1/agent/wrap.ts": {
      "maxDuration": 60,
      "memory": 3008
    }
  }
}
```

### Cost Optimization

1. **Caching**: Reduces extraction costs
2. **Fast mode**: Lower resource usage
3. **Rate limiting**: Prevents abuse
4. **Quota management**: Controls usage

## Maintenance

### Regular Tasks

1. **Monitor cache hit rate** (weekly)
2. **Review error logs** (daily)
3. **Check quota usage** (daily)
4. **Rotate API keys** (monthly)
5. **Update dependencies** (monthly)

### Backup and Recovery

1. **Redis**: Enable persistence
2. **Supabase**: Automatic backups
3. **Configuration**: Version control

### Updates

Deploy updates:

```bash
# Pull latest changes
git pull origin main

# Run tests
npm test

# Deploy
vercel --prod
```

## Support

For issues:
1. Check this documentation
2. Review error logs in Sentry
3. Check Redis connection
4. Verify environment variables
5. Contact support team

## Additional Resources

- [Agent Middleware Design Document](.kiro/specs/agent-middleware/design.md)
- [Agent Middleware Requirements](.kiro/specs/agent-middleware/requirements.md)
- [Rate Limiting Implementation](.kiro/specs/agent-middleware/RATE_LIMITING_IMPLEMENTATION.md)
- [Integration Notes](.kiro/specs/agent-middleware/INTEGRATION_NOTES.md)
- [Vercel Documentation](https://vercel.com/docs)
- [Upstash Redis Documentation](https://docs.upstash.com/redis)
- [Sentry Documentation](https://docs.sentry.io/)
