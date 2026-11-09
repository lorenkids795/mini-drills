// Homework: "Submitted" (I'm done!) is separate from "Completion" (the work really done). Library samples inventory + hide switch.
// Learning Materials labels Task 1 / Task 2. Real app code (tests/app-harness.js), no network.
// Run: node tests/hw-submission.test.js
'use strict';
const assert = require('assert'), fs = require('fs'), path = require('path');
const { boot, ROOT } = require('./app-harness.js');
let pass = 0, fail = 0; const out = [];
function t(name, fn) { try { fn(); pass++; out.push('PASS ' + name); } catch (e) { fail++; out.push('FAIL ' + name + ' -> ' + e.message); } }
const HOOKS = 'setAsg:function(a){localAsg=a},setHw:function(h){localHwdone=h},get localHwdone(){return localHwdone},setRoster:function(r){rosterDocs=r},setAttempts:function(a){localAttempts=a},' +
  'asgState:asgState,hwRows:hwRows,hwStatus:hwStatus,hwMatrixHTML:hwMatrixHTML,homeworkHTML:homeworkHTML,imDone:imDone,allAsgs:allAsgs,exIds:exIds,smpInventory:smpInventory,adSamplesHTML:adSamplesHTML,get LIB_HIDE(){return LIB_HIDE},hideSet:function(l){LIB_HIDE=l},lmHTML:lmHTML';
const DAY = 864e5, now = Date.now(), A22 = 'a'.repeat(22);
const ROSTER = [{ email: 'an@x.com', name: 'BẢO AN', cls: '21h', role: 'student' }];
const HW = { id: 'h1', cls: '21h', name: 'HW SUN 01.11', start: now - DAY, due: now + DAY, ex: ['l1', 'r1'] };
const OVER = Object.assign({}, HW, { id: 'h2', due: now - 1000 });
const MIX = Object.assign({}, HW, { id: 'h3', ext: [{ id: 'x1', link: 'https://f.example.com/a', src: 'Google Form' }], type: 'mixed' });
const att = (ex, ts) => ({ email: 'an@x.com', ex, score: 8, total: 10, answered: 10, required: 10, ts: ts || now });
const done = (asgId, extra) => Object.assign({ id: 'an-x-com_' + asgId, email: 'an@x.com', asgId, ts: now, done: true }, extra || {});
function tea(asgs) { const B = boot({ hooks: HOOKS }); B.T.setRoster(ROSTER); B.T.setAsg(asgs || [HW]); return B; }
const row = (B, a) => B.T.hwRows(a).rows[0];

t('1. nothing done, nothing submitted → Not submitted · Not started (0/2), not finished, 0%', () => {
  const B = tea(), r = row(B, HW), h = B.T.hwMatrixHTML(HW);
  assert.ok(!r.sub && !r.fin && r.done === 0 && r.n === 2); assert.strictEqual(B.T.hwStatus(HW).pct, 0);
  assert.ok(/Not submitted/.test(h) && /Not started \(0\/2\)/.test(h) && />Submitted<\/th>/.test(h) && />Completion<\/th>/.test(h) && !/TURNED IN|Turned in/.test(h));
});
t('2. "I\'m done!" record but 0/2 exercises (the reported case) → Submitted · Incomplete (0/2), not finished, 0%', () => {
  const B = tea(); B.T.setHw([done('h1')]); const r = row(B, HW), h = B.T.hwMatrixHTML(HW);
  assert.ok(r.sub && !r.fin && !r.all); assert.strictEqual(B.T.hwStatus(HW).pct, 0);
  assert.ok(/✓<\/span> Submitted/.test(h) && /Incomplete \(0\/2\)/.test(h), h);
  assert.ok(!/Complete \(/.test(h), 'never "Complete" for unfinished work');
  const S = B.T.asgState(B.T.allAsgs()[0], 'an@x.com'); assert.ok(S.libSub && !S.libComp && !S.fin && !S.turned);
  assert.ok(/<span class="mk wn" aria-hidden="true">!<\/span> Incomplete/.test(h), 'icon + words, not colour alone');
  // an old record written by "I'm done!" before screenshots existed (no done flag, no shots) is read the same way
  B.T.setHw([{ email: 'an@x.com', asgId: 'h1', ts: now }]); assert.ok(row(B, HW).sub && !row(B, HW).fin);
});
t('3. one of two exercises done → In progress (1/2), not finished, with or without "I\'m done!"', () => {
  const B = tea(); B.T.setAttempts([att('l1')]);
  assert.ok(/In progress \(1\/2\)/.test(B.T.hwMatrixHTML(HW)) && !row(B, HW).fin); assert.strictEqual(B.T.hwStatus(HW).pct, 50);
  B.T.setHw([done('h1')]); assert.ok(/Incomplete \(1\/2\)/.test(B.T.hwMatrixHTML(HW)) && !row(B, HW).fin);
});
t('4. both exercises done → Complete (2/2), finished; Submitted still shows whether the student pressed I\'m done', () => {
  const B = tea(); B.T.setAttempts([att('l1'), att('r1')]);
  let r = row(B, HW); assert.ok(r.fin && r.all && !r.sub); let h = B.T.hwMatrixHTML(HW); assert.ok(/Complete \(2\/2\)/.test(h) && /Not submitted/.test(h));
  B.T.setHw([done('h1')]); r = row(B, HW); assert.ok(r.fin && r.sub); assert.strictEqual(B.T.hwStatus(HW).pct, 100);
});
t('5. two Library exercises + one external task: complete only with all three; a screenshot never completes the Library work', () => {
  const B = tea([MIX]); B.T.setHw([done('h3', { shots: { x1: { id: A22, url: '/api/image/' + A22, ts: now } } })]);
  let r = row(B, MIX); assert.ok(!r.fin && r.done === 1 && r.n === 3 && /Incomplete \(1\/3\)/.test(B.T.hwMatrixHTML(MIX)));
  B.T.setAttempts([att('l1'), att('r1')]); r = row(B, MIX); assert.ok(r.fin && r.done === 3);
  B.T.setHw([]); r = row(B, MIX); assert.ok(!r.fin && r.done === 2, 'Library done, no screenshot → not complete');
});
t('6. student: I\'m done! is refused while exercises are left (nothing written); after doing them it writes done, and that survives a reload', () => {
  const B = boot({ hooks: HOOKS, user: { name: 'BẢO AN', email: 'an@x.com', role: 'student', cls: '21h' } }); B.T.setRoster(ROSTER); B.T.setAsg([HW]);
  B.T.imDone('h1'); assert.strictEqual(B.T.localHwdone.length, 0, 'not marked when unfinished');
  assert.ok(/2 exercises still to do/.test(B.T.homeworkHTML()));
  B.T.setAttempts([att('l1'), att('r1')]); B.T.imDone('h1'); assert.ok(B.T.localHwdone.length === 1 && B.T.localHwdone[0].done === true);
  const S = B.T.asgState(B.T.allAsgs()[0], 'an@x.com'); assert.ok(S.fin && S.libSub && S.turned && B.T.homeworkHTML().includes('All done ✓'));
  B.T.setHw([done('h1')]); B.T.setAttempts([]); // reload with only the stored submission (e.g. exercises changed later): not complete
  assert.ok(/You turned this in<\/b>, but 2 of 2 exercises are not finished yet/.test(B.T.homeworkHTML()) && !B.T.homeworkHTML().includes('All done ✓'));
});
t('7. legacy and late data: attempts before the send date do not count; an overdue unfinished, unsubmitted row says Not done', () => {
  const B = tea([OVER]); B.T.setAttempts([att('l1', now - 3 * DAY)]); const h = B.T.hwMatrixHTML(OVER);
  assert.ok(/Not done \(0\/2\)/.test(h) && !row(B, OVER).fin);
});
t('8. aggregates agree: hwStatus %, hwRows "all" (Dashboard) and the Completion column use the same parts', () => {
  const B = tea(); B.T.setHw([done('h1')]); B.T.setAttempts([att('l1')]);
  const r = row(B, HW), hs = B.T.hwStatus(HW); assert.strictEqual(hs.pct, 50); assert.ok(!r.all && !r.fin && !hs.rows[0].fin);
  const srv = fs.readFileSync(path.join(ROOT, 'functions', 'api', '[[path]].js'), 'utf8');
  const hw = fs.readFileSync(path.join(ROOT, 'md-hw.js'), 'utf8');
  assert.ok(/function hwaStatus[\s\S]{0,500}MDHW\.asgEval\(/.test(srv) && !/hwaStatus[\s\S]{0,700}\.done === true/.test(srv) && !/\.done ?=== ?true/.test(hw), 'Homework Assistant uses the shared rules (md-hw.js), which count real attempts, not the I\'m done flag');
});
t('Library samples: inventory lists the 9 code samples with references; nothing hidden until approved; the hide switch keeps them for old data', () => {
  const B = tea(); B.T.setAttempts([att('l1'), { email: 'x@x.com', ex: 'l1', id: 'seed_x_l1', seeded: true, score: 1, total: 10, ts: now }]);
  const R = B.T.smpInventory(); assert.deepStrictEqual(R.map((r) => r.id).join(), 'l1,l2,l3,r1,r2,r3,w1,s1,ra1');
  const l1 = R[0]; assert.ok(l1.title === 'Gap-fill the transcript' && /Cam 14 · Test 1 · Listening/.test(l1.where) && /not stored in Firestore/.test(l1.src) && l1.att === 1 && l1.seed === 1 && l1.asg.length === 1);
  assert.strictEqual(B.T.LIB_HIDE.length, 0, 'nothing hidden before approval');
  assert.deepStrictEqual(B.T.exIds('cam14', 't1', 'listening').slice(0, 3).join(), 'l1,l2,l3');
  B.T.hideSet(['l1', 'l2', 'l3']); assert.ok(B.T.exIds('cam14', 't1', 'listening').indexOf('l1') < 0, 'hidden from the Library list');
  assert.ok(row(B, HW).n === 2, 'an assignment that uses a hidden sample still counts it (EXS keeps it)');
  assert.ok(/Library samples/.test(B.T.adSamplesHTML()) && /readonly/.test(B.T.adSamplesHTML()));
});
t('Learning Materials › Writing: groups are "Task 1" and "Task 2" (no IELTS prefix), same ids', () => {
  const B = boot({ hooks: HOOKS }); const h = B.T.lmHTML();
  assert.ok(h.includes('>Task 1<') && h.includes('>Task 2<') && !/IELTS Academic Task 1|IELTS Task 2/.test(h) && /data-k="m:ielts-academic-task1"/.test(h) && /data-k="m:ielts-task2"/.test(h));
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'); assert.ok(/<script src="lm-content\.js\?v=/.test(html), 'versioned file: browsers do not keep the old labels');
});

out.forEach((l) => console.log(l)); console.log('---- ' + pass + '/' + (pass + fail) + ' passed'); if (fail) process.exitCode = 1;
