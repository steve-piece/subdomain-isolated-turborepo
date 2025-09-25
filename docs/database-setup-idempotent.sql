-- =====================================================
-- 🗄️ SUBDOMAIN MULTI-TENANT DATABASE SETUP SCRIPT (IDEMPOTENT)
-- =====================================================
--
-- This script aligns with the current project schema using UUID for user_id/owner_id.
-- It is safe to run multiple times: creates missing objects, updates safe defaults.
-- Owner-specific signup handled by handle_owner_signup trigger; no general profile creation.
-- =====================================================

-- =====================================================
-- 🧩 EXTENSIONS
-- =====================================================

-- Install required extensions (Supabase-supported)
CREATE EXTENSION IF NOT EXISTS pgcrypto; -- for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pg_trgm;  -- for trigram search indexes

-- =====================================================
-- 🔧 CUSTOM TYPES (idempotent)
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'user_role'
  ) THEN
    CREATE TYPE public.user_role AS ENUM (
      'superadmin',
      'admin',
      'member',
      'view-only',
      'owner'
    );
  END IF;
END;
$$;

-- =====================================================
-- 🧹 LEGACY CLEANUP (safe/idempotent)
-- =====================================================

-- Drop legacy function get_user_org_id if it exists (any signature)
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid, n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname='public' AND p.proname='get_user_org_id'
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS %I.%I(%s);', r.nspname, r.proname, r.args);
  END LOOP;
END;
$$;

-- Drop conflicting general profile functions and triggers (if exist)
DROP FUNCTION IF EXISTS public.handle_new_auth_user();
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP TRIGGER IF EXISTS handle_new_auth_user ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop old org signup function/trigger
DROP FUNCTION IF EXISTS public.create_org_from_signup();
DROP TRIGGER IF EXISTS create_org_on_signup ON auth.users;

-- =====================================================
-- 📊 CORE TABLES (create if missing; do not alter existing)
-- =====================================================

-- Note: Avoid circular FKs during initial creation. FK from organizations.owner_id -> user_profiles.user_id added later.

CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name text NOT NULL,
  description text,
  website text,
  logo_url text,
  address text, -- Standardized using address_standardizer extension
  subdomain text NOT NULL UNIQUE,
  settings jsonb DEFAULT '{}'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb, -- Industry, size, founding year, etc.
  owner_id uuid, -- References auth.users(id) via user_profiles
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tenants (
  id uuid PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  subdomain text NOT NULL UNIQUE,
  company_name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE, -- Nullable for pre-org profiles
  email text UNIQUE NOT NULL,
  full_name text,
  role public.user_role NOT NULL DEFAULT 'member', -- Default 'member' for non-owners
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Relax NOT NULL on user_profiles.org_id if set (allow pre-org linkage)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='user_profiles' AND column_name='org_id' AND is_nullable='NO'
  ) THEN
    ALTER TABLE public.user_profiles ALTER COLUMN org_id DROP NOT NULL;
  END IF;
END;
$$;

-- Add missing FK organizations.owner_id -> user_profiles.user_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public' AND t.relname = 'organizations' AND c.conname LIKE '%owner_id_fkey'
  ) THEN
    ALTER TABLE public.organizations
      ADD CONSTRAINT organizations_owner_id_fkey
      FOREIGN KEY (owner_id) REFERENCES public.user_profiles(user_id) ON DELETE SET NULL;
  END IF;
END;
$$;

-- =====================================================
-- 📋 VIEW (idempotent)
-- =====================================================

DROP VIEW IF EXISTS public.tenants_public;
CREATE OR REPLACE VIEW public.tenants_public AS
SELECT
  subdomain,
  company_name
FROM public.tenants;

ALTER VIEW public.tenants_public SET (security_invoker = true);

-- =====================================================
-- ⚙️ UTILITY FUNCTIONS (OR REPLACE)
-- =====================================================

CREATE OR REPLACE FUNCTION public.user_has_role(required_role text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.user_profiles
    WHERE user_id = auth.uid()
      AND role::text = required_role
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.user_in_org(org_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.user_profiles
    WHERE user_id = auth.uid()
      AND org_id = org_uuid
  );
END;
$$;

-- Custom Access Token Hook (aligns with UUID model)
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  claims jsonb;
  user_role text;
  user_subdomain text;
  user_org_id uuid;
  user_company_name text;
BEGIN
  claims := event->'claims';

  SELECT
    up.role::text,
    t.subdomain,
    up.org_id,
    t.company_name
  INTO user_role, user_subdomain, user_org_id, user_company_name
  FROM public.user_profiles up
  LEFT JOIN public.tenants t ON t.id = up.org_id
  WHERE up.user_id = (event->>'user_id')::uuid
  LIMIT 1;

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

  event := jsonb_set(event, '{claims}', claims);
  RETURN event;
END;
$$;

-- Timestamp helper
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Prevent user_id changes on user_profiles
CREATE OR REPLACE FUNCTION public.prevent_user_id_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_id <> OLD.user_id THEN
    RAISE EXCEPTION 'user_id is immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Sync user_profiles.email with auth.users.email
CREATE OR REPLACE FUNCTION public.sync_user_email()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email IS DISTINCT FROM OLD.email THEN
    UPDATE public.user_profiles
       SET email = COALESCE(NEW.email, email),
           updated_at = now()
     WHERE user_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 🏢 ORGANIZATION CREATION FUNCTION (idempotent)
-- =====================================================

-- Standalone function for atomic owner signup: Creates profile (owner role), organization, tenant, and links org_id
CREATE OR REPLACE FUNCTION public.handle_owner_signup(
  p_user_id uuid,
  p_raw_user_meta_data jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
VOLATILE
AS $$
DECLARE
  v_company_name text := COALESCE(p_raw_user_meta_data->>'company_name', '');
  v_subdomain    text := LOWER(TRIM(COALESCE(p_raw_user_meta_data->>'subdomain', '')));
  v_full_name    text := COALESCE(p_raw_user_meta_data->>'full_name', '');
  v_user_role    text := COALESCE(p_raw_user_meta_data->>'user_role', 'member');
  v_org_id       uuid;
  v_email        text;
BEGIN
  -- Fetch user email for profile
  SELECT email INTO v_email FROM auth.users WHERE id = p_user_id;

  -- Only process if user_role = 'owner' and required metadata provided
  IF v_user_role = 'owner' AND v_company_name <> '' AND v_subdomain <> '' AND v_subdomain ~ '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$' THEN
    -- Step 0: Verify user doesn't already own an organization
    IF EXISTS (SELECT 1 FROM public.organizations WHERE owner_id = p_user_id) THEN
      RAISE NOTICE 'User % already owns an organization, skipping signup', p_user_id;
      RETURN NULL;
    END IF;

    -- Step 1: Create owner profile (org_id NULL temp)
    INSERT INTO public.user_profiles (user_id, email, full_name, role)
    VALUES (p_user_id, COALESCE(v_email, ''), v_full_name, 'owner'::public.user_role);

    -- Step 2: Create organization
    INSERT INTO public.organizations (company_name, subdomain, owner_id)
    VALUES (v_company_name, v_subdomain, p_user_id)
    RETURNING id INTO v_org_id;

    -- Step 3: Create tenant (no searchable column)
    INSERT INTO public.tenants (id, subdomain, company_name)
    VALUES (v_org_id, v_subdomain, v_company_name);

    -- Step 4: Link org_id to profile
    UPDATE public.user_profiles 
    SET org_id = v_org_id 
    WHERE user_id = p_user_id;

    RAISE NOTICE 'Standalone owner signup completed: Org ID % for user %', v_org_id, p_user_id;

    RETURN v_org_id;
  END IF;

  -- No action taken (invalid metadata): Return NULL
  RETURN NULL;

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Signup failed for user %: %', p_user_id, SQLERRM;
    RETURN NULL;
END;
$$;

-- Add documentation comment
COMMENT ON FUNCTION public.handle_owner_signup(uuid, jsonb) IS 'Standalone function for atomic owner signup: Creates profile (owner role), organization, tenant, and links org_id. Call with user_id and raw_user_meta_data after auth.signup. Returns org_id if successful (validated metadata), NULL otherwise. SECURITY DEFINER.';

-- Secure: Revoke broad access
REVOKE ALL ON FUNCTION public.handle_owner_signup(uuid, jsonb) FROM PUBLIC, anon, authenticated, service_role;

-- Grant execute to authenticated (for app calls, e.g., Server Actions)
GRANT EXECUTE ON FUNCTION public.handle_owner_signup(uuid, jsonb) TO authenticated;

-- =====================================================
-- 🔄 TRIGGERS (idempotent)
-- =====================================================

-- Note: No triggers needed - handle_owner_signup is called directly from application code

-- Audit triggers
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_organizations_updated_at') THEN
    CREATE TRIGGER trg_organizations_updated_at
      BEFORE UPDATE ON public.organizations
      FOR EACH ROW
      EXECUTE FUNCTION public.set_updated_at();
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_user_profiles_updated_at') THEN
    CREATE TRIGGER trg_user_profiles_updated_at
      BEFORE UPDATE ON public.user_profiles
      FOR EACH ROW
      EXECUTE FUNCTION public.set_updated_at();
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'prevent_user_id_change_trigger') THEN
    CREATE TRIGGER prevent_user_id_change_trigger
      BEFORE UPDATE ON public.user_profiles
      FOR EACH ROW
      EXECUTE FUNCTION public.prevent_user_id_change();
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'sync_email_on_auth_update') THEN
    CREATE TRIGGER sync_email_on_auth_update
      AFTER UPDATE ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION public.sync_user_email();
  END IF;
END;
$$;

-- =====================================================
-- 🔒 ROW LEVEL SECURITY (idempotent enable)
-- =====================================================

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES (create if missing; drop legacy)
-- =====================================================

-- Clean legacy policies
DO $$
BEGIN
  -- Organizations legacy
  DROP POLICY IF EXISTS "organizations_member_read" ON public.organizations;
  DROP POLICY IF EXISTS "organizations_admin_write" ON public.organizations;
  DROP POLICY IF EXISTS "organizations_service_all" ON public.organizations;
  DROP POLICY IF EXISTS "organizations_owner_all" ON public.organizations;

  -- User profiles legacy
  DROP POLICY IF EXISTS "profiles_org_admin_manage" ON public.user_profiles;
  DROP POLICY IF EXISTS "profiles_self_all" ON public.user_profiles;

  -- Tenants legacy
  DROP POLICY IF EXISTS "tenants_owner_all" ON public.tenants;
  DROP POLICY IF EXISTS "tenants_anon_select_searchable" ON public.tenants;
  DROP POLICY IF EXISTS "tenants_admin_insert" ON public.tenants;
  DROP POLICY IF EXISTS "tenants_admin_update" ON public.tenants;
  DROP POLICY IF EXISTS "tenants_admin_delete" ON public.tenants;
END;
$$;

-- Organizations: Service full access (operation-specific)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='organizations_service_select') THEN
    CREATE POLICY "organizations_service_select" ON public.organizations FOR SELECT TO service_role, postgres USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='organizations_service_insert') THEN
    CREATE POLICY "organizations_service_insert" ON public.organizations FOR INSERT TO service_role, postgres WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='organizations_service_update') THEN
    CREATE POLICY "organizations_service_update" ON public.organizations FOR UPDATE TO service_role, postgres USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='organizations_service_delete') THEN
    CREATE POLICY "organizations_service_delete" ON public.organizations FOR DELETE TO service_role, postgres USING (true);
  END IF;
END;
$$;

-- Organizations: Owner access
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='organizations_owner_select') THEN
    CREATE POLICY "organizations_owner_select" ON public.organizations FOR SELECT TO authenticated USING (owner_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='organizations_owner_insert') THEN
    CREATE POLICY "organizations_owner_insert" ON public.organizations FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='organizations_owner_update') THEN
    CREATE POLICY "organizations_owner_update" ON public.organizations FOR UPDATE TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='organizations_owner_delete') THEN
    CREATE POLICY "organizations_owner_delete" ON public.organizations FOR DELETE TO authenticated USING (owner_id = auth.uid());
  END IF;
END;
$$;

-- Tenants: Public SELECT for view (base table policy enables view access)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='public_select_tenants_for_view') THEN
    CREATE POLICY "public_select_tenants_for_view" ON public.tenants FOR SELECT TO anon, authenticated USING (true);
  END IF;
END;
$$;

-- Tenants: Owners manage
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='tenants_owner_select') THEN
    CREATE POLICY "tenants_owner_select" ON public.tenants FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = tenants.id AND o.owner_id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='tenants_owner_insert') THEN
    CREATE POLICY "tenants_owner_insert" ON public.tenants FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = tenants.id AND o.owner_id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='tenants_owner_update') THEN
    CREATE POLICY "tenants_owner_update" ON public.tenants FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = tenants.id AND o.owner_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = tenants.id AND o.owner_id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='tenants_owner_delete') THEN
    CREATE POLICY "tenants_owner_delete" ON public.tenants FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = tenants.id AND o.owner_id = auth.uid()));
  END IF;
END;
$$;

-- User profiles: Self access
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='profiles_self_read') THEN
    CREATE POLICY "profiles_self_read" ON public.user_profiles FOR SELECT TO authenticated, anon USING (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='profiles_self_insert') THEN
    CREATE POLICY "profiles_self_insert" ON public.user_profiles FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='profiles_self_update') THEN
    CREATE POLICY "profiles_self_update" ON public.user_profiles FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='profiles_self_delete') THEN
    CREATE POLICY "profiles_self_delete" ON public.user_profiles FOR DELETE TO authenticated USING (user_id = auth.uid());
  END IF;
END;
$$;

-- User profiles: Org admin manage (operation-specific)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='profiles_org_admin_select') THEN
    CREATE POLICY "profiles_org_admin_select" ON public.user_profiles FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.user_profiles admin WHERE admin.user_id = auth.uid() AND admin.org_id = user_profiles.org_id AND admin.role IN ('admin', 'superadmin')));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='profiles_org_admin_insert') THEN
    CREATE POLICY "profiles_org_admin_insert" ON public.user_profiles FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.user_profiles admin WHERE admin.user_id = auth.uid() AND admin.org_id = user_profiles.org_id AND admin.role IN ('admin', 'superadmin')));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='profiles_org_admin_update') THEN
    CREATE POLICY "profiles_org_admin_update" ON public.user_profiles FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.user_profiles admin WHERE admin.user_id = auth.uid() AND admin.org_id = user_profiles.org_id AND admin.role IN ('admin', 'superadmin'))) WITH CHECK (EXISTS (SELECT 1 FROM public.user_profiles admin WHERE admin.user_id = auth.uid() AND admin.org_id = user_profiles.org_id AND admin.role IN ('admin', 'superadmin')));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='profiles_org_admin_delete') THEN
    CREATE POLICY "profiles_org_admin_delete" ON public.user_profiles FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.user_profiles admin WHERE admin.user_id = auth.uid() AND admin.org_id = user_profiles.org_id AND admin.role IN ('admin', 'superadmin')));
  END IF;
END;
$$;

-- =====================================================
-- 📝 INDEXES (idempotent)
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON public.user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_org_id ON public.user_profiles(org_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_tenants_subdomain ON public.tenants(subdomain);
CREATE INDEX IF NOT EXISTS idx_organizations_owner_id ON public.organizations(owner_id);

-- Remove duplicate/legacy indexes
DROP INDEX IF EXISTS public.user_profiles_org_id_idx;
DROP INDEX IF EXISTS public.idx_user_profiles_uid;
DROP INDEX IF EXISTS public.tenants_subdomain_idx;
DROP INDEX IF EXISTS public.tenants_name_idx;
DROP INDEX IF EXISTS public.organizations_name_idx;
DROP INDEX IF EXISTS public.tenants_company_name_trgm;

-- =====================================================
-- 🎯 GRANTS AND PERMISSIONS
-- =====================================================

GRANT SELECT ON public.tenants_public TO anon, public;

-- =====================================================
-- 💳 BILLING TABLES, VIEWS, FUNCTIONS, RLS (idempotent)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.subscription_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.feature_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_id uuid NOT NULL REFERENCES public.subscription_tiers(id) ON DELETE CASCADE,
  feature_key text NOT NULL,
  limit_per_period integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tier_id, feature_key)
);

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  tier_id uuid NOT NULL REFERENCES public.subscription_tiers(id) ON DELETE RESTRICT,
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  status text NOT NULL CHECK (status IN ('active','trialing','past_due','canceled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.usage_counters (
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  feature_key text NOT NULL,
  window_start timestamptz NOT NULL,
  count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (org_id, feature_key, window_start)
);

CREATE OR REPLACE VIEW public.org_entitlements AS
SELECT s.org_id, fl.feature_key, fl.limit_per_period
FROM public.subscriptions s
JOIN public.feature_limits fl ON fl.tier_id = s.tier_id
WHERE s.status IN ('active','trialing')
  AND now() >= s.period_start AND now() < s.period_end;

ALTER VIEW public.org_entitlements SET (security_invoker = true);
REVOKE SELECT ON public.org_entitlements FROM anon, public;

CREATE OR REPLACE FUNCTION public.feature_increment_if_within_limit(p_org_id uuid, p_feature_key text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
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
$$;

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_counters ENABLE ROW LEVEL SECURITY;

-- Billing policies (org member read, admin manage)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='subscriptions_member_read') THEN
    CREATE POLICY "subscriptions_member_read" ON public.subscriptions FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.user_id = auth.uid() AND up.org_id = subscriptions.org_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='usage_member_read') THEN
    CREATE POLICY "usage_member_read" ON public.usage_counters FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.user_id = auth.uid() AND up.org_id = usage_counters.org_id));
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='subscriptions_admin_select') THEN
    CREATE POLICY "subscriptions_admin_select" ON public.subscriptions FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.user_id = auth.uid() AND up.org_id = subscriptions.org_id AND up.role IN ('admin','superadmin')));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='subscriptions_admin_insert') THEN
    CREATE POLICY "subscriptions_admin_insert" ON public.subscriptions FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.user_id = auth.uid() AND up.org_id = subscriptions.org_id AND up.role IN ('admin','superadmin')));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='subscriptions_admin_update') THEN
    CREATE POLICY "subscriptions_admin_update" ON public.subscriptions FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.user_id = auth.uid() AND up.org_id = subscriptions.org_id AND up.role IN ('admin','superadmin'))) WITH CHECK (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.user_id = auth.uid() AND up.org_id = subscriptions.org_id AND up.role IN ('admin','superadmin')));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='subscriptions_admin_delete') THEN
    CREATE POLICY "subscriptions_admin_delete" ON public.subscriptions FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.user_id = auth.uid() AND up.org_id = subscriptions.org_id AND up.role IN ('admin','superadmin')));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='usage_admin_select') THEN
    CREATE POLICY "usage_admin_select" ON public.usage_counters FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.user_id = auth.uid() AND up.org_id = usage_counters.org_id AND up.role IN ('admin','superadmin')));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='usage_admin_insert') THEN
    CREATE POLICY "usage_admin_insert" ON public.usage_counters FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.user_id = auth.uid() AND up.org_id = usage_counters.org_id AND up.role IN ('admin','superadmin')));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='usage_admin_update') THEN
    CREATE POLICY "usage_admin_update" ON public.usage_counters FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.user_id = auth.uid() AND up.org_id = usage_counters.org_id AND up.role IN ('admin','superadmin'))) WITH CHECK (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.user_id = auth.uid() AND up.org_id = usage_counters.org_id AND up.role IN ('admin','superadmin')));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='usage_admin_delete') THEN
    CREATE POLICY "usage_admin_delete" ON public.usage_counters FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.user_id = auth.uid() AND up.org_id = usage_counters.org_id AND up.role IN ('admin','superadmin')));
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_subscriptions_org_period ON public.subscriptions(org_id, period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_feature_limits_tier_key ON public.feature_limits(tier_id, feature_key);
CREATE INDEX IF NOT EXISTS idx_usage_counters_org_key_window ON public.usage_counters(org_id, feature_key, window_start);

-- =====================================================
-- 🏢 ORGANIZATION CREATION RPC (updated, no searchable)
-- =====================================================

-- Note: create_org_for_current_user function has been removed
-- Use handle_owner_signup function instead (created via migration)

-- =====================================================
-- 🔒 CUSTOM CLAIMS FUNCTION PERMISSIONS
-- =====================================================

GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated, anon, public;

-- =====================================================
-- 🔄 TRIGGERS (idempotent)
-- =====================================================

-- Enable the Custom Access Token Hook in Supabase dashboard:
--   Hook Type: Custom Access Token
--   Hook URL: pg-functions://postgres/public/custom_access_token_hook
--   Status: Enabled

-- This script can be safely re-run. No general profile creation for non-owners—add if needed.


