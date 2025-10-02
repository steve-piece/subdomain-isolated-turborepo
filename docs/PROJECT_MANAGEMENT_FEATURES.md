# Project Management Features

## Overview

Comprehensive project management functionality with full authorization controls and user experience features.

## ✅ Implemented Features

### 1. **Project Creation**

- Create projects with name and description
- Automatic owner assignment
- Automatic admin permission grant to creator
- Organization-scoped projects

**Files:**

- `apps/protected/app/actions/projects/create.ts`
- `apps/protected/components/projects/create-project-dialog.tsx`

### 2. **Project Deletion**

- Soft delete (updates status to 'deleted')
- Owner-only permission
- Confirmation dialog with project name verification
- Cascade cleanup (RLS handles permissions cleanup)

**Files:**

- `apps/protected/app/actions/projects/delete.ts`
- `apps/protected/components/projects/delete-project-dialog.tsx`

### 3. **Project Archiving**

- Archive projects (status = 'archived')
- Restore archived projects (status = 'active')
- Admin-level permission required
- Hide from active project lists

**Files:**

- `apps/protected/app/actions/projects/delete.ts` (archiveProject, restoreProject)

### 4. **Member Invitation**

- Invite organization members to projects
- Set permission level (read, write, admin)
- Admin-only feature
- Auto-filter already-invited members

**Files:**

- `apps/protected/app/actions/projects/permissions.ts` (grantProjectPermission)
- `apps/protected/components/projects/invite-to-project-dialog.tsx`

### 5. **Permission Management**

- Update member permission levels
- Read: View only
- Write: Edit content
- Admin: Full management access
- Radio button selector with descriptions

**Files:**

- `apps/protected/app/actions/projects/permissions.ts` (updateProjectPermission - NEW)
- `apps/protected/components/projects/manage-permission-dialog.tsx` (NEW)

### 6. **Member Removal**

- Remove users from projects
- Admin-only feature
- Cannot remove last admin
- Revoke all project access

**Files:**

- `apps/protected/app/actions/projects/permissions.ts` (revokeProjectPermission)

### 7. **Leave Project**

- Users can remove themselves from projects
- Cannot leave if sole admin
- Automatic cleanup of permissions
- Redirect to projects list

**Files:**

- `apps/protected/app/actions/projects/delete.ts` (leaveProject)

### 8. **Danger Zone UI**

- Consolidated dangerous actions
- Archive project (admins)
- Delete project (owners only)
- Visual separation with warning styling
- Distinct permissions per action

**Files:**

- `apps/protected/components/projects/project-detail-wrapper.tsx`

## Authorization Matrix

| Action             | Owner | Admin | Write | Read |
| ------------------ | ----- | ----- | ----- | ---- |
| Create Project     | ✅    | ✅    | ✅    | ✅   |
| View Project       | ✅    | ✅    | ✅    | ✅   |
| Update Metadata    | ✅    | ✅    | ❌    | ❌   |
| Invite Members     | ✅    | ✅    | ❌    | ❌   |
| Manage Permissions | ✅    | ✅    | ❌    | ❌   |
| Remove Members     | ✅    | ✅    | ❌    | ❌   |
| Archive Project    | ✅    | ✅    | ❌    | ❌   |
| Delete Project     | ✅    | ❌    | ❌    | ❌   |
| Leave Project      | ✅\*  | ✅\*  | ✅    | ✅   |

\*Cannot leave if sole admin

## Database Schema

### Tables

#### `public.projects`

```sql
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) > 0 AND char_length(name) <= 100),
  description TEXT,
  status public.project_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(org_id, name, status)
);
```

#### `public.project_permissions`

```sql
CREATE TABLE public.project_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission_level public.project_permission_level NOT NULL,
  granted_by UUID NOT NULL REFERENCES auth.users(id),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, user_id)
);
```

### ENUMs

```sql
CREATE TYPE public.project_status AS ENUM ('active', 'archived', 'deleted');
CREATE TYPE public.project_permission_level AS ENUM ('read', 'write', 'admin');
```

## Row Level Security (RLS)

**Note:** RLS is currently disabled for development. Authorization is handled at the application layer by checking:

- User's organization matches project's organization
- User's permission level for specific actions
- Ownership for deletion

For production, simplified RLS policies can be enabled:

- Users can view projects (filtered by org at app layer)
- Owners can insert/update/delete their projects
- Users with permissions can manage what they granted

## Server Actions

### Project Lifecycle

- `createProject(name, description, subdomain)` - Create new project
- `deleteProject(projectId, subdomain)` - Soft delete (owner only)
- `archiveProject(projectId, subdomain)` - Archive (admin)
- `restoreProject(projectId, subdomain)` - Restore (admin)

### Permission Management

- `grantProjectPermission(projectId, userId, permissionLevel, subdomain)` - Add/update member
- `updateProjectPermission(projectId, userId, permissionLevel, subdomain)` - Change permission
- `revokeProjectPermission(projectId, userId, subdomain)` - Remove member
- `leaveProject(projectId, subdomain)` - Remove self

## UI Components

### Dialogs

- `CreateProjectDialog` - Create new projects
- `InviteToProjectDialog` - Invite organization members
- `ManagePermissionDialog` - Update user permissions
- `DeleteProjectDialog` - Confirm project deletion

### Wrappers

- `ProjectsWrapper` - List all projects with empty state
- `ProjectDetailWrapper` - Project details, members, and management

## Error Handling

All actions include:

- ✅ Sentry error logging
- ✅ User-friendly toast notifications
- ✅ Loading states during transitions
- ✅ Validation at both client and server
- ✅ Graceful failure recovery

## Path Revalidation

All mutating actions revalidate affected paths:

```typescript
revalidatePath(`/s/${subdomain}/projects`);
revalidatePath(`/s/${subdomain}/projects/${projectId}`);
```

## Future Enhancements

### Potential Features (Not Implemented)

- Project settings (rename, update description)
- Project templates
- Bulk member management
- Activity logs/audit trail
- Project favoriting
- Search and filtering
- Project duplication
- Transfer ownership
- Custom roles beyond read/write/admin
- Project-specific settings/preferences

## Testing Checklist

- [ ] Create project as owner
- [ ] Create project as member
- [ ] Invite member with read permission
- [ ] Invite member with write permission
- [ ] Invite member with admin permission
- [ ] Update member permission from read to write
- [ ] Update member permission from write to admin
- [ ] Remove member from project
- [ ] Try to remove yourself as admin (should fail if sole admin)
- [ ] Leave project as non-admin
- [ ] Archive project
- [ ] Restore archived project
- [ ] Delete project (verify confirmation)
- [ ] Try to delete project as non-owner (should fail)
- [ ] Verify RLS enforcement in production
