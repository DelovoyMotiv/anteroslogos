# Agent Middleware Quick Start Guide

## 5-Minute Setup

Get the Agent Middleware running locally in 5 minutes.

## Prerequisites

- Node.js 18+
- Redis (Docker recommended)
- Supabase account (already configured)

## Step 1: Start Redis

Using Docker (recommended):

```bash
docker run -d -p 6379:6379 --name agent-redis redis:7-alpine
```

Or use existing Redis installation.

## Step 2: Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit .env and set these variables:
REDIS_URL=redis://localhost:6379
AGENT_API_VERSION=1.0.0
AGENT_API_TIMEOUT=15000
ENABLE_HEADLESS_BROWSER=false
ENABLE_DEEP_MODE=true
```

## Step 3: Install Dependencies

```bash
npm install
```

## Step 4: Start Development Server

```bash
npm run dev
```

The server will start at `http://localhost:5173`

## Step 5: Test the API

### Get OpenAPI Documentation

```bash
curl http://localhost:5173/api/v1/agent/wrap
```

### Create Test API Key

1. Log into Supabase Dashboard
2. Go to SQL Editor
3. Run:

```sql
INSERT INTO agent_api_keys (
  tenant_id,
  key_hash,
  quota_limit,
  quota_used,
  is_active
) VALUES (
  'test-tenant',
  encode(digest('test-key-123', 'sha256'), 'hex'),
  10000,
  0,
  true
);
```

### Test Extraction

```bash
curl -X POST http://localhost:5173/api/v1/agent/wrap \
  -H "Authorization: Bearer test-key-123" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "mode": "fast",
    "format": "compact"
  }'
```

## Expected Response

```json
{
  "meta": {
    "target_url": "https://example.com",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "latency_ms": 1234,
    "cost_tokens": 500,
    "cache_hit": false,
    "mode": "fast",
    "format": "compact"
  },
  "content": {
    "title": "Example Domain",
    "summary": "This domain is for use in illustrative examples..."
  },
  "knowledge_graph": {
    "schema": ["id", "type", "name", "confidence"],
    "entities": [],
    "relations": {
      "schema": ["source", "target", "type"],
      "data": []
    }
  }
}
```

## Next Steps

1. **Read the Documentation**
   - [Full Deployment Guide](AGENT_MIDDLEWARE_DEPLOYMENT.md)
   - [Design Document](../.kiro/specs/agent-middleware/design.md)
   - [Requirements](../.kiro/specs/agent-middleware/requirements.md)

2. **Set Up Production**
   - [Redis Setup Guide](REDIS_SETUP.md)
   - [Sentry Integration](SENTRY_INTEGRATION.md)

3. **Run Tests**
   ```bash
   npm test
   ```

4. **Deploy to Vercel**
   ```bash
   vercel --prod
   ```

## Common Issues

### Redis Connection Failed

**Error**: `Error: connect ECONNREFUSED 127.0.0.1:6379`

**Solution**: Start Redis:
```bash
docker start agent-redis
# or
redis-server
```

### Authentication Failed

**Error**: `ERR_AUTH_INVALID`

**Solution**: Verify API key is in database:
```sql
SELECT * FROM agent_api_keys 
WHERE key_hash = encode(digest('test-key-123', 'sha256'), 'hex');
```

### Timeout Errors

**Error**: `ERR_TIMEOUT`

**Solution**: Increase timeout:
```bash
AGENT_API_TIMEOUT=30000
```

## API Modes

### Fast Mode (Default)

Quick extraction of metadata and schema:

```bash
curl -X POST http://localhost:5173/api/v1/agent/wrap \
  -H "Authorization: Bearer test-key-123" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "mode": "fast"}'
```

**Response time**: 1-3 seconds  
**Use case**: Quick metadata extraction

### Deep Mode

Comprehensive extraction with knowledge graph:

```bash
curl -X POST http://localhost:5173/api/v1/agent/wrap \
  -H "Authorization: Bearer test-key-123" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "mode": "deep"}'
```

**Response time**: 5-15 seconds  
**Use case**: Full entity extraction and relationships

## Output Formats

### Compact Format (Default)

Token-optimized columnar format:

```json
{
  "knowledge_graph": {
    "schema": ["id", "type", "name"],
    "entities": [
      ["e1", "Organization", "Example Corp"],
      ["e2", "Person", "John Doe"]
    ]
  }
}
```

### JSON-LD Format

Standard Linked Data format:

```bash
curl -X POST http://localhost:5173/api/v1/agent/wrap \
  -H "Authorization: Bearer test-key-123" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "format": "json-ld"}'
```

```json
{
  "knowledge_graph": {
    "entities": [
      {
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": "Example Corp"
      }
    ]
  }
}
```

## Monitoring

### Check Cache Status

```bash
redis-cli -h localhost -p 6379 INFO stats | grep keyspace
```

### View Logs

```bash
# Development logs
tail -f logs/agent-middleware.log

# Or use console output
npm run dev
```

### Monitor Performance

```bash
# Cache hit rate
redis-cli INFO stats | grep keyspace_hits

# Memory usage
redis-cli INFO memory | grep used_memory_human
```

## Development Tips

### Enable Debug Logging

```bash
LOG_LEVEL=debug npm run dev
```

### Clear Cache

```bash
redis-cli FLUSHDB
```

### Test Different URLs

```bash
# Static content
curl -X POST http://localhost:5173/api/v1/agent/wrap \
  -H "Authorization: Bearer test-key-123" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'

# Rich schema markup
curl -X POST http://localhost:5173/api/v1/agent/wrap \
  -H "Authorization: Bearer test-key-123" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.imdb.com/title/tt0111161/"}'
```

## Additional Resources

- [API Documentation](http://localhost:5173/api/v1/agent/wrap) (GET request)
- [Design Document](../.kiro/specs/agent-middleware/design.md)
- [Requirements](../.kiro/specs/agent-middleware/requirements.md)
- [Integration Notes](../.kiro/specs/agent-middleware/INTEGRATION_NOTES.md)
