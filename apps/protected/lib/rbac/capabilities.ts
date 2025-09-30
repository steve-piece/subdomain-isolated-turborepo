// apps/protected/lib/rbac/capabilities.ts
/**
 * Capability-based access control utilities
 * Maps to database capabilities table and role_capabilities
 */

export type CapabilityKey =
  // Projects
  | "projects.create"
  | "projects.view"
  | "projects.edit"
  | "projects.delete"
  | "projects.archive"
  // Team
  | "team.invite"
  | "team.remove"
  | "team.view"
  | "team.manage_roles"
  // Billing
  | "billing.view"
  | "billing.manage"
  | "subscription.upgrade"
  // Organization
  | "org.settings.view"
  | "org.settings.edit"
  | "org.delete"
  // Analytics
  | "analytics.view"
  | "reports.generate"
  | "reports.export";

export type CapabilityCategory =
  | "projects"
  | "team"
  | "billing"
  | "organization"
  | "analytics";

export interface Capability {
  key: CapabilityKey;
  name: string;
  description: string;
  category: CapabilityCategory;
}

export const CAPABILITIES: Record<CapabilityKey, Capability> = {
  // Projects
  "projects.create": {
    key: "projects.create",
    name: "Create Projects",
    description: "Create new projects",
    category: "projects",
  },
  "projects.view": {
    key: "projects.view",
    name: "View Projects",
    description: "View all org projects",
    category: "projects",
  },
  "projects.edit": {
    key: "projects.edit",
    name: "Edit Projects",
    description: "Edit project settings",
    category: "projects",
  },
  "projects.delete": {
    key: "projects.delete",
    name: "Delete Projects",
    description: "Delete projects",
    category: "projects",
  },
  "projects.archive": {
    key: "projects.archive",
    name: "Archive Projects",
    description: "Archive projects",
    category: "projects",
  },

  // Team
  "team.invite": {
    key: "team.invite",
    name: "Invite Members",
    description: "Invite new team members",
    category: "team",
  },
  "team.remove": {
    key: "team.remove",
    name: "Remove Members",
    description: "Remove team members",
    category: "team",
  },
  "team.view": {
    key: "team.view",
    name: "View Team",
    description: "View team members",
    category: "team",
  },
  "team.manage_roles": {
    key: "team.manage_roles",
    name: "Manage Roles",
    description: "Change member roles",
    category: "team",
  },

  // Billing
  "billing.view": {
    key: "billing.view",
    name: "View Billing",
    description: "View billing information",
    category: "billing",
  },
  "billing.manage": {
    key: "billing.manage",
    name: "Manage Billing",
    description: "Update billing details",
    category: "billing",
  },
  "subscription.upgrade": {
    key: "subscription.upgrade",
    name: "Upgrade Subscription",
    description: "Upgrade subscription tier",
    category: "billing",
  },

  // Organization
  "org.settings.view": {
    key: "org.settings.view",
    name: "View Settings",
    description: "View org settings",
    category: "organization",
  },
  "org.settings.edit": {
    key: "org.settings.edit",
    name: "Edit Settings",
    description: "Edit org settings",
    category: "organization",
  },
  "org.delete": {
    key: "org.delete",
    name: "Delete Organization",
    description: "Delete organization",
    category: "organization",
  },

  // Analytics
  "analytics.view": {
    key: "analytics.view",
    name: "View Analytics",
    description: "View usage analytics",
    category: "analytics",
  },
  "reports.generate": {
    key: "reports.generate",
    name: "Generate Reports",
    description: "Generate usage reports",
    category: "analytics",
  },
  "reports.export": {
    key: "reports.export",
    name: "Export Reports",
    description: "Export report data",
    category: "analytics",
  },
};

/**
 * Get capabilities by category
 */
export function getCapabilitiesByCategory(
  category: CapabilityCategory
): Capability[] {
  return Object.values(CAPABILITIES).filter((cap) => cap.category === category);
}

/**
 * Check if a capability exists
 */
export function isValidCapability(key: string): key is CapabilityKey {
  return key in CAPABILITIES;
}
