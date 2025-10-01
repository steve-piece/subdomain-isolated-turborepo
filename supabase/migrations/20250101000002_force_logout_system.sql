-- ============================================================================
-- Force Logout System
-- ============================================================================
-- Implements comprehensive force logout functionality for security and 
-- permission management:
--
-- 1. Organization-wide force logout (for migrations, security incidents)
-- 2. Per-user force logout (for role changes, suspicious activity)
-- 3. Automatic logout on permission changes
--
-- How it works:
-- - Each logout trigger sets a timestamp
-- - Middleware checks if user's JWT was issued BEFORE the timestamp
-- - If yes, user is forced to re-login
-- ============================================================================

-- ============================================================================
-- 1. Add Organization-Wide Force Logout Timestamp
-- ============================================================================
-- Used to force logout ALL users in an organization at once

ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS force_logout_after timestamptz NULL;

COMMENT ON COLUMN public.organizations.force_logout_after IS 
'When set, all users with JWTs issued before this timestamp are forced to log out. Used for migrations, security incidents, or permission changes.';

-- ============================================================================
-- 2. Add Per-User Force Logout Timestamp
-- ============================================================================
-- Used to force logout a specific user (e.g., role change, suspicious activity)

ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS force_logout_after timestamptz NULL;

COMMENT ON COLUMN public.user_profiles.force_logout_after IS 
'When set, this user must re-login if their JWT was issued before this timestamp. Used for role changes or security concerns.';

-- ============================================================================
-- 3. Add Permissions Update Tracking
-- ============================================================================
-- Track when organization role capabilities are updated

ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS permissions_updated_at timestamptz NULL;

COMMENT ON COLUMN public.organizations.permissions_updated_at IS 
'Last time organization role capabilities were modified. Used to auto-logout users with outdated permissions in their JWT.';

-- ============================================================================
-- 4. Trigger: Auto-Update permissions_updated_at
-- ============================================================================
-- Automatically updates timestamp when org_role_capabilities are modified

CREATE OR REPLACE FUNCTION public.update_permissions_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update the organization's permissions_updated_at timestamp
  UPDATE public.organizations
  SET permissions_updated_at = now()
  WHERE id = NEW.org_id;
  
  RETURN NEW;
END;
$$;

-- Apply trigger to org_role_capabilities table
DROP TRIGGER IF EXISTS trg_permissions_updated ON public.org_role_capabilities;

CREATE TRIGGER trg_permissions_updated
AFTER INSERT OR UPDATE OR DELETE ON public.org_role_capabilities
FOR EACH ROW
EXECUTE FUNCTION public.update_permissions_timestamp();

COMMENT ON FUNCTION public.update_permissions_timestamp IS 
'Automatically updates organizations.permissions_updated_at when role capabilities change';

-- ============================================================================
-- 5. Function: Force Logout All Organization Users
-- ============================================================================
-- Admin action to force logout all users in an organization

CREATE OR REPLACE FUNCTION public.force_logout_organization(p_org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected_users integer;
BEGIN
  -- Set the force_logout_after timestamp to now
  UPDATE public.organizations
  SET force_logout_after = now()
  WHERE id = p_org_id;

  -- Count affected users
  SELECT COUNT(*)
  INTO affected_users
  FROM public.user_profiles
  WHERE org_id = p_org_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'All users will be forced to re-login',
    'affected_users', affected_users,
    'force_logout_after', (SELECT force_logout_after FROM organizations WHERE id = p_org_id)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.force_logout_organization(uuid) TO authenticated;

COMMENT ON FUNCTION public.force_logout_organization IS 
'Forces all users in an organization to re-login. Only callable by owners/admins (enforced in application layer).';

-- ============================================================================
-- 6. Function: Force Logout Specific User
-- ============================================================================
-- Admin action to force logout a specific user

CREATE OR REPLACE FUNCTION public.force_logout_user(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email text;
BEGIN
  -- Set the force_logout_after timestamp for this user
  UPDATE public.user_profiles
  SET force_logout_after = now()
  WHERE user_id = p_user_id
  RETURNING email INTO user_email;

  IF user_email IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'User not found'
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', format('User %s will be forced to re-login', user_email),
    'user_email', user_email,
    'force_logout_after', (SELECT force_logout_after FROM user_profiles WHERE user_id = p_user_id)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.force_logout_user(uuid) TO authenticated;

COMMENT ON FUNCTION public.force_logout_user IS 
'Forces a specific user to re-login. Only callable by owners/admins (enforced in application layer).';

-- ============================================================================
-- 7. Function: Get Force Logout Status
-- ============================================================================
-- Check if a user should be forced to logout

CREATE OR REPLACE FUNCTION public.should_force_logout(
  p_user_id uuid,
  p_org_id uuid,
  p_jwt_issued_at timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  org_logout_after timestamptz;
  user_logout_after timestamptz;
  permissions_updated timestamptz;
  should_logout boolean := false;
  reason text := '';
BEGIN
  -- Get organization force logout timestamp
  SELECT force_logout_after, permissions_updated_at
  INTO org_logout_after, permissions_updated
  FROM public.organizations
  WHERE id = p_org_id;

  -- Get user force logout timestamp
  SELECT force_logout_after
  INTO user_logout_after
  FROM public.user_profiles
  WHERE user_id = p_user_id;

  -- Check if org-wide logout is required
  IF org_logout_after IS NOT NULL AND p_jwt_issued_at < org_logout_after THEN
    should_logout := true;
    reason := 'Organization-wide logout enforced';
  END IF;

  -- Check if user-specific logout is required
  IF user_logout_after IS NOT NULL AND p_jwt_issued_at < user_logout_after THEN
    should_logout := true;
    reason := 'User-specific logout enforced';
  END IF;

  -- Check if permissions have been updated since JWT was issued
  IF permissions_updated IS NOT NULL AND p_jwt_issued_at < permissions_updated THEN
    should_logout := true;
    reason := 'Permissions updated - re-authentication required';
  END IF;

  RETURN jsonb_build_object(
    'should_logout', should_logout,
    'reason', reason,
    'jwt_issued_at', p_jwt_issued_at,
    'org_logout_after', org_logout_after,
    'user_logout_after', user_logout_after,
    'permissions_updated', permissions_updated
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.should_force_logout(uuid, uuid, timestamptz) TO authenticated;

COMMENT ON FUNCTION public.should_force_logout IS 
'Checks if a user should be forced to logout based on various timestamps. Called by middleware on every request.';

-- ============================================================================
-- 8. Create Indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_organizations_force_logout 
ON public.organizations(force_logout_after) 
WHERE force_logout_after IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_profiles_force_logout 
ON public.user_profiles(force_logout_after) 
WHERE force_logout_after IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_organizations_permissions_updated 
ON public.organizations(permissions_updated_at) 
WHERE permissions_updated_at IS NOT NULL;

-- ============================================================================
-- Usage Examples
-- ============================================================================

-- Example 1: Force logout all users in an organization (admin action)
-- SELECT public.force_logout_organization('org-uuid-here');

-- Example 2: Force logout a specific user (admin action)
-- SELECT public.force_logout_user('user-uuid-here');

-- Example 3: Check if user should be logged out (called by middleware)
-- SELECT public.should_force_logout(
--   'user-uuid-here',
--   'org-uuid-here',
--   '2025-01-01 10:00:00+00'::timestamptz  -- JWT issued at timestamp
-- );

-- Example 4: Clear force logout (allow users to login again)
-- UPDATE public.organizations SET force_logout_after = NULL WHERE id = 'org-uuid-here';
-- UPDATE public.user_profiles SET force_logout_after = NULL WHERE user_id = 'user-uuid-here';

-- ============================================================================
-- Security Notes
-- ============================================================================
-- 1. Functions use SECURITY DEFINER to bypass RLS
-- 2. Application layer MUST check user role before calling force_logout functions
-- 3. Only owners/admins should be able to trigger force logout
-- 4. Middleware should call should_force_logout() on every protected route
-- 5. JWT issued_at timestamp is available as: (JWT payload)['iat'] * 1000 (milliseconds)
-- ============================================================================

