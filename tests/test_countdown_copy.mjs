import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// Isolated DOM and clock: no real requests, authentication or booking changes.
const element = () => ({ textContent: '', hidden: false, attributes: {},
  setAttribute(key, value) { this.attributes[key] = value; } });
const units = Object.fromEntries(['days', 'hours', 'minutes', 'seconds'].map(unit =>
  [unit, { ...element(), nextElementSibling: element() }]));
const nodes = Object.fromEntries(['countdown-eyebrow', 'countdown-title', 'countdown-clock']
  .map(id => [id, element()]));
nodes['concert-countdown'] = {
  querySelector: selector => units[selector.match(/"(\w+)"/)[1]],
};
let now = Date.parse('2026-11-19T20:00:00+07:00');
class TestDate extends Date { static now() { return now; } }
const intervals = new Map();
let nextId = 0;
const context = {
  Date: TestDate,
  document: { hidden: false, getElementById: id => nodes[id], addEventListener() {} },
  window: {}, addEventListener() {},
  setInterval(fn) { intervals.set(++nextId, fn); return nextId; },
  clearInterval(id) { intervals.delete(id); },
};
vm.runInNewContext(readFileSync(new URL('../js/countdown.js', import.meta.url), 'utf8'), context);
const api = context.window.NADAKITA_LIVE_COUNTDOWN;
const schedule = [
  ['weeknd', 'The Weeknd', '20'], ['bieber', 'Justin Bieber', '21'], ['bruno', 'Bruno Mars', '22'],
].map(([slug, name, day]) => ({ slug, artists: { name }, show_date: `2026-11-${day}`,
  starts_at: '20:00:00', ends_at: '22:00:00', status: 'published' }));
api.setShows(schedule);
assert.equal(nodes['countdown-title'].textContent, 'COUNTDOWN TO NIGHT 01 — The Weeknd');
assert.equal(nodes['countdown-eyebrow'].textContent, 'THE WAIT IS ALMOST OVER');
assert.deepEqual(Object.values(units).map(unit => unit.nextElementSibling.textContent),
  ['DAYS', 'HOURS', 'MINUTES', 'SECONDS']);
assert.equal(nodes['countdown-clock'].attributes['aria-label'],
  '1 days, 0 hours, 0 minutes, 0 seconds until The Weeknd');
assert.equal(units.days.textContent, '1');
assert.equal(units.hours.textContent, '00');
function tick(iso) {
  now = Date.parse(iso);
  for (const fn of intervals.values()) fn();
}
for (const [index, artist, day] of [[1, 'The Weeknd', 20], [2, 'Justin Bieber', 21], [3, 'Bruno Mars', 22]]) {
  tick(`2026-11-${day}T19:59:59+07:00`);
  assert.equal(nodes['countdown-title'].textContent, `COUNTDOWN TO NIGHT 0${index} — ${artist}`);
  assert.equal(units.seconds.textContent, '01');
  assert.equal(nodes['countdown-clock'].hidden, false);
  tick(`2026-11-${day}T20:00:00+07:00`);
  assert.equal(nodes['countdown-title'].textContent, `NIGHT 0${index} — ${artist} IS LIVE`);
  assert.equal(nodes['countdown-eyebrow'].textContent, 'THE NIGHT IS HERE');
  assert.equal(nodes['countdown-clock'].hidden, true);
}
tick('2026-11-22T22:00:00+07:00');
assert.equal(nodes['countdown-title'].textContent, 'ALL SHOWS HAVE ENDED');
assert.equal(nodes['countdown-eyebrow'].textContent, 'THREE NIGHTS. ONE CITY.');
api.setUnavailable();
assert.equal(nodes['countdown-title'].textContent, 'CONCERT SCHEDULE UNAVAILABLE');
assert.equal(nodes['countdown-clock'].hidden, true);
api.setShows(schedule);
assert.equal(intervals.size, 1, 'Copy changes must not create duplicate timers');
console.log('PASS English countdown copy, ARIA, all three nights, WIB boundaries and single timer');
