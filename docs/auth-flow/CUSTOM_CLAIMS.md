# Custom JWT Claims System

Complete guide to the custom claims architecture in this application.

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Current Claims](#current-claims)
- [Usage Examples](#usage-examples)
- [Extending Claims](#extending-claims)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

---

## Overview

Our application uses Supabase's **Custom Claims** feature to include organization and user metadata directly in JWT tokens. This eliminates the need for database queries in client components, improving performance and user experience.

### Benefits

✅ **Performance**: No database calls needed for user/org info in client components  
✅ **Security**: Cryptographically signed JWT prevents tampering  
✅ **Simplicity**: One auth check at layout level, data flows via React Context  
✅ **Type Safety**: Full TypeScript support with `TenantClaims` interface

---

## Architecture

### Flow Diagram

```
┌─────────────────┐
│  User Login     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Supabase Auth   │
│ Custom Claims   │← SQL Function adds claims
│ Hook Triggered  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  JWT Token      │
│  with Claims    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Protected       │← getClaims() reads JWT
│ Layout          │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ TenantClaims    │← Context provides claims
│ Provider        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Client          │← useTenantClaims()
│ Components      │  No API calls!
└─────────────────┘
```

### Key Components

1. **Supabase Custom Claims Function** (`custom_claims_hook` in Supabase)
2. **TenantClaims Interface** (`apps/protected/lib/contexts/tenant-claims-context.tsx`)
3. **Protected Layout** (`apps/protected/app/s/[subdomain]/(protected)/layout.tsx`)
4. **Client Components** (Use `useTenantClaims()` hook)

---

## Current Claims

### Complete Claims Structure

```typescript
export interface TenantClaims {
  // Core Identity
  user_id: string; // UUID of authenticated user
  email: string; // User's email address
  subdomain: string; // Organization subdomain
  org_id: string; // Organization UUID

  // User Profile
  full_name?: string; // User's display name
  avatar_url?: string; // Avatar from auth.users
  profile_picture_url?: string; // Avatar from user_profiles

  // User Preferences
  timezone?: string; // User's timezone (e.g., "America/New_York")
  language?: string; // Preferred language (e.g., "en", "es")

  // Organization Info
  company_name?: string; // Organization display name
  organization_logo_url?: string; // Org logo for branding

  // Permissions & Access
  user_role: string; // "owner" | "admin" | "member" | etc.
  capabilities: string[]; // Array of capability keys

  // Organization Settings
  allow_member_invites?: boolean; // Members can invite others
  require_admin_approval?: boolean; // Invites need approval

  // Subscription
  subscription_tier?: string; // "free" | "pro" | "enterprise"
  subscription_active?: boolean; // Billing status
}
```

### Claims Sources

| Claim                    | Source Table                 | Column                              |
| ------------------------ | ---------------------------- | ----------------------------------- |
| `user_id`                | `auth.users`                 | `id`                                |
| `email`                  | `auth.users`                 | `email`                             |
| `subdomain`              | `organizations`              | `subdomain`                         |
| `org_id`                 | `user_profiles`              | `org_id`                            |
| `full_name`              | `auth.users`                 | `raw_user_meta_data->>'full_name'`  |
| `avatar_url`             | `auth.users`                 | `raw_user_meta_data->>'avatar_url'` |
| `profile_picture_url`    | `user_profiles`              | `profile_picture_url`               |
| `timezone`               | `user_profiles`              | `timezone`                          |
| `language`               | `user_profiles`              | `language`                          |
| `company_name`           | `organizations`              | `company_name`                      |
| `organization_logo_url`  | `organizations`              | `logo_url`                          |
| `user_role`              | `user_profiles`              | `role`                              |
| `capabilities`           | Computed                     | Via `role_capabilities` join        |
| `allow_member_invites`   | `organization_team_settings` | `allow_member_invites`              |
| `require_admin_approval` | `organization_team_settings` | `require_admin_approval`            |
| `subscription_tier`      | `subscription_tiers`         | `name`                              |
| `subscription_active`    | `subscriptions`              | `status`                            |

---

## Usage Examples

### Server Components (Pages, Layouts)

```typescript
// apps/protected/app/s/[subdomain]/(protected)/some-page/page.tsx
import { createClient } from "@/lib/supabase/server";

export default async function SomePage() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();

  // Access claims directly
  const userRole = claims.claims.user_role;
  const orgName = claims.claims.company_name;
  const tier = claims.claims.subscription_tier;

  // Use for conditional rendering
  if (tier !== "pro") {
    return <UpgradePrompt />;
  }

  return <ProFeatures />;
}
```

### Client Components

```typescript
// apps/protected/components/some-feature.tsx
"use client";

import { useTenantClaims } from "@/lib/contexts/tenant-claims-context";

export function SomeFeature() {
  const claims = useTenantClaims();

  // No API calls needed - data is already in memory!
  const userName = claims.full_name || claims.email;
  const userTimezone = claims.timezone || "UTC";
  const canInvite = claims.allow_member_invites ||
                    ["owner", "admin"].includes(claims.user_role);

  return (
    <div>
      <p>Welcome, {userName}!</p>
      {canInvite && <InviteButton />}
    </div>
  );
}
```

### Timezone-Aware Timestamps

```typescript
import { formatInTimeZone } from "date-fns-tz";
import { useTenantClaims } from "@/lib/contexts/tenant-claims-context";

export function ActivityFeed({ activities }) {
  const claims = useTenantClaims();
  const userTz = claims.timezone || "UTC";

  return activities.map(activity => (
    <div key={activity.id}>
      <p>{activity.description}</p>
      <time>
        {formatInTimeZone(activity.created_at, userTz, "PPpp")}
      </time>
    </div>
  ));
}
```

### Feature Gating by Subscription

```typescript
import { useTenantClaims } from "@/lib/contexts/tenant-claims-context";

export function AdvancedAnalytics() {
  const claims = useTenantClaims();
  const isPro = ["pro", "enterprise"].includes(claims.subscription_tier || "");

  if (!isPro) {
    return (
      <UpgradePrompt
        feature="Advanced Analytics"
        requiredTier="pro"
      />
    );
  }

  return <AnalyticsDashboard />;
}
```

### Conditional UI Based on Organization Settings

```typescript
import { useTenantClaims } from "@/lib/contexts/tenant-claims-context";

export function TeamManagement() {
  const claims = useTenantClaims();

  return (
    <div>
      {(["owner", "admin"].includes(claims.user_role) ||
        claims.allow_member_invites) && (
        <Button onClick={openInviteDialog}>
          Invite Team Member
        </Button>
      )}

      {claims.require_admin_approval && (
        <Alert>
          New member invites require admin approval
        </Alert>
      )}
    </div>
  );
}
```

---

## Extending Claims

See [EXTENDING_CUSTOM_CLAIMS.md](./EXTENDING_CUSTOM_CLAIMS.md) for detailed instructions on adding new claims.

### Quick Summary

1. **Update the SQL function** in Supabase Dashboard
2. **Update `TenantClaims` interface** in `tenant-claims-context.tsx`
3. **Update protected layout** to pass new claims
4. **Users must re-login** for JWT to refresh with new claims

---

## Best Practices

### ✅ DO

- **Use claims for UI rendering** - Fast, no database calls
- **Use claims for feature gating** - Instant checks
- **Keep claims small** - JWT size limit is ~4-8KB
- **Use claims for user preferences** - Timezone, language, etc.
- **Validate claims on server** - Never trust client-side alone for security

### ❌ DON'T

- **Don't store sensitive data** - No passwords, API keys, or PII
- **Don't store frequently changing data** - Claims refresh on token renewal
- **Don't store large arrays** - Keep claims lean
- **Don't rely solely on claims for auth** - Always verify on server for critical operations
- **Don't store real-time data** - Use live queries instead

### Security Considerations

```typescript
// ✅ GOOD: Use claims for UI
const claims = useTenantClaims();
if (claims.subscription_tier === "free") {
  return <UpgradePrompt />;
}

// ✅ ALSO GOOD: But verify on server for actions
"use server";
export async function upgradePlan() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();

  // Re-verify subscription status from database
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("status")
    .eq("org_id", claims.claims.org_id)
    .single();

  if (subscription.status !== "active") {
    throw new Error("Subscription not active");
  }

  // Proceed with upgrade...
}
```

---

## Troubleshooting

### Claims Not Updating

**Problem**: Changed user profile but claims still show old data

**Solution**: Claims are cached in the JWT until it expires or user logs out

```bash
# Force claims refresh
1. Log out
2. Log back in
3. JWT will have fresh claims
```

**Auto-refresh**: JWTs typically refresh every hour automatically

### Claim is `undefined`

**Problem**: `claims.some_field` returns `undefined`

**Checklist**:

1. ✅ Updated SQL function in Supabase?
2. ✅ Updated `TenantClaims` interface?
3. ✅ Updated protected layout to pass claim?
4. ✅ User logged out and back in?
5. ✅ Database column has data?

### Type Errors

**Problem**: TypeScript complains about claim types

**Solution**: Make sure interface matches SQL function output

```typescript
// If claim can be null, mark as optional
export interface TenantClaims {
  full_name?: string; // ← Optional with ?
  email: string; // ← Required, no ?
}
```

### Performance Issues

**Problem**: App feels slow with many claims

**Diagnosis**: Check JWT size

```typescript
// In browser console
const token = localStorage.getItem("sb-access-token");
console.log("JWT size:", token.length, "bytes");
// Should be < 4000 bytes
```

**Solution**: Remove unnecessary claims or fetch data separately

---

## Reference

### Related Files

- **Custom Claims Hook**: Supabase Dashboard → Auth → Hooks
- **Interface**: `apps/protected/lib/contexts/tenant-claims-context.tsx`
- **Layout**: `apps/protected/app/s/[subdomain]/(protected)/layout.tsx`
- **Server Supabase**: `apps/protected/lib/supabase/server.ts`
- **Client Hook**: `useTenantClaims()` from context

### Related Documentation

- [Extending Custom Claims](./EXTENDING_CUSTOM_CLAIMS.md)
- [RBAC System](../rbac-settings/RBAC_ARCHITECTURE.md)
- [Performance & Caching](../PERFORMANCE_CACHING.md)
- [Supabase Auth Docs](https://supabase.com/docs/guides/auth/custom-claims)

---

**Last Updated**: 2025-10-01  
**Version**: 1.0.0
