// apps/protected/app/actions/auth/session.ts
"use server";

import * as Sentry from "@sentry/nextjs";
import { createClient } from "@workspace/supabase/server";
import { logSecurityEvent } from "@/app/actions/security/audit-log";

/**
 * Sign out the current user
 */
export async function signOut(): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Log logout before signing out (while we still have user context)
    await logSecurityEvent({
      eventType: "session",
      eventAction: "logout",
      severity: "info",
      userId: user?.id,
    });

    const { error } = await supabase.auth.signOut();

    if (error) {
      Sentry.captureException(error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    Sentry.captureException(error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to sign out",
    };
  }
}
