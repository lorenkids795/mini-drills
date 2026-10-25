// Server: Kick deletes a student's learning data (purgeStudent) and Delete class (adminClassDel).
// Runs the real functions/api/[[path]].js in Node with a fake Firestore REST API and a fake KV. No network.
// Run: node tests/server-purge.test.js
'use strict';
const assert = require('assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const SRC = fs.readFileSync(path.join(__dirname, '..', 'functions', 'api', '[[path]].js'), 'utf8').replace(/^export async function onRequest/m, 'async function onRequest');
let pass = 0, fail = 0; const out = [];
async function t(name, fn) { try { await fn(); pass++; out.push('PASS ' + name); } catch (e) { fail++; out.push('FAIL ' + name + ' -> ' + e.message); } }
const BASE = 'projects/p1/databases/(default)/documents/';

// tiny Firestore: DB[col][id] = plain fields
function boot(DB, kv) {
  const deleted = [], calls = [];
  const toV = (v) => (typeof v === 'string' ? { stringValue: v } : typeof v === 'number' ? { integerValue: String(v) } : typeof v === 'boolean' ? { booleanValue: v } : { nullValue: null });
  const doc = (col, id) => ({ name: BASE + col + '/' + id, fields: Object.fromEntries(Object.entries(DB[col][id]).map(([k, v]) => [k, toV(v)])), updateTime: '2026-01-01T00:00:00Z' });
  const res = (status, body) => ({ ok: status < 400, status, json: async () => body, text: async () => JSON.stringify(body) });
  const fetch = async (url, opt) => {
    opt = opt || {}; calls.push({ url, method: opt.method || 'GET' });
    const u = String(url), m = /\/documents(.*)$/.exec(u); if (!m) return res(404, {});
    const rest = m[1].split('?')[0];
    if (rest === ':runQuery') {
      const q = JSON.parse(opt.body).structuredQuery, col = q.from[0].collectionId, f = q.where.fieldFilter;
      return res(200, Object.keys(DB[col] || {}).filter((id) => DB[col][id][f.field.fieldPath] === f.value.stringValue).map((id) => ({ document: doc(col, id) })).concat([{ readTime: 'x' }]));
    }
    if (rest === ':batchWrite') {
      JSON.parse(opt.body).writes.forEach((w) => { const [col, id] = w.delete.slice(BASE.length).split('/'); if (DB[col]) delete DB[col][id]; deleted.push(col + '/' + id); });
      return res(200, { writeResults: [] });
    }
    const [, col, id] = rest.split('/').map(decodeURIComponent);
    if ((opt.method || 'GET') === 'GET' && id) return DB[col] && DB[col][id] ? res(200, doc(col, id)) : res(404, {});
    if ((opt.method || 'GET') === 'GET') return res(200, { documents: Object.keys(DB[col] || {}).map((i) => doc(col, i)) });
    if (opt.method === 'DELETE') { if (DB[col]) delete DB[col][id]; deleted.push(col + '/' + id); return res(200, {}); }
    if (opt.method === 'PATCH') { DB[col] = DB[col] || {}; DB[col][id] = Object.assign({}, DB[col][id]); return res(200, doc(col, id)); }
    return res(200, {});
  };
  const KV = Object.assign({}, kv || {});
  const env = { FIREBASE_PROJECT_ID: 'p1', ADMIN_EMAIL: 'admin@x.com', TEACHERS: '',
    MD_KV: { get: async (k, ty) => (k in KV ? (ty === 'json' ? JSON.parse(KV[k]) : KV[k]) : null), put: async (k, v) => { KV[k] = v; }, delete: async (k) => { delete KV[k]; } } };
  const ctx = vm.createContext({ fetch, console: { log() {}, error() {} }, Response: class { constructor(b, o) { this.body = b; this.status = (o && o.status) || 200; } }, URL, TextEncoder, TextDecoder, crypto: globalThis.crypto, atob, btoa, setTimeout, Date, Math, JSON });
  vm.runInContext(SRC + '\n;this.T={purgeStudent,adminClassDel,adminKick};accessToken=async()=>"tok";', ctx, { filename: 'server.js' });
  return { T: ctx.T, env, DB, KV, deleted, calls, parse: (r) => JSON.parse(r.body) };
}
const student = (em) => ({
  attempts: { a1: { email: em, ex: 'l1', score: 8 }, a2: { email: em, ex: 'r1', score: 6 }, z1: { email: 'other@x.com', ex: 'l1', score: 9 } },
  errors: { e1: { email: em, original: 'go' }, z2: { email: 'other@x.com', original: 'x' } },
  cards: { c1: { email: em, w: 'word' } }, hwdone: { h1: { email: em } }, passes: { p1: { email: em } }, redeems: { r1: { email: em } },
  profiles: { [em.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')]: { email: em, xp: 300 }, 'other-x-com': { email: 'other@x.com', xp: 50 } },
  codes: { k1: { kind: 'tea', to: em } }, wins: { w1: { name: 'TESTER' } },
});

(async () => {
  await t('purgeStudent deletes every learning doc of that email (6 collections + profile)', async () => {
    const DB = student('3667@gmail.com'), B = boot(DB), r = await B.T.purgeStudent(B.env, '3667@gmail.com');
    assert.strictEqual(JSON.stringify(r), JSON.stringify({ attempts: 2, errors: 1, cards: 1, hwdone: 1, passes: 1, redeems: 1, profiles: 1 }));
    ['attempts', 'errors', 'cards', 'hwdone', 'passes', 'redeems'].forEach((c) => assert.ok(!Object.values(DB[c]).some((d) => d.email === '3667@gmail.com'), c));
    assert.ok(!DB.profiles['3667-gmail-com']);
  });
  await t('purgeStudent keeps other students, handed-out codes and the wins marquee', async () => {
    const DB = student('3667@gmail.com'), B = boot(DB); await B.T.purgeStudent(B.env, '3667@gmail.com');
    assert.ok(DB.attempts.z1 && DB.errors.z2 && DB.profiles['other-x-com'] && DB.codes.k1 && DB.wins.w1);
  });
  await t('purge = one query per collection (stays far below the Workers sub-request limit)', async () => {
    const DB = student('a@b.c'), B = boot(DB); await B.T.purgeStudent(B.env, 'a@b.c');
    assert.ok(B.calls.length <= 16, 'calls: ' + B.calls.length); assert.ok(!B.calls.some((c) => /\/documents\/(attempts|errors|cards)(\?|$)/.test(c.url)), 'no full collection scan');
  });
  await t('adminKick of a student: account gone, off:=kicked, and all learning data deleted', async () => {
    const DB = Object.assign(student('k@x.com'), { roster: { 'k@x.com': { email: 'k@x.com', name: 'K', cls: '17h', role: 'student' } }, names: {} });
    const B = boot(DB, { 'acct:k@x.com': 'hash', staff: '{}' }), r = await B.T.adminKick(B.env, { email: 'k@x.com' }), d = B.parse(r);
    assert.strictEqual(r.status, 200); assert.strictEqual(d.role, 'student'); assert.strictEqual(d.purged.attempts, 2);
    assert.ok(!DB.roster['k@x.com']); assert.strictEqual(B.KV['off:k@x.com'], 'kicked'); assert.ok(!('acct:k@x.com' in B.KV)); assert.ok(!Object.values(DB.attempts).some((a) => a.email === 'k@x.com'));
  });
  await t('adminKick of a teacher does NOT delete learning data (marking and assignments stay)', async () => {
    const DB = Object.assign(student('t@x.com'), { roster: {}, names: {} });
    const B = boot(DB, { staff: JSON.stringify({ 't@x.com': { name: 'T' } }) }), d = B.parse(await B.T.adminKick(B.env, { email: 't@x.com' }));
    assert.strictEqual(d.role, 'teacher'); assert.strictEqual(d.purged, null); assert.ok(DB.attempts.a1 && DB.profiles['t-x-com']);
  });
  await t('adminClassDel deletes the class assignments, names and settings, reports remaining roster rows', async () => {
    const DB = { roster: { 'tst@x.com': { email: 'tst@x.com', cls: '17h', role: 'student', tester: true } },
      assignments: { g1: { cls: '17h', ex: 'l1' }, g2: { cls: '7h30', ex: 'l1' } }, names: { n1: { cls: '17h', name: 'A' }, n2: { cls: '7h30', name: 'B' } }, classes: { '17h': { cls: '17h', title: 'Evening' }, '7h30': { cls: '7h30' } } };
    const B = boot(DB), d = B.parse(await B.T.adminClassDel(B.env, { cls: '17h' }));
    assert.deepStrictEqual([d.assignments, d.names, d.settings, d.remaining], [1, 1, 1, 1]);
    assert.ok(!DB.assignments.g1 && DB.assignments.g2 && !DB.names.n1 && DB.names.n2 && !DB.classes['17h'] && DB.classes['7h30']); assert.ok(DB.roster['tst@x.com'], 'tester untouched');
  });
  await t('adminClassDel needs a class name', async () => { const B = boot({}); const r = await B.T.adminClassDel(B.env, { cls: ' ' }); assert.strictEqual(r.status, 400); });
  await t('route admin/classdel is wired behind the admin key', () => { assert.ok(/route === 'admin\/classdel'\) return await adminClassDel\(env, body\)/.test(SRC)); });
  out.forEach((l) => console.log(l)); console.log('---- ' + pass + '/' + (pass + fail) + ' passed'); process.exit(fail ? 1 : 0);
})();
