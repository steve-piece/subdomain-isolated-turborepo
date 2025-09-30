-- ============================================================================
-- MIGRATION: Settings UI Integration + RBAC Implementation
-- ============================================================================
-- This migration adds:
-- 1. User settings (profile, notifications, security)
-- 2. Organization settings (metadata, preferences)
-- 3. Projects and permissions (RBAC)
-- 4. Capabilities system
-- 5. Clean RLS policies
-- ============================================================================

BEGIN;

-- ============================================================================
-- SECTION 1: USER SETTINGS TABLES
-- ============================================================================

-- Add user profile columns to user_profiles table
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ DEFAULT now();

-- Create user notification preferences table
CREATE TABLE IF NOT EXISTS public.user_notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Email Notifications
  email_account_activity BOOLEAN NOT NULL DEFAULT true,
  email_team_updates BOOLEAN NOT NULL DEFAULT true,
  email_project_activity BOOLEAN NOT NULL DEFAULT false,
  email_marketing BOOLEAN NOT NULL DEFAULT false,
  
  -- In-App Notifications
  push_notifications BOOLEAN NOT NULL DEFAULT false,
  sound_alerts BOOLEAN NOT NULL DEFAULT true,
  
  -- Communication Preferences
  email_digest_frequency TEXT NOT NULL DEFAULT 'realtime' CHECK (email_digest_frequency IN ('realtime', 'daily', 'weekly', 'never')),
  
  -- Quiet Hours
  quiet_hours_enabled BOOLEAN NOT NULL DEFAULT false,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for user notification preferences
CREATE INDEX IF NOT EXISTS idx_user_notification_preferences_user_id 
ON public.user_notification_preferences(user_id);

-- Create user security settings table (for 2FA and other security features)
CREATE TABLE IF NOT EXISTS public.user_security_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- MFA Settings
  mfa_enabled BOOLEAN NOT NULL DEFAULT false,
  mfa_enrolled_at TIMESTAMPTZ,
  
  -- Password Management
  password_last_changed_at TIMESTAMPTZ DEFAULT now(),
  
  -- Session Management
  max_concurrent_sessions INTEGER DEFAULT 5,
  session_timeout_minutes INTEGER DEFAULT 10080, -- 7 days default
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_security_settings_user_id 
ON public.user_security_settings(user_id);

-- ============================================================================
-- SECTION 2: ORGANIZATION SETTINGS
-- ============================================================================

-- Add organization metadata columns
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS website_url TEXT,
ADD COLUMN IF NOT EXISTS support_email TEXT,
ADD COLUMN IF NOT EXISTS business_address TEXT,
ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Create organization settings table for additional preferences
CREATE TABLE IF NOT EXISTS public.organization_settings (
  org_id UUID PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Team Settings
  require_admin_approval_for_invites BOOLEAN NOT NULL DEFAULT false,
  allow_member_invites BOOLEAN NOT NULL DEFAULT false,
  
  -- Security Settings
  enforce_2fa BOOLEAN NOT NULL DEFAULT false,
  session_timeout_minutes INTEGER DEFAULT 10080,
  
  -- Project Settings
  default_project_visibility TEXT DEFAULT 'private' CHECK (default_project_visibility IN ('private', 'team', 'public')),
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_organization_settings_org_id 
ON public.organization_settings(org_id);

-- ============================================================================
-- SECTION 3: PROJECTS & PERMISSIONS (RBAC)
-- ============================================================================

-- Create project permission level enum
DO $$ BEGIN
  CREATE TYPE project_permission_level AS ENUM ('read', 'write', 'admin');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create projects table
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,

  -- Ownership & Status
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted')),

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  settings JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT unique_project_name_per_org UNIQUE (org_id, name)
);

-- Indexes for projects
CREATE INDEX IF NOT EXISTS idx_projects_org_id ON public.projects(org_id);
CREATE INDEX IF NOT EXISTS idx_projects_owner_id ON public.projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status) WHERE status = 'active';

-- Create project permissions table
CREATE TABLE IF NOT EXISTS public.project_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Permission level
  permission_level project_permission_level NOT NULL DEFAULT 'read',

  -- Granted by
  granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT unique_project_user_permission UNIQUE (project_id, user_id)
);

-- Indexes for project permissions
CREATE INDEX IF NOT EXISTS idx_project_permissions_project_id ON public.project_permissions(project_id);
CREATE INDEX IF NOT EXISTS idx_project_permissions_user_id ON public.project_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_project_permissions_level ON public.project_permissions(permission_level);

-- ============================================================================
-- SECTION 4: CAPABILITIES SYSTEM
-- ============================================================================

-- Create capabilities table
CREATE TABLE IF NOT EXISTS public.capabilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE, -- e.g., 'projects.create', 'team.invite'
  name TEXT NOT NULL,
  description TEXT,
  category TEXT, -- e.g., 'projects', 'team', 'billing', 'analytics'

  -- Subscription gating
  requires_tier_id UUID REFERENCES public.subscription_tiers(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_capabilities_category ON public.capabilities(category);
CREATE INDEX IF NOT EXISTS idx_capabilities_tier ON public.capabilities(requires_tier_id);

-- Create role capabilities mapping
CREATE TABLE IF NOT EXISTS public.role_capabilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role user_role NOT NULL,
  capability_id UUID NOT NULL REFERENCES public.capabilities(id) ON DELETE CASCADE,

  -- Is this capability granted by default for this role?
  is_default BOOLEAN NOT NULL DEFAULT true,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT unique_role_capability UNIQUE (role, capability_id)
);

CREATE INDEX IF NOT EXISTS idx_role_capabilities_role ON public.role_capabilities(role);

-- Create organization custom role capabilities
CREATE TABLE IF NOT EXISTS public.org_role_capabilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role user_role NOT NULL,
  capability_id UUID NOT NULL REFERENCES public.capabilities(id) ON DELETE CASCADE,

  -- true = grant, false = revoke
  granted BOOLEAN NOT NULL,

  -- Only available on certain subscription tiers
  requires_min_tier_id UUID REFERENCES public.subscription_tiers(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT unique_org_role_capability UNIQUE (org_id, role, capability_id)
);

CREATE INDEX IF NOT EXISTS idx_org_role_capabilities_org ON public.org_role_capabilities(org_id);

-- ============================================================================
-- SECTION 5: SEED DEFAULT CAPABILITIES
-- ============================================================================

-- Insert default capabilities (only if they don't exist)
INSERT INTO public.capabilities (key, name, description, category) VALUES
  -- Project Management
  ('projects.create', 'Create Projects', 'Create new projects', 'projects'),
  ('projects.view', 'View Projects', 'View all org projects', 'projects'),
  ('projects.edit', 'Edit Projects', 'Edit project settings', 'projects'),
  ('projects.delete', 'Delete Projects', 'Delete projects', 'projects'),
  ('projects.archive', 'Archive Projects', 'Archive projects', 'projects'),
  
  -- Team Management
  ('team.invite', 'Invite Members', 'Invite new team members', 'team'),
  ('team.remove', 'Remove Members', 'Remove team members', 'team'),
  ('team.view', 'View Team', 'View team members', 'team'),
  ('team.manage_roles', 'Manage Roles', 'Change member roles', 'team'),
  
  -- Billing & Subscription
  ('billing.view', 'View Billing', 'View billing information', 'billing'),
  ('billing.manage', 'Manage Billing', 'Update billing details', 'billing'),
  ('subscription.upgrade', 'Upgrade Subscription', 'Upgrade subscription tier', 'billing'),
  
  -- Organization Settings
  ('org.settings.view', 'View Settings', 'View org settings', 'organization'),
  ('org.settings.edit', 'Edit Settings', 'Edit org settings', 'organization'),
  ('org.delete', 'Delete Organization', 'Delete organization', 'organization'),
  
  -- Analytics & Reports
  ('analytics.view', 'View Analytics', 'View usage analytics', 'analytics'),
  ('reports.generate', 'Generate Reports', 'Generate usage reports', 'analytics'),
  ('reports.export', 'Export Reports', 'Export report data', 'analytics')
ON CONFLICT (key) DO NOTHING;

-- Map capabilities to roles (only if they don't exist)
-- OWNER - Full access to everything
INSERT INTO public.role_capabilities (role, capability_id, is_default)
SELECT 'owner'::user_role, id, true FROM public.capabilities
ON CONFLICT (role, capability_id) DO NOTHING;

-- SUPERADMIN - All access except org deletion
INSERT INTO public.role_capabilities (role, capability_id, is_default)
SELECT 'superadmin'::user_role, id, true FROM public.capabilities
WHERE key != 'org.delete'
ON CONFLICT (role, capability_id) DO NOTHING;

-- ADMIN - Team and project management
INSERT INTO public.role_capabilities (role, capability_id, is_default)
SELECT 'admin'::user_role, id, true FROM public.capabilities
WHERE category IN ('projects', 'team')
   OR key IN ('analytics.view', 'reports.generate', 'org.settings.view')
ON CONFLICT (role, capability_id) DO NOTHING;

-- MEMBER - Basic project and team viewing
INSERT INTO public.role_capabilities (role, capability_id, is_default)
SELECT 'member'::user_role, id, true FROM public.capabilities
WHERE key IN ('projects.view', 'projects.create', 'team.view')
ON CONFLICT (role, capability_id) DO NOTHING;

-- VIEW-ONLY - Read-only access
INSERT INTO public.role_capabilities (role, capability_id, is_default)
SELECT 'view-only'::user_role, id, true FROM public.capabilities
WHERE key IN ('projects.view', 'team.view', 'analytics.view')
ON CONFLICT (role, capability_id) DO NOTHING;

-- ============================================================================
-- SECTION 6: HELPER FUNCTIONS
-- ============================================================================

-- Generic helper to check if user is in org and optionally check role
CREATE OR REPLACE FUNCTION public.user_org_access(
  p_user_id UUID,
  p_org_id UUID,
  p_required_roles user_role[] DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
STABLE
AS $$
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
$$;

-- Check if user has a specific capability
CREATE OR REPLACE FUNCTION public.user_org_capability(
  p_user_id UUID,
  p_org_id UUID,
  p_capability_key TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
STABLE
AS $$
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
$$;

-- Check project access
CREATE OR REPLACE FUNCTION public.user_project_access(
  p_user_id UUID,
  p_project_id UUID,
  p_required_permission project_permission_level DEFAULT 'read'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
STABLE
AS $$
DECLARE
  v_org_id UUID;
  v_user_role user_role;
  v_project_owner UUID;
  v_user_permission project_permission_level;
  v_permission_hierarchy TEXT[] := ARRAY['read', 'write', 'admin'];
BEGIN
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
END;
$$;

-- ============================================================================
-- SECTION 7: TRIGGERS
-- ============================================================================

-- Update timestamps trigger function (if not exists)
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Apply update triggers to new tables
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'user_notification_preferences_updated_at'
  ) THEN
    CREATE TRIGGER user_notification_preferences_updated_at
      BEFORE UPDATE ON public.user_notification_preferences
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'user_security_settings_updated_at'
  ) THEN
    CREATE TRIGGER user_security_settings_updated_at
      BEFORE UPDATE ON public.user_security_settings
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'organization_settings_updated_at'
  ) THEN
    CREATE TRIGGER organization_settings_updated_at
      BEFORE UPDATE ON public.organization_settings
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'projects_updated_at'
  ) THEN
    CREATE TRIGGER projects_updated_at
      BEFORE UPDATE ON public.projects
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'project_permissions_updated_at'
  ) THEN
    CREATE TRIGGER project_permissions_updated_at
      BEFORE UPDATE ON public.project_permissions
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'capabilities_updated_at'
  ) THEN
    CREATE TRIGGER capabilities_updated_at
      BEFORE UPDATE ON public.capabilities
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'org_role_capabilities_updated_at'
  ) THEN
    CREATE TRIGGER org_role_capabilities_updated_at
      BEFORE UPDATE ON public.org_role_capabilities
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_updated_at();
  END IF;
END $$;

-- Auto-assign creator permissions to projects
CREATE OR REPLACE FUNCTION public.handle_new_project()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- Automatically grant admin permission to project creator
  INSERT INTO public.project_permissions (project_id, user_id, permission_level, granted_by)
  VALUES (NEW.id, NEW.owner_id, 'admin', NEW.owner_id);

  RETURN NEW;
END;
$$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_project_created'
  ) THEN
    CREATE TRIGGER on_project_created
      AFTER INSERT ON public.projects
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_new_project();
  END IF;
END $$;

-- Auto-create default settings for new users
CREATE OR REPLACE FUNCTION public.handle_new_user_settings()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- Create default notification preferences
  INSERT INTO public.user_notification_preferences (user_id)
  VALUES (NEW.user_id)
  ON CONFLICT (user_id) DO NOTHING;

  -- Create default security settings
  INSERT INTO public.user_security_settings (user_id)
  VALUES (NEW.user_id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_user_profile_created'
  ) THEN
    CREATE TRIGGER on_user_profile_created
      AFTER INSERT ON public.user_profiles
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_new_user_settings();
  END IF;
END $$;

-- Auto-create default settings for new organizations
CREATE OR REPLACE FUNCTION public.handle_new_org_settings()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- Create default organization settings
  INSERT INTO public.organization_settings (org_id)
  VALUES (NEW.id)
  ON CONFLICT (org_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_organization_created'
  ) THEN
    CREATE TRIGGER on_organization_created
      AFTER INSERT ON public.organizations
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_new_org_settings();
  END IF;
END $$;

-- ============================================================================
-- SECTION 8: ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE public.user_notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_security_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.capabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_capabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_role_capabilities ENABLE ROW LEVEL SECURITY;

-- User Notification Preferences RLS
CREATE POLICY "select_own_notification_preferences"
ON public.user_notification_preferences FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "update_own_notification_preferences"
ON public.user_notification_preferences FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "service_all_notification_preferences"
ON public.user_notification_preferences FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- User Security Settings RLS
CREATE POLICY "select_own_security_settings"
ON public.user_security_settings FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "update_own_security_settings"
ON public.user_security_settings FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "service_all_security_settings"
ON public.user_security_settings FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Organization Settings RLS
CREATE POLICY "select_organization_settings"
ON public.organization_settings FOR SELECT
TO authenticated
USING (
  user_org_access(auth.uid(), org_id)
);

CREATE POLICY "manage_organization_settings"
ON public.organization_settings FOR ALL
TO authenticated
USING (
  user_org_access(auth.uid(), org_id, ARRAY['owner', 'superadmin', 'admin']::user_role[])
)
WITH CHECK (
  user_org_access(auth.uid(), org_id, ARRAY['owner', 'superadmin', 'admin']::user_role[])
);

CREATE POLICY "service_all_organization_settings"
ON public.organization_settings FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Projects RLS
CREATE POLICY "select_projects"
ON public.projects FOR SELECT
TO authenticated
USING (
  user_org_access(auth.uid(), org_id, ARRAY['owner', 'superadmin']::user_role[])
  OR owner_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.project_permissions pp
    WHERE pp.project_id = projects.id AND pp.user_id = auth.uid()
  )
);

CREATE POLICY "insert_projects"
ON public.projects FOR INSERT
TO authenticated
WITH CHECK (
  user_org_capability(auth.uid(), org_id, 'projects.create')
);

CREATE POLICY "update_projects"
ON public.projects FOR UPDATE
TO authenticated
USING (
  user_project_access(auth.uid(), id, 'write')
)
WITH CHECK (
  user_project_access(auth.uid(), id, 'write')
);

CREATE POLICY "delete_projects"
ON public.projects FOR DELETE
TO authenticated
USING (
  user_org_capability(auth.uid(), org_id, 'projects.delete')
  AND user_project_access(auth.uid(), id, 'admin')
);

CREATE POLICY "service_all_projects"
ON public.projects FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Project Permissions RLS
CREATE POLICY "select_project_permissions"
ON public.project_permissions FOR SELECT
TO authenticated
USING (
  user_project_access(auth.uid(), project_id, 'read')
);

CREATE POLICY "manage_project_permissions"
ON public.project_permissions FOR ALL
TO authenticated
USING (
  user_project_access(auth.uid(), project_id, 'admin')
)
WITH CHECK (
  user_project_access(auth.uid(), project_id, 'admin')
);

CREATE POLICY "service_all_project_permissions"
ON public.project_permissions FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Capabilities RLS (read-only for authenticated users)
CREATE POLICY "select_capabilities"
ON public.capabilities FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "service_all_capabilities"
ON public.capabilities FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Role Capabilities RLS (read-only for authenticated users)
CREATE POLICY "select_role_capabilities"
ON public.role_capabilities FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "service_all_role_capabilities"
ON public.role_capabilities FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Org Role Capabilities RLS
CREATE POLICY "select_org_role_capabilities"
ON public.org_role_capabilities FOR SELECT
TO authenticated
USING (
  user_org_access(auth.uid(), org_id)
);

CREATE POLICY "manage_org_role_capabilities"
ON public.org_role_capabilities FOR ALL
TO authenticated
USING (
  user_org_access(auth.uid(), org_id, ARRAY['owner', 'superadmin']::user_role[])
)
WITH CHECK (
  user_org_access(auth.uid(), org_id, ARRAY['owner', 'superadmin']::user_role[])
);

CREATE POLICY "service_all_org_role_capabilities"
ON public.org_role_capabilities FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================================
-- SECTION 9: UPDATE SUBSCRIPTION TIERS FOR FEATURE GATING
-- ============================================================================

-- Add feature gating columns to subscription_tiers
ALTER TABLE public.subscription_tiers
ADD COLUMN IF NOT EXISTS allows_custom_permissions BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS max_projects INTEGER,
ADD COLUMN IF NOT EXISTS max_team_members INTEGER;

COMMIT;
