// apps/protected/lib/rbac/permissions.ts
/**
 * RBAC Permission System
 * Integrates with database capabilities and subscription tiers
 */

import { createClient } from "@/lib/supabase/server";

export type UserRole =
  | "owner"
  | "superadmin"
  | "admin"
  | "member"
  | "view-only";

export interface UserPermissions {
  role: UserRole;
  capabilities: string[];
  subscription: {
    tier: string;
    features: Record<string, boolean>;
    limits: {
      maxProjects?: number;
      maxTeamMembers?: number;
      maxStorageGB?: number;
    };
  };
}

/**
 * Get user's full permission context for an organization
 */
export async function getUserPermissions(
  userId: string,
  orgId: string
): Promise<UserPermissions | null> {
  const supabase = await createClient();

  try {
    // Get user's role in the organization
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("role")
      .eq("user_id", userId)
      .eq("org_id", orgId)
      .single();

    if (!profile) return null;

    // Get organization's subscription
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select(
        `
        tier_id,
        subscription_tiers (
          name,
          allows_custom_permissions,
          max_projects,
          max_team_members
        )
      `
      )
      .eq("org_id", orgId)
      .single();

    // Get user's capabilities based on role
    const capabilities = await getUserCapabilities(
      userId,
      orgId,
      profile.role as UserRole
    );

    const subscriptionTiers = subscription?.subscription_tiers as unknown as {
      name: string;
      allows_custom_permissions: boolean;
      max_projects: number;
      max_team_members: number;
    } | null;

    return {
      role: profile.role as UserRole,
      capabilities,
      subscription: {
        tier: subscriptionTiers?.name || "free",
        features: {
          customPermissions:
            subscriptionTiers?.allows_custom_permissions || false,
        },
        limits: {
          maxProjects: subscriptionTiers?.max_projects,
          maxTeamMembers: subscriptionTiers?.max_team_members,
        },
      },
    };
  } catch (error) {
    console.error("Error getting user permissions:", error);
    return null;
  }
}

/**
 * Get list of capability keys the user has
 */
async function getUserCapabilities(
  userId: string,
  orgId: string,
  role: UserRole
): Promise<string[]> {
  const supabase = await createClient();

  try {
    // Check for custom org overrides first
    const { data: customCapabilities } = await supabase
      .from("org_role_capabilities")
      .select(
        `
        capability_id,
        granted,
        capabilities (key)
      `
      )
      .eq("org_id", orgId)
      .eq("role", role);

    // Get default role capabilities
    const { data: defaultCapabilities } = await supabase
      .from("role_capabilities")
      .select(
        `
        capability_id,
        is_default,
        capabilities (key)
      `
      )
      .eq("role", role)
      .eq("is_default", true);

    // Merge custom and default capabilities
    const capabilityMap = new Map<string, boolean>();

    // Start with defaults
    if (defaultCapabilities) {
      for (const cap of defaultCapabilities) {
        const capabilities = cap.capabilities as unknown as {
          key: string;
        } | null;
        if (capabilities?.key) {
          capabilityMap.set(capabilities.key, true);
        }
      }
    }

    // Apply custom overrides
    if (customCapabilities) {
      for (const cap of customCapabilities) {
        const capabilities = cap.capabilities as unknown as {
          key: string;
        } | null;
        if (capabilities?.key) {
          capabilityMap.set(capabilities.key, cap.granted);
        }
      }
    }

    // Return only granted capabilities
    return Array.from(capabilityMap.entries())
      .filter(([, granted]) => granted)
      .map(([key]) => key);
  } catch (error) {
    console.error("Error getting user capabilities:", error);
    return [];
  }
}

/**
 * Check if user has a specific capability
 */
export async function userHasCapability(
  userId: string,
  orgId: string,
  capabilityKey: string
): Promise<boolean> {
  const permissions = await getUserPermissions(userId, orgId);
  return permissions?.capabilities.includes(capabilityKey) || false;
}

/**
 * Check if user has ANY of the specified capabilities
 */
export async function userHasAnyCapability(
  userId: string,
  orgId: string,
  capabilityKeys: string[]
): Promise<boolean> {
  const permissions = await getUserPermissions(userId, orgId);
  if (!permissions) return false;

  return capabilityKeys.some((key) => permissions.capabilities.includes(key));
}

/**
 * Check if user has ALL of the specified capabilities
 */
export async function userHasAllCapabilities(
  userId: string,
  orgId: string,
  capabilityKeys: string[]
): Promise<boolean> {
  const permissions = await getUserPermissions(userId, orgId);
  if (!permissions) return false;

  return capabilityKeys.every((key) => permissions.capabilities.includes(key));
}

/**
 * Check if user's role is in the allowed roles list
 */
export function hasRole(
  permissions: UserPermissions | null,
  allowedRoles: UserRole[]
): boolean {
  return permissions ? allowedRoles.includes(permissions.role) : false;
}

/**
 * Check if organization has reached usage limit
 */
export async function checkUsageLimit(
  orgId: string,
  limitType: "projects" | "team_members" | "storage"
): Promise<{
  reached: boolean;
  current: number;
  limit: number | null;
}> {
  const supabase = await createClient();

  try {
    // Get subscription limits
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select(
        `
        subscription_tiers (
          max_projects,
          max_team_members
        )
      `
      )
      .eq("org_id", orgId)
      .single();

    const subscriptionTiers = subscription?.subscription_tiers as unknown as {
      max_projects: number;
      max_team_members: number;
    } | null;

    let limit: number | null = null;
    let current = 0;

    switch (limitType) {
      case "projects": {
        limit = subscriptionTiers?.max_projects || null;
        const { count: projectCount } = await supabase
          .from("projects")
          .select("*", { count: "exact", head: true })
          .eq("org_id", orgId)
          .eq("status", "active");
        current = projectCount || 0;
        break;
      }

      case "team_members": {
        limit = subscriptionTiers?.max_team_members || null;
        const { count: memberCount } = await supabase
          .from("user_profiles")
          .select("*", { count: "exact", head: true })
          .eq("org_id", orgId);
        current = memberCount || 0;
        break;
      }

      case "storage": {
        // Implement storage tracking
        limit = null; // No limit by default
        current = 0;
        break;
      }
    }

    return {
      reached: limit !== null && current >= limit,
      current,
      limit,
    };
  } catch (error) {
    console.error("Error checking usage limit:", error);
    return { reached: false, current: 0, limit: null };
  }
}

/**
 * Feature flags based on subscription tier
 */
export const FEATURE_FLAGS = {
  projects: {
    create: ["projects.create"],
    view: ["projects.view"],
    edit: ["projects.edit"],
    delete: ["projects.delete"],
    archive: ["projects.archive"],
  },
  team: {
    invite: ["team.invite"],
    remove: ["team.remove"],
    view: ["team.view"],
    manageRoles: ["team.manage_roles"],
  },
  billing: {
    view: ["billing.view"],
    manage: ["billing.manage"],
    upgrade: ["subscription.upgrade"],
  },
  organization: {
    viewSettings: ["org.settings.view"],
    editSettings: ["org.settings.edit"],
    delete: ["org.delete"],
  },
  profile: {
    editOwn: ["profile.edit_own"],
    editOthers: ["profile.edit_others"],
    uploadPicture: ["profile.upload_picture"],
  },
  security: {
    viewOwn: ["security.view_own"],
    editOwn: ["security.edit_own"],
    viewOrgAudit: ["security.view_org_audit"],
    manageSessions: ["security.manage_sessions"],
  },
  notifications: {
    editOwn: ["notifications.edit_own"],
  },
  analytics: {
    view: ["analytics.view"],
    generateReports: ["reports.generate"],
    exportReports: ["reports.export"],
  },
} as const;

/**
 * Navigation items filtered by permissions
 */
export interface NavigationItem {
  title: string;
  href: string;
  icon: string;
  description?: string;
  requiredCapabilities?: string[];
  requiredRoles?: UserRole[];
}

export function filterNavigationByPermissions(
  items: NavigationItem[],
  permissions: UserPermissions | null
): NavigationItem[] {
  if (!permissions) return [];

  return items.filter((item) => {
    // Check role requirements
    if (item.requiredRoles && !hasRole(permissions, item.requiredRoles)) {
      return false;
    }

    // Check capability requirements
    if (item.requiredCapabilities) {
      return item.requiredCapabilities.some((cap) =>
        permissions.capabilities.includes(cap)
      );
    }

    return true;
  });
}
