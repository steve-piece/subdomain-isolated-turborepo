# Next Steps: Projects & RBAC Implementation

## ✅ Completed

1. **Removed Storage Used Section** from dashboard (`organization-dashboard.tsx`)
   - Dashboard now shows 2-column grid: Team Members + Active Projects

2. **Created Unified Invite Dialog**
   - Replaced separate `/invite-user` page link with dialog button
   - Access levels configurable in popup (View Only, Member, Admin)

3. **Comprehensive Database Plan** (`DATABASE_RBAC_PROJECTS_PLAN.md`)
   - Complete schema for Projects + Project Permissions
   - RBAC Capabilities Matrix with subscription-based feature gating
   - RLS policies, triggers, and helper functions
   - Industry-standard capability-based permissions model

---

## 🎯 Next Steps: Database Implementation

### Phase 1: Core Tables (Run these migrations first)

```bash
# Apply migrations using Supabase MCP tools
```

#### Migration 1: Create Projects Table

```sql
-- File: 20250929_create_projects_table.sql
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted')),
  metadata JSONB DEFAULT '{}'::jsonb,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  CONSTRAINT unique_project_name_per_org UNIQUE (org_id, name)
);

CREATE INDEX idx_projects_org_id ON public.projects(org_id);
CREATE INDEX idx_projects_owner_id ON public.projects(owner_id);
CREATE INDEX idx_projects_status ON public.projects(status) WHERE status = 'active';
```

#### Migration 2: Create Project Permissions Table

```sql
-- File: 20250929_create_project_permissions_table.sql
CREATE TYPE project_permission_level AS ENUM ('read', 'write', 'admin');

CREATE TABLE public.project_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission_level project_permission_level NOT NULL DEFAULT 'read',
  granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_project_user_permission UNIQUE (project_id, user_id)
);

CREATE INDEX idx_project_permissions_project_id ON public.project_permissions(project_id);
CREATE INDEX idx_project_permissions_user_id ON public.project_permissions(user_id);
CREATE INDEX idx_project_permissions_level ON public.project_permissions(permission_level);
```

---

### Phase 2: RBAC Capabilities

#### Migration 3: Create Capabilities Tables

```sql
-- File: 20250929_create_capabilities_tables.sql
CREATE TABLE public.capabilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  requires_tier_id UUID REFERENCES public.subscription_tiers(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.role_capabilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role user_role NOT NULL,
  capability_id UUID NOT NULL REFERENCES public.capabilities(id) ON DELETE CASCADE,
  is_default BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_role_capability UNIQUE (role, capability_id)
);

CREATE TABLE public.org_role_capabilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role user_role NOT NULL,
  capability_id UUID NOT NULL REFERENCES public.capabilities(id) ON DELETE CASCADE,
  granted BOOLEAN NOT NULL,
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

#### Migration 4: Seed Capabilities

See `DATABASE_RBAC_PROJECTS_PLAN.md` Section 4 for all INSERT statements.

---

### Phase 3: Permission Logic

#### Migration 5: Clean Up Existing RLS Policies

**IMPORTANT**: First, we need to clean up the messy existing policies (11+ per table).

```sql
-- File: 20250929_cleanup_existing_rls_policies.sql
-- Drop duplicate and messy policies from organizations, tenants, user_profiles, etc.
-- See DATABASE_RBAC_PROJECTS_PLAN.md Section 7 for all DROP POLICY statements
```

This migration drops all the duplicate policies like:

- `organizations_owner_delete` AND `organizations_owner_delete_split`
- `profiles_self_read` AND `profiles_self_select_split`
- Separate policies for each CRUD operation

#### Migration 6: Create Helper Functions (Generic Names)

```sql
-- File: 20250929_create_helper_functions.sql

-- Generic org access check (replaces complex subqueries)
CREATE OR REPLACE FUNCTION public.user_org_access(
  p_user_id UUID,
  p_org_id UUID,
  p_required_roles user_role[] DEFAULT NULL
) RETURNS BOOLEAN...

-- Capability check (for feature gating)
CREATE OR REPLACE FUNCTION public.user_org_capability(
  p_user_id UUID,
  p_org_id UUID,
  p_capability_key TEXT
) RETURNS BOOLEAN...

-- Project access check
CREATE OR REPLACE FUNCTION public.user_project_access(
  p_user_id UUID,
  p_project_id UUID,
  p_required_permission project_permission_level DEFAULT 'read'
) RETURNS BOOLEAN...
```

See `DATABASE_RBAC_PROJECTS_PLAN.md` Section 6 for full implementation.

#### Migration 7: Apply Clean RLS Policies

**Consolidate to 2-5 policies per table** instead of 11+:

Example for `organizations`:

```sql
-- Before: 10+ policies (owner_select, owner_insert, owner_update, etc.)
-- After: 5 clean policies

CREATE POLICY "select_organizations" ON public.organizations FOR SELECT
TO authenticated USING (user_org_access(auth.uid(), id));

CREATE POLICY "insert_organizations" ON public.organizations FOR INSERT
TO authenticated WITH CHECK (owner_id = auth.uid());

CREATE POLICY "update_organizations" ON public.organizations FOR UPDATE
TO authenticated
USING (user_org_access(auth.uid(), id, ARRAY['owner', 'superadmin', 'admin']::user_role[]))
WITH CHECK (user_org_access(auth.uid(), id, ARRAY['owner', 'superadmin', 'admin']::user_role[]));

CREATE POLICY "delete_organizations" ON public.organizations FOR DELETE
TO authenticated USING (owner_id = auth.uid());

CREATE POLICY "service_all_organizations" ON public.organizations FOR ALL
TO service_role USING (true) WITH CHECK (true);
```

See `DATABASE_RBAC_PROJECTS_PLAN.md` Section 7 for all tables.

#### Migration 8: Create Triggers

See `DATABASE_RBAC_PROJECTS_PLAN.md` Section 8 for:

- Auto-assign project creator as admin
- Update timestamps

---

### Phase 4: Subscription Enhancement

#### Migration 9: Update Subscription Tiers

```sql
ALTER TABLE public.subscription_tiers
ADD COLUMN allows_custom_permissions BOOLEAN DEFAULT false,
ADD COLUMN max_projects INTEGER,
ADD COLUMN max_team_members INTEGER;

-- Seed default tiers
INSERT INTO public.subscription_tiers (name, allows_custom_permissions, max_projects, max_team_members)
VALUES
  ('free', false, 3, 5),
  ('pro', false, 50, 25),
  ('business', true, 500, 100),
  ('enterprise', true, NULL, NULL);
```

---

## 🔨 Frontend Implementation

### 1. TypeScript Types

```typescript
// apps/protected/lib/types/projects.ts
export type ProjectPermissionLevel = "read" | "write" | "admin";
export type ProjectStatus = "active" | "archived" | "deleted";

export interface Project {
  id: string;
  org_id: string;
  name: string;
  description?: string;
  owner_id: string;
  status: ProjectStatus;
  metadata?: Record<string, any>;
  settings?: Record<string, any>;
  created_at: string;
  updated_at: string;
  archived_at?: string;
}

export interface ProjectPermission {
  id: string;
  project_id: string;
  user_id: string;
  permission_level: ProjectPermissionLevel;
  granted_by?: string;
  granted_at: string;
  created_at: string;
  updated_at: string;
}

export interface Capability {
  id: string;
  key: string;
  name: string;
  description?: string;
  category?: string;
  requires_tier_id?: string;
}
```

### 2. Server Actions

```typescript
// apps/protected/app/actions.ts

export async function createProject(
  name: string,
  description: string,
  orgId: string,
  subdomain: string
): Promise<ActionResponse<Project>>;

export async function updateProjectPermission(
  projectId: string,
  userId: string,
  permissionLevel: ProjectPermissionLevel,
  subdomain: string
): Promise<ActionResponse>;

export async function checkUserOrgCapability(
  capabilityKey: string,
  subdomain: string
): Promise<boolean>;

export async function checkUserProjectAccess(
  projectId: string,
  requiredPermission: ProjectPermissionLevel,
  subdomain: string
): Promise<boolean>;
```

### 3. UI Components

#### Create Project Dialog

```typescript
// apps/protected/components/create-project-dialog.tsx
export function CreateProjectDialog({ subdomain, orgId }: Props);
```

#### Project List Component

```typescript
// apps/protected/components/project-list.tsx
export function ProjectList({ subdomain }: Props);
```

#### Project Permissions Manager

```typescript
// apps/protected/components/project-permissions-manager.tsx
export function ProjectPermissionsManager({ projectId, subdomain }: Props);
```

### 4. Pages to Create

- `/s/[subdomain]/(protected)/projects` - List all projects
- `/s/[subdomain]/(protected)/projects/[id]` - Project detail view
- `/s/[subdomain]/(protected)/projects/[id]/settings` - Project settings
- `/s/[subdomain]/(protected)/admin/capabilities` - Manage custom capabilities (Business+ tier)

---

## 🧪 Testing Strategy

### 1. Database Tests

- Project creation with auto-permission assignment
- Permission inheritance (org roles vs project permissions)
- Capability checks with custom overrides
- RLS policy enforcement

### 2. Integration Tests

- Project CRUD operations with different roles
- Permission escalation prevention
- Subscription tier gating
- Cross-org access prevention

### 3. E2E Tests (Playwright)

- Create project as admin
- Invite member to project with read permission
- Verify member can't edit project
- Upgrade subscription and customize role permissions

---

## 📋 Implementation Checklist

### Database (9 migrations total)

- [ ] **Migration 1**: Create Projects Table
- [ ] **Migration 2**: Create Project Permissions Table
- [ ] **Migration 3**: Create Capabilities Tables
- [ ] **Migration 4**: Seed Capabilities
- [ ] **Migration 5**: Clean Up Existing RLS Policies (IMPORTANT - do this first!)
- [ ] **Migration 6**: Create Helper Functions (`user_org_access`, `user_org_capability`, `user_project_access`)
- [ ] **Migration 7**: Apply Clean RLS Policies (2-5 per table instead of 11+)
- [ ] **Migration 8**: Create Triggers
- [ ] **Migration 9**: Update Subscription Tiers
- [ ] Run advisors to check security (`get_advisors` MCP tool)

### Frontend

- [ ] Create TypeScript types
- [ ] Create server actions
- [ ] Create UI components
- [ ] Wire up projects to dashboard
- [ ] Add tests
- [ ] Update documentation

### Policy Cleanup Summary

**Before**: 40+ messy policies across tables
**After**: ~20 clean, consolidated policies

Tables cleaned:

- ✅ organizations: 12 policies → 5 policies
- ✅ tenants: 10 policies → 5 policies
- ✅ user_profiles: 11 policies → 5 policies
- ✅ subscriptions: 5 policies → 3 policies
- ✅ usage_counters: 5 policies → 3 policies

---

## 🎨 UI Updates Needed

1. **Dashboard** - Show actual project count (currently hardcoded to 0)
2. **Create New Project Button** - Wire up to CreateProjectDialog
3. **Admin Panel** - Add "Projects" management card
4. **Admin Panel** - Add "Capabilities" management (Business+ tier only)
5. **Projects Page** - List with filters (active/archived/all)
6. **Project Detail** - Show members, permissions, settings

---

## 🔐 Security Considerations

1. **Superadmin Safeguard** - Only owners can reassign projects from superadmins
2. **Capability Verification** - Always check both org-level AND subscription tier
3. **RLS Enforcement** - All tables have comprehensive policies
4. **Audit Trail** - Track who granted permissions and when
5. **Soft Deletes** - Use status flags instead of hard deletes
