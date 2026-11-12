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
    const db = { batch: () => ({ set() {}, commit: () => Promise.reject(new Error('permission-denied')) }), doc: (p) => ({ get: () => Promise.resolve({ exists: /^passq\//.test(p) }) }) };
    B.T.setDb(db); B.T.setConf({ asg: 'G', kind: 'day' }); B.T.usePass(); await new Promise((r) => setTimeout(r, 10));
    assert.ok(/already used your 1-day pass this month/.test(B.T.doneMsg().G)); assert.ok(!B.T.passDocsGet().some((p) => p.asgId === 'G'));
  });
  await t('app: an answer lost on the way (the pass was written) → reading it back counts as done', async () => {
    const B = boot({ hooks: HOOKS, user: { name: 'Lan', email: 'lan@x.com', role: 'student', cls: '7h' } });
    const db = { batch: () => ({ set() {}, commit: () => Promise.reject(new Error('unavailable')) }), doc: (p) => ({ get: () => Promise.resolve({ exists: /^passes\//.test(p), data: () => ({ email: 'lan@x.com', asgId: 'G', kind: 'day', month: 'x' }) }) }) };
    B.T.setDb(db); B.T.setConf({ asg: 'G', kind: 'day' }); B.T.usePass(); await new Promise((r) => setTimeout(r, 10));
    assert.ok(B.T.passDocsGet().some((p) => p.asgId === 'G')); assert.ok(!B.T.doneMsg().G);
  });
  await t('app: the Lucky Wheel extension no longer writes /passes itself (it calls /api/pass)', () => {
    const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'), f = html.slice(html.indexOf('function giveExtPass('), html.indexOf('function imgFrom('));
    assert.ok(/adPost\('pass',\{asgId:asgId,itemId:it\.id\}/.test(f) && !/dbh\.doc\('passes/.test(f));
  });
  out.forEach((l) => console.log(l)); console.log('---- ' + pass + '/' + (pass + fail) + ' passed'); if (fail) process.exitCode = 1;
})();
