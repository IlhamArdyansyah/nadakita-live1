/* Artist detail presentation only; callers supply catalog data and artwork. */
import { esc } from './supabase.js';

const dateLabel = value => {
  const iso = String(value || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return 'DATE TO BE ANNOUNCED';
  const date = new Date(`${iso}T12:00:00Z`);
  if (!Number.isFinite(date.getTime())) return 'DATE TO BE ANNOUNCED';
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
    .format(date)
    .toUpperCase();
};
const timeLabel = (value, fallback) =>
  /^(?:[01]\d|2[0-3]):[0-5]\d/.test(String(value || ''))
    ? String(value).slice(0, 5).replace(':', '.')
    : fallback;

export function renderArtistDetail(show, fallback, categories, portrait) {
  const artist = show.artists?.name || show.title || fallback.name;
  const slug = encodeURIComponent(show.slug);
  const date = dateLabel(show.show_date || fallback.isoDate);
  const city = show.venues?.city || 'Jakarta';
  const venue = show.venues?.name || 'Stadion Utama GBK';
  return `<div class="wrap live-page artist-detail-page">
    <section class="artist-detail-hero" aria-labelledby="artist-detail-title">
      <header class="artist-detail-heading">
        <p class="preview-label artist-detail-date">NIGHT ${esc(fallback.night)} / ${esc(date)}</p>
        <h1 id="artist-detail-title">${esc(artist)}</h1>
      </header>
      <div class="artist-detail-copy">
        <h2>${esc(fallback.line)}</h2>
        <p>${esc(show.description || fallback.concept)}</p>
        <div class="artist-detail-actions">
          <a class="btn pink" href="tickets.html?show=${slug}">EXPLORE TICKETS <span aria-hidden="true">→</span></a>
          <a class="btn outline" href="schedule.html?show=${slug}">SHOW GUIDE</a>
        </div>
      </div>
      <figure class="artist-detail-portrait">
        <div class="artist-detail-photo-frame">
          <div class="artist-detail-photo-fallback" aria-hidden="true">NADAKITA<br>LIVE.</div>
          ${portrait ? `<img class="artist-detail-photo" src="${esc(portrait)}" width="720" height="1080" alt="${esc(artist)} concert portrait" fetchpriority="high" decoding="async" />` : ''}
        </div>
        <figcaption><span>NADAKITA LIVE / JAKARTA 2026</span><span>NIGHT ${esc(fallback.night)}</span></figcaption>
      </figure>
      <dl class="artist-detail-meta">
        <div><dt>SHOW DATE</dt><dd>${esc(date)}</dd></div>
        <div><dt>VENUE</dt><dd>${esc(venue)}<small>${esc(city)}, Indonesia</small></dd></div>
        <div><dt>SHOW STARTS</dt><dd>${esc(timeLabel(show.starts_at, '20.00'))} WIB<small>Gates open ${esc(timeLabel(show.gates_at, '16.00'))} WIB</small></dd></div>
      </dl>
      <div id="show-song-preview" data-song-artist="${esc(show.slug)}" data-song-image="${esc(portrait || '')}"></div>
    </section>
    <section class="section artist-detail-zones" aria-labelledby="artist-zones-heading">
      <div class="artist-zones-heading"><div><p class="preview-label">TICKET INFORMATION</p><h2 id="artist-zones-heading">CONCERT <span>ZONES.</span></h2></div><p>Explore the zone layout and prices for this night.<br>Select a zone to continue to ticket selection.</p></div>
      ${window.NADAKITA_ZONES.map({ show: show.slug, categories })}
    </section>
  </div>`;
}

export function mountArtistPortrait(root) {
  const image = root.querySelector('.artist-detail-photo');
  if (!image) return;
  const unavailable = () => {
    image.hidden = true;
    image
      .closest('.artist-detail-photo-frame')
      .setAttribute('aria-label', 'Artist portrait unavailable');
  };
  image.addEventListener('error', unavailable, { once: true });
  if (image.complete && !image.naturalWidth) unavailable();
}
