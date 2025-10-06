-- ============================================================================
-- Migration: pending_invitations_table
-- ============================================================================
-- Name: pending_invitations_table
-- Version: 20250107
-- Author: System
-- Date: 2025-01-07
-- Description: Creates pending_invitations table for admin approval workflow.
--              Supports organizations that require admin approval for new members.
-- Dependencies: 
--   - public.organizations table
--   - public.user_role enum type
--   - auth.users table
-- Impact: 
--   - Creates new pending_invitations table
--   - Adds RLS policies for secure access
--   - Creates indexes for performance
-- Risk Assessment: Low
--   - New table, no impact on existing data
--   - Idempotent with IF NOT EXISTS
-- Rollback Plan: 
--   DROP TABLE IF EXISTS public.pending_invitations CASCADE;
-- Post-migration Actions: 
--   - Verify RLS policies working
--   - Test invite approval workflow
-- ============================================================================

BEGIN;

SET statement_timeout = '30s';

-- ============================================================================
-- Step 1: Create invitation_status enum
-- ============================================================================

CREATE TYPE public.invitation_status AS ENUM (
  'pending',
  'approved',
  'rejected',
  'expired'
);

COMMENT ON TYPE public.invitation_status IS
'Status of pending invitations. pending = awaiting approval, approved = accepted by admin, rejected = declined by admin, expired = invitation link expired.';

-- ============================================================================
-- Step 2: Create pending_invitations table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.pending_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  proposed_role public.user_role NOT NULL,
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  status public.invitation_status NOT NULL DEFAULT 'pending',
  invitation_token TEXT UNIQUE, -- Supabase auth invitation token
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  rejected_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_pending_invite_per_org UNIQUE(org_id, email, status),
  CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$'),
  CONSTRAINT approval_consistency CHECK (
    (status = 'approved' AND approved_by IS NOT NULL AND approved_at IS NOT NULL) OR
    (status != 'approved')
  ),
  CONSTRAINT rejection_consistency CHECK (
    (status = 'rejected' AND rejected_by IS NOT NULL AND rejected_at IS NOT NULL) OR
    (status != 'rejected')
  )
);

-- Table comment
COMMENT ON TABLE public.pending_invitations IS
'Stores pending member invitations awaiting admin approval. Used when organizations have require_admin_approval enabled in team settings.';

-- Column comments
COMMENT ON COLUMN public.pending_invitations.id IS 'Unique invitation identifier';
COMMENT ON COLUMN public.pending_invitations.org_id IS 'Organization this invitation is for';
COMMENT ON COLUMN public.pending_invitations.email IS 'Email address of invited user';
COMMENT ON COLUMN public.pending_invitations.proposed_role IS 'Role that will be assigned upon approval';
COMMENT ON COLUMN public.pending_invitations.invited_by IS 'User who sent the invitation';
COMMENT ON COLUMN public.pending_invitations.status IS 'Current status: pending, approved, rejected, or expired';
COMMENT ON COLUMN public.pending_invitations.invitation_token IS 'Supabase auth invitation token for tracking';
COMMENT ON COLUMN public.pending_invitations.approved_by IS 'Admin who approved the invitation';
COMMENT ON COLUMN public.pending_invitations.approved_at IS 'Timestamp when approved';
COMMENT ON COLUMN public.pending_invitations.rejected_by IS 'Admin who rejected the invitation';
COMMENT ON COLUMN public.pending_invitations.rejected_at IS 'Timestamp when rejected';
COMMENT ON COLUMN public.pending_invitations.rejection_reason IS 'Optional reason for rejection';
COMMENT ON COLUMN public.pending_invitations.expires_at IS 'Invitation expiration date (default 7 days)';

-- ============================================================================
-- Step 3: Create indexes for performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_pending_invitations_org_id 
  ON public.pending_invitations(org_id);

CREATE INDEX IF NOT EXISTS idx_pending_invitations_status 
  ON public.pending_invitations(status) 
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_pending_invitations_email 
  ON public.pending_invitations(email);

CREATE INDEX IF NOT EXISTS idx_pending_invitations_expires_at 
  ON public.pending_invitations(expires_at) 
  WHERE status = 'pending';

-- ============================================================================
-- Step 4: Enable Row Level Security
-- ============================================================================

ALTER TABLE public.pending_invitations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view pending invitations for their organization (if admin+)
CREATE POLICY "Users can view org pending invitations"
  ON public.pending_invitations
  FOR SELECT
  USING (
    org_id IN (
      SELECT org_id 
      FROM public.user_profiles 
      WHERE user_id = auth.uid() 
        AND role IN ('owner', 'admin', 'superadmin')
    )
  );

-- Policy: Admins can update pending invitations (approve/reject)
CREATE POLICY "Admins can manage pending invitations"
  ON public.pending_invitations
  FOR UPDATE
  USING (
    org_id IN (
      SELECT org_id 
      FROM public.user_profiles 
      WHERE user_id = auth.uid() 
        AND role IN ('owner', 'admin', 'superadmin')
    )
  );

-- Policy: Admins and members (if allowed) can insert invitations
CREATE POLICY "Users can create invitations"
  ON public.pending_invitations
  FOR INSERT
  WITH CHECK (
    org_id IN (
      SELECT org_id 
      FROM public.user_profiles 
      WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- Step 5: Create trigger for updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_pending_invitations_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_pending_invitations_updated_at
  BEFORE UPDATE ON public.pending_invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_pending_invitations_updated_at();

COMMENT ON FUNCTION public.update_pending_invitations_updated_at() IS
'Automatically updates the updated_at timestamp when a pending invitation is modified.';

COMMIT;

-- ============================================================================
-- Validation
-- ============================================================================

DO $$
DECLARE
  v_table_exists BOOLEAN;
  v_rls_enabled BOOLEAN;
BEGIN
  -- Check table exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_name = 'pending_invitations'
  ) INTO v_table_exists;

  -- Check RLS is enabled
  SELECT relrowsecurity INTO v_rls_enabled
  FROM pg_class 
  WHERE relname = 'pending_invitations' 
    AND relnamespace = 'public'::regnamespace;

  IF NOT v_table_exists THEN
    RAISE EXCEPTION '❌ Table pending_invitations was not created';
  END IF;

  IF NOT v_rls_enabled THEN
    RAISE EXCEPTION '❌ RLS not enabled on pending_invitations';
  END IF;

  RAISE NOTICE '✅ Migration pending_invitations_table completed successfully';
END $$;
