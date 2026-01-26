// apps/protected/app/actions/mfa/enrollment.ts
"use server";

import * as Sentry from "@sentry/nextjs";
import { createClient } from "@workspace/supabase/server";
import { logSecurityEvent } from "@/app/actions/security/audit-log";

export interface EnrollMFAResponse {
  success: boolean;
  message: string;
  factorId?: string;
  qrCode?: string;
  secret?: string;
}

export interface VerifyMFAEnrollmentResponse {
  success: boolean;
  message: string;
}

/**
 * Enroll user in TOTP (Authenticator App) MFA - FREE OPTION
 *
 * Note: This uses TOTP which is free on all Supabase plans.
 * SMS/Phone MFA requires a paid plan.
 */
export async function enrollMFA(): Promise<EnrollMFAResponse> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, message: "Authentication required" };
    }

    // Enroll in TOTP MFA factor (FREE - works with authenticator apps)
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: `Authenticator for ${user.email}`,
    });

    if (error) {
      Sentry.logger.error("mfa_enroll_error", {
        message: error.message,
        userId: user.id,
      });
      return { success: false, message: error.message };
    }

    console.log("✅ MFA enrollment started:", {
      factorId: data.id,
      userId: user.id,
      type: "totp",
    });

    return {
      success: true,
      message: "MFA enrollment started",
      factorId: data.id,
      qrCode: data.totp.qr_code,
      secret: data.totp.secret,
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

/**
 * Verify MFA enrollment with code
 */
export async function verifyMFAEnrollment(
  factorId: string,
  code: string,
): Promise<VerifyMFAEnrollmentResponse> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, message: "Authentication required" };
    }

    const { error } = await supabase.auth.mfa.challengeAndVerify({
      factorId,
      code,
    });

    if (error) {
      Sentry.logger.error("mfa_verify_enrollment_error", {
        message: error.message,
        userId: user.id,
        factorId,
      });
      return { success: false, message: error.message };
    }

    console.log("✅ MFA enrollment verified:", {
      factorId,
      userId: user.id,
    });

    // Log MFA enrollment
    await logSecurityEvent({
      eventType: "mfa",
      eventAction: "mfa_enrolled",
      severity: "info",
      metadata: { factorId, method: "totp" },
      userId: user.id,
    });

    return { success: true, message: "MFA enabled successfully" };
  } catch (error) {
    Sentry.captureException(error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}
