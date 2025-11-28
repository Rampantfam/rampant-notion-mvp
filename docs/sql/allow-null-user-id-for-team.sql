-- Migration: Allow NULL user_id for TEAM members (pending invites)
-- This allows profiles to exist without an auth user until they're invited
-- Safe to run multiple times (idempotent)

-- Check if user_id column allows NULL, and make it nullable if it doesn't
DO $$
BEGIN
  -- Check if user_id is currently NOT NULL
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'user_id' 
    AND is_nullable = 'NO'
  ) THEN
    -- Make user_id nullable
    ALTER TABLE public.profiles 
    ALTER COLUMN user_id DROP NOT NULL;
    
    RAISE NOTICE 'Made user_id nullable in profiles table';
  ELSE
    RAISE NOTICE 'user_id is already nullable';
  END IF;
END $$;

-- Verify the foreign key constraint allows NULL (it should by default)
-- Foreign key constraints in PostgreSQL allow NULL unless explicitly constrained otherwise
-- If there's an issue, we can drop and recreate the constraint, but this is usually not needed

-- Add a comment explaining the NULL user_id use case
COMMENT ON COLUMN public.profiles.user_id IS 'References auth.users.id. Can be NULL for TEAM members who have not yet been invited (status=INVITED).';

