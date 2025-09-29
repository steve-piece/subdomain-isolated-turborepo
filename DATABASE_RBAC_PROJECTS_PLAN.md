# Database Architecture Plan: Projects & RBAC

## Overview

This document outlines the database schema and policies for implementing project management with granular permissions and a flexible RBAC (Role-Based Access Control) system with feature capabilities.

---

## 1. Projects Table

### Purpose

Store organization-scoped projects with ownership tracking and metadata.

### Schema

```sql
CREATE TABLE public.projects (
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

-- Indexes
CREATE INDEX idx_projects_org_id ON public.projects(org_id);
CREATE INDEX idx_projects_owner_id ON public.projects(owner_id);
CREATE INDEX idx_projects_status ON public.projects(status) WHERE status = 'active';
```

---

## 2. Project Permissions Table

### Purpose

Define granular, per-project access control for users. This is separate from org-level roles.

### Permission Levels

- `read` - Can view project and its contents
- `write` - Can edit project contents and settings
- `admin` - Can manage project members and delete project (owner-equivalent at project level)

### Schema

```sql
CREATE TYPE project_permission_level AS ENUM ('read', 'write', 'admin');

CREATE TABLE public.project_permissions (
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

-- Indexes
CREATE INDEX idx_project_permissions_project_id ON public.project_permissions(project_id);
CREATE INDEX idx_project_permissions_user_id ON public.project_permissions(user_id);
CREATE INDEX idx_project_permissions_level ON public.project_permissions(permission_level);
```

### Default Permission Rules

When a project is created:

1. **Project Creator** → Gets `admin` permission automatically
2. **Organization Owner** → Inherits access via org-level role (can override project permissions)
3. **Organization Superadmin** → Inherits access via org-level role (can reassign project ownership, except for other superadmins)

---

## 3. RBAC Feature Capabilities Matrix

### Purpose

Define what features/capabilities each organization role can access at the **application level** (not project-specific). This enables subscription-based feature gating and custom permission sets.

### Industry Standard Approach

The standard approach is a **capability-based permissions system** with:

- **Capabilities** - Atomic permissions (e.g., `projects.create`, `billing.view`)
- **Roles** - Collections of capabilities
- **Subscription Tiers** - Define which capabilities are available

### Schema

```sql
-- Define all possible app capabilities
CREATE TABLE public.capabilities (
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

-- Map capabilities to org-level roles (default capabilities per role)
CREATE TABLE public.role_capabilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role user_role NOT NULL, -- superadmin, admin, member, view-only, owner
  capability_id UUID NOT NULL REFERENCES public.capabilities(id) ON DELETE CASCADE,

  -- Is this capability granted by default for this role?
  is_default BOOLEAN NOT NULL DEFAULT true,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT unique_role_capability UNIQUE (role, capability_id)
);

-- Custom capability overrides per organization (subscription-based customization)
-- Allows orgs on higher tiers to customize role permissions
CREATE TABLE public.org_role_capabilities (
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

-- Indexes
CREATE INDEX idx_capabilities_category ON public.capabilities(category);
CREATE INDEX idx_capabilities_tier ON public.capabilities(requires_tier_id);
CREATE INDEX idx_role_capabilities_role ON public.role_capabilities(role);
CREATE INDEX idx_org_role_capabilities_org ON public.org_role_capabilities(org_id);
```

---

## 4. Sample Capabilities

Here are example capabilities to seed the system:

```sql
-- Project Management
INSERT INTO public.capabilities (key, name, description, category) VALUES
  ('projects.create', 'Create Projects', 'Create new projects', 'projects'),
  ('projects.view', 'View Projects', 'View all org projects', 'projects'),
  ('projects.edit', 'Edit Projects', 'Edit project settings', 'projects'),
  ('projects.delete', 'Delete Projects', 'Delete projects', 'projects'),
  ('projects.archive', 'Archive Projects', 'Archive projects', 'projects');

-- Team Management
INSERT INTO public.capabilities (key, name, description, category) VALUES
  ('team.invite', 'Invite Members', 'Invite new team members', 'team'),
  ('team.remove', 'Remove Members', 'Remove team members', 'team'),
  ('team.view', 'View Team', 'View team members', 'team'),
  ('team.manage_roles', 'Manage Roles', 'Change member roles', 'team');

-- Billing & Subscription
INSERT INTO public.capabilities (key, name, description, category) VALUES
  ('billing.view', 'View Billing', 'View billing information', 'billing'),
  ('billing.manage', 'Manage Billing', 'Update billing details', 'billing'),
  ('subscription.upgrade', 'Upgrade Subscription', 'Upgrade subscription tier', 'billing');

-- Organization Settings
INSERT INTO public.capabilities (key, name, description, category) VALUES
  ('org.settings.view', 'View Settings', 'View org settings', 'organization'),
  ('org.settings.edit', 'Edit Settings', 'Edit org settings', 'organization'),
  ('org.delete', 'Delete Organization', 'Delete organization', 'organization');

-- Analytics & Reports
INSERT INTO public.capabilities (key, name, description, category) VALUES
  ('analytics.view', 'View Analytics', 'View usage analytics', 'analytics'),
  ('reports.generate', 'Generate Reports', 'Generate usage reports', 'analytics'),
  ('reports.export', 'Export Reports', 'Export report data', 'analytics');
```

---

## 5. Default Role Capabilities Mapping

```sql
-- OWNER - Full access to everything
INSERT INTO public.role_capabilities (role, capability_id, is_default)
SELECT 'owner', id, true FROM public.capabilities;

-- SUPERADMIN - All access except org deletion
INSERT INTO public.role_capabilities (role, capability_id, is_default)
SELECT 'superadmin', id, true FROM public.capabilities
WHERE key != 'org.delete';

-- ADMIN - Team and project management
INSERT INTO public.role_capabilities (role, capability_id, is_default)
SELECT 'admin', id, true FROM public.capabilities
WHERE category IN ('projects', 'team')
   OR key IN ('analytics.view', 'reports.generate', 'org.settings.view');

-- MEMBER - Basic project and team viewing
INSERT INTO public.role_capabilities (role, capability_id, is_default)
SELECT 'member', id, true FROM public.capabilities
WHERE key IN ('projects.view', 'projects.create', 'team.view');

-- VIEW-ONLY - Read-only access
INSERT INTO public.role_capabilities (role, capability_id, is_default)
SELECT 'view-only', id, true FROM public.capabilities
WHERE key IN ('projects.view', 'team.view', 'analytics.view');
```

---

## 6. Helper Functions (Generic Names)

### Master Organization Access Check

```sql
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
```

### Project Access Check

```sql
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
```

---

## 7. Row Level Security (RLS) Policies - CLEANED UP

### Projects RLS

```sql
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can view projects they have access to
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

-- INSERT: Users can create projects if they have the capability
CREATE POLICY "insert_projects"
ON public.projects FOR INSERT
TO authenticated
WITH CHECK (
  user_org_capability(auth.uid(), org_id, 'projects.create')
);

-- UPDATE: Users can update projects with write access
CREATE POLICY "update_projects"
ON public.projects FOR UPDATE
TO authenticated
USING (
  user_project_access(auth.uid(), id, 'write')
)
WITH CHECK (
  user_project_access(auth.uid(), id, 'write')
);

-- DELETE: Users can delete projects with capability and admin access
CREATE POLICY "delete_projects"
ON public.projects FOR DELETE
TO authenticated
USING (
  user_org_capability(auth.uid(), org_id, 'projects.delete')
  AND user_project_access(auth.uid(), id, 'admin')
);

-- Service role has full access
CREATE POLICY "service_all_projects"
ON public.projects FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
```

### Project Permissions RLS

```sql
ALTER TABLE public.project_permissions ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can view permissions for projects they can access
CREATE POLICY "select_project_permissions"
ON public.project_permissions FOR SELECT
TO authenticated
USING (
  user_project_access(auth.uid(), project_id, 'read')
);

-- INSERT/UPDATE/DELETE: Only admins can manage permissions
CREATE POLICY "manage_project_permissions"
ON public.project_permissions FOR ALL
TO authenticated
USING (
  user_project_access(auth.uid(), project_id, 'admin')
)
WITH CHECK (
  user_project_access(auth.uid(), project_id, 'admin')
);

-- Service role has full access
CREATE POLICY "service_all_project_permissions"
ON public.project_permissions FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
```

### Organizations RLS - CLEANED UP

```sql
-- Drop all existing org policies
DROP POLICY IF EXISTS "organizations_owner_delete" ON public.organizations;
DROP POLICY IF EXISTS "organizations_owner_delete_split" ON public.organizations;
DROP POLICY IF EXISTS "organizations_owner_insert" ON public.organizations;
DROP POLICY IF EXISTS "organizations_owner_select" ON public.organizations;
DROP POLICY IF EXISTS "organizations_owner_update" ON public.organizations;
DROP POLICY IF EXISTS "organizations_owner_update_split" ON public.organizations;
DROP POLICY IF EXISTS "organizations_service_delete" ON public.organizations;
DROP POLICY IF EXISTS "organizations_service_insert" ON public.organizations;
DROP POLICY IF EXISTS "organizations_service_select" ON public.organizations;
DROP POLICY IF EXISTS "organizations_service_update" ON public.organizations;

-- CREATE CLEAN POLICIES
-- SELECT: Members can view their organization
CREATE POLICY "select_organizations"
ON public.organizations FOR SELECT
TO authenticated
USING (
  user_org_access(auth.uid(), id)
);

-- INSERT: Any authenticated user (for signup flow)
CREATE POLICY "insert_organizations"
ON public.organizations FOR INSERT
TO authenticated
WITH CHECK (
  owner_id = auth.uid()
);

-- UPDATE: Owner or superadmin/admin can update
CREATE POLICY "update_organizations"
ON public.organizations FOR UPDATE
TO authenticated
USING (
  user_org_access(auth.uid(), id, ARRAY['owner', 'superadmin', 'admin']::user_role[])
)
WITH CHECK (
  user_org_access(auth.uid(), id, ARRAY['owner', 'superadmin', 'admin']::user_role[])
);

-- DELETE: Only owner can delete
CREATE POLICY "delete_organizations"
ON public.organizations FOR DELETE
TO authenticated
USING (
  owner_id = auth.uid()
);

-- Service role has full access
CREATE POLICY "service_all_organizations"
ON public.organizations FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
```

### Tenants RLS - CLEANED UP

```sql
-- Drop all existing tenant policies
DROP POLICY IF EXISTS "Owners manage their tenant" ON public.tenants;
DROP POLICY IF EXISTS "Public SELECT on tenants for view" ON public.tenants;
DROP POLICY IF EXISTS "tenants_admin_delete" ON public.tenants;
DROP POLICY IF EXISTS "tenants_admin_insert" ON public.tenants;
DROP POLICY IF EXISTS "tenants_admin_update" ON public.tenants;
DROP POLICY IF EXISTS "tenants_owner_delete" ON public.tenants;
DROP POLICY IF EXISTS "tenants_owner_insert" ON public.tenants;
DROP POLICY IF EXISTS "tenants_owner_select" ON public.tenants;
DROP POLICY IF EXISTS "tenants_owner_update" ON public.tenants;

-- CREATE CLEAN POLICIES
-- SELECT: Public can view tenants (for subdomain lookup)
CREATE POLICY "select_tenants"
ON public.tenants FOR SELECT
TO anon, authenticated
USING (true);

-- INSERT: Owner during signup
CREATE POLICY "insert_tenants"
ON public.tenants FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.organizations o
    WHERE o.id = tenants.id AND o.owner_id = auth.uid()
  )
);

-- UPDATE: Owner or admin can update
CREATE POLICY "update_tenants"
ON public.tenants FOR UPDATE
TO authenticated
USING (
  user_org_access(auth.uid(), id, ARRAY['owner', 'superadmin', 'admin']::user_role[])
)
WITH CHECK (
  user_org_access(auth.uid(), id, ARRAY['owner', 'superadmin', 'admin']::user_role[])
);

-- DELETE: Only owner can delete
CREATE POLICY "delete_tenants"
ON public.tenants FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.organizations o
    WHERE o.id = tenants.id AND o.owner_id = auth.uid()
  )
);

-- Service role has full access
CREATE POLICY "service_all_tenants"
ON public.tenants FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
```

### User Profiles RLS - CLEANED UP

```sql
-- Drop all existing profile policies
DROP POLICY IF EXISTS "profiles_org_admin_delete" ON public.user_profiles;
DROP POLICY IF EXISTS "profiles_org_admin_insert" ON public.user_profiles;
DROP POLICY IF EXISTS "profiles_org_admin_read" ON public.user_profiles;
DROP POLICY IF EXISTS "profiles_org_admin_select" ON public.user_profiles;
DROP POLICY IF EXISTS "profiles_org_admin_update" ON public.user_profiles;
DROP POLICY IF EXISTS "profiles_self_delete" ON public.user_profiles;
DROP POLICY IF EXISTS "profiles_self_insert" ON public.user_profiles;
DROP POLICY IF EXISTS "profiles_self_read" ON public.user_profiles;
DROP POLICY IF EXISTS "profiles_self_select_split" ON public.user_profiles;
DROP POLICY IF EXISTS "profiles_self_update" ON public.user_profiles;
DROP POLICY IF EXISTS "profiles_self_update_split" ON public.user_profiles;

-- CREATE CLEAN POLICIES
-- SELECT: Users can view profiles in their org
CREATE POLICY "select_user_profiles"
ON public.user_profiles FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR (org_id IS NOT NULL AND user_org_access(auth.uid(), org_id))
);

-- INSERT: User can create their own profile
CREATE POLICY "insert_user_profiles"
ON public.user_profiles FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
);

-- UPDATE: User can update themselves OR admin can update team members
CREATE POLICY "update_user_profiles"
ON public.user_profiles FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid()
  OR (org_id IS NOT NULL AND user_org_access(auth.uid(), org_id, ARRAY['owner', 'superadmin', 'admin']::user_role[]))
)
WITH CHECK (
  user_id = auth.uid()
  OR (org_id IS NOT NULL AND user_org_access(auth.uid(), org_id, ARRAY['owner', 'superadmin', 'admin']::user_role[]))
);

-- DELETE: User can delete themselves OR admin can remove members
CREATE POLICY "delete_user_profiles"
ON public.user_profiles FOR DELETE
TO authenticated
USING (
  user_id = auth.uid()
  OR (org_id IS NOT NULL AND user_org_access(auth.uid(), org_id, ARRAY['owner', 'superadmin', 'admin']::user_role[]))
);

-- Service role has full access
CREATE POLICY "service_all_user_profiles"
ON public.user_profiles FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
```

### Subscriptions RLS - CLEANED UP

```sql
-- Drop existing policies
DROP POLICY IF EXISTS "subscriptions_admin_delete" ON public.subscriptions;
DROP POLICY IF EXISTS "subscriptions_admin_insert" ON public.subscriptions;
DROP POLICY IF EXISTS "subscriptions_admin_select" ON public.subscriptions;
DROP POLICY IF EXISTS "subscriptions_admin_update" ON public.subscriptions;
DROP POLICY IF EXISTS "subscriptions_member_read" ON public.subscriptions;

-- CREATE CLEAN POLICIES
-- SELECT: Members can view their org's subscription
CREATE POLICY "select_subscriptions"
ON public.subscriptions FOR SELECT
TO authenticated
USING (
  user_org_access(auth.uid(), org_id)
);

-- INSERT/UPDATE/DELETE: Only admin+ can manage
CREATE POLICY "manage_subscriptions"
ON public.subscriptions FOR ALL
TO authenticated
USING (
  user_org_access(auth.uid(), org_id, ARRAY['owner', 'superadmin', 'admin']::user_role[])
)
WITH CHECK (
  user_org_access(auth.uid(), org_id, ARRAY['owner', 'superadmin', 'admin']::user_role[])
);

-- Service role has full access
CREATE POLICY "service_all_subscriptions"
ON public.subscriptions FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
```

### Usage Counters RLS - CLEANED UP

```sql
-- Drop existing policies
DROP POLICY IF EXISTS "usage_admin_delete" ON public.usage_counters;
DROP POLICY IF EXISTS "usage_admin_insert" ON public.usage_counters;
DROP POLICY IF EXISTS "usage_admin_select" ON public.usage_counters;
DROP POLICY IF EXISTS "usage_admin_update" ON public.usage_counters;
DROP POLICY IF EXISTS "usage_member_read" ON public.usage_counters;

-- CREATE CLEAN POLICIES
-- SELECT: Members can view their org's usage
CREATE POLICY "select_usage_counters"
ON public.usage_counters FOR SELECT
TO authenticated
USING (
  user_org_access(auth.uid(), org_id)
);

-- INSERT/UPDATE/DELETE: Only admin+ can manage
CREATE POLICY "manage_usage_counters"
ON public.usage_counters FOR ALL
TO authenticated
USING (
  user_org_access(auth.uid(), org_id, ARRAY['owner', 'superadmin', 'admin']::user_role[])
)
WITH CHECK (
  user_org_access(auth.uid(), org_id, ARRAY['owner', 'superadmin', 'admin']::user_role[])
);

-- Service role has full access
CREATE POLICY "service_all_usage_counters"
ON public.usage_counters FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
```

---

## 8. Triggers & Automatic Permission Assignment

### Auto-assign creator permissions

```sql
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

CREATE TRIGGER on_project_created
  AFTER INSERT ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_project();
```

### Update timestamps

```sql
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER project_permissions_updated_at
  BEFORE UPDATE ON public.project_permissions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER capabilities_updated_at
  BEFORE UPDATE ON public.capabilities
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER org_role_capabilities_updated_at
  BEFORE UPDATE ON public.org_role_capabilities
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
```

---

## 9. Subscription Tier Gating

### Update subscription_tiers to include feature access

```sql
-- Add custom permissions column to subscription_tiers
ALTER TABLE public.subscription_tiers
ADD COLUMN IF NOT EXISTS allows_custom_permissions BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS max_projects INTEGER,
ADD COLUMN IF NOT EXISTS max_team_members INTEGER;

-- Example tier setup (only insert if doesn't exist)
INSERT INTO public.subscription_tiers (name, allows_custom_permissions, max_projects, max_team_members)
VALUES
  ('free', false, 3, 5),
  ('pro', false, 50, 25),
  ('business', true, 500, 100),
  ('enterprise', true, NULL, NULL) -- Unlimited
ON CONFLICT (name) DO NOTHING;
```

---

## 10. Implementation Order

1. ✅ **Clean Up Existing RLS Policies** - Drop duplicates, consolidate
2. ✅ **Create Helper Functions** - `user_org_access()`, `user_org_capability()`, `user_project_access()`
3. ✅ **Apply Clean RLS Policies** - One policy per operation type
4. ✅ **Create Projects Table** - Basic structure
5. ✅ **Create Project Permissions Table** - Permission tracking
6. ✅ **Create Capabilities Tables** - RBAC infrastructure
7. ✅ **Seed Default Capabilities** - Standard app features
8. ✅ **Apply Project RLS Policies** - Secure project access
9. ✅ **Create Triggers** - Auto-permission assignment
10. ✅ **Update Subscription Tiers** - Feature gating
11. **Create Client Functions** - TypeScript helpers
12. **Create UI Components** - Project management interfaces
13. **Add Tests** - Verify permission logic

---

## Notes

- **Cleaner Policy Structure**: Instead of 11+ policies per table, we now have 2-5 policies max
- **Generic Function Names**: `user_org_access()`, `user_org_capability()`, `user_project_access()`
- **Helper Functions are STABLE**: Marked for query optimization
- **Superadmins** can reassign project ownership EXCEPT for projects owned by other superadmins (only owners can do that)
- **Organization-level roles** (owner, superadmin) supersede project-level permissions
- **Custom permissions** (org_role_capabilities) only available on Business+ tiers
- **Project permissions** are inherited: `admin` > `write` > `read`
- All tables use **soft deletes** where appropriate (status columns)
- **Service role** always has full access for server-side operations
