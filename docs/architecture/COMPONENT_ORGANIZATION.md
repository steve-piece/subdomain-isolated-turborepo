# Component Organization

## Overview

Components are organized by feature with a `shared/` directory for reusable components.

**Why this structure:**

- Easy to locate components
- Clear feature boundaries
- Obvious reusability

## Directory Structure

```
apps/protected/components/
├── auth/                    # Authentication flows
│   ├── login-form.tsx
│   ├── forgot-password-form.tsx
│   ├── update-password-form.tsx
│   ├── accept-invitation-form.tsx
│   └── magic-link-verify.tsx
│
├── dashboard/               # Dashboard-specific
│   ├── dashboard-wrapper.tsx
│   ├── stats-card.tsx
│   ├── activity-feed.tsx
│   └── organization-dashboard.tsx
│
├── profile/                 # User profile
│   ├── profile-view.tsx
│   └── profile-form.tsx
│
├── security/                # Security settings
│   └── security-wrapper.tsx
│
├── notifications/           # Notification preferences
│   └── notification-preferences-form.tsx
│
├── org-settings/            # Organization settings
│   ├── general/
│   │   ├── organization-identity-form.tsx
│   │   └── organization-logo-upload.tsx
│   ├── roles/
│   │   └── role-capabilities-manager.tsx
│   └── team/
│       └── team-list.tsx
│
├── billing/                 # Billing management
│   ├── billing-wrapper.tsx
│   ├── manage-billing-button.tsx
│   └── upgrade-button.tsx
│
└── shared/                  # Used across 2+ routes
    ├── app-sidebar.tsx
    ├── providers.tsx
    ├── logout-button.tsx
    ├── invite-user-dialog.tsx
    ├── role-protected-action.tsx
    ├── require-capability.tsx
    ├── require-tenant-auth.tsx
    ├── client-role-guard.tsx
    ├── subdomain-auth-checker.tsx
    ├── onboarding-modal.tsx
    └── upgrade-prompt.tsx
```

## Component Placement Rules

### Feature-Specific Components

Place in feature directory if component is:

- Used only by that feature/route
- Contains feature-specific logic
- Not intended for reuse

```tsx
// ✅ Feature-specific
components / dashboard / stats - card.tsx;
components / org - settings / general / organization - identity - form.tsx;
components / profile / profile - form.tsx;
```

### Shared Components

Place in `shared/` if component is:

- Used across 2+ routes
- Generic utility/wrapper
- Auth guard or common UI element

```tsx
// ✅ Shared
components / shared / app - sidebar.tsx;
components / shared / logout - button.tsx;
components / shared / invite - user - dialog.tsx;
```

## Page Wrapper Pattern

### Keep Pages Minimal

```tsx
// ✅ CORRECT: Thin page, minimal logic
// apps/protected/app/s/[subdomain]/(protected)/dashboard/page.tsx
export const revalidate = 60;

export default async function DashboardPage() {
  // Optional: Fetch page-specific data
  // const stats = await getDashboardStats();

  return <DashboardWrapper />;
}
```

### Extract UI to Wrappers

```tsx
// ✅ CORRECT: Fat wrapper with UI logic
// components/dashboard/dashboard-wrapper.tsx
"use client";

import { useTenantClaims } from "@/lib/contexts/tenant-claims-context";

export function DashboardWrapper() {
  const claims = useTenantClaims();

  return (
    <div>
      <h1>Welcome, {claims.full_name}</h1>
      {/* All UI logic here */}
    </div>
  );
}
```

## Server vs Client Components

### Server Components (Default)

Use for:

- Static content
- Data fetching
- Page layouts
- SEO-critical content

```tsx
// No "use client" directive
export function StaticContent({ data }) {
  return <div>{data.title}</div>;
}
```

### Client Components (Interactive Only)

Use for:

- User interactions (buttons, forms)
- Browser APIs (localStorage, window)
- React hooks (useState, useEffect)
- Context consumers (useTenantClaims)

```tsx
"use client";

import { useState } from "react";

export function InteractiveButton() {
  const [loading, setLoading] = useState(false);
  // Interactive logic
}
```

### Composition Pattern

```tsx
// ✅ CORRECT: Server component with embedded client components
// components/org-settings/team-page.tsx (server component)
import { TeamList } from "./team-list"; // Server
import { InviteButton } from "./invite-button"; // Client

export function TeamPage({ members }) {
  return (
    <div>
      <h1>Team Members</h1> {/* Static - server rendered */}
      <TeamList members={members} /> {/* Static list - server */}
      <InviteButton /> {/* Interactive - client */}
    </div>
  );
}
```

## Naming Conventions

### Page Wrappers

- Format: `{route}-wrapper.tsx`
- Examples: `dashboard-wrapper.tsx`, `security-wrapper.tsx`

### Feature Components

- Format: `{feature}-{type}.tsx`
- Examples: `team-invite-dialog.tsx`, `stats-card.tsx`

### Shared Components

- Descriptive names
- Examples: `app-sidebar.tsx`, `logout-button.tsx`

## Import Patterns

```tsx
// Auth components
import { LoginForm } from "@/components/auth/login-form";

// Feature-specific
import { DashboardWrapper } from "@/components/dashboard/dashboard-wrapper";
import { ProfileView } from "@/components/profile/profile-view";

// Shared components
import { AppSidebar } from "@/components/shared/app-sidebar";
import { LogoutButton } from "@/components/shared/logout-button";

// Always use @/ alias for absolute imports
```

## Integration with Centralized Auth

### ❌ DON'T - Call Auth APIs Directly

```tsx
"use client";

export function UserProfile() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // ❌ Duplicate API call
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });
  }, []);

  return <div>{user?.email}</div>;
}
```

### ✅ DO - Use Context

```tsx
"use client";

import { useTenantClaims } from "@/lib/contexts/tenant-claims-context";

export function UserProfile() {
  const claims = useTenantClaims(); // No API call!

  return <div>{claims.email}</div>;
}
```

## Example: Creating a New Feature

### 1. Create Feature Directory

```bash
mkdir -p apps/protected/components/projects
```

### 2. Add Feature Components

```bash
# Feature-specific components
components/projects/
├── projects-wrapper.tsx        # Main wrapper
├── project-card.tsx           # Display component
├── create-project-dialog.tsx  # Dialog
└── project-settings-form.tsx  # Form
```

### 3. Create Page

```tsx
// apps/protected/app/s/[subdomain]/(protected)/projects/page.tsx
export const revalidate = 60;

export default async function ProjectsPage() {
  return <ProjectsWrapper />;
}
```

### 4. Implement Wrapper

```tsx
// components/projects/projects-wrapper.tsx
"use client";

import { useTenantClaims } from "@/lib/contexts/tenant-claims-context";
import { ProjectCard } from "./project-card";
import { CreateProjectDialog } from "./create-project-dialog";

export function ProjectsWrapper() {
  const claims = useTenantClaims();

  return (
    <div>
      <h1>{claims.company_name} Projects</h1>
      {/* Feature UI */}
    </div>
  );
}
```

## Migration Checklist

When refactoring existing code:

- [ ] Move components to feature directories
- [ ] Identify shared components → move to `shared/`
- [ ] Extract page logic into wrappers
- [ ] Add `export const revalidate` to pages
- [ ] Replace auth API calls with `useTenantClaims()`
- [ ] Update all import paths
- [ ] Mark only interactive components as `"use client"`
- [ ] Remove `noStore()` unless data is real-time

## Testing

### Component Tests

```tsx
// components/dashboard/dashboard-wrapper.test.tsx
import { render } from "@testing-library/react";
import { DashboardWrapper } from "./dashboard-wrapper";
import { TenantClaimsProvider } from "@/lib/contexts/tenant-claims-context";

describe("DashboardWrapper", () => {
  it("renders user name from context", () => {
    const mockClaims = {
      user_id: "123",
      email: "test@example.com",
      full_name: "Test User",
      // ...
    };

    const { getByText } = render(
      <TenantClaimsProvider claims={mockClaims}>
        <DashboardWrapper />
      </TenantClaimsProvider>
    );

    expect(getByText("Welcome, Test User")).toBeInTheDocument();
  });
});
```

## Best Practices

### ✅ DO

- Organize by feature first
- Use `shared/` for reusable components
- Keep pages as server components
- Extract interactive parts to client components
- Use `useTenantClaims()` for auth data
- Name wrappers as `{route}-wrapper.tsx`

### ❌ DON'T

- Create deep nested directories (2-3 levels max)
- Put everything in `shared/` (only if used 2+ places)
- Mark entire features as `"use client"`
- Make direct Supabase auth calls in components
- Create wrapper-in-wrapper patterns
