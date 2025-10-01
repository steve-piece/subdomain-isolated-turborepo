// apps/protected/app/actions/profile/notifications.ts
"use server";

import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/server";

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

  let error: { message: string; details?: string } | null = null;

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
        message: error?.message,
        details: error?.details,
      });
      Sentry.captureException(error);
    });
    return {
      success: false,
      message: "Failed to update notification preferences",
    };
  }

  return {
    success: true,
    message: "Notification preferences updated successfully",
  };
}
