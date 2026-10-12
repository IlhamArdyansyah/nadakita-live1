import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
const root = new URL('../', import.meta.url);
const pages = readdirSync(root).filter(path => path.endsWith('.html'));
for (const page of pages) {
  const html = readFileSync(new URL(page, root), 'utf8');
  assert.match(
    html,
    /<link rel="icon" type="image\/svg\+xml" href="assets\/icons\/favicon\.svg"\s*\/?\s*>/,
    `${page} needs the shared favicon`
  );
}
assert.ok(existsSync(new URL('assets/icons/favicon.svg', root)), 'Favicon asset must exist');
const svg = readFileSync(new URL('assets/icons/favicon.svg', root), 'utf8');
assert.match(svg, /viewBox="0 0 64 64"/);
assert.doesNotMatch(svg, /<script|<image|\s(?:href|src)=["']https?:/i, 'Icon must be standalone');
console.log(`PASS favicon asset and links in all ${pages.length} HTML entry points`);
