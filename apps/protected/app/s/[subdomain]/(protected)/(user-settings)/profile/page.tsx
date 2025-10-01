// apps/protected/app/s/[subdomain]/(protected)/(user-settings)/profile/page.tsx
/**
 * ✅ PHASE 1.5a: Simplified profile page
 * - No duplicate auth checks (layout handles it)
 * - Caching enabled (revalidate = 120)
 */
import { createClient } from "@/lib/supabase/server";
import { ProfileView } from "@/components/profile/profile-view";

// ✅ Profile changes infrequently - cache for 2 minutes
export const revalidate = 120;

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ subdomain: string }>;
}) {
  const { subdomain } = await params;
  const supabase = await createClient();

  // Get current user from layout context
  const { data: claims } = await supabase.auth.getClaims();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Fetch user profile data from database
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("full_name, bio, timezone")
    .eq("user_id", user.id)
    .single();

  return (
    <ProfileView
      initialData={{
        fullName: profile?.full_name || claims?.claims.full_name || "",
        bio: profile?.bio || "",
        email: user.email || "",
        timezone: profile?.timezone || "UTC",
        organizationName: claims?.claims.company_name || subdomain,
        subdomain,
        role: claims?.claims.user_role || "member",
        userId: user.id,
      }}
    />
  );
}
