-- ============================================================================
-- Add Projects Capability
-- ============================================================================
-- Description: Adds manage_projects capability and assigns to appropriate roles
-- Dependencies:
--   - public.capabilities table
--   - public.role_capabilities table
-- Impact:
--   - Creates manage_projects capability
--   - Assigns to owner, admin, and superadmin roles
-- Version: 1.0.0
-- Date: 2025-01-02
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. Add manage_projects capability
-- ============================================================================

INSERT INTO public.capabilities (name, description, category)
VALUES (
  'manage_projects',
  'Create, edit, archive, and delete projects',
  'projects'
)
ON CONFLICT (name) DO UPDATE
SET 
  description = EXCLUDED.description,
  category = EXCLUDED.category;

-- ============================================================================
-- 2. Assign to roles
-- ============================================================================

-- Get the capability ID
DO $$
DECLARE
  capability_id_var UUID;
BEGIN
  SELECT id INTO capability_id_var
  FROM public.capabilities
  WHERE name = 'manage_projects';

  -- Assign to owner
  INSERT INTO public.role_capabilities (role, capability_id, is_default)
  VALUES ('owner', capability_id_var, true)
  ON CONFLICT (role, capability_id) DO NOTHING;

  -- Assign to admin
  INSERT INTO public.role_capabilities (role, capability_id, is_default)
  VALUES ('admin', capability_id_var, true)
  ON CONFLICT (role, capability_id) DO NOTHING;

  -- Assign to superadmin
  INSERT INTO public.role_capabilities (role, capability_id, is_default)
  VALUES ('superadmin', capability_id_var, true)
  ON CONFLICT (role, capability_id) DO NOTHING;

  RAISE NOTICE '✅ manage_projects capability added and assigned to owner, admin, and superadmin roles';
END $$;

-- ============================================================================
-- Migration Completion
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration completed successfully: Projects capability added';
END $$;

COMMIT;

