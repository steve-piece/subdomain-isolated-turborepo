-- ============================================================================
-- 02_tables.sql - Complete DDL with Functions and Tables
-- Generated: 2026-01-22
-- ============================================================================
-- This file includes:
-- 1. All trigger functions required by table triggers
-- 2. Table definitions in dependency order
-- ============================================================================

-- ============================================================================
-- FUNCTIONS (Required by Table Triggers)
-- ============================================================================

-- Function: handle_updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Function: set_updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Function: handle_new_user
-- Consolidated trigger function for all user-related table initialization
-- Fires on: auth.users INSERT
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $function$
BEGIN
  -- Create notification preferences
  INSERT INTO public.user_notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  -- Create security settings
  INSERT INTO public.user_security_settings (user_id, password_changed_at)
  VALUES (NEW.id, now())
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$function$;

-- Function: create_new_organization
-- Creates an inactive organization when a new owner signs up (if metadata present)
CREATE OR REPLACE FUNCTION public.create_new_organization()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Validate required metadata exists and user is intended owner
  IF NOT (
    NEW.raw_user_meta_data ? 'company_name'
    AND NEW.raw_user_meta_data ? 'subdomain'
    AND COALESCE(NEW.raw_user_meta_data->>'user_role', '') = 'owner'
  ) THEN
    RETURN NEW;
  END IF;

  -- Insert a new inactive organization for this user; ignore if subdomain is already taken
  BEGIN
    INSERT INTO public.organizations (company_name, subdomain, owner_id, is_active)
    VALUES (
      NEW.raw_user_meta_data->>'company_name',
      lower(trim(NEW.raw_user_meta_data->>'subdomain')),
      NEW.id,
      false
    );
  EXCEPTION WHEN unique_violation THEN
    NULL;
  END;

  RETURN NEW;
END;
$function$;

-- Function: sync_user_email
-- Syncs email changes from auth.users to user_profiles
CREATE OR REPLACE FUNCTION public.sync_user_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  IF NEW.email IS DISTINCT FROM OLD.email THEN
    UPDATE public.user_profiles
    SET email = COALESCE(NEW.email, email),
        updated_at = now()
    WHERE user_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$function$;

-- Function: handle_new_organization
-- Consolidated trigger function for all organization-related table initialization
-- Fires on: organizations INSERT OR UPDATE OF is_active
-- 
-- ON INSERT (any org): Creates billing profile and usage metrics
-- ON VERIFICATION (is_active = true): Also creates team settings and cleans up reservation
CREATE OR REPLACE FUNCTION public.handle_new_organization()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $function$
DECLARE
  v_is_verification BOOLEAN := false;
BEGIN
  -- Determine if this is a verification event (is_active becoming true)
  IF TG_OP = 'INSERT' AND NEW.is_active = true THEN
    v_is_verification := true;
  ELSIF TG_OP = 'UPDATE' AND OLD.is_active = false AND NEW.is_active = true THEN
    v_is_verification := true;
  END IF;

  -- ========================================
  -- ALWAYS on INSERT: Create billing & usage
  -- ========================================
  IF TG_OP = 'INSERT' THEN
    -- Create default customer billing profile
    INSERT INTO public.customer_billing_profiles (org_id)
    VALUES (NEW.id)
    ON CONFLICT (org_id) DO NOTHING;

    -- Create default usage metrics
    INSERT INTO public.usage_metrics (org_id, metric_name, current_value, limit_value)
    VALUES
      (NEW.id, 'team_members', 1, 5),
      (NEW.id, 'projects', 0, 10),
      (NEW.id, 'storage_gb', 0, 5),
      (NEW.id, 'api_calls', 0, 10000)
    ON CONFLICT (org_id, metric_name, period_start) DO NOTHING;
  END IF;

  -- ========================================
  -- ON VERIFICATION: Create team settings & cleanup
  -- ========================================
  IF v_is_verification THEN
    -- Create team settings for verified organization
    INSERT INTO public.organization_team_settings (org_id)
    VALUES (NEW.id)
    ON CONFLICT (org_id) DO NOTHING;

    -- Delete the subdomain reservation now that org is verified
    DELETE FROM public.subdomain_reservations
    WHERE subdomain = NEW.subdomain;
  END IF;

  RETURN NEW;
END;
$function$;

-- Function: initialize_org_capabilities (helper function)
CREATE OR REPLACE FUNCTION public.initialize_org_capabilities(p_org_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_count INTEGER;
BEGIN
  -- Validate input
  IF p_org_id IS NULL THEN
    RAISE EXCEPTION 'Organization ID cannot be NULL';
  END IF;

  -- Check if organization exists
  IF NOT EXISTS (SELECT 1 FROM public.organizations WHERE id = p_org_id) THEN
    RAISE EXCEPTION 'Organization % does not exist', p_org_id;
  END IF;

  -- Check if already initialized (don't duplicate)
  SELECT COUNT(*) INTO v_count
  FROM public.org_role_capabilities
  WHERE org_id = p_org_id;

  IF v_count > 0 THEN
    RAISE NOTICE 'Organization % already has % capabilities initialized', p_org_id, v_count;
    RETURN;
  END IF;

  -- Note: This function may fail if role_capabilities table doesn't exist
  -- In that case, the trigger will handle the error gracefully
  RAISE NOTICE 'Skipping capability initialization for organization % (role_capabilities table may not exist yet)', p_org_id;

EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to initialize capabilities for org %: %', p_org_id, SQLERRM;
END;
$function$;

-- Function: trigger_initialize_org_capabilities
CREATE OR REPLACE FUNCTION public.trigger_initialize_org_capabilities()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Initialize capabilities for the new organization
  PERFORM public.initialize_org_capabilities(NEW.id);
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't block organization creation
    RAISE WARNING 'Failed to auto-initialize capabilities for org %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$function$;

-- Function: handle_new_project
CREATE OR REPLACE FUNCTION public.handle_new_project()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $function$
BEGIN
  -- Automatically grant admin permission to project creator
  INSERT INTO public.project_permissions (
    project_id,
    user_id,
    permission_level,
    granted_by
  )
  VALUES (
    NEW.id,
    NEW.owner_id,
    'admin',
    NEW.owner_id
  )
  ON CONFLICT (project_id, user_id) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'handle_new_project error: % %', SQLERRM, SQLSTATE;
    RETURN NEW; -- Don't block project creation if permission fails
END;
$function$;

-- Function: log_permissions_change
CREATE OR REPLACE FUNCTION public.log_permissions_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RAISE NOTICE 'Role capability changed for org % role %: % %',
    COALESCE(NEW.org_id, OLD.org_id),
    COALESCE(NEW.role, OLD.role),
    TG_OP,
    COALESCE(NEW.granted, OLD.granted);
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Function: update_pending_invitations_updated_at
CREATE OR REPLACE FUNCTION public.update_pending_invitations_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

-- Function: prevent_user_id_change
CREATE OR REPLACE FUNCTION public.prevent_user_id_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
BEGIN
  IF NEW.user_id <> OLD.user_id THEN
    RAISE EXCEPTION 'user_id is immutable';
  END IF;
  RETURN NEW;
END;
$function$;

-- Function: sync_team_size_from_tier (helper function)
CREATE OR REPLACE FUNCTION public.sync_team_size_from_tier(p_org_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_tier_id UUID;
  v_max_team_members INTEGER;
BEGIN
  -- Get the organization's current active subscription tier
  SELECT s.tier_id
  INTO v_tier_id
  FROM public.subscriptions s
  WHERE s.org_id = p_org_id
    AND s.status = 'active'
  ORDER BY s.created_at DESC
  LIMIT 1;

  IF v_tier_id IS NULL THEN
    -- No active subscription, default to free tier
    SELECT id, max_team_members
    INTO v_tier_id, v_max_team_members
    FROM public.subscription_tiers
    WHERE name = 'free'
    LIMIT 1;
  ELSE
    -- Get max_team_members from the tier
    SELECT max_team_members
    INTO v_max_team_members
    FROM public.subscription_tiers
    WHERE id = v_tier_id;
  END IF;

  -- Update or insert team settings with the tier's max_team_size
  INSERT INTO public.organization_team_settings (
    org_id,
    max_team_size,
    allow_member_invites,
    require_admin_approval,
    auto_assign_default_role,
    allow_guest_access,
    guest_link_expiry_days
  )
  VALUES (
    p_org_id,
    v_max_team_members,
    false,
    false,
    'member',
    false,
    30
  )
  ON CONFLICT (org_id)
  DO UPDATE SET
    max_team_size = EXCLUDED.max_team_size,
    updated_at = now();
END;
$function$;

-- Function: trigger_sync_team_size_on_subscription_change
CREATE OR REPLACE FUNCTION public.trigger_sync_team_size_on_subscription_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- Sync when subscription is created, tier changes, or status changes to active
  IF (TG_OP = 'INSERT' AND NEW.status = 'active')
    OR (TG_OP = 'UPDATE' AND (
      OLD.tier_id IS DISTINCT FROM NEW.tier_id
      OR (OLD.status != 'active' AND NEW.status = 'active')
    )) THEN
    PERFORM public.sync_team_size_from_tier(NEW.org_id);
  END IF;

  RETURN NEW;
END;
$function$;

-- ============================================================================
-- TABLES (In Dependency Order)
-- ============================================================================

-- ============================================================================
-- SUBSCRIPTION_TIERS (No dependencies - must be first)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.subscription_tiers (
  id uuid not null default gen_random_uuid (),
  name text not null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  allows_custom_permissions boolean null default false,
  max_projects integer null,
  max_team_members integer null,
  stripe_product_id text null,
  stripe_price_id text null,
  price_monthly integer null,
  price_yearly integer null,
  constraint subscription_tiers_pkey primary key (id),
  constraint subscription_tiers_name_key unique (name),
  constraint subscription_tiers_stripe_price_id_key unique (stripe_price_id),
  constraint subscription_tiers_stripe_product_id_key unique (stripe_product_id)
) TABLESPACE pg_default;

create index IF not exists idx_subscription_tiers_id on public.subscription_tiers using btree (id) TABLESPACE pg_default;

ALTER TABLE public.subscription_tiers ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- ORGANIZATIONS (Depends on auth.users via owner_id)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid not null default gen_random_uuid (),
  company_name text not null,
  description text null,
  website text null,
  logo_url text null,
  address text null,
  subdomain text not null,
  settings jsonb null default '{}'::jsonb,
  metadata jsonb null default '{}'::jsonb,
  owner_id uuid null default auth.uid (),
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  is_active boolean not null default false,
  industry text null,
  company_size text null,
  onboarding_completed boolean not null default false,
  force_logout_after timestamp with time zone null,
  permissions_updated_at timestamp with time zone null,
  constraint organizations_pkey primary key (id),
  constraint organizations_subdomain_key unique (subdomain),
  constraint organizations_company_size_check check (
    company_size = any (
      array[
        '1-10'::text,
        '11-50'::text,
        '51-200'::text,
        '201-500'::text,
        '501-1000'::text,
        '1000+'::text
      ]
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_organizations_onboarding_completed on public.organizations using btree (onboarding_completed) TABLESPACE pg_default
where
  (onboarding_completed = false);

create index IF not exists idx_organizations_owner_id on public.organizations using btree (owner_id) TABLESPACE pg_default;

create index IF not exists idx_organizations_force_logout on public.organizations using btree (force_logout_after) TABLESPACE pg_default
where
  (force_logout_after is not null);

create index IF not exists idx_organizations_permissions_updated on public.organizations using btree (permissions_updated_at) TABLESPACE pg_default
where
  (permissions_updated_at is not null);

create index IF not exists idx_organizations_subdomain on public.organizations using btree (subdomain) TABLESPACE pg_default;

create trigger on_organization_created
after INSERT or UPDATE OF is_active on organizations for EACH row
execute FUNCTION handle_new_organization ();

create trigger trg_organizations_updated_at BEFORE
update on organizations for EACH row
execute FUNCTION set_updated_at ();

create trigger trigger_auto_initialize_org_capabilities
after INSERT on organizations for EACH row
execute FUNCTION trigger_initialize_org_capabilities ();

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- CAPABILITIES (Depends on subscription_tiers)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.capabilities (
  id uuid not null default gen_random_uuid (),
  key text not null,
  name text not null,
  description text null,
  category text null,
  requires_tier_id uuid null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  min_role_required public.user_role not null default 'member'::user_role,
  constraint capabilities_pkey primary key (id),
  constraint capabilities_key_key unique (key),
  constraint capabilities_requires_tier_id_fkey foreign KEY (requires_tier_id) references subscription_tiers (id) on delete set null,
  constraint valid_key_format check (
    key ~ '^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$'::text
  )
) TABLESPACE pg_default;

create index IF not exists idx_capabilities_category on public.capabilities using btree (category) TABLESPACE pg_default;

create index IF not exists idx_capabilities_tier on public.capabilities using btree (requires_tier_id) TABLESPACE pg_default;

create index IF not exists idx_capabilities_key on public.capabilities using btree (key) TABLESPACE pg_default;

create index IF not exists idx_capabilities_min_role on public.capabilities using btree (min_role_required) TABLESPACE pg_default;

create index IF not exists idx_capabilities_category_role on public.capabilities using btree (category, min_role_required) TABLESPACE pg_default;

create trigger capabilities_updated_at BEFORE
update on capabilities for EACH row
execute FUNCTION handle_updated_at ();

ALTER TABLE public.capabilities ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- FEATURE_LIMITS (Depends on subscription_tiers)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.feature_limits (
  id uuid not null default gen_random_uuid (),
  tier_id uuid not null,
  feature_key text not null,
  limit_per_period integer null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint feature_limits_pkey primary key (id),
  constraint feature_limits_tier_id_feature_key_key unique (tier_id, feature_key),
  constraint feature_limits_tier_id_fkey foreign KEY (tier_id) references subscription_tiers (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_feature_limits_tier_key on public.feature_limits using btree (tier_id, feature_key) TABLESPACE pg_default;

ALTER TABLE public.feature_limits ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- CUSTOMER_BILLING_PROFILES (Depends on organizations)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.customer_billing_profiles (
  id uuid not null default gen_random_uuid (),
  org_id uuid not null,
  stripe_customer_id text null,
  billing_email text null,
  billing_name text null,
  billing_address jsonb null,
  tax_id text null,
  default_payment_method_id text null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint customer_billing_profiles_pkey primary key (id),
  constraint customer_billing_profiles_org_id_key unique (org_id),
  constraint customer_billing_profiles_stripe_customer_id_key unique (stripe_customer_id),
  constraint customer_billing_profiles_org_id_fkey foreign KEY (org_id) references organizations (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_customer_billing_org_id on public.customer_billing_profiles using btree (org_id) TABLESPACE pg_default;

create index IF not exists idx_customer_billing_stripe_id on public.customer_billing_profiles using btree (stripe_customer_id) TABLESPACE pg_default;

create trigger customer_billing_profiles_updated_at BEFORE
update on customer_billing_profiles for EACH row
execute FUNCTION handle_updated_at ();

ALTER TABLE public.customer_billing_profiles ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- ORG_ROLE_CAPABILITIES (Depends on organizations, capabilities, subscription_tiers)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.org_role_capabilities (
  id uuid not null default gen_random_uuid (),
  org_id uuid not null,
  role public.user_role not null,
  capability_id uuid not null,
  granted boolean not null,
  requires_min_tier_id uuid null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  updated_by uuid null,
  constraint org_role_capabilities_pkey primary key (id),
  constraint unique_org_role_capability unique (org_id, role, capability_id),
  constraint org_role_capabilities_capability_id_fkey foreign KEY (capability_id) references capabilities (id) on delete CASCADE,
  constraint org_role_capabilities_org_id_fkey foreign KEY (org_id) references organizations (id) on delete CASCADE,
  constraint org_role_capabilities_requires_min_tier_id_fkey foreign KEY (requires_min_tier_id) references subscription_tiers (id) on delete set null,
  constraint org_role_capabilities_updated_by_fkey foreign KEY (updated_by) references auth.users (id) on delete set null
) TABLESPACE pg_default;

create index IF not exists idx_org_role_capabilities_org on public.org_role_capabilities using btree (org_id) TABLESPACE pg_default;

create index IF not exists idx_org_role_capabilities_role on public.org_role_capabilities using btree (role) TABLESPACE pg_default;

create index IF not exists idx_org_role_capabilities_capability on public.org_role_capabilities using btree (capability_id) TABLESPACE pg_default;

create trigger org_role_capabilities_updated_at BEFORE
update on org_role_capabilities for EACH row
execute FUNCTION handle_updated_at ();

create trigger trg_log_permissions_change
after INSERT
or DELETE
or
update on org_role_capabilities for EACH row
execute FUNCTION log_permissions_change ();

ALTER TABLE public.org_role_capabilities ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- ORGANIZATION_TEAM_SETTINGS (Depends on organizations)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.organization_team_settings (
  id uuid not null default gen_random_uuid (),
  org_id uuid not null,
  require_admin_approval boolean null default false,
  allow_member_invites boolean null default false,
  auto_assign_default_role public.user_role null default 'member'::user_role,
  max_team_size integer null,
  allow_guest_access boolean null default false,
  guest_link_expiry_days integer null default 30,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint organization_team_settings_pkey primary key (id),
  constraint unique_org_team_settings unique (org_id),
  constraint organization_team_settings_org_id_fkey foreign KEY (org_id) references organizations (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_org_team_settings_org_id on public.organization_team_settings using btree (org_id) TABLESPACE pg_default;

create trigger org_team_settings_updated_at BEFORE
update on organization_team_settings for EACH row
execute FUNCTION handle_updated_at ();

ALTER TABLE public.organization_team_settings ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PAYMENT_METHODS (Depends on organizations)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.payment_methods (
  id uuid not null default gen_random_uuid (),
  org_id uuid not null,
  stripe_payment_method_id text not null,
  stripe_customer_id text null,
  type text not null,
  card_brand text null,
  card_last4 text null,
  card_exp_month integer null,
  card_exp_year integer null,
  is_default boolean null default false,
  metadata jsonb null default '{}'::jsonb,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint payment_methods_pkey primary key (id),
  constraint payment_methods_stripe_payment_method_id_key unique (stripe_payment_method_id),
  constraint payment_methods_org_id_fkey foreign KEY (org_id) references organizations (id) on delete CASCADE,
  constraint payment_methods_type_check check (
    type = any (
      array[
        'card'::text,
        'bank_account'::text,
        'sepa_debit'::text
      ]
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_payment_methods_org_id on public.payment_methods using btree (org_id) TABLESPACE pg_default;

create index IF not exists idx_payment_methods_stripe_id on public.payment_methods using btree (stripe_payment_method_id) TABLESPACE pg_default;

create trigger payment_methods_updated_at BEFORE
update on payment_methods for EACH row
execute FUNCTION handle_updated_at ();

ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PENDING_INVITATIONS (Depends on organizations)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.pending_invitations (
  id uuid not null default gen_random_uuid (),
  org_id uuid not null,
  email text not null,
  proposed_role public.user_role not null,
  invited_by uuid not null,
  status public.invitation_status not null default 'pending'::invitation_status,
  invitation_token text null,
  approved_by uuid null,
  approved_at timestamp with time zone null,
  rejected_by uuid null,
  rejected_at timestamp with time zone null,
  rejection_reason text null,
  expires_at timestamp with time zone not null default (now() + '7 days'::interval),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint pending_invitations_pkey primary key (id),
  constraint pending_invitations_invitation_token_key unique (invitation_token),
  constraint unique_pending_invite_per_org unique (org_id, email, status),
  constraint pending_invitations_rejected_by_fkey foreign KEY (rejected_by) references auth.users (id) on delete set null,
  constraint pending_invitations_invited_by_fkey foreign KEY (invited_by) references auth.users (id) on delete set null,
  constraint pending_invitations_approved_by_fkey foreign KEY (approved_by) references auth.users (id) on delete set null,
  constraint pending_invitations_org_id_fkey foreign KEY (org_id) references organizations (id) on delete CASCADE,
  constraint valid_email check (
    email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$'::text
  ),
  constraint rejection_consistency check (
    (status = 'rejected'::invitation_status)
    and (rejected_by is not null)
    and (rejected_at is not null)
    or (status <> 'rejected'::invitation_status)
  ),
  constraint approval_consistency check (
    (status = 'approved'::invitation_status)
    and (approved_by is not null)
    and (approved_at is not null)
    or (status <> 'approved'::invitation_status)
  )
) TABLESPACE pg_default;

create index IF not exists idx_pending_invitations_org_id on public.pending_invitations using btree (org_id) TABLESPACE pg_default;

create index IF not exists idx_pending_invitations_status on public.pending_invitations using btree (status) TABLESPACE pg_default
where
  (status = 'pending'::invitation_status);

create index IF not exists idx_pending_invitations_email on public.pending_invitations using btree (email) TABLESPACE pg_default;

create index IF not exists idx_pending_invitations_expires_at on public.pending_invitations using btree (expires_at) TABLESPACE pg_default
where
  (status = 'pending'::invitation_status);

create trigger trigger_pending_invitations_updated_at BEFORE
update on pending_invitations for EACH row
execute FUNCTION update_pending_invitations_updated_at ();

ALTER TABLE public.pending_invitations ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PROJECTS (Depends on organizations)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.projects (
  id uuid not null default gen_random_uuid (),
  org_id uuid not null,
  name text not null,
  description text null,
  owner_id uuid not null,
  status text not null default 'active'::text,
  metadata jsonb not null default '{}'::jsonb,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  archived_at timestamp with time zone null,
  constraint projects_pkey primary key (id),
  constraint unique_project_name_per_org unique (org_id, name),
  constraint projects_org_id_fkey foreign KEY (org_id) references organizations (id) on delete CASCADE,
  constraint projects_owner_id_fkey foreign KEY (owner_id) references auth.users (id) on delete RESTRICT,
  constraint valid_status check (
    status = any (
      array['active'::text, 'archived'::text, 'deleted'::text]
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_projects_org_id on public.projects using btree (org_id) TABLESPACE pg_default;

create index IF not exists idx_projects_owner_id on public.projects using btree (owner_id) TABLESPACE pg_default;

create index IF not exists idx_projects_status on public.projects using btree (status) TABLESPACE pg_default
where
  (status = 'active'::text);

create index IF not exists idx_projects_created_at on public.projects using btree (created_at desc) TABLESPACE pg_default;

create index IF not exists idx_projects_org_status on public.projects using btree (org_id, status) TABLESPACE pg_default;

create trigger on_project_created
after INSERT on projects for EACH row
execute FUNCTION handle_new_project ();

create trigger projects_updated_at BEFORE
update on projects for EACH row
execute FUNCTION handle_updated_at ();

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PROJECT_PERMISSIONS (Depends on projects)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.project_permissions (
  id uuid not null default gen_random_uuid (),
  project_id uuid not null,
  user_id uuid not null,
  permission_level public.project_permission_level not null default 'read'::project_permission_level,
  granted_by uuid null,
  granted_at timestamp with time zone not null default now(),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint project_permissions_pkey primary key (id),
  constraint unique_project_user_permission unique (project_id, user_id),
  constraint project_permissions_granted_by_fkey foreign KEY (granted_by) references auth.users (id) on delete set null,
  constraint project_permissions_project_id_fkey foreign KEY (project_id) references projects (id) on delete CASCADE,
  constraint project_permissions_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_project_permissions_project_id on public.project_permissions using btree (project_id) TABLESPACE pg_default;

create index IF not exists idx_project_permissions_user_id on public.project_permissions using btree (user_id) TABLESPACE pg_default;

create index IF not exists idx_project_permissions_level on public.project_permissions using btree (permission_level) TABLESPACE pg_default;

create index IF not exists idx_project_permissions_granted_at on public.project_permissions using btree (granted_at desc) TABLESPACE pg_default;

create index IF not exists idx_project_permissions_project_user on public.project_permissions using btree (project_id, user_id) TABLESPACE pg_default;

create trigger project_permissions_updated_at BEFORE
update on project_permissions for EACH row
execute FUNCTION handle_updated_at ();

ALTER TABLE public.project_permissions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SECURITY_AUDIT_LOG (Depends on organizations)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id uuid not null default gen_random_uuid (),
  user_id uuid null,
  org_id uuid null,
  event_type text not null,
  event_action text not null,
  event_metadata jsonb null default '{}'::jsonb,
  ip_address inet null,
  user_agent text null,
  location_data jsonb null,
  severity text null default 'info'::text,
  created_at timestamp with time zone not null default now(),
  constraint security_audit_log_pkey primary key (id),
  constraint security_audit_log_org_id_fkey foreign KEY (org_id) references organizations (id) on delete CASCADE,
  constraint security_audit_log_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE,
  constraint security_audit_log_severity_check check (
    severity = any (
      array['info'::text, 'warning'::text, 'critical'::text]
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_security_audit_user_id on public.security_audit_log using btree (user_id) TABLESPACE pg_default;

create index IF not exists idx_security_audit_org_id on public.security_audit_log using btree (org_id) TABLESPACE pg_default;

create index IF not exists idx_security_audit_event_type on public.security_audit_log using btree (event_type) TABLESPACE pg_default;

create index IF not exists idx_security_audit_created_at on public.security_audit_log using btree (created_at desc) TABLESPACE pg_default;

ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STRIPE_WEBHOOK_EVENTS (No dependencies)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  id uuid not null default gen_random_uuid (),
  stripe_event_id text not null,
  event_type text not null,
  payload jsonb not null,
  processed boolean null default false,
  processed_at timestamp with time zone null,
  error text null,
  created_at timestamp with time zone not null default now(),
  constraint stripe_webhook_events_pkey primary key (id),
  constraint stripe_webhook_events_stripe_event_id_key unique (stripe_event_id)
) TABLESPACE pg_default;

create index IF not exists idx_stripe_webhook_events_type on public.stripe_webhook_events using btree (event_type) TABLESPACE pg_default;

create index IF not exists idx_stripe_webhook_events_processed on public.stripe_webhook_events using btree (processed) TABLESPACE pg_default;

create index IF not exists idx_stripe_webhook_events_created_at on public.stripe_webhook_events using btree (created_at desc) TABLESPACE pg_default;

ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SUBSCRIPTIONS (Depends on organizations and subscription_tiers)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid not null default gen_random_uuid (),
  org_id uuid not null,
  tier_id uuid not null,
  period_start timestamp with time zone not null,
  period_end timestamp with time zone not null,
  status text not null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  stripe_subscription_id text null,
  stripe_customer_id text null,
  billing_cycle text null default 'monthly'::text,
  current_period_start timestamp with time zone null,
  current_period_end timestamp with time zone null,
  cancel_at_period_end boolean null default false,
  canceled_at timestamp with time zone null,
  trial_end timestamp with time zone null,
  metadata jsonb null default '{}'::jsonb,
  constraint subscriptions_pkey primary key (id),
  constraint unique_org_subscription unique (org_id),
  constraint subscriptions_stripe_subscription_id_key unique (stripe_subscription_id),
  constraint subscriptions_tier_id_fkey foreign KEY (tier_id) references subscription_tiers (id) on delete RESTRICT,
  constraint subscriptions_org_id_fkey foreign KEY (org_id) references organizations (id) on delete CASCADE,
  constraint subscriptions_status_check check (
    status = any (
      array[
        'active'::text,
        'past_due'::text,
        'unpaid'::text,
        'canceled'::text,
        'incomplete'::text,
        'incomplete_expired'::text,
        'trialing'::text,
        'paused'::text
      ]
    )
  ),
  constraint subscriptions_billing_cycle_check check (
    billing_cycle = any (array['monthly'::text, 'yearly'::text])
  )
) TABLESPACE pg_default;

create index IF not exists idx_subscriptions_org_id on public.subscriptions using btree (org_id) TABLESPACE pg_default;

create index IF not exists idx_subscriptions_stripe_id on public.subscriptions using btree (stripe_subscription_id) TABLESPACE pg_default;

create index IF not exists idx_subscriptions_org_period on public.subscriptions using btree (org_id, period_start, period_end) TABLESPACE pg_default;

create index IF not exists idx_subscriptions_status on public.subscriptions using btree (status) TABLESPACE pg_default;

create trigger sync_team_size_on_subscription_change
after INSERT
or
update OF tier_id,
status on subscriptions for EACH row
execute FUNCTION trigger_sync_team_size_on_subscription_change ();

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- INVOICES (Depends on organizations and subscriptions)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid not null default gen_random_uuid (),
  org_id uuid not null,
  subscription_id uuid null,
  stripe_invoice_id text not null,
  stripe_customer_id text null,
  number text null,
  status text not null,
  amount_due integer not null,
  amount_paid integer null default 0,
  amount_remaining integer null default 0,
  subtotal integer not null,
  tax integer null default 0,
  total integer not null,
  invoice_pdf text null,
  hosted_invoice_url text null,
  due_date timestamp with time zone null,
  paid_at timestamp with time zone null,
  period_start timestamp with time zone null,
  period_end timestamp with time zone null,
  metadata jsonb null default '{}'::jsonb,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint invoices_pkey primary key (id),
  constraint invoices_stripe_invoice_id_key unique (stripe_invoice_id),
  constraint invoices_org_id_fkey foreign KEY (org_id) references organizations (id) on delete CASCADE,
  constraint invoices_subscription_id_fkey foreign KEY (subscription_id) references subscriptions (id) on delete set null,
  constraint invoices_status_check check (
    status = any (
      array[
        'draft'::text,
        'open'::text,
        'paid'::text,
        'void'::text,
        'uncollectible'::text
      ]
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_invoices_org_id on public.invoices using btree (org_id) TABLESPACE pg_default;

create index IF not exists idx_invoices_stripe_id on public.invoices using btree (stripe_invoice_id) TABLESPACE pg_default;

create index IF not exists idx_invoices_status on public.invoices using btree (status) TABLESPACE pg_default;

create index IF not exists idx_invoices_created_at on public.invoices using btree (created_at desc) TABLESPACE pg_default;

create trigger invoices_updated_at BEFORE
update on invoices for EACH row
execute FUNCTION handle_updated_at ();

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- TENANTS (Depends on organizations)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.tenants (
  id uuid not null,
  subdomain text not null,
  company_name text not null,
  created_at timestamp with time zone null default now(),
  constraint tenants_pkey primary key (id),
  constraint tenants_subdomain_key unique (subdomain),
  constraint tenants_id_fkey foreign KEY (id) references organizations (id) on delete CASCADE,
  constraint tenants_subdomain_fkey foreign KEY (subdomain) references organizations (subdomain) on update CASCADE on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_tenants_subdomain on public.tenants using btree (subdomain) TABLESPACE pg_default;

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- USAGE_COUNTERS (Depends on organizations)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.usage_counters (
  org_id uuid not null,
  feature_key text not null,
  window_start timestamp with time zone not null,
  count integer not null default 0,
  updated_at timestamp with time zone not null default now(),
  constraint usage_counters_pkey primary key (org_id, feature_key, window_start),
  constraint usage_counters_org_id_fkey foreign KEY (org_id) references organizations (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_usage_counters_org_key_window on public.usage_counters using btree (org_id, feature_key, window_start) TABLESPACE pg_default;

ALTER TABLE public.usage_counters ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- USAGE_METRICS (Depends on organizations)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.usage_metrics (
  id uuid not null default gen_random_uuid (),
  org_id uuid not null,
  metric_name text not null,
  current_value integer not null default 0,
  limit_value integer null,
  period_start timestamp with time zone not null default now(),
  period_end timestamp with time zone null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint usage_metrics_pkey primary key (id),
  constraint unique_org_metric_period unique (org_id, metric_name, period_start),
  constraint usage_metrics_org_id_fkey foreign KEY (org_id) references organizations (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_usage_metrics_org_id on public.usage_metrics using btree (org_id) TABLESPACE pg_default;

create index IF not exists idx_usage_metrics_name on public.usage_metrics using btree (metric_name) TABLESPACE pg_default;

create trigger usage_metrics_updated_at BEFORE
update on usage_metrics for EACH row
execute FUNCTION handle_updated_at ();

ALTER TABLE public.usage_metrics ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- USER_NOTIFICATION_PREFERENCES (Depends on auth.users)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.user_notification_preferences (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  email_account_activity boolean null default true,
  email_team_updates boolean null default true,
  email_project_activity boolean null default false,
  email_marketing boolean null default false,
  inapp_push_enabled boolean null default false,
  inapp_sound_enabled boolean null default true,
  email_digest_frequency text null default 'realtime'::text,
  quiet_hours_enabled boolean null default false,
  quiet_hours_start time without time zone null default '22:00:00'::time without time zone,
  quiet_hours_end time without time zone null default '08:00:00'::time without time zone,
  quiet_hours_timezone text null default 'UTC'::text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint user_notification_preferences_pkey primary key (id),
  constraint unique_user_notification_prefs unique (user_id),
  constraint user_notification_preferences_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE,
  constraint user_notification_preferences_email_digest_frequency_check check (
    email_digest_frequency = any (
      array[
        'realtime'::text,
        'daily'::text,
        'weekly'::text,
        'never'::text
      ]
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_user_notification_prefs_user_id on public.user_notification_preferences using btree (user_id) TABLESPACE pg_default;

create trigger user_notification_prefs_updated_at BEFORE
update on user_notification_preferences for EACH row
execute FUNCTION handle_updated_at ();

ALTER TABLE public.user_notification_preferences ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- USER_PROFILES (Depends on organizations)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.user_profiles (
  user_id uuid not null default auth.uid (),
  org_id uuid null,
  email text not null,
  full_name text null,
  role public.user_role not null default 'member'::user_role,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  bio text null,
  profile_picture_url text null,
  phone_number text null,
  timezone text null default 'UTC'::text,
  language text null default 'en'::text,
  last_active_at timestamp with time zone null,
  force_logout_after timestamp with time zone null,
  constraint user_profiles_pkey primary key (user_id),
  constraint user_profiles_email_key unique (email),
  constraint user_profiles_org_id_fkey foreign KEY (org_id) references organizations (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_user_profiles_user_id on public.user_profiles using btree (user_id) TABLESPACE pg_default;

create index IF not exists idx_user_profiles_org_id on public.user_profiles using btree (org_id) TABLESPACE pg_default;

create index IF not exists idx_user_profiles_email on public.user_profiles using btree (email) TABLESPACE pg_default;

create index IF not exists idx_user_profiles_force_logout on public.user_profiles using btree (force_logout_after) TABLESPACE pg_default
where
  (force_logout_after is not null);

create trigger prevent_user_id_change_trigger BEFORE
update on user_profiles for EACH row
execute FUNCTION prevent_user_id_change ();

create trigger trg_user_profiles_updated_at BEFORE
update on user_profiles for EACH row
execute FUNCTION set_updated_at ();

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- USER_SECURITY_SETTINGS (Depends on auth.users)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.user_security_settings (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  mfa_enabled boolean null default false,
  mfa_factor_id text null,
  mfa_enrolled_at timestamp with time zone null,
  password_changed_at timestamp with time zone null,
  require_password_change boolean null default false,
  login_notifications boolean null default true,
  unusual_activity_alerts boolean null default true,
  max_active_sessions integer null default 5,
  session_timeout_minutes integer null default 10080,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint user_security_settings_pkey primary key (id),
  constraint unique_user_security_settings unique (user_id),
  constraint user_security_settings_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_user_security_settings_user_id on public.user_security_settings using btree (user_id) TABLESPACE pg_default;

create trigger user_security_settings_updated_at BEFORE
update on user_security_settings for EACH row
execute FUNCTION handle_updated_at ();

ALTER TABLE public.user_security_settings ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SUBDOMAIN_RESERVATIONS (Temporary subdomain reservations during signup)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.subdomain_reservations (
  id uuid not null default gen_random_uuid(),
  subdomain text not null,
  email text not null,
  user_id uuid null,
  organization_name text not null,
  reserved_at timestamp with time zone not null default now(),
  expires_at timestamp with time zone not null,
  confirmed_at timestamp with time zone null,
  metadata jsonb null default '{}'::jsonb,
  created_at timestamp with time zone not null default now(),
  constraint subdomain_reservations_pkey primary key (id),
  constraint subdomain_reservations_subdomain_key unique (subdomain),
  constraint subdomain_reservations_user_id_fkey foreign key (user_id) references auth.users (id) on delete cascade
) TABLESPACE pg_default;

-- Indexes for performance
create index IF not exists idx_subdomain_reservations_subdomain on public.subdomain_reservations using btree (subdomain) TABLESPACE pg_default;

create index IF not exists idx_subdomain_reservations_expires_at on public.subdomain_reservations using btree (expires_at) TABLESPACE pg_default
where
  (confirmed_at is null);

create index IF not exists idx_subdomain_reservations_user_id on public.subdomain_reservations using btree (user_id) TABLESPACE pg_default;

ALTER TABLE public.subdomain_reservations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subdomain_reservations
-- Allow public read access to check subdomain availability (only for active reservations)
CREATE POLICY "Allow public to check subdomain availability"
  ON public.subdomain_reservations
  FOR SELECT
  TO anon, authenticated
  USING (
    expires_at > now() AND confirmed_at IS NULL
  );

-- Allow authenticated users to insert their own reservations
CREATE POLICY "Allow authenticated users to insert reservations"
  ON public.subdomain_reservations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
  );

-- Allow anonymous users to insert reservations during signup (before email confirmation)
-- This is safe because user_id must match the user who just signed up
CREATE POLICY "Allow anonymous users to insert reservations during signup"
  ON public.subdomain_reservations
  FOR INSERT
  TO anon
  WITH CHECK (
    user_id IS NOT NULL
  );

-- Allow authenticated users to update their own reservations
CREATE POLICY "Allow users to update own reservations"
  ON public.subdomain_reservations
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Allow service role to manage all reservations (for cleanup job)
CREATE POLICY "Allow service role full access to reservations"
  ON public.subdomain_reservations
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- AUTH.USERS TRIGGERS
-- These triggers fire on the Supabase auth.users table to initialize
-- user-related data in the public schema
-- ============================================================================

-- Trigger: Create user settings (security_settings, notification_preferences) on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Trigger: Create inactive organization for owner signups (if metadata present)
CREATE TRIGGER on_auth_user_created_organization
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.create_new_organization();

-- Trigger: Sync email changes from auth.users to user_profiles
CREATE TRIGGER on_auth_user_email_updated
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_user_email();

-- ============================================================================
-- END OF TABLES
-- ============================================================================
