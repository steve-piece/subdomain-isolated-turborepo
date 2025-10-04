// app/actions/team/delete-user.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

type UserRole = "owner" | "superadmin" | "admin" | "member" | "view-only";

interface DeleteUserResult {
  success: boolean;
  error?: string;
}

/**
 * Permission rules for deleting users:
 * - Owner: Can delete anyone except themselves
 * - Superadmin: Can delete users below admin level (member, view-only)
 * - Admin: Can delete member and view-only users
 * - Member: No permissions
 */
export async function deleteUser(
  targetUserId: string,
  orgId: string,
): Promise<DeleteUserResult> {
  const supabase = await createClient();

  try {
    // Get current user's claims
    const { data: claims } = await supabase.auth.getClaims();
    const currentUserRole = claims?.claims.user_role as UserRole;
    const currentUserId = claims?.claims.sub;

    if (!currentUserRole || !currentUserId) {
      return { success: false, error: "Not authenticated" };
    }

    // Members and view-only have no permissions
    if (currentUserRole === "member" || currentUserRole === "view-only") {
      return { success: false, error: "Insufficient permissions" };
    }

    // Prevent self-deletion
    if (currentUserId === targetUserId) {
      return { success: false, error: "Cannot delete your own account" };
    }

    // Get target user's current role
    const { data: targetUser } = await supabase
      .from("user_profiles")
      .select("role, org_id, email")
      .eq("user_id", targetUserId)
      .eq("org_id", orgId)
      .single();

    if (!targetUser) {
      return { success: false, error: "User not found" };
    }

    const targetRole = targetUser.role as UserRole;

    // Owner permission checks
    if (currentUserRole === "owner") {
      // Owner can delete anyone (except themselves, checked above)
      // No additional restrictions
    }
    // Superadmin permission checks
    else if (currentUserRole === "superadmin") {
      // Can only delete users below admin level
      if (
        targetRole === "owner" ||
        targetRole === "superadmin" ||
        targetRole === "admin"
      ) {
        return {
          success: false,
          error: "Can only delete users below admin level",
        };
      }
    }
    // Admin permission checks
    else if (currentUserRole === "admin") {
      // Can only delete member and view-only users
      if (targetRole !== "member" && targetRole !== "view-only") {
        return {
          success: false,
          error: "Can only delete member and view-only users",
        };
      }
    }

    // Delete user profile (this will cascade to other related records based on DB constraints)
    const { error: deleteError } = await supabase
      .from("user_profiles")
      .delete()
      .eq("user_id", targetUserId)
      .eq("org_id", orgId);

    if (deleteError) {
      console.error("Error deleting user:", deleteError);
      return { success: false, error: "Failed to delete user" };
    }

    // Note: The auth.users record remains (managed by Supabase Auth)
    // The user can still log in but won't have access to this organization

    // Revalidate relevant pages
    revalidatePath("/org-settings/team");
    revalidatePath("/admin");
    revalidatePath("/dashboard");

    return { success: true };
  } catch (error) {
    console.error("Error in deleteUser:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}
