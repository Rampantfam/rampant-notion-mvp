-- Migration: Add annual_budget column to clients table
-- This allows clients to store their annual budget

do $$
begin
  -- Add annual_budget column if it doesn't exist
  if not exists (select 1 from information_schema.columns 
                 where table_schema = 'public' 
                 and table_name = 'clients' 
                 and column_name = 'annual_budget') then
    alter table public.clients add column annual_budget decimal(10, 2);
  end if;
end $$;

