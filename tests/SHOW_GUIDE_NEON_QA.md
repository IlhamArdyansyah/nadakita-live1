# Show Guide neon — 11 October 2026

## Design contract

The supplied mockup guides visual direction, not the actual page content.
Primary task: select a concert night, read its rundown and open that night's
ticket zones. Keep live category prices and the existing public catalog flow.

- Reuse the user's existing Jakarta stadium artwork as a native image; do not
  bake navigation, dates, prices or buttons into the screenshot.
- Compact 300px desktop banner with a subtle cut-paper edge. Keep decorative
  texture away from the functional timeline, and avoid a duplicated Monas.
- Dark night selector, lime selected state and pink ticket CTA. Selection is
  also conveyed by `aria-selected`; tabs retain arrow-key/Home/End behavior.
- The highlighted performance is labeled HEADLINER with a neutral hollow
  timeline marker, not a pink indicator implying the performance is live now.
- At <=820px, show three tabs with artist names, then the rundown, followed by
  arrival essentials. The information remains available without horizontal scroll.
- Preserve the simulation information next to the venue map and in the footer.

## Scope and implementation

`js/preview.js` owns markup and the decorative image. `js/show-guide.js` retains
data normalization, tab selection, URL history and venue-change events; only
short dates were added to tabs and arrival markup moved to the template.
`css/show-guide-neon.css` is a scoped final layer in `schedule.html`.
No database schema, authentication, booking logic, hosting or dependencies changed.
No new artwork was generated or the original image modified.

## Verification

- `python tests/test_show_guide_neon.py`: full documents, isolated Chrome,
  read-only mocked catalog, 320/390/768/1024/1440px. Covers image load, three
  nights, ticket URLs, single selected tab, keyboard, Back history, mobile
  arrival order, visible artist names, no overflow, no page errors and stable
  artist dimensions after reveal. Screenshots: `tests/artifacts/show-guide-neon/`.
- Test initially failed because the new banner was absent. A deliberate mobile
  grid-order mutation also failed the arrival-order assertion; restored afterward.
- `python tests/test_venue_browser.py`: passed all 20 page/width combinations,
  including Show Guide selection updating the shared map and prices, plus catalog
  failure/retry/empty states. Backend mocked; no real database writes.
- `python tests/test_navigation_browser.py`: passed 30 document/width checks,
  including the updated guide, with no late heading/font/color shifts, no
  horizontal overflow and no page exceptions after navigation.
- `node tests/audit_contract.mjs`, `node tests/test_venue_map.mjs` and syntax
  checks for both changed JavaScript files passed.
- The legacy inline `tests/test_show_guide.py` is not the verification source for
  this redesign; it omits current assets and stylesheets. This is not a claim
  that the entire legacy runner or authenticated booking flow was revalidated.
