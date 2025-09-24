"use server";

import { createClient } from "@/lib/supabase/server";

export interface InviteUserResponse {
  success: boolean;
  message: string;
  error?: string;
}

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
      return { success: false, message: "Authentication required" };
    }

    // Verify user belongs to this subdomain
    if (claims.claims.subdomain !== subdomain) {
      return { success: false, message: "Unauthorized: Invalid tenant" };
    }

    // Verify user has permission to invite (admin or superadmin only)
    if (!["admin", "superadmin"].includes(claims.claims.user_role)) {
      return {
        success: false,
        message: "Insufficient permissions to invite users",
      };
    }

    // Get organization details for the email template
    const { data: tenant, error: tenantError } = await supabase
      .from("tenants")
      .select(
        `
        id,
        company_name,
        subdomain,
        organizations!inner(company_name)
      `
      )
      .eq("subdomain", subdomain)
      .single();

    if (tenantError || !tenant) {
      return { success: false, message: "Organization not found" };
    }

    // Check if user is already invited or exists
    const { data: existingUser } = await supabase
      .from("user_profiles")
      .select("user_id, email")
      .eq("email", email.toLowerCase())
      .eq("org_id", tenant.id)
      .single();

    if (existingUser) {
      return {
        success: false,
        message: "User is already a member of this organization",
      };
    }

    // Send invitation email using Supabase Auth
    const redirectTo = `https://${subdomain}.${process.env.NEXT_PUBLIC_APP_DOMAIN}/auth/accept-invitation`;

    const { error: inviteError } = await supabase.auth.admin.inviteUserByEmail(
      email,
      {
        redirectTo,
        data: {
          organization_name:
            tenant.organizations?.[0]?.company_name || tenant.company_name,
          subdomain: subdomain,
          user_role: role,
          invited_by_email: claims.claims.email,
          org_id: tenant.id,
        },
      }
    );

    if (inviteError) {
      console.error("Invite error:", inviteError);
      return { success: false, message: inviteError.message };
    }

    return {
      success: true,
      message: `Invitation sent successfully to ${email}`,
    };
  } catch (error) {
    console.error("Invite user error:", error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}
