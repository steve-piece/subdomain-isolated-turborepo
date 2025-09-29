// apps/protected/app/actions.ts
"use server";

import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/server";
import { type EmailOtpType } from "@supabase/supabase-js";
import { getRedirectUrl } from "@/lib/utils/get-redirect-url";
import { logger } from "@sentry/nextjs";

export interface ResendVerificationResponse {
  success: boolean;
  message: string;
  error?: string;
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

export interface LoginWithToastResponse {
  success: boolean;
  message?: string;
  redirectTo?: string;
}

/**
 * Signs a user in with email and password, returning a lightweight result that allows
 * UI components to surface toast messages or trigger redirects without throwing.
 */
export async function loginWithToast(
  email: string,
  password: string
): Promise<LoginWithToastResponse> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    Sentry.withScope((scope) => {
      scope.setTag("auth.flow", "login_with_toast");
      scope.setUser({ email });
      scope.setContext("login_with_toast", {
        status: error.status,
        message: error.message,
      });
      scope.setLevel("warning");
      Sentry.captureException(error);
    });
    return { success: false, message: error.message };
  }

  Sentry.logger.info("login_with_toast_success", {
    email,
  });
  return { success: true, redirectTo: "/dashboard" };
}

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

    // Send invitation email using Supabase Auth
    const redirectTo = getRedirectUrl("/auth/accept-invitation", subdomain);

    const { error: inviteError } = await supabase.auth.admin.inviteUserByEmail(
      email,
      {
        redirectTo,
        data: {
          organization_name: organization.company_name,
          subdomain: subdomain,
          user_role: role,
          invited_by_email: claims.claims.email,
          org_id: organization.id,
        },
      }
    );

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

export interface UpdatePasswordResponse {
  success: boolean;
  message: string;
  error?: string;
}

/**
 * Updates the current user's password via Supabase Auth and then signs them out,
 * recording failures in Sentry so the UI can surface meaningful feedback. This
 * action is protected and requires an authenticated session.
 */
export async function updatePassword(
  password: string
): Promise<UpdatePasswordResponse> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, message: "Authentication required" };
    }

    const { error } = await supabase.auth.updateUser({
      password: password,
    });

    if (error) {
      Sentry.logger.error("update_password_error", {
        message: error.message,
        userId: user.id,
      });
      return { success: false, message: error.message };
    }

    await supabase.auth.signOut();

    return {
      success: true,
      message:
        "Password updated successfully! Please login with your new password.",
    };
  } catch (error) {
    Sentry.logger.error("update_password_exception", {
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

export interface ConfirmEmailResponse {
  success: boolean;
  message?: string;
  redirectTo?: string;
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

export interface CompleteInvitationResponse {
  success: boolean;
  message?: string;
  redirectTo?: string;
}

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

export interface SendMagicLinkResponse {
  success: boolean;
  message: string;
}

export async function sendMagicLink(
  email: string,
  redirectTo?: string
): Promise<SendMagicLinkResponse> {
  const supabase = await createClient();

  return Sentry.startSpan(
    {
      op: "auth.magic_link",
      name: "Send magic link",
      attributes: {
        email,
        hasRedirect: Boolean(redirectTo),
      },
    },
    async (span) => {
      try {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: redirectTo,
            data: {
              email_action: "magiclink",
            },
          },
        });

        if (error) {
          throw error;
        }

        span.setStatus({ code: 1 }); // OK
        Sentry.logger.info("magic_link_sent", {
          email,
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
    }
  );
}

export interface VerifyReauthenticationResponse {
  success: boolean;
  message: string;
  redirectTo?: string;
}

export async function verifyReauthentication(
  token: string,
  subdomain: string
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
    }
  );
}
