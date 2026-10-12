/** Dokumen SVG bersama untuk preview dan unduhan; text pengguna wajib di-escape sebagai XML. */
import { artworkSvg } from './ticket-themes.js';
export const xml = value =>
  String(value ?? '').replace(
    /[&<>"']/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
  );
/** Ukur teks dengan canvas bila tersedia; fallback dipakai tes Node tanpa DOM. */
export function wrapText(value, limit, size = 28, font = 'DM Sans') {
  const ctx =
    typeof document === 'undefined' ? null : document.createElement('canvas').getContext('2d');
  if (ctx) ctx.font = `${font === 'Outfit' ? 700 : 400} ${size}px "${font}",sans-serif`;
  const maxWidth = limit * size * 0.55,
    measure = s => (ctx ? ctx.measureText(s).width : s.length * size * 0.55);
  const lines = [];
  let line = '';
  for (const c of String(value ?? '')) {
    if (line && measure(line + c) > maxWidth) {
      lines.push(line.trimEnd());
      line = '';
    }
    line += c;
  }
  lines.push(line.trim());
  return lines;
}
const text = (lines, x, y, size = 28, weight = 400, color = '#191919', spacing = 0) =>
  `<text x="${x}" y="${y}" fill="${color}" font-family="${weight >= 700 ? 'Outfit' : 'DM Sans'},Arial,sans-serif" font-size="${size}" font-weight="${weight}" letter-spacing="${spacing}">${lines.map((line, i) => `<tspan x="${x}" dy="${i ? size * 1.25 : 0}">${xml(line)}</tspan>`).join('')}</text>`;
/** Tinggi tiket mengikuti nama/judul panjang supaya informasi tidak menimpa QR. */
export function ticketLayout(m) {
  const title = wrapText(m.title, 34, 60, 'Outfit'),
    date = wrapText(m.date + ' · WIB', 30),
    venue = wrapText(m.venue, 37),
    attendee = wrapText(m.attendee, 37),
    order = wrapText(m.orderId, 40, 24),
    zone = wrapText(m.zone, 42, 32, 'Outfit');
  const zoneTop = 295 + (title.length - 1) * 75 + 28,
    firstRow = zoneTop + zone.length * 40 + 64;
  const secondRow = firstRow + Math.max(date.length, venue.length) * 35 + 64;
  const bodyBottom = Math.max(760, secondRow + Math.max(attendee.length, order.length) * 35 + 94);
  return {
    title,
    date,
    venue,
    attendee,
    order,
    zone,
    zoneTop,
    firstRow,
    secondRow,
    bodyBottom,
    width: 2400,
    height: bodyBottom + 140,
  };
}
// One vector document is used for both live preview and PNG rasterization.
/** Susun SVG dari model, QR dan CSS font; hasil ini juga menjadi sumber PNG. */
export function buildTicketSvg(m, qrMarkup = '', fontCss = '') {
  const l = ticketLayout(m),
    e = xml,
    bodyHeight = l.bodyBottom - 165,
    art = artworkSvg(m).replace(
      'viewBox="0 0 600 640"',
      'x="1280" y="165" width="600" height="' + bodyHeight + '" viewBox="0 0 600 640"'
    );
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${l.width} ${l.height}" width="${l.width}" height="${l.height}" role="img" aria-label="${e(m.title)} — ${e(m.zone)} — ${e(m.attendee)}"><style>${fontCss}</style><rect width="2400" height="${l.height}" fill="#faf7f1"/><rect x="24" y="24" width="2352" height="${l.height - 48}" fill="none" stroke="#191919" stroke-width="3"/>
  ${text(['NADAKITA LIVE'], 48, 88, 48, 700)}${text(['J A K A R T A  2 0 2 6'], 50, 122, 16)}<path d="M570 80H2130" stroke="#8b8b8b" stroke-width="2"/>${text(['MUSIC', 'PEOPLE', 'BIGGER', 'TOGETHER.'], 2170, 60, 13, 700, '#191919', 3)}
  <rect x="48" y="165" width="2304" height="${bodyHeight}" fill="#fffdf8"/><rect x="48" y="165" width="1232" height="58" fill="${m.ink}"/>${text(['NADAKITA LIVE / JAKARTA 2026'], 80, 202, 23, 700, m.artistKey === 'bruno' ? '#191919' : '#fff')}
  ${text(l.title, 80, 295, 60, 700)}<rect x="80" y="${l.zoneTop}" width="1160" height="${l.zone.length * 40 + 20}" fill="${m.accent}"/>${text(l.zone, 96, l.zoneTop + 40, 32, 700)}
  ${text(['DATE'], 80, l.firstRow, 15, 400, '#625e58')}${text(l.date, 80, l.firstRow + 36)}${text(['VENUE'], 655, l.firstRow, 15, 400, '#625e58')}${text(l.venue, 655, l.firstRow + 36)}<path d="M625 ${l.firstRow - 8}V${l.secondRow - 32}" stroke="#aaa49a"/>
  <path d="M80 ${l.secondRow - 24}H1240" stroke="#aaa49a"/>${text(['ATTENDEE'], 80, l.secondRow, 15, 400, '#625e58')}${text(l.attendee, 80, l.secondRow + 36)}${text(['ORDER ID'], 655, l.secondRow, 15, 400, '#625e58')}${text(l.order, 655, l.secondRow + 36, 24)}<path d="M625 ${l.secondRow - 8}V${l.bodyBottom - 70}" stroke="#aaa49a"/>
  ${text(['SIMULATION TICKET · NOT VALID FOR CONCERT ADMISSION'], 80, l.bodyBottom - 24, 16, 400, '#625e58')}
  <rect x="1280" y="165" width="600" height="${bodyHeight}" fill="#07080c"/>${art}<path d="M1280 165V${l.bodyBottom}M1880 165V${l.bodyBottom}" stroke="#aaa49a" stroke-dasharray="6 6"/>
  ${text([m.checkedIn ? 'CHECKED IN' : 'NOT CHECKED IN'], 1920, 222, 18, 700)}<g data-ticket-qr="" transform="translate(1956 258)">${qrMarkup || '<rect width="320" height="320" fill="#fff"/><text x="160" y="160" text-anchor="middle" font-family="Arial,sans-serif" font-size="18" fill="#625e58">Preparing QR…</text>'}</g>
  ${text(wrapText(m.code, 26), 1920, 632, 20, 700)}${text(['ONE TICKET. ONE NIGHT.'], 1920, l.bodyBottom - 45, 15, 700)}
  <rect x="48" y="165" width="2304" height="${bodyHeight}" fill="none" stroke="#191919" stroke-width="3"/><path d="M48 ${l.bodyBottom + 60}H2352" stroke="#aaa49a"/>
  ${text(['NADAKITA'], 48, l.bodyBottom + 105, 30, 700)}${text(['JAKARTA 2026'], 310, l.bodyBottom + 103, 15, 400, '#191919', 4)}${text([m.artist + ' / ' + (m.night ? 'NIGHT ' + m.night : 'LIVE')], 950, l.bodyBottom + 102, 15, 700, '#191919', 2)}${text(['ONE TICKET. A BIGGER TOMORROW.'], 1870, l.bodyBottom + 102, 13, 700)}</svg>`;
}
