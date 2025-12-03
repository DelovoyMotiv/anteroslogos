# CRUD API Reference

Complete REST API documentation for all resource endpoints.

**Status:** ✅ Complete  
**Validates:** Requirements 6.3  
**Property:** 25 - Complete CRUD Operations

## Overview

All API endpoints follow RESTful conventions and support complete CRUD operations:
- **GET** - Read/List resources
- **POST** - Create new resources
- **PUT** - Update existing resources
- **DELETE** - Delete/Cancel resources

All endpoints require authentication via Bearer token and include:
- ✅ Input validation (Zod schemas)
- ✅ Authorization checks (user/tenant ownership)
- ✅ Rate limiting (60 req/min)
- ✅ CORS support
- ✅ Audit logging

---

## API Keys

Manage API keys for programmatic access.

### List API Keys
```http
GET /api/api-keys
Authorization: Bearer <token>
```

**Response:**
```json
{
  "keys": [
    {
      "id": "uuid",
      "name": "Production API Key",
      "key_prefix": "sk_pro_abc",
      "scoped_tools": ["geo.audit", "mcp.execute"],
      "rate_limit_per_minute": 60,
      "rate_limit_per_hour": 1000,
      "created_at": "2025-12-02T10:00:00Z"
    }
  ]
}
```

### Get API Key
```http
GET /api/api-keys?id=<key_id>
Authorization: Bearer <token>
```

### Create API Key
```http
POST /api/api-keys
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Production API Key",
  "scoped_tools": ["geo.audit"],
  "expires_in_days": 90
}
```

**Response:**
```json
{
  "key": { ... },
  "plaintext_key": "sk_pro_abc123..." // Only returned once!
}
```

### Update API Key
```http
PUT /api/api-keys?id=<key_id>
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Name",
  "scoped_tools": ["geo.audit", "mcp.execute"]
}
```

### Delete API Key
```http
DELETE /api/api-keys?id=<key_id>
Authorization: Bearer <token>
```

---

## Agent Keys

Manage Ed25519 agent keys and Agent Identity (AID) URIs.

### List Agent Keys
```http
GET /api/agent-keys
Authorization: Bearer <token>
```

### Get Agent Key
```http
GET /api/agent-keys?id=<key_id>
Authorization: Bearer <token>
```

### Generate Agent Key
```http
POST /api/agent-keys
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "My AI Agent",
  "agentDescription": "GEO audit agent",
  "endpoint": "https://agent.example.com",
  "capabilities": ["geo.audit", "mcp.execute"],
  "permissions": ["mcp:execute"],
  "domain": "example.com"
}
```

**Response:**
```json
{
  "agentKey": { ... },
  "privateKey": "Uint8Array", // Only returned once!
  "privateKeyPem": "-----BEGIN PRIVATE KEY-----\n..."
}
```

### Update Agent Key
```http
PUT /api/agent-keys?id=<key_id>
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Agent Name",
  "permissions": ["mcp:execute", "geo:audit"]
}
```

### Delete Agent Key
```http
DELETE /api/agent-keys?id=<key_id>
Authorization: Bearer <token>
```

---

## Subscriptions

Manage user subscriptions and billing.

### List Subscriptions
```http
GET /api/subscriptions
Authorization: Bearer <token>
```

**Response:**
```json
{
  "subscriptions": [
    {
      "id": "uuid",
      "plan_id": "uuid",
      "status": "active",
      "current_period_start": "2025-12-01T00:00:00Z",
      "current_period_end": "2026-01-01T00:00:00Z",
      "auto_renew": true,
      "subscription_plans": {
        "plan_name": "pro",
        "display_name": "Professional",
        "price_monthly": 49.00
      }
    }
  ]
}
```

### Get Subscription
```http
GET /api/subscriptions?id=<subscription_id>
Authorization: Bearer <token>
```

### Create Subscription
```http
POST /api/subscriptions
Authorization: Bearer <token>
Content-Type: application/json

{
  "plan_id": "uuid",
  "payment_method": "stripe",
  "billing_cycle": "monthly",
  "auto_renew": true
}
```

### Update Subscription
```http
PUT /api/subscriptions?id=<subscription_id>
Authorization: Bearer <token>
Content-Type: application/json

{
  "plan_id": "new_plan_uuid",
  "auto_renew": false
}
```

### Cancel Subscription
```http
DELETE /api/subscriptions?id=<subscription_id>
Authorization: Bearer <token>
```

---

## Tenants

Manage multi-tenant organizations.

### List Tenants
```http
GET /api/tenants
Authorization: Bearer <token>
```

**Response:**
```json
{
  "tenants": [
    {
      "id": "uuid",
      "name": "Acme Corp",
      "slug": "acme-corp",
      "description": "Main organization",
      "status": "active",
      "user_role": "owner"
    }
  ]
}
```

### Get Tenant
```http
GET /api/tenants?id=<tenant_id>
Authorization: Bearer <token>
```

### Create Tenant
```http
POST /api/tenants
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Acme Corp",
  "slug": "acme-corp",
  "description": "Main organization",
  "settings": {
    "federation_mode": "verified_only"
  }
}
```

### Update Tenant
```http
PUT /api/tenants?id=<tenant_id>
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Name",
  "description": "Updated description",
  "settings": { ... }
}
```

**Note:** Only tenant owners can update tenants.

### Delete Tenant
```http
DELETE /api/tenants?id=<tenant_id>
Authorization: Bearer <token>
```

**Note:** Only tenant owners can delete tenants. This is a soft delete (status set to 'deleted').

---

## AID Registry

Manage Agent Identity (AID) registrations.

### List AIDs
```http
GET /api/aid-registry
Authorization: Bearer <token>
```

**Response:**
```json
{
  "aids": [
    {
      "id": "uuid",
      "tenant_id": "uuid",
      "agent_name": "My Agent",
      "aid_uri": "aid://example.com/agent/my-agent",
      "public_key_ed25519": "base64...",
      "status": "active",
      "verified": true
    }
  ]
}
```

### Get AID
```http
GET /api/aid-registry?id=<aid_id>
Authorization: Bearer <token>
```

### Register AID
```http
POST /api/aid-registry
Authorization: Bearer <token>
Content-Type: application/json

{
  "agentName": "My Agent",
  "aidUri": "aid://example.com/agent/my-agent",
  "publicKeyEd25519": "base64_encoded_public_key",
  "agentDescription": "AI agent for GEO audits",
  "endpoint": "https://agent.example.com",
  "capabilities": ["geo.audit"],
  "permissions": ["mcp:execute"]
}
```

### Update AID
```http
PUT /api/aid-registry?id=<aid_id>
Authorization: Bearer <token>
Content-Type: application/json

{
  "agentName": "Updated Agent Name",
  "agentDescription": "Updated description",
  "verified": true
}
```

### Revoke AID
```http
DELETE /api/aid-registry?id=<aid_id>
Authorization: Bearer <token>
```

**Note:** This sets the AID status to 'revoked' (soft delete).

---

## Audit Trail

Query audit trail events (read-only, WORM compliance).

### List Audit Events
```http
GET /api/audit-trail?action=<action>&resource_type=<type>&limit=50&offset=0
Authorization: Bearer <token>
```

**Query Parameters:**
- `action` (optional) - Filter by action (e.g., "api_key.created")
- `resource_type` (optional) - Filter by resource type (e.g., "api_key")
- `resource_id` (optional) - Filter by resource ID
- `start_date` (optional) - ISO 8601 datetime
- `end_date` (optional) - ISO 8601 datetime
- `limit` (optional) - Max results (default: 50, max: 100)
- `offset` (optional) - Pagination offset (default: 0)

**Response:**
```json
{
  "events": [
    {
      "id": "bigint",
      "tenant_id": "uuid",
      "user_id": "uuid",
      "action": "api_key.created",
      "resource_type": "api_key",
      "resource_id": "uuid",
      "timestamp": "2025-12-02T10:00:00Z",
      "metadata": { ... }
    }
  ],
  "pagination": {
    "total": 150,
    "limit": 50,
    "offset": 0,
    "has_more": true
  }
}
```

### Get Audit Event
```http
GET /api/audit-trail?id=<event_id>
Authorization: Bearer <token>
```

### POST/PUT/DELETE Not Allowed
Audit trail is append-only (WORM). Events are created automatically by the system and cannot be modified or deleted.

---

## Error Responses

All endpoints return consistent error responses:

```json
{
  "error": "Error message"
}
```

**HTTP Status Codes:**
- `200` - Success
- `201` - Created
- `204` - No Content (successful DELETE)
- `400` - Bad Request (validation error)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `405` - Method Not Allowed
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error

---

## Rate Limiting

All endpoints are rate limited:
- **60 requests per minute** per user
- **429 Too Many Requests** response when exceeded
- `Retry-After` header indicates when to retry

---

## Pagination

List endpoints support pagination via query parameters:
- `limit` - Number of results (default: 50, max: 100)
- `offset` - Skip N results (default: 0)

Response includes pagination metadata:
```json
{
  "pagination": {
    "total": 150,
    "limit": 50,
    "offset": 0,
    "has_more": true
  }
}
```

---

## Authorization

All endpoints require authentication via Bearer token:
```http
Authorization: Bearer <access_token>
```

Resources are scoped to:
- **User ownership** - API Keys, Agent Keys, Subscriptions
- **Tenant membership** - Tenants, AID Registry, Audit Trail
- **Tenant ownership** - Tenant updates/deletes (owner only)

---

## Audit Logging

All state-changing operations are automatically logged to the audit trail:
- `api_key.created`, `api_key.updated`, `api_key.deleted`
- `agent_key.created`, `agent_key.updated`, `agent_key.deleted`
- `subscription.created`, `subscription.updated`, `subscription.cancelled`
- `tenant.created`, `tenant.updated`, `tenant.deleted`
- `aid.registered`, `aid.updated`, `aid.revoked`

---

## Property 25 Validation

✅ **Complete CRUD Operations**

All resources support required CRUD operations:

| Resource | GET | POST | PUT | DELETE | Notes |
|----------|-----|------|-----|--------|-------|
| API Keys | ✅ | ✅ | ✅ | ✅ | Full CRUD |
| Agent Keys | ✅ | ✅ | ✅ | ✅ | Full CRUD |
| Subscriptions | ✅ | ✅ | ✅ | ✅ | DELETE = cancel |
| Tenants | ✅ | ✅ | ✅ | ✅ | DELETE = soft delete |
| AID Registry | ✅ | ✅ | ✅ | ✅ | DELETE = revoke |
| Audit Trail | ✅ | ❌ | ❌ | ❌ | Read-only (WORM) |

**Validates:** Requirements 6.3 - Complete CRUD operations for all resources
