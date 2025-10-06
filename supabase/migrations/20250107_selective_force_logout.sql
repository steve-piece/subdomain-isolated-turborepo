-- ============================================================================
-- Selective Force Logout by Role
-- ============================================================================
-- Migration: 20250107_selective_force_logout
-- Purpose: Enable selective logout of users by role when their capabilities change
-- Dependencies: 
--   - public.user_profiles table with force_logout_after column
--   - public.organizations table
-- Impact: Adds function to force logout users with specific roles
-- Rollback: Drop the function
-- ============================================================================

BEGIN;

RAISE NOTICE 'Starting migration: selective_force_logout';

-- ============================================================================
-- Function: Force Logout Users by Role
-- ============================================================================
-- Selectively logs out all users with a specific role in an organization
-- Use case: When role capabilities are updated, only affect users with that role

CREATE OR REPLACE FUNCTION public.force_logout_users_by_role(
  p_org_id UUID,
  p_role user_role
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_affected_users INTEGER;
  v_current_time TIMESTAMPTZ := NOW();
BEGIN
  -- Input validation
  IF p_org_id IS NULL THEN
    RAISE EXCEPTION 'p_org_id cannot be NULL'
      USING HINT = 'Provide a valid organization UUID',
            ERRCODE = '22004';
  END IF;

  IF p_role IS NULL THEN
    RAISE EXCEPTION 'p_role cannot be NULL'
      USING HINT = 'Provide a valid role',
            ERRCODE = '22004';
  END IF;

  -- Update force_logout_after for all users with the specified role
  UPDATE public.user_profiles
  SET 
    force_logout_after = v_current_time,
    updated_at = v_current_time
  WHERE 
    org_id = p_org_id
    AND role = p_role;

  GET DIAGNOSTICS v_affected_users = ROW_COUNT;

  RAISE NOTICE 'Force logout applied to % users with role % in org %', 
    v_affected_users, p_role, p_org_id;

  RETURN jsonb_build_object(
    'success', true,
    'affected_users', v_affected_users,
    'role', p_role,
    'org_id', p_org_id,
    'timestamp', v_current_time
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in force_logout_users_by_role for org % role %: %',
      p_org_id, p_role, SQLERRM;
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'error_code', SQLSTATE
    );
END;
$$;

COMMENT ON FUNCTION public.force_logout_users_by_role(UUID, user_role) IS
'Forces logout for all users with a specific role in an organization. Used when role capabilities are updated to ensure users get fresh JWTs with updated permissions. More selective than organization-wide logout.';

GRANT EXECUTE ON FUNCTION public.force_logout_users_by_role(UUID, user_role) TO authenticated;

-- ============================================================================
-- Update Trigger to NOT Auto-Update Organization Timestamp
-- ============================================================================
-- We'll handle role-specific logouts in the application layer instead

-- Drop the old trigger that causes org-wide logouts
DROP TRIGGER IF EXISTS trg_permissions_updated ON public.org_role_capabilities;

-- Create a more targeted trigger that only logs the change
CREATE OR REPLACE FUNCTION public.log_permissions_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Just log the change, don't trigger org-wide logout
  RAISE NOTICE 'Role capability changed for org % role %: % %',
    COALESCE(NEW.org_id, OLD.org_id),
    COALESCE(NEW.role, OLD.role),
    TG_OP,
    COALESCE(NEW.granted, OLD.granted);
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_log_permissions_change
AFTER INSERT OR UPDATE OR DELETE ON public.org_role_capabilities
FOR EACH ROW
EXECUTE FUNCTION public.log_permissions_change();

COMMENT ON FUNCTION public.log_permissions_change IS
'Logs role capability changes without triggering organization-wide logout. Selective logout is handled in application layer.';

RAISE NOTICE 'Migration selective_force_logout completed successfully';

COMMIT;
