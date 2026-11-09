// build.js (Cloudflare Pages build step): only the files the app needs reach dist/ (the published folder);
// internal repo files never do; unknown addresses get a real 404 page; a missing app file or a secret stops the build.
// Run: node tests/site-build.test.js
'use strict';
const assert = require('assert'), fs = require('fs'), path = require('path'), os = require('os'), cp = require('child_process');
const ROOT = path.join(__dirname, '..'), B = require(path.join(ROOT, 'build.js'));
let pass = 0, fail = 0; const out = [];
function t(name, fn) { try { fn(); pass++; out.push('PASS ' + name); } catch (e) { fail++; out.push('FAIL ' + name + ' -> ' + e.message); } }
const tracked = cp.execSync('git ls-files', { cwd: ROOT, encoding: 'utf8' }).split('\n').filter(Boolean);
const files = B.list();

t('published = exactly the app page, its scripts, the manifest, the headers file and the icons', () => {
  const want = tracked.filter((f) => /^(index\.html|md-[a-z0-9-]+\.js|lm-[a-z0-9-]+\.js|site\.webmanifest|_headers)$/.test(f) || /^assets\//.test(f)).sort();
  assert.strictEqual(JSON.stringify(files), JSON.stringify(want));
});
t('no internal file is published (notes, prompts, tests, rules, relay, old worker, server source, build script)', () => {
  const internal = tracked.filter((f) => files.indexOf(f) < 0);
  ['CLAUDE.md', 'README.md', 'TESTING.md', 'firestore.rules', 'gemini-relay.gs', 'ai-worker.js', 'build.js', 'functions/api/[[path]].js'].forEach((f) => assert.ok(internal.indexOf(f) >= 0 || !tracked.includes(f), f));
  files.forEach((f) => assert.ok(!/\.(md|rules|gs|map)$|^tests\/|^functions\/|^build\.js$|^\./.test(f), f));
  assert.ok(internal.some((f) => /^PROMPT-.*\.md$/.test(f)) && internal.some((f) => /^tests\//.test(f)));
});
t('every local file index.html loads is published (scripts, icons, manifest)', () => { assert.deepStrictEqual(B.check(files), []); });
t('a file added later is not published unless it is on the list', () => {
  const tmp = ['notes.txt', 'backup.json', 'PROMPT-new.md', 'secret.env', 'x.html', 'md-notes.md'];
  tmp.forEach((f) => fs.writeFileSync(path.join(ROOT, f), 'x'));
  try { const L = B.list(); tmp.forEach((f) => assert.ok(L.indexOf(f) < 0, f)); } finally { tmp.forEach((f) => fs.unlinkSync(path.join(ROOT, f))); }
});
t('a published file that looks like it holds a secret stops the build; md-config.js (public Firebase web key) passes', () => {
  const f = 'md-zz-test.js'; fs.writeFileSync(path.join(ROOT, f), 'var k = {"private_key": "-----BEGIN PRIVATE KEY-----abc"};');
  try { assert.ok(B.check(B.list()).some((x) => x.indexOf(f) === 0 && /secret/.test(x))); } finally { fs.unlinkSync(path.join(ROOT, f)); }
  assert.ok(!B.check(files).some((x) => /md-config/.test(x)));
});
t('the build writes dist/ with a real 404 page, and nothing else', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mdb-')), rel = path.relative(ROOT, dir);
  const r = cp.spawnSync(process.execPath, [path.join(ROOT, 'build.js'), rel], { cwd: ROOT, encoding: 'utf8' });
  try {
    assert.strictEqual(r.status, 0, r.stderr);
    const got = []; const walk = (d, p) => fs.readdirSync(d).forEach((f) => { const q = path.join(d, f); fs.statSync(q).isDirectory() ? walk(q, p + f + '/') : got.push(p + f); }); walk(dir, '');
    assert.strictEqual(JSON.stringify(got.sort()), JSON.stringify(files.concat(['404.html']).sort()));
    assert.ok(/Page not found/.test(fs.readFileSync(path.join(dir, '404.html'), 'utf8')));
    assert.strictEqual(fs.readFileSync(path.join(dir, 'index.html'), 'utf8'), fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'), 'copied byte for byte');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
t('dist/ and wrangler leftovers are never committed', () => {
  const gi = fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf8'); assert.ok(/^dist\/$/m.test(gi) && /^\.wrangler\/$/m.test(gi));
});
out.forEach((l) => console.log(l)); console.log('---- ' + pass + '/' + (pass + fail) + ' passed'); if (fail) process.exitCode = 1;
