import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const app = read('js/live/app.js');
const admin = read('js/live/admin.js');
const zones = read('js/ticket-zones.js');
const countdown = read('js/countdown.js');
const guide = read('js/show-guide.js');
const preview = read('js/preview.js');
const css = read('css/live.css') + read('css/booking-flow.css') + read('css/venue-night.css');

assert.match(app, /mobile-cart-bar/, 'booking exposes a mobile sticky cart');
assert.match(app, /const mapCategories\s*=/, 'venue map reflects live stock availability');
assert.match(
  app,
  /id="live-summary" role="status" aria-live="polite"/,
  'order summary announces updates'
);
assert.match(app, /reservation-countdown/, 'reservation review shows an expiry countdown');
assert.match(app, /bookingSteps\(3\)/, 'checkout includes a real review step');
assert.match(app, /password-toggle/, 'auth pages expose show/hide password controls');
assert.match(css, /status--pending_demo/, 'dashboard has semantic status variants');
assert.match(admin, /admin-mobile-toggle/, 'admin has a mobile navigation control');
assert.match(admin, /admin-mobile-logout/, 'admin keeps logout available on mobile');
assert.match(zones, /booking-map-legend/, 'zone diagram includes an accessible legend');
assert.match(zones, /booking-map-stadium/, 'booking uses the shared stadium venue map');
assert.doesNotMatch(
  zones,
  /GATE A|GATE B/,
  'illustrative map must not invent official entry gates'
);
assert.match(css, /SOLD OUT/, 'sold-out venue zones have a visible state');
assert.match(css, /gbk-concert-map-night-v3\.png/, 'venue map uses the night stadium artwork');
assert.match(preview, /venue-feature-main/, 'homepage includes the editorial venue feature');
assert.match(preview, /NADAKITA_ZONES\.map/, 'homepage reuses the canonical ticket zone map');
assert.match(css, /position:\s*fixed/, 'mobile cart or admin drawer uses a fixed affordance');
assert.match(
  countdown,
  /unit === 'days' \? String\(value\)/,
  'countdown days have no leading zero'
);
assert.match(countdown, /DAYS.*HOURS.*MINUTES.*SECONDS/, 'countdown labels use English');
assert.match(guide, /Main Gates Open/, 'show guide keeps international editorial copy');
assert.match(guide, /guide-slot-marker/, 'show guide renders a visual timeline');
assert.match(preview, /guide-essentials/, 'show guide surfaces venue essentials');

console.log('PASS audit contract');
