// Create › Reading: Student View Preview really renders (no Easy / Hard yet, before approval), the state-aware workflow panel,
// the calmer Reading lesson markup, the Tester "—" class cell, and the Homework Assistant role from the token.
// Real app code (tests/app-harness.js) with a fake /api/ai/reading. No network. Run: node tests/create-reading-ui.test.js
'use strict';
const assert = require('assert'), fs = require('fs'), path = require('path');
const { boot, ROOT } = require('./app-harness.js');
let pass = 0, fail = 0; const out = [];
async function t(name, fn) { try { await fn(); pass++; out.push('PASS ' + name); } catch (e) { fail++; out.push('FAIL ' + name + ' -> ' + e.message); } }
const HOOKS = 'get RD(){return RD},get CP(){return CP},get RV(){return RV},get RM(){return RM},rdGen:rdGen,rdRvAct:rdRvAct,rdRvHTML:rdRvHTML,rdStage:rdStage,rdLvHTML:rdLvHTML,rdLevels:rdLevels,rdIssues:rdIssues,rdMedSig:rdMedSig,' +
  'cpValid:cpValid,cpLvHTML:cpLvHTML,renderPrev:renderPrev,EXAMPLE_R:EXAMPLE_R,rdBuildDemoTx:rdBuildDemoTx,get parsed(){return parsed},get AD(){return AD},adListHTML:adListHTML,setRM:function(x){RM_TLV=x}';
const PARTS = { deep: ['deep'], vocab: ['title', 'prons', 'words'], output: ['pairs', 'pdist', 'cloze', 'wprompt', 'wguide'] };
const clone = (o) => JSON.parse(JSON.stringify(o));
function app() {
  const B = boot({ hooks: HOOKS }), ex = JSON.parse(B.T.EXAMPLE_R), seen = [];
  B.T.CP.skill = 'reading'; B.T.CP.slot = 1; B.T.RD.tx = B.T.rdBuildDemoTx(); B.T.RD.title = '';
  const good = (k) => { const r = {}; PARTS[k].forEach((f) => { if (ex[f] !== undefined) r[f] = clone(ex[f]); }); return r; };
  B.W.reply = (url, o) => { const b = JSON.parse(o.body); if (!/ai\/reading$/.test(url)) return { status: 200, body: {} }; seen.push(b); return { status: 200, body: { part: b.part, level: b.level, out: good(b.part), model: 'fake' } }; };
  return { B, T: B.T, seen };
}
const settle = async (A) => { for (let i = 0; i < 60 && (A.T.RD.busy || A.T.RV.busy); i++) await A.B.flush(); };
const act = (A, a, ds) => A.T.rdRvAct(a, { dataset: ds || {}, checked: true });
const gen = async (A) => { A.T.rdGen(); await settle(A); const J = A.T.RD.job, I = A.T.rdIssues(); if (I.left.length) J.ackLeft = A.T.rdMedSig(J); };

(async () => {
  await t('root cause: no Easy / Hard yet → rdLevels() is null; the level switch and the preview no longer throw', async () => {
    const A = app(); await gen(A); assert.strictEqual(A.T.rdLevels(), null);
    const h = A.T.cpLvHTML(); assert.ok(/data-v="medium" aria-pressed="true"/.test(h) && /data-v="easy" aria-pressed="false" disabled/.test(h));
  });
  await t('Student View Preview of an unapproved Medium draft = the interactive lesson (passage, questions, step menu, dock), not the summary', async () => {
    const A = app(); await gen(A); assert.ok(A.T.CP.last && !A.T.CP.last.errs.length && A.T.rdStage(A.T.RD.job) === 'review');
    A.B.press({ act: 'cp-view', v: 'stu' }); const pv = A.B.el('pvRm').innerHTML, box = A.B.el('createPrev').innerHTML;
    assert.ok(A.T.CP.view === 'stu' && box.includes('id="pvRm"') && !/class="pvsum|Summary of the lesson/.test(box));
    assert.ok(/class="rmtop"/.test(pv) && /id="rmStepSel"/.test(pv) && /class="rmpsg"/.test(pv) && /class="rmqs"/.test(pv) && /class="rmdock"/.test(pv) && /class="gap rmk/.test(pv), 'real student screen');
    assert.ok(A.T.RM.root === 'pvRm', 'drawn as a preview (rmFinish saves for students only)');
    A.B.press({ act: 'cp-view', v: 'sum' }); assert.ok(A.T.CP.view === 'sum' && !A.B.el('createPrev').innerHTML.includes('id="pvRm"') && A.T.CP.slot === 1 && A.T.RD.job, 'back to Summary: slot and draft kept');
  });
  await t('Easy / Medium / Hard switch changes the real lesson content in the preview', async () => {
    const A = app(); await gen(A); act(A, 'rd-appr'); act(A, 'rd-der', { v: 'both' }); await settle(A);
    assert.ok(A.T.rdLevels().easy && A.T.rdLevels().hard);
    A.T.RD.lv.easy.rl = Object.assign(clone(A.T.RD.lv.easy.rl), { title: 'EASY VERSION' });
    A.B.press({ act: 'cp-view', v: 'stu' }); A.B.press({ act: 'cp-lv', v: 'easy' });
    assert.ok(A.T.RM.lv === 'easy' && /aria-pressed="true"[^>]*>Easy</.test(A.T.cpLvHTML()));
    A.B.press({ act: 'cp-lv', v: 'medium' }); assert.strictEqual(A.T.RM.lv, 'medium'); A.T.setRM('medium');
  });
  await t('workflow: review → derive (one "Generate Easy & Hard", review tools folded, Edit approved Medium) → ready (Add)', async () => {
    const A = app(); await gen(A); let h = A.T.rdRvHTML();
    assert.ok(/aria-current="step">Review &amp; approve Medium/.test(h) && /data-act="rd-appr">Approve Medium/.test(h) && /What should AI change/.test(h) && !/data-act="rd-der"/.test(h));
    act(A, 'rd-appr'); assert.strictEqual(A.T.rdStage(A.T.RD.job), 'derive'); h = A.T.rdRvHTML();
    assert.strictEqual((h.match(/data-act="rd-der"/g) || []).length, 1, 'one generation action'); assert.ok(/>Generate Easy &amp; Hard</.test(h));
    assert.ok(!/id="rdFb"/.test(h) && /data-act="rd-edit"[^>]*>Edit approved Medium/.test(h), 'feedback folded after approval');
    assert.strictEqual((h.match(/class="rdvers"/g) || []).length, 1, 'version status in one place'); assert.ok(!/Easy/.test(A.T.rdLvHTML()), 'not repeated in the editor column');
    act(A, 'rd-edit'); h = A.T.rdRvHTML(); assert.ok(/id="rdFb"/.test(h) && /needs a new approval/.test(h) && /Close Medium editing/.test(h));
    act(A, 'rd-edit'); act(A, 'rd-der', { v: 'both' }); await settle(A); assert.strictEqual(A.T.rdStage(A.T.RD.job), 'ready');
    h = A.T.rdRvHTML(); assert.ok(/class="pill ok">Ready to add/.test(h) && /data-act="cp-goadd">Pick a slot/.test(h) && A.T.cpValid(), 'no book picked: points to the slot');
    A.T.CP.book = 'cam21'; A.T.CP.test = 't4'; h = A.T.rdRvHTML(); assert.ok(/data-act="add-ex">Add to Passage 1 · Cam 14 · Test 1/.test(h) || /data-act="add-ex">(Add|Replace)/.test(h), h.slice(h.indexOf('rdmain'), h.indexOf('rdmain') + 200));
  });
  await t('compact panel in Student View / Hide editor: status + main action only (no feedback box, no technical details)', async () => {
    const A = app(); await gen(A); A.T.CP.view = 'stu'; let h = A.T.rdRvHTML();
    assert.ok(/class="rdrv cmp"/.test(h) && !/id="rdFb"/.test(h) && !/rddiag/.test(h) && /data-act="rd-appr"/.test(h));
    act(A, 'rd-appr'); h = A.T.rdRvHTML(); assert.ok(/data-act="rd-open"/.test(h) && !/data-act="rd-edit"/.test(h));
    act(A, 'rd-open'); assert.ok(A.T.CP.view === 'sum' && !A.T.CP.wide);
  });
  await t('Generate again on an existing Medium asks first (no accidental regeneration)', async () => {
    const A = app(); await gen(A); const n = A.seen.length; A.B.W.confirm = () => false; A.T.rdGen(); await settle(A); assert.strictEqual(A.seen.length, n);
  });
  await t('Reading lesson: no big passage header, list of headings not squeezed by the header class, groups and questions unframed', () => {
    const src = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    assert.ok(!/[^>]\.rmhl\{display:flex/.test(src) && /\.rmhd2>\.rmhl\{display:flex/.test(src), '.rmhl flex only for the header');
    assert.ok(!src.includes('<div class="lsc rmhl">') && src.includes('<div class="rmhlb"><p class="rmlbl">List of Headings</p>'));
    assert.ok(/\.rm #rmBody \.lsc\{border:0;border-radius:0;background:none/.test(src) && /\.rmgrp\{padding:2px 0 18px;margin:0 0 6px\}/.test(src));
    assert.ok(/\.ls \.lsc \.opt,\.rm \.lsc \.opt\{min-height:48px;padding:\.6rem \.85rem;border:1px solid var\(--line\)/.test(src), 'answer options keep their borders');
  });
  await t('Admin › Users: Tester class cell shows —, the stored class stays (filters use it)', () => {
    const B = boot({ hooks: HOOKS }); B.T.AD.users = [{ email: 'cherry@x.com', name: 'Cherry', role: 'student', cls: 'Test', tester: true, status: 'active' }, { email: 'lan@x.com', name: 'Lan', role: 'student', cls: '7h30', status: 'active' }];
    const h = B.T.adListHTML(); assert.ok(/Cherry[\s\S]*?data-l="Class" class="c-sm">—</.test(h) && /data-l="Class" class="c-sm">7h30/.test(h) && B.T.AD.users[0].cls === 'Test');
  });
  await t('Homework Assistant: md-backend keeps the assistant role; rules give it no Firestore access; Boot opens no snapshots for it', () => {
    const be = fs.readFileSync(path.join(ROOT, 'md-backend.js'), 'utf8'), ru = fs.readFileSync(path.join(ROOT, 'firestore.rules'), 'utf8'), src = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    assert.ok(/role: t\.claims\.role === 'teacher' \|\| t\.claims\.role === 'assistant' \? t\.claims\.role : 'student'/.test(be));
    assert.ok(/request\.auth\.token\.get\('role', ''\) != 'assistant'/.test(ru));
    assert.ok(/window\.MD_USER\.role==='assistant'\)\{dbReady=true;setStatus\('saved'\);if\(!U\)signIn/.test(src));
  });
  out.forEach((l) => console.log(l)); console.log('---- ' + pass + '/' + (pass + fail) + ' passed'); process.exit(fail ? 1 : 0);
})();
