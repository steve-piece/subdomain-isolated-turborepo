# Supabase Storage Setup for Organization Logos

This document outlines the Supabase Storage configuration for organization logo uploads.

## ✅ Current Configuration Status

**Storage Bucket**: `organization-logos`  
**Status**: ✅ **FULLY CONFIGURED AND PRODUCTION-READY**

### Bucket Settings

- ✅ **Public Access**: Enabled (logos are publicly accessible)
- ✅ **File Size Limit**: 5 MB (5,242,880 bytes)
- ✅ **Allowed MIME Types**:
  - `image/jpeg`
  - `image/jpg`
  - `image/png`
  - `image/svg+xml`
  - `image/webp`

### Storage Policies (✅ Already Configured)

The following RLS policies are active and properly secured:

#### 1. **"Organization logos are publicly accessible"** (SELECT)

- **Who**: Public (anyone)
- **What**: Read access to all logos
- **Condition**: Bucket is `organization-logos`

#### 2. **"Users can upload logos for their organization"** (INSERT)

- **Who**: Authenticated users (owners, admins, superadmins)
- **What**: Upload new logos
- **Conditions**:
  - Must be authenticated
  - Must be owner, admin, or superadmin of the organization
  - File path must match user's organization ID (folder structure enforced)

#### 3. **"Users can update logos for their organization"** (UPDATE)

- **Who**: Authenticated users (owners, admins, superadmins)
- **What**: Replace existing logos
- **Conditions**: Same as upload policy

#### 4. **"Users can delete logos for their organization"** (DELETE)

- **Who**: Authenticated users (owners, admins, superadmins)
- **What**: Remove logos
- **Conditions**: Same as upload policy

> **Note**: The policies automatically verify the user's role by checking the `user_profiles` table and matching the folder name (org ID) with the user's organization. This provides strong security - users can only manage logos for organizations where they have admin permissions.

## Bucket Structure

Logos are organized by organization ID:

```
organization-logos/
├── {org-uuid-1}/
│   └── logo-{timestamp}.svg
├── {org-uuid-2}/
│   └── logo-{timestamp}.png
└── ...
```

**Example**: `c999b342-b0ac-46a1-aa2c-d4cf72d19cac/logo-1759279363534.svg`

## Application Integration

### Upload Function

The `uploadOrganizationLogo` server action (`apps/protected/app/actions/onboarding/logo.ts`) handles:

- ✅ **Authentication check** - only logged-in users
- ✅ **Authorization check** - only owners, admins, superadmins
- ✅ **File validation** - type and size (max 5MB)
- ✅ **Automatic cleanup** - deletes old logo when uploading new one
- ✅ **Database update** - stores public URL in `organizations.logo_url`
- ✅ **Path revalidation** - refreshes cached pages

### Usage in Application

**Onboarding Modal:**

- Shows for owners on first login (when `onboarding_completed = false`)
- Logo upload is optional - can skip and add later
- Clicking upload area opens file picker

**Organization Settings:**

- Owners/admins can upload/change logo anytime
- Located in `/s/[subdomain]/org-settings` page
- Same validation and security as onboarding

## Local Development vs Production

### ✅ Production (Fully Working)

Logo upload **works in production** because:

1. ✅ Storage bucket `organization-logos` is created
2. ✅ Policies are properly configured with RBAC
3. ✅ Environment variables are set correctly
4. ✅ File size limits and MIME types enforced

### ⚠️ Local Development

Logo upload **requires remote Supabase** in local development:

**Current Setup:**

- You ARE using remote Supabase (`qnbqrlpvokzgtfevnuzv.supabase.co`)
- ✅ Logo upload **WILL WORK** in local dev

**If you switch to local Supabase:**

- Storage buckets are not available in local Supabase
- Logo uploads will fail
- Alternative: Skip logo during local testing

## Testing Logo Upload

### Quick Test (Manual)

1. **Navigate to onboarding or org settings**
2. **Click logo upload area**
3. **Select a test image** (JPG, PNG, SVG, or WebP, < 5MB)
4. **Submit form**

### Expected Behavior

**✅ Success:**

- Toast: "Logo uploaded successfully!"
- Logo displays in sidebar immediately
- URL saved to database: `organizations.logo_url`
- File stored: `{org-id}/logo-{timestamp}.{ext}`

**❌ Errors:**

- "File too large. Maximum size is 5MB." → Image > 5MB
- "Invalid file type..." → Not JPG/PNG/SVG/WebP
- "Insufficient permissions..." → User not owner/admin
- "Failed to upload logo..." → Network/storage issue (check console)

### Verification

**Check Database:**

```sql
SELECT id, company_name, logo_url
FROM organizations
WHERE id = '{org-id}';
```

**Check Storage:**

```sql
SELECT name, bucket_id, created_at, metadata
FROM storage.objects
WHERE bucket_id = 'organization-logos'
ORDER BY created_at DESC;
```

## Troubleshooting

### Logo upload fails silently

**Check browser console** for detailed errors:

- Network tab → failed requests
- Console → error messages
- Sentry (if configured) → captured exceptions

**Common causes:**

1. Bucket doesn't exist → Already exists, not the issue
2. Policies misconfigured → Already configured correctly
3. File too large → Client-side validation should catch
4. Invalid MIME type → Client-side validation should catch

### Logo doesn't display after upload

**Possible causes:**

1. Cache not revalidated → Check `revalidatePath()` is called
2. Public URL not set → Check `organizations.logo_url` in database
3. Browser cache → Hard refresh (Ctrl+Shift+R / Cmd+Shift+R)
4. CORS issues → Storage bucket is public, shouldn't occur

**Solution:**

```typescript
// Server action already does this:
revalidatePath(`/s/${subdomain}/org-settings`);
revalidatePath(`/s/${subdomain}/dashboard`);
```

### Old logos not deleted

The upload function automatically deletes old logos:

```typescript
// Extract path from old URL and delete
const oldPath = oldOrg.logo_url.split("/").slice(-2).join("/");
await supabase.storage.from("organization-logos").remove([oldPath]);
```

If old files remain, they're orphaned and can be manually deleted from Supabase Dashboard → Storage.

## Security Considerations

- ✅ **File type validation** - Prevents executable uploads
- ✅ **File size limit** - Prevents abuse (5MB enforced by bucket + code)
- ✅ **Authentication required** - No anonymous uploads
- ✅ **Role-based authorization** - Only owners/admins can upload
- ✅ **Org-scoped access** - Users can only manage their own org's logos
- ✅ **Unique filenames** - Timestamp prevents conflicts
- ✅ **Automatic cleanup** - Old logos deleted on replacement
- ✅ **Public read-only** - Anyone can view, but not modify

## Storage Quota

**Supabase Free Tier:** 1 GB storage  
**Supabase Pro Tier:** 100 GB storage

**Logo size considerations:**

- SVG files: ~1-10 KB (recommended for logos)
- PNG files: ~10-500 KB
- JPG files: ~50-1000 KB

With 5MB limit, you can store:

- Free tier: ~200-1000 logos (depending on size)
- Pro tier: ~20,000-100,000 logos

## Related Files

- **Server Actions**:
  - `apps/protected/app/actions/onboarding/logo.ts`
  - `apps/protected/app/actions/onboarding/setup.ts`
- **Components**:
  - `apps/protected/components/shared/onboarding-modal.tsx`
  - `apps/protected/components/shared/onboarding-check.tsx`
- **Pages**:
  - `apps/protected/app/s/[subdomain]/(protected)/(org-settings)/org-settings/page.tsx`
- **Layout**:
  - `apps/protected/app/s/[subdomain]/(protected)/layout.tsx` (onboarding check)

## Summary

✅ **Storage bucket is fully configured and production-ready**  
✅ **Logo uploads work in both local dev and production**  
✅ **Security policies properly enforce RBAC**  
✅ **Automatic file cleanup prevents storage bloat**  
✅ **Public access allows logos to display everywhere**

No additional configuration needed!
