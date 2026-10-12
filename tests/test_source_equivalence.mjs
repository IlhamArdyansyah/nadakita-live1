/** Memastikan format/komentar tidak mengubah AST JavaScript, termasuk isi template. */
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve, relative } from 'node:path';
import { pathToFileURL } from 'node:url';

const snapshot = resolve(process.argv[2] || '');
const parserPath = process.argv[3];
assert.ok(parserPath, 'Usage: node tests/test_source_equivalence.mjs SNAPSHOT BABEL_PLUGIN');
const { parsers } = await import(pathToFileURL(resolve(parserPath)));
const root = resolve('.');
const ignored = new Set([
  'start', 'end', 'loc', 'range', 'extra', 'comments', 'tokens',
  'leadingComments', 'trailingComments', 'innerComments',
]);

function normalize(value) {
  // Extra standalone semicolons have no effect inside statement lists. A loop's
  // single EmptyStatement body is not an array item and remains checked.
  if (Array.isArray(value)) return value.filter(item => item?.type !== 'EmptyStatement').map(normalize);
  if (!value || typeof value !== 'object') return value;
  // Escapes can change spelling while the runtime string must stay identical.
  if (value.type === 'TemplateElement') {
    return { type: value.type, tail: value.tail, value: { cooked: value.value.cooked } };
  }
  return Object.fromEntries(Object.entries(value)
    .filter(([key]) => !ignored.has(key))
    .map(([key, item]) => [key, normalize(item)]));
}

function files(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    if (entry.name === 'vendor') return [];
    const path = join(directory, entry.name);
    return entry.isDirectory() ? files(path) : entry.name.endsWith('.js') ? [path] : [];
  });
}

let checked = 0;
for (const path of files(join(root, 'js'))) {
  const before = readFileSync(join(snapshot, relative(root, path)), 'utf8');
  const after = readFileSync(path, 'utf8');
  const parse = source => parsers.babel.parse(source, { filepath: path });
  assert.deepEqual(normalize(await parse(after)), normalize(await parse(before)), relative(root, path));
  checked += 1;
}
console.log(`PASS ${checked} JavaScript ASTs and exact runtime template/string values`);
