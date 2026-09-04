import fs from 'node:fs';
import assert from 'node:assert/strict';

const source = fs.readFileSync(new URL('../ti-cas-hybrid-fallback-v2.js', import.meta.url), 'utf8');

assert.match(source, /giacSeparableFallback/);
assert.match(source, /simplify\(subst\(/);
assert.match(source, /integrate\(1\/\(/);
assert.match(source, /sympyOdeFallback/);
assert.match(source, /CAS Hybrid v2/);

console.log('ti-cas-hybrid-v2.test.js OK');
