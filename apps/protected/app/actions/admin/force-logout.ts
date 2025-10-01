// apps/protected/app/actions/admin/force-logout.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import * as Sentry from "@sentry/nextjs";

/**
 * Force logout all users in an organization
 *
 * Use cases:
 * - After major permission changes
 * - During security incidents
 * - After database migrations affecting authentication
 * - When organization settings change dramatically
 *
 * Security: Only callable by owners, admins, and superadmins
 */
export async function forceLogoutOrganization() {
  const supabase = await createClient();

  try {
    // Get current user and verify permissions
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false,
        message: "Unauthorized - please log in",
      };
    }

    const { data: claims } = await supabase.auth.getClaims();
    const userRole = claims?.claims.user_role;
    const orgId = claims?.claims.org_id;

    // Only owners, admins, and superadmins can force logout all users
    if (!["owner", "admin", "superadmin"].includes(userRole)) {
      Sentry.logger.warn("force_logout_organization_unauthorized", {
        user_id: user.id,
        user_role: userRole,
        org_id: orgId,
      });

      return {
        success: false,
        message: "Unauthorized - insufficient permissions",
      };
    }

    if (!orgId) {
      return {
        success: false,
        message: "Organization ID not found",
      };
    }

    // Call the database function to force logout all users
    const { data, error } = await supabase.rpc("force_logout_organization", {
      p_org_id: orgId,
    });

    if (error) {
      Sentry.captureException(error, {
        tags: {
          action: "force_logout_organization",
          org_id: orgId,
        },
      });

      return {
        success: false,
        message: "Failed to force logout users",
        error: error.message,
      };
    }

    // Log successful action
    Sentry.logger.info("force_logout_organization_success", {
      user_id: user.id,
      org_id: orgId,
      affected_users: data?.affected_users,
    });

    // Revalidate admin pages
    revalidatePath("/admin");
    revalidatePath("/org-settings");

    return {
      success: true,
      message: `Successfully forced logout for ${data?.affected_users || 0} users`,
      affectedUsers: data?.affected_users,
      timestamp: data?.force_logout_after,
    };
  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        action: "force_logout_organization",
      },
    });

    return {
      success: false,
      message: "An unexpected error occurred",
    };
  }
}

/**
 * Force logout a specific user
 *
 * Use cases:
 * - After changing a user's role
 * - After updating a user's capabilities
 * - Suspicious activity detection
 * - User requests password reset
 *
 * Security: Only callable by owners, admins, and superadmins
 */
export async function forceLogoutUser(targetUserId: string) {
  const supabase = await createClient();

  try {
    // Get current user and verify permissions
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false,
        message: "Unauthorized - please log in",
      };
    }

    const { data: claims } = await supabase.auth.getClaims();
    const userRole = claims?.claims.user_role;
    const orgId = claims?.claims.org_id;

    // Only owners, admins, and superadmins can force logout users
    if (!["owner", "admin", "superadmin"].includes(userRole)) {
      Sentry.logger.warn("force_logout_user_unauthorized", {
        user_id: user.id,
        user_role: userRole,
        target_user_id: targetUserId,
      });

      return {
        success: false,
        message: "Unauthorized - insufficient permissions",
      };
    }

    // Verify target user is in the same organization
    const { data: targetProfile } = await supabase
      .from("user_profiles")
      .select("org_id, email, role")
      .eq("user_id", targetUserId)
      .single();

    if (!targetProfile) {
      return {
        success: false,
        message: "User not found",
      };
    }

    if (targetProfile.org_id !== orgId) {
      Sentry.logger.warn("force_logout_user_cross_org_attempt", {
        user_id: user.id,
        target_user_id: targetUserId,
        user_org: orgId,
        target_org: targetProfile.org_id,
      });

      return {
        success: false,
        message: "Cannot force logout users from other organizations",
      };
    }

    // Prevent admins from forcing logout owners
    if (
      userRole === "admin" &&
      ["owner", "superadmin"].includes(targetProfile.role)
    ) {
      return {
        success: false,
        message: "Cannot force logout owners or superadmins",
      };
    }

    // Call the database function to force logout the user
    const { data, error } = await supabase.rpc("force_logout_user", {
      p_user_id: targetUserId,
    });

    if (error) {
      Sentry.captureException(error, {
        tags: {
          action: "force_logout_user",
          target_user_id: targetUserId,
        },
      });

      return {
        success: false,
        message: "Failed to force logout user",
        error: error.message,
      };
    }

    // Log successful action
    Sentry.logger.info("force_logout_user_success", {
      user_id: user.id,
      target_user_id: targetUserId,
      target_email: data?.user_email,
    });

    // Revalidate admin pages
    revalidatePath("/admin");
    revalidatePath("/org-settings/team");

    return {
      success: true,
      message: `Successfully forced logout for ${data?.user_email}`,
      userEmail: data?.user_email,
      timestamp: data?.force_logout_after,
    };
  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        action: "force_logout_user",
        target_user_id: targetUserId,
      },
    });

    return {
      success: false,
      message: "An unexpected error occurred",
    };
  }
}

/**
 * Clear organization force logout
 *
 * Allows users to log back in after organization-wide logout was triggered.
 *
 * Security: Only callable by owners and superadmins
 */
export async function clearOrganizationForceLogout() {
  const supabase = await createClient();

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false,
        message: "Unauthorized - please log in",
      };
    }

    const { data: claims } = await supabase.auth.getClaims();
    const userRole = claims?.claims.user_role;
    const orgId = claims?.claims.org_id;

    // Only owners and superadmins can clear force logout
    if (!["owner", "superadmin"].includes(userRole)) {
      return {
        success: false,
        message: "Unauthorized - only owners can clear force logout",
      };
    }

    if (!orgId) {
      return {
        success: false,
        message: "Organization ID not found",
      };
    }

    // Clear the force_logout_after timestamp
    const { error } = await supabase
      .from("organizations")
      .update({ force_logout_after: null })
      .eq("id", orgId);

    if (error) {
      Sentry.captureException(error, {
        tags: {
          action: "clear_organization_force_logout",
          org_id: orgId,
        },
      });

      return {
        success: false,
        message: "Failed to clear force logout",
      };
    }

    Sentry.logger.info("clear_organization_force_logout_success", {
      user_id: user.id,
      org_id: orgId,
    });

    revalidatePath("/admin");

    return {
      success: true,
      message: "Force logout cleared - users can now log in",
    };
  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        action: "clear_organization_force_logout",
      },
    });

    return {
      success: false,
      message: "An unexpected error occurred",
    };
  }
}
