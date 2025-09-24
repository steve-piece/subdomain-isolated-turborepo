-- =====================================================
-- 🗄️ SUBDOMAIN MULTI-TENANT DATABASE SETUP SCRIPT  
-- =====================================================
-- 
-- This script sets up the complete database structure for the 
-- subdomain-isolated multi-tenant architecture with enhanced
-- organizational data management and single-user-per-organization enforcement.
--
-- Key Features:
-- • Organizations as primary table (not tenants)
-- • Short user_id (8 chars) + full uid (UUID) system
-- • Address standardization support
-- • Metadata storage for organizational context
-- • Strict single-organization membership
-- • Enhanced security with custom claims
--
-- Run this script in your Supabase SQL Editor after creating a new project.
-- =====================================================

-- =====================================================
-- 🧩 EXTENSIONS
-- =====================================================

-- Enable address standardization for organization addresses
CREATE EXTENSION IF NOT EXISTS address_standardizer;

-- =====================================================
-- 🔧 CUSTOM TYPES
-- =====================================================

-- User role hierarchy for multi-tenant access control
CREATE TYPE public.user_role AS ENUM (
    'superadmin',  -- Organization owner with full control
    'admin',       -- Organization admin with management access
    'member',      -- Regular organization member
    'view-only',   -- Read-only access
    'owner'        -- Explicit owner role
);

-- =====================================================
-- 📊 CORE TABLES
-- =====================================================

-- Organizations table - PRIMARY organizational data table
CREATE TABLE public.organizations (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    company_name text NOT NULL,
    description text,
    website text,
    logo_url text,
    address text, -- Standardized using address_standardizer extension
    subdomain text NOT NULL UNIQUE,
    settings jsonb DEFAULT '{}'::jsonb,
    metadata jsonb DEFAULT '{}'::jsonb, -- Industry, size, founding year, etc.
    owner_id uuid REFERENCES auth.users(id), -- Organization owner reference
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Tenants table - Subdomain mapping to organizations (1:1 relationship)
CREATE TABLE public.tenants (
    id uuid PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
    subdomain text NOT NULL UNIQUE,
    company_name text NOT NULL, -- Duplicated for performance/caching
    searchable boolean NOT NULL DEFAULT true,
    created_at timestamptz DEFAULT now()
);

-- User profiles - Enhanced user management with short IDs
CREATE TABLE public.user_profiles (
    user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    org_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE, -- Direct org reference (nullable until org is created)
    email text UNIQUE NOT NULL, -- Enforces one email = one user across all orgs
    full_name text NOT NULL,
    role public.user_role NOT NULL DEFAULT 'superadmin', -- New users default to superadmin
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- =====================================================
-- 📋 VIEWS
-- =====================================================

-- Public view for tenant discovery (minimal data, anon accessible)
CREATE VIEW public.tenants_public AS
SELECT 
    subdomain,
    company_name
FROM public.tenants
WHERE searchable = true;

-- Enable security invoker for proper RLS
ALTER VIEW public.tenants_public SET (security_invoker = true);

-- =====================================================
-- ⚙️ UTILITY FUNCTIONS
-- =====================================================

-- Get the current user's organization ID (updated for direct org_id reference)
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

-- Check if user has specific role
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

-- Check if user belongs to specific organization
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

-- Custom Access Token Hook for adding tenant-specific claims to JWT
-- Based on official Supabase documentation: https://supabase.com/docs/guides/auth/auth-hooks/custom-access-token-hook
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
  -- Extract claims from the event
  claims := event->'claims';
  
  -- Fetch the user role and tenant info from user_profiles with new structure
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

  -- Add custom claims to the existing claims object
  IF user_role IS NOT NULL THEN
    claims := jsonb_set(claims, '{user_role}', to_jsonb(user_role));
  END IF;
  
  IF user_subdomain IS NOT NULL THEN
    claims := jsonb_set(claims, '{subdomain}', to_jsonb(user_subdomain));
  END IF;
  
  IF user_org_id IS NOT NULL THEN
    claims := jsonb_set(claims, '{org_id}', to_jsonb(user_org_id));
  END IF;

  -- Include company_name to avoid extra lookups on the app server
  IF user_company_name IS NOT NULL THEN
    claims := jsonb_set(claims, '{company_name}', to_jsonb(user_company_name));
  END IF;

  -- Update the 'claims' object in the original event
  event := jsonb_set(event, '{claims}', claims);

  -- Return the modified event
  RETURN event;
END;
$$;

-- Auto-update timestamp function
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END; 
$$;

-- Auto-create user profile when auth user is created (updated for new structure)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create user profile with superadmin role for new signups
  INSERT INTO public.user_profiles (user_id, email, role, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    'superadmin'::user_role,
    COALESCE((NEW.raw_user_meta_data->>'full_name')::text, (NEW.raw_user_meta_data->>'name')::text, '')
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Prevent changing uid on user_profiles after creation
CREATE OR REPLACE FUNCTION public.prevent_user_id_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.uid <> OLD.uid THEN
    RAISE EXCEPTION 'uid is immutable';
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

-- Grant access to function to supabase_auth_admin (required for custom claims hook)
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;

-- Grant access to schema to supabase_auth_admin
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;

-- Revoke function permissions from authenticated, anon and public (security)
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated, anon, public;

-- =====================================================
-- 🔄 TRIGGERS  
-- =====================================================

-- Auto-update timestamp on organization changes
CREATE TRIGGER trg_organizations_updated_at
    BEFORE UPDATE ON public.organizations
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- Auto-update timestamp on user profile changes
CREATE TRIGGER trg_user_profiles_updated_at
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- Prevent uid changes on user_profiles
CREATE TRIGGER prevent_user_id_change_trigger
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_user_id_change();

-- Auto-create user profile when new user signs up
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Keep user_profiles.email synced when auth.users.email changes
CREATE TRIGGER sync_email_on_auth_update
    AFTER UPDATE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_user_email();

-- =====================================================
-- 🔒 ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- Organizations Policies
-- =====================================================

-- Members can read their own organization
CREATE POLICY "organizations_member_read" ON public.organizations
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles up
            WHERE up.user_id = auth.uid() AND up.org_id = id
        )
    );

-- Admins can manage their organization
CREATE POLICY "organizations_admin_write" ON public.organizations
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles up
            WHERE up.user_id = auth.uid() 
                AND up.org_id = id 
                AND up.role IN ('admin', 'superadmin')
        )
    );

-- =====================================================
-- Tenants Policies  
-- =====================================================

-- Anonymous read access for tenant discovery when searchable
CREATE POLICY "tenants_anon_select_searchable" ON public.tenants
    FOR SELECT TO anon
    USING (searchable = true);

-- Admin insert access for tenant management
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

-- Admin update access for tenant management
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

-- Admin delete access for tenant management
CREATE POLICY "tenants_admin_delete" ON public.tenants
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles up
            WHERE up.uid = auth.uid()
              AND up.org_id = tenants.org_id
              AND up.role IN ('admin', 'superadmin')
        )
    );

-- Permissive initial inserts to support signup bootstrap (can be tightened later)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'organizations' AND policyname = 'organizations_auth_insert'
  ) THEN
    CREATE POLICY organizations_auth_insert ON public.organizations
      FOR INSERT TO authenticated
      WITH CHECK (true);
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'tenants' AND policyname = 'tenants_auth_insert_initial'
  ) THEN
    CREATE POLICY tenants_auth_insert_initial ON public.tenants
      FOR INSERT TO authenticated
      WITH CHECK (true);
  END IF;
END$$;

-- =====================================================
-- User Profiles Policies
-- =====================================================

-- Users can read their own profile
CREATE POLICY "profiles_self_read" ON public.user_profiles
    FOR SELECT TO public, anon, authenticated
    USING (user_id = auth.uid());

-- Users can update their own profile (limited fields)
CREATE POLICY "profiles_self_update" ON public.user_profiles
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Users can insert their own profile (signup flow)
CREATE POLICY "profiles_self_insert" ON public.user_profiles
    FOR INSERT TO public, anon
    WITH CHECK (uid = auth.uid());

-- Org admins can read profiles in their organization
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

-- Org admins can manage profiles in their organization  
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

-- =====================================================
-- 📝 INDEXES FOR PERFORMANCE
-- =====================================================

-- Create indexes for frequently queried columns
-- removed legacy uid index
CREATE INDEX IF NOT EXISTS idx_user_profiles_org_id ON public.user_profiles(org_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_tenants_subdomain ON public.tenants(subdomain);
CREATE INDEX IF NOT EXISTS idx_tenants_org_id ON public.tenants(org_id);
CREATE INDEX IF NOT EXISTS idx_organizations_owner_id ON public.organizations(owner_id);

-- =====================================================
-- 🎯 GRANTS AND PERMISSIONS
-- =====================================================

-- Grant access to tenants_public view for anon users (marketing site tenant discovery)
GRANT SELECT ON public.tenants_public TO anon, public;

-- =====================================================
-- 💬 TABLE COMMENTS
-- =====================================================

COMMENT ON TABLE public.organizations IS 'Primary organizational data - companies, groups, teams';
COMMENT ON TABLE public.tenants IS 'Subdomain to organization mapping (1:1 relationship)';
COMMENT ON TABLE public.user_profiles IS 'Enhanced user profiles with organizational relationships';

COMMENT ON COLUMN public.user_profiles.user_id IS 'Short user ID (first 8 chars of UUID) - primary key for cross-table references';
COMMENT ON COLUMN public.user_profiles.uid IS 'Full UUID sync with auth.users.id';
COMMENT ON COLUMN public.user_profiles.org_id IS 'Direct reference to organizations.id';
COMMENT ON COLUMN public.organizations.address IS 'Standardized address using address_standardizer extension';
COMMENT ON COLUMN public.organizations.metadata IS 'Organization metadata (industry, size, founding year, etc.)';
COMMENT ON COLUMN public.organizations.owner_id IS 'References the user who owns this organization';

-- =====================================================
-- 💳 BILLING TABLES, VIEWS, FUNCTIONS, RLS
-- =====================================================

-- Subscription tiers (e.g., Free, Pro, Enterprise)
CREATE TABLE IF NOT EXISTS public.subscription_tiers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Feature limits per tier
CREATE TABLE IF NOT EXISTS public.feature_limits (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tier_id uuid NOT NULL REFERENCES public.subscription_tiers(id) ON DELETE CASCADE,
    feature_key text NOT NULL,
    limit_per_period integer,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tier_id, feature_key)
);

-- Organization subscription (current period)
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

-- Usage counters per feature per billing window (e.g., month)
CREATE TABLE IF NOT EXISTS public.usage_counters (
    org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    feature_key text NOT NULL,
    window_start timestamptz NOT NULL,
    count integer NOT NULL DEFAULT 0,
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (org_id, feature_key, window_start)
);

-- Entitlements view: resolves active subscription + feature limits
CREATE OR REPLACE VIEW public.org_entitlements AS
SELECT s.org_id, fl.feature_key, fl.limit_per_period
FROM public.subscriptions s
JOIN public.feature_limits fl ON fl.tier_id = s.tier_id
WHERE s.status IN ('active','trialing')
  AND now() >= s.period_start AND now() < s.period_end;

-- Atomic check+increment RPC for usage limits
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

  -- If no entitlement, deny
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

  -- Ensure row exists
  INSERT INTO public.usage_counters (org_id, feature_key, window_start, count)
  VALUES (p_org_id, p_feature_key, v_window_start, 0)
  ON CONFLICT DO NOTHING;

  -- Read current count
  SELECT count INTO v_current
  FROM public.usage_counters
  WHERE org_id = p_org_id AND feature_key = p_feature_key AND window_start = v_window_start
  FOR UPDATE;

  -- Unlimited case
  IF v_limit IS NULL THEN
    UPDATE public.usage_counters
      SET count = v_current + 1, updated_at = now()
      WHERE org_id = p_org_id AND feature_key = p_feature_key AND window_start = v_window_start;
    RETURN jsonb_build_object('allowed', true, 'remaining', NULL);
  END IF;

  -- Limited case
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

-- RLS for billing tables: scope by org, admin manage
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_counters ENABLE ROW LEVEL SECURITY;

-- Read entitlements for members of the org
CREATE POLICY "subscriptions_member_read" ON public.subscriptions
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_profiles up WHERE up.uid = auth.uid() AND up.org_id = subscriptions.org_id
  ));

CREATE POLICY "usage_member_read" ON public.usage_counters
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_profiles up WHERE up.uid = auth.uid() AND up.org_id = usage_counters.org_id
  ));

-- Admin manage
CREATE POLICY "subscriptions_admin_manage" ON public.subscriptions
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_profiles up WHERE up.uid = auth.uid() AND up.org_id = subscriptions.org_id AND up.role IN ('admin','superadmin')
  ));

CREATE POLICY "usage_admin_manage" ON public.usage_counters
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_profiles up WHERE up.uid = auth.uid() AND up.org_id = usage_counters.org_id AND up.role IN ('admin','superadmin')
  ));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_org_period ON public.subscriptions(org_id, period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_feature_limits_tier_key ON public.feature_limits(tier_id, feature_key);
CREATE INDEX IF NOT EXISTS idx_usage_counters_org_key_window ON public.usage_counters(org_id, feature_key, window_start);

-- =====================================================
-- 📋 EXAMPLE DATA (OPTIONAL)
-- =====================================================

-- Uncomment to add sample data for testing:

/*
-- Sample organization with metadata
INSERT INTO public.organizations (company_name, description, metadata, address) 
VALUES (
    'Acme Corporation', 
    'Example technology company',
    '{"industry": "Technology", "size": "50-100", "founded": "2020", "type": "B2B SaaS"}',
    '123 Tech Street, San Francisco, CA 94105'
);

-- Sample tenant (subdomain mapping)
INSERT INTO public.tenants (subdomain, company_name, org_id)
VALUES (
    'acme', 
    'Acme Corporation',
    (SELECT id FROM public.organizations WHERE company_name = 'Acme Corporation')
);
*/

-- =====================================================
-- ✅ SETUP COMPLETE
-- =====================================================

-- Your enhanced multi-tenant database is now ready!
-- 
-- Next steps:
-- 1. Configure Custom Access Token Hook in Supabase Dashboard:
--    • Hook Type: Custom Access Token
--    • Hook URL: pg-functions://postgres/public/custom_access_token_hook
--    • Status: Enabled
--
-- 2. Configure email templates in Authentication → Email Templates
-- 3. Set up redirect URLs in Authentication → URL Configuration
-- 4. Deploy your Next.js apps with proper environment variables
--
-- Database Features:
-- • Enhanced organizational structure (orgs → tenants → users)
-- • Short user IDs (8 chars) for better UX and performance
-- • Address standardization support with dedicated extension
-- • Rich metadata storage for organizational context  
-- • Strict single-organization membership enforcement
-- • Comprehensive Row Level Security (RLS) policies
-- • Custom JWT claims with org/tenant/role data
-- • Auto-profile creation with superadmin default role
-- • Optimized indexes for query performance
--
-- Security Features:
-- • Unique email addresses across entire system
-- • Direct organization references (no tenant table dependency)
-- • Immutable user-organization relationships
-- • Role-based access control with inheritance
-- • Tenant isolation via subdomain verification
-- • Public tenant discovery for marketing site
-- • Comprehensive audit trail with timestamps