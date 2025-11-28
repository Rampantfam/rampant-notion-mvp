import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '.env.local' })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  console.error('Missing env vars: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const sql = `
-- 1) helper: is_admin() checks profiles table
create or replace function public.is_admin() returns boolean
language sql stable
as $$
  select exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid() and p.role = 'ADMIN'
  );
$$;

-- 2) enable RLS (safe if already enabled)
alter table public.clients enable row level security;

-- 3) allow admins to select/insert/update any client
drop policy if exists "clients_admin_select_all" on public.clients;
create policy "clients_admin_select_all"
on public.clients
for select
to authenticated
using ( public.is_admin() );

drop policy if exists "clients_admin_insert_all" on public.clients;
create policy "clients_admin_insert_all"
on public.clients
for insert
to authenticated
with check ( public.is_admin() );

drop policy if exists "clients_admin_update_all" on public.clients;
create policy "clients_admin_update_all"
on public.clients
for update
to authenticated
using ( public.is_admin() )
with check ( public.is_admin() );

-- 4) keep membership policy for regular CLIENT users
drop policy if exists "clients_select_by_membership" on public.clients;
create policy "clients_select_by_membership"
on public.clients
for select
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
      and p.client_id = clients.id
  )
);

-- (Optional) allow CLIENTs to update their own client row:
drop policy if exists "clients_update_by_membership" on public.clients;
create policy "clients_update_by_membership"
on public.clients
for update
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
      and p.client_id = clients.id
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
      and p.client_id = clients.id
  )
);
`;

async function main() {
  const supabase = createClient(url as string, serviceKey as string, { auth: { persistSession: false } })

  const { error: rpcError } = await supabase.rpc('exec_sql', { sql } as any)
  if (!rpcError) {
    console.log('RLS policies for clients set successfully.')
    return
  }

  const endpoint = `${url}/postgres/v1/query`
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: serviceKey as string,
      Authorization: `Bearer ${serviceKey}`,
    } as Record<string, string>,
    body: JSON.stringify({ query: sql }),
  })

  if (!response.ok) {
    const text = await response.text()
    console.error('RLS setup error:', response.status, text)
    process.exit(1)
  }

  console.log('RLS policies for clients set successfully.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
