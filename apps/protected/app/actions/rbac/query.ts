// apps/protected/app/actions/rbac/query.ts
"use server";

import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/server";

export interface CustomCapabilityResponse {
  success: boolean;
  message?: string;
  canCustomize?: boolean;
  tier?: string;
}

export interface OrgCapabilitiesResponse {
  success: boolean;
  message?: string;
  data?: unknown[];
}

/**
 * Check if organization can customize role capabilities
 * Requires Business+ subscription tier
 */
export async function canCustomizeRoles(): Promise<CustomCapabilityResponse> {
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

    if (!orgId) {
      return { success: false, message: "Organization context required" };
    }

    const { data: subscription } = await supabase
      .from("subscriptions")
      .select(
        `
        subscription_tiers (
          name,
          allows_custom_permissions
        )
      `,
      )
      .eq("org_id", orgId)
      .single();

    const subscriptionTiers = subscription?.subscription_tiers as unknown as {
      name: string;
      allows_custom_permissions: boolean;
    } | null;

    return {
      success: true,
      canCustomize: subscriptionTiers?.allows_custom_permissions || false,
      tier: subscriptionTiers?.name || "free",
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
 * Get all custom capabilities for current organization
 */
export async function getOrgCustomCapabilities(): Promise<OrgCapabilitiesResponse> {
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

    // Only owners and admins can view
    if (!["owner", "admin", "superadmin"].includes(userRole || "")) {
      return {
        success: false,
        message: "Only owners and admins can view custom capabilities",
      };
    }

    const { data, error } = await supabase
      .from("org_role_capabilities")
      .select(
        `
        role,
        granted,
        updated_at,
        capabilities (
          id,
          key,
          name,
          description,
          category
        )
      `,
      )
      .eq("org_id", orgId)
      .order("role", { ascending: true });

    if (error) {
      Sentry.captureException(error);
      return { success: false, message: error.message };
    }

    return {
      success: true,
      data: data || [],
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
 * Get all available capabilities grouped by category
 */
export async function getAllCapabilities(): Promise<OrgCapabilitiesResponse> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, message: "Authentication required" };
    }

    const { data: claims } = await supabase.auth.getClaims();
    const userRole = claims?.claims?.user_role;

    // Only owners and admins can view
    if (!["owner", "admin", "superadmin"].includes(userRole || "")) {
      return {
        success: false,
        message: "Only owners and admins can view capabilities",
      };
    }

    const { data, error } = await supabase
      .from("capabilities")
      .select("*")
      .order("category", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      Sentry.captureException(error);
      return { success: false, message: error.message };
    }

    return {
      success: true,
      data: data || [],
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
