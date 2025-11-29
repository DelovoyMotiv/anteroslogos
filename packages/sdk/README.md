# @anteroslogos/sdk

Official TypeScript SDK for [Anóteros Lógos API](https://anoteroslogos.com) - Production-grade AI agent infrastructure platform.

[![npm version](https://img.shields.io/npm/v/@anteroslogos/sdk)](https://www.npmjs.com/package/@anteroslogos/sdk)
[![License](https://img.shields.io/npm/l/@anteroslogos/sdk)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue)](https://www.typescriptlang.org/)

## Features

- **Type-Safe**: Full TypeScript support with Zod runtime validation
- **Fault-Tolerant**: Built-in retry logic, circuit breaker, and idempotency
- **Tree-Shakeable**: Modular design for optimal bundle size
- **Zero Dependencies**: Only depends on `zod` (runtime validation)
- **Production-Ready**: Exponential backoff, jitter, timeout handling

## Installation

```bash
npm install @anteroslogos/sdk

# or
yarn add @anteroslogos/sdk

# or
pnpm add @anteroslogos/sdk
```

## Quick Start

```typescript
import { AnterosClient } from '@anteroslogos/sdk';

const client = new AnterosClient({
  apiKey: process.env.ANTEROS_API_KEY
});

// Audit a website for AI visibility
const audit = await client.auditURL('https://example.com');
console.log(`GEO Score: ${audit.score}/100 (${audit.grade})`);

// Extract knowledge graph
const graph = await client.extractGraph('https://example.com');
console.log(`Found ${graph.entities.length} entities`);

// Predict citation probability
const citation = await client.predictCitation('https://example.com');
console.log(`Citation probability: ${citation.overallScore}`);
```

## API Reference

### Initialization

```typescript
const client = new AnterosClient({
  apiKey: 'sk_xxx', // Required: Your API key
  baseURL: 'https://anoteroslogos.com', // Optional: Custom base URL
  timeout: 60000, // Optional: Request timeout in ms (default: 60000)
  retry: {
    maxAttempts: 3, // Optional: Max retry attempts (default: 3)
    initialDelay: 1000, // Optional: Initial delay in ms (default: 1000)
  },
  circuit: {
    failureThreshold: 5, // Optional: Failures before circuit opens (default: 5)
    timeout: 60000, // Optional: Circuit breaker timeout in ms (default: 60000)
  }
});
```

### Audit API

#### Single Audit

```typescript
const result = await client.audit.create({
  url: 'https://example.com',
  depth: 'standard', // 'quick' | 'standard' | 'deep'
  options: {
    includeScreenshots: false,
    platforms: ['perplexity', 'chatgpt'] // Optional: Filter platforms
  }
});

console.log(result.score); // 0-100
console.log(result.grade); // 'Beginner' | 'Novice' | 'Intermediate' | 'Advanced' | 'Expert'
console.log(result.categories); // { content: 85, technical: 90, ... }
console.log(result.recommendations); // Array of recommendations with priority
```

#### Batch Audit

```typescript
const batch = await client.audit.batch({
  urls: [
    'https://example.com',
    'https://example.org',
    // ... up to 100 URLs
  ],
  depth: 'standard'
});

console.log(`Completed: ${batch.completed}/${batch.total}`);
console.log(`Results:`, batch.results);
```

#### Get Audit by ID

```typescript
const audit = await client.audit.get('audit_123');
```

### Knowledge Graph API

```typescript
const graph = await client.knowledge.extract({
  url: 'https://example.com',
  includeClaims: true, // Include factual claims
  maxEntities: 100 // Max entities to extract (1-1000)
});

// Entities
for (const entity of graph.entities) {
  console.log(`${entity.name} (${entity.type}): ${entity.confidence}`);
}

// Relationships
for (const rel of graph.relationships) {
  console.log(`${rel.source} --[${rel.label}]--> ${rel.target}`);
}

// Claims
if (graph.claims) {
  for (const claim of graph.claims) {
    console.log(`Claim: ${claim.statement} (confidence: ${claim.confidence})`);
  }
}
```

### Citation API

```typescript
const citation = await client.citation.predict({
  url: 'https://example.com',
  platforms: ['perplexity', 'chatgpt', 'claude', 'gemini'] // Optional
});

for (const prediction of citation.predictions) {
  console.log(`${prediction.platform}: ${(prediction.probability * 100).toFixed(1)}% probability`);
}

console.log(`Overall score: ${(citation.overallScore * 100).toFixed(1)}%`);
```

### CCC (Causal Contribution Credits) API

#### Get Balance

```typescript
const balance = await client.ccc.getBalance();
console.log(`Available: ${balance.available} CCC`);
console.log(`Staked: ${balance.staked} CCC`);
console.log(`Tier: ${balance.tier}`); // 'bronze' | 'silver' | 'gold' | 'platinum'
console.log(`Discount: ${balance.discountPercentage}%`);
```

#### Transaction History

```typescript
const history = await client.ccc.getHistory({
  page: 1,
  pageSize: 50
});

for (const tx of history.transactions) {
  console.log(`${tx.type}: ${tx.amount} CCC (balance: ${tx.balance})`);
}
```

#### Transfer CCC

```typescript
await client.ccc.transfer({
  recipient: 'agent_id_456',
  amount: 100,
  memo: 'Payment for services'
});
```

#### Stake/Unstake CCC

```typescript
// Stake for trust weight
await client.ccc.stake({
  amount: 500,
  duration: 2592000 // 30 days in seconds (optional)
});

// Unstake
await client.ccc.unstake(250);
```

## Error Handling

All SDK errors extend `AnterosError` with specific types:

```typescript
import {
  ValidationError,
  AuthenticationError,
  PaymentRequiredError,
  RateLimitError,
  TimeoutError,
  NetworkError,
  CircuitOpenError
} from '@anteroslogos/sdk';

try {
  const result = await client.auditURL('https://example.com');
} catch (error) {
  if (error instanceof ValidationError) {
    console.error('Invalid input:', error.errors);
  } else if (error instanceof PaymentRequiredError) {
    console.error('Payment required:', error.invoice);
  } else if (error instanceof RateLimitError) {
    console.error(`Rate limited. Retry after ${error.retryAfter}ms`);
  } else if (error instanceof TimeoutError) {
    console.error(`Request timeout after ${error.timeoutMs}ms`);
  } else if (error instanceof CircuitOpenError) {
    console.error(`Circuit breaker open. Retry after ${error.retryAfterMs}ms`);
  } else if (error instanceof NetworkError) {
    console.error('Network error:', error.cause);
  } else {
    console.error('Unknown error:', error);
  }
}
```

## Advanced Usage

### Direct Service Access

```typescript
// Tree-shakeable imports
import { AuditService, HTTPClient, RetryStrategy, CircuitBreaker, IdempotencyManager } from '@anteroslogos/sdk';

const http = new HTTPClient({ apiKey: 'sk_xxx' });
const retry = new RetryStrategy();
const circuit = new CircuitBreaker();
const idempotency = new IdempotencyManager();

const audit = new AuditService(http, retry, circuit, idempotency);
const result = await audit.create({ url: 'https://example.com' });
```

### Custom Resilience Configuration

```typescript
const client = new AnterosClient({
  apiKey: 'sk_xxx',
  retry: {
    maxAttempts: 5,
    initialDelay: 500,
    maxDelay: 30000,
    multiplier: 2,
    jitterFactor: 0.25
  },
  circuit: {
    failureThreshold: 10,
    timeout: 120000
  }
});
```

### Idempotency

The SDK automatically deduplicates concurrent identical requests:

```typescript
// These will share the same underlying request
const [result1, result2, result3] = await Promise.all([
  client.auditURL('https://example.com'),
  client.auditURL('https://example.com'),
  client.auditURL('https://example.com'),
]);
```

## Environment Variables

- `ANTEROS_API_KEY`: API key (used if not provided in config)

## TypeScript Support

Full TypeScript definitions included:

```typescript
import type {
  AuditResult,
  KnowledgeGraphResult,
  CitationResult,
  CCCBalance,
  Entity,
  Relationship
} from '@anteroslogos/sdk';
```

## Rate Limits

Rate limits vary by plan tier:

- **Free**: 10 req/min, 100 req/hour
- **Basic**: 60 req/min, 1,000 req/hour
- **Pro**: 300 req/min, 10,000 req/hour
- **Enterprise**: 1,000 req/min, 50,000 req/hour

The SDK automatically handles rate limits with `Retry-After` header support.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and guidelines.

## License

MIT

## Links

- [API Documentation](https://anoteroslogos.com/docs)
- [GitHub Repository](https://github.com/DelovoyMotiv/anteroslogos)
- [Issue Tracker](https://github.com/DelovoyMotiv/anteroslogos/issues)

## Support

- Email: support@anoteroslogos.com
- Discord: [Join our server](https://discord.gg/anoteroslogos)
