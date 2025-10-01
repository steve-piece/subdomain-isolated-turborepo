-- ============================================================================
-- Minimal JWT Custom Claims Hook (Optimized)
-- ============================================================================
-- This hook adds ONLY essential identity, organization context, and 
-- authorization data to JWTs. All other user preferences and settings 
-- should be fetched via database queries with proper indexes.
--
-- Claims included:
--   - user_id, email (identity)
--   - org_id, subdomain, company_name, organization_logo_url (org context)
--   - user_role, capabilities (authorization)
--
-- Performance: Uses indexed columns and minimal JOINs
-- Security: Capabilities validated on every login
-- ============================================================================

CREATE OR REPLACE FUNCTION public.custom_claims_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  claims jsonb;
  user_role text;
  user_subdomain text;
  user_org_id text;
  user_company_name text;
  org_logo_url text;
  user_capabilities text[];
BEGIN
  claims := event->'claims';

  -- Get user profile and organization data
  -- Uses indexes: idx_user_profiles_user_id, idx_user_profiles_org_id
  SELECT
    up.role::text,
    up.org_id::text,
    o.subdomain,
    o.company_name,
    o.logo_url
  INTO 
    user_role, 
    user_org_id,
    user_subdomain, 
    user_company_name,
    org_logo_url
  FROM public.user_profiles up
  LEFT JOIN public.organizations o ON o.id = up.org_id
  WHERE up.user_id = (event->>'user_id')::uuid
  LIMIT 1;

  -- Get user capabilities (if org and role exist)
  -- Uses indexes: idx_org_role_capabilities_org, idx_org_role_capabilities_role
  IF user_org_id IS NOT NULL AND user_role IS NOT NULL THEN
    SELECT ARRAY_AGG(c.key)
    INTO user_capabilities
    FROM public.org_role_capabilities orc
    INNER JOIN public.capabilities c ON c.id = orc.capability_id
    WHERE orc.org_id = user_org_id::uuid
      AND orc.role = user_role::user_role
      AND orc.granted = true;
  END IF;

  -- Set minimal claims
  IF user_role IS NOT NULL THEN
    claims := jsonb_set(claims, '{user_role}', to_jsonb(user_role));
  END IF;
  
  IF user_subdomain IS NOT NULL THEN
    claims := jsonb_set(claims, '{subdomain}', to_jsonb(user_subdomain));
  END IF;
  
  IF user_org_id IS NOT NULL THEN
    claims := jsonb_set(claims, '{org_id}', to_jsonb(user_org_id));
  END IF;
  
  IF user_company_name IS NOT NULL THEN
    claims := jsonb_set(claims, '{company_name}', to_jsonb(user_company_name));
  END IF;
  
  IF org_logo_url IS NOT NULL THEN
    claims := jsonb_set(claims, '{organization_logo_url}', to_jsonb(org_logo_url));
  END IF;
  
  IF user_capabilities IS NOT NULL AND array_length(user_capabilities, 1) > 0 THEN
    claims := jsonb_set(claims, '{capabilities}', to_jsonb(user_capabilities));
  ELSE
    -- Set empty array if no capabilities (prevents null checks in app)
    claims := jsonb_set(claims, '{capabilities}', '[]'::jsonb);
  END IF;

  event := jsonb_set(event, '{claims}', claims);
  RETURN event;
END;
$$;

-- ============================================================================
-- Required Indexes (verify these exist)
-- ============================================================================
-- These should already exist, but verify:

-- For user_profiles lookups
-- CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON public.user_profiles(user_id);
-- CREATE INDEX IF NOT EXISTS idx_user_profiles_org_id ON public.user_profiles(org_id);

-- For organizations lookups
-- CREATE INDEX IF NOT EXISTS idx_organizations_id ON public.organizations(id);

-- For capabilities lookups
-- CREATE INDEX IF NOT EXISTS idx_org_role_capabilities_org ON public.org_role_capabilities(org_id);
-- CREATE INDEX IF NOT EXISTS idx_org_role_capabilities_role ON public.org_role_capabilities(role);
-- CREATE INDEX IF NOT EXISTS idx_capabilities_id ON public.capabilities(id);

-- ============================================================================
-- Notes
-- ============================================================================
-- 1. Logo URL: Add notice on org settings page that logo changes require 
--    re-login to appear in the application header/favicon.
--
-- 2. Capabilities: When role permissions change, users must re-login for 
--    changes to take effect. Add warning in admin UI.
--
-- 3. User Preferences: timezone, language, profile_picture, full_name should 
--    be fetched via database queries using helper functions (see below).
--
-- 4. Organization Settings: allow_member_invites, require_admin_approval, 
--    subscription tier/status should be fetched via database queries.
-- ============================================================================

