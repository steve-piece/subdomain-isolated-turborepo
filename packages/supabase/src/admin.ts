import "server-only";

import { createClient } from "@supabase/supabase-js";

/**
 * Creates a Supabase client with admin/service role privileges.
 * This client bypasses Row Level Security (RLS) and can perform admin operations.
 * Use cases:
 * - Inviting users (auth.admin.inviteUserByEmail)
 * - Managing users (auth.admin.deleteUser, etc.)
 * - Bypassing RLS for admin operations
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !supabaseSecretKey) {
    throw new Error(
      "Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL and/or SUPABASE_SECRET_KEY",
    );
  }

  return createClient(supabaseUrl, supabaseSecretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
