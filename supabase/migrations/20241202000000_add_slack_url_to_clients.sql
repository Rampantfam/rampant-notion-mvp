-- Add slack_url column to clients table
-- This column stores Slack workspace or channel links for client communication

ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS slack_url TEXT;

-- Add a comment to document the column
COMMENT ON COLUMN public.clients.slack_url IS 'Slack workspace or channel link for client communication regarding revisions, updates, and project coordination';


