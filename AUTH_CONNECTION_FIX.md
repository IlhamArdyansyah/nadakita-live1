# NADAKITA LIVE — Authentication connection fix (local browser client)

## Why the sign-in message kept appearing
The form in `js/preview.js` is rendered first and shows **Sign-in is not ready** when `data-auth-ready` was not set by `js/live/app.js`.
The previous `js/live/supabase.js` waited for a Supabase SDK imported from public CDN hosts. If the browser blocked those hosts (or an external ES module could not load), `authPage()` never mounted. The screenshot shows this *client-initialization* failure; it is not evidence of a bad admin password or missing admin permissions.

## Changes in this version
- `js/live/supabase.js`: no longer imports the SDK from an external CDN. Loads a local browser-native client instead.
- `js/live/native-client.js`: local module using standard browser `fetch` for Supabase GoTrue Auth, PostgREST/RPC, and Storage. Supports sign-in/up/out, session reuse/refresh, anonymous user sign-in, password recovery/basic reset, admin role RPC, booking, and existing admin queries. Uses the existing Supabase Project URL and public publishable key only.
- `tests/test_native_client.mjs`: Node test using **mocked responses** for sign-in, session persistence, JWT-bound admin access, queries, uploads, and failed passwords.
- No database, UI, artist/photo asset, or order data changed.

## Run
1. Extract the full ZIP to a **new folder**; do not mix old and new project folders.
2. Open the `NADAKITA-LIVE-APP` folder with VS Code.
3. Start Live Server. Navigate to `http://127.0.0.1:5500/login.html` (or the port Live Server actually uses).
4. Press Ctrl+Shift+R and open DevTools Console/Network if there are errors.
5. Sign in with the previously configured admin demo account; do **not** share passwords.
6. The browser must have internet access to `https://vmqxentoizjaiscxujwr.supabase.co` even though it no longer needs a CDN to load the JavaScript client.

## Testing scope / limitations
Local unit tests and syntax checks passed. Direct interactive sign-in against the actual Supabase Auth endpoint has NOT been performed in this environment. The test browser is blocked from navigating to localhost. The local adapter is designed for this academic demo; it has not undergone a full security review or payment-system certification. For a real commercial deployment, use the official vendored/bundled `@supabase/supabase-js` package and undertake end-to-end and security testing.

If browser shows `Failed to fetch`, inspect the Network tab for `auth/v1/token` requests, DNS/proxy/filtering, and whether the Supabase project endpoint is reachable. If clicking Sign In shows `Invalid login credentials`, this confirms the form reached Auth; check the user email/password via Supabase Dashboard > Authentication > Users.
