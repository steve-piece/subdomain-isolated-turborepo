/**
 * Utility functions for handling organization and subdomain logic
 */

export interface Organization {
  id: string
  name: string
  subdomain: string
  created_at: string
  updated_at: string
}

export interface OrganizationMember {
  id: string
  user_id: string
  organization_id: string
  role: 'owner' | 'admin' | 'member'
  email: string
  created_at: string
}

/**
 * Checks if the current user has permission for an action
 */
export function hasPermission(userRole: OrganizationMember['role'], requiredRole: OrganizationMember['role']): boolean {
  const roleHierarchy: Record<OrganizationMember['role'], number> = {
    'member': 1,
    'admin': 2,
    'owner': 3
  }
  
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole]
}