/**
 * Entry point halaman live: pilih renderer berdasarkan body[data-page].
 * Data akun/pesanan diambil dari Supabase; shell visual disiapkan preview.js.
 * Urutan auth, render, lalu reveal dipertahankan supaya navigasi tidak berkedip.
 * Panduan fungsi dan file: docs/CODE_GUIDE.md.
 */
import {
  supabase as db,
  configured,
  sdkLoadError,
  money,
  esc,
  req,
  currentUser,
  isAdmin,
  requireUser,
  report,
} from './supabase.js';
import {
  renderTicket,
  renderOrderItems,
  isCheckedIn,
  mountTicketQR,
  downloadTicket,
} from './ticket-wallet.js';
import { mountAdmin } from './admin.js';
import { renderArtistDetail, mountArtistPortrait } from './show-detail.js';
const root = document.getElementById('main-content');
const page = document.body.dataset.page;
const $ = id => document.getElementById(id);
const q = new URLSearchParams(location.search);
const EXPLAIN =
  'Reservasi dan e-ticket hanya untuk simulasi presentasi. Tidak ada pembayaran nyata dan tiket tidak berlaku sebagai akses masuk konser.';
const showIds = {
  weeknd: '00000000-0000-4000-8000-000000000101',
  bieber: '00000000-0000-4000-8000-000000000102',
  bruno: '00000000-0000-4000-8000-000000000103',
};
const localArtistPhoto = slug =>
  ({ weeknd: 'the-weeknd', bieber: 'justin-bieber', bruno: 'bruno-mars' })[slug]
    ? `assets/images/artists/${{ weeknd: 'the-weeknd', bieber: 'justin-bieber', bruno: 'bruno-mars' }[slug]}.jpg`
    : '';
const coverFor = s =>
  s.poster_url || s.artists?.image_path || localArtistPhoto(s.artists?.slug || s.slug);
const categories = ['vip', 'festa', 'festb', 'cat1', 'cat2'];
const friendly = {
  pending_demo: 'Awaiting submission',
  under_review: 'Awaiting organizer review',
  confirmed_demo: 'Approved · E-ticket issued',
  rejected: 'Request rejected',
  expired: 'Expired',
  cancelled: 'Cancelled',
};
const panel = (title, inner) =>
  `<div class="wrap live-page"><div class="preview-label">NADAKITA LIVE / JAKARTA 2026</div><h1 class="page-title">${title}</h1><div id="live-message" class="live-error" hidden></div>${inner}</div>`;
const loading = t =>
  panel(t || 'LOADING...', '<p role="status">Fetching current data from Supabase…</p>');
const notify = t => {
  let e = $('live-message');
  if (e) {
    e.hidden = false;
    e.textContent = t;
    e.className = 'live-info';
  } else alert(t);
};
const err = e => report(e);
const button = (txt, id, cls = 'pink') =>
  `<button type="button" id="${id}" class="btn ${cls}">${txt}</button>`;
const setup = () =>
  panel(
    'SETUP REQUIRED.',
    `<div class="paper-panel"><h2>CONNECT SUPABASE</h2><p>To enable reservation data and protected accounts, create the Supabase project and paste its Project URL and <strong>publishable key</strong> into <code>js/live/config.js</code>.</p><p>Run the SQL migrations in order: <code>001_schema.sql</code> → <code>002_operations.sql</code> → <code>003_seed.sql</code>.</p><p class="note">Never paste a service role or secret key in frontend files. Account and order operations remain unavailable until Supabase is configured.</p><a href="index.html" class="btn outline">Back to homepage</a></div>`
  );
/** Ambil katalog konser beserta artis/venue; RLS menentukan record yang boleh dibaca. */
async function getShows() {
  return req(
    db.from('shows').select('*,artists(name,slug,image_path),venues(name,city)').order('show_date')
  );
}
/** Ambil kategori untuk satu konser, dari harga tertinggi ke terendah. */
async function getCategories(showId) {
  return req(
    db
      .from('ticket_categories')
      .select('*')
      .eq('show_id', showId)
      .order('price_idr', { ascending: false })
  );
}
/** Stok berasal dari RPC agar reservasi kedaluwarsa ikut diperhitungkan di server. */
async function getStock() {
  return req(db.rpc('get_stock'));
}
const zoneDiagram = (show, categories, interactive = false) =>
  window.NADAKITA_ZONES.map({ show, categories, interactive });
/** Public venue prices are fetched per concert. Ignore responses for a previous night. */
async function mountPublicVenue(shows) {
  const host = $('public-venue-map');
  if (!host || !window.NADAKITA_ZONES) return;
  const picker = document.querySelector('[data-public-venue-select]');
  const message = document.querySelector('[data-venue-price-message]');
  const retry = document.querySelector('[data-venue-price-retry]');
  const cache = new Map();
  let requestVersion = 0;
  let selectedSlug =
    page === 'schedule'
      ? document.querySelector('[data-guide-show][aria-selected="true"]')?.dataset.guideShow
      : picker?.value;
  if (picker) {
    picker.innerHTML = shows
      .map(
        (show, index) =>
          `<option value="${esc(show.slug)}">Night ${String(index + 1).padStart(2, '0')} · ${esc(show.artists?.name || show.title)}</option>`
      )
      .join('');
    if (shows.some(show => show.slug === selectedSlug)) picker.value = selectedSlug;
    picker.addEventListener('change', () => {
      void load(picker.value);
    });
  }
  async function load(slug) {
    const version = ++requestVersion;
    const show = shows.find(item => item.slug === slug) || shows[0];
    selectedSlug = show?.slug;
    retry.hidden = true;
    if (!show) {
      host.innerHTML = window.NADAKITA_ZONES.map({ categories: [] });
      message.textContent = 'No published concerts available.';
      return;
    }
    message.textContent = `Ticket zones · ${show.artists?.name || show.title}`;
    host.innerHTML = window.NADAKITA_ZONES.map({ show: show.slug, priceState: 'loading' });
    host.setAttribute('aria-busy', 'true');
    try {
      let categoryData = cache.get(show.id);
      if (!categoryData) {
        categoryData = await getCategories(show.id);
        cache.set(show.id, categoryData);
      }
      if (version !== requestVersion) return;
      host.innerHTML = zoneDiagram(show.slug, categoryData);
    } catch (error) {
      if (version !== requestVersion) return;
      host.innerHTML = window.NADAKITA_ZONES.map({ show: show.slug, priceState: 'error' });
      message.textContent =
        'Could not load current prices. Try again or check prices on the ticket page.';
      retry.hidden = false;
    } finally {
      if (version === requestVersion) host.setAttribute('aria-busy', 'false');
    }
  }
  retry.addEventListener('click', () => {
    void load(selectedSlug);
  });
  if (page === 'schedule')
    window.addEventListener('nadakita:guide-change', event => {
      void load(event.detail.slug);
    });
  await load(selectedSlug);
}
const bookingSteps = step =>
  `<nav class="booking-steps" aria-label="Booking steps"><${step === 1 ? 'strong' : 'span'} class="${step === 1 ? 'is-current' : ''}">01 / CHOOSE CONCERT &amp; ZONE</${step === 1 ? 'strong' : 'span'}><${step === 2 ? 'strong' : 'span'} class="${step === 2 ? 'is-current' : ''}">02 / ATTENDEE DETAILS</${step === 2 ? 'strong' : 'span'}><span>03 / REVIEW</span></nav>`;
/** Bersihkan pesan sebelumnya saat pengguna mencoba aksi lagi. */
function hiddenErrors() {
  let e = $('live-message');
  if (e) e.hidden = true;
}
/** Tampilkan timestamp dalam WIB, bukan timezone perangkat pengunjung. */
function dateTimeWib(s) {
  return s
    ? new Date(s).toLocaleString('id-ID', {
        timeZone: 'Asia/Jakarta',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
    : '—';
}
/** Konversi tanggal konser tanpa menggeser hari akibat timezone browser. */
function fmtDate(s) {
  if (!s) return '—';
  return new Date(`${s}T12:00:00+07:00`).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  });
}
/** Timer visual mengikuti expires_at server; keputusan valid/tidak tetap milik RPC. */
function startReservationCountdown(expiresAt) {
  const node = $('reservation-countdown');
  if (!node) return;
  let timer;
  const render = () => {
    const seconds = Math.max(0, Math.ceil((new Date(expiresAt) - Date.now()) / 1000)),
      minutes = Math.floor(seconds / 60),
      rest = seconds % 60;
    node.textContent = seconds
      ? `Reservation held for ${minutes}:${String(rest).padStart(2, '0')}`
      : 'Reservation expired';
    if (!seconds) {
      clearInterval(timer);
      $('confirm-demo').disabled = true;
    }
  };
  render();
  timer = setInterval(render, 1000);
}
/**
 * Hubungkan form login/register/recovery ke Auth dan pasang toggle password.
 * Form harus siap sebelum restore sesi lama selesai agar login baru tidak terkunci.
 */
async function authPage() {
  const form = $('auth-demo');
  if (!form) return;
  const kind = form.dataset.authKind;
  const copy = {
    login: 'SIGN IN',
    register: 'CREATE ACCOUNT',
    forgot: 'SEND RESET EMAIL',
    reset: 'SAVE NEW PASSWORD',
  };
  const btn = form.querySelector('button[type="submit"]');
  btn.textContent = copy[kind];
  for (const input of form.querySelectorAll('input')) input.required = true;
  if ($('email')) $('email').setAttribute('autocomplete', 'email');
  if ($('password'))
    $('password').setAttribute(
      'autocomplete',
      kind === 'login' ? 'current-password' : 'new-password'
    );
  if ($('fullname')) $('fullname').setAttribute('autocomplete', 'name');
  for (const password of form.querySelectorAll('input[type="password"]')) {
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'password-toggle';
    toggle.textContent = 'SHOW PASSWORD';
    toggle.setAttribute('aria-label', 'Show password');
    password.insertAdjacentElement('afterend', toggle);
    toggle.onclick = () => {
      const visible = password.type === 'text';
      password.type = visible ? 'password' : 'text';
      toggle.textContent = visible ? 'SHOW PASSWORD' : 'HIDE PASSWORD';
      toggle.setAttribute('aria-label', visible ? 'Show password' : 'Hide password');
    };
  }
  form.dataset.authReady = 'true';
  // Never block form initialization on session verification: login must remain usable
  // even if the old session is invalid, expired, or temporarily unreachable.
  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    btn.disabled = true;
    btn.textContent = 'PLEASE WAIT…';
    try {
      const email = $('email')?.value.trim(),
        password = $('password')?.value;
      if (['register', 'reset'].includes(kind) && password !== $('confirm').value)
        throw new Error('Password confirmation does not match.');
      if (['register', 'reset'].includes(kind) && password.length < 10)
        throw new Error('Password must be at least 10 characters.');
      if (kind === 'login') {
        let r = await db.auth.signInWithPassword({ email, password });
        if (r.error) throw r.error;
        location.href = (await isAdmin()) ? 'admin.html' : 'dashboard.html';
        return;
      }
      if (kind === 'register') {
        const full_name = $('fullname').value.trim();
        if (full_name.length < 3) throw new Error('Enter your full name.');
        let r = await db.auth.signUp({ email, password, options: { data: { full_name } } });
        if (r.error) throw r.error;
        notify(
          r.data.session
            ? 'Account created. You can open My Account.'
            : 'Check your email for the confirmation link, then sign in.'
        );
        return;
      }
      if (kind === 'forgot') {
        let r = await db.auth.resetPasswordForEmail(email, {
          redirectTo: new URL('reset-password.html', location.href).href,
        });
        if (r.error) throw r.error;
        notify('If the email is registered, password recovery instructions will be sent.');
        return;
      }
      if (kind === 'reset') {
        let r = await db.auth.updateUser({ password });
        if (r.error) throw r.error;
        notify('Password updated. You can sign in with the new password.');
        return;
      }
    } catch (error) {
      err(error);
    } finally {
      btn.disabled = false;
      btn.textContent = copy[kind];
    }
  });
  if (kind === 'login') {
    // Session restore must not prevent fresh sign-in when the auth network is slow.
    currentUser()
      .then(async user => {
        if (user && !user.is_anonymous && !$('email')?.value.trim()) {
          try {
            location.replace((await isAdmin()) ? 'admin.html' : 'dashboard.html');
          } catch (error) {
            console.warn('Could not restore previous session', error);
          }
        }
      })
      .catch(error => console.warn('Session check skipped; sign-in stays available', error));
  }
}
/** Render zona/stok, batasi total empat tiket, lalu kirim pilihan melalui URL checkout. */
async function ticketPage() {
  const publicShows = await getShows();
  if (!publicShows.length) {
    root.innerHTML = panel('TICKETS UNAVAILABLE.', '<p>No concerts are published yet.</p>');
    return;
  }
  let current = publicShows.find(x => x.slug === q.get('show')) || publicShows[0],
    list = [],
    stock = [],
    selectedQty = {},
    focusCode = window.NADAKITA_ZONES.cleanCode(q.get('zone'));
  const renderTickets = async () => {
    [list, stock] = await Promise.all([getCategories(current.id), getStock()]);
    selectedQty = {};
    const mapCategories = list.map(c => ({
      ...c,
      active: c.active && (stock.find(x => x.category_id === c.id)?.available ?? 0) > 0,
    }));
    root.innerHTML = panel(
      'CHOOSE YOUR <span class="accent">ZONE.</span>',
      `<p class="page-lead">Choose your concert night and up to four tickets. Availability is updated from Supabase.</p><p class="small-print">${esc(EXPLAIN)}</p>${bookingSteps(1)}<div class="tabs" id="live-show-tabs" role="group" aria-label="Choose a concert">${publicShows.map(s => `<button class="tab ${s.id === current.id ? 'selected' : ''}" type="button" data-show="${esc(s.id)}" aria-pressed="${s.id === current.id}">${esc(s.artists?.name)} · ${esc(fmtDate(s.show_date))}</button>`).join('')}</div><div class="ticket-layout"><div>${zoneDiagram(current.slug, mapCategories, true)}<p id="live-zone-context" class="booking-selection-note" role="status">Select a zone in the diagram to review its ticket category.</p><div class="preview-label">SELECT ZONES · MAX 4 TICKETS</div><div class="category-list">${
        list
          .map(c => {
            let left = stock.find(x => x.category_id === c.id)?.available ?? 0,
              open = c.active && left > 0,
              status = !c.active
                ? 'Inactive'
                : left === 0
                  ? 'Sold out'
                  : left <= 20
                    ? 'Almost gone'
                    : 'Available';
            return `<div class="ticket-option" data-zone-row="${esc(c.code)}"><div><span class="type">${esc(c.name)}</span><p>${esc(c.description)}</p><p class="small-print">${left} available · ${status}</p></div><div><div class="price">${money(c.price_idr)}</div><div class="qty-stepper"><button aria-label="Decrease ${esc(c.name)}" type="button" data-cat="${esc(c.id)}" data-step="-1" disabled>−</button><span data-count="${esc(c.id)}" aria-live="polite">0</span><button type="button" aria-label="Increase ${esc(c.name)}" data-cat="${esc(c.id)}" data-step="1" ${!open ? 'disabled' : ''}>+</button></div></div></div>`;
          })
          .join('') || '<div class="empty-state">No ticket categories available.</div>'
      }</div></div><aside class="summary"><div class="micro">NADAKITA LIVE / TICKETS</div><h3>YOUR SELECTION</h3><p><b>${esc(current.artists?.name)}</b><br>${esc(fmtDate(current.show_date))}</p><div class="line"></div><div id="live-summary" role="status" aria-live="polite"></div><div class="summary-total"><span class="micro">ORDER TOTAL</span><strong id="live-total">Rp0</strong></div><button id="live-checkout" class="btn full" disabled>CONTINUE TO CHECKOUT</button><p class="small-print">Prices and availability are updated from Supabase.</p></aside></div><div class="mobile-cart-bar" aria-live="polite"><span><b id="mobile-cart-count">0 tickets</b><small id="mobile-cart-total">Rp0</small></span><button id="mobile-cart-next" type="button" disabled>CONTINUE</button></div>`
    );
    $('live-show-tabs').onclick = async e => {
      let b = e.target.closest('[data-show]');
      if (!b) return;
      current = publicShows.find(s => s.id === b.dataset.show) || current;
      focusCode = '';
      history.replaceState(null, '', `tickets.html?show=${encodeURIComponent(current.slug)}`);
      await renderTickets();
    };
    function highlightZone(code, scroll = false) {
      const clean = window.NADAKITA_ZONES.cleanCode(code),
        c = list.find(x => window.NADAKITA_ZONES.cleanCode(x.code) === clean);
      if (!c) return;
      focusCode = clean;
      window.NADAKITA_ZONES.activate(clean, root);
      const left = stock.find(x => x.category_id === c.id)?.available ?? 0;
      $('live-zone-context').textContent =
        `${c.name} · ${money(c.price_idr)} per ticket · ${left} available`;
      if (scroll)
        root
          .querySelector(`[data-zone-row="${clean}"]`)
          ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    root.querySelector('.booking-map')?.addEventListener('click', e => {
      const b = e.target.closest('[data-zone-code]');
      if (b) highlightZone(b.dataset.zoneCode, true);
    });
    document.querySelector('.category-list').onclick = e => {
      let btn = e.target.closest('[data-cat]');
      if (!btn) return;
      let c = list.find(x => x.id === btn.dataset.cat);
      if (!c) return;
      let left = stock.find(s => s.category_id === c.id)?.available ?? 0;
      let sum = Object.values(selectedQty).reduce((a, b) => a + b, 0),
        now = selectedQty[c.id] || 0,
        step = Number(btn.dataset.step);
      selectedQty[c.id] = Math.max(0, Math.min(left, 4, now + step, sum + step > 4 ? now : 4));
      highlightZone(c.code);
      update();
    };
    function update() {
      let count = 0,
        total = 0,
        desc = [];
      for (const c of list) {
        let n = selectedQty[c.id] || 0,
          left = stock.find(x => x.category_id === c.id)?.available || 0;
        count += n;
        total += n * c.price_idr;
        if (n) desc.push(`${n} × ${c.name}`);
        let txt = document.querySelector(`[data-count="${c.id}"]`);
        if (txt) txt.textContent = n;
        let add = document.querySelector(`[data-cat="${c.id}"][data-step="1"]`);
        if (add) add.disabled = count >= 4 || n >= left || !c.active;
        let subtract = document.querySelector(`[data-cat="${c.id}"][data-step="-1"]`);
        if (subtract) subtract.disabled = n <= 0;
      }
      // Recheck every add button against the final total, regardless of row order.
      if (count >= 4)
        document.querySelectorAll('[data-step="1"]').forEach(b => (b.disabled = true));
      $('live-summary').textContent = desc.join(' · ') || 'No tickets chosen';
      $('live-total').textContent = money(total);
      $('live-checkout').disabled = !count;
      $('mobile-cart-count').textContent = `${count} ticket${count === 1 ? '' : 's'}`;
      $('mobile-cart-total').textContent = money(total);
      $('mobile-cart-next').disabled = !count;
    }
    $('live-checkout').onclick = () => {
      let url = new URL('checkout.html', location.href);
      url.searchParams.set('show', current.slug);
      for (const [id, n] of Object.entries(selectedQty))
        if (n) url.searchParams.set('cat-' + id, n);
      location.href = url.toString();
    };
    $('mobile-cart-next').onclick = () => $('live-checkout').click();
    if (focusCode) highlightZone(focusCode);
    update();
  };
  await renderTickets();
}
/**
 * Isi kontak pembeli dari profil; nama attendee tetap dimasukkan terpisah.
 * Reservasi dibuat lewat RPC atomik, kemudian pengguna submit untuk review organizer.
 */
async function checkoutPage() {
  const shows = await getShows(),
    show = shows.find(s => s.slug === (q.get('show') || 'weeknd'));
  if (!show) {
    root.innerHTML = panel(
      'CONCERT UNAVAILABLE.',
      '<a class="btn pink" href="tickets.html">Choose concert</a>'
    );
    return;
  }
  const catalog = await getCategories(show.id),
    items = catalog
      .map(c => ({ ...c, qty: Math.max(0, Number(q.get('cat-' + c.id) || q.get(c.code) || 0)) }))
      .filter(c => c.qty > 0);
  const qty = items.reduce((n, c) => n + c.qty, 0);
  if (!qty || qty > 4 || items.some(i => !Number.isInteger(i.qty) || !i.active)) {
    root.innerHTML = panel(
      'INVALID SELECTION.',
      '<p>Choose one to four available tickets.</p><a class="btn pink" href="tickets.html">Choose tickets</a>'
    );
    return;
  }
  const amount = items.reduce((n, c) => n + c.price_idr * c.qty, 0);
  const buyerUser = await currentUser();
  let buyerProfile = null;
  if (buyerUser && !buyerUser.is_anonymous) {
    const result = await db
      .from('profiles')
      .select('full_name,phone')
      .eq('id', buyerUser.id)
      .maybeSingle();
    if (!result.error) buyerProfile = result.data;
  }
  root.innerHTML = panel(
    'REVIEW YOUR NIGHT.',
    `<p class="page-lead">Enter the buyer contact and attendee names for each ticket.</p><p class="small-print">${esc(EXPLAIN)}</p>${bookingSteps(2)}<section class="section"><div class="checkout-grid"><form id="checkout-demo" class="paper-panel"><h2>BUYER DETAILS</h2><div class="fields-2"><div class="field"><label>Full name<input id="buyer-name" minlength="3" maxlength="120" required autocomplete="name"></label></div><div class="field"><label>Phone<input id="buyer-phone" type="tel" minlength="9" maxlength="35" required autocomplete="tel"></label></div></div><div class="field"><label>Email<input id="buyer-email" type="email" required autocomplete="email"></label></div><h2>ATTENDEES</h2>${Array.from({ length: qty }, (_, i) => `<div class="field"><label>Ticket ${i + 1} — attendee name<input id="attendee-${i}" minlength="3" maxlength="120" required></label></div>`).join('')}<p class="small-print">Your selected zone is reserved for 10 minutes. Submit your reservation for organizer review. E-tickets are only issued after approval. No payment is charged.</p><button class="btn pink full" type="submit">RESERVE TICKETS</button></form><aside class="summary"><div class="micro">ORDER SUMMARY</div><h3>${esc(show.title)}</h3><p>${esc(fmtDate(show.show_date))}</p><div class="line"></div>${items.map(c => `<div class="summary-row"><span>${c.qty} × ${esc(c.name)}</span><b>${money(c.price_idr * c.qty)}</b></div>`).join('')}<div class="summary-total"><span>ORDER TOTAL</span><strong>${money(amount)}</strong></div><a class="btn outline full" href="tickets.html?show=${encodeURIComponent(show.slug)}">EDIT TICKET ZONES</a></aside></div></section>`
  );
  const form = $('checkout-demo'),
    btn = form.querySelector('button[type="submit"]');
  if (buyerUser && !buyerUser.is_anonymous) {
    $('buyer-name').value = buyerProfile?.full_name || buyerUser.user_metadata?.full_name || '';
    $('buyer-phone').value = buyerProfile?.phone || buyerUser.phone || '';
    $('buyer-email').value = buyerUser.email || '';
    const note = document.createElement('p');
    note.className = 'small-print';
    note.textContent =
      'Buyer details are filled from your account. Check your contact details before reserving. Enter attendee names separately.';
    form.querySelector('h2').insertAdjacentElement('afterend', note);
  }
  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    btn.disabled = true;
    btn.textContent = 'RESERVING…';
    try {
      await requireUser({ guest: true });
      const attendees = Array.from(form.querySelectorAll('[id^="attendee-"]')).map(x =>
        x.value.trim()
      );
      if (attendees.some(x => x.length < 3 || x.length > 120))
        throw new Error('Attendee names must be 3–120 characters.');
      let pos = 0,
        selection = items.map(c => ({
          category_id: c.id,
          attendees: attendees.slice(pos, (pos += c.qty)),
        }));
      let contact = {
        name: $('buyer-name').value.trim(),
        phone: $('buyer-phone').value.trim(),
        email: $('buyer-email').value.trim(),
      };
      const order = await req(
        db.rpc('create_demo_reservation', {
          p_show_id: show.id,
          p_items: selection,
          p_contact: contact,
          p_request_key: crypto.randomUUID().replaceAll('-', ''),
        })
      );
      form.innerHTML = `${bookingSteps(3)}<h2>REVIEW RESERVATION.</h2><p id="reservation-countdown" class="reservation-countdown" role="timer"></p><div class="review-list"><p><b>${esc(show.title)}</b><br>${esc(fmtDate(show.show_date))}</p>${items.map(c => `<div class="summary-row"><span>${c.qty} × ${esc(c.name)}</span><b>${money(c.price_idr * c.qty)}</b></div>`).join('')}<div class="summary-total"><span>ORDER TOTAL</span><strong>${money(order.total_idr)}</strong></div></div><p>${esc(EXPLAIN)}</p><p class="small-print">This request will be reviewed by the organizer. Approval is for demo entry only and does not indicate payment received.</p><button type="button" id="confirm-demo" class="btn pink full">SUBMIT FOR REVIEW</button><a class="btn outline full" href="tickets.html?show=${encodeURIComponent(show.slug)}">START OVER</a>`;
      startReservationCountdown(order.expires_at);
      $('confirm-demo').onclick = async () => {
        let b = $('confirm-demo');
        b.disabled = true;
        try {
          let done = await req(db.rpc('submit_demo_order', { p_order_id: order.id }));
          if (done.status !== 'under_review')
            throw new Error('Reservation has expired. Please start again.');
          location.href = 'dashboard.html';
        } catch (error) {
          err(error);
          b.disabled = false;
        }
      };
    } catch (error) {
      err(error);
      btn.disabled = false;
      btn.textContent = 'RESERVE TICKETS';
    }
  });
}
/** Wallet pembeli: hanya order approved yang boleh menampilkan QR dan tombol unduh. */
async function dashboard() {
  root.innerHTML = loading('MY NADAKITA.');
  const u = await requireUser();
  const [profile, orders] = await Promise.all([
    req(db.from('profiles').select('*').eq('id', u.id).maybeSingle()),
    req(
      db
        .from('orders')
        .select(
          '*,shows(title,slug,show_date,artists(name,slug),venues(name,city)),order_items(*,ticket_categories(name)),tickets(*,ticket_categories(name,code),checkins(*))'
        )
        .eq('owner_id', u.id)
        .order('created_at', { ascending: false })
    ),
  ]);
  await Promise.all([
    document.fonts.load('700 60px "Outfit"'),
    document.fonts.load('400 28px "DM Sans"'),
  ]);
  const issuedTickets = orders
    .filter(o => o.status === 'confirmed_demo')
    .flatMap(o => o.tickets || []);
  let html = panel(
    'MY NADAKITA.',
    `<div class="account-layout"><aside class="account-sidebar"><div class="micro muted">MY ACCOUNT</div><h3>${esc(profile?.full_name || 'HELLO')}</h3><div class="line"></div><a href="#my-orders">MY ORDERS</a><a href="#my-profile">MY PROFILE</a><a href="tickets.html">GET TICKETS</a><button type="button" class="btn outline" id="signout">SIGN OUT</button></aside><div><div class="dashboard-cards"><div class="stat-card"><strong>${orders.length}</strong><span>ORDERS</span></div><div class="stat-card"><strong>${issuedTickets.length}</strong><span>E-TICKETS</span></div><div class="stat-card"><strong>${issuedTickets.filter(isCheckedIn).length}</strong><span>CHECKED IN</span></div></div><h2 id="my-orders">MY ORDERS</h2>${orders.map(o => `<article class="paper-panel live-order order-pass"><div class="summary-row"><strong class="order-pass-title">${esc(o.shows?.title)}</strong><span class="status">${esc(o.status === 'pending_demo' && new Date(o.expires_at) <= new Date() ? 'Expired' : friendly[o.status])}</span></div><p class="small-print">Order: ${esc(o.id)} · ${esc(fmtDate(o.shows?.show_date))} · ${money(o.total_idr)}</p>${renderOrderItems(o)}${o.status === 'pending_demo' && new Date(o.expires_at) > new Date() ? `<p>Expires: ${esc(new Date(o.expires_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }))} WIB</p>${button('SUBMIT FOR REVIEW', 'confirm-' + o.id)}` : ''}${o.status === 'under_review' ? `<p class="account-review-note"><strong>UNDER REVIEW</strong> · Your request is waiting for organizer approval. No QR ticket has been issued. Review hold expires ${esc(dateTimeWib(o.expires_at))} WIB.</p>` : ''}${o.status === 'rejected' ? `<p class="account-rejection-note"><strong>REQUEST NOT APPROVED</strong>${o.review_note ? ` · ${esc(o.review_note)}` : ''}. Select new tickets to make another request.</p>` : ''}<div class="live-tickets">${(o.status === 'confirmed_demo' ? o.tickets : [])?.map(t => renderTicket(o, t)).join('')}</div>${['confirmed_demo', 'pending_demo', 'under_review'].includes(o.status) ? button('CANCEL ORDER', 'cancel-' + o.id, 'outline') : ''}</article>`).join('') || '<div class="paper-panel">No orders yet. <a href="tickets.html">Choose a show</a>.</div>'}<div class="paper-panel" id="my-profile"><h2>PROFILE</h2><form id="profile-form"><div class="field"><label>Full name<input name="full_name" value="${esc(profile?.full_name)}" maxlength="120" required></label></div><div class="field"><label>Phone<input name="phone" value="${esc(profile?.phone)}" maxlength="35"></label></div><p>${esc(u.email || 'Anonymous session')}</p><button class="btn pink">SAVE PROFILE</button></form></div></div></div>`
  );
  root.innerHTML = html;
  $('signout').onclick = async () => {
    await db.auth.signOut();
    location.href = 'login.html';
  };
  $('profile-form').onsubmit = async e => {
    e.preventDefault();
    try {
      await req(
        db
          .from('profiles')
          .update({
            full_name: e.target.full_name.value.trim(),
            phone: e.target.phone.value.trim(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', u.id)
      );
      notify('Profile updated successfully.');
    } catch (error) {
      err(error);
    }
  };
  for (const o of orders) {
    let c = $('confirm-' + o.id);
    if (c)
      c.onclick = async () => {
        try {
          const r = await req(db.rpc('submit_demo_order', { p_order_id: o.id }));
          if (r.status !== 'under_review')
            throw new Error('Reservation expired. Please start another order.');
          location.reload();
        } catch (error) {
          err(error);
        }
      };
    let b = $('cancel-' + o.id);
    if (b)
      b.onclick = async () => {
        if (!confirm('Cancel this reservation?')) return;
        try {
          await req(db.rpc('cancel_demo_order', { p_order_id: o.id }));
          location.reload();
        } catch (error) {
          err(error);
        }
      };
  }
  const qrNodes = [...document.querySelectorAll('.qr-slot')];
  if (qrNodes.length) {
    try {
      await loadScript('js/vendor/qrcode-1.0.0.min.js');
      qrNodes.forEach(el => {
        mountTicketQR(el, el.dataset.code);
        const card = el.closest('.concert-ticket'),
          download = card.querySelector('[data-download-ticket]'),
          note = card.querySelector('.ticket-download-note');
        const order = orders.find(
          o =>
            o.status === 'confirmed_demo' &&
            (o.tickets || []).some(t => String(t.id) === download.dataset.downloadTicket)
        );
        const ticket = order?.tickets.find(t => String(t.id) === download.dataset.downloadTicket),
          canvas = el.querySelector('canvas');
        if (!order || !ticket || !canvas) throw new Error('QR export unavailable');
        download.disabled = false;
        note.textContent = 'Save your ticket to your device.';
        download.onclick = async () => {
          download.disabled = true;
          note.textContent = 'Preparing download…';
          try {
            await downloadTicket(order, ticket, canvas);
            note.textContent = 'Ticket downloaded. Keep your QR private.';
          } catch (error) {
            note.textContent = error.message;
          } finally {
            download.disabled = false;
          }
        };
      });
    } catch (e) {
      qrNodes.forEach(el => {
        const card = el.closest('.concert-ticket');
        el.textContent = 'Use ticket code for manual validation.';
        card.querySelector('[data-ticket-qr]').innerHTML =
          '<rect width="320" height="320" fill="#fff"/><text x="160" y="160" text-anchor="middle" font-family="Arial,sans-serif" font-size="18">QR unavailable</text>';
        card.querySelector('[data-download-ticket]').disabled = true;
        card.querySelector('.ticket-download-note').textContent =
          'QR unavailable. Reload to enable download.';
      });
    }
  }
}
/** Muat pustaka QR saat diperlukan; kegagalan tetap ditangani renderer wallet. */
function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (window.QRCode && src.includes('qrcodejs')) return resolve();
    let s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}
/** Sinkronkan shell publik dengan konten/konser Supabase tanpa merender ulang kartu identik. */
async function publicContent() {
  if (page === 'show') {
    try {
      const dbShows = await getShows();
      const s = dbShows.find(item => item.slug === (q.get('show') || 'weeknd'));
      if (!s) {
        root.innerHTML = panel(
          'SHOW NOT AVAILABLE.',
          '<a class="btn pink" href="shows.html">See published shows</a>'
        );
        return;
      }
      const poster = coverFor(s);
      const [categoryData] = await Promise.all([
        getCategories(s.id),
        poster
          ? new Promise(resolve => {
              const image = new Image();
              image.onload = () => resolve();
              image.onerror = () => resolve();
              image.src = poster;
              if (image.complete) resolve();
            })
          : Promise.resolve(),
      ]);
      const local =
        window.NADAKITA_SHOWS.find(item => item.id === s.slug) || window.NADAKITA_SHOWS[0];
      root.innerHTML = renderArtistDetail(s, local, categoryData, poster);
      mountArtistPortrait(root);
      window.dispatchEvent(new Event('nadakita:show-ready'));
    } catch (error) {
      root.innerHTML = panel(
        'COULD NOT LOAD THIS SHOW.',
        '<p>Please try again.</p><button class="btn pink" id="retry-show">TRY AGAIN</button>'
      );
      $('retry-show').onclick = () => {
        root.innerHTML = loading('LOADING SHOW.');
        publicContent();
      };
    }
    return;
  }
  if (page === 'home') window.NADAKITA_LIVE_COUNTDOWN?.setUnavailable();
  try {
    const [blocks, notices, faqs, dbShows] = await Promise.all([
      req(db.from('site_content').select('*')),
      req(
        db
          .from('announcements')
          .select('*')
          .eq('published', true)
          .order('created_at', { ascending: false })
          .limit(3)
      ),
      req(db.from('faqs').select('*').eq('published', true).order('sort_order')),
      getShows(),
    ]);
    const values = Object.fromEntries(blocks.map(x => [x.key, x.value]));
    if (page === 'home') {
      let h = document.querySelector('.hero h1');
      if (h && values.hero_title && values.hero_title !== 'THREE NIGHTS. ONE CITY.') {
        h.textContent = values.hero_title;
        h.style.whiteSpace = 'normal';
      }
      let sub = document.querySelector('.hero-sub');
      if (sub && values.hero_subtitle) sub.textContent = values.hero_subtitle;
      if (values.hero_banner_url) {
        let art = document.querySelector('.hero-art');
        const image = art?.querySelector('.hero-image');
        if (image) image.src = values.hero_banner_url;
        else if (art) {
          art.style.backgroundImage = `url("${encodeURI(values.hero_banner_url).replaceAll('"', '%22')}")`;
          art.style.backgroundSize = 'cover';
          art.style.backgroundPosition = 'center';
        }
      }
      if (notices.length) {
        let div = document.createElement('section');
        div.className = 'wrap section';
        div.innerHTML = `<div class="preview-label">LATEST ANNOUNCEMENTS</div>${notices.map(x => `<div class="paper-panel"><h3>${esc(x.title)}</h3><p>${esc(x.body)}</p></div>`).join('')}`;
        document.querySelector('.hero')?.after(div);
      }
    }
    if (page === 'about' && faqs.length) {
      let accord = document.querySelector('.accordion');
      if (accord)
        accord.innerHTML = faqs
          .map(
            f => `<details><summary>${esc(f.question)}</summary><p>${esc(f.answer)}</p></details>`
          )
          .join('');
    }
    if (page === 'home') window.NADAKITA_LIVE_COUNTDOWN?.setShows(dbShows);
    const publicCard = (s, index) => {
      const local =
        window.NADAKITA_SHOWS.find(x => x.id === s.slug) || window.NADAKITA_SHOWS[index % 3];
      return window.NADAKITA_RENDER_SHOW_CARD({
        ...local,
        id: esc(s.slug),
        name: esc(s.artists?.name || s.title),
        artist: esc(s.artists?.name || s.title).toUpperCase(),
        line: esc(s.description || local.line),
      });
    };
    if (page === 'home' || page === 'shows') {
      if (page === 'home') {
        let figures = document.querySelectorAll('.stats-strip strong');
        if (figures[0]) figures[0].textContent = String(dbShows.length).padStart(2, '0');
        if (figures[1]) figures[1].textContent = String(dbShows.length).padStart(2, '0');
      }
      const grid = document.querySelector('.show-grid');
      if (grid) {
        const cards = [...grid.querySelectorAll('.show-card')];
        const sameShows =
          cards.length === dbShows.length &&
          cards.every(
            (card, i) =>
              card.querySelector('[data-show-slug]')?.dataset.showSlug === dbShows[i].slug
          );
        if (sameShows) {
          cards.forEach((card, i) => {
            const show = dbShows[i],
              name = show.artists?.name || show.title;
            card.querySelector('h3').textContent = name.toUpperCase();
            const posterName = card.querySelector('.poster-artist');
            if (posterName) posterName.textContent = name.toUpperCase();
            if (show.description)
              card.querySelector('.show-card-body p').textContent = show.description;
            const image = card.querySelector('img'),
              cover = coverFor(show);
            if (image && cover && image.getAttribute('src') !== cover) image.src = cover;
          });
        } else
          grid.innerHTML =
            dbShows.map(publicCard).join('') ||
            '<div class="empty-state">No published concerts at the moment.</div>';
      }
    }
    if (page === 'schedule' && window.NADAKITA_SHOW_GUIDE) {
      window.NADAKITA_SHOW_GUIDE.setShows(dbShows);
    }
    if (page === 'home' || page === 'schedule') await mountPublicVenue(dbShows);
  } catch (e) {
    if (page === 'home' || page === 'schedule') {
      const host = $('public-venue-map');
      if (host) host.innerHTML = window.NADAKITA_ZONES.map({ priceState: 'error' });
      const message = document.querySelector('[data-venue-price-message]');
      if (message)
        message.textContent = 'Current prices could not be loaded. Open the ticket page to retry.';
    }
    console.warn('Public content temporarily unavailable', e);
  }
}
/** Pisahkan navigasi organizer dari pembeli; ini UX, bukan pengganti guard database. */
function applyAdminNavigation() {
  document.querySelectorAll('a[href]').forEach(a => {
    const file = new URL(a.getAttribute('href'), location.href).pathname.split('/').pop();
    if (['tickets.html', 'checkout.html'].includes(file)) {
      if (a.closest('.nav') || a.classList.contains('header-cta')) a.remove();
      else {
        a.href = 'admin.html';
        a.textContent = 'CONTROL ROOM';
      }
    } else if (['login.html', 'dashboard.html'].includes(file)) {
      a.href = 'admin.html';
      a.textContent = 'CONTROL ROOM';
    }
  });
}
/** Arahkan akun yang sudah login ke wallet; organizer ditangani jalur terpisah. */
async function refreshAccountLink() {
  const u = await currentUser();
  if (!u) return;
  let a = document.querySelector('.nav a[href="login.html"]');
  if (a) a.href = 'dashboard.html';
}
/** Periksa konfigurasi/role sebelum memilih halaman; admin tidak masuk checkout pembeli. */
async function startPage() {
  const protectedPage = [
    'login',
    'register',
    'forgot',
    'reset',
    'dashboard',
    'admin',
    'checkout',
    'tickets',
  ].includes(page);
  if (!configured) {
    if (protectedPage) root.innerHTML = setup();
    return;
  }
  if (!db) {
    const authForm = $('auth-demo');
    if (authForm) {
      authForm.dataset.authReady = 'true';
      authForm.addEventListener('submit', event => event.preventDefault());
      const btn = authForm.querySelector('button[type="submit"]');
      if (btn) btn.disabled = true;
      const message = $('live-message');
      if (message) {
        message.hidden = false;
        message.setAttribute('role', 'alert');
        message.textContent =
          location.protocol === 'file:'
            ? 'Open NADAKITA LIVE through VS Code Live Server (Go Live), not by double-clicking the HTML file.'
            : 'Unable to load the sign-in service. Check your internet or CDN access, then reload. Supabase project settings are already configured.';
      }
    } else if (protectedPage) {
      root.innerHTML = panel(
        'SIGN-IN SERVICE UNAVAILABLE.',
        '<p>Unable to load the Supabase browser library. Open this website with Live Server, check your connection, and reload.</p><a class="btn outline" href="login.html">BACK TO SIGN IN</a>'
      );
    }
    console.error('Supabase SDK unavailable', sdkLoadError);
    return;
  }
  try {
    if (['login', 'forgot', 'reset'].includes(page)) {
      await authPage();
      return;
    }
    const user = await currentUser();
    const admin = !!user && (await isAdmin());
    if (admin) {
      applyAdminNavigation();
      if (['tickets', 'checkout', 'dashboard', 'register'].includes(page)) {
        location.replace('admin.html');
        return;
      }
    }
    if (page === 'admin') {
      root.innerHTML = loading('CONTROL ROOM.');
      if (!admin) {
        root.innerHTML = panel(
          'ACCESS DENIED.',
          '<p>Sign in with an account provisioned as admin in Supabase. No public registration grants admin rights.</p><a class="btn pink" href="login.html">ADMIN SIGN IN</a>'
        );
        return;
      }
      await mountAdmin(root);
      return;
    }
    if (['login', 'register', 'forgot', 'reset'].includes(page)) {
      await authPage();
      return;
    }
    if (page === 'dashboard') {
      await dashboard();
      return;
    }
    if (page === 'tickets') {
      await ticketPage();
      return;
    }
    if (page === 'checkout') {
      await checkoutPage();
      return;
    }
    await publicContent();
    if (admin) applyAdminNavigation();
    else await refreshAccountLink();
  } catch (e) {
    if (page === 'tickets') {
      root.innerHTML = panel(
        'TICKETS TEMPORARILY UNAVAILABLE.',
        '<p>Please try loading the ticket categories again.</p><button class="btn pink" id="retry-tickets">TRY AGAIN</button>'
      );
      $('retry-tickets').onclick = () => {
        root.innerHTML = loading('LOADING TICKETS.');
        start();
      };
    } else if (['admin', 'dashboard', 'checkout'].includes(page))
      root.innerHTML = panel(
        'ACTION REQUIRED.',
        `<div id="live-message" role="alert" class="live-error">${esc(e.message)}</div><a class="btn outline" href="login.html">Sign in</a>`
      );
    else err(e);
  }
}
/** Tetap buka halaman pada jalur error supaya pengguna dapat membaca pesan pemulihan. */
async function start() {
  try {
    await startPage();
  } finally {
    await window.NADAKITA_NAVIGATION?.reveal();
  }
}
if (document.readyState === 'loading')
  document.addEventListener('DOMContentLoaded', start, { once: true });
else start();
