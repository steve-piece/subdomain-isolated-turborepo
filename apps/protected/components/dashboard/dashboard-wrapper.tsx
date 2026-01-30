// components/dashboard/dashboard-wrapper.tsx
"use client";

import type { ReactElement } from "react";
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
import { PageHeader } from "@/components/shared/page-header";
import { getRecentActivity } from "@/app/actions/activity/get-recent-activity";
import type { ActivityItem } from "@/app/actions/activity/get-recent-activity";
import { getDashboardStats } from "@/app/actions/dashboard/get-dashboard-stats";
import type { DashboardStats } from "@/app/actions/dashboard/get-dashboard-stats";
import { getOnboardingProgress } from "@/app/actions/dashboard/get-onboarding-progress";
import type { OnboardingProgress } from "@/app/actions/dashboard/get-onboarding-progress";
import { useState, useEffect } from "react";
import {
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
import { Skeleton } from "@workspace/ui/components/skeleton";

interface DashboardWrapperProps {
  subdomain: string;
}

export function DashboardWrapper({ subdomain }: DashboardWrapperProps): ReactElement {
  // ✅ Get user data from context - no API calls!
  const claims = useTenantClaims();

  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoadingActivities, setIsLoadingActivities] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    teamMemberCount: 0,
    activeProjects: 0,
    storageUsed: 0,
    apiCalls: 0,
  });
  const [isLoadingStats, setIsLoadingStats] = useState(true);
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
      } finally {
        setIsLoadingStats(false);
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

  // Show skeleton while loading
  if (isLoadingStats || isLoadingActivities || isLoadingOnboarding) {
    return (
      <>
        <PageHeader title="Dashboard" />
        <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-9 w-64" />
              <Skeleton className="h-5 w-48" />
            </div>
          </div>

          <div className="mx-auto w-full max-w-7xl space-y-6">
            {/* Dashboard Stats Skeleton */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="card-container">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-8 w-8 rounded-md" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-8 w-16 mb-2" />
                    <Skeleton className="h-3 w-32" />
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {/* Quick Actions Skeleton */}
              <Card className="card-container">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-9 w-9 rounded-lg" />
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-4 w-48" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full rounded-lg" />
                  ))}
                </CardContent>
              </Card>

              {/* Recent Activity Skeleton */}
              <Card className="card-container">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-9 w-9 rounded-lg" />
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-4 w-56" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-3 w-3/4" />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Getting Started Skeleton */}
            <Card className="card-container">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-9 w-9 rounded-lg" />
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-40" />
                      <Skeleton className="h-4 w-64" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-5 w-12" />
                    <Skeleton className="h-2 w-20 rounded-full" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3 p-3 border rounded-lg">
                      <Skeleton className="h-5 w-5 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-3 w-3/4" />
                      </div>
                      <Skeleton className="h-8 w-24 rounded-md" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Dashboard" />
      <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {organizationName}
            </h1>
            <p className="text-muted-foreground mt-1">
              Hello <span className="font-medium">{userName}</span>!
            </p>
          </div>
        </div>

        <div className="mx-auto w-full max-w-7xl space-y-6">
          {/* Dashboard Stats */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="card-container">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Team Members
                </CardTitle>
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
                  <Users className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tabular-nums">
                  {stats.teamMemberCount}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Active members
                </p>
              </CardContent>
            </Card>

            <Card className="card-container">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Active Projects
                </CardTitle>
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
                  <ClipboardList className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tabular-nums">0</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Start your first project
                </p>
              </CardContent>
            </Card>

            <Card className="card-container">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Storage Used
                </CardTitle>
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
                  <HardDrive className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tabular-nums">0 GB</div>
                <p className="text-xs text-muted-foreground mt-1">
                  of 5 GB free
                </p>
              </CardContent>
            </Card>

            <Card className="card-container">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">API Calls</CardTitle>
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
                  <Radio className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tabular-nums">0</div>
                <p className="text-xs text-muted-foreground mt-1">this month</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Quick Actions */}
            <Card className="card-container">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                    <Zap className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Quick Actions</CardTitle>
                    <CardDescription className="mt-0.5">
                      Get started with these common tasks
                    </CardDescription>
                  </div>
                </div>
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
                {["owner", "admin", "superadmin"].includes(
                  claims.user_role,
                ) && (
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
            <Card className="card-container">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                    <TrendingUp className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Recent Activity</CardTitle>
                    <CardDescription className="mt-0.5">
                      Latest updates from your organization
                    </CardDescription>
                  </div>
                </div>
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
                <Card className="border-primary/20 bg-primary/5 dark:bg-primary/10 shadow-sm">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 dark:bg-primary/20">
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-foreground">
                          You&apos;re All Set!
                        </CardTitle>
                        <CardDescription className="mt-0.5">
                          Great job! Here are some tips to boost your
                          productivity
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3 p-3 border border-border rounded-lg bg-card">
                        <Zap className="h-5 w-5 text-accent-foreground shrink-0 mt-0.5" />
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
                      <div className="flex items-start gap-3 p-3 border border-border rounded-lg bg-card">
                        <Users className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            Collaborate effectively
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Assign roles to team members for better organization
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-3 border border-border rounded-lg bg-card">
                        <TrendingUp className="h-5 w-5 text-accent-foreground shrink-0 mt-0.5" />
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
                <Card className="card-container">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                          <Rocket className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle>Getting Started</CardTitle>
                          <CardDescription className="mt-0.5">
                            Complete these steps to get the most out of your
                            organization
                          </CardDescription>
                        </div>
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
                          className="flex items-center gap-3 p-3 border rounded-lg transition-opacity"
                        >
                          {task.completed ? (
                            <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                          ) : (
                            <Circle className="h-5 w-5 text-muted-foreground shrink-0" />
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
                                    <Button size="sm">
                                      {task.actionLabel}
                                    </Button>
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
    </>
  );
}
