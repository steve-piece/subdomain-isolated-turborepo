// apps/protected/app/actions/auth/password-reset.ts
"use server";

import * as Sentry from "@sentry/nextjs";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@workspace/supabase/server";
import { logSecurityEvent } from "@/app/actions/security/audit-log";
import { getRedirectUrl } from "@/lib/utils/get-redirect-url";

export interface RequestPasswordResetResponse {
  success: boolean;
  message: string;
}

/**
 * Requests a password reset email for the given email address.
 * Validates that the user belongs to the organization for the given subdomain.
 * Logs the password reset request to the security audit log.
 * 
 * @param email - The email address to send the reset link to
 * @param subdomain - The tenant subdomain for redirect URL
 */
export async function requestPasswordReset(
  email: string,
  subdomain: string,
): Promise<RequestPasswordResetResponse> {
  try {
    const supabase = await createClient();

    // Create admin client to bypass RLS for validation (user is not authenticated)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

    if (!supabaseUrl || !supabaseSecretKey) {
      throw new Error("Supabase configuration missing");
    }

    const supabaseAdmin = createSupabaseClient(supabaseUrl, supabaseSecretKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Validate that the user belongs to this organization/subdomain
    const { data: userProfile } = await supabaseAdmin
      .from("user_profiles")
      .select("user_id, organizations!inner(subdomain)")
      .eq("email", email)
      .eq("organizations.subdomain", subdomain)
      .maybeSingle();

    if (!userProfile) {
      // Don't reveal whether the user exists - return generic success message
      // This prevents email enumeration attacks
      return {
        success: true,
        message: "If an account exists with this email, you will receive a password reset link.",
      };
    }

    // Redirect to the current tenant's update-password route
    const redirectTo = getRedirectUrl("/auth/update-password", subdomain);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    if (error) {
      // Check for rate limiting
      if (error.message.includes("rate") || error.message.includes("limit")) {
        Sentry.logger.warn("password_reset_rate_limited", {
          email,
          subdomain,
        });
        return {
          success: false,
          message: "Too many reset requests. Please wait an hour and try again.",
        };
      }

      Sentry.logger.error("password_reset_request_error", {
        message: error.message,
        email,
        subdomain,
      });
      return { success: false, message: error.message };
    }

    // Log the password reset request
    // Note: We don't have a userId at this point since the user is not authenticated
    // The log will be associated with the user when they complete the reset
    await logSecurityEvent({
      eventType: "password",
      eventAction: "password_reset_requested",
      severity: "info",
      metadata: { 
        email,
        subdomain,
        requestedAt: new Date().toISOString(),
      },
      // userId will be auto-detected as undefined, which is expected for unauthenticated requests
    });

    return {
      success: true,
      message: "If an account exists with this email, you will receive a password reset link.",
    };
  } catch (error) {
    Sentry.logger.error("password_reset_request_exception", {
      message: error instanceof Error ? error.message : "Unknown error",
      email,
      subdomain,
    });
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}
