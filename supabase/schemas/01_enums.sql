-- ============================================================================
-- Custom Types and Enums
-- Generated: 2026-01-21T10:30:00.000Z
-- ============================================================================

-- Enum: invitation_status
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invitation_status') THEN
    CREATE TYPE public.invitation_status AS ENUM ('pending', 'approved', 'rejected', 'expired');
  END IF;
END$$;

-- Enum: project_permission_level
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'project_permission_level') THEN
    CREATE TYPE public.project_permission_level AS ENUM ('read', 'write', 'admin');
  END IF;
END$$;

-- Enum: project_status
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'project_status') THEN
    CREATE TYPE public.project_status AS ENUM ('active', 'archived', 'deleted');
  END IF;
END$$;

-- Enum: user_role
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE public.user_role AS ENUM ('superadmin', 'admin', 'member', 'view-only', 'owner');
  END IF;
END$$;
