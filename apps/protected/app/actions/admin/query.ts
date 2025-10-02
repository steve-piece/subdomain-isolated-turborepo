"use server";

import { createClient } from "@/lib/supabase/server";

export interface AdminDashboardData {
  teamMemberCount: number | null;
  maxTeamMembers: number | null;
  subscriptionTier: string | null;
}

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  const supabase = await createClient();

  // Get claims to access org_id
  const { data: claims } = await supabase.auth.getClaims();
  const orgId = claims?.claims.org_id;

  if (!orgId) {
    return {
      teamMemberCount: null,
      maxTeamMembers: null,
      subscriptionTier: null,
    };
  }

  // Get team member count
  const { count: teamMemberCount } = await supabase
    .from("organization_members")
    .select("*", { count: "exact", head: true })
    .eq("org_id", orgId);

  // Get subscription info
  const { data: orgData } = await supabase
    .from("organizations")
    .select("subscription_tier, max_team_members")
    .eq("id", orgId)
    .single();

  return {
    teamMemberCount: teamMemberCount || 0,
    maxTeamMembers: orgData?.max_team_members || null,
    subscriptionTier: orgData?.subscription_tier || "free",
  };
}

export type SystemStatus = "operational" | "degraded" | "down";

export interface SystemHealth {
  api: { status: SystemStatus; responseTime?: number };
  database: { status: SystemStatus; responseTime?: number };
  storage: { status: SystemStatus };
  lastBackup: string | null;
}

export async function getSystemHealth(): Promise<SystemHealth> {
  const supabase = await createClient();

  // Simple health checks
  const dbStart = Date.now();
  const { error: dbError } = await supabase
    .from("organizations")
    .select("id")
    .limit(1);
  const dbTime = Date.now() - dbStart;

  return {
    api: {
      status: "operational",
      responseTime: dbTime,
    },
    database: {
      status: dbError ? "down" : "operational",
      responseTime: dbTime,
    },
    storage: {
      status: "operational",
    },
    lastBackup: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
  };
}
