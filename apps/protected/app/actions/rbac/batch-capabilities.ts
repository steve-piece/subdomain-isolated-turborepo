// apps/protected/app/actions/rbac/batch-capabilities.ts
"use server";

import * as Sentry from "@sentry/nextjs";
import { createClient } from "@workspace/supabase/server";
import { canCustomizeRoles } from "./query";
import { revalidatePath } from "next/cache";

export interface CapabilityChange {
  capabilityKey: string;
  granted: boolean; // true = grant, false = revoke
}

export interface BatchUpdateResponse {
  success: boolean;
  message?: string;
  affectedUsers?: number;
  changesApplied?: number;
}

/**
 * Batch update role capabilities
 * More efficient than individual updates
 * Only logs out users with the affected role (not the entire org)
 */
export async function batchUpdateRoleCapabilities(
  role: string,
  changes: CapabilityChange[],
): Promise<BatchUpdateResponse> {
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
        message: "Only organization owners can customize role capabilities",
      };
    }

    // Check subscription tier
    const tierCheck = await canCustomizeRoles();
    if (!tierCheck.canCustomize) {
      return {
        success: false,
        message: `Upgrade to Business tier to customize role capabilities. Current tier: ${tierCheck.tier}`,
      };
    }

    if (!changes || changes.length === 0) {
      return { success: false, message: "No changes provided" };
    }

    // Get all capability IDs in one query
    const capabilityKeys = changes.map((c) => c.capabilityKey);
    const { data: capabilities, error: capError } = await supabase
      .from("capabilities")
      .select("id, key")
      .in("key", capabilityKeys);

    if (capError || !capabilities) {
      Sentry.captureException(capError);
      return { success: false, message: "Failed to fetch capabilities" };
    }

    // Create a map for quick lookup
    const capabilityMap = new Map(capabilities.map((c) => [c.key, c.id]));

    // Prepare batch upsert data
    const upsertData = changes
      .map((change) => {
        const capabilityId = capabilityMap.get(change.capabilityKey);
        if (!capabilityId) {
          console.warn(`Capability not found: ${change.capabilityKey}`);
          return null;
        }

        return {
          org_id: orgId,
          role: role,
          capability_id: capabilityId,
          granted: change.granted,
          updated_by: user.id,
          updated_at: new Date().toISOString(),
        };
      })
      .filter(Boolean); // Remove nulls

    if (upsertData.length === 0) {
      return { success: false, message: "No valid changes to apply" };
    }

    // Batch upsert all changes
    const { error: upsertError } = await supabase
      .from("org_role_capabilities")
      .upsert(upsertData, {
        onConflict: "org_id,role,capability_id",
      });

    if (upsertError) {
      Sentry.captureException(upsertError);
      return { success: false, message: upsertError.message };
    }

    // Selectively logout only users with this role
    const { data: logoutResult, error: logoutError } = await supabase.rpc(
      "force_logout_users_by_role",
      {
        p_org_id: orgId,
        p_role: role,
      },
    );

    if (logoutError) {
      Sentry.captureException(logoutError);
      // Don't fail the entire operation if logout fails
      console.error("Failed to force logout users:", logoutError);
    }

    const affectedUsers = logoutResult?.affected_users || 0;

    console.log("✅ Batch capability update completed:", {
      orgId,
      role,
      changesApplied: upsertData.length,
      affectedUsers,
    });

    // Revalidate relevant pages
    revalidatePath("/org-settings/roles");
    revalidatePath("/admin");
    revalidatePath("/dashboard");

    return {
      success: true,
      message: `${upsertData.length} ${upsertData.length === 1 ? "change" : "changes"} applied to ${role} role. ${affectedUsers} ${affectedUsers === 1 ? "user" : "users"} will be prompted to re-login.`,
      changesApplied: upsertData.length,
      affectedUsers,
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
