# Separate organizer and customer roles

Admin accounts are organizer-only: no customer Account/My Orders, ticket selection,
checkout or reservation submission. Admins can still view the public site, edit
their own name/phone under Admin Profile, sign out, manage orders and scan tickets.
Use a separate customer account for bookings. Existing orders are retained.

## Enforcement

- UI resolves role through `is_admin` (database `admin_grants`, not user metadata).
- Admin visits to tickets, checkout, dashboard and registration redirect to admin.
- Public-site ticket links become Control Room links; ticket nav/CTA are removed.
- Migration `20261010091945_separate_admin_customer_booking.sql` adds an early
  admin rejection to reservation and submission RPCs, preserving their existing
  bodies, stock locks, ownership rules, signatures and grants. It is already applied
  to the connected Supabase project. No old reservations are cancelled/deleted.
- Direct confirmation remains retired. Operational admin RPCs remain unchanged.

## Verification (2026-10-10)

- RED: real database admin reservation returned `Invalid category selection`, proving
  there was no role guard. Browser admin redirect reproduction initially failed.
- GREEN: rollback-only database checks reject both admin reservation and submission;
  signed-out callers retain their original sign-in rejection. No orders/check-ins
  were created by these checks.
- Browser role tests: admin/customer, public navigation and direct URLs, 390/1440px.
- Connected customer booking mock regression: all three artists at both widths.
- Native client tests and JS syntax checks; login tests cover stale sessions.
- All nine existing operational admin modules passed their browser mock checks.
- Real database customer identity still reaches normal selection validation;
  authenticated retains RPC execute permission, anonymous does not.
- Full unittest discovery did not complete: several legacy scripts launch browsers
  during module import and hit Windows subprocess sandbox permissions. The focused
  role/login/booking/admin browser scripts were run elevated and passed; do not
  interpret these results as a fully green legacy suite.
- Browser Auth/backend responses are synthetic, not real user sessions.
- No Supabase CLI installed: migration applied through MCP, then local SQL saved
  using the actual recorded migration version. No git repository: no commit made.

## Existing security-advisor notices

Intentional SECURITY DEFINER API endpoints are flagged for their execution grants;
booking endpoints now explicitly reject admin, and operational endpoints already
check admin membership. Leaked-password protection is disabled and remains outside
this role-separation change. See [password security](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)
and [function grants](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).

## Rollback

If organizer accounts must book again, remove only the inserted `IF public.is_admin()`
guard from both RPC bodies and restore the previous UI routing. Do not restore the
old 002 reservation body: it predates review-aware stock handling. Preview via the
temporary tunnel is a copied public-file snapshot, so copy changed JS files again
after edits; it is not a production deployment.
