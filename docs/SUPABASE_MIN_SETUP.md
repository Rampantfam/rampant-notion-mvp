# Supabase Minimal Setup (for Auth + Onboarding)

## A) In the Supabase Dashboard
1. Create a new project.
2. Go to **Settings → API** and copy:
   - Project URL
   - anon public key
3. Go to **Authentication → Providers** and ensure **Email** is enabled.
4. Go to **Authentication → URL Configuration** and add:
   - http://localhost:3000
   - http://localhost:3000/login
   - http://localhost:3000/signup
   - http://localhost:3000/onboarding/organization

## B) Put keys into .env.local (local dev)
Create `.env.local` at the project root:
NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
Restart dev server after saving.

## C) Create the two tables needed now (profiles, clients)
In **SQL Editor**, run this:

```sql
-- Basic tables for signup/login + org onboarding

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text check (role in ('ADMIN','CLIENT')) not null default 'CLIENT',
  client_id uuid,
  full_name text,
  email text,
  created_at timestamptz default now()
);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  phone text,
  logo_url text,
  created_at timestamptz default now()
);

-- (RLS optional for MVP — keep disabled for now; we’ll lock down later.)
```

## D) Test locally
npm run dev
Visit /signup → create account → you should be sent to /onboarding/organization
Complete the org form → this inserts a row into clients and links profiles.client_id
Log out/log in at /login to confirm it works

End of instructions. Make these files and patches exactly as written.
