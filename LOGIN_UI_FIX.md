# NADAKITA LIVE — Login UI refinement

- Removed the outdated Supabase setup warning from Sign In / Register / Recovery pages.
- Replaced preview-only submit labels with real auth actions: SIGN IN, CREATE ACCOUNT, SEND RESET EMAIL, SAVE NEW PASSWORD.
- Removed the confusing `View admin interface` link: admins authenticate through the same login page and are routed according to Supabase role.
- Kept actual Supabase Auth handlers, email/password authentication, registration, reset-password flow, and role-based redirect.
- Added a small error region that stays hidden until needed. If the live auth script cannot load (e.g., CDN/network offline), submitting shows a clear error rather than pretending to sign in.
- No database, user role, booking, checkout, homepage, ticket data, or image was changed.

## Manual browser QA

1. Open `login.html` via Live Server: the title is SIGN IN., CTA says SIGN IN, and there is no permanent setup warning.
2. Enter existing customer test credentials and submit: navigate to `dashboard.html`.
3. Sign out and enter admin credentials: navigate to `admin.html`.
4. Use wrong password: page shows error without navigating.
5. Check links to register and forgot password.
6. Disable Internet/CDN and submit: UI shows a connection error; it does not fake a successful login.

Note: Browser authentication against the real Supabase environment requires credentials and was not executed automatically.
