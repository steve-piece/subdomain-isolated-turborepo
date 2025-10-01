// apps/protected/app/actions/invitations/accept.ts
"use server";

import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/server";

export interface CompleteInvitationResponse {
  success: boolean;
  message?: string;
  redirectTo?: string;
}

/**
 * Complete invitation by setting password for newly invited user
 */
export async function completeInvitation(
  password: string,
  redirectTo?: string
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

    const { error } = await supabase.auth.updateUser({
      password,
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
