/* NADAKITA LIVE · Single homepage timer, driven by shared show data or Supabase. */
(() => {
  'use strict';
  const root = document.getElementById('concert-countdown');
  if (!root) return;
  const eyebrow = document.getElementById('countdown-eyebrow');
  const title = document.getElementById('countdown-title');
  const clock = document.getElementById('countdown-clock');
  const digits = Object.fromEntries(
    ['days', 'hours', 'minutes', 'seconds'].map(unit => [
      unit,
      root.querySelector(`[data-countdown="${unit}"]`),
    ])
  );
  const unitLabels = { days: 'DAYS', hours: 'HOURS', minutes: 'MINUTES', seconds: 'SECONDS' };
  for (const [unit, label] of Object.entries(unitLabels))
    digits[unit]?.nextElementSibling && (digits[unit].nextElementSibling.textContent = label);
  const validSlugs = new Set(['weeknd', 'bieber', 'bruno']);
  let shows = [];
  let timer = null;
  let lastStatus = '';

  const toInstant = (date, time) => {
    const day = String(date ?? '').slice(0, 10);
    const hhmm = String(time ?? '').slice(0, 5);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(hhmm)) return NaN;
    // Explicit Asia/Jakarta offset; never use the viewer's local timezone.
    return Date.parse(`${day}T${hhmm}:00+07:00`);
  };
  const normalize = (raw, remote) =>
    (Array.isArray(raw) ? raw : [])
      .map(row => {
        const slug = String(remote ? row.slug : row.id);
        if (!validSlugs.has(slug) || (remote && ['cancelled', 'draft'].includes(row.status)))
          return null;
        const date = remote ? row.show_date : row.isoDate;
        const start = toInstant(date, remote ? row.starts_at : row.startsAt);
        const end = toInstant(date, remote ? row.ends_at : row.endsAt);
        if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;
        const night = { weeknd: '01', bieber: '02', bruno: '03' }[slug];
        const artist = remote ? row.artists?.name || row.title : row.name;
        return { slug, night, artist: String(artist || '').trim(), start, end };
      })
      .filter(Boolean)
      .sort((a, b) => a.start - b.start);

  const stateAt = (now, scheduled = shows) => {
    if (!scheduled.length) return { type: 'unavailable' };
    for (const show of scheduled) {
      if (now < show.start)
        return { type: 'upcoming', show, remaining: Math.max(0, show.start - now) };
      if (now >= show.start && now < show.end) return { type: 'live', show };
    }
    return { type: 'completed' };
  };

  /** Pilih konser yang belum selesai dan hitung durasi memakai timezone WIB yang eksplisit. */
  function render(now = Date.now()) {
    const state = stateAt(now);
    const nextLabel =
      state.type === 'upcoming'
        ? `COUNTDOWN TO NIGHT ${state.show.night} — ${state.show.artist}`
        : state.type === 'live'
          ? `NIGHT ${state.show.night} — ${state.show.artist} IS LIVE`
          : state.type === 'completed'
            ? 'ALL SHOWS HAVE ENDED'
            : 'CONCERT SCHEDULE UNAVAILABLE';
    const newEyebrow =
      state.type === 'upcoming'
        ? 'THE WAIT IS ALMOST OVER'
        : state.type === 'live'
          ? 'THE NIGHT IS HERE'
          : state.type === 'completed'
            ? 'THREE NIGHTS. ONE CITY.'
            : 'NADAKITA LIVE';
    const statusKey = `${state.type}:${state.show?.slug || ''}`;
    if (lastStatus !== statusKey) {
      title.textContent = nextLabel;
      eyebrow.textContent = newEyebrow;
      clock.hidden = state.type !== 'upcoming';
      lastStatus = statusKey;
    }
    if (state.type === 'upcoming') {
      const totalSeconds = Math.max(0, Math.ceil(state.remaining / 1000));
      const values = {
        days: Math.floor(totalSeconds / 86400),
        hours: Math.floor((totalSeconds % 86400) / 3600),
        minutes: Math.floor((totalSeconds % 3600) / 60),
        seconds: totalSeconds % 60,
      };
      for (const [unit, value] of Object.entries(values)) {
        digits[unit].textContent = unit === 'days' ? String(value) : String(value).padStart(2, '0');
      }
      clock.setAttribute(
        'aria-label',
        `${values.days} days, ${values.hours} hours, ${values.minutes} minutes, ${values.seconds} seconds until ${state.show.artist}`
      );
    }
  }

  function stop() {
    if (timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  }
  function start() {
    stop();
    if (document.hidden) return;
    render();
    timer = setInterval(() => render(), 1000);
  }
  /** Data published dari Supabase menggantikan katalog fallback, bukan menambah timer kedua. */
  function setShows(raw) {
    shows = normalize(raw, true);
    lastStatus = '';
    start();
  }
  /** Saat data live belum tersedia, hindari menampilkan countdown seolah jadwal sudah terverifikasi. */
  function setUnavailable() {
    shows = [];
    lastStatus = '';
    start();
  }
  shows = normalize(window.NADAKITA_GUIDE_SOURCE, false);
  window.NADAKITA_LIVE_COUNTDOWN = { setShows, setUnavailable, stateAt };
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
  addEventListener('pagehide', stop);
  addEventListener('pageshow', start);
  start();
})();
