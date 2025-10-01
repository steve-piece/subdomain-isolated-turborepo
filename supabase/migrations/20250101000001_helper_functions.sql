-- ============================================================================
-- Database Helper Functions for User & Organization Data
-- ============================================================================
-- These functions replace JWT claims with real-time database queries.
-- All use proper indexes for optimal performance.
-- ============================================================================

-- ============================================================================
-- 1. Get User Profile Data
-- ============================================================================
-- Fetches user preferences and profile information
-- Returns: full_name, bio, timezone, language, profile_picture_url, phone_number
-- Performance: Uses idx_user_profiles_user_id (single-row lookup)

CREATE OR REPLACE FUNCTION public.get_user_profile_data(p_user_id uuid)
RETURNS TABLE (
  full_name text,
  bio text,
  timezone text,
  language text,
  profile_picture_url text,
  phone_number text,
  last_active_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    up.full_name,
    up.bio,
    up.timezone,
    up.language,
    up.profile_picture_url,
    up.phone_number,
    up.last_active_at
  FROM public.user_profiles up
  WHERE up.user_id = p_user_id
  LIMIT 1;
$$;

-- Grant access to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_profile_data(uuid) TO authenticated;

-- ============================================================================
-- 2. Get Organization Team Settings
-- ============================================================================
-- Fetches organization-level team configuration
-- Returns: allow_member_invites, require_admin_approval, max_team_size, etc.
-- Performance: Uses idx_org_team_settings_org_id (single-row lookup)

CREATE OR REPLACE FUNCTION public.get_org_team_settings(p_org_id uuid)
RETURNS TABLE (
  allow_member_invites boolean,
  require_admin_approval boolean,
  auto_assign_default_role user_role,
  max_team_size integer,
  allow_guest_access boolean,
  guest_link_expiry_days integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    ots.allow_member_invites,
    ots.require_admin_approval,
    ots.auto_assign_default_role,
    ots.max_team_size,
    ots.allow_guest_access,
    ots.guest_link_expiry_days
  FROM public.organization_team_settings ots
  WHERE ots.org_id = p_org_id
  LIMIT 1;
$$;

-- Grant access to authenticated users
GRANT EXECUTE ON FUNCTION public.get_org_team_settings(uuid) TO authenticated;

-- ============================================================================
-- 3. Get Organization Subscription Status
-- ============================================================================
-- Fetches current subscription tier and status
-- Returns: tier_name, status, is_active, trial_ends_at
-- Performance: Uses idx_subscriptions_org_id

CREATE OR REPLACE FUNCTION public.get_org_subscription_status(p_org_id uuid)
RETURNS TABLE (
  tier_name text,
  org_subdomain text,
  subscription_status text,
  is_active boolean,
  trial_ends_at timestamptz,
  current_period_start timestamptz,
  current_period_end timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    st.name as tier_name,
    t.subdomain as org_subdomain,
    s.status as subscription_status,
    CASE 
      WHEN s.status IN ('active', 'trialing') THEN true
      ELSE false
    END as is_active,
    s.trial_ends_at,
    s.current_period_start,
    s.current_period_end
  FROM public.subscriptions s
  LEFT JOIN public.subscription_tiers st ON st.id = s.tier_id
  LEFT JOIN public.tenants t ON t.org_id = s.org_id
  WHERE s.org_id = p_org_id
  ORDER BY s.created_at DESC
  LIMIT 1;
$$;

-- Grant access to authenticated users
GRANT EXECUTE ON FUNCTION public.get_org_subscription_status(uuid) TO authenticated;

-- ============================================================================
-- 4. Get Complete User Context (Convenience Function)
-- ============================================================================
-- Combines user profile + org settings + subscription in one call
-- Use this in layouts/wrappers to minimize round trips
-- Performance: 3 indexed lookups (still faster than JWT bloat)

CREATE OR REPLACE FUNCTION public.get_user_context(p_user_id uuid, p_org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb := '{}'::jsonb;
  profile_data jsonb;
  team_settings jsonb;
  subscription_data jsonb;
BEGIN
  -- Get user profile
  SELECT jsonb_build_object(
    'full_name', up.full_name,
    'bio', up.bio,
    'timezone', up.timezone,
    'language', up.language,
    'profile_picture_url', up.profile_picture_url,
    'phone_number', up.phone_number,
    'last_active_at', up.last_active_at
  ) INTO profile_data
  FROM public.user_profiles up
  WHERE up.user_id = p_user_id
  LIMIT 1;

  -- Get org team settings (if org exists)
  IF p_org_id IS NOT NULL THEN
    SELECT jsonb_build_object(
      'allow_member_invites', ots.allow_member_invites,
      'require_admin_approval', ots.require_admin_approval,
      'auto_assign_default_role', ots.auto_assign_default_role::text,
      'max_team_size', ots.max_team_size,
      'allow_guest_access', ots.allow_guest_access,
      'guest_link_expiry_days', ots.guest_link_expiry_days
    ) INTO team_settings
    FROM public.organization_team_settings ots
    WHERE ots.org_id = p_org_id
    LIMIT 1;

    -- Get subscription status
    SELECT jsonb_build_object(
      'tier_name', st.name,
      'org_subdomain', t.subdomain,
      'status', s.status,
      'is_active', CASE WHEN s.status IN ('active', 'trialing') THEN true ELSE false END,
      'trial_ends_at', s.trial_ends_at,
      'current_period_start', s.current_period_start,
      'current_period_end', s.current_period_end
    ) INTO subscription_data
    FROM public.subscriptions s
    LEFT JOIN public.subscription_tiers st ON st.id = s.tier_id
    LEFT JOIN public.tenants t ON t.org_id = s.org_id
    WHERE s.org_id = p_org_id
    ORDER BY s.created_at DESC
    LIMIT 1;
  END IF;

  -- Combine results
  result := jsonb_build_object(
    'profile', COALESCE(profile_data, '{}'::jsonb),
    'team_settings', COALESCE(team_settings, '{}'::jsonb),
    'subscription', COALESCE(subscription_data, '{}'::jsonb)
  );

  RETURN result;
END;
$$;

-- Grant access to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_context(uuid, uuid) TO authenticated;

-- ============================================================================
-- Required Indexes (verify these exist)
-- ============================================================================
-- User profiles
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON public.user_profiles(user_id);

-- Organization team settings
CREATE INDEX IF NOT EXISTS idx_org_team_settings_org_id ON public.organization_team_settings(org_id);

-- Subscriptions
CREATE INDEX IF NOT EXISTS idx_subscriptions_org_id ON public.subscriptions(org_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);

-- Subscription tiers
CREATE INDEX IF NOT EXISTS idx_subscription_tiers_id ON public.subscription_tiers(id);

-- ============================================================================
-- Usage Examples
-- ============================================================================

-- Example 1: Get user profile only
-- SELECT * FROM public.get_user_profile_data('user-uuid-here');

-- Example 2: Get org team settings
-- SELECT * FROM public.get_org_team_settings('org-uuid-here');

-- Example 3: Get subscription status
-- SELECT * FROM public.get_org_subscription_status('org-uuid-here');

-- Example 4: Get everything at once (recommended for layouts)
-- SELECT public.get_user_context('user-uuid-here', 'org-uuid-here');
-- Returns: {"profile": {...}, "team_settings": {...}, "subscription": {...}}

-- ============================================================================
-- Notes
-- ============================================================================
-- 1. These functions use SECURITY DEFINER to bypass RLS policies safely
-- 2. All functions use proper indexes for single-row lookups (< 1ms typically)
-- 3. The get_user_context() function combines 3 queries but is still faster
--    than bloating JWTs with stale data
-- 4. Call these functions in Next.js layouts/wrappers, cache with revalidate
-- ============================================================================

COMMENT ON FUNCTION public.get_user_profile_data IS 'Fetches user preferences and profile information with optimal indexing';
COMMENT ON FUNCTION public.get_org_team_settings IS 'Fetches organization team configuration settings';
COMMENT ON FUNCTION public.get_org_subscription_status IS 'Fetches current subscription tier and status';
COMMENT ON FUNCTION public.get_user_context IS 'Convenience function that combines user profile, org settings, and subscription in one call';

