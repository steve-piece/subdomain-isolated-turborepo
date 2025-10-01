// apps/protected/app/actions/invitations/send.ts
"use server";

import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRedirectUrl } from "@/lib/utils/get-redirect-url";

export interface InviteUserResponse {
  success: boolean;
  message: string;
  error?: string;
}

/**
 * Validates the inviter's claims, fetches organization metadata, checks for existing
 * membership, and dispatches a Supabase Admin invitation email with enriched metadata.
 */
export async function inviteUserToOrganization(
  email: string,
  role: "admin" | "member" | "view-only",
  subdomain: string
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

    // Verify user has permission to invite (owner, admin, or superadmin only)
    if (!["owner", "admin", "superadmin"].includes(claims.claims.user_role)) {
      Sentry.logger.warn("invite_user_insufficient_role", {
        email,
        role,
        subdomain,
        userRole: claims.claims.user_role,
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

    // Send invitation email using Supabase Auth (requires admin client)
    const redirectTo = getRedirectUrl("/auth/accept-invitation", subdomain);

    // Use admin client for inviting users (requires service role key)
    const adminClient = createAdminClient();
    const { error: inviteError } =
      await adminClient.auth.admin.inviteUserByEmail(email, {
        redirectTo,
        data: {
          organization_name: organization.company_name,
          subdomain: subdomain,
          user_role: role,
          invited_by_email: claims.claims.email,
          org_id: organization.id,
        },
      });

    if (inviteError) {
      Sentry.logger.error("invite_user_error", {
        message: inviteError.message,
        status: inviteError.status,
        subdomain,
        email,
        role,
      });
      return { success: false, message: inviteError.message };
    }

    return {
      success: true,
      message: `Invitation sent successfully to ${email}`,
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
