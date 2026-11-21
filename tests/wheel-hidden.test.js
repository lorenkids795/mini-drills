// Lucky Wheel hidden from regular students for now (owner, 11/2026); testers keep it; teachers / admin get a read-only preview.
// Also: the "older work" note is a quiet line at the bottom, not a yellow banner. Run: node tests/wheel-hidden.test.js
'use strict';
const assert = require('assert'); const fs = require('fs'); const path = require('path');
const { boot } = require('./app-harness.js');
let pass = 0, fail = 0;
const t = (name, fn) => { try { fn(); pass++; console.log('PASS ' + name); } catch (e) { fail++; console.log('FAIL ' + name + ' -> ' + e.message); } };
const HOOKS = 'tabsFor:tabsFor,setRoster:function(r){rosterDocs=r},renderWheel:renderWheel';
const ROSTER = [{ email: 'lan@x.com', name: 'Lan', cls: 'A', role: 'student' }, { email: 'tester@x.com', name: 'Tester', cls: 'Test', role: 'student', tester: true }];
const tabs = (user) => { const B = boot({ hooks: HOOKS, user }); B.T.setRoster(ROSTER); return { B, ids: B.T.tabsFor().map((x) => x[0]) }; };
t('a regular student has no Lucky Wheel tab, and opening it directly shows nothing to spin', () => {
  const { B, ids } = tabs({ name: 'Lan', email: 'lan@x.com', role: 'student', cls: 'A' }); assert.ok(!ids.includes('wheel')); assert.ok(ids.includes('bag'));
  B.T.renderWheel(); const h = B.el('v-wheel').innerHTML; assert.ok(!h.includes('wh-spin') && !h.includes('<svg'), 'no wheel');
});
t('a tester keeps the Lucky Wheel', () => { assert.ok(tabs({ name: 'Tester', email: 'tester@x.com', role: 'student', cls: 'Test' }).ids.includes('wheel')); });
t('teacher and admin see a preview tab (no spin button)', () => {
  for (const u of [{ name: 'T', email: 't@x.com', role: 'teacher' }, { name: 'Admin', email: 'a@x.com', role: 'teacher', adm: true }]) {
    const { B, ids } = tabs(u); assert.ok(ids.includes('wheel'), u.name); B.T.renderWheel(); const h = B.el('v-wheel').innerHTML;
    assert.ok(h.includes('<svg') && h.includes('Hidden from students') && !h.includes('wh-spin'), u.name);
    let spun = 0; const n0 = B.W.calls.length; B.press({ act: 'wh-center' }); assert.strictEqual(B.W.calls.slice(n0).filter((f) => String(f.url).includes('spin')).length + spun, 0, 'the centre button does not spin for staff'); }
});
t('older-work note: quiet line after the page content, no yellow banner', () => {
  const s = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  assert.ok(s.includes("$('#v-dash').innerHTML=h+attCapHTML();") && s.includes("$('#v-mark').innerHTML=h+attCapHTML();"));
  assert.ok(s.includes('<p class="muted attcap" role="note">') && !s.includes('Showing work since'));
});
console.log('---- ' + pass + '/' + (pass + fail) + ' passed'); process.exit(fail ? 1 : 0);
