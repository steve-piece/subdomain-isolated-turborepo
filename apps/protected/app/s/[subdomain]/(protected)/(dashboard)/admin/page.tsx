// apps/protected/app/s/[subdomain]/(protected)/(dashboard)/admin/page.tsx
/**
 * ✅ PHASE 1.4: Simplified admin page
 * - Role check using getClaims() (no RequireTenantAuth wrapper)
 * - Caching enabled (revalidate = 60)
 * - Data fetching in page, UI in wrapper
 */
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import Link from "next/link";
import { InviteUserDialog } from "@/components/shared/invite-user-dialog";
import { ForceLogoutControls } from "@/components/admin/force-logout-controls";
import {
  Wrench,
  Users,
  Settings,
  CreditCard,
  Shield,
  Plug,
  BarChart3,
  Zap,
  Mail,
  Download,
  ClipboardList,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";

type SystemStatus = "operational" | "degraded" | "down";

interface SystemHealth {
  api: { status: SystemStatus; responseTime?: number };
  database: { status: SystemStatus; responseTime?: number };
  storage: { status: SystemStatus };
  lastBackup: string | null;
}

async function getSystemHealth(): Promise<SystemHealth> {
  const supabase = await createClient();

  // Check database health
  const dbStart = Date.now();
  let databaseStatus: SystemStatus = "operational";
  let dbResponseTime: number | undefined;

  try {
    await supabase.from("organizations").select("id").limit(1).single();
    dbResponseTime = Date.now() - dbStart;
    databaseStatus = dbResponseTime > 1000 ? "degraded" : "operational";
  } catch (error) {
    databaseStatus = "down";
    console.error("Database health check failed:", error);
  }

  // Check Supabase API health (via auth service)
  const apiStart = Date.now();
  let apiStatus: SystemStatus = "operational";
  let apiResponseTime: number | undefined;

  try {
    await supabase.auth.getSession();
    apiResponseTime = Date.now() - apiStart;
    apiStatus = apiResponseTime > 2000 ? "degraded" : "operational";
  } catch (error) {
    apiStatus = "down";
    console.error("API health check failed:", error);
  }

  // Check storage health
  let storageStatus: SystemStatus = "operational";
  try {
    const { data, error } = await supabase.storage.listBuckets();
    if (error) throw error;
    storageStatus = data ? "operational" : "degraded";
  } catch (error) {
    storageStatus = "down";
    console.error("Storage health check failed:", error);
  }

  // Get last backup info (if you have a backups table or use RLS audit)
  let lastBackup: string | null = null;
  try {
    // Check for most recent audit log entry as proxy for system activity
    const { data } = await supabase
      .from("security_audit_log")
      .select("created_at")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    lastBackup = data?.created_at || null;
  } catch {
    // Table might not exist or no data
    lastBackup = null;
  }

  return {
    api: { status: apiStatus, responseTime: apiResponseTime },
    database: { status: databaseStatus, responseTime: dbResponseTime },
    storage: { status: storageStatus },
    lastBackup,
  };
}

async function getAdminDashboardData() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: claims } = await supabase.auth.getClaims();
  const orgId = claims?.claims?.org_id;

  if (!orgId) return null;

  // Fetch team member count
  const { count: teamMemberCount } = await supabase
    .from("user_profiles")
    .select("*", { count: "exact", head: true })
    .eq("org_id", orgId);

  // Fetch subscription info
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select(
      `
      subscription_tiers (
        name,
        max_team_members,
        max_projects
      )
    `
    )
    .eq("org_id", orgId)
    .single();

  const subscriptionTiers = subscription?.subscription_tiers as unknown as {
    name: string;
    max_team_members: number | null;
    max_projects: number | null;
  } | null;

  // Integrations count - returns 0 if table doesn't exist yet
  let integrationCount = 0;
  try {
    const { count } = await supabase
      .from("integrations")
      .select("*", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("status", "active");
    integrationCount = count || 0;
  } catch {
    // Table doesn't exist yet, default to 0
    integrationCount = 0;
  }

  return {
    teamMemberCount: teamMemberCount || 0,
    subscriptionTier: subscriptionTiers?.name || "Free",
    maxTeamMembers: subscriptionTiers?.max_team_members,
    integrationCount,
  };
}

function getStatusColor(status: SystemStatus): string {
  switch (status) {
    case "operational":
      return "bg-green-100 text-green-700";
    case "degraded":
      return "bg-yellow-100 text-yellow-700";
    case "down":
      return "bg-red-100 text-red-700";
  }
}

function getStatusIcon(status: SystemStatus): string {
  switch (status) {
    case "operational":
      return "✓";
    case "degraded":
      return "⚠";
    case "down":
      return "✗";
  }
}

function getStatusLabel(status: SystemStatus): string {
  switch (status) {
    case "operational":
      return "Operational";
    case "degraded":
      return "Degraded";
    case "down":
      return "Down";
  }
}

function formatRelativeTime(timestamp: string | null): string {
  if (!timestamp) return "Unknown";

  const now = new Date();
  const time = new Date(timestamp);
  const diffMs = now.getTime() - time.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
}

// ✅ Enable caching - admin page can be cached for 60 seconds
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
    title: `${companyName} Admin | ${appName}`,
  };
}

export default async function AdminPage({
  params,
}: {
  params: Promise<{ subdomain: string }>;
}) {
  const { subdomain } = await params;
  const supabase = await createClient();

  // ✅ Simple role check using getClaims (no wrapper needed)
  const { data: claims } = await supabase.auth.getClaims();
  const userRole = claims?.claims.user_role || "member";

  if (!["owner", "admin", "superadmin"].includes(userRole)) {
    redirect("/dashboard?error=insufficient_permissions");
  }

  // Fetch admin data
  const [dashboardData, systemHealth] = await Promise.all([
    getAdminDashboardData(),
    getSystemHealth(),
  ]);

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-background to-muted/20">
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Advanced settings and administration tools for {subdomain}
          </p>
        </div>

        <div className="mx-auto max-w-6xl space-y-6">
          {/* Admin Overview */}
          <Card className="bg-gradient-to-r from-card to-card/50 shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Wrench className="h-6 w-6" />
                Organization Management
              </CardTitle>
              <CardDescription className="text-base">
                Advanced settings and administration tools for {subdomain}
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Management Cards */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Link href="/org-settings/team">
              <Card className="hover:shadow-md transition-shadow cursor-pointer group">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    User Management
                  </CardTitle>
                  <Users className="h-6 w-6 text-muted-foreground group-hover:scale-110 transition-transform" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {dashboardData?.teamMemberCount ?? "-"}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {dashboardData?.maxTeamMembers
                      ? `of ${dashboardData.maxTeamMembers} members`
                      : "Manage team members & roles"}
                  </p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/org-settings">
              <Card className="hover:shadow-md transition-shadow cursor-pointer group">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Organization Settings
                  </CardTitle>
                  <Settings className="h-6 w-6 text-muted-foreground group-hover:scale-110 transition-transform" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">Active</div>
                  <p className="text-xs text-muted-foreground">
                    Configure organization preferences
                  </p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/org-settings/billing">
              <Card className="hover:shadow-md transition-shadow cursor-pointer group">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Billing & Plans
                  </CardTitle>
                  <CreditCard className="h-6 w-6 text-muted-foreground group-hover:scale-110 transition-transform" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold capitalize">
                    {dashboardData?.subscriptionTier ?? "Free"}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Manage subscription & billing
                  </p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/security">
              <Card className="hover:shadow-md transition-shadow cursor-pointer group">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Security
                  </CardTitle>
                  <Shield className="h-6 w-6 text-muted-foreground group-hover:scale-110 transition-transform" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold flex items-center gap-2">
                    <CheckCircle2 className="h-6 w-6 text-green-600" />
                    Secure
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Security settings & audit logs
                  </p>
                </CardContent>
              </Card>
            </Link>

            <Card className="hover:shadow-md transition-shadow group opacity-60">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Integrations
                </CardTitle>
                <Plug className="h-6 w-6 text-muted-foreground group-hover:scale-110 transition-transform" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {dashboardData?.integrationCount ?? 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Third-party integrations
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow group opacity-60">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Analytics</CardTitle>
                <BarChart3 className="h-6 w-6 text-muted-foreground group-hover:scale-110 transition-transform" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">Coming Soon</div>
                <p className="text-xs text-muted-foreground">
                  Usage statistics & reports
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Force Logout Controls */}
          <ForceLogoutControls />

          <div className="grid gap-6 md:grid-cols-2">
            {/* Quick Admin Actions */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Quick Admin Actions
                </CardTitle>
                <CardDescription>Common administrative tasks</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <InviteUserDialog subdomain={subdomain} />
                <Button
                  variant="outline"
                  className="w-full justify-start opacity-60"
                  size="lg"
                  disabled
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Send Team Notification
                  <span className="ml-auto text-xs text-muted-foreground">
                    Coming Soon
                  </span>
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start opacity-60"
                  size="lg"
                  disabled
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export Organization Data
                  <span className="ml-auto text-xs text-muted-foreground">
                    Coming Soon
                  </span>
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start opacity-60"
                  size="lg"
                  disabled
                >
                  <ClipboardList className="h-4 w-4 mr-2" />
                  Generate Usage Report
                  <span className="ml-auto text-xs text-muted-foreground">
                    Coming Soon
                  </span>
                </Button>
              </CardContent>
            </Card>

            {/* System Status */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {systemHealth.api.status === "operational" &&
                  systemHealth.database.status === "operational" &&
                  systemHealth.storage.status === "operational" ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : systemHealth.api.status === "down" ||
                    systemHealth.database.status === "down" ||
                    systemHealth.storage.status === "down" ? (
                    <XCircle className="h-5 w-5 text-red-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-yellow-600" />
                  )}
                  System Status
                </CardTitle>
                <CardDescription>
                  Current system health and alerts
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">API Status</span>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${getStatusColor(
                        systemHealth.api.status
                      )}`}
                    >
                      {getStatusIcon(systemHealth.api.status)}{" "}
                      {getStatusLabel(systemHealth.api.status)}
                    </span>
                    {systemHealth.api.responseTime && (
                      <span className="text-xs text-muted-foreground">
                        {systemHealth.api.responseTime}ms
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Database</span>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${getStatusColor(
                        systemHealth.database.status
                      )}`}
                    >
                      {getStatusIcon(systemHealth.database.status)}{" "}
                      {getStatusLabel(systemHealth.database.status)}
                    </span>
                    {systemHealth.database.responseTime && (
                      <span className="text-xs text-muted-foreground">
                        {systemHealth.database.responseTime}ms
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Storage</span>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${getStatusColor(
                      systemHealth.storage.status
                    )}`}
                  >
                    {getStatusIcon(systemHealth.storage.status)}{" "}
                    {getStatusLabel(systemHealth.storage.status)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Last Activity</span>
                  <span className="text-xs text-muted-foreground">
                    {formatRelativeTime(systemHealth.lastBackup)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
