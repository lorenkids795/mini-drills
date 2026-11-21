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
t('older-work note only when the Dashboard filter picks a month / year older than the loaded work; never on Marking', () => {
  const B = boot({ hooks: 'attCapHTML:attCapHTML,setF:function(m,y){F.month=m;F.year=y},setATT:function(o){Object.assign(ATT,o)},setTab:function(t){TAB=t}', user: { name: 'T', email: 't@x.com', role: 'teacher' } });
  const lo = new Date(2026, 8, 22).getTime(); B.T.setATT({ db: {}, more: true, lo }); B.T.setTab('dash');
  B.T.setF('all', 'all'); assert.strictEqual(B.T.attCapHTML(), '', 'All / All');
  B.T.setF('2026-10', 'all'); assert.strictEqual(B.T.attCapHTML(), '', 'a loaded month');
  B.T.setF('2026-09', 'all'); assert.ok(B.T.attCapHTML().includes('Load older work'), 'September starts before 22 Sep');
  B.T.setF('all', '2026'); assert.ok(B.T.attCapHTML().includes('Load older work'), 'the whole year');
  B.T.setF('all', '2027'); assert.strictEqual(B.T.attCapHTML(), '');
  B.T.setTab('mark'); B.T.setF('2026-09', 'all'); assert.strictEqual(B.T.attCapHTML(), '', 'Marking: never');
});
console.log('---- ' + pass + '/' + (pass + fail) + ' passed'); process.exit(fail ? 1 : 0);
