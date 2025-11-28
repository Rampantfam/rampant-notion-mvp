# Supabase Setup Guide

## Issue: "Load failed" Error

If you're seeing a "Load failed" or network error when trying to sign up, it's likely because Supabase hasn't been configured yet.

## Quick Fix

1. **Create a `.env.local` file** in the root of your project:

```bash
touch .env.local
```

2. **Add your Supabase credentials** to `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

3. **Get your Supabase credentials**:
   - Go to [Supabase Dashboard](https://app.supabase.com)
   - Select your project (or create a new one)
   - Go to Settings → API
   - Copy the "Project URL" and "anon public" key

4. **Restart your dev server**:
   ```bash
   npm run dev
   ```

## Next Steps

After configuring Supabase, you'll need to create the database tables. See the SQL setup instructions in your Supabase dashboard or check for database migration files.

### Required Tables

1. **profiles** table:
   - `user_id` (UUID, references auth.users)
   - `role` (TEXT: 'ADMIN' or 'CLIENT')
   - `full_name` (TEXT)
   - `email` (TEXT)
   - `client_id` (UUID, nullable, references clients.id)

2. **clients** table:
   - `id` (UUID, primary key)
   - `name` (TEXT)
   - `email` (TEXT)
   - `phone` (TEXT, nullable)
   - `logo_url` (TEXT, nullable)

## Testing

Once configured, try signing up again. The error messages should now be more helpful and indicate if there are any remaining configuration issues.


