// Visual configuration only. Names, dates, holders and codes come from issued records.
export const ARTIST_THEMES = {
  weeknd: { ink: '#ff234e', glow: '#930d25', night: '01' },
  bieber: { ink: '#8193ff', glow: '#3025bc', night: '02' },
  bruno: { ink: '#ffb64b', glow: '#a04b0c', night: '03' },
  neutral: { ink: '#c8c4bb', glow: '#55534e', night: '' },
};
export const ZONE_THEMES = {
  vip: '#ff329c',
  festa: '#d8ff52',
  festb: '#9bdcff',
  cat1: '#cbb5ff',
  cat2: '#f7dfb9',
  neutral: '#e8e2d8',
};
/** Pilih warna artis/zona; metadata tak dikenal mendapat tema netral, bukan identitas palsu. */
export function resolveTheme(show, category) {
  const name = String(show.artists?.name || show.title || '').toLowerCase();
  const slug = show.artists?.slug || show.slug;
  const artistKey = Object.hasOwn(ARTIST_THEMES, slug)
    ? slug
    : name.includes('weeknd')
      ? 'weeknd'
      : name.includes('justin bieber')
        ? 'bieber'
        : name.includes('bruno mars')
          ? 'bruno'
          : 'neutral';
  const zoneName = String(category.name || '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim();
  const names = {
    'VIP EXPERIENCE': 'vip',
    'FESTIVAL A': 'festa',
    'FESTIVAL B': 'festb',
    'CAT 1': 'cat1',
    'CAT 2': 'cat2',
  };
  const zoneKey = Object.hasOwn(ZONE_THEMES, category.code)
    ? category.code
    : names[zoneName] || 'neutral';
  return { artistKey, zoneKey, accent: ZONE_THEMES[zoneKey], ...ARTIST_THEMES[artistKey] };
}
// Code-native concert illustrations, not official artwork or generated artist likenesses.
// Artwork effects stay inside this SVG panel; the ticket itself uses flat surfaces.
/** Ilustrasi SVG original menurut tema; bukan poster resmi atau foto wajah artis. */
export function artworkSvg(model) {
  const { artistKey, zoneKey, ink, glow } = model;
  const id = 'art-' + artistKey + '-' + zoneKey;
  let scene = '';
  const star = (x, y, r) =>
    `<path d="M${x - r} ${y}h${r * 2}M${x} ${y - r}v${r * 2}" stroke="${ink}" stroke-width="2"/>`;
  if (zoneKey === 'vip') {
    scene = `<circle cx="300" cy="245" r="195" fill="url(#${id}-halo)"/><path d="M95 300A210 210 0 0 1 505 300" fill="none" stroke="${ink}" stroke-width="3"/>`;
    if (artistKey === 'bruno') {
      scene += '<circle cx="300" cy="240" r="130" fill="#25180c"/>';
      for (let row = 0; row < 13; row++)
        for (let col = 0; col < 13; col++) {
          const x = 175 + col * 20,
            y = 115 + row * 20;
          if ((x + 10 - 300) ** 2 + (y + 10 - 240) ** 2 < 125 ** 2)
            scene += `<rect x="${x}" y="${y}" width="18" height="18" fill="${['#f0b14a', '#cf822a', '#9b5d17', '#ffe29a'][(row * 7 + col * 3) % 4]}"/>`;
        }
      scene += `<path d="M60 80L170 140M540 80L430 140M300 15V95" stroke="${ink}" stroke-width="3"/>`;
    } else if (artistKey === 'bieber') {
      scene += `<text x="300" y="310" text-anchor="middle" fill="${ink}" font-family="serif" font-size="128" letter-spacing="-20">JB</text><path d="M300 20V150M200 65V190M400 65V190" stroke="${ink}" opacity=".65"/>`;
    } else scene += star(300, 250, 90);
  } else if (zoneKey === 'festa') {
    scene = `<circle cx="300" cy="230" r="180" fill="url(#${id}-halo)"/>`;
    for (let n = 0; n < 16; n++) {
      const h = 80 + ((n * 73) % 260);
      scene += `<rect x="${n * 40}" y="${440 - h}" width="25" height="${h}" fill="#080a10" stroke="${ink}" stroke-opacity=".45"/><path d="M${n * 40 + 12} ${440 - h}V${130 - ((n * 41) % 100)}" stroke="${ink}" opacity=".6"/>`;
    }
    scene += star(300, 100, 40);
  } else if (zoneKey === 'festb' || zoneKey === 'cat2') {
    for (let n = 0; n < 5; n++)
      scene += `<path d="M-80 ${490 - n * 48}Q${190 + n * 28} ${65 + n * 20} 680 ${115 + n * 55}" fill="none" stroke="${ink}" stroke-width="${n === 2 ? 4 : 2}" opacity="${0.3 + n * 0.13}"/>`;
    scene +=
      `<ellipse cx="310" cy="330" rx="250" ry="140" fill="url(#${id}-halo)"/>` +
      star(zoneKey === 'cat2' ? 420 : 230, 180, 35);
    for (let n = 0; n < 20; n++)
      scene += `<path d="M${n * 33} 500v-${25 + ((n * 37) % 80)}" stroke="#111019" stroke-width="24"/>`;
  } else {
    scene = `<circle cx="300" cy="245" r="190" fill="url(#${id}-halo)"/>`;
    for (let n = 0; n < 8; n++) {
      const y = 470 - n * 32,
        x = 45 + n * 27,
        w = 510 - n * 54;
      scene += `<path d="M${x} ${y}h${w}v22H${x}z" fill="${glow}" stroke="${ink}" stroke-opacity=".65"/>`;
    }
    for (let n = 0; n < 7; n++)
      scene += `<path d="M300 205L${70 + n * 77} 30" stroke="${ink}" opacity=".6"/>`;
    scene += star(300, 200, 30);
  }
  let stars = '';
  for (let n = 0; n < 54; n++)
    stars += `<circle cx="${(n * 97 + 31) % 600}" cy="${(n * 67 + 19) % 470}" r="${n % 3 === 0 ? 1.5 : 0.7}" fill="${ink}" opacity="${0.25 + (n % 4) * 0.15}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 640" preserveAspectRatio="xMidYMid meet"><defs><radialGradient id="${id}-halo"><stop stop-color="${glow}" stop-opacity=".75"/><stop offset="1" stop-color="#07080c" stop-opacity="0"/></radialGradient></defs><rect width="600" height="640" fill="#07080c"/>${stars}${scene}<path d="M40 515H560" stroke="${ink}" opacity=".5"/><text x="300" y="557" text-anchor="middle" font-family="Arial,sans-serif" font-size="21" letter-spacing="6" fill="#fff">NADAKITA LIVE</text><text x="300" y="589" text-anchor="middle" font-family="Arial,sans-serif" font-size="13" letter-spacing="5" fill="${ink}">JAKARTA 2026${model.night ? ' / NIGHT ' + model.night : ''}</text><circle cx="300" cy="618" r="4" fill="${model.accent}"/></svg>`;
}
