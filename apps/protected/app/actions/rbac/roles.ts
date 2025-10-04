// apps/protected/app/actions/rbac/roles.ts
"use server";

import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/server";
import type { CustomCapabilityResponse } from "./query";

/**
 * Reset role to default capabilities
 * Removes all custom overrides for a specific role
 */
export async function resetRoleToDefaults(
  role: string,
): Promise<CustomCapabilityResponse> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, message: "Authentication required" };
    }

    const { data: claims } = await supabase.auth.getClaims();
    const orgId = claims?.claims?.org_id;
    const userRole = claims?.claims?.user_role;

    if (!orgId) {
      return { success: false, message: "Organization context required" };
    }

    // Only owners can customize
    if (userRole !== "owner") {
      return {
        success: false,
        message: "Only organization owners can reset role capabilities",
      };
    }

    // Delete all custom capabilities for this role
    const { error } = await supabase
      .from("org_role_capabilities")
      .delete()
      .eq("org_id", orgId)
      .eq("role", role);

    if (error) {
      Sentry.captureException(error);
      return { success: false, message: error.message };
    }

    console.log("✅ Role reset to defaults:", {
      orgId,
      role,
    });

    return {
      success: true,
      message: `${role} role reset to default capabilities`,
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
