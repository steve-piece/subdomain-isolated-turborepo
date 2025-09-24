"use server";

import { createClient } from "@/lib/supabase/server";
import { AuthApiError } from "@supabase/supabase-js";

export interface ResendVerificationResponse {
  success: boolean;
  message: string;
  error?: string;
}

export async function resendEmailVerification(
  email: string,
  password: string,
  subdomain: string
): Promise<ResendVerificationResponse> {
  const supabase = await createClient();

  // First, attempt to sign in to verify credentials
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    if (
      signInError instanceof AuthApiError &&
      signInError.message.includes("Email not confirmed")
    ) {
      // If email not confirmed, try to resend verification
      const { error: resendError } = await supabase.auth.resend({
        type: "signup",
        email,
      });

      if (resendError) {
        return { success: false, message: resendError.message };
      }
      return {
        success: true,
        message:
          "Verification email resent successfully! Please check your inbox.",
      };
    }
    return { success: false, message: signInError.message };
  }

  return {
    success: false,
    message: "Email is already verified or login was successful.",
  };
}
