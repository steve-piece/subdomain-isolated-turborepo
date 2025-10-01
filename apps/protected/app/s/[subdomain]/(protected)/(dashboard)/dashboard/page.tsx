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

// ✅ Enable caching - auth is handled by layout
export const revalidate = 60;

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ subdomain: string }>;
}) {
  const { subdomain } = await params;

  // ✅ Fetch activity data in server component
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const orgId = claims?.claims.org_id;

  const activities = orgId ? await getRecentActivity(orgId, 5) : [];

  return <DashboardWrapper subdomain={subdomain} activities={activities} />;
}
