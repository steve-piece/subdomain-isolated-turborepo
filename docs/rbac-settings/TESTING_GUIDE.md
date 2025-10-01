# Testing Guide

## Overview

This guide provides comprehensive testing scenarios for the RBAC and settings system. All tests ensure functionality works correctly across different user roles and scenarios.

## Testing Checklist

### ✅ Authentication & Authorization

- [ ] **Login and authentication flows**
  - [ ] Email/password login
  - [ ] Password reset flow
  - [ ] Email verification
  - [ ] Session management
  - [ ] Logout functionality

- [ ] **Role-based access control**
  - [ ] Owner permissions (41 capabilities)
  - [ ] Superadmin permissions (40 capabilities)
  - [ ] Admin permissions (32 capabilities)
  - [ ] Member permissions (9 capabilities)
  - [ ] View-only permissions (4 capabilities)

- [ ] **Capability-based access control**
  - [ ] Project creation permissions
  - [ ] Team management permissions
  - [ ] Billing access permissions
  - [ ] Organization settings permissions
  - [ ] Security settings permissions

### ✅ User Settings

- [ ] **Profile Settings** (`/settings/profile`)
  - [ ] Update personal information
  - [ ] Upload profile picture
  - [ ] Change timezone
  - [ ] Account deletion (danger zone)

- [ ] **Security Settings** (`/settings/security`)
  - [ ] Password change
  - [ ] 2FA setup and verification
  - [ ] Active session management
  - [ ] Security audit log viewing
  - [ ] Session revocation

- [ ] **Notification Settings** (`/settings/notifications`)
  - [ ] Email notification toggles
  - [ ] Digest frequency settings
  - [ ] Quiet hours configuration
  - [ ] Timezone support

### ✅ Organization Settings

- [ ] **General Settings** (`/org-settings`)
  - [ ] Organization identity management
  - [ ] Logo upload
  - [ ] Contact information updates
  - [ ] Danger zone operations

- [ ] **Team Management** (`/org-settings/team`)
  - [ ] User invitation system
  - [ ] Role assignment
  - [ ] Member removal
  - [ ] Team member list display

- [ ] **Billing** (`/org-settings/billing`)
  - [ ] Current plan display
  - [ ] Usage statistics
  - [ ] Subscription management

- [ ] **Custom Role Capabilities** (`/org-settings/roles`) - Business+ only
  - [ ] Tier verification
  - [ ] Capability customization
  - [ ] Role reset functionality
  - [ ] Audit trail verification

### ✅ Navigation & UI

- [ ] **Sidebar Navigation**
  - [ ] Role-based menu filtering
  - [ ] Capability-based menu filtering
  - [ ] Premium feature indicators
  - [ ] Permission count display

- [ ] **Route Protection**
  - [ ] Unauthorized access prevention
  - [ ] Proper redirects
  - [ ] Error handling

### ✅ Security Features

- [ ] **Multi-Factor Authentication**
  - [ ] 2FA setup flow
  - [ ] Email verification codes
  - [ ] MFA challenge/response
  - [ ] Factor management

- [ ] **Session Management**
  - [ ] Active session tracking
  - [ ] Session revocation
  - [ ] Device identification
  - [ ] IP address logging

- [ ] **Security Audit Log**
  - [ ] Event logging
  - [ ] Severity levels
  - [ ] Action states
  - [ ] Metadata tracking

## Test Scenarios

### 1. User Registration & Onboarding

```typescript
// Test user registration flow
describe("User Registration", () => {
  test("should create user profile with default settings", async () => {
    const user = await createTestUser();

    // Verify user profile creation
    const profile = await getUserProfile(user.id);
    expect(profile).toBeDefined();
    expect(profile.role).toBe("member");

    // Verify default settings creation
    const notificationPrefs = await getUserNotificationPreferences(user.id);
    const securitySettings = await getUserSecuritySettings(user.id);

    expect(notificationPrefs).toBeDefined();
    expect(securitySettings).toBeDefined();
  });
});
```

### 2. Organization Creation & Setup

```typescript
// Test organization creation
describe("Organization Setup", () => {
  test("should create organization with default settings", async () => {
    const org = await createTestOrganization();

    // Verify organization creation
    expect(org.id).toBeDefined();
    expect(org.name).toBe("Test Organization");

    // Verify default team settings
    const teamSettings = await getOrganizationTeamSettings(org.id);
    expect(teamSettings).toBeDefined();
    expect(teamSettings.allow_self_registration).toBe(false);
  });
});
```

### 3. Role-Based Access Control

```typescript
// Test RBAC functionality
describe("Role-Based Access Control", () => {
  test("owner should have all capabilities", async () => {
    const owner = await createTestUser({ role: "owner" });
    const permissions = await getUserPermissions(owner.id, orgId);

    expect(permissions.capabilities).toHaveLength(41);
    expect(permissions.capabilities).toContain("org.delete");
    expect(permissions.capabilities).toContain("org.roles.customize");
  });

  test("member should have limited capabilities", async () => {
    const member = await createTestUser({ role: "member" });
    const permissions = await getUserPermissions(member.id, orgId);

    expect(permissions.capabilities).toHaveLength(9);
    expect(permissions.capabilities).not.toContain("org.delete");
    expect(permissions.capabilities).not.toContain("team.invite");
  });
});
```

### 4. Custom Role Capabilities

```typescript
// Test custom role capabilities (Business+ tier)
describe("Custom Role Capabilities", () => {
  test("should grant custom capability to role", async () => {
    const result = await grantCustomCapability("member", "team.invite");

    expect(result.success).toBe(true);

    // Verify capability was granted
    const memberPermissions = await getUserPermissions(memberId, orgId);
    expect(memberPermissions.capabilities).toContain("team.invite");
  });

  test("should revoke custom capability from role", async () => {
    const result = await revokeCustomCapability("admin", "projects.delete");

    expect(result.success).toBe(true);

    // Verify capability was revoked
    const adminPermissions = await getUserPermissions(adminId, orgId);
    expect(adminPermissions.capabilities).not.toContain("projects.delete");
  });
});
```

### 5. Security Features

```typescript
// Test security features
describe("Security Features", () => {
  test("should log security events", async () => {
    await logSecurityEvent(userId, orgId, "login", "success");

    const events = await getSecurityEvents(userId);
    expect(events).toHaveLength(1);
    expect(events[0].event_type).toBe("login");
    expect(events[0].action_state).toBe("success");
  });

  test("should enforce RLS policies", async () => {
    // Test that users can only access their own data
    const otherUserData = await getUserSecuritySettings(otherUserId);
    expect(otherUserData).toBeNull();

    const ownData = await getUserSecuritySettings(userId);
    expect(ownData).toBeDefined();
  });

  test("should validate MFA setup", async () => {
    const mfaResult = await setupMFA(userId);
    expect(mfaResult.success).toBe(true);
    expect(mfaResult.mfaEnabled).toBe(true);
  });
});
```

### 6. Navigation Filtering

```typescript
// Test navigation filtering
describe("Navigation Filtering", () => {
  test("should filter navigation based on capabilities", async () => {
    const memberPermissions = await getUserPermissions(memberId, orgId);
    const filteredNav = filterNavigationByPermissions(
      navigationItems,
      memberPermissions
    );

    // Member should not see admin-only items
    expect(filteredNav).not.toContainEqual(
      expect.objectContaining({ href: "/org-settings/roles" })
    );

    // Member should see allowed items
    expect(filteredNav).toContainEqual(
      expect.objectContaining({ href: "/settings/profile" })
    );
  });
});
```

### 7. Component Testing

```typescript
// Test React components
describe('Component Testing', () => {
  test('RequireCapability should render children when user has capability', () => {
    render(
      <RequireCapability
        orgId={orgId}
        capability="projects.create"
        fallback={<div>No access</div>}
      >
        <div>Create Project Button</div>
      </RequireCapability>
    );

    expect(screen.getByText('Create Project Button')).toBeInTheDocument();
  });

  test('RequireCapability should render fallback when user lacks capability', () => {
    render(
      <RequireCapability
        orgId={orgId}
        capability="org.delete"
        fallback={<div>No access</div>}
      >
        <div>Delete Organization Button</div>
      </RequireCapability>
    );

    expect(screen.getByText('No access')).toBeInTheDocument();
    expect(screen.queryByText('Delete Organization Button')).not.toBeInTheDocument();
  });
});
```

## Integration Testing

### End-to-End Scenarios

#### Scenario 1: Complete User Onboarding

```typescript
describe("Complete User Onboarding", () => {
  test("should complete full user onboarding flow", async () => {
    // 1. User signs up
    const user = await signUpUser("test@example.com", "password123");

    // 2. User creates organization
    const org = await createOrganization("Test Org", "test-org");

    // 3. User becomes owner
    await updateUserRole(user.id, org.id, "owner");

    // 4. User sets up profile
    await updateUserProfile(user.id, {
      name: "Test User",
      bio: "Test bio",
      timezone: "UTC",
    });

    // 5. User configures notifications
    await updateNotificationPreferences(user.id, {
      email_account_activity: true,
      email_team_updates: true,
      digest_frequency: "daily",
    });

    // 6. User sets up 2FA
    await setupMFA(user.id);

    // Verify all settings are properly configured
    const profile = await getUserProfile(user.id);
    const notifications = await getUserNotificationPreferences(user.id);
    const security = await getUserSecuritySettings(user.id);

    expect(profile.name).toBe("Test User");
    expect(notifications.digest_frequency).toBe("daily");
    expect(security.mfa_enabled).toBe(true);
  });
});
```

#### Scenario 2: Team Management Workflow

```typescript
describe("Team Management Workflow", () => {
  test("should complete team management workflow", async () => {
    // 1. Owner invites team member
    const inviteResult = await inviteUser("member@example.com", "admin");
    expect(inviteResult.success).toBe(true);

    // 2. Member accepts invitation
    const member = await acceptInvitation(inviteResult.token);

    // 3. Owner assigns role
    await updateUserRole(member.id, orgId, "admin");

    // 4. Admin manages projects
    const project = await createProject("Test Project");
    expect(project).toBeDefined();

    // 5. Admin invites another member
    const secondInvite = await inviteUser("member2@example.com", "member");

    // Verify team structure
    const teamMembers = await getTeamMembers(orgId);
    expect(teamMembers).toHaveLength(3); // Owner + 2 members
  });
});
```

## Performance Testing

### Database Performance

```typescript
describe("Database Performance", () => {
  test("should handle large user bases efficiently", async () => {
    const startTime = Date.now();

    // Create 1000 users
    const users = await Promise.all(
      Array.from({ length: 1000 }, (_, i) =>
        createTestUser({ email: `user${i}@example.com` })
      )
    );

    const endTime = Date.now();
    const duration = endTime - startTime;

    expect(duration).toBeLessThan(30000); // Should complete within 30 seconds
    expect(users).toHaveLength(1000);
  });

  test("should efficiently query user permissions", async () => {
    const startTime = Date.now();

    // Query permissions for 100 users
    const permissionPromises = Array.from({ length: 100 }, () =>
      getUserPermissions(userId, orgId)
    );

    await Promise.all(permissionPromises);

    const endTime = Date.now();
    const duration = endTime - startTime;

    expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
  });
});
```

## Security Testing

### Authentication Security

```typescript
describe("Authentication Security", () => {
  test("should prevent unauthorized access", async () => {
    // Attempt to access protected resource without authentication
    const response = await fetch("/api/protected-resource");
    expect(response.status).toBe(401);
  });

  test("should enforce session expiration", async () => {
    const session = await createSession(userId);

    // Simulate session expiration
    await expireSession(session.id);

    // Attempt to use expired session
    const response = await fetch("/api/protected-resource", {
      headers: { Authorization: `Bearer ${session.token}` },
    });

    expect(response.status).toBe(401);
  });
});
```

### Data Security

```typescript
describe("Data Security", () => {
  test("should enforce RLS policies", async () => {
    // Test that users cannot access other users' data
    const otherUserData = await getUserProfile(otherUserId);
    expect(otherUserData).toBeNull();

    // Test that users cannot access other organizations' data
    const otherOrgData = await getOrganizationSettings(otherOrgId);
    expect(otherOrgData).toBeNull();
  });

  test("should prevent privilege escalation", async () => {
    const member = await createTestUser({ role: "member" });

    // Attempt to escalate privileges
    const result = await updateUserRole(member.id, orgId, "owner");
    expect(result.success).toBe(false);
    expect(result.message).toContain("unauthorized");
  });
});
```

## Test Data Management

### Test Data Setup

```typescript
// Test data utilities
export async function createTestUser(overrides = {}) {
  const user = await supabase.auth.admin.createUser({
    email: `test-${Date.now()}@example.com`,
    password: "testpassword123",
    ...overrides,
  });

  return user.data.user;
}

export async function createTestOrganization(overrides = {}) {
  const org = await supabase
    .from("organizations")
    .insert({
      name: "Test Organization",
      ...overrides,
    })
    .select()
    .single();

  return org.data;
}

export async function cleanupTestData() {
  // Clean up test data after tests
  await supabase
    .from("security_audit_log")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase
    .from("user_profiles")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase
    .from("organizations")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");
}
```

### Test Environment Setup

```typescript
// Test environment configuration
beforeAll(async () => {
  // Set up test database
  await setupTestDatabase();

  // Create test users and organizations
  await createTestData();
});

afterAll(async () => {
  // Clean up test data
  await cleanupTestData();
});

beforeEach(async () => {
  // Reset test state
  await resetTestState();
});
```

## Continuous Integration

### Automated Testing Pipeline

```yaml
# GitHub Actions workflow
name: RBAC Testing
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: "20"

      - name: Install dependencies
        run: pnpm install

      - name: Run unit tests
        run: pnpm test

      - name: Run integration tests
        run: pnpm test:integration

      - name: Run security tests
        run: pnpm test:security
```

## Test Coverage

### Coverage Requirements

- **Unit Tests**: 90%+ coverage for utility functions
- **Integration Tests**: 80%+ coverage for API endpoints
- **Component Tests**: 85%+ coverage for React components
- **Security Tests**: 100% coverage for security-critical functions

### Coverage Reporting

```typescript
// Coverage configuration
export default {
  collectCoverage: true,
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "html"],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 85,
      lines: 90,
      statements: 90,
    },
  },
};
```

## Debugging Tests

### Test Debugging Tools

```typescript
// Test debugging utilities
export function debugTestState() {
  console.log("Current test state:", {
    users: testUsers.length,
    organizations: testOrganizations.length,
    sessions: activeSessions.length,
  });
}

export async function dumpDatabaseState() {
  const tables = ["user_profiles", "organizations", "security_audit_log"];

  for (const table of tables) {
    const { data } = await supabase.from(table).select("*");
    console.log(`${table}:`, data);
  }
}
```

### Common Test Issues

1. **Async/Await**: Ensure all async operations are properly awaited
2. **Database State**: Clean up test data between tests
3. **Authentication**: Mock authentication for unit tests
4. **Timing**: Use proper timeouts for integration tests
5. **Environment**: Ensure test environment is properly configured
