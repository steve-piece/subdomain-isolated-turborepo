-- =====================================================
-- 🗄️ SUBDOMAIN MULTI-TENANT DATABASE SETUP SCRIPT (IDEMPOTENT)
-- =====================================================
--
-- This script aligns with the current project schema that uses a short user ID
-- (8-char text) as the organization owner reference and is safe to run multiple
-- times. It creates missing objects and updates safe defaults without breaking
-- existing data.
-- =====================================================

-- =====================================================
-- 🧩 EXTENSIONS
-- =====================================================

CREATE EXTENSION IF NOT EXISTS address_standardizer;

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
-- 📊 CORE TABLES (create if missing; do not alter existing)
-- =====================================================

-- Note: We avoid circular FKs during initial table creation. The FK from
-- organizations.owner_id -> user_profiles.user_id is added later via ALTER.

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
  owner_id uuid, -- Owner is the same id as auth.users(id)
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tenants (
  id uuid PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  subdomain text NOT NULL UNIQUE,
  company_name text NOT NULL,
  searchable boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE, -- Same id as auth.users(id)
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text,
  role public.user_role NOT NULL DEFAULT 'superadmin',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Ensure tenants.searchable default is false (idempotent)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tenants' AND column_name = 'searchable'
  ) THEN
    EXECUTE 'ALTER TABLE public.tenants ALTER COLUMN searchable SET DEFAULT false';
  END IF;
END;
$$;

-- =====================================================
-- 🔄 LEGACY SCHEMA MIGRATION (safe/idempotent)
-- - Migrate short-id model to UUID user_id aligned with auth.users(id)
-- - Update organizations.owner_id to UUID and remap from user_profiles.uid
-- =====================================================

-- 1) If legacy columns exist, remap organizations.owner_id to the full UUID via user_profiles.uid
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='user_profiles' AND column_name='uid'
  ) THEN
    -- Drop FK temporarily if present to allow type change and remap
    IF EXISTS (
      SELECT 1 FROM pg_constraint c
      JOIN pg_class t ON t.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace
      WHERE n.nspname='public' AND t.relname='organizations' AND c.conname='organizations_owner_id_fkey'
    ) THEN
      ALTER TABLE public.organizations DROP CONSTRAINT organizations_owner_id_fkey;
    END IF;

    -- Remap owner_id (currently text short-id) to the full UUID using user_profiles.uid
    IF EXISTS (
      SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='organizations' AND column_name='owner_id'
    ) THEN
      UPDATE public.organizations o
      SET owner_id = up.uid
      FROM public.user_profiles up
      WHERE o.owner_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user_profiles' AND column_name='user_id'
        )
        AND o.owner_id = up.user_id::text; -- legacy match by short-id text

      -- Ensure owner_id column type is UUID
      ALTER TABLE public.organizations
        ALTER COLUMN owner_id TYPE uuid USING owner_id::uuid;
    END IF;

    -- Promote user_profiles.user_id to UUID equal to auth.users(id)
    -- Create a temp UUID column if needed and migrate values from uid
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user_profiles' AND column_name='user_id' AND data_type='uuid'
    ) THEN
      -- If user_id exists as non-uuid, create a temp UUID column and backfill
      IF EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user_profiles' AND column_name='user_id'
      ) THEN
        ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS user_id_uuid uuid;
        UPDATE public.user_profiles SET user_id_uuid = uid WHERE user_id_uuid IS NULL;
        -- Drop old PK if any, then drop the legacy user_id and rename
        ALTER TABLE public.user_profiles DROP CONSTRAINT IF EXISTS user_profiles_pkey;
        ALTER TABLE public.user_profiles DROP COLUMN IF EXISTS user_id;
        ALTER TABLE public.user_profiles RENAME COLUMN user_id_uuid TO user_id;
        ALTER TABLE public.user_profiles ADD CONSTRAINT user_profiles_pkey PRIMARY KEY (user_id);
      ELSE
        -- No user_id column at all; just add it from uid
        ALTER TABLE public.user_profiles ADD COLUMN user_id uuid;
        UPDATE public.user_profiles SET user_id = uid WHERE user_id IS NULL;
        ALTER TABLE public.user_profiles ADD CONSTRAINT user_profiles_pkey PRIMARY KEY (user_id);
      END IF;
      -- Drop legacy uid column now that user_id is UUID
      ALTER TABLE public.user_profiles DROP COLUMN IF EXISTS uid;
    END IF;
  END IF;
END;
$$;

-- Add missing FK organizations.owner_id -> public.user_profiles(user_id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public' AND t.relname = 'organizations' AND c.conname = 'organizations_owner_id_fkey'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'organizations' AND column_name = 'owner_id'
  ) THEN
    ALTER TABLE public.organizations
      ADD CONSTRAINT organizations_owner_id_fkey
      FOREIGN KEY (owner_id) REFERENCES public.user_profiles(user_id);
  END IF;
END;
$$;

-- =====================================================
-- 📋 VIEW (idempotent)
-- =====================================================

CREATE OR REPLACE VIEW public.tenants_public AS
SELECT
  subdomain,
  company_name
FROM public.tenants
WHERE searchable = true;

ALTER VIEW public.tenants_public SET (security_invoker = true);

-- =====================================================
-- ⚙️ UTILITY FUNCTIONS (OR REPLACE)
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_user_org_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  org_id uuid;
BEGIN
  SELECT up.org_id INTO org_id
  FROM public.user_profiles up
  WHERE up.user_id = auth.uid()
  LIMIT 1;
  RETURN org_id;
END;
$$;

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

-- Custom Access Token Hook, aligns with short-id model
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
  user_org_id text;
  user_company_name text;
BEGIN
  claims := event->'claims';

  SELECT
    up.role::text,
    t.subdomain,
    up.org_id::text,
    t.company_name
  INTO user_role, user_subdomain, user_org_id, user_company_name
  FROM public.user_profiles up
  LEFT JOIN public.tenants t ON t.org_id = up.org_id
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

-- Auto-profile creation on new auth user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, email, role, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    'superadmin'::user_role,
    COALESCE(
      (NEW.raw_user_meta_data->>'full_name')::text,
      (NEW.raw_user_meta_data->>'name')::text,
      COALESCE(NEW.email, ''),
      'Unknown User'
    )
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Prevent uid changes on user_profiles
CREATE OR REPLACE FUNCTION public.prevent_user_id_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_id <> OLD.user_id THEN
    RAISE EXCEPTION 'user_id is immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Keep user_profiles.email in sync with auth.users.email
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
-- 🔐 CUSTOM CLAIMS FUNCTION PERMISSIONS
-- =====================================================

GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated, anon, public;

-- =====================================================
-- 🔄 TRIGGERS (idempotent)
-- =====================================================

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
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created') THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_new_user();
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
-- RLS POLICIES (create if missing)
-- =====================================================

-- Clean out legacy policies that conflict with new owner/service rules (idempotent)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='organizations' AND policyname='organizations_member_read') THEN
    DROP POLICY "organizations_member_read" ON public.organizations;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='organizations' AND policyname='organizations_admin_write') THEN
    DROP POLICY "organizations_admin_write" ON public.organizations;
  END IF;
END;
$$;

-- Organizations: service/postgres full access; owners can UPDATE/DELETE
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='organizations' AND policyname='organizations_service_all'
  ) THEN
    CREATE POLICY "organizations_service_all" ON public.organizations
      FOR ALL TO service_role, postgres
      USING (true)
      WITH CHECK (true);
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='organizations' AND policyname='organizations_owner_update'
  ) THEN
    CREATE POLICY "organizations_owner_update" ON public.organizations
      FOR UPDATE TO authenticated
      USING (owner_id = auth.uid())
      WITH CHECK (owner_id = auth.uid());
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='organizations' AND policyname='organizations_owner_delete'
  ) THEN
    CREATE POLICY "organizations_owner_delete" ON public.organizations
      FOR DELETE TO authenticated
      USING (owner_id = auth.uid());
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='tenants' AND policyname='tenants_anon_select_searchable'
  ) THEN
    CREATE POLICY "tenants_anon_select_searchable" ON public.tenants
      FOR SELECT TO anon
      USING (searchable = true);
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='tenants' AND policyname='tenants_admin_insert'
  ) THEN
    CREATE POLICY "tenants_admin_insert" ON public.tenants
      FOR INSERT TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.user_profiles up
          WHERE up.user_id = auth.uid()
            AND up.org_id = tenants.org_id
            AND up.role IN ('admin', 'superadmin')
        )
      );
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='tenants' AND policyname='tenants_admin_update'
  ) THEN
    CREATE POLICY "tenants_admin_update" ON public.tenants
      FOR UPDATE TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.user_profiles up
          WHERE up.user_id = auth.uid()
            AND up.org_id = tenants.org_id
            AND up.role IN ('admin', 'superadmin')
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.user_profiles up
          WHERE up.user_id = auth.uid()
            AND up.org_id = tenants.org_id
            AND up.role IN ('admin', 'superadmin')
        )
      );
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='tenants' AND policyname='tenants_admin_delete'
  ) THEN
    CREATE POLICY "tenants_admin_delete" ON public.tenants
      FOR DELETE TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.user_profiles up
          WHERE up.user_id = auth.uid()
            AND up.org_id = tenants.org_id
            AND up.role IN ('admin', 'superadmin')
        )
      );
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_profiles' AND policyname='profiles_self_read'
  ) THEN
    CREATE POLICY "profiles_self_read" ON public.user_profiles
      FOR SELECT TO public, anon, authenticated
      USING (user_id = auth.uid());
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_profiles' AND policyname='profiles_self_update'
  ) THEN
    CREATE POLICY "profiles_self_update" ON public.user_profiles
      FOR UPDATE TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_profiles' AND policyname='profiles_org_admin_read'
  ) THEN
    CREATE POLICY "profiles_org_admin_read" ON public.user_profiles
      FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.user_profiles admin
          WHERE admin.user_id = auth.uid()
            AND admin.org_id = user_profiles.org_id
            AND admin.role IN ('admin', 'superadmin')
        )
      );
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_profiles' AND policyname='profiles_org_admin_manage'
  ) THEN
    CREATE POLICY "profiles_org_admin_manage" ON public.user_profiles
      FOR ALL TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.user_profiles admin
          WHERE admin.user_id = auth.uid()
            AND admin.org_id = user_profiles.org_id
            AND admin.role IN ('admin', 'superadmin')
        )
      );
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
CREATE INDEX IF NOT EXISTS idx_tenants_org_id ON public.tenants(org_id);
CREATE INDEX IF NOT EXISTS idx_organizations_owner_id ON public.organizations(owner_id);

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
-- Ensure internal-only semantics: use invoker security and no public grants
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

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='subscriptions' AND policyname='subscriptions_member_read'
  ) THEN
    CREATE POLICY "subscriptions_member_read" ON public.subscriptions
      FOR SELECT TO authenticated
      USING (EXISTS (
        SELECT 1 FROM public.user_profiles up WHERE up.uid = auth.uid() AND up.org_id = subscriptions.org_id
      ));
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='usage_counters' AND policyname='usage_member_read'
  ) THEN
    CREATE POLICY "usage_member_read" ON public.usage_counters
      FOR SELECT TO authenticated
      USING (EXISTS (
        SELECT 1 FROM public.user_profiles up WHERE up.uid = auth.uid() AND up.org_id = usage_counters.org_id
      ));
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='subscriptions' AND policyname='subscriptions_admin_manage'
  ) THEN
    CREATE POLICY "subscriptions_admin_manage" ON public.subscriptions
      FOR ALL TO authenticated
      USING (EXISTS (
        SELECT 1 FROM public.user_profiles up WHERE up.uid = auth.uid() AND up.org_id = subscriptions.org_id AND up.role IN ('admin','superadmin')
      ));
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='usage_counters' AND policyname='usage_admin_manage'
  ) THEN
    CREATE POLICY "usage_admin_manage" ON public.usage_counters
      FOR ALL TO authenticated
      USING (EXISTS (
        SELECT 1 FROM public.user_profiles up WHERE up.uid = auth.uid() AND up.org_id = usage_counters.org_id AND up.role IN ('admin','superadmin')
      ));
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_subscriptions_org_period ON public.subscriptions(org_id, period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_feature_limits_tier_key ON public.feature_limits(tier_id, feature_key);
CREATE INDEX IF NOT EXISTS idx_usage_counters_org_key_window ON public.usage_counters(org_id, feature_key, window_start);

-- =====================================================
-- 🏢 ORGANIZATION CREATION RPC (for signup flow)
-- =====================================================

CREATE OR REPLACE FUNCTION public.create_org_for_current_user(
  p_company_name text,
  p_subdomain text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_org_id uuid;
BEGIN
  -- Require authenticated user
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Create organization
  INSERT INTO public.organizations (company_name, subdomain, owner_id, settings, metadata)
  VALUES (p_company_name, lower(p_subdomain), auth.uid(), '{}'::jsonb, '{}'::jsonb)
  RETURNING id INTO v_org_id;

  -- Create tenant (id = org id)
  INSERT INTO public.tenants (id, company_name, searchable)
  VALUES (v_org_id, p_company_name, true);

  -- Link user profile to organization
  UPDATE public.user_profiles
  SET org_id = v_org_id
  WHERE user_id = auth.uid();

  RETURN v_org_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_org_for_current_user(text, text) TO authenticated;

-- =====================================================
-- 🔒 ADDITIONAL RLS POLICIES FOR SIGNUP FLOW
-- =====================================================

-- Organizations: consolidated policy for owners
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='organizations' AND policyname='organizations_owner_all'
  ) THEN
    CREATE POLICY "organizations_owner_all" ON public.organizations
      FOR ALL TO authenticated
      USING (owner_id = auth.uid())
      WITH CHECK (owner_id = auth.uid());
  END IF;
END;
$$;

-- Tenants: consolidated policy for organization owners
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='tenants' AND policyname='tenants_owner_all'
  ) THEN
    CREATE POLICY "tenants_owner_all" ON public.tenants
      FOR ALL TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.organizations o
          WHERE o.id = tenants.id AND o.owner_id = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.organizations o
          WHERE o.id = tenants.id AND o.owner_id = auth.uid()
        )
      );
  END IF;
END;
$$;

-- User profiles: consolidated policy for self-management
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='user_profiles' AND policyname='profiles_self_all'
  ) THEN
    CREATE POLICY "profiles_self_all" ON public.user_profiles
      FOR ALL TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END;
$$;

-- =====================================================
-- ✅ SETUP COMPLETE (IDEMPOTENT)
-- =====================================================

-- Enable the Custom Access Token Hook in Supabase dashboard:
--   Hook Type: Custom Access Token
--   Hook URL: pg-functions://postgres/public/custom_access_token_hook
--   Status: Enabled

-- This script can be safely re-run. It only creates missing objects or applies
-- safe updates (e.g., OR REPLACE, IF NOT EXISTS) and aligns with short-id owner.


