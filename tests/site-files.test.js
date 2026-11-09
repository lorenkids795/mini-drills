// functions/_middleware.js: the site serves only what the app needs; internal repo files answer 404.
// Checks every file tracked in the repo + every local file index.html loads. Run: node tests/site-files.test.js
'use strict';
const assert = require('assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const SRC = fs.readFileSync(path.join(ROOT, 'functions', '_middleware.js'), 'utf8').replace(/^export /gm, '');
const ctx = vm.createContext({ URL, Response: class { constructor(b, o) { this.body = b; this.status = o.status; } } });
vm.runInContext(SRC + '\n;this.M={allowed,onRequest};', ctx);
const { allowed, onRequest } = ctx.M;
let pass = 0, fail = 0; const out = [];
function t(name, fn) { try { fn(); pass++; out.push('PASS ' + name); } catch (e) { fail++; out.push('FAIL ' + name + ' -> ' + e.message); } }

function walk(d, acc) { for (const f of fs.readdirSync(d)) { if (f === '.git' || f === 'node_modules') continue; const p = path.join(d, f); fs.statSync(p).isDirectory() ? walk(p, acc) : acc.push('/' + path.relative(ROOT, p).split(path.sep).join('/')); } return acc; }
const FILES = walk(ROOT, []);
const PUBLIC = (f) => /^\/(index\.html|md-(config|backend|chart|hw)\.js|lm-(content|engine|unit\d+)\.js|site\.webmanifest)$/.test(f) || /^\/assets\//.test(f);

t('every file the app needs is served', () => {
  const need = FILES.filter(PUBLIC); assert.ok(need.length >= 14, need.length);
  need.forEach((f) => assert.ok(allowed(f), f));
});
t('every local file index.html loads is served', () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const refs = (html.match(/(?:src|href)=["'][^"'#?]+/g) || []).map((s) => s.replace(/^(src|href)=["']/, '')).filter((s) => !/^(https?:|data:|blob:|mailto:|\/api\/)/.test(s));
  assert.ok(refs.length >= 10, refs.length); refs.forEach((r) => assert.ok(allowed('/' + r.replace(/^\//, '')), r));
});
t('every other file in the repo answers 404 (internal notes, tests, rules, relay, old worker)', () => {
  const internal = FILES.filter((f) => !PUBLIC(f)); assert.ok(internal.length >= 40, internal.length);
  internal.forEach((f) => assert.ok(!allowed(f), f));
  ['/CLAUDE.md', '/README.md', '/TESTING.md', '/firestore.rules', '/gemini-relay.gs', '/ai-worker.js', '/tests/misc.test.js', '/tests/lm-review', '/tests/', '/_headers', '/functions/api/[[path]].js'].forEach((f) => assert.ok(!allowed(f), f));
});
t('files added later are blocked by default (allow-list)', () => {
  ['/PROMPT-new.md', '/notes.txt', '/backup.json', '/script.py', '/x.html', '/.env', '/.git/config', '/Tests/a.js', '/%74ests/a.js'].forEach((f) => assert.ok(!allowed(f), f));
});
t('the app page, the API and media still go through', () => {
  ['/', '/index.html', '/api/status', '/api/audio/abc', '/api/image/abc', '/audio/lesson1.mp3', '/.well-known/x'].forEach((f) => assert.ok(allowed(f), f));
  ['/..%2fCLAUDE.md', '/a%5cb.md', '/%E0%A4%A'].forEach((f) => assert.ok(!allowed(f), f));
});
t('a blocked file gets a plain 404, an allowed one is passed on', async () => {
  let nexted = 0; const ok = await onRequest({ request: { url: 'https://x.dev/index.html' }, next: () => { nexted++; return 'next'; } });
  assert.strictEqual(ok, 'next'); assert.strictEqual(nexted, 1);
});
(async () => {
  const r = await onRequest({ request: { url: 'https://x.dev/CLAUDE.md' }, next: () => { throw new Error('must not pass'); } });
  t('CLAUDE.md → 404 "Not found."', () => { assert.strictEqual(r.status, 404); assert.strictEqual(r.body, 'Not found.'); });
  out.forEach((l) => console.log(l)); console.log('---- ' + pass + '/' + (pass + fail) + ' passed'); if (fail) process.exitCode = 1;
})();
