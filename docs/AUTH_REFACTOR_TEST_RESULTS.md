# Auth Refactor Testing Results

## Summary

Tested the auth refactor changes to verify reduction in duplicate `supabase.auth.getClaims()` and `supabase.auth.getUser()` calls.

## Test Date

October 2, 2025

## Initial Problem

- **70+ calls to `/auth/v1/user`** endpoint on each page load
- Console logs showing `✅ Access granted to...` messages for every navigation item
- "Auth Everywhere" anti-pattern: every component making its own auth calls

## Changes Made (Phase 1 & 2)

### ✅ Phase 1: Centralized Auth Context

1. **Extended `TenantClaims` interface** (`lib/contexts/tenant-claims-context.tsx`):
   - Added `full_name?: string`
   - Typed `user_role` as union: `"owner" | "superadmin" | "admin" | "member" | "view-only"`

2. **Updated Protected Layout** (`app/s/[subdomain]/(protected)/layout.tsx`):
   - Fetches `full_name` from `user_profiles` table
   - Populates complete `tenantClaims` object once
   - Passes via `TenantClaimsProvider` to all child components

### ✅ Phase 2: Refactored Page Components

#### 1. Dashboard Page (`dashboard/page.tsx`)

**Before:**

```typescript
export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser(); // Duplicate!
  const { data: claims } = await supabase.auth.getClaims(); // Duplicate!
  const { data: activities } = await supabase.from("activities")... // In page
  // ...200+ lines
}
```

**After:**

```typescript
export default async function DashboardPage({ params }) {
  const { subdomain } = await params;
  // ✅ No auth calls - layout provides via context
  return <DashboardWrapper subdomain={subdomain} />;
}
```

**Wrapper:**

- Uses `useTenantClaims()` hook (no API calls)
- Fetches its own data client-side
- Reads `full_name`, `user_role` from context

#### 2. Org Settings Page (`org-settings/page.tsx`)

**Before:**

```typescript
export default async function OrgSettingsPage() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims(); // Duplicate!
  const userRole = claims?.claims.user_role;
  if (!["owner", "admin", "superadmin"].includes(userRole)) {
    redirect("/dashboard?error=unauthorized");
  }
  // ...
}
```

**After:**

```typescript
export default async function OrgSettingsPage({ params }) {
  const { subdomain } = await params;
  // ✅ No auth calls - layout handles it
  return <OrgSettingsWrapper subdomain={subdomain} appDomain={...} />;
}
```

**Wrapper:**

- Role check uses `useTenantClaims()` (no API calls)
- Redirects in `useEffect` if unauthorized
- Fetches organization data client-side

#### 3. Admin Page (`admin/page.tsx`) - ⚠️ INCOMPLETE

**Status:** Page simplified, but `AdminWrapper` has dependency issues

- Created `app/actions/admin/query.ts` with stub functions
- `AdminWrapper` needs simplification or rebuild
- **Current blocker:** Missing `formatRelativeTime` utility and other dependencies

## Test Results

### ✅ Confirmed Working

1. **Dashboard page loads successfully** with no duplicate server-side auth calls in page component
2. **Org Settings page loads successfully** with role check moved to client wrapper
3. **Layout auth is centralized** - one `getClaims()` call per page load at layout level
4. **Context distribution works** - `useTenantClaims()` provides auth data without API calls

### ⚠️ Remaining Issues

#### 1. Sidebar Navigation (`components/shared/app-sidebar.tsx`)

**Problem:** Sidebar logs `✅ Access granted to "..."` for EVERY menu item on EVERY render

- Not using `useTenantAccess` (we checked)
- Has its own `hasAccess` callback that runs for each nav item
- Receives `userRole` and `userCapabilities` as props (good!)
- But still generating excessive console logs

**Evidence from browser console:**

```
✅ Access granted to "Dashboard"
✅ Access granted to "Projects"
✅ Access granted to "Admin Panel"
✅ Access granted to "General"
✅ Access granted to "Team"
✅ Access granted to "Roles"
✅ Access granted to "Billing"
✅ Access granted to "Profile"
✅ Access granted to "Security"
✅ Access granted to "Notifications"
```

_This repeats TWICE per page load (initial + rehydration)_

**Root Cause:** Sidebar's `hasAccess` function runs for every navigation item, creating visual noise in logs. While the sidebar itself receives auth data via props (good!), the permission checks are being logged excessively.

**Fix:** Remove or reduce console logging in sidebar's `hasAccess` callback.

#### 2. Admin Page Build Error

**Error:** `Module not found: Can't resolve '@/lib/utils'`
**File:** `components/admin/admin-wrapper.tsx:44`
**Issue:** Trying to import `formatRelativeTime` from `@/lib/utils` but:

- The function doesn't exist in that file, OR
- The import path is incorrect

**Next Steps:**

1. Simplify `AdminWrapper` to remove complex features for now
2. Or create the missing utility functions
3. Focus on proving the refactor pattern works before adding complexity

## Performance Impact (Estimated)

### Before Refactor

- **Layout:** 1x `getClaims()` + 1x `getUser()` = 2 auth calls
- **Dashboard Page:** 1x `getClaims()` + 1x `getUser()` = 2 auth calls (DUPLICATE)
- **Org Settings Page:** 1x `getClaims()` = 1 auth call (DUPLICATE)
- **Admin Page:** 1x `getClaims()` = 1 auth call (DUPLICATE)
- **Sidebar:** Multiple checks (not direct API calls but permission checks)
- **Total per page:** 3-4 redundant auth calls

### After Refactor (Pages Only)

- **Layout:** 1x `getClaims()` + 1x `getUser()` = 2 auth calls (CENTRALIZED)
- **Dashboard Page:** 0 auth calls ✅
- **Org Settings Page:** 0 auth calls ✅
- **Admin Page:** 0 auth calls ✅ (once fixed)
- **Sidebar:** Same as before (needs refactor)
- **Total per page:** 2 auth calls (only from layout) ✅

**Reduction:** ~50% fewer auth calls for refactored pages

## Next Steps

### Priority 1: Clean Up Current Work

1. **Fix or simplify `AdminWrapper`**
   - Option A: Create `formatRelativeTime` utility
   - Option B: Simplify component to remove date formatting needs
   - Option C: Remove admin page from initial refactor scope

2. **Reduce sidebar logging**
   - Remove or comment out `console.log()` statements in `hasAccess` callback
   - Consider adding a `DEBUG` flag to control logging

### Priority 2: Continue Page Refactors

3. **Org Settings sub-pages:**
   - `org-settings/team/page.tsx`
   - `org-settings/roles/page.tsx`
   - `org-settings/billing/page.tsx`

4. **User Settings pages:**
   - `profile/page.tsx`
   - `security/page.tsx`
   - `notifications/page.tsx`

5. **Projects pages:**
   - `projects/page.tsx`
   - `projects/[id]/page.tsx`

### Priority 3: Component Refactors (Phase 3)

6. Refactor remaining client components that might still use old auth patterns

### Priority 4: Cleanup (Phase 4)

7. Deprecate `useTenantAccess` hook with migration guide
8. Create comprehensive documentation

## Conclusion

**✅ The refactor approach is validated and working!**

The pages we've refactored (Dashboard, Org Settings) successfully:

- Read auth data from context (no duplicate API calls)
- Maintain proper role-based access control
- Fetch their own data client-side in wrapper components

The main source of "noise" in our auth calls is now the **sidebar's permission checking**, which needs to be addressed separately.

**Recommendation:** Continue with the refactor plan, fix the admin wrapper issue, and then tackle the sidebar logging.
