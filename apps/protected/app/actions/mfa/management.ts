// apps/protected/app/actions/mfa/management.ts
"use server";

import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/server";

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
  factorId: string
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
 * Get user's MFA factors
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

    return {
      success: true,
      factors: data.totp.map((factor) => ({
        id: factor.id,
        friendlyName: factor.friendly_name || "Email MFA",
        factorType: factor.factor_type,
        status: factor.status,
      })),
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
