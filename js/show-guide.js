/* NADAKITA LIVE — Show Guide interactions. Uses the public show catalog or Supabase data. */
(() => {
  'use strict';
  const shell = document.getElementById('show-guide');
  if (!shell) return;

  const tabs = document.getElementById('guide-night-options');
  const artist = document.getElementById('guide-artist');
  const date = document.getElementById('guide-date');
  const venue = document.getElementById('guide-venue');
  const timeline = document.getElementById('guide-timeline');
  const ticketLink = document.getElementById('guide-ticket-link');
  const original = window.NADAKITA_GUIDE_SOURCE || [];
  date.insertAdjacentHTML('afterend', '<span class="guide-status">UPCOMING</span>');
  const allowed = new Set(['weeknd', 'bieber', 'bruno']);
  const plain = value => String(value ?? '');
  const esc = value =>
    plain(value).replace(
      /[&<>"']/g,
      c =>
        ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#39;',
        })[c]
    );
  const localDay = iso => {
    const match = /^\d{4}-\d{2}-\d{2}$/.test(plain(iso));
    if (!match) return '';
    return new Intl.DateTimeFormat('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(`${iso}T12:00:00Z`));
  };
  const shortDay = iso => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(plain(iso))) return '';
    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    })
      .format(new Date(`${iso}T12:00:00Z`))
      .toUpperCase();
  };
  const hour = (value, fallback) =>
    /^\d{2}:\d{2}/.test(plain(value)) ? plain(value).slice(0, 5).replace(':', '.') : fallback;
  const localShows = original.map(show => ({
    slug: show.id,
    name: show.name,
    night: show.night,
    isoDate: show.isoDate,
    venue: 'Stadion Utama GBK, Jakarta',
    gates: '16.00',
    start: hour(show.startsAt, '20.00'),
    end: hour(show.endsAt, '22.00'),
  }));
  let shows = localShows;
  let activeSlug = '';
  const phaseLabels = ['GATES', 'ACCESS', 'PRE-SHOW', 'MAIN SHOW', 'EXIT'];

  /** Bangun agenda malam dari jam konser; bentuk timeline tetap konsisten antar artis. */
  function rowsFor(show) {
    return [
      {
        time: show.gates,
        title: 'Main Gates Open',
        description:
          'Venue gates open for ticket holders. Follow the entrance assigned to your ticket zone.',
      },
      {
        time: '16.00–19.00',
        title: 'Stadium Access',
        description: 'Find your designated zone and explore the available venue facilities.',
      },
      {
        time: '19.00–19.45',
        title: 'Pre-Concert Preparation',
        description: 'Final stage preparations before the headline performance. No opening act.',
      },
      {
        time: `${show.start}–${show.end}`,
        title: `${show.name} — Live`,
        description: `The main performance of Night ${show.night}.`,
        highlight: true,
      },
      {
        time: '22.00–End',
        title: 'Venue Exit',
        description: 'Please follow venue staff instructions when leaving the stadium.',
      },
    ];
  }

  /** Tombol malam mencerminkan katalog aktif dan dapat diakses dengan keyboard. */
  function renderTabs() {
    tabs.innerHTML = shows
      .map(
        show =>
          `<button type="button" role="tab" class="guide-night-tab" data-guide-show="${esc(show.slug)}" id="guide-tab-${esc(show.slug)}" aria-controls="guide-content" aria-selected="false" tabindex="-1"><span class="guide-night-index">NIGHT ${esc(show.night)}</span><span class="guide-night-name">${esc(show.name)}</span><span class="guide-night-date">${esc(shortDay(show.isoDate))}<span aria-hidden="true"> →</span></span></button>`
      )
      .join('');
  }

  /** Ganti isi guide dan link tiket; update URL hanya untuk pilihan pengguna, bukan popstate. */
  function render(slug, updateUrl = false) {
    const show = shows.find(item => item.slug === slug) || shows[0];
    if (!show) return;
    activeSlug = show.slug;
    document
      .getElementById('guide-content')
      .setAttribute('aria-labelledby', `guide-tab-${show.slug}`);
    for (const btn of tabs.querySelectorAll('[data-guide-show]')) {
      const selected = btn.dataset.guideShow === show.slug;
      btn.classList.toggle('active', selected);
      btn.setAttribute('aria-selected', String(selected));
      btn.tabIndex = selected ? 0 : -1;
    }
    artist.textContent = show.name;
    date.textContent = localDay(show.isoDate).toUpperCase();
    venue.textContent = show.venue;
    ticketLink.href = `tickets.html?show=${encodeURIComponent(show.slug)}`;
    const rows = rowsFor(show);
    timeline.setAttribute('aria-label', `Show schedule: ${show.name}, ${localDay(show.isoDate)}`);
    timeline.innerHTML = rows
      .map(
        (row, index) => `<div class="time-row${row.highlight ? ' highlight' : ''}">
      <div class="guide-slot-marker" aria-hidden="true"><i></i></div>
      <div class="guide-slot-time"><small>${phaseLabels[index]}</small>${esc(row.time)}<span class="sr-only"> WIB</span></div>
      <div class="guide-slot-details"><h3>${esc(row.title)}${row.highlight ? '<span class="guide-live-badge">HEADLINER</span>' : ''}</h3><p>${esc(row.description)}</p></div>
    </div>`
      )
      .join('');
    window.dispatchEvent(new CustomEvent('nadakita:guide-change', { detail: { slug: show.slug } }));
    if (updateUrl && new URLSearchParams(location.search).get('show') !== show.slug) {
      const url = new URL(location.href);
      url.searchParams.set('show', show.slug);
      history.pushState({ show: show.slug }, '', url);
    }
  }

  tabs.addEventListener('click', event => {
    const button = event.target.closest('button[data-guide-show]');
    if (button) render(button.dataset.guideShow, true);
  });
  tabs.addEventListener('keydown', event => {
    if (!['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key))
      return;
    const buttons = Array.from(tabs.querySelectorAll('button[data-guide-show]'));
    let current = buttons.findIndex(button => button.dataset.guideShow === activeSlug);
    if (event.key === 'Home') current = 0;
    else if (event.key === 'End') current = buttons.length - 1;
    else
      current =
        (current + (['ArrowRight', 'ArrowDown'].includes(event.key) ? 1 : -1) + buttons.length) %
        buttons.length;
    if (!buttons[current]) return;
    event.preventDefault();
    render(buttons[current].dataset.guideShow, true);
    buttons[current].focus();
  });
  addEventListener('popstate', () => {
    const slug = new URLSearchParams(location.search).get('show');
    render(slug, false);
  });

  /** Normalisasi data live ke model guide, dengan fallback untuk kolom yang belum diisi. */
  function useSupabase(rawShows) {
    if (!Array.isArray(rawShows)) return;
    const updated = rawShows
      .filter(show => allowed.has(show.slug))
      .map(show => {
        const fallback = localShows.find(item => item.slug === show.slug);
        let place = plain(show.venues?.name).trim();
        if (!place) place = fallback.venue;
        else if (!/jakarta/i.test(place)) place += ', Jakarta';
        return {
          slug: show.slug,
          name: show.artists?.name || fallback.name,
          night: fallback.night,
          isoDate: show.show_date || fallback.isoDate,
          venue: place,
          gates: hour(show.gates_at, fallback.gates),
          start: hour(show.starts_at, fallback.start),
          end: hour(show.ends_at, fallback.end),
        };
      })
      .sort((a, b) => a.isoDate.localeCompare(b.isoDate));
    if (!updated.length) return;
    shows = updated;
    renderTabs();
    render(new URLSearchParams(location.search).get('show') || activeSlug, false);
  }
  window.NADAKITA_SHOW_GUIDE = { setShows: useSupabase };
  renderTabs();
  render(new URLSearchParams(location.search).get('show'), false);
})();
