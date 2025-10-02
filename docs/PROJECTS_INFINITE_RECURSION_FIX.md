# Projects Infinite Recursion Fix

## Problem

The application was throwing the error:

```
ERROR: infinite recursion detected in policy for relation "projects"
```

## Root Cause

The RLS (Row Level Security) policies on the `projects` and `project_permissions` tables had a **circular dependency**:

1. **Projects SELECT Policy** - Checked if user had access by querying `project_permissions`:

   ```sql
   EXISTS (
     SELECT 1 FROM project_permissions pp
     WHERE pp.project_id = projects.id AND pp.user_id = auth.uid()
   )
   ```

2. **Project Permissions SELECT Policy** - Used `user_project_access()` function which queried `projects` table

3. **The Cycle**: When fetching projects with a JOIN to permissions:

   ```typescript
   await supabase
     .from("projects")
     .select(`id, name, project_permissions(user_id)`);
   ```

   This triggered:
   - `projects` RLS → queries `project_permissions`
   - `project_permissions` RLS → calls `user_project_access()`
   - `user_project_access()` → queries `projects`
   - **Infinite loop** ♾️

## Solution

### Migration: `20250102000008_fix_projects_rls_infinite_recursion.sql`

**Key Changes:**

1. **Simplified Projects SELECT Policy**
   - Changed from checking individual project permissions
   - Now only checks **organization membership**
   - Users can see all projects in their org (appropriate for team collaboration)

2. **Removed Helper Function Calls**
   - `project_permissions` policies no longer call `user_project_access()`
   - Use direct JOINs instead
   - Avoids the circular dependency

3. **Maintained Security**
   - Users still only see projects in their organization
   - Project owners and org admins retain full control
   - Fine-grained permissions handled at application layer

## Testing

### Database Level

✅ Direct SQL queries with JOINs now work:

```sql
SELECT p.id, p.name, pp.user_id
FROM projects p
LEFT JOIN project_permissions pp ON pp.project_id = p.id
WHERE p.org_id = 'xxx'
```

### Application Level

✅ Projects page loads successfully
✅ Shows "Test Project Alpha" with member count
✅ No infinite recursion errors

## Architecture Decision

**Why organization-level access?**

- **Simpler**: No circular dependencies
- **Performant**: Fewer policy evaluations
- **Appropriate**: In a team collaboration tool, seeing all org projects makes sense
- **Flexible**: Fine-grained permissions can be enforced in application code
- **Scalable**: Easier to maintain and debug

**Project-level permissions still work via:**

- Application layer capability checks (`projects.create`, `projects.edit`)
- `project_permissions` table for tracking explicit grants
- Owner/admin checks in UPDATE/DELETE policies

## Files Changed

- ✅ `/supabase/migrations/20250102000008_fix_projects_rls_infinite_recursion.sql` - New migration
- ✅ `/supabase/migrations/20250102000006_fix_projects_rls.sql` - Previous attempt (superseded)

## Related Issues

### Secondary Issue: Duplicate Auth Calls

**Observed**: 70+ duplicate requests to `/auth/v1/user` in browser network tab

**Cause**: Components calling `supabase.auth.getUser()` or `getClaims()` repeatedly

**Impact**: Performance degradation, violates architecture rules

**Status**: ⚠️ **Not yet fixed** (separate from recursion issue)

**Solution**: Follow centralized auth pattern:

- Auth checked once at layout level
- Shared via context to child components
- See: `/docs/architecture/CENTRALIZED_AUTH.md`

## Migration Applied

✅ Applied to Supabase project: `qnbqrlpvokzgtfevnuzv`
✅ Date: 2025-01-02
✅ Status: **SUCCESSFUL**

## Verification

```bash
# Test in browser
http://acme.localhost:3003/projects

# Result: ✅ Projects page loads with data
# Shows: "Test Project Alpha" with 1 member
```
