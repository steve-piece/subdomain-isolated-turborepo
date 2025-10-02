-- ============================================================================
-- Projects Module Rollback
-- ============================================================================
-- Description: Rolls back the projects module migration
-- Removes: 
--   - public.projects table
--   - public.project_permissions table
--   - public.project_status enum
--   - public.project_permission_level enum
--   - All associated indexes and policies
-- ============================================================================

BEGIN;

-- Drop tables (CASCADE will drop dependent policies and constraints)
DROP TABLE IF EXISTS public.project_permissions CASCADE;
DROP TABLE IF EXISTS public.projects CASCADE;

-- Drop ENUMs
DROP TYPE IF EXISTS public.project_permission_level;
DROP TYPE IF EXISTS public.project_status;

DO $$
BEGIN
  RAISE NOTICE '✅ Rollback completed successfully: Projects module removed';
  RAISE NOTICE 'Dropped:';
  RAISE NOTICE '  - public.projects table';
  RAISE NOTICE '  - public.project_permissions table';
  RAISE NOTICE '  - public.project_status enum';
  RAISE NOTICE '  - public.project_permission_level enum';
END $$;

COMMIT;

