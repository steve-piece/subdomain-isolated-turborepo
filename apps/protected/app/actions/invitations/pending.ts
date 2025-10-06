// apps/protected/app/actions/invitations/pending.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRedirectUrl } from "@/lib/utils/get-redirect-url";
import { revalidatePath } from "next/cache";
import * as Sentry from "@sentry/nextjs";

export interface PendingInvitation {
  id: string;
  email: string;
  proposed_role: string;
  invited_by: string;
  status: "pending" | "approved" | "rejected" | "expired";
  expires_at: string;
  created_at: string;
  inviter_name?: string;
}

export interface PendingInvitationsResponse {
  success: boolean;
  message?: string;
  invitations?: PendingInvitation[];
}

export interface InvitationActionResponse {
  success: boolean;
  message: string;
}

interface PendingInvitationDbRow {
  id: string;
  email: string;
  proposed_role: string;
  invited_by: string;
  status: "pending" | "approved" | "rejected" | "expired";
  expires_at: string;
  created_at: string;
  inviter:
    | {
        full_name: string | null;
      }[]
    | null;
}

/**
 * Get all pending invitations for an organization
 */
export async function getPendingInvitations(
  orgId: string
): Promise<PendingInvitationsResponse> {
  try {
    const supabase = await createClient();

    // Verify authentication and permissions
    const { data: claims } = await supabase.auth.getClaims();
    if (!claims || claims.claims.org_id !== orgId) {
      return { success: false, message: "Unauthorized" };
    }

    // Only admins+ can view pending invitations
    if (!["owner", "admin", "superadmin"].includes(claims.claims.user_role)) {
      return { success: false, message: "Insufficient permissions" };
    }

    // Fetch pending invitations with inviter info
    const { data, error } = await supabase
      .from("pending_invitations")
      .select(
        `
        id,
        email,
        proposed_role,
        invited_by,
        status,
        expires_at,
        created_at,
        inviter:invited_by(full_name)
      `
      )
      .eq("org_id", orgId)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      Sentry.captureException(error, {
        tags: { action: "getPendingInvitations", org_id: orgId },
      });
      return { success: false, message: error.message };
    }

    const invitations: PendingInvitation[] = (data || []).map(
      (inv: PendingInvitationDbRow) => ({
        id: inv.id,
        email: inv.email,
        proposed_role: inv.proposed_role,
        invited_by: inv.invited_by,
        status: inv.status,
        expires_at: inv.expires_at,
        created_at: inv.created_at,
        inviter_name: inv.inviter?.[0]?.full_name || "Unknown",
      })
    );

    return {
      success: true,
      invitations,
    };
  } catch (error) {
    Sentry.captureException(error, {
      tags: { action: "getPendingInvitations", org_id: orgId },
    });
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to fetch invitations",
    };
  }
}

/**
 * Approve a pending invitation and send Supabase Auth invite
 */
export async function approveInvitation(
  invitationId: string,
  subdomain: string
): Promise<InvitationActionResponse> {
  try {
    const supabase = await createClient();

    // Verify authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, message: "Authentication required" };
    }

    const { data: claims } = await supabase.auth.getClaims();
    if (!claims) {
      return { success: false, message: "Authentication required" };
    }

    // Only admins+ can approve
    if (!["owner", "admin", "superadmin"].includes(claims.claims.user_role)) {
      return { success: false, message: "Insufficient permissions" };
    }

    // Get invitation details
    const { data: invitation, error: fetchError } = await supabase
      .from("pending_invitations")
      .select("*, organizations(id, company_name, subdomain)")
      .eq("id", invitationId)
      .eq("status", "pending")
      .single();

    if (fetchError || !invitation) {
      return { success: false, message: "Invitation not found" };
    }

    // Verify user belongs to the organization
    if (
      invitation.org_id !== claims.claims.org_id ||
      invitation.organizations?.subdomain !== subdomain
    ) {
      return { success: false, message: "Unauthorized" };
    }

    // Check if invitation expired
    if (new Date(invitation.expires_at) < new Date()) {
      // Mark as expired
      await supabase
        .from("pending_invitations")
        .update({ status: "expired" })
        .eq("id", invitationId);

      return { success: false, message: "Invitation has expired" };
    }

    // Send Supabase Auth invitation
    const redirectTo = getRedirectUrl("/auth/accept-invitation", subdomain);
    const adminClient = createAdminClient();

    const { error: inviteError } =
      await adminClient.auth.admin.inviteUserByEmail(invitation.email, {
        redirectTo,
        data: {
          organization_name: invitation.organizations.company_name,
          subdomain: subdomain,
          user_role: invitation.proposed_role,
          invited_by_email: claims.claims.email,
          org_id: invitation.org_id,
        },
      });

    if (inviteError) {
      Sentry.captureException(inviteError, {
        tags: { action: "approveInvitation", invitation_id: invitationId },
      });
      return {
        success: false,
        message: `Failed to send invitation: ${inviteError.message}`,
      };
    }

    // Update invitation status
    const { error: updateError } = await supabase
      .from("pending_invitations")
      .update({
        status: "approved",
        approved_by: user.id,
        approved_at: new Date().toISOString(),
      })
      .eq("id", invitationId);

    if (updateError) {
      Sentry.captureException(updateError, {
        tags: { action: "approveInvitation", invitation_id: invitationId },
      });
      return { success: false, message: updateError.message };
    }

    revalidatePath("/org-settings/team");

    return {
      success: true,
      message: `Invitation approved and sent to ${invitation.email}`,
    };
  } catch (error) {
    Sentry.captureException(error, {
      tags: { action: "approveInvitation", invitation_id: invitationId },
    });
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to approve invitation",
    };
  }
}

/**
 * Reject a pending invitation
 */
export async function rejectInvitation(
  invitationId: string,
  reason?: string
): Promise<InvitationActionResponse> {
  try {
    const supabase = await createClient();

    // Verify authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, message: "Authentication required" };
    }

    const { data: claims } = await supabase.auth.getClaims();
    if (!claims) {
      return { success: false, message: "Authentication required" };
    }

    // Only admins+ can reject
    if (!["owner", "admin", "superadmin"].includes(claims.claims.user_role)) {
      return { success: false, message: "Insufficient permissions" };
    }

    // Get invitation to verify org
    const { data: invitation, error: fetchError } = await supabase
      .from("pending_invitations")
      .select("org_id, email")
      .eq("id", invitationId)
      .eq("status", "pending")
      .single();

    if (fetchError || !invitation) {
      return { success: false, message: "Invitation not found" };
    }

    // Verify user belongs to the organization
    if (invitation.org_id !== claims.claims.org_id) {
      return { success: false, message: "Unauthorized" };
    }

    // Update invitation status
    const { error: updateError } = await supabase
      .from("pending_invitations")
      .update({
        status: "rejected",
        rejected_by: user.id,
        rejected_at: new Date().toISOString(),
        rejection_reason: reason || null,
      })
      .eq("id", invitationId);

    if (updateError) {
      Sentry.captureException(updateError, {
        tags: { action: "rejectInvitation", invitation_id: invitationId },
      });
      return { success: false, message: updateError.message };
    }

    revalidatePath("/org-settings/team");

    return {
      success: true,
      message: `Invitation to ${invitation.email} has been rejected`,
    };
  } catch (error) {
    Sentry.captureException(error, {
      tags: { action: "rejectInvitation", invitation_id: invitationId },
    });
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to reject invitation",
    };
  }
}
