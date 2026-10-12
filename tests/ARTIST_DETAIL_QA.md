# Artist detail editorial layout — 11 October 2026

## Design contract

Adapt the supplied concert-detail mockup into native HTML, not a screenshot.
The primary actions stay Explore Tickets, Show Guide and selecting a category
in the canonical venue map. Preserve the reservation workflow and category
prices; do not introduce an Add to Cart flow or a fake initially selected VIP.

- Artist heading/copy on the left, prominent existing artist portrait on the
  right, with restrained lime tape and a small caption. No new image generated.
- Derive English weekday/date from the catalog's ISO date. Format that calendar
  date in UTC so a visitor's timezone does not turn Friday into another day.
- On mobile: heading, portrait, copy/actions, event information, song preview,
  then categories/map. One H1 and keyboard-accessible native category links.
- Reuse shared venue zone colors, live prices, inactive and empty states.
  Category legend is left of the diagram on desktop, stacked on mobile.
- Player uses supplied track title or artist name and native audio controls,
  with actual file duration, autoplay fallback and retry after media failure.
  No fake waveform, promised view quality, numbered seats or fixed clip length.

## Implementation

`js/live/show-detail.js` owns the new presentation. `js/live/app.js` continues
fetching the same show/category records and warming the portrait, then calls
the renderer and dispatches the existing show-ready event. No new REST query,
schema, auth behavior, reservation logic or hosting changes.

`css/artist-detail.css` is loaded only by `show.html`; shared map colors remain
in `css/venue-night.css`. The existing native player in `js/song-previews.js`
now has a dark presentation, thumbnail, English status text and Retry Audio.
Missing audio is expected until the user supplies the three configured MP3s.

## Evidence

- `python tests/test_artist_detail.py`: passes 15 artist/width combinations
  (three artists at 320/390/768/1024/1440px), using isolated Chrome, mocked
  read-only catalog responses and a synthetic in-memory 1.25-second WAV served
  at the configured MP3 paths. This test media is not written into the app.
- Covers Discover This Night navigation, weekday for all three dates in a
  Los Angeles viewer timezone, real media duration, per-night price differences,
  inactive category links, keyboard focus, mobile order, no overflow and no
  late heading size/font/color change. Also tests category error/retry/empty,
  audio error/retry with actual playback, and failed-portrait fallback.
- Initial test failed because the new composition was absent. Negating the new
  date validator made the weekday assertion fail; it was restored and retested.
- `python tests/test_navigation_browser.py`: 30 document/width checks passed,
  including all three detail pages; stable heading dimensions/font/color,
  no horizontal overflow and no page exceptions.
- `python tests/test_venue_live.py`: eight public page/width cases passed with
  actual Supabase category prices. GET-only except the existing read-only stock
  RPC; real auth/order writes are blocked. No authenticated booking was created.
- JavaScript syntax, `node tests/audit_contract.mjs`,
  `node tests/test_venue_map.mjs` and Prettier checks passed.
- Screenshots: `tests/artifacts/artist-detail/`. The fixtures' description and
  audio differ from live content; screenshots are layout evidence, not proof
  that the user has already supplied song files.

These checks do not claim the entire legacy inline-renderer suite or all
authenticated checkout/admin functionality were revalidated by this UI change.
