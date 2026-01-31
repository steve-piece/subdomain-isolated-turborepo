// apps/protected/app/actions/auth/password.ts
"use server";

import * as Sentry from "@sentry/nextjs";
import { createClient } from "@workspace/supabase/server";
import { logSecurityEvent } from "@/app/actions/security/audit-log";
import { updateUserSecuritySettings } from "@/app/actions/security/user-security-settings";

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
  accessToken?: string,
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

    const now = new Date().toISOString();

    // Update user security settings state table
    await updateUserSecuritySettings({
      userId: user.id,
      passwordChangedAt: now,
    });

    // Log successful password change to audit log
    await logSecurityEvent({
      eventType: "password",
      eventAction: "password_changed",
      severity: "info",
      metadata: { method: accessToken ? "recovery" : "authenticated" },
      userId: user.id,
    });

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
