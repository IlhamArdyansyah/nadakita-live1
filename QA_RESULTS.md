# NADAKITA LIVE — QA report (generated build)

## Test environment

- Source: previously approved NADAKITA LIVE UI Refined V2 preview, copied to a new isolated folder.
- Tools: Node.js syntax checks, Chromium/Playwright DOM and viewport checks.
- Supabase environment: connected to project `nadakita-live` with a publishable browser key. The project was inspected read-only and reported `ACTIVE_HEALTHY` on 10 October 2026.

## Passed locally

- All JS files pass `node --check` (syntax only).
- All 14 HTML entry pages render with expected Supabase configuration guards at 1440px, 390px and 320px, without detected JS exceptions or horizontal scrolling in static mode.
- All 14 known HTML navigation references resolve to existing files in the generated folder.
- Nine admin modules render using a mocked database at 1440px and 390px, without detected browser exceptions or horizontal scroll.
- Payment fields and labels explicitly identify **DEMO ONLY**; real revenue is 0 in the SQL stats function.

## Connected-project checks completed

- All public application tables have RLS enabled.
- Browser roles do not receive service-role credentials.
- Privileged booking and admin RPC grants were inspected; anonymous callers cannot execute mutation RPCs.
- Five missing foreign-key indexes were added through migration `007_performance_indexes.sql`.
- Supabase Advisors were reviewed. Leaked-password protection must still be enabled in the dashboard.

## Not yet verified

- Supabase Auth signup/confirmation, anonymous sign-in, recovery redirect and account linking.
- RLS behavior under real JWTs, role grants, storage policies, and database RPC permissions.
- Booking concurrency and idempotency during real simultaneous network requests.
- QR scan via actual camera, cloud image upload, CSV export with real database records, and every CRUD save action against a live Supabase project.
- Integration with private legacy NADAKITA FEST SQLite data, deployment, and multi-user performance testing.

## Manual blocking QA before accepting as fully operational

1. Run all migrations in a new throwaway Supabase project. Resolve any SQL errors there first.
2. Verify ordinary account A cannot access account B's orders, tickets, attendee information or admin RPCs.
3. Validate late expiration, cancel and failed second QR check-in.
4. Run a concurrent last-ticket reservation test.
5. Verify all 9 admin modules against live Supabase, including image uploads and updates reflected on the public site.
6. Exercise keyboard/focus and camera permissions on desktop and mobile.

**Release status: connected full-stack candidate; multi-user, authentication-email, camera and concurrency QA remain required before production.**
