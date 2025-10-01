# Organization Settings

## Overview

Organization settings provide comprehensive management for team structure, billing, and role customization. Access is controlled by user roles and capabilities.

## General Settings (`/org-settings`)

### Features

- **Organization Identity**
  - Name, description, subdomain
  - Logo upload and management
  - Contact information (website, support email, business address)
  - Organization details (ID, creation date, current plan)
  - Danger zone (ownership transfer, organization deletion)

### Implementation

```typescript
// Organization settings page
import { OrganizationIdentityForm } from "@/components/organization-identity-form";
import { OrganizationLogoUpload } from "@/components/organization-logo-upload";

export default function OrganizationSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Organization Settings</h1>
        <p className="text-muted-foreground">
          Manage your organization's identity and settings.
        </p>
      </div>

      <div className="grid gap-6">
        <OrganizationIdentityForm />
        <OrganizationLogoUpload />
      </div>
    </div>
  );
}
```

### Database Schema

```sql
-- Organizations table
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  website TEXT,
  logo_url TEXT,
  support_email TEXT,
  business_address JSONB,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Organization team settings
CREATE TABLE organization_team_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  allow_self_registration BOOLEAN DEFAULT FALSE,
  require_email_verification BOOLEAN DEFAULT TRUE,
  default_role TEXT DEFAULT 'member',
  max_team_size INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Team Management (`/org-settings/team`)

### Features

- **Team Member List**
  - Role badges and status indicators
  - User invitation system
  - Role assignment and management
  - Member removal functionality

### Implementation

```typescript
// Team management component
import { TeamMemberList } from "@/components/team-member-list";
import { InviteUserDialog } from "@/components/invite-user-dialog";

export function TeamManagementPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Team Management</h2>
          <p className="text-sm text-muted-foreground">
            Manage your team members and their roles.
          </p>
        </div>
        <InviteUserDialog />
      </div>

      <TeamMemberList />
    </div>
  );
}
```

### User Invitation System

```typescript
// Invite user form
import { InviteUserForm } from "@/components/invite-user-form";

export function InviteUserDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Invite Team Member</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite Team Member</DialogTitle>
          <DialogDescription>
            Send an invitation to join your organization.
          </DialogDescription>
        </DialogHeader>
        <InviteUserForm />
      </DialogContent>
    </Dialog>
  );
}
```

### Database Schema

```sql
-- User profiles with organization context
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id),
  org_id UUID REFERENCES organizations(id),
  email TEXT,
  name TEXT,
  role TEXT DEFAULT 'member',
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Billing (`/org-settings/billing`)

### Features

- **Current Plan Display**
  - Subscription tier management
  - Usage statistics and quotas
  - Payment method management

### Implementation

```typescript
// Billing dashboard
import { BillingDashboard } from "@/components/billing-dashboard";
import { UsageStats } from "@/components/usage-stats";

export function BillingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Billing & Usage</h2>
        <p className="text-sm text-muted-foreground">
          Manage your subscription and view usage statistics.
        </p>
      </div>

      <div className="grid gap-6">
        <BillingDashboard />
        <UsageStats />
      </div>
    </div>
  );
}
```

### Database Schema

```sql
-- Subscription management
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  tier_id UUID REFERENCES subscription_tiers(id),
  status TEXT DEFAULT 'active',
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subscription tiers
CREATE TABLE subscription_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  price_monthly DECIMAL(10,2),
  price_yearly DECIMAL(10,2),
  allows_custom_permissions BOOLEAN DEFAULT FALSE,
  max_team_members INTEGER,
  features JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Usage tracking
CREATE TABLE usage_counters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  feature_key TEXT NOT NULL,
  current_usage INTEGER DEFAULT 0,
  usage_limit INTEGER,
  reset_period TEXT DEFAULT 'monthly',
  last_reset TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Custom Role Capabilities (`/org-settings/roles`) - Business+ Feature

### Features

- **Role-Based Capability Customization**
  - Grant additional capabilities to lower roles
  - Revoke default capabilities from any role
  - Create custom permission workflows
  - Full audit trail of all permission changes
  - Real-time permission updates
  - Visual indicators for customized roles

### Implementation

```typescript
// Role capabilities manager
import { RoleCapabilitiesManager } from "@/components/role-capabilities-manager";
import { UpgradePrompt } from "@/components/upgrade-prompt";

export default async function RolesCustomizationPage() {
  // Check if org can customize
  const tierCheck = await canCustomizeRoles();

  if (!tierCheck.success || !tierCheck.canCustomize) {
    return (
      <UpgradePrompt
        feature="Custom Role Capabilities"
        requiredTier="Business"
        currentTier={tierCheck.tier || "free"}
        description="Customize what each role can do in your organization with fine-grained permission control."
        benefits={[
          "Grant additional capabilities to lower roles",
          "Revoke default capabilities from any role",
          "Create custom permission workflows",
          "Full audit trail of all changes",
        ]}
      />
    );
  }

  return <RoleCapabilitiesManager />;
}
```

### Server Actions

```typescript
// Import server actions
import {
  grantCustomCapability,
  revokeCustomCapability,
  resetRoleToDefaults,
} from "@/app/actions/rbac/capabilities";
import { canCustomizeRoles } from "@/app/actions/rbac/query";

// Grant custom capability
const result = await grantCustomCapability("admin", "projects.delete");

// Revoke custom capability
const revokeResult = await revokeCustomCapability("member", "billing.manage");

// Reset role to defaults
const resetResult = await resetRoleToDefaults("admin");
```

### Database Schema

```sql
-- Capabilities system
CREATE TABLE capabilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Default role capabilities
CREATE TABLE role_capabilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role TEXT NOT NULL,
  capability_id UUID REFERENCES capabilities(id) ON DELETE CASCADE,
  is_default BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Custom organization role capabilities
CREATE TABLE org_role_capabilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  capability_id UUID REFERENCES capabilities(id) ON DELETE CASCADE,
  granted BOOLEAN NOT NULL,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, role, capability_id)
);
```

## Navigation System

### Collapsible Sidebar

The organization settings are integrated into the main navigation sidebar with role-based filtering:

```typescript
// Sidebar navigation configuration
const orgSettingsNav = [
  {
    title: "General",
    href: "/org-settings",
    icon: Settings,
    description: "Organization identity",
    roles: ["owner", "admin"],
    capabilities: ["org.settings.view"],
  },
  {
    title: "Team",
    href: "/org-settings/team",
    icon: Users,
    description: "Manage team members",
    roles: ["owner", "admin"],
    capabilities: ["team.view"],
  },
  {
    title: "Billing",
    href: "/org-settings/billing",
    icon: CreditCard,
    description: "Plans & invoices",
    roles: ["owner", "admin"],
    capabilities: ["billing.view"],
  },
  {
    title: "Roles",
    href: "/org-settings/roles",
    icon: Shield,
    description: "Custom permissions",
    roles: ["owner"],
    capabilities: ["org.roles.customize"],
    premium: true, // Business+ feature
  },
];
```

### Route Structure

```
apps/protected/app/s/[subdomain]/(protected)/
└── (org-settings)/
    └── org-settings/
        ├── page.tsx           # General settings
        ├── team/
        │   └── page.tsx
        ├── billing/
        │   └── page.tsx
        └── roles/            # Business+ only
            └── page.tsx
```

## Security Features

### Row-Level Security (RLS)

All organization settings tables have RLS enabled:

```sql
-- Organization access control
CREATE POLICY "Users can view own org" ON organizations
  FOR SELECT USING (
    id IN (
      SELECT org_id FROM user_profiles
      WHERE user_id = auth.uid()
    )
  );

-- Team settings access
CREATE POLICY "Org members can view team settings" ON organization_team_settings
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM user_profiles
      WHERE user_id = auth.uid()
    )
  );
```

### Automatic Initialization

Triggers automatically create default settings for new organizations:

```sql
-- Auto-create org settings on organization creation
CREATE OR REPLACE FUNCTION handle_new_org_settings()
RETURNS TRIGGER AS $$
BEGIN
  -- Create default team settings
  INSERT INTO organization_team_settings (org_id)
  VALUES (NEW.id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_handle_new_org_settings
  AFTER INSERT ON organizations
  FOR EACH ROW EXECUTE FUNCTION handle_new_org_settings();
```

## Testing

See [Testing Guide](./TESTING_GUIDE.md) for comprehensive testing scenarios for organization settings functionality.
