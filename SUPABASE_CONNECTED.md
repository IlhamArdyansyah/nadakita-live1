# NADAKITA LIVE — Supabase connected

Project: `nadakita-live` (`vmqxentoizjaiscxujwr`). Public URL and publishable key are now saved in `js/live/config.js`.

## Changes applied remotely
- Schema with RLS + Storage bucket
- Booking/QR/admin RPC functions
- Seed: 3 shows, 3 artists, 15 ticket categories, 1 venue
- Privilege hardening in `supabase/migrations/006_function_privileges.sql`
- Foreign-key performance indexes in `supabase/migrations/007_performance_indexes.sql`
- Split admin write policies in `supabase/migrations/008_split_admin_write_policies.sql`

## Still required
1. Supabase Dashboard > Authentication > Providers: enable Email and, for guest checkout, Anonymous Sign-ins (consider CAPTCHA).
2. Authentication > URL Configuration: configure the exact Live Server URL and reset password redirects.
3. Create a customer account and admin account. Grant admin manually by inserting admin account UUID into `public.admin_grants` using SQL Editor; never grant admin based only on email from browser.
4. Test actual signup, login, booking, concurrent stock, QR check-in, cancellation, and admin updates.
5. Payment is simulated: do not treat demo values as real revenue.
6. Enable Authentication > Password Security > leaked-password protection before public launch.

**Do not rerun 001_schema.sql against the already initialized project.** `006_function_privileges.sql` corresponds to the remote hardening migration named `nadakita_004_function_privileges`.
