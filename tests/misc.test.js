// Library tab, Admin (Edit class gone, tester sample data with Writing + Speaking), Leaderboard stars + Top 3.
// Run: node tests/misc.test.js
'use strict';
const assert = require('assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const { boot, html, ROOT } = require('./app-harness.js');
let pass = 0, fail = 0; const out = [];
async function t(name, fn) { try { await fn(); pass++; out.push('PASS ' + name); } catch (e) { fail++; out.push('FAIL ' + name + ' -> ' + e.message); } }
const SRV = fs.readFileSync(path.join(ROOT, 'functions', 'api', '[[path]].js'), 'utf8').replace(/^export async function onRequest/m, 'async function onRequest');

(async () => {
  await t('Leaderboard hero: exactly the 20 star layers of the spec, soft radial-gradients, opacity .8, twinkle .45 → .95', () => {
    const line = (/^\.lbhero::after\{.*$/m.exec(html) || [''])[0];
    const L = line.match(/radial-gradient\([^)]*\)/g) || []; assert.strictEqual(L.length, 20);
    assert.strictEqual(L[0], 'radial-gradient(2px 2px at 12% 30%, #fff, transparent)'); assert.strictEqual(L[2], 'radial-gradient(3px 3px at 70% 70%, #ffe28a, transparent)'); assert.strictEqual(L[19], 'radial-gradient(2px 2px at 72% 28%, #fff, transparent)');
    assert.ok(/opacity:\.8;animation:lbtw 3s ease-in-out infinite alternate/.test(line) && /inset:0;pointer-events:none/.test(line));
    assert.ok(/@keyframes lbtw\{from\{opacity:\.45\}to\{opacity:\.95\}\}/.test(html)); assert.ok(/prefers-reduced-motion:reduce\)\{\.lbhero>\.lbshoot\{display:none\}\.lbhero::after\{animation:none\}/.test(html));
    assert.ok(/animation:shoot 9s linear 1s infinite/.test(html), 'first shooting star after 1 s');
  });
  const LBH = 'renderRanks:renderRanks,setRoster:function(r){rosterDocs=r},setProf:function(e,p){localProf[e]=p}';
  const lb = (n) => { const B = boot({ hooks: LBH, user: { name: 'S0', email: 's0@x.com', role: 'student', cls: 'A' } }); const R = [];
    for (let i = 0; i < n; i++) { R.push({ email: 's' + i + '@x.com', name: 'Student ' + i, cls: 'A', role: 'student' }); B.T.setProf('s' + i + '@x.com', { email: 's' + i + '@x.com', xp: 100 - i * 10 }); }
    B.T.setRoster(R); B.T.renderRanks(); return B.el('v-ranks').innerHTML; };
  await t('Leaderboard Top 3: #1 only in the hero, cards = #2 and #3; 2 users = one card; 0 and 1 user do not break', () => {
    const h = lb(5); const hero = h.slice(h.indexOf('lbhero'), h.indexOf('lbcards')); const cards = h.slice(h.indexOf('lbcards'), h.indexOf('lblist'));
    assert.ok(hero.includes('Student 0') && !cards.includes('Student 0')); assert.ok(/lb2[\s\S]*Student 1/.test(cards) && /lb3[\s\S]*Student 2/.test(cards));
    const h2 = lb(2); assert.ok(h2.includes('lbcards one') && !h2.includes('3rd place')); assert.ok(lb(1).includes('lbhero') && !lb(1).includes('lbcards')); assert.ok(lb(0).includes('lbempty'));
  });
  await t('Library: the tab is named "Cambridge"', () => { assert.ok(/tab\('cam','Cambridge'\)\+tab\('lm','Learning Materials'\)/.test(html)); });
  await t('Admin › Users: no "Edit class" button any more (other buttons stay)', () => {
    const B = boot({ hooks: 'get AD(){return AD},renderAdmin:renderAdmin' }); const AD = B.T.AD; AD.sub = 'users'; AD.locked = false; AD.ver = 'x';
    AD.users = [{ email: 'k@x.com', name: 'K', role: 'student', cls: '17h', status: 'active', hasPassword: true }]; B.T.showTab('admin'); const v = B.el('v-admin').innerHTML;
    assert.ok(!v.includes('data-act="ad-cls"') && !/Edit class/.test(v)); assert.ok(v.includes('data-act="ad-menu"'), 'actions are in the ⋯ menu (Change password, Kick: tests/admin-kick.test.js)');
  });
  // server seedTester with a fake Firestore
  const seedBoot = (DB) => {
    const toV = (v) => (typeof v === 'string' ? { stringValue: v } : typeof v === 'number' ? { doubleValue: v } : typeof v === 'boolean' ? { booleanValue: v } : { nullValue: null });
    const fetch = async (url, opt) => { opt = opt || {}; const m = /\/documents\/([^/?]+)\/([^/?]+)/.exec(String(url)); const ok = (b) => ({ ok: true, status: 200, json: async () => b });
      if (!m) return ok({}); const col = decodeURIComponent(m[1]), id = decodeURIComponent(m[2]);
      if ((opt.method || 'GET') === 'GET') return DB[col] && DB[col][id] ? ok({ name: col + '/' + id, fields: Object.fromEntries(Object.entries(DB[col][id]).filter(([, v]) => typeof v !== 'object').map(([k, v]) => [k, toV(v)])) }) : { ok: false, status: 404, json: async () => ({}) };
      DB[col] = DB[col] || {}; DB[col][id] = Object.assign({}, DB[col][id], { _written: (DB[col][id] && DB[col][id]._written || 0) + 1, _body: JSON.parse(opt.body || '{}') }); return ok({}); };
    const ctx = vm.createContext({ fetch, console: { log() {} }, Response: class { constructor(b, o) { this.body = b; this.status = (o && o.status) || 200; } }, URL, TextEncoder, TextDecoder, crypto: globalThis.crypto, atob, btoa, setTimeout, Date, Math, JSON });
    vm.runInContext(SRV + '\n;this.T={seedTester};accessToken=async()=>"tok";', ctx); return ctx.T;
  };
  await t('server sample data: 5 results + a marked Writing (w1) and Speaking (s1) submission; fixed ids so running again replaces them', async () => {
    const DB = { profiles: {} }, T = seedBoot(DB), env = { FIREBASE_PROJECT_ID: 'p' };
    const n = await T.seedTester(env, 'tester@gmail.com', 'Tester', 'Test'); assert.strictEqual(n, 7);
    const ids = Object.keys(DB.attempts).sort(); assert.deepStrictEqual(ids, ['seed_tester-gmail-com_l1', 'seed_tester-gmail-com_l2', 'seed_tester-gmail-com_l3', 'seed_tester-gmail-com_r1', 'seed_tester-gmail-com_r3', 'seed_tester-gmail-com_s1', 'seed_tester-gmail-com_w1']);
    const w = DB.attempts['seed_tester-gmail-com_w1']._body.fields; assert.strictEqual(w.kind.stringValue, 'submission'); assert.ok(w.text.stringValue.length > 20 && w.grade.mapValue.fields.overall);
    const sp = DB.attempts['seed_tester-gmail-com_s1']._body.fields; assert.strictEqual(sp.ex.stringValue, 's1'); assert.ok(sp.grade.mapValue.fields.feedback);
    await T.seedTester(env, 'tester@gmail.com', 'Tester', 'Test'); assert.strictEqual(Object.keys(DB.attempts).length, 7, 'no copies'); assert.strictEqual(DB.attempts['seed_tester-gmail-com_w1']._written, 2);
  });
  await t('server: sample data only for tester accounts (op seed checks roster.tester)', () => { assert.ok(/if \(!row \|\| row\.data\.tester !== true\) return fail\('Sample data is only for tester accounts\.', 404\)/.test(SRV)); });
  out.forEach((l) => console.log(l)); console.log('---- ' + pass + '/' + (pass + fail) + ' passed'); process.exit(fail ? 1 : 0);
})();
