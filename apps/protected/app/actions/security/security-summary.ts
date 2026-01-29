// apps/protected/app/actions/security/security-summary.ts
"use server";

import { createClient } from "@workspace/supabase/server";
import { getUserSecuritySettings } from "./user-security-settings";

export interface SecuritySummary {
  lastPasswordChange: string | null;
  mfaEnabled: boolean;
  mfaEnrolledAt: string | null;
  recentEventsCount: number;
  criticalAlertsCount: number;
  lastLoginDate: string | null;
  totalSecurityEvents: number;
}

export interface SecuritySummaryResponse {
  success: boolean;
  data?: SecuritySummary;
  message?: string;
}

/**
 * Gets a comprehensive security summary for the current user.
 * Reads current state from user_security_settings (efficient) and 
 * event counts from security_audit_log (historical).
 */
export async function getUserSecuritySummary(): Promise<SecuritySummaryResponse> {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, message: "Authentication required" };
    }

    const userId = user.id;

    // Get current security settings state (efficient - single row query)
    const settingsResult = await getUserSecuritySettings(userId);
    const settings = settingsResult.success ? settingsResult.data : null;

    // Get last login date
    const { data: lastLoginLog } = await supabase
      .from("security_audit_log")
      .select("created_at")
      .eq("user_id", userId)
      .eq("event_type", "auth")
      .eq("event_action", "login_success")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    // Get recent events count (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { count: recentEventsCount } = await supabase
      .from("security_audit_log")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", sevenDaysAgo.toISOString());

    // Get critical alerts count (all time)
    const { count: criticalAlertsCount } = await supabase
      .from("security_audit_log")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("severity", "critical");

    // Get total security events count
    const { count: totalSecurityEvents } = await supabase
      .from("security_audit_log")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    return {
      success: true,
      data: {
        // Read from user_security_settings state table (fast)
        lastPasswordChange: settings?.password_changed_at || null,
        mfaEnabled: settings?.mfa_enabled || false,
        mfaEnrolledAt: settings?.mfa_enrolled_at || null,
        // Read event counts from audit log (historical)
        recentEventsCount: recentEventsCount || 0,
        criticalAlertsCount: criticalAlertsCount || 0,
        lastLoginDate: lastLoginLog?.created_at || null,
        totalSecurityEvents: totalSecurityEvents || 0,
      },
    };
  } catch (error) {
    console.error("Error fetching security summary:", error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to fetch security summary",
    };
  }
}
