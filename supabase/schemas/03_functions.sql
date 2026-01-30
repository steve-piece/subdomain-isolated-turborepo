-- ============================================================================
-- 03_functions.sql - Additional Functions (Non-Trigger Functions)
-- Generated: 2026-01-22
-- ============================================================================
-- Note: Trigger functions used by table creation are already in 02_tables.sql
-- This file contains the remaining business logic and utility functions
-- ============================================================================

-- Function: bootstrap_organization
CREATE OR REPLACE FUNCTION public.bootstrap_organization(p_user_id uuid, p_subdomain text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_org_id uuid;
  v_company_name text;
  v_email text;
begin
  select id, company_name
  into v_org_id, v_company_name
  from public.organizations
  where owner_id = p_user_id
    and subdomain = lower(trim(p_subdomain))
    and is_active = false
  limit 1;

  if v_org_id is null then
    select id into v_org_id
    from public.organizations
    where owner_id = p_user_id
      and subdomain = lower(trim(p_subdomain))
      and is_active = true
    limit 1;
    return v_org_id;
  end if;

  update public.organizations
  set is_active = true,
      updated_at = now()
  where id = v_org_id;

  select email into v_email from auth.users where id = p_user_id;

  insert into public.user_profiles (user_id, org_id, email, full_name, role)
  values (
    p_user_id,
    v_org_id,
    coalesce(v_email, ''),
    (select coalesce(raw_user_meta_data->>'full_name','') from auth.users where id = p_user_id),
    'owner'
  )
  on conflict (user_id) do update
  set org_id = excluded.org_id,
      email = excluded.email,
      full_name = excluded.full_name,
      role = excluded.role;

  insert into public.tenants (id, subdomain, company_name)
  values (v_org_id, lower(trim(p_subdomain)), v_company_name)
  on conflict (id) do nothing;

  return v_org_id;
end;
$function$;

-- Function: check_usage_limit
CREATE OR REPLACE FUNCTION public.check_usage_limit(p_org_id uuid, p_metric_name text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_current_value INTEGER;
  v_limit_value INTEGER;
BEGIN
  SELECT current_value, limit_value
  INTO v_current_value, v_limit_value
  FROM public.usage_metrics
  WHERE org_id = p_org_id
    AND metric_name = p_metric_name
  ORDER BY created_at DESC
  LIMIT 1;

  -- NULL limit means unlimited
  IF v_limit_value IS NULL THEN
    RETURN true;
  END IF;

  RETURN COALESCE(v_current_value, 0) < v_limit_value;
END;
$function$;

-- Function: custom_claims_hook
CREATE OR REPLACE FUNCTION public.custom_claims_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  claims jsonb;
  user_role text;
  user_subdomain text;
  user_org_id text;
  user_company_name text;
  org_logo_url text;
  user_full_name text;
  user_profile_picture_url text;
  user_capabilities text[];
  v_user_id uuid;
BEGIN
  -- Input validation
  IF event IS NULL OR event->>'user_id' IS NULL THEN
    RAISE WARNING 'custom_claims_hook called with NULL event or user_id';
    RETURN event;
  END IF;

  v_user_id := (event->>'user_id')::uuid;
  claims := event->'claims';

  -- Get user profile and organization data
  SELECT
    up.role::text,
    up.org_id::text,
    up.full_name,
    up.profile_picture_url,
    o.subdomain,
    o.company_name,
    o.logo_url
  INTO
    user_role,
    user_org_id,
    user_full_name,
    user_profile_picture_url,
    user_subdomain,
    user_company_name,
    org_logo_url
  FROM public.user_profiles up
  LEFT JOIN public.organizations o ON o.id = up.org_id
  WHERE up.user_id = v_user_id
  LIMIT 1;

  -- Get user capabilities using new simplified function
  IF user_org_id IS NOT NULL AND user_role IS NOT NULL THEN
    user_capabilities := public.get_user_capabilities(
      v_user_id,
      user_org_id::uuid
    );
  END IF;

  -- Set claims
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

  IF user_full_name IS NOT NULL THEN
    claims := jsonb_set(claims, '{full_name}', to_jsonb(user_full_name));
  END IF;

  IF user_profile_picture_url IS NOT NULL THEN
    claims := jsonb_set(claims, '{profile_picture_url}', to_jsonb(user_profile_picture_url));
  END IF;

  IF user_capabilities IS NOT NULL AND array_length(user_capabilities, 1) > 0 THEN
    claims := jsonb_set(claims, '{capabilities}', to_jsonb(user_capabilities));
  ELSE
    -- Set empty array if no capabilities
    claims := jsonb_set(claims, '{capabilities}', '[]'::jsonb);
  END IF;

  -- Return updated event with enriched claims
  RETURN jsonb_set(event, '{claims}', claims);
EXCEPTION
  WHEN OTHERS THEN
    -- On error, log and return event unchanged (fail-safe)
    RAISE WARNING 'Error in custom_claims_hook for user %: %', v_user_id, SQLERRM;
    RETURN event;
END;
$function$;

-- Function: feature_increment_if_within_limit
CREATE OR REPLACE FUNCTION public.feature_increment_if_within_limit(p_org_id uuid, p_feature_key text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_limit integer;
  v_window_start timestamptz := date_trunc('month', now());
  v_current integer;
BEGIN
  SELECT fl.limit_per_period INTO v_limit
  FROM public.subscriptions s
  JOIN public.feature_limits fl ON fl.tier_id = s.tier_id AND fl.feature_key = p_feature_key
  WHERE s.org_id = p_org_id
    AND s.status IN ('active','trialing')
    AND now() >= s.period_start AND now() < s.period_end
  LIMIT 1;

  IF v_limit IS NULL AND NOT EXISTS (
    SELECT 1 FROM public.feature_limits fl2
    JOIN public.subscriptions s2 ON s2.tier_id = fl2.tier_id
    WHERE s2.org_id = p_org_id
      AND s2.status IN ('active','trialing')
      AND now() >= s2.period_start AND now() < s2.period_end
      AND fl2.feature_key = p_feature_key
  ) THEN
    RETURN jsonb_build_object('allowed', false, 'remaining', 0);
  END IF;

  INSERT INTO public.usage_counters (org_id, feature_key, window_start, count)
  VALUES (p_org_id, p_feature_key, v_window_start, 0)
  ON CONFLICT DO NOTHING;

  SELECT count INTO v_current
  FROM public.usage_counters
  WHERE org_id = p_org_id AND feature_key = p_feature_key AND window_start = v_window_start
  FOR UPDATE;

  IF v_limit IS NULL THEN
    UPDATE public.usage_counters
    SET count = v_current + 1, updated_at = now()
    WHERE org_id = p_org_id AND feature_key = p_feature_key AND window_start = v_window_start;
    RETURN jsonb_build_object('allowed', true, 'remaining', NULL);
  END IF;

  IF v_current + 1 <= v_limit THEN
    UPDATE public.usage_counters
    SET count = v_current + 1, updated_at = now()
    WHERE org_id = p_org_id AND feature_key = p_feature_key AND window_start = v_window_start;
    RETURN jsonb_build_object('allowed', true, 'remaining', GREATEST(v_limit - (v_current + 1), 0));
  ELSE
    RETURN jsonb_build_object('allowed', false, 'remaining', 0);
  END IF;
END;
$function$;

-- Function: force_logout_organization
CREATE OR REPLACE FUNCTION public.force_logout_organization(p_org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  affected_users integer;
  org_exists boolean;
BEGIN
  -- Input validation: Check if org exists
  SELECT EXISTS(SELECT 1 FROM public.organizations WHERE id = p_org_id)
  INTO org_exists;

  IF NOT org_exists THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Organization not found',
      'error_code', 'ORG_NOT_FOUND'
    );
  END IF;

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
    'force_logout_after', (SELECT force_logout_after FROM public.organizations WHERE id = p_org_id)
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'An error occurred while forcing logout',
      'error_code', 'INTERNAL_ERROR',
      'error_detail', SQLERRM
    );
END;
$function$;

-- Function: force_logout_users_by_role
CREATE OR REPLACE FUNCTION public.force_logout_users_by_role(p_org_id uuid, p_role user_role)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
$function$;

-- Function: get_org_logo_by_subdomain
CREATE OR REPLACE FUNCTION public.get_org_logo_by_subdomain(p_subdomain text)
RETURNS TABLE(logo_url text, company_name text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Validate input
  IF p_subdomain IS NULL OR trim(p_subdomain) = '' THEN
    RAISE NOTICE 'get_org_logo_by_subdomain: subdomain parameter is required';
    RETURN QUERY SELECT
      ''::text as logo_url,
      ''::text as company_name;
    RETURN;
  END IF;

  -- Log the request (helpful for debugging)
  RAISE NOTICE 'get_org_logo_by_subdomain: Fetching logo for subdomain: %', p_subdomain;

  -- Query the organizations table
  RETURN QUERY
  SELECT
    COALESCE(o.logo_url, '')::text as logo_url,
    COALESCE(o.company_name, '')::text as company_name
  FROM public.organizations o
  WHERE o.subdomain = lower(trim(p_subdomain))
  LIMIT 1;

  -- If no rows found, return empty strings
  IF NOT FOUND THEN
    RAISE NOTICE 'get_org_logo_by_subdomain: No organization found for subdomain: %', p_subdomain;
    RETURN QUERY SELECT
      ''::text as logo_url,
      ''::text as company_name;
  END IF;

  RETURN;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error and return empty result
    RAISE WARNING 'get_org_logo_by_subdomain: Error for subdomain %: %', p_subdomain, SQLERRM;
    RETURN QUERY SELECT
      ''::text as logo_url,
      ''::text as company_name;
    RETURN;
END;
$function$;

-- Function: get_org_subscription
CREATE OR REPLACE FUNCTION public.get_org_subscription(p_org_id uuid)
RETURNS TABLE(subscription_id uuid, tier_name text, status text, current_period_end timestamp with time zone, cancel_at_period_end boolean)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    st.name,
    s.status,
    s.current_period_end,
    s.cancel_at_period_end
  FROM public.subscriptions s
  LEFT JOIN public.subscription_tiers st ON s.tier_id = st.id
  WHERE s.org_id = p_org_id;
END;
$function$;

-- Function: get_org_subscription_status
CREATE OR REPLACE FUNCTION public.get_org_subscription_status(p_org_id uuid)
RETURNS TABLE(tier_name text, org_subdomain text, subscription_status text, is_active boolean, trial_end timestamp with time zone, current_period_start timestamp with time zone, current_period_end timestamp with time zone)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    st.name as tier_name,
    t.subdomain as org_subdomain,
    s.status as subscription_status,
    CASE
      WHEN s.status IN ('active', 'trialing') THEN true
      ELSE false
    END as is_active,
    s.trial_end,
    s.current_period_start,
    s.current_period_end
  FROM public.subscriptions s
  LEFT JOIN public.subscription_tiers st ON st.id = s.tier_id
  LEFT JOIN public.tenants t ON t.id = s.org_id
  WHERE s.org_id = p_org_id
  ORDER BY s.created_at DESC
  LIMIT 1;
$function$;

-- Function: get_org_team_settings
CREATE OR REPLACE FUNCTION public.get_org_team_settings(p_org_id uuid)
RETURNS TABLE(allow_member_invites boolean, require_admin_approval boolean, auto_assign_default_role user_role, max_team_size integer, allow_guest_access boolean, guest_link_expiry_days integer)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
$function$;

-- Function: get_org_tier
CREATE OR REPLACE FUNCTION public.get_org_tier(p_org_id uuid)
RETURNS TABLE(tier_name text, allows_custom_permissions boolean, max_team_members integer, max_projects integer, subscription_status text, is_active boolean, current_period_end timestamp with time zone)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
$function$;

-- Function: get_role_rank
CREATE OR REPLACE FUNCTION public.get_role_rank(p_role public.user_role)
RETURNS integer
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path TO ''
AS $function$
  SELECT CASE p_role
    WHEN 'view-only' THEN 0
    WHEN 'member' THEN 1
    WHEN 'admin' THEN 2
    WHEN 'superadmin' THEN 3
    WHEN 'owner' THEN 4
    ELSE -1
  END;
$function$;

-- Function: get_user_capabilities
CREATE OR REPLACE FUNCTION public.get_user_capabilities(p_user_id uuid, p_org_id uuid)
RETURNS text[]
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_role user_role;
  v_base_caps text[];
  v_final_caps text[];
BEGIN
  -- Input validation
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'p_user_id cannot be NULL'
      USING HINT = 'Provide a valid user UUID',
            ERRCODE = '22004';
  END IF;

  IF p_org_id IS NULL THEN
    RAISE EXCEPTION 'p_org_id cannot be NULL'
      USING HINT = 'Provide a valid organization UUID',
            ERRCODE = '22004';
  END IF;

  -- Get user's role in the organization
  SELECT role INTO v_user_role
  FROM public.user_profiles
  WHERE user_id = p_user_id AND org_id = p_org_id
  LIMIT 1;

  -- If user not found in org, return empty array
  IF v_user_role IS NULL THEN
    RETURN ARRAY[]::text[];
  END IF;

  -- Get base capabilities from role hierarchy
  SELECT ARRAY_AGG(key ORDER BY key)
  INTO v_base_caps
  FROM public.capabilities
  WHERE public.get_role_rank(min_role_required) <= public.get_role_rank(v_user_role);

  -- If no org-specific overrides exist, return base capabilities
  IF NOT EXISTS (
    SELECT 1 FROM public.org_role_capabilities
    WHERE org_id = p_org_id AND role = v_user_role
  ) THEN
    RETURN COALESCE(v_base_caps, ARRAY[]::text[]);
  END IF;

  -- Apply org-specific overrides (Business+ feature)
  WITH overrides AS (
    SELECT c.key, orc.granted
    FROM public.org_role_capabilities orc
    JOIN public.capabilities c ON c.id = orc.capability_id
    WHERE orc.org_id = p_org_id
      AND orc.role = v_user_role
  )
  SELECT ARRAY_AGG(DISTINCT cap ORDER BY cap)
  INTO v_final_caps
  FROM (
    -- Base capabilities not explicitly revoked
    SELECT UNNEST(v_base_caps) AS cap
    WHERE NOT EXISTS (
      SELECT 1 FROM overrides
      WHERE key = cap AND granted = false
    )
    UNION
    -- Granted overrides (may include capabilities above user's base role)
    SELECT key AS cap
    FROM overrides
    WHERE granted = true
  ) combined;

  RETURN COALESCE(v_final_caps, ARRAY[]::text[]);
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in get_user_capabilities for user % in org %: %',
      p_user_id, p_org_id, SQLERRM;
    RETURN ARRAY[]::text[];
END;
$function$;

-- Function: get_user_context
CREATE OR REPLACE FUNCTION public.get_user_context(p_user_id uuid, p_org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb := '{}'::jsonb;
  profile_data jsonb;
  team_settings jsonb;
  subscription_data jsonb;
BEGIN
  -- Input validation
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'error', 'user_id is required',
      'error_code', 'INVALID_INPUT'
    );
  END IF;

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
      'trial_end', s.trial_end,
      'current_period_start', s.current_period_start,
      'current_period_end', s.current_period_end
    ) INTO subscription_data
    FROM public.subscriptions s
    LEFT JOIN public.subscription_tiers st ON st.id = s.tier_id
    LEFT JOIN public.tenants t ON t.id = s.org_id
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
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'error', 'An error occurred while fetching user context',
      'error_code', 'INTERNAL_ERROR',
      'error_detail', SQLERRM
    );
END;
$function$;

-- Function: get_user_profile_data
CREATE OR REPLACE FUNCTION public.get_user_profile_data(p_user_id uuid)
RETURNS TABLE(full_name text, bio text, timezone text, language text, profile_picture_url text, phone_number text, last_active_at timestamp with time zone)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
$function$;

-- Function: has_min_role
CREATE OR REPLACE FUNCTION public.has_min_role(p_user_role public.user_role, p_required_role public.user_role)
RETURNS boolean
LANGUAGE sql
IMMUTABLE PARALLEL SAFE
SET search_path TO ''
AS $function$
  SELECT public.get_role_rank(p_user_role) >= public.get_role_rank(p_required_role);
$function$;

-- Function: increment_usage
CREATE OR REPLACE FUNCTION public.increment_usage(p_org_id uuid, p_metric_name text, p_increment integer DEFAULT 1)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_within_limit BOOLEAN;
BEGIN
  -- Check if within limit
  v_within_limit := check_usage_limit(p_org_id, p_metric_name);

  IF NOT v_within_limit THEN
    RETURN false;
  END IF;

  -- Increment the usage
  UPDATE public.usage_metrics
  SET current_value = current_value + p_increment,
      updated_at = now()
  WHERE org_id = p_org_id
    AND metric_name = p_metric_name;

  RETURN true;
END;
$function$;

-- Function: log_security_event
CREATE OR REPLACE FUNCTION public.log_security_event(p_user_id uuid, p_org_id uuid, p_event_type text, p_event_action text, p_severity text DEFAULT 'info'::text, p_metadata jsonb DEFAULT '{}'::jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $function$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO public.security_audit_log (
    user_id, org_id, event_type, event_action, severity, event_metadata
  )
  VALUES (
    p_user_id, p_org_id, p_event_type, p_event_action, p_severity, p_metadata
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$function$;

-- Function: should_force_logout
CREATE OR REPLACE FUNCTION public.should_force_logout(p_user_id uuid, p_org_id uuid, p_jwt_issued_at timestamp with time zone)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  org_logout_after timestamptz;
  user_logout_after timestamptz;
  permissions_updated timestamptz;
  should_logout boolean := false;
  reason text := '';
BEGIN
  -- Input validation
  IF p_user_id IS NULL OR p_org_id IS NULL OR p_jwt_issued_at IS NULL THEN
    RETURN jsonb_build_object(
      'should_logout', false,
      'reason', 'Invalid input parameters',
      'error_code', 'INVALID_INPUT'
    );
  END IF;

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
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'should_logout', false,
      'reason', 'Error checking force logout status',
      'error_code', 'INTERNAL_ERROR',
      'error_detail', SQLERRM
    );
END;
$function$;

-- Function: update_permissions_timestamp
CREATE OR REPLACE FUNCTION public.update_permissions_timestamp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  target_org_id uuid;
BEGIN
  -- Handle INSERT/UPDATE (use NEW) or DELETE (use OLD)
  IF TG_OP = 'DELETE' THEN
    target_org_id := OLD.org_id;
  ELSE
    target_org_id := NEW.org_id;
  END IF;

  -- Validate org_id exists
  IF target_org_id IS NULL THEN
    RAISE WARNING 'update_permissions_timestamp: org_id is NULL, skipping update';
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Update the organization's permissions_updated_at timestamp
  UPDATE public.organizations
  SET permissions_updated_at = now()
  WHERE id = target_org_id;

  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Function: user_can_edit_org_settings
CREATE OR REPLACE FUNCTION public.user_can_edit_org_settings(p_user_id uuid, p_org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $function$
BEGIN
  RETURN user_org_capability(p_user_id, p_org_id, 'org.settings.edit');
END;
$function$;

-- Function: user_can_view_org_audit
CREATE OR REPLACE FUNCTION public.user_can_view_org_audit(p_user_id uuid, p_org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $function$
BEGIN
  RETURN user_org_capability(p_user_id, p_org_id, 'security.view_org_audit');
END;
$function$;

-- Function: user_org_access
CREATE OR REPLACE FUNCTION public.user_org_access(p_user_id uuid, p_org_id uuid, p_required_roles user_role[] DEFAULT NULL::user_role[])
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $function$
DECLARE
  v_user_role user_role;
BEGIN
  -- Get user's role in the organization
  SELECT role INTO v_user_role
  FROM public.user_profiles
  WHERE user_id = p_user_id AND org_id = p_org_id;

  -- Not a member
  IF v_user_role IS NULL THEN
    RETURN false;
  END IF;

  -- If no specific roles required, just being a member is enough
  IF p_required_roles IS NULL THEN
    RETURN true;
  END IF;

  -- Check if user has required role
  RETURN v_user_role = ANY(p_required_roles);
END;
$function$;

-- Function: user_org_capability
CREATE OR REPLACE FUNCTION public.user_org_capability(p_user_id uuid, p_org_id uuid, p_capability_key text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $function$
DECLARE
  v_user_role user_role;
  v_capability_id UUID;
  v_has_capability BOOLEAN := false;
  v_custom_override BOOLEAN;
BEGIN
  -- Get user's role in the organization
  SELECT role INTO v_user_role
  FROM public.user_profiles
  WHERE user_id = p_user_id AND org_id = p_org_id;

  IF v_user_role IS NULL THEN
    RETURN false;
  END IF;

  -- Get capability ID
  SELECT id INTO v_capability_id
  FROM public.capabilities
  WHERE key = p_capability_key;

  IF v_capability_id IS NULL THEN
    RETURN false;
  END IF;

  -- Check for custom org override first
  SELECT granted INTO v_custom_override
  FROM public.org_role_capabilities
  WHERE org_id = p_org_id
    AND role = v_user_role
    AND capability_id = v_capability_id;

  IF v_custom_override IS NOT NULL THEN
    RETURN v_custom_override;
  END IF;

  -- Fall back to default role capabilities
  SELECT is_default INTO v_has_capability
  FROM public.role_capabilities
  WHERE role = v_user_role
    AND capability_id = v_capability_id;

  RETURN COALESCE(v_has_capability, false);
END;
$function$;

-- Function: user_project_access
CREATE OR REPLACE FUNCTION public.user_project_access(p_user_id uuid, p_project_id uuid, p_required_permission project_permission_level DEFAULT 'read'::project_permission_level)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $function$
DECLARE
  v_org_id UUID;
  v_user_role user_role;
  v_project_owner UUID;
  v_user_permission project_permission_level;
  v_permission_hierarchy TEXT[] := ARRAY['read', 'write', 'admin'];
BEGIN
  -- Input validation
  IF p_user_id IS NULL OR p_project_id IS NULL THEN
    RETURN false;
  END IF;

  -- Get project org and owner
  SELECT org_id, owner_id INTO v_org_id, v_project_owner
  FROM public.projects
  WHERE id = p_project_id;

  IF v_org_id IS NULL THEN
    RETURN false;
  END IF;

  -- Get user's org-level role
  SELECT role INTO v_user_role
  FROM public.user_profiles
  WHERE user_id = p_user_id AND org_id = v_org_id;

  IF v_user_role IS NULL THEN
    RETURN false;
  END IF;

  -- Owners and superadmins have full access to all projects
  IF v_user_role IN ('owner', 'superadmin') THEN
    RETURN true;
  END IF;

  -- Project owner has full access
  IF p_user_id = v_project_owner THEN
    RETURN true;
  END IF;

  -- Check explicit project permission
  SELECT permission_level INTO v_user_permission
  FROM public.project_permissions
  WHERE project_id = p_project_id AND user_id = p_user_id;

  IF v_user_permission IS NULL THEN
    RETURN false;
  END IF;

  -- Check if user's permission meets or exceeds required level
  RETURN array_position(v_permission_hierarchy, v_user_permission::TEXT) >=
         array_position(v_permission_hierarchy, p_required_permission::TEXT);
EXCEPTION
  WHEN OTHERS THEN
    -- Log error and return false for safety
    RAISE WARNING 'user_project_access error: % %', SQLERRM, SQLSTATE;
    RETURN false;
END;
$function$;

-- Function: activate_reservation
-- Converts a subdomain reservation into an active organization after email confirmation
CREATE OR REPLACE FUNCTION public.activate_reservation(p_user_id uuid, p_subdomain text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_reservation subdomain_reservations%ROWTYPE;
  v_org_id uuid;
  v_email text;
BEGIN
  -- Get reservation
  SELECT * INTO v_reservation
  FROM subdomain_reservations
  WHERE user_id = p_user_id
    AND subdomain = lower(trim(p_subdomain))
    AND expires_at > now()
    AND confirmed_at IS NULL;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reservation not found or expired for subdomain: %', p_subdomain;
  END IF;
  
  -- Get user email
  SELECT email INTO v_email FROM auth.users WHERE id = p_user_id;
  
  -- Create organization (is_active = true by default for confirmed signups)
  INSERT INTO organizations (company_name, subdomain, owner_id, is_active)
  VALUES (v_reservation.organization_name, v_reservation.subdomain, p_user_id, true)
  RETURNING id INTO v_org_id;
  
  -- Create user profile
  INSERT INTO user_profiles (user_id, org_id, email, full_name, role)
  VALUES (
    p_user_id,
    v_org_id,
    COALESCE(v_email, v_reservation.email),
    (SELECT COALESCE(raw_user_meta_data->>'full_name', '') FROM auth.users WHERE id = p_user_id),
    'owner'
  )
  ON CONFLICT (user_id) DO UPDATE
  SET org_id = EXCLUDED.org_id,
      email = EXCLUDED.email,
      full_name = EXCLUDED.full_name,
      role = EXCLUDED.role;
  
  -- Create tenant entry
  INSERT INTO tenants (id, subdomain, company_name)
  VALUES (v_org_id, v_reservation.subdomain, v_reservation.organization_name)
  ON CONFLICT (id) DO NOTHING;
  
  -- Mark reservation as confirmed
  UPDATE subdomain_reservations
  SET confirmed_at = now()
  WHERE id = v_reservation.id;
  
  RETURN v_org_id;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'activate_reservation error for user % subdomain %: %', p_user_id, p_subdomain, SQLERRM;
    RAISE;
END;
$function$;

-- Function: cleanup_expired_reservations
-- Removes expired subdomain reservations that were never confirmed
CREATE OR REPLACE FUNCTION public.cleanup_expired_reservations()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_deleted_count integer;
BEGIN
  -- Delete expired reservations that were never confirmed
  DELETE FROM subdomain_reservations
  WHERE expires_at < now()
    AND confirmed_at IS NULL;
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RAISE NOTICE 'Cleaned up % expired subdomain reservations', v_deleted_count;
  
  RETURN v_deleted_count;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'cleanup_expired_reservations error: %', SQLERRM;
    RETURN 0;
END;
$function$;
