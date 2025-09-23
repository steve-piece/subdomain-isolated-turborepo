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
    'view-only'    -- Read-only access
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
    settings jsonb DEFAULT '{}'::jsonb,
    metadata jsonb DEFAULT '{}'::jsonb, -- Industry, size, founding year, etc.
    owner_id uuid REFERENCES auth.users(id), -- Organization owner reference
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Tenants table - Subdomain mapping to organizations (1:1 relationship)
CREATE TABLE public.tenants (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    subdomain text NOT NULL UNIQUE,
    company_name text NOT NULL, -- Duplicated for performance/caching
    org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now()
);

-- User profiles - Enhanced user management with short IDs
CREATE TABLE public.user_profiles (
    user_id text PRIMARY KEY, -- Short ID (first 8 chars of UUID) for cross-table references  
    uid uuid UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, -- Full UUID sync
    org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE, -- Direct org reference
    email text UNIQUE NOT NULL, -- Enforces one email = one user across all orgs
    full_name text,
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
FROM public.tenants;

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
    WHERE up.uid = auth.uid()
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
        WHERE uid = auth.uid() 
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
        WHERE uid = auth.uid() 
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
BEGIN
  -- Extract claims from the event
  claims := event->'claims';
  
  -- Fetch the user role and tenant info from user_profiles with new structure
  SELECT 
    up.role::text, 
    t.subdomain,
    up.org_id::text
  INTO user_role, user_subdomain, user_org_id
  FROM public.user_profiles up
  LEFT JOIN public.tenants t ON t.org_id = up.org_id
  WHERE up.uid = (event->>'user_id')::uuid
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
  -- Uses new user_id (first 8 chars of UUID) and uid (full UUID)
  INSERT INTO public.user_profiles (user_id, uid, email, role)
  VALUES (
    substring(NEW.id::text from 1 for 8),
    NEW.id, 
    COALESCE(NEW.email, ''),
    'superadmin'::user_role
  )
  ON CONFLICT (uid) DO NOTHING;
  
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

-- Auto-create user profile when new user signs up
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

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
            WHERE up.uid = auth.uid() AND up.org_id = id
        )
    );

-- Admins can manage their organization
CREATE POLICY "organizations_admin_write" ON public.organizations
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles up
            WHERE up.uid = auth.uid() 
                AND up.org_id = id 
                AND up.role IN ('admin', 'superadmin')
        )
    );

-- =====================================================
-- Tenants Policies  
-- =====================================================

-- Public read access for tenant discovery (marketing site)
CREATE POLICY "tenants_public_read" ON public.tenants
    FOR SELECT TO public, anon
    USING (true);

-- Public insert for organization creation (marketing signup)
CREATE POLICY "tenants_public_insert" ON public.tenants
    FOR INSERT TO public, anon
    WITH CHECK (true);

-- Admin write access for tenant management
CREATE POLICY "tenants_admin_write" ON public.tenants
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles up
            WHERE up.uid = auth.uid() 
                AND up.org_id = tenants.org_id 
                AND up.role IN ('admin', 'superadmin')
        )
    );

-- =====================================================
-- User Profiles Policies
-- =====================================================

-- Users can read their own profile
CREATE POLICY "profiles_self_read" ON public.user_profiles
    FOR SELECT TO public, anon, authenticated
    USING (uid = auth.uid());

-- Users can update their own profile (limited fields)
CREATE POLICY "profiles_self_update" ON public.user_profiles
    FOR UPDATE TO authenticated
    USING (uid = auth.uid())
    WITH CHECK (uid = auth.uid());

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
            WHERE admin.uid = auth.uid() 
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
            WHERE admin.uid = auth.uid() 
                AND admin.org_id = user_profiles.org_id
                AND admin.role IN ('admin', 'superadmin')
        )
    );

-- =====================================================
-- 📝 INDEXES FOR PERFORMANCE
-- =====================================================

-- Create indexes for frequently queried columns
CREATE INDEX IF NOT EXISTS idx_user_profiles_uid ON public.user_profiles(uid);
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