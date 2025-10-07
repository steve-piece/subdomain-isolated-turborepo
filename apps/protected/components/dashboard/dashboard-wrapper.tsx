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
import { CreateProjectDialog } from "@/components/projects/create-project-dialog";
import { ActivityFeed } from "./activity-feed";
import { getRecentActivity } from "@/app/actions/activity/get-recent-activity";
import type { ActivityItem } from "@/app/actions/activity/get-recent-activity";
import { getDashboardStats } from "@/app/actions/dashboard/get-dashboard-stats";
import type { DashboardStats } from "@/app/actions/dashboard/get-dashboard-stats";
import { getOnboardingProgress } from "@/app/actions/dashboard/get-onboarding-progress";
import type { OnboardingProgress } from "@/app/actions/dashboard/get-onboarding-progress";
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
  const [stats, setStats] = useState<DashboardStats>({
    teamMemberCount: 0,
    activeProjects: 0,
    storageUsed: 0,
    apiCalls: 0,
  });
  const [onboarding, setOnboarding] = useState<OnboardingProgress | null>(null);
  const [isLoadingOnboarding, setIsLoadingOnboarding] = useState(true);

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

  // Fetch dashboard stats
  useEffect(() => {
    async function fetchStats() {
      try {
        const data = await getDashboardStats(claims.org_id);
        setStats(data);
      } catch (error) {
        console.error("Failed to fetch dashboard stats:", error);
      }
    }
    fetchStats();
  }, [claims.org_id]);

  // Fetch onboarding progress
  useEffect(() => {
    async function fetchOnboarding() {
      try {
        const data = await getOnboardingProgress(claims.org_id);
        setOnboarding(data);
      } catch (error) {
        console.error("Failed to fetch onboarding progress:", error);
      } finally {
        setIsLoadingOnboarding(false);
      }
    }
    fetchOnboarding();
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
              <div className="text-2xl font-bold">{stats.teamMemberCount}</div>
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
              <CreateProjectDialog
                subdomain={claims.subdomain}
                trigger={
                  <Button className="w-full justify-start" size="lg">
                    <FolderPlus className="h-4 w-4 mr-2" />
                    Create New Project
                  </Button>
                }
              />

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

        {/* Dynamic Getting Started / Productivity Tips */}
        {!isLoadingOnboarding && onboarding && (
          <>
            {onboarding.allComplete ? (
              // Show Productivity Tips when all tasks are complete
              <Card className="border-green-200 bg-green-50/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-900">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    You&apos;re All Set!
                  </CardTitle>
                  <CardDescription>
                    Great job! Here are some tips to boost your productivity
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 p-3 border border-green-200 rounded-lg bg-white">
                      <Zap className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          Use keyboard shortcuts
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Press{" "}
                          <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded">
                            Cmd+K
                          </kbd>{" "}
                          to quickly navigate
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 border border-green-200 rounded-lg bg-white">
                      <Users className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          Collaborate effectively
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Assign roles to team members for better organization
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 border border-green-200 rounded-lg bg-white">
                      <TrendingUp className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          Track your progress
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Check your activity feed regularly to stay updated
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              // Show Getting Started tasks
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Rocket className="h-5 w-5" />
                        Getting Started
                      </CardTitle>
                      <CardDescription>
                        Complete these steps to get the most out of your
                        organization
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-muted-foreground">
                        {onboarding.completionPercentage}%
                      </span>
                      <div className="h-2 w-20 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all duration-300"
                          style={{
                            width: `${onboarding.completionPercentage}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {onboarding.tasks.map((task) => (
                      <div
                        key={task.id}
                        className={`flex items-center gap-3 p-3 border rounded-lg transition-opacity ${
                          task.completed ? "" : "opacity-70"
                        }`}
                      >
                        {task.completed ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                        ) : (
                          <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                        )}
                        <div className="flex-1">
                          <p className="text-sm font-medium">{task.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {task.description}
                          </p>
                        </div>
                        {!task.completed &&
                          task.actionLink &&
                          task.actionLabel && (
                            <>
                              {task.id === "invite-team" &&
                              !["owner", "admin", "superadmin"].includes(
                                claims.user_role,
                              ) ? (
                                <Button size="sm" disabled>
                                  {task.actionLabel}
                                </Button>
                              ) : (
                                <Link href={task.actionLink}>
                                  <Button size="sm">{task.actionLabel}</Button>
                                </Link>
                              )}
                            </>
                          )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
