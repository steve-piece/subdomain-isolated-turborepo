"use server";

import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface ProjectActionResponse {
  success: boolean;
  message: string;
  error?: string;
}

/**
 * Delete a project (soft delete by updating status)
 * Only project owners can delete projects
 */
export async function deleteProject(
  projectId: string,
  subdomain: string,
): Promise<ProjectActionResponse> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, message: "Authentication required" };
    }

    // Check if user is the project owner
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("owner_id, name")
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      return { success: false, message: "Project not found" };
    }

    if (project.owner_id !== user.id) {
      return {
        success: false,
        message: "Only the project owner can delete this project",
      };
    }

    // Soft delete - update status to 'deleted'
    const { error: deleteError } = await supabase
      .from("projects")
      .update({ status: "deleted" as const })
      .eq("id", projectId);

    if (deleteError) {
      Sentry.captureException(deleteError, {
        tags: { context: "delete_project" },
        user: { id: user.id },
      });
      return { success: false, message: "Failed to delete project" };
    }

    revalidatePath(`/s/${subdomain}/projects`);
    revalidatePath(`/s/${subdomain}/projects/${projectId}`);

    Sentry.logger.info("project_deleted", {
      userId: user.id,
      projectId,
      projectName: project.name,
    });

    return {
      success: true,
      message: "Project deleted successfully!",
    };
  } catch (error) {
    Sentry.captureException(error, {
      tags: { context: "delete_project_catch" },
    });
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

/**
 * Archive a project
 * Project admins and owners can archive
 */
export async function archiveProject(
  projectId: string,
  subdomain: string,
): Promise<ProjectActionResponse> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, message: "Authentication required" };
    }

    // Check if user has admin permissions
    const { data: permission, error: permError } = await supabase
      .from("project_permissions")
      .select("permission_level")
      .eq("project_id", projectId)
      .eq("user_id", user.id)
      .single();

    if (permError || permission?.permission_level !== "admin") {
      return {
        success: false,
        message: "Only project admins can archive projects",
      };
    }

    const { error: archiveError } = await supabase
      .from("projects")
      .update({ status: "archived" as const })
      .eq("id", projectId);

    if (archiveError) {
      Sentry.captureException(archiveError, {
        tags: { context: "archive_project" },
        user: { id: user.id },
      });
      return { success: false, message: "Failed to archive project" };
    }

    revalidatePath(`/s/${subdomain}/projects`);
    revalidatePath(`/s/${subdomain}/projects/${projectId}`);

    return { success: true, message: "Project archived successfully!" };
  } catch (error) {
    Sentry.captureException(error, {
      tags: { context: "archive_project_catch" },
    });
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

/**
 * Restore an archived project
 */
export async function restoreProject(
  projectId: string,
  subdomain: string,
): Promise<ProjectActionResponse> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, message: "Authentication required" };
    }

    // Check if user has admin permissions
    const { data: permission, error: permError } = await supabase
      .from("project_permissions")
      .select("permission_level")
      .eq("project_id", projectId)
      .eq("user_id", user.id)
      .single();

    if (permError || permission?.permission_level !== "admin") {
      return {
        success: false,
        message: "Only project admins can restore projects",
      };
    }

    const { error: restoreError } = await supabase
      .from("projects")
      .update({ status: "active" as const })
      .eq("id", projectId);

    if (restoreError) {
      Sentry.captureException(restoreError, {
        tags: { context: "restore_project" },
        user: { id: user.id },
      });
      return { success: false, message: "Failed to restore project" };
    }

    revalidatePath(`/s/${subdomain}/projects`);
    revalidatePath(`/s/${subdomain}/projects/${projectId}`);

    return { success: true, message: "Project restored successfully!" };
  } catch (error) {
    Sentry.captureException(error, {
      tags: { context: "restore_project_catch" },
    });
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

/**
 * Leave a project (remove yourself from project)
 * Cannot leave if you're the only admin
 */
export async function leaveProject(
  projectId: string,
  subdomain: string,
): Promise<ProjectActionResponse> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, message: "Authentication required" };
    }

    // Get user's permission
    const { data: myPermission, error: myPermError } = await supabase
      .from("project_permissions")
      .select("permission_level")
      .eq("project_id", projectId)
      .eq("user_id", user.id)
      .single();

    if (myPermError || !myPermission) {
      return {
        success: false,
        message: "You are not a member of this project",
      };
    }

    // If user is an admin, check if they're the only admin
    if (myPermission.permission_level === "admin") {
      const { count: adminCount, error: countError } = await supabase
        .from("project_permissions")
        .select("id", { count: "exact" })
        .eq("project_id", projectId)
        .eq("permission_level", "admin");

      if (countError) {
        Sentry.captureException(countError, {
          tags: { context: "check_admin_count_leave" },
          user: { id: user.id },
        });
        return { success: false, message: "Failed to verify admin count" };
      }

      if (adminCount === 1) {
        return {
          success: false,
          message:
            "You cannot leave as the sole project admin. Please promote another member first.",
        };
      }
    }

    // Remove user from project
    const { error: removeError } = await supabase
      .from("project_permissions")
      .delete()
      .eq("project_id", projectId)
      .eq("user_id", user.id);

    if (removeError) {
      Sentry.captureException(removeError, {
        tags: { context: "leave_project" },
        user: { id: user.id },
      });
      return { success: false, message: "Failed to leave project" };
    }

    revalidatePath(`/s/${subdomain}/projects`);
    revalidatePath(`/s/${subdomain}/projects/${projectId}`);

    return { success: true, message: "You have left the project" };
  } catch (error) {
    Sentry.captureException(error, {
      tags: { context: "leave_project_catch" },
    });
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}
