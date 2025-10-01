# User Settings

## Overview

The user settings system provides comprehensive personal account management with three main areas: profile settings, security settings, and notification preferences.

## Profile Settings (`/settings/profile`)

### Features

- **Personal Information Management**
  - Name, email, bio, timezone
  - Profile picture upload
  - Account context display (organization, role, subdomain)
  - Account deletion (danger zone)

### Implementation

```typescript
// Profile form component
import { ProfileForm } from "@/components/profile-form";

export default function ProfilePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Profile Settings</h1>
        <p className="text-muted-foreground">
          Manage your personal information and account details.
        </p>
      </div>
      <ProfileForm />
    </div>
  );
}
```

### Database Schema

```sql
-- User profile table
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id),
  email TEXT,
  name TEXT,
  bio TEXT,
  avatar_url TEXT,
  phone TEXT,
  timezone TEXT DEFAULT 'UTC',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Security Settings (`/settings/security`)

### Features

- **Security Overview Dashboard**
  - Password management with reset functionality
  - Two-Factor Authentication (2FA) setup via email
  - Active session management
  - Security audit log viewer
  - Real-time security activity feed

### 2FA Implementation

```typescript
// 2FA setup component
import { MFASetup } from "@/components/mfa-setup";

export function SecuritySettings() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Two-Factor Authentication</h2>
        <p className="text-sm text-muted-foreground">
          Add an extra layer of security to your account.
        </p>
      </div>
      <MFASetup />
    </div>
  );
}
```

### Session Management

```typescript
// Session management component
import { SessionManager } from "@/components/session-manager";

export function ActiveSessions() {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium">Active Sessions</h3>
        <p className="text-sm text-muted-foreground">
          Manage your active sessions across devices.
        </p>
      </div>
      <SessionManager />
    </div>
  );
}
```

### Database Schema

```sql
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

## Notification Settings (`/settings/notifications`)

### Features

- **Email Notification Toggles**
  - Account activity notifications
  - Team updates and invitations
  - Project notifications
  - Marketing communications
- **In-App Notification Preferences**
- **Email Digest Frequency**
  - Realtime, daily, weekly, never
- **Quiet Hours Configuration**
  - Timezone support
  - Custom quiet hour ranges

### Implementation

```typescript
// Notification preferences component
import { NotificationPreferencesForm } from "@/components/notification-preferences-form";

export function NotificationSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Notification Preferences</h2>
        <p className="text-sm text-muted-foreground">
          Choose how you want to be notified about activity in your organization.
        </p>
      </div>
      <NotificationPreferencesForm />
    </div>
  );
}
```

### Database Schema

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
```

## Navigation Integration

### Sidebar Navigation

The user settings are integrated into the main navigation sidebar:

```typescript
// Navigation configuration
const userSettingsNav = [
  {
    title: "Profile",
    href: "/settings/profile",
    icon: User,
    description: "Personal information",
  },
  {
    title: "Security",
    href: "/settings/security",
    icon: Shield,
    description: "Password & 2FA",
  },
  {
    title: "Notifications",
    href: "/settings/notifications",
    icon: Bell,
    description: "Email preferences",
  },
];
```

### Route Structure

```
apps/protected/app/s/[subdomain]/(protected)/
├── (user-settings)/
│   └── settings/
│       ├── profile/
│       │   └── page.tsx
│       ├── security/
│       │   ├── page.tsx
│       │   └── audit-log/
│       │       └── page.tsx
│       └── notifications/
│           └── page.tsx
```

## Security Features

### Row-Level Security (RLS)

All user settings tables have RLS enabled:

```sql
-- Users can only access their own settings
CREATE POLICY "Users can view own settings" ON user_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own settings" ON user_profiles
  FOR UPDATE USING (auth.uid() = user_id);
```

### Automatic Initialization

Triggers automatically create default settings for new users:

```sql
-- Auto-create user settings on profile creation
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
```

## Testing

See [Testing Guide](./TESTING_GUIDE.md) for comprehensive testing scenarios for user settings functionality.
