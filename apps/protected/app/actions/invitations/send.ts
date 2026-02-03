// apps/protected/app/actions/invitations/send.ts
"use server";

import * as Sentry from "@sentry/nextjs";
import { createClient } from "@workspace/supabase/server";
import { createAdminClient } from "@workspace/supabase/admin";
import { getRedirectUrl } from "@/lib/utils/get-redirect-url";
import { getTeamSettings } from "@/app/actions/organization/team-settings";

export interface InviteUserResponse {
  success: boolean;
  message: string;
  error?: string;
}

/**
 * Validates the inviter's claims, fetches organization metadata, checks for existing
 * membership, enforces team settings, and dispatches a Supabase Admin invitation email.
 */
export async function inviteUserToOrganization(
  email: string,
  role: "admin" | "member" | "view-only" | null, // null = use org default
  subdomain: string,
): Promise<InviteUserResponse> {
  try {
    const supabase = await createClient();

    // Get current user's claims to verify permissions and get tenant info
    const { data: claims, error: claimsError } =
      await supabase.auth.getClaims();

    if (!claims || claimsError) {
      Sentry.logger.warn("invite_user_missing_claims", {
        email,
        role,
        subdomain,
        hasClaims: Boolean(claims),
        claimsError: claimsError?.message,
      });
      return { success: false, message: "Authentication required" };
    }

    // Verify user belongs to this subdomain
    if (claims.claims.subdomain !== subdomain) {
      Sentry.logger.warn("invite_user_subdomain_mismatch", {
        email,
        role,
        expectedSubdomain: subdomain,
        actualSubdomain: claims.claims.subdomain,
      });
      return { success: false, message: "Unauthorized: Invalid tenant" };
    }

    const userRole = claims.claims.user_role as string;
    const orgId = claims.claims.org_id as string;

    // Fetch team settings for this organization
    const teamSettingsResponse = await getTeamSettings(orgId);
    const teamSettings = teamSettingsResponse.settings;

    if (!teamSettings) {
      Sentry.logger.error("invite_user_no_team_settings", {
        orgId,
        subdomain,
      });
      return {
        success: false,
        message: "Unable to load team settings. Please contact support.",
      };
    }

    // Check if members can invite (or if user is admin+)
    const isAdminOrHigher = ["owner", "admin", "superadmin"].includes(userRole);

    if (!isAdminOrHigher && !teamSettings.allow_member_invites) {
      Sentry.logger.warn("invite_user_member_invites_disabled", {
        email,
        role,
        subdomain,
        userRole,
      });
      return {
        success: false,
        message: "Only administrators can invite new members",
      };
    }

    // If user is not admin+, ensure they have some level of permission
    if (!isAdminOrHigher) {
      Sentry.logger.warn("invite_user_insufficient_role", {
        email,
        role,
        subdomain,
        userRole,
      });
      return {
        success: false,
        message: "Insufficient permissions to invite users",
      };
    }

    // Get organization details for the email template
    const { data: organization, error: organizationError } = await supabase
      .from("organizations")
      .select("id, company_name, subdomain")
      .eq("subdomain", subdomain)
      .single();

    if (organizationError || !organization) {
      Sentry.logger.error("invite_user_org_not_found", {
        subdomain,
        message: organizationError?.message,
      });
      return { success: false, message: "Organization not found" };
    }

    // Check current team size against limit
    if (teamSettings.max_team_size !== null) {
      const { count: currentTeamSize, error: countError } = await supabase
        .from("user_profiles")
        .select("*", { count: "exact", head: true })
        .eq("org_id", organization.id);

      if (countError) {
        Sentry.logger.error("invite_user_count_error", {
          message: countError.message,
          orgId: organization.id,
        });
        return {
          success: false,
          message: "Failed to verify team capacity",
        };
      }

      if (
        currentTeamSize !== null &&
        currentTeamSize >= teamSettings.max_team_size
      ) {
        return {
          success: false,
          message: `Team size limit reached (${teamSettings.max_team_size} members). Upgrade your plan or remove members to invite more.`,
        };
      }
    }

    // Check if user is already invited or exists
    const { data: existingUser } = await supabase
      .from("user_profiles")
      .select("user_id, email")
      .eq("email", email.toLowerCase())
      .eq("org_id", organization.id)
      .single();

    if (existingUser) {
      return {
        success: false,
        message: "User is already a member of this organization",
      };
    }

    // Use auto_assign_default_role if no role specified
    const assignedRole = role || teamSettings.auto_assign_default_role;

    // Send invitation email using Supabase Auth (requires admin client)
    const redirectTo = getRedirectUrl("/accept-invitation", subdomain);

    // Use admin client for inviting users (requires service role key)
    const adminClient = createAdminClient();
    const { error: inviteError } =
      await adminClient.auth.admin.inviteUserByEmail(email, {
        redirectTo,
        data: {
          organization_name: organization.company_name,
          subdomain: subdomain,
          user_role: assignedRole,
          invited_by_email: claims.claims.email,
          org_id: organization.id,
          requires_admin_approval: teamSettings.require_admin_approval, // Future use
        },
      });

    if (inviteError) {
      Sentry.logger.error("invite_user_error", {
        message: inviteError.message,
        status: inviteError.status,
        subdomain,
        email,
        role: assignedRole,
      });
      return { success: false, message: inviteError.message };
    }

    // Check if admin approval is required
    if (teamSettings.require_admin_approval) {
      return {
        success: true,
        message: `Invitation sent to ${email}. Admin approval is required before they can join.`,
      };
    }

    return {
      success: true,
      message: `Invitation sent successfully to ${email} as ${assignedRole}`,
    };
  } catch (error) {
    Sentry.logger.error("invite_user_exception", {
      message: error instanceof Error ? error.message : String(error),
    });
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}
