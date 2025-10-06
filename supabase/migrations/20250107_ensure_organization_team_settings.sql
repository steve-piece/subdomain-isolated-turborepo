-- ============================================================================
-- Migration: ensure_organization_team_settings
-- ============================================================================
-- Name: ensure_organization_team_settings
-- Version: 20250107
-- Author: System
-- Date: 2025-01-07
-- Description: Ensures all organizations have default team settings. Creates 
--              missing rows with sensible defaults for team management.
-- Dependencies: 
--   - public.organizations table must exist
--   - public.organization_team_settings table must exist
--   - user_role enum type must exist
-- Impact: 
--   - Inserts default team settings for organizations without them
--   - Idempotent - safe to run multiple times
-- Risk Assessment: Low
--   - Read-only check followed by idempotent INSERT
--   - No updates to existing data
--   - Validation ensures all orgs have settings
-- Rollback Plan: 
--   DELETE FROM public.organization_team_settings 
--   WHERE created_at >= '2025-01-07' AND allow_member_invites = FALSE;
-- Post-migration Actions: 
--   - Verify all orgs have settings via validation query
--   - Monitor team invite functionality
-- ============================================================================

BEGIN;

-- Set statement timeout for safety (30 seconds should be plenty)
SET statement_timeout = '30s';

DO $$
DECLARE
  v_inserted_count INTEGER;
  v_orgs_without_settings INTEGER;
BEGIN
  RAISE NOTICE 'Starting migration: ensure_organization_team_settings';

-- Step 1: Insert default team settings for organizations without them
INSERT INTO public.organization_team_settings (
  org_id,
  allow_member_invites,
  require_admin_approval,
  auto_assign_default_role,
  max_team_size,
  allow_guest_access,
  guest_link_expiry_days,
  created_at,
  updated_at
)
SELECT 
  o.id as org_id,
  FALSE as allow_member_invites, -- Only admins+ can invite by default
  FALSE as require_admin_approval, -- No approval needed by default
  'member'::user_role as auto_assign_default_role, -- Default role
  NULL as max_team_size, -- No limit by default (subject to subscription tier)
  FALSE as allow_guest_access, -- Guests disabled by default
  30 as guest_link_expiry_days, -- 30-day expiry for guests
  NOW() as created_at,
  NOW() as updated_at
FROM public.organizations o
LEFT JOIN public.organization_team_settings ots ON ots.org_id = o.id
WHERE ots.id IS NULL; -- Only insert if no settings exist

-- Get count of inserted rows
GET DIAGNOSTICS v_inserted_count = ROW_COUNT;
RAISE NOTICE 'Inserted default team settings for % organizations', v_inserted_count;

-- Step 2: Verify all organizations now have team settings
SELECT COUNT(o.id)
  INTO v_orgs_without_settings
  FROM public.organizations o
  LEFT JOIN public.organization_team_settings ots ON ots.org_id = o.id
  WHERE ots.id IS NULL;

  IF v_orgs_without_settings = 0 THEN
    RAISE NOTICE '✅ All organizations now have team settings';
  ELSE
    RAISE EXCEPTION '❌ Failed: % organizations still without team settings', v_orgs_without_settings;
  END IF;

  RAISE NOTICE '✅ Migration ensure_organization_team_settings completed successfully.';
END $$;

-- Add table comments for Supabase auto-generated API documentation
COMMENT ON TABLE public.organization_team_settings IS
'Team management configuration per organization. Controls invite permissions, approval workflows, team size limits, and guest access settings.';

COMMENT ON COLUMN public.organization_team_settings.allow_member_invites IS
'If TRUE, regular members can invite new users. If FALSE, only admins+ can invite. Default: FALSE';

COMMENT ON COLUMN public.organization_team_settings.require_admin_approval IS
'If TRUE, invited users must be approved by an admin before joining. Default: FALSE';

COMMENT ON COLUMN public.organization_team_settings.auto_assign_default_role IS
'Default role assigned to invited users when no specific role is provided. Options: member, view-only. Default: member';

COMMENT ON COLUMN public.organization_team_settings.max_team_size IS
'Maximum number of team members allowed. NULL = unlimited (subject to subscription tier limits). Default: NULL';

COMMENT ON COLUMN public.organization_team_settings.allow_guest_access IS
'If TRUE, temporary guest links can be generated for external collaborators. Default: FALSE (future feature)';

COMMENT ON COLUMN public.organization_team_settings.guest_link_expiry_days IS
'Number of days until guest access links expire. Default: 30 days';

COMMIT;

-- Final validation notice
DO $$
DECLARE
  v_total_orgs INTEGER;
  v_orgs_with_settings INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total_orgs FROM public.organizations;
  SELECT COUNT(*) INTO v_orgs_with_settings FROM public.organization_team_settings;
  
  RAISE NOTICE '📊 Final Status: % organizations, % have team settings configured', v_total_orgs, v_orgs_with_settings;
END $$;
