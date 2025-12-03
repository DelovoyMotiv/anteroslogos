# Immutable Audit Trail Documentation (WORM)

**Version**: 1.0.0  
**Compliance**: GDPR Art. 30, SOC 2 CC6.1, ISO 27001 A.12.4.1  
**Date**: 2025-11-22

---

## Executive Summary

This document describes the **Write-Once-Read-Many (WORM) audit trail** implementation for regulatory compliance. All sensitive operations are logged immutably with cryptographic signatures (Ed25519) for tamper detection.

**Compliance Guarantees**:
- ✅ **Immutable Logging**: Cannot UPDATE/DELETE audit records
- ✅ **Cryptographic Integrity**: Ed25519 signatures detect tampering
- ✅ **7-Year Retention**: Active 2y + Archive 5y (GDPR Art. 5)
- ✅ **Complete Audit**: All CUD operations on critical tables logged
- ✅ **GDPR DSAR Ready**: old_state + new_state for data exports

---

## Architecture

### Database Schema

**Table**: `audit_trail` (BIGSERIAL, immutable)

**Columns**:
- `id` (BIGSERIAL) - Sequential audit ID
- `tenant_id` (UUID) - Tenant isolation
- `actor_id` (UUID) - User who performed action (auth.users)
- `actor_email` (TEXT) - Email at time of action
- `actor_ip` (INET) - IP address from `inet_client_addr()`
- `action` (TEXT) - Enum: api_call, graph_update, payment, key_create, key_revoke, login, logout, subscription_change, tenant_create, etc.
- `entity_type` (TEXT) - Enum: api_key, agent_key, subscription, tenant, audit, knowledge_graph, citation, invoice, wallet, profile
- `entity_id` (UUID) - ID of affected entity
- `ucpt_hash` (TEXT) - SHA3-512 hash if UCPT provenance involved
- `old_state` (JSONB) - Before state (for UPDATE/DELETE)
- `new_state` (JSONB) - After state (for INSERT/UPDATE)
- `metadata` (JSONB) - Context (trigger name, table, operation)
- `timestamp` (TIMESTAMPTZ) - Immutable, set by DB on INSERT
- `signature` (TEXT) - Base64-encoded COSE_Sign1 (Ed25519)
- `signature_algorithm` (TEXT) - Always 'Ed25519'

### WORM Enforcement

**Trigger**: `prevent_audit_modification()`

```sql
CREATE TRIGGER audit_trail_worm_update
  BEFORE UPDATE ON public.audit_trail
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_audit_modification();

CREATE TRIGGER audit_trail_worm_delete
  BEFORE DELETE ON public.audit_trail
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_audit_modification();
```

**Result**: Any attempt to UPDATE or DELETE raises exception:
```
ERROR: audit_trail is immutable (WORM). Operation not allowed: UPDATE
HINT: Audit trail cannot be modified or deleted per GDPR Art. 30 and SOC 2 CC6.1
```

---

## Cryptographic Signatures

### Ed25519 Signing (RFC 8032)

**Canonical Payload**:
```typescript
const payload = {
  tenant_id: row.tenant_id,
  actor_id: row.actor_id,
  action: row.action,
  entity_type: row.entity_type,
  entity_id: row.entity_id,
  old_state: row.old_state,
  new_state: row.new_state,
  metadata: row.metadata
};

// Canonical JSON (sorted keys, no whitespace)
const canonicalJSON = JSON.stringify(payload, Object.keys(payload).sort());

// Sign with Ed25519 private key
const signature = ed25519.sign(canonicalJSON, AUDIT_PRIVATE_KEY);

// Store as Base64 COSE_Sign1
row.signature = encodeCOSE_Sign1(signature);
```

**Verification** (in application or by auditors):
```typescript
import { verify } from '@noble/ed25519';

async function verifyAuditSignature(auditRow: AuditTrail): Promise<boolean> {
  const payload = canonicalizePayload(auditRow);
  const signature = decodeCOSE_Sign1(auditRow.signature);
  return await verify(signature, payload, AUDIT_PUBLIC_KEY);
}
```

**Key Management**:
- Private key stored in KMS (AWS KMS, HashiCorp Vault, or Supabase Vault)
- Public key published in `/.well-known/audit-keys.json` for verification
- Key rotation: Annual, 30-day overlap period, re-sign critical audits

---

## Auto-Audit Triggers

**Monitored Tables** (6 triggers):
1. `api_keys` → api_key_create/update/delete
2. `agent_keys` → agent_key_create/update/delete
3. `subscriptions` → subscription_change
4. `tenants` → tenant_create/update/delete
5. `tenant_members` → member_add/remove
6. `knowledge_graphs` → graph_update

**Trigger Function**: `log_audit_event()`

**Example**:
```sql
-- User creates API key
INSERT INTO api_keys (user_id, name, key_hash, tenant_id) 
  VALUES (...);

-- Trigger automatically inserts into audit_trail:
{
  "action": "api_keys_create",
  "entity_type": "api_key",
  "entity_id": "<new_key_id>",
  "actor_id": "<user_id>",
  "old_state": null,
  "new_state": {"id": "...", "name": "Production Key", ...},
  "metadata": {"trigger": "audit_trigger_api_keys", "table": "api_keys", "op": "INSERT"}
}
```

---

## GDPR Compliance

### Art. 30: Records of Processing Activities

**Requirement**: "Maintain records of all processing activities"

**Implementation**:
- ✅ All CUD operations on personal data logged
- ✅ Includes data before/after (old_state/new_state)
- ✅ Actor identification (actor_id, actor_email, actor_ip)
- ✅ Timestamp precision (down to microseconds)

**DSAR Export Endpoint**:
```bash
GET /api/compliance/dsar?email=user@example.com&format=json
Authorization: Bearer <admin_token>

Response:
{
  "subject": "user@example.com",
  "data": {
    "profile": {...},
    "api_keys": [...],
    "audits": [...],
    "audit_trail": [
      {"timestamp": "2025-11-22T10:00:00Z", "action": "api_key_create", ...},
      {"timestamp": "2025-11-22T11:30:00Z", "action": "subscription_change", ...}
    ]
  },
  "generated_at": "2025-11-22T16:00:00Z",
  "signature": "0x..." // Ed25519 signature of entire export
}
```

### Art. 17: Right to Erasure

**Challenge**: Audit trail is immutable, but GDPR requires deletion.

**Solution**:
1. User requests erasure → Flag in profiles.deleted_at
2. Pseudonymize audit_trail:
   - Replace actor_email with "deleted_user@redacted"
   - Replace actor_ip with "0.0.0.0"
   - Keep actor_id (for consistency) but mark as deleted
3. Re-sign audit records with updated payload
4. Original data deleted, audit log preserved for legal compliance (exception under GDPR Art. 17(3)(b))

---

## Retention Policy

**7-Year Retention** (SOC 2 + financial regulations):

1. **Active Storage** (0-2 years): `audit_trail` table
2. **Archived Storage** (2-7 years): `archived_audit_trail` table
3. **Deep Archive** (7+ years): Export to S3 Glacier Deep Archive with WORM lock

**Archival Function**:
```sql
-- Run annually via Supabase cron
SELECT public.archive_old_audit_logs();
-- Moves records >2 years old to archived_audit_trail
```

**S3 WORM Lock** (optional for extra compliance):
```bash
aws s3api put-object-lock-configuration \
  --bucket audit-trail-archive \
  --object-lock-configuration '{"ObjectLockEnabled":"Enabled","Rule":{"DefaultRetention":{"Mode":"COMPLIANCE","Years":7}}}'
```

---

## SOC 2 Type II Compliance

### CC6.1: Logical and Physical Access Controls

**Control**: "The entity implements logical access security measures to protect against threats"

**Evidence**:
- ✅ All access logged (audit_trail table)
- ✅ Immutable log (WORM triggers)
- ✅ Cryptographic integrity (Ed25519 signatures)
- ✅ Quarterly audit log review (query audit_trail by action)

**Audit Queries**:
```sql
-- Q1: Failed login attempts (security monitoring)
SELECT COUNT(*) FROM audit_trail 
WHERE action = 'login' AND metadata->>'status' = 'failed'
  AND timestamp > NOW() - INTERVAL '30 days';

-- Q2: Admin privilege escalations
SELECT * FROM audit_trail
WHERE action IN ('member_add', 'tenant_members_update')
  AND new_state->>'role' IN ('owner', 'admin')
ORDER BY timestamp DESC;

-- Q3: Bulk data exports (GDPR DSAR)
SELECT * FROM audit_trail
WHERE action = 'data_export'
ORDER BY timestamp DESC;
```

---

## Testing & Verification

### 1. WORM Immutability Test

```typescript
// tests/audit/worm.spec.ts
test('Cannot modify audit trail', async ({ supabase }) => {
  const { data: audit } = await supabase
    .from('audit_trail')
    .select('*')
    .limit(1)
    .single();

  // Attempt UPDATE
  const { error } = await supabase
    .from('audit_trail')
    .update({ action: 'tampered' })
    .eq('id', audit.id);

  expect(error).toBeDefined();
  expect(error.message).toContain('immutable (WORM)');
});
```

### 2. Signature Verification Test

```typescript
test('All audit signatures valid', async ({ supabase }) => {
  const { data: audits } = await supabase
    .from('audit_trail')
    .select('*')
    .limit(100);

  for (const audit of audits) {
    const isValid = await verifyAuditSignature(audit);
    expect(isValid).toBe(true);
  }
});
```

### 3. Trigger Coverage Test

```typescript
test('All CUD operations create audit log', async ({ supabase }) => {
  // Create API key
  const { data: key } = await supabase
    .from('api_keys')
    .insert({ name: 'Test Key', ... })
    .select()
    .single();

  // Verify audit log created
  const { data: audit } = await supabase
    .from('audit_trail')
    .select('*')
    .eq('entity_id', key.id)
    .eq('action', 'api_keys_create')
    .single();

  expect(audit).toBeDefined();
  expect(audit.new_state.name).toBe('Test Key');
});
```

---

## Incident Response

**Suspected Tampering**:
1. Query audit_trail for anomalies:
   ```sql
   -- Check for missing sequence (gap in id)
   SELECT id, id - LAG(id) OVER (ORDER BY id) as gap
   FROM audit_trail
   WHERE id - LAG(id) OVER (ORDER BY id) > 1;
   ```

2. Verify all signatures:
   ```bash
   npm run verify-audit-signatures --start-id=1000 --end-id=2000
   ```

3. Cross-reference with database backups

4. If tampering confirmed:
   - Restore from backup
   - Investigate root cause (SQL injection? Compromised admin?)
   - Notify affected tenants per GDPR Art. 33 (72h)

---

## References

- **Migration**: `supabase/migrations/008_audit_trail_worm.sql`
- **GDPR Art. 30**: https://gdpr-info.eu/art-30-gdpr/
- **SOC 2 TSC**: AICPA TSC 2017 (CC6.1)
- **Ed25519**: RFC 8032, @noble/ed25519 library
- **COSE**: RFC 9052 (CBOR Object Signing and Encryption)

**Multi-Tenancy**: See `multi-tenancy.md` for tenant isolation.
