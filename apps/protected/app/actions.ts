"use server";

import { createClient } from "@/lib/supabase/server";

export interface ResendVerificationResponse {
  success: boolean;
  message: string;
  error?: string;
}

/**
 * Resend email verification after validating user credentials
 */
export async function resendEmailVerification(
  email: string,
  password: string,
  subdomain: string
): Promise<ResendVerificationResponse> {
  if (!email || !password || !subdomain) {
    return {
      success: false,
      message: "Email, password, and subdomain are required",
      error: "validation_error"
    };
  }

  try {
    const supabase = await createClient();

    // First, try to sign in to validate credentials
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    // If sign in fails for reasons other than unconfirmed email, return error
    if (signInError && !signInError.message.includes("Email not confirmed")) {
      return {
        success: false,
        message: signInError.message,
        error: "auth_error"
      };
    }

    // If credentials are valid, resend verification email
    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo: `https://${subdomain}.${process.env.NEXT_PUBLIC_APP_DOMAIN}/auth/confirm`,
      },
    });

    if (resendError) {
      return {
        success: false,
        message: resendError.message,
        error: "resend_error"
      };
    }

    // Sign out the user since they're not fully authenticated yet
    await supabase.auth.signOut();

    return {
      success: true,
      message: "Verification email sent! Please check your inbox and click the verification link."
    };

  } catch (error) {
    console.error("Resend verification error:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "An unexpected error occurred",
      error: "server_error"
    };
  }
}

export interface LoginWithToastResponse {
  success: boolean;
  message?: string;
  redirectTo?: string;
  error?: string;
}

/**
 * Handle login with support for verification toast messages
 */
export async function loginWithToast(
  email: string,
  password: string
): Promise<LoginWithToastResponse> {
  if (!email || !password) {
    return {
      success: false,
      message: "Email and password are required",
      error: "validation_error"
    };
  }

  try {
    const supabase = await createClient();

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // Handle specific error cases
      if (error.message.includes("Email not confirmed")) {
        return {
          success: false,
          message: "Please verify your email address before signing in. Check your inbox for a verification link.",
          error: "email_not_confirmed"
        };
      }
      
      return {
        success: false,
        message: error.message,
        error: "auth_error"
      };
    }

    // TODO: Add organization/tenant verification here
    // You might want to check if the user belongs to the specified subdomain

    return {
      success: true,
      redirectTo: "/dashboard"
    };

  } catch (error) {
    console.error("Login error:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "An unexpected error occurred",
      error: "server_error"
    };
  }
}
