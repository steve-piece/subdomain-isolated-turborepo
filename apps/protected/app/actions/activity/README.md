# Activity Feed System

## Overview

The activity feed tracks and displays recent organizational activities in real-time on the dashboard.

## Current Activity Types

1. **Project Created** 📁
   - Triggered when a new project is created
   - Shows project name and creator

2. **Member Joined** 👤
   - Triggered when a new team member joins
   - Shows member name

## Usage

```tsx
import { ActivityFeed } from "@/components/dashboard/activity-feed";

// In a server component
<ActivityFeed orgId={organizationId} limit={5} />;
```

## Data Sources

- **Projects**: `public.projects` table
- **Team Members**: `public.user_profiles` table

## Future Enhancements

Consider creating a dedicated `activity_log` table for:

- Profile updates
- Role changes
- Settings modifications
- Project updates
- Permission grants/revokes
- Security events (integrate with `security_audit_log`)

### Proposed Schema

```sql
CREATE TABLE public.activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  activity_type TEXT NOT NULL,
  activity_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_activity_log_org_id ON public.activity_log(org_id);
CREATE INDEX idx_activity_log_created_at ON public.activity_log(created_at DESC);
```

## Performance

- Activity feed is cached using Next.js server components
- Uses `Suspense` for streaming
- Dashboard page uses `noStore()` to ensure fresh data
- Limited to 5-10 items by default for performance
