// D1 vouchers: the won code is never written into the public profile (codeId only), the owner reads it from codes,
// only the admin loads every voucher, and the one-profile-at-a-time move of old codes (backup first, idempotent).
// Real server + app code, fake Firestore. No network. Run: node tests/vouchers.test.js
'use strict';
const assert = require('assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const { boot } = require('./app-harness.js');
const SRC = fs.readFileSync(path.join(__dirname, '..', 'functions', 'api', '[[path]].js'), 'utf8').replace(/^export async function onRequest/m, 'async function onRequest').replace(/^import MDHW from .*$/m, () => fs.readFileSync(path.join(__dirname, '..', 'md-hw.js'), 'utf8'));
const HTML = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
let pass = 0, fail = 0; const out = [];
async function t(name, fn) { try { await fn(); pass++; out.push('PASS ' + name); } catch (e) { fail++; out.push('FAIL ' + name + ' -> ' + e.message); } }
const clone = (o) => JSON.parse(JSON.stringify(o));

// the real server code; its Firestore helpers replaced by an in-memory DB (DB[col][id] = {data, updateTime})
function server(DB, stale) {
  const writes = [];
  const ctx = vm.createContext({ fetch: async () => ({ ok: false, status: 500, json: async () => ({}) }), console: { log() {}, error() {} }, Response: class { constructor(b, o) { this.body = b; this.status = (o && o.status) || 200; } }, URL, TextEncoder, TextDecoder, crypto: globalThis.crypto, atob, btoa });
  vm.runInContext(SRC + '\n;this.T={adminVouchers};', ctx, { filename: 'server.js' });
  let tick = 1; const ut = () => 't' + (tick++);
  ctx.fsListTimed = async (env, col) => Object.keys(DB[col] || {}).map((id) => ({ name: 'x/' + col + '/' + id, updateTime: DB[col][id].updateTime, data: clone(DB[col][id].data) }));
  ctx.fsGet = async (env, col, id) => (DB[col] && DB[col][id] ? { data: clone(DB[col][id].data), updateTime: stale === id ? 'read-before-a-write' : DB[col][id].updateTime } : null);
  ctx.fsQueryDocs = async (env, col, f, v) => Object.keys(DB[col] || {}).filter((id) => DB[col][id].data[f] === v).map((id) => Object.assign({ id }, clone(DB[col][id].data)));
  ctx.fsPut = async (env, col, id, obj) => { writes.push(col + '/' + id); DB[col] = DB[col] || {}; DB[col][id] = { data: clone(obj), updateTime: ut() }; };
  ctx.fsUpdate = async (env, col, id, obj, upd) => { const d = DB[col] && DB[col][id]; if (!d || (upd && d.updateTime !== upd)) return false; writes.push(col + '/' + id); Object.assign(d.data, clone(obj)); d.updateTime = ut(); return true; };
  return { run: async (b) => { const r = await ctx.T.adminVouchers({}, b); return { status: r.status, d: JSON.parse(r.body) }; }, writes };
}
const db = () => ({
  profiles: { s1: { updateTime: 'u1', data: { email: 'S1@x.com', inv: [{ kind: 'tea', tier: 4, code: 'TEA-111' }, { kind: 'freeze', tier: 1 }] } },
    s2: { updateTime: 'u2', data: { email: 's2@x.com', inv: [{ kind: 'mock20', tier: 4, codeId: 'c9' }] } },
    s3: { updateTime: 'u3', data: { email: 's3@x.com', inv: [{ kind: 'mock25', tier: 4, code: 'LOST-9' }] } } },
  codes: { c1: { updateTime: 'k1', data: { code: 'TEA-111', kind: 'tea', to: 's1@x.com' } }, c9: { updateTime: 'k9', data: { code: 'M-9', to: 's2@x.com' } } },
});

(async () => {
  await t('spin: the profile keeps only codeId; the code text goes only to the winner in the answer', async () => {
    assert.ok(/item\.codeId = code \? code\.id : '';/.test(SRC) && !/item\.code = code/.test(SRC));
    assert.ok(/prize_id: prize\.id, tier, item, code: code \? code\.code : '',/.test(SRC));
    assert.ok(/if\(d\.code&&d\.item\)d\.item=Object\.assign\(\{\},d\.item,\{code:d\.code\}\);go\(d\);/.test(HTML), 'shown in the win box, not saved');
  });
  await t('app: only the admin loads every voucher; everyone else only codes given to them', async () => {
    assert.ok(/\(window\.MD_USER&&window\.MD_USER\.adm\?db\.collection\('codes'\):db\.collection\('codes'\)\.where\('to','==',myEm\)\)\.onSnapshot\(/.test(HTML));
  });
  await t('Inventory shows the code from my codes (codeId) and still shows an old item that carries the code', async () => {
    const B = boot({ hooks: 'invCode:invCode,setCodes:function(c){codeDocs=c}', user: { name: 'S', email: 's@x.com', role: 'student', cls: 'A' } });
    B.T.setCodes([{ id: 'c2', docId: 'c2', code: 'TEA-2', to: 's@x.com' }]);
    assert.strictEqual(B.T.invCode({ kind: 'tea', codeId: 'c2' }), 'TEA-2');
    assert.strictEqual(B.T.invCode({ kind: 'tea', code: 'OLD-1' }), 'OLD-1');
    assert.strictEqual(B.T.invCode({ kind: 'tea', codeId: 'nope' }), '');
    assert.strictEqual(B.T.invCode({ kind: 'freeze' }), '');
  });
  await t('preview reads only: counts profiles / items, never returns a code', async () => {
    const DB = db(), S = server(DB), r = await S.run({ op: 'preview' });
    assert.strictEqual(r.d.scanned, 3); assert.strictEqual(r.d.profiles, 2); assert.strictEqual(r.d.items, 2);
    assert.ok(!/TEA-111|LOST-9/.test(JSON.stringify(r.d)), 'no code text'); assert.strictEqual(S.writes.length, 0, 'nothing written');
  });
  await t('move one profile: backup first, code → codeId of the matching voucher, other items untouched', async () => {
    const DB = db(), S = server(DB), r = await S.run({ op: 'migrate', id: 's1' });
    assert.strictEqual(r.d.changed, 1); assert.ok(/^audit\/vouchers_s1_/.test(S.writes[0]), 'backup is the first write: ' + S.writes.join());
    const bk = Object.keys(DB.audit)[0]; assert.strictEqual(DB.audit[bk].data.inv[0].code, 'TEA-111', 'backup holds the old list');
    const inv = DB.profiles.s1.data.inv; assert.deepStrictEqual(inv[0], { kind: 'tea', tier: 4, codeId: 'c1' }); assert.deepStrictEqual(inv[1], { kind: 'freeze', tier: 1 });
    assert.ok(!/TEA-111/.test(JSON.stringify(r.d)));
  });
  await t('a code with no voucher doc is kept for the winner (new codes doc, to = winner), never lost', async () => {
    const DB = db(), S = server(DB); await S.run({ op: 'migrate', id: 's3' });
    const it = DB.profiles.s3.data.inv[0], c = DB.codes[it.codeId]; assert.ok(c && c.data.code === 'LOST-9' && c.data.to === 's3@x.com' && c.data.restored === true);
    assert.ok(!('code' in it));
  });
  await t('running again changes nothing; a profile written meanwhile is refused (409) and left as it was', async () => {
    const DB = db(), S = server(DB); await S.run({ op: 'migrate', id: 's1' }); const n = S.writes.length;
    const again = await S.run({ op: 'migrate', id: 's1' }); assert.strictEqual(again.d.changed, 0); assert.strictEqual(S.writes.length, n, 'no new writes');
    const D2 = db(), S2 = server(D2, 's3'), r = await S2.run({ op: 'migrate', id: 's3' }); // the profile was written after we read it
    assert.strictEqual(r.status, 409); assert.strictEqual(D2.profiles.s3.data.inv[0].code, 'LOST-9', 'profile left as it was');
  });
  await t('bad id / unknown op are refused; the route sits behind the admin key', async () => {
    const S = server(db()); assert.strictEqual((await S.run({ op: 'migrate', id: '../x' })).status, 400); assert.strictEqual((await S.run({ op: 'nope' })).status, 400);
    assert.strictEqual((await S.run({ op: 'migrate', id: 'zz' })).status, 404);
    const i = SRC.indexOf("if (route.indexOf('admin/') === 0) {"), j = SRC.indexOf("if (route === 'admin/vouchers') return await adminVouchers(env, body);"); assert.ok(i > 0 && j > i);
  });
  await t('Admin › Tools › Voucher check: preview button, move asks to type MOVE, no code shown', async () => {
    assert.ok(/data-act="ad-vch-prev"/.test(HTML) && /must:'MOVE'/.test(HTML) && /\['vouchers','Voucher check'\]/.test(HTML));
  });
  out.forEach((l) => console.log(l)); console.log('---- ' + pass + '/' + (pass + fail) + ' passed'); if (fail) process.exitCode = 1;
})();
