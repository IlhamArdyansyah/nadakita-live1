/**
 * Control Room organizer: sepuluh modul dipilih melalui hash URL.
 * app.js memeriksa role sebelum mount; RPC/RLS memeriksa izin setiap operasi.
 * Helper tabel/form ada di awal, renderer modul di tengah, routing/layout di akhir.
 */
import { supabase as db, money, esc, req, currentUser, report } from './supabase.js';
const items = [
  ['overview', 'Overview'],
  ['concerts', 'Concert Management'],
  ['tickets', 'Ticket Management'],
  ['orders', 'Orders & Transactions'],
  ['attendees', 'Attendees'],
  ['validation', 'Ticket Validation'],
  ['reports', 'Analytics & Reports'],
  ['content', 'Website Content'],
  ['settings', 'General Settings'],
  ['profile', 'Admin Profile'],
];
const $ = id => document.getElementById(id);
const ui = { current: 'overview', root: null, page: 0 };
const status = (s, expires) =>
  s === 'pending_demo' && expires && new Date(expires) <= new Date()
    ? 'Expired'
    : {
        confirmed_demo: 'Approved',
        pending_demo: 'Not submitted',
        under_review: 'Awaiting review',
        rejected: 'Rejected',
        expired: 'Expired',
        cancelled: 'Cancelled',
      }[s] || s;
const date = s => (s ? new Date(s).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) : '—');
const option = (list, sel = '', txt = 'name') =>
  list
    .map(
      x => `<option value="${esc(x.id)}" ${x.id === sel ? 'selected' : ''}>${esc(x[txt])}</option>`
    )
    .join('');
const selectShows = (shows, withAll = true) =>
  `${withAll ? '<option value="">All concerts</option>' : ''}${shows.map(s => `<option value="${s.id}">${esc(s.title)}</option>`).join('')}`;
const field = (name, label, value = '', type = 'text', more = '') =>
  `<div class="field"><label for="${esc(name)}">${esc(label)}</label><input id="${esc(name)}" name="${esc(name)}" type="${type}" value="${esc(value ?? '')}" ${more}></div>`;
const panel = (name, content) =>
  `<section class="admin-panel"><div class="admin-section-title"><div><div class="preview-label">OPERATIONS / ${esc(name.toUpperCase())}</div><h2>${esc(name)}</h2></div></div><div id="admin-message" class="live-info" hidden role="status"></div>${content}</section>`;
const flash = s => {
  let e = $('admin-message');
  if (e) {
    e.hidden = false;
    e.textContent = s;
  }
};
const button = (txt, id, cls = 'outline') =>
  `<button type="button" id="${id}" class="btn ${cls} small">${txt}</button>`;
const rows = (headers, body) =>
  `<div class="table-wrap"><table><thead><tr>${headers.map(x => `<th>${esc(x)}</th>`).join('')}</tr></thead><tbody>${body || `<tr><td colspan="${headers.length}">No records found.</td></tr>`}</tbody></table></div>`;
const labels = {
  overview: 'Performance at a glance',
  concerts: 'Manage all concert nights',
  tickets: 'Ticket inventory & pricing',
  orders: 'Search and manage reservations',
  attendees: 'Individual ticket holders',
  validation: 'QR & ticket check-in',
  reports: 'Data exports and sales reports',
  content: 'Publish content to the public website',
  settings: 'Organizer information',
};
const safe = action => async e => {
  try {
    await action(e);
  } catch (error) {
    report(error);
  }
};
/** Katalog konser yang dapat dibaca organizer, termasuk record non-publik melalui RLS. */
async function shows() {
  return req(db.from('shows').select('*,artists(name),venues(name)').order('show_date'));
}
/** Gabungkan kategori dan judul konser untuk manajemen inventori. */
async function allCategories() {
  return req(db.from('ticket_categories').select('*,shows(title,show_date)').order('created_at'));
}
/** Gunakan stok yang dihitung server; jangan mengurangi stok secara lokal. */
async function stocks() {
  return req(db.rpc('get_stock'));
}
/** Ringkasan operasional dari admin_stats, order terbaru, dan stok. */
async function pageOverview() {
  const [stats, concerts, orders, stock] = await Promise.all([
    req(db.rpc('admin_stats')),
    shows(),
    req(
      db
        .from('orders')
        .select('id,customer_name,total_idr,status,created_at,shows(title)')
        .order('created_at', { ascending: false })
        .limit(8)
    ),
    stocks(),
  ]);
  const tile = (num, label, sub = '') =>
    `<div class="admin-kpi"><span>${esc(label)}</span><strong>${num}</strong><small>${esc(sub)}</small></div>`;
  const showCards = concerts
    .map(s => {
      let current = stock.filter(x => x.show_id === s.id),
        capacity = current.reduce((n, c) => n + c.capacity, 0),
        issued = current.reduce((n, c) => n + c.reserved, 0);
      return `<div class="admin-concert-row"><div><strong>${esc(s.title)}</strong><div class="small-print">${esc(s.show_date)} · ${esc(s.status)}</div></div><div><strong>${issued} / ${capacity}</strong><div class="progress"><i style="width:${capacity ? Math.min(100, (issued / capacity) * 100) : 0}%"></i></div></div></div>`;
    })
    .join('');
  const body = panel(
    'Overview',
    `<p class="small-print">Statistics are sourced from Supabase. Payment processing is not enabled; reservation value must not be treated as revenue.</p><div class="admin-kpi-grid">${tile(money(stats.demo_booking_value), 'Approved Booking Value', 'Simulation · not revenue')}${tile(money(stats.real_revenue), 'Real Revenue', 'Payment gateway not connected')}${tile(stats.tickets_issued, 'Tickets Issued')}${tile(stats.total_orders, 'Total Orders')}${tile(stats.attendees_checked_in, 'Total Attendees (Checked In)')}${tile(stats.available_tickets, 'Available Tickets')}${tile(stats.pending_review || 0, 'Awaiting Organizer Review', 'Approval required before QR')}${tile(stats.pending_demo, 'Unsubmitted Reservations', '10-minute reservation hold')}</div><div class="admin-panels-two"><div class="paper-panel"><h3>CONCERT PERFORMANCE</h3>${showCards || 'No concerts yet'}</div><div class="paper-panel"><h3>BOOKING REVIEW QUEUE</h3><strong class="report-emphasis">${stats.pending_review || 0} requests</strong><p class="small-print">${money(stats.review_value || 0)} pending organizer review. No tickets issued until approval.</p><h3>QUICK ACTIONS</h3><div class="admin-actions">${button('ADD CONCERT', 'quick-concert', 'pink')}${button('MANAGE TICKETS', 'quick-ticket')}${button('REVIEW REQUESTS', 'quick-orders')}${button('VIEW REPORTS', 'quick-reports')}</div></div></div><h3>RECENT ORDERS</h3>${rows(['Order ID', 'Customer', 'Concert', 'Order Amount', 'Status', 'Date'], orders.map(o => `<tr><td><code>${esc(o.id.slice(0, 8))}</code></td><td>${esc(o.customer_name)}</td><td>${esc(o.shows?.title)}</td><td>${money(o.total_idr)}</td><td>${esc(status(o.status, o.expires_at))}</td><td>${esc(date(o.created_at))}</td></tr>`).join(''))}`
  );
  $('admin-body').innerHTML = body;
  [
    ['quick-concert', 'concerts'],
    ['quick-ticket', 'tickets'],
    ['quick-orders', 'orders'],
    ['quick-reports', 'reports'],
  ].forEach(
    ([id, s]) =>
      ($(id).onclick = () => {
        location.hash = s;
        render();
      })
  );
}
/** Form konser, direktori artis/venue, serta unggah poster melalui Storage. */
async function pageConcerts() {
  const [data, artists, venues] = await Promise.all([
    shows(),
    req(db.from('artists').select('*').order('name')),
    req(db.from('venues').select('*').order('name')),
  ]);
  $('admin-body').innerHTML = panel(
    'Concert Management',
    `<div class="admin-actions">${button('ADD CONCERT', 'new-show', 'pink')}</div>${rows(['Event', 'Artist', 'Date', 'Venue', 'Status', 'Actions'], data.map(s => `<tr><td><strong>${esc(s.title)}</strong><br><small>${esc(s.slug)}</small></td><td>${esc(s.artists?.name)}</td><td>${esc(s.show_date)}</td><td>${esc(s.venues?.name)}</td><td>${esc(s.status)}</td><td>${button('EDIT', 'edit-' + s.id)}</td></tr>`).join(''))}<form id="show-form" class="paper-panel admin-edit-form" hidden><h3 id="show-form-title">EDIT CONCERT</h3><input type="hidden" name="id" value=""><div class="admin-form-grid">${field('title', 'Event title', '', 'text', 'maxlength="120" required')}${field('slug', 'URL slug', '', 'text', 'pattern="[a-z0-9-]+" required')}<div class="field"><label>Artist<select name="artist_id" required>${option(artists)}</select></label></div><div class="field"><label>Venue<select name="venue_id" required>${option(venues)}</select></label></div>${field('show_date', 'Event date', '', 'date', 'required')}${field('gates_at', 'Gates open', '16:00', 'time')}${field('starts_at', 'Show starts', '20:00', 'time')}${field('ends_at', 'Show ends', '22:00', 'time')}<div class="field"><label>Status<select name="status">${['draft', 'published', 'sold_out', 'completed', 'cancelled'].map(t => `<option value="${t}">${t}</option>`).join('')}</select></label></div></div><div class="field"><label>Description<textarea name="description" rows="4"></textarea></label></div>${field('poster_url', 'Poster URL')}${field('banner_url', 'Banner URL')}<div class="field"><label>Upload poster/banner image<input type="file" name="image" accept="image/png,image/jpeg,image/webp"></label></div><div class="admin-actions"><button class="btn pink">SAVE CONCERT</button>${button('CANCEL', 'close-show')}</div></form><div class="admin-panels-two"><details class="paper-panel"><summary>ARTIST DIRECTORY</summary><p class="small-print">Manage the artists available for concert selection. Use actual supplied/licensed photographs only.</p><form id="artist-form"><div class="field"><label>Existing artist to edit<select name="id"><option value="">Create new artist</option>${option(artists)}</select></label></div>${field('artist-name', 'Artist name', '', 'text', 'required')}${field('artist-slug', 'Slug', '', 'text', 'pattern="[a-z0-9-]+" required')}<div class="field"><label>Description<textarea name="description" rows="3"></textarea></label></div><div class="field"><label>Real artist photo upload<input name="image" type="file" accept="image/png,image/jpeg,image/webp"></label></div><button class="btn pink">SAVE ARTIST</button></form></details><details class="paper-panel"><summary>VENUE DIRECTORY</summary><form id="venue-form"><div class="field"><label>Existing venue<select name="id"><option value="">Create new venue</option>${option(venues)}</select></label></div>${field('venue-name', 'Venue name', '', 'text', 'required')}${field('venue-city', 'City', 'Jakarta', 'text', 'required')}<div class="field"><label>Description<textarea name="description" rows="3"></textarea></label></div><button class="btn pink">SAVE VENUE</button></form></details></div>`
  );
  const form = $('show-form'),
    showForm = s => {
      form.hidden = false;
      form.reset();
      form.elements.id.value = s?.id || '';
      for (const k of [
        'title',
        'slug',
        'artist_id',
        'venue_id',
        'show_date',
        'gates_at',
        'starts_at',
        'ends_at',
        'status',
        'description',
        'poster_url',
        'banner_url',
      ])
        if (s?.[k] != null && form.elements[k]) form.elements[k].value = s[k];
      $('show-form-title').textContent = s ? 'EDIT CONCERT' : 'ADD CONCERT';
      form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
  $('new-show').onclick = () => showForm();
  $('close-show').onclick = () => (form.hidden = true);
  data.forEach(s => {
    $('edit-' + s.id).onclick = () => showForm(s);
  });
  form.onsubmit = safe(async e => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    const record = Object.fromEntries(
      [
        'title',
        'slug',
        'artist_id',
        'venue_id',
        'show_date',
        'gates_at',
        'starts_at',
        'ends_at',
        'status',
        'description',
        'poster_url',
        'banner_url',
      ].map(k => [k, form.elements[k].value.trim()])
    );
    const img = form.elements.image.files[0];
    if (img) {
      record.poster_url = await uploadImage(img);
    }
    const id = form.elements.id.value;
    if (id)
      await req(
        db
          .from('shows')
          .update({ ...record, updated_at: new Date().toISOString() })
          .eq('id', id)
      );
    else await req(db.from('shows').insert(record));
    await pageConcerts();
    flash('Concert saved. Published concerts appear in public shows.');
  });
  const artistForm = $('artist-form');
  artistForm.elements.id.addEventListener('change', () => {
    let a = artists.find(x => x.id === artistForm.elements.id.value);
    artistForm.elements['artist-name'].value = a?.name || '';
    artistForm.elements['artist-slug'].value = a?.slug || '';
    artistForm.elements.description.value = a?.description || '';
  });
  artistForm.onsubmit = safe(async e => {
    e.preventDefault();
    let f = e.target,
      a = artists.find(x => x.id === f.elements.id.value),
      record = {
        name: f.elements['artist-name'].value.trim(),
        slug: f.elements['artist-slug'].value.trim(),
        description: f.elements.description.value.trim(),
      };
    if (f.elements.image.files[0]) record.image_path = await uploadImage(f.elements.image.files[0]);
    if (a) await req(db.from('artists').update(record).eq('id', a.id));
    else await req(db.from('artists').insert(record));
    await pageConcerts();
    flash('Artist saved.');
  });
  const venueForm = $('venue-form');
  venueForm.elements.id.addEventListener('change', () => {
    let v = venues.find(x => x.id === venueForm.elements.id.value);
    venueForm.elements['venue-name'].value = v?.name || '';
    venueForm.elements['venue-city'].value = v?.city || 'Jakarta';
    venueForm.elements.description.value = v?.description || '';
  });
  venueForm.onsubmit = safe(async e => {
    e.preventDefault();
    let f = e.target,
      v = venues.find(x => x.id === f.elements.id.value),
      record = {
        name: f.elements['venue-name'].value.trim(),
        city: f.elements['venue-city'].value.trim(),
        description: f.elements.description.value.trim(),
      };
    if (v) await req(db.from('venues').update(record).eq('id', v.id));
    else await req(db.from('venues').insert(record));
    await pageConcerts();
    flash('Venue saved.');
  });
}
/** Batasi format/ukuran gambar dan gunakan nama acak untuk menghindari overwrite aset. */
async function uploadImage(file) {
  const allowed = ['image/png', 'image/jpeg', 'image/webp'];
  if (!allowed.includes(file.type) || file.size > 5 * 1024 * 1024)
    throw new Error('Image must be PNG/JPEG/WebP, at most 5 MB.');
  const extension = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }[file.type];
  const path = `uploads/${crypto.randomUUID()}.${extension}`;
  await req(
    db.storage.from('nadakita-public').upload(path, file, { contentType: file.type, upsert: false })
  );
  return db.storage.from('nadakita-public').getPublicUrl(path).data.publicUrl;
}
/** Kelola kategori, harga dan kapasitas; perubahan kapasitas diverifikasi RPC database. */
async function pageTickets() {
  const [cats, sks, all] = await Promise.all([allCategories(), stocks(), shows()]);
  const available = c => sks.find(x => x.category_id === c.id)?.available ?? null;
  $('admin-body').innerHTML = panel(
    'Ticket Management',
    `<p class="small-print">Pending reservations reserve stock for 10 minutes. Capacity changes are checked by an atomic database function.</p><div class="admin-actions">${button('ADD TICKET CATEGORY', 'new-cat', 'pink')}</div>${rows(['Concert', 'Zone', 'Price (IDR)', 'Capacity', 'Available', 'Status', 'Actions'], cats.map(c => `<tr><td>${esc(c.shows?.title)}</td><td><strong>${esc(c.name)}</strong><br><small>${esc(c.code)}</small></td><td>${money(c.price_idr)}</td><td>${c.capacity}</td><td>${available(c) ?? '—'}</td><td>${c.active ? 'ACTIVE' : 'INACTIVE'}</td><td>${button('EDIT', 'cat-' + c.id)}</td></tr>`).join(''))}<form id="cat-form" class="paper-panel admin-edit-form" hidden><h3 id="cat-form-title">TICKET CATEGORY</h3><input type="hidden" name="id"><div class="admin-form-grid"><div class="field"><label>Concert<select name="show_id" required>${selectShows(all, false)}</select></label></div>${field('name', 'Category name', '', 'text', 'required')}${field('code', 'Category code', '', 'text', 'pattern="[a-z0-9-]+" required')}${field('price_idr', 'Price (IDR)', 0, 'number', 'min="0" step="1" required')}${field('capacity', 'Capacity', 0, 'number', 'min="0" step="1" required')}${field('sales_start', 'Sales start', '', 'datetime-local')}${field('sales_end', 'Sales end', '', 'datetime-local')}<div class="field"><label>Sales status<select name="active"><option value="true">ACTIVE</option><option value="false">INACTIVE</option></select></label></div></div><div class="field"><label>Zone benefits<textarea name="benefits" rows="2"></textarea></label></div><div class="admin-actions"><button class="btn pink">SAVE CATEGORY</button>${button('CANCEL', 'close-cat')}</div></form>`
  );
  const form = $('cat-form'),
    edit = c => {
      form.hidden = false;
      form.reset();
      form.elements.id.value = c?.id || '';
      for (const k of ['show_id', 'name', 'code', 'price_idr', 'capacity', 'benefits'])
        if (c?.[k] != null) form.elements[k].value = c[k];
      form.elements.active.value = String(c?.active ?? true);
      for (const k of ['sales_start', 'sales_end'])
        form.elements[k].value = c?.[k] ? c[k].slice(0, 16) : '';
      form.scrollIntoView({ behavior: 'smooth' });
    };
  $('new-cat').onclick = () => edit();
  $('close-cat').onclick = () => (form.hidden = true);
  cats.forEach(c => {
    $('cat-' + c.id).onclick = () => edit(c);
  });
  form.onsubmit = safe(async e => {
    e.preventDefault();
    const o = form.elements,
      id = o.id.value;
    const record = {
      show_id: o.show_id.value,
      name: o.name.value.trim(),
      code: o.code.value.trim(),
      price_idr: Number(o.price_idr.value),
      capacity: Number(o.capacity.value),
      active: o.active.value === 'true',
      benefits: o.benefits.value,
      sales_start: o.sales_start.value ? new Date(o.sales_start.value).toISOString() : null,
      sales_end: o.sales_end.value ? new Date(o.sales_end.value).toISOString() : null,
    };
    if (id) {
      await req(
        db.rpc('admin_manage_category', {
          p_id: id,
          p_capacity: record.capacity,
          p_price_idr: record.price_idr,
          p_active: record.active,
        })
      );
      await req(
        db
          .from('ticket_categories')
          .update({
            benefits: record.benefits,
            sales_start: record.sales_start,
            sales_end: record.sales_end,
            name: record.name,
          })
          .eq('id', id)
      );
    } else await req(db.from('ticket_categories').insert(record));
    await pageTickets();
    flash('Ticket category saved.');
  });
}
/** Escape CSV dan cegah formula injection ketika file dibuka dalam spreadsheet. */
const exportCsv = (rows, columns, filename) => {
  let clean = s =>
    `"${String(s ?? '')
      .replaceAll('"', '""')
      .replace(/^[=+@-]/, "'$&")}"`;
  let data = [
    columns.map(x => clean(x[0])).join(','),
    ...rows.map(r => columns.map(([_, fn]) => clean(fn(r))).join(',')),
  ].join('\r\n');
  let blob = new Blob(['\ufeff', data], { type: 'text/csv;charset=utf-8' }),
    url = URL.createObjectURL(blob),
    a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
};
/** Baca export secara bertahap; batas jumlah mencegah permintaan tak terbatas. */
async function getAllFrom(table, filters = () => {}, size = 1000) {
  let out = [],
    pos = 0;
  while (true) {
    let query = filters(
      db
        .from(table)
        .select('*')
        .range(pos, pos + size - 1)
    );
    let batch = await req(query);
    out.push(...batch);
    if (batch.length < size) break;
    pos += size;
    if (pos > 100000) throw new Error('Export limit exceeded');
  }
  return out;
}
/** Cari/filter pesanan, lihat detail, lalu approve/reject/cancel lewat operasi server. */
async function pageOrders() {
  const all = await shows();
  $('admin-body').innerHTML = panel(
    'Orders & Transactions',
    `<p class="small-print">Demo workflow: customer submits → organizer reviews → e-ticket is issued only on approval. Rejections release reserved stock.</p><div class="admin-filter-line"><input id="order-search" placeholder="Search name, email or order ID" aria-label="Search orders"><select id="order-status"><option value="">Any status</option>${['under_review', 'pending_demo', 'confirmed_demo', 'rejected', 'expired', 'cancelled'].map(s => `<option value="${s}">${status(s)}</option>`).join('')}</select><select id="order-show">${selectShows(all)}</select><input id="order-from" type="date" aria-label="From date"><input id="order-to" type="date" aria-label="Until date">${button('FILTER', 'filter-orders', 'pink')}${button('EXPORT CSV', 'export-orders')}</div><div id="orders-output"></div><div class="admin-actions">${button('PREVIOUS', 'prev-orders')}${button('NEXT', 'next-orders')}</div><div id="order-details"></div>`
  );
  let total = 0;
  const apply = q => {
    if ($('order-status').value) q = q.eq('status', $('order-status').value);
    if ($('order-show').value) q = q.eq('show_id', $('order-show').value);
    let term = $('order-search').value.trim();
    if (term)
      q = q.or(
        `customer_name.ilike.%${term.replace(/[,()%]/g, '')}%,customer_email.ilike.%${term.replace(/[,()%]/g, '')}%,id.eq.${/^[0-9a-f-]{36}$/i.test(term) ? term : '00000000-0000-4000-8000-000000000000'}`
      );
    if ($('order-from').value) q = q.gte('created_at', $('order-from').value + 'T00:00:00+07:00');
    if ($('order-to').value) q = q.lte('created_at', $('order-to').value + 'T23:59:59+07:00');
    return q;
  };
  const load = async () => {
    const query = apply(
      db
        .from('orders')
        .select('*,shows(title),order_items(quantity,ticket_categories(name))', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(ui.page * 20, ui.page * 20 + 19)
    );
    const { data, error, count } = await query;
    if (error) throw error;
    total = count;
    $('orders-output').innerHTML =
      rows(
        [
          'Order',
          'Customer',
          'Email',
          'Concert',
          'Tickets',
          'Order Total',
          'Payment',
          'Status',
          'Date',
          'Details',
        ],
        data
          .map(
            o =>
              `<tr><td><code>${esc(o.id.slice(0, 8))}</code></td><td>${esc(o.customer_name)}</td><td>${esc(o.customer_email)}</td><td>${esc(o.shows?.title)}</td><td>${esc(o.order_items?.map(x => x.ticket_categories?.name + ' ×' + x.quantity).join(', '))}</td><td>${money(o.total_idr)}</td><td>Demo / no payment</td><td>${esc(status(o.status, o.expires_at))}</td><td>${esc(date(o.created_at))}</td><td>${button('VIEW', 'detail-' + o.id)}</td></tr>`
          )
          .join('')
      ) + `<p class="small-print">${total} total records · page ${ui.page + 1} · demo only</p>`;
    data.forEach(order => {
      const view = $('detail-' + order.id);
      if (!view) return;
      view.onclick = safe(async () => {
        const [tickets, orderItems] = await Promise.all([
          req(db.from('tickets').select('attendee_name,code').eq('order_id', order.id)),
          req(
            db
              .from('order_items')
              .select('quantity,unit_price_idr,ticket_categories(name)')
              .eq('order_id', order.id)
          ),
        ]);
        const itemSummary = orderItems
          .map(
            item =>
              `${item.ticket_categories?.name}: ${item.quantity} × ${money(item.unit_price_idr)}`
          )
          .join(' · ');
        const ticketSummary =
          tickets
            .map(ticket => `<p>${esc(ticket.attendee_name)} · <code>${esc(ticket.code)}</code></p>`)
            .join('') || 'No tickets issued yet.';
        const canReview =
          order.status === 'under_review' && new Date(order.expires_at) > new Date();
        const reviewSection = canReview
          ? `
    <div class="admin-review-actions">
     <p class="small-print">Please review buyer details, selected zones and attendee names before making a decision. Approval issues QR tickets; no real payment is captured.</p>
     <div class="field"><label>Review note (required for rejection)
      <textarea id="review-note" maxlength="500" rows="2" placeholder="Explain a rejection, or leave a note for approval"></textarea>
     </label></div>
     <div class="admin-actions">
      ${button('APPROVE & ISSUE E-TICKETS', 'approve-selected', 'pink')}
      ${button('REJECT REQUEST', 'reject-selected', 'outline')}
     </div>
    </div>`
          : '';
        const cancelSection = ['pending_demo', 'confirmed_demo', 'under_review'].includes(
          order.status
        )
          ? button('CANCEL ORDER', 'cancel-selected', 'outline')
          : '';
        $('order-details').innerHTML = `<div class="paper-panel">
    <h3>ORDER DETAIL</h3>
    <p>${esc(order.id)}</p>
    <p>Customer: ${esc(order.customer_name)} · ${esc(order.customer_email)}</p>
    <p>Status: ${esc(status(order.status, order.expires_at))} / Payment: Not collected</p>
    <p>${esc(itemSummary)}</p>
    <h4>Individual tickets</h4>${ticketSummary}
    ${order.submitted_at ? `<p class="small-print">Submitted: ${esc(date(order.submitted_at))}</p>` : ''}
    ${order.reviewed_at ? `<p class="small-print">Reviewed: ${esc(date(order.reviewed_at))}</p>` : ''}
    ${order.review_note ? `<p class="small-print">Review note: ${esc(order.review_note)}</p>` : ''}
    ${reviewSection}${cancelSection}
   </div>`;

        const cancelButton = $('cancel-selected');
        if (cancelButton) {
          cancelButton.onclick = safe(async () => {
            if (!confirm('Cancel this demo order?')) return;
            await req(db.rpc('cancel_demo_order', { p_order_id: order.id }));
            await load();
            $('order-details').textContent = 'Order cancelled.';
          });
        }
        for (const [id, approve] of [
          ['approve-selected', true],
          ['reject-selected', false],
        ]) {
          const control = $(id);
          if (!control) continue;
          control.onclick = safe(async () => {
            const note = $('review-note').value.trim();
            if (!approve && note.length < 5) {
              throw new Error('Provide a rejection reason of at least 5 characters.');
            }
            const confirmation = approve
              ? 'Approve this request and issue e-tickets? No payment will be collected.'
              : 'Reject this booking request and release its reservation?';
            if (!confirm(confirmation)) return;
            control.disabled = true;
            try {
              const outcome = await req(
                db.rpc('admin_review_demo_order', {
                  p_order_id: order.id,
                  p_approve: approve,
                  p_note: note,
                })
              );
              if (outcome.status !== (approve ? 'confirmed_demo' : 'rejected')) {
                throw new Error('This request has expired or changed status.');
              }
              await load();
              $('order-details').textContent = approve
                ? 'Approved — e-tickets issued.'
                : 'Request rejected.';
            } finally {
              control.disabled = false;
            }
          });
        }
        $('order-details').scrollIntoView({ behavior: 'smooth' });
      });
    });
    $('prev-orders').disabled = ui.page <= 0;
    $('next-orders').disabled = (ui.page + 1) * 20 >= total;
  };
  $('filter-orders').onclick = safe(async () => {
    ui.page = 0;
    await load();
  });
  $('prev-orders').onclick = safe(async () => {
    ui.page = Math.max(0, ui.page - 1);
    await load();
  });
  $('next-orders').onclick = safe(async () => {
    ui.page++;
    await load();
  });
  $('export-orders').onclick = safe(async () => {
    let records = await getAllFrom('orders', q =>
      apply(q.order('created_at', { ascending: false }))
    );
    exportCsv(
      records,
      [
        ['Order ID', o => o.id],
        ['Customer', o => o.customer_name],
        ['Email', o => o.customer_email],
        ['Concert ID', o => o.show_id],
        ['Order Amount (IDR)', o => o.total_idr],
        ['Status', o => o.status],
        ['Payment Method', o => o.payment_method],
        ['Created', o => o.created_at],
      ],
      'nadakita-orders.csv'
    );
  });
  await load();
}
/** Daftar pemegang tiket individual dengan kategori, konser, dan status check-in. */
async function pageAttendees() {
  let showsList = await shows();
  $('admin-body').innerHTML = panel(
    'Attendees',
    `<div class="admin-filter-line"><input id="att-search" placeholder="Name or ticket code" aria-label="Search attendees"><select id="att-show">${selectShows(showsList)}</select><select id="att-status"><option value="">All check-ins</option><option value="yes">Checked in</option><option value="no">Not checked in</option></select>${button('FILTER', 'att-filter', 'pink')}${button('EXPORT CSV', 'att-export')}</div><div id="att-output"></div><div class="admin-actions">${button('PREVIOUS', 'att-prev')}${button('NEXT', 'att-next')}</div>`
  );
  let page = 0,
    filtered = [];
  const load = async () => {
    let data = [];
    for (let pos = 0; pos < 100000; pos += 1000) {
      let chunk = await req(
        db
          .from('tickets')
          .select(
            'id,attendee_name,code,issued_at,checkins(checked_at),ticket_categories(name),orders(customer_email,show_id,shows(title),status)'
          )
          .range(pos, pos + 999)
      );
      data.push(...chunk);
      if (chunk.length < 1000) break;
    }
    filtered = data.filter(t => {
      let term = $('att-search').value.trim().toLowerCase(),
        checked = !!t.checkins?.length;
      return (
        (!term || `${t.attendee_name} ${t.code}`.toLowerCase().includes(term)) &&
        (!$('att-show').value || t.orders?.show_id === $('att-show').value) &&
        (!$('att-status').value || checked === ($('att-status').value === 'yes'))
      );
    });
    let subset = filtered.slice(page * 20, page * 20 + 20);
    $('att-output').innerHTML =
      rows(
        ['Attendee', 'Email', 'Concert', 'Category', 'Ticket code', 'Check-in', 'Time'],
        subset
          .map(
            t =>
              `<tr><td>${esc(t.attendee_name)}</td><td>${esc(t.orders?.customer_email)}</td><td>${esc(t.orders?.shows?.title)}</td><td>${esc(t.ticket_categories?.name)}</td><td><code>${esc(t.code)}</code></td><td>${t.checkins?.length ? 'Checked in' : 'Not checked in'}</td><td>${esc(date(t.checkins?.[0]?.checked_at))}</td></tr>`
          )
          .join('')
      ) + `<p class="small-print">${filtered.length} matching attendees, page ${page + 1}</p>`;
    $('att-prev').disabled = page === 0;
    $('att-next').disabled = (page + 1) * 20 >= filtered.length;
  };
  $('att-filter').onclick = safe(async () => {
    page = 0;
    await load();
  });
  $('att-prev').onclick = safe(async () => {
    page--;
    await load();
  });
  $('att-next').onclick = safe(async () => {
    page++;
    await load();
  });
  $('att-export').onclick = () =>
    exportCsv(
      filtered,
      [
        ['Name', t => t.attendee_name],
        ['Email', t => t.orders?.customer_email],
        ['Concert', t => t.orders?.shows?.title],
        ['Zone', t => t.ticket_categories?.name],
        ['Ticket', t => t.code],
        ['Checked in', t => !!t.checkins?.length],
        ['Time', t => t.checkins?.[0]?.checked_at],
      ],
      'nadakita-attendees.csv'
    );
  await load();
}
/**
 * Scan/manual entry terlebih dahulu INSPECT tanpa mencatat kedatangan.
 * CHECK IN terpisah melakukan commit; RPC menolak QR salah konser/tidak valid/duplikat.
 */
async function pageValidation() {
  const data = await shows();
  $('admin-body').innerHTML = panel(
    'Ticket Validation',
    `<div class="admin-panels-two"><div class="paper-panel"><h3>VALIDATE ENTRY</h3><p class="small-print">Scan each e-ticket once. The database validates concert, order, and duplicate entry in one transaction.</p><div class="field"><label>Concert<select id="gate-show">${selectShows(data, false)}</select></label></div>${field('gate-code', 'Ticket code', '', 'text', 'autocomplete="off"')}<div class="admin-actions">${button('INSPECT', 'inspect-ticket', 'outline')}${button('CHECK IN', 'checkin-ticket', 'pink')}</div><div id="gate-result" role="status" class="live-result"></div></div><div class="paper-panel"><h3>CAMERA SCANNER</h3><p class="small-print">Camera requires HTTPS or localhost and browser permission. Manual entry works if camera is unavailable.</p>${button('START CAMERA', 'start-camera', 'outline')}${button('STOP CAMERA', 'stop-camera')}<div id="qr-reader" class="camera-box"></div></div></div>`
  );
  const invoke = async commit => {
    let result = await req(
      db.rpc('admin_inspect_ticket', {
        p_code: $('gate-code')
          .value.trim()
          .replace(/^NADAKITA:/i, ''),
        p_show_id: $('gate-show').value,
        p_commit: commit,
      })
    );
    let r = $('gate-result');
    r.className = `live-result ${['valid', 'checked_in'].includes(result.result) ? 'ok' : 'bad'}`;
    r.innerHTML = `<b>${esc(result.result.toUpperCase().replaceAll('_', ' '))}</b><div>${esc(result.name || '')} · ${esc(result.category || '')}</div><div>${esc(result.concert || '')}</div>`;
  };
  $('inspect-ticket').onclick = safe(() => invoke(false));
  $('checkin-ticket').onclick = safe(() => invoke(true));
  let scanner;
  $('start-camera').onclick = safe(async () => {
    if (!window.isSecureContext) throw new Error('Camera requires HTTPS or localhost.');
    if (!window.Html5Qrcode) {
      let script = document.createElement('script');
      script.src = 'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js';
      await new Promise((r, j) => {
        script.onload = r;
        script.onerror = j;
        document.head.append(script);
      });
    }
    scanner = new window.Html5Qrcode('qr-reader');
    await scanner.start(
      { facingMode: 'environment' },
      { fps: 8, qrbox: { width: 220, height: 220 } },
      async code => {
        try {
          $('gate-code').value = code.replace(/^NADAKITA:/i, '');
          await scanner.stop();
          await invoke(false);
        } catch (e) {
          report(e);
        }
      }
    );
  });
  $('stop-camera').onclick = safe(async () => {
    if (scanner?.isScanning) await scanner.stop();
  });
}
/** Filter analitik dan export data; booking simulasi tidak dihitung sebagai pembayaran nyata. */
async function pageReports() {
  const list = await shows();
  $('admin-body').innerHTML = panel(
    'Analytics & Reports',
    `<p class="small-print">Payment gateway not connected. Revenue remains zero; the chart represents confirmed reservation value, not actual payments.</p><div class="admin-filter-line"><select id="report-show">${selectShows(list)}</select><select id="report-period"><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option><option value="365">Last year</option></select><select id="report-group" aria-label="Chart grouping"><option value="day">Daily</option><option value="week">Weekly</option><option value="month">Monthly</option></select>${button('APPLY', 'report-apply', 'pink')}${button('EXPORT CSV', 'report-export')}</div><div id="report-output"></div>`
  );
  let filtered = [];
  const load = async () => {
    const days = Number($('report-period').value),
      cutoff = new Date(Date.now() - days * 86400000).toISOString();
    let data = [];
    for (let pos = 0; pos < 100000; pos += 1000) {
      let query = db
        .from('orders')
        .select('*,order_items(quantity,ticket_categories(name)),shows(title)')
        .gte('created_at', cutoff)
        .order('created_at', { ascending: false })
        .range(pos, pos + 999);
      if ($('report-show').value) query = query.eq('show_id', $('report-show').value);
      let chunk = await req(query);
      data.push(...chunk);
      if (chunk.length < 1000) break;
    }
    filtered = data;
    const confirmed = data.filter(o => o.status === 'confirmed_demo'),
      qty = confirmed.reduce(
        (n, o) => n + (o.order_items || []).reduce((a, i) => a + i.quantity, 0),
        0
      ),
      val = confirmed.reduce((n, o) => n + o.total_idr, 0);
    const canceled = data.filter(o => o.status === 'cancelled').length,
      pending = data.filter(
        o => o.status === 'pending_demo' && new Date(o.expires_at) > new Date()
      ).length,
      reviewing = data.filter(
        o => o.status === 'under_review' && new Date(o.expires_at) > new Date()
      ).length,
      expired = data.filter(
        o =>
          o.status === 'expired' ||
          (['pending_demo', 'under_review'].includes(o.status) &&
            new Date(o.expires_at) < new Date())
      ).length;
    const grouping = $('report-group').value,
      perDay = new Map();
    for (const o of confirmed) {
      let dt = new Date(o.created_at),
        key = dt.toISOString().slice(0, 10);
      if (grouping === 'month') key = key.slice(0, 7);
      if (grouping === 'week') {
        let monday = new Date(dt);
        monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
        key = monday.toISOString().slice(0, 10);
      }
      perDay.set(key, (perDay.get(key) || 0) + o.total_idr);
    }
    let bars = [...perDay].sort((a, b) => a[0].localeCompare(b[0])).slice(-15),
      max = Math.max(1, ...bars.map(x => x[1]));
    const byShow = new Map(),
      byZone = new Map();
    for (const o of confirmed) {
      byShow.set(
        o.shows?.title || 'Unknown',
        (byShow.get(o.shows?.title || 'Unknown') || 0) + o.total_idr
      );
      for (const item of o.order_items || []) {
        let k = item.ticket_categories?.name || 'Unknown';
        byZone.set(k, (byZone.get(k) || 0) + item.quantity);
      }
    }
    $('report-output').innerHTML =
      `<div class="admin-kpi-grid"><div class="admin-kpi"><span>RESERVATION VALUE (SIMULATION)</span><strong>${money(val)}</strong></div><div class="admin-kpi"><span>TICKETS ISSUED</span><strong>${qty}</strong></div><div class="admin-kpi"><span>CONFIRMED ORDERS</span><strong>${confirmed.length}</strong></div><div class="admin-kpi"><span>UNSUBMITTED</span><strong>${pending}</strong></div><div class="admin-kpi"><span>AWAITING REVIEW</span><strong>${reviewing}</strong></div><div class="admin-kpi"><span>CANCELLED</span><strong>${canceled}</strong></div><div class="admin-kpi"><span>EXPIRED</span><strong>${expired}</strong></div></div><div class="paper-panel"><h3>RESERVATION VALUE BY PERIOD</h3><div class="admin-chart" aria-label="Bar chart showing confirmed demo order value by day">${bars.map(([day, value]) => `<div class="chart-col" title="${esc(day)}: ${money(value)}"><div class="chart-bar" style="height:${Math.max(2, (value / max) * 160)}px"></div><small>${esc(day.slice(5))}</small></div>`).join('') || '<p>No orders in this period.</p>'}</div><div class="admin-panels-two"><div class="paper-panel"><h3>BOOKING VALUE BY CONCERT</h3>${rows(['Concert', 'Reservation value'], [...byShow].map(([name, val]) => `<tr><td>${esc(name)}</td><td>${money(val)}</td></tr>`).join(''))}</div><div class="paper-panel"><h3>TICKETS BY CATEGORY</h3>${rows(['Category', 'Tickets issued'], [...byZone].map(([name, val]) => `<tr><td>${esc(name)}</td><td>${val}</td></tr>`).join(''))}</div></div>`;
  };
  $('report-apply').onclick = safe(load);
  $('report-export').onclick = () =>
    exportCsv(
      filtered,
      [
        ['Order', o => o.id],
        ['Show', o => o.shows?.title],
        ['Status', o => o.status],
        ['Order Amount (IDR)', o => o.total_idr],
        ['Created', o => o.created_at],
      ],
      'nadakita-reservation-report.csv'
    );
  await load();
}
/** Editor konten publik, FAQ, dan pengumuman; akses tulis tetap dilindungi RLS. */
async function pageContent() {
  const [content, faq, ann] = await Promise.all([
    req(db.from('site_content').select('*')),
    req(db.from('faqs').select('*').order('sort_order')),
    req(db.from('announcements').select('*').order('created_at', { ascending: false })),
  ]);
  const v = Object.fromEntries(content.map(t => [t.key, t.value]));
  $('admin-body').innerHTML = panel(
    'Website Content',
    `<div class="admin-panels-two"><form id="hero-form" class="paper-panel"><h3>HOMEPAGE & VENUE</h3>${field('hero_title', 'Hero title', v.hero_title)}<div class="field"><label>Hero subtitle<textarea name="hero_subtitle" rows="3">${esc(v.hero_subtitle)}</textarea></label></div>${field('hero_banner_url', 'Hero banner URL', v.hero_banner_url)}<div class="field"><label>Upload banner (max 5 MB)<input type="file" name="image" accept="image/jpeg,image/png,image/webp"></label></div><div class="field"><label>Venue information<textarea name="venue_info" rows="3">${esc(v.venue_info)}</textarea></label></div><button class="btn pink">PUBLISH HOMEPAGE</button></form><div class="paper-panel"><h3>FAQ MANAGEMENT</h3>${faq.map(f => `<details><summary>${esc(f.question)}</summary><div class="field"><label>Question<input id="faq-question-${f.id}" value="${esc(f.question)}"></label></div><div class="field"><label>Answer<textarea id="faq-answer-${f.id}" rows="3">${esc(f.answer)}</textarea></label></div>${button('SAVE', 'faq-save-' + f.id, 'pink')}${button(f.published ? 'UNPUBLISH' : 'PUBLISH', 'faq-' + f.id)}</details>`).join('')}<div class="field"><label>New FAQ Question<input id="faq-q"></label></div><div class="field"><label>Answer<textarea id="faq-a" rows="3"></textarea></label></div>${button('ADD FAQ', 'faq-create', 'pink')}</div></div><div class="paper-panel"><h3>ANNOUNCEMENTS</h3>${ann.map(a => `<details><summary>${esc(a.title)} · ${a.published ? 'PUBLISHED' : 'DRAFT'}</summary><div class="field"><label>Title<input id="ann-title-${a.id}" value="${esc(a.title)}"></label></div><div class="field"><label>Announcement<textarea id="ann-body-${a.id}" rows="3">${esc(a.body)}</textarea></label></div>${button('SAVE', 'ann-save-' + a.id, 'pink')}${button(a.published ? 'UNPUBLISH' : 'PUBLISH', 'ann-' + a.id)}</details>`).join('')}<div class="field"><label>Title<input id="ann-title"></label></div><div class="field"><label>Announcement<textarea id="ann-body" rows="3"></textarea></label></div>${button('CREATE ANNOUNCEMENT', 'ann-create', 'pink')}</div>`
  );
  $('hero-form').onsubmit = safe(async e => {
    e.preventDefault();
    let f = e.target,
      values = {
        hero_title: f.hero_title.value,
        hero_subtitle: f.hero_subtitle.value,
        hero_banner_url: f.hero_banner_url.value,
        venue_info: f.venue_info.value,
      };
    if (f.image.files[0]) values.hero_banner_url = await uploadImage(f.image.files[0]);
    await req(
      db.from('site_content').upsert(
        Object.entries(values).map(([key, value]) => ({
          key,
          value,
          updated_at: new Date().toISOString(),
        }))
      )
    );
    await pageContent();
    flash('Published content is available to the public site.');
  });
  faq.forEach(x => {
    $('faq-' + x.id).onclick = safe(async () => {
      await req(db.from('faqs').update({ published: !x.published }).eq('id', x.id));
      await pageContent();
    });
    $('faq-save-' + x.id).onclick = safe(async () => {
      await req(
        db
          .from('faqs')
          .update({
            question: $('faq-question-' + x.id).value.trim(),
            answer: $('faq-answer-' + x.id).value.trim(),
          })
          .eq('id', x.id)
      );
      await pageContent();
      flash('FAQ updated.');
    });
  });
  $('faq-create').onclick = safe(async () => {
    if (!$('faq-q').value.trim() || !$('faq-a').value.trim())
      throw new Error('Enter both question and answer.');
    await req(
      db.from('faqs').insert({
        question: $('faq-q').value,
        answer: $('faq-a').value,
        sort_order: faq.length + 1,
      })
    );
    await pageContent();
  });
  ann.forEach(x => {
    $('ann-' + x.id).onclick = safe(async () => {
      await req(db.from('announcements').update({ published: !x.published }).eq('id', x.id));
      await pageContent();
    });
    $('ann-save-' + x.id).onclick = safe(async () => {
      await req(
        db
          .from('announcements')
          .update({
            title: $('ann-title-' + x.id).value.trim(),
            body: $('ann-body-' + x.id).value.trim(),
          })
          .eq('id', x.id)
      );
      await pageContent();
      flash('Announcement updated.');
    });
  });
  $('ann-create').onclick = safe(async () => {
    if (!$('ann-title').value.trim() || !$('ann-body').value.trim())
      throw new Error('Enter title and announcement.');
    await req(
      db
        .from('announcements')
        .insert({ title: $('ann-title').value, body: $('ann-body').value, published: false })
    );
    await pageContent();
  });
}
/** Konfigurasi identitas organizer; proyek tetap memakai IDR dan Asia/Jakarta. */
async function pageSettings() {
  const data = await req(db.from('general_settings').select('*'));
  let v = Object.fromEntries(data.map(t => [t.key, t.value]));
  const keys = [
    ['brand_name', 'Brand name'],
    ['organizer', 'Organizer'],
    ['contact_email', 'Contact email'],
    ['contact_phone', 'Contact phone'],
    ['social_instagram', 'Instagram URL'],
    ['currency', 'Currency'],
    ['timezone', 'Timezone'],
  ];
  $('admin-body').innerHTML = panel(
    'General Settings',
    `<form id="settings-form" class="paper-panel"><h3>ORGANIZER INFORMATION</h3><div class="admin-form-grid">${keys.map(([key, label]) => field(key, label, v[key])).join('')}</div><p class="small-print">These are general event settings only; no staff or access management UI is included.</p><button class="btn pink">SAVE SETTINGS</button></form>`
  );
  $('settings-form').onsubmit = safe(async e => {
    e.preventDefault();
    let o = e.target.elements;
    let values = keys.map(([key]) => ({ key, value: o[key].value.trim() }));
    if (o.currency.value !== 'IDR' || o.timezone.value !== 'Asia/Jakarta')
      throw new Error('This build supports only IDR and Asia/Jakarta.');
    await req(db.from('general_settings').upsert(values));
    flash('Settings saved.');
  });
}
/** Edit nama/telepon akun admin sendiri, tanpa akses wallet atau pemesanan pembeli. */
async function pageProfile() {
  const user = await currentUser();
  if (!user) throw new Error('Please sign in again.');
  const profile = await req(
    db.from('profiles').select('full_name,phone').eq('id', user.id).maybeSingle()
  );
  $('admin-body').innerHTML = panel(
    'Admin Profile',
    `<form id="admin-profile-form" class="paper-panel"><h3>YOUR ADMIN DETAILS</h3><p class="small-print">Organizer access only. Use a separate customer account to book tickets.</p><div class="field"><label>Full name<input name="full_name" value="${esc(profile?.full_name)}" minlength="3" maxlength="120" required autocomplete="name"></label></div><div class="field"><label>Phone<input name="phone" value="${esc(profile?.phone)}" maxlength="35" autocomplete="tel"></label></div><p>${esc(user.email)}</p><button class="btn pink" type="submit">SAVE PROFILE</button></form>`
  );
  $('admin-profile-form').onsubmit = safe(async e => {
    e.preventDefault();
    const form = e.target;
    if (!form.reportValidity()) return;
    const button = form.querySelector('button');
    button.disabled = true;
    try {
      await req(
        db
          .from('profiles')
          .update({
            full_name: form.elements.full_name.value.trim(),
            phone: form.elements.phone.value.trim(),
          })
          .eq('id', user.id)
      );
      flash('Admin profile saved.');
    } finally {
      button.disabled = false;
    }
  });
}
const pages = {
  overview: pageOverview,
  concerts: pageConcerts,
  tickets: pageTickets,
  orders: pageOrders,
  attendees: pageAttendees,
  validation: pageValidation,
  reports: pageReports,
  content: pageContent,
  settings: pageSettings,
  profile: pageProfile,
};
/** Pilih modul hash, tandai navigasi aktif, dan tampilkan hasil/error pada workspace. */
export async function render() {
  const key = location.hash.slice(1),
    section = pages[key] ? key : 'overview';
  ui.current = section;
  document.querySelectorAll('.admin-sidebar a[data-section]').forEach(a => {
    a.classList.toggle('active', a.dataset.section === section);
    a.setAttribute('aria-current', a.dataset.section === section ? 'page' : 'false');
  });
  await req(db.rpc('admin_reconcile_expirations'));
  $('admin-body').innerHTML =
    `<p role="status" class="paper-panel">Loading ${esc(labels[section] || 'admin profile')}…</p>`;
  try {
    await pages[section]();
  } catch (e) {
    report(e);
    $('admin-body').innerHTML =
      `<div role="alert" class="live-error">${esc(e.message || String(e))}</div>`;
  }
}
/** Pasang sidebar/topbar dan handler logout sebelum merender modul pertama. */
export async function mountAdmin(root) {
  ui.root = root;
  root.innerHTML = `<div class="admin-app"><aside class="admin-sidebar"><div class="admin-brand"><strong>NADAKITA<span>★</span></strong><small>LIVE / CONTROL ROOM</small></div><div class="micro muted">ORGANIZER WORKSPACE</div><nav aria-label="Admin modules">${items.map(([id, label], n) => `<a data-section="${id}" href="#${id}"><span>${String(n + 1).padStart(2, '0')}</span>${label}</a>`).join('')}</nav><div class="admin-sidebar-bottom"><a href="index.html">VIEW PUBLIC SITE</a><button id="admin-logout" class="btn outline small">SIGN OUT</button><p class="small-print">No payment gateway connected.</p></div></aside><div class="admin-workspace"><div class="admin-topline"><span class="micro">NADAKITA LIVE / OPERATIONS</span><a href="index.html">PUBLIC SITE</a></div><div id="admin-body"></div></div></div>`;
  root
    .querySelector('.admin-topline')
    .insertAdjacentHTML(
      'beforeend',
      '<div class="admin-mobile-actions"><button id="admin-mobile-toggle" type="button" class="btn outline small" aria-expanded="false">MENU</button><button id="admin-mobile-logout" type="button" class="btn outline small">SIGN OUT</button></div>'
    );
  $('admin-mobile-toggle').onclick = () => {
    const side = root.querySelector('.admin-sidebar'),
      open = side.classList.toggle('is-open');
    $('admin-mobile-toggle').setAttribute('aria-expanded', String(open));
  };
  root
    .querySelectorAll('.admin-sidebar a[data-section]')
    .forEach(a =>
      a.addEventListener('click', () =>
        root.querySelector('.admin-sidebar').classList.remove('is-open')
      )
    );
  $('admin-logout').onclick = async () => {
    await db.auth.signOut();
    location.href = 'login.html';
  };
  $('admin-mobile-logout').onclick = $('admin-logout').onclick;
  window.addEventListener('hashchange', render);
  await render();
}
