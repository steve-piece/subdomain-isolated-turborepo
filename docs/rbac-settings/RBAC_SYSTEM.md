# RBAC System

## Role Hierarchy

```
owner > superadmin > admin > member > view-only
```

## Roles & Default Capabilities

### Owner (41 permissions)

- Full system access
- Organization deletion rights
- Custom permission configuration (Business+ tier)
- Ownership transfer capability

### Superadmin (40 permissions)

- All capabilities except organization deletion
- Full administrative access
- Team and project management

### Admin (32 permissions)

- Project creation, viewing, editing, deletion, archiving
- Team invitation, removal, viewing, role management
- Billing viewing and management
- Organization settings editing
- Security audit log access
- Analytics access

### Member (9 permissions)

- Project creation and editing (own projects)
- Team viewing
- Profile and security settings management
- Notification preferences

### View-Only (4 permissions)

- View own projects
- View team members
- View own security settings
- View analytics

## Capability Categories

### 1. Projects (7 capabilities)

- `projects.create` - Create new projects
- `projects.view_all` - View all organization projects
- `projects.view_own` - View own projects
- `projects.edit_all` - Edit all projects
- `projects.edit_own` - Edit own projects
- `projects.delete` - Delete projects
- `projects.archive` - Archive projects

### 2. Team Management (4 capabilities)

- `team.invite` - Invite team members
- `team.remove` - Remove team members
- `team.view` - View team members
- `team.manage_roles` - Manage team member roles

### 3. Billing (3 capabilities)

- `billing.view` - View billing information
- `billing.manage` - Manage billing settings
- `billing.upgrade` - Upgrade subscription

### 4. Organization (9 capabilities)

- `org.settings.view` - View organization settings
- `org.settings.edit` - Edit organization settings
- `org.team_settings.view` - View team settings
- `org.team_settings.edit` - Edit team settings
- `org.delete` - Delete organization
- `org.logo_upload` - Upload organization logo
- `org.roles.customize` - Customize role capabilities
- `org.ownership_transfer` - Transfer ownership
- `org.audit_log` - View organization audit log

### 5. Profile (3 capabilities)

- `profile.edit_own` - Edit own profile
- `profile.edit_others` - Edit other profiles
- `profile.upload_picture` - Upload profile picture

### 6. Security (4 capabilities)

- `security.edit_own` - Edit own security settings
- `security.view_audit_log` - View security audit log
- `security.manage_sessions` - Manage active sessions
- `security.mfa_manage` - Manage MFA settings

### 7. Notifications (1 capability)

- `notifications.edit_own` - Edit notification preferences

### 8. Analytics (3 capabilities)

- `analytics.view` - View analytics
- `analytics.generate_reports` - Generate reports
- `analytics.export_data` - Export data

## Custom Role Capabilities (Business+ Feature)

Organizations on Business or Enterprise tiers can customize role capabilities:

### Features

- Grant additional capabilities to lower roles
- Revoke default capabilities from any role
- Create custom permission workflows
- Full audit trail of all permission changes
- Real-time permission updates
- Visual indicators for customized roles

### Implementation

```typescript
// Server actions for managing custom capabilities
import {
  grantCustomCapability,
  revokeCustomCapability,
  resetRoleToDefaults,
} from "@/app/actions/rbac/capabilities";
import { canCustomizeRoles } from "@/app/actions/rbac/query";

// Check if organization can customize
const tierCheck = await canCustomizeRoles();
if (!tierCheck.canCustomize) {
  return <UpgradePrompt requiredTier="Business" />;
}

// Grant custom capability
const result = await grantCustomCapability("admin", "projects.delete");

// Revoke custom capability
const revokeResult = await revokeCustomCapability("member", "billing.manage");

// Reset role to defaults
const resetResult = await resetRoleToDefaults("admin");
```

### Tier Verification

```typescript
// Automatic tier checking
const canCustomize = await canCustomizeRoles(); // Business+ only
```

### UI Components

- `RoleCapabilitiesManager`: Interactive permission toggle grid
- `UpgradePrompt`: Tier upgrade call-to-action for free/pro users
- Role selector with capability grouping by category
- Reset confirmation dialog for destructive actions

## Permission Checking

### Server-Side Permission Checks

```typescript
// Import RBAC utilities
import { getUserPermissions, userHasCapability } from "@/lib/rbac/permissions";
import { checkUserCapability } from "@/lib/rbac/server-actions";

// Get all permissions for a user
const permissions = await getUserPermissions(userId, orgId);

// Check specific capability
if (await userHasCapability(userId, orgId, "projects.create")) {
  // User can create projects
}

// Server-side capability checking (for server components)
const capabilityResult = await checkUserCapability(orgId, "projects.create");
if (capabilityResult.hasCapability) {
  // User can create projects
}
```

### Client-Side Permission Checks

```typescript
// Conditional rendering with RequireCapability component
import { RequireCapability } from "@/components/require-capability";

<RequireCapability
  orgId={orgId}
  capability="team.invite"
  fallback={<p>You don't have permission to invite team members.</p>}
>
  <InviteUserButton />
</RequireCapability>

// Using the useCapability hook in client components
import { useCapability } from "@/components/require-capability";

function MyComponent({ orgId }: { orgId: string }) {
  const { hasCapability, isLoading } = useCapability(orgId, "billing.view");

  if (isLoading) return <Spinner />;
  if (!hasCapability) return <AccessDenied />;

  return <BillingDashboard />;
}
```

### Navigation Filtering

```typescript
// Filter navigation based on user capabilities
import { filterNavigationByPermissions } from "@/lib/rbac/permissions";

const visibleRoutes = filterNavigationByPermissions(routes, permissions);
```

## Database Functions

### Available RPC Functions

These functions can be called from the client using `supabase.rpc()`:

- `user_org_access(p_user_id, p_org_id, p_required_roles)`
- `user_org_capability(p_user_id, p_org_id, p_capability_key)`
- `user_project_access(p_user_id, p_project_id, p_required_permission)`

### Usage Examples

```typescript
// Check organization access
const { data: hasAccess } = await supabase.rpc("user_org_access", {
  p_user_id: userId,
  p_org_id: orgId,
  p_required_roles: ["admin", "owner"],
});

// Check specific capability
const { data: hasCapability } = await supabase.rpc("user_org_capability", {
  p_user_id: userId,
  p_org_id: orgId,
  p_capability_key: "projects.create",
});

// Check project access
const { data: projectAccess } = await supabase.rpc("user_project_access", {
  p_user_id: userId,
  p_project_id: projectId,
  p_required_permission: "edit",
});
```

## Server Action Usage Patterns

### Complete Server Action Usage Patterns

```typescript
// 1. In Server Components (pages, layouts)
// File: app/s/[subdomain]/(protected)/org-settings/roles/page.tsx
import { canCustomizeRoles, getAllCapabilities } from "@/app/actions/rbac/query";
import { grantCustomCapability } from "@/app/actions/rbac/capabilities";

export default async function RolesPage() {
  // Check tier eligibility
  const tierCheck = await canCustomizeRoles();
  if (!tierCheck.canCustomize) {
    return <UpgradePrompt requiredTier="Business" />;
  }

  // Grant capability (called from form submission)
  const result = await grantCustomCapability("admin", "projects.delete");
  return <RoleCapabilitiesManager />;
}

// 2. In Client Components (form submissions)
// File: components/role-capabilities-manager.tsx
"use client";
import { grantCustomCapability } from "@/app/actions/rbac/capabilities";

export function RoleCapabilitiesManager() {
  const handleGrantCapability = async (role: string, capability: string) => {
    const result = await grantCustomCapability(role, capability);
    if (result.success) {
      toast.success("Capability granted");
    } else {
      toast.error(result.message);
    }
  };

  return <form onSubmit={handleGrantCapability}>...</form>;
}

// 3. In API Routes (if needed)
// File: app/api/capabilities/route.ts
import { grantCustomCapability } from "@/app/actions/rbac/capabilities";

export async function POST(request: Request) {
  const { role, capability } = await request.json();
  const result = await grantCustomCapability(role, capability);
  return Response.json(result);
}
```

## Required Parameters Summary

| Function                 | Required Parameters                                        | Returns                    | Usage Context                        |
| ------------------------ | ---------------------------------------------------------- | -------------------------- | ------------------------------------ |
| `grantCustomCapability`  | `role: string`, `capabilityKey: string`                    | `CustomCapabilityResponse` | Client components, server components |
| `revokeCustomCapability` | `role: string`, `capabilityKey: string`                    | `CustomCapabilityResponse` | Client components, server components |
| `resetRoleToDefaults`    | `role: string`                                             | `CustomCapabilityResponse` | Client components, server components |
| `canCustomizeRoles`      | None (uses auth context)                                   | `CustomCapabilityResponse` | Server components, API routes        |
| `getUserPermissions`     | `userId: string`, `orgId: string`                          | `UserPermissions`          | Server components, API routes        |
| `userHasCapability`      | `userId: string`, `orgId: string`, `capabilityKey: string` | `boolean`                  | Server components, API routes        |
| `checkUserCapability`    | `orgId: string`, `capabilityKey: string`                   | `CapabilityCheckResult`    | Server components, API routes        |

## Testing

See [Testing Guide](./TESTING_GUIDE.md) for comprehensive testing scenarios for RBAC functionality.
