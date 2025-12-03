# Database Migration Guide

## Overview

This guide covers best practices for creating, testing, and deploying database migrations for the Anóteros Lógos platform.

## Table of Contents

1. [Migration Principles](#migration-principles)
2. [Creating Migrations](#creating-migrations)
3. [Idempotency Requirements](#idempotency-requirements)
4. [Rollback Scripts](#rollback-scripts)
5. [Testing Migrations](#testing-migrations)
6. [Deployment Process](#deployment-process)
7. [Emergency Procedures](#emergency-procedures)

## Migration Principles

### 1. Idempotency

**All migrations MUST be idempotent** - they can be run multiple times without causing errors or data corruption.

**Required patterns:**
- `CREATE TABLE IF NOT EXISTS`
- `CREATE INDEX IF NOT EXISTS`
- `DROP ... IF EXISTS`
- `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` (PostgreSQL 9.6+)
- `DO $$ BEGIN ... EXCEPTION WHEN duplicate_object THEN NULL; END $$;` for complex operations

### 2. Backward Compatibility

Migrations should maintain backward compatibility with the running application:

- Add new columns as nullable initially
- Don't drop columns immediately (deprecate first)
- Use database views for schema changes
- Deploy application code before removing old schema

### 3. Data Safety

- Never delete data without explicit approval
- Always provide rollback scripts
- Test on staging before production
- Create backups before major migrations

### 4. Performance

- Create indexes `CONCURRENTLY` in production
- Avoid long-running transactions
- Use `ANALYZE` after bulk data changes
- Consider table partitioning for large tables

## Creating Migrations

### Naming Convention

```
XXX_descriptive_name.sql
```

- `XXX`: Sequential number (001, 002, etc.)
- `descriptive_name`: Snake_case description
- Examples: `020_jwt_refresh_tokens.sql`, `021_performance_indexes.sql`

### Migration Template

```sql
-- =====================================================
-- Migration XXX: [Title]
-- Purpose: [Brief description]
-- Created: [Date]
-- =====================================================

-- Enable required extensions (idempotent)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create tables (idempotent)
CREATE TABLE IF NOT EXISTS public.my_table (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes (idempotent)
CREATE INDEX IF NOT EXISTS idx_my_table_name 
  ON public.my_table(name);

-- Create functions (idempotent - use OR REPLACE)
CREATE OR REPLACE FUNCTION public.my_function()
RETURNS VOID AS $
BEGIN
  -- Function body
END;
$ LANGUAGE plpgsql;

-- Enable RLS (idempotent)
ALTER TABLE public.my_table ENABLE ROW LEVEL SECURITY;

-- Create policies (idempotent - drop first)
DROP POLICY IF EXISTS "policy_name" ON public.my_table;
CREATE POLICY "policy_name" ON public.my_table
  FOR SELECT USING (auth.uid() = user_id);

-- Add comments
COMMENT ON TABLE public.my_table IS 'Description of table purpose';

-- Log completion
DO $
BEGIN
  RAISE NOTICE '✅ Migration XXX completed successfully';
END $;
```

## Idempotency Requirements

### Tables

```sql
-- ✅ CORRECT: Idempotent
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL
);

-- ❌ WRONG: Not idempotent
CREATE TABLE public.users (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL
);
```

### Columns

```sql
-- ✅ CORRECT: Idempotent (PostgreSQL 9.6+)
ALTER TABLE public.users 
  ADD COLUMN IF NOT EXISTS phone TEXT;

-- ✅ CORRECT: Idempotent (older PostgreSQL)
DO $
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'phone'
  ) THEN
    ALTER TABLE public.users ADD COLUMN phone TEXT;
  END IF;
END $;
```

### Indexes

```sql
-- ✅ CORRECT: Idempotent
CREATE INDEX IF NOT EXISTS idx_users_email 
  ON public.users(email);

-- For production (non-blocking):
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email 
  ON public.users(email);
```

### Functions

```sql
-- ✅ CORRECT: Idempotent
CREATE OR REPLACE FUNCTION public.get_user(p_id UUID)
RETURNS TABLE(id UUID, email TEXT) AS $
  SELECT id, email FROM public.users WHERE id = p_id;
$ LANGUAGE sql STABLE;
```

### Triggers

```sql
-- ✅ CORRECT: Idempotent
DROP TRIGGER IF EXISTS update_timestamp ON public.users;
CREATE TRIGGER update_timestamp
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### Policies

```sql
-- ✅ CORRECT: Idempotent
DROP POLICY IF EXISTS "users_select" ON public.users;
CREATE POLICY "users_select" ON public.users
  FOR SELECT USING (auth.uid() = id);
```

## Rollback Scripts

Every migration MUST have a corresponding rollback script.

### Rollback Script Template

```sql
-- =====================================================
-- ROLLBACK: Migration XXX - [Title]
-- Purpose: Reverse changes from migration XXX
-- Data Loss Risk: [NONE/LOW/MEDIUM/HIGH]
-- =====================================================

-- Drop in reverse order of creation

-- Drop triggers
DROP TRIGGER IF EXISTS trigger_name ON public.table_name;

-- Drop functions
DROP FUNCTION IF EXISTS public.function_name(arg_types);

-- Drop policies
DROP POLICY IF EXISTS "policy_name" ON public.table_name;

-- Drop indexes
DROP INDEX IF EXISTS idx_table_column;

-- Drop tables (CASCADE if needed)
DROP TABLE IF EXISTS public.table_name CASCADE;

-- Log completion
DO $
BEGIN
  RAISE NOTICE '✅ Rollback XXX completed';
  RAISE WARNING 'Data loss may have occurred';
END $;
```

### Rollback Naming

```
rollback/XXX_descriptive_name_rollback.sql
```

## Testing Migrations

### 1. Idempotency Test

```bash
# Test single migration
./supabase/migrations/test-idempotency.sh 020_jwt_refresh_tokens.sql

# Test all migrations
./supabase/migrations/test-idempotency.sh
```

### 2. Manual Testing Checklist

- [ ] Migration runs successfully on clean database
- [ ] Migration runs successfully when run twice (idempotency)
- [ ] Migration runs successfully when run three times
- [ ] Rollback script runs successfully
- [ ] Migration can be re-applied after rollback
- [ ] Application works with new schema
- [ ] No performance degradation
- [ ] RLS policies work correctly
- [ ] Indexes are used by queries (check with EXPLAIN)

### 3. Staging Environment Test

```bash
# 1. Backup staging database
pg_dump $STAGING_DB_URL > staging_backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Apply migration
psql $STAGING_DB_URL -f supabase/migrations/XXX_migration.sql

# 3. Run application tests
npm run test:integration

# 4. Verify application functionality
# (manual testing or automated E2E tests)

# 5. Test rollback
psql $STAGING_DB_URL -f supabase/migrations/rollback/XXX_migration_rollback.sql

# 6. Re-apply migration
psql $STAGING_DB_URL -f supabase/migrations/XXX_migration.sql
```

## Deployment Process

### Pre-Deployment Checklist

- [ ] Migration tested in local environment
- [ ] Migration tested in staging environment
- [ ] Rollback script created and tested
- [ ] Performance impact assessed
- [ ] Backup strategy confirmed
- [ ] Deployment window scheduled (if needed)
- [ ] Team notified of deployment
- [ ] Rollback procedure documented

### Deployment Steps

#### 1. Create Backup

```bash
# Production backup
pg_dump $PRODUCTION_DB_URL > prod_backup_$(date +%Y%m%d_%H%M%S).sql

# Verify backup
pg_restore --list prod_backup_*.sql | head -20
```

#### 2. Apply Migration

```bash
# For Supabase hosted:
# Migrations are applied automatically via GitHub integration

# For self-hosted:
psql $PRODUCTION_DB_URL -f supabase/migrations/XXX_migration.sql
```

#### 3. Verify Deployment

```bash
# Check migration applied
psql $PRODUCTION_DB_URL -c "SELECT * FROM schema_migrations ORDER BY version DESC LIMIT 5;"

# Verify table exists
psql $PRODUCTION_DB_URL -c "\dt public.*"

# Check application health
curl https://anoteroslogos.com/api/health
```

#### 4. Monitor

- Watch error rates in Sentry
- Monitor latency in Grafana
- Check database metrics (connections, query time)
- Review application logs

### Post-Deployment

- [ ] Verify application functionality
- [ ] Check monitoring dashboards
- [ ] Update documentation
- [ ] Notify team of successful deployment
- [ ] Archive backup (keep for 30 days)

## Emergency Procedures

### Rollback Procedure

If issues are detected after deployment:

#### 1. Assess Impact

- Check error rates
- Review user reports
- Identify affected functionality

#### 2. Decision Point

- **Minor issues**: Fix forward with hotfix migration
- **Major issues**: Rollback immediately

#### 3. Execute Rollback

```bash
# 1. Notify team
# Post in #incidents channel

# 2. Execute rollback script
psql $PRODUCTION_DB_URL -f supabase/migrations/rollback/XXX_migration_rollback.sql

# 3. Verify rollback
psql $PRODUCTION_DB_URL -c "\dt public.*"

# 4. Check application health
curl https://anoteroslogos.com/api/health

# 5. Monitor recovery
# Watch error rates return to normal
```

#### 4. Post-Incident

- Document incident in post-mortem
- Identify root cause
- Update migration and tests
- Schedule re-deployment

### Data Recovery

If data loss occurs:

```bash
# 1. Stop application (prevent further writes)
# 2. Restore from backup
pg_restore -d $PRODUCTION_DB_URL prod_backup_*.sql

# 3. Verify data integrity
# Run data validation queries

# 4. Resume application
```

## Best Practices

### DO

✅ Use `IF NOT EXISTS` / `IF EXISTS` clauses
✅ Create rollback scripts
✅ Test migrations multiple times
✅ Add comments and documentation
✅ Use transactions where appropriate
✅ Create indexes `CONCURRENTLY` in production
✅ Add `ANALYZE` after bulk changes
✅ Use meaningful migration names
✅ Keep migrations small and focused
✅ Version control all migrations

### DON'T

❌ Delete data without approval
❌ Make breaking changes without deprecation period
❌ Skip testing in staging
❌ Deploy without rollback plan
❌ Use long-running transactions in production
❌ Forget to enable RLS on new tables
❌ Hard-code values (use variables/config)
❌ Mix schema and data changes
❌ Deploy during peak hours (unless necessary)
❌ Skip backups

## Common Patterns

### Adding a Column

```sql
-- Add nullable column (safe)
ALTER TABLE public.users 
  ADD COLUMN IF NOT EXISTS phone TEXT;

-- Backfill data (separate transaction)
UPDATE public.users SET phone = '' WHERE phone IS NULL;

-- Add constraint (after backfill)
ALTER TABLE public.users 
  ALTER COLUMN phone SET NOT NULL;
```

### Renaming a Column

```sql
-- Step 1: Add new column
ALTER TABLE public.users 
  ADD COLUMN IF NOT EXISTS email_address TEXT;

-- Step 2: Backfill data
UPDATE public.users 
  SET email_address = email 
  WHERE email_address IS NULL;

-- Step 3: Deploy application using both columns

-- Step 4: Drop old column (separate migration)
ALTER TABLE public.users 
  DROP COLUMN IF EXISTS email;
```

### Adding an Index

```sql
-- Development/Staging
CREATE INDEX IF NOT EXISTS idx_users_email 
  ON public.users(email);

-- Production (non-blocking)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email 
  ON public.users(email);
```

## Troubleshooting

### Migration Fails on Second Run

**Problem**: Migration is not idempotent

**Solution**: Add `IF NOT EXISTS` / `IF EXISTS` clauses

### Rollback Fails

**Problem**: Dependencies prevent dropping objects

**Solution**: Use `CASCADE` or drop dependencies first

### Performance Degradation

**Problem**: Index creation blocks table

**Solution**: Use `CREATE INDEX CONCURRENTLY`

### RLS Policies Not Working

**Problem**: Forgot to enable RLS

**Solution**: Add `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`

## Resources

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Supabase Migrations Guide](https://supabase.com/docs/guides/database/migrations)
- [Database Reliability Engineering](https://www.oreilly.com/library/view/database-reliability-engineering/9781491925935/)

## Contact

For questions or issues:
- Database Team: #database-team
- Incidents: #incidents
- Documentation: This file

---

**Last Updated**: December 2, 2025
**Version**: 1.0.0
