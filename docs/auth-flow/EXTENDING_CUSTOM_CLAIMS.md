# Extending Custom JWT Claims

Step-by-step guide for adding new fields to custom claims.

## 🎯 Overview

Adding new claims involves 4 steps:

1. Update the SQL function in Supabase
2. Update the TypeScript interface
3. Update the protected layout
4. Test with user re-login

**Time Required**: ~10-15 minutes  
**Difficulty**: Easy to Moderate

---

## Step-by-Step Guide

### Step 1: Update SQL Function in Supabase

**Location**: Supabase Dashboard → Database → Functions → `custom_claims_hook`

#### Example: Adding User's Phone Number

```sql
DECLARE
  claims jsonb;
  user_role text;
  user_subdomain text;
  user_org_id text;
  user_company_name text;
  user_full_name text;
  user_phone_number text;  -- ← ADD: Declare new variable
  -- ... other existing variables
BEGIN
  claims := event->'claims';

  -- Get user metadata from auth.users
  SELECT
    au.raw_user_meta_data->>'full_name',
    au.raw_user_meta_data->>'avatar_url'
  INTO user_full_name, user_avatar_url
  FROM auth.users au
  WHERE au.id = (event->>'user_id')::uuid;

  -- Get user profile and organization data
  SELECT
    up.role::text,
    t.subdomain,
    up.org_id::text,
    t.company_name,
    up.timezone,
    up.language,
    up.profile_picture_url,
    up.phone_number,  -- ← ADD: Fetch new field
    t.logo_url
  INTO
    user_role,
    user_subdomain,
    user_org_id,
    user_company_name,
    user_timezone,
    user_language,
    user_profile_picture_url,
    user_phone_number,  -- ← ADD: Map to variable
    org_logo_url
  FROM public.user_profiles up
  LEFT JOIN public.organizations t ON t.id = up.org_id
  WHERE up.user_id = (event->>'user_id')::uuid
  LIMIT 1;

  -- ... existing claim sets ...

  -- ← ADD: Set new claim
  IF user_phone_number IS NOT NULL THEN
    claims := jsonb_set(claims, '{phone_number}', to_jsonb(user_phone_number));
  END IF;

  event := jsonb_set(event, '{claims}', claims);
  RETURN event;
END;
```

#### Tips for SQL Function

**Fetching from Different Tables**:

```sql
-- From organization_team_settings
SELECT ots.some_field
INTO org_some_field
FROM public.organization_team_settings ots
WHERE ots.org_id = user_org_id::uuid
LIMIT 1;

-- From subscriptions
SELECT s.some_column, st.tier_name
INTO sub_column, sub_tier
FROM public.subscriptions s
LEFT JOIN public.subscription_tiers st ON st.id = s.tier_id
WHERE s.org_id = user_org_id::uuid
LIMIT 1;

-- From custom table
SELECT ct.custom_data
INTO custom_field
FROM public.custom_table ct
WHERE ct.user_id = (event->>'user_id')::uuid
LIMIT 1;
```

---

### Step 2: Update TypeScript Interface

**File**: `apps/protected/lib/contexts/tenant-claims-context.tsx`

```typescript
export interface TenantClaims {
  // ... existing fields ...

  // User preferences
  timezone?: string;
  language?: string;
  profile_picture_url?: string;
  phone_number?: string; // ← ADD: New field

  // ... rest of fields ...
}
```

**Type Guidelines**:

- Use `?` for optional fields (most claims should be optional)
- Use `string` for text, UUIDs, dates
- Use `boolean` for flags
- Use `number` for integers
- Use `string[]` for arrays (keep small!)

---

### Step 3: Update Protected Layout

**File**: `apps/protected/app/s/[subdomain]/(protected)/layout.tsx`

Find the `tenantClaims` object (around line 130) and add your new field:

```typescript
// Prepare claims object for context
const tenantClaims = {
  user_id: user.id,
  email: user.email || "",
  subdomain: claims.claims.subdomain,
  org_id: claims.claims.org_id,
  company_name: claims.claims.company_name,
  full_name: claims.claims.full_name,
  avatar_url: claims.claims.avatar_url,
  user_role: userRole,
  capabilities: userCapabilities,
  // User preferences
  timezone: claims.claims.timezone,
  language: claims.claims.language,
  profile_picture_url: claims.claims.profile_picture_url,
  phone_number: claims.claims.phone_number, // ← ADD: Pass from JWT
  // ... rest of fields ...
};
```

---

### Step 4: Test the New Claim

#### 1. Update the Database

Make sure the source table has data:

```sql
-- Check if field exists and has data
SELECT phone_number FROM public.user_profiles
WHERE user_id = 'your-user-uuid';

-- Update test data if needed
UPDATE public.user_profiles
SET phone_number = '+1-555-0123'
WHERE user_id = 'your-user-uuid';
```

#### 2. Force JWT Refresh

**Option A: Log Out & Back In** (Recommended)

```bash
1. Click logout in app
2. Log back in
3. New JWT will have updated claims
```

**Option B: Wait for Auto-Refresh**

- JWTs refresh automatically ~every hour
- Not recommended for testing

#### 3. Verify in Client Component

```typescript
"use client";
import { useTenantClaims } from "@/lib/contexts/tenant-claims-context";

export function PhoneDisplay() {
  const claims = useTenantClaims();

  console.log("Phone number from claims:", claims.phone_number);

  return (
    <div>
      {claims.phone_number && (
        <p>Phone: {claims.phone_number}</p>
      )}
    </div>
  );
}
```

#### 4. Verify in Server Component

```typescript
import { createClient } from "@/lib/supabase/server";

export default async function TestPage() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();

  console.log("Claims from JWT:", claims.claims);

  return (
    <div>
      <pre>{JSON.stringify(claims.claims, null, 2)}</pre>
    </div>
  );
}
```

---

## Common Scenarios

### Adding Organization-Level Settings

```sql
-- In SQL function
SELECT
  org_settings.setting_name,
  org_settings.setting_value
INTO
  org_setting_name,
  org_setting_value
FROM public.organization_settings org_settings
WHERE org_settings.org_id = user_org_id::uuid
LIMIT 1;

IF org_setting_name IS NOT NULL THEN
  claims := jsonb_set(claims, '{org_setting_name}', to_jsonb(org_setting_name));
END IF;
```

```typescript
// In interface
export interface TenantClaims {
  org_setting_name?: string;
}
```

### Adding Computed/Derived Fields

```sql
-- Example: Is user org owner?
DECLARE is_org_owner boolean;

SELECT (up.role = 'owner')
INTO is_org_owner
FROM public.user_profiles up
WHERE up.user_id = (event->>'user_id')::uuid;

IF is_org_owner IS NOT NULL THEN
  claims := jsonb_set(claims, '{is_org_owner}', to_jsonb(is_org_owner));
END IF;
```

### Adding Feature Flags

```sql
-- Example: Feature flag from separate table
DECLARE feature_analytics_enabled boolean;

SELECT ff.enabled
INTO feature_analytics_enabled
FROM public.feature_flags ff
WHERE ff.org_id = user_org_id::uuid
  AND ff.feature_key = 'analytics'
LIMIT 1;

IF feature_analytics_enabled IS NOT NULL THEN
  claims := jsonb_set(claims, '{features_analytics}', to_jsonb(feature_analytics_enabled));
END IF;
```

```typescript
// In component - feature gating
const claims = useTenantClaims();

{claims.features_analytics && (
  <AnalyticsPanel />
)}
```

### Adding Arrays (Use Sparingly!)

```sql
-- Example: User's recent project IDs
DECLARE user_recent_projects text[];

SELECT ARRAY_AGG(p.id::text ORDER BY p.updated_at DESC)
INTO user_recent_projects
FROM public.projects p
WHERE p.user_id = (event->>'user_id')::uuid
LIMIT 5;  -- Keep small!

IF user_recent_projects IS NOT NULL THEN
  claims := jsonb_set(claims, '{recent_projects}', to_jsonb(user_recent_projects));
END IF;
```

**⚠️ Warning**: Arrays increase JWT size. Keep them small (< 10 items).

---

## Syncing Claims When Data Changes

### Problem

Claims are in JWT → JWT is cached → Data updates don't reflect until re-login

### Solutions

#### Option 1: Sync to auth.users Metadata (Recommended)

For user-specific fields that change rarely:

```typescript
// In your update profile action
export async function updateUserProfile(data: { phone_number?: string }) {
  const supabase = await createClient();

  // Update user_profiles
  await supabase
    .from("user_profiles")
    .update({ phone_number: data.phone_number })
    .eq("user_id", user.id);

  // Sync to auth.users metadata for custom claims
  await supabase.auth.updateUser({
    data: { phone_number: data.phone_number },
  });

  // User's JWT will refresh with new data on next token refresh
}
```

Then in SQL function, prefer reading from `auth.users`:

```sql
SELECT
  au.raw_user_meta_data->>'phone_number'
INTO user_phone_number
FROM auth.users au
WHERE au.id = (event->>'user_id')::uuid;
```

#### Option 2: Force Re-login

For critical updates, force users to re-login:

```typescript
export async function updateCriticalSetting(data) {
  // Update database
  await supabase.from("organizations").update(data).eq("id", orgId);

  // Sign out user to force fresh JWT on next login
  await supabase.auth.signOut();

  // Redirect to login
  redirect("/auth/login?message=settings_updated");
}
```

#### Option 3: Don't Use Claims

For frequently changing data, don't put it in claims:

```typescript
// ❌ BAD: notification_count changes frequently
subscription_tier?: string;         // ✅ Rarely changes
notification_count?: number;        // ❌ Changes often

// Instead, fetch live:
const { data } = await supabase
  .from("notifications")
  .select("count")
  .eq("user_id", userId)
  .eq("read", false);
```

---

## Performance Considerations

### JWT Size Limits

- **Practical limit**: ~4KB (4000 characters)
- **Theoretical limit**: ~8KB (varies by browser/server)
- **Current claims**: ~1-2KB (plenty of room)

### Check JWT Size

```typescript
// Browser console
const token = localStorage.getItem("sb-access-token");
console.log("JWT size:", token?.length, "bytes");
```

### Optimize Large Claims

```sql
-- ❌ BAD: Include full text
SELECT t.long_description INTO org_description
FROM organizations t;

-- ✅ GOOD: Truncate or summarize
SELECT LEFT(t.long_description, 100) INTO org_description_preview
FROM organizations t;
```

---

## Checklist

Use this checklist when adding new claims:

- [ ] Determined source table and column
- [ ] Updated SQL function in Supabase
- [ ] Declared variable in SQL
- [ ] Fetched data in SQL SELECT
- [ ] Set claim with `jsonb_set`
- [ ] Updated `TenantClaims` interface
- [ ] Updated protected layout to pass claim
- [ ] Tested with user re-login
- [ ] Verified claim appears in `useTenantClaims()`
- [ ] Added TypeScript type (string, boolean, etc.)
- [ ] Marked as optional (`?`) if can be null
- [ ] Considered JWT size impact
- [ ] Documented new claim in `CUSTOM_CLAIMS.md`

---

## Troubleshooting

### Claim Not Appearing

1. Check SQL function saved correctly in Supabase
2. Verify database column has data
3. Log out and log back in (force JWT refresh)
4. Check browser console for errors
5. Inspect JWT payload:
   ```typescript
   const { data: claims } = await supabase.auth.getClaims();
   console.log(claims.claims); // Check if your field is here
   ```

### Type Errors

```typescript
// Error: Property 'phone_number' does not exist on type 'TenantClaims'
// Solution: Did you update the interface?

export interface TenantClaims {
  phone_number?: string; // ← Add this
}
```

### SQL Function Errors

Check Supabase logs:

1. Supabase Dashboard → Logs → Auth Logs
2. Look for errors in custom claims hook execution
3. Common issues:
   - Syntax errors in SQL
   - Column doesn't exist
   - Typo in variable name

---

## Examples from Codebase

### Current Implementation

See the full SQL function at the top of this file for reference.

### Current Claims Usage

**Dashboard Greeting**:

```typescript
const claims = useTenantClaims();
const userName = claims.full_name || "and welcome!";
```

**Conditional Invite Button**:

```typescript
{(["owner", "admin"].includes(claims.user_role) ||
  claims.allow_member_invites) && (
  <InviteButton />
)}
```

**Feature Gating**:

```typescript
const isPro = claims.subscription_tier === "pro";
{isPro && <AdvancedFeature />}
```

---

## Related Documentation

- [Custom Claims Overview](./CUSTOM_CLAIMS.md)
- [RBAC Architecture](../rbac-settings/RBAC_ARCHITECTURE.md)
- [Performance & Caching](../PERFORMANCE_CACHING.md)
- [Supabase Custom Claims Docs](https://supabase.com/docs/guides/auth/custom-claims)

---

**Last Updated**: 2025-10-01  
**Version**: 1.0.0
