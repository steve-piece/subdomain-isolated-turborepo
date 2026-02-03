-- ============================================================================
-- Storage Buckets and Policies
-- Generated: 2026-01-23
-- Source: Remote Supabase Database
-- ============================================================================
-- This file includes:
-- 1. Storage bucket definitions (can be run with regular privileges)
-- 2. RLS policies for storage.objects (requires elevated privileges)
--
-- ============================================================================
-- ERROR: "must be owner of table objects" - TROUBLESHOOTING
-- ============================================================================
-- If you encounter the error: "ERROR: 42501: must be owner of table objects"
--
-- CAUSE:
--   The storage.objects table is owned by the postgres role in Supabase.
--   Creating RLS policies on storage.objects requires elevated privileges
--   (postgres/service_role level), which regular database users don't have.
--
-- SOLUTIONS (choose one):
--
-- 1. USE SUPABASE MIGRATIONS (RECOMMENDED)
--    Migrations automatically run with elevated privileges.
--    Using Supabase MCP tool:
--      mcp_supabase_apply_migration({
--        name: "create_storage_buckets_and_policies",
--        query: <contents of this file>
--      })
--
--    Using Supabase CLI:
--      supabase migration new create_storage_buckets_and_policies
--      # Copy this file's contents to the new migration file
--      supabase db push
--
-- 2. USE SUPABASE DASHBOARD
--    - Navigate to: Storage > Policies
--    - Manually create each policy via the UI
--    - This method runs with service_role privileges automatically
--
-- 3. USE SUPABASE MANAGEMENT API
--    - Use the Management API with your service_role key
--    - Make API calls to create policies programmatically
--    - See: https://supabase.com/docs/reference/api/creating-policies
--
-- 4. SPLIT THE FILE (if you must use execute_sql)
--    - Run bucket creation separately (works with regular privileges)
--    - Run policy creation via one of the methods above
--    - Note: This file contains both, so splitting is required
--
-- IMPORTANT NOTES:
--   - Bucket creation (lines 16-56) CAN work with regular privileges
--   - Policy creation (lines 58-211) REQUIRES elevated privileges
--   - The execute_sql tool uses regular privileges and WILL FAIL on policies
--   - Always use apply_migration for files containing storage policy definitions
-- ============================================================================

-- ============================================================================
-- STORAGE BUCKETS
-- ============================================================================

-- Bucket: organization-logos
-- Public bucket for organization logos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types, created_at, updated_at)
VALUES (
  'organization-logos',
  'organization-logos',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/svg+xml', 'image/webp'],
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types,
  updated_at = NOW();

-- Bucket: profile-avatars
-- Public bucket for user profile avatars
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types, created_at, updated_at)
VALUES (
  'profile-avatars',
  'profile-avatars',
  true,
  2097152, -- 2MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types,
  updated_at = NOW();

-- ============================================================================
-- STORAGE OBJECTS RLS POLICIES
-- ============================================================================
-- Note: RLS is already enabled on storage.objects by default in Supabase
-- 
-- PERMISSIONS REQUIRED: These policies require postgres/service_role privileges
-- to create because storage.objects is owned by the postgres role.
--
-- If you encounter "must be owner of table objects" error:
-- 1. Run this file as a Supabase migration (migrations run with elevated privileges)
-- 2. Or create policies manually via Supabase Dashboard > Storage > Policies
-- 3. Or use the Supabase Management API with service_role key
--
-- The bucket creation above should work with regular privileges.
-- ============================================================================

-- ============================================================================
-- Organization Logos Policies
-- ============================================================================

-- Policy: Organization logos are publicly accessible
DROP POLICY IF EXISTS "Organization logos are publicly accessible" ON storage.objects;
CREATE POLICY "Organization logos are publicly accessible"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'organization-logos');

-- Policy: Users can upload logos for their organization
DROP POLICY IF EXISTS "Users can upload logos for their organization" ON storage.objects;
CREATE POLICY "Users can upload logos for their organization"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'organization-logos' 
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] IN (
    SELECT id::text
    FROM organizations
    WHERE (
      organizations.owner_id = auth.uid()
      OR organizations.id IN (
        SELECT user_profiles.org_id
        FROM user_profiles
        WHERE (
          user_profiles.user_id = auth.uid()
          AND user_profiles.role = ANY (ARRAY['owner'::user_role, 'admin'::user_role, 'superadmin'::user_role])
        )
      )
    )
  )
);

-- Policy: Users can update logos for their organization
DROP POLICY IF EXISTS "Users can update logos for their organization" ON storage.objects;
CREATE POLICY "Users can update logos for their organization"
ON storage.objects
FOR UPDATE
TO public
USING (
  bucket_id = 'organization-logos' 
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] IN (
    SELECT id::text
    FROM organizations
    WHERE (
      organizations.owner_id = auth.uid()
      OR organizations.id IN (
        SELECT user_profiles.org_id
        FROM user_profiles
        WHERE (
          user_profiles.user_id = auth.uid()
          AND user_profiles.role = ANY (ARRAY['owner'::user_role, 'admin'::user_role, 'superadmin'::user_role])
        )
      )
    )
  )
);

-- Policy: Users can delete logos for their organization
DROP POLICY IF EXISTS "Users can delete logos for their organization" ON storage.objects;
CREATE POLICY "Users can delete logos for their organization"
ON storage.objects
FOR DELETE
TO public
USING (
  bucket_id = 'organization-logos' 
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] IN (
    SELECT id::text
    FROM organizations
    WHERE (
      organizations.owner_id = auth.uid()
      OR organizations.id IN (
        SELECT user_profiles.org_id
        FROM user_profiles
        WHERE (
          user_profiles.user_id = auth.uid()
          AND user_profiles.role = ANY (ARRAY['owner'::user_role, 'admin'::user_role, 'superadmin'::user_role])
        )
      )
    )
  )
);

-- ============================================================================
-- Profile Avatars Policies
-- ============================================================================

-- Policy: Users can view all profile avatars
DROP POLICY IF EXISTS "Users can view all profile avatars" ON storage.objects;
CREATE POLICY "Users can view all profile avatars"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'profile-avatars');

-- Policy: Users can upload their own avatar
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
CREATE POLICY "Users can upload their own avatar"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile-avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can update their own avatar
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
CREATE POLICY "Users can update their own avatar"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'profile-avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'profile-avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can delete their own avatar
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
CREATE POLICY "Users can delete their own avatar"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'profile-avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
