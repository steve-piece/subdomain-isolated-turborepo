// apps/protected/app/s/[subdomain]/(protected)/(user-settings)/settings/profile/page.tsx
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { ProfileView } from "@/components/profile-view";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ subdomain: string }>;
}) {
  noStore();
  const { subdomain } = await params;
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/auth/login?reason=no_session");
  }

  const { data: claims, error: claimsError } = await supabase.auth.getClaims();

  if (claimsError || !claims || claims.claims.subdomain !== subdomain) {
    redirect("/auth/login?error=unauthorized");
  }

  const userName = claims.claims.full_name || "";
  const userEmail = user.email || "";
  const organizationName = claims.claims.company_name || subdomain;

  // Fetch user profile data from database
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("full_name, bio, timezone")
    .eq("user_id", user.id)
    .single();

  return (
    <ProfileView
      initialData={{
        fullName: profile?.full_name || userName,
        bio: profile?.bio || "",
        email: userEmail,
        timezone: profile?.timezone || "UTC",
        organizationName,
        subdomain,
        role: claims.claims.user_role || "member",
        userId: user.id,
      }}
    />
  );
}
