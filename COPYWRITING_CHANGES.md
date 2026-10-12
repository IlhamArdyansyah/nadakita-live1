# NADAKITA LIVE — Copywriting Revision for Presentation

This pass only changes visible copywriting in `js/preview.js`, `js/live/app.js`, `js/live/admin.js`, and page metadata. It does not modify checkout operations, database schemas, navigation, prices, styling or Supabase configuration. The seed now includes revised copy plus a backward-compatible migration for existing projects.

- Removed repetitive “academic project”, “demo” and “concept preview” headers/hero content from marketing pages.
- Renamed zone, show guide, and account copy to be more polished and succinct.
- Kept a compact footer note on every page that the concerts and venue are not confirmed and there is no real ticket sale.
- Kept a clear payment/ticket limitation on ticket selection, checkout and invalid sample-ticket areas; these are still simulations.
- Database statuses and RPC names with `_demo` are intentionally unchanged for compatibility. The admin revenue remains zero without actual payments.
- This is a *copywriting update*, not proof of Supabase integration or operational payment processing.
