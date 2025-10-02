# Auth Refactor Pattern Guide

## Overview

This guide documents the centralized auth pattern used to eliminate duplicate `supabase.auth.getClaims()` and `supabase.auth.getUser()` calls throughout the application.

## Core Principle

**Auth is checked ONCE at the layout level and distributed via React Context. Page components never call auth APIs directly.**

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Layout (Server Component)                              │
│  - Calls getClaims() + getUser() ONCE                  │
│  - Fetches user profile data                            │
│  - Creates tenantClaims object                          │
│  └──────────────────────────────────────────────────────┤
│     TenantClaimsProvider (Client Component)             │
│     - Receives tenantClaims as prop                     │
│     - Provides via React Context                        │
│     └──────────────────────────────────────────────────┤
│        Page (Server Component)                          │
│        - NO auth calls                                  │
│        - Fetches page-specific data (optional)          │
│        - Passes data to wrapper                         │
│        └──────────────────────────────────────────────┤
│           Wrapper (Client Component)                    │
│           - usesTenantClaims() hook (NO API CALLS)     │
│           - Performs role checks                        │
│           - Fetches additional data if needed           │
│           - Renders UI                                  │
└─────────────────────────────────────────────────────────┘
```

## Implementation Steps

### 1. Layout (One-Time Setup - Already Done)

**File:** `app/s/[subdomain]/(protected)/layout.tsx`

The layout performs ALL auth operations:

```typescript
export default async function ProtectedLayout({ children, params }) {
  const supabase = await createClient();
  const { subdomain } = await params;

  // ✅ Auth check #1: getClaims (fast, local JWT validation)
  const { data: claims } = await supabase.auth.getClaims();

  // ✅ Auth check #2: getUser (only when metadata needed)
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch additional user data
  const { data: userProfile } = await supabase
    .from("user_profiles")
    .select("full_name")
    .eq("user_id", user.id)
    .single();

  // Build complete claims object
  const tenantClaims = {
    // Identity
    user_id: user.id,
    email: user.email || "",
    full_name: userProfile?.full_name || undefined,

    // Organization Context
    org_id: claims.claims.org_id,
    subdomain: claims.claims.subdomain,
    company_name: claims.claims.company_name,
    organization_logo_url: claims.claims.organization_logo_url,

    // Authorization
    user_role: userRole as "owner" | "superadmin" | "admin" | "member" | "view-only",
    capabilities: userCapabilities,
  };

  return (
    <TenantClaimsProvider claims={tenantClaims}>
      {children}
    </TenantClaimsProvider>
  );
}
```

### 2. Page Component Pattern

**Before (❌ Anti-Pattern):**

```typescript
// DON'T DO THIS
export default async function MyPage({ params }) {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims(); // DUPLICATE!
  const { data: { user } } = await supabase.auth.getUser(); // DUPLICATE!

  // Role check
  if (!["owner", "admin"].includes(claims.claims.user_role)) {
    redirect("/dashboard?error=unauthorized");
  }

  // Fetch data
  const { data } = await supabase.from("table").select();

  return <MyComponent data={data} user={user} />;
}
```

**After (✅ Correct Pattern):**

```typescript
// app/s/[subdomain]/(protected)/my-feature/page.tsx
import { MyFeatureWrapper } from "@/components/my-feature/my-feature-wrapper";

// ✅ Enable caching (adjust based on data freshness needs)
export const revalidate = 60;

export default async function MyFeaturePage({ params }) {
  const { subdomain } = await params;

  // ✅ NO auth calls - layout provides via context
  // ✅ Optional: Fetch page-specific server data if needed
  // const serverData = await getServerData();

  return <MyFeatureWrapper subdomain={subdomain} />;
}
```

### 3. Wrapper Component Pattern

**File:** `components/my-feature/my-feature-wrapper.tsx`

```typescript
"use client";

import { useTenantClaims } from "@/lib/contexts/tenant-claims-context";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getMyFeatureData } from "@/app/actions/my-feature";

interface MyFeatureWrapperProps {
  subdomain: string;
  // serverData?: any; // Optional: if passed from page
}

export function MyFeatureWrapper({ subdomain }: MyFeatureWrapperProps) {
  // ✅ Get user data from context - NO API CALLS!
  const claims = useTenantClaims();
  const router = useRouter();

  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // ✅ Role check using context (if needed)
  useEffect(() => {
    if (!["owner", "admin", "superadmin"].includes(claims.user_role)) {
      router.push("/dashboard?error=insufficient_permissions");
    }
  }, [claims.user_role, router]);

  // ✅ Fetch feature-specific data
  useEffect(() => {
    async function fetchData() {
      try {
        const result = await getMyFeatureData(claims.org_id);
        setData(result);
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [claims.org_id]);

  // Show loading or access denied
  if (!["owner", "admin", "superadmin"].includes(claims.user_role)) {
    return <div className="p-6">Checking permissions...</div>;
  }

  if (isLoading || !data) {
    return <div className="p-6">Loading...</div>;
  }

  // ✅ Access user info from context
  const userName = claims.full_name || claims.email;
  const organizationName = claims.company_name || subdomain;

  return (
    <div className="p-6">
      <h1>Welcome, {userName}</h1>
      <p>Organization: {organizationName}</p>
      {/* Your UI here */}
    </div>
  );
}
```

## Available Context Fields

```typescript
interface TenantClaims {
  // ===== Identity =====
  user_id: string;
  email: string;
  full_name?: string;

  // ===== Organization Context =====
  org_id: string;
  subdomain: string;
  company_name?: string;
  organization_logo_url?: string;

  // ===== Authorization =====
  user_role: "owner" | "superadmin" | "admin" | "member" | "view-only";
  capabilities: string[];
}
```

## Usage in Components

```typescript
import { useTenantClaims } from "@/lib/contexts/tenant-claims-context";

function MyComponent() {
  const claims = useTenantClaims();

  // Access any field
  console.log(claims.user_id);
  console.log(claims.org_id);
  console.log(claims.user_role);
  console.log(claims.capabilities);

  // Check role
  const isAdmin = ["owner", "admin", "superadmin"].includes(claims.user_role);

  // Check capability
  const canEditProjects = claims.capabilities.includes("projects.edit");

  return <div>Welcome, {claims.full_name}</div>;
}
```

## Role-Based Access Control

### Simple Role Check

```typescript
// In wrapper component
useEffect(() => {
  if (!["owner", "admin", "superadmin"].includes(claims.user_role)) {
    router.push("/dashboard?error=insufficient_permissions");
  }
}, [claims.user_role, router]);
```

### Capability-Based Check

```typescript
// In wrapper component
useEffect(() => {
  if (!claims.capabilities.includes("projects.edit")) {
    router.push("/dashboard?error=missing_permission");
  }
}, [claims.capabilities, router]);
```

### Conditional Rendering

```typescript
// In UI component
{["owner", "admin", "superadmin"].includes(claims.user_role) && (
  <Button onClick={handleAdminAction}>Admin Action</Button>
)}

{claims.capabilities.includes("projects.create") && (
  <Button onClick={handleCreateProject}>Create Project</Button>
)}
```

## Caching Strategy

Use `revalidate` for most pages, reserve `noStore()` for critical real-time data:

```typescript
// ✅ Standard pages - cache for 60 seconds
export const revalidate = 60;

// ✅ Frequently updated content - cache for 30 seconds
export const revalidate = 30;

// ⚠️ Real-time critical pages - no cache
import { unstable_noStore as noStore } from "next/cache";
export default async function BillingPage() {
  noStore(); // Only for billing, security, audit logs
  // ...
}
```

## Migration Checklist

When refactoring an existing page:

- [ ] Remove all `supabase.auth.getClaims()` calls
- [ ] Remove all `supabase.auth.getUser()` calls
- [ ] Remove any role checks from page component
- [ ] Create wrapper component if not exists
- [ ] Move UI logic to wrapper component
- [ ] Use `useTenantClaims()` in wrapper for auth data
- [ ] Move role checks to wrapper's `useEffect`
- [ ] Move data fetching to wrapper or server actions
- [ ] Add appropriate `revalidate` value to page
- [ ] Test the page works correctly
- [ ] Verify no duplicate auth calls in browser network tab

## Common Mistakes to Avoid

### ❌ Don't: Call auth APIs in pages

```typescript
// DON'T DO THIS
export default async function Page() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims(); // WRONG!
}
```

### ❌ Don't: Use `noStore()` unnecessarily

```typescript
// DON'T DO THIS unless you need real-time data
import { unstable_noStore as noStore } from "next/cache";
export default async function Page() {
  noStore(); // WRONG! Use revalidate instead
}
```

### ❌ Don't: Make entire component client-side

```typescript
// DON'T DO THIS
"use client";

export default function Page() {
  // This should be server component with client wrapper
}
```

### ✅ Do: Extract granular client components

```typescript
// DO THIS - keep page as server component
export default async function Page() {
  return <ClientWrapper>{/* static content */}</ClientWrapper>;
}

// Separate client component for interactivity
"use client";
export function ClientWrapper({ children }) {
  const claims = useTenantClaims();
  // Interactive logic here
}
```

## Examples by Route Type

### Dashboard-Style Page

- **Caching:** `revalidate = 60`
- **Pattern:** Page → Wrapper (fetches stats)
- **Example:** `/dashboard`

### Settings Page

- **Caching:** `revalidate = 120`
- **Pattern:** Page → Wrapper (fetches org data)
- **Example:** `/org-settings`

### List Page

- **Caching:** `revalidate = 30`
- **Pattern:** Page → Wrapper (fetches list data)
- **Example:** `/projects`

### Detail Page

- **Caching:** `revalidate = 60`
- **Pattern:** Page (fetches item) → Wrapper (renders)
- **Example:** `/projects/[id]`

### Billing Page

- **Caching:** `noStore()`
- **Pattern:** Page → Wrapper (fetches real-time subscription)
- **Example:** `/org-settings/billing`

## Server Actions Pattern

Server actions should use the same principle - check auth once:

```typescript
"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function myAction(data: FormData) {
  const supabase = await createClient();

  // ✅ Check auth once in the action
  const { data: claims } = await supabase.auth.getClaims();

  // Role check
  if (!["owner", "admin"].includes(claims.claims.user_role)) {
    return { error: "Unauthorized" };
  }

  // Perform action
  const result = await supabase.from("table").insert(data);

  // Revalidate affected pages
  revalidatePath("/my-page");

  return { success: true, data: result };
}
```

## Testing Your Refactor

1. **Open browser DevTools → Network tab**
2. **Filter by:** `auth/v1`
3. **Navigate to your refactored page**
4. **Verify:** You should see only 2-3 auth calls total:
   - 1x `token?grant_type=refresh_token` (session refresh)
   - 1x `/user` (from layout's getUser)
   - Maybe 1x from initial session setup

5. **Anti-pattern detection:** If you see multiple `/user` calls, you have duplicate auth checks

## Quick Reference

| Scenario              | Solution                             |
| --------------------- | ------------------------------------ |
| Need user info        | `const claims = useTenantClaims()`   |
| Need role check       | `claims.user_role`                   |
| Need capability check | `claims.capabilities.includes("x")`  |
| Need org ID           | `claims.org_id`                      |
| Need user name        | `claims.full_name` or `claims.email` |
| Data changed          | `revalidatePath("/path")` in action  |
| Page caching          | `export const revalidate = 60`       |
| Real-time data        | `noStore()` (use sparingly)          |

## Summary

**The Golden Rule:** Auth happens ONCE in the layout, everything else reads from context.

This pattern eliminates:

- 70+ duplicate auth API calls
- "Auth Everywhere" anti-pattern
- Network congestion
- Slower page loads
- Unnecessary Supabase requests

While maintaining:

- Proper role-based access control
- Security guarantees
- Type safety
- Developer experience
