-- All writes to order/stock/tickets/check-ins are exclusively through these RPCs.
-- Do not grant direct INSERT/UPDATE/DELETE on those tables to browser roles.
alter table public.orders add column request_fingerprint text not null default '';

create or replace function public.get_stock()
returns table(category_id uuid, show_id uuid, capacity integer, reserved integer, available integer)
language sql stable security definer set search_path = '' as $$
 select c.id,c.show_id,c.capacity,
  coalesce((select sum(i.quantity)::integer from public.order_items i join public.orders o on o.id=i.order_id
    where i.category_id=c.id and (o.status='confirmed_demo' or (o.status='pending_demo' and o.expires_at>now()))),0) as reserved,
  greatest(0,c.capacity-coalesce((select sum(i.quantity)::integer from public.order_items i join public.orders o on o.id=i.order_id
    where i.category_id=c.id and (o.status='confirmed_demo' or (o.status='pending_demo' and o.expires_at>now()))),0)) as available
 from public.ticket_categories c join public.shows s on s.id=c.show_id
 where s.status in ('published','sold_out','completed') and c.active;
$$;
revoke all on function public.get_stock() from public;
grant execute on function public.get_stock() to anon,authenticated;

create or replace function public.create_demo_reservation(
 p_show_id uuid,p_items jsonb,p_contact jsonb,p_request_key text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
 uid uuid := auth.uid(); row_item jsonb; category record; order_id uuid; qty int; n text;
 total_qty int := 0; total_price bigint := 0; claimed int; fp text;
begin
 if uid is null then raise exception 'Please sign in before checkout'; end if;
 if p_request_key !~ '^[a-zA-Z0-9_-]{16,100}$' then raise exception 'Invalid request key'; end if;
 if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)=0 or jsonb_array_length(p_items)>5 then raise exception 'Invalid category selection'; end if;
 if length(trim(coalesce(p_contact->>'name',''))) not between 3 and 120
    or coalesce(p_contact->>'email','') !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
    or length(coalesce(p_contact->>'email',''))>180
    or coalesce(p_contact->>'phone','') !~ '^[+]?[0-9 ()-]{9,35}$'
 then raise exception 'Invalid customer information'; end if;
 fp := md5(p_show_id::text || p_items::text || p_contact::text);
 select id into order_id from public.orders where owner_id=uid and request_key=p_request_key;
 if found then
  if not exists(select 1 from public.orders where id=order_id and request_fingerprint=fp) then
   raise exception 'Request key has already been used for different data';
  end if;
  return (select jsonb_build_object('id',id,'status',status,'expires_at',expires_at,'total_idr',total_idr) from public.orders where id=order_id);
 end if;
 if not exists(select 1 from public.shows where id=p_show_id and status='published') then raise exception 'Concert is not available'; end if;
 -- Rows locked in stable UUID order; all simultaneous reservations share these category locks.
 for row_item in select value from jsonb_array_elements(p_items) order by (value->>'category_id') loop
   if jsonb_typeof(row_item->'attendees') <> 'array' then raise exception 'Missing attendee names'; end if;
   qty := jsonb_array_length(row_item->'attendees');
   if qty < 1 or qty > 4 then raise exception 'Invalid ticket quantity'; end if;
   total_qty := total_qty + qty;
   if total_qty > 4 then raise exception 'Maximum 4 tickets per reservation'; end if;
   if (select count(*) from jsonb_array_elements(p_items) t where t->>'category_id'=row_item->>'category_id')>1 then
     raise exception 'Duplicate ticket category';
   end if;
   for n in select value #>> '{}' from jsonb_array_elements(row_item->'attendees') loop
     if length(trim(n)) not between 3 and 120 then raise exception 'Invalid attendee name'; end if;
   end loop;
   select * into category from public.ticket_categories c
     where c.id=(row_item->>'category_id')::uuid and c.show_id=p_show_id and c.active
     for update;
   if not found or (category.sales_start is not null and now()<category.sales_start)
     or (category.sales_end is not null and now()>category.sales_end) then raise exception 'Selected zone is not on sale'; end if;
   select coalesce(sum(i.quantity),0) into claimed from public.order_items i
     join public.orders o on o.id=i.order_id where i.category_id=category.id
     and (o.status='confirmed_demo' or (o.status='pending_demo' and o.expires_at>now()));
   if category.capacity - claimed < qty then raise exception 'Insufficient ticket availability'; end if;
   total_price := total_price + qty*category.price_idr;
 end loop;
 insert into public.orders(owner_id,show_id,request_key,request_fingerprint,customer_name,customer_email,customer_phone,total_idr)
 values(uid,p_show_id,p_request_key,fp,trim(p_contact->>'name'),lower(trim(p_contact->>'email')),trim(p_contact->>'phone'),total_price)
 returning id into order_id;
 for row_item in select value from jsonb_array_elements(p_items) loop
   insert into public.order_items(order_id,category_id,quantity,unit_price_idr,attendees)
   select order_id,c.id,jsonb_array_length(row_item->'attendees'),c.price_idr,row_item->'attendees'
   from public.ticket_categories c where c.id=(row_item->>'category_id')::uuid;
 end loop;
 insert into public.audit_logs(actor_id,action,target) values(uid,'reserve_demo_order',order_id::text);
 return (select jsonb_build_object('id',id,'status',status,'expires_at',expires_at,'total_idr',total_idr) from public.orders where id=order_id);
end $$;

create or replace function public.confirm_demo_order(p_order_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare o public.orders%rowtype; i record; attendee jsonb;
begin
 select * into o from public.orders where id=p_order_id and owner_id=auth.uid() for update;
 if not found then raise exception 'Order not found'; end if;
 if o.status='confirmed_demo' then return jsonb_build_object('id',o.id,'status',o.status); end if;
 if o.status<>'pending_demo' then raise exception 'Order cannot be confirmed'; end if;
 if o.expires_at<=now() then
   update public.orders set status='expired' where id=o.id;
   return jsonb_build_object('id',o.id,'status','expired');
 end if;
 -- Confirming a DEMO booking is not payment capture. Status is deliberately NOT paid.
 update public.orders set status='confirmed_demo',confirmed_at=now() where id=o.id;
 for i in select * from public.order_items where order_id=o.id loop
  for attendee in select value from jsonb_array_elements(i.attendees) loop
   insert into public.tickets(order_id,category_id,attendee_name)
    values(o.id,i.category_id,attendee #>> '{}');
  end loop;
 end loop;
 insert into public.audit_logs(actor_id,action,target) values(auth.uid(),'confirm_demo_order',o.id::text);
 return jsonb_build_object('id',o.id,'status','confirmed_demo');
end $$;

create or replace function public.cancel_demo_order(p_order_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare o public.orders%rowtype;
begin
 select * into o from public.orders where id=p_order_id and (owner_id=auth.uid() or public.is_admin()) for update;
 if not found then raise exception 'Order not found'; end if;
 if o.status in ('cancelled','expired') then return jsonb_build_object('id',o.id,'status',o.status); end if;
 if exists(select 1 from public.checkins ci join public.tickets t on t.id=ci.ticket_id where t.order_id=o.id) then
    raise exception 'An order with check-ins cannot be cancelled';
 end if;
 update public.orders set status='cancelled',cancelled_at=now() where id=o.id;
 insert into public.audit_logs(actor_id,action,target) values(auth.uid(),'cancel_demo_order',o.id::text);
 return jsonb_build_object('id',o.id,'status','cancelled');
end $$;

create or replace function public.admin_inspect_ticket(p_code text,p_show_id uuid,p_commit boolean default false)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare rec record; checked timestamptz; state text;
begin
 if not public.is_admin() then raise exception 'Admin access required'; end if;
 if length(trim(coalesce(p_code,'')))<10 then raise exception 'Enter a valid ticket code'; end if;
 select t.id as ticket_id,t.code,t.attendee_name,c.name as category_name,o.id as order_id,o.status,o.show_id,
 s.title as show_title into rec
 from public.tickets t join public.orders o on o.id=t.order_id
 join public.ticket_categories c on c.id=t.category_id join public.shows s on s.id=o.show_id
 where upper(t.code)=upper(trim(p_code)) for update of t;
 if not found then return jsonb_build_object('result','invalid'); end if;
 select checked_at into checked from public.checkins where ticket_id=rec.ticket_id;
 state := case when rec.status<>'confirmed_demo' then 'invalid'
               when rec.show_id<>p_show_id then 'wrong_concert'
               when checked is not null then 'already_used'
               else 'valid' end;
 if p_commit and state='valid' then
   checked := now();
   insert into public.checkins(ticket_id,staff_id,checked_at) values(rec.ticket_id,auth.uid(),checked);
   insert into public.audit_logs(actor_id,action,target) values(auth.uid(),'checkin',rec.ticket_id::text);
   state:='checked_in';
 end if;
 return jsonb_build_object('result',state,'ticket_code',rec.code,'name',rec.attendee_name,
   'category',rec.category_name,'concert',rec.show_title,'checked_at',checked);
end $$;

create or replace function public.admin_stats()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
 if not public.is_admin() then raise exception 'Admin access required'; end if;
 return jsonb_build_object(
  'total_orders',(select count(*) from public.orders),
  'confirmed_demo_orders',(select count(*) from public.orders where status='confirmed_demo'),
  'pending_demo',(select count(*) from public.orders where status='pending_demo' and expires_at>now()),
  'tickets_issued',(select count(*) from public.tickets t join public.orders o on o.id=t.order_id where o.status='confirmed_demo'),
  'attendees_checked_in',(select count(*) from public.checkins),
  'total_attendees',(select count(*) from public.tickets t join public.orders o on o.id=t.order_id where o.status='confirmed_demo'),
  'demo_booking_value',(select coalesce(sum(total_idr),0) from public.orders where status='confirmed_demo'),
  'real_revenue',0,
  'available_tickets',(select coalesce(sum(greatest(0,c.capacity-coalesce((select sum(i.quantity)::integer
    from public.order_items i join public.orders o on o.id=i.order_id where i.category_id=c.id
    and (o.status='confirmed_demo' or (o.status='pending_demo' and o.expires_at>now()))),0))),0)
    from public.ticket_categories c join public.shows s on s.id=c.show_id where s.status='published' and c.active)
 );
end $$;

create or replace function public.admin_manage_category(p_id uuid,p_capacity integer,p_price_idr bigint,p_active boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare booked integer;
begin
 if not public.is_admin() then raise exception 'Admin access required'; end if;
 if p_capacity<0 or p_price_idr<0 then raise exception 'Invalid price or capacity'; end if;
 perform 1 from public.ticket_categories where id=p_id for update;
 if not found then raise exception 'Category not found'; end if;
 select coalesce(sum(i.quantity),0) into booked from public.order_items i
 join public.orders o on o.id=i.order_id where i.category_id=p_id
 and (o.status='confirmed_demo' or (o.status='pending_demo' and o.expires_at>now()));
 if p_capacity<booked then raise exception 'Capacity cannot be lower than currently reserved tickets'; end if;
 update public.ticket_categories set capacity=p_capacity, price_idr=p_price_idr, active=p_active where id=p_id;
 insert into public.audit_logs(actor_id,action,target) values(auth.uid(),'update_ticket_category',p_id::text);
end $$;

-- Explicit execution grants. Avoid accidentally granting SECURITY DEFINER calls to PUBLIC.
revoke all on function public.create_demo_reservation(uuid,jsonb,jsonb,text) from public;
revoke all on function public.confirm_demo_order(uuid) from public;
revoke all on function public.cancel_demo_order(uuid) from public;
revoke all on function public.admin_inspect_ticket(text,uuid,boolean) from public;
revoke all on function public.admin_stats() from public;
revoke all on function public.admin_manage_category(uuid,integer,bigint,boolean) from public;
grant execute on function public.create_demo_reservation(uuid,jsonb,jsonb,text) to authenticated;
grant execute on function public.confirm_demo_order(uuid) to authenticated;
grant execute on function public.cancel_demo_order(uuid) to authenticated;
grant execute on function public.admin_inspect_ticket(text,uuid,boolean) to authenticated;
grant execute on function public.admin_stats() to authenticated;
grant execute on function public.admin_manage_category(uuid,integer,bigint,boolean) to authenticated;

-- Even an admin editing categories directly cannot reduce capacity below reserved/issued stock.
create or replace function public.prevent_oversold_capacity() returns trigger
 language plpgsql security definer set search_path = '' as $$
declare claimed integer;
begin
 select coalesce(sum(i.quantity),0) into claimed from public.order_items i
 join public.orders o on o.id=i.order_id where i.category_id=new.id
 and (o.status='confirmed_demo' or (o.status='pending_demo' and o.expires_at>now()));
 if new.capacity<claimed then raise exception 'Cannot reduce capacity below reserved stock'; end if;
 return new;
end $$;
create trigger capacity_guard before update of capacity on public.ticket_categories
 for each row execute function public.prevent_oversold_capacity();

-- Admin can reconcile stale demo reservations. Availability ignores expired holds even
-- before reconciliation, so there is no overselling window.
create or replace function public.admin_reconcile_expirations()
returns integer language plpgsql security definer set search_path = '' as $$
declare affected integer;
begin
 if not public.is_admin() then raise exception 'Admin access required'; end if;
 update public.orders set status='expired'
 where status='pending_demo' and expires_at<=now();
 get diagnostics affected = row_count;
 return affected;
end $$;
revoke all on function public.admin_reconcile_expirations() from public;
grant execute on function public.admin_reconcile_expirations() to authenticated;
