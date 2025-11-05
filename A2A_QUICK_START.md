# ⚡ A2A Protocol - Quick Start

## 🎯 Что создано

**Agent2Agent (A2A) Protocol** - Production-ready протокол для взаимодействия с AI агентами (Perplexity, ChatGPT, Claude, Gemini).

---

## ✅ Созданные компоненты:

### 1. **Core Protocol** (`lib/a2a/protocol.ts` - 526 строк)
- ✅ JSON-RPC 2.0 стандарт
- ✅ Zod валидация (runtime type safety)
- ✅ AI-friendly форматы ответов
- ✅ Определение всех методов (audit, batch, insights, streaming)
- ✅ Детекция известных агентов (Perplexity, ChatGPT, Claude, Gemini, Grok)
- ✅ Rate limit конфигурации (4 тира: free/basic/pro/enterprise)
- ✅ Streaming protocol definitions

### 2. **Rate Limiter** (`lib/a2a/rateLimiter.ts` - 249 строк)
- ✅ Token bucket algorithm (production-grade)
- ✅ Concurrent request limiting
- ✅ Burst handling
- ✅ In-memory storage (Redis-ready)
- ✅ Auto-cleanup старых buckets

### 3. **Documentation** (`docs/A2A_PROTOCOL_ARCHITECTURE.md` - 657 строк)
- ✅ Полная спецификация API
- ✅ Примеры всех методов
- ✅ cURL/Python/JavaScript примеры
- ✅ Deployment guide
- ✅ Performance optimizations

---

## 🚀 Следующие шаги (для полной реализации):

### Шаг 1: Adapter (конвертер)
```typescript
// lib/a2a/adapter.ts
// Конвертирует AuditResult → A2AAuditResult
// + Извлечение entity, topics, keywords
// + Semantic markup для AI
```

### Шаг 2: Server (HTTP + WebSocket)
```typescript
// lib/a2a/server.ts (или api/a2a/route.ts для Vercel)
// HTTP POST /a2a - JSON-RPC endpoint
// WebSocket /a2a/ws - Streaming
// Method routing и dispatching
```

### Шаг 3: Queue System
```typescript
// lib/a2a/queue.ts
// Job queue для async audits
// Priority queue (high/normal/low)
// Progress tracking
```

### Шаг 4: Cache Layer
```typescript
// lib/a2a/cache.ts
// Response caching (1 hour TTL)
// ETag support
// Cache warming
```

---

## 📦 Установленные зависимости:

```json
{
  "zod": "^3.x",              // Runtime validation
  "ioredis": "^5.x",          // Redis client (для production scale)
  "bull": "^4.x",             // Job queue
  "express": "^4.x",          // HTTP server (опционально)
  "ws": "^8.x",               // WebSocket
  "jsonwebtoken": "^9.x",     // JWT auth
  "rate-limiter-flexible": "^5.x", // Advanced rate limiting
  "uuid": "^10.x"             // ID generation
}
```

---

## 🔌 Как использовать (примеры):

### Пример 1: Простой audit request
```typescript
import { A2AMethod, AuditRequestParamsSchema } from './lib/a2a/protocol';

const request = {
  jsonrpc: '2.0',
  method: A2AMethod.AUDIT_REQUEST,
  params: {
    url: 'https://example.com',
    options: {
      depth: 'standard',
      include_recommendations: true
    }
  },
  id: 'req-001'
};

// Validate params
const validParams = AuditRequestParamsSchema.parse(request.params);
```

### Пример 2: Rate limiting
```typescript
import { globalRateLimiter, withRateLimit } from './lib/a2a/rateLimiter';

const apiKey = 'user_123';

// Выполнить с rate limiting
const result = await withRateLimit(globalRateLimiter, apiKey, async () => {
  // Ваш код здесь
  return await performAudit(url);
});
```

### Пример 3: Детекция AI агента
```typescript
import { detectAgent } from './lib/a2a/protocol';

const agent = detectAgent(
  req.headers['user-agent'],
  { 'x-agent-name': 'Perplexity' }
);

if (agent) {
  console.log(`Detected: ${agent.name}`);
  // Оптимизировать ответ для конкретного агента
}
```

---

## 📊 Архитектура (High-Level):

```
┌─────────────┐
│ AI Agent    │ (Perplexity, ChatGPT, Claude)
│ (HTTP/WS)   │
└──────┬──────┘
       │
       │ JSON-RPC 2.0 Request
       ▼
┌─────────────────────────────────┐
│ A2A Server                      │
│ ┌────────────┐  ┌─────────────┐│
│ │ Rate       │  │ Auth        ││
│ │ Limiter    │→ │ Middleware  ││
│ └────────────┘  └─────────────┘│
│        │                        │
│        ▼                        │
│ ┌─────────────────────────────┐│
│ │ Method Router               ││
│ ├─────────────────────────────┤│
│ │ • geo.audit.request         ││
│ │ • geo.audit.batch           ││
│ │ • geo.insights.global       ││
│ │ • a2a.discover              ││
│ └────────┬────────────────────┘│
└──────────┼──────────────────────┘
           │
           ▼
    ┌──────────────┐
    │ Job Queue    │ ← Async processing
    └──────┬───────┘
           │
           ▼
    ┌──────────────┐
    │ GEO Audit    │
    │ Engine       │
    └──────┬───────┘
           │
           ▼
    ┌──────────────┐
    │ Adapter      │ ← Convert to A2A format
    └──────┬───────┘
           │
           ▼
    ┌──────────────┐
    │ Cache        │
    └──────┬───────┘
           │
           ▼ JSON-RPC 2.0 Response
    ┌──────────────┐
    │ AI Agent     │
    └──────────────┘
```

---

## 🎨 AI-Friendly Features:

### 1. Structured Semantic Data
```json
{
  "semantic_data": {
    "entity_type": "Organization",
    "industry": "Technology",
    "topics": ["GEO", "AI", "SEO"],
    "keywords": ["optimization", "search"],
    "entities": [
      {
        "type": "Organization",
        "name": "Example Corp",
        "confidence": 0.92
      }
    ]
  }
}
```

### 2. Citation Support
```json
{
  "citations": {
    "sources": 12,
    "data_points": 45,
    "factual_claims": 23,
    "expert_quotes": 5
  }
}
```

### 3. Confidence Scores
Каждый data point имеет confidence (0-1):
```json
{
  "overall_score": 78,
  "confidence": 0.95
}
```

---

## 🔐 Rate Limits:

| Tier | Requests/Min | Concurrent | Burst |
|------|--------------|------------|-------|
| **Free** | 10 | 2 | 5 |
| **Basic** | 60 | 5 | 20 |
| **Pro** | 300 | 20 | 100 |
| **Enterprise** | 1000 | 100 | 500 |

---

## 📝 Что еще нужно:

### 1. **Adapter Implementation** (приоритет: HIGH)
Файл: `lib/a2a/adapter.ts`

```typescript
export function convertToA2AFormat(
  auditResult: AuditResult,
  context: A2AContext
): A2AAuditResult {
  // TODO: Implement conversion
  // - Extract semantic data
  // - Detect entities (NLP)
  // - Calculate confidence scores
  // - Format findings
}
```

### 2. **API Route** (приоритет: HIGH)
Файл: `api/a2a/route.ts` (Vercel serverless function)

```typescript
export async function POST(req: Request) {
  // 1. Parse JSON-RPC request
  // 2. Validate with Zod
  // 3. Check rate limit
  // 4. Route to method handler
  // 5. Return JSON-RPC response
}
```

### 3. **WebSocket Server** (приоритет: MEDIUM)
Для streaming audit progress в real-time.

### 4. **Integration Tests** (приоритет: MEDIUM)
```typescript
// tests/a2a.test.ts
describe('A2A Protocol', () => {
  it('should handle audit request', async () => {
    // Test full flow
  });
});
```

---

## ✨ Преимущества A2A Protocol:

1. **Стандартизация** - JSON-RPC 2.0 (универсальный стандарт)
2. **Type Safety** - Zod валидация в runtime
3. **Scalability** - Rate limiting + queue system
4. **AI-Optimized** - Semantic data, citations, confidence scores
5. **Streaming** - WebSocket для real-time updates
6. **Batch Support** - До 100 URLs за раз
7. **Multi-tier** - 4 уровня pricing (free → enterprise)

---

## 📚 Документация:

- **Полная архитектура**: `docs/A2A_PROTOCOL_ARCHITECTURE.md`
- **Protocol spec**: `lib/a2a/protocol.ts`
- **Rate limiter**: `lib/a2a/rateLimiter.ts`

---

## 🚀 Next Action:

```bash
# 1. Создать adapter
# 2. Создать API route
# 3. Тестировать с Perplexity/ChatGPT
# 4. Deploy на production
```

---

**Status**: Core Protocol Complete ✅  
**Next**: Adapter + Server Implementation  
**ETA**: 1-2 дня для полной реализации  
**Priority**: HIGH - революционная функциональность для платформы
