// apps/protected/components/organization-dashboard.tsx
// Renders the tenant landing dashboard with quick actions, stats, and sign-out controls.
"use client";

import { LogoutButton } from "@/components/shared/logout-button";
import { useTenantClaims } from "@/lib/contexts/tenant-claims-context";
import { Button } from "@workspace/ui/components/button";
import { useToast } from "@workspace/ui/components/toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import Link from "next/link";

interface OrganizationDashboardProps {
  /**
   * Organization display name (prefer claims.company_name, fallback to subdomain)
   */
  organizationName: string;
  /**
   * Tenant subdomain used for clean URLs and sign-out context
   */
  subdomain: string;
  userEmail: string;
}

export function OrganizationDashboard({
  organizationName,
  subdomain,
  userEmail,
}: OrganizationDashboardProps) {
  const claims = useTenantClaims();
  const { addToast } = useToast();

  // Check if user has admin privileges
  const hasAdminAccess = ["owner", "admin", "superadmin"].includes(
    claims.user_role,
  );

  const handleRestrictedAction = (actionName: string) => {
    if (!hasAdminAccess) {
      addToast({
        title: "Access Denied",
        description: `Only owners and admins can ${actionName}. Your current role: ${claims.user_role}`,
        variant: "warning",
        duration: 5000,
      });
    }
  };

  return (
    <div className="flex h-screen w-full flex-col">
      <header className="border-b bg-gradient-to-r from-background to-muted/20 px-6 py-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              {organizationName}
            </h1>
            <p className="text-muted-foreground mt-1 flex items-center">
              👋 Welcome back,{" "}
              <span className="font-medium ml-1">{userEmail}</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <LogoutButton subdomain={subdomain} />
          </div>
        </div>
      </header>

      <main className="flex-1 p-6 bg-gradient-to-br from-background to-muted/30">
        <div className="mx-auto max-w-6xl space-y-6">
          {/* Welcome Card */}
          <Card className="bg-gradient-to-r from-card to-card/50 shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2">
                🏢 {organizationName} Dashboard
              </CardTitle>
              <CardDescription className="text-base">
                Manage your organization, team, and projects all in one place.
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Dashboard Stats */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Team Members
                </CardTitle>
                <div className="text-2xl">👥</div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
                <p className="text-xs text-muted-foreground">No members yet</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Active Projects
                </CardTitle>
                <div className="text-2xl">📋</div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
                <p className="text-xs text-muted-foreground">
                  Start your first project
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Quick Actions */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  ⚡ Quick Actions
                </CardTitle>
                <CardDescription>
                  Get started with these common tasks
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {hasAdminAccess ? (
                  <Link href="/invite-user">
                    <Button className="w-full justify-start" size="lg">
                      <span className="mr-2">👤</span>
                      Invite Team Members
                    </Button>
                  </Link>
                ) : (
                  <Button
                    className="w-full justify-start"
                    size="lg"
                    variant="outline"
                    onClick={() => handleRestrictedAction("invite team members")}
                  >
                    <span className="mr-2">👤</span>
                    Invite Team Members
                  </Button>
                )}
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  size="lg"
                >
                  <span className="mr-2">📁</span>
                  Create New Project
                </Button>
                {hasAdminAccess ? (
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    size="lg"
                  >
                    <span className="mr-2">⚙️</span>
                    Organization Settings
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    size="lg"
                    onClick={() =>
                      handleRestrictedAction("access organization settings")
                    }
                  >
                    <span className="mr-2">⚙️</span>
                    Organization Settings
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  📈 Recent Activity
                </CardTitle>
                <CardDescription>
                  Latest updates from your organization
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <div className="text-4xl mb-2">🔄</div>
                  <p className="text-sm">No recent activity</p>
                  <p className="text-xs mt-1">
                    Activity will appear here as your team starts working
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
