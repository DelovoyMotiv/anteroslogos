# ErrorHandler Usage Guide

## Overview

The `ErrorHandler` class provides robust retry logic with exponential backoff for handling transient failures in the GEO Audit Engine. It supports different retry strategies for various error types and provides detailed error context for debugging.

## Features

- **Exponential Backoff**: Automatically increases delay between retries
- **Configurable Retry Strategies**: Different strategies for different error types
- **Detailed Error Context**: Tracks all retry attempts with timestamps and error details
- **Logging Support**: Optional logging for monitoring retry behavior
- **Type-Safe**: Full TypeScript support with proper error types

## Basic Usage

```typescript
import { ErrorHandler, AgentMiddlewareError, ErrorCode } from './errors';

// Create an ErrorHandler instance
const errorHandler = new ErrorHandler(console.log);

// Define a function that might fail
const fetchData = async () => {
  const response = await fetch('https://example.com');
  if (!response.ok) {
    throw new AgentMiddlewareError(
      ErrorCode.ERR_TIMEOUT,
      'Request timed out'
    );
  }
  return response.json();
};

// Execute with retry logic
try {
  const strategy = ErrorHandler.createTimeoutRetryStrategy(3);
  const data = await errorHandler.executeWithRetry(
    fetchData,
    strategy,
    { url: 'https://example.com' }
  );
  console.log('Success:', data);
} catch (error) {
  console.error('Failed after retries:', error);
}
```

## Built-in Retry Strategies

### 1. Timeout Retry Strategy

For handling timeout errors (408, ERR_TIMEOUT, ERR_CSR_TIMEOUT):

```typescript
const strategy = ErrorHandler.createTimeoutRetryStrategy(3);
// Retries up to 3 times with exponential backoff: 1s, 2s, 4s
```

### 2. Rate Limit Retry Strategy

For handling rate limit errors (429, ERR_RATE_LIMIT):

```typescript
const strategy = ErrorHandler.createRateLimitRetryStrategy(3);
// Retries up to 3 times with increasing delays
```

### 3. Server Error Retry Strategy

For handling server errors (5xx, ERR_INTERNAL):

```typescript
const strategy = ErrorHandler.createServerErrorRetryStrategy(3);
// Retries up to 3 times for server errors
```

### 4. Bot Block Retry Strategy

For handling bot detection (403, ERR_BOT_BLOCKED):

```typescript
const strategy = ErrorHandler.createBotBlockRetryStrategy(3);
// Retries up to 3 times for bot blocking
```

### 5. Network Error Retry Strategy

For handling general network errors:

```typescript
const strategy = ErrorHandler.createNetworkErrorRetryStrategy(3);
// Retries for ERR_URL_UNREACHABLE, ERR_TIMEOUT, ERR_BOT_BLOCKED
```

## Custom Retry Strategy

You can create custom retry strategies:

```typescript
import { RetryStrategy } from './errors';

const customStrategy: RetryStrategy = {
  maxAttempts: 5,
  baseDelay: 2000, // 2 seconds
  maxDelay: 30000, // 30 seconds max
  shouldRetry: (error: Error, attempt: number) => {
    // Custom retry logic
    if (error instanceof AgentMiddlewareError) {
      return error.code === ErrorCode.ERR_CUSTOM;
    }
    return false;
  },
};

await errorHandler.executeWithRetry(myFunction, customStrategy);
```

## Error Context

When retries are exhausted, the error includes detailed context:

```typescript
try {
  await errorHandler.executeWithRetry(fn, strategy, { url: 'https://example.com' });
} catch (error) {
  if (error instanceof AgentMiddlewareError) {
    console.log('Error code:', error.code);
    console.log('Retry context:', error.details?.retryContext);
    
    // RetryContext includes:
    // - url: The URL being accessed
    // - timestamp: When the first attempt started
    // - attempts: Total number of attempts
    // - errors: Array of all errors with timestamps
  }
}
```

## New Error Codes

The following error codes have been added:

- `ERR_CSR_TIMEOUT`: JavaScript execution timed out
- `ERR_WAF_BLOCK`: Request blocked by Web Application Firewall or CAPTCHA
- `ERR_SCHEMA_NESTED`: Failed to parse nested JSON-LD schema
- `ERR_REDIRECT_LOOP`: Detected circular redirect chain

## Logging

The ErrorHandler supports optional logging:

```typescript
const logger = (message: string, context?: Record<string, unknown>) => {
  console.log(`[ErrorHandler] ${message}`, context);
};

const errorHandler = new ErrorHandler(logger);
```

Logged events:
- Retry attempts with delay information
- Successful retries with attempt count
- Non-retryable errors
- Retry exhaustion

## Best Practices

1. **Choose the Right Strategy**: Use the appropriate built-in strategy for your error type
2. **Set Reasonable Limits**: Don't set maxAttempts too high to avoid long delays
3. **Log Retry Behavior**: Use logging to monitor retry patterns in production
4. **Handle Final Errors**: Always catch errors after retries are exhausted
5. **Include Context**: Pass URL or other context for better error tracking

## Integration with BrowserService

Example integration with BrowserService:

```typescript
import { ErrorHandler, ErrorCode, AgentMiddlewareError } from './errors';
import { BrowserService } from './BrowserService';

class EnhancedBrowserService {
  private errorHandler = new ErrorHandler(console.log);
  private browserService = new BrowserService();

  async fetchPageWithRetry(url: string) {
    const strategy = ErrorHandler.createNetworkErrorRetryStrategy(3);
    
    return this.errorHandler.executeWithRetry(
      async () => {
        try {
          return await this.browserService.fetchPage(url);
        } catch (error) {
          // Convert browser errors to AgentMiddlewareError
          if (error.message.includes('timeout')) {
            throw new AgentMiddlewareError(
              ErrorCode.ERR_CSR_TIMEOUT,
              'Browser timeout',
              { url, timeout: 30000 }
            );
          }
          throw error;
        }
      },
      strategy,
      { url }
    );
  }
}
```

## Testing

The ErrorHandler includes comprehensive property-based tests that verify:

- Exponential backoff timing (Property 20)
- Rate limit retry delays (Property 21)
- Server error retry limits (Property 22)
- Detailed error context (Property 23)
- Retry count logging (Property 24)
- Complete error context (Property 34)

Run tests with:
```bash
npm test -- lib/engine/__tests__/ErrorHandler.property.test.ts --run
```
