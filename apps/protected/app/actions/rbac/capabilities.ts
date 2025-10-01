// apps/protected/app/actions/rbac/capabilities.ts
"use server";

import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/server";
import { canCustomizeRoles, type CustomCapabilityResponse } from "./query";

/**
 * Grant custom capability to a role
 * Only organization owners on Business+ tier can customize
 */
export async function grantCustomCapability(
  role: string,
  capabilityKey: string
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

    // Get capability ID
    const { data: capability } = await supabase
      .from("capabilities")
      .select("id")
      .eq("key", capabilityKey)
      .single();

    if (!capability) {
      return { success: false, message: "Capability not found" };
    }

    // Upsert custom capability (granted = true)
    const { error } = await supabase.from("org_role_capabilities").upsert(
      {
        org_id: orgId,
        role: role,
        capability_id: capability.id,
        granted: true,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "org_id,role,capability_id",
      }
    );

    if (error) {
      Sentry.captureException(error);
      return { success: false, message: error.message };
    }

    console.log("✅ Custom capability granted:", {
      orgId,
      role,
      capability: capabilityKey,
    });

    return {
      success: true,
      message: `Capability '${capabilityKey}' granted to ${role}`,
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

/**
 * Revoke custom capability from a role
 * Only organization owners on Business+ tier can customize
 */
export async function revokeCustomCapability(
  role: string,
  capabilityKey: string
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

    // Get capability ID
    const { data: capability } = await supabase
      .from("capabilities")
      .select("id")
      .eq("key", capabilityKey)
      .single();

    if (!capability) {
      return { success: false, message: "Capability not found" };
    }

    // Upsert custom capability (granted = false to revoke)
    const { error } = await supabase.from("org_role_capabilities").upsert(
      {
        org_id: orgId,
        role: role,
        capability_id: capability.id,
        granted: false,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "org_id,role,capability_id",
      }
    );

    if (error) {
      Sentry.captureException(error);
      return { success: false, message: error.message };
    }

    console.log("✅ Custom capability revoked:", {
      orgId,
      role,
      capability: capabilityKey,
    });

    return {
      success: true,
      message: `Capability '${capabilityKey}' revoked from ${role}`,
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
