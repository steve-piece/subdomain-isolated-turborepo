"use server";

import { createClient } from "@workspace/supabase/server";
import { headers } from "next/headers";

// Event types for audit logging
export type AuditEventType =
  | "auth"
  | "password"
  | "mfa"
  | "session"
  | "email"
  | "account";

export type AuditEventAction =
  | "login_success"
  | "login_failed"
  | "logout"
  | "password_reset_requested"
  | "password_changed"
  | "mfa_enrolled"
  | "mfa_verified"
  | "mfa_unenrolled"
  | "magic_link_sent"
  | "magic_link_verified"
  | "email_verification_sent"
  | "email_verified"
  | "reauthentication_success"
  | "reauthentication_failed"
  | "account_created"
  | "profile_updated";

export type AuditSeverity = "info" | "warning" | "critical";

interface LogSecurityEventParams {
  eventType: AuditEventType;
  eventAction: AuditEventAction;
  severity?: AuditSeverity;
  metadata?: Record<string, unknown>;
  userId?: string;
  orgId?: string;
}

/**
 * Logs a security event to the audit log table.
 * This function should be called from server actions after security-related operations.
 */
export async function logSecurityEvent({
  eventType,
  eventAction,
  severity = "info",
  metadata = {},
  userId,
  orgId,
}: LogSecurityEventParams): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    // Get user info if not provided
    let finalUserId = userId;
    let finalOrgId = orgId;

    // Prefer the authenticated user object (most reliable in Server Actions),
    // then fall back to JWT claims.
    if (!finalUserId || !finalOrgId) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      finalUserId = finalUserId || user?.id;
    }

    if (!finalUserId || !finalOrgId) {
      const { data: claimsData } = await supabase.auth.getClaims();
      const jwtClaims = claimsData?.claims as Record<string, unknown> | undefined;

      // Prefer custom claim if present, otherwise use standard JWT "sub"
      finalUserId =
        finalUserId || ((jwtClaims?.user_id ?? jwtClaims?.sub) as string | undefined);
      finalOrgId = finalOrgId || (jwtClaims?.org_id as string | undefined);
    }

    // Get request headers for IP and user agent
    const headersList = await headers();
    const ipAddress =
      headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      headersList.get("x-real-ip") ||
      "unknown";
    const userAgent = headersList.get("user-agent") || "unknown";

    // Insert audit log entry
    const { error } = await supabase.from("security_audit_log").insert({
      user_id: finalUserId,
      org_id: finalOrgId,
      event_type: eventType,
      event_action: eventAction,
      event_metadata: metadata,
      ip_address: ipAddress === "unknown" ? null : ipAddress,
      user_agent: userAgent,
      severity,
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error("Failed to log security event:", error);
      
      // Handle table not found error (42P01) - fail silently to avoid breaking flows
      if (error.code === "42P01" || error.message?.includes("does not exist")) {
        console.warn("security_audit_log table does not exist. Event not logged. Please run database migrations.");
        return { success: false, error: "Audit log table not initialized" };
      }
      
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error("Error logging security event:", err);
    return { success: false, error: "Failed to log security event" };
  }
}

/**
 * Fetches audit logs for the current user.
 */
export async function getAuditLogs(limit = 50, page = 1) {
  const supabase = await createClient();

  const { data: claimsData, error: authError } = await supabase.auth.getClaims();
  if (authError || !claimsData?.claims) {
    return { success: false, message: "Authentication required" };
  }

  const jwtClaims = claimsData.claims as Record<string, unknown>;
  let userId = (jwtClaims.user_id ?? jwtClaims.sub) as string | undefined;

  // Fallback: ask Supabase for the current user
  if (!userId) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userId = user?.id;
  }

  if (!userId) {
    return { success: false, message: "User ID not found" };
  }

  const offset = (page - 1) * limit;

  const { data, error, count } = await supabase
    .from("security_audit_log")
    .select("*", { count: "exact" })
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("Error fetching audit logs:", error);
    
    // Handle table not found error (42P01)
    if (error.code === "42P01" || error.message?.includes("does not exist")) {
      console.warn("security_audit_log table does not exist. Please run database migrations.");
      return {
        success: true,
        data: [],
        message: "Audit log table not yet initialized",
        pagination: { page, pageSize: limit, total: 0 },
      };
    }
    
    return { success: false, message: `Failed to fetch audit logs: ${error.message}` };
  }

  return {
    success: true,
    data: data || [],
    pagination: {
      page,
      pageSize: limit,
      total: count || 0,
    },
  };
}
