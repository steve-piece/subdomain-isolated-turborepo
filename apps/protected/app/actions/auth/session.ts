// apps/protected/app/actions/auth/session.ts
"use server";

import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/server";

/**
 * Sign out the current user
 */
export async function signOut(): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
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
