# Database Schema

## Core Tables

### Multi-Tenant Structure

```sql
-- Organizations
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

-- Tenants (subdomain mapping)
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subdomain TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User profiles with tenant relationships
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id),
  org_id UUID REFERENCES organizations(id),
  email TEXT,
  name TEXT,
  bio TEXT,
  avatar_url TEXT,
  phone TEXT,
  timezone TEXT DEFAULT 'UTC',
  role TEXT DEFAULT 'member',
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Billing & Usage

```sql
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

-- Subscriptions
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

-- Feature limits
CREATE TABLE feature_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_id UUID REFERENCES subscription_tiers(id) ON DELETE CASCADE,
  feature_key TEXT NOT NULL,
  limit_value INTEGER,
  reset_period TEXT DEFAULT 'monthly',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Usage counters
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

### Project Management

```sql
-- Projects
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Project permissions
CREATE TABLE project_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  permission TEXT NOT NULL, -- 'admin', 'edit', 'view'
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## RBAC System

### Capabilities

```sql
-- Capabilities (41 total)
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

### User Settings

```sql
-- User notification preferences
CREATE TABLE user_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email_account_activity BOOLEAN DEFAULT TRUE,
  email_team_updates BOOLEAN DEFAULT TRUE,
  email_project_updates BOOLEAN DEFAULT TRUE,
  email_marketing BOOLEAN DEFAULT FALSE,
  digest_frequency TEXT DEFAULT 'realtime',
  quiet_hours_enabled BOOLEAN DEFAULT FALSE,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  timezone TEXT DEFAULT 'UTC',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User security settings
CREATE TABLE user_security_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  password_changed_at TIMESTAMPTZ,
  mfa_enabled BOOLEAN DEFAULT FALSE,
  mfa_enrolled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Active sessions
CREATE TABLE user_active_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT UNIQUE,
  device_info JSONB,
  ip_address INET,
  last_active TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Organization Settings

```sql
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

-- Settings usage tracking
CREATE TABLE settings_usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  feature_key TEXT NOT NULL,
  usage_count INTEGER DEFAULT 0,
  last_used TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Security & Audit

```sql
-- Security audit log
CREATE TABLE security_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID REFERENCES organizations(id),
  event_type TEXT NOT NULL,
  event_description TEXT,
  severity TEXT DEFAULT 'info',
  action_state TEXT DEFAULT 'success',
  ip_address INET,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Views

### Public Views

```sql
-- Public subdomain lookup
CREATE VIEW tenants_public AS
SELECT
  t.subdomain,
  t.name,
  o.name as org_name,
  o.logo_url,
  o.website
FROM tenants t
JOIN organizations o ON t.org_id = o.id
WHERE t.subdomain IS NOT NULL;

-- Organization entitlements
CREATE VIEW org_entitlements AS
SELECT
  o.id as org_id,
  o.name as org_name,
  st.name as tier_name,
  st.allows_custom_permissions,
  st.max_team_members,
  st.features,
  s.status as subscription_status,
  s.current_period_end
FROM organizations o
LEFT JOIN subscriptions s ON o.id = s.org_id
LEFT JOIN subscription_tiers st ON s.tier_id = st.id;
```

## Functions

### Core Functions

```sql
-- Bootstrap new organization
CREATE OR REPLACE FUNCTION bootstrap_organization(
  p_org_name TEXT,
  p_subdomain TEXT,
  p_user_id UUID
) RETURNS UUID AS $$
DECLARE
  v_org_id UUID;
  v_tenant_id UUID;
BEGIN
  -- Create organization
  INSERT INTO organizations (name) VALUES (p_org_name)
  RETURNING id INTO v_org_id;

  -- Create tenant
  INSERT INTO tenants (subdomain, name, org_id)
  VALUES (p_subdomain, p_org_name, v_org_id)
  RETURNING id INTO v_tenant_id;

  -- Create user profile
  INSERT INTO user_profiles (user_id, tenant_id, org_id, role)
  VALUES (p_user_id, v_tenant_id, v_org_id, 'owner');

  RETURN v_org_id;
END;
$$ LANGUAGE plpgsql;

-- Custom access token hook
CREATE OR REPLACE FUNCTION custom_access_token_hook(event JSONB)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_org_id UUID;
  v_role TEXT;
  v_subdomain TEXT;
  v_company_name TEXT;
BEGIN
  v_user_id := (event->>'user_id')::UUID;

  -- Get user's organization and role
  SELECT org_id, role, t.subdomain, o.name
  INTO v_org_id, v_role, v_subdomain, v_company_name
  FROM user_profiles up
  JOIN tenants t ON up.tenant_id = t.id
  JOIN organizations o ON up.org_id = o.id
  WHERE up.user_id = v_user_id;

  -- Add custom claims
  event := jsonb_set(event, '{claims}', jsonb_build_object(
    'org_id', v_org_id,
    'user_role', v_role,
    'subdomain', v_subdomain,
    'company_name', v_company_name
  ));

  RETURN event;
END;
$$ LANGUAGE plpgsql;

-- Feature limit enforcement
CREATE OR REPLACE FUNCTION feature_increment_if_within_limit(
  p_org_id UUID,
  p_feature_key TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_current_usage INTEGER;
  v_usage_limit INTEGER;
BEGIN
  -- Get current usage and limit
  SELECT uc.current_usage, uc.usage_limit
  INTO v_current_usage, v_usage_limit
  FROM usage_counters uc
  WHERE uc.org_id = p_org_id AND uc.feature_key = p_feature_key;

  -- Check if within limit
  IF v_current_usage >= v_usage_limit THEN
    RETURN FALSE;
  END IF;

  -- Increment usage
  UPDATE usage_counters
  SET current_usage = current_usage + 1,
      updated_at = NOW()
  WHERE org_id = p_org_id AND feature_key = p_feature_key;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
```

### RBAC Functions

```sql
-- Check organization access
CREATE OR REPLACE FUNCTION user_org_access(
  p_user_id UUID,
  p_org_id UUID,
  p_required_roles TEXT[]
) RETURNS BOOLEAN AS $$
DECLARE
  v_user_role TEXT;
BEGIN
  SELECT role INTO v_user_role
  FROM user_profiles
  WHERE user_id = p_user_id AND org_id = p_org_id;

  RETURN v_user_role = ANY(p_required_roles);
END;
$$ LANGUAGE plpgsql;

-- Check capability
CREATE OR REPLACE FUNCTION user_org_capability(
  p_user_id UUID,
  p_org_id UUID,
  p_capability_key TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_user_role TEXT;
  v_capability_id UUID;
  v_custom_granted BOOLEAN;
  v_default_granted BOOLEAN;
BEGIN
  -- Get user role
  SELECT role INTO v_user_role
  FROM user_profiles
  WHERE user_id = p_user_id AND org_id = p_org_id;

  -- Get capability ID
  SELECT id INTO v_capability_id
  FROM capabilities
  WHERE key = p_capability_key;

  -- Check custom override first
  SELECT granted INTO v_custom_granted
  FROM org_role_capabilities
  WHERE org_id = p_org_id AND role = v_user_role AND capability_id = v_capability_id;

  IF v_custom_granted IS NOT NULL THEN
    RETURN v_custom_granted;
  END IF;

  -- Check default capability
  SELECT is_default INTO v_default_granted
  FROM role_capabilities
  WHERE role = v_user_role AND capability_id = v_capability_id;

  RETURN COALESCE(v_default_granted, FALSE);
END;
$$ LANGUAGE plpgsql;

-- Check project access
CREATE OR REPLACE FUNCTION user_project_access(
  p_user_id UUID,
  p_project_id UUID,
  p_required_permission TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_user_permission TEXT;
  v_project_org_id UUID;
  v_user_org_role TEXT;
BEGIN
  -- Get project organization
  SELECT org_id INTO v_project_org_id
  FROM projects
  WHERE id = p_project_id;

  -- Get user's role in project organization
  SELECT role INTO v_user_org_role
  FROM user_profiles
  WHERE user_id = p_user_id AND org_id = v_project_org_id;

  -- Check if user has org-level access
  IF v_user_org_role IN ('owner', 'superadmin', 'admin') THEN
    RETURN TRUE;
  END IF;

  -- Check project-specific permission
  SELECT permission INTO v_user_permission
  FROM project_permissions
  WHERE user_id = p_user_id AND project_id = p_project_id;

  RETURN v_user_permission = p_required_permission;
END;
$$ LANGUAGE plpgsql;
```

## Triggers

### Automatic Initialization

```sql
-- Auto-create user settings
CREATE OR REPLACE FUNCTION handle_new_user_settings()
RETURNS TRIGGER AS $$
BEGIN
  -- Create default notification preferences
  INSERT INTO user_notification_preferences (user_id)
  VALUES (NEW.user_id);

  -- Create default security settings
  INSERT INTO user_security_settings (user_id, password_changed_at)
  VALUES (NEW.user_id, NOW());

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_handle_new_user_settings
  AFTER INSERT ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION handle_new_user_settings();

-- Auto-create org settings
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

-- Auto-assign project creator as admin
CREATE OR REPLACE FUNCTION handle_new_project()
RETURNS TRIGGER AS $$
BEGIN
  -- Grant admin access to project creator
  INSERT INTO project_permissions (project_id, user_id, permission, granted_by)
  VALUES (NEW.id, NEW.created_by, 'admin', NEW.created_by);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_handle_new_project
  AFTER INSERT ON projects
  FOR EACH ROW EXECUTE FUNCTION handle_new_project();

-- Update timestamps
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all relevant tables
CREATE TRIGGER trigger_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trigger_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Sync user email
CREATE OR REPLACE FUNCTION sync_user_email()
RETURNS TRIGGER AS $$
BEGIN
  -- Update user profile email when auth user email changes
  UPDATE user_profiles
  SET email = NEW.email
  WHERE user_id = NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_user_email
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW EXECUTE FUNCTION sync_user_email();
```

## Row-Level Security (RLS)

### User Settings RLS

```sql
-- Users can only access their own settings
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own notification preferences" ON user_notification_preferences
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own security settings" ON user_security_settings
  FOR ALL USING (auth.uid() = user_id);
```

### Organization Settings RLS

```sql
-- Organization access control
CREATE POLICY "Users can view own org" ON organizations
  FOR SELECT USING (
    id IN (
      SELECT org_id FROM user_profiles
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Org admins can update org" ON organizations
  FOR UPDATE USING (
    id IN (
      SELECT org_id FROM user_profiles
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
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

### RBAC RLS

```sql
-- Capabilities are read-only for authenticated users
CREATE POLICY "Authenticated users can view capabilities" ON capabilities
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view role capabilities" ON role_capabilities
  FOR SELECT USING (auth.role() = 'authenticated');

-- Custom capabilities require owner role
CREATE POLICY "Owners can manage custom capabilities" ON org_role_capabilities
  FOR ALL USING (
    org_id IN (
      SELECT org_id FROM user_profiles
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );
```

## Indexes

### Performance Indexes

```sql
-- User profile indexes
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX idx_user_profiles_org_id ON user_profiles(org_id);
CREATE INDEX idx_user_profiles_tenant_id ON user_profiles(tenant_id);

-- Organization indexes
CREATE INDEX idx_organizations_name ON organizations(name);
CREATE INDEX idx_tenants_subdomain ON tenants(subdomain);

-- RBAC indexes
CREATE INDEX idx_role_capabilities_role ON role_capabilities(role);
CREATE INDEX idx_org_role_capabilities_org_role ON org_role_capabilities(org_id, role);
CREATE INDEX idx_capabilities_key ON capabilities(key);

-- Project indexes
CREATE INDEX idx_projects_org_id ON projects(org_id);
CREATE INDEX idx_project_permissions_user_project ON project_permissions(user_id, project_id);

-- Security audit log indexes
CREATE INDEX idx_security_audit_log_user_id ON security_audit_log(user_id);
CREATE INDEX idx_security_audit_log_org_id ON security_audit_log(org_id);
CREATE INDEX idx_security_audit_log_created_at ON security_audit_log(created_at);
```

## Migration Scripts

See the complete database setup script in the repository root: `database-setup-idempotent.sql`

This script includes:

- All table definitions
- RLS policies
- Functions and triggers
- Initial data seeding
- Indexes for performance
