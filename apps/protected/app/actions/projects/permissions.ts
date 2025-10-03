// apps/protected/app/actions/projects/permissions.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import * as Sentry from "@sentry/nextjs";

export interface GrantPermissionResponse {
  success: boolean;
  message: string;
}

/**
 * Grant a user access to a project
 */
export async function grantProjectPermission(
  projectId: string,
  userId: string,
  permissionLevel: "read" | "write" | "admin",
  subdomain: string
): Promise<GrantPermissionResponse> {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, message: "Authentication required" };
    }

    // Check if current user has admin permission on this project
    const { data: currentUserPerm } = await supabase
      .from("project_permissions")
      .select("permission_level")
      .eq("project_id", projectId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!currentUserPerm || currentUserPerm.permission_level !== "admin") {
      return { success: false, message: "Insufficient permissions" };
    }

    // Check if user is in the same organization
    const { data: project } = await supabase
      .from("projects")
      .select("org_id")
      .eq("id", projectId)
      .single();

    if (!project) {
      return { success: false, message: "Project not found" };
    }

    const { data: targetUser } = await supabase
      .from("user_profiles")
      .select("org_id")
      .eq("user_id", userId)
      .single();

    if (!targetUser || targetUser.org_id !== project.org_id) {
      return { success: false, message: "User not found in organization" };
    }

    // Check if permission already exists
    const { data: existing } = await supabase
      .from("project_permissions")
      .select("id")
      .eq("project_id", projectId)
      .eq("user_id", userId)
      .maybeSingle();

    if (existing) {
      // Update existing permission
      const { error: updateError } = await supabase
        .from("project_permissions")
        .update({
          permission_level: permissionLevel,
          granted_by: user.id,
        })
        .eq("id", existing.id);

      if (updateError) {
        Sentry.captureException(updateError);
        return { success: false, message: "Failed to update permission" };
      }

      revalidatePath(`/s/${subdomain}/projects/${projectId}`);
      return { success: true, message: "Permission updated successfully" };
    }

    // Create new permission
    const { error: insertError } = await supabase
      .from("project_permissions")
      .insert({
        project_id: projectId,
        user_id: userId,
        permission_level: permissionLevel,
        granted_by: user.id,
      });

    if (insertError) {
      Sentry.captureException(insertError);
      return { success: false, message: "Failed to grant permission" };
    }

    revalidatePath(`/s/${subdomain}/projects/${projectId}`);
    return { success: true, message: "Permission granted successfully" };
  } catch (error) {
    Sentry.captureException(error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

/**
 * Update a user's permission level on a project
 */
export async function updateProjectPermission(
  projectId: string,
  userId: string,
  permissionLevel: "read" | "write" | "admin",
  subdomain: string
): Promise<GrantPermissionResponse> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, message: "Authentication required" };
    }

    // Check if updating user has admin permission
    const { data: updaterPerm } = await supabase
      .from("project_permissions")
      .select("permission_level")
      .eq("project_id", projectId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!updaterPerm || updaterPerm.permission_level !== "admin") {
      return {
        success: false,
        message: "You do not have permission to update permissions",
      };
    }

    // Update permission
    const { error: updateError } = await supabase
      .from("project_permissions")
      .update({
        permission_level: permissionLevel,
        granted_by: user.id,
      })
      .eq("project_id", projectId)
      .eq("user_id", userId);

    if (updateError) {
      Sentry.captureException(updateError, {
        tags: { context: "update_project_permission" },
        user: { id: user.id },
      });
      return { success: false, message: "Failed to update permission" };
    }

    revalidatePath(`/s/${subdomain}/projects/${projectId}`);
    return { success: true, message: "Permission updated successfully!" };
  } catch (error) {
    Sentry.captureException(error, {
      tags: { context: "update_project_permission_catch" },
    });
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

/**
 * Remove a user's access from a project
 */
export async function revokeProjectPermission(
  projectId: string,
  userId: string,
  subdomain: string
): Promise<GrantPermissionResponse> {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, message: "Authentication required" };
    }

    // Check if current user has admin permission
    const { data: currentUserPerm } = await supabase
      .from("project_permissions")
      .select("permission_level")
      .eq("project_id", projectId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!currentUserPerm || currentUserPerm.permission_level !== "admin") {
      return { success: false, message: "Insufficient permissions" };
    }

    // Cannot remove yourself if you're the only admin
    const { data: admins } = await supabase
      .from("project_permissions")
      .select("user_id")
      .eq("project_id", projectId)
      .eq("permission_level", "admin");

    if (admins && admins.length === 1 && admins[0]?.user_id === userId) {
      return { success: false, message: "Cannot remove the last admin" };
    }

    // Remove permission
    const { error: deleteError } = await supabase
      .from("project_permissions")
      .delete()
      .eq("project_id", projectId)
      .eq("user_id", userId);

    if (deleteError) {
      Sentry.captureException(deleteError);
      return { success: false, message: "Failed to revoke permission" };
    }

    revalidatePath(`/s/${subdomain}/projects/${projectId}`);
    return { success: true, message: "Permission revoked successfully" };
  } catch (error) {
    Sentry.captureException(error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}
