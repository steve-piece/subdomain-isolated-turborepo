-- Seed script for capabilities and role mappings
-- Run this after SETTINGS_DATABASE_SCHEMA.sql

-- ============================================================================
-- 1. INSERT SEED DATA
-- ============================================================================

-- INSERT ROLES
INSERT INTO public.subscription_tiers
  (name, allows_custom_permissions, max_projects, max_team_members, stripe_product_id, stripe_price_id, price_monthly, price_yearly)
VALUES
  ('free', false, 3, 5, 'prod_free_placeholder',    'price_free_placeholder',           0,    0),
  ('pro',  false, 50, 25, 'prod_pro_placeholder',     'price_pro_monthly_placeholder', 2900, 29000),
  ('business', true, 500, 100, 'prod_business_placeholder', 'price_business_monthly_placeholder', 9900, 99000),
  ('enterprise', true,  NULL, NULL, 'prod_enterprise_placeholder', NULL,                         NULL,   NULL);

-- Get the pro tier ID to use for capabilities
WITH pro_tier AS (
  SELECT id FROM public.subscription_tiers WHERE name = 'pro' LIMIT 1
)
INSERT INTO "public"."capabilities" ("key", "name", "description", "category", "requires_tier_id", "min_role_required") 
SELECT 
  'billing.manage', 'Manage Billing', 'Update billing details', 'billing', pro_tier.id, 'admin'::user_role
FROM pro_tier
UNION ALL
SELECT 'projects.archive', 'Archive Projects', 'Archive projects', 'projects', pro_tier.id, 'admin'::user_role FROM pro_tier
UNION ALL
SELECT 'billing.upgrade', 'Upgrade Subscription', 'Initiate subscription upgrades', 'billing', pro_tier.id, 'admin'::user_role FROM pro_tier
UNION ALL
SELECT 'org.settings_edit', 'Edit Settings', 'Edit org settings', 'organization', pro_tier.id, 'superadmin'::user_role FROM pro_tier
UNION ALL
SELECT 'org.settings.edit', 'Edit Organization Settings', 'Edit organization general settings', 'organization', pro_tier.id, 'admin'::user_role FROM pro_tier
UNION ALL
SELECT 'projects.edit_own', 'Edit Own Projects', 'Edit projects you are a member of', 'projects', pro_tier.id, 'member'::user_role FROM pro_tier
UNION ALL
SELECT 'analytics.export', 'Export Analytics', 'Export analytics data', 'analytics', pro_tier.id, 'admin'::user_role FROM pro_tier
UNION ALL
SELECT 'org.delete', 'Delete Organization', 'Delete organization', 'organization', pro_tier.id, 'superadmin'::user_role FROM pro_tier
UNION ALL
SELECT 'org.logo.upload', 'Upload Organization Logo', 'Upload organization logo', 'organization', pro_tier.id, 'admin'::user_role FROM pro_tier
UNION ALL
SELECT 'team.remove', 'Remove Members', 'Remove team members', 'team', pro_tier.id, 'admin'::user_role FROM pro_tier
UNION ALL
SELECT 'billing.view', 'View Billing', 'View billing information', 'billing', pro_tier.id, 'admin'::user_role FROM pro_tier
UNION ALL
SELECT 'profile.edit_own', 'Edit Own Profile', 'Edit own profile information', 'profile', pro_tier.id, 'member'::user_role FROM pro_tier
UNION ALL
SELECT 'org.settings_view', 'View Settings', 'View org settings', 'organization', pro_tier.id, 'admin'::user_role FROM pro_tier
UNION ALL
SELECT 'reports.export', 'Export Reports', 'Export report data', 'analytics', pro_tier.id, 'superadmin'::user_role FROM pro_tier
UNION ALL
SELECT 'projects.manage', 'Manage Projects', 'Can manage project settings and members', 'projects', pro_tier.id, 'member'::user_role FROM pro_tier
UNION ALL
SELECT 'security.view_own', 'View Own Security', 'View own security settings', 'security', pro_tier.id, 'view-only'::user_role FROM pro_tier
UNION ALL
SELECT 'projects.view', 'View Projects', 'View all org projects', 'projects', pro_tier.id, 'view-only'::user_role FROM pro_tier
UNION ALL
SELECT 'projects.delete', 'Delete Projects', 'Delete projects', 'projects', pro_tier.id, 'admin'::user_role FROM pro_tier
UNION ALL
SELECT 'projects.delete_all', 'Delete Any Project', 'Delete any project in the organization', 'projects', pro_tier.id, 'admin'::user_role FROM pro_tier
UNION ALL
SELECT 'org.team_settings.view', 'View Team Settings', 'View team-specific organization settings', 'organization', pro_tier.id, 'admin'::user_role FROM pro_tier
UNION ALL
SELECT 'projects.edit_all', 'Edit All Projects', 'Edit any project in the organization', 'projects', pro_tier.id, 'admin'::user_role FROM pro_tier
UNION ALL
SELECT 'org.team_settings.edit', 'Edit Team Settings', 'Edit team management settings', 'organization', pro_tier.id, 'admin'::user_role FROM pro_tier
UNION ALL
SELECT 'profile.edit_others', 'Edit Others Profiles', 'Edit other users profiles', 'profile', pro_tier.id, 'superadmin'::user_role FROM pro_tier
UNION ALL
SELECT 'security.manage_sessions', 'Manage Sessions', 'Manage active sessions', 'security', pro_tier.id, 'member'::user_role FROM pro_tier
UNION ALL
SELECT 'team.manage_roles', 'Manage Roles', 'Change member roles', 'team', pro_tier.id, 'admin'::user_role FROM pro_tier
UNION ALL
SELECT 'team.invite', 'Invite Members', 'Invite new team members', 'team', pro_tier.id, 'admin'::user_role FROM pro_tier
UNION ALL
SELECT 'projects.view_all', 'View All Projects', 'View all projects in the organization', 'projects', pro_tier.id, 'admin'::user_role FROM pro_tier
UNION ALL
SELECT 'security.edit_own', 'Edit Own Security', 'Edit own security settings', 'security', pro_tier.id, 'member'::user_role FROM pro_tier
UNION ALL
SELECT 'team.view', 'View Team', 'View team members', 'team', pro_tier.id, 'view-only'::user_role FROM pro_tier
UNION ALL
SELECT 'projects.archive_all', 'Archive Any Project', 'Archive any project in the organization', 'projects', pro_tier.id, 'admin'::user_role FROM pro_tier
UNION ALL
SELECT 'analytics.generate', 'Generate Reports', 'Generate custom reports', 'analytics', pro_tier.id, 'admin'::user_role FROM pro_tier
UNION ALL
SELECT 'profile.upload_picture', 'Upload Profile Picture', 'Upload profile picture', 'profile', pro_tier.id, 'member'::user_role FROM pro_tier
UNION ALL
SELECT 'projects.edit', 'Edit Projects', 'Edit project settings', 'projects', pro_tier.id, 'admin'::user_role FROM pro_tier
UNION ALL
SELECT 'projects.create', 'Create Projects', 'Create new projects', 'projects', pro_tier.id, 'member'::user_role FROM pro_tier
UNION ALL
SELECT 'reports.generate', 'Generate Reports', 'Generate usage reports', 'analytics', pro_tier.id, 'admin'::user_role FROM pro_tier
UNION ALL
SELECT 'notifications.edit_own', 'Edit Own Notifications', 'Edit own notification preferences', 'notifications', pro_tier.id, 'member'::user_role FROM pro_tier
UNION ALL
SELECT 'security.view_org_audit', 'View Org Security Audit', 'View organization security audit log', 'security', pro_tier.id, 'admin'::user_role FROM pro_tier
UNION ALL
SELECT 'subscription.upgrade', 'Upgrade Subscription', 'Upgrade subscription tier', 'billing', pro_tier.id, 'superadmin'::user_role FROM pro_tier
UNION ALL
SELECT 'projects.view_own', 'View Own Projects', 'View projects you are a member of', 'projects', pro_tier.id, 'view-only'::user_role FROM pro_tier
UNION ALL
SELECT 'org.settings.delete', 'Delete Organization', 'Delete the entire organization', 'organization', pro_tier.id, 'owner'::user_role FROM pro_tier
UNION ALL
SELECT 'org.settings.view', 'View Org Settings', 'View general organization settings', 'organization', pro_tier.id, 'admin'::user_role FROM pro_tier
UNION ALL
SELECT 'analytics.view', 'View Analytics', 'View usage analytics', 'analytics', pro_tier.id, 'view-only'::user_role FROM pro_tier;
