# Migration Rollback Scripts

This directory contains rollback scripts for all database migrations. Each rollback script reverses the changes made by its corresponding migration.

## Usage

### Rolling Back a Single Migration

```bash
psql $DATABASE_URL -f supabase/migrations/rollback/XXX_migration_name_rollback.sql
```

### Rolling Back Multiple Migrations

Rollback migrations in reverse order (newest first):

```bash
# Example: Rolling back migrations 022, 021, 020
psql $DATABASE_URL -f supabase/migrations/rollback/022_competitor_tracking_rollback.sql
psql $DATABASE_URL -f supabase/migrations/rollback/021_performance_indexes_rollback.sql
psql $DATABASE_URL -f supabase/migrations/rollback/020_jwt_refresh_tokens_rollback.sql
```

## Important Notes

1. **Always backup before rollback**: Create a database backup before rolling back any migration
2. **Rollback order**: Always rollback in reverse chronological order
3. **Data loss**: Some rollbacks may result in data loss (e.g., dropping tables)
4. **Test first**: Test rollback scripts in a staging environment before production
5. **Dependencies**: Check for dependencies between migrations before rolling back

## Rollback Testing

Each rollback script should be tested by:

1. Applying the migration
2. Inserting test data
3. Running the rollback
4. Verifying the database state matches pre-migration state
5. Re-applying the migration to ensure idempotency

## Idempotency

All migrations use `IF EXISTS` / `IF NOT EXISTS` clauses to ensure they can be run multiple times safely.

## Emergency Rollback Procedure

In case of critical production issues:

1. **Assess impact**: Determine which migration caused the issue
2. **Create backup**: `pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql`
3. **Execute rollback**: Run the appropriate rollback script
4. **Verify system**: Check application functionality
5. **Document**: Record the incident and rollback in incident log
6. **Post-mortem**: Analyze root cause and update migration

## Rollback Scripts Index

| Migration | Description | Rollback Script | Data Loss Risk |
|-----------|-------------|-----------------|----------------|
| 001 | Initial Schema | 001_initial_schema_rollback.sql | HIGH |
| 002 | Gold Standard Schema | 002_gold_standard_schema_rollback.sql | HIGH |
| 003 | Dashboard Schema | 003_dashboard_schema_rollback.sql | MEDIUM |
| 004 | APA Payments Schema | 004_apa_payments_schema_rollback.sql | HIGH |
| 005 | Pricing Matrix Table | 005_pricing_matrix_table_rollback.sql | LOW |
| 006 | Payment Correlation Index | 006_payment_correlation_index_rollback.sql | NONE |
| 007 | Multi-Tenancy Isolation | 007_multi_tenancy_isolation_rollback.sql | HIGH |
| 008 | Audit Trail WORM | 008_audit_trail_worm_rollback.sql | MEDIUM |
| 009 | AID Registry Tenant Isolation | 009_aid_registry_tenant_isolation_rollback.sql | LOW |
| 009 | BFT Schema | 009_bft_schema_rollback.sql | MEDIUM |
| 010 | Subscription Billing | 010_subscription_billing_rollback.sql | HIGH |
| 011 | Free Plan Auto Activation | 011_free_plan_auto_activation_rollback.sql | LOW |
| 013 | A2A Full Support | 013_a2a_full_support_rollback.sql | MEDIUM |
| 014 | HotStuff Tenant Context | 014_hotstuff_tenant_context_rollback.sql | LOW |
| 014 | Security Hardening | 014_security_hardening_rollback.sql | LOW |
| 015 | Intent Payments Tenant | 015_intent_payments_tenant_rollback.sql | MEDIUM |
| 016 | Job Queue System | 016_job_queue_system_rollback.sql | MEDIUM |
| 017 | Tenant Auto Provisioning | 017_tenant_auto_provisioning_rollback.sql | LOW |
| 018 | Abuse Prevention RPC | 018_abuse_prevention_rpc_rollback.sql | LOW |
| 019 | Consolidate Profiles Plan | 019_consolidate_profiles_plan_rollback.sql | MEDIUM |
| 020 | JWT Refresh Tokens | 020_jwt_refresh_tokens_rollback.sql | MEDIUM |
| 021 | Performance Indexes | 021_performance_indexes_rollback.sql | NONE |
| 022 | Competitor Tracking | 022_competitor_tracking_rollback.sql | MEDIUM |

## Contact

For questions or issues with rollback procedures, contact the database team or refer to the runbook.
