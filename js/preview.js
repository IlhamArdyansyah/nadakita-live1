/* NADAKITA LIVE — UI PROTOTYPE ONLY. No Supabase, authentication, orders or real QR codes. */
'use strict';
/**
 * Shell visual bersama: header/footer, katalog fallback, dan markup halaman publik.
 * Tidak membuat akun/order atau QR valid. app.js mengisi data live setelah shell siap.
 * Template tetap disimpan utuh untuk menjaga whitespace dan tampilan yang disetujui.
 */
const SHOWS = [
  {
    id: 'weeknd',
    isoDate: '2026-11-20',
    startsAt: '20:00',
    endsAt: '22:00',
    artist: 'THE WEEKND',
    name: 'The Weeknd',
    night: '01',
    date: 'Jumat, 20 November 2026',
    short: '20 NOV 2026',
    day: 'FRIDAY',
    tone: 'red',
    line: 'INTO THE AFTER HOURS.',
    concept: 'A night after dark. A city under the lights. An unforgettable stadium-scale sound.',
    vibe: 'THE DARK SIDE OF THE NIGHT.',
    color: 'CRIMSON / BLACK',
    tag: 'NIGHT 01 — RED EDITION',
  },
  {
    id: 'bieber',
    isoDate: '2026-11-21',
    startsAt: '20:00',
    endsAt: '22:00',
    artist: 'JUSTIN BIEBER',
    name: 'Justin Bieber',
    night: '02',
    date: 'Sabtu, 21 November 2026',
    short: '21 NOV 2026',
    day: 'SATURDAY',
    tone: 'blue',
    line: 'ALL IN. ALL HEART.',
    concept:
      'Pure pop energy, shared memories, and every word sung back beneath the stadium lights.',
    vibe: 'FEEL EVERY MOMENT.',
    color: 'ELECTRIC BLUE / LILAC',
    tag: 'NIGHT 02 — BLUE EDITION',
  },
  {
    id: 'bruno',
    isoDate: '2026-11-22',
    startsAt: '20:00',
    endsAt: '22:00',
    artist: 'BRUNO MARS',
    name: 'Bruno Mars',
    night: '03',
    date: 'Minggu, 22 November 2026',
    short: '22 NOV 2026',
    day: 'SUNDAY',
    tone: 'gold',
    line: 'THE NIGHT HAS RHYTHM.',
    concept: 'One closing night packed with rhythm, soul, and a whole stadium moving together.',
    vibe: 'ONE LAST DANCE.',
    color: 'GOLD / AMBER',
    tag: 'NIGHT 03 — GOLD EDITION',
  },
];
const CATEGORIES = [
  {
    id: 'vip',
    label: 'VIP EXPERIENCE',
    detail: 'Premium zone · exclusive entrance experience',
    price: 2250000,
  },
  { id: 'festa', label: 'FESTIVAL A', detail: 'Standing · Front zone', price: 1500000 },
  { id: 'festb', label: 'FESTIVAL B', detail: 'Standing · Rear zone', price: 1200000 },
  { id: 'cat1', label: 'CAT 1', detail: 'Seated tribune · Premium zone', price: 950000 },
  { id: 'cat2', label: 'CAT 2', detail: 'Seated tribune · Regular zone', price: 650000 },
];
window.NADAKITA_CATEGORIES = CATEGORIES;
window.NADAKITA_GUIDE_SOURCE = SHOWS;
window.NADAKITA_SHOWS = SHOWS;
const fmt = n => 'Rp' + n.toLocaleString('id-ID');
const qs = new URLSearchParams(
  typeof window.__PREVIEW_QUERY__ === 'string' ? window.__PREVIEW_QUERY__ : location.search
);
const selected = () => SHOWS.find(x => x.id === qs.get('show')) || SHOWS[0];
const link = (name, params = '') => `${name}.html${params}`;
const $ = id => document.getElementById(id);
const alertDemo =
  'Catatan: acara dan tiket ini adalah rancangan presentasi, bukan konser atau penjualan tiket resmi.';
function toast(message) {
  document.querySelector('.toast')?.remove();
  const el = document.createElement('div');
  el.className = 'toast';
  el.role = 'status';
  el.textContent = message;
  document.body.append(el);
  setTimeout(() => el.remove(), 4300);
}
function header(page) {
  return `<header class="header"><div class="wrap header-row"><a class="logo" href="index.html" aria-label="Nadakita Live home">NADA<span class="spark">★</span>KITA<small>LIVE / JAKARTA 2026</small></a><button class="mobile-menu" aria-controls="mainnav" aria-expanded="false" aria-label="Toggle navigation">☰</button><nav class="nav" id="mainnav" aria-label="Primary navigation"><a ${page === 'home' ? 'class="active" aria-current="page"' : ''} href="index.html">HOME</a><a ${['shows', 'show'].includes(page) ? 'class="active" aria-current="page"' : ''} href="shows.html">THE SHOWS</a><a ${page === 'schedule' ? 'class="active" aria-current="page"' : ''} href="schedule.html">SHOW GUIDE</a><a ${['tickets', 'checkout'].includes(page) ? 'class="active" aria-current="page"' : ''} href="tickets.html">TICKETS</a><a ${page === 'about' ? 'class="active" aria-current="page"' : ''} href="about.html">ABOUT</a><a ${['login', 'register', 'forgot', 'reset', 'dashboard'].includes(page) ? 'class="active" aria-current="page"' : ''} href="login.html">ACCOUNT</a></nav><a class="header-cta" href="tickets.html">GET TICKETS</a></div></header>`;
}
function footer() {
  return `<footer class="footer"><div class="wrap"><div class="footer-grid"><div><div class="footer-title">NADAKITA<i>★</i><br>LIVE.</div><p style="max-width:250px;color:#aaa;font-size:13px">Three nights. One city.<br>A new way to experience live music.</p></div><div><h4>EXPLORE</h4><a href="shows.html">The Shows</a><a href="schedule.html">Show Guide</a><a href="tickets.html">Ticket Zones</a></div><div><h4>INFORMATION</h4><a href="about.html">About</a><a href="about.html#faq">FAQ</a></div><div><h4>MY NADAKITA</h4><a href="login.html">Sign In</a><a href="register.html">Register</a></div></div><div class="footer-bottom"><span>© 2026 NADAKITA LIVE.</span></div></div></footer>`;
}
function title(kicker, heading, lead = '') {
  return `<div class="page-top"><div class="preview-label">${kicker}</div><h1 class="page-title">${heading}</h1>${lead ? `<p class="page-lead">${lead}</p>` : ''}</div>`;
}
function demoNotice() {
  return ``;
}
function showPoster(s, detail = false) {
  const slug = { weeknd: 'the-weeknd', bieber: 'justin-bieber', bruno: 'bruno-mars' }[s.id];
  const filename = `${slug}.jpg`;
  return `<div class="${detail ? 'poster-art' : 'poster'} ${s.tone}"><div class="poster-glow"></div><img class="poster-photo" src="assets/images/artists/${filename}" alt="${s.name} promotional portrait" width="720" height="1280" loading="lazy" decoding="async" onload="this.parentElement.classList.add('photo-ready')" onerror="this.hidden=true"><div class="poster-top"><span>NADAKITA LIVE 2026</span><span>NIGHT ${s.night}</span></div><div class="photo-label">PHOTO PLACEHOLDER — ${filename}</div><div class="poster-artist">${s.artist.replace(' ', '<br>')}</div><div class="poster-bottom">JAKARTA · ${s.short}</div></div>`;
}
function showCard(s) {
  return `<article class="show-card lineup-card ${s.tone}"><a class="artist-card-link" data-show-slug="${s.id}" href="show.html?show=${s.id}" aria-label="Explore ${s.name}">${lineupArtwork(s)}</a><div class="show-card-body"><div class="lineup-card-date"><span>NIGHT ${s.night}</span><i aria-hidden="true"></i><time datetime="${s.isoDate}">${s.short}</time></div><h3>${s.artist}</h3><div class="mini-divider"></div><p>${s.line}</p><a class="btn full" href="show.html?show=${s.id}">DISCOVER THIS NIGHT <span aria-hidden="true">→</span></a></div></article>`;
}
/** Local artist portraits with vector fallback; names and dates remain HTML. */
function lineupArtwork(s) {
  const filename = { weeknd: 'the-weeknd', bieber: 'justin-bieber', bruno: 'bruno-mars' }[s.id];
  const portrait = filename
    ? `<img class="lineup-photo" src="assets/images/artists/${filename}.jpg" alt="${s.name}" width="720" height="1080" loading="lazy" decoding="async" onerror="this.hidden=true">`
    : '';
  const shapes =
    s.tone === 'blue'
      ? '<circle cx="155" cy="205" r="124" fill="#2423d6"/><path d="M135 0h65v350h-65Z" fill="#5550ff"/><path d="M200 18 310 0v350H200Z" fill="#b6b1ff" opacity=".65"/><path d="M310 135q0 85-58 85 58 0 58 85 0-85 58-85-58 0-58-85Z" fill="#2423d6"/>'
      : s.tone === 'gold'
        ? '<circle cx="125" cy="195" r="112" fill="#ffb542"/><path d="M116 0h40v350h-40Z" fill="#ef8b16"/><path d="M166 0h6v350h-6Z" fill="#ffc35d"/><g fill="none" stroke="#ffc35d" stroke-width="13"><circle cx="420" cy="415" r="235"/><circle cx="420" cy="415" r="205"/><circle cx="420" cy="415" r="175"/><circle cx="420" cy="415" r="145"/></g><path d="m288 35 8 58 36-46-24 54 58-15-53 28 53 28-58-15 24 54-36-46-8 58-8-58-36 46 24-54-58 15 53-28-53-28 58 15-24-54 36 46Z" fill="#ffad32"/>'
        : '<circle cx="168" cy="202" r="145" fill="#f51f5d"/><path d="M206 0h67v350h-67Z" fill="#740d32"/><path d="M0 276h35v-31h18v39h26v-70h19v136H0Zm128 74v-48h20v-26h14v-54h8v54h17v74Zm94 0v-69h21v-35h16v-82h7v82h22v-14h17v118Zm106 0v-72h15v-25h12v97Z" fill="#101014"/><path d="M301 70q0 87-44 87 44 0 44 87 0-87 44-87-44 0-44-87Z" fill="#ff316b"/>';
  return `<div class="lineup-art"><svg viewBox="0 0 400 350" aria-hidden="true" focusable="false"><defs><filter id="grain-${s.id}"><feTurbulence type="fractalNoise" baseFrequency=".8" numOctaves="3" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter></defs><path fill="${s.tone === 'blue' ? '#ece8df' : '#101014'}" d="M0 0h400v350H0Z"/>${shapes}<path d="M0 0h400v350H0Z" filter="url(#grain-${s.id})" opacity=".16"/></svg>${portrait}<div class="lineup-art-label"><span>NADAKITA<br>LIVE<br>2026</span><span>MUSIC<br>PEOPLE<br>MOMENTS</span></div></div>`;
}
window.NADAKITA_RENDER_SHOW_CARD = showCard;
/** Shared live venue map: the shell never publishes prototype category prices. */
function venueFeature() {
  return `<section class="section venue-feature venue-feature--night">
    <div class="venue-feature-main">
      <div class="venue-feature-copy">
        <div><div class="preview-label">02 / THE VENUE</div><h2>ALL ROADS LEAD TO<br><em>JAKARTA.</em></h2></div>
        <div><p>One stadium. Three nights under the lights. Explore the layout and find the zone for your concert night.</p><a href="schedule.html" class="btn">EXPLORE SHOW GUIDE <span aria-hidden="true">→</span></a></div>
      </div>
      <div class="venue-feature-map">
        <div class="venue-controls"><label class="venue-night-picker">CONCERT NIGHT<select data-public-venue-select aria-label="Venue map concert night">${SHOWS.map(s => `<option value="${s.id}">Night ${s.night} · ${s.name}</option>`).join('')}</select></label></div>
        <p class="venue-price-message" data-venue-price-message role="status"></p>
        <button class="venue-price-retry" data-venue-price-retry type="button" hidden>TRY AGAIN</button>
        <div id="public-venue-map">${window.NADAKITA_ZONES.map({ priceState: 'loading' })}</div>
      </div>
    </div>
  </section>`;
}
/** Keep the supplied artwork decorative; real headline/links stay readable HTML. */
function jakartaHero() {
  return `<section class="hero hero--jakarta" aria-labelledby="hero-heading">
    <div class="hero-art" aria-hidden="true"><img class="hero-image" src="assets/images/banners/neon-jakarta-gbk-hero.png" width="1672" height="941" alt="" fetchpriority="high" decoding="async"></div>
    <div class="wrap hero-grid">
      <div class="hero-copy">
        <span class="hero-kicker">NADAKITA PRESENTS / JAKARTA 2026</span>
        <h1 id="hero-heading"><span>THREE</span><span>NIGHTS.</span><em>ONE CITY.</em></h1>
        <p class="hero-sub">Three international icons. Three standalone stadium concerts. One city, louder than ever.</p>
        <a class="btn pink" href="shows.html">EXPLORE THE SHOWS <span aria-hidden="true">→</span></a>
        <div class="hero-meta"><span>20 — 22 NOVEMBER 2026</span><span>STADION UTAMA GBK · JAKARTA</span></div>
      </div>
    </div>
  </section>`;
}
function pageHome() {
  return `${jakartaHero()}<section class="concert-countdown" aria-label="Next concert countdown" id="concert-countdown"><div class="wrap countdown-layout"><div class="countdown-copy"><span class="countdown-eyebrow" id="countdown-eyebrow">THE WAIT IS ALMOST OVER</span><strong id="countdown-title" class="countdown-title" aria-live="polite">LOADING CONCERT SCHEDULE</strong></div><div class="countdown-clock" id="countdown-clock" role="timer" aria-live="off" aria-label="Time until next concert"><div class="countdown-unit"><strong data-countdown="days">000</strong><span>DAYS</span></div><div class="countdown-unit"><strong data-countdown="hours">00</strong><span>HOURS</span></div><div class="countdown-unit"><strong data-countdown="minutes">00</strong><span>MINUTES</span></div><div class="countdown-unit"><strong data-countdown="seconds">00</strong><span>SECONDS</span></div></div></div></section><div class="wrap"><div class="stats-strip"><div><strong>03</strong><span>EXCLUSIVE NIGHTS</span></div><div><strong>03</strong><span>GLOBAL HEADLINERS</span></div><div><strong>01</strong><span>ICONIC STADIUM</span></div></div><section class="section"><div class="section-head"><div><div class="preview-label">01 / THE LINEUP</div><h2 class="section-title">PICK YOUR<br><span class="accent">NIGHT.</span></h2></div><p class="section-copy">Not a festival lineup. Three completely different concert experiences. Which night belongs to you?</p></div><div class="show-grid">${SHOWS.map(showCard).join('')}</div></section>${venueFeature()}</div><section class="section section-dark"><div class="wrap"><div class="preview-label" style="color:var(--lime)">03 / READY WHEN YOU ARE</div><h2 class="section-title" style="font-size:clamp(66px,9vw,140px)">YOUR NIGHT<br><span style="color:var(--pink)">STARTS HERE.</span></h2><p class="section-copy">Choose your concert, pick your zone, plan your concert night.</p><div class="spacer-24"></div><a href="tickets.html" class="btn lime">EXPLORE TICKETS</a></div></section>`;
}
function pageShows() {
  return `<div class="wrap">${title('01 / THREE CONCERTS', 'THE <span class="accent">SHOWS.</span>', 'Three standalone nights. Three distinct sounds. Every show is its own experience.')}${demoNotice()}
    <section class="section shows-lineup"><div class="show-grid">${SHOWS.map(showCard).join('')}</div></section>
    <section class="shows-focus" aria-labelledby="shows-focus-title">
      <div class="shows-focus-copy">
        <div class="preview-label">A SINGLE STAGE. A SINGLE FOCUS.</div>
        <h2 class="section-title" id="shows-focus-title">JUST THE<br><span class="accent">HEADLINER.</span></h2>
        <p>One international artist per night. No opening acts or overlapping stages—just the show you came for.</p>
        <a class="shows-focus-link" href="schedule.html">PLAN YOUR NIGHT <span aria-hidden="true">→</span></a>
      </div>
      <dl class="shows-focus-facts">
        <div><dt><span aria-hidden="true">01</span> ONE ARTIST</dt><dd>A full night dedicated to your headliner.</dd></div>
        <div><dt><span aria-hidden="true">01</span> ONE STAGE</dt><dd>No stage-hopping. Stay with the music.</dd></div>
        <div><dt><span aria-hidden="true">01</span> ONE NIGHT</dt><dd>One concert night per ticket. Choose yours.</dd></div>
      </dl>
    </section>
  </div>`;
}
function pageShow() {
  const s = selected();
  return `<div class="wrap"><div class="detail-hero"><div class="detail-copy"><div class="preview-label">NIGHT ${s.night} / ${s.day.toUpperCase()} / THE SHOWS</div><h1>${s.artist.replace(' ', '<br>')}</h1><p class="micro marker">${s.tag}</p><h2 style="font:900 30px var(--font-display);margin:23px 0 6px">${s.line}</h2><p>${s.concept}</p><div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:20px"><a class="btn pink" href="tickets.html?show=${s.id}">EXPLORE TICKETS</a><a class="btn outline" href="schedule.html?show=${s.id}">SHOW GUIDE</a></div></div><div class="detail-poster">${showPoster(s, true)}</div></div><div class="meta-list"><div class="meta-item"><span>SHOW DATE</span><strong>${s.date}</strong></div><div class="meta-item"><span>VENUE REFERENCE</span><strong>Stadion Utama GBK, Jakarta</strong></div><div class="meta-item"><span>HEADLINER START</span><strong>20.00 WIB</strong></div></div><section class="section"><div class="split-content"><div><div class="preview-label">THE ATMOSPHERE</div><h2 class="section-title">${s.vibe}</h2><p class="page-lead">${s.concept} An intimate connection on a stadium scale. This standalone concert has no opening act.</p><div class="spacer-24"></div>${demoNotice()}</div>${window.NADAKITA_ZONES.map({ show: s.id, categories: CATEGORIES })}</div><div class="booking-detail-list" aria-label="Ticket category guide">${CATEGORIES.map(c => `<div><div><b>${c.label}</b><small>${c.detail}</small></div><div><strong>${fmt(c.price)}</strong><br><a href="tickets.html?show=${s.id}&zone=${c.id}">SELECT ZONE</a></div></div>`).join('')}</div><p class="booking-list-footnote">One ticket is valid for one concert night. Zone allocation is illustrative and does not include numbered seats.</p></section><section class="section" style="padding-top:10px"><div class="section-head"><div><div class="preview-label">DON'T MISS YOUR NIGHT</div><h2 class="section-title">EXPLORE ALL SHOWS.</h2></div><a class="btn outline small" href="shows.html">VIEW ALL</a></div><div class="show-grid">${SHOWS.filter(
    x => x.id !== s.id
  )
    .map(showCard)
    .join('')}</div></section></div>`;
}
function pageSchedule() {
  return `<div class="wrap show-guide-page">
    <header class="guide-intro" aria-labelledby="guide-page-title">
      <div class="guide-intro-copy">
        <p class="preview-label">02 / YOUR NIGHT, PLANNED</p>
        <h1 id="guide-page-title">SHOW <span>GUIDE.</span></h1>
        <p>One headliner per night. No opening acts. Plan ahead with the evening schedule and venue information.</p>
      </div>
      <div class="guide-intro-art" aria-hidden="true">
        <img class="guide-intro-image" src="assets/images/banners/neon-jakarta-gbk-hero.png" width="1672" height="941" alt="" fetchpriority="high" decoding="async" />
      </div>
    </header>
    <section class="section guide-section" aria-label="Concert rundown">
      <div class="schedule-shell" id="show-guide">
        <aside class="side-panel guide-sidebar" aria-labelledby="guide-choose-heading">
          <h2 id="guide-choose-heading">CHOOSE A NIGHT</h2>
          <div class="side-links guide-night-tabs" id="guide-night-options" role="tablist" aria-label="Concert nights"></div>
          <p class="guide-sidebar-note">All times in WIB (GMT+7). Times are subject to change.</p>
          <a class="btn pink full small guide-ticket-link" id="guide-ticket-link" href="tickets.html?show=weeknd">SEE TICKET ZONES</a>
        </aside>
        <div class="guide-content" id="guide-content" role="tabpanel" tabindex="0" aria-label="Selected concert rundown">
          <div class="guide-heading">
            <div class="guide-date-line"><p class="preview-label guide-date" id="guide-date"></p></div>
            <h2 class="section-title guide-artist" id="guide-artist"></h2>
            <div class="guide-metadata" aria-label="Concert information">
              <span><strong>VENUE</strong> <span id="guide-venue">Stadion Utama GBK, Jakarta</span></span>
              <span><strong>TIMEZONE</strong> WIB (GMT+7)</span>
              <span><strong>TICKETS</strong> One Ticket, One Night</span>
            </div>
          </div>
          <div class="timeline guide-timeline" id="guide-timeline" aria-label="Schedule for selected concert"></div>
        </div>
        <aside class="guide-essentials" aria-labelledby="guide-essentials-heading">
          <h2 id="guide-essentials-heading">BEFORE YOU ARRIVE</h2>
          <div><span aria-hidden="true">↗</span><p><small>ENTRY</small><b>Digital ticket ready</b></p></div>
          <div><span aria-hidden="true">◷</span><p><small>ARRIVE</small><b>Aim for before 19.00 WIB</b></p></div>
          <div><span aria-hidden="true">◎</span><p><small>VENUE</small><b>Stadion Utama GBK, Jakarta</b></p></div>
        </aside>
      </div>
    </section>
    <section class="section guide-venue" aria-label="Selected concert venue map">
      ${demoNotice()}
      <p class="venue-price-message" data-venue-price-message role="status"></p>
      <button class="venue-price-retry" data-venue-price-retry type="button" hidden>TRY AGAIN</button>
      <div id="public-venue-map">${window.NADAKITA_ZONES.map({ show: selected().id, priceState: 'loading' })}</div>
    </section>
    <section class="section guide-before" aria-labelledby="guide-before-heading">
      <h2 id="guide-before-heading" class="section-title">BEFORE YOU GO.</h2>
      <div class="show-grid">
        ${[
          [
            '01',
            'ARRIVAL',
            'Prepare your digital ticket and allow extra travel time around the stadium.',
          ],
          [
            '02',
            'YOUR ZONE',
            'Your ticket is valid for one concert night and its designated entry zone.',
          ],
          [
            '03',
            'VENUE GUIDANCE',
            'Follow venue staff instructions when entering and leaving the stadium.',
          ],
        ]
          .map(
            a =>
              `<div class="paper-panel"><span class="micro">${a[0]}</span><h3 style="font:800 27px var(--font-display);margin:16px 0 8px">${a[1]}</h3><p class="muted">${a[2]}</p></div>`
          )
          .join('')}
      </div>
    </section>
  </div>`;
}
function pageTickets() {
  const s = selected();
  return `<div class="wrap">${title('03 / TICKET EXPERIENCE', 'CHOOSE YOUR <span class="accent">ZONE.</span>', 'Pick a concert, explore its zones, and select up to four tickets.')}${demoNotice()}<section class="section" style="padding-top:24px"><div class="booking-steps" aria-label="Booking steps"><strong class="is-current">01 / CHOOSE CONCERT & ZONE</strong><span>02 / ATTENDEE DETAILS</span><span>03 / REVIEW</span></div><div class="preview-label" style="margin-bottom:18px">STEP 01 — CHOOSE A CONCERT</div><div class="tabs" id="ticket-tabs" role="group" aria-label="Choose concert">${SHOWS.map(x => `<button type="button" class="tab ${s.id === x.id ? 'selected' : ''}" data-show="${x.id}" aria-pressed="${s.id === x.id}">NIGHT ${x.night} / ${x.artist}</button>`).join('')}</div><div class="ticket-layout"><div>${window.NADAKITA_ZONES.map({ show: s.id, categories: CATEGORIES, interactive: true })}<div class="preview-label" style="margin:16px 0">STEP 02 — TICKET CATEGORIES · MAX 4 PER ORDER</div><p class="booking-selection-note" id="selected-zone-label" role="status">Select a zone on the diagram or choose a quantity below.</p><div class="category-list">${CATEGORIES.map(c => `<div class="ticket-option" data-zone-row="${c.id}" id="zone-${c.id}"><div><span class="type">${c.label}</span><p>${c.detail}</p><div class="small-print">Zone admission · No numbered-seat selection</div></div><div><div class="price">${fmt(c.price)}</div><div class="qty-stepper"><button type="button" aria-label="Decrease ${c.label}" data-qty="${c.id}" data-delta="-1">−</button><span id="count-${c.id}" aria-live="polite">0</span><button type="button" aria-label="Increase ${c.label}" data-qty="${c.id}" data-delta="1">+</button></div></div></div>`).join('')}</div></div><aside class="summary"><div class="micro">YOUR SELECTION</div><h3>ORDER SUMMARY</h3><p id="summary-show" style="font-size:14px;font-weight:850">${s.artist} · ${s.short}</p><div class="line"></div><div id="summary-rows"><p class="small-print">No tickets selected yet.</p></div><div class="summary-total"><span class="micro">EST. TOTAL</span><strong id="ticket-total">Rp0</strong></div><a class="btn full" id="ticket-next" href="#" aria-disabled="true">CONTINUE TO CHECKOUT</a><p class="small-print">Preview prices only. Supabase setup is required for live reservations and stock.</p></aside></div></section></div>`;
}
function summaryFromQuery() {
  const chosen = CATEGORIES.map(c => ({
    ...c,
    qty: Math.max(0, Math.min(4, parseInt(qs.get(c.id) || '0', 10) || 0)),
  }));
  let total = chosen.reduce((a, c) => a + c.qty, 0);
  if (total > 4) {
    let left = 4;
    chosen.forEach(c => {
      c.qty = Math.min(c.qty, left);
      left -= c.qty;
    });
  }
  return chosen;
}
function pageCheckout() {
  const s = selected(),
    cart = summaryFromQuery(),
    quantity = cart.reduce((sum, c) => sum + c.qty, 0),
    price = cart.reduce((sum, c) => sum + c.price * c.qty, 0);
  return `<div class="wrap">${title('04 / CHECKOUT', 'REVIEW YOUR <span class="accent">NIGHT.</span>', 'Review your selection and attendee information.')}${demoNotice()}<div class="booking-steps" aria-label="Booking steps"><span>01 / CHOOSE CONCERT & ZONE</span><strong class="is-current">02 / ATTENDEE DETAILS</strong><span>03 / REVIEW</span></div><section class="section" style="padding-top:20px"><div class="checkout-grid"><div><form id="checkout-demo" class="paper-panel"><div class="micro">STEP 03 / CONTACT DETAILS</div><h2>YOUR DETAILS</h2><div class="fields-2"><div class="field"><label for="buyer-name">Full name</label><input id="buyer-name" placeholder="Contoh Nama" autocomplete="off" required></div><div class="field"><label for="buyer-phone">Phone number</label><input id="buyer-phone" type="tel" placeholder="08xx xxxx xxxx" autocomplete="off" required></div></div><div class="field"><label for="buyer-email">Email address</label><input id="buyer-email" type="email" placeholder="contoh@email.test" autocomplete="off" required></div><div class="line" style="margin:15px 0 23px"></div><div class="micro">STEP 04 / ATTENDEE NAMES</div><h2 style="margin-top:13px">WHO'S GOING?</h2>${quantity ? Array.from({ length: quantity }, (_, i) => `<div class="field"><label for="attendee-${i}">Ticket ${i + 1} — attendee name</label><input id="attendee-${i}" autocomplete="off" placeholder="Nama pengunjung ${i + 1}" required></div>`).join('') : '<p>No tickets selected. Return to the ticket page to choose your zone.</p>'}<div class="line" style="margin:19px 0"></div><p class="small-print">Checkout preview only. No payment is processed and no valid entry ticket is issued. Do not enter sensitive personal data.</p><button class="btn pink full" ${!quantity ? 'disabled' : ''} type="submit">REVIEW CONFIRMATION</button></form></div><aside class="summary"><div class="micro">NADAKITA LIVE · NIGHT ${s.night}</div><h3>YOUR ORDER</h3><p><strong>${s.artist}</strong><br>${s.date}<br>Stadion Utama GBK · Jakarta</p><div class="line"></div>${
    cart
      .filter(c => c.qty)
      .map(
        c =>
          `<div class="summary-row"><span>${c.qty} × ${c.label}</span><strong>${fmt(c.qty * c.price)}</strong></div>`
      )
      .join('') || '<p class="small-print">No ticket chosen.</p>'
  }<div class="summary-total"><span class="micro">TOTAL</span><strong>${fmt(price)}</strong></div><a class="btn outline full" href="tickets.html?show=${s.id}">EDIT SELECTION</a><p class="small-print">Preview only — no payment or ticket issuance.</p></aside></div></section></div>`;
}
function authPage(kind) {
  let k = {
    login: {
      tag: 'WELCOME BACK',
      title: 'SIGN IN.',
      desc: 'Your next live night starts here.',
      btn: 'SIGN IN',
      fields: 'login',
    },
    register: {
      tag: 'NEW TO NADAKITA',
      title: 'JOIN THE<br>GOOD NOISE.',
      desc: 'Create your NADAKITA account.',
      btn: 'CREATE ACCOUNT',
      fields: 'register',
    },
    forgot: {
      tag: 'ACCOUNT RECOVERY',
      title: 'RESET YOUR<br>PASSWORD.',
      desc: 'Enter your email to request a password reset.',
      btn: 'SEND RESET EMAIL',
      fields: 'forgot',
    },
    reset: {
      tag: 'ACCOUNT RECOVERY',
      title: 'NEW<br>PASSWORD.',
      desc: 'Set a new password for your account.',
      btn: 'SAVE NEW PASSWORD',
      fields: 'reset',
    },
  }[kind];
  return `<div class="wrap"><div class="auth-layout"><div class="auth-banner"><div class="micro" style="color:var(--lime)">NADAKITA LIVE 2026</div><h2>EVERY<br>NIGHT<br>STARTS<br>HERE.</h2><p style="max-width:300px;color:#dad6d4;font-size:12px;font-weight:800;letter-spacing:1px">THREE SHOWS. ONE ACCOUNT.<br>ONE CITY.</p></div><div class="auth-form"><div class="preview-label">${k.tag}</div><h1>${k.title}</h1><p>${k.desc}</p><div id="live-message" class="live-error" role="alert" aria-live="polite" hidden></div><form id="auth-demo" data-auth-kind="${kind}">${kind === 'register' ? '<div class="field"><label for="fullname">Full Name</label><input id="fullname" autocomplete="off" placeholder="Nama lengkap"></div>' : ''}${kind !== 'reset' ? '<div class="field"><label for="email">Email</label><input type="email" id="email" autocomplete="off" placeholder="you@example.com" required></div>' : ''}${['login', 'register', 'reset'].includes(kind) ? `<div class="field"><label for="password">${kind === 'reset' ? 'New password' : 'Password'}</label><input id="password" type="password" placeholder="Enter your password" required></div>` : ''}${['register', 'reset'].includes(kind) ? '<div class="field"><label for="confirm">Confirm password</label><input id="confirm" type="password" autocomplete="off" placeholder="••••••••••"></div>' : ''}<button class="btn pink" type="submit">${k.btn}</button></form><div class="auth-links">${kind === 'login' ? '<a href="register.html">CREATE ACCOUNT</a><a href="forgot-password.html">FORGOT PASSWORD?</a>' : kind === 'register' ? '<span>ALREADY A MEMBER?</span><a href="login.html">SIGN IN</a>' : '<a href="login.html">BACK TO SIGN IN</a><a href="register.html">CREATE ACCOUNT</a>'}</div></div></div></div>`;
}
function pageDashboard() {
  return `<div class="wrap">${title('05 / CUSTOMER ACCOUNT', 'MY <span class="accent">NADAKITA.</span>', 'Manage your profile, bookings, and e-tickets in one place.')}${demoNotice()}<section class="section" style="padding-top:34px"><div class="account-layout"><aside class="account-sidebar"><div class="micro muted">MY ACCOUNT</div><h3>HELLO, ALEX.</h3><div class="line"></div><a class="active" href="#tickets">MY TICKETS</a><a href="#profile">MY PROFILE</a><a href="tickets.html">EXPLORE SHOWS</a><a href="login.html">SIGN OUT</a></aside><div><div class="dashboard-cards"><div class="stat-card"><strong>02</strong><span>E-TICKETS</span></div><div class="stat-card"><strong>01</strong><span>ORDERS</span></div><div class="stat-card"><strong>00</strong><span>CHECKED IN</span></div></div><div class="preview-label" id="tickets">MY TICKETS</div><h2 class="section-title">YOUR ACCESS.</h2>${[SHOWS[0], SHOWS[0]].map((s, i) => `<article class="wallet-ticket"><div class="mini-poster ${s.tone}"><span class="micro">NIGHT 0${i + 1}</span><span>THE<br>WEEKND</span><span class="micro">DEMO ONLY</span></div><div class="detail"><div class="micro muted">NADAKITA LIVE · SAMPLE TICKET 0${i + 1}</div><h3>${i === 0 ? 'FESTIVAL A' : 'CAT 1'}</h3><div class="small-print">${s.date}<br>Stadion Utama GBK · Jakarta<br>Attendee: Alex Example</div><p><span class="status gray">SAMPLE / NOT VALID</span></p></div><div class="qr-preview"><div class="fakeqr" aria-label="Decorative QR placeholder, not scannable"></div><span class="small-print">NOT SCANNABLE</span></div></article>`).join('')}<div class="spacer-48"></div><div class="preview-label" id="profile">YOUR DETAILS</div><h2 class="section-title">ACCOUNT DETAILS.</h2><div class="paper-panel"><p><strong>Name:</strong> Alex Example</p><p><strong>Email:</strong> demo@example.test</p><p><strong>Phone:</strong> 08XX-XXXX-XXXX</p><button class="btn outline small" data-toast="Connect Supabase to enable account updates.">EDIT PROFILE (PREVIEW)</button></div></div></div></section></div>`;
}
function pageAdmin() {
  return `<div class="wrap">${title('06 / STAFF OPERATIONS', 'CONTROL <span class="accent">ROOM.</span>', 'An overview of concert operations, orders, and ticket validation. <strong>Sample data is shown until Supabase is connected.</strong>')}${demoNotice()}<section class="section" style="padding-top:32px"><div class="admin-head"><div><div class="micro">ADMIN / OVERVIEW</div><h1>SHOW OPERATIONS</h1></div><a class="btn outline small" href="index.html">VIEW WEBSITE</a></div><div class="dashboard-cards"><div class="stat-card"><strong>03</strong><span>SHOWS</span></div><div class="stat-card"><strong>128</strong><span>ORDERS</span></div><div class="stat-card"><strong>064</strong><span>CHECK-INS</span></div></div><div class="admin-grid"><div><div class="paper-panel" style="margin-bottom:20px"><div class="preview-label">ORDER MANAGEMENT</div><h2 style="margin-top:15px">ORDERS</h2><div class="searchbar"><input id="admin-search" placeholder="Search sample order code or name" aria-label="Search orders"><select id="admin-filter" aria-label="Order status"><option value="all">ALL STATUS</option><option value="confirmed">CONFIRMED</option><option value="canceled">CANCELED</option></select></div><div class="table-wrap"><table><thead><tr><th>Order</th><th>Customer</th><th>Concert</th><th>Zone</th><th>Status</th></tr></thead><tbody id="admin-orders"><tr data-status="confirmed"><td>NDK-DEMO-001</td><td>Alex Example</td><td>The Weeknd</td><td>Festival A</td><td><span class="status">CONFIRMED</span></td></tr><tr data-status="confirmed"><td>NDK-DEMO-002</td><td>Rina Example</td><td>Justin Bieber</td><td>CAT 1</td><td><span class="status">CONFIRMED</span></td></tr><tr data-status="canceled"><td>NDK-DEMO-003</td><td>Adi Example</td><td>Bruno Mars</td><td>VIP</td><td><span class="status gray">CANCELED</span></td></tr></tbody></table></div></div></div><div><div class="paper-panel"><div class="preview-label">STAFF / ENTRY GATE</div><h2 style="margin-top:15px">TICKET CHECK-IN</h2><div class="field"><label for="scan-show">Concert Night</label><select id="scan-show">${SHOWS.map(s => `<option>${s.artist} · NIGHT ${s.night}</option>`).join('')}</select></div><div class="field"><label for="scan-code">Ticket Code</label><input id="scan-code" placeholder="DEMO-NOT-VALID" autocomplete="off"></div><button class="btn pink full" id="preview-checkin">PREVIEW VALIDATION</button><div class="note" style="margin-top:20px">Connect Supabase to enable QR scanning and ticket validation.</div></div><div class="paper-panel" style="margin-top:20px"><div class="preview-label">ZONE INVENTORY</div><h2 style="margin-top:15px">ZONE STATUS</h2>${[
    ['VIP Experience', 31],
    ['Festival A', 77],
    ['Festival B', 52],
    ['CAT 1', 64],
    ['CAT 2', 82],
  ]
    .map(
      ([n, v]) =>
        `<div style="margin:13px 0"><div class="summary-row"><span>${n}</span><b>${v}% (DEMO)</b></div><div style="height:7px;background:#e7dfd5"><div style="height:7px;background:var(--pink);width:${v}%"></div></div></div>`
    )
    .join('')}</div></div></div></section></div>`;
}
function pageAbout() {
  return `<div class="wrap">${title('07 / OUR STORY', 'THIS IS <span class="accent">NADAKITA.</span>', 'A new way to experience live music in Jakarta.')}${demoNotice()}<section class="section"><div class="about-grid about-story"><div><div class="preview-label">THE ATMOSPHERE</div><h2 class="section-title">THREE NIGHTS.<br>A THOUSAND<br><span class="accent">MOMENTS.</span></h2><p class="page-lead" lang="id">NADAKITA lahir dari satu gagasan: musik terasa lebih berarti saat dinikmati bersama. Tiga malam dengan karakter berbeda, dipertemukan oleh satu kota dan energi para penggemarnya.</p><div class="about-values"><div><span>01</span><div><h3>THE MUSIC</h3><p lang="id">Setiap malam punya suara dan karakternya sendiri.</p></div></div><div><span>02</span><div><h3>THE PEOPLE</h3><p lang="id">Bertemu lewat lagu yang sama-sama kita cintai.</p></div></div><div><span>03</span><div><h3>THE CITY</h3><p lang="id">Jakarta menjadi bagian dari pengalaman.</p></div></div></div><a class="btn pink" href="shows.html">EXPLORE THE SHOWS <span aria-hidden="true">→</span></a></div><figure class="about-atmosphere"><img src="assets/images/banners/about-atmosphere.png" alt="Ilustrasi penonton konser malam dengan sorotan lampu pink dan lime" width="1024" height="1536" decoding="async"><div class="about-image-brand" aria-hidden="true">NADA<span>★</span>KITA<small>ONE CITY. THREE NIGHTS.</small></div><figcaption>CONCEPT ATMOSPHERE</figcaption></figure></div></section><section class="section" id="faq"><div class="preview-label">QUESTIONS / ANSWERS</div><h2 class="section-title">GOOD TO KNOW.</h2><div class="accordion"><details open><summary>Are these actual confirmed concerts?</summary><p>Belum. Jadwal, penampilan artis, dan penggunaan GBK belum merupakan pengumuman resmi.</p></details><details><summary>Can I purchase a real ticket?</summary><p>Tidak. Tidak ada transaksi pembayaran nyata dan tiket dari website ini tidak berlaku untuk masuk konser.</p></details><details><summary>Where will my account data be stored?</summary><p>Setelah konfigurasi Supabase aktif, akun dikelola melalui Supabase Auth dan data pesanan disimpan di PostgreSQL.</p></details><details><summary>Will there be opening acts?</summary><p>Tidak. Formatnya satu konser tunggal setiap malam, tanpa opening act.</p></details><details><summary>Does the seating map represent GBK?</summary><p>Tidak. Denah zona adalah ilustrasi kategori tiket, bukan peta resmi GBK.</p></details></div></section></div>`;
}
function pageScreens() {
  const screens = [
    ['Homepage', 'index.html', 'Brand hero / 3 concerts / CTA'],
    ['The Shows', 'shows.html', 'Three artists / exploration'],
    ['Show Detail — The Weeknd', 'show.html?show=weeknd', 'Crimson night / zone preview'],
    ['Show Detail — Justin Bieber', 'show.html?show=bieber', 'Electric blue night'],
    ['Show Detail — Bruno Mars', 'show.html?show=bruno', 'Golden night'],
    ['Show Guide', 'schedule.html', 'Timeline / choose a night'],
    ['Tickets', 'tickets.html', 'Concert picker / quantity'],
    ['Checkout', 'checkout.html?show=weeknd&festa=1', 'Details / order summary'],
    ['About + FAQ', 'about.html', 'Brand story / FAQ'],
    ['Sign In', 'login.html', 'Customer auth UI'],
    ['Register', 'register.html', 'Sign-up UI'],
    ['Forgot Password', 'forgot-password.html', 'Recovery request UI'],
    ['Reset Password', 'reset-password.html', 'New password UI'],
    ['Customer Dashboard', 'dashboard.html', 'Ticket wallet / sample QR'],
    ['Admin Dashboard', 'admin.html', 'Orders / gate validation'],
  ];
  return `<div class="wrap">${title('SITE DIRECTORY', 'EXPLORE <span class="accent">NADAKITA.</span>', 'Browse the website pages and review each layout.')}${demoNotice()}<section class="section"><div class="show-grid">${screens.map((x, i) => `<a href="${x[1]}" class="paper-panel" style="display:block;min-height:180px;transition:transform .2s"><span class="micro muted">SCREEN ${String(i + 1).padStart(2, '0')}</span><h2 style="font:900 33px/.95 var(--font-display);margin:23px 0 8px">${x[0].toUpperCase()}</h2><p class="muted" style="font-size:13px">${x[2]}</p></a>`).join('')}</div></section></div>`;
}
const routes = {
  home: pageHome,
  shows: pageShows,
  show: pageShow,
  schedule: pageSchedule,
  tickets: pageTickets,
  checkout: pageCheckout,
  about: pageAbout,
  login: () => authPage('login'),
  register: () => authPage('register'),
  forgot: () => authPage('forgot'),
  reset: () => authPage('reset'),
  dashboard: pageDashboard,
  admin: pageAdmin,
  screens: pageScreens,
};
function initTicketPage() {
  const tabHolder = $('ticket-tabs');
  if (!tabHolder) return;
  let current = selected(),
    focusZone = window.NADAKITA_ZONES.cleanCode(qs.get('zone'));
  const quantities = Object.fromEntries(CATEGORIES.map(c => [c.id, 0]));
  function selectZone(code, scroll = false) {
    const zone = window.NADAKITA_ZONES.cleanCode(code);
    if (!CATEGORIES.some(c => c.id === zone)) return;
    focusZone = zone;
    window.NADAKITA_ZONES.activate(zone, $('main-content'));
    const c = CATEGORIES.find(x => x.id === zone);
    $('selected-zone-label').textContent = `${c.label} · ${c.detail} · ${fmt(c.price)} per ticket`;
    if (scroll)
      document
        .querySelector(`[data-zone-row="${zone}"]`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  function update() {
    const amount = CATEGORIES.reduce((a, c) => a + quantities[c.id], 0);
    const total = CATEGORIES.reduce((a, c) => a + c.price * quantities[c.id], 0);
    for (const c of CATEGORIES) $(`count-${c.id}`).textContent = quantities[c.id];
    $('ticket-total').textContent = fmt(total);
    $('summary-show').textContent = `${current.artist} · ${current.short}`;
    $('summary-rows').innerHTML =
      CATEGORIES.filter(c => quantities[c.id])
        .map(
          c =>
            `<div class="summary-row"><span>${quantities[c.id]} × ${c.label}</span><strong>${fmt(c.price * quantities[c.id])}</strong></div>`
        )
        .join('') || '<p class="small-print">No tickets selected yet.</p>';
    const href =
      `checkout.html?show=${current.id}` +
      CATEGORIES.filter(c => quantities[c.id])
        .map(c => `&${c.id}=${quantities[c.id]}`)
        .join('');
    $('ticket-next').href = amount ? href : '#';
    $('ticket-next').setAttribute('aria-disabled', String(amount === 0));
    for (const b of document.querySelectorAll('[data-qty]')) {
      const n = quantities[b.dataset.qty],
        step = Number(b.dataset.delta);
      b.disabled =
        (step < 0 && n === 0) ||
        (step > 0 &&
          (amount >= 4 ||
            n >= 4 ||
            n >= (window.NADAKITA_STOCK_LIMITS?.[current.id]?.[b.dataset.qty] ?? Infinity)));
    }
  }
  tabHolder.addEventListener('click', e => {
    const btn = e.target.closest('[data-show]');
    if (!btn) return;
    current = SHOWS.find(s => s.id === btn.dataset.show) || current;
    history.replaceState(null, '', `tickets.html?show=${current.id}`);
    tabHolder.querySelectorAll('[data-show]').forEach(b => {
      b.classList.toggle('selected', b === btn);
      b.setAttribute('aria-pressed', String(b === btn));
    });
    CATEGORIES.forEach(c => (quantities[c.id] = 0));
    focusZone = '';
    window.NADAKITA_ZONES.activate('', $('main-content'));
    $('selected-zone-label').textContent =
      'Select a zone on the diagram or choose a quantity below.';
    update();
  });
  document.querySelector('.booking-map')?.addEventListener('click', e => {
    const btn = e.target.closest('[data-zone-code]');
    if (btn) selectZone(btn.dataset.zoneCode, true);
  });
  document.querySelectorAll('[data-qty]').forEach(b =>
    b.addEventListener('click', () => {
      const code = b.dataset.qty,
        delta = Number(b.dataset.delta),
        count = CATEGORIES.reduce((a, c) => a + quantities[c.id], 0);
      if (delta > 0 && count >= 4) return;
      quantities[code] = Math.max(
        0,
        Math.min(
          4,
          window.NADAKITA_STOCK_LIMITS?.[current.id]?.[code] ?? Infinity,
          quantities[code] + delta
        )
      );
      selectZone(code);
      update();
    })
  );
  window.addEventListener('nadakita:prices', update);
  $('ticket-next').addEventListener('click', e => {
    if (e.currentTarget.getAttribute('aria-disabled') === 'true') {
      e.preventDefault();
      toast('Choose at least one ticket first.');
    }
  });
  if (focusZone) selectZone(focusZone);
  update();
}
function attachEvents() {
  const mobile = document.querySelector('.mobile-menu');
  mobile?.addEventListener('click', () => {
    let nav = $('mainnav');
    let expanded = nav.classList.toggle('open');
    mobile.setAttribute('aria-expanded', expanded);
    mobile.textContent = expanded ? '✕' : '☰';
  });
  const auth = $('auth-demo');
  auth?.addEventListener('submit', e => {
    if (auth.dataset.authReady === 'true') return;
    e.preventDefault();
    const message = $('live-message');
    if (message) {
      message.textContent =
        'Sign-in is not ready. Open this page using VS Code Go Live and check that the Supabase browser library loads successfully.';
      message.hidden = false;
    }
  });
  initTicketPage();
}
(function () {
  const page = document.body.dataset.page || 'home';
  const root = $('app');
  root.innerHTML =
    header(page) +
    `<main id="main-content">${['show', 'tickets', 'checkout', 'dashboard', 'admin'].includes(page) ? '<div class="wrap show-loading" role="status" aria-busy="true"><span class="sr-loading">Loading page…</span><div class="show-loading-copy"></div><div class="show-loading-photo"></div></div>' : (routes[page] || pageHome)()}</main>` +
    footer();
  attachEvents();
})();
