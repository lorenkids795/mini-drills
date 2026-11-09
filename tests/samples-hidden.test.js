// Decision C (11/2026): the 8 original Cambridge 14 · Test 1 samples are hidden from the Library (LIB_HIDE), nothing deleted.
// Cambridge 14 shows 0 exercises; the real attempts on them (r3, w1, s1) and the tester seed_* attempts keep their titles,
// scores and feedback; no write happens because of the switch. Real app code, no network. Run: node tests/samples-hidden.test.js
'use strict';
const assert = require('assert'), fs = require('fs'), path = require('path');
const { boot, ROOT } = require('./app-harness.js');
let pass = 0, fail = 0; const out = [];
function t(name, fn) { try { fn(); pass++; out.push('PASS ' + name); } catch (e) { fail++; out.push('FAIL ' + name + ' -> ' + e.message); } }
const HOOKS = 'setRoster:function(r){rosterDocs=r},setAttempts:function(a){localAttempts=a},exIds:exIds,allIdsBook:allIdsBook,slotsOf:slotsOf,pickIds:pickIds,subsAll:subsAll,exName:exName,recentHTML:recentHTML,showTab:showTab,smpInventory:smpInventory,get LIB_HIDE(){return LIB_HIDE},setPk:function(p){AS.pk=p}';
const now = Date.now(), HID = ['l1', 'l2', 'l3', 'r1', 'r2', 'r3', 'w1', 's1'];
const ROSTER = [{ email: 'an@x.com', name: 'An', cls: '7h30', role: 'student' }, { email: 'tester@x.com', name: 'T', cls: 'Test', role: 'student', tester: true }];
// the real history the owner listed: r3 ×1, w1 ×10 (2 graded), s1 ×2 (2 graded) + tester seed_* attempts
function history() {
  const A = [{ id: 'r3a', email: 'an@x.com', cls: '7h30', ex: 'r3', score: 3, total: 5, ts: now - 5e8 }];
  for (let i = 0; i < 10; i++) A.push({ id: 'w' + i, email: 'an@x.com', cls: '7h30', ex: 'w1', kind: 'submission', score: 0, total: 0, text: 'Essay ' + i, ts: now - i * 1e7, grade: i < 2 ? { overall: 6, max: 9, feedback: 'Good' } : undefined });
  for (let i = 0; i < 2; i++) A.push({ id: 's' + i, email: 'an@x.com', cls: '7h30', ex: 's1', kind: 'submission', score: 0, total: 0, ts: now - i * 1e7, grade: { overall: 5.5, max: 9 } });
  ['l1', 'r1', 'l2', 'r3', 'l3'].forEach((ex) => A.push({ id: 'seed_tester-x-com_' + ex, email: 'tester@x.com', cls: 'Test', ex, score: 4, total: 5, seeded: true, ts: now - 1e6 }));
  return A.map((x) => { if (x.grade === undefined) delete x.grade; return x; });
}

t('the switch holds exactly the 8 approved samples (ra1 was never in the Library)', () => {
  const B = boot({ hooks: HOOKS }); assert.strictEqual(JSON.stringify(B.T.LIB_HIDE.slice().sort()), JSON.stringify(HID.slice().sort()));
});
t('Cambridge 14 has 0 exercises: Library, teacher cover "Empty", student sees no Cambridge 14 tile', () => {
  const B = boot({ hooks: HOOKS }); B.T.setRoster(ROSTER);
  assert.strictEqual(B.T.allIdsBook('cam14').length, 0);
  ['listening', 'reading', 'writing', 'speaking'].forEach((s) => assert.strictEqual(B.T.exIds('cam14', 't1', s).length, 0, s));
  B.T.showTab('library'); const h = B.el('libBody').innerHTML;
  assert.ok(/class="bk e"[^>]*data-v="cam14"[^>]*>[\s\S]*?Empty/.test(h), 'teacher: grey cover, Empty');
  const S = boot({ hooks: HOOKS, user: { name: 'An', email: 'an@x.com', role: 'student', cls: '7h30' } }); S.T.setRoster(ROSTER); S.T.showTab('library');
  assert.ok(!/data-v="cam14"/.test(S.el('libBody').innerHTML), 'student: no tile for an empty book');
});
t('hidden everywhere a new exercise is picked: assignment picker and Create slot map (slots are free again)', () => {
  const B = boot({ hooks: HOOKS }); B.T.setRoster(ROSTER);
  B.T.setPk({ book: 'cam14', test: 'all', skill: 'all' }); assert.strictEqual(B.T.pickIds().length, 0, 'the picker offers nothing from Cambridge 14');
  ['listening', 'reading', 'writing', 'speaking'].forEach((sk) => { const sl = B.T.slotsOf('cam14', 't1', sk).slice(1); assert.ok(sl.length >= 2 && sl.every((x) => x === null), sk + ' slots all free: ' + JSON.stringify(sl)); });
});
t('history kept: the 13 real attempts keep title, score, marks and feedback; Marking still lists w1 / s1', () => {
  const B = boot({ hooks: HOOKS }); B.T.setRoster(ROSTER); B.T.setAttempts(history());
  assert.strictEqual(B.T.exName('w1'), 'Task 1: internet access'); assert.strictEqual(B.T.exName('s1'), 'Parts 1 and 2: free time'); assert.strictEqual(B.T.exName('r3'), 'Note completion');
  const subs = B.T.subsAll().filter((a) => a.email === 'an@x.com'); assert.strictEqual(subs.length, 12, 'w1 ×10 + s1 ×2 still in Marking');
  assert.strictEqual(subs.filter((a) => a.grade).length, 4, 'w1 ×2 + s1 ×2 marked, marks kept');
  const S = boot({ hooks: HOOKS, user: { name: 'An', email: 'an@x.com', role: 'student', cls: '7h30' } }); S.T.setRoster(ROSTER); S.T.setAttempts(history());
  const r = S.T.recentHTML(); assert.ok(/3\/5/.test(r) || /Note completion/.test(r), 'r3 result still in Recent results');
});
t('tester seed_* attempts are untouched and still counted in the inventory', () => {
  const B = boot({ hooks: HOOKS }); B.T.setRoster(ROSTER); B.T.setAttempts(history());
  const R = B.T.smpInventory(), by = {}; R.forEach((r) => { by[r.id] = r; });
  assert.strictEqual(['l1', 'r1', 'l2', 'r3', 'l3'].reduce((n, id) => n + by[id].seed, 0), 5); assert.ok(HID.every((id) => by[id].hidden));
  assert.strictEqual(by.w1.att, 10); assert.strictEqual(by.s1.att, 2); assert.strictEqual(by.r3.att, 1);
});
t('no write is tied to the switch (it is a filter only), and demo mode still shows the samples', () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const uses = html.match(/[^\n]*LIB_HIDE[^\n]*/g); assert.ok(uses.every((l) => !/collection\(|\.delete\(|\.set\(|\.update\(/.test(l)), 'no Firestore call next to LIB_HIDE');
  const D = boot({ hooks: HOOKS, demo: true }); assert.ok(D.T.exIds('cam14', 't1', 'listening').indexOf('l1') >= 0);
});
out.forEach((l) => console.log(l)); console.log('---- ' + pass + '/' + (pass + fail) + ' passed'); if (fail) process.exitCode = 1;
