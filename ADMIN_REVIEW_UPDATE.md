# NADAKITA LIVE — Booking review update

## Implemented
- `under_review` and `rejected` booking statuses.
- Customers reserve for ten minutes, then submit their request for organizer review. The review hold lasts at most 24 hours; expired holds release stock automatically in stock computations.
- Organizer reviews requests in Admin > Orders & Transactions > VIEW, and explicitly approves or rejects. Rejection requires a reason.
- Simulation e-ticket QR is issued only after organizer approval. Existing confirmed orders/tickets are preserved.
- Customer account page shows review and rejection status.
- Overview surfaces **Approved Booking Value** (simulation) separately from **Real Revenue (Rp0)** and adds pending organizer review KPI.
- Reports continue to distinguish confirmed simulation value from payment receipts.
- Database migration `009_admin_review_workflow.sql` applied to Supabase project `nadakita-live` on 2026-10-10. DO NOT reapply blindly.
- No changes to event lineup, ticket prices, site branding, artist photos, or venue image.

## Current limitations
- No payment gateway or real transaction verification exists. Organizer approval is a presentation-only simulation; it does not represent payment receipt.
- Existing confirmed demo tickets intentionally remain confirmed.
- Review request hold is 24 hours. Expired requests cannot be approved.
- Web-based end-to-end customer/admin sessions and concurrent booking stress tests need testing in the user's browser.
- The admin review UI is for current orders and not a real payment-receipt workflow.

## Testing locally
1. Extract this ZIP and open NADAKITA LIVE via Live Server.
2. Sign in as customer; book one test ticket, submit for review. Confirm no QR is issued.
3. Sign in as organizer; Admin > Orders & Transactions > filter Awaiting review > View > approve or reject.
4. Refresh customer dashboard. Approved requests have a demo e-ticket; rejected requests display the reason.
5. Test checkout again to ensure stock counts change on reservation and rejection.

## Files changed
- `js/live/app.js`
- `js/live/admin.js`
- `css/live.css`
- `supabase/migrations/009_admin_review_workflow.sql` (new)
- `ADMIN_REVIEW_UPDATE.md` (new)

## Note on existing orders
Previously created confirmed demo orders were not updated or deleted. Historic demo value remains under Approved Booking Value, while Real Revenue is kept at zero.
