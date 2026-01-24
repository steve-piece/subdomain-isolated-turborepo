// apps/protected/app/actions/dashboard/get-onboarding-progress.ts
"use server";

import { createClient } from "@workspace/supabase/server";

export interface OnboardingTask {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  actionLink?: string;
  actionLabel?: string;
}

export interface OnboardingProgress {
  tasks: OnboardingTask[];
  allComplete: boolean;
  completionPercentage: number;
}

/**
 * Get onboarding progress for an organization
 */
export async function getOnboardingProgress(
  orgId: string,
): Promise<OnboardingProgress> {
  const supabase = await createClient();

  // Check team members (excluding the first user)
  const { count: teamMemberCount } = await supabase
    .from("user_profiles")
    .select("*", { count: "exact", head: true })
    .eq("org_id", orgId);

  const hasTeamMembers = (teamMemberCount || 0) > 1;

  // Check projects
  const { count: projectsCount } = await supabase
    .from("projects")
    .select("*", { count: "exact", head: true })
    .eq("org_id", orgId)
    .eq("status", "active");

  const hasProjects = (projectsCount || 0) > 0;

  // Define onboarding tasks
  const tasks: OnboardingTask[] = [
    {
      id: "create-org",
      title: "Create your organization",
      description: "You've successfully created your organization",
      completed: true, // Always true if they're logged in
    },
    {
      id: "invite-team",
      title: "Invite your team",
      description: hasTeamMembers
        ? `${teamMemberCount} team members`
        : "Add team members to collaborate",
      completed: hasTeamMembers,
      actionLink: "/org-settings/team",
      actionLabel: "Invite",
    },
    {
      id: "create-project",
      title: "Create your first project",
      description: hasProjects
        ? `${projectsCount} active ${projectsCount === 1 ? "project" : "projects"}`
        : "Start building something amazing",
      completed: hasProjects,
      actionLink: "/projects",
      actionLabel: "Create",
    },
  ];

  const completedCount = tasks.filter((t) => t.completed).length;
  const allComplete = completedCount === tasks.length;
  const completionPercentage = Math.round(
    (completedCount / tasks.length) * 100,
  );

  return {
    tasks,
    allComplete,
    completionPercentage,
  };
}
