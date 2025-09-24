"use server";

import { createClient } from "@/lib/supabase/server";

export interface UpdatePasswordResponse {
  success: boolean;
  message: string;
  error?: string;
}

export async function updatePassword(
  password: string,
  subdomain: string
): Promise<UpdatePasswordResponse> {
  try {
    const supabase = await createClient();

    const { error } = await supabase.auth.updateUser({
      password: password,
    });

    if (error) {
      console.error("Password update error:", error);
      return { success: false, message: error.message };
    }

    return {
      success: true,
      message:
        "Password updated successfully! Please login with your new password.",
    };
  } catch (error) {
    console.error("Update password error:", error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}
