-- Review workflow for demo bookings. Existing confirmed orders and tickets are retained.
-- Apply once after 001-008; real payments are intentionally NOT implemented.
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pending_demo','under_review','confirmed_demo','rejected','expired','cancelled'));
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS submitted_at timestamptz;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS reviewed_by uuid references auth.users(id);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS review_note text NOT NULL DEFAULT '';

-- Submit a reserved demo order for an organizer's manual review.
CREATE OR REPLACE FUNCTION public.submit_demo_order(p_order_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE o public.orders%rowtype;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Please sign in'; END IF;
 SELECT * INTO o FROM public.orders WHERE id=p_order_id AND owner_id=auth.uid() FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
 IF o.status='under_review' THEN RETURN jsonb_build_object('id',o.id,'status',o.status,'expires_at',o.expires_at); END IF;
 IF o.status<>'pending_demo' THEN RAISE EXCEPTION 'Order is not awaiting submission'; END IF;
 IF o.expires_at<=now() THEN
   UPDATE public.orders SET status='expired' WHERE id=o.id;
   RETURN jsonb_build_object('id',o.id,'status','expired');
 END IF;
 UPDATE public.orders SET status='under_review', submitted_at=now(), expires_at=now()+interval '24 hours' WHERE id=o.id
 RETURNING * INTO o;
 INSERT INTO public.audit_logs(actor_id,action,target) VALUES(auth.uid(),'submit_demo_for_review',o.id::text);
 RETURN jsonb_build_object('id',o.id,'status',o.status,'expires_at',o.expires_at);
END $$;

-- Only a Supabase admin_grants member may issue demo QR tickets.
CREATE OR REPLACE FUNCTION public.admin_review_demo_order(p_order_id uuid,p_approve boolean,p_note text DEFAULT '')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE o public.orders%rowtype; item record; attendee jsonb; decision text; note text:=left(trim(coalesce(p_note,'')),500);
BEGIN
 IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admin access required'; END IF;
 SELECT * INTO o FROM public.orders WHERE id=p_order_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
 IF o.status='confirmed_demo' AND p_approve THEN RETURN jsonb_build_object('id',o.id,'status',o.status); END IF;
 IF o.status='rejected' AND NOT p_approve THEN RETURN jsonb_build_object('id',o.id,'status',o.status); END IF;
 IF o.status<>'under_review' THEN RAISE EXCEPTION 'Only requests under review can be decided'; END IF;
 IF o.expires_at<=now() THEN
    UPDATE public.orders SET status='expired' WHERE id=o.id;
    RETURN jsonb_build_object('id',o.id,'status','expired');
 END IF;
 IF NOT p_approve AND length(note)<5 THEN RAISE EXCEPTION 'Please provide a rejection reason (min 5 characters)'; END IF;
 decision:=CASE WHEN p_approve THEN 'confirmed_demo' ELSE 'rejected' END;
 UPDATE public.orders SET status=decision,reviewed_by=auth.uid(),reviewed_at=now(),review_note=note,
   confirmed_at=CASE WHEN p_approve THEN now() ELSE confirmed_at END
 WHERE id=o.id;
 IF p_approve THEN
  FOR item IN SELECT * FROM public.order_items WHERE order_id=o.id LOOP
   FOR attendee IN SELECT value FROM jsonb_array_elements(item.attendees) LOOP
    INSERT INTO public.tickets(order_id,category_id,attendee_name)
      VALUES(o.id,item.category_id,attendee #>> '{}');
   END LOOP;
  END LOOP;
 END IF;
 INSERT INTO public.audit_logs(actor_id,action,target,details)
 VALUES(auth.uid(),CASE WHEN p_approve THEN 'approve_demo_order' ELSE 'reject_demo_order' END,o.id::text,jsonb_build_object('reason',note));
 RETURN jsonb_build_object('id',o.id,'status',decision);
END $$;

-- Disable the original customer-side direct approval endpoint even for cached clients.
REVOKE EXECUTE ON FUNCTION public.confirm_demo_order(uuid) FROM public,anon,authenticated;
CREATE OR REPLACE FUNCTION public.confirm_demo_order(p_order_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 RAISE EXCEPTION 'Direct ticket confirmation is retired; submit for organizer review instead';
END $$;
REVOKE EXECUTE ON FUNCTION public.confirm_demo_order(uuid) FROM public,anon,authenticated;

-- Reservations awaiting review continue to hold stock for 24 hours, subject to expiry.
CREATE OR REPLACE FUNCTION public.get_stock()
RETURNS table(category_id uuid,show_id uuid,capacity integer,reserved integer,available integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT c.id,c.show_id,c.capacity,
 coalesce((SELECT sum(i.quantity)::integer FROM public.order_items i JOIN public.orders o ON o.id=i.order_id
   WHERE i.category_id=c.id AND (o.status='confirmed_demo' OR (o.status IN ('pending_demo','under_review') AND o.expires_at>now()))),0),
 greatest(0,c.capacity-coalesce((SELECT sum(i.quantity)::integer FROM public.order_items i JOIN public.orders o ON o.id=i.order_id
   WHERE i.category_id=c.id AND (o.status='confirmed_demo' OR (o.status IN ('pending_demo','under_review') AND o.expires_at>now()))),0))
 FROM public.ticket_categories c JOIN public.shows s ON s.id=c.show_id
 WHERE s.status IN ('published','sold_out','completed') AND c.active;
$$;

-- Additional stock guard for the old create_demo_reservation RPC and all future inserts.
CREATE OR REPLACE FUNCTION public.guard_new_order_item_capacity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE claimed integer; cap integer;
BEGIN
 SELECT capacity INTO cap FROM public.ticket_categories WHERE id=NEW.category_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Ticket category missing'; END IF;
 SELECT coalesce(sum(i.quantity),0) INTO claimed FROM public.order_items i JOIN public.orders o ON o.id=i.order_id
 WHERE i.category_id=NEW.category_id AND (o.status='confirmed_demo' OR (o.status IN ('pending_demo','under_review') AND o.expires_at>now()));
 IF claimed+NEW.quantity>cap THEN RAISE EXCEPTION 'Insufficient ticket availability'; END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_order_item_capacity ON public.order_items;
CREATE TRIGGER guard_order_item_capacity BEFORE INSERT ON public.order_items FOR EACH ROW EXECUTE FUNCTION public.guard_new_order_item_capacity();

CREATE OR REPLACE FUNCTION public.prevent_oversold_capacity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE claimed integer;
BEGIN
 SELECT coalesce(sum(i.quantity),0) INTO claimed FROM public.order_items i JOIN public.orders o ON o.id=i.order_id
 WHERE i.category_id=NEW.id AND (o.status='confirmed_demo' OR (o.status IN ('pending_demo','under_review') AND o.expires_at>now()));
 IF NEW.capacity<claimed THEN RAISE EXCEPTION 'Cannot reduce capacity below reserved stock'; END IF;
 RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.admin_manage_category(p_id uuid,p_capacity integer,p_price_idr bigint,p_active boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE claimed integer;
BEGIN
 IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admin access required'; END IF;
 IF p_capacity<0 OR p_price_idr<0 THEN RAISE EXCEPTION 'Invalid price or capacity'; END IF;
 PERFORM 1 FROM public.ticket_categories WHERE id=p_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Category not found'; END IF;
 SELECT coalesce(sum(i.quantity),0) INTO claimed FROM public.order_items i JOIN public.orders o ON o.id=i.order_id
 WHERE i.category_id=p_id AND (o.status='confirmed_demo' OR (o.status IN ('pending_demo','under_review') AND o.expires_at>now()));
 IF p_capacity<claimed THEN RAISE EXCEPTION 'Capacity below reservations'; END IF;
 UPDATE public.ticket_categories SET capacity=p_capacity,price_idr=p_price_idr,active=p_active WHERE id=p_id;
 INSERT INTO public.audit_logs(actor_id,action,target) VALUES(auth.uid(),'update_ticket_category',p_id::text);
END $$;

CREATE OR REPLACE FUNCTION public.admin_reconcile_expirations()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE affected integer;
BEGIN
 IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admin access required'; END IF;
 UPDATE public.orders SET status='expired' WHERE status IN ('pending_demo','under_review') AND expires_at<=now();
 GET DIAGNOSTICS affected=ROW_COUNT;
 RETURN affected;
END $$;

CREATE OR REPLACE FUNCTION public.cancel_demo_order(p_order_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE o public.orders%rowtype;
BEGIN
 SELECT * INTO o FROM public.orders WHERE id=p_order_id AND (owner_id=auth.uid() OR public.is_admin()) FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
 IF o.status IN ('cancelled','expired') THEN RETURN jsonb_build_object('id',o.id,'status',o.status); END IF;
 IF o.status='rejected' THEN RAISE EXCEPTION 'Rejected orders cannot be changed'; END IF;
 IF EXISTS(SELECT 1 FROM public.checkins ci JOIN public.tickets t ON t.id=ci.ticket_id WHERE t.order_id=o.id) THEN RAISE EXCEPTION 'Checked-in order cannot be cancelled'; END IF;
 UPDATE public.orders SET status='cancelled',cancelled_at=now() WHERE id=o.id;
 INSERT INTO public.audit_logs(actor_id,action,target) VALUES(auth.uid(),'cancel_demo_order',o.id::text);
 RETURN jsonb_build_object('id',o.id,'status','cancelled');
END $$;

CREATE OR REPLACE FUNCTION public.admin_stats()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admin access required'; END IF;
 RETURN jsonb_build_object(
   'total_orders',(SELECT count(*) FROM public.orders),
   'confirmed_demo_orders',(SELECT count(*) FROM public.orders WHERE status='confirmed_demo'),
   'pending_demo',(SELECT count(*) FROM public.orders WHERE status='pending_demo' AND expires_at>now()),
   'pending_review',(SELECT count(*) FROM public.orders WHERE status='under_review' AND expires_at>now()),
   'review_value',(SELECT coalesce(sum(total_idr),0) FROM public.orders WHERE status='under_review' AND expires_at>now()),
   'tickets_issued',(SELECT count(*) FROM public.tickets t JOIN public.orders o ON o.id=t.order_id WHERE o.status='confirmed_demo'),
   'attendees_checked_in',(SELECT count(*) FROM public.checkins),
   'total_attendees',(SELECT count(*) FROM public.tickets t JOIN public.orders o ON o.id=t.order_id WHERE o.status='confirmed_demo'),
   'demo_booking_value',(SELECT coalesce(sum(total_idr),0) FROM public.orders WHERE status='confirmed_demo'),
   'real_revenue',0,
   'available_tickets',(SELECT coalesce(sum(greatest(0,c.capacity-coalesce((SELECT sum(i.quantity)::integer FROM public.order_items i JOIN public.orders o ON o.id=i.order_id WHERE i.category_id=c.id AND (o.status='confirmed_demo' OR (o.status IN ('pending_demo','under_review') AND o.expires_at>now()))),0))),0) FROM public.ticket_categories c JOIN public.shows s ON s.id=c.show_id WHERE s.status='published' AND c.active)
 );
END $$;

-- Never expose trigger helpers or admin RPCs to anonymous visitors.
REVOKE ALL ON FUNCTION public.guard_new_order_item_capacity() FROM public,anon,authenticated;
REVOKE ALL ON FUNCTION public.submit_demo_order(uuid) FROM public,anon;
REVOKE ALL ON FUNCTION public.admin_review_demo_order(uuid,boolean,text) FROM public,anon;
GRANT EXECUTE ON FUNCTION public.submit_demo_order(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_review_demo_order(uuid,boolean,text) TO authenticated;
