# ⚠️ DEPRECATED AUTH COMPONENTS

## Date: October 2, 2025

The following components are **DEPRECATED** and should not be used in new code.

## Deprecated Components

### 1. `SubdomainAuthChecker`

**File:** `components/shared/subdomain-auth-checker.tsx`

**Why Deprecated:**

- Makes duplicate `getClaims()` API call
- Layout already handles auth
- Creates redundant auth checks

**Migration:**

```tsx
// ❌ OLD - Don't use
import { SubdomainAuthChecker } from "@/components/shared/subdomain-auth-checker";

export default function Page({ params }) {
  return <SubdomainAuthChecker subdomain={params.subdomain} />;
}

// ✅ NEW - Use this
export default async function Page({ params }) {
  const { subdomain } = await params;
  redirect("/dashboard"); // Layout handles auth
}
```

### 2. `RoleProtectedAction`

**File:** `components/shared/role-protected-action.tsx`

**Why Deprecated:**

- Makes `getClaims()` call on every render
- Context provides instant role access
- Creates performance overhead

**Migration:**

```tsx
// ❌ OLD - Don't use
import { RoleProtectedAction } from "@/components/shared/role-protected-action";

<RoleProtectedAction subdomain={subdomain} allowedRoles={["owner", "admin"]}>
  <Button>Admin Action</Button>
</RoleProtectedAction>;

// ✅ NEW - Use this
import { useTenantClaims } from "@/lib/contexts/tenant-claims-context";

function MyComponent() {
  const claims = useTenantClaims();

  if (!["owner", "admin"].includes(claims.user_role)) {
    return null; // Or show disabled state
  }

  return <Button>Admin Action</Button>;
}
```

### 3. `ClientRoleGuard`

**File:** `components/shared/client-role-guard.tsx`

**Why Deprecated:**

- Duplicate auth validation
- Context provides instant access
- Unnecessary complexity

**Migration:**

```tsx
// ❌ OLD - Don't use
import { ClientRoleGuard } from "@/components/shared/client-role-guard";

<ClientRoleGuard subdomain={subdomain} allowedRoles={["owner"]}>
  <AdminPanel />
</ClientRoleGuard>;

// ✅ NEW - Use this
import { useTenantClaims } from "@/lib/contexts/tenant-claims-context";

function MyComponent() {
  const claims = useTenantClaims();
  const router = useRouter();

  useEffect(() => {
    if (!["owner"].includes(claims.user_role)) {
      router.push("/dashboard?error=insufficient_permissions");
    }
  }, [claims.user_role, router]);

  if (!["owner"].includes(claims.user_role)) {
    return <div>Access denied</div>;
  }

  return <AdminPanel />;
}
```

### 4. `ClientTenantAuth`

**File:** `components/shared/client-tenant-auth.tsx`

**Status:** Same as above - use `useTenantClaims()` instead

### 5. `useTenantAccess` Hook

**File:** `packages/ui/src/hooks/use-tenant-access.ts`

**Why Deprecated:**

- Makes `getClaims()` API call on every render
- Caused 70+ duplicate auth calls per page
- Layout provides same data via context

**Migration:**

```tsx
// ❌ OLD - Don't use
import { useTenantAccess } from "@workspace/ui/hooks";

const access = useTenantAccess({
  subdomain,
  allowedRoles: ["owner", "admin"],
  createClient,
});

if (access.state === "allowed") {
  const role = access.claims.claims.user_role;
  return <div>{role}</div>;
}

// ✅ NEW - Use this
import { useTenantClaims } from "@/lib/contexts/tenant-claims-context";

const claims = useTenantClaims(); // No API calls!
const role = claims.user_role; // Direct access
return <div>{role}</div>;
```

## Complete Migration Example

### Before (Old Pattern):

```tsx
"use client";

import { useTenantAccess } from "@workspace/ui/hooks";
import { createClient } from "@/lib/supabase/client";

export function MyFeature({ subdomain }) {
  const access = useTenantAccess({
    subdomain,
    allowedRoles: ["owner", "admin", "superadmin"],
    createClient,
  });

  if (access.state === "checking") {
    return <div>Loading...</div>;
  }

  if (access.state === "denied") {
    return <div>Access denied</div>;
  }

  const userName = access.claims.claims.email;
  const role = access.claims.claims.user_role;

  return (
    <div>
      <p>Hello, {userName}</p>
      <p>Role: {role}</p>
    </div>
  );
}
```

### After (New Pattern):

```tsx
"use client";

import { useTenantClaims } from "@/lib/contexts/tenant-claims-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function MyFeature({ subdomain }) {
  const claims = useTenantClaims(); // ✅ No API calls!
  const router = useRouter();

  // Role check with redirect
  useEffect(() => {
    if (!["owner", "admin", "superadmin"].includes(claims.user_role)) {
      router.push("/dashboard?error=insufficient_permissions");
    }
  }, [claims.user_role, router]);

  // Optional: Show loading during role check
  if (!["owner", "admin", "superadmin"].includes(claims.user_role)) {
    return <div>Checking permissions...</div>;
  }

  return (
    <div>
      <p>Hello, {claims.full_name || claims.email}</p>
      <p>Role: {claims.user_role}</p>
      <p>Organization: {claims.company_name || subdomain}</p>
    </div>
  );
}
```

## Benefits of Migration

### Performance:

- **50% fewer API calls** per page load
- **Instant** access to user data (no waiting)
- **Zero network overhead** for auth checks

### Developer Experience:

- **Simpler code** - no guard state machine
- **Type-safe** - strict union types for roles
- **IntelliSense** - autocomplete for all claim fields
- **Less boilerplate** - direct property access

### User Experience:

- **Faster page loads** - no auth API calls
- **Smoother navigation** - instant role checks
- **Better reliability** - no network dependencies for UI logic

## Timeline for Removal

**Current:** Deprecated with warnings (October 2, 2025)  
**Target:** Remove in Q2 2026 (after 6 months)  
**Action Required:** Migrate all usage before Q2 2026

## See Also

- `/docs/AUTH_REFACTOR_PATTERN.md` - Complete implementation guide
- `/docs/AUTH_REFACTOR_FINAL_SUMMARY.md` - Refactor results
- `/apps/protected/lib/contexts/tenant-claims-context.tsx` - New context API

---

**Status:** These components remain functional but are not recommended for use. Please migrate to `useTenantClaims()` pattern.
