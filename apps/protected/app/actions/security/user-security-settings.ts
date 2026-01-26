// apps/protected/app/actions/security/user-security-settings.ts
"use server";

import { createClient } from "@workspace/supabase/server";

/**
 * Updates or inserts user security settings.
 * This maintains the current state of a user's security configuration.
 */
export async function updateUserSecuritySettings(params: {
  userId: string;
  mfaEnabled?: boolean;
  mfaFactorId?: string | null;
  mfaEnrolledAt?: string | null;
  passwordChangedAt?: string | null;
  requirePasswordChange?: boolean;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    // Build the update object with only provided fields
    const updateData: Record<string, unknown> = {};
    
    if (params.mfaEnabled !== undefined) updateData.mfa_enabled = params.mfaEnabled;
    if (params.mfaFactorId !== undefined) updateData.mfa_factor_id = params.mfaFactorId;
    if (params.mfaEnrolledAt !== undefined) updateData.mfa_enrolled_at = params.mfaEnrolledAt;
    if (params.passwordChangedAt !== undefined) updateData.password_changed_at = params.passwordChangedAt;
    if (params.requirePasswordChange !== undefined) updateData.require_password_change = params.requirePasswordChange;

    // Upsert the security settings
    const { error } = await supabase
      .from("user_security_settings")
      .upsert(
        {
          user_id: params.userId,
          ...updateData,
        },
        {
          onConflict: "user_id",
        }
      );

    if (error) {
      console.error("Failed to update user security settings:", error);
      
      // Handle table not found error gracefully
      if (error.code === "42P01" || error.message?.includes("does not exist")) {
        console.warn("user_security_settings table does not exist. Please run database migrations.");
        return { success: false, error: "Security settings table not initialized" };
      }
      
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error("Error updating user security settings:", err);
    return { success: false, error: "Failed to update security settings" };
  }
}

/**
 * Gets the current security settings for a user.
 */
export async function getUserSecuritySettings(userId: string) {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("user_security_settings")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error) {
      // If no settings exist yet, return defaults
      if (error.code === "PGRST116") {
        return {
          success: true,
          data: {
            mfa_enabled: false,
            mfa_factor_id: null,
            mfa_enrolled_at: null,
            password_changed_at: null,
            require_password_change: false,
            login_notifications: true,
            unusual_activity_alerts: true,
            max_active_sessions: 5,
            session_timeout_minutes: 10080,
          },
        };
      }

      // Handle table not found error
      if (error.code === "42P01" || error.message?.includes("does not exist")) {
        console.warn("user_security_settings table does not exist.");
        return { success: false, error: "Security settings table not initialized" };
      }

      console.error("Error fetching user security settings:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err) {
    console.error("Error fetching user security settings:", err);
    return { success: false, error: "Failed to fetch security settings" };
  }
}
