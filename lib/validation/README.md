# API Input Validation System

Comprehensive Zod-based validation for all API endpoints with runtime type checking and detailed error responses.

## Overview

This validation system provides:
- **Type-safe schemas** for all API inputs using Zod
- **Middleware functions** for automatic validation
- **Detailed error messages** with field-level validation feedback
- **Rate limiting** and CORS handling
- **JSON-RPC 2.0** validation support

## Architecture

```
┌─────────────────────────────────────────────────┐
│           API Request (Vercel Edge)             │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│         CORS Middleware (withCors)              │
│  - Sets Access-Control headers                  │
│  - Handles OPTIONS requests                     │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│      Rate Limiting (withRateLimit)              │
│  - IP-based rate limiting                       │
│  - Returns 429 on limit exceeded                │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│    Validation Middleware (withValidation)       │
│  - Validates body, query, params                │
│  - Returns 400 with detailed errors             │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│           Handler Function                      │
│  - Receives validated data                      │
│  - Type-safe access to inputs                   │
└─────────────────────────────────────────────────┘
```

## Usage

### Basic Validation

```typescript
import { withValidation } from '../lib/validation/middleware';
import { PublicAidCreateSchema } from '../lib/validation/apiSchemas';

async function handler(req, res, validated) {
  // validated.body is type-safe and validated
  const { name, description } = validated.body;
  // ... handle request
}

export default withValidation(
  {
    bodySchema: PublicAidCreateSchema,
    allowedMethods: ['POST'],
  },
  handler
);
```

### JSON-RPC Validation

```typescript
import { withJsonRpcValidation } from '../lib/validation/middleware';
import { McpToolsCallParamsSchema } from '../lib/validation/apiSchemas';

async function handler(req, res, validated) {
  // validated.method, validated.params, validated.id are validated
  const { method, params, id } = validated;
  // ... handle JSON-RPC request
}

export default withJsonRpcValidation(
  {
    'tools/call': McpToolsCallParamsSchema,
    'resources/read': McpResourcesReadParamsSchema,
  },
  handler
);
```

### Composing Middleware

```typescript
import { compose, withCors, withRateLimit, withValidation } from '../lib/validation/middleware';

export default compose(
  withCors,
  (handler) => withRateLimit(handler, { maxRequests: 60, windowMs: 60000 }),
  (handler) => withValidation({ bodySchema: MySchema }, handler)
)(myHandler);
```

## Available Schemas

### Common Schemas
- `AidSchema` - Agent Identity URI (aid://name/suffix)
- `Ed25519PublicKeySchema` - 64-char hex public key
- `Ed25519PrivateKeySchema` - 64-char hex private key
- `Ed25519SignatureSchema` - 128-char hex signature
- `ChallengeSchema` - Challenge string format
- `UrlSchema` - HTTP/HTTPS URL (max 2048 chars)

### JSON-RPC Schemas
- `JsonRpcRequestSchema` - JSON-RPC 2.0 request
- `JsonRpcResponseSchema` - JSON-RPC 2.0 response

### A2A Protocol Schemas
- `UCPTCascadeMessageSchema` - UCPT cascade message
- `A2ACascadeRequestSchema` - A2A cascade JSON-RPC request

### MCP Protocol Schemas
- `McpInitializeParamsSchema` - MCP initialize params
- `McpToolsCallParamsSchema` - MCP tools/call params
- `McpResourcesReadParamsSchema` - MCP resources/read params
- `McpPromptsGetParamsSchema` - MCP prompts/get params

### Tool Execution Schemas
- `ToolSearchRegexParamsSchema` - Tool search parameters
- `CodeExecutionParamsSchema` - Code execution parameters
- `AuditSiteParamsSchema` - GEO audit parameters
- `GetGraphParamsSchema` - Knowledge graph parameters
- `PredictCitationParamsSchema` - Citation prediction parameters

### Authentication Schemas
- `HandshakeRequestSchema` - Handshake request (union type)
- `ChallengeGetSchema` - Challenge generation request
- `ChallengeVerifySchema` - Signature verification request
- `PublicAidCreateSchema` - Agent identity creation request
- `ProgrammaticExecutionSchema` - Programmatic tool calling

## Validation Helpers

### validateInput

```typescript
import { validateInput } from '../lib/validation/apiSchemas';

const result = validateInput(AidSchema, userInput);
if (result.success) {
  // result.data is typed and validated
  console.log(result.data);
} else {
  // result.error is ZodError
  console.error(result.error);
}
```

### formatValidationError

```typescript
import { formatValidationError } from '../lib/validation/apiSchemas';

if (!result.success) {
  const formatted = formatValidationError(result.error);
  // {
  //   message: 'Validation failed',
  //   errors: [
  //     { path: 'field.nested', message: 'Invalid format' }
  //   ]
  // }
}
```

## Error Responses

### Validation Error (400)

```json
{
  "error": "Invalid request body",
  "message": "Validation failed",
  "errors": [
    {
      "path": "url",
      "message": "Invalid URL"
    },
    {
      "path": "ttl",
      "message": "Number must be less than or equal to 7"
    }
  ]
}
```

### Rate Limit Error (429)

```json
{
  "error": "Rate limit exceeded",
  "retryAfter": 45
}
```

### Method Not Allowed (405)

```json
{
  "error": "Method not allowed",
  "allowed": ["GET", "POST"],
  "received": "PUT"
}
```

### JSON-RPC Error (400)

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32602,
    "message": "Invalid params",
    "data": {
      "message": "Validation failed",
      "errors": [
        {
          "path": "name",
          "message": "Required"
        }
      ]
    }
  }
}
```

## Testing

### Unit Tests

```bash
npm test -- lib/validation/__tests__/apiSchemas.test.ts --run
```

### Property-Based Tests

```bash
npm test -- lib/validation/__tests__/validation.property.test.ts --run
```

## Correctness Properties

**Property 6: Input Validation Coverage**
- *For any* API endpoint accepting user input, all inputs should have Zod schema validation
- **Validates: Requirements 2.2**

This property is verified through:
1. Unit tests covering all schemas
2. Property-based tests with 100+ random inputs per schema
3. Integration tests for all API endpoints

## Security Benefits

1. **SQL Injection Prevention** - All inputs validated before database queries
2. **XSS Prevention** - URL and string inputs validated for format
3. **Type Safety** - Runtime validation matches TypeScript types
4. **Rate Limiting** - Prevents abuse and DoS attacks
5. **Detailed Errors** - Helps developers without exposing internals

## Performance

- **Validation overhead**: < 1ms per request
- **Memory usage**: Minimal (schemas compiled once)
- **Rate limiting**: In-memory Map (production should use Redis)

## Migration Guide

### Before (No Validation)

```typescript
export default async function handler(req, res) {
  const { url } = req.body; // Unsafe!
  // ... use url directly
}
```

### After (With Validation)

```typescript
import { withValidation } from '../lib/validation/middleware';
import { AuditSiteParamsSchema } from '../lib/validation/apiSchemas';

async function handler(req, res, validated) {
  const { url } = validated.body; // Type-safe and validated!
  // ... use url safely
}

export default withValidation(
  { bodySchema: AuditSiteParamsSchema, allowedMethods: ['POST'] },
  handler
);
```

## Future Enhancements

- [ ] Redis-based rate limiting for production
- [ ] Request ID correlation for distributed tracing
- [ ] Metrics collection for validation failures
- [ ] Custom error messages per endpoint
- [ ] OpenAPI schema generation from Zod schemas
- [ ] Automatic API documentation generation

## References

- [Zod Documentation](https://zod.dev/)
- [JSON-RPC 2.0 Specification](https://www.jsonrpc.org/specification)
- [OWASP Input Validation](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)
