// apps/protected/lib/rbac/server-actions.ts
/**
 * Server actions for RBAC capability checking
 */
"use server";

import { createClient } from "@/lib/supabase/server";
import type { CapabilityKey } from "./capabilities";
import * as Sentry from "@sentry/nextjs";

interface CapabilityCheckResult {
  hasCapability: boolean;
  reason?: string;
}

/**
 * Check if the current user has a specific capability in their organization
 */
export async function checkUserCapability(
  orgId: string,
  capabilityKey: CapabilityKey
): Promise<CapabilityCheckResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return {
        hasCapability: false,
        reason: "User not authenticated",
      };
    }

    // Call the database function
    const { data, error } = await supabase.rpc("user_org_capability", {
      p_user_id: user.id,
      p_org_id: orgId,
      p_capability_key: capabilityKey,
    });

    if (error) {
      Sentry.captureException(error, {
        tags: {
          capability: capabilityKey,
          org_id: orgId,
        },
      });
      return {
        hasCapability: false,
        reason: "Error checking capability",
      };
    }

    return {
      hasCapability: data === true,
      reason: data ? undefined : "Capability not granted for role",
    };
  } catch (error) {
    Sentry.captureException(error);
    return {
      hasCapability: false,
      reason: "Unexpected error",
    };
  }
}

/**
 * Check if user has access to organization with optional role requirements
 */
export async function checkUserOrgAccess(
  orgId: string,
  requiredRoles?: string[]
): Promise<CapabilityCheckResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return {
        hasCapability: false,
        reason: "User not authenticated",
      };
    }

    // Call the database function
    const { data, error } = await supabase.rpc("user_org_access", {
      p_user_id: user.id,
      p_org_id: orgId,
      p_required_roles: requiredRoles || null,
    });

    if (error) {
      Sentry.captureException(error, {
        tags: {
          org_id: orgId,
          required_roles: requiredRoles?.join(","),
        },
      });
      return {
        hasCapability: false,
        reason: "Error checking org access",
      };
    }

    return {
      hasCapability: data === true,
      reason: data ? undefined : "Access denied",
    };
  } catch (error) {
    Sentry.captureException(error);
    return {
      hasCapability: false,
      reason: "Unexpected error",
    };
  }
}

/**
 * Get all capabilities for the current user in an organization
 */
export async function getUserCapabilities(
  orgId: string
): Promise<CapabilityKey[]> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return [];
    }

    // Get user's role
    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("role")
      .eq("user_id", user.id)
      .eq("org_id", orgId)
      .single();

    if (profileError || !profile) {
      return [];
    }

    // Get capabilities for this role
    const { data: capabilities, error: capError } = await supabase
      .from("role_capabilities")
      .select("capabilities(key)")
      .eq("role", profile.role)
      .eq("is_default", true);

    if (capError || !capabilities) {
      return [];
    }

    // Extract capability keys
    return capabilities
      .map((cap: any) => cap.capabilities?.key)
      .filter(Boolean) as CapabilityKey[];
  } catch (error) {
    Sentry.captureException(error);
    return [];
  }
}
