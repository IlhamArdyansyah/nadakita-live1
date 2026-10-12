# NADAKITA LIVE — Ticketing UX Refinement

## Scope

Reference: GoLive Asia event-discovery and ticket selection flow (structural inspiration only; its interactive booking details could not be independently verified). The NADAKITA editorial visual system, homepage, lineup, pricing, and Supabase architecture are unchanged.

### Features added
- One reusable **illustrative zone map** for Show Detail and Tickets.
- Each Show Detail zone and price label deep-links to the same concert's ticket selection using `show=<slug>&zone=<code>`.
- Tickets: clickable zone diagram with visible selected state; category prices and descriptions in the existing list; explicit quantity selectors (max 4 per order); booking steps; order summary.
- Preselected zone is highlighted on direct deep links. Changing concerts resets quantities and visual focus to prevent cross-night purchases.
- Supabase mode renders categories and available stock from Supabase, not static preview prices. Existing RPC reservation and QR workflow remains untouched.
- Checkout receives a concise booking step indicator; user inputs and order summary are preserved.

### Non-goals
- This is NOT an official GBK seating map and DOES NOT assign numbered seats.
- There is no real payment gateway; Supabase's `confirmed_demo` flow remains simulation-only.
- No new backend schema or migrations are required for this UI change.
- No GoLive imagery, CSS, code, or proprietary booking UI was copied.

### Modified files
- `show.html`, `tickets.html`, `checkout.html`: include new shared map script and scoped CSS.
- `js/preview.js`: detail map, category list, preview zone selection, checkout indicator.
- `js/live/app.js`: same map in Supabase-connected detail/tickets, preselect zone from link, visible stock, checkout indicator.
- `js/ticket-zones.js` (new): shared zone layout and selection helpers.
- `css/booking-flow.css` (new): scoped responsive styling.
- `tests/test_booking_flow.py` (new), `tests/test_static_ui.py` (updated).

### Validations actually performed
- `node --check`: `js/preview.js`, `js/ticket-zones.js`, `js/live/app.js` passed.
- UI component interaction test: 320, 375, 390, 768, 1024, 1440px passed for zone selection, ticket price, reset on show switch, max 4 tickets, order summary and 3 artists' deep-links.
- Static smoke regression: 14 pages at 1440, 390, and 320px passed (0 JS exceptions, 0 horizontal-overflow detections).
- Chrome's network policy blocks navigation to both localhost and file URLs; tests used direct HTML injection for frontend interaction checks, plus static examination of deep-link href attributes. Real URL navigation should be verified with Go Live on user's machine.
- Supabase project is not configured here: live DB permissions, stock concurrency, Auth, reservation and QR are **not verified end-to-end**.

### Setup
1. Extract the ZIP, open `NADAKITA-LIVE-APP` in VS Code.
2. Start Live Server and open `show.html?show=weeknd`, `tickets.html?show=weeknd&zone=festa`, and `checkout.html` after selecting tickets.
3. To enable online booking, follow `README.md` for Supabase URL, publishable key and migrations. Never expose service role secrets in the browser.
4. Upload the user's own real artist photos to `assets/images/artists` using existing filenames.
