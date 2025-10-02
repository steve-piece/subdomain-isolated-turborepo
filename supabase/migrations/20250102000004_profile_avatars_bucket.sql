-- ============================================================================
-- Profile Avatars Storage Bucket Setup
-- ============================================================================
-- Creates the profile-avatars storage bucket and sets up RLS policies
-- for user profile pictures.
--
-- This bucket allows users to:
-- - Upload their own profile pictures (max 2MB)
-- - View any user's profile picture (public read)
-- - Update/delete only their own profile pictures
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. Create Storage Bucket
-- ============================================================================

-- Create the profile-avatars bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-avatars',
  'profile-avatars',
  true, -- Public bucket so avatars can be displayed without auth
  2097152, -- 2MB max file size
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 2097152,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

-- ============================================================================
-- 2. Storage Policies
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view all profile avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;

-- Public read access - anyone can view avatars
CREATE POLICY "Users can view all profile avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'profile-avatars');

-- Users can only upload to their own folder (user_id/*)
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile-avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can only update files in their own folder
CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'profile-avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'profile-avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can only delete files in their own folder
CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'profile-avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================================================
-- 3. Documentation
-- ============================================================================

COMMENT ON TABLE storage.buckets IS 'Storage buckets for file uploads. profile-avatars bucket stores user profile pictures.';

-- ============================================================================
-- Migration Completion
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration completed successfully: profile-avatars bucket created';
  RAISE NOTICE 'Bucket configuration:';
  RAISE NOTICE '  - Public access: enabled';
  RAISE NOTICE '  - Max file size: 2MB';
  RAISE NOTICE '  - Allowed types: JPEG, PNG, WebP';
  RAISE NOTICE 'RLS policies:';
  RAISE NOTICE '  - Public read access for all avatars';
  RAISE NOTICE '  - Users can upload/update/delete only their own avatars';
END $$;

COMMIT;

-- ============================================================================
-- Rollback Script (keep for reference)
-- ============================================================================
-- To rollback this migration:
-- 
-- BEGIN;
-- 
-- DROP POLICY IF EXISTS "Users can view all profile avatars" ON storage.objects;
-- DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
-- DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
-- DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
-- 
-- DELETE FROM storage.buckets WHERE id = 'profile-avatars';
-- 
-- COMMIT;

