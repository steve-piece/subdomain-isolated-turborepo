// apps/protected/app/actions/activity/get-recent-activity.ts
"use server";

import { createClient } from "@workspace/supabase/server";

export interface ActivityItem {
  id: string;
  type: "project_created" | "member_joined" | "profile_updated";
  icon: string;
  title: string;
  description: string;
  timestamp: string;
  user?: {
    name: string;
    email: string;
  };
}

export async function getRecentActivity(
  orgId: string,
  limit: number = 10,
): Promise<ActivityItem[]> {
  const supabase = await createClient();
  const activities: ActivityItem[] = [];

  try {
    // Fetch recent projects
    const { data: projects } = await supabase
      .from("projects")
      .select("id, name, created_at, owner_id")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(5);

    // Fetch user profiles for project owners
    const ownerIds = projects?.map((p) => p.owner_id) || [];
    const { data: owners } = ownerIds.length
      ? await supabase
          .from("user_profiles")
          .select("user_id, full_name")
          .in("user_id", ownerIds)
      : { data: [] };

    // Create owner lookup map
    const ownerMap = new Map(
      owners?.map((o) => [o.user_id, o.full_name]) || [],
    );

    // Fetch recent team members
    const { data: members } = await supabase
      .from("user_profiles")
      .select("user_id, full_name, created_at")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(5);

    // Add project activities
    if (projects) {
      projects.forEach((project) => {
        const ownerName = ownerMap.get(project.owner_id) || "Someone";
        activities.push({
          id: `project-${project.id}`,
          type: "project_created",
          icon: "Folder",
          title: "New project created",
          description: `${ownerName} created "${project.name}"`,
          timestamp: project.created_at,
        });
      });
    }

    // Add member activities
    if (members) {
      members.forEach((member, index: number) => {
        // Skip the first member (org owner) to avoid showing "created" event
        if (index > 0) {
          const memberName = member.full_name || "New member";
          activities.push({
            id: `member-${member.user_id}`,
            type: "member_joined",
            icon: "User",
            title: "Team member joined",
            description: `${memberName} joined the organization`,
            timestamp: member.created_at,
          });
        }
      });
    }

    // Sort all activities by timestamp
    activities.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );

    // Return limited results
    return activities.slice(0, limit);
  } catch (error) {
    console.error("Error fetching recent activity:", error);
    return [];
  }
}
