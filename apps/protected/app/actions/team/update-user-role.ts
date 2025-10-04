// app/actions/team/update-user-role.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

type UserRole = "owner" | "superadmin" | "admin" | "member" | "view-only";

interface UpdateRoleResult {
  success: boolean;
  error?: string;
}

/**
 * Permission rules for updating user roles:
 * - Owner: Can update anyone to any role (including superadmin)
 * - Superadmin: Can update users to admin/member/view-only (not superadmin or owner)
 *               Can only modify users who are admin or below
 * - Admin: Can modify member/view-only users only
 * - Member: No permissions
 */
export async function updateUserRole(
  targetUserId: string,
  newRole: UserRole,
  orgId: string
): Promise<UpdateRoleResult> {
  const supabase = await createClient();

  try {
    // Get current user (for ID) and claims (for role)
    const [
      {
        data: { user },
      },
      { data: claims },
    ] = await Promise.all([supabase.auth.getUser(), supabase.auth.getClaims()]);

    const currentUserRole = claims?.claims.user_role as UserRole;
    const currentUserId = user?.id;

    if (!currentUserRole || !currentUserId) {
      return { success: false, error: "Not authenticated" };
    }

    // Members have no permissions
    if (currentUserRole === "member" || currentUserRole === "view-only") {
      return { success: false, error: "Insufficient permissions" };
    }

    // Prevent self-modification
    if (currentUserId === targetUserId) {
      return { success: false, error: "Cannot modify your own role" };
    }

    // Get target user's current role
    const { data: targetUser } = await supabase
      .from("user_profiles")
      .select("role, org_id")
      .eq("user_id", targetUserId)
      .eq("org_id", orgId)
      .single();

    if (!targetUser) {
      return { success: false, error: "User not found" };
    }

    const currentTargetRole = targetUser.role as UserRole;

    // Owner permission checks
    if (currentUserRole === "owner") {
      // Owner can do anything
      // No restrictions
    }
    // Superadmin permission checks
    else if (currentUserRole === "superadmin") {
      // Cannot promote to superadmin or owner
      if (newRole === "superadmin" || newRole === "owner") {
        return {
          success: false,
          error: "Only owners can assign superadmin or owner roles",
        };
      }

      // Cannot modify owners or other superadmins
      if (currentTargetRole === "owner" || currentTargetRole === "superadmin") {
        return {
          success: false,
          error: "Cannot modify users with owner or superadmin roles",
        };
      }
    }
    // Admin permission checks
    else if (currentUserRole === "admin") {
      // Can only modify member and view-only users
      if (currentTargetRole !== "member" && currentTargetRole !== "view-only") {
        return {
          success: false,
          error: "Can only modify member and view-only users",
        };
      }

      // Can only assign member or view-only roles
      if (newRole !== "member" && newRole !== "view-only") {
        return {
          success: false,
          error: "Can only assign member or view-only roles",
        };
      }
    }

    // Update the user's role
    const { error } = await supabase
      .from("user_profiles")
      .update({
        role: newRole,
        updated_at: new Date().toISOString(),
        force_logout_after: new Date().toISOString(), // Force re-login for JWT refresh
      })
      .eq("user_id", targetUserId)
      .eq("org_id", orgId);

    if (error) {
      console.error("Error updating user role:", error);
      return { success: false, error: "Failed to update role" };
    }

    // Also update organization's permissions_updated_at to trigger JWT refresh
    await supabase
      .from("organizations")
      .update({
        permissions_updated_at: new Date().toISOString(),
      })
      .eq("id", orgId);

    // Revalidate relevant pages
    revalidatePath("/org-settings/team");
    revalidatePath("/admin");
    revalidatePath("/dashboard");

    return { success: true };
  } catch (error) {
    console.error("Error in updateUserRole:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}
