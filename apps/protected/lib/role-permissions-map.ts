// lib/role-permissions-map.ts
/**
 * Default role permissions mapping
 * Based on capabilities from the database
 */

export type UserRole =
  | "owner"
  | "superadmin"
  | "admin"
  | "member"
  | "view-only";

export interface Permission {
  key: string;
  name: string;
  category: string;
  description?: string;
}

export const PERMISSION_CATEGORIES = [
  { key: "team", name: "Team Management", icon: "Users" },
  { key: "projects", name: "Projects", icon: "FolderKanban" },
  { key: "organization", name: "Organization", icon: "Building2" },
  { key: "billing", name: "Billing", icon: "CreditCard" },
  { key: "analytics", name: "Analytics", icon: "BarChart3" },
  { key: "security", name: "Security", icon: "Shield" },
  { key: "profile", name: "Profile", icon: "User" },
  { key: "notifications", name: "Notifications", icon: "Bell" },
] as const;

export const DEFAULT_PERMISSIONS: Record<UserRole, Permission[]> = {
  owner: [
    // Team
    { key: "team.view", name: "View Team", category: "team" },
    { key: "team.invite", name: "Invite Members", category: "team" },
    { key: "team.manage_roles", name: "Manage Roles", category: "team" },
    { key: "team.remove", name: "Remove Members", category: "team" },

    // Projects
    { key: "projects.view", name: "View All Projects", category: "projects" },
    { key: "projects.create", name: "Create Projects", category: "projects" },
    {
      key: "projects.edit_all",
      name: "Edit All Projects",
      category: "projects",
    },
    {
      key: "projects.delete_all",
      name: "Delete Any Project",
      category: "projects",
    },
    {
      key: "projects.archive_all",
      name: "Archive Any Project",
      category: "projects",
    },
    {
      key: "projects.manage",
      name: "Manage Project Settings",
      category: "projects",
    },

    // Organization
    {
      key: "org.settings.view",
      name: "View Organization Settings",
      category: "organization",
    },
    {
      key: "org.settings.edit",
      name: "Edit Organization Settings",
      category: "organization",
    },
    {
      key: "org.team_settings.edit",
      name: "Edit Team Settings",
      category: "organization",
    },
    {
      key: "org.logo.upload",
      name: "Upload Organization Logo",
      category: "organization",
    },
    {
      key: "org.delete",
      name: "Delete Organization",
      category: "organization",
    },

    // Billing
    { key: "billing.view", name: "View Billing", category: "billing" },
    { key: "billing.manage", name: "Manage Billing", category: "billing" },
    {
      key: "billing.upgrade",
      name: "Upgrade Subscription",
      category: "billing",
    },

    // Analytics
    { key: "analytics.view", name: "View Analytics", category: "analytics" },
    {
      key: "analytics.generate",
      name: "Generate Reports",
      category: "analytics",
    },
    {
      key: "analytics.export",
      name: "Export Analytics",
      category: "analytics",
    },

    // Security
    {
      key: "security.view_own",
      name: "View Own Security",
      category: "security",
    },
    {
      key: "security.edit_own",
      name: "Edit Own Security",
      category: "security",
    },
    {
      key: "security.manage_sessions",
      name: "Manage Sessions",
      category: "security",
    },
    {
      key: "security.view_org_audit",
      name: "View Org Security Audit",
      category: "security",
    },

    // Profile
    { key: "profile.edit_own", name: "Edit Own Profile", category: "profile" },
    {
      key: "profile.edit_others",
      name: "Edit Others Profiles",
      category: "profile",
    },
    {
      key: "profile.upload_picture",
      name: "Upload Profile Picture",
      category: "profile",
    },

    // Notifications
    {
      key: "notifications.edit_own",
      name: "Edit Own Notifications",
      category: "notifications",
    },
  ],

  superadmin: [
    // Team
    { key: "team.view", name: "View Team", category: "team" },
    { key: "team.invite", name: "Invite Members", category: "team" },
    {
      key: "team.manage_roles",
      name: "Manage Roles (limited)",
      category: "team",
    },
    { key: "team.remove", name: "Remove Members (limited)", category: "team" },

    // Projects
    { key: "projects.view", name: "View All Projects", category: "projects" },
    { key: "projects.create", name: "Create Projects", category: "projects" },
    {
      key: "projects.edit_all",
      name: "Edit All Projects",
      category: "projects",
    },
    {
      key: "projects.delete_all",
      name: "Delete Any Project",
      category: "projects",
    },
    {
      key: "projects.archive_all",
      name: "Archive Any Project",
      category: "projects",
    },
    {
      key: "projects.manage",
      name: "Manage Project Settings",
      category: "projects",
    },

    // Organization
    {
      key: "org.settings.view",
      name: "View Organization Settings",
      category: "organization",
    },
    {
      key: "org.settings.edit",
      name: "Edit Organization Settings",
      category: "organization",
    },
    {
      key: "org.team_settings.edit",
      name: "Edit Team Settings",
      category: "organization",
    },
    {
      key: "org.logo.upload",
      name: "Upload Organization Logo",
      category: "organization",
    },

    // Billing
    { key: "billing.view", name: "View Billing", category: "billing" },
    { key: "billing.manage", name: "Manage Billing", category: "billing" },
    {
      key: "billing.upgrade",
      name: "Upgrade Subscription",
      category: "billing",
    },

    // Analytics
    { key: "analytics.view", name: "View Analytics", category: "analytics" },
    {
      key: "analytics.generate",
      name: "Generate Reports",
      category: "analytics",
    },
    {
      key: "analytics.export",
      name: "Export Analytics",
      category: "analytics",
    },

    // Security
    {
      key: "security.view_own",
      name: "View Own Security",
      category: "security",
    },
    {
      key: "security.edit_own",
      name: "Edit Own Security",
      category: "security",
    },
    {
      key: "security.manage_sessions",
      name: "Manage Sessions",
      category: "security",
    },
    {
      key: "security.view_org_audit",
      name: "View Org Security Audit",
      category: "security",
    },

    // Profile
    { key: "profile.edit_own", name: "Edit Own Profile", category: "profile" },
    {
      key: "profile.edit_others",
      name: "Edit Others Profiles",
      category: "profile",
    },
    {
      key: "profile.upload_picture",
      name: "Upload Profile Picture",
      category: "profile",
    },

    // Notifications
    {
      key: "notifications.edit_own",
      name: "Edit Own Notifications",
      category: "notifications",
    },
  ],

  admin: [
    // Team
    { key: "team.view", name: "View Team", category: "team" },
    { key: "team.invite", name: "Invite Members", category: "team" },
    {
      key: "team.manage_roles",
      name: "Manage Roles (basic)",
      category: "team",
    },
    { key: "team.remove", name: "Remove Members (basic)", category: "team" },

    // Projects
    { key: "projects.view", name: "View All Projects", category: "projects" },
    { key: "projects.create", name: "Create Projects", category: "projects" },
    {
      key: "projects.edit_all",
      name: "Edit All Projects",
      category: "projects",
    },
    {
      key: "projects.delete_all",
      name: "Delete Any Project",
      category: "projects",
    },
    {
      key: "projects.archive_all",
      name: "Archive Any Project",
      category: "projects",
    },
    {
      key: "projects.manage",
      name: "Manage Project Settings",
      category: "projects",
    },

    // Organization
    {
      key: "org.settings.view",
      name: "View Organization Settings",
      category: "organization",
    },
    {
      key: "org.settings.edit",
      name: "Edit Organization Settings",
      category: "organization",
    },
    {
      key: "org.team_settings.edit",
      name: "Edit Team Settings",
      category: "organization",
    },
    {
      key: "org.logo.upload",
      name: "Upload Organization Logo",
      category: "organization",
    },

    // Billing
    { key: "billing.view", name: "View Billing", category: "billing" },
    { key: "billing.manage", name: "Manage Billing", category: "billing" },
    {
      key: "billing.upgrade",
      name: "Upgrade Subscription",
      category: "billing",
    },

    // Analytics
    { key: "analytics.view", name: "View Analytics", category: "analytics" },
    {
      key: "analytics.generate",
      name: "Generate Reports",
      category: "analytics",
    },
    {
      key: "analytics.export",
      name: "Export Analytics",
      category: "analytics",
    },

    // Security
    {
      key: "security.view_own",
      name: "View Own Security",
      category: "security",
    },
    {
      key: "security.edit_own",
      name: "Edit Own Security",
      category: "security",
    },
    {
      key: "security.manage_sessions",
      name: "Manage Sessions",
      category: "security",
    },
    {
      key: "security.view_org_audit",
      name: "View Org Security Audit",
      category: "security",
    },

    // Profile
    { key: "profile.edit_own", name: "Edit Own Profile", category: "profile" },
    {
      key: "profile.upload_picture",
      name: "Upload Profile Picture",
      category: "profile",
    },

    // Notifications
    {
      key: "notifications.edit_own",
      name: "Edit Own Notifications",
      category: "notifications",
    },
  ],

  member: [
    // Team
    { key: "team.view", name: "View Team", category: "team" },

    // Projects
    {
      key: "projects.view",
      name: "View Assigned Projects",
      category: "projects",
    },
    { key: "projects.create", name: "Create Projects", category: "projects" },
    {
      key: "projects.edit_own",
      name: "Edit Own Projects",
      category: "projects",
    },
    {
      key: "projects.manage",
      name: "Manage Project Settings",
      category: "projects",
    },

    // Security
    {
      key: "security.view_own",
      name: "View Own Security",
      category: "security",
    },
    {
      key: "security.edit_own",
      name: "Edit Own Security",
      category: "security",
    },
    {
      key: "security.manage_sessions",
      name: "Manage Sessions",
      category: "security",
    },

    // Profile
    { key: "profile.edit_own", name: "Edit Own Profile", category: "profile" },
    {
      key: "profile.upload_picture",
      name: "Upload Profile Picture",
      category: "profile",
    },

    // Notifications
    {
      key: "notifications.edit_own",
      name: "Edit Own Notifications",
      category: "notifications",
    },
  ],

  "view-only": [
    // Team
    { key: "team.view", name: "View Team", category: "team" },

    // Projects
    {
      key: "projects.view",
      name: "View Assigned Projects",
      category: "projects",
    },

    // Analytics
    { key: "analytics.view", name: "View Analytics", category: "analytics" },

    // Security
    {
      key: "security.view_own",
      name: "View Own Security",
      category: "security",
    },
  ],
};

export function getPermissionsForRole(role: UserRole): Permission[] {
  return DEFAULT_PERMISSIONS[role] || [];
}

export function hasPermission(role: UserRole, permissionKey: string): boolean {
  const permissions = getPermissionsForRole(role);
  return permissions.some((p) => p.key === permissionKey);
}
