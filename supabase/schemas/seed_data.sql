-- Seed script for capabilities and role mappings
-- Run this after SETTINGS_DATABASE_SCHEMA.sql

-- ============================================================================
-- 1. INSERT SEED DATA
-- ============================================================================

-- INSERT ROLES
INSERT INTO public.subscription_tiers
  (name, allows_custom_permissions, max_projects, max_team_members, stripe_product_id, stripe_price_id, price_monthly, price_yearly)
VALUES
  ('pro',  false, 50, 25, 'prod_pro_placeholder',     'price_pro_monthly_placeholder', 2900, 29000),
  ('enterprise', true,  NULL, NULL, 'prod_enterprise_placeholder', NULL,                         NULL,   NULL),
  ('business', true, 500, 100, 'prod_business_placeholder', 'price_business_monthly_placeholder', 9900, 99000),
  ('free', false, 3, 5, 'prod_free_placeholder',    'price_free_placeholder',           0,    0);

-- INSERT CAPABILITIES
INSERT INTO "public"."capabilities" ("key", "name", "description", "category", "requires_tier_id", "created_at", "updated_at", "min_role_required") VALUES 
('billing.manage', 'Manage Billing', 'Update billing details', 'billing', 'af1fecfe-f24e-4818-b741-af1bed015e48', '2025-09-29 19:51:36.904235+00', '2025-10-06 22:51:44.464418+00', 'admin'),
('projects.archive', 'Archive Projects', 'Archive projects', 'projects', 'af1fecfe-f24e-4818-b741-af1bed015e48', '2025-09-29 19:51:36.904235+00', '2025-10-06 22:51:53.721519+00', 'admin'),
('billing.upgrade', 'Upgrade Subscription', 'Initiate subscription upgrades', 'billing', 'af1fecfe-f24e-4818-b741-af1bed015e48', '2025-09-30 02:26:42.545111+00', '2025-10-06 22:56:53.118521+00', 'admin'),
('org.settings_edit', 'Edit Settings', 'Edit org settings', 'organization', 'af1fecfe-f24e-4818-b741-af1bed015e48', '2025-09-29 19:51:36.904235+00', '2025-10-06 22:56:53.118521+00', 'superadmin'),
('org.settings.edit', 'Edit Organization Settings', 'Edit organization general settings', 'organization', 'af1fecfe-f24e-4818-b741-af1bed015e48', '2025-09-30 02:24:02.550333+00', '2025-10-06 22:56:53.118521+00', 'admin'),
('projects.edit_own', 'Edit Own Projects', 'Edit projects you are a member of', 'projects', 'af1fecfe-f24e-4818-b741-af1bed015e48', '2025-09-30 02:26:42.545111+00', '2025-10-06 22:56:53.118521+00', 'member'),
('analytics.export', 'Export Analytics', 'Export analytics data', 'analytics', 'af1fecfe-f24e-4818-b741-af1bed015e48', '2025-09-30 02:26:42.545111+00', '2025-10-06 22:56:53.118521+00', 'admin'),
('org.delete', 'Delete Organization', 'Delete organization', 'organization', 'af1fecfe-f24e-4818-b741-af1bed015e48', '2025-09-29 19:51:36.904235+00', '2025-10-06 22:56:53.118521+00', 'superadmin'),
('org.logo.upload', 'Upload Organization Logo', 'Upload organization logo', 'organization', 'af1fecfe-f24e-4818-b741-af1bed015e48', '2025-09-30 02:24:02.550333+00', '2025-10-06 22:56:53.118521+00', 'admin'),
('team.remove', 'Remove Members', 'Remove team members', 'team', 'af1fecfe-f24e-4818-b741-af1bed015e48', '2025-09-29 19:51:36.904235+00', '2025-10-06 22:56:53.118521+00', 'admin'),
('billing.view', 'View Billing', 'View billing information', 'billing', 'af1fecfe-f24e-4818-b741-af1bed015e48', '2025-09-29 19:51:36.904235+00', '2025-10-06 22:56:53.118521+00', 'admin'),
('profile.edit_own', 'Edit Own Profile', 'Edit own profile information', 'profile', 'af1fecfe-f24e-4818-b741-af1bed015e48', '2025-09-30 02:24:02.550333+00', '2025-10-06 22:56:53.118521+00', 'member'),
('org.settings_view', 'View Settings', 'View org settings', 'organization', 'af1fecfe-f24e-4818-b741-af1bed015e48', '2025-09-29 19:51:36.904235+00', '2025-10-06 22:56:53.118521+00', 'admin'),
('reports.export', 'Export Reports', 'Export report data', 'analytics', 'af1fecfe-f24e-4818-b741-af1bed015e48', '2025-09-29 19:51:36.904235+00', '2025-10-06 22:56:53.118521+00', 'superadmin'),
('projects.manage', 'Manage Projects', 'Can manage project settings and members', 'projects', 'af1fecfe-f24e-4818-b741-af1bed015e48', '2025-10-02 06:49:32.197206+00', '2025-10-06 22:56:53.118521+00', 'member'),
('security.view_own', 'View Own Security', 'View own security settings', 'security', 'af1fecfe-f24e-4818-b741-af1bed015e48', '2025-09-30 02:24:02.550333+00', '2025-10-06 22:56:53.118521+00', 'view-only'),
('projects.view', 'View Projects', 'View all org projects', 'projects', 'af1fecfe-f24e-4818-b741-af1bed015e48', '2025-09-29 19:51:36.904235+00', '2025-10-06 22:56:53.118521+00', 'view-only'),
('projects.delete', 'Delete Projects', 'Delete projects', 'projects', 'af1fecfe-f24e-4818-b741-af1bed015e48', '2025-09-29 19:51:36.904235+00', '2025-10-06 22:56:53.118521+00', 'admin'),
('projects.delete_all', 'Delete Any Project', 'Delete any project in the organization', 'projects', 'af1fecfe-f24e-4818-b741-af1bed015e48', '2025-09-30 02:26:42.545111+00', '2025-10-06 22:56:53.118521+00', 'admin'),
('org.team_settings.view', 'View Team Settings', 'View team-specific organization settings', 'organization', 'af1fecfe-f24e-4818-b741-af1bed015e48', '2025-09-30 02:26:42.545111+00', '2025-10-06 22:56:53.118521+00', 'admin'),
('projects.edit_all', 'Edit All Projects', 'Edit any project in the organization', 'projects', 'af1fecfe-f24e-4818-b741-af1bed015e48', '2025-09-30 02:26:42.545111+00', '2025-10-06 22:56:53.118521+00', 'admin'),
('org.team_settings.edit', 'Edit Team Settings', 'Edit team management settings', 'organization', 'af1fecfe-f24e-4818-b741-af1bed015e48', '2025-09-30 02:24:02.550333+00', '2025-10-06 22:56:53.118521+00', 'admin'),
('profile.edit_others', 'Edit Others Profiles', 'Edit other users profiles', 'profile', 'af1fecfe-f24e-4818-b741-af1bed015e48', '2025-09-30 02:24:02.550333+00', '2025-10-06 22:56:53.118521+00', 'superadmin'),
('security.manage_sessions', 'Manage Sessions', 'Manage active sessions', 'security', 'af1fecfe-f24e-4818-b741-af1bed015e48', '2025-09-30 02:24:02.550333+00', '2025-10-06 22:56:53.118521+00', 'member'),
('team.manage_roles', 'Manage Roles', 'Change member roles', 'team', 'af1fecfe-f24e-4818-b741-af1bed015e48', '2025-09-29 19:51:36.904235+00', '2025-10-06 22:56:53.118521+00', 'admin'),
('team.invite', 'Invite Members', 'Invite new team members', 'team', 'af1fecfe-f24e-4818-b741-af1bed015e48', '2025-09-29 19:51:36.904235+00', '2025-10-06 22:56:53.118521+00', 'admin'),
('projects.view_all', 'View All Projects', 'View all projects in the organization', 'projects', 'af1fecfe-f24e-4818-b741-af1bed015e48', '2025-09-30 02:26:42.545111+00', '2025-10-06 22:56:53.118521+00', 'admin'),
('security.edit_own', 'Edit Own Security', 'Edit own security settings', 'security', 'af1fecfe-f24e-4818-b741-af1bed015e48', '2025-09-30 02:24:02.550333+00', '2025-10-06 22:56:53.118521+00', 'member'),
('team.view', 'View Team', 'View team members', 'team', 'af1fecfe-f24e-4818-b741-af1bed015e48', '2025-09-29 19:51:36.904235+00', '2025-10-06 22:56:53.118521+00', 'view-only'),
('projects.archive_all', 'Archive Any Project', 'Archive any project in the organization', 'projects', 'af1fecfe-f24e-4818-b741-af1bed015e48', '2025-09-30 02:26:42.545111+00', '2025-10-06 22:56:53.118521+00', 'admin'),
('analytics.generate', 'Generate Reports', 'Generate custom reports', 'analytics', 'af1fecfe-f24e-4818-b741-af1bed015e48', '2025-09-30 02:26:42.545111+00', '2025-10-06 22:56:53.118521+00', 'admin'),
('profile.upload_picture', 'Upload Profile Picture', 'Upload profile picture', 'profile', 'af1fecfe-f24e-4818-b741-af1bed015e48', '2025-09-30 02:24:02.550333+00', '2025-10-06 22:56:53.118521+00', 'member'),
('projects.edit', 'Edit Projects', 'Edit project settings', 'projects', 'af1fecfe-f24e-4818-b741-af1bed015e48', '2025-09-29 19:51:36.904235+00', '2025-10-06 22:56:53.118521+00', 'admin'),
('projects.create', 'Create Projects', 'Create new projects', 'projects', 'af1fecfe-f24e-4818-b741-af1bed015e48', '2025-09-29 19:51:36.904235+00', '2025-10-06 22:56:53.118521+00', 'member'),
('reports.generate', 'Generate Reports', 'Generate usage reports', 'analytics', 'af1fecfe-f24e-4818-b741-af1bed015e48', '2025-09-29 19:51:36.904235+00', '2025-10-06 22:56:53.118521+00', 'admin'),
('notifications.edit_own', 'Edit Own Notifications', 'Edit own notification preferences', 'notifications', 'af1fecfe-f24e-4818-b741-af1bed015e48', '2025-09-30 02:24:02.550333+00', '2025-10-06 22:56:53.118521+00', 'member'),
('security.view_org_audit', 'View Org Security Audit', 'View organization security audit log', 'security', 'af1fecfe-f24e-4818-b741-af1bed015e48', '2025-09-30 02:24:02.550333+00', '2025-10-06 22:56:53.118521+00', 'admin'),
('subscription.upgrade', 'Upgrade Subscription', 'Upgrade subscription tier', 'billing', 'af1fecfe-f24e-4818-b741-af1bed015e48', '2025-09-29 19:51:36.904235+00', '2025-10-06 22:56:53.118521+00', 'superadmin'),
('projects.view_own', 'View Own Projects', 'View projects you are a member of', 'projects', 'af1fecfe-f24e-4818-b741-af1bed015e48', '2025-09-30 02:26:42.545111+00', '2025-10-06 22:56:53.118521+00', 'view-only'),
('org.settings.delete', 'Delete Organization', 'Delete the entire organization', 'organization', 'af1fecfe-f24e-4818-b741-af1bed015e48', '2025-09-30 02:26:42.545111+00', '2025-10-06 22:56:53.118521+00', 'owner'),
('org.settings.view', 'View Org Settings', 'View general organization settings', 'organization', 'af1fecfe-f24e-4818-b741-af1bed015e48', '2025-09-30 02:26:42.545111+00', '2025-10-06 22:56:53.118521+00', 'admin'),
('analytics.view', 'View Analytics', 'View usage analytics', 'analytics', 'af1fecfe-f24e-4818-b741-af1bed015e48', '2025-09-29 19:51:36.904235+00', '2025-10-06 22:56:53.118521+00', 'view-only');
