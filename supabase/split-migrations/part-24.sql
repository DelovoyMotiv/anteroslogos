-- ============================================
-- Migration 24: 023_database_constraints.sql
-- ============================================

-- =====================================================
-- Migration 023: Database Constraints Enhancement
-- Purpose: Add comprehensive constraints for data integrity
-- Date: 2025-12-02
-- Property 50: Foreign Key Constraints
-- Property 51: Business Rule Constraints
-- Validates: Requirements 9.3
-- =====================================================

-- This migration adds missing constraints to enforce:
-- 1. Foreign key relationships for referential integrity
-- 2. Check constraints for business rules
-- 3. Unique constraints for natural keys
-- 4. Not null constraints where applicable

-- =====================================================
-- PART 1: PROFILES TABLE CONSTRAINTS
-- Business rule constraints for user profiles
-- =====================================================

-- Add NOT NULL constraints for critical fields
ALTER TABLE public.profiles
  ALTER COLUMN email SET NOT NULL,
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN updated_at SET NOT NULL;

-- Add check constraint for credits_remaining (must be non-negative)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'profiles_credits_remaining_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_credits_remaining_check 
      CHECK (credits_remaining >= 0);
  END IF;
END $$;

-- Add check constraint for total_audits (must be non-negative)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'profiles_total_audits_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_total_audits_check 
      CHECK (total_audits >= 0);
  END IF;
END $$;

-- Migration complete - constraints added successfully


-- Migration complete: 023_database_constraints.sql


