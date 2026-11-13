// (11/2026) Late Pass quotas enforced outside the app:
//  - monthly passes (one 1-day + one 1-week per month, Vietnam month): the app writes pass + marker in one batch; the rules
//    (tests/rules.emu.js, emulator) refuse a second one, a missing marker, a fake month, races (exactly one wins);
//  - Lucky Wheel "1-day Extension": only POST /api/pass turns a server-recorded item (extitems) into a pass; atomic, retry-safe.
// This file: the server endpoint (real code, in-memory Firestore with update-time preconditions) and the app side.
// Run: node tests/late-pass.test.js
'use strict';
const assert = require('assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const { boot, ROOT } = require('./app-harness.js');
let pass = 0, fail = 0; const out = [];
async function t(name, fn) { try { await fn(); pass++; out.push('PASS ' + name); } catch (e) { fail++; out.push('FAIL ' + name + ' -> ' + e.message); } }
const DAY = 864e5, now = Date.now();

function server() {
  const SRC = fs.readFileSync(path.join(ROOT, 'functions', 'api', '[[path]].js'), 'utf8').replace(/^export async function onRequest/m, 'async function onRequest')
    .replace(/^import BUILD from .*$/m, 'const BUILD = {};').replace(/^import MDHW from .*$/m, () => fs.readFileSync(path.join(ROOT, 'md-hw.js'), 'utf8'));
  const DB = { extitems: {}, passes: {}, assignments: {}, roster: {} }, VER = {};
  const ctx = vm.createContext({ console: { log() {} }, Response: class { constructor(b, o) { this.body = b; this.status = (o && o.status) || 200; } }, URL, TextEncoder, TextDecoder, crypto: globalThis.crypto, atob, btoa, fetch: async () => ({ ok: false, status: 500 }) });
  vm.runInContext(SRC + `;this.T={passItem};var WHO=null,DB=null,VER=null;this.setWho=function(w){WHO=w};this.set=function(d,v){DB=d;VER=v};idUser=async function(){return WHO};
    var key=function(c,i){return c+'/'+i};
    fsGet=async function(env,col,id){var c=DB[col]||{};return c[id]?{data:JSON.parse(JSON.stringify(c[id])),updateTime:'v'+(VER[key(col,id)]||0)}:null};
    fsUpdate=async function(env,col,id,o,ut){var c=DB[col]=DB[col]||{};if(ut&&ut!=='v'+(VER[key(col,id)]||0))return false;if(!c[id]&&ut)return false;c[id]=Object.assign(c[id]||{},o);VER[key(col,id)]=(VER[key(col,id)]||0)+1;return true};
    fsCreate=async function(env,col,id,o){var c=DB[col]=DB[col]||{};if(c[id])return false;c[id]=o;VER[key(col,id)]=1;return true};
    rosterRow=async function(env,em){var r=DB.roster[em];return r?{id:em,data:r}:null};`, ctx);
  ctx.set(DB, VER);
  const call = async (body, who) => { ctx.setWho(who === undefined ? { em: 'lan@x.com', role: 'student' } : who); const r = await ctx.T.passItem({}, {}, body); return { status: r.status, d: JSON.parse(r.body) }; };
  DB.roster['lan@x.com'] = { email: 'lan@x.com', cls: '7h' };
  DB.assignments.A = { cls: '7h', start: now - 3 * DAY, due: now - 0.5 * DAY, ex: ['l1'] }; DB.assignments.B = { cls: '7h', start: now - DAY, due: now + 3 * DAY, ex: ['l1'] };
  DB.assignments.OLD = { cls: '7h', start: now - 9 * DAY, due: now - 2 * DAY, ex: ['l1'] }; DB.assignments.X9 = { cls: '9h', start: now - DAY, due: now + DAY, ex: ['l1'] };
  DB.extitems.i1 = { email: 'lan@x.com', used: false }; DB.extitems.i2 = { email: 'lan@x.com', used: false }; DB.extitems.iz = { email: 'other@x.com', used: false };
  return { DB, call };
}

(async () => {
  await t('server: a won extension becomes a 1-day pass for that homework; the item is marked used', async () => {
    const S = server(), r = await S.call({ asgId: 'A', itemId: 'i1' });
    assert.strictEqual(r.status, 200); assert.strictEqual(S.DB.passes['lan-x-com_A'].kind, 'day'); assert.strictEqual(S.DB.passes['lan-x-com_A'].item, 'i1');
    assert.strictEqual(S.DB.extitems.i1.used, true); assert.strictEqual(S.DB.extitems.i1.asgId, 'A');
  });
  await t('server: asking again with the same item and homework (retry) returns the same pass, uses nothing more', async () => {
    const S = server(); await S.call({ asgId: 'A', itemId: 'i1' }); const r = await S.call({ asgId: 'A', itemId: 'i1' });
    assert.strictEqual(r.status, 200); assert.strictEqual(r.d.again, true); assert.strictEqual(S.DB.extitems.i2.used, false);
  });
  await t('server: a used item cannot extend another homework; a homework with a pass cannot take a second one', async () => {
    const S = server(); await S.call({ asgId: 'A', itemId: 'i1' });
    let r = await S.call({ asgId: 'B', itemId: 'i1' }); assert.strictEqual(r.d.code, 'used');
    r = await S.call({ asgId: 'A', itemId: 'i2' }); assert.strictEqual(r.d.code, 'haspass'); assert.strictEqual(S.DB.extitems.i2.used, false, 'the second item is kept');
  });
  await t('server: an item the server never gave (made-up id), or another student\'s item: refused', async () => {
    const S = server(); let r = await S.call({ asgId: 'B', itemId: 'i999' }); assert.strictEqual(r.d.code, 'noitem');
    r = await S.call({ asgId: 'B', itemId: 'iz' }); assert.strictEqual(r.d.code, 'noitem'); assert.ok(!S.DB.passes['lan-x-com_B']);
  });
  await t('server: homework of another class, not sent, or where one more day is still in the past: refused', async () => {
    const S = server(); assert.strictEqual((await S.call({ asgId: 'X9', itemId: 'i1' })).d.code, 'noasg');
    assert.strictEqual((await S.call({ asgId: 'OLD', itemId: 'i1' })).d.code, 'late'); assert.strictEqual((await S.call({ asgId: 'NOPE', itemId: 'i1' })).d.code, 'noasg');
    assert.strictEqual(S.DB.extitems.i1.used, false);
  });
  await t('server: only signed-in students; the identity comes from the token, never from the request', async () => {
    const S = server(); assert.strictEqual((await S.call({ asgId: 'B', itemId: 'i1' }, null)).status, 401);
    assert.strictEqual((await S.call({ asgId: 'B', itemId: 'i1' }, { em: 't@x.com', role: 'teacher' })).status, 403);
    const r = await S.call({ asgId: 'B', itemId: 'i1', email: 'other@x.com' }); assert.ok(S.DB.passes['lan-x-com_B'] && !S.DB.passes['other-x-com_B'] && r.status === 200);
  });
  await t('server: the same item sent for two homework at the same time: exactly one pass', async () => {
    const S = server(), r = await Promise.all([S.call({ asgId: 'A', itemId: 'i1' }), S.call({ asgId: 'B', itemId: 'i1' })]);
    assert.strictEqual(r.filter((x) => x.status === 200).length, 1); assert.strictEqual(Object.keys(S.DB.passes).length, 1);
  });
  await t('server: the wheel records a won extension (extitems) before the profile', () => {
    const src = fs.readFileSync(path.join(ROOT, 'functions', 'api', '[[path]].js'), 'utf8');
    assert.ok(/if \(item\.kind === 'ext'\) await fsPut\(env, 'extitems', item\.id, \{ email: who\.em, used: false, ts: now \}\);\n    const upd = /.test(src));
  });
  // ---- app
  const HOOKS = 'vnMonth:vnMonth,passUsed:passUsed,setPass:function(p){localPass=p},setDb:function(d){dbh=d},usePass:usePass,setConf:function(c){PASSCONF=c},doneMsg:function(){return DONEMSG},passDocsGet:function(){return passDocs}';
  await t('app: the pass month is Vietnam time (UTC+7): 30 Nov 17:00 UTC is already December', () => {
    const B = boot({ hooks: HOOKS }); assert.strictEqual(B.T.vnMonth(Date.UTC(2026, 10, 30, 16, 59)), '2026-11'); assert.strictEqual(B.T.vnMonth(Date.UTC(2026, 10, 30, 17, 0)), '2026-12');
  });
  await t('app: one batch writes the pass AND the month marker (same month, ids the rules expect)', async () => {
    const B = boot({ hooks: HOOKS, user: { name: 'Lan', email: 'Lan@X.com', role: 'student', cls: '7h' } }), W = [];
    const db = { batch: () => ({ set: (r, o) => W.push([r.p, o]), commit: () => Promise.resolve() }), doc: (p) => ({ p, get: () => Promise.resolve({ exists: false }) }) };
    B.T.setDb(db); B.T.setConf({ asg: 'B', kind: 'week' }); B.T.usePass(); await new Promise((r) => setTimeout(r, 10));
    const m = B.T.vnMonth(Date.now()); assert.deepStrictEqual(W.map((x) => x[0]), ['passes/lan-x-com_B', 'passq/lan-x-com_' + m + '_week']);
    assert.strictEqual(W[0][1].month, m); assert.strictEqual(W[0][1].email, 'lan@x.com'); assert.strictEqual(W[1][1].asgId, 'B');
    assert.ok(B.T.passDocsGet().some((p) => p.asgId === 'B'));
  });
  await t('app: refused because this month\'s pass is used → clear message, no local pass', async () => {
    const B = boot({ hooks: HOOKS, user: { name: 'Lan', email: 'lan@x.com', role: 'student', cls: '7h' } });
    B.T.setPass([{ email: 'lan@x.com', asgId: 'H', kind: 'day', month: B.T.vnMonth(Date.now()) }]);
    const db = { batch: () => ({ set() {}, commit: () => Promise.reject({ code: 'permission-denied' }) }), doc: () => ({ get: () => Promise.reject({ code: 'permission-denied' }) }) };
    B.T.setDb(db); B.T.setConf({ asg: 'G', kind: 'day' }); B.T.usePass(); await new Promise((r) => setTimeout(r, 10));
    assert.ok(/already used your 1-day pass this month/.test(B.T.doneMsg().G)); assert.ok(!B.T.passDocsGet().some((p) => p.asgId === 'G'));
  });
  await t('app: an answer lost on the way (the pass arrived in the live list) → counts as done', async () => {
    const B = boot({ hooks: HOOKS, user: { name: 'Lan', email: 'lan@x.com', role: 'student', cls: '7h' } });
    const db = { batch: () => ({ set() {}, commit: () => { B.T.setPass([{ email: 'lan@x.com', asgId: 'G', kind: 'day', month: 'x' }]); return Promise.reject({ code: 'unavailable' }); } }), doc: () => ({ get: () => Promise.reject({ code: 'unavailable' }) }) };
    B.T.setDb(db); B.T.setConf({ asg: 'G', kind: 'day' }); B.T.usePass(); await new Promise((r) => setTimeout(r, 10));
    assert.ok(B.T.passDocsGet().some((p) => p.asgId === 'G')); assert.ok(!B.T.doneMsg().G);
  });
  await t('app: the Lucky Wheel extension no longer writes /passes itself (it calls /api/pass)', () => {
    const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'), f = html.slice(html.indexOf('function giveExtPass('), html.indexOf('function imgFrom('));
    assert.ok(/adPost\('pass',\{asgId:asgId,itemId:it\.id\}/.test(f) && !/dbh\.doc\('passes/.test(f));
  });
  // ---- old passes of this month (made before the quota markers): they must count toward this month
  function pmServer() {
    const SRC = fs.readFileSync(path.join(ROOT, 'functions', 'api', '[[path]].js'), 'utf8').replace(/^export async function onRequest/m, 'async function onRequest')
      .replace(/^import BUILD from .*$/m, 'const BUILD = {};').replace(/^import MDHW from .*$/m, () => fs.readFileSync(path.join(ROOT, 'md-hw.js'), 'utf8'));
    const DB = { passes: {}, passq: {}, audit: {} };
    const ctx = vm.createContext({ console: { log() {} }, Response: class { constructor(b, o) { this.body = b; this.status = (o && o.status) || 200; } }, URL, TextEncoder, TextDecoder, crypto: globalThis.crypto, atob, btoa, fetch: async () => ({ ok: false, status: 500 }) });
    vm.runInContext(SRC + `;this.T={adminPassMarkers,vnMonthOf,adminExtLegacy};var DB=null;this.set=function(d){DB=d};
      fsList=async function(env,col){var c=DB[col]||{};return Object.keys(c).map(function(k){return Object.assign({id:k},c[k])})};
      fsGet=async function(env,col,id){var c=DB[col]||{};return c[id]?{data:c[id],updateTime:'t'}:null};
      fsPut=async function(env,col,id,o){(DB[col]=DB[col]||{})[id]=o};
      fsUpdate=async function(env,col,id,o){var c=DB[col]||{};if(!c[id])return false;Object.assign(c[id],o);return true};
      fsCreate=async function(env,col,id,o){var c=DB[col]=DB[col]||{};if(c[id])return false;c[id]=o;return true};`, ctx);
    ctx.set(DB); return { DB, T: ctx.T };
  }
  await t('old passes: preview lists this month\'s day/week passes without a marker (not items, not other months); writes nothing', async () => {
    const S = pmServer(), M = S.T.vnMonthOf(Date.now());
    S.DB.passes = { a: { email: 'Lan@x.com', asgId: 'A', kind: 'week', month: M }, b: { email: 'lan@x.com', asgId: 'B', kind: 'day', month: M }, c: { email: 'lan@x.com', asgId: 'C', kind: 'day', month: '2001-01' }, d: { email: 'lan@x.com', asgId: 'D', kind: 'day', month: 'item-i1', item: 'i1' } };
    S.DB.passq['lan-x-com_' + M + '_day'] = { asgId: 'B' };
    const d = JSON.parse((await S.T.adminPassMarkers({}, { op: 'preview' })).body);
    assert.strictEqual(d.passes, 2); assert.strictEqual(d.missing, 1); assert.strictEqual(Object.keys(S.DB.passq).length, 1); assert.strictEqual(Object.keys(S.DB.audit).length, 0);
  });
  await t('old passes: apply creates only the missing marker (audit first); running it again creates nothing', async () => {
    const S = pmServer(), M = S.T.vnMonthOf(Date.now());
    S.DB.passes = { a: { email: 'lan@x.com', asgId: 'A', kind: 'week', month: M }, a2: { email: 'lan@x.com', asgId: 'A2', kind: 'week', month: M } };
    let d = JSON.parse((await S.T.adminPassMarkers({}, { op: 'apply' })).body);
    assert.strictEqual(d.created, 1); assert.strictEqual(S.DB.passq['lan-x-com_' + M + '_week'].asgId, 'A'); assert.ok(d.rows.some((r) => /second pass/.test(r.state)), 'a second old pass of the same kind is reported');
    assert.strictEqual(Object.keys(S.DB.audit).length, 1);
    d = JSON.parse((await S.T.adminPassMarkers({}, { op: 'apply' })).body); assert.strictEqual(d.created, 0);
  });
  await t('app: a refused pass when this month\'s pass of that kind is already in the list → "already used", without reading missing documents', async () => {
    const B = boot({ hooks: HOOKS, user: { name: 'Lan', email: 'lan@x.com', role: 'student', cls: '7h' } }), m = B.T.vnMonth(Date.now());
    B.T.setPass([{ email: 'lan@x.com', asgId: 'OTHER', kind: 'day', month: m }]); let reads = 0;
    const db = { batch: () => ({ set() {}, commit: () => Promise.reject({ code: 'permission-denied' }) }), doc: () => ({ get: () => { reads++; return Promise.reject({ code: 'permission-denied' }); } }) };
    B.T.setDb(db); B.T.setConf({ asg: 'G', kind: 'day' }); B.T.usePass(); await new Promise((r) => setTimeout(r, 10));
    assert.ok(/already used your 1-day pass this month/.test(B.T.doneMsg().G)); assert.strictEqual(reads, 0);
  });
  // ---- old Lucky Wheel extensions (no server record): preview counts, apply retires them only, backup first, idempotent
  function exServer() {
    const S = pmServer(); S.DB.profiles = {}; S.DB.extitems = {};
    return S;
  }
  await t('old extensions: preview counts old vs server-issued items and writes nothing; no emails / names in the reply', async () => {
    const S = pmServer();
    S.DB.profiles = { 'an-x-com': { email: 'an@x.com', inv: [{ id: 'old1', kind: 'ext', used: false }, { id: 'new1', kind: 'ext', used: false }, { id: 'u1', kind: 'ext', used: true }, { id: 'f1', kind: 'freeze', used: false }] }, 'bo-x-com': { email: 'bo@x.com', inv: [] } };
    S.DB.extitems = { new1: { email: 'an@x.com', used: false } }; S.DB.passes = { p: { email: 'an@x.com', item: true }, q: { email: 'an@x.com', item: 'new0' } };
    const SRC = fs.readFileSync(path.join(ROOT, 'functions', 'api', '[[path]].js'), 'utf8');
    const r = JSON.parse((await S.T.adminExtLegacy({}, { op: 'preview' })).body);
    assert.deepStrictEqual([r.counts.legacy, r.counts.server, r.counts.used, r.counts.itemPassesLegacy, r.counts.itemPassesServer, r.profilesToChange], [1, 1, 1, 1, 1, 1]);
    assert.ok(!/an@x\.com|an-x-com/.test(JSON.stringify(r)), 'hashed profile refs only'); assert.ok(!S.DB.audit || !Object.keys(S.DB.audit).length);
  });
  await t('old extensions: apply needs RETIRE, retires only the old item (backup first), keeps the server item and other prizes; again = nothing', async () => {
    const S = pmServer();
    S.DB.profiles = { 'an-x-com': { email: 'an@x.com', inv: [{ id: 'old1', kind: 'ext', used: false }, { id: 'new1', kind: 'ext', used: false }, { id: 'f1', kind: 'freeze', used: false }] } };
    S.DB.extitems = { new1: { email: 'an@x.com', used: false } };
    assert.strictEqual((await S.T.adminExtLegacy({}, { op: 'apply' })).status, 400);
    let r = JSON.parse((await S.T.adminExtLegacy({}, { op: 'apply', confirm: 'RETIRE' })).body);
    assert.strictEqual(r.itemsRetired, 1); const inv = S.DB.profiles['an-x-com'].inv;
    assert.ok(inv[0].used && inv[0].retired === 'legacy-ext'); assert.ok(!inv[1].used && !inv[1].retired && !inv[2].used);
    assert.strictEqual(Object.keys(S.DB.audit).length, 1); assert.ok(/old1/.test(Object.values(S.DB.audit)[0].inv));
    r = JSON.parse((await S.T.adminExtLegacy({}, { op: 'apply', confirm: 'RETIRE' })).body); assert.strictEqual(r.itemsRetired, 0);
  });
  out.forEach((l) => console.log(l)); console.log('---- ' + pass + '/' + (pass + fail) + ' passed'); if (fail) process.exitCode = 1;
})();
