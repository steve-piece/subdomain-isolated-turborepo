// apps/protected/app/actions/index.ts
/**
 * Central export for all server actions
 * Import actions using @actions/category pattern
 *
 * Examples:
 * - import { loginWithToast, signOut } from "@actions/auth";
 * - import { inviteUserToOrganization } from "@actions/invitations";
 * - import { enrollMFA, verifyMFA } from "@actions/mfa";
 * - import { uploadOrganizationLogo } from "@actions/onboarding";
 * - import { updateUserProfile } from "@actions/profile";
 * - import { grantCustomCapability } from "@actions/rbac";
 * - import { getOrganizationFavicon } from "@actions/favicon";
 *
 * Or import specific sub-modules:
 * - import { sendMagicLink } from "@actions/auth/magic-link";
 * - import { challengeMFA } from "@actions/mfa/verification";
 */

// Re-export everything for convenience
export * from "./auth";
export * from "./invitations";
export * from "./mfa";
export * from "./onboarding";
export * from "./organization";
export * from "./profile";
export * from "./rbac";
export * from "./favicon";
