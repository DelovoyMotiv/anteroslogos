# Multi-Tenancy Security Documentation

**Version**: 1.0.0  
**Compliance**: SOC 2 Type II CC6.2, ISO 27001 A.9.4.1  
**Date**: 2025-11-22

---

## Executive Summary

This document describes the **complete tenant isolation architecture** implemented to prevent data leakage between customers. All user data is strictly partitioned by `tenant_id` with Row-Level Security (RLS) enforcement at the PostgreSQL layer.

**Security Guarantees**:
- ✅ **Zero Cross-Tenant Data Leakage**: RLS policies enforce tenant boundaries
- ✅ **RBAC**: Owner/Admin/Member/Viewer roles with granular permissions
- ✅ **Defense-in-Depth**: Database triggers validate FK consistency
- ✅ **Audit Trail**: All tenant operations logged immutably

---

## Architecture

### Database Schema

**Core Tables**:
1. `tenants` - Tenant metadata (owner_id, name, slug, settings)
2. `tenant_members` - User-tenant membership with roles
3. **All user data tables** - Added `tenant_id` column

**Tables with Tenant Isolation** (11 total):
- profiles, api_keys, agent_keys, subscriptions, usage_events
- audits, knowledge_graphs, citations, learning_analyses
- a2a_wallets, a2a_invoices, a2a_ledger

### Access Control Model

**Roles**:
- **Owner** - Full control (create/delete tenant, manage members, all data)
- **Admin** - Manage members, full data access, cannot delete tenant
- **Member** - Read/write data, cannot manage members
- **Viewer** - Read-only access to all tenant data

**Helper Functions**:
```sql
-- Get current user's tenant ID from session
public.get_current_tenant_id() → UUID

-- Check if user has access to tenant with role
public.user_has_tenant_access(tenant_id UUID, role TEXT) → BOOLEAN
```

### RLS Policies

**Example: api_keys table**:
```sql
-- SELECT: User can see keys in their tenant(s)
CREATE POLICY api_keys_select ON public.api_keys
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR (tenant_id IS NOT NULL AND public.user_has_tenant_access(tenant_id, 'member'))
  );

-- INSERT: User can create keys in accessible tenants
CREATE POLICY api_keys_insert ON public.api_keys
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (tenant_id IS NULL OR public.user_has_tenant_access(tenant_id, 'member'))
  );
```

**All tables** follow similar patterns with role-based restrictions.

---

## Data Leakage Prevention

### 1. RLS Enforcement

**Every SELECT query** is automatically filtered by RLS:
```sql
-- User in tenant A cannot see tenant B's data
SELECT * FROM audits WHERE user_id = <tenant_B_user>;
-- Returns 0 rows if auth.uid() not in tenant B
```

### 2. Foreign Key Validation

**Trigger**: `validate_tenant_consistency()`  
**Purpose**: Prevent cross-tenant FK references

Example:
```sql
-- Inserting citation with knowledge_graph from different tenant
INSERT INTO citations (knowledge_graph_id, tenant_id) 
  VALUES (<kg_from_tenant_A>, <tenant_B>);
-- RAISES EXCEPTION: 'Cross-tenant reference detected'
```

### 3. Session Isolation

**Supabase Auth integration**:
- User logs in → Supabase generates JWT
- Backend extracts `tenant_id` from `tenant_members` table
- Stored in PostgreSQL session: `set_config('app.current_tenant_id', tenant_id, FALSE)`
- All queries automatically scoped to tenant

---

## Knowledge Graph Isolation Modes

**Three modes** (column: `isolation_mode`):

1. **private** (default) - Only visible to tenant members
2. **shared** - Visible to all authenticated users (public knowledge)
3. **federated** - Shared across specific tenant network (future: cross-org graphs)

**Use cases**:
- B2B SaaS: `private` (strict isolation)
- Research platform: `shared` (public graphs)
- Enterprise consortiums: `federated` (controlled sharing)

---

## Testing for Data Leakage

**Automated Tests** (Playwright):
```typescript
// tests/tenancy/data-leakage.spec.ts
test('Tenant A cannot access Tenant B data', async ({ page }) => {
  // 1. Create tenant A, user Alice
  // 2. Create tenant B, user Bob
  // 3. Alice creates audit, API key, knowledge graph
  // 4. Login as Bob
  // 5. Attempt to query Alice's resources by ID
  // 6. Assert: All queries return 403/404, never Alice's data
});
```

**Manual Verification**:
```sql
-- As admin, verify RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('api_keys', 'audits', 'knowledge_graphs');
-- Expected: rowsecurity = TRUE for all

-- Verify policies exist
SELECT tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public';
-- Expected: 3-4 policies per table (select/insert/update/delete)
```

---

## Compliance Checklist

**SOC 2 Type II CC6.2 (Logical Access)**:
- ✅ Tenant isolation at database layer (RLS)
- ✅ Role-based access control (RBAC)
- ✅ Audit logging (see audit-trail.md)
- ✅ Cryptographic key separation (tenant-scoped wallets)

**ISO 27001 A.9.4.1 (Information Access Restriction)**:
- ✅ Need-to-know principle (role-based)
- ✅ Segregation of data (tenant_id partitioning)
- ✅ Access review (tenant_members table)

**GDPR Art. 32 (Security of Processing)**:
- ✅ Pseudonymization (tenant-scoped IDs)
- ✅ Data minimization (only necessary tenant linkage)
- ✅ Ability to restore data (tenant soft delete)

---

## Migration & Rollout

**Deployment Steps**:
1. Run Migration 007 in Supabase (staging first)
2. Verify RLS policies applied: `SELECT * FROM pg_policies`
3. Create test tenants, test data leakage
4. Deploy to production (zero downtime, tenant_id can be NULL initially)
5. Backfill tenant_id for existing users (assign each user their own tenant)
6. Monitor audit_trail for tenant-related errors

**Backward Compatibility**:
- `tenant_id` can be NULL (single-tenant mode)
- RLS policies allow NULL tenant_id for owner user
- Gradual migration: users get tenant on next login

---

## Incident Response

**Suspected Data Leakage**:
1. Query audit_trail for cross-tenant access attempts
2. Review RLS policies for bypassed conditions
3. Check application code for `set_config` misuse
4. Verify no `SECURITY DEFINER` functions bypass RLS

**Recovery**:
```sql
-- Disable compromised tenant
UPDATE tenants SET status = 'suspended' WHERE id = <tenant_id>;

-- Audit all access
SELECT * FROM audit_trail 
WHERE tenant_id = <tenant_id> 
  AND timestamp > <incident_start>;
```

---

## References

- **Migration**: `supabase/migrations/007_multi_tenancy_isolation.sql`
- **RLS Guide**: https://supabase.com/docs/guides/auth/row-level-security
- **SOC 2 Trust Services**: AICPA TSC 2017 (CC6.2)
- **ISO 27001**: A.9.4.1 Information Access Restriction

**Audit Trail**: See `audit-trail.md` for WORM compliance.
