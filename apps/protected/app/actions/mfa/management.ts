// apps/protected/app/actions/mfa/management.ts
"use server";

import * as Sentry from "@sentry/nextjs";
import { createClient } from "@workspace/supabase/server";
import { logSecurityEvent } from "@/app/actions/security/audit-log";
import { updateUserSecuritySettings } from "@/app/actions/security/user-security-settings";

export interface UnenrollMFAResponse {
  success: boolean;
  message: string;
}

export interface GetMFAFactorsResponse {
  success: boolean;
  message?: string;
  factors?: Array<{
    id: string;
    friendlyName: string;
    factorType: string;
    status: string;
  }>;
}

/**
 * Unenroll from MFA - Disable 2FA
 */
export async function unenrollMFA(
  factorId: string,
): Promise<UnenrollMFAResponse> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, message: "Authentication required" };
    }

    const { error } = await supabase.auth.mfa.unenroll({
      factorId,
    });

    if (error) {
      Sentry.logger.error("mfa_unenroll_error", {
        message: error.message,
        userId: user.id,
        factorId,
      });
      return { success: false, message: error.message };
    }

    console.log("✅ MFA unenrolled:", {
      factorId,
      userId: user.id,
    });

    // Update user security settings state table
    await updateUserSecuritySettings({
      userId: user.id,
      mfaEnabled: false,
      mfaFactorId: null,
      mfaEnrolledAt: null,
    });

    // Log MFA unenrollment to audit log
    await logSecurityEvent({
      eventType: "mfa",
      eventAction: "mfa_unenrolled",
      severity: "warning",
      metadata: { factorId },
      userId: user.id,
    });

    return { success: true, message: "2FA disabled successfully" };
  } catch (error) {
    Sentry.captureException(error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

/**
 * Get user's MFA factors (TOTP only - FREE option)
 *
 * Note: This only lists TOTP factors (authenticator apps) which are free.
 * Phone/SMS factors require a paid Supabase plan and are not supported.
 */
export async function getMFAFactors(): Promise<GetMFAFactorsResponse> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, message: "Authentication required" };
    }

    const { data, error } = await supabase.auth.mfa.listFactors();

    if (error) {
      Sentry.logger.error("mfa_list_factors_error", {
        message: error.message,
        userId: user.id,
      });
      return { success: false, message: error.message };
    }

    // Map TOTP factors (authenticator apps) - FREE
    // Ensure we only return plain serializable data
    const factors = data.totp.map((factor) => ({
      id: String(factor.id),
      friendlyName: String(factor.friendly_name || "Authenticator App"),
      factorType: String(factor.factor_type),
      status: String(factor.status),
    }));

    return {
      success: true,
      factors,
    };
  } catch (error) {
    Sentry.captureException(error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}
