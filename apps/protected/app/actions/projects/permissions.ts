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
  subdomain: string,
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
      revalidatePath(`/s/${subdomain}/projects`);
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
    revalidatePath(`/s/${subdomain}/projects`);
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
  subdomain: string,
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
    revalidatePath(`/s/${subdomain}/projects`);
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
  subdomain: string,
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
    revalidatePath(`/s/${subdomain}/projects`);
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

export interface ProjectMember {
  user_id: string;
  full_name: string | null;
  email: string;
  permission: "read" | "write" | "admin";
  is_owner: boolean;
  granted_at: string;
  granted_by: string;
}

export interface GetProjectMembersResponse {
  success: boolean;
  members?: ProjectMember[];
  message?: string;
}

/**
 * Get all members of a project
 */
export async function getProjectMembers(
  projectId: string,
): Promise<GetProjectMembersResponse> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, message: "Authentication required" };
    }

    // Check if user has access to this project
    const { data: userPerm } = await supabase
      .from("project_permissions")
      .select("permission_level")
      .eq("project_id", projectId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!userPerm) {
      return {
        success: false,
        message: "You don't have access to this project",
      };
    }

    // Fetch project permissions
    const { data: permissions, error } = await supabase
      .from("project_permissions")
      .select("user_id, permission_level, granted_at, granted_by")
      .eq("project_id", projectId);

    if (error) {
      Sentry.captureException(error);
      return { success: false, message: "Failed to fetch project members" };
    }

    // Fetch user profiles for those users
    const userIds = permissions?.map((p) => p.user_id) || [];
    const { data: profiles } = await supabase
      .from("user_profiles")
      .select("user_id, full_name, email")
      .in("user_id", userIds);

    // Get project to check owner
    const { data: project } = await supabase
      .from("projects")
      .select("created_by")
      .eq("id", projectId)
      .single();

    // Combine permissions with profiles
    const members =
      permissions?.map((perm) => {
        const profile = profiles?.find((p) => p.user_id === perm.user_id);
        return {
          user_id: perm.user_id,
          full_name: profile?.full_name || null,
          email: profile?.email || "Unknown",
          permission: perm.permission_level as "read" | "write" | "admin",
          is_owner: project?.created_by === perm.user_id,
          granted_at: perm.granted_at,
          granted_by: perm.granted_by,
        };
      }) || [];

    return { success: true, members };
  } catch (error) {
    Sentry.captureException(error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

export interface AvailableOrgMember {
  user_id: string;
  full_name: string | null;
  email: string;
  role: string;
}

export interface GetAvailableOrgMembersResponse {
  success: boolean;
  members?: AvailableOrgMember[];
  message?: string;
}

/**
 * Get organization members who are not yet added to a project
 */
export async function getAvailableOrgMembers(
  projectId: string,
): Promise<GetAvailableOrgMembersResponse> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, message: "Authentication required" };
    }

    // Get project's org_id
    const { data: project } = await supabase
      .from("projects")
      .select("org_id")
      .eq("id", projectId)
      .single();

    if (!project) {
      return { success: false, message: "Project not found" };
    }

    // Get all org members
    const { data: orgMembers } = await supabase
      .from("user_profiles")
      .select("user_id, full_name, email, role")
      .eq("org_id", project.org_id);

    // Get current project members
    const { data: projectMembers } = await supabase
      .from("project_permissions")
      .select("user_id")
      .eq("project_id", projectId);

    const projectMemberIds = new Set(
      projectMembers?.map((m) => m.user_id) || [],
    );

    // Filter out members who are already in the project
    const availableMembers =
      orgMembers?.filter((m) => !projectMemberIds.has(m.user_id)) || [];

    return { success: true, members: availableMembers };
  } catch (error) {
    Sentry.captureException(error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}
