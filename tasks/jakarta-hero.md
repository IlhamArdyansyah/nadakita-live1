# Jakarta stadium hero

Approved: install the user's `Neon Jakarta Over GBK Stadium.png` and apply the
proposed small revisions. Use the supplied image unchanged; no image generation.

## Design contract

- Hero introduces three nights and leads to `shows.html`.
- Desktop: full-bleed skyline/stadium, left-aligned live HTML text; stadium visible
  on the right. Smaller pink `ONE CITY.` line, dark contrast overlay.
- Mobile: text first, stadium image below; no text burned into the artwork.
- One faint static orbit only; no entrance/parallax animations.
- Clear date/venue and keyboard-accessible CTA. Per user revision, no academic
  note in the hero; existing footer/ticket simulation notices remain.
- Native eager/high-priority image with dimensions; existing reveal waits for
  image decode. Image failure leaves legible text over the dark fallback.
- Preserve admin hero title/subtitle/banner settings, links, venue component,
  authentication, category prices and booking flow. No database changes.

## Verification

1. Failing browser test and before screenshots.
2. Scoped hero markup/styles and banner image compatibility.
3. 320/390/768/1024/1440/1672 px screenshots, no overflow or late layout shifts.
4. Mock admin banner override and image failure, reduced-motion, CTA navigation.
5. Navigation regressions and read-only live preview smoke check.

## Completed

- [x] Red/green browser test and guarded admin-banner mutation.
- [x] User asset copied unchanged, scoped responsive hero installed.
- [x] Six viewports, image failure/override, keyboard CTA and stable reveal verified.
- [x] Navigation regression and live read-only catalog smoke checks passed.
- [x] Asset provenance, README/structure guide and QA notes updated.

No database, auth, booking or hosting changes. See `tests/JAKARTA_HERO_QA.md`.
