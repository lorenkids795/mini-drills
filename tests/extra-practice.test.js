// Library › Extra practice (11/2026): exercises outside the Cambridge books, grouped by a category the admin types in Create.
// Stored as bookId 'xtra' + testId 'k_<slug>' + cat, so Library cards, the assignment picker and labels reuse the Cambridge code.
// Real app script (tests/app-harness.js) + the real Dictation server part. Run: node tests/extra-practice.test.js
'use strict';
const assert = require('assert'); const path = require('path'); const { pathToFileURL } = require('url');
const { boot } = require('./app-harness.js');
let pass = 0, fail = 0; const T = [];
const t = (name, fn) => T.push([name, fn]);
const HOOKS = 'setCustom:function(d){customDocs=d;rebuildCustom()},xCats:xCats,exIds:exIds,locLabel:locLabel,locOf:locOf,pickBooks:pickBooks,treeHTML:treeHTML,setPk:function(p){AS.pk=p},renderLib:renderLib,setLibt:function(v){LIBT=v},' +
  'get CP(){return CP},checkJSON:checkJSON,addExercise:addExercise,renderSlotMap:renderSlotMap,get localCustom(){return localCustom},crumbs:crumbs,setNav:function(n){NAV=n},xKey:xKey,cpSlotInfo:cpSlotInfo,dlSlot:dlSlot';
const DOCS = [
  { id: 'g1', bookId: 'xtra', testId: 'k_grammar', cat: 'Grammar', part: 1, skill: 'reading', title: 'Articles: a / an / the', material: 'A short text.', qs: [{ id: 'q1', type: 'gap', q: 'I saw ___ owl.', ans: ['an'] }] },
  { id: 'c1', bookId: 'cam14', testId: 't1', part: 1, skill: 'reading', title: 'Cambridge passage', material: 'Text.', qs: [{ id: 'q1', type: 'gap', q: 'x', ans: ['y'] }] },
];
const STU = { name: 'Lan', email: 'lan@x.com', role: 'student', cls: 'A' };
const EX = JSON.stringify({ title: 'Prepositions of time', skill: 'reading', material: 'We meet on Monday at seven.', questions: [{ type: 'gap', q: 'We meet ___ Monday.', ans: ['on'] }] });

t('an Extra practice exercise is found by its category, outside every Cambridge book', () => {
  const B = boot({ hooks: HOOKS }); B.T.setCustom(DOCS);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(B.T.xCats())), [{ k: 'k_grammar', n: 'Grammar' }]);
  assert.strictEqual(B.T.exIds('xtra', 'k_grammar', 'reading').join(), 'c_g1'); assert.ok(B.T.exIds('cam14', 't1', 'reading').indexOf('c_g1') < 0);
  assert.strictEqual(B.T.locLabel(B.T.locOf('c_g1')), 'Extra practice · Grammar · Reading');
  assert.strictEqual(B.T.xKey('Từ vựng & Grammar!'), 'k_tu-vung-grammar');
});
t('Library has a third tab; a student sees the category card; empty state when there is nothing', () => {
  const B = boot({ hooks: HOOKS, user: STU }); B.T.setCustom(DOCS); B.T.setLibt('xtra'); B.T.renderLib(); const h = B.el('libBody').innerHTML;
  assert.ok(/tab\b[^>]*data-v="xtra"[^>]*aria-selected="true">Extra practice</.test(h), 'tab selected');
  assert.ok(h.includes('Grammar') && h.includes('data-v="k_grammar"'), 'category card'); assert.ok(!h.includes('Cambridge passage'));
  const E = boot({ hooks: HOOKS, user: STU }); E.T.setCustom(DOCS.slice(1)); E.T.setLibt('xtra'); E.T.renderLib(); assert.ok(E.el('libBody').innerHTML.includes('No extra exercises yet'));
});
t('opening the exercise from the card works and the breadcrumb names Extra practice (no crash on the pseudo book)', () => {
  const B = boot({ hooks: HOOKS, user: STU }); B.T.setCustom(DOCS); B.T.setLibt('xtra');
  B.press({ act: 'nav', book: 'xtra', test: 'k_grammar', skill: 'reading', ex: 'c_g1' }); const c = B.el('crumbs').innerHTML;
  assert.ok(c.includes('Extra practice') && c.includes('Grammar') && c.includes('Articles'), c.slice(0, 200));
});
t('the homework picker offers Extra practice with a Category filter', () => {
  const B = boot({ hooks: HOOKS }); B.T.setCustom(DOCS); assert.ok(B.T.pickBooks().some((b) => b.id === 'xtra'));
  B.T.setPk({ book: 'xtra', test: 'all', skill: 'all' }); const h = B.T.treeHTML();
  assert.ok(h.includes('>Category<') && h.includes('All categories') && h.includes('Articles: a / an / the') && h.includes('Grammar · Reading'));
});
t('Create: choose Extra practice, add a new category, add an exercise → saved with bookId xtra, the category key and name', () => {
  const B = boot({ hooks: HOOKS }); B.T.setCustom(DOCS); B.T.showTab('create'); B.T.CP.skill = 'reading';
  B.change({ id: 'cBook', value: 'xtra' }); assert.strictEqual(B.T.CP.book, 'xtra');
  B.el('cpXCat').value = '  Exam   tips '; B.press({ act: 'cp-xcat' }); assert.strictEqual(B.T.CP.test, 'k_exam-tips');
  assert.ok(B.el('cpTests').innerHTML.includes('Exam tips') && B.el('cpTests').innerHTML.includes('Grammar'));
  assert.ok(B.el('cpSlotH').textContent === 'Pick a category');
  B.T.checkJSON(EX); const si = B.T.cpSlotInfo(); assert.strictEqual(si.ok, true); assert.strictEqual(si.btn, 'Add to Exam tips');
  B.T.addExercise(); const r = B.T.localCustom[B.T.localCustom.length - 1];
  assert.strictEqual(r.bookId, 'xtra'); assert.strictEqual(r.testId, 'k_exam-tips'); assert.strictEqual(r.cat, 'Exam tips'); assert.strictEqual(r.part, 1);
  assert.ok(B.T.xCats().some((c) => c.k === 'k_exam-tips'), 'the category now exists'); assert.ok(/Added “Prepositions of time” to Extra practice · Exam tips · Reading/.test(B.T.CP.msg));
});
t('Create: switching back to a book returns to Test 1 and slots; no category without a name', () => {
  const B = boot({ hooks: HOOKS }); B.T.setCustom(DOCS); B.T.showTab('create');
  B.change({ id: 'cBook', value: 'xtra' }); B.el('cpXCat').value = ' !!! '; B.press({ act: 'cp-xcat' }); assert.ok(/category name/.test(B.toast()));
  B.change({ id: 'cBook', value: 'cam14' }); assert.strictEqual(B.T.CP.test, 't1'); assert.strictEqual(B.el('cpSlotH').textContent, 'Pick a free slot');
});
t('× next to a category: an empty new one goes at once; one with exercises asks (type DELETE) and deletes them; Dictation blocks it', () => {
  const B = boot({ hooks: HOOKS }); B.T.setCustom(DOCS); B.T.showTab('create'); B.T.CP.skill = 'reading'; B.change({ id: 'cBook', value: 'xtra' });
  assert.ok(B.el('cpTests').innerHTML.includes('data-act="cp-xdel" data-t="k_grammar" aria-label="Remove category Grammar"'));
  B.el('cpXCat').value = 'Tips'; B.press({ act: 'cp-xcat' }); assert.ok(B.el('cpTests').innerHTML.includes('>Tips<'));
  B.press({ act: 'cp-xdel', t: 'k_tips' }); assert.strictEqual(B.asking(), '', 'no question for an empty category'); assert.ok(!B.el('cpTests').innerHTML.includes('>Tips<'));
  B.press({ act: 'cp-xdel', t: 'k_grammar' }); assert.ok(/Remove the category “Grammar”/.test(B.asking()));
  B.cancel(); assert.ok(B.T.xCats().some((c) => c.k === 'k_grammar'), 'Cancel keeps it');
  B.press({ act: 'cp-xdel', t: 'k_grammar' }); B.ok(); assert.ok(B.asking(), 'needs DELETE typed'); B.el('uiIn').value = 'DELETE'; B.ok();
  assert.strictEqual(B.T.xCats().length, 0); assert.strictEqual(B.T.exIds('cam14', 't1', 'reading').join(), 'c_c1', 'Cambridge untouched'); assert.ok(/removed/.test(B.toast()));
  const D = boot({ hooks: HOOKS }); D.T.setCustom(DOCS.concat([{ id: 'dl-L9', kind: 'dictation', bookId: 'xtra', testId: 'k_grammar', cat: 'Grammar', skill: 'listening', title: 'D' }])); D.T.showTab('create'); D.change({ id: 'cBook', value: 'xtra' });
  D.press({ act: 'cp-xdel', t: 'k_grammar' }); assert.strictEqual(D.asking(), ''); assert.ok(/Unpublish it first/.test(D.toast())); assert.ok(D.T.xCats().length === 1);
});
t('Dictation can be published into an Extra practice category (server checks the key and the name)', async () => {
  const B = boot({ hooks: HOOKS }); B.T.setCustom(DOCS); B.T.showTab('create'); B.T.CP.skill = 'listening'; B.change({ id: 'cBook', value: 'xtra' }); B.T.renderSlotMap();
  const sl = B.T.dlSlot(); assert.strictEqual(sl.book, 'xtra'); assert.strictEqual(sl.test, 'k_grammar'); assert.strictEqual(sl.cat, 'Grammar');
  const S = await import(pathToFileURL(path.join(__dirname, '..', 'dictation-server.js')).href); const db = {};
  const D = { fsGet: async (e, c, id) => (db[c + '/' + id] ? { data: db[c + '/' + id], updateTime: 'u' } : null), fsPut: async (e, c, id, o) => { db[c + '/' + id] = o; }, fsUpdate: async (e, c, id, o) => { db[c + '/' + id] = Object.assign(db[c + '/' + id] || {}, o); return true; }, fsDelete: async () => {}, adminEmail: () => 'a@x', json: (d, s) => ({ status: s || 200, data: d }), fail: (m, s) => ({ status: s || 400, data: { error: m } }) };
  db['dlLessons/L1'] = { cur: 1, approved: 1, approvedMode: 'practice' }; db['dlVersions/L1_1'] = { title: 'T', audited: false, audio: '' };
  const ok = await S.dlAdmin(D, {}, { op: 'publish', lid: 'L1', bookId: 'xtra', testId: 'k_grammar', part: 1, cat: 'Grammar' }); assert.strictEqual(ok.status, 200, JSON.stringify(ok.data));
  assert.strictEqual(db['exercises/dl-L1'].bookId, 'xtra'); assert.strictEqual(db['exercises/dl-L1'].cat, 'Grammar');
  assert.strictEqual((await S.dlAdmin(D, {}, { op: 'publish', lid: 'L1', bookId: 'xtra', testId: '../x', part: 1, cat: 'G' })).status, 400);
  assert.strictEqual((await S.dlAdmin(D, {}, { op: 'publish', lid: 'L1', bookId: 'xtra', testId: 'k_grammar', part: 1, cat: '' })).status, 400);
});
(async () => { for (const [name, fn] of T) { try { await fn(); pass++; console.log('PASS ' + name); } catch (e) { fail++; console.log('FAIL ' + name + ' -> ' + (e && e.message)); } }
  console.log('---- ' + pass + '/' + (pass + fail) + ' passed'); process.exit(fail ? 1 : 0); })();
