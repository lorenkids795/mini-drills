// Dictation Lab in the app (index.html, real code, fake DOM): the Library entry exercises/dl-* becomes kind 'dictation' without
// any answer data; practice-only lessons can never be picked for homework; the app never creates a dictation attempt itself.
// Run: node tests/dictation-app.test.js
'use strict';
const assert = require('assert'), fs = require('fs'), path = require('path');
const { boot, ROOT } = require('./app-harness.js');
let pass = 0, fail = 0; const out = [];
function t(name, fn) { try { fn(); pass++; out.push('PASS ' + name); } catch (e) { fail++; out.push('FAIL ' + name + ' -> ' + e.message); } }
const HOOKS = 'setCustom:function(d){customDocs=d;rebuildCustom()},exOf:exOf,exSub:exSub,dlAssignable:dlAssignable,exIds:exIds,customMap:function(){return customMap}';
const DOCS = [
  { id: 'dl-lhw', title: 'Harbour (homework)', skill: 'listening', kind: 'dictation', dlId: 'lhw', dlVer: 2, dlMode: 'homework', dlLabel: 'teacher_audited', audio: '/api/audio/AAAAAAAAAAAAAAAAAAAAAA', bookId: 'cam21', testId: 't4', part: 1 },
  { id: 'dl-lpr', title: 'Club walk (practice)', skill: 'listening', kind: 'dictation', dlId: 'lpr', dlVer: 1, dlMode: 'practice', dlLabel: 'unverified_transcript', bookId: 'cam21', testId: 't4', part: 2 },
];
t('a published dictation entry is a Listening exercise of kind dictation, with no answer data', () => {
  const B = boot({ hooks: HOOKS }); B.T.setCustom(DOCS); const e = B.T.exOf('c_dl-lhw');
  assert.strictEqual(e.kind, 'dictation'); assert.strictEqual(e.skill, 'listening'); assert.strictEqual(e.dl.homework, true); assert.strictEqual(e.dl.ver, 2);
  assert.strictEqual(e.qs.length, 0); assert.ok(!JSON.stringify(e).match(/cleanText|spans|answer/i));
  assert.ok(B.T.exIds('cam21', 't4', 'listening').indexOf('c_dl-lhw') >= 0, 'shown in the Library slot');
});
t('the label tells homework vs practice and an unverified transcript', () => {
  const B = boot({ hooks: HOOKS }); B.T.setCustom(DOCS);
  assert.strictEqual(B.T.exSub(B.T.exOf('c_dl-lhw')), 'Dictation · homework'); assert.strictEqual(B.T.exSub(B.T.exOf('c_dl-lpr')), 'Dictation · practice · unverified transcript');
});
t('a practice-only (or unverified) lesson can never be picked for homework; an approved homework lesson can', () => {
  const B = boot({ hooks: HOOKS }); B.T.setCustom(DOCS); assert.strictEqual(B.T.dlAssignable('c_dl-lpr'), false); assert.strictEqual(B.T.dlAssignable('c_dl-lhw'), true); assert.strictEqual(B.T.dlAssignable('l1'), true);
});
t('the app never writes a dictation attempt and has no hint/reveal for dictation; the module loads only from dictation/bridge.js', () => {
  const s = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'); const a = s.indexOf('/* ---------- Dictation Lab (contract v1.1'); const blk = s.slice(a, s.indexOf('function renderPlayer(){', a));
  assert.ok(blk.length > 1000); assert.ok(!/collection\('attempts'\)|saveAttempt/.test(blk), 'no client-side attempt'); assert.ok(!/hint|reveal/i.test(blk.replace(/No hint, no reveal\./, '')), 'no hint/reveal');
  assert.ok(/sc\.src='dictation\/bridge\.js\?v='\+APP_VERSION/.test(blk));
});
out.forEach((l) => console.log(l)); console.log('---- ' + pass + '/' + (pass + fail) + ' passed'); process.exit(fail ? 1 : 0);
