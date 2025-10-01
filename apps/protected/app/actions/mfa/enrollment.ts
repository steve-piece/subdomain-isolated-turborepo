// apps/protected/app/actions/mfa/enrollment.ts
"use server";

import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/server";

export interface EnrollMFAResponse {
  success: boolean;
  message: string;
  factorId?: string;
}

export interface VerifyMFAEnrollmentResponse {
  success: boolean;
  message: string;
}

/**
 * Enroll user in email-based MFA
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

    // Enroll in email MFA factor
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: `Email MFA for ${user.email}`,
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
    });

    return {
      success: true,
      message: "MFA enrollment started",
      factorId: data.id,
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
  code: string
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
