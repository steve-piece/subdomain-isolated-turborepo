import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * If using Fluid compute: Don't put this client in a global variable. Always create a new client within each
 * function when using it.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
}

/**
 * Custom getClaims method that extends Supabase auth with tenant information
 */
export async function getClaims(
  supabase: ReturnType<typeof createServerClient>
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
