// apps/protected/components/dashboard/activity-feed.tsx
"use client";

import { type ActivityItem } from "@/app/actions/activity/get-recent-activity";
import { formatDistanceToNow } from "date-fns";

interface ActivityFeedProps {
  activities: ActivityItem[];
}

export function ActivityFeed({ activities }: ActivityFeedProps) {
  if (activities.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <div className="text-4xl mb-2">🔄</div>
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

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
      <div className="text-xl mt-0.5">{activity.icon}</div>
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
