"use server";

import { createClient } from "@/lib/supabase/server";

export interface LoginWithToastResponse {
  success: boolean;
  message?: string;
  redirectTo?: string;
}

export async function loginWithToast(
  email: string,
  password: string
): Promise<LoginWithToastResponse> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { success: false, message: error.message };
  }

  return { success: true, redirectTo: "/dashboard" };
}
