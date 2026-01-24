// apps/protected/app/actions/profile/user.ts
"use server";

import * as Sentry from "@sentry/nextjs";
import { createClient } from "@workspace/supabase/server";

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

  // Sync full_name to auth.users metadata for custom claims
  if (data.full_name) {
    const { error: authUpdateError } = await supabase.auth.updateUser({
      data: { full_name: data.full_name },
    });

    if (authUpdateError) {
      // Log error but don't fail the request since user_profiles was updated
      Sentry.withScope((scope) => {
        scope.setTag("action", "update_profile_auth_sync");
        scope.setUser({ id: user.id, email: user.email });
        scope.setContext("auth_sync", {
          message: authUpdateError.message,
        });
        Sentry.captureException(authUpdateError);
      });
    }
  }

  return { success: true, message: "Profile updated successfully" };
}
