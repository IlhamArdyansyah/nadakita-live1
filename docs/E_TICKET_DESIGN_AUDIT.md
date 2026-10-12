# NADAKITA LIVE e-ticket design refinement

Implemented against the supplied master prompt and three reference images. Changes are restricted to ticket presentation, QR rendering and export. No database migration, booking price, lineup, approval endpoint or check-in payload was changed.

## Audit and data boundaries

- Customer dashboard selects orders with `owner_id = authenticated user.id`, with nested shows, artists, venues, categories and check-ins.
- Read-only inspection of the connected Supabase project confirmed 15 published artist/category combinations and the expected dates (20, 21 and 22 November 2026).
- Production RLS is enabled on orders, tickets and check-ins. Their SELECT policies restrict customers to their own orders; staff access requires `is_admin()`.
- Production `admin_review_demo_order` requires admin access and a non-expired `under_review` order before inserting tickets. Customer-side direct issuance remains disabled.
- Production `admin_inspect_ticket` consumes the existing raw ticket code and rejects unknown codes, non-approved orders, wrong concerts and duplicate check-ins. It retains transactional check-in handling.
- No private customer rows were fetched for this audit, and no production reservation, approval or check-in was created.
- Dashboard ticket counts now exclude non-approved orders. Check-in presentation/counts support both array and one-to-one object responses from nested PostgREST relationships.
- Browser tests use synthetic auth/data. Inspecting production policies/functions is not an end-to-end proof of every production authorization path.

## Implementation and architecture

| File | Responsibility |
|---|---|
| `js/live/ticket-themes.js` | Three artist themes and five category accents; original reusable SVG concert illustrations |
| `js/live/ticket-svg.js` | Shared three-panel ticket document, text wrapping, adaptive height, cream frame and editorial typography |
| `js/live/ticket-wallet.js` | Maps issued records to presentation, renders preview/actions, builds integer-module QR with quiet zone, exports PNG |
| `js/live/app.js` | Fetches artist/category identifiers, waits for fonts, binds the existing database codes to ticket QR/download controls |
| `css/live.css` | Desktop preview, readable mobile details/QR and download controls; long-order-title overflow fix |

The same SVG document produces desktop preview and PNG. Dynamic attendee, order ID, venue, date, category and ticket code are escaped. Ticket code payloads are unchanged. The existing pinned qrcodejs library still encodes them; its matrix is drawn at integer module sizes with four modules of whitespace around the code. The SVG QR remains crisp when rasterized.

PNG output is 2400 × 900 px for normal content. Height grows when long titles or names require additional lines. Mobile downloads keep the same landscape document. Fonts are embedded from existing local assets. Download controls and mobile helper details are outside the exported document. No new production library was added.

Artist atmosphere is independent from category accent: Weeknd red/black, Bieber blue/violet, Bruno orange/gold. Category strips are pink, lime, cyan, lavender and warm cream respectively. Artwork composition changes across categories.

## Screenshots and all 15 PNG examples

All files below contain synthetic QA names/codes, not live customer tickets.

| Artist | VIP | Festival A | Festival B | CAT 1 | CAT 2 |
|---|---|---|---|---|---|
| The Weeknd | [PNG](../tests/artifacts/tickets/weeknd-vip.png) | [PNG](../tests/artifacts/tickets/weeknd-festa.png) | [PNG](../tests/artifacts/tickets/weeknd-festb.png) | [PNG](../tests/artifacts/tickets/weeknd-cat1.png) | [PNG](../tests/artifacts/tickets/weeknd-cat2.png) |
| Justin Bieber | [PNG](../tests/artifacts/tickets/bieber-vip.png) | [PNG](../tests/artifacts/tickets/bieber-festa.png) | [PNG](../tests/artifacts/tickets/bieber-festb.png) | [PNG](../tests/artifacts/tickets/bieber-cat1.png) | [PNG](../tests/artifacts/tickets/bieber-cat2.png) |
| Bruno Mars | [PNG](../tests/artifacts/tickets/bruno-vip.png) | [PNG](../tests/artifacts/tickets/bruno-festa.png) | [PNG](../tests/artifacts/tickets/bruno-festb.png) | [PNG](../tests/artifacts/tickets/bruno-cat1.png) | [PNG](../tests/artifacts/tickets/bruno-cat2.png) |

Browser screenshots: [Weeknd](../tests/artifacts/tickets/weeknd-vip-preview.png), [Bieber](../tests/artifacts/tickets/bieber-vip-preview.png), [Bruno](../tests/artifacts/tickets/bruno-vip-preview.png), [mobile](../tests/artifacts/tickets/mobile-preview.png). Each additional category also has a `-preview.png` screenshot beside its export.

## Verification

- `node tests/test_ticket_design.mjs`: PASS — 15 distinct documents, exact colors, escaped dynamic fields, unknown metadata and object-shaped check-ins.
- `node tests/test_ticket_wallet.mjs`: PASS — issued-only eligibility, escaping, filenames and check-in state.
- `python tests/test_ticket_design_browser.py`: PASS — all 15 variants at 320/768/1024/1440px, no page overflow, SVG text within bounds, 15 actual HD PNG downloads decoded with zxing-cpp to the exact original codes, mobile HD export and 120-character attendee/long-title export.
- `python tests/test_ticket_wallet_browser.py`: PASS — four screen sizes, PNG signature/dimensions and disabled download/recovery when QR script is blocked.
- `python tests/test_connected_booking_regression.py`: PASS — three artists at mobile/desktop, zone choice → checkout → reservation → organizer review, account prefill, attendees kept separate, no premature ticket/QR. All backend writes are mocked.
- `python tests/test_navigation_browser.py`: PASS — 30 delayed-backend route visits plus Discover navigation.
- Native client tests, application contract and JS syntax checks: PASS.
- Existing static UI checks: PASS at 1440/390/320px; existing admin mock checks: PASS for nine modules at desktop/mobile; login mock checks: PASS for missing SDK, stale session and admin login.

Test-only tools installed: zxing-cpp 3.1.1 and Pillow 12.3.0. They are not website dependencies.

## Remaining limitations / failing legacy checks

- Artwork is original code-native illustration, not a pixel-identical photographic recreation of the supplied masters. No separate approved master artwork assets were available. No AI artist photograph was generated. Real supplied artwork can replace this panel later.
- Three existing legacy tests did not pass: `test_booking_flow.py` expects the retired inline preview selectors before live initialization; `test_countdown.py` waits for a retired countdown selector; `test_show_guide.py` compares corrupted time-range strings. These tests were not removed, skipped or weakened. Connected booking/navigation tests exercise the current runtime instead. The entire legacy runner is therefore not reported as green.
- Existing browser-local session storage was not redesigned in this presentation-only task.
- Already-downloaded PNGs are snapshots. Cancellation/check-in validity must always be checked by the server, not inferred from a saved file.
- QR/download failures provide retry instructions; they never substitute a sample QR.
- Simulation disclaimer remains visible on preview and export. These are not official concert tickets.
