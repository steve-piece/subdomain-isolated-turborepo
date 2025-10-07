// apps/protected/app/actions/dashboard/get-dashboard-stats.ts
"use server";

import { createClient } from "@/lib/supabase/server";

export interface DashboardStats {
  teamMemberCount: number;
  activeProjects: number;
  storageUsed: number;
  apiCalls: number;
}

/**
 * Get dashboard statistics for an organization
 */
export async function getDashboardStats(
  orgId: string,
): Promise<DashboardStats> {
  const supabase = await createClient();

  // Get team member count from user_profiles
  const { count: teamMemberCount } = await supabase
    .from("user_profiles")
    .select("*", { count: "exact", head: true })
    .eq("org_id", orgId);

  // Get active projects count
  const { count: projectsCount } = await supabase
    .from("projects")
    .select("*", { count: "exact", head: true })
    .eq("org_id", orgId)
    .eq("status", "active");

  const activeProjects = projectsCount || 0;

  // Get storage used (placeholder for now)
  // TODO: Replace with actual storage calculation
  const storageUsed = 0;

  // Get API calls (placeholder for now)
  // TODO: Replace with actual API call tracking
  const apiCalls = 0;

  return {
    teamMemberCount: teamMemberCount || 0,
    activeProjects,
    storageUsed,
    apiCalls,
  };
}
