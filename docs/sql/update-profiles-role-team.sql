-- Migration: Extend profiles.role to support 'TEAM' role
-- This updates the check constraint to allow 'ADMIN', 'CLIENT', and 'TEAM' roles
-- Safe to run multiple times (idempotent)

-- Drop existing constraint if it exists
DO $$
BEGIN
  -- Find and drop the existing role constraint
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname LIKE '%role%check%' 
    AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
  END IF;
END $$;

-- Add new constraint allowing ADMIN, CLIENT, and TEAM
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('ADMIN', 'CLIENT', 'TEAM'));

-- Add status column if it doesn't exist
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS status text 
CHECK (status IN ('INVITED', 'ACTIVE'));

-- Set existing rows to ACTIVE if status is NULL
UPDATE public.profiles 
SET status = 'ACTIVE' 
WHERE status IS NULL;

-- Set default for status
ALTER TABLE public.profiles 
ALTER COLUMN status SET DEFAULT 'ACTIVE';

