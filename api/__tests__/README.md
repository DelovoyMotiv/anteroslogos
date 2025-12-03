# API Integration Tests

This directory contains comprehensive integration tests for all API endpoints.

## Test Files

- `api-endpoints.integration.test.ts` - Tests for health, ready, capabilities, CSRF, challenge, and handshake endpoints
- `a2a.integration.test.ts` - Tests for A2A Protocol JSON-RPC endpoint
- `crud-endpoints.integration.test.ts` - Tests for CRUD operations on all resource endpoints
- `helpers.ts` - Test utilities for creating mock requests/responses
- `setup.ts` - Environment setup and configuration

## Test Coverage

### Health & Readiness Endpoints
- ✅ GET /api/health - Health check endpoint
- ✅ GET /api/ready - Readiness check with database connectivity

### Capabilities & Documentation
- ✅ GET /api/capabilities - OpenAPI 3.1 specification
- ✅ CORS and caching headers
- ✅ OPTIONS request handling

### Security Endpoints
- ✅ GET /api/csrf - CSRF token generation
- ✅ Cookie setting and validation
- ✅ Token metadata

### Authentication Endpoints
- ✅ GET /api/challenge - Challenge generation for AID
- ✅ POST /api/challenge - Signature verification
- ✅ Challenge expiration and validation
- ✅ POST /api/handshake - One-step agent integration
- ✅ Identity generation with Ed25519 keypairs

### CRUD Endpoints
- ✅ POST /api/public-aid - Generate new agent identity
- ✅ GET /api/aid-registry - List registered AIDs with pagination
- ✅ POST /api/aid-registry - Register new AID
- ✅ PUT /api/aid-registry - Update AID
- ✅ DELETE /api/aid-registry - Revoke AID
- ✅ GET /api/tenants - List user's tenants with pagination
- ✅ POST /api/tenants - Create new tenant
- ✅ PUT /api/tenants - Update tenant
- ✅ DELETE /api/tenants - Delete tenant

### A2A Protocol
- ✅ JSON-RPC 2.0 compliance
- ✅ a2a.mesh.cascade method
- ✅ Error handling for unknown methods
- ✅ Asynchronous message processing
- ✅ Rate limiting

## Test Contracts Validated

### Request/Response Contracts
- ✅ JSON request body handling
- ✅ JSON response format
- ✅ Query parameter parsing
- ✅ Header validation

### Error Response Contracts
- ✅ Consistent 400 error format (validation errors)
- ✅ Consistent 401 error format (authentication errors)
- ✅ Consistent 404 error format (not found errors)
- ✅ Consistent 405 error format (method not allowed)

### Pagination Contract
- ✅ Consistent pagination structure (total, limit, offset, has_more)
- ✅ Default pagination values (limit=50, offset=0)
- ✅ Maximum limit enforcement (max=100)

## Running Tests

```bash
# Run all API integration tests
npm test -- api/__tests__

# Run specific test file
npm test -- api/__tests__/api-endpoints.integration.test.ts --run

# Run with coverage
npm test -- api/__tests__ --coverage
```

## Requirements Validated

**Property 35: API Integration Tests**
- All API endpoints tested with real database connections
- Request/response contracts verified
- Error responses tested

**Property 25: Complete CRUD Operations**
- All CRUD endpoints support GET, POST, PUT, DELETE methods
- Proper authentication and authorization checks
- Audit logging for all operations

**Property 26: Pagination Support**
- All list endpoints support limit/offset pagination
- Total count and has_more flags included
- Maximum limit enforcement

## Notes

- Tests require Supabase configuration for database-dependent endpoints
- Some tests are skipped if SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY are not set
- Mock authentication tokens are used for testing auth-protected endpoints
- Tests validate both success and error scenarios
