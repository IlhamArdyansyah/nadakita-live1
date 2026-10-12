-- NADAKITA LIVE — foundational schema. Run in Supabase SQL Editor on a NEW project.
-- All shows/amounts are fictional academic data. No payment gateway is integrated.
create extension if not exists pgcrypto with schema extensions;

create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 full_name text not null default '', phone text not null default '',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 constraint profiles_name_len check (length(full_name)<=120),
 constraint profiles_phone_len check (length(phone)<=35)
);
create table public.admin_grants (
 user_id uuid primary key references auth.users(id) on delete cascade,
 granted_at timestamptz not null default now()
);
create table public.venues (
 id uuid primary key default gen_random_uuid(), name text not null,
 city text not null default 'Jakarta', description text not null default ''
);
create table public.artists (
 id uuid primary key default gen_random_uuid(), slug text not null unique,
 name text not null, image_path text, description text not null default ''
);
create table public.shows (
 id uuid primary key default gen_random_uuid(), slug text not null unique,
 artist_id uuid not null references public.artists(id), venue_id uuid not null references public.venues(id),
 title text not null, show_date date not null, gates_at time not null default '16:00',
 starts_at time not null default '20:00', ends_at time not null default '22:00',
 description text not null default '', poster_url text, banner_url text,
 status text not null default 'draft' check (status in ('draft','published','sold_out','completed','cancelled')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.ticket_categories (
 id uuid primary key default gen_random_uuid(), show_id uuid not null references public.shows(id) on delete restrict,
 code text not null, name text not null, description text not null default '', benefits text not null default '',
 price_idr bigint not null check (price_idr >= 0), capacity integer not null check (capacity>=0),
 sales_start timestamptz, sales_end timestamptz,
 active boolean not null default true, created_at timestamptz not null default now(),
 unique(show_id,code), constraint valid_sales_window check (sales_start is null or sales_end is null or sales_end>sales_start)
);
create table public.orders (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id),
 show_id uuid not null references public.shows(id), request_key text not null,
 customer_name text not null, customer_email text not null, customer_phone text not null,
 status text not null default 'pending_demo' check (status in ('pending_demo','confirmed_demo','expired','cancelled')),
 total_idr bigint not null default 0 check(total_idr >= 0),
 payment_method text not null default 'DEMO_ONLY',
 payment_status text not null default 'NOT_APPLICABLE',
 expires_at timestamptz not null default (now() + interval '10 minutes'),
 created_at timestamptz not null default now(), confirmed_at timestamptz,
 cancelled_at timestamptz,
 unique(owner_id, request_key),
 constraint customer_name_len check(length(customer_name) between 3 and 120),
 constraint customer_email_len check(length(customer_email) between 5 and 180),
 constraint customer_phone_len check(length(customer_phone) between 9 and 35)
);
create table public.order_items (
 id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id) on delete restrict,
 category_id uuid not null references public.ticket_categories(id) on delete restrict,
 quantity integer not null check(quantity between 1 and 4), unit_price_idr bigint not null check(unit_price_idr>=0),
 attendees jsonb not null,
 unique(order_id, category_id),
 constraint attendees_array check(jsonb_typeof(attendees)='array' and jsonb_array_length(attendees)=quantity)
);
create table public.tickets (
 id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id),
 category_id uuid not null references public.ticket_categories(id),
 attendee_name text not null, code text not null unique default ('NDKT-' || replace(gen_random_uuid()::text,'-','')),
 issued_at timestamptz not null default now(),
 constraint attendee_len check(length(attendee_name) between 3 and 120)
);
create table public.checkins (
 ticket_id uuid primary key references public.tickets(id),
 staff_id uuid not null references auth.users(id), checked_at timestamptz not null default now()
);
create table public.audit_logs (
 id bigint generated always as identity primary key, actor_id uuid references auth.users(id),
 action text not null, target text not null, details jsonb not null default '{}',
 created_at timestamptz not null default now()
);
create table public.site_content (
 key text primary key, value text not null default '', updated_at timestamptz not null default now()
);
create table public.faqs (
 id uuid primary key default gen_random_uuid(), question text not null, answer text not null,
 sort_order integer not null default 0, published boolean not null default true
);
create table public.announcements (
 id uuid primary key default gen_random_uuid(), title text not null, body text not null,
 published boolean not null default false, created_at timestamptz not null default now()
);
create table public.general_settings (
 key text primary key, value text not null default ''
);
create index idx_orders_owner on public.orders(owner_id,created_at desc);
create index idx_orders_show_status on public.orders(show_id,status);
create index idx_items_category on public.order_items(category_id);
create index idx_tickets_order on public.tickets(order_id);
create index idx_checkin_date on public.checkins(checked_at);

create or replace function public.bootstrap_profile() returns trigger language plpgsql security definer set search_path = '' as $$
begin
 insert into public.profiles(id,full_name) values (new.id,left(coalesce(new.raw_user_meta_data->>'full_name',''),120)) on conflict (id) do nothing;
 return new;
end $$;
create trigger create_profile_after_signup after insert on auth.users for each row execute function public.bootstrap_profile();
insert into public.profiles(id,full_name)
 select id,left(coalesce(raw_user_meta_data->>'full_name',''),120) from auth.users on conflict(id) do nothing;

-- Staff access is provisioned MANUALLY through SQL (no Staff/Role Management UI).
create or replace function public.is_admin() returns boolean
 language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.admin_grants where user_id=(select auth.uid()));
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon,authenticated;
-- Anonymous visitors always receive false; this avoids permission errors in public-read RLS rules.

alter table public.profiles enable row level security;
alter table public.admin_grants enable row level security;
alter table public.venues enable row level security;
alter table public.artists enable row level security;
alter table public.shows enable row level security;
alter table public.ticket_categories enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.tickets enable row level security;
alter table public.checkins enable row level security;
alter table public.audit_logs enable row level security;
alter table public.site_content enable row level security;
alter table public.faqs enable row level security;
alter table public.announcements enable row level security;
alter table public.general_settings enable row level security;

create policy own_profile_select on public.profiles for select to authenticated using ((select auth.uid())=id or (select public.is_admin()));
create policy own_profile_insert on public.profiles for insert to authenticated with check ((select auth.uid())=id);
create policy own_profile_update on public.profiles for update to authenticated using ((select auth.uid())=id) with check ((select auth.uid())=id);
create policy own_grant_read on public.admin_grants for select to authenticated using (user_id=(select auth.uid()));

create policy public_venues_read on public.venues for select to anon,authenticated using(true);
create policy admin_venues_write on public.venues for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy public_artists_read on public.artists for select to anon,authenticated using(true);
create policy admin_artists_write on public.artists for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy public_shows_read on public.shows for select to anon,authenticated using (status in ('published','sold_out','completed') or (select public.is_admin()));
create policy admin_shows_write on public.shows for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy public_categories_read on public.ticket_categories for select to anon,authenticated using (exists(select 1 from public.shows s where s.id=show_id and s.status in ('published','sold_out','completed')) or (select public.is_admin()));
create policy admin_categories_write on public.ticket_categories for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- Clients can read their own orders/tickets but may NEVER write direct order/stock/checkin rows.
create policy own_orders_read on public.orders for select to authenticated using (owner_id=(select auth.uid()) or (select public.is_admin()));
create policy own_items_read on public.order_items for select to authenticated using (exists(select 1 from public.orders o where o.id=order_id and (o.owner_id=(select auth.uid()) or (select public.is_admin()))));
create policy own_tickets_read on public.tickets for select to authenticated using (exists(select 1 from public.orders o where o.id=order_id and (o.owner_id=(select auth.uid()) or (select public.is_admin()))));
create policy admin_checkins_read on public.checkins for select to authenticated using ((select public.is_admin()) or exists(select 1 from public.tickets t join public.orders o on o.id=t.order_id where t.id=ticket_id and o.owner_id=(select auth.uid())));
create policy admin_audit_read on public.audit_logs for select to authenticated using ((select public.is_admin()));
create policy public_content_read on public.site_content for select to anon,authenticated using(true);
create policy admin_content_write on public.site_content for all to authenticated using((select public.is_admin())) with check((select public.is_admin()));
create policy public_faq_read on public.faqs for select to anon,authenticated using (published or (select public.is_admin()));
create policy admin_faq_write on public.faqs for all to authenticated using((select public.is_admin())) with check((select public.is_admin()));
create policy public_announcements_read on public.announcements for select to anon,authenticated using (published or (select public.is_admin()));
create policy admin_announcements_write on public.announcements for all to authenticated using((select public.is_admin())) with check((select public.is_admin()));
create policy public_settings_read on public.general_settings for select to anon,authenticated using(true);
create policy admin_settings_write on public.general_settings for all to authenticated using((select public.is_admin())) with check((select public.is_admin()));

-- Files are public ONLY when intentionally uploaded by an authorized admin.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('nadakita-public','nadakita-public',true,5242880,array['image/jpeg','image/png','image/webp'])
 on conflict(id) do nothing;
create policy nadakita_public_assets_read on storage.objects for select to anon,authenticated using(bucket_id='nadakita-public');
create policy nadakita_admin_assets_insert on storage.objects for insert to authenticated with check(bucket_id='nadakita-public' and (select public.is_admin()));
create policy nadakita_admin_assets_update on storage.objects for update to authenticated using(bucket_id='nadakita-public' and (select public.is_admin())) with check(bucket_id='nadakita-public' and (select public.is_admin()));
create policy nadakita_admin_assets_delete on storage.objects for delete to authenticated using(bucket_id='nadakita-public' and (select public.is_admin()));
