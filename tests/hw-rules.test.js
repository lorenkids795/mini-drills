// Phase B (D3 + D4): one set of homework rules (md-hw.js) for the teacher (app) and the Homework Assistant (server).
// Completed = every required question answered + submitted; blank answers = Submitted · Incomplete; older attempts that
// cannot prove it = Legacy · Unverified (never Completed); late = complete after the deadline (shown apart, still counted);
// match by the student's email (normalized), never by the class written on the attempt; a newer assignment never takes an
// older attempt. Teacher and assistant must give the SAME answer for every case. Real code, no network.
// Run: node tests/hw-rules.test.js
'use strict';
const assert = require('assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const { boot, ROOT } = require('./app-harness.js');
const H = require(path.join(ROOT, 'md-hw.js'));
let pass = 0, fail = 0; const out = [];
async function t(name, fn) { try { await fn(); pass++; out.push('PASS ' + name); } catch (e) { fail++; out.push('FAIL ' + name + ' -> ' + e.message); } }
const DAY = 864e5, now = Date.now();

// ---- the server (real code, Firestore replaced by an in-memory DB)
function server() {
  const SRC = fs.readFileSync(path.join(ROOT, 'functions', 'api', '[[path]].js'), 'utf8').replace(/^export async function onRequest/m, 'async function onRequest').replace(/^import BUILD from .*$/m, 'const BUILD = {};').replace(/^import MDHW from .*$/m, () => fs.readFileSync(path.join(ROOT, 'md-hw.js'), 'utf8'));
  const KV = {}, DB = { roster: {}, assignments: {}, attempts: {}, hwdone: {}, passes: {}, classes: {}, hwnotes: {}, exercises: {} };
  const env = { MD_KV: { get: async (k, ty) => (k in KV ? (ty === 'json' ? JSON.parse(KV[k]) : KV[k]) : null), put: async (k, v) => { KV[k] = v; }, delete: async (k) => { delete KV[k]; } } };
  const ctx = vm.createContext({ console: { log() {} }, Response: class { constructor(b, o) { this.body = b; this.status = (o && o.status) || 200; this.headers = (o && o.headers) || {}; } }, URL, TextEncoder, TextDecoder, crypto: globalThis.crypto, atob, btoa, fetch: async () => ({ ok: false, status: 500 }) });
  vm.runInContext(SRC + `;this.T={hwaData,hwaStatus};
    var WHO=null;idUser=async function(){return WHO};this.setWho=function(w){WHO=w};
    var DB=null;this.setDB=function(d){DB=d};this.Q=[];var Q=this.Q;
    fsGet=async function(env,col,id){var c=DB[col]||{};return c[id]?{data:c[id],updateTime:'t'}:null};
    fsList=async function(env,col){var c=DB[col]||{};return Object.keys(c).map(function(k){return Object.assign({id:k},c[k])})};
    fsQueryDocs=async function(env,col,f,v){Q.push(col+'.'+f);var c=DB[col]||{};return Object.keys(c).map(function(k){return Object.assign({id:k},c[k])}).filter(function(d){return d[f]===v})};`, ctx);
  ctx.setDB(DB);
  return { ctx, KV, DB, env, data: async () => JSON.parse((await ctx.T.hwaData(env, {}, { days: 60 })).body) };
}
// ---- the app (teacher view)
const HOOKS = 'setAsg:function(a){localAsg=a},setRoster:function(r){rosterDocs=r},setAttempts:function(a){localAttempts=a},setHw:function(h){localHwdone=h},setPass:function(p){localPass=p},asgState:asgState,hwMatrixHTML:hwMatrixHTML,homeworkHTML:homeworkHTML,partLabel:partLabel,resultStateHTML:resultStateHTML';

// cases: [name, attempts of lan@x.com for exercise l1, assignment, pass, expected st]
const A = { id: 'a1', cls: '7h30', name: 'HW', start: now - 5 * DAY, due: now - DAY, ex: ['l1'] };
const OPEN = Object.assign({}, A, { id: 'a2', due: now + DAY });
const CASES = [
  ['complete on time', [{ score: 3, total: 5, answered: 5, required: 5, ts: now - 2 * DAY }], A, null, 'done'],
  ['complete after the deadline = late (still counted)', [{ score: 3, total: 5, answered: 5, required: 5, ts: now - 0.5 * DAY }], A, null, 'late'],
  ['late, but a 1-day pass moves the deadline = on time', [{ score: 3, total: 5, answered: 5, required: 5, ts: now - 0.5 * DAY }], A, 'day', 'done'],
  ['blank answers = incomplete', [{ score: 3, total: 5, answered: 3, required: 5, ts: now - 2 * DAY }], A, null, 'incomplete'],
  ['incomplete first, complete later = complete (the complete one counts)', [{ score: 1, total: 5, answered: 2, required: 5, ts: now - 3 * DAY }, { score: 4, total: 5, answered: 5, required: 5, ts: now - 2 * DAY }], A, null, 'done'],
  ['older attempt, not full score, no answered count = Legacy · Unverified', [{ score: 3, total: 5, ts: now - 2 * DAY }], A, null, 'unverified'],
  ['older attempt with full score = complete (every answer right)', [{ score: 5, total: 5, ts: now - 2 * DAY }], A, null, 'done'],
  ['older multi-stage Reading lesson = complete (the app made the student answer everything)', [{ score: 9, total: 20, stages: [{ name: 'Deep reading', score: 4, total: 8 }], ts: now - 2 * DAY }], A, null, 'done'],
  ['Writing / Speaking submission = complete (handed in; marking is separate)', [{ kind: 'submission', score: 0, total: 0, ts: now - 2 * DAY }], A, null, 'done'],
  ['an attempt BEFORE the send date never counts for this assignment', [{ score: 5, total: 5, answered: 5, required: 5, ts: now - 9 * DAY }], A, null, 'missing'],
  ['nothing, deadline passed = missing', [], A, null, 'missing'],
  ['nothing, before the deadline = pending', [], OPEN, null, 'pending'],
  ['blank answers before the deadline = incomplete', [{ score: 1, total: 5, answered: 1, required: 5, ts: now - DAY }], OPEN, null, 'incomplete'],
];

(async () => {
  await t('one attempt: Completed / Incomplete / Legacy · Unverified, never assumed complete', () => {
    assert.strictEqual(H.attState({ score: 3, total: 5, answered: 5, required: 5 }), 'complete');
    assert.strictEqual(H.attState({ score: 5, total: 5, answered: 4, required: 5 }), 'incomplete', 'answered counts, not the score');
    assert.strictEqual(H.attState({ score: 3, total: 5 }), 'unverified');
    assert.strictEqual(H.attState({ score: 0, total: 0 }), 'unverified', 'no questions, no proof');
    assert.strictEqual(H.attState({ score: 5, total: 5 }), 'complete');
    assert.strictEqual(H.attState({ kind: 'submission', score: 0, total: 0 }), 'complete');
  });
  await t('Completed is not Passed: 8/10 with 2 blanks = incomplete but passed; 6/10 all answered = complete, not passed', () => {
    const B = boot({ hooks: HOOKS });
    let h = B.T.resultStateHTML(8, 10, 8, 10); assert.ok(/Submitted · Incomplete \(8\/10 answered\)/.test(h) && />Passed</.test(h) && /at least 70% correct to pass/.test(h));
    h = B.T.resultStateHTML(6, 10, 10, 10); assert.ok(/>Completed</.test(h) && />Not passed</.test(h));
    h = B.T.resultStateHTML(7, 10, 10, 10); assert.ok(/>Completed</.test(h) && />Passed</.test(h), '70% exactly passes');
  });
  for (const c of CASES) {
    await t('teacher = assistant: ' + c[0] + ' → ' + c[4], async () => {
      const atts = c[1].map((x, i) => Object.assign({ id: 'q' + i, email: 'lan@x.com', cls: '7h30', ex: 'l1' }, x));
      // app
      const B = boot({ hooks: HOOKS }); B.T.setRoster([{ email: 'lan@x.com', name: 'Lan', cls: '7h30', role: 'student' }]); B.T.setAsg([c[2]]); B.T.setAttempts(atts);
      if (c[3]) B.T.setPass([{ email: 'lan@x.com', asgId: c[2].id, kind: c[3] }]);
      const app = B.T.asgState(c[2], 'lan@x.com', now).st;
      // server
      const S = server(); S.KV.assist = JSON.stringify({ 'as@x.com': { name: 'As', classes: ['7h30'] } });
      S.DB.roster['lan@x.com'] = { email: 'lan@x.com', name: 'Lan', cls: '7h30', role: 'student' }; S.DB.assignments[c[2].id] = c[2];
      atts.forEach((x) => { S.DB.attempts[x.id] = x; }); if (c[3]) S.DB.passes.p1 = { email: 'lan@x.com', asgId: c[2].id, kind: c[3] };
      S.ctx.setWho({ em: 'as@x.com', role: 'assistant' }); const d = await S.data(), k = d.students[0].key, srv = d.status[c[2].id][k].st;
      assert.strictEqual(app, c[4], 'app'); assert.strictEqual(srv, c[4], 'server');
    });
  }
  await t('teacher table: late ✓ with "late", incomplete ! with answered count, unverified ?, Completion words', () => {
    const B = boot({ hooks: HOOKS }); B.T.setRoster([{ email: 'lan@x.com', name: 'Lan', cls: '7h30', role: 'student' }, { email: 'ha@x.com', name: 'Ha', cls: '7h30', role: 'student' }, { email: 'vy@x.com', name: 'Vy', cls: '7h30', role: 'student' }]);
    const a = Object.assign({}, A, { ex: ['l1', 'r1'] }); B.T.setAsg([a]);
    B.T.setAttempts([{ email: 'lan@x.com', ex: 'l1', score: 5, total: 5, answered: 5, required: 5, ts: now - 0.5 * DAY }, { email: 'lan@x.com', ex: 'r1', score: 5, total: 5, answered: 5, required: 5, ts: now - 2 * DAY },
      { email: 'ha@x.com', ex: 'l1', score: 2, total: 5, answered: 3, required: 5, ts: now - 2 * DAY }, { email: 'vy@x.com', ex: 'l1', score: 3, total: 5, ts: now - 2 * DAY }, { email: 'vy@x.com', ex: 'r1', score: 3, total: 5, ts: now - 2 * DAY }]);
    const h = B.T.hwMatrixHTML(a);
    assert.ok(/aria-label="Done late"/.test(h) && /Complete · late \(2\/2\)/.test(h), 'Lan: late but complete');
    assert.ok(/aria-label="Incomplete: blank answers"[^]*?<small class="hwan">3\/5<\/small>/.test(h), 'Ha: 3/5 answered');
    assert.ok(/Legacy · Unverified \(0\/2\)/.test(h), 'Vy: older attempts');
  });
  await t('student card: "Incomplete · 3/5 answered" and "Legacy · Unverified" instead of Done', () => {
    const B = boot({ hooks: HOOKS, user: { name: 'Ha', email: 'ha@x.com', role: 'student', cls: '7h30' } });
    B.T.setAsg([Object.assign({}, OPEN, { ex: ['l1', 'r1'] })]);
    B.T.setAttempts([{ email: 'ha@x.com', ex: 'l1', score: 2, total: 5, answered: 3, required: 5, ts: now - DAY }, { email: 'ha@x.com', ex: 'r1', score: 3, total: 5, ts: now - DAY }]);
    const h = B.T.homeworkHTML(); assert.ok(/Incomplete · 3\/5 answered/.test(h) && /Legacy · Unverified/.test(h) && !/All done/.test(h), h.slice(0, 400));
  });
  await t('class change: the assistant still sees work done before the move (attempts by email, not by class); email case ignored', async () => {
    const S = server(); S.KV.assist = JSON.stringify({ 'as@x.com': { name: 'As', classes: ['7h30'] } });
    S.DB.roster['lan@x.com'] = { email: 'Lan@X.com', name: 'Lan', cls: '7h30', role: 'student' }; S.DB.assignments.a1 = A;
    S.DB.attempts.q1 = { email: 'lan@x.com', cls: '6h', ex: 'l1', score: 5, total: 5, answered: 5, required: 5, ts: now - 2 * DAY }; // written when Lan was in 6h
    S.ctx.setWho({ em: 'as@x.com', role: 'assistant' }); const d = await S.data();
    assert.strictEqual(d.status.a1[d.students[0].key].st, 'done'); assert.ok(S.ctx.Q.indexOf('attempts.email') >= 0 && S.ctx.Q.indexOf('attempts.cls') < 0, 'queried by email: ' + S.ctx.Q.join());
    const B = boot({ hooks: HOOKS }); B.T.setRoster([{ email: 'lan@x.com', name: 'Lan', cls: '7h30', role: 'student' }]); B.T.setAsg([A]);
    B.T.setAttempts([{ email: 'LAN@x.com ', cls: '6h', ex: 'l1', score: 5, total: 5, answered: 5, required: 5, ts: now - 2 * DAY }]);
    assert.strictEqual(B.T.asgState(A, 'lan@x.com', now).st, 'done', 'app too');
  });
  await t('a deleted exercise is not a part on either side; a custom exercise that exists is', async () => {
    const a = Object.assign({}, A, { ex: ['l1', 'c_gone', 'c_live'] });
    const S = server(); S.KV.assist = JSON.stringify({ 'as@x.com': { name: 'As', classes: ['7h30'] } });
    S.DB.roster['lan@x.com'] = { email: 'lan@x.com', name: 'Lan', cls: '7h30', role: 'student' }; S.DB.assignments.a1 = a; S.DB.exercises.live = { title: 'Mine' };
    S.DB.attempts.q1 = { email: 'lan@x.com', ex: 'l1', score: 5, total: 5, ts: now - 2 * DAY };
    S.ctx.setWho({ em: 'as@x.com', role: 'assistant' }); const r = (await S.data()).status.a1;
    const v = r[Object.keys(r)[0]]; assert.strictEqual(v.n, 2, 'l1 + c_live'); assert.strictEqual(v.st, 'missing');
    assert.deepStrictEqual(H.BUILTIN, ['l1', 'l2', 'l3', 'r1', 'r2', 'r3', 'w1', 's1', 'ra1']);
    const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'); const m = html.match(/var SAMPLE_IDS=(\[[^\]]*\])/);
    assert.deepStrictEqual(JSON.parse(m[1].replace(/'/g, '"')), H.BUILTIN, 'md-hw BUILTIN = the app\'s built-in exercises');
  });
  // the same student seen by the teacher (app) and the assistant (server), with screenshots (hwdone) and a roster
  async function both(asg, atts, hw, roster) {
    roster = roster || [{ email: 'lan@x.com', name: 'Lan', cls: '7h30', role: 'student' }];
    const B = boot({ hooks: HOOKS }); B.T.setRoster(roster); B.T.setAsg([asg]); B.T.setAttempts(atts); if (hw) B.T.setHw([Object.assign({ id: 'h_' + asg.id, asgId: asg.id }, hw)]);
    const S = server(); S.KV.assist = JSON.stringify({ 'as@x.com': { name: 'As', classes: ['7h30'] } });
    roster.forEach((r) => { S.DB.roster[r.email] = r; }); S.DB.assignments[asg.id] = asg; atts.forEach((x, i) => { S.DB.attempts['q' + i] = x; }); if (hw) S.DB.hwdone.h1 = Object.assign({ asgId: asg.id }, hw);
    S.ctx.setWho({ em: 'as@x.com', role: 'assistant' }); const d = await S.data();
    return { B, d, srv: (name) => { const s = d.students.filter((x) => x.name === name)[0]; return s ? d.status[asg.id][s.key] : null; } };
  }
  await t('mixed Library + external task: both parts needed; a late screenshot = late on both sides', async () => {
    const M = Object.assign({}, A, { id: 'm1', ext: [{ id: 'x1', link: 'https://f.example.com/a', src: 'Google Form' }], type: 'mixed' });
    const ok = [{ email: 'lan@x.com', ex: 'l1', score: 5, total: 5, answered: 5, required: 5, ts: now - 2 * DAY }];
    let r = await both(M, ok, null); assert.strictEqual(r.B.T.asgState(M, 'lan@x.com', now).st, 'missing'); assert.strictEqual(r.srv('Lan').st, 'missing', 'Library alone is not enough');
    const shot = { email: 'lan@x.com', shots: { x1: { id: 'a'.repeat(22), url: '/api/image/' + 'a'.repeat(22), ts: now - 0.5 * DAY } } };
    r = await both(M, ok, shot); assert.strictEqual(r.B.T.asgState(M, 'lan@x.com', now).st, 'late'); assert.strictEqual(r.srv('Lan').st, 'late');
    r = await both(M, [], shot); assert.strictEqual(r.B.T.asgState(M, 'lan@x.com', now).st, 'missing'); assert.strictEqual(r.srv('Lan').st, 'missing', 'a screenshot never completes the Library work');
  });
  await t('kicked account (no roster row) and testers: in neither list; their attempts never count for anyone', async () => {
    const roster = [{ email: 'lan@x.com', name: 'Lan', cls: '7h30', role: 'student' }, { email: 'tt@x.com', name: 'Tess', cls: '7h30', role: 'student', tester: true }];
    const atts = [{ email: 'gone@x.com', cls: '7h30', ex: 'l1', score: 5, total: 5, ts: now - 2 * DAY }, { email: 'tt@x.com', cls: '7h30', ex: 'l1', score: 5, total: 5, ts: now - 2 * DAY }];
    const r = await both(A, atts, null, roster);
    assert.deepStrictEqual(r.d.students.map((s) => s.name), ['Lan'], 'server: no kicked, no tester'); assert.strictEqual(r.srv('Lan').st, 'missing');
    assert.strictEqual(r.B.T.asgState(A, 'lan@x.com', now).st, 'missing', 'app: Lan does not get the work of others');
  });
  await t('cross-class: the assistant of 7h30 never gets a 9h assignment or student, whatever the request says', async () => {
    const B9 = Object.assign({}, A, { id: 'b9', cls: '9h' });
    const S = server(); S.KV.assist = JSON.stringify({ 'as@x.com': { name: 'As', classes: ['7h30'] } });
    S.DB.roster['lan@x.com'] = { email: 'lan@x.com', name: 'Lan', cls: '7h30', role: 'student' }; S.DB.roster['hoa@x.com'] = { email: 'hoa@x.com', name: 'Hoa', cls: '9h', role: 'student' };
    S.DB.assignments.a1 = A; S.DB.assignments.b9 = B9; S.ctx.setWho({ em: 'as@x.com', role: 'assistant' });
    const d = JSON.parse((await S.ctx.T.hwaData(S.env, {}, { days: 60, classes: ['9h'], cls: '9h' })).body);
    assert.deepStrictEqual(d.classes, ['7h30']); assert.ok(!d.status.b9 && d.students.every((s) => s.cls === '7h30'));
  });
  await t('assistant lists: overdue blanks are in the missing report, blanks before the deadline in the reminder', () => {
    const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    assert.ok(/function hwaOwe\(r\)\{[^}]*r\.st==='incomplete'\)return r\.due</.test(html) && /hwaOwe\(m\[s\.key\]\)===\(mode==='reminder'\?'soon':'over'\)/.test(html));
  });
  await t('every attempt saved by the app records answered / required (self-marked, Listening lesson, Reading lesson)', () => {
    const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    assert.ok(/total:res\.length,answered:answered,required:res\.length,/.test(html), 'gradeNow');
    assert.ok(/total:total,answered:ansd,required:total,/.test(html), 'Listening lesson');
    assert.ok(/total:total,answered:all\.filter\(function\(x\)\{return rmIdAns\(x\)\}\)\.length,required:total,/.test(html), 'Reading lesson');
    const rules = fs.readFileSync(path.join(ROOT, 'firestore.rules'), 'utf8'); assert.ok(/numIn\('answered', 0, 1000\) && numIn\('required', 0, 1000\)/.test(rules));
  });
  out.forEach((l) => console.log(l)); console.log('---- ' + pass + '/' + (pass + fail) + ' passed'); if (fail) process.exitCode = 1;
})();
