// apps/protected/app/actions.ts 
"use server";

import { createClient } from "@/lib/supabase/server";
import { AuthApiError, type EmailOtpType } from "@supabase/supabase-js";

export interface ResendVerificationResponse {
  success: boolean;
  message: string;
  error?: string;
}

export async function resendEmailVerification(
  email: string,
  password: string,
  subdomain: string
): Promise<ResendVerificationResponse> {
  const supabase = await createClient();

  // First, attempt to sign in to verify credentials
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    if (
      signInError instanceof AuthApiError &&
      signInError.message.includes("Email not confirmed")
    ) {
      // If email not confirmed, try to resend verification
      const { error: resendError } = await supabase.auth.resend({
        type: "signup",
        email,
      });

      if (resendError) {
        return { success: false, message: resendError.message };
      }
      return {
        success: true,
        message:
          "Verification email resent successfully! Please check your inbox.",
      };
    }
    return { success: false, message: signInError.message };
  }

  return {
    success: false,
    message: "Email is already verified or login was successful.",
  };
}

export interface LoginWithToastResponse {
  success: boolean;
  message?: string;
  redirectTo?: string;
}

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
    return { success: false, message: error.message };
  }

  return { success: true, redirectTo: "/dashboard" };
}

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

export interface UpdatePasswordResponse {
  success: boolean;
  message: string;
  error?: string;
}

export async function updatePassword(
  password: string,
  subdomain: string
): Promise<UpdatePasswordResponse> {
  try {
    const supabase = await createClient();

    const { error } = await supabase.auth.updateUser({
      password: password,
    });

    if (error) {
      console.error("Password update error:", error);
      return { success: false, message: error.message };
    }

    return {
      success: true,
      message:
        "Password updated successfully! Please login with your new password.",
    };
  } catch (error) {
    console.error("Update password error:", error);
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
      // eslint-disable-next-line no-await-in-loop
      while (attempts < 3) {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session) {
          // Only bootstrap for owner signups based on auth.users user_metadata
          const role = (sessionData.session.user.user_metadata as any)
            ?.user_role;
          if (role === "owner") {
            await supabase.rpc("bootstrap_organization", {
              p_user_id: sessionData.session.user.id,
              p_subdomain: subdomain,
            });
          }
          break;
        }
        attempts++;
        // eslint-disable-next-line no-await-in-loop
        await new Promise((r) => setTimeout(r, 300));
      }
    } catch {
      // Non-fatal: bootstrap can be retried later from app UI
    }

    return {
      success: true,
      message: "Email verified successfully! Please login with your details.",
      redirectTo:
        "/auth/login?verified=true&message=Email verified successfully! Please login with your details.",
    };
  } catch (err) {
    return {
      success: false,
      message:
        err instanceof Error ? err.message : "An unexpected error occurred",
      redirectTo: "/auth/error",
    };
  }
}
