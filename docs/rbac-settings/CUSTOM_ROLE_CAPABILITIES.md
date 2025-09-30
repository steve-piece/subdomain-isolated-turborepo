# Custom Role Capabilities for Organizations

## 🎯 Overview

Organizations on **Business+** and **Enterprise** subscription tiers can customize role capabilities beyond the default settings. This allows fine-grained control over what each role can do within their specific organization.

## 🏢 Subscription Tier Requirements

| Tier | Custom Capabilities | Custom Roles | Max Customizations |
|------|-------------------|--------------|-------------------|
| Free | ❌ No | ❌ No | - |
| Pro | ❌ No | ❌ No | - |
| **Business** | ✅ Yes | ❌ No | Unlimited |
| **Enterprise** | ✅ Yes | ✅ Yes (future) | Unlimited |

**Note**: Only Business+ tiers have `subscription_tiers.allows_custom_permissions = true`

---

## 🔄 How Custom Capabilities Work

### Default vs Custom Flow

```
┌─────────────────────────────────────────────────────────┐
│ 1. User performs action                                 │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ 2. Check org_role_capabilities (custom overrides)      │
│    SELECT * FROM org_role_capabilities                  │
│    WHERE org_id = ? AND role = ? AND capability_id = ? │
└─────────────────────────────────────────────────────────┘
                        ↓
                   Found?
                ┌─────┴─────┐
               YES          NO
                │            │
                ↓            ↓
    ┌──────────────┐   ┌──────────────────┐
    │ Use Custom   │   │ Check Defaults   │
    │ Override     │   │ role_capabilities│
    │ (granted?)   │   │ (is_default?)    │
    └──────────────┘   └──────────────────┘
                ↓            ↓
              ALLOW      ALLOW/DENY
            or DENY
```

### Database Tables Involved

**1. `capabilities`** - Master list of all permissions
```sql
CREATE TABLE public.capabilities (
  id UUID PRIMARY KEY,
  key TEXT UNIQUE,              -- e.g., 'projects.create'
  name TEXT,
  description TEXT,
  category TEXT,
  requires_tier_id UUID         -- Min tier required
);
```

**2. `role_capabilities`** - Default permissions per role
```sql
CREATE TABLE public.role_capabilities (
  id UUID PRIMARY KEY,
  role user_role,               -- owner, admin, member, etc.
  capability_id UUID,
  is_default BOOLEAN            -- Granted by default?
);
```

**3. `org_role_capabilities`** - Organization-specific overrides
```sql
CREATE TABLE public.org_role_capabilities (
  id UUID PRIMARY KEY,
  org_id UUID,                  -- Specific organization
  role user_role,               -- Role being customized
  capability_id UUID,           -- Which capability
  granted BOOLEAN,              -- true = grant, false = revoke
  
  -- Audit fields
  updated_by UUID,              -- Who made the change
  requires_min_tier_id UUID     -- Min tier needed for this override
);
```

---

## 🔐 Permission Resolution Logic

### SQL Function in Database

The `user_org_capability()` function handles this automatically:

```sql
-- Priority order:
1. Check org_role_capabilities (custom) FIRST
2. If found → return granted value
3. If not found → check role_capabilities (defaults)
4. Return true/false
```

### TypeScript Implementation

```typescript
// apps/protected/lib/rbac/permissions.ts
async function getUserCapabilities(userId, orgId, role) {
  // 1. Get custom overrides for this org + role
  const customCapabilities = await supabase
    .from('org_role_capabilities')
    .select('capability_id, granted, capabilities(key)')
    .eq('org_id', orgId)
    .eq('role', role);
  
  // 2. Get default capabilities for role
  const defaultCapabilities = await supabase
    .from('role_capabilities')
    .select('capability_id, is_default, capabilities(key)')
    .eq('role', role);
  
  // 3. Merge: custom overrides take priority
  const capabilityMap = new Map();
  
  // Load defaults first
  for (const cap of defaultCapabilities) {
    capabilityMap.set(cap.capabilities.key, cap.is_default);
  }
  
  // Apply custom overrides (priority)
  for (const cap of customCapabilities) {
    capabilityMap.set(cap.capabilities.key, cap.granted);
  }
  
  // Return granted capabilities
  return Array.from(capabilityMap.entries())
    .filter(([key, granted]) => granted)
    .map(([key]) => key);
}
```

---

## 🛠️ Server Actions for Custom Capabilities

### 1. Check if Organization Can Customize

```typescript
// apps/protected/app/actions.ts
export async function canCustomizeRoles(
  orgId: string
): Promise<{ canCustomize: boolean; tier: string }> {
  const supabase = await createClient();
  
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select(`
      subscription_tiers (
        name,
        allows_custom_permissions
      )
    `)
    .eq('org_id', orgId)
    .single();
  
  return {
    canCustomize: subscription?.subscription_tiers?.allows_custom_permissions || false,
    tier: subscription?.subscription_tiers?.name || 'free'
  };
}
```

### 2. Grant Custom Capability

```typescript
export async function grantCustomCapability(
  orgId: string,
  role: UserRole,
  capabilityKey: string
): Promise<{ success: boolean; message?: string }> {
  const supabase = await createClient();
  
  // Verify user is owner
  const { data: { user } } = await supabase.auth.getUser();
  const { data: claims } = await supabase.auth.getClaims();
  
  if (claims?.claims?.user_role !== 'owner') {
    return { success: false, message: 'Only owners can customize capabilities' };
  }
  
  // Check subscription tier
  const { canCustomize } = await canCustomizeRoles(orgId);
  if (!canCustomize) {
    return {
      success: false,
      message: 'Upgrade to Business tier to customize role capabilities'
    };
  }
  
  // Get capability ID
  const { data: capability } = await supabase
    .from('capabilities')
    .select('id')
    .eq('key', capabilityKey)
    .single();
  
  if (!capability) {
    return { success: false, message: 'Capability not found' };
  }
  
  // Upsert custom capability
  const { error } = await supabase
    .from('org_role_capabilities')
    .upsert({
      org_id: orgId,
      role: role,
      capability_id: capability.id,
      granted: true,
      updated_by: user.id,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'org_id,role,capability_id'
    });
  
  if (error) {
    return { success: false, message: error.message };
  }
  
  return { success: true };
}
```

### 3. Revoke Custom Capability

```typescript
export async function revokeCustomCapability(
  orgId: string,
  role: UserRole,
  capabilityKey: string
): Promise<{ success: boolean; message?: string }> {
  const supabase = await createClient();
  
  // Verify user is owner
  const { data: { user } } = await supabase.auth.getUser();
  const { data: claims } = await supabase.auth.getClaims();
  
  if (claims?.claims?.user_role !== 'owner') {
    return { success: false, message: 'Only owners can customize capabilities' };
  }
  
  // Get capability ID
  const { data: capability } = await supabase
    .from('capabilities')
    .select('id')
    .eq('key', capabilityKey)
    .single();
  
  if (!capability) {
    return { success: false, message: 'Capability not found' };
  }
  
  // Upsert with granted = false (revoke)
  const { error } = await supabase
    .from('org_role_capabilities')
    .upsert({
      org_id: orgId,
      role: role,
      capability_id: capability.id,
      granted: false,
      updated_by: user.id,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'org_id,role,capability_id'
    });
  
  if (error) {
    return { success: false, message: error.message };
  }
  
  return { success: true };
}
```

### 4. Reset Role to Defaults

```typescript
export async function resetRoleToDefaults(
  orgId: string,
  role: UserRole
): Promise<{ success: boolean; message?: string }> {
  const supabase = await createClient();
  
  // Verify user is owner
  const { data: { user } } = await supabase.auth.getUser();
  const { data: claims } = await supabase.auth.getClaims();
  
  if (claims?.claims?.user_role !== 'owner') {
    return { success: false, message: 'Only owners can reset role capabilities' };
  }
  
  // Delete all custom capabilities for this role
  const { error } = await supabase
    .from('org_role_capabilities')
    .delete()
    .eq('org_id', orgId)
    .eq('role', role);
  
  if (error) {
    return { success: false, message: error.message };
  }
  
  return { success: true, message: `${role} role reset to default capabilities` };
}
```

### 5. Get Organization Custom Capabilities

```typescript
export async function getOrgCustomCapabilities(orgId: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('org_role_capabilities')
    .select(`
      role,
      granted,
      updated_at,
      capabilities (
        key,
        name,
        description,
        category
      )
    `)
    .eq('org_id', orgId)
    .order('role', { ascending: true })
    .order('updated_at', { ascending: false });
  
  return { data, error };
}
```

---

## 🔍 Real-World Examples

### Example 1: Strict Project Control
**Scenario**: Company wants only admins to create projects, not members.

```typescript
// Revoke project creation from members
await revokeCustomCapability(
  orgId,
  'member',
  'projects.create',
  ownerId
);

// Result: Members can view projects but cannot create new ones
// Admins and owners can still create projects
```

### Example 2: Finance Department Access
**Scenario**: Give specific members billing view without making them admins.

```typescript
// Grant billing view to members
await grantCustomCapability(
  orgId,
  'member',
  'billing.view',
  ownerId
);

// Result: All members can now view billing
// Only admins/owners can still manage billing
```

### Example 3: Team Lead Permissions
**Scenario**: Allow members to manage roles but not remove team members.

```typescript
// Grant role management to members
await grantCustomCapability(
  orgId,
  'member',
  'team.manage_roles',
  ownerId
);

// Members can now change roles but still cannot remove users
```

### Example 4: Locked Down Organization
**Scenario**: Security-focused org wants view-only members by default.

```typescript
// Revoke project creation from members
await revokeCustomCapability(orgId, 'member', 'projects.create', ownerId);

// Revoke project editing from members
await revokeCustomCapability(orgId, 'member', 'projects.edit', ownerId);

// Result: Members become effectively read-only unless explicitly granted project permissions
```

---

## 🎨 Admin UI Implementation

### Page: `/org-settings/roles`

This page should be added to the Organization Settings section:

```typescript
// File: apps/protected/app/s/[subdomain]/(org-settings)/org-settings/roles/page.tsx

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { RoleCapabilitiesManager } from "@/components/role-capabilities-manager";
import { UpgradePrompt } from "@/components/upgrade-prompt";

export default async function RolesCustomizationPage({ params }) {
  const { subdomain } = await params;
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  const { data: claims } = await supabase.auth.getClaims();
  
  const orgId = claims?.claims?.org_id;
  const userRole = claims?.claims?.user_role;
  
  // Only owners can customize
  if (userRole !== 'owner') {
    redirect('/org-settings?error=unauthorized');
  }
  
  // Check if org can customize
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select(`
      subscription_tiers (
        name,
        allows_custom_permissions
      )
    `)
    .eq('org_id', orgId)
    .single();
  
  const canCustomize = subscription?.subscription_tiers?.allows_custom_permissions;
  
  if (!canCustomize) {
    return <UpgradePrompt 
      feature="Custom Role Capabilities"
      requiredTier="Business"
      currentTier={subscription?.subscription_tiers?.name || 'free'}
    />;
  }
  
  // Fetch all capabilities
  const { data: capabilities } = await supabase
    .from('capabilities')
    .select('*')
    .order('category', { ascending: true })
    .order('name', { ascending: true });
  
  // Fetch custom overrides
  const { data: customCapabilities } = await supabase
    .from('org_role_capabilities')
    .select(`
      role,
      granted,
      updated_at,
      capabilities (
        id,
        key,
        name,
        description,
        category
      )
    `)
    .eq('org_id', orgId);
  
  return (
    <RoleCapabilitiesManager
      capabilities={capabilities || []}
      customCapabilities={customCapabilities || []}
      orgId={orgId}
    />
  );
}
```

---

## 🎯 Complete Protocol for Custom Capabilities

### Step 1: Subscription Tier Verification

```typescript
// Always check first
const { canCustomize, tier } = await canCustomizeRoles(orgId);

if (!canCustomize) {
  // Show upgrade prompt
  return <UpgradePrompt requiredTier="Business" currentTier={tier} />;
}
```

### Step 2: Grant/Revoke Capabilities

```typescript
// Option A: Grant capability
const result = await grantCustomCapability(
  orgId,
  'member',              // Role to customize
  'projects.delete',     // Capability key
);

// Option B: Revoke capability
const result = await revokeCustomCapability(
  orgId,
  'member',
  'projects.create',
);

// Option C: Reset to defaults
const result = await resetRoleToDefaults(orgId, 'member');
```

### Step 3: Audit Trail

```typescript
// All changes are automatically logged to security_audit_log
const { data: auditLog } = await supabase
  .from('security_audit_log')
  .select('*')
  .eq('org_id', orgId)
  .eq('event_type', 'capability_granted')
  .or('event_type.eq.capability_revoked,event_type.eq.role_reset')
  .order('created_at', { ascending: false });

// Shows:
// - Who made the change
// - When it was made
// - What capability was affected
// - Grant or revoke
```

### Step 4: Verify Changes Take Effect

```typescript
// Permission checks automatically use custom capabilities
const permissions = await getUserPermissions(userId, orgId);

// This includes custom overrides
console.log(permissions.capabilities);
// ['projects.view', 'team.view', ...custom capabilities...]

// Navigation automatically filters
<AppSidebar userCapabilities={permissions.capabilities} />
// Shows only accessible items based on custom + default capabilities
```

---

## ⚠️ Important Rules & Limitations

### Cannot Do:
❌ Create new capabilities (only grant/revoke existing ones)
❌ Create custom roles (Enterprise future feature)
❌ Customize for individual users (only role-level)
❌ Override Owner role (always has full access)
❌ Bypass subscription tier requirements

### Can Do:
✅ Grant additional capabilities to lower roles
✅ Revoke default capabilities from roles
✅ Reset any role back to defaults at any time
✅ View complete audit trail of all changes
✅ Customize multiple roles simultaneously

### Security Rules:
🔒 Only Organization Owners can customize capabilities
🔒 All changes are logged to security_audit_log
🔒 Requires Business+ subscription tier
🔒 Cannot grant capabilities that require higher tiers
🔒 RLS enforces these rules at database level

---

## 📊 Viewing Custom Capabilities

### For Administrators

```typescript
// Get all customizations for an organization
const { data } = await getOrgCustomCapabilities(orgId);

// Returns:
[
  {
    role: 'member',
    granted: false,  // Revoked
    capabilities: {
      key: 'projects.create',
      name: 'Create Projects',
      category: 'projects'
    }
  },
  {
    role: 'member',
    granted: true,   // Granted
    capabilities: {
      key: 'billing.view',
      name: 'View Billing',
      category: 'billing'
    }
  }
]
```

### For Users

Users see the **effect** of custom capabilities in:
1. **Sidebar navigation** - Only shows accessible items
2. **Action buttons** - Disabled if no capability
3. **Error messages** - "Your role doesn't have access to this feature"

---

## 🔧 Database Operations

### View All Customizations

```sql
SELECT 
  orc.org_id,
  o.company_name,
  orc.role,
  c.key AS capability,
  c.name AS capability_name,
  orc.granted,
  orc.updated_at
FROM org_role_capabilities orc
JOIN organizations o ON o.id = orc.org_id
JOIN capabilities c ON c.id = orc.capability_id
WHERE orc.org_id = 'your-org-id'
ORDER BY orc.role, c.category, c.name;
```

### Compare Custom vs Default

```sql
-- Get side-by-side comparison
SELECT 
  c.key,
  c.name,
  rc.is_default AS default_granted,
  orc.granted AS custom_granted,
  CASE 
    WHEN orc.granted IS NOT NULL THEN 'Custom Override'
    ELSE 'Default'
  END AS source
FROM capabilities c
LEFT JOIN role_capabilities rc 
  ON rc.capability_id = c.id 
  AND rc.role = 'member'
LEFT JOIN org_role_capabilities orc 
  ON orc.capability_id = c.id 
  AND orc.role = 'member'
  AND orc.org_id = 'your-org-id'
ORDER BY c.category, c.name;
```

### Bulk Grant Multiple Capabilities

```sql
-- Grant multiple capabilities at once
INSERT INTO org_role_capabilities (org_id, role, capability_id, granted, updated_by)
SELECT 
  'org-id-here'::uuid,
  'member',
  id,
  true,
  'owner-user-id'::uuid
FROM capabilities
WHERE key IN ('projects.delete', 'team.manage_roles', 'billing.view')
ON CONFLICT (org_id, role, capability_id) 
DO UPDATE SET granted = true, updated_at = now();
```

---

## 🎯 Best Practices

### 1. Document Customizations

Keep a record of why capabilities were customized:

```typescript
// Add metadata to audit log
await logSecurityEvent(
  ownerId,
  orgId,
  'capability_customization',
  'success',
  'info',
  {
    role: 'member',
    changes: [
      { capability: 'projects.create', action: 'revoke', reason: 'Strict project approval required' },
      { capability: 'billing.view', action: 'grant', reason: 'Finance team transparency' }
    ]
  }
);
```

### 2. Regular Audits

Review customizations quarterly:

```typescript
// Get all customizations with timestamps
const { data } = await supabase
  .from('org_role_capabilities')
  .select('*')
  .eq('org_id', orgId)
  .gte('updated_at', thirtyDaysAgo);
  
// Review and validate each customization
```

### 3. Test Before Applying

```typescript
// Test in development/staging first
if (process.env.NODE_ENV === 'development') {
  await grantCustomCapability(orgId, 'member', 'test.capability', ownerId);
  
  // Verify it worked
  const canDo = await userHasCapability(memberUserId, orgId, 'test.capability');
  console.log('Member has test capability:', canDo);
}
```

### 4. Notify Affected Users

```typescript
// After customization, notify affected role members
await sendNotificationToRole(
  orgId,
  'member',
  {
    title: 'Role Capabilities Updated',
    message: 'Your role permissions have been updated by the organization owner.',
    action: 'View Changes',
    link: '/settings/security'
  }
);
```

---

## 🚀 Implementation Checklist

- [x] Database schema supports custom capabilities
- [x] SQL function prioritizes custom overrides
- [x] TypeScript utilities handle both custom and default
- [x] RLS policies enforce access control
- [ ] Server actions for grant/revoke/reset
- [ ] Admin UI page (`/org-settings/roles`)
- [ ] Role capabilities manager component
- [ ] Capability toggle component
- [ ] Upgrade prompt component
- [ ] Audit log viewer for capability changes
- [ ] Bulk operations UI
- [ ] Export/import capability configurations
- [ ] User notifications for capability changes

---

## 📖 Related Files

**Database**:
- `docs/rbac-settings/SETTINGS_DATABASE_SCHEMA.sql` - Table definitions

**Application Code**:
- `apps/protected/lib/rbac/permissions.ts` - Permission utilities
- `apps/protected/app/actions.ts` - Server actions (to be added)

**Documentation**:
- `docs/rbac-settings/RBAC_QUICK_REFERENCE.md` - Default capabilities matrix
- `docs/rbac-settings/DATABASE_RBAC_PROJECTS_PLAN.md` - RBAC architecture

---

## ✅ Summary

**Single Source of Truth**: Database `org_role_capabilities` table

**Priority Order**: Custom Overrides → Default Capabilities

**Access Control**: Business+ tier required, Owners only

**Audit Trail**: All changes logged automatically

**Effect**: Immediate - next permission check uses custom capabilities

**Reset**: Can always reset to defaults (removes all custom overrides)
