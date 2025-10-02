-- ============================================================================
-- Projects Module Migration
-- ============================================================================
-- Description: Creates tables and policies for project management
-- Dependencies: 
--   - public.organizations table
--   - public.user_profiles table
--   - auth.users table
-- Impact: 
--   - Creates public.projects table
--   - Creates public.project_permissions table
--   - Enables RLS on both tables
--   - Creates indexes for query optimization
-- Version: 1.0.0
-- Date: 2025-01-02
-- ============================================================================
-- Rollback: See 20250102000005_rollback_projects_tables.sql
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. ENUMs
-- ============================================================================

-- Project status enum
DO $$ BEGIN
  CREATE TYPE public.project_status AS ENUM ('active', 'archived', 'deleted');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Project permission level enum
DO $$ BEGIN
  CREATE TYPE public.project_permission_level AS ENUM ('read', 'write', 'admin');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TYPE public.project_status IS 'Status values for projects: active (in use), archived (inactive but preserved), deleted (soft delete)';
COMMENT ON TYPE public.project_permission_level IS 'Permission levels for project access: read (view only), write (edit content), admin (full management)';

-- ============================================================================
-- 2. Projects Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) > 0 AND char_length(name) <= 100),
  description TEXT,
  status public.project_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(org_id, name, status)
);

COMMENT ON TABLE public.projects IS 'Projects within organizations for organizing work and collaboration';
COMMENT ON COLUMN public.projects.id IS 'Unique identifier for the project';
COMMENT ON COLUMN public.projects.org_id IS 'Reference to the organization that owns this project';
COMMENT ON COLUMN public.projects.owner_id IS 'User who created and owns the project';
COMMENT ON COLUMN public.projects.name IS 'Project name (1-100 characters, unique within org and status)';
COMMENT ON COLUMN public.projects.description IS 'Optional project description';
COMMENT ON COLUMN public.projects.status IS 'Current project status (active, archived, or deleted)';
COMMENT ON COLUMN public.projects.created_at IS 'Timestamp when project was created';
COMMENT ON COLUMN public.projects.updated_at IS 'Timestamp when project was last updated';

-- ============================================================================
-- 3. Project Permissions Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.project_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission_level public.project_permission_level NOT NULL,
  granted_by UUID NOT NULL REFERENCES auth.users(id),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, user_id)
);

COMMENT ON TABLE public.project_permissions IS 'User access permissions for individual projects';
COMMENT ON COLUMN public.project_permissions.id IS 'Unique identifier for the permission record';
COMMENT ON COLUMN public.project_permissions.project_id IS 'Reference to the project';
COMMENT ON COLUMN public.project_permissions.user_id IS 'User being granted access';
COMMENT ON COLUMN public.project_permissions.permission_level IS 'Level of access granted (read, write, or admin)';
COMMENT ON COLUMN public.project_permissions.granted_by IS 'User who granted this permission';
COMMENT ON COLUMN public.project_permissions.granted_at IS 'Timestamp when permission was granted';

-- ============================================================================
-- 4. Indexes for Query Optimization
-- ============================================================================

-- Projects table indexes
CREATE INDEX IF NOT EXISTS idx_projects_org_id ON public.projects(org_id);
COMMENT ON INDEX public.idx_projects_org_id IS 'Optimize queries filtering projects by organization';

CREATE INDEX IF NOT EXISTS idx_projects_owner_id ON public.projects(owner_id);
COMMENT ON INDEX public.idx_projects_owner_id IS 'Optimize queries filtering projects by owner';

CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);
COMMENT ON INDEX public.idx_projects_status IS 'Optimize queries filtering projects by status';

CREATE INDEX IF NOT EXISTS idx_projects_org_status ON public.projects(org_id, status);
COMMENT ON INDEX public.idx_projects_org_status IS 'Composite index for filtering by organization and status';

-- Project permissions table indexes
CREATE INDEX IF NOT EXISTS idx_project_permissions_project_id ON public.project_permissions(project_id);
COMMENT ON INDEX public.idx_project_permissions_project_id IS 'Optimize queries for permissions by project';

CREATE INDEX IF NOT EXISTS idx_project_permissions_user_id ON public.project_permissions(user_id);
COMMENT ON INDEX public.idx_project_permissions_user_id IS 'Optimize queries for permissions by user';

CREATE INDEX IF NOT EXISTS idx_project_permissions_project_user ON public.project_permissions(project_id, user_id);
COMMENT ON INDEX public.idx_project_permissions_project_user IS 'Composite index for unique project-user permission lookups';

-- ============================================================================
-- 5. Row Level Security (RLS)
-- ============================================================================

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_permissions ENABLE ROW LEVEL SECURITY;

-- Projects: Users can view projects in their organization
CREATE POLICY "Users can view projects in their organization"
  ON public.projects
  FOR SELECT
  TO authenticated
  USING (
    org_id IN (
      SELECT up.org_id
      FROM public.user_profiles up
      WHERE up.user_id = auth.uid()
    )
  );

-- Projects: Users in the organization can create projects (capability check in app layer)
CREATE POLICY "Users can create projects in their organization"
  ON public.projects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    org_id IN (
      SELECT up.org_id
      FROM public.user_profiles up
      WHERE up.user_id = auth.uid()
    )
  );

-- Projects: Project admins and org admins can update projects
CREATE POLICY "Project admins can update projects"
  ON public.projects
  FOR UPDATE
  TO authenticated
  USING (
    -- User is project admin
    EXISTS (
      SELECT 1
      FROM public.project_permissions pp
      WHERE pp.project_id = projects.id
        AND pp.user_id = auth.uid()
        AND pp.permission_level = 'admin'
    )
    OR
    -- User is org admin/owner
    EXISTS (
      SELECT 1
      FROM public.user_profiles up
      WHERE up.user_id = auth.uid()
        AND up.org_id = projects.org_id
        AND up.role IN ('owner', 'admin', 'superadmin')
    )
  );

-- Projects: Project admins and org admins can delete projects
CREATE POLICY "Project admins can delete projects"
  ON public.projects
  FOR DELETE
  TO authenticated
  USING (
    -- User is project admin
    EXISTS (
      SELECT 1
      FROM public.project_permissions pp
      WHERE pp.project_id = projects.id
        AND pp.user_id = auth.uid()
        AND pp.permission_level = 'admin'
    )
    OR
    -- User is org admin/owner
    EXISTS (
      SELECT 1
      FROM public.user_profiles up
      WHERE up.user_id = auth.uid()
        AND up.org_id = projects.org_id
        AND up.role IN ('owner', 'admin', 'superadmin')
    )
  );

-- Permissions: Users can view permissions for projects they have access to
CREATE POLICY "Users can view permissions for their projects"
  ON public.project_permissions
  FOR SELECT
  TO authenticated
  USING (
    project_id IN (
      SELECT p.id
      FROM public.projects p
      WHERE p.org_id IN (
        SELECT up.org_id
        FROM public.user_profiles up
        WHERE up.user_id = auth.uid()
      )
    )
  );

-- Permissions: Project admins can manage permissions
CREATE POLICY "Project admins can manage permissions"
  ON public.project_permissions
  FOR ALL
  TO authenticated
  USING (
    -- User is project admin
    EXISTS (
      SELECT 1
      FROM public.project_permissions pp
      WHERE pp.project_id = project_permissions.project_id
        AND pp.user_id = auth.uid()
        AND pp.permission_level = 'admin'
    )
    OR
    -- User is org admin/owner
    EXISTS (
      SELECT 1
      FROM public.projects p
      INNER JOIN public.user_profiles up ON up.org_id = p.org_id
      WHERE p.id = project_permissions.project_id
        AND up.user_id = auth.uid()
        AND up.role IN ('owner', 'admin', 'superadmin')
    )
  );

-- ============================================================================
-- Migration Completion
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration completed successfully: Projects tables created';
  RAISE NOTICE 'Tables created:';
  RAISE NOTICE '  - public.projects';
  RAISE NOTICE '  - public.project_permissions';
  RAISE NOTICE 'RLS policies enabled for both tables';
END $$;

COMMIT;

