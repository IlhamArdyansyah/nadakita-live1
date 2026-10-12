-- Cover foreign keys used by joins, deletes, attendee reporting, and audit lookups.
-- All statements are idempotent and safe to apply to the connected project.
create index if not exists idx_audit_logs_actor_id on public.audit_logs(actor_id);
create index if not exists idx_checkins_staff_id on public.checkins(staff_id);
create index if not exists idx_shows_artist_id on public.shows(artist_id);
create index if not exists idx_shows_venue_id on public.shows(venue_id);
create index if not exists idx_tickets_category_id on public.tickets(category_id);
