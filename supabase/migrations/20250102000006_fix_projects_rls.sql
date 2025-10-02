-- ============================================================================
-- Fix Projects RLS Infinite Recursion
-- ============================================================================
-- Description: Fixes infinite recursion in RLS policies for projects tables
-- Issue: Policies on projects and project_permissions tables had circular references
-- Fix: Remove circular references and simplify permission checks
-- Version: 1.0.1
-- Date: 2025-01-02
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. Drop Existing Problematic Policies
-- ============================================================================

-- Drop all existing policies on projects table
DROP POLICY IF EXISTS "Users can view projects in their organization" ON public.projects;
DROP POLICY IF EXISTS "Users can create projects in their organization" ON public.projects;
DROP POLICY IF EXISTS "Project admins can update projects" ON public.projects;
DROP POLICY IF EXISTS "Project admins can delete projects" ON public.projects;

-- Drop all existing policies on project_permissions table
DROP POLICY IF EXISTS "Users can view permissions for their projects" ON public.project_permissions;
DROP POLICY IF EXISTS "Project admins can manage permissions" ON public.project_permissions;

-- ============================================================================
-- 2. Create Fixed Policies for Projects Table
-- ============================================================================

-- Policy: Users can view projects in their organization
CREATE POLICY "Users can view projects in their organization"
  ON public.projects
  FOR SELECT
  TO authenticated
  USING (
    org_id IN (
      SELECT up.org_id
      FROM public.user_profiles up
      WHERE up.user_id = (SELECT auth.uid())
    )
  );

COMMENT ON POLICY "Users can view projects in their organization" ON public.projects 
  IS 'Users can view all projects in their organization';

-- Policy: Users can create projects in their organization
CREATE POLICY "Users can create projects in their organization"
  ON public.projects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    org_id IN (
      SELECT up.org_id
      FROM public.user_profiles up
      WHERE up.user_id = (SELECT auth.uid())
    )
  );

COMMENT ON POLICY "Users can create projects in their organization" ON public.projects 
  IS 'Users can create projects in their organization. App layer checks create_projects capability.';

-- Policy: Project owners and org admins can update projects
CREATE POLICY "Project owners and org admins can update projects"
  ON public.projects
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

COMMENT ON POLICY "Project owners and org admins can update projects" ON public.projects 
  IS 'Project owners and org admins can update project details';

-- Policy: Project owners and org admins can delete projects
CREATE POLICY "Project owners and org admins can delete projects"
  ON public.projects
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

COMMENT ON POLICY "Project owners and org admins can delete projects" ON public.projects 
  IS 'Project owners and org admins can delete projects';

-- ============================================================================
-- 3. Create Fixed Policies for Project Permissions Table
-- ============================================================================

-- Policy: Users can view permissions for their projects (simplified)
CREATE POLICY "select_project_permissions"
  ON public.project_permissions
  FOR SELECT
  TO authenticated
  USING (
    -- User has access to the project's organization
    EXISTS (
      SELECT 1
      FROM public.user_profiles up
      INNER JOIN public.projects p ON p.org_id = up.org_id
      WHERE up.user_id = (SELECT auth.uid())
        AND p.id = project_permissions.project_id
    )
  );

COMMENT ON POLICY "select_project_permissions" ON public.project_permissions 
  IS 'Users can view permissions for projects in their organization';

-- Policy: Project owners can manage permissions
CREATE POLICY "manage_project_permissions"
  ON public.project_permissions
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
  );

COMMENT ON POLICY "manage_project_permissions" ON public.project_permissions 
  IS 'Project owners and org admins can manage permissions';

-- ============================================================================
-- 4. Add Missing Index (Performance Improvement)
-- ============================================================================

-- Add index for granted_by column (flagged by Supabase advisor)
CREATE INDEX IF NOT EXISTS idx_project_permissions_granted_by 
  ON public.project_permissions(granted_by);

COMMENT ON INDEX public.idx_project_permissions_granted_by 
  IS 'Optimize queries filtering by who granted permissions';

-- ============================================================================
-- Migration Completion
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration completed successfully: Projects RLS fixed';
  RAISE NOTICE 'Fixed issues:';
  RAISE NOTICE '  - Removed infinite recursion between projects and project_permissions';
  RAISE NOTICE '  - Optimized auth.uid() calls with SELECT subqueries';
  RAISE NOTICE '  - Added missing index on project_permissions.granted_by';
END $$;

COMMIT;
