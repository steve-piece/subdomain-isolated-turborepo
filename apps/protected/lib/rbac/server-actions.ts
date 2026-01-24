// apps/protected/lib/rbac/server-actions.ts
/**
 * Server actions for RBAC capability checking
 */
"use server";

import { createClient } from "@workspace/supabase/server";
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
  capabilityKey: CapabilityKey,
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
  requiredRoles?: string[],
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
 * Uses new database function that combines role hierarchy and custom overrides
 */
export async function getUserCapabilities(
  orgId: string,
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

    // Call database function to get capabilities
    // This handles both default role capabilities (via min_role_required + hierarchy)
    // and optional custom org overrides (via org_role_capabilities table)
    const { data, error } = await supabase.rpc("get_user_capabilities", {
      p_user_id: user.id,
      p_org_id: orgId,
    });

    if (error) {
      Sentry.captureException(error, {
        tags: {
          org_id: orgId,
          user_id: user.id,
        },
      });
      return [];
    }

    return (data || []) as CapabilityKey[];
  } catch (error) {
    Sentry.captureException(error);
    return [];
  }
}
