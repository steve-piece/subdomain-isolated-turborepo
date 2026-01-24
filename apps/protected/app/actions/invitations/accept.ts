// apps/protected/app/actions/invitations/accept.ts
"use server";

import * as Sentry from "@sentry/nextjs";
import { createClient } from "@workspace/supabase/server";

export interface CompleteInvitationResponse {
  success: boolean;
  message?: string;
  redirectTo?: string;
}

/**
 * Complete invitation by setting password and display name for newly invited user
 */
export async function completeInvitation(
  password: string,
  fullName: string,
  redirectTo?: string,
): Promise<CompleteInvitationResponse> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false,
        message:
          "Your invitation session has expired. Please request a new invitation email.",
      };
    }

    // Extract invitation metadata
    const metadata = user.user_metadata as Record<string, unknown>;
    const orgId = metadata.org_id as string | undefined;
    const subdomain = metadata.subdomain as string | undefined;
    const userRole = metadata.user_role as string | undefined;

    if (!orgId || !subdomain || !userRole) {
      Sentry.logger.error("complete_invitation_missing_metadata", {
        userId: user.id,
        hasOrgId: !!orgId,
        hasSubdomain: !!subdomain,
        hasUserRole: !!userRole,
      });
      return {
        success: false,
        message: "Invalid invitation data. Please request a new invitation.",
      };
    }

    // Create or update user_profile row so custom claims work (idempotent upsert)
    const { error: profileError } = await supabase.from("user_profiles").upsert(
      {
        user_id: user.id,
        email: user.email!,
        full_name: fullName,
        org_id: orgId,
        role: userRole,
      },
      {
        onConflict: "user_id", // Primary key provides unique constraint
      },
    );

    if (profileError) {
      Sentry.logger.error("complete_invitation_profile_error", {
        userId: user.id,
        message: profileError.message,
      });
      return {
        success: false,
        message: "Failed to create user profile. Please contact support.",
      };
    }

    // Set password and display name
    const { error } = await supabase.auth.updateUser({
      password,
      data: {
        full_name: fullName,
      },
    });

    if (error) {
      Sentry.withScope((scope) => {
        scope.setTag("auth.flow", "complete_invitation");
        scope.setUser({ id: user.id, email: user.email ?? undefined });
        scope.setContext("complete_invitation", {
          message: error.message,
        });
        scope.setLevel("warning");
        Sentry.captureException(error);
      });

      return {
        success: false,
        message: error.message,
      };
    }

    // Force refresh session to get new JWT with custom claims
    await supabase.auth.refreshSession();

    return {
      success: true,
      message: "Invitation completed successfully.",
      redirectTo: redirectTo ?? "/dashboard",
    };
  } catch (error) {
    Sentry.withScope((scope) => {
      scope.setTag("auth.flow", "complete_invitation");
      Sentry.captureException(error);
    });

    return {
      success: false,
      message:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}
