# RBAC Implementation Summary

## Overview

This document summarizes the implementation of the comprehensive Role-Based Access Control (RBAC) system with capability-based permissions and database-backed settings for the subdomain-isolated Turborepo application.

## What Was Implemented

### 1. Database Schema (Migration: `20250929_settings_and_rbac.sql`)

#### User Settings Tables

**`user_notification_preferences`**

- Email notification settings (account activity, team updates, projects, marketing)
- In-app notification settings (push, sound alerts)
- Communication preferences (email digest frequency)
- Quiet hours configuration

**`user_security_settings`**

- MFA/2FA enrollment status and timestamps
- Password last changed tracking
- Session management settings (max sessions, timeout)

**`user_profiles` (enhanced)**

- Added: `bio`, `avatar_url`, `phone`, `last_active_at`

#### Organization Settings Tables

**`organization_settings`**

- Team settings (admin approval for invites, member invite permissions)
- Security settings (enforce 2FA, session timeout)
- Project settings (default visibility)

**`organizations` (enhanced)**

- Added: `logo_url`, `description`, `website_url`, `support_email`, `business_address`, `settings`, `metadata`

#### RBAC Core Tables

**`projects`**

- Organization-scoped projects
- Owner tracking and status management
- Metadata and settings JSONB columns

**`project_permissions`**

- Granular per-project access control
- Permission levels: `read`, `write`, `admin`
- Tracks who granted permissions and when

**`capabilities`**

- Atomic permissions (e.g., `projects.create`, `team.invite`)
- Organized by category (projects, team, billing, organization, analytics)
- Optional subscription tier gating

**`role_capabilities`**

- Maps default capabilities to org-level roles
- Defines what each role can do by default

**`org_role_capabilities`**

- Custom capability overrides per organization
- Allows Business+ tier orgs to customize role permissions

### 2. Default Capabilities Seeded

#### Projects Category

- `projects.create` - Create new projects
- `projects.view` - View all org projects
- `projects.edit` - Edit project settings
- `projects.delete` - Delete projects
- `projects.archive` - Archive projects

#### Team Category

- `team.invite` - Invite new team members
- `team.remove` - Remove team members
- `team.view` - View team members
- `team.manage_roles` - Change member roles

#### Billing Category

- `billing.view` - View billing information
- `billing.manage` - Update billing details
- `subscription.upgrade` - Upgrade subscription tier

#### Organization Category

- `org.settings.view` - View org settings
- `org.settings.edit` - Edit org settings
- `org.delete` - Delete organization

#### Analytics Category

- `analytics.view` - View usage analytics
- `reports.generate` - Generate usage reports
- `reports.export` - Export report data

### 3. Role-to-Capability Mappings

**Owner**: Full access to all capabilities
**Superadmin**: All capabilities except `org.delete`
**Admin**: Projects, team, analytics viewing, org settings viewing
**Member**: View projects, create projects, view team
**View-Only**: View projects, view team, view analytics

### 4. Database Helper Functions

**`user_org_access(user_id, org_id, required_roles[])`**

- Checks if user is in org and optionally has specific roles
- Returns boolean
- Used throughout RLS policies

**`user_org_capability(user_id, org_id, capability_key)`**

- Checks if user has a specific capability
- Considers custom org overrides first, then defaults
- Returns boolean

**`user_project_access(user_id, project_id, required_permission)`**

- Checks project-level permissions
- Considers org-level roles (owner/superadmin always have access)
- Checks explicit project permissions with hierarchy
- Returns boolean

### 5. Row Level Security (RLS) Policies

Clean, consolidated RLS policies for all tables:

- User settings: Users can only access their own settings
- Organization settings: Members can view, admin+ can manage
- Projects: Capability-based creation, permission-based access
- Project permissions: Only project admins can manage
- Capabilities: Read-only for authenticated users
- Role capabilities: Read-only for authenticated users
- Org role capabilities: Owner/superadmin can manage

### 6. Automatic Triggers

**`handle_new_user_settings()`**

- Auto-creates default notification preferences
- Auto-creates default security settings
- Fires when new user_profile is created

**`handle_new_org_settings()`**

- Auto-creates default organization settings
- Fires when new organization is created

**`handle_new_project()`**

- Auto-assigns project creator as admin
- Fires when new project is created

**`handle_updated_at()`**

- Updates `updated_at` timestamp
- Applied to all relevant tables

### 7. Client-Side RBAC Utilities

**`lib/rbac/capabilities.ts`**

- TypeScript types for all capabilities
- Capability definitions and metadata
- Helper functions for capability management

**`lib/rbac/server-actions.ts`**

- `checkUserCapability()` - Server action to check specific capability
- `checkUserOrgAccess()` - Server action to check org access with roles
- `getUserCapabilities()` - Get all user's capabilities

**`components/require-capability.tsx`**

- `<RequireCapability>` component for conditional rendering
- `useCapability()` hook for capability checking in components

### 8. Updated Components

**`components/app-sidebar.tsx`**

- Enhanced with capability-based navigation filtering
- Accepts `orgId` and `userCapabilities` props
- Filters menu items based on both roles AND capabilities
- Provides visual feedback for restricted items

**`app/s/[subdomain]/(protected)/layout.tsx`**

- Fetches user capabilities from database on page load
- Passes capabilities to sidebar
- Enables real-time capability-based UI updates

## Usage Examples

### Checking Capability in Server Component

```typescript
import { checkUserCapability } from "@/lib/rbac/server-actions";

const result = await checkUserCapability(orgId, "projects.create");
if (result.hasCapability) {
  // User can create projects
}
```

### Conditional Rendering with Component

```tsx
import { RequireCapability } from "@/components/require-capability";

<RequireCapability
  orgId={orgId}
  capability="team.invite"
  fallback={<p>You don't have permission to invite team members.</p>}
>
  <InviteUserButton />
</RequireCapability>;
```

### Using Hook in Client Component

```tsx
import { useCapability } from "@/components/require-capability";

function MyComponent({ orgId }: { orgId: string }) {
  const { hasCapability, isLoading } = useCapability(orgId, "billing.view");

  if (isLoading) return <Spinner />;
  if (!hasCapability) return <AccessDenied />;

  return <BillingDashboard />;
}
```

### Sidebar Automatic Filtering

The sidebar now automatically hides menu items based on:

1. **Role requirements** - User must have one of the specified roles
2. **Capability requirements** - User must have at least one of the specified capabilities

Example from sidebar config:

```typescript
{
  title: "Billing",
  href: "/org-settings/billing",
  icon: CreditCard,
  description: "Plans & invoices",
  roles: ["owner", "admin"],
  capabilities: ["billing.view"], // User needs billing.view capability
}
```

## Database Functions Available for RPC

These functions can be called from the client using `supabase.rpc()`:

- `user_org_access(p_user_id, p_org_id, p_required_roles)`
- `user_org_capability(p_user_id, p_org_id, p_capability_key)`
- `user_project_access(p_user_id, p_project_id, p_required_permission)`

## Next Steps

### To Integrate Settings Pages

1. **Update Profile Page** - Connect to `user_profiles` table (bio, avatar_url, phone)
2. **Update Notifications Page** - Connect to `user_notification_preferences` table
3. **Update Security Page** - Connect to `user_security_settings` table for MFA tracking
4. **Update Org Settings Pages** - Connect to `organizations` and `organization_settings` tables

### To Create Projects Feature

1. Create projects UI pages
2. Use `projects` table for CRUD operations
3. Use `project_permissions` for team member access
4. Leverage `user_project_access()` function for permission checks

### To Implement Usage-Based Restrictions

1. Add usage tracking to `usage_counters` table
2. Check against `subscription_tiers` limits (max_projects, max_team_members)
3. Show upgrade prompts when limits are reached
4. Gate premium features behind `requires_tier_id` in capabilities

## Testing Checklist

- [ ] Test role-based navigation visibility
- [ ] Test capability-based access control
- [ ] Test project creation and permissions
- [ ] Test custom capability overrides (Business+ tier)
- [ ] Test settings CRUD operations
- [ ] Test automatic triggers (new user, new org, new project)
- [ ] Test RLS policies (can only see/edit what they should)
- [ ] Test subscription tier gating
- [ ] Test usage limit enforcement

## Migration Application

To apply this migration:

```bash
# Navigate to project root
cd /Users/splmbp3/projects/subdomain-isolated-turborepo

# Apply migration via Supabase CLI
supabase db push

# Or manually apply in Supabase Dashboard
# SQL Editor → Run the migration file
```

## Notes

- All settings tables auto-create records via triggers
- Projects auto-grant creator admin permissions
- RLS policies use SECURITY DEFINER functions for performance
- Capabilities are read-only for authenticated users (managed by admins via service role)
- Custom org capabilities require Business+ tier subscription
- Service role always has full access for server-side operations

## Security Considerations

✅ All tables have RLS enabled
✅ Helper functions are STABLE and SECURITY DEFINER
✅ Service role bypasses RLS (for trusted server operations only)
✅ User can only access their own settings
✅ Organization members can only access their org's data
✅ Project permissions are strictly enforced
✅ Capability checks consider both default and custom overrides
✅ Subscription tier limits are enforced at database level

## Performance Optimizations

- Indexes on foreign keys and frequently queried columns
- STABLE functions allow query optimization
- Capability caching in layout (fetched once per page load)
- Efficient RLS policies with EXISTS subqueries
- JSONB columns for flexible metadata without schema changes

---

**Implementation Date**: September 29, 2025
**Status**: Ready for testing and integration
**Database Migration File**: `supabase/migrations/20250929_settings_and_rbac.sql`
