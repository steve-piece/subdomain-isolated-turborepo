// apps/protected/app/actions/auth/login.ts
"use server";

import * as Sentry from "@sentry/nextjs";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@workspace/supabase/server";
import { logSecurityEvent } from "@/app/actions/security/audit-log";

export interface LoginWithToastResponse {
  success: boolean;
  message?: string;
  redirectTo?: string;
}

/**
 * Signs a user in with email and password, returning a lightweight result that allows
 * UI components to surface toast messages or trigger redirects without throwing.
 * Validates that the user belongs to the organization for the given subdomain.
 */
export async function loginWithToast(
  email: string,
  password: string,
  subdomain?: string,
): Promise<LoginWithToastResponse> {
  const supabase = await createClient();

  // Pre-validate that the user belongs to this organization/subdomain before attempting login
  if (subdomain) {
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

    const { data: userProfile } = await supabaseAdmin
      .from("user_profiles")
      .select("user_id, organizations!inner(subdomain)")
      .eq("email", email)
      .eq("organizations.subdomain", subdomain)
      .maybeSingle();

    if (!userProfile) {
      // Don't reveal whether the user exists in a different org
      // Return the same error as invalid credentials
      await logSecurityEvent({
        eventType: "auth",
        eventAction: "login_failed",
        severity: "warning",
        metadata: { email, reason: "wrong_subdomain" },
      });

      return { 
        success: false, 
        message: "Invalid login credentials" 
      };
    }
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    // Log failed login attempt
    await logSecurityEvent({
      eventType: "auth",
      eventAction: "login_failed",
      severity: "warning",
      metadata: { email, error: error.message },
    });

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

  // Log successful login
  await logSecurityEvent({
    eventType: "auth",
    eventAction: "login_success",
    severity: "info",
    metadata: { email },
    userId: data.user?.id,
  });

  Sentry.logger.info("login_with_toast_success", {
    email,
  });
  return { success: true, redirectTo: "/dashboard" };
}
