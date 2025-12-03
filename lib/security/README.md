# Security Module

This module provides security features for the Anóteros Lógos platform.

## CSRF Protection

Cross-Site Request Forgery (CSRF) protection implementation following OWASP best practices.

### Features

- **Token Generation**: Cryptographically secure CSRF tokens with HMAC signatures
- **Token Validation**: Signature verification, expiration checking, and session binding
- **Cookie Security**: HttpOnly, SameSite=Strict cookies
- **Origin Validation**: Origin/Referer header validation
- **Middleware Integration**: Easy-to-use middleware for API endpoints

### Usage

#### 1. Get CSRF Token (Client-Side)

```typescript
// Fetch CSRF token from the server
const response = await fetch('/api/csrf');
const { csrfToken } = await response.json();

// Store token for subsequent requests
localStorage.setItem('csrfToken', csrfToken);
```

#### 2. Include Token in Requests

```typescript
// Include CSRF token in request headers
const response = await fetch('/api/endpoint', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-csrf-token': csrfToken,
  },
  body: JSON.stringify(data),
});
```

#### 3. Protect API Endpoints

```typescript
import { withCsrfProtection, compose } from '../lib/validation/middleware';

async function handler(req: VercelRequest, res: VercelResponse) {
  // Your handler logic
}

// Apply CSRF protection middleware
export default compose(
  withCors,
  withRateLimit,
  withCsrfProtection, // Add CSRF protection
  withValidation
)(handler);
```

#### 4. Custom Configuration

```typescript
// Exclude specific paths or methods
export default withCsrfProtection(handler, {
  excludeMethods: ['GET', 'HEAD', 'OPTIONS'],
  excludePaths: ['/api/public', '/api/webhooks'],
  requireSessionBinding: true, // Bind tokens to sessions
});
```

### Security Properties

The CSRF protection implementation guarantees the following properties:

1. **Token Uniqueness**: All generated tokens are cryptographically unique
2. **Signature Verification**: Tokens are HMAC-signed and verified on each request
3. **Expiration**: Tokens expire after 24 hours
4. **Session Binding**: Tokens can be bound to specific sessions
5. **Origin Validation**: Origin/Referer headers are validated
6. **Safe Methods**: GET, HEAD, OPTIONS requests don't require CSRF tokens
7. **State-Changing Methods**: POST, PUT, DELETE, PATCH require valid CSRF tokens

### Configuration

Set the following environment variable for production:

```bash
# Generate a secure random secret (32 bytes)
CSRF_SECRET=your-secure-random-secret-here
```

**Important**: In production with multiple instances, use a shared secret or Redis-backed token store.

### Cookie Options

CSRF tokens are stored in cookies with the following security options:

- **HttpOnly**: Prevents JavaScript access to the cookie
- **SameSite=Strict**: Prevents cross-site cookie transmission
- **Secure**: Requires HTTPS in production
- **Max-Age**: 24 hours

### Testing

The CSRF protection includes comprehensive test coverage:

- **Unit Tests**: 29 tests covering all functions
- **Property-Based Tests**: 9 properties verified with 100+ test cases each

Run tests:

```bash
npm test -- lib/security/__tests__/csrf.test.ts --run
npm test -- lib/security/__tests__/csrf.property.test.ts --run
```

### API Reference

#### `generateCsrfToken(sessionId?: string): string`

Generates a new CSRF token, optionally bound to a session.

#### `validateCsrfToken(token: string, sessionId?: string): { valid: boolean; reason?: string }`

Validates a CSRF token, checking signature, expiration, and session binding.

#### `withCsrfProtection(handler, options?)`

Middleware that validates CSRF tokens on state-changing requests.

#### `withCsrfTokenGeneration(handler)`

Middleware that generates and sets CSRF tokens in cookies.

#### `setCsrfCookie(res: VercelResponse, token: string): void`

Sets a CSRF token cookie with secure options.

#### `clearCsrfToken(res: VercelResponse): void`

Clears the CSRF token cookie (useful on logout).

### Compliance

This implementation follows:

- **OWASP CSRF Prevention Cheat Sheet**
- **NIST SP 800-63B** (Digital Identity Guidelines)
- **CWE-352** (Cross-Site Request Forgery)

### References

- [OWASP CSRF Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [MDN: SameSite Cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie/SameSite)
- [RFC 6265: HTTP State Management Mechanism](https://tools.ietf.org/html/rfc6265)
