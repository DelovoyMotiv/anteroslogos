# Agent2Agent (A2A) Protocol - Complete Architecture

## 🎯 Overview

Production-grade protocol for AI agent communication with GEO Audit Platform.  
Optimized for **Perplexity**, **ChatGPT**, **Claude**, **Gemini**, and other AI search agents.

---

## 📐 Architecture Components

### ✅ CREATED (Production-Ready):

1. **`lib/a2a/protocol.ts`** (526 lines)
   - JSON-RPC 2.0 implementation
   - Zod schema validation
   - AI-friendly response formats
   - Known agent detection (Perplexity, ChatGPT, Claude, etc.)
   - Rate limit configurations (free/basic/pro/enterprise tiers)
   - Streaming protocol definitions

2. **`lib/a2a/rateLimiter.ts`** (249 lines)
   - Token bucket algorithm
   - Concurrent request limiting
   - Burst handling
   - In-memory storage (Redis-ready for production scale)

### 🔨 TO CREATE (Next Steps):

3. **`lib/a2a/adapter.ts`**
   - Convert GEO audit results to A2A format
   - Extract semantic data for AI consumption
   - Entity recognition and topic extraction

4. **`lib/a2a/server.ts`**
   - HTTP/REST endpoint handler
   - WebSocket server for streaming
   - Method routing and dispatching

5. **`lib/a2a/queue.ts`**
   - Job queue for async audits
   - Priority queue implementation
   - Progress tracking

6. **`lib/a2a/cache.ts`**
   - Response caching layer
   - TTL-based invalidation
   - Cache warming strategies

---

## 🔌 API Endpoints

### Base URL
```
https://api.anoteroslogos.com/a2a
```

### HTTP Endpoint
```
POST /a2a
Content-Type: application/json

{
  "jsonrpc": "2.0",
  "method": "geo.audit.request",
  "params": {
    "url": "https://example.com",
    "options": {
      "depth": "standard",
      "include_recommendations": true
    }
  },
  "id": "request-123"
}
```

### WebSocket Endpoint
```
ws://api.anoteroslogos.com/a2a/ws
```

---

## 📋 Available Methods

### Discovery & Capabilities

#### `a2a.discover`
Returns service capabilities, endpoints, and API documentation.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "method": "a2a.discover",
  "id": 1
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "result": {
    "service": {
      "name": "Anóteros Lógos GEO Audit API",
      "version": "1.0.0",
      "description": "AI-powered website analysis for Generative Engine Optimization",
      "provider": "Anóteros Lógos",
      "homepage": "https://anoteroslogos.com"
    },
    "protocol": {
      "version": "1.0.0",
      "spec": "JSON-RPC 2.0"
    },
    "capabilities": [...],
    "endpoints": {
      "http": "https://api.anoteroslogos.com/a2a",
      "ws": "wss://api.anoteroslogos.com/a2a/ws",
      "docs": "https://anoteroslogos.com/docs/a2a"
    }
  },
  "id": 1
}
```

### GEO Audit Methods

#### `geo.audit.request`
Request a full GEO audit for a website.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "method": "geo.audit.request",
  "params": {
    "url": "https://example.com",
    "options": {
      "depth": "comprehensive",
      "include_recommendations": true,
      "include_insights": true,
      "timeout": 60000,
      "priority": "high"
    }
  },
  "id": "audit-001"
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "result": {
    "audit_id": "aud_1234567890",
    "status": "processing",
    "estimated_time": 45000,
    "progress_url": "/a2a/audit/aud_1234567890/status"
  },
  "id": "audit-001"
}
```

#### `geo.audit.status`
Check audit status (for async audits).

**Request:**
```json
{
  "jsonrpc": "2.0",
  "method": "geo.audit.status",
  "params": {
    "audit_id": "aud_1234567890"
  },
  "id": "status-001"
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "result": {
    "audit_id": "aud_1234567890",
    "status": "completed",
    "progress": 100,
    "result_url": "/a2a/audit/aud_1234567890/result"
  },
  "id": "status-001"
}
```

#### `geo.audit.result`
Get completed audit results.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "method": "geo.audit.result",
  "params": {
    "audit_id": "aud_1234567890"
  },
  "id": "result-001"
}
```

**Response:** (AI-Optimized Format)
```json
{
  "jsonrpc": "2.0",
  "result": {
    "audit_id": "aud_1234567890",
    "url": "https://example.com",
    "timestamp": "2025-11-05T07:46:54Z",
    "status": "completed",
    "overall_score": 78,
    "grade": "B+",
    "confidence": 0.95,
    
    "categories": {
      "schema_markup": {
        "score": 85,
        "max_score": 100,
        "percentage": 85,
        "status": "good",
        "weight": 0.2
      },
      "eeat": {
        "score": 72,
        "max_score": 100,
        "percentage": 72,
        "status": "good",
        "weight": 0.15
      },
      ...
    },
    
    "findings": {
      "critical": [...],
      "warnings": [...],
      "recommendations": [...],
      "opportunities": [...]
    },
    
    "semantic_data": {
      "entity_type": "Organization",
      "industry": "Technology",
      "topics": ["GEO", "AI optimization", "SEO"],
      "keywords": ["generative engine", "AI search", "ChatGPT"],
      "entities": [
        {
          "type": "Organization",
          "name": "Example Corp",
          "confidence": 0.92
        }
      ]
    },
    
    "citations": {
      "sources": 12,
      "data_points": 45,
      "factual_claims": 23,
      "expert_quotes": 5
    },
    
    "insights": [
      {
        "type": "best_practice",
        "title": "Strong E-E-A-T Signals",
        "description": "Website demonstrates clear expertise with author credentials and citations",
        "confidence": 0.88
      }
    ],
    
    "metadata": {
      "processing_time_ms": 12450,
      "agent_used": "Perplexity AI",
      "depth": "comprehensive",
      "version": "1.0.0"
    }
  },
  "id": "result-001"
}
```

### Batch Operations

#### `geo.audit.batch`
Audit multiple URLs in parallel.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "method": "geo.audit.batch",
  "params": {
    "urls": [
      "https://example1.com",
      "https://example2.com",
      "https://example3.com"
    ],
    "options": {
      "depth": "standard",
      "parallel": true,
      "max_concurrent": 3,
      "fail_fast": false
    }
  },
  "id": "batch-001"
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "result": {
    "batch_id": "batch_987654321",
    "total_urls": 3,
    "status": "processing",
    "completed": 0,
    "failed": 0,
    "results": []
  },
  "id": "batch-001"
}
```

### Insights & Analytics

#### `geo.insights.global`
Get global GEO insights and benchmarks.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "method": "geo.insights.global",
  "params": {
    "timeframe": "30d"
  },
  "id": "insights-001"
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "result": {
    "timeframe": "30d",
    "total_audits": 15234,
    "average_score": 62.4,
    "median_score": 65,
    "trends": {
      "schema_adoption": {
        "organization": 67,
        "person": 34,
        "article": 45
      }
    },
    "best_practices": [...]
  },
  "id": "insights-001"
}
```

### Streaming Methods

#### `geo.audit.stream` (WebSocket)
Stream real-time audit progress.

**Subscribe:**
```json
{
  "jsonrpc": "2.0",
  "method": "geo.audit.stream",
  "params": {
    "url": "https://example.com"
  },
  "id": "stream-001"
}
```

**Progress Events:**
```json
{
  "type": "progress",
  "audit_id": "aud_1234567890",
  "timestamp": "2025-11-05T07:47:00Z",
  "data": {
    "stage": "Analyzing schema markup",
    "progress": 45,
    "message": "Found 12 schema types",
    "current_step": "schema_analysis",
    "total_steps": 8,
    "completed_steps": 3
  }
}
```

**Complete Event:**
```json
{
  "type": "complete",
  "audit_id": "aud_1234567890",
  "timestamp": "2025-11-05T07:48:00Z",
  "data": {
    ...full audit result...
  }
}
```

---

## 🔐 Authentication

### API Key (Recommended)
```
Authorization: Bearer a2a_live_1234567890abcdef
```

### OAuth 2.0 (For user-specific data)
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### No Auth (Free Tier, Limited)
Anonymous requests allowed with rate limits:
- 10 requests/minute
- 100 requests/hour
- 2 concurrent requests

---

## ⚡ Rate Limits

### Tier-Based Limits

| Tier | Requests/Min | Requests/Hour | Concurrent | Burst Size |
|------|--------------|---------------|------------|------------|
| Free | 10 | 100 | 2 | 5 |
| Basic ($99/mo) | 60 | 1,000 | 5 | 20 |
| Pro ($299/mo) | 300 | 10,000 | 20 | 100 |
| Enterprise (Custom) | 1,000 | 50,000 | 100 | 500 |

### Rate Limit Headers
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1699200000
X-RateLimit-Tier: pro
```

### Rate Limit Error
```json
{
  "jsonrpc": "2.0",
  "error": {
    "code": -32000,
    "message": "Rate limit exceeded. Try again in 12 seconds.",
    "data": {
      "remaining": 0,
      "resetAt": 1699200012000,
      "retryAfter": 12
    }
  },
  "id": null
}
```

---

## 🎨 AI-Friendly Features

### 1. Semantic Markup
All responses include structured semantic data:
- Entity types and properties
- Industry classification
- Topic extraction
- Keyword mapping

### 2. Citation Support
Explicit citation data for AI attribution:
- Source URLs
- Factual statements count
- Expert quotes
- Data points

### 3. Confidence Scores
Every data point includes confidence level (0-1):
```json
{
  "entity": "Example Corp",
  "confidence": 0.92
}
```

### 4. Streaming Support
Real-time progress updates via WebSocket for long-running operations.

### 5. Batch Processing
Analyze up to 100 URLs in parallel with intelligent queuing.

---

## 🔧 Error Handling

### Standard JSON-RPC 2.0 Errors
- `-32700`: Parse error
- `-32600`: Invalid request
- `-32601`: Method not found
- `-32602`: Invalid params
- `-32603`: Internal error

### Custom Application Errors
- `-32000`: Rate limit exceeded
- `-32001`: Authentication required
- `-32002`: Insufficient credits
- `-32003`: Invalid URL
- `-32004`: Timeout
- `-32005`: Service unavailable
- `-32006`: Concurrent limit exceeded
- `-32007`: Invalid API key
- `-32008`: Audit failed

---

## 📊 Performance Optimizations

### 1. Response Caching
- Cache duration: 1 hour for audit results
- Conditional requests supported (ETag)
- Cache warming for popular domains

### 2. Compression
- Gzip/Brotli support
- ~70% size reduction for responses

### 3. CDN Integration
- CloudFlare edge caching
- Geographic routing
- DDoS protection

### 4. Request Prioritization
- `high`: Response within 10s
- `normal`: Response within 30s
- `low`: Best effort

---

## 🧪 Testing

### cURL Example
```bash
curl -X POST https://api.anoteroslogos.com/a2a \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer a2a_live_..." \
  -d '{
    "jsonrpc": "2.0",
    "method": "geo.audit.request",
    "params": {
      "url": "https://example.com"
    },
    "id": 1
  }'
```

### Python Example
```python
import requests

url = "https://api.anoteroslogos.com/a2a"
headers = {
    "Content-Type": "application/json",
    "Authorization": "Bearer a2a_live_..."
}
payload = {
    "jsonrpc": "2.0",
    "method": "geo.audit.request",
    "params": {
        "url": "https://example.com"
    },
    "id": 1
}

response = requests.post(url, json=payload, headers=headers)
print(response.json())
```

### JavaScript Example
```javascript
const response = await fetch('https://api.anoteroslogos.com/a2a', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer a2a_live_...'
  },
  body: JSON.stringify({
    jsonrpc: '2.0',
    method: 'geo.audit.request',
    params: {
      url: 'https://example.com'
    },
    id: 1
  })
});

const data = await response.json();
console.log(data);
```

---

## 🚀 Production Deployment

### Infrastructure Requirements
- **Backend**: Node.js 20+ / Vercel Serverless Functions
- **Database**: Supabase PostgreSQL
- **Cache**: Redis (or in-memory for start)
- **Queue**: Bull (Redis-based) or Supabase Realtime
- **CDN**: CloudFlare
- **Monitoring**: Sentry + Custom metrics

### Environment Variables
```env
A2A_ENABLED=true
A2A_BASE_URL=https://api.anoteroslogos.com/a2a
A2A_WS_URL=wss://api.anoteroslogos.com/a2a/ws
A2A_MAX_CONCURRENT=100
A2A_DEFAULT_TIER=free
```

### Scaling Strategy
1. **Horizontal scaling**: Multiple serverless functions
2. **Queue-based processing**: Decouple request/response
3. **Caching layer**: Reduce database load
4. **Rate limiting**: Protect against abuse

---

## 📚 Resources

- **API Documentation**: https://anoteroslogos.com/docs/a2a
- **OpenAPI Spec**: https://api.anoteroslogos.com/a2a/openapi.json
- **Changelog**: https://anoteroslogos.com/docs/a2a/changelog
- **Status Page**: https://status.anoteroslogos.com

---

**Version**: 1.0.0  
**Status**: Production-Ready (Core protocol complete)  
**Last Updated**: 2025-11-05  
**Maintainer**: Anóteros Lógos Engineering Team
