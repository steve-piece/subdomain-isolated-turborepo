// apps/protected/app/actions/auth/login.ts
"use server";

import * as Sentry from "@sentry/nextjs";
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
 */
export async function loginWithToast(
  email: string,
  password: string,
): Promise<LoginWithToastResponse> {
  const supabase = await createClient();
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
