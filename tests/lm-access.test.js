// Learning Materials › Writing before launch: ordinary students see "Coming soon" and cannot open it; hidden testers (roster.tester) use it as before;
// teachers and admin unchanged. Real app script (tests/app-harness.js). Run: node tests/lm-access.test.js
'use strict';
const assert = require('assert');
const { boot } = require('./app-harness.js');
let pass = 0, fail = 0;
const t = (name, fn) => { try { fn(); pass++; console.log('PASS ' + name); } catch (e) { fail++; console.log('FAIL ' + name + ' -> ' + e.message); } };
const HOOKS = 'lmHTML:lmHTML,lmLesson:lmLesson,lmVisible:lmVisible,lmTester:lmTester,setLMV:function(v){LMV=v},get LMV(){return LMV},setLIBT:function(v){LIBT=v},setRoster:function(r){rosterDocs=r},openTree:function(k){LMO[k]=true}';
const STU = { name: 'Lan', email: 'lan@x.com', role: 'student', cls: 'A' }, TES = { name: 'Tester', email: 'tester@x.com', role: 'student', cls: 'Test' };
const ROSTER = [{ email: 'lan@x.com', name: 'Lan', cls: 'A', role: 'student' }, { email: 'tester@x.com', name: 'Tester', cls: 'Test', role: 'student', tester: true }];
const U0 = 'lm-writing-ac-t1-u0', U2 = 'lm-writing-ac-t1-u2';
const mk = (user) => { const B = boot({ hooks: HOOKS, user }); B.T.setRoster(ROSTER); B.T.setLIBT('lm'); B.T.openTree('s:writing'); B.T.openTree('m:ielts-academic-task1'); return B; };

t('ordinary student: Writing is shown, dimmed, disabled, "Coming soon"; no unit, no toggle', () => {
  const B = mk(STU), h = B.T.lmHTML();
  assert.ok(/<section class="lmmod lm-writing dis"[^>]*><button type="button" class="lmhd" disabled>[\s\S]*?<span class="lmsoon">Coming soon<\/span>/.test(h));
  assert.ok(!h.includes('data-k="s:writing"') && !h.includes('Unit 0') && !h.includes('Unit 2') && !h.includes('data-act="lm-open"'));
  assert.strictEqual(B.T.lmTester(), false);
});
t('ordinary student cannot open a Writing unit by any route (action, state, even a published one)', () => {
  const B = mk(STU); B.press({ act: 'lm-open', id: U0 }); assert.strictEqual(B.T.LMV, null);
  B.T.setLMV(U2); const h = B.T.lmHTML(); assert.ok(!h.includes('lusteps') && B.T.LMV === null, 'forced state is dropped');
  B.W.MD_LM.lessons.forEach((l) => { l.status = 'published'; }); assert.strictEqual(B.T.lmVisible(B.T.lmLesson(U2)), false);
  B.press({ act: 'lm-open', id: U2 }); assert.strictEqual(B.T.LMV, null);
});
t('hidden tester: no "Coming soon", Writing opens, Unit 0 and Unit 2 open as before', () => {
  const B = mk(TES), h = B.T.lmHTML(); assert.ok(B.T.lmTester());
  assert.ok(h.includes('data-k="s:writing"') && !/lm-writing dis/.test(h) && h.includes('data-id="' + U0 + '"') && h.includes('data-id="' + U2 + '"'));
  B.press({ act: 'lm-open', id: U0 }); assert.strictEqual(B.T.LMV, U0); assert.ok(B.T.lmHTML().includes('lusteps'));
  B.press({ act: 'lm-back' }); B.press({ act: 'lm-open', id: U2 }); assert.strictEqual(B.T.LMV, U2); assert.ok(B.T.lmHTML().includes('lusteps'));
});
t('the tester flag comes from the roster row (staff-written), not from the user object or the display name', () => {
  const B = mk(Object.assign({ tester: true }, STU)); assert.strictEqual(B.T.lmTester(), false, 'a "tester" field on the signed-in user is ignored');
  const C = mk({ name: 'Tester', email: 'someone@x.com', role: 'student', cls: 'Test' }); assert.strictEqual(C.T.lmTester(), false, 'a display name is not enough');
});
t('teacher: unchanged (Writing opens, unpublished units hidden); admin: unchanged (sees and opens everything)', () => {
  const T = mk({ name: 'T', email: 't@x.com', role: 'teacher' }), ht = T.T.lmHTML(); assert.ok(ht.includes('data-k="s:writing"') && !ht.includes('data-act="lm-open"') && ht.includes('No units yet'));
  const A = mk(), ha = A.T.lmHTML(); assert.ok(ha.includes('data-id="' + U0 + '"') && ha.includes('data-id="' + U2 + '"')); A.press({ act: 'lm-open', id: U2 }); assert.strictEqual(A.T.LMV, U2);
});
t('switching account updates at once (no state kept from the previous user)', () => {
  const B = mk(TES); B.press({ act: 'lm-open', id: U0 }); assert.strictEqual(B.T.LMV, U0);
  B.T.setU(Object.assign({ cls: '' }, STU)); const h = B.T.lmHTML(); assert.ok(!h.includes('lusteps') && /lm-writing dis/.test(h) && B.T.LMV === null);
  B.T.setU(Object.assign({ cls: '' }, TES)); assert.ok(B.T.lmHTML().includes('data-k="s:writing"'));
});
t('other skills and the Cambridge library are not affected', () => {
  const B = mk(STU), h = B.T.lmHTML(); ['listening', 'reading', 'speaking'].forEach((sk) => assert.ok(new RegExp('lm-' + sk + ' dis').test(h), sk + ' still "Coming soon" as before (no content yet)'));
  B.T.setLIBT('cam'); B.T.showTab('library'); assert.ok(!/lm-writing/.test(B.el('libBody').innerHTML));
});
console.log('---- ' + pass + '/' + (pass + fail) + ' passed');
process.exit(fail ? 1 : 0);
