// apps/protected/app/actions/projects/create.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import * as Sentry from "@sentry/nextjs";

export interface CreateProjectResponse {
  success: boolean;
  message: string;
  projectId?: string;
}

/**
 * Create a new project in the organization
 */
export async function createProject(
  name: string,
  description: string | null,
  subdomain: string
): Promise<CreateProjectResponse> {
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

    // Get claims for org_id
    const { data: claims } = await supabase.auth.getClaims();
    const orgId = claims?.claims.org_id;

    if (!orgId) {
      return { success: false, message: "Organization not found" };
    }

    // Validate name
    if (!name || name.trim().length === 0) {
      return { success: false, message: "Project name is required" };
    }

    if (name.length > 100) {
      return {
        success: false,
        message: "Project name must be less than 100 characters",
      };
    }

    // Check for duplicate project name in org
    const { data: existing } = await supabase
      .from("projects")
      .select("id")
      .eq("org_id", orgId)
      .eq("name", name.trim())
      .eq("status", "active")
      .maybeSingle();

    if (existing) {
      return {
        success: false,
        message: "A project with this name already exists",
      };
    }

    // Create project
    const { data: project, error: createError } = await supabase
      .from("projects")
      .insert({
        org_id: orgId,
        name: name.trim(),
        description: description?.trim() || null,
        owner_id: user.id,
        status: "active" as const,
      })
      .select("id")
      .single();

    if (createError || !project) {
      console.error("❌ Project creation failed:", {
        error: createError,
        message: createError?.message,
        code: createError?.code,
        details: createError?.details,
        hint: createError?.hint,
      });
      Sentry.captureException(createError);
      return {
        success: false,
        message: createError?.message || "Failed to create project",
        error: createError?.message,
      };
    }

    // Grant creator admin permission
    const { error: permError } = await supabase
      .from("project_permissions")
      .insert({
        project_id: project.id,
        user_id: user.id,
        permission_level: "admin" as const,
        granted_by: user.id,
      });

    if (permError) {
      Sentry.captureException(permError);
      // Don't fail - project is created, permission can be added later
    }

    // Revalidate projects page
    revalidatePath(`/s/${subdomain}/projects`);

    return {
      success: true,
      message: "Project created successfully",
      projectId: project.id,
    };
  } catch (error) {
    Sentry.captureException(error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}
