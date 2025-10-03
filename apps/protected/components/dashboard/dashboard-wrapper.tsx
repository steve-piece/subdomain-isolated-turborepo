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
import { ActivityFeed } from "./activity-feed";
import { getRecentActivity } from "@/app/actions/activity/get-recent-activity";
import type { ActivityItem } from "@/app/actions/activity/get-recent-activity";
import { useState, useEffect } from "react";
import {
  Building2,
  Users,
  ClipboardList,
  HardDrive,
  Radio,
  Zap,
  FolderPlus,
  UserPlus,
  Settings,
  TrendingUp,
  Rocket,
  CheckCircle2,
  Circle,
} from "lucide-react";

interface DashboardWrapperProps {
  subdomain: string;
}

export function DashboardWrapper({ subdomain }: DashboardWrapperProps) {
  // ✅ Get user data from context - no API calls!
  const claims = useTenantClaims();

  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [, setIsLoadingActivities] = useState(true);

  // Fetch activities on mount
  useEffect(() => {
    async function fetchActivities() {
      try {
        const data = await getRecentActivity(claims.org_id, 5);
        setActivities(data);
      } catch (error) {
        console.error("Failed to fetch activities:", error);
      } finally {
        setIsLoadingActivities(false);
      }
    }
    fetchActivities();
  }, [claims.org_id]);

  const organizationName = claims.company_name || subdomain;
  // Extract first name only from full name (from context)
  const firstName = claims.full_name
    ? claims.full_name.trim().split(" ")[0]
    : "there";
  const userName = firstName;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">{organizationName}</h1>
        <p className="text-muted-foreground mt-1">
          Hello <span className="font-medium">{userName}</span>!
        </p>
      </div>

      <div className="mx-auto max-w-6xl space-y-6">
        {/* Welcome Card */}
        <Card className="bg-gradient-to-r from-card to-card/50 shadow-lg border-primary/20">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Building2 className="h-6 w-6" />
              {organizationName} Dashboard
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
              <Users className="h-6 w-6 text-muted-foreground" />
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
              <ClipboardList className="h-6 w-6 text-muted-foreground" />
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
              <HardDrive className="h-6 w-6 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0 GB</div>
              <p className="text-xs text-muted-foreground">of 5 GB free</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">API Calls</CardTitle>
              <Radio className="h-6 w-6 text-muted-foreground" />
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
                <Zap className="h-5 w-5" />
                Quick Actions
              </CardTitle>
              <CardDescription>
                Get started with these common tasks
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/projects/new" className="w-full block">
                <Button className="w-full justify-start" size="lg">
                  <FolderPlus className="h-4 w-4 mr-2" />
                  Create New Project
                </Button>
              </Link>

              {/* Show invite button based on role */}
              {["owner", "admin", "superadmin"].includes(claims.user_role) && (
                <Link href="/org-settings/team" className="w-full block">
                  <Button
                    className="w-full justify-start"
                    size="lg"
                    variant="outline"
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Invite Team Members
                  </Button>
                </Link>
              )}

              <Link href="/profile" className="w-full block">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  size="lg"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Recent Activity
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
              <Rocket className="h-5 w-5" />
              Getting Started
            </CardTitle>
            <CardDescription>
              Complete these steps to get the most out of your organization
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 border rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
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
                <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Invite your team</p>
                  <p className="text-xs text-muted-foreground">
                    Add team members to collaborate
                  </p>
                </div>
                {["owner", "admin", "superadmin"].includes(claims.user_role) ? (
                  <Link href="/org-settings/team">
                    <Button size="sm">Start</Button>
                  </Link>
                ) : (
                  <Button size="sm" disabled>
                    Start
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-3 p-3 border rounded-lg opacity-60">
                <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
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
                <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Configure settings</p>
                  <p className="text-xs text-muted-foreground">
                    Customize your organization preferences
                  </p>
                </div>
                {["owner", "admin", "superadmin"].includes(claims.user_role) ? (
                  <Link href="/org-settings">
                    <Button size="sm">Start</Button>
                  </Link>
                ) : (
                  <Button size="sm" disabled>
                    Start
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
