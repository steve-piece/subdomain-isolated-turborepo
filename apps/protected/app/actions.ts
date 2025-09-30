// apps/protected/app/actions.ts
"use server";

import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { type EmailOtpType } from "@supabase/supabase-js";
import { getRedirectUrl } from "@/lib/utils/get-redirect-url";

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

export interface UpdatePasswordResponse {
  success: boolean;
  message: string;
  error?: string;
}

/**
 * Updates the current user's password via Supabase Auth and then signs them out,
 * recording failures in Sentry so the UI can surface meaningful feedback. This
 * action is protected and requires an authenticated session.
 *
 * @param password - The new password to set
 * @param accessToken - Optional access token from password reset URL (for recovery flows)
 */
export async function updatePassword(
  password: string,
  accessToken?: string
): Promise<UpdatePasswordResponse> {
  try {
    const supabase = await createClient();

    // If access token provided (from recovery flow), verify user with it
    let user;
    if (accessToken) {
      const {
        data: { user: recoveryUser },
      } = await supabase.auth.getUser(accessToken);
      user = recoveryUser;
    } else {
      const {
        data: { user: sessionUser },
      } = await supabase.auth.getUser();
      user = sessionUser;
    }

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
  subdomain?: string,
  redirectTo?: string
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

// ============================================================================
// 2FA/MFA - Email-based Multi-Factor Authentication
// ============================================================================

export interface EnrollMFAResponse {
  success: boolean;
  message: string;
  factorId?: string;
}

/**
 * Enroll user in email-based MFA
 */
export async function enrollMFA(): Promise<EnrollMFAResponse> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, message: "Authentication required" };
    }

    // Enroll in email MFA factor
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: `Email MFA for ${user.email}`,
    });

    if (error) {
      Sentry.logger.error("mfa_enroll_error", {
        message: error.message,
        userId: user.id,
      });
      return { success: false, message: error.message };
    }

    console.log("✅ MFA enrollment started:", {
      factorId: data.id,
      userId: user.id,
    });

    return {
      success: true,
      message: "MFA enrollment started",
      factorId: data.id,
    };
  } catch (error) {
    Sentry.captureException(error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

export interface VerifyMFAEnrollmentResponse {
  success: boolean;
  message: string;
}

/**
 * Verify MFA enrollment with code
 */
export async function verifyMFAEnrollment(
  factorId: string,
  code: string
): Promise<VerifyMFAEnrollmentResponse> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, message: "Authentication required" };
    }

    const { error } = await supabase.auth.mfa.challengeAndVerify({
      factorId,
      code,
    });

    if (error) {
      Sentry.logger.error("mfa_verify_enrollment_error", {
        message: error.message,
        userId: user.id,
        factorId,
      });
      return { success: false, message: error.message };
    }

    console.log("✅ MFA enrollment verified:", {
      factorId,
      userId: user.id,
    });

    return { success: true, message: "MFA enabled successfully" };
  } catch (error) {
    Sentry.captureException(error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

export interface ChallengeMFAResponse {
  success: boolean;
  message: string;
  challengeId?: string;
}

/**
 * Challenge MFA - Send verification code to user's email
 */
export async function challengeMFA(
  factorId: string
): Promise<ChallengeMFAResponse> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase.auth.mfa.challenge({
      factorId,
    });

    if (error) {
      Sentry.logger.error("mfa_challenge_error", {
        message: error.message,
        factorId,
      });
      return { success: false, message: error.message };
    }

    console.log("✅ MFA challenge sent:", {
      challengeId: data.id,
      factorId,
    });

    return {
      success: true,
      message: "Verification code sent",
      challengeId: data.id,
    };
  } catch (error) {
    Sentry.captureException(error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

export interface VerifyMFAResponse {
  success: boolean;
  message: string;
}

/**
 * Verify MFA code during login
 */
export async function verifyMFA(
  factorId: string,
  challengeId: string,
  code: string
): Promise<VerifyMFAResponse> {
  try {
    const supabase = await createClient();

    const { error } = await supabase.auth.mfa.verify({
      factorId,
      challengeId,
      code,
    });

    if (error) {
      Sentry.logger.error("mfa_verify_error", {
        message: error.message,
        factorId,
        challengeId,
      });
      return { success: false, message: error.message };
    }

    console.log("✅ MFA verified successfully:", {
      factorId,
      challengeId,
    });

    return { success: true, message: "Verification successful" };
  } catch (error) {
    Sentry.captureException(error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

export interface UnenrollMFAResponse {
  success: boolean;
  message: string;
}

/**
 * Unenroll from MFA - Disable 2FA
 */
export async function unenrollMFA(
  factorId: string
): Promise<UnenrollMFAResponse> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, message: "Authentication required" };
    }

    const { error } = await supabase.auth.mfa.unenroll({
      factorId,
    });

    if (error) {
      Sentry.logger.error("mfa_unenroll_error", {
        message: error.message,
        userId: user.id,
        factorId,
      });
      return { success: false, message: error.message };
    }

    console.log("✅ MFA unenrolled:", {
      factorId,
      userId: user.id,
    });

    return { success: true, message: "2FA disabled successfully" };
  } catch (error) {
    Sentry.captureException(error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

export interface GetMFAFactorsResponse {
  success: boolean;
  message?: string;
  factors?: Array<{
    id: string;
    friendlyName: string;
    factorType: string;
    status: string;
  }>;
}

/**
 * Get user's MFA factors
 */
export async function getMFAFactors(): Promise<GetMFAFactorsResponse> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, message: "Authentication required" };
    }

    const { data, error } = await supabase.auth.mfa.listFactors();

    if (error) {
      Sentry.logger.error("mfa_list_factors_error", {
        message: error.message,
        userId: user.id,
      });
      return { success: false, message: error.message };
    }

    return {
      success: true,
      factors: data.totp.map((factor) => ({
        id: factor.id,
        friendlyName: factor.friendly_name || "Email MFA",
        factorType: factor.factor_type,
        status: factor.status,
      })),
    };
  } catch (error) {
    Sentry.captureException(error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

// ============================================================================
// CUSTOM ROLE CAPABILITIES (Business+ Tier)
// ============================================================================

export interface CustomCapabilityResponse {
  success: boolean;
  message?: string;
  canCustomize?: boolean;
  tier?: string;
}

export interface OrgCapabilitiesResponse {
  success: boolean;
  message?: string;
  data?: any[];
}

/**
 * Check if organization can customize role capabilities
 * Requires Business+ subscription tier
 */
export async function canCustomizeRoles(): Promise<CustomCapabilityResponse> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, message: "Authentication required" };
    }

    const { data: claims } = await supabase.auth.getClaims();
    const orgId = claims?.claims?.org_id;

    if (!orgId) {
      return { success: false, message: "Organization context required" };
    }

    const { data: subscription } = await supabase
      .from("subscriptions")
      .select(
        `
        subscription_tiers (
          name,
          allows_custom_permissions
        )
      `
      )
      .eq("org_id", orgId)
      .single();

    return {
      success: true,
      canCustomize:
        subscription?.subscription_tiers?.allows_custom_permissions || false,
      tier: subscription?.subscription_tiers?.name || "free",
    };
  } catch (error) {
    Sentry.captureException(error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

/**
 * Grant custom capability to a role
 * Only organization owners on Business+ tier can customize
 */
export async function grantCustomCapability(
  role: string,
  capabilityKey: string
): Promise<CustomCapabilityResponse> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, message: "Authentication required" };
    }

    const { data: claims } = await supabase.auth.getClaims();
    const orgId = claims?.claims?.org_id;
    const userRole = claims?.claims?.user_role;

    if (!orgId) {
      return { success: false, message: "Organization context required" };
    }

    // Only owners can customize
    if (userRole !== "owner") {
      return {
        success: false,
        message: "Only organization owners can customize role capabilities",
      };
    }

    // Check subscription tier
    const tierCheck = await canCustomizeRoles();
    if (!tierCheck.canCustomize) {
      return {
        success: false,
        message: `Upgrade to Business tier to customize role capabilities. Current tier: ${tierCheck.tier}`,
      };
    }

    // Get capability ID
    const { data: capability } = await supabase
      .from("capabilities")
      .select("id")
      .eq("key", capabilityKey)
      .single();

    if (!capability) {
      return { success: false, message: "Capability not found" };
    }

    // Upsert custom capability (granted = true)
    const { error } = await supabase.from("org_role_capabilities").upsert(
      {
        org_id: orgId,
        role: role,
        capability_id: capability.id,
        granted: true,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "org_id,role,capability_id",
      }
    );

    if (error) {
      Sentry.captureException(error);
      return { success: false, message: error.message };
    }

    console.log("✅ Custom capability granted:", {
      orgId,
      role,
      capability: capabilityKey,
    });

    return {
      success: true,
      message: `Capability '${capabilityKey}' granted to ${role}`,
    };
  } catch (error) {
    Sentry.captureException(error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

/**
 * Revoke custom capability from a role
 * Only organization owners on Business+ tier can customize
 */
export async function revokeCustomCapability(
  role: string,
  capabilityKey: string
): Promise<CustomCapabilityResponse> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, message: "Authentication required" };
    }

    const { data: claims } = await supabase.auth.getClaims();
    const orgId = claims?.claims?.org_id;
    const userRole = claims?.claims?.user_role;

    if (!orgId) {
      return { success: false, message: "Organization context required" };
    }

    // Only owners can customize
    if (userRole !== "owner") {
      return {
        success: false,
        message: "Only organization owners can customize role capabilities",
      };
    }

    // Check subscription tier
    const tierCheck = await canCustomizeRoles();
    if (!tierCheck.canCustomize) {
      return {
        success: false,
        message: `Upgrade to Business tier to customize role capabilities. Current tier: ${tierCheck.tier}`,
      };
    }

    // Get capability ID
    const { data: capability } = await supabase
      .from("capabilities")
      .select("id")
      .eq("key", capabilityKey)
      .single();

    if (!capability) {
      return { success: false, message: "Capability not found" };
    }

    // Upsert custom capability (granted = false to revoke)
    const { error } = await supabase.from("org_role_capabilities").upsert(
      {
        org_id: orgId,
        role: role,
        capability_id: capability.id,
        granted: false,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "org_id,role,capability_id",
      }
    );

    if (error) {
      Sentry.captureException(error);
      return { success: false, message: error.message };
    }

    console.log("✅ Custom capability revoked:", {
      orgId,
      role,
      capability: capabilityKey,
    });

    return {
      success: true,
      message: `Capability '${capabilityKey}' revoked from ${role}`,
    };
  } catch (error) {
    Sentry.captureException(error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

/**
 * Reset role to default capabilities
 * Removes all custom overrides for a specific role
 */
export async function resetRoleToDefaults(
  role: string
): Promise<CustomCapabilityResponse> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, message: "Authentication required" };
    }

    const { data: claims } = await supabase.auth.getClaims();
    const orgId = claims?.claims?.org_id;
    const userRole = claims?.claims?.user_role;

    if (!orgId) {
      return { success: false, message: "Organization context required" };
    }

    // Only owners can customize
    if (userRole !== "owner") {
      return {
        success: false,
        message: "Only organization owners can reset role capabilities",
      };
    }

    // Delete all custom capabilities for this role
    const { error } = await supabase
      .from("org_role_capabilities")
      .delete()
      .eq("org_id", orgId)
      .eq("role", role);

    if (error) {
      Sentry.captureException(error);
      return { success: false, message: error.message };
    }

    console.log("✅ Role reset to defaults:", {
      orgId,
      role,
    });

    return {
      success: true,
      message: `${role} role reset to default capabilities`,
    };
  } catch (error) {
    Sentry.captureException(error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

/**
 * Get all custom capabilities for current organization
 */
export async function getOrgCustomCapabilities(): Promise<OrgCapabilitiesResponse> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, message: "Authentication required" };
    }

    const { data: claims } = await supabase.auth.getClaims();
    const orgId = claims?.claims?.org_id;
    const userRole = claims?.claims?.user_role;

    if (!orgId) {
      return { success: false, message: "Organization context required" };
    }

    // Only owners and admins can view
    if (!["owner", "admin", "superadmin"].includes(userRole || "")) {
      return {
        success: false,
        message: "Only owners and admins can view custom capabilities",
      };
    }

    const { data, error } = await supabase
      .from("org_role_capabilities")
      .select(
        `
        role,
        granted,
        updated_at,
        capabilities (
          id,
          key,
          name,
          description,
          category
        )
      `
      )
      .eq("org_id", orgId)
      .order("role", { ascending: true });

    if (error) {
      Sentry.captureException(error);
      return { success: false, message: error.message };
    }

    return {
      success: true,
      data: data || [],
    };
  } catch (error) {
    Sentry.captureException(error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

/**
 * Get all available capabilities grouped by category
 */
export async function getAllCapabilities(): Promise<OrgCapabilitiesResponse> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, message: "Authentication required" };
    }

    const { data: claims } = await supabase.auth.getClaims();
    const userRole = claims?.claims?.user_role;

    // Only owners and admins can view
    if (!["owner", "admin", "superadmin"].includes(userRole || "")) {
      return {
        success: false,
        message: "Only owners and admins can view capabilities",
      };
    }

    const { data, error } = await supabase
      .from("capabilities")
      .select("*")
      .order("category", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      Sentry.captureException(error);
      return { success: false, message: error.message };
    }

    return {
      success: true,
      data: data || [],
    };
  } catch (error) {
    Sentry.captureException(error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

/**
 * Update user profile information
 */
export async function updateUserProfile(data: {
  full_name?: string;
  bio?: string;
  timezone?: string;
  phone_number?: string;
  language?: string;
}) {
  const supabase = await createClient();

  // Check authentication
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  
  if (userError || !user) {
    return { success: false, message: "Authentication required" };
  }

  // Update user_profiles table
  const { error: updateError } = await supabase
    .from("user_profiles")
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id);

  if (updateError) {
    Sentry.withScope((scope) => {
      scope.setTag("action", "update_profile");
      scope.setUser({ id: user.id, email: user.email });
      scope.setContext("profile_update", {
        message: updateError.message,
        details: updateError.details,
      });
      Sentry.captureException(updateError);
    });
    return { success: false, message: "Failed to update profile" };
  }

  return { success: true, message: "Profile updated successfully" };
}

/**
 * Update user notification preferences
 */
export async function updateNotificationPreferences(data: {
  email_account_activity?: boolean;
  email_team_updates?: boolean;
  email_project_activity?: boolean;
  email_marketing?: boolean;
  inapp_push_enabled?: boolean;
  inapp_sound_enabled?: boolean;
  email_digest_frequency?: string;
  quiet_hours_enabled?: boolean;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
}) {
  const supabase = await createClient();

  // Check authentication
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  
  if (userError || !user) {
    return { success: false, message: "Authentication required" };
  }

  // Check if preferences exist
  const { data: existing } = await supabase
    .from("user_notification_preferences")
    .select("id")
    .eq("user_id", user.id)
    .single();

  let error;
  
  if (existing) {
    // Update existing preferences
    const { error: updateError } = await supabase
      .from("user_notification_preferences")
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);
    error = updateError;
  } else {
    // Insert new preferences
    const { error: insertError } = await supabase
      .from("user_notification_preferences")
      .insert({
        user_id: user.id,
        ...data,
      });
    error = insertError;
  }

  if (error) {
    Sentry.withScope((scope) => {
      scope.setTag("action", "update_notification_preferences");
      scope.setUser({ id: user.id, email: user.email });
      scope.setContext("notification_update", {
        message: error.message,
        details: error.details,
      });
      Sentry.captureException(error);
    });
    return { success: false, message: "Failed to update notification preferences" };
  }

  return { success: true, message: "Notification preferences updated successfully" };
}
