// Phase C · Personal Goal: the rules (md-hw.js), the server (POST /api/goal with a fake Firestore that honours
// preconditions, and a fake clock) and the student card (real app code, tests/app-harness.js). No network.
// Run: node tests/goal.test.js
'use strict';
const assert = require('assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const H = require('../md-hw.js'), G = H.GOAL, D = 864e5, T0 = Date.UTC(2026, 0, 5, 3, 0, 0);
const { boot } = require('./app-harness.js');
let pass = 0, fail = 0; const out = [];
async function t(name, fn) { try { await fn(); pass++; out.push('PASS ' + name); } catch (e) { fail++; out.push('FAIL ' + name + ' -> ' + e.message); } }

// ---------- helpers: a goal doc and homework attempts
const goal = (o) => Object.assign({ goal: 80, first: 80, at: T0, manualUsed: false, rk: 0, bs: 0, rv: [], hist: [] }, o || {});
let seq = 0;
// one checked homework attempt: score/total, at day d after T0 (server time), for assignment asg
const att = (d, score, total, asg, o) => { const items = []; for (let i = 0; i < total; i++) items.push({ i: 'q' + i, ok: i < score ? 1 : 0 });
  return Object.assign({ email: 's@x.com', ex: 'c_r' + (seq++ % 3), asg: asg || ('a' + seq), score, total, answered: total, required: total, items, sts: T0 + d * D, ts: T0 + d * D }, o || {}); };
const EXI = (id) => (/^c_r/.test(id) ? { skill: 'reading', n: 0 } : /^c_w/.test(id) ? null : null);
// n attempts at pct % in the 30 days before review day `day`, over several assignments
const month = (day, pct, n) => { const r = []; for (let i = 0; i < (n || 4); i++) r.push(att(day - 25 + i, Math.round(pct / 10), 10, 'm' + day + '_' + (i % 2))); return r; };

(async () => {
  // ================= rules =================
  await t('initial choices: 70 75 80 85 90 95 valid; 65 72 100 and strings invalid', () => {
    [70, 75, 80, 85, 90, 95].forEach((v) => assert.ok(H.goalValid(v), v));
    [65, 72, 100, 0, -5, '80', NaN, null].forEach((v) => assert.ok(!H.goalValid(v), String(v)));
  });
  await t('manual change: day 29 refused (early), day 30 allowed', () => {
    assert.strictEqual(H.goalManual(goal(), 85, T0 + 29 * D + D - 1).code, 'early');
    assert.ok(H.goalManual(goal(), 85, T0 + 30 * D).ok);
  });
  await t('manual change: at most ±10, 5-point steps, inside 70–95, not the same value', () => {
    const g = goal(), n = T0 + 31 * D;
    assert.ok(H.goalManual(g, 90, n).ok); assert.ok(H.goalManual(g, 70, n).ok);
    assert.strictEqual(H.goalManual(g, 95, n).code, 'range'); assert.strictEqual(H.goalManual(g, 82, n).code, 'invalid');
    assert.strictEqual(H.goalManual(g, 80, n).code, 'same');
    assert.strictEqual(H.goalManual(goal({ goal: 95 }), 100, n).code, 'invalid'); assert.strictEqual(H.goalManual(goal({ goal: 70 }), 65, n).code, 'invalid');
    assert.deepStrictEqual(H.goalOptions(g, n), [70, 75, 85, 90]); assert.deepStrictEqual(H.goalOptions(g, T0 + D), []);
  });
  await t('manual change: once per rolling 30 days from the last manual change (cooldown, exact boundary)', () => {
    const g = goal({ goal: 85, mt: T0 + 31 * D, manualUsed: true });
    assert.strictEqual(H.goalManual(g, 90, T0 + 61 * D - 1).code, 'cooldown');
    assert.strictEqual(H.goalManual(g, 90, T0 + 61 * D - 1).from, T0 + 61 * D);
    assert.ok(H.goalManual(g, 90, T0 + 61 * D).ok, 'exactly 30 days later = allowed');
    assert.deepStrictEqual(H.goalOptions(g, T0 + 40 * D), []);
  });
  await t('day 31 (first change allowed), day 29 (early), records from the old one-time rule (manualUsed + mt) follow the cooldown', () => {
    assert.ok(H.goalManual(goal(), 75, T0 + 31 * D).ok);
    assert.strictEqual(H.goalManual(goal(), 75, T0 + 29 * D).code, 'early');
    const old = goal({ manualUsed: true, mt: T0 + 35 * D });
    assert.strictEqual(H.goalManual(old, 85, T0 + 50 * D).code, 'cooldown'); assert.ok(H.goalManual(old, 85, T0 + 65 * D).ok);
  });
  await t('automatic reviews never use or refill the manual allowance (cooldown unchanged by a review)', () => {
    const g = goal({ mt: T0 + 50 * D }), r = H.goalReview(g, month(60, 95), EXI, T0 + 61 * D);
    assert.strictEqual(r.g.mt, T0 + 50 * D); assert.strictEqual(H.goalManual(r.g, 80, T0 + 61 * D).code, 'cooldown');
  });
  await t('no automatic review before day 60; review 1 at day 60, review 2 at day 90 (30-day steps)', () => {
    assert.strictEqual(H.goalReview(goal(), [], EXI, T0 + 60 * D - 1).done.length, 0);
    const r1 = H.goalReview(goal(), [], EXI, T0 + 60 * D); assert.strictEqual(r1.done.length, 1); assert.strictEqual(r1.done[0].day, 60);
    const r2 = H.goalReview(r1.g, [], EXI, T0 + 89 * D); assert.strictEqual(r2.done.length, 0);
    const r3 = H.goalReview(r1.g, [], EXI, T0 + 90 * D); assert.strictEqual(r3.done[0].day, 90); assert.strictEqual(r3.g.rk, 2);
  });
  await t('long inactive account: catches up every missed review in order, once (running again adds nothing)', () => {
    const r = H.goalReview(goal(), [], EXI, T0 + 365 * D);
    assert.deepStrictEqual(r.done.map((x) => x.day), [60, 90, 120, 150, 180, 210, 240, 270, 300, 330, 360]);
    assert.strictEqual(H.goalReview(r.g, [], EXI, T0 + 365 * D).done.length, 0);
    assert.strictEqual(r.g.goal, 80, 'no evidence = hold every time');
  });
  await t('evidence: zero or too little = hold, never counted as a month below the goal', () => {
    const few = month(60, 30, 3), r = H.goalReview(goal(), few, EXI, T0 + 60 * D);
    assert.strictEqual(r.done[0].verdict, 'insufficient'); assert.strictEqual(r.g.goal, 80); assert.strictEqual(r.g.bs, 0);
    const oneAsg = [att(40, 3, 10, 'x'), att(41, 3, 10, 'x'), att(42, 3, 10, 'x'), att(43, 3, 10, 'x')];
    assert.strictEqual(H.goalReview(goal(), oneAsg, EXI, T0 + 60 * D).done[0].verdict, 'insufficient', 'needs 2 assignments');
  });
  await t('evidence left out: Writing / Speaking, free practice, incomplete, legacy (no server time), test data, numbers that do not add up, retries', () => {
    const base = att(40, 9, 10, 'A');
    const rows = [base,
      att(41, 10, 10, 'B', { kind: 'submission' }), att(42, 10, 10, null, { asg: '' }), att(43, 10, 10, 'C', { answered: 7 }),
      att(44, 10, 10, 'D', { sts: null }), att(45, 10, 10, 'E', { seeded: true }), att(46, 10, 10, 'F', { score: 10, items: [{ i: 'a', ok: 0 }] }),
      att(47, 10, 10, 'A', { ex: base.ex }), att(48, 10, 10, 'G', { ex: 'c_w1' })];
    const s = H.goalSample(rows, T0 + 30 * D, T0 + 60 * D, EXI);
    assert.strictEqual(s.n, 1, JSON.stringify(s.excluded)); assert.strictEqual(s.samples[0].score, 9, 'the FIRST attempt of A counts, not the retry');
    ['writing / speaking', 'not homework', 'incomplete', 'no server time', 'test data', 'numbers do not add up', 'retry of the same homework', 'not a checked Reading / Listening exercise'].forEach((k) => assert.ok(s.excluded[k] >= 1, k));
  });
  await t('only the 30 days before the review count (older or newer work ignored)', () => {
    const s = H.goalSample([att(10, 10, 10), att(61, 10, 10), att(35, 10, 10)], T0 + 30 * D, T0 + 60 * D, EXI);
    assert.strictEqual(s.n, 1);
  });
  await t('raise: sufficient evidence clearly above the goal → +5 only; never above 95', () => {
    const r = H.goalReview(goal(), month(60, 95), EXI, T0 + 60 * D);
    assert.strictEqual(r.done[0].verdict, 'above'); assert.strictEqual(r.g.goal, 85); assert.strictEqual(r.done[0].act, 'raise');
    const top = H.goalReview(goal({ goal: 95 }), month(60, 100), EXI, T0 + 60 * D); assert.strictEqual(top.g.goal, 95); assert.strictEqual(top.done[0].act, 'hold');
  });
  await t('one month below the goal: no change', () => {
    const r = H.goalReview(goal(), month(60, 50), EXI, T0 + 60 * D);
    assert.strictEqual(r.done[0].verdict, 'below'); assert.strictEqual(r.g.goal, 80); assert.strictEqual(r.g.bs, 1);
  });
  await t('two consecutive sufficiently sampled months below → −5 only; never below 70', () => {
    const r = H.goalReview(goal(), month(60, 50).concat(month(90, 50)), EXI, T0 + 90 * D);
    assert.deepStrictEqual(r.done.map((x) => x.act), ['hold', 'lower']); assert.strictEqual(r.g.goal, 75); assert.strictEqual(r.g.bs, 0);
    const bottom = H.goalReview(goal({ goal: 70 }), month(60, 20).concat(month(90, 20)), EXI, T0 + 90 * D); assert.strictEqual(bottom.g.goal, 70);
  });
  await t('below, then a month with too little evidence, then below: no decrease (the run is broken)', () => {
    const r = H.goalReview(goal(), month(60, 50).concat(month(120, 50)), EXI, T0 + 120 * D);
    assert.deepStrictEqual(r.done.map((x) => x.verdict), ['below', 'insufficient', 'below']); assert.strictEqual(r.g.goal, 80);
  });
  await t('raise boundary: mean exactly goal + 5 with exactly 75 % at or above goal → raise; 74.9 → no; 3/4 vs 2/4 at goal', () => {
    const mk = (pcts) => pcts.map((p, i) => att(36 + i, p, 100, 'b' + (i % 2)));
    assert.strictEqual(H.goalJudge(H.goalSample(mk([90, 90, 90, 70]), T0 + 30 * D, T0 + 60 * D, EXI), 80), 'above', 'mean 85, 3 of 4 >= 80');
    assert.strictEqual(H.goalJudge(H.goalSample(mk([100, 100, 70, 70]), T0 + 30 * D, T0 + 60 * D, EXI), 80), 'within', 'mean 85 but only 2 of 4 >= 80');
    assert.strictEqual(H.goalJudge(H.goalSample(mk([90, 90, 90, 69]), T0 + 30 * D, T0 + 60 * D, EXI), 80), 'within', 'mean 84.75');
    assert.strictEqual(H.goalJudge(H.goalSample(mk([80, 80, 80, 80]), T0 + 30 * D, T0 + 60 * D, EXI), 80), 'within', 'at goal exactly = kept');
  });
  await t('lower boundary: mean exactly goal − 5 is NOT below; strictly below is', () => {
    const mk = (pcts) => pcts.map((p, i) => att(36 + i, p, 100, 'c' + (i % 2)));
    assert.strictEqual(H.goalJudge(H.goalSample(mk([75, 75, 75, 75]), T0 + 30 * D, T0 + 60 * D, EXI), 80), 'within');
    assert.strictEqual(H.goalJudge(H.goalSample(mk([75, 75, 75, 74]), T0 + 30 * D, T0 + 60 * D, EXI), 80), 'below');
  });
  await t('mean = average of the attempt percentages (not pooled questions): 10/10 and 1/2 → 75 %', () => {
    const s = H.goalSample([att(36, 10, 10, 'x'), att(37, 1, 2, 'y')], T0 + 30 * D, T0 + 60 * D, EXI);
    assert.strictEqual(s.mean, 75); assert.notStrictEqual(s.pooled, 75);
  });
  await t('window boundaries: an attempt exactly at day 60 belongs to the NEXT review, day 60 − 1 ms to this one (counted once)', () => {
    const a = att(0, 9, 10, 'w'); a.sts = T0 + 60 * D; const b = att(0, 9, 10, 'w2'); b.sts = T0 + 60 * D - 1;
    assert.strictEqual(H.goalSample([a, b], T0 + 30 * D, T0 + 60 * D, EXI).n, 1);
    assert.strictEqual(H.goalSample([a, b], T0 + 60 * D, T0 + 90 * D, EXI).n, 1);
  });
  await t('a manual change resets a run of low reviews; the next review compares with the new goal', () => {
    const r1 = H.goalReview(goal(), month(60, 50), EXI, T0 + 61 * D); assert.strictEqual(r1.g.bs, 1);
    const g2 = Object.assign({}, r1.g, { goal: 70, mt: T0 + 62 * D, bs: 0 });
    const r2 = H.goalReview(g2, month(90, 50), EXI, T0 + 91 * D); assert.strictEqual(r2.done[0].prev, 70); assert.strictEqual(r2.g.goal, 70, 'floor');
  });
  await t('stale timestamps: attempts with no server time or with times outside the window never count', () => {
    const s = H.goalSample([att(40, 9, 10, 'a', { sts: 'garbage' }), att(40, 9, 10, 'b', { sts: T0 - 400 * D })], T0 + 30 * D, T0 + 60 * D, EXI);
    assert.strictEqual(s.n, 0);
  });
  await t('one bad homework does not lower the goal (a month close to the goal is "within")', () => {
    const rows = month(60, 80); rows[0] = att(36, 2, 10, 'm60_0');
    const r = H.goalReview(goal(), rows, EXI, T0 + 60 * D); assert.notStrictEqual(r.done[0].act, 'lower');
  });
  await t('review history is auditable: window, sample size, verdict, previous / new goal', () => {
    const r = H.goalReview(goal(), month(60, 95), EXI, T0 + 60 * D).done[0];
    ['k', 'day', 'from', 'to', 'n', 'asgs', 'pooled', 'verdict', 'act', 'prev', 'next', 'excl'].forEach((k) => assert.ok(k in r, k));
    assert.strictEqual(r.to - r.from, 30 * D);
  });

  // ================= server =================
  const SRC = fs.readFileSync(path.join(__dirname, '..', 'functions', 'api', '[[path]].js'), 'utf8').replace(/^export async function onRequest/m, 'async function onRequest').replace(/^import BUILD from .*$/m, 'const BUILD = {};').replace(/^import MDHW from .*$/m, () => fs.readFileSync(path.join(__dirname, '..', 'md-hw.js'), 'utf8').replace('(typeof self !== \'undefined\' ? self : this)', '(globalThis)') + '\nconst MDHW = globalThis.MDHW;');
  const BASE = 'projects/p1/databases/(default)/documents/';
  const toV = (v) => (v === null || v === undefined ? { nullValue: null } : typeof v === 'string' ? { stringValue: v } : typeof v === 'boolean' ? { booleanValue: v } : typeof v === 'number' ? (Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v }) : Array.isArray(v) ? { arrayValue: { values: v.map(toV) } } : { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, toV(x)])) } });
  const fromV = (v) => ('nullValue' in v ? null : 'stringValue' in v ? v.stringValue : 'booleanValue' in v ? v.booleanValue : 'integerValue' in v ? +v.integerValue : 'doubleValue' in v ? v.doubleValue : 'arrayValue' in v ? (v.arrayValue.values || []).map(fromV) : 'mapValue' in v ? Object.fromEntries(Object.entries(v.mapValue.fields || {}).map(([k, x]) => [k, fromV(x)])) : null);
  function server(DB, clock, who) {
    let ver = 1; const UT = {};
    const doc = (col, id) => ({ name: BASE + col + '/' + encodeURIComponent(id), fields: Object.fromEntries(Object.entries(DB[col][id]).map(([k, v]) => [k, toV(v)])), updateTime: 'v' + (UT[col + '/' + id] || 0) });
    const res = (status, body) => ({ ok: status < 400, status, json: async () => body, text: async () => JSON.stringify(body) });
    const fetch = async (url, o) => {
      o = o || {}; const m = /\/documents(.*)$/.exec(String(url)); if (!m) return res(404, {});
      const [rest, qs] = m[1].split('?'), meth = o.method || 'GET';
      await new Promise((r) => setImmediate(r)); // let concurrent calls interleave
      if (rest === ':runQuery') { const q = JSON.parse(o.body).structuredQuery, col = q.from[0].collectionId, f = q.where.fieldFilter;
        return res(200, Object.keys(DB[col] || {}).filter((id) => DB[col][id][f.field.fieldPath] === f.value.stringValue).map((id) => ({ document: doc(col, id) }))); }
      const [, col, id] = rest.split('/').map(decodeURIComponent), key = col + '/' + id;
      if (meth === 'GET') return DB[col] && DB[col][id] ? res(200, doc(col, id)) : res(404, {});
      if (meth === 'PATCH') {
        DB[col] = DB[col] || {};
        if (/currentDocument\.exists=false/.test(qs || '') && DB[col][id]) return res(409, {});
        const pre = /currentDocument\.updateTime=([^&]+)/.exec(qs || ''); if (pre && decodeURIComponent(pre[1]) !== 'v' + (UT[key] || 0)) return res(412, {});
        const f = Object.fromEntries(Object.entries(JSON.parse(o.body).fields || {}).map(([k, v]) => [k, fromV(v)]));
        const mask = [...(qs || '').matchAll(/updateMask\.fieldPaths=([^&]+)/g)].map((x) => decodeURIComponent(x[1]));
        DB[col][id] = mask.length ? Object.assign({}, DB[col][id], f) : f; UT[key] = ++ver; return res(200, doc(col, id));
      }
      return res(200, {});
    };
    class FD extends Date { constructor(...a) { super(...(a.length ? a : [clock.now])); } static now() { return clock.now; } }
    const KV = {};
    const env = { FIREBASE_PROJECT_ID: 'p1', ADMIN_EMAIL: 'admin@x.com', TEACHERS: '', MD_KV: { get: async (k) => KV[k] || null, put: async (k, v) => { KV[k] = v; }, delete: async (k) => { delete KV[k]; } } };
    const ctx = vm.createContext({ fetch, console: { log() {}, error() {} }, Response: class { constructor(b, o) { this.body = b; this.status = (o && o.status) || 200; } }, URL, TextEncoder, TextDecoder, crypto: globalThis.crypto, atob, btoa, setTimeout, Date: FD, Math, JSON });
    ctx.globalThis = ctx;
    vm.runInContext(SRC + '\n;accessToken=async()=>"tok";idUser=async()=>WHO.v;this.T={goalApi};', Object.assign(ctx, { WHO: who }), { filename: 'server.js' });
    const call = async (body) => { const r = await ctx.T.goalApi(env, {}, body); return { status: r.status, d: JSON.parse(r.body) }; };
    return { call, DB, KV };
  }
  const DB0 = () => ({ roster: { 's@x.com': { email: 's@x.com', name: 'S', cls: '7h' } }, goals: {}, attempts: {}, exercises: { r0: { skill: 'reading', qs: [] }, r1: { skill: 'reading', qs: [] }, r2: { skill: 'reading', qs: [] } } });
  const STU = { v: { em: 's@x.com', role: 'student' } };

  await t('server: set 80 with commitment → saved with server time; set again (other value) keeps the first choice', async () => {
    const clock = { now: T0 }, S = server(DB0(), clock, STU);
    const a = await S.call({ op: 'set', goal: 80, commit: true }); assert.strictEqual(a.status, 200); assert.strictEqual(a.d.goal.goal, 80);
    assert.strictEqual(S.DB.goals['s-x-com'].at, T0); assert.strictEqual(S.DB.goals['s-x-com'].hist[0].type, 'initial');
    clock.now += 5 * D; const b = await S.call({ op: 'set', goal: 95, commit: true });
    assert.strictEqual(b.d.again, true); assert.strictEqual(b.d.goal.goal, 80); assert.strictEqual(S.DB.goals['s-x-com'].at, T0, 'activation never reset');
  });
  await t('server: invalid value (72, 100), missing commitment → refused, nothing saved', async () => {
    const S = server(DB0(), { now: T0 }, STU);
    assert.strictEqual((await S.call({ op: 'set', goal: 72, commit: true })).status, 400);
    assert.strictEqual((await S.call({ op: 'set', goal: 100, commit: true })).status, 400);
    assert.strictEqual((await S.call({ op: 'set', goal: 80 })).d.code, 'commit');
    assert.deepStrictEqual(S.DB.goals, {});
  });
  await t('server: two tabs set at the same time → one goal (the first), the other gets it back', async () => {
    const S = server(DB0(), { now: T0 }, STU);
    const [a, b] = await Promise.all([S.call({ op: 'set', goal: 75, commit: true }), S.call({ op: 'set', goal: 90, commit: true })]);
    const g = S.DB.goals['s-x-com'].goal; assert.ok(g === 75 || g === 90); assert.strictEqual(a.d.goal.goal, g); assert.strictEqual(b.d.goal.goal, g);
  });
  await t('server: get before any goal = null (onboarding); refresh / another device = same goal', async () => {
    const S = server(DB0(), { now: T0 }, STU);
    assert.strictEqual((await S.call({ op: 'get' })).d.goal, null);
    await S.call({ op: 'set', goal: 85, commit: true });
    assert.strictEqual((await S.call({ op: 'get' })).d.goal.goal, 85);
  });
  await t('server: manual change day 29 refused, day 30 allowed, a second one inside 30 days refused, allowed again after 30 days', async () => {
    const clock = { now: T0 }, S = server(DB0(), clock, STU); await S.call({ op: 'set', goal: 80, commit: true });
    clock.now = T0 + 29 * D; assert.strictEqual((await S.call({ op: 'adjust', goal: 85 })).d.code, 'early');
    clock.now = T0 + 30 * D; const ok = await S.call({ op: 'adjust', goal: 90, reason: 'feeling confident' }); assert.strictEqual(ok.status, 200); assert.strictEqual(ok.d.goal.goal, 90);
    const h = S.DB.goals['s-x-com'].hist.slice(-1)[0]; assert.deepStrictEqual([h.from, h.to, h.by, h.type], [80, 90, 'student', 'manual']);
    assert.strictEqual(ok.d.goal.nextManual, T0 + 60 * D);
    clock.now = T0 + 59 * D; assert.strictEqual((await S.call({ op: 'adjust', goal: 85 })).d.code, 'cooldown'); assert.strictEqual(S.DB.goals['s-x-com'].goal, 90);
    clock.now = T0 + 60 * D + 1; const again = await S.call({ op: 'adjust', goal: 95 }); assert.strictEqual(again.status, 200); assert.strictEqual(S.DB.goals['s-x-com'].mc, 2);
    assert.strictEqual(again.d.goal.nextManual, T0 + 90 * D + 1);
  });
  await t('server: a login / get / class change never moves the cooldown', async () => {
    const clock = { now: T0 }, DB = DB0(), S = server(DB, clock, STU); await S.call({ op: 'set', goal: 80, commit: true });
    clock.now = T0 + 31 * D; await S.call({ op: 'adjust', goal: 85 }); const mt = DB.goals['s-x-com'].mt;
    DB.roster['s@x.com'].cls = '9h'; clock.now = T0 + 40 * D; await S.call({ op: 'get' }); await S.call({ op: 'get' });
    assert.strictEqual(DB.goals['s-x-com'].mt, mt); assert.strictEqual((await S.call({ op: 'adjust', goal: 90 })).d.code, 'cooldown');
  });
  await t('server: review due and manual change in the same request → review first with the old goal; the student view (base) mismatch is refused, nothing compounds', async () => {
    const clock = { now: T0 }, DB = DB0(), S = server(DB, clock, STU); await S.call({ op: 'set', goal: 80, commit: true });
    month(60, 95).forEach((a, i) => { DB.attempts['m' + i] = a; });
    clock.now = T0 + 61 * D;
    const r = await S.call({ op: 'adjust', goal: 90, base: 80 }); // the student was still looking at 80
    assert.strictEqual(r.d.code, 'changed'); assert.strictEqual(DB.goals['s-x-com'].goal, 85, 'only the review happened'); assert.strictEqual(DB.goals['s-x-com'].rk, 1);
    assert.ok(!DB.goals['s-x-com'].mt, 'manual allowance not used');
    const r2 = await S.call({ op: 'adjust', goal: 90, base: 85 }); assert.strictEqual(r2.status, 200); assert.strictEqual(DB.goals['s-x-com'].goal, 90);
    assert.strictEqual(DB.goals['s-x-com'].rk, 1, 'the review is not run twice');
  });
  await t('server: two tabs change the goal at the same time → only one change', async () => {
    const clock = { now: T0 }, S = server(DB0(), clock, STU); await S.call({ op: 'set', goal: 80, commit: true }); clock.now = T0 + 31 * D;
    const r = await Promise.all([S.call({ op: 'adjust', goal: 90 }), S.call({ op: 'adjust', goal: 70 })]);
    assert.deepStrictEqual(r.map((x) => x.status).sort(), [200, 409]); assert.strictEqual(S.DB.goals['s-x-com'].hist.filter((h) => h.type === 'manual').length, 1);
    assert.ok(r.some((x) => x.d.code === 'cooldown'));
  });
  await t('server: review is lazy, catches up, and runs once even with two tabs (no double shift)', async () => {
    const clock = { now: T0 }, DB = DB0(), S = server(DB, clock, STU); await S.call({ op: 'set', goal: 80, commit: true });
    month(60, 95).forEach((a, i) => { DB.attempts['a' + i] = a; });
    clock.now = T0 + 61 * D;
    const [a, b] = await Promise.all([S.call({ op: 'get' }), S.call({ op: 'get' })]);
    assert.strictEqual(DB.goals['s-x-com'].goal, 85, 'raised once, by 5'); assert.strictEqual(DB.goals['s-x-com'].rk, 1);
    assert.strictEqual(a.d.goal.goal, 85); assert.strictEqual(b.d.goal.goal, 85);
    assert.strictEqual((await S.call({ op: 'get' })).d.reviewed, 0);
  });
  await t('server: teacher, assistant or no roster row → refused; expired / kicked session → 401', async () => {
    assert.strictEqual((await server(DB0(), { now: T0 }, { v: { em: 't@x.com', role: 'teacher' } }).call({ op: 'get' })).status, 403);
    assert.strictEqual((await server(DB0(), { now: T0 }, { v: { em: 'a@x.com', role: 'assistant' } }).call({ op: 'get' })).status, 403);
    assert.strictEqual((await server(DB0(), { now: T0 }, { v: { em: 'gone@x.com', role: 'student' } }).call({ op: 'get' })).d.code, 'noroster');
    assert.strictEqual((await server(DB0(), { now: T0 }, { v: null }).call({ op: 'get' })).status, 401);
  });
  await t('server: a student only ever touches goals/<own slug> (no email / id in the request is used)', async () => {
    const S = server(DB0(), { now: T0 }, STU);
    await S.call({ op: 'set', goal: 80, commit: true, email: 'other@x.com', id: 'other-x-com' });
    assert.deepStrictEqual(Object.keys(S.DB.goals), ['s-x-com']);
  });
  await t('server: Kick deletes the goal with the rest of the learning data', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'functions', 'api', '[[path]].js'), 'utf8');
    assert.ok(/const PURGE_COLS = \[[^\]]*'goals'/.test(src));
  });

  // ================= app =================
  const HK = 'pgHTML:pgHTML,pgLoad:pgLoad,get PG(){return PG},passPct:passPct';
  const stu = { name: 'S', email: 's@x.com', role: 'student', cls: '7h' };
  await t('app: onboarding = 6 choices, commitment, PASS 70 % stated apart; Set is disabled until both chosen', async () => {
    const B = boot({ hooks: HK, user: stu }); B.W.reply = () => ({ status: 200, body: { ok: true, goal: null } });
    B.T.pgLoad(true); await B.flush(); const h = B.T.pgHTML();
    assert.strictEqual((h.match(/data-act="pg-pick"/g) || []).length, 6); assert.ok(/PASS is always <b>70%<\/b>/.test(h)); assert.ok(/data-act="pg-set" disabled/.test(h));
    B.press({ act: 'pg-pick', v: '85' }); assert.ok(/data-act="pg-set" disabled/.test(B.T.pgHTML()), 'still needs the commitment');
    B.press({ act: 'pg-commit' }); const h2 = B.T.pgHTML(); assert.ok(/Set my goal: 85%/.test(h2) && !/data-act="pg-set" disabled/.test(h2));
  });
  await t('app: Set sends {op:set, goal, commit:true} with the sign-in header; the card then shows the goal', async () => {
    const B = boot({ hooks: HK, user: stu }); let sent = null;
    B.W.reply = (url, o) => { const b = JSON.parse(o.body); if (b.op === 'set') { sent = b; return { status: 200, body: { ok: true, goal: { goal: 85, first: 85, at: T0, days: 0, manualUsed: false, lockUntil: T0 + 30 * D, options: [], nextReview: { k: 1, day: 60, at: T0 + 60 * D }, reviews: [], hist: [], minSamples: 4, minAsgs: 2 } } }; } return { status: 200, body: { ok: true, goal: null } }; };
    B.T.pgLoad(true); await B.flush(); B.press({ act: 'pg-pick', v: '85' }); B.press({ act: 'pg-commit' }); B.press({ act: 'pg-set' }); await B.flush();
    assert.deepStrictEqual(sent, { op: 'set', goal: 85, commit: true }); assert.ok(/\/api\/goal$/.test(B.W.calls.slice(-1)[0].url));
    const h = B.T.pgHTML(); assert.ok(/My goal <b class="pgv">85%<\/b>/.test(h) && /PASS 70%/.test(h)); assert.ok(!/Change my goal/.test(h), 'locked for 30 days');
  });
  await t('app: network failure → clear message + Try again; homework is not blocked', async () => {
    const B = boot({ hooks: HK, user: stu }); B.W.fetch = () => Promise.reject(new Error('offline'));
    B.T.pgLoad(true); await B.flush(); const h = B.T.pgHTML();
    assert.ok(/could not be loaded\. Homework still works/.test(h) && /data-act="pg-retry"/.test(h));
  });
  await t('app: after day 30 the one change offers only allowed values (server list) and asks to confirm', async () => {
    const B = boot({ hooks: HK, user: stu }), now = Date.now();
    B.W.reply = () => ({ status: 200, body: { ok: true, goal: { goal: 80, first: 80, at: now - 40 * D, days: 40, lockUntil: now - 10 * D, nextManual: now - 10 * D, options: [70, 75, 85, 90], nextReview: { k: 1, day: 60, at: now + 20 * D }, reviews: [], hist: [], minSamples: 4, minAsgs: 2 } } });
    B.T.pgLoad(true); await B.flush(); B.press({ act: 'pg-open' }); const h = B.T.pgHTML();
    assert.deepStrictEqual((h.match(/data-act="pg-adjv" data-v="(\d+)"/g) || []).map((x) => +x.match(/\d+/)[0]), [70, 75, 85, 90]);
    B.press({ act: 'pg-adjv', v: '90' }); B.press({ act: 'pg-adj' }); assert.ok(/Change your goal to 90%\?/.test(B.asking()));
    let sent = null; B.W.reply = (u, o) => { sent = JSON.parse(o.body); return { status: 200, body: { ok: true, goal: null } }; };
    B.ok(); await B.flush(); assert.deepStrictEqual(sent, { op: 'adjust', goal: 90, base: 80 }, 'sends the goal the student was looking at');
  });
  await t('app: inside the cooldown the card shows the next date and no Change button', async () => {
    const B = boot({ hooks: HK, user: stu }), now = Date.now();
    B.W.reply = () => ({ status: 200, body: { ok: true, goal: { goal: 85, first: 80, at: now - 45 * D, days: 45, lockUntil: now - 15 * D, lastManual: now - 5 * D, nextManual: now + 25 * D, options: [], nextReview: { k: 1, day: 60, at: now + 15 * D }, reviews: [], hist: [], minSamples: 4, minAsgs: 2 } } });
    B.T.pgLoad(true); await B.flush(); const h = B.T.pgHTML();
    assert.ok(/You can change your goal from /.test(h) && !/data-act="pg-open"/.test(h));
  });
  await t('PASS stays 70 % whatever the goal (goal 95: 72 % passes; goal 70: 68 % does not)', async () => {
    const B = boot({ hooks: HK, user: stu }); B.W.reply = () => ({ status: 200, body: { ok: true, goal: { goal: 95, first: 95, at: T0, days: 1, manualUsed: false, lockUntil: T0 + 30 * D, options: [], nextReview: { k: 1, day: 60, at: T0 + 60 * D }, reviews: [], hist: [] } } });
    B.T.pgLoad(true); await B.flush(); assert.strictEqual(B.T.PG.g.goal, 95);
    assert.strictEqual(B.T.passPct(72, 100), true); assert.strictEqual(B.T.passPct(68, 100), false);
    const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
    assert.ok(!/passPct\([^)]*PG\.|PG\.g\.goal[^;]{0,40}passPct|asgEval\([^)]*goal/.test(html), 'the goal is never used in pass / homework maths');
  });
  await t('teachers / assistants never see the onboarding card', () => {
    assert.strictEqual(boot({ hooks: HK }).T.pgHTML(), '');
    assert.strictEqual(boot({ hooks: HK, user: { name: 'H', email: 'h@x.com', role: 'assistant' } }).T.pgHTML(), '');
  });

  out.forEach((l) => console.log(l)); console.log('---- ' + pass + '/' + (pass + fail) + ' passed'); if (fail) process.exitCode = 1;
})();
