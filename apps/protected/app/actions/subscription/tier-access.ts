"use server";

import { createClient } from "@/lib/supabase/server";
import * as Sentry from "@sentry/nextjs";

export interface OrgTierInfo {
  tierName: string;
  allowsCustomPermissions: boolean;
  maxTeamMembers: number;
  maxProjects: number;
  subscriptionStatus: string;
  isActive: boolean;
  currentPeriodEnd: string | null;
  isBusinessPlus: boolean;
}

export interface TierAccessResponse {
  success: boolean;
  hasAccess: boolean;
  tier?: OrgTierInfo;
  message?: string;
}

/**
 * Check if organization has Business+ tier access
 * Business+ = business or enterprise tiers
 *
 * @param orgId - Organization UUID
 * @returns Access status and tier information
 */
export async function checkBusinessPlusAccess(
  orgId: string,
): Promise<TierAccessResponse> {
  try {
    const supabase = await createClient();

    // Validate authentication
    const { data: claims } = await supabase.auth.getClaims();
    if (!claims) {
      return {
        success: false,
        hasAccess: false,
        message: "Authentication required",
      };
    }

    // Security check: Verify org_id matches claims
    if (claims.claims.org_id !== orgId) {
      Sentry.logger.warn("tier_access_org_mismatch", {
        claimsOrgId: claims.claims.org_id,
        requestedOrgId: orgId,
      });
      return {
        success: false,
        hasAccess: false,
        message: "Unauthorized: Invalid organization",
      };
    }

    // Call database function to get tier information
    const { data: tierData, error } = await supabase.rpc("get_org_tier", {
      p_org_id: orgId,
    });

    if (error) {
      Sentry.captureException(error, {
        tags: { action: "check_business_plus_access", org_id: orgId },
      });
      return {
        success: false,
        hasAccess: false,
        message: "Failed to check tier access",
      };
    }

    // Get first result (function returns table)
    const tier = tierData?.[0];

    if (!tier) {
      // Should never happen due to function defaults, but handle gracefully
      return {
        success: true,
        hasAccess: false,
        tier: {
          tierName: "free",
          allowsCustomPermissions: false,
          maxTeamMembers: 5,
          maxProjects: 3,
          subscriptionStatus: "inactive",
          isActive: false,
          currentPeriodEnd: null,
          isBusinessPlus: false,
        },
      };
    }

    // Business+ logic: Check if tier is 'business' or 'enterprise'
    const isBusinessPlus = ["business", "enterprise"].includes(tier.tier_name);

    const tierInfo: OrgTierInfo = {
      tierName: tier.tier_name,
      allowsCustomPermissions: tier.allows_custom_permissions,
      maxTeamMembers: tier.max_team_members,
      maxProjects: tier.max_projects,
      subscriptionStatus: tier.subscription_status,
      isActive: tier.is_active,
      currentPeriodEnd: tier.current_period_end,
      isBusinessPlus,
    };

    return {
      success: true,
      hasAccess: isBusinessPlus,
      tier: tierInfo,
    };
  } catch (error) {
    Sentry.captureException(error, {
      tags: { action: "check_business_plus_access" },
    });
    return {
      success: false,
      hasAccess: false,
      message:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

/**
 * Get organization tier information
 *
 * @param orgId - Organization UUID
 * @returns Tier information
 */
export async function getOrgTier(
  orgId: string,
): Promise<{ success: boolean; tier?: OrgTierInfo; message?: string }> {
  try {
    const supabase = await createClient();

    // Validate authentication
    const { data: claims } = await supabase.auth.getClaims();
    if (!claims) {
      return {
        success: false,
        message: "Authentication required",
      };
    }

    // Security check
    if (claims.claims.org_id !== orgId) {
      return {
        success: false,
        message: "Unauthorized: Invalid organization",
      };
    }

    // Call database function
    const { data: tierData, error } = await supabase.rpc("get_org_tier", {
      p_org_id: orgId,
    });

    if (error) {
      Sentry.captureException(error, {
        tags: { action: "get_org_tier", org_id: orgId },
      });
      return {
        success: false,
        message: "Failed to retrieve tier information",
      };
    }

    const tier = tierData?.[0];

    if (!tier) {
      return {
        success: true,
        tier: {
          tierName: "free",
          allowsCustomPermissions: false,
          maxTeamMembers: 5,
          maxProjects: 3,
          subscriptionStatus: "inactive",
          isActive: false,
          currentPeriodEnd: null,
          isBusinessPlus: false,
        },
      };
    }

    const isBusinessPlus = ["business", "enterprise"].includes(tier.tier_name);

    return {
      success: true,
      tier: {
        tierName: tier.tier_name,
        allowsCustomPermissions: tier.allows_custom_permissions,
        maxTeamMembers: tier.max_team_members,
        maxProjects: tier.max_projects,
        subscriptionStatus: tier.subscription_status,
        isActive: tier.is_active,
        currentPeriodEnd: tier.current_period_end,
        isBusinessPlus,
      },
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
