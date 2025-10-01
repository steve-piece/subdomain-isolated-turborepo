// components/dashboard/dashboard-wrapper.tsx
"use client";

import { useTenantClaims } from "@/lib/contexts/tenant-claims-context";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import Link from "next/link";
import { RoleProtectedAction } from "@/components/shared/role-protected-action";
import { ActivityFeed } from "./activity-feed";
import type { ActivityItem } from "@/app/actions/activity/get-recent-activity";

interface DashboardWrapperProps {
  subdomain: string;
  activities: ActivityItem[];
}

export function DashboardWrapper({
  subdomain,
  activities,
}: DashboardWrapperProps) {
  // ✅ Get user data from context - no API calls!
  const claims = useTenantClaims();

  const organizationName = claims.company_name || subdomain;
  const userName = claims.full_name || claims.email;

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-background to-muted/20">
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">{organizationName}</h1>
          <p className="text-muted-foreground mt-1">
            👋 Welcome back, <span className="font-medium">{userName}</span>
          </p>
        </div>

        <div className="mx-auto max-w-6xl space-y-6">
          {/* Welcome Card */}
          <Card className="bg-gradient-to-r from-card to-card/50 shadow-lg border-primary/20">
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
          <div className="grid gap-6 md:grid-cols-4">
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Team Members
                </CardTitle>
                <div className="text-2xl">👥</div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">1</div>
                <p className="text-xs text-muted-foreground">Active members</p>
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

            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Storage Used
                </CardTitle>
                <div className="text-2xl">💾</div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0 GB</div>
                <p className="text-xs text-muted-foreground">of 5 GB free</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">API Calls</CardTitle>
                <div className="text-2xl">📡</div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
                <p className="text-xs text-muted-foreground">this month</p>
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
                <Link href="/projects/new" className="w-full block">
                  <Button className="w-full justify-start" size="lg">
                    <span className="mr-2">📁</span>
                    Create New Project
                  </Button>
                </Link>

                <RoleProtectedAction
                  subdomain={subdomain}
                  allowedRoles={["owner", "admin", "superadmin"]}
                  fallbackMessage="Only owners and admins can invite team members"
                >
                  <Link href="/org-settings/team" className="w-full block">
                    <Button
                      className="w-full justify-start"
                      size="lg"
                      variant="outline"
                    >
                      <span className="mr-2">👤</span>
                      Invite Team Members
                    </Button>
                  </Link>
                </RoleProtectedAction>

                <Link href="/profile" className="w-full block">
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    size="lg"
                  >
                    <span className="mr-2">⚙️</span>
                    Edit Profile
                  </Button>
                </Link>
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
                <ActivityFeed activities={activities} />
              </CardContent>
            </Card>
          </div>

          {/* Getting Started */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                🚀 Getting Started
              </CardTitle>
              <CardDescription>
                Complete these steps to get the most out of your organization
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <span className="text-green-600 text-xl">✅</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      Create your organization
                    </p>
                    <p className="text-xs text-muted-foreground">
                      You&apos;ve successfully created your organization
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 border rounded-lg opacity-60">
                  <span className="text-xl">⭕</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Invite your team</p>
                    <p className="text-xs text-muted-foreground">
                      Add team members to collaborate
                    </p>
                  </div>
                  <RoleProtectedAction
                    subdomain={subdomain}
                    allowedRoles={["owner", "admin", "superadmin"]}
                  >
                    <Link href="/org-settings/team">
                      <Button size="sm">Start</Button>
                    </Link>
                  </RoleProtectedAction>
                </div>

                <div className="flex items-center gap-3 p-3 border rounded-lg opacity-60">
                  <span className="text-xl">⭕</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      Create your first project
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Start building something amazing
                    </p>
                  </div>
                  <Link href="/projects/new">
                    <Button size="sm">Start</Button>
                  </Link>
                </div>

                <div className="flex items-center gap-3 p-3 border rounded-lg opacity-60">
                  <span className="text-xl">⭕</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Configure settings</p>
                    <p className="text-xs text-muted-foreground">
                      Customize your organization preferences
                    </p>
                  </div>
                  <RoleProtectedAction
                    subdomain={subdomain}
                    allowedRoles={["owner", "admin", "superadmin"]}
                  >
                    <Link href="/org-settings">
                      <Button size="sm">Start</Button>
                    </Link>
                  </RoleProtectedAction>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
