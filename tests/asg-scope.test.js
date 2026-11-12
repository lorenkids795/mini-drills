// (11/2026) Assignment-scoped deadlines: each assignment occurrence has its own window [send date, deadline + late pass].
// The owner's scenarios: A (closed long ago) and B (open) both contain exercise X; Late Pass active / ended; X in A and B at
// the same time; mixed Library + external; class change; legacy attempts without a link are flagged, never guessed.
// Teacher (app) and Homework Assistant (server) must agree. Real app script + real server code, no network.
// Rules (server time, refusing a linked attempt after the window) are tested on the emulator: tests/rules.emu.js.
// Run: node tests/asg-scope.test.js
'use strict';
const assert = require('assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const { boot, ROOT } = require('./app-harness.js');
const H = require(path.join(ROOT, 'md-hw.js'));
let pass = 0, fail = 0; const out = [];
async function t(name, fn) { try { await fn(); pass++; out.push('PASS ' + name); } catch (e) { fail++; out.push('FAIL ' + name + ' -> ' + e.message); } }
const DAY = 864e5, now = Date.now(), X = 'l1';
const A = { id: 'A', cls: '7h', name: 'Old homework', start: now - 120 * DAY, due: now - 100 * DAY, ex: [X] };
const B = { id: 'B', cls: '7h', name: 'New homework', start: now - DAY, due: now + 6 * DAY, ex: [X] };
const LAN = { email: 'lan@x.com', name: 'Lan', cls: '7h', role: 'student' };
const full = (o) => Object.assign({ email: 'lan@x.com', cls: '7h', ex: X, score: 5, total: 5, answered: 5, required: 5 }, o);
const HOOKS = 'setAsg:function(a){localAsg=a},setRoster:function(r){rosterDocs=r},setAttempts:function(a){localAttempts=a},getAttempts:function(){return localAttempts},' +
  'setPass:function(p){localPass=p},setHw:function(h){localHwdone=h},asgState:asgState,exCtx:exCtx,ctxBarHTML:ctxBarHTML,saveAttempt:saveAttempt,' +
  'setNav:function(n){NAV=n},getNav:function(){return NAV},getP:function(){return PCTX},setP:function(v){PCTX=v},homeworkHTML:homeworkHTML,extHwHTML:extHwHTML,hwMatrixHTML:hwMatrixHTML,openX:function(k){HWX[k]=true}';
function app(asgs, atts, passes, user) {
  const b = boot({ hooks: HOOKS, user: user || { name: 'Lan', email: 'lan@x.com', role: 'student', cls: '7h' } });
  b.T.setRoster([LAN]); b.T.setAsg(asgs); b.T.setAttempts(atts || []); b.T.setPass(passes || []); return b;
}
function server() {
  const SRC = fs.readFileSync(path.join(ROOT, 'functions', 'api', '[[path]].js'), 'utf8').replace(/^export async function onRequest/m, 'async function onRequest')
    .replace(/^import BUILD from .*$/m, 'const BUILD = {};').replace(/^import MDHW from .*$/m, () => fs.readFileSync(path.join(ROOT, 'md-hw.js'), 'utf8'));
  const KV = { assist: JSON.stringify({ 'as@x.com': { name: 'As', classes: ['7h'] } }) }, DB = { roster: {}, assignments: {}, attempts: {}, hwdone: {}, passes: {}, classes: {}, hwnotes: {}, exercises: {} };
  const env = { MD_KV: { get: async (k, ty) => (k in KV ? (ty === 'json' ? JSON.parse(KV[k]) : KV[k]) : null), put: async (k, v) => { KV[k] = v; }, delete: async (k) => { delete KV[k]; } } };
  const ctx = vm.createContext({ console: { log() {} }, Response: class { constructor(b, o) { this.body = b; this.status = (o && o.status) || 200; this.headers = (o && o.headers) || {}; } }, URL, TextEncoder, TextDecoder, crypto: globalThis.crypto, atob, btoa, fetch: async () => ({ ok: false, status: 500 }) });
  vm.runInContext(SRC + `;this.T={hwaData};idUser=async function(){return {em:'as@x.com',role:'assistant'}};var DB=null;this.setDB=function(d){DB=d};
    fsGet=async function(env,col,id){var c=DB[col]||{};return c[id]?{data:c[id],updateTime:'t'}:null};
    fsList=async function(env,col){var c=DB[col]||{};return Object.keys(c).map(function(k){return Object.assign({id:k},c[k])})};
    fsQueryDocs=async function(env,col,f,v){var c=DB[col]||{};return Object.keys(c).map(function(k){return Object.assign({id:k},c[k])}).filter(function(d){return d[f]===v})};`, ctx);
  ctx.setDB(DB); return { DB, data: async () => JSON.parse((await ctx.T.hwaData(env, {}, { days: 180 })).body) };
}
// the status of Lan for every assignment, teacher (app) and assistant (server): {A:[app, server], ...}
async function both(asgs, atts, passes, hw) {
  const b = app(asgs, atts, passes, { name: 'T', email: 't@x.com', role: 'teacher' }); if (hw) b.T.setHw(hw);
  const S = server(); S.DB.roster['lan@x.com'] = LAN; asgs.forEach((a) => { S.DB.assignments[a.id] = a; }); atts.forEach((x, i) => { S.DB.attempts['q' + i] = x; });
  (passes || []).forEach((p, i) => { S.DB.passes['p' + i] = p; }); (hw || []).forEach((h, i) => { S.DB.hwdone['h' + i] = h; });
  const d = await S.data(), k = d.students[0].key, r = {};
  asgs.forEach((a) => { r[a.id] = [b.T.asgState(a, 'lan@x.com', now).st, d.status[a.id] ? d.status[a.id][k].st : '(out of range)']; });
  return r;
}

(async () => {
  await t('scenario 1: A open, opened on time → allowed, counts for A', () => {
    const A1 = Object.assign({}, A, { start: now - 2 * DAY, due: now + DAY }), b = app([A1]);
    const C = b.T.exCtx(X, 'A'); assert.ok(C.ctx && C.ctx.id === 'A' && !C.lock);
    assert.ok(/Counts for <b>Old homework<\/b>/.test(b.T.ctxBarHTML(C, X)));
  });
  await t('scenario 2: A closed, no pass, B open with the same X → opening A is LOCKED; the lock offers B, never unlocks A', () => {
    const b = app([A, B]), C = b.T.exCtx(X, 'A');
    assert.ok(C.lock && C.lock.id === 'A' && !C.ctx, 'A stays locked even though B (same exercise) is open');
    const h = b.T.ctxBarHTML(C, X); assert.ok(/Locked\./.test(h) && /data-act="ctx-pick" data-asg="B"/.test(h) && /counts for that homework only/.test(h));
  });
  await t('scenario 2b: from the Library (no homework chosen) → the work counts for B, not A', () => {
    const b = app([A, B]), C = b.T.exCtx(X, null); assert.ok(C.ctx && C.ctx.id === 'B' && !C.lock);
  });
  await t('scenario 4: a saved attempt carries asg = the assignment it was done for; B credited, A not', async () => {
    const b = app([A, B]); b.T.setP('B'); await b.T.saveAttempt(full({ ts: now }));
    const a = b.T.getAttempts()[0]; assert.strictEqual(a.asg, 'B');
    const r = await both([A, B], [full({ ts: now - 1000, sts: now - 1000, asg: 'B' })]);
    assert.deepStrictEqual(r.B, ['done', 'done']); assert.deepStrictEqual(r.A, ['missing', 'missing'], 'A is never completed by work done for B');
  });
  await t('scenario 3: A closed but its late pass is still running → A opens, the bar says late pass, the work = late; after the pass → locked again', async () => {
    const Ad = Object.assign({}, A, { start: now - 9 * DAY, due: now - 2 * DAY }), pw = [{ email: 'lan@x.com', asgId: 'A', kind: 'week' }];
    let b = app([Ad, B], [], pw), C = b.T.exCtx(X, 'A'); assert.ok(C.ctx && C.ctx.id === 'A', 'week pass: open');
    assert.ok(/late pass<\/b>: this work counts as late/.test(b.T.ctxBarHTML(C, X)));
    const r = await both([Ad, B], [full({ ts: now - 1000, sts: now - 1000, asg: 'A' })], pw);
    assert.deepStrictEqual(r.A, ['late', 'late']); assert.deepStrictEqual(r.B, ['pending', 'pending'], 'no leak to B');
    const pd = [{ email: 'lan@x.com', asgId: 'A', kind: 'day' }]; b = app([Ad, B], [], pd); C = b.T.exCtx(X, 'A');
    assert.ok(C.lock && C.lock.id === 'A', 'day pass ended: locked');
  });
  await t('scenario 5: B expires too → B follows its own rule; A unaffected; work done for B before its deadline still counts for B only', async () => {
    const Bx = Object.assign({}, B, { start: now - 9 * DAY, due: now - 2 * DAY });
    const b = app([A, Bx]); const C = b.T.exCtx(X, null); assert.ok(C.lock && !C.ctx, 'nothing open: locked');
    const r = await both([A, Bx], [full({ ts: now - 3 * DAY, sts: now - 3 * DAY, asg: 'B' })]);
    assert.deepStrictEqual(r.B, ['done', 'done']); assert.deepStrictEqual(r.A, ['missing', 'missing']);
  });
  await t('scenario 6: X in A and B at the same time → the student picks; the bar shows both; credit never leaks', async () => {
    const A2 = Object.assign({}, A, { start: now - 2 * DAY, due: now + 2 * DAY }), b = app([A2, B]);
    let C = b.T.exCtx(X, 'A'); assert.strictEqual(C.ctx.id, 'A'); const h = b.T.ctxBarHTML(C, X);
    assert.ok(/aria-label="Which homework this work counts for"/.test(h) && /aria-pressed="true" data-act="ctx-pick" data-asg="A"/.test(h) && /data-asg="B"/.test(h));
    C = b.T.exCtx(X, 'B'); assert.strictEqual(C.ctx.id, 'B');
    const r = await both([A2, B], [full({ ts: now - 1000, sts: now - 1000, asg: 'A' })]);
    assert.deepStrictEqual(r.A, ['done', 'done']); assert.deepStrictEqual(r.B, ['pending', 'pending']);
  });
  await t('legacy: an older attempt WITHOUT a link inside both open windows is flagged (unverified) on both, never credited twice', async () => {
    const A2 = Object.assign({}, A, { start: now - 2 * DAY, due: now + 2 * DAY });
    const r = await both([A2, B], [full({ ts: now - 1000 })]);
    assert.deepStrictEqual(r.A, ['unverified', 'unverified']); assert.deepStrictEqual(r.B, ['unverified', 'unverified']);
  });
  await t('legacy: an older unlinked attempt in B\'s window only → counts for B; for A (closed 100 days) it is not counted', async () => {
    const r = await both([A, B], [full({ ts: now - 1000 })]);
    assert.deepStrictEqual(r.B, ['done', 'done']); assert.deepStrictEqual(r.A, ['missing', 'missing'], 'the reported bypass is closed');
  });
  await t('legacy: an older unlinked attempt after A\'s window and in no other window → flagged on A (Legacy · Unverified), not credited, not hidden', async () => {
    const r = await both([A], [full({ ts: now - 50 * DAY })]);
    assert.deepStrictEqual(r.A, ['unverified', 'unverified']);
  });
  await t('tampering: an attempt that names another assignment, or a device clock set back, never credits A', async () => {
    let r = await both([A, B], [full({ ts: now - 110 * DAY, sts: now - 1000, asg: 'A' })]); assert.deepStrictEqual(r.A, ['unverified', 'unverified'], 'server time after the window: flagged (rules refuse it anyway)');
    r = await both([A, B], [full({ ts: now - 110 * DAY, sts: now - 1000 })]); assert.deepStrictEqual(r.A, ['missing', 'missing'], 'unlinked with a fake old ts: server time wins');
    r = await both([A, B], [full({ ts: now - 110 * DAY, sts: now - 1000, asg: 'ZZ' })]); assert.deepStrictEqual(r.A, ['missing', 'missing']);
  });
  await t('partial work: 3/5 answered for B stays Incomplete for B and gives A nothing', async () => {
    const r = await both([A, B], [full({ answered: 3, score: 3, ts: now - 1000, sts: now - 1000, asg: 'B' })]);
    assert.deepStrictEqual(r.B, ['incomplete', 'incomplete']); assert.deepStrictEqual(r.A, ['missing', 'missing']);
  });
  await t('mixed Library + external: screenshot after the window (no pass) is not counted; the student sees no upload button', async () => {
    const M = Object.assign({}, A, { id: 'M', start: now - 9 * DAY, due: now - 2 * DAY, ext: [{ id: 'x1', link: 'https://f.example.com', src: 'Form' }] });
    const hw = [{ id: 'h', email: 'lan@x.com', asgId: 'M', shots: { x1: { url: '/api/image/' + 'a'.repeat(22), ts: now - DAY } } }];
    const r = await both([M], [full({ ts: now - 3 * DAY, sts: now - 3 * DAY, asg: 'M' })], [], hw);
    assert.deepStrictEqual(r.M, ['unverified', 'unverified'], 'Library done on time, screenshot after the window = flagged, not complete');
    const b = app([M]); b.T.setHw(hw); const S = b.T.asgState(M, 'lan@x.com'), h = b.T.extHwHTML(S, S.X[0], 0);
    assert.ok(/After deadline · not counted/.test(h));
    const b2 = app([M]); b2.T.openX('M|x1'); const S2 = b2.T.asgState(M, 'lan@x.com'), h2 = b2.T.extHwHTML(S2, S2.X[0], 0);
    assert.ok(/class="hwxd"/.test(h2) && !/data-act="hw-shot"/.test(h2) && /Only a late pass can reopen it/.test(h2), 'closed: the row opens, no upload button');
    const b3 = app([M], [], [{ email: 'lan@x.com', asgId: 'M', kind: 'week' }]); b3.T.openX('M|x1'); const S3 = b3.T.asgState(M, 'lan@x.com');
    assert.ok(/data-act="hw-shot"/.test(b3.T.extHwHTML(S3, S3.X[0], 0)), 'week pass running: upload is back');
  });
  await t('class change: an attempt linked to the old class\'s assignment does not count for the new class\'s assignment', async () => {
    const OLD = Object.assign({}, B, { id: 'OLD', cls: '9h' });
    const r = await both([B], [full({ cls: '9h', ts: now - 1000, sts: now - 1000, asg: 'OLD' })]);
    assert.deepStrictEqual(r.B, ['pending', 'pending']);
  });
  await t('free practice (exercise in no assignment) is open and saved without a link', async () => {
    const b = app([]); const C = b.T.exCtx(X, null); assert.ok(!C.ctx && !C.lock);
    b.T.setP(''); await b.T.saveAttempt(full({ ts: now })); assert.strictEqual(b.T.getAttempts()[0].asg, '');
  });
  await t('teachers are never locked and their previews carry no link', () => {
    const b = app([A, B], [], [], { name: 'T', email: 't@x.com', role: 'teacher' }); const C = b.T.exCtx(X, 'A');
    assert.ok(!C.ctx && !C.lock);
  });
  await t('md-hw: times from Firestore (Timestamp), REST (ISO string) and numbers are read the same', () => {
    assert.strictEqual(H.ms({ toMillis: () => 1234 }), 1234); assert.strictEqual(H.ms('2026-01-01T00:00:00Z'), Date.parse('2026-01-01T00:00:00Z'));
    assert.strictEqual(H.ms({ seconds: 2, nanoseconds: 5e6 }), 2005); assert.strictEqual(H.tOf({ ts: 9, sts: null }), 9);
  });
  out.forEach((l) => console.log(l)); console.log('---- ' + pass + '/' + (pass + fail) + ' passed'); if (fail) process.exitCode = 1;
})();
