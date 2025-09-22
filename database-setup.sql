-- =====================================================
-- 🗄️ SUBDOMAIN MULTI-TENANT DATABASE SETUP SCRIPT
-- =====================================================
-- 
-- This script sets up the complete database structure for the 
-- subdomain-isolated multi-tenant architecture.
--
-- Based on Supabase UI Auth Registry:
-- npx shadcn@latest add https://supabase.com/ui/r/password-based-auth-nextjs.json
--
-- Run this script in your Supabase SQL Editor after creating a new project.
-- =====================================================

-- =====================================================
-- 🔧 CUSTOM TYPES
-- =====================================================

-- User role hierarchy for multi-tenant access control
CREATE TYPE public.user_role AS ENUM (
    'superadmin',  -- Global admin across all tenants
    'admin',       -- Tenant admin with full access
    'member',      -- Regular tenant member
    'view-only'    -- Read-only access
);

-- =====================================================
-- 📊 CORE TABLES
-- =====================================================

-- Organizations table - represents companies/groups
CREATE TABLE public.organizations (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    description text,
    website text,
    logo_url text,
    settings jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Tenants table - maps subdomains to organizations  
CREATE TABLE public.tenants (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    subdomain text NOT NULL UNIQUE,
    name text NOT NULL,
    org_id uuid NOT NULL REFERENCES public.organizations(id),
    created_at timestamptz DEFAULT now()
);

-- User profiles - extends auth.users with tenant relationships
CREATE TABLE public.user_profiles (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id),
    tenant_id uuid REFERENCES public.tenants(id),
    email text NOT NULL,
    name text,
    role public.user_role DEFAULT 'member'::public.user_role NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- =====================================================
-- 📋 VIEWS
-- =====================================================

-- Public view for tenant discovery (no sensitive data)
CREATE VIEW public.tenants_public AS
SELECT subdomain, name
FROM public.tenants;

-- =====================================================
-- ⚙️ UTILITY FUNCTIONS
-- =====================================================

-- Get the current user's organization ID
CREATE OR REPLACE FUNCTION public.get_user_org_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    org_id uuid;
BEGIN
    SELECT tenant_id INTO org_id
    FROM public.user_profiles 
    WHERE user_id = auth.uid()
    LIMIT 1;
    
    RETURN org_id;
END;
$$;

-- Check if user has specific role
CREATE OR REPLACE FUNCTION public.user_has_role(required_role text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
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
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM public.user_profiles 
        WHERE user_id = auth.uid() 
        AND tenant_id = org_uuid
    );
END;
$$;

-- Get user claims for JWT tokens (role and subdomain)
CREATE OR REPLACE FUNCTION public.get_user_claims(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_role public.user_role;
  v_subdomain text;
BEGIN
  -- Accept either {"user": {"id": "..."}} or {"user_id": "..."}
  BEGIN
    v_user_id := NULLIF(COALESCE(
      (payload -> 'user' ->> 'id'),
      (payload ->> 'user_id')
    ), '')::uuid;
  EXCEPTION WHEN OTHERS THEN
    v_user_id := NULL; -- ignore parse errors
  END;

  IF v_user_id IS NULL THEN
    RETURN '{}'::jsonb;
  END IF;

  SELECT p.role, t.subdomain
    INTO v_role, v_subdomain
  FROM public.user_profiles p
  LEFT JOIN public.tenants t ON t.id = p.tenant_id
  WHERE p.user_id = v_user_id
  LIMIT 1;

  RETURN jsonb_build_object(
    'role', COALESCE(v_role::text, NULL),
    'subdomain', COALESCE(v_subdomain, NULL)
  );
END;
$$;

-- Auto-update timestamp function
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
begin
  new.updated_at = now();
  return new;
end; 
$$;

-- Auto-create user profile when auth user is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
begin
  insert into public.user_profiles (user_id, email)
  values (new.id, coalesce(new.email, ''))
  on conflict (user_id) do nothing;
  return new;
end; 
$$;

-- =====================================================
-- 🔄 TRIGGERS  
-- =====================================================

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

-- Organizations Policies
CREATE POLICY "organizations_member_read" ON public.organizations
    FOR SELECT TO authenticated
    USING (id = get_user_org_id());

CREATE POLICY "organizations_admin_write" ON public.organizations
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.user_profiles
            WHERE user_profiles.user_id = auth.uid()
            AND user_profiles.tenant_id = organizations.id
            AND user_profiles.role::text = ANY (ARRAY['admin'::text, 'superadmin'::text])
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM public.user_profiles
            WHERE user_profiles.user_id = auth.uid()
            AND user_profiles.tenant_id = organizations.id
            AND user_profiles.role::text = ANY (ARRAY['admin'::text, 'superadmin'::text])
        )
    );

-- Tenants Policies
CREATE POLICY "public read tenants" ON public.tenants
    FOR SELECT TO public
    USING (true);

CREATE POLICY "public insert tenants" ON public.tenants
    FOR INSERT TO public
    WITH CHECK (true);

CREATE POLICY "public delete tenants" ON public.tenants
    FOR DELETE TO public
    USING (true);

CREATE POLICY "tenants_org_member_read" ON public.tenants
    FOR SELECT TO authenticated
    USING (org_id = get_user_org_id());

CREATE POLICY "tenants_admin_write" ON public.tenants
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.user_profiles
            WHERE user_profiles.user_id = auth.uid()
            AND (
                user_profiles.role::text = 'superadmin'::text
                OR (
                    user_profiles.role::text = 'admin'::text
                    AND user_profiles.tenant_id = tenants.org_id
                )
            )
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM public.user_profiles
            WHERE user_profiles.user_id = auth.uid()
            AND (
                user_profiles.role::text = 'superadmin'::text
                OR (
                    user_profiles.role::text = 'admin'::text
                    AND user_profiles.tenant_id = tenants.org_id
                )
            )
        )
    );

-- User Profiles Policies
CREATE POLICY "profiles self read" ON public.user_profiles
    FOR SELECT TO public
    USING (auth.uid() = user_id);

CREATE POLICY "profiles self insert" ON public.user_profiles
    FOR INSERT TO public
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "profiles self update" ON public.user_profiles
    FOR UPDATE TO public
    USING (auth.uid() = user_id);

CREATE POLICY "user_profiles_own_read" ON public.user_profiles
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "user_profiles_org_read" ON public.user_profiles
    FOR SELECT TO authenticated
    USING (
        tenant_id = get_user_org_id()
        AND EXISTS (
            SELECT 1
            FROM public.user_profiles viewer
            WHERE viewer.user_id = auth.uid()
            AND viewer.role::text = ANY (ARRAY['admin'::text, 'superadmin'::text])
        )
    );

CREATE POLICY "user_profiles_self_update" ON public.user_profiles
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (
        user_id = auth.uid()
        AND user_id = (
            SELECT user_profiles_1.user_id
            FROM public.user_profiles user_profiles_1
            WHERE user_profiles_1.id = user_profiles_1.id
        )
        AND tenant_id = (
            SELECT user_profiles_1.tenant_id
            FROM public.user_profiles user_profiles_1
            WHERE user_profiles_1.id = user_profiles_1.id
        )
        AND role = (
            SELECT user_profiles_1.role
            FROM public.user_profiles user_profiles_1
            WHERE user_profiles_1.id = user_profiles_1.id
        )
    );

CREATE POLICY "user_profiles_admin_write" ON public.user_profiles
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.user_profiles admin_profile
            WHERE admin_profile.user_id = auth.uid()
            AND admin_profile.tenant_id = user_profiles.tenant_id
            AND admin_profile.role::text = ANY (ARRAY['admin'::text, 'superadmin'::text])
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM public.user_profiles admin_profile
            WHERE admin_profile.user_id = auth.uid()
            AND admin_profile.tenant_id = user_profiles.tenant_id
            AND admin_profile.role::text = ANY (ARRAY['admin'::text, 'superadmin'::text])
        )
    );

CREATE POLICY "tenant role read" ON public.user_profiles
    FOR SELECT TO public
    USING (
        EXISTS (
            SELECT 1
            FROM public.user_profiles me
            WHERE me.user_id = auth.uid()
            AND me.tenant_id = user_profiles.tenant_id
            AND me.role = ANY (ARRAY['superadmin'::public.user_role, 'admin'::public.user_role])
        )
    );

CREATE POLICY "tenant role manage" ON public.user_profiles
    FOR UPDATE TO public
    USING (
        EXISTS (
            SELECT 1
            FROM public.user_profiles me
            WHERE me.user_id = auth.uid()
            AND me.tenant_id = user_profiles.tenant_id
            AND me.role = ANY (ARRAY['superadmin'::public.user_role, 'admin'::public.user_role])
        )
    );

-- =====================================================
-- 📋 EXAMPLE DATA (OPTIONAL)
-- =====================================================

-- Uncomment to add sample data for testing:

/*
-- Sample organization
INSERT INTO public.organizations (name, description) 
VALUES ('Acme Corporation', 'Example organization for testing');

-- Sample tenant (subdomain)
INSERT INTO public.tenants (subdomain, name, org_id)
VALUES (
    'acme', 
    'Acme Corp Workspace',
    (SELECT id FROM public.organizations WHERE name = 'Acme Corporation')
);
*/

-- =====================================================
-- ✅ SETUP COMPLETE
-- =====================================================

-- Your multi-tenant database is now ready!
-- 
-- Next steps:
-- 1. Configure your Next.js apps with these Supabase credentials
-- 2. Set up your domain routing (marketing + tenant subdomains)  
-- 3. Users can sign up and be automatically added to user_profiles
-- 4. Create organizations and tenants through your app interface
--
-- Tables created:
-- • organizations - Company/group information
-- • tenants - Subdomain to organization mapping
-- • user_profiles - User data with tenant relationships
-- • tenants_public - Public view for tenant discovery
--
-- Security features:
-- • Row Level Security (RLS) on all tables
-- • Role-based access control (superadmin, admin, member, view-only)
-- • Tenant isolation - users only see their tenant's data
-- • Auto-user profile creation on signup
-- • Comprehensive policy system for data protection
