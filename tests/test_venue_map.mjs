import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const context = { window: {} };
vm.runInNewContext(readFileSync('js/ticket-zones.js', 'utf8'), context);
const { map } = context.window.NADAKITA_ZONES;
const category = { code: 'vip', name: 'VIP EXPERIENCE', price_idr: 3175000, active: true };
const html = map({ show: 'bieber', categories: [category] });
assert.match(html, /booking-map--night/);
assert.match(html, /Rp3\.175\.000/);
assert.match(html, /tickets\.html\?show=bieber&amp;zone=vip/);
assert.doesNotMatch(
  html,
  /booking-map-note|Illustrative venue map|Academic simulation|Not an official GBK seating plan|tickets are not valid for concert admission/
);
assert.doesNotMatch(html, /GATE A|GATE B|NUMBERED SEATING|government tax/);
assert.match(map({ categories: [{ ...category, price_idr: 0 }] }), /Rp0</);
for (const price_idr of [null, undefined, '', 'bad', -1, Infinity]) {
  const unknown = map({ categories: [{ ...category, price_idr }] });
  assert.match(unknown, /Price unavailable/);
  assert.doesNotMatch(unknown, /Rp0/);
}
const pending = map({ priceState: 'loading' });
assert.match(pending, /Loading price/);
assert.doesNotMatch(pending, /Rp\d/);
assert.match(map({ categories: [], priceState: 'ready' }), /No ticket categories/);
const disabled = map({ categories: [{ ...category, active: false }], interactive: true });
assert.match(disabled, /disabled/);
assert.match(disabled, /Unavailable/);
const escaped = map({ categories: [{ ...category, name: '<script>alert(1)</script>' }] });
assert.doesNotMatch(escaped, /<script>/);
assert.match(escaped, /&lt;script&gt;/);
console.log('PASS venue map: live prices, missing/zero prices, loading, empty, disabled, escaping');
