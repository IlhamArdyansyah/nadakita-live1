/* One zone diagram for both Show Detail and ticket selection. Diagram is illustrative. */
(() => {
  'use strict';
  const known = [
    { code: 'vip', short: 'VIP', label: 'VIP EXPERIENCE', position: 'vip' },
    { code: 'festa', short: 'FESTIVAL A', label: 'FESTIVAL A', position: 'festa' },
    { code: 'festb', short: 'FESTIVAL B', label: 'FESTIVAL B', position: 'festb' },
    { code: 'cat1', short: 'CAT 1', label: 'CAT 1', position: 'cat1' },
    { code: 'cat2', short: 'CAT 2', label: 'CAT 2', position: 'cat2' },
  ];
  const escapeText = value =>
    String(value ?? '').replace(
      /[&<>"']/g,
      char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]
    );
  const cleanCode = value =>
    String(value ?? '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
  /** Denah ilustratif bersama; detail memakai link, pemilihan tiket memakai tombol zona. */
  function zoneMap({
    show = 'weeknd',
    categories = known,
    interactive = false,
    priceState = 'ready',
  } = {}) {
    const byCode = new Map(categories.map(c => [cleanCode(c.code || c.id), c]));
    const zones = known.filter(z => byCode.has(z.code));
    const control = (z, cls, content) => {
      const c = byCode.get(z.code),
        label = escapeText(c.name || c.label || z.label);
      const inactive = c.active === false,
        suffix = inactive ? ' — unavailable' : '';
      if (interactive)
        return `<button class="${cls}" type="button" data-zone-code="${z.code}" aria-pressed="false" aria-label="Locate ${label}${suffix}" ${inactive ? 'disabled' : ''}>${content}</button>`;
      if (inactive)
        return `<span class="${cls}" aria-disabled="true" aria-label="${label}${suffix}">${content}</span>`;
      const href = `tickets.html?show=${encodeURIComponent(show)}&amp;zone=${encodeURIComponent(z.code)}`;
      return `<a class="${cls}" href="${href}" aria-label="Select ${label} for this concert">${content}</a>`;
    };
    const zoneNode = (z, side = '') =>
      control(
        z,
        `booking-map-zone ${z.position}${side ? ` zone-${side}` : ''}`,
        `<span>${escapeText(byCode.get(z.code).name || byCode.get(z.code).label || z.label)}</span>`
      );
    return `<section class="booking-map booking-map--night" aria-label="Illustrative ticket zone diagram" data-price-state="${escapeText(priceState)}">
      <div class="booking-map-head"><div><span class="preview-label">STADIUM ZONE GUIDE</span><h3>FIND YOUR ZONE.</h3></div><span class="booking-map-key">GBK · JAKARTA<br>ILLUSTRATIVE · NOT TO SCALE</span></div>
      <div class="booking-map-layout">
      <div class="booking-map-diagram booking-map-stadium">
        <div class="booking-map-stage"><span>MAIN STAGE</span></div>
        <div class="stadium-floor">${zones
          .filter(z => !z.code.startsWith('cat'))
          .map(z => zoneNode(z, 'left') + zoneNode(z, 'right'))
          .join('')}</div>
        <div class="stadium-bowl" aria-label="Stadium tribune zones">
          <div class="booking-map-tribunes">${zones
            .filter(z => z.code.startsWith('cat'))
            .map(z =>
              z.code === 'cat1' ? zoneNode(z, 'left') + zoneNode(z, 'right') : zoneNode(z)
            )
            .join('')}</div>
        </div>
      </div>
      <div class="booking-map-legend" aria-label="Ticket zone legend">${
        zones
          .map(z => {
            const c = byCode.get(z.code);
            const value = c.price_idr ?? c.price;
            const valid =
              value != null &&
              String(value).trim() !== '' &&
              Number.isFinite(Number(value)) &&
              Number(value) >= 0;
            const price =
              priceState === 'loading'
                ? 'Loading price…'
                : priceState === 'error' || !valid
                  ? 'Price unavailable'
                  : `Rp${Number(value).toLocaleString('id-ID')}`;
            const detail =
              c.active === false
                ? 'Unavailable'
                : c.description || (z.code.startsWith('cat') ? 'Tribune zone' : 'Standing zone');
            return control(
              z,
              `booking-map-legend-zone ${z.position}`,
              `<i aria-hidden="true"></i><span><b>${escapeText(c.name || c.label || z.label)}</b><small>${escapeText(detail)}</small><strong class="booking-map-price">${escapeText(price)}</strong></span><span class="booking-map-arrow" aria-hidden="true">↗</span>`
            );
          })
          .join('') ||
        '<p class="booking-map-empty" role="status">No ticket categories available for this night.</p>'
      }</div>
      </div>
    </section>`;
  }
  /** Sinkronkan highlight denah dan baris kategori tanpa otomatis menambah jumlah tiket. */
  function setActive(code, scope = document) {
    const target = cleanCode(code);
    scope.querySelectorAll('[data-zone-code]').forEach(el => {
      const active = el.dataset.zoneCode === target;
      el.classList.toggle('is-active', active);
      if (el.tagName === 'BUTTON') el.setAttribute('aria-pressed', String(active));
    });
    scope
      .querySelectorAll('[data-zone-row]')
      .forEach(el => el.classList.toggle('is-active', el.dataset.zoneRow === target));
  }
  window.NADAKITA_ZONES = Object.freeze({ map: zoneMap, activate: setActive, cleanCode, known });
})();
