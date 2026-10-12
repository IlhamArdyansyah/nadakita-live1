-- Fictional project seed; all concerts and offers are for academic demonstration only.
insert into public.venues(id,name,city,description) values
('00000000-0000-4000-8000-000000000001','Stadion Utama Gelora Bung Karno','Jakarta','Venue reference for the NADAKITA LIVE concept; not an official venue booking.')
on conflict(id) do nothing;
insert into public.artists(id,slug,name,description,image_path) values
('00000000-0000-4000-8000-000000000011','weeknd','The Weeknd','Night 01 — Into the After Hours','assets/images/artists/the-weeknd.jpg'),
('00000000-0000-4000-8000-000000000012','bieber','Justin Bieber','Night 02 — All In. All Heart.','assets/images/artists/justin-bieber.jpg'),
('00000000-0000-4000-8000-000000000013','bruno','Bruno Mars','Night 03 — The Night Has Rhythm','assets/images/artists/bruno-mars.jpg')
on conflict(id) do nothing;
insert into public.shows(id,slug,artist_id,venue_id,title,show_date,status,description) values
('00000000-0000-4000-8000-000000000101','weeknd','00000000-0000-4000-8000-000000000011','00000000-0000-4000-8000-000000000001','The Weeknd — Night 01','2026-11-20','published','Into the After Hours.'),
('00000000-0000-4000-8000-000000000102','bieber','00000000-0000-4000-8000-000000000012','00000000-0000-4000-8000-000000000001','Justin Bieber — Night 02','2026-11-21','published','All in. All heart.'),
('00000000-0000-4000-8000-000000000103','bruno','00000000-0000-4000-8000-000000000013','00000000-0000-4000-8000-000000000001','Bruno Mars — Night 03','2026-11-22','published','The night has rhythm.')
on conflict(id) do nothing;
insert into public.ticket_categories(show_id,code,name,description,benefits,price_idr,capacity) 
select s.id, t.code,t.name,t.description,t.benefits,t.price,t.capacity from public.shows s
cross join (values
('vip','VIP EXPERIENCE','Premium zone','Premium zone access',2250000::bigint,120),
('festa','FESTIVAL A','Standing · Front zone','Front standing zone',1500000::bigint,400),
('festb','FESTIVAL B','Standing · Rear zone','Rear standing zone',1200000::bigint,600),
('cat1','CAT 1','Seated · Premium tribune','Zone selection only; no numbered seats',950000::bigint,500),
('cat2','CAT 2','Seated · Regular tribune','Zone selection only; no numbered seats',650000::bigint,700)
) as t(code,name,description,benefits,price,capacity)
on conflict(show_id,code) do nothing;
insert into public.site_content(key,value) values
('hero_title','THREE NIGHTS. ONE CITY.'),
('hero_subtitle','Three international icons. Three standalone stadium concerts. One city, louder than ever.'),
('hero_banner_url',''),
('footer_note','Konsep kreatif. Penampilan artis dan penggunaan GBK belum dikonfirmasi; tidak ada penjualan tiket resmi.'),
('venue_info','Stadion Utama GBK, Jakarta — referensi venue; bukan pemesanan resmi.')
on conflict(key) do nothing;
insert into public.general_settings(key,value) values
('brand_name','NADAKITA LIVE'),('organizer','NADAKITA LIVE'),
('contact_email',''),('contact_phone',''),('social_instagram',''),('currency','IDR'),('timezone','Asia/Jakarta')
on conflict(key) do nothing;
insert into public.faqs(question,answer,sort_order) values
('Are these real concerts?','Belum. Artis, tanggal, dan penggunaan GBK dalam rancangan ini bukan pengumuman resmi.',1),
('Can I purchase a real ticket?','Tidak. E-ticket hanya untuk simulasi presentasi. Tidak ada pembayaran atau tiket masuk yang berlaku.',2)
;
