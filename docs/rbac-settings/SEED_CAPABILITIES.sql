-- Seed script for capabilities and role mappings
-- Run this after SETTINGS_DATABASE_SCHEMA.sql

-- ============================================================================
-- 1. SEED CAPABILITIES
-- ============================================================================

INSERT INTO public.capabilities (key, name, description, category) VALUES
  -- Projects
  ('projects.create', 'Create Projects', 'Ability to create new projects', 'projects'),
  ('projects.view_all', 'View All Projects', 'View all projects in the organization', 'projects'),
  ('projects.view_own', 'View Own Projects', 'View projects you are a member of', 'projects'),
  ('projects.edit_all', 'Edit All Projects', 'Edit any project in the organization', 'projects'),
  ('projects.edit_own', 'Edit Own Projects', 'Edit projects you are a member of', 'projects'),
  ('projects.delete_all', 'Delete Any Project', 'Delete any project in the organization', 'projects'),
  ('projects.archive_all', 'Archive Any Project', 'Archive any project in the organization', 'projects'),
  
  -- Team Management
  ('team.invite', 'Invite Team Members', 'Send invitations to new team members', 'team'),
  ('team.remove', 'Remove Team Members', 'Remove members from the organization', 'team'),
  ('team.view', 'View Team', 'View list of team members', 'team'),
  ('team.manage_roles', 'Manage Roles', 'Change roles of team members', 'team'),
  
  -- Billing & Subscription
  ('billing.view', 'View Billing', 'View billing information and plans', 'billing'),
  ('billing.manage', 'Manage Billing', 'Manage subscription and payment methods', 'billing'),
  ('billing.upgrade', 'Upgrade Subscription', 'Initiate subscription upgrades', 'billing'),
  
  -- Organization Settings
  ('org.settings.view', 'View Org Settings', 'View general organization settings', 'organization'),
  ('org.settings.edit', 'Edit Org Settings', 'Edit general organization settings', 'organization'),
  ('org.settings.delete', 'Delete Organization', 'Delete the entire organization', 'organization'),
  ('org.team_settings.view', 'View Team Settings', 'View team-specific organization settings', 'organization'),
  ('org.team_settings.edit', 'Edit Team Settings', 'Edit team-specific organization settings', 'organization'),
  ('org.logo.upload', 'Upload Logo', 'Upload/change organization logo', 'organization'),
  
  -- User Profile
  ('profile.edit_own', 'Edit Own Profile', 'Edit your own user profile', 'profile'),
  ('profile.edit_others', 'Edit Other Profiles', 'Edit other users profiles', 'profile'),
  ('profile.upload_picture', 'Upload Profile Picture', 'Upload your own profile picture', 'profile'),
  
  -- Security
  ('security.view_own', 'View Own Security', 'View your own security settings', 'security'),
  ('security.edit_own', 'Edit Own Security', 'Edit your own security settings', 'security'),
  ('security.view_org_audit', 'View Org Audit Log', 'View organization-wide security audit logs', 'security'),
  ('security.manage_sessions', 'Manage Sessions', 'Manage (revoke) your own active sessions', 'security'),
  
  -- Notifications
  ('notifications.edit_own', 'Edit Notifications', 'Edit your own notification preferences', 'notifications'),
  
  -- Analytics & Reports
  ('analytics.view', 'View Analytics', 'View organization analytics and reports', 'analytics'),
  ('analytics.generate', 'Generate Reports', 'Generate custom reports', 'analytics'),
  ('analytics.export', 'Export Analytics', 'Export analytics data', 'analytics')
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- 2. SEED DEFAULT ROLE CAPABILITIES
-- ============================================================================

-- Helper function to map capabilities to roles
DO $$
DECLARE
  cap_id UUID;
BEGIN
  -- OWNER ROLE (Full access to everything)
  FOR cap_id IN 
    SELECT id FROM public.capabilities
  LOOP
    INSERT INTO public.role_capabilities (role, capability_id, is_default)
    VALUES ('owner', cap_id, true)
    ON CONFLICT (role, capability_id) DO NOTHING;
  END LOOP;
  
  -- SUPERADMIN ROLE (All except org deletion)
  FOR cap_id IN 
    SELECT id FROM public.capabilities WHERE key != 'org.settings.delete'
  LOOP
    INSERT INTO public.role_capabilities (role, capability_id, is_default)
    VALUES ('superadmin', cap_id, true)
    ON CONFLICT (role, capability_id) DO NOTHING;
  END LOOP;
  
  -- ADMIN ROLE
  FOR cap_id IN 
    SELECT id FROM public.capabilities WHERE key IN (
      'projects.create', 'projects.view_all', 'projects.edit_all', 'projects.delete_all', 'projects.archive_all',
      'team.invite', 'team.remove', 'team.view', 'team.manage_roles',
      'billing.view', 'billing.manage', 'billing.upgrade',
      'org.settings.view', 'org.settings.edit', 'org.team_settings.view', 'org.team_settings.edit', 'org.logo.upload',
      'profile.edit_own', 'profile.upload_picture',
      'security.view_own', 'security.edit_own', 'security.view_org_audit', 'security.manage_sessions',
      'notifications.edit_own',
      'analytics.view', 'analytics.generate', 'analytics.export'
    )
  LOOP
    INSERT INTO public.role_capabilities (role, capability_id, is_default)
    VALUES ('admin', cap_id, true)
    ON CONFLICT (role, capability_id) DO NOTHING;
  END LOOP;
  
  -- MEMBER ROLE
  FOR cap_id IN 
    SELECT id FROM public.capabilities WHERE key IN (
      'projects.create', 'projects.view_own', 'projects.edit_own',
      'team.view',
      'profile.edit_own', 'profile.upload_picture',
      'security.view_own', 'security.edit_own', 'security.manage_sessions',
      'notifications.edit_own'
    )
  LOOP
    INSERT INTO public.role_capabilities (role, capability_id, is_default)
    VALUES ('member', cap_id, true)
    ON CONFLICT (role, capability_id) DO NOTHING;
  END LOOP;
  
  -- VIEW-ONLY ROLE
  FOR cap_id IN 
    SELECT id FROM public.capabilities WHERE key IN (
      'projects.view_own',
      'team.view',
      'security.view_own',
      'analytics.view'
    )
  LOOP
    INSERT INTO public.role_capabilities (role, capability_id, is_default)
    VALUES ('view-only', cap_id, true)
    ON CONFLICT (role, capability_id) DO NOTHING;
  END LOOP;
END $$;

-- Verify seeding
SELECT '✅ Seeding complete!' as status;
SELECT 'Total capabilities: ' || COUNT(*) as info FROM public.capabilities;
SELECT 'Total role mappings: ' || COUNT(*) as info FROM public.role_capabilities;
