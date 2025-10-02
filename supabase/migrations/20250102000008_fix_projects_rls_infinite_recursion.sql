-- ============================================================================
-- Fix Infinite Recursion in Projects RLS Policies
-- ============================================================================
-- Description: Fixes infinite recursion when querying projects with permissions
-- Root Cause: 
--   - projects SELECT policy queries project_permissions table
--   - project_permissions policies used user_project_access() function
--   - user_project_access() queries projects table again
--   - This creates a circular dependency causing infinite recursion
-- 
-- Solution:
--   - Simplified projects SELECT policy to only check org membership
--   - Removed helper function calls from project_permissions policies
--   - Direct JOINs without circular dependencies
-- 
-- Impact:
--   - Fixes "infinite recursion detected in policy for relation" error
--   - Projects list queries with permissions JOINs now work correctly
--   - Maintains proper security - users only see projects in their org
-- 
-- Version: 1.0.0
-- Date: 2025-01-02
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. Drop Existing Policies
-- ============================================================================

DROP POLICY IF EXISTS "select_projects" ON public.projects;
DROP POLICY IF EXISTS "insert_projects" ON public.projects;
DROP POLICY IF EXISTS "update_projects" ON public.projects;
DROP POLICY IF EXISTS "delete_projects" ON public.projects;
DROP POLICY IF EXISTS "select_project_permissions" ON public.project_permissions;
DROP POLICY IF EXISTS "manage_project_permissions" ON public.project_permissions;

-- ============================================================================
-- 2. Create Fixed Projects Policies (No Circular References)
-- ============================================================================

-- SELECT: Users can view all projects in their organization
-- This avoids querying project_permissions which would cause recursion
CREATE POLICY "select_projects" ON public.projects
  FOR SELECT
  TO authenticated
  USING (
    -- User is in the same organization
    org_id IN (
      SELECT up.org_id
      FROM public.user_profiles up
      WHERE up.user_id = (SELECT auth.uid())
    )
  );

COMMENT ON POLICY "select_projects" ON public.projects 
  IS 'Users can view all projects in their organization. Org-level access only to avoid circular dependency with project_permissions.';

-- INSERT: Users can create projects in their org (must be owner)
CREATE POLICY "insert_projects" ON public.projects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Must be in org
    org_id IN (
      SELECT up.org_id
      FROM public.user_profiles up
      WHERE up.user_id = (SELECT auth.uid())
    )
    -- Must set self as owner
    AND owner_id = (SELECT auth.uid())
  );

COMMENT ON POLICY "insert_projects" ON public.projects 
  IS 'Users can create projects in their organization and must set themselves as owner. App layer checks create_projects capability.';

-- UPDATE: Project owner or org admins can update
CREATE POLICY "update_projects" ON public.projects
  FOR UPDATE
  TO authenticated
  USING (
    -- User is project owner
    owner_id = (SELECT auth.uid())
    OR
    -- User is org admin/owner/superadmin
    EXISTS (
      SELECT 1
      FROM public.user_profiles up
      WHERE up.user_id = (SELECT auth.uid())
        AND up.org_id = projects.org_id
        AND up.role IN ('owner', 'admin', 'superadmin')
    )
  );

COMMENT ON POLICY "update_projects" ON public.projects 
  IS 'Project owners and org admins can update project details';

-- DELETE: Project owner or org admins can delete
CREATE POLICY "delete_projects" ON public.projects
  FOR DELETE
  TO authenticated
  USING (
    -- User is project owner
    owner_id = (SELECT auth.uid())
    OR
    -- User is org admin/owner/superadmin
    EXISTS (
      SELECT 1
      FROM public.user_profiles up
      WHERE up.user_id = (SELECT auth.uid())
        AND up.org_id = projects.org_id
        AND up.role IN ('owner', 'admin', 'superadmin')
    )
  );

COMMENT ON POLICY "delete_projects" ON public.projects 
  IS 'Project owners and org admins can delete projects';

-- ============================================================================
-- 3. Create Fixed Project Permissions Policies (No Helper Functions)
-- ============================================================================

-- SELECT: Users can view permissions for projects in their org
-- CRITICAL: Direct JOIN without helper functions to avoid recursion
CREATE POLICY "select_project_permissions" ON public.project_permissions
  FOR SELECT
  TO authenticated
  USING (
    -- User is in the same organization as the project
    EXISTS (
      SELECT 1
      FROM public.projects p
      INNER JOIN public.user_profiles up ON up.org_id = p.org_id
      WHERE p.id = project_permissions.project_id
        AND up.user_id = (SELECT auth.uid())
    )
  );

COMMENT ON POLICY "select_project_permissions" ON public.project_permissions 
  IS 'Users can view permissions for projects in their organization. Uses direct JOINs to avoid recursion with projects table.';

-- INSERT/UPDATE/DELETE: Project owner or org admins can manage permissions
CREATE POLICY "manage_project_permissions" ON public.project_permissions
  FOR ALL
  TO authenticated
  USING (
    -- User is the project owner
    EXISTS (
      SELECT 1
      FROM public.projects p
      WHERE p.id = project_permissions.project_id
        AND p.owner_id = (SELECT auth.uid())
    )
    OR
    -- User is org admin/owner/superadmin
    EXISTS (
      SELECT 1
      FROM public.projects p
      INNER JOIN public.user_profiles up ON up.org_id = p.org_id
      WHERE p.id = project_permissions.project_id
        AND up.user_id = (SELECT auth.uid())
        AND up.role IN ('owner', 'admin', 'superadmin')
    )
  )
  WITH CHECK (
    -- Same as USING clause for consistency
    EXISTS (
      SELECT 1
      FROM public.projects p
      WHERE p.id = project_permissions.project_id
        AND p.owner_id = (SELECT auth.uid())
    )
    OR
    EXISTS (
      SELECT 1
      FROM public.projects p
      INNER JOIN public.user_profiles up ON up.org_id = p.org_id
      WHERE p.id = project_permissions.project_id
        AND up.user_id = (SELECT auth.uid())
        AND up.role IN ('owner', 'admin', 'superadmin')
    )
  );

COMMENT ON POLICY "manage_project_permissions" ON public.project_permissions 
  IS 'Project owners and org admins can manage project permissions';

-- ============================================================================
-- Migration Completion
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration completed successfully: Fixed infinite recursion';
  RAISE NOTICE 'Changes:';
  RAISE NOTICE '  - Removed circular dependency between projects and project_permissions';
  RAISE NOTICE '  - Simplified SELECT policy on projects (org-based only)';
  RAISE NOTICE '  - Removed helper function calls from project_permissions policies';
  RAISE NOTICE '  - Projects page queries with JOINs now work correctly';
END $$;

COMMIT;

