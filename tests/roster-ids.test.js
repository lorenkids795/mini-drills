// Server: class-list rows stored under an old id (admin/rosterids) and the sign-in message for them.
// Runs the real functions/api/[[path]].js in Node with a fake Firestore REST API and a fake KV. No network.
// Run: node tests/roster-ids.test.js
'use strict';
const assert = require('assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const SRC = fs.readFileSync(path.join(__dirname, '..', 'functions', 'api', '[[path]].js'), 'utf8').replace(/^export async function onRequest/m, 'async function onRequest').replace(/^import BUILD from .*$/m, 'const BUILD = {};').replace(/^import MDHW from .*$/m, () => fs.readFileSync(path.join(__dirname, '..', 'md-hw.js'), 'utf8'));
const RULES = fs.readFileSync(path.join(__dirname, '..', 'firestore.rules'), 'utf8');
let pass = 0, fail = 0; const out = [];
async function t(name, fn) { try { await fn(); pass++; out.push('PASS ' + name); } catch (e) { fail++; out.push('FAIL ' + name + ' -> ' + e.message); } }
const BASE = 'projects/p1/databases/(default)/documents/';

function boot(DB) {
  const toV = (v) => (typeof v === 'string' ? { stringValue: v } : typeof v === 'number' ? { integerValue: String(v) } : typeof v === 'boolean' ? { booleanValue: v } : { nullValue: null });
  const fromV = (v) => ('stringValue' in v ? v.stringValue : 'integerValue' in v ? +v.integerValue : 'doubleValue' in v ? v.doubleValue : 'booleanValue' in v ? v.booleanValue : null);
  const doc = (col, id) => ({ name: BASE + col + '/' + encodeURIComponent(id), fields: Object.fromEntries(Object.entries(DB[col][id]).map(([k, v]) => [k, toV(v)])), updateTime: '2026-01-01T00:00:00Z' });
  const res = (status, body) => ({ ok: status < 400, status, json: async () => body, text: async () => JSON.stringify(body) });
  const fetch = async (url, opt) => {
    opt = opt || {}; const u = String(url), m = /\/documents(.*)$/.exec(u); if (!m) return res(404, {});
    const [rest, qs] = m[1].split('?'), [, col, id] = rest.split('/').map(decodeURIComponent), meth = opt.method || 'GET';
    if (meth === 'GET' && id) return DB[col] && DB[col][id] ? res(200, doc(col, id)) : res(404, {});
    if (meth === 'GET') return res(200, { documents: Object.keys(DB[col] || {}).map((i) => doc(col, i)) });
    if (meth === 'DELETE') { if (DB[col]) delete DB[col][id]; return res(200, {}); }
    if (meth === 'PATCH') {
      DB[col] = DB[col] || {};
      if (/currentDocument\.exists=false/.test(qs || '') && DB[col][id]) return res(409, {});
      const f = JSON.parse(opt.body).fields || {}; DB[col][id] = Object.fromEntries(Object.entries(f).map(([k, v]) => [k, fromV(v)]));
      return res(200, doc(col, id));
    }
    return res(200, {});
  };
  const KV = {};
  const env = { FIREBASE_PROJECT_ID: 'p1', ADMIN_EMAIL: 'admin@x.com', TEACHERS: '',
    MD_KV: { get: async (k, ty) => (k in KV ? (ty === 'json' ? JSON.parse(KV[k]) : KV[k]) : null), put: async (k, v) => { KV[k] = v; }, delete: async (k) => { delete KV[k]; } } };
  const ctx = vm.createContext({ fetch, console: { log() {}, error() {} }, Response: class { constructor(b, o) { this.body = b; this.status = (o && o.status) || 200; } }, URL, TextEncoder, TextDecoder, crypto: globalThis.crypto, atob, btoa, setTimeout, Date, Math, JSON });
  vm.runInContext(SRC + '\n;this.T={adminRosterIds,roleOf,rosterRow};accessToken=async()=>"tok";', ctx, { filename: 'server.js' });
  return { T: ctx.T, env, DB, parse: (r) => JSON.parse(r.body) };
}
const DB0 = () => ({ roster: {
  'ok@x.com': { email: 'ok@x.com', name: 'Ok', cls: '7h' },
  'Old.One@X.com': { email: 'old.one@x.com', name: 'Old One', cls: '7h', level: 'advanced' },
  'dup@x.com': { email: 'dup@x.com', name: 'Dup', cls: '7h' }, 'DUP@x.com': { email: 'dup@x.com', name: 'Dup (copy)', cls: '9h' },
  'Bad Row': { email: 'not an email', name: 'Bad', cls: '7h' },
}, audit: {} });

(async () => {
  await t('rules fail closed: no roster/<email> row means the class check fails', async () => {
    assert.ok(/return exists\(rosterPath\(\)\) && get\(rosterPath\(\)\)/.test(RULES));
    assert.ok(!/!exists\(rosterPath\(\)\)/.test(RULES));
  });
  await t('an old-id student is not a student for the server (cannot sign in until fixed)', async () => {
    const B = boot(DB0()); assert.strictEqual(await B.T.roleOf(B.env, 'old.one@x.com'), null);
    const r = await B.T.rosterRow(B.env, 'old.one@x.com'); assert.strictEqual(r.id, 'Old.One@X.com');
  });
  await t('preview counts old ids and writes nothing', async () => {
    const DB = DB0(), B = boot(DB), before = JSON.stringify(DB), d = B.parse(await B.T.adminRosterIds(B.env, { op: 'preview' }));
    assert.strictEqual(d.roster, 5); assert.strictEqual(d.legacy, 3); assert.strictEqual(d.toMove, 1); assert.strictEqual(JSON.stringify(DB), before);
  });
  await t('apply needs MOVE', async () => { const B = boot(DB0()), r = await B.T.adminRosterIds(B.env, { op: 'apply' }); assert.strictEqual(r.status, 400); });
  await t('apply: backup first, row moved to the lower-case email with every field kept', async () => {
    const DB = DB0(), B = boot(DB), d = B.parse(await B.T.adminRosterIds(B.env, { op: 'apply', confirm: 'MOVE' }));
    assert.strictEqual(d.moved, 1); assert.ok(!DB.roster['Old.One@X.com']);
    const n = DB.roster['old.one@x.com']; assert.strictEqual(n.cls, '7h'); assert.strictEqual(n.level, 'advanced'); assert.strictEqual(n.legacyId, 'Old.One@X.com');
    const a = Object.keys(DB.audit); assert.strictEqual(a.length, 1); assert.ok(/Old\.One@X\.com/.test(DB.audit[a[0]].rows));
  });
  await t('after the fix the student signs in as a student', async () => {
    const DB = DB0(), B = boot(DB); await B.T.adminRosterIds(B.env, { op: 'apply', confirm: 'MOVE' });
    assert.strictEqual((await B.T.roleOf(B.env, 'old.one@x.com')).role, 'student');
  });
  await t('duplicate and invalid rows are left alone; running again changes nothing', async () => {
    const DB = DB0(), B = boot(DB); await B.T.adminRosterIds(B.env, { op: 'apply', confirm: 'MOVE' });
    assert.ok(DB.roster['DUP@x.com'] && DB.roster['dup@x.com'] && DB.roster['Bad Row']);
    const snap = JSON.stringify(DB.roster), d = B.parse(await B.T.adminRosterIds(B.env, { op: 'apply', confirm: 'MOVE' }));
    assert.strictEqual(d.moved, 0); assert.strictEqual(JSON.stringify(DB.roster), snap);
  });
  out.forEach((l) => console.log(l)); console.log('---- ' + pass + '/' + (pass + fail) + ' passed'); process.exit(fail ? 1 : 0);
})();
