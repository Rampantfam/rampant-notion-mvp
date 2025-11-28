-- Migration: Create organization_settings table
-- Stores organization-level settings and admin preferences
-- Safe to run multiple times (idempotent)

CREATE TABLE IF NOT EXISTS public.organization_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_name text,
  contact_email text,
  phone text,
  logo_url text,
  email_notifications boolean DEFAULT true,
  budget_alerts boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index for faster lookups (assuming single row usage)
CREATE INDEX IF NOT EXISTS idx_organization_settings_id ON public.organization_settings(id);

-- Add comment
COMMENT ON TABLE public.organization_settings IS 'Stores organization-level settings and admin preferences. Typically only one row exists.';

