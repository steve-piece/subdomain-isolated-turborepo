# Projects Module Status

## ✅ Completed Features

### Database & Security

- ✅ **RLS Enabled** - Both `projects` and `project_permissions` tables have RLS active
- ✅ **Soft Delete** - Projects marked as 'deleted' don't show in lists
- ✅ **Capability-Based Access** - Uses `projects.create` capability to control who can create projects
- ✅ **Comprehensive RLS Policies** - Policies for SELECT, INSERT, UPDATE, DELETE on both tables

### UI Components

- ✅ **Projects List Page** - Shows active projects with member counts
- ✅ **Create Project Dialog** - Modal with name/description fields
- ✅ **Project Detail Page** - Shows project info, members, and management options
- ✅ **Invite Members Dialog** - Add org members to projects with permission levels
- ✅ **Delete Project Dialog** - Confirmation dialog with project name verification
- ✅ **Manage Permissions Dialog** - Change member permission levels (read/write/admin)
- ✅ **"New Project" Button** - Shows only for users with `projects.create` capability

### Server Actions

- ✅ **createProject** - Create new projects with automatic admin permission for creator
- ✅ **deleteProject** - Soft delete (owner only)
- ✅ **archiveProject** - Archive projects (admin+ only)
- ✅ **restoreProject** - Restore archived projects (admin+ only)
- ✅ **leaveProject** - Remove yourself from project (with sole admin check)
- ✅ **grantProjectPermission** - Add members to projects
- ✅ **updateProjectPermission** - Change member permission levels
- ✅ **revokeProjectPermission** - Remove members from projects

## ⚠️ Known Issue

**RLS SELECT Policy Too Restrictive**

The `select_projects` RLS policy might be preventing access to projects because it checks for `project_permissions` entries. When a project is first created, this creates a timing issue.

**Current Policy:**

```sql
user_org_access(auth.uid(), org_id, ARRAY['owner', 'admin', 'superadmin'])
OR owner_id = auth.uid()
OR EXISTS (SELECT 1 FROM project_permissions WHERE project_id = projects.id AND user_id = auth.uid())
```

**Solution Options:**

1. Grant project creator implicit admin access via policy (don't require `project_permissions` row for owner)
2. Use a transaction to create project + permission atomically
3. Adjust policy to allow owners to always see their projects

## Testing Checklist

- [x] Create project functionality
- [x] "New Project" button visibility
- [x] Deleted projects don't show in list
- [x] RLS enabled on both tables
- [ ] Navigate to project detail page
- [ ] Invite members to project
- [ ] Update member permissions
- [ ] Remove member from project
- [ ] Archive/restore project
- [ ] Delete project
- [ ] Leave project

## Migration Files

1. `20250102000005_create_projects_tables.sql` - Initial tables, indexes, RLS policies
2. `20250102000006_fix_projects_rls.sql` - Enable RLS and clean up duplicate policies
3. `20250102000007_add_projects_capability.sql` - (Not needed - used existing `projects.create` capability)

## Next Steps

1. **Fix RLS SELECT policy** - Allow project owners to always see their projects
2. **Complete browser testing** - Verify all management features work end-to-end
3. **Add projects to sidebar** (optional) - Currently only accessible via `/projects` URL
