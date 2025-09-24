"use server";

import { createClient } from "@/lib/supabase/server";
import { type EmailOtpType } from "@supabase/supabase-js";

export interface ConfirmEmailResponse {
  success: boolean;
  message?: string;
  error?: string;
  redirectTo?: string;
  reason?: "ok" | "expired" | "invalid" | "other";
  email?: string;
}

export async function confirmEmail(
  tokenHash: string,
  type: EmailOtpType,
  subdomain: string
): Promise<ConfirmEmailResponse> {
  try {
    const supabase = await createClient();

    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });

    if (error) {
      // Try to get user email from claims to pre-fill resend form
      let userEmail = "";
      try {
        const { data: claimsData } = await supabase.auth.getClaims();
        userEmail = (claimsData as any)?.claims?.email || "";
      } catch {
        // Ignore - no email to pre-fill
      }

      if (error.message.includes("expired")) {
        return {
          success: false,
          reason: "expired",
          error: "Verification link has expired. Please request a new one.",
          redirectTo: `/auth/resend-verification?error=expired${userEmail ? `&email=${encodeURIComponent(userEmail)}` : ""}`,
          email: userEmail,
        };
      }
      if (error.message.includes("invalid")) {
        return {
          success: false,
          reason: "invalid",
          error: "Verification link is invalid. Please request a new one.",
          redirectTo: `/auth/resend-verification?error=invalid${userEmail ? `&email=${encodeURIComponent(userEmail)}` : ""}`,
          email: userEmail,
        };
      }
      return {
        success: false,
        reason: "other",
        error: error.message,
        redirectTo: `/auth/error?error=${encodeURIComponent(error.message)}`,
        email: userEmail,
      };
    }

    // After verification, attempt to create organization using user metadata
    try {
      let attempts = 0;
      while (attempts < 3) {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session?.user) {
          // Get organization data from user metadata
          const userMeta = sessionData.session.user.user_metadata;
          const orgName = userMeta?.organization_name;
          const userSubdomain = userMeta?.subdomain;

          if (orgName && userSubdomain && userSubdomain === subdomain) {
            const { error: rpcError } = await supabase.rpc(
              "create_org_for_current_user",
              {
                p_company_name: orgName,
                p_subdomain: userSubdomain,
              }
            );

            if (rpcError) {
              console.warn(
                "Organization creation failed during confirmation:",
                rpcError
              );
              // Continue anyway - user can retry from dashboard
            }
          }
          break;
        }
        attempts++;
        await new Promise((r) => setTimeout(r, 300));
      }
    } catch (orgError) {
      console.warn(
        "Organization creation error during confirmation:",
        orgError
      );
      // Non-fatal: organization creation can be retried later from app UI
    }

    return {
      success: true,
      reason: "ok",
      message: "Email verified successfully! Please login with your details.",
      redirectTo: "/auth/login?verified=true",
    };
  } catch (error) {
    return {
      success: false,
      reason: "other",
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
      redirectTo: "/auth/error",
    };
  }
}
