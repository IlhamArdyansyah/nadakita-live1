# Ticket wallet

My Orders preserves the existing order workflow. Issued tickets use a shared three-panel SVG document, artist-specific artwork and category accents, with responsive readable mobile details. Each approved ticket with a code has a PNG download; pending, rejected, cancelled and expired orders do not issue download controls.

PNG export runs entirely in the browser with the same issued ticket code and vector QR matrix. Output is 2400 × 900 or taller for long content. No ticket data is sent to an external image service. QR generation uses bundled qrcodejs 1.0.0 (MIT), previously loaded from CDN. If QR initialization fails, download stays disabled and a reload instruction appears. Files retain the simulation disclaimer because the existing reservation system is not a production ticket issuer. Saved files do not prove current validity: entry validation must always consult the server.

See [full design audit](../docs/E_TICKET_DESIGN_AUDIT.md) for all 15 PNG examples, architecture, live read-only Supabase inspection, test results and legacy test limitations.

Run `node tests/test_ticket_wallet.mjs` and `python tests/test_ticket_wallet_browser.py`. Browser checks use synthetic auth and Supabase fixtures, cover 320/768/1024/1440px, real PNG download signature/dimensions, escaped attendee input, and blocked-QR recovery. They do not prove production database permissions or real concert admission.
