/**
 * Role Hierarchy Utility
 *
 * Defines the role hierarchy for the application and provides helper functions
 * for role-based access control.
 */

import type { AppRole } from "@/lib/types";

/**
 * Role hierarchy from lowest to highest privilege.
 * Higher roles inherit all capabilities of lower roles.
 */
const ROLE_HIERARCHY: AppRole[] = [
  "guest",
  "member",
  "admin",
  "owner",
  "superadmin",
];

/**
 * Get the privilege level (rank) of a role.
 * Higher numbers = more privileges.
 */
export function getRoleRank(role: AppRole): number {
  const index = ROLE_HIERARCHY.indexOf(role);
  return index === -1 ? -1 : index;
}

/**
 * Check if a user's role meets the minimum required role.
 *
 * @param userRole - The user's current role
 * @param requiredRole - The minimum required role
 * @returns true if user's role is equal to or higher than required role
 */
export function hasMinimumRole(
  userRole: AppRole,
  requiredRole: AppRole
): boolean {
  return getRoleRank(userRole) >= getRoleRank(requiredRole);
}

/**
 * Check if a user's role matches any of the allowed roles.
 * Uses role hierarchy - higher roles can access lower role features.
 *
 * @param userRole - The user's current role
 * @param allowedRoles - Array of roles that can access this feature
 * @returns true if user's role is allowed (equal to or higher than lowest allowed role)
 */
export function hasRoleAccess(
  userRole: AppRole,
  allowedRoles: AppRole[]
): boolean {
  if (allowedRoles.length === 0) return true;

  // Find the lowest (minimum) role in the allowed roles
  const minRequiredRank = Math.min(
    ...allowedRoles.map((role) => getRoleRank(role))
  );

  return getRoleRank(userRole) >= minRequiredRank;
}

/**
 * Get all capabilities for a user based on their role hierarchy.
 * Aggregates capabilities from all roles at or below the user's role.
 *
 * @param userRole - The user's current role
 * @param capabilitiesByRole - Map of role to capabilities
 * @returns Array of all capabilities the user has access to
 */
export function getEffectiveCapabilities(
  userRole: AppRole,
  capabilitiesByRole: Map<AppRole, string[]>
): string[] {
  const userRank = getRoleRank(userRole);
  const allCapabilities = new Set<string>();

  // Aggregate capabilities from all roles at or below user's rank
  ROLE_HIERARCHY.forEach((role, index) => {
    if (index <= userRank) {
      const caps = capabilitiesByRole.get(role) || [];
      caps.forEach((cap) => allCapabilities.add(cap));
    }
  });

  return Array.from(allCapabilities);
}
