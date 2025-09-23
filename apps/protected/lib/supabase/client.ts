import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

/**
 * Custom getClaims method that extends Supabase auth with tenant information
 */
export async function getClaims(
  supabase: ReturnType<typeof createBrowserClient>
) {
  try {
    const { data: userData, error } = await supabase.auth.getUser();

    if (error || !userData.user) {
      return { data: null, error };
    }

    // Get user profile with tenant information
    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("org_id, user_role, subdomain")
      .eq("user_id", userData.user.id)
      .single();

    if (profileError) {
      console.error("Profile fetch error:", profileError);
      return { data: null, error: profileError };
    }

    // Return claims in the expected format
    return {
      data: {
        claims: {
          ...userData.user,
          subdomain: profile?.subdomain,
          user_role: profile?.user_role,
          org_id: profile?.org_id,
        },
      },
      error: null,
    };
  } catch (error) {
    console.error("getClaims error:", error);
    return { data: null, error };
  }
}
