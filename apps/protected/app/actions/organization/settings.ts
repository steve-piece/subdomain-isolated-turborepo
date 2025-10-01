// apps/protected/app/actions/organization/settings.ts
"use server";

import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface UpdateOrganizationIdentityResponse {
  success: boolean;
  message: string;
  error?: string;
}

/**
 * Updates organization identity information (name, description).
 * Only owners and admins can perform this action.
 * Subdomain changes are not allowed through this action.
 */
export async function updateOrganizationIdentity(
  formData: FormData
): Promise<UpdateOrganizationIdentityResponse> {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return {
        success: false,
        message: "Authentication required",
      };
    }

    // Get user claims for authorization
    const { data: claims, error: claimsError } =
      await supabase.auth.getClaims();

    if (claimsError || !claims) {
      return {
        success: false,
        message: "Unable to verify user claims",
      };
    }

    const userRole = claims.claims.user_role;
    const orgId = claims.claims.org_id;
    const subdomain = claims.claims.subdomain;

    // Check if user has permission to update organization settings
    const allowedRoles = ["owner", "admin", "superadmin"];
    if (!allowedRoles.includes(userRole)) {
      Sentry.logger.warn("unauthorized_org_update_attempt", {
        userId: user.id,
        userRole,
        orgId,
      });
      return {
        success: false,
        message:
          "Insufficient permissions. Only owners and admins can update organization settings.",
      };
    }

    // Extract and validate form data
    const orgName = formData.get("org-name")?.toString().trim();
    const description = formData.get("description")?.toString().trim();

    // Validate organization name
    if (!orgName || orgName.length === 0) {
      return {
        success: false,
        message: "Organization name is required",
      };
    }

    if (orgName.length > 255) {
      return {
        success: false,
        message: "Organization name must be 255 characters or less",
      };
    }

    // Validate description (optional but has max length)
    if (description && description.length > 1000) {
      return {
        success: false,
        message: "Description must be 1000 characters or less",
      };
    }

    // Update organization in database
    const { error: updateError } = await supabase
      .from("organizations")
      .update({
        company_name: orgName,
        description: description || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orgId);

    if (updateError) {
      Sentry.withScope((scope) => {
        scope.setTag("action", "update_organization_identity");
        scope.setUser({ id: user.id, email: user.email });
        scope.setContext("organization_update", {
          orgId,
          message: updateError.message,
          details: updateError.details,
        });
        Sentry.captureException(updateError);
      });

      return {
        success: false,
        message: "Failed to update organization. Please try again.",
        error: updateError.message,
      };
    }

    // Revalidate the current path to reflect changes
    revalidatePath(`/s/${subdomain}/org-settings`);

    Sentry.logger.info("organization_identity_updated", {
      userId: user.id,
      orgId,
      subdomain,
    });

    return {
      success: true,
      message: "Organization settings updated successfully!",
    };
  } catch (error) {
    Sentry.withScope((scope) => {
      scope.setTag("action", "update_organization_identity");
      Sentry.captureException(error);
    });

    return {
      success: false,
      message:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}
