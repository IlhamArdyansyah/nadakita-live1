# Venue night map — approved scope

Use the supplied night-stadium reference as visual direction, not as a price source.

## Acceptance criteria

- A shared dark/pink venue map on home, show guide, show detail and ticket selection.
- Original illustrative stadium artwork; HTML zone names and prices, no text baked into image.
- Prices from `ticket_categories` for the selected show; no stale fallback on public venue maps.
- Pink VIP, lime Festival A, cyan Festival B, purple CAT 1, cream CAT 2.
- Native keyboard-accessible links/buttons; disabled zones remain disabled; selecting a zone never increases quantity.
- Mobile map above a readable price list; no horizontal page overflow.
- No unsupported gate, fee, tax, numbered-seat or accessibility claims. Academic / not-to-scale disclaimer.
- No database writes, schema changes, authentication changes or booking workflow changes.

## Implementation / verification

1. Add failing shared-renderer tests.
2. Add scoped artwork, renderer and styles.
3. Connect public venue maps to existing read-only category queries; prevent stale night responses.
4. Verify browser prices, error/empty states, keyboard selection, responsive layout and booking/navigation regressions.
5. Record results and asset provenance.

## Completed

- [x] Renderer tests: red before implementation, green after, mutation guard verified.
- [x] Original night artwork, scoped styles and keyboard-accessible controls.
- [x] Supabase prices on public maps and stale-response guard.
- [x] Five responsive widths, live read-only catalog smoke test, booking/navigation regressions.
- [x] README, structure guide, asset provenance and `tests/VENUE_NIGHT_QA.md` updated.

Existing local preview on port 5500 already serves the changed source. No hosting,
tunnel, database or authentication changes were made.
