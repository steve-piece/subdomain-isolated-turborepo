# Settings Integration with Database & RBAC

## Overview

This document describes how the modern settings system integrates with the database and RBAC (Role-Based Access Control) system.

## Database Schema

### New Tables Created

1. **`user_notification_preferences`** - Stores user notification settings
2. **`user_security_settings`** - Tracks 2FA, password policies, session management
3. **`organization_team_settings`** - Team management and invitation policies
4. **`user_active_sessions`** - Tracks active user sessions for security
5. **`security_audit_log`** - Logs all security-related events
6. **`settings_usage_tracking`** - Tracks feature usage for billing

### Extended Tables

**`user_profiles`** - Added columns:

- `bio` - User biography
- `profile_picture_url` - Profile picture URL
- `phone_number` - Contact phone
- `timezone` - User timezone
- `language` - Preferred language
- `last_active_at` - Last activity timestamp

**`organizations`** - Added columns:

- `description` - Organization description
- `logo_url` - Organization logo URL
- `website_url` - Company website
- `support_email` - Support contact email
- `business_address` - Physical address
- `industry` - Industry type
- `company_size` - Team size range
- `settings` - JSONB for custom settings

## RBAC Integration

### Capability-Based Permissions

All settings features are gated by capabilities defined in the `capabilities` table:

**Profile Capabilities:**

- `profile.edit_own` - Edit own profile
- `profile.edit_others` - Edit other users' profiles
- `profile.upload_picture` - Upload profile pictures

**Security Capabilities:**

- `security.view_own` - View own security settings
- `security.edit_own` - Edit own security settings
- `security.view_org_audit` - View organization security audit log
- `security.manage_sessions` - Manage active sessions

**Notification Capabilities:**

- `notifications.edit_own` - Edit own notification preferences

**Organization Capabilities:**

- `org.settings.edit` - Edit organization settings
- `org.team_settings.edit` - Edit team management settings
- `org.logo.upload` - Upload organization logo

### Role-Based Access Matrix

| Capability              | Owner | Superadmin | Admin | Member | View-Only |
| ----------------------- | ----- | ---------- | ----- | ------ | --------- |
| profile.edit_own        | ✅    | ✅         | ✅    | ✅     | ❌        |
| profile.edit_others     | ✅    | ✅         | ❌    | ❌     | ❌        |
| security.view_own       | ✅    | ✅         | ✅    | ✅     | ✅        |
| security.edit_own       | ✅    | ✅         | ✅    | ✅     | ❌        |
| security.view_org_audit | ✅    | ✅         | ✅    | ❌     | ❌        |
| notifications.edit_own  | ✅    | ✅         | ✅    | ✅     | ❌        |
| org.settings.edit       | ✅    | ✅         | ✅    | ❌     | ❌        |
| org.team_settings.edit  | ✅    | ✅         | ✅    | ❌     | ❌        |
| billing.view            | ✅    | ✅         | ✅    | ❌     | ❌        |
| billing.manage          | ✅    | ❌         | ✅    | ❌     | ❌        |

## Protected Layout RBAC Enforcement

The `(protected)` layout automatically:

1. **Fetches User Permissions** - Gets role and capabilities from database
2. **Passes to Sidebar** - Provides `userCapabilities` to AppSidebar
3. **Filters Navigation** - Sidebar only shows items user can access
4. **Visual Indicators** - Shows premium/locked features with icons

### Implementation Flow

```typescript
// 1. Layout fetches capabilities
const capabilities = await getUserCapabilities(userId, orgId, role);

// 2. Passed to sidebar
<AppSidebar
  userCapabilities={capabilities}
  userRole={role}
/>

// 3. Sidebar filters navigation
const hasAccess = (item) => {
  // Check role
  if (item.requiredRoles && !item.requiredRoles.includes(role)) {
    return false;
  }

  // Check capabilities
  if (item.requiredCapabilities) {
    return item.requiredCapabilities.every(cap =>
      capabilities.includes(cap)
    );
  }

  return true;
};
```

## Usage-Based Restrictions

### Subscription Tier Limits

The system enforces usage limits based on subscription tier:

```sql
-- Subscription tiers table includes limits
subscription_tiers:
  - max_projects: INTEGER
  - max_team_members: INTEGER
  - allows_custom_permissions: BOOLEAN
```

### Checking Limits

Use the `checkUsageLimit()` function:

```typescript
const projectLimit = await checkUsageLimit(orgId, "projects");
// Returns: { reached: boolean, current: number, limit: number | null }

if (projectLimit.reached) {
  // Show upgrade prompt
  // Disable "Create Project" button
}
```

### Enforced in UI

Components should check limits before showing actions:

```typescript
// Example: Before showing "Create Project" button
const { reached } = await checkUsageLimit(orgId, 'projects');

<Button disabled={reached}>
  {reached ? 'Upgrade to Create More Projects' : 'Create Project'}
</Button>
```

## Security Features

### Automatic Initialization

Triggers automatically create settings for new users/orgs:

```sql
-- On new user signup
CREATE TRIGGER on_auth_user_created_settings
  -> Creates user_notification_preferences
  -> Creates user_security_settings

-- On new organization creation
CREATE TRIGGER on_organization_created_settings
  -> Creates organization_team_settings
```

### Security Audit Logging

All security events are automatically logged:

```typescript
// Log security event
await logSecurityEvent(userId, orgId, "login", "success", "info", {
  ip_address,
  user_agent,
  location,
});
```

Events tracked:

- Login attempts (success/failure)
- Password changes
- 2FA enrollment/verification
- Session creation/termination
- Permission changes
- Settings modifications

### Session Tracking

Active sessions are tracked in `user_active_sessions`:

```typescript
// Sessions shown in Security settings
// Users can view and revoke sessions
// Automatic cleanup of expired sessions
```

## Row-Level Security (RLS)

All settings tables have RLS enabled:

**User Settings:**

- Users can only view/edit their own settings
- Admins CANNOT access other users' personal settings

**Organization Settings:**

- Require appropriate role + capability to access
- Enforced via `user_org_access()` and `user_org_capability()` functions

**Audit Logs:**

- Users see their own events
- Admins with `security.view_org_audit` see org-wide events

## Helper Functions

### Permission Checking

```typescript
import {
  getUserPermissions,
  userHasCapability,
  userHasAnyCapability,
  hasRole,
} from "@/lib/rbac/permissions";

// Get full permission context
const permissions = await getUserPermissions(userId, orgId);

// Check specific capability
const canEdit = await userHasCapability(userId, orgId, "org.settings.edit");

// Check multiple capabilities (ANY)
const canManageTeam = await userHasAnyCapability(userId, orgId, [
  "team.invite",
  "team.remove",
  "team.manage_roles",
]);

// Check role
if (hasRole(permissions, ["owner", "admin"])) {
  // Show admin features
}
```

### Feature Flags

```typescript
import { FEATURE_FLAGS } from "@/lib/rbac/permissions";

// Use predefined capability groups
const canManageProjects = await userHasAllCapabilities(
  userId,
  orgId,
  FEATURE_FLAGS.projects.edit
);
```

## Navigation Filtering

The sidebar automatically filters navigation based on permissions:

```typescript
// Navigation item definition
{
  title: "Team",
  href: "/org-settings/team",
  icon: Users,
  description: "Manage members",
  requiredRoles: ["owner", "admin", "superadmin"],
  requiredCapabilities: ["team.view"],
  isPremium: true, // Shows lock icon
}

// Automatically filtered in AppSidebar component
// Only shown if user has required role AND capabilities
```

## Settings Pages Access Control

Each settings page should verify permissions server-side:

```typescript
// Example: org-settings/page.tsx
export default async function OrgSettingsPage({ params }) {
  const { subdomain } = await params;
  const supabase = await createClient();

  // Get user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Get user permissions
  const permissions = await getUserPermissions(user.id, orgId);

  // Check capability
  const canEdit = await userHasCapability(user.id, orgId, "org.settings.edit");

  if (!canEdit) {
    redirect("/dashboard?error=unauthorized");
  }

  // Render page...
}
```

## TypeScript Types

```typescript
// User role types
export type UserRole =
  | "owner"
  | "superadmin"
  | "admin"
  | "member"
  | "view-only";

// Permission context
export interface UserPermissions {
  role: UserRole;
  capabilities: string[];
  subscription: {
    tier: string;
    features: Record<string, boolean>;
    limits: {
      maxProjects?: number;
      maxTeamMembers?: number;
      maxStorageGB?: number;
    };
  };
}
```

## Testing RBAC

### Test Scenarios

1. **Role-Based Access**
   - Login as different roles
   - Verify sidebar shows correct items
   - Attempt to access restricted pages

2. **Capability-Based Access**
   - Create custom role with limited capabilities
   - Verify feature access matches capabilities
   - Test capability overrides

3. **Usage Limits**
   - Reach project limit
   - Verify upgrade prompts appear
   - Test limit enforcement on creation

4. **Security Audit**
   - Perform security actions
   - Verify events logged correctly
   - Check audit log access control

## Migration Steps

To apply this schema to your database:

```bash
# 1. Run the SQL migration
psql -h [your-host] -U [user] -d [database] -f SETTINGS_DATABASE_SCHEMA.sql

# 2. Verify tables created
psql -c "\dt public.*"

# 3. Check RLS policies
psql -c "\d+ public.user_notification_preferences"

# 4. Seed default capabilities
# (Included in SQL file)

# 5. Test with a user
# Navigate to settings pages and verify access
```

## Next Steps

1. ✅ Database schema created
2. ✅ RBAC capabilities defined
3. ✅ Protected layout enforces permissions
4. ✅ Sidebar filters navigation
5. ⏳ Apply SQL migration to database
6. ⏳ Test with different user roles
7. ⏳ Add usage limit checks to UI components
8. ⏳ Implement settings data persistence
9. ⏳ Add security audit log viewer
10. ⏳ Create subscription upgrade flow

## Notes

- All personal settings are user-scoped (RLS enforced)
- Organization settings require appropriate capabilities
- Navigation automatically adapts to permissions
- Usage limits prevent overuse on lower tiers
- Security events are comprehensively logged
- Service role always has full access for backend operations
- Custom capabilities can be added per organization on higher tiers
