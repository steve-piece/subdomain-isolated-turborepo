// apps/protected/app/s/[subdomain]/(protected)/(dashboard)/dashboard/page.tsx
/**
 * ✅ PHASE 1.3: Simplified dashboard page
 * - No duplicate auth checks (layout handles it)
 * - Caching enabled (revalidate = 60)
 * - Minimal page, logic in wrapper component
 */
import { DashboardWrapper } from "@/components/dashboard/dashboard-wrapper";
import { getRecentActivity } from "@/app/actions/activity/get-recent-activity";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";

// ✅ Enable caching - auth is handled by layout
export const revalidate = 60;

// ✅ Generate dynamic page title
export async function generateMetadata({
  params,
}: {
  params: Promise<{ subdomain: string }>;
}): Promise<Metadata> {
  const { subdomain } = await params;
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();

  const companyName = claims?.claims.company_name || subdomain;
  // Read APP_NAME from environment - ensure it's defined in .env.local
  const appName =
    process.env.NEXT_PUBLIC_APP_NAME || process.env.APP_NAME || "Your App Name";

  return {
    title: `${companyName} Dashboard | ${appName}`,
  };
}

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ subdomain: string }>;
}) {
  const { subdomain } = await params;

  // ✅ Fetch activity data and user profile in server component
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const orgId = claims?.claims.org_id;

  const activities = orgId ? await getRecentActivity(orgId, 5) : [];

  // ✅ Fetch user profile data (cached for 60 seconds via revalidate)
  const { data: profileData } = await supabase.rpc("get_user_profile_data", {
    p_user_id: user?.id,
  });

  const profile = Array.isArray(profileData) ? profileData[0] : profileData;

  // ✅ Fetch organization team settings (cached for 60 seconds via revalidate)
  const { data: teamSettingsData } = await supabase.rpc(
    "get_org_team_settings",
    {
      p_org_id: orgId,
    }
  );

  const teamSettings = Array.isArray(teamSettingsData)
    ? teamSettingsData[0]
    : teamSettingsData;

  return (
    <DashboardWrapper
      subdomain={subdomain}
      activities={activities}
      userFullName={profile?.full_name}
      allowMemberInvites={teamSettings?.allow_member_invites}
    />
  );
}
