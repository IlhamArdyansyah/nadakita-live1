-- Preserve existing booking validation, stock locking and grants; only add a role guard.
DO $migration$
DECLARE signature text; definition text; body text; guarded text;
BEGIN
 FOREACH signature IN ARRAY ARRAY[
  'public.create_demo_reservation(uuid,jsonb,jsonb,text)',
  'public.submit_demo_order(uuid)'
 ] LOOP
  SELECT pg_get_functiondef(oid), prosrc INTO definition,body FROM pg_proc WHERE oid=signature::regprocedure;
  IF body NOT ILIKE '%Admin accounts cannot book tickets. Use a customer account.%' THEN
   guarded := regexp_replace(body, '\mBEGIN\M', E'BEGIN\n IF public.is_admin() THEN RAISE EXCEPTION ''Admin accounts cannot book tickets. Use a customer account.''; END IF;', 'i');
   IF guarded=body THEN RAISE EXCEPTION 'Expected PL/pgSQL body for %',signature; END IF;
   EXECUTE replace(definition,body,guarded);
  END IF;
 END LOOP;
END $migration$;
