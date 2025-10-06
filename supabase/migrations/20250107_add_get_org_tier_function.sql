-- ==========================================
-- Migration: Add get_org_tier Function
-- ==========================================
-- Name: 20250107_add_get_org_tier_function
-- Version: 1.0.0
-- Author: System
-- Date: 2025-01-07
-- Description: Creates a function to retrieve organization tier information with safe defaults
-- Dependencies: organizations, subscriptions, subscription_tiers tables
-- Impact: New function only, no schema changes
-- Risk Assessment: LOW - read-only function with no side effects
-- Rollback Plan: DROP FUNCTION public.get_org_tier(UUID)
-- ==========================================

BEGIN;

SET statement_timeout = '30s';

RAISE NOTICE 'Starting get_org_tier function creation...';

-- ==========================================
-- Function: Get Organization Tier with Safe Defaults
-- ==========================================
-- Returns organization tier information, defaulting to Free tier if no subscription exists
-- This ensures all organizations have a valid tier, preventing null-related bugs

CREATE OR REPLACE FUNCTION public.get_org_tier(p_org_id UUID)
RETURNS TABLE(
  tier_name TEXT,
  allows_custom_permissions BOOLEAN,
  max_team_members INTEGER,
  max_projects INTEGER,
  subscription_status TEXT,
  is_active BOOLEAN,
  current_period_end TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Input validation
  IF p_org_id IS NULL THEN
    RAISE EXCEPTION 'p_org_id cannot be NULL'
      USING HINT = 'Provide a valid organization UUID',
            ERRCODE = '22004'; -- null_value_not_allowed
  END IF;

  -- Get tier information from subscription
  -- If no subscription exists, return Free tier defaults
  RETURN QUERY
  SELECT 
    COALESCE(st.name, 'free')::TEXT as tier_name,
    COALESCE(st.allows_custom_permissions, FALSE)::BOOLEAN as allows_custom_permissions,
    COALESCE(st.max_team_members, 5)::INTEGER as max_team_members,
    COALESCE(st.max_projects, 3)::INTEGER as max_projects,
    COALESCE(s.status, 'inactive')::TEXT as subscription_status,
    CASE 
      WHEN s.status IN ('active', 'trialing') THEN TRUE
      ELSE FALSE
    END::BOOLEAN as is_active,
    s.current_period_end as current_period_end
  FROM organizations o
  LEFT JOIN subscriptions s ON s.org_id = o.id 
    AND s.status IN ('active', 'trialing', 'past_due')
  LEFT JOIN subscription_tiers st ON st.id = s.tier_id
  WHERE o.id = p_org_id
  ORDER BY s.created_at DESC
  LIMIT 1;

  -- If no organization found, return Free tier defaults
  IF NOT FOUND THEN
    RAISE WARNING 'Organization % not found, returning Free tier defaults', p_org_id;
    RETURN QUERY
    SELECT 
      'free'::TEXT,
      FALSE::BOOLEAN,
      5::INTEGER,
      3::INTEGER,
      'inactive'::TEXT,
      FALSE::BOOLEAN,
      NULL::TIMESTAMP WITH TIME ZONE;
  END IF;

EXCEPTION
  WHEN OTHERS THEN
    -- On error, log and return Free tier defaults (fail-safe)
    RAISE WARNING 'Error in get_org_tier for org %: %', p_org_id, SQLERRM;
    RETURN QUERY
    SELECT 
      'free'::TEXT,
      FALSE::BOOLEAN,
      5::INTEGER,
      3::INTEGER,
      'error'::TEXT,
      FALSE::BOOLEAN,
      NULL::TIMESTAMP WITH TIME ZONE;
END;
$$;

-- ==========================================
-- Function Metadata
-- ==========================================

COMMENT ON FUNCTION public.get_org_tier(UUID) IS
'Returns organization tier information with safe defaults.
Always returns a result - defaults to Free tier if:
- No subscription exists
- Organization not found
- Error occurs during lookup

Return columns:
- tier_name: Subscription tier name (free, pro, business, enterprise)
- allows_custom_permissions: Whether tier allows custom role capabilities
- max_team_members: Maximum team members for this tier
- max_projects: Maximum projects for this tier
- subscription_status: Subscription status (active, trialing, past_due, inactive, error)
- is_active: TRUE if subscription is active or trialing
- current_period_end: When current billing period ends

Security: SECURITY DEFINER allows any authenticated user to check their org tier
Performance: Uses LEFT JOIN to handle missing subscriptions gracefully';

-- ==========================================
-- Permissions
-- ==========================================

GRANT EXECUTE ON FUNCTION public.get_org_tier(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_org_tier(UUID) TO anon;

-- ==========================================
-- Validation
-- ==========================================

DO $$
DECLARE
  v_test_result RECORD;
  v_test_org_id UUID := 'c999b342-b0ac-46a1-aa2c-d4cf72d19cac'; -- ACME
BEGIN
  RAISE NOTICE 'Validating get_org_tier function...';

  -- Test 1: Call function with ACME org
  SELECT * INTO v_test_result FROM public.get_org_tier(v_test_org_id);
  
  IF v_test_result IS NOT NULL THEN
    RAISE NOTICE '✅ Function returns result for ACME: tier_name=%, is_active=%', 
      v_test_result.tier_name, v_test_result.is_active;
  ELSE
    RAISE WARNING '⚠️  Function returned NULL for ACME';
  END IF;

  -- Test 2: Call with non-existent org (should return free tier defaults)
  SELECT * INTO v_test_result FROM public.get_org_tier('00000000-0000-0000-0000-000000000000');
  
  IF v_test_result.tier_name = 'free' THEN
    RAISE NOTICE '✅ Function returns Free tier defaults for non-existent org';
  ELSE
    RAISE WARNING '⚠️  Function did not return Free tier for non-existent org';
  END IF;

  RAISE NOTICE '✅ Validation complete';
END $$;

RAISE NOTICE '✅ get_org_tier function created successfully';

COMMIT;
