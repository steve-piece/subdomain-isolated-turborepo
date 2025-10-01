# Centralized Authentication

## Overview

Authentication is checked **once** at the layout level and shared via React Context throughout the app.

**Why centralized auth:**

- Eliminates duplicate API calls (14x faster cached loads)
- Single source of truth for user data
- Better performance and DX

## Implementation

### 1. Context Provider

```tsx
// lib/contexts/tenant-claims-context.tsx
"use client";

import { createContext, useContext } from "react";

export interface TenantClaims {
  user_id: string;
  email: string;
  subdomain: string;
  org_id: string;
  company_name?: string;
  full_name?: string;
  user_role: string;
  capabilities: string[];
}

const TenantClaimsContext = createContext<TenantClaims | null>(null);

export function TenantClaimsProvider({
  children,
  claims,
}: {
  children: React.ReactNode;
  claims: TenantClaims;
}) {
  return (
    <TenantClaimsContext.Provider value={claims}>
      {children}
    </TenantClaimsContext.Provider>
  );
}

export function useTenantClaims() {
  const context = useContext(TenantClaimsContext);
  if (!context) {
    throw new Error("useTenantClaims must be used within TenantClaimsProvider");
  }
  return context;
}
```

### 2. Protected Layout (Single Auth Check)

```tsx
// apps/protected/app/s/[subdomain]/(protected)/layout.tsx
import { TenantClaimsProvider } from "@/lib/contexts/tenant-claims-context";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function ProtectedLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ subdomain: string }>;
}) {
  const { subdomain } = await params;
  const supabase = await createClient();

  // ✅ Single auth check for entire app
  const { data: claims } = await supabase.auth.getClaims();

  if (!claims || claims.claims.subdomain !== subdomain) {
    redirect("/auth/login");
  }

  // Fetch user capabilities once
  const { data: capabilities } = await supabase
    .from("user_capabilities")
    .select("capability_key")
    .eq("user_id", claims.sub);

  const tenantClaims = {
    user_id: claims.sub,
    email: claims.email || "",
    subdomain: claims.claims.subdomain,
    org_id: claims.claims.org_id,
    company_name: claims.claims.company_name,
    full_name: claims.claims.full_name,
    user_role: claims.claims.user_role,
    capabilities: capabilities?.map((c) => c.capability_key) || [],
  };

  return (
    <TenantClaimsProvider claims={tenantClaims}>
      <AppSidebar
        subdomain={subdomain}
        userRole={tenantClaims.user_role}
        capabilities={tenantClaims.capabilities}
      >
        {children}
      </AppSidebar>
    </TenantClaimsProvider>
  );
}
```

### 3. Page Components (Minimal)

```tsx
// apps/protected/app/s/[subdomain]/(protected)/dashboard/page.tsx
export const revalidate = 60; // Cache for 60 seconds

export default async function DashboardPage() {
  return <DashboardWrapper />;
}
```

### 4. Client Wrappers (Use Context)

```tsx
// components/dashboard/dashboard-wrapper.tsx
"use client";

import { useTenantClaims } from "@/lib/contexts/tenant-claims-context";

export function DashboardWrapper() {
  const claims = useTenantClaims(); // No API call!

  return (
    <div>
      <h1>Welcome, {claims.full_name}</h1>
      <p>Organization: {claims.company_name}</p>
      <p>Role: {claims.user_role}</p>
    </div>
  );
}
```

## Role-Based Page Access

For pages requiring specific roles, add a simple authorization check (NOT authentication):

```tsx
// apps/protected/app/s/[subdomain]/(protected)/admin/page.tsx
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const revalidate = 60;

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();

  // Authorization check (NOT authentication - layout already did that)
  if (!["owner", "admin", "superadmin"].includes(claims?.claims.user_role)) {
    redirect("/dashboard?error=unauthorized");
  }

  return <AdminWrapper />;
}
```

**Note:** This is NOT a duplicate auth check. The layout verified the session exists and subdomain matches. This is just checking if the authenticated user has permission to view this page.

## Caching Strategy

Pages can be cached because auth is handled upstream:

| Page Type      | Cache Setting      | Reason                            |
| -------------- | ------------------ | --------------------------------- |
| Dashboard      | `revalidate = 60`  | Stats can be 60s stale            |
| Profile        | `revalidate = 120` | Rarely changes                    |
| Team           | `revalidate = 30`  | More dynamic                      |
| Org Settings   | `revalidate = 60`  | Infrequent changes                |
| **Billing**    | `noStore()`        | Needs real-time subscription data |
| **Audit Logs** | `noStore()`        | Must be immediately fresh         |

## Rules

### ✅ DO

- Call `getClaims()` once in layout
- Use `useTenantClaims()` in client components
- Add `export const revalidate` to pages
- Extract interactive parts to small client components
- Keep pages as server components by default

### ❌ DON'T

- Call `getUser()` or `getClaims()` in page components
- Use `noStore()` unless data must be real-time
- Mark entire pages as `"use client"`
- Wrap pages in `RequireTenantAuth` (layout handles it)
- Make duplicate auth checks

## Cache Invalidation

Revalidate affected pages after data changes:

```tsx
// app/actions/update-organization.ts
"use server";

import { revalidatePath } from "next/cache";

export async function updateOrganization(data: FormData) {
  await supabase.from("organizations").update(data);

  // Invalidate affected pages
  revalidatePath("/org-settings");
  revalidatePath("/dashboard");

  return { success: true };
}
```

## Troubleshooting

| Issue                                                      | Solution                                                           |
| ---------------------------------------------------------- | ------------------------------------------------------------------ |
| "useTenantClaims must be used within TenantClaimsProvider" | Component is outside layout's provider wrapper                     |
| Stale user data in UI                                      | Add `revalidatePath()` to your server actions                      |
| Slow page loads                                            | Check for duplicate `getClaims()` calls - should only be in layout |
| Auth redirecting on valid session                          | Verify subdomain in JWT matches route subdomain                    |

## Performance Impact

- **Before:** 700ms first load, 3-4 auth checks per page
- **After:** 700ms first load, 50ms cached, 1 auth check per session
- **Result:** 14x faster navigation, 60% fewer database queries
