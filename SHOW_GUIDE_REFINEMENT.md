# NADAKITA LIVE — Show Guide Refinement

## Change scope

This update starts from `NADAKITA-LIVE-HEADER-CLEAN.zip` and changes **only the Show Guide page** and its shared public-show integration. The full original project is included for drop-in replacement.

### Files edited
- `schedule.html` — loads a page-scoped stylesheet and controller.
- `js/preview.js` — keeps the existing header/footer and `pageSchedule` shell; exposes the established public three-show catalog to the Show Guide controller; removes the redundant, old Indonesian rundown array.
- `js/live/app.js` — sends the current published Supabase show records to the same controller instead of directly patching individual DOM nodes.

### Files added
- `css/show-guide.css` — scoped compact editorial layout and responsive night selection.
- `js/show-guide.js` — accessible, in-page night switching; active state, correct dates, live Supabase updates, browser history, keyboard arrows, and ticket URLs.
- `tests/test_show_guide.py` — regression checks for all three nights and seven viewport widths.
- `SHOW_GUIDE_REFINEMENT.md` — this handover.

## Visual changes

- Desktop sidebar is 270–300px with a safe sticky offset; the content column is flexible.
- Artist header is slightly smaller, with inline venue/timezone/ticket metadata.
- Rundown row height is reduced; time cells are compact; copy is consistent natural English.
- Only the main performance receives lime emphasis.
- At 820px and below the sidebar becomes an inline 3-night selector. At 540px and below the buttons use short NIGHT 01/02/03 labels and each rundown row stacks time above activity.
- Existing cream, ink, pink, lime, branding, primary fonts and price/booking logic are preserved.

## Functional details

- Clicking a night does **not** reload the page. It updates active state, artist name, English date, five schedule items, main-concert highlight, and `tickets.html?show=<slug>`.
- Deep links `schedule.html?show=weeknd`, `schedule.html?show=bieber`, and `schedule.html?show=bruno` are supported.
- Arrow keys plus Home/End work in the night selector; browser back/forward updates the selected night.
- When Supabase is configured, public show records take precedence for date, venue, gates, concert start and end. The existing schedule slots for stadium access and preparations are unchanged.
- Artist-photo assets, checkout, stock, and admin operations are not modified.

## QA results

- **PASS** — 3 concert selectors, concert names, dates, main-performance title and highlighted row, 5 timeline rows, ticket-zone URL, one active tab, keyboard navigation, and sample Supabase data handoff at 320, 375, 390, 768, 1024, 1440 and 1920px.
- **PASS** — no horizontal overflow / console page error in the tested Show Guide visual states.
- **PASS** — existing 14-page static smoke tests at 1440/390/320px.
- **PASS** — existing 9 admin module mock tests at 1440/390px.
- **PASS** — JavaScript syntax checks for modified scripts.

### Testing limits

The browser runner blocks direct localhost/file navigation in this environment, so the automated browser tests render the actual HTML/CSS/JS source in an injected document. They verify interaction and responsive layout but not a real VS Code Live Server session. Supabase has not been configured with a real project, so live database integration and ticket checkout cannot be asserted as tested.

## How to verify on your PC

1. Extract the ZIP to a **new** folder; do not overwrite your original copy unless you have a backup.
2. Open `NADAKITA-LIVE-APP` in VS Code and right-click `schedule.html` → **Open with Live Server**.
3. Select Night 01, 02 and 03. Confirm date, name and main-performance title change **without a page reload**.
4. Select Night 02 and click **SEE TICKET ZONES**. URL must be `tickets.html?show=bieber`.
5. Use Chrome DevTools device emulation for 320, 375, 768 and 1024px widths.
6. For real Supabase mode, configure the project according to `README.md` and repeat the same check after database setup.
