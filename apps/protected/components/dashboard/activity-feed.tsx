// apps/protected/components/dashboard/activity-feed.tsx
"use client";

import { type ActivityItem } from "@/app/actions/activity/get-recent-activity";
import { formatDistanceToNow } from "date-fns";
import { RefreshCw, Folder, User, Settings } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface ActivityFeedProps {
  activities: ActivityItem[];
}

// Map icon names to Lucide icon components
const iconMap: Record<string, LucideIcon> = {
  Folder,
  User,
  Settings,
};

export function ActivityFeed({ activities }: ActivityFeedProps) {
  if (activities.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <RefreshCw className="h-10 w-10 mx-auto mb-2" />
        <p className="text-sm">No recent activity</p>
        <p className="text-xs mt-1">
          Activity will appear here as your team starts working
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {activities.map((activity) => (
        <ActivityItemDisplay key={activity.id} activity={activity} />
      ))}
    </div>
  );
}

function ActivityItemDisplay({ activity }: { activity: ActivityItem }) {
  const timeAgo = formatDistanceToNow(new Date(activity.timestamp), {
    addSuffix: true,
  });

  // Get the icon component or fallback to Folder
  const IconComponent = iconMap[activity.icon] || Folder;

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
      <div className="text-muted-foreground mt-0.5">
        <IconComponent className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{activity.title}</p>
        <p className="text-xs text-muted-foreground truncate">
          {activity.description}
        </p>
        <p className="text-xs text-muted-foreground mt-1">{timeAgo}</p>
      </div>
    </div>
  );
}
