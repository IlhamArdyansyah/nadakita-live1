# NADAKITA LIVE — Countdown & Homepage Spacing

## English copy update — 11 October 2026

The homepage countdown uses English to match the international concert presentation:
`THE WAIT IS ALMOST OVER`, `COUNTDOWN TO NIGHT 01 — THE WEEKND`, and
`DAYS / HOURS / MINUTES / SECONDS`. Live, completed, unavailable and screen-reader
labels also use English. Only display copy changed; schedule sourcing, explicit
WIB offset, timer cadence and lifecycle remain unchanged.

Verification for this update: `node tests/test_countdown_copy.mjs`,
`node tests/audit_contract.mjs`, and `python tests/test_countdown_english.py` pass.
The browser test loads the full homepage in isolated Chrome with mocked read-only
backend responses at 320/390/768/1024/1440px, checks ticking, English accessible
labels, no overflow and no page errors while the viewer timezone is Los Angeles.
Screenshots are in `tests/artifacts/countdown-english/`. This update does not
revalidate the legacy inline-renderer suite or modify live Supabase data.

## Original refinement

Only the homepage countdown and spacing were modified. The source remains `NADAKITA-LIVE-SHOW-GUIDE-REFINED.zip`.

- Marquee replaced with a static pink countdown strip (no duplicate marquee).
- Local fallback uses `SHOWS` in `js/preview.js`, with canonical ISO dates and `startsAt`/`endsAt` in WIB. `js/show-guide.js` now reads these date/times too.
- If Supabase is configured, `publicContent` fetches `shows` once and calls `NADAKITA_LIVE_COUNTDOWN.setShows(dbShows)`; no polling per second. During fetch/error the countdown displays an unavailable label rather than stale local data.
- Runtime parses show date and time using explicit UTC+07:00, independent of the visitor timezone.
- Stops at concert start, displays live until the concert end, then targets the next show; after the final show displays completed.
- Timer runs once per second, stops on `pagehide` and while tab hidden, and restarts safely. `stateAt` is exposed for deterministic testing only.
- `css/countdown.css` applies styles scoped to `.concert-countdown` and reduces only `.stats-strip + .section` top padding (desktop 40px/mobile 28px).
- Photo paths, lineup, booking, navigation, and Supabase schema unchanged.

## Changed files

`index.html`, `js/preview.js`, `js/countdown.js` (new), `js/show-guide.js`, `js/live/app.js`, `css/preview.css`, `css/live.css`, `css/countdown.css` (new), `COUNTDOWN_REFINEMENT.md` (new).

## QA summary — executed on local Chromium rendering

- Countdown: all 3 concert starts/ends, status transitions and completed state pass.
- Timezone: Asia/Jakarta and America/Los_Angeles pass; explicit UTC+07 offset.
- Responsive: 320/375/390/768/1024/1440/1920px; no horizontal overflow; lineup gap 28px mobile and 40px desktop.
- No multiple intervals after repeated refresh of data and `pageshow` lifecycle.
- Show Guide test: 3 nights, URL sync, keyboard and navigation; passes all 7 widths.
- Whole-project static UI smoke test: 14 pages at 320/390/1440px; 0 errors.
- Admin mock smoke test: 9 modules at 390/1440px; 0 errors.
- **Not verified:** actual Supabase data, production browser over localhost. Browser test environment blocks HTTP/file navigation (`ERR_BLOCKED_BY_ADMINISTRATOR`), so tests inject source scripts into the renderer. Local user Go Live QA remains required.

## Verification

Run `python tests/test_countdown.py`, `python tests/test_show_guide.py`, and `python tests/test_static_ui.py` after installing Playwright + Chromium. Live Supabase checks require user database configuration.
