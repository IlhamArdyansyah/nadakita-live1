-- Optional safe copy refresh for projects that already ran 003_seed.sql.
-- Only update records still holding the exact original seed; admin-customized content is preserved.
update public.venues set name='Stadion Utama Gelora Bung Karno'
 where id='00000000-0000-4000-8000-000000000001'
   and name='Stadion Utama Gelora Bung Karno (fictional event concept)';
update public.venues set description='Venue reference for the NADAKITA LIVE concept; not an official venue booking.'
 where id='00000000-0000-4000-8000-000000000001' and description='Venue reference only. No venue booking or endorsement.';
update public.artists set description=case slug
 when 'weeknd' then 'Night 01 — Into the After Hours'
 when 'bieber' then 'Night 02 — All In. All Heart.'
 when 'bruno' then 'Night 03 — The Night Has Rhythm' end
 where slug in ('weeknd','bieber','bruno') and description like 'Night % — fictional concept';
update public.ticket_categories set benefits='Premium zone access'
 where code='vip' and benefits='Simulated VIP experience';
update public.site_content set value='Konsep kreatif. Penampilan artis dan penggunaan GBK belum dikonfirmasi; tidak ada penjualan tiket resmi.'
 where key='footer_note' and value='Academic concept project. No real tickets or confirmed performances.';
update public.site_content set value='Stadion Utama GBK, Jakarta — referensi venue; bukan pemesanan resmi.'
 where key='venue_info' and value='Stadion Utama GBK, Jakarta — academic fictional event concept.';
update public.general_settings set value='NADAKITA LIVE'
 where key='organizer' and value='NADAKITA Academic Project';
update public.faqs set answer='Belum. Artis, tanggal, dan penggunaan GBK dalam rancangan ini bukan pengumuman resmi.'
 where question='Are these real concerts?'
   and answer='No. The entire concert series is a fictional academic demonstration.';
update public.faqs set answer='Tidak. E-ticket hanya untuk simulasi presentasi. Tidak ada pembayaran atau tiket masuk yang berlaku.'
 where question='Can I purchase a real ticket?'
   and answer='No. This system only issues demonstration tickets. No payments are collected.';
