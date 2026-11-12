// Staging QA fixture (11/2026): real STAGING/QA exercises a learner can open and submit (Cam 21 · Test 4, staging Firestore only),
// assignments for the tester (class Test) and STG-A; dry run; never overwrites records not made by the fixture; refused off staging.
// Also: Marking says "Submitted" (not "Done") before marking; the assistant shows partial progress of mixed homework.
// Real server + real app code, in-memory Firestore / KV. No network. Run: node tests/staging-qa.test.js
'use strict';
const assert = require('assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const { boot, ROOT } = require('./app-harness.js');
let pass = 0, fail = 0; const out = [];
async function t(name, fn) { try { await fn(); pass++; out.push('PASS ' + name); } catch (e) { fail++; out.push('FAIL ' + name + ' -> ' + e.message); } }
const SB = { env: 'staging', branch: 'phase-b', sha: 'x', fbProject: 'md-staging-test', fbError: '' };
function server(build) {
  const SRC = fs.readFileSync(path.join(ROOT, 'functions', 'api', '[[path]].js'), 'utf8').replace(/^export async function onRequest/m, 'async function onRequest')
    .replace(/^import BUILD from .*$/m, 'const BUILD = ' + JSON.stringify(build) + ';').replace(/^import MDHW from .*$/m, () => fs.readFileSync(path.join(ROOT, 'md-hw.js'), 'utf8'));
  const DB = {}, W = [];
  const ctx = vm.createContext({ console: { log() {} }, Response: class { constructor(b, o) { this.body = b; this.status = (o && o.status) || 200; } }, URL, TextEncoder, TextDecoder, crypto: globalThis.crypto, atob, btoa, fetch: async () => { throw new Error('no network'); } });
  vm.runInContext(SRC + `;this.T={adminStaging,qaExercises,qaAssignments};var DB=null,W=null;this.set=function(d,w){DB=d;W=w};
    fsPut=async function(env,col,id,o){W.push(col+'/'+id);(DB[col]=DB[col]||{})[id]=JSON.parse(JSON.stringify(o))};
    fsGet=async function(env,col,id){var c=DB[col]||{};return c[id]?{data:c[id],updateTime:'t'}:null};`, ctx);
  ctx.set(DB, W); return { T: ctx.T, DB, W };
}
const kv = () => { const M = { 'env:marker': 'staging:md-staging-test' }; return { get: async (k) => (k in M ? M[k] : null), put: async (k, v) => { M[k] = v; }, delete: async () => {}, list: async () => ({ keys: Object.keys(M).map((name) => ({ name })) }) }; };
const env = () => ({ MD_ENV: 'staging', MD_KV: kv(), FIREBASE_PROJECT_ID: 'md-staging-test', FIREBASE_CLIENT_EMAIL: 'a@md-staging-test.iam.gserviceaccount.com', FIREBASE_PRIVATE_KEY: 'x' });
const run = async (S, op) => JSON.parse((await S.T.adminStaging(env(), { op })).body);

(async () => {
  await t('dry run writes nothing and lists 3 exercises + 4 assignments to create', async () => {
    const S = server(SB), d = await run(S, 'qa-preview');
    assert.strictEqual(d.dry, true); assert.strictEqual(S.W.length, 0); assert.strictEqual(d.created, 15); assert.strictEqual(d.plan.length, 15);
  });
  await t('create: every record qa + staging, titles "STAGING/QA", Cam 21 · Test 4; running again updates the same ids', async () => {
    const S = server(SB); await run(S, 'qa');
    assert.deepStrictEqual(Object.keys(S.DB.exercises).sort(), ['qa_r10', 'qa_r5', 'qa_w1']); assert.deepStrictEqual(Object.keys(S.DB.assignments).sort(), ['qa_hw_late', 'qa_hw_mixed', 'qa_hw_now', 'qa_hw_stga', 'qa_q1', 'qa_q2', 'qa_q3', 'qa_sc_A', 'qa_sc_A_stga', 'qa_sc_ended']);
    Object.values(S.DB.exercises).forEach((e) => assert.ok(e.qa && e.staging && /^STAGING\/QA/.test(e.title) && e.bookId === 'cam21' && e.testId === 't4'));
    Object.values(S.DB.assignments).forEach((a) => assert.ok(a.qa && a.staging && /^STAGING\/QA/.test(a.name)));
    assert.strictEqual(S.DB.assignments.qa_hw_now.cls, 'Test', 'the tester\'s class'); assert.strictEqual(S.DB.assignments.qa_hw_stga.cls, 'STG-A');
    assert.ok(S.DB.assignments.qa_hw_late.due < Date.now() && S.DB.assignments.qa_hw_now.due > Date.now());
    const d = await run(S, 'qa'); assert.strictEqual(d.created, 0); assert.strictEqual(d.updated, 14); assert.strictEqual(d.kept, 1, 'the ledger item is never reset'); S.DB.extitems.qa_ext_1.used = true; await run(S, 'qa'); assert.strictEqual(S.DB.extitems.qa_ext_1.used, true); assert.strictEqual(S.DB.passes['stg-tester-example-test_qa_sc_ended'].kind, 'day'); assert.strictEqual(Object.keys(S.DB.exercises).length, 3, 'no copies');
  });
  await t('a record with a fixture id that a person made (no qa flag) is skipped, never overwritten', async () => {
    const S = server(SB); S.DB.exercises = { qa_r5: { title: 'My own exercise' } };
    const d = await run(S, 'qa'); assert.strictEqual(S.DB.exercises.qa_r5.title, 'My own exercise'); assert.strictEqual(d.skipped, 1);
  });
  await t('refused on production, on a non-Cloudflare build and on an unsafe staging (nothing written)', async () => {
    for (const b of [{ env: 'production' }, {}]) { const S = server(b), r = await S.T.adminStaging(env(), { op: 'qa' }); assert.strictEqual(r.status, 403); assert.strictEqual(S.W.length, 0); }
    const S = server(SB), r = await S.T.adminStaging(Object.assign(env(), { MD_ENV: '' }), { op: 'qa' }); assert.strictEqual(r.status, 403); assert.strictEqual(S.W.length, 0);
  });
  await t('the exercises are real and gradable: types, options, answers; 7/10 passes, 6/10 does not', () => {
    const S = server(SB), X = {}; S.T.qaExercises().forEach(([id, d]) => { X[id] = d; });
    assert.strictEqual(X.qa_r5.qs.length, 5); assert.strictEqual(X.qa_r10.qs.length, 10); assert.ok(X.qa_w1.kind === 'writing' && X.qa_w1.prompt.length > 20);
    [].concat(X.qa_r5.qs, X.qa_r10.qs).forEach((q) => {
      if (q.type === 'gap') assert.ok(Array.isArray(q.ans) && q.ans.length && /___/.test(q.q)); else assert.ok(Number.isInteger(q.ans) && q.ans >= 0 && q.ans < q.opts.length, q.id);
    });
    assert.ok(!/Cambridge/i.test(JSON.stringify(X)), 'original content, no Cambridge text');
    const B = boot({ hooks: 'passPct:passPct' }); assert.strictEqual(B.T.passPct(7, 10), true); assert.strictEqual(B.T.passPct(6, 10), false);
  });
  await t('app: the tester (class Test) sees the QA homework on Home and Cam 21 in the Library; exercises open with their questions', async () => {
    const S = server(SB); await run(S, 'qa');
    const docs = Object.entries(S.DB.exercises).map(([id, d]) => Object.assign({ id, docId: id }, d)), asg = Object.entries(S.DB.assignments).map(([id, a]) => Object.assign({ id }, a));
    const B = boot({ hooks: 'setCustom:function(d){customDocs=d;rebuildCustom()},setAsg:function(a){localAsg=a},setRoster:function(r){rosterDocs=r},homeworkHTML:homeworkHTML,exOf:exOf,allIdsBook:allIdsBook,qHTML:qHTML', user: { name: 'STG Tester', email: 'stg.tester@example.test', role: 'student', cls: 'Test' } });
    B.T.setRoster([{ email: 'stg.tester@example.test', name: 'STG Tester', cls: 'Test', role: 'student', tester: true }]); B.T.setCustom(docs); B.T.setAsg(asg);
    assert.strictEqual(B.T.allIdsBook('cam21').length, 3); const h = B.T.homeworkHTML();
    assert.ok(/STAGING\/QA this week \(tester\)/.test(h) && /STAGING\/QA · Reading · 10 questions/.test(h) && /STAGING\/QA overdue/.test(h) && !/STG-A/.test(h), 'tester sees only class Test homework');
    const q = B.T.qHTML(B.T.exOf('c_qa_r10')); assert.strictEqual((q.match(/class="qn"/g) || []).length, 10);
  });
  await t('Marking: an unmarked submission says "Submitted", never "Done"', () => {
    const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    assert.ok(/'<span class="pill pend" title="Waiting for the teacher to mark it">Submitted<\/span>'/.test(html) && !/<span class="pill">Done<\/span>/.test(html));
  });
  await t('assistant: partial progress of mixed homework is shown ("1/2 parts done · missing: external task"), never as complete', () => {
    const B = boot({ hooks: 'hwaPart:hwaPart' });
    assert.strictEqual(B.T.hwaPart({ st: 'missing', done: 1, n: 2, parts: [{ k: 'ex', st: 'late' }, { k: 'ext', st: 'none' }] }), '1/2 parts done · missing: external task');
    assert.strictEqual(B.T.hwaPart({ st: 'pending', done: 0, n: 3, parts: [{ k: 'ex', st: 'none' }, { k: 'ex', st: 'incomplete' }, { k: 'ext', st: 'none' }] }), '0/3 parts done · missing: 2 Library exercises, external task');
    assert.strictEqual(B.T.hwaPart({ st: 'done', done: 2, n: 2, parts: [] }), '');
    const srv = fs.readFileSync(path.join(ROOT, 'functions', 'api', '[[path]].js'), 'utf8'); assert.ok(/parts: r\.parts\.map\(\(p\) => \(\{ k: p\.kind, st: p\.st \}\)\)/.test(srv));
  });
  out.forEach((l) => console.log(l)); console.log('---- ' + pass + '/' + (pass + fail) + ' passed'); if (fail) process.exitCode = 1;
})();
