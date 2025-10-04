// apps/protected/app/actions/mfa/verification.ts
"use server";

import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/server";

export interface ChallengeMFAResponse {
  success: boolean;
  message: string;
  challengeId?: string;
}

export interface VerifyMFAResponse {
  success: boolean;
  message: string;
}

/**
 * Challenge MFA - Send verification code to user's email
 */
export async function challengeMFA(
  factorId: string,
): Promise<ChallengeMFAResponse> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase.auth.mfa.challenge({
      factorId,
    });

    if (error) {
      Sentry.logger.error("mfa_challenge_error", {
        message: error.message,
        factorId,
      });
      return { success: false, message: error.message };
    }

    console.log("✅ MFA challenge sent:", {
      challengeId: data.id,
      factorId,
    });

    return {
      success: true,
      message: "Verification code sent",
      challengeId: data.id,
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
 * Verify MFA code during login
 */
export async function verifyMFA(
  factorId: string,
  challengeId: string,
  code: string,
): Promise<VerifyMFAResponse> {
  try {
    const supabase = await createClient();

    const { error } = await supabase.auth.mfa.verify({
      factorId,
      challengeId,
      code,
    });

    if (error) {
      Sentry.logger.error("mfa_verify_error", {
        message: error.message,
        factorId,
        challengeId,
      });
      return { success: false, message: error.message };
    }

    console.log("✅ MFA verified successfully:", {
      factorId,
      challengeId,
    });

    return { success: true, message: "Verification successful" };
  } catch (error) {
    Sentry.captureException(error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}
