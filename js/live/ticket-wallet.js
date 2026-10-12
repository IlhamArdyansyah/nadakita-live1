// Issued-ticket presentation and local PNG export. No customer data leaves the browser.
import { resolveTheme } from './ticket-themes.js';
import { xml, buildTicketSvg, ticketLayout } from './ticket-svg.js';
export { buildTicketSvg } from './ticket-svg.js';
export const isCheckedIn = ticket =>
  Array.isArray(ticket.checkins)
    ? ticket.checkins.length > 0
    : Boolean(ticket.checkins?.checked_at);
/** Satukan record order/tiket menjadi model visual; identitas/QR tetap berasal dari data issued. */
export function ticketModel(order, ticket) {
  const show = order.shows || {},
    venue = show.venues,
    date = show.show_date ? new Date(show.show_date) : null;
  const theme = resolveTheme(show, ticket.ticket_categories || {});
  const checkedIn = isCheckedIn(ticket);
  return {
    ...theme,
    title: show.title || 'NADAKITA LIVE',
    artist: show.artists?.name || String(show.title || 'NADAKITA LIVE').split(' — ')[0],
    date:
      date && !Number.isNaN(date.getTime())
        ? date.toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            timeZone: 'Asia/Jakarta',
          })
        : 'Date to be announced',
    venue: venue ? [venue.name, venue.city].filter(Boolean).join(' · ') : 'Venue to be announced',
    zone: ticket.ticket_categories?.name || 'Concert zone',
    attendee: ticket.attendee_name || 'Attendee',
    code: ticket.code || '',
    orderId: order.id || '',
    checkedIn,
  };
}
export const ticketFilename = ticket =>
  'nadakita-' +
  (String(ticket.code)
    .replace(/[^a-z0-9_-]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'ticket') +
  '.png';
/** Ringkasan jumlah dan kategori tetap tersedia walaupun QR belum diterbitkan. */
export function renderOrderItems(order) {
  return (order.order_items || []).length
    ? `<ul class="order-zone-summary" aria-label="Ordered ticket zones">${order.order_items.map(item => `<li><span>${xml(item.quantity)} × ${xml(item.ticket_categories?.name || 'Concert zone')}</span></li>`).join('')}</ul>`
    : '';
}
/** Jangan render pass untuk order non-approved atau tiket tanpa kode database. */
export function renderTicket(order, ticket) {
  if (order.status !== 'confirmed_demo' || !ticket.code) return '';
  const m = ticketModel(order, ticket),
    e = xml;
  return `<section class="concert-ticket" data-ticket-artist="${m.artistKey}" data-ticket-zone="${m.zoneKey}" aria-label="E-ticket for ${e(m.attendee)}"><div class="ticket-preview">${buildTicketSvg(m)}</div><dl class="ticket-mobile-details"><div><dt>CONCERT / ZONE</dt><dd>${e(m.title)} / ${e(m.zone)}</dd></div><div><dt>DATE / VENUE</dt><dd>${e(m.date)} · WIB<br>${e(m.venue)}</dd></div><div><dt>ATTENDEE</dt><dd>${e(m.attendee)}</dd></div><div><dt>ORDER ID</dt><dd>${e(m.orderId)}</dd></div></dl><div class="ticket-stub"><div class="qr-slot" data-code="${e(m.code)}" role="img" aria-label="QR ticket code ${e(m.code)}"></div><div class="ticket-download-actions"><span class="ticket-admission">${m.checkedIn ? 'CHECKED IN' : 'NOT CHECKED IN'}</span><code>${e(m.code)}</code><button type="button" class="btn pink small" data-download-ticket="${e(ticket.id)}" disabled>DOWNLOAD E-TICKET</button><span class="ticket-download-note" role="status">Preparing QR…</span></div></div></section>`;
}
// The pinned existing QR library generates the same raw database code.
// Render its matrix at integer module sizes with a four-module quiet zone.
/** QR memakai payload kode asli dan quiet zone; tidak memakai QR dekoratif dari mockup. */
export function mountTicketQR(slot, code) {
  const qr = new window.QRCode(slot, {
    text: code,
    width: 256,
    height: 256,
    correctLevel: window.QRCode.CorrectLevel.M,
  });
  const matrix = qr._oQRCode,
    count = matrix.getModuleCount(),
    step = 8,
    size = (count + 8) * step;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = '#000';
  let path = '';
  for (let row = 0; row < count; row++)
    for (let col = 0; col < count; col++)
      if (matrix.isDark(row, col)) {
        ctx.fillRect((col + 4) * step, (row + 4) * step, step, step);
        path += `M${col + 4} ${row + 4}h1v1h-1z`;
      }
  // ViewBox keeps each QR module vector-sharp in preview and HD export.
  const markup = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 ${count + 8} ${count + 8}" shape-rendering="crispEdges"><rect width="${count + 8}" height="${count + 8}" fill="#fff"/><path d="${path}" fill="#000"/></svg>`;
  canvas.dataset.qrSvg = markup;
  slot.replaceChildren(canvas);
  slot.closest('.concert-ticket').querySelector('[data-ticket-qr]').innerHTML = markup;
  return canvas;
}
let fontCssPromise;
/** Embed font lokal agar hasil PNG tetap sesuai preview tanpa mengirim data tiket keluar. */
async function exportFontCss() {
  if (!fontCssPromise)
    fontCssPromise = Promise.all(
      [
        ['DM Sans', 'dm-sans-400.ttf', 400],
        ['Outfit', 'outfit-700.ttf', 700],
      ].map(async ([family, file, weight]) => {
        const response = await fetch('assets/fonts/' + file);
        if (!response.ok) throw new Error('Ticket font unavailable. Reload to try again.');
        const bytes = new Uint8Array(await response.arrayBuffer());
        let raw = '';
        for (let i = 0; i < bytes.length; i += 8192)
          raw += String.fromCharCode(...bytes.subarray(i, i + 8192));
        return `@font-face{font-family:"${family}";font-weight:${weight};src:url(data:font/ttf;base64,${btoa(raw)}) format("truetype")}`;
      })
    )
      .then(styles => styles.join(''))
      .catch(error => {
        fontCssPromise = null;
        throw error;
      });
  return fontCssPromise;
}
/** Rasterisasi SVG yang sama dengan preview menjadi PNG; revokasi object URL setelah unduh. */
export async function downloadTicket(order, ticket, qrCanvas) {
  if (order.status !== 'confirmed_demo' || !ticket.code || !qrCanvas?.dataset.qrSvg)
    throw new Error('This ticket is not ready to download.');
  await document.fonts.ready;
  const m = ticketModel(order, ticket),
    layout = ticketLayout(m),
    svg = buildTicketSvg(m, qrCanvas.dataset.qrSvg, await exportFontCss());
  const source = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const image = new Image();
    image.src = source;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = layout.width;
    canvas.height = layout.height;
    canvas.getContext('2d').drawImage(image, 0, 0);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error('Unable to export ticket. Please try again.');
    const url = URL.createObjectURL(blob),
      link = document.createElement('a');
    link.href = url;
    link.download = ticketFilename(ticket);
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } finally {
    URL.revokeObjectURL(source);
  }
}
