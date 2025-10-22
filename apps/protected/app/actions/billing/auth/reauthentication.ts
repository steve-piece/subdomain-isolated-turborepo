// apps/protected/app/actions/auth/reauthentication.ts
"use server";

import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/server";

export interface VerifyReauthenticationResponse {
  success: boolean;
  message: string;
  redirectTo?: string;
}

/**
 * Verify reauthentication token for sensitive operations
 */
export async function verifyReauthentication(
  token: string,
  subdomain: string,
): Promise<VerifyReauthenticationResponse> {
  return Sentry.startSpan(
    {
      op: "auth.reauthenticate",
      name: "Verify reauthentication",
      attributes: {
        subdomain,
      },
    },
    async (span) => {
      try {
        const supabase = await createClient();

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          span.setStatus({ code: 2 });
          return {
            success: false,
            message: "Authentication session expired. Please sign in again.",
          };
        }

        const { error } = await supabase.auth.verifyOtp({
          email: user.email!,
          token,
          type: "email",
        });

        if (error) {
          span.setStatus({ code: 2 });
          Sentry.withScope((scope) => {
            scope.setTag("auth.flow", "verify_reauthentication");
            scope.setUser({ id: user.id, email: user.email ?? undefined });
            scope.setContext("verify_reauthentication", {
              subdomain,
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

        span.setStatus({ code: 1 });
        Sentry.logger.info("reauthentication_verified", {
          userId: user.id,
          subdomain,
        });

        return {
          success: true,
          message: "Identity confirmed successfully.",
          redirectTo: "/dashboard",
        };
      } catch (error) {
        span.setStatus({ code: 2 });
        Sentry.captureException(error, {
          tags: { action: "verify_reauthentication" },
          extra: { subdomain },
        });

        return {
          success: false,
          message: "An unexpected error occurred during verification.",
        };
      } finally {
        span.end();
      }
    },
  );
}
