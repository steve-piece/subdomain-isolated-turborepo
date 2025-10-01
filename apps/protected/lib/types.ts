/**
 * Shared TypeScript types for the protected application
 */

/**
 * User role enum for role-based access control (RBAC)
 * Roles are hierarchical: superadmin > owner > admin > member > guest
 */
export type AppRole =
  | "superadmin"
  | "owner"
  | "admin"
  | "member"
  | "guest"
  | "view-only";

/**
 * Subscription tier names
 */
export type SubscriptionTier = "Free" | "Starter" | "Pro" | "Enterprise";

/**
 * Subscription status
 */
export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "incomplete"
  | "incomplete_expired";
