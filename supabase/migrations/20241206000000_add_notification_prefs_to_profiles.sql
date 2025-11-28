-- Migration: Add notification preferences to profiles table
-- This allows users to control their notification preferences

do $$
begin
  -- Add receive_email_updates column
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'receive_email_updates'
  ) then
    alter table public.profiles
      add column receive_email_updates boolean default true;
  end if;

  -- Add notify_on_deliverables column
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'notify_on_deliverables'
  ) then
    alter table public.profiles
      add column notify_on_deliverables boolean default true;
  end if;

  -- Add notify_on_invoice_due column
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'notify_on_invoice_due'
  ) then
    alter table public.profiles
      add column notify_on_invoice_due boolean default true;
  end if;
end $$;

