// apps/protected/app/actions/organization/team-settings.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import * as Sentry from "@sentry/nextjs";

export interface TeamSettings {
  allow_member_invites: boolean;
  require_admin_approval: boolean;
  auto_assign_default_role: "member" | "view-only";
  max_team_size: number | null;
  allow_guest_access: boolean;
  guest_link_expiry_days: number;
}

export interface TeamSettingsWithTier extends TeamSettings {
  tier_name?: string;
  tier_max_team_size?: number | null;
  current_team_count?: number;
}

export interface TeamSettingsResponse {
  success: boolean;
  message?: string;
  settings?: TeamSettingsWithTier;
}

/**
 * Fetches organization team settings with subscription tier info
 */
export async function getTeamSettings(
  orgId: string,
): Promise<TeamSettingsResponse> {
  try {
    const supabase = await createClient();

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, message: "Authentication required" };
    }

    // Use the SQL function for consistent access
    const { data, error } = await supabase.rpc("get_org_team_settings", {
      p_org_id: orgId,
    });

    if (error) {
      Sentry.captureException(error, {
        tags: { action: "getTeamSettings", org_id: orgId },
      });
      return { success: false, message: error.message };
    }

    // RPC returns array, get first row
    const settings = data?.[0] as TeamSettings | undefined;

    if (!settings) {
      // Return default settings if none exist
      return {
        success: true,
        settings: {
          allow_member_invites: false,
          require_admin_approval: false,
          auto_assign_default_role: "member",
          max_team_size: null,
          allow_guest_access: false,
          guest_link_expiry_days: 30,
        },
      };
    }

    // Fetch subscription tier info to show tier-based limits
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select(`
        tier_id,
        subscription_tiers (
          name,
          max_team_members
        )
      `)
      .eq("org_id", orgId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    // Get current team count
    const { count: currentTeamCount } = await supabase
      .from("user_profiles")
      .select("*", { count: "exact", head: true })
      .eq("org_id", orgId);

    const tierData = subscription?.subscription_tiers as
      | { name: string; max_team_members: number | null }
      | undefined;

    return {
      success: true,
      settings: {
        ...settings,
        tier_name: tierData?.name,
        tier_max_team_size: tierData?.max_team_members,
        current_team_count: currentTeamCount || 0,
      },
    };
  } catch (error) {
    Sentry.captureException(error, {
      tags: { action: "getTeamSettings", org_id: orgId },
    });
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to fetch team settings",
    };
  }
}

/**
 * Updates organization team settings (owner/admin only)
 * Note: max_team_size is managed by subscription tier and cannot be manually updated
 */
export async function updateTeamSettings(
  orgId: string,
  settings: Partial<TeamSettings>,
): Promise<TeamSettingsResponse> {
  try {
    const supabase = await createClient();

    // Verify authentication and role
    const { data: claims, error: claimsError } =
      await supabase.auth.getClaims();

    if (!claims || claimsError) {
      return { success: false, message: "Authentication required" };
    }

    // Only owners and admins can update team settings
    if (!["owner", "admin", "superadmin"].includes(claims.claims.user_role)) {
      return {
        success: false,
        message: "Insufficient permissions to update team settings",
      };
    }

    // Verify org_id matches
    if (claims.claims.org_id !== orgId) {
      return { success: false, message: "Unauthorized: Invalid organization" };
    }

    // Remove max_team_size from settings if present (managed by subscription tier)
    const { max_team_size, ...settingsToUpdate } = settings;

    // Upsert settings (create if doesn't exist, update if exists)
    const { error: upsertError } = await supabase
      .from("organization_team_settings")
      .upsert(
        {
          org_id: orgId,
          ...settingsToUpdate,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "org_id",
        },
      );

    if (upsertError) {
      Sentry.captureException(upsertError, {
        tags: { action: "updateTeamSettings", org_id: orgId },
      });
      return { success: false, message: upsertError.message };
    }

    // Revalidate relevant paths
    revalidatePath("/org-settings/team");

    return {
      success: true,
      message: "Team settings updated successfully",
    };
  } catch (error) {
    Sentry.captureException(error, {
      tags: { action: "updateTeamSettings", org_id: orgId },
    });
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to update team settings",
    };
  }
}

/**
 * Ensures organization has team settings (creates default if missing)
 * Called during org creation or first team settings access
 */
export async function ensureTeamSettings(
  orgId: string,
): Promise<TeamSettingsResponse> {
  try {
    const supabase = await createClient();

    // Check if settings exist
    const { data: existing } = await supabase
      .from("organization_team_settings")
      .select("*")
      .eq("org_id", orgId)
      .single();

    if (existing) {
      return { success: true, settings: existing as TeamSettings };
    }

    // Create default settings
    const { error: insertError } = await supabase
      .from("organization_team_settings")
      .insert({
        org_id: orgId,
        allow_member_invites: false, // Only admins+ can invite by default
        require_admin_approval: false, // No approval needed by default
        auto_assign_default_role: "member", // Default role for new members
        max_team_size: null, // No limit by default
        allow_guest_access: false, // Guests disabled by default
        guest_link_expiry_days: 30,
      });

    if (insertError) {
      Sentry.captureException(insertError, {
        tags: { action: "ensureTeamSettings", org_id: orgId },
      });
      return { success: false, message: insertError.message };
    }

    return {
      success: true,
      message: "Default team settings created",
    };
  } catch (error) {
    Sentry.captureException(error, {
      tags: { action: "ensureTeamSettings", org_id: orgId },
    });
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to create team settings",
    };
  }
}
