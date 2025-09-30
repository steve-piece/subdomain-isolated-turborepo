# RBAC Quick Reference - Single Source of Truth

## 🎯 Quick Answer

**The database is the ultimate source of truth.** Specifically:

- `public.capabilities` - All possible permissions
- `public.role_capabilities` - Default role → capability mappings
- `public.org_role_capabilities` - Organization-specific overrides

**For development reference, use `DATABASE_RBAC_PROJECTS_PLAN.md`** - This is the authoritative document that defines the entire RBAC system.

---

## 📊 Complete Role Capabilities Matrix

This matrix shows **default** capabilities for each role. Organizations on Business+ tiers can customize these via `org_role_capabilities` table.

### Legend

- ✅ = Has capability by default
- ❌ = Does not have capability
- 🔒 = Feature requires specific subscription tier

---

### Projects

| Capability         | Owner | Superadmin | Admin | Member | View-Only |
| ------------------ | ----- | ---------- | ----- | ------ | --------- |
| `projects.create`  | ✅    | ✅         | ✅    | ✅     | ❌        |
| `projects.view`    | ✅    | ✅         | ✅    | ✅     | ✅        |
| `projects.edit`    | ✅    | ✅         | ✅    | ❌     | ❌        |
| `projects.delete`  | ✅    | ✅         | ✅    | ❌     | ❌        |
| `projects.archive` | ✅    | ✅         | ✅    | ❌     | ❌        |

---

### Team Management

| Capability          | Owner | Superadmin | Admin | Member | View-Only |
| ------------------- | ----- | ---------- | ----- | ------ | --------- |
| `team.invite`       | ✅    | ✅         | ✅    | ❌     | ❌        |
| `team.remove`       | ✅    | ✅         | ✅    | ❌     | ❌        |
| `team.view`         | ✅    | ✅         | ✅    | ✅     | ✅        |
| `team.manage_roles` | ✅    | ✅         | ✅    | ❌     | ❌        |

---

### Billing & Subscription

| Capability             | Owner | Superadmin | Admin | Member | View-Only |
| ---------------------- | ----- | ---------- | ----- | ------ | --------- |
| `billing.view`         | ✅    | ✅         | ✅    | ❌     | ❌        |
| `billing.manage`       | ✅    | ❌         | ✅    | ❌     | ❌        |
| `subscription.upgrade` | ✅    | ❌         | ✅    | ❌     | ❌        |

---

### Organization Settings

| Capability               | Owner | Superadmin | Admin | Member | View-Only |
| ------------------------ | ----- | ---------- | ----- | ------ | --------- |
| `org.settings.view`      | ✅    | ✅         | ✅    | ❌     | ❌        |
| `org.settings.edit`      | ✅    | ✅         | ✅    | ❌     | ❌        |
| `org.delete`             | ✅    | ❌         | ❌    | ❌     | ❌        |
| `org.team_settings.edit` | ✅    | ✅         | ✅    | ❌     | ❌        |
| `org.logo.upload`        | ✅    | ✅         | ✅    | ❌     | ❌        |

---

### User Profile

| Capability               | Owner | Superadmin | Admin | Member | View-Only |
| ------------------------ | ----- | ---------- | ----- | ------ | --------- |
| `profile.edit_own`       | ✅    | ✅         | ✅    | ✅     | ❌        |
| `profile.edit_others`    | ✅    | ✅         | ❌    | ❌     | ❌        |
| `profile.upload_picture` | ✅    | ✅         | ✅    | ✅     | ❌        |

---

### Security

| Capability                 | Owner | Superadmin | Admin | Member | View-Only |
| -------------------------- | ----- | ---------- | ----- | ------ | --------- |
| `security.view_own`        | ✅    | ✅         | ✅    | ✅     | ✅        |
| `security.edit_own`        | ✅    | ✅         | ✅    | ✅     | ❌        |
| `security.view_org_audit`  | ✅    | ✅         | ✅    | ❌     | ❌        |
| `security.manage_sessions` | ✅    | ✅         | ✅    | ✅     | ❌        |

---

### Notifications

| Capability               | Owner | Superadmin | Admin | Member | View-Only |
| ------------------------ | ----- | ---------- | ----- | ------ | --------- |
| `notifications.edit_own` | ✅    | ✅         | ✅    | ✅     | ❌        |

---

### Analytics & Reports

| Capability         | Owner | Superadmin | Admin | Member | View-Only |
| ------------------ | ----- | ---------- | ----- | ------ | --------- |
| `analytics.view`   | ✅    | ✅         | ✅    | ❌     | ✅        |
| `reports.generate` | ✅    | ✅         | ✅    | ❌     | ❌        |
| `reports.export`   | ✅    | ✅         | ✅    | ❌     | ❌        |

---

## 🔑 Role Descriptions

### Owner

- **Full access** to everything including organization deletion
- Can transfer ownership to another admin
- Only role that can delete the organization
- Automatically assigned to organization creator

### Superadmin

- **Full access** except organization deletion
- Can manage all projects, team members, and settings
- Can view billing but cannot modify payment methods
- Cannot transfer ownership

### Admin

- Can manage team members and projects
- Can edit organization settings
- Can manage billing and subscriptions
- Cannot delete organization or transfer ownership

### Member

- Can create and view projects (based on project permissions)
- Can manage own profile and security settings
- Can view team members
- Cannot manage organization settings or team

### View-Only

- Read-only access to projects and analytics
- Can view own security settings
- Cannot create, edit, or delete anything
- Cannot manage notifications or profile

---

## 🏢 Organization-Level vs Project-Level

### Organization-Level (role_capabilities)

- Applied across the entire organization
- Defined by user's role in `user_profiles.role`
- Can be customized per org via `org_role_capabilities` (Business+ tier)

### Project-Level (project_permissions)

- Applied per individual project
- Independent from org-level role
- Permission levels: `read`, `write`, `admin`
- Org owners and superadmins bypass project permissions

---

## 🔍 How to Check Access

### In Code (TypeScript)

```typescript
import { getUserPermissions, userHasCapability } from "@/lib/rbac/permissions";

// Get full permission context
const permissions = await getUserPermissions(userId, orgId);

// Check specific capability
const canEdit = await userHasCapability(userId, orgId, "org.settings.edit");

// Use in component
if (permissions.capabilities.includes("team.invite")) {
  // Show invite button
}
```

### In Database (SQL)

```sql
-- Check if user has capability
SELECT user_org_capability(
  'user-id-here'::uuid,
  'org-id-here'::uuid,
  'projects.create'
);

-- Get all capabilities for a user
SELECT c.key, c.name
FROM role_capabilities rc
JOIN capabilities c ON c.id = rc.capability_id
WHERE rc.role = 'admin' AND rc.is_default = true;
```

---

## 📋 Where to Find More Info

1. **`DATABASE_RBAC_PROJECTS_PLAN.md`**
   - Complete RBAC architecture
   - Implementation guide
   - Helper functions
   - RLS policies

2. **`SETTINGS_DATABASE_SCHEMA.sql`**
   - Actual SQL schema
   - Capability seeds
   - Role mappings
   - Triggers and policies

3. **`SETTINGS_INTEGRATION.md`**
   - Settings-specific capabilities
   - Integration examples
   - Usage guide

4. **`apps/protected/lib/rbac/permissions.ts`**
   - TypeScript utilities
   - Permission checking functions
   - Feature flags

---

## 🎯 Common Patterns

### Check if user can access a page

```typescript
export default async function ProtectedPage({ params }) {
  const { subdomain } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Get claims to find org_id
  const { data: claims } = await supabase.auth.getClaims();
  const orgId = claims?.claims?.org_id;

  // Check capability
  const hasAccess = await userHasCapability(
    user.id,
    orgId,
    "org.settings.view"
  );

  if (!hasAccess) {
    redirect("/dashboard?error=unauthorized");
  }

  // Render page...
}
```

### Filter navigation by permissions

```typescript
// This is done automatically in AppSidebar
const filteredItems = navigationItems.filter((item) => {
  // Check role
  if (item.requiredRoles && !item.requiredRoles.includes(userRole)) {
    return false;
  }

  // Check capabilities
  if (item.requiredCapabilities) {
    return item.requiredCapabilities.every((cap) =>
      userCapabilities.includes(cap)
    );
  }

  return true;
});
```

### Check usage limits

```typescript
import { checkUsageLimit } from '@/lib/rbac/permissions';

const projectLimit = await checkUsageLimit(orgId, 'projects');

if (projectLimit.reached) {
  // Show upgrade prompt
  return <UpgradePrompt
    current={projectLimit.current}
    limit={projectLimit.limit}
  />;
}

// Show create button
return <Button>Create Project</Button>;
```

---

## 🔄 Updating Capabilities

### Adding a New Capability

```sql
-- 1. Add to capabilities table
INSERT INTO public.capabilities (key, name, description, category)
VALUES ('feature.new_action', 'New Action', 'Description here', 'feature');

-- 2. Assign to roles
INSERT INTO public.role_capabilities (role, capability_id, is_default)
SELECT 'admin', id, true FROM public.capabilities WHERE key = 'feature.new_action';

-- 3. Use in code
const canDoAction = await userHasCapability(userId, orgId, 'feature.new_action');
```

### Custom Per-Organization

```sql
-- Grant custom capability to specific org role
INSERT INTO public.org_role_capabilities (org_id, role, capability_id, granted)
VALUES (
  'org-id-here'::uuid,
  'member',
  (SELECT id FROM public.capabilities WHERE key = 'projects.delete'),
  true
);
```

---

## ✅ Summary

**Single Source of Truth**: Database (`capabilities` + `role_capabilities` tables)

**Developer Reference**: `DATABASE_RBAC_PROJECTS_PLAN.md`

**Quick Lookup**: This file (`RBAC_QUICK_REFERENCE.md`)

**Implementation**: `SETTINGS_DATABASE_SCHEMA.sql`

**TypeScript Utils**: `apps/protected/lib/rbac/permissions.ts`
