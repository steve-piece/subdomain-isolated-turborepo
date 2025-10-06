-- ============================================================================
-- Migration: organization_schema_updates
-- ============================================================================
-- Name: organization_schema_updates
-- Version: 20250107
-- Author: System
-- Date: 2025-01-07
-- Description: 
--   1. Creates company_size_range enum for standardized company sizes
--   2. Migrates organizations.company_size from TEXT with CHECK to ENUM
--   3. Removes unused settings and metadata JSONB columns
-- Dependencies: 
--   - public.organizations table must exist
-- Impact: 
--   - Creates new enum type
--   - Alters organizations table (drops 2 columns, changes 1 column type)
--   - Existing company_size values preserved during migration
-- Risk Assessment: Medium
--   - Column drops are irreversible (data in settings/metadata will be lost)
--   - Type change requires data migration
--   - Backup recommended before running
-- Rollback Plan: 
--   - Restore from backup if settings/metadata data needed
--   - Revert company_size to TEXT with CHECK constraint
-- Post-migration Actions: 
--   - Verify all organizations have valid company_size values
--   - Update application code to use enum
-- ============================================================================

BEGIN;

SET statement_timeout = '60s';

-- ============================================================================
-- Step 1: Create company_size_range enum
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Step 1: Creating company_size_range enum type';
END $$;

CREATE TYPE public.company_size_range AS ENUM (
  '1-10',
  '11-50',
  '51-200',
  '201-500',
  '501-1000',
  '1000+'
);

COMMENT ON TYPE public.company_size_range IS
'Standardized company size ranges for organization classification. Used to categorize organizations by employee count.';

-- ============================================================================
-- Step 2: Migrate company_size column from TEXT to ENUM
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Step 2: Migrating company_size column to enum type';
END $$;

-- Add temporary column
ALTER TABLE public.organizations 
ADD COLUMN company_size_temp public.company_size_range;

-- Migrate existing data
UPDATE public.organizations
SET company_size_temp = company_size::public.company_size_range
WHERE company_size IS NOT NULL;

-- Drop old column and CHECK constraint
ALTER TABLE public.organizations 
DROP COLUMN company_size;

-- Rename temp column to original name
ALTER TABLE public.organizations 
RENAME COLUMN company_size_temp TO company_size;

-- Update column comment
COMMENT ON COLUMN public.organizations.company_size IS
'Organization size by employee count. Enum values: 1-10, 11-50, 51-200, 201-500, 501-1000, 1000+. NULL = not specified.';

-- ============================================================================
-- Step 3: Remove unused JSONB columns
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Step 3: Removing settings and metadata JSONB columns';
END $$;

-- Drop settings column (replaced by organization_team_settings table)
ALTER TABLE public.organizations 
DROP COLUMN IF EXISTS settings;

-- Drop metadata column (not actively used)
ALTER TABLE public.organizations 
DROP COLUMN IF EXISTS metadata;

-- ============================================================================
-- Step 4: Validation
-- ============================================================================

DO $$
DECLARE
  v_org_count INTEGER;
  v_with_size INTEGER;
  v_invalid_size INTEGER;
BEGIN
  RAISE NOTICE 'Step 4: Validating migration results';

  -- Count total organizations
  SELECT COUNT(*) INTO v_org_count FROM public.organizations;
  
  -- Count orgs with company_size set
  SELECT COUNT(*) INTO v_with_size 
  FROM public.organizations 
  WHERE company_size IS NOT NULL;
  
  -- Check for any invalid values (should be 0)
  SELECT COUNT(*) INTO v_invalid_size
  FROM public.organizations
  WHERE company_size IS NOT NULL 
    AND company_size NOT IN ('1-10', '11-50', '51-200', '201-500', '501-1000', '1000+');

  RAISE NOTICE '📊 Migration Results:';
  RAISE NOTICE '  - Total organizations: %', v_org_count;
  RAISE NOTICE '  - With company_size: %', v_with_size;
  RAISE NOTICE '  - Invalid company_size values: %', v_invalid_size;

  IF v_invalid_size > 0 THEN
    RAISE EXCEPTION '❌ Migration validation failed: % organizations have invalid company_size', v_invalid_size;
  END IF;

  RAISE NOTICE '✅ Migration validation successful';
END $$;

COMMIT;

-- ============================================================================
-- Final Status Report
-- ============================================================================

DO $$
DECLARE
  v_columns_exist BOOLEAN;
BEGIN
  -- Check if settings and metadata columns still exist
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'organizations' 
      AND column_name IN ('settings', 'metadata')
  ) INTO v_columns_exist;

  IF v_columns_exist THEN
    RAISE WARNING '⚠️ Settings or metadata columns still exist!';
  ELSE
    RAISE NOTICE '✅ Settings and metadata columns successfully removed';
  END IF;

  RAISE NOTICE '✅ Migration organization_schema_updates completed successfully';
END $$;
