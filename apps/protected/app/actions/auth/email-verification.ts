// apps/protected/app/actions/auth/email-verification.ts
"use server";

import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/server";
import { type EmailOtpType } from "@supabase/supabase-js";

export interface ResendVerificationResponse {
  success: boolean;
  message: string;
  error?: string;
}

export interface ConfirmEmailResponse {
  success: boolean;
  message?: string;
  redirectTo?: string;
}

/**
 * Resends the Supabase signup verification email for a given address, bypassing the
 * password requirement and tagging any failures in Sentry for later investigation.
 */
export async function resendEmailVerification(
  email: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _subdomain: string
): Promise<ResendVerificationResponse> {
  const supabase = await createClient();

  // Directly resend verification email without requiring password
  const { error: resendError } = await supabase.auth.resend({
    type: "signup",
    email,
  });

  if (resendError) {
    Sentry.withScope((scope) => {
      scope.setTag("auth.flow", "resend_verification");
      scope.setUser({ email });
      scope.setContext("resend_verification", {
        message: resendError.message,
        status: resendError.status,
      });
      scope.setLevel("warning");
      Sentry.captureException(resendError);
    });
    return { success: false, message: resendError.message };
  }

  return {
    success: true,
    message: "Verification email resent successfully! Please check your inbox.",
  };
}

/**
 * Confirms a Supabase email OTP token, then attempts to bootstrap tenant infrastructure
 * for owner signups, handling transient session timing and surfacing user-friendly errors.
 */
export async function confirmEmailAndBootstrap(
  token_hash: string,
  type: EmailOtpType,
  subdomain: string
): Promise<ConfirmEmailResponse> {
  try {
    const supabase = await createClient();

    // Verify the email OTP token
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type,
    });

    if (error) {
      Sentry.withScope((scope) => {
        scope.setTag("auth.flow", "verify_otp");
        scope.setContext("verify_otp", {
          type,
          subdomain,
          message: error.message,
          tokenHashPrefix: token_hash.slice(0, 8),
        });
        scope.setLevel("warning");
        Sentry.captureException(error);
      });
      // Token expired or invalid
      if (
        error.message.toLowerCase().includes("expired") ||
        error.message.toLowerCase().includes("invalid")
      ) {
        return {
          success: false,
          message:
            "Verification link invalid or expired. Please request a new one.",
          redirectTo:
            "/auth/resend-verification?error=expired&message=Verification link has expired. Please request a new one.",
        };
      }
      return {
        success: false,
        message: error.message,
        redirectTo: `/auth/error?error=${encodeURIComponent(error.message)}`,
      };
    }

    // After successful verification, attempt to bootstrap the organization
    try {
      let attempts = 0;
      // small retry loop to wait for session
      while (attempts < 3) {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session) {
          // Only bootstrap for owner signups based on auth.users user_metadata
          const role = (
            sessionData.session.user.user_metadata as Record<string, unknown>
          )?.user_role;
          if (role === "owner") {
            await supabase.rpc("bootstrap_organization", {
              p_user_id: sessionData.session.user.id,
              p_subdomain: subdomain,
            });
          }
          break;
        }
        attempts++;
        await new Promise((r) => setTimeout(r, 300));
      }
    } catch {
      // Non-fatal: bootstrap can be retried later from app UI
      Sentry.withScope((scope) => {
        scope.setTag("auth.flow", "bootstrap_organization");
        scope.setContext("bootstrap_organization", {
          subdomain,
        });
        scope.setLevel("info");
        Sentry.captureMessage("bootstrap_organization_retry_skipped");
      });
    }

    return {
      success: true,
      message: "Email verified successfully! Please login with your details.",
      redirectTo:
        "/auth/login?verified=true&message=Email verified successfully! Please login with your details.",
    };
  } catch (err) {
    Sentry.withScope((scope) => {
      scope.setTag("auth.flow", "confirm_email_bootstrap");
      scope.setContext("confirm_email_bootstrap", {
        type,
        subdomain,
      });
      Sentry.captureException(err);
    });
    return {
      success: false,
      message:
        err instanceof Error ? err.message : "An unexpected error occurred",
      redirectTo: "/auth/error",
    };
  }
}

/**
 * Handle various authentication confirmation flows (signup, magic link, recovery, etc.)
 */
export async function handleAuthConfirmation(
  token_hash: string,
  type: EmailOtpType,
  subdomain: string,
  redirectHint?: string
): Promise<ConfirmEmailResponse> {
  const typeValue = type as string;

  if (type === "signup") {
    const signupResult = await confirmEmailAndBootstrap(
      token_hash,
      type,
      subdomain
    );
    if (signupResult.success && redirectHint) {
      return { ...signupResult, redirectTo: redirectHint };
    }
    return signupResult;
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.verifyOtp({
    token_hash,
    type,
  });

  if (error) {
    const isEmailChangeFlow =
      typeValue === "email_change" ||
      typeValue === "email_change_current" ||
      typeValue === "email_change_new";

    Sentry.withScope((scope) => {
      scope.setTag("auth.flow", "verify_otp");
      scope.setContext("verify_otp", {
        type,
        subdomain,
        message: error.message,
        tokenHashPrefix: token_hash.slice(0, 8),
      });
      scope.setLevel("warning");
      Sentry.captureException(error);
    });

    if (
      error.message.toLowerCase().includes("expired") ||
      error.message.toLowerCase().includes("invalid")
    ) {
      return {
        success: false,
        message:
          "Verification link invalid or expired. Please request a new one.",
        redirectTo: isEmailChangeFlow
          ? "/auth/email-change/error?reason=expired"
          : "/auth/resend-verification?error=expired&message=Verification link has expired. Please request a new one.",
      };
    }

    return {
      success: false,
      message: error.message,
      redirectTo: isEmailChangeFlow
        ? `/auth/email-change/error?message=${encodeURIComponent(error.message)}`
        : `/auth/error?error=${encodeURIComponent(error.message)}`,
    };
  }

  const defaultRedirectMap: Record<string, string> = {
    email_change: "/auth/email-change/success?stage=generic",
    email_change_current: "/auth/email-change/success?stage=current",
    email_change_new: "/auth/email-change/success?stage=new",
    magiclink: "/dashboard",
    invite: "/auth/login?invited=true",
    recovery: "/auth/update-password",
    reauthenticate: "/dashboard?reauthenticated=true",
  };

  const defaultRedirect = defaultRedirectMap[typeValue] ?? "/auth/login";

  return {
    success: true,
    message: "Verification successful.",
    redirectTo: redirectHint ?? defaultRedirect,
  };
}
