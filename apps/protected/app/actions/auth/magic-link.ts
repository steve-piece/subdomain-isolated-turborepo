// apps/protected/app/actions/auth/magic-link.ts
"use server";

import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/server";
import { getRedirectUrl } from "@/lib/utils/get-redirect-url";

export interface SendMagicLinkResponse {
  success: boolean;
  message: string;
}

/**
 * Send passwordless magic link to user's email
 */
export async function sendMagicLink(
  email: string,
  subdomain?: string,
  redirectTo?: string,
): Promise<SendMagicLinkResponse> {
  const supabase = await createClient();

  // Generate redirect URL if not provided
  const finalRedirectTo =
    redirectTo || getRedirectUrl("/auth/confirm", subdomain);

  return Sentry.startSpan(
    {
      op: "auth.magic_link",
      name: "Send magic link",
      attributes: {
        email,
        subdomain,
        hasRedirect: Boolean(redirectTo),
      },
    },
    async (span) => {
      try {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: finalRedirectTo,
            data: {
              email_action: "magiclink",
              subdomain,
            },
          },
        });

        if (error) {
          throw error;
        }

        span.setStatus({ code: 1 }); // OK
        Sentry.logger.info("magic_link_sent", {
          email,
          subdomain,
          redirectTo: finalRedirectTo,
          hasRedirect: Boolean(redirectTo),
        });

        return {
          success: true,
          message: "Magic link sent. Please check your inbox.",
        };
      } catch (error) {
        span.setStatus({ code: 2 }); // INTERNAL_ERROR
        Sentry.withScope((scope) => {
          scope.setTag("auth.flow", "magic_link_request");
          scope.setUser({ email });
          scope.setContext("magic_link_request", {
            redirectTo,
          });
          Sentry.captureException(error);
        });

        return {
          success: false,
          message:
            error instanceof Error
              ? error.message
              : "Unable to send magic link.",
        };
      } finally {
        span.end();
      }
    },
  );
}
