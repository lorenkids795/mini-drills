// Dictation Lab in the app (index.html, real code, fake DOM): the Library entry exercises/dl-* becomes kind 'dictation' without
// any answer data; practice-only lessons can never be picked for homework; the app never creates a dictation attempt itself.
// Run: node tests/dictation-app.test.js
'use strict';
const assert = require('assert'), fs = require('fs'), path = require('path');
const { boot, ROOT } = require('./app-harness.js');
let pass = 0, fail = 0; const out = [];
const P = []; function t(name, fn) { P.push(Promise.resolve().then(fn).then(() => { pass++; out.push('PASS ' + name); }, (e) => { fail++; out.push('FAIL ' + name + ' -> ' + e.message); })); }
const HOOKS = 'setCustom:function(d){customDocs=d;rebuildCustom()},exOf:exOf,exSub:exSub,dlAssignable:dlAssignable,exIds:exIds,customMap:function(){return customMap},dlRawHTML:dlRawHTML';
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
t('teacher answers panel: student text and names are escaped; expired details show a neutral state, score kept', () => {
  const B = boot({ hooks: HOOKS }); const X = '<img src=x onerror=alert(1)>';
  const h = B.T.dlRawHTML({ ok: true, on: true, days: 90, hidden: 1, rows: [
    { name: 'An ' + X, cls: 'C1', raw: 'kept', expiresAt: Date.now() + 864e5, score: { num: 3, den: 4 }, passed: true, items: [{ id: 'l3-001', state: 'attempted', first: { num: 2, den: 5, exact: false }, answer: X + ' "q"', key: 'the key ' + X }] },
    { name: 'Binh', cls: 'C1', raw: 'expired', expiresAt: 0, score: { num: 1, den: 4 }, passed: false, items: [{ id: 'l3-001', state: 'attempted', first: { num: 5, den: 5, exact: true }, key: 'k' }] }] });
  assert.ok(!h.includes('<img'), 'no raw HTML'); assert.ok(h.includes('&lt;img src=x onerror=alert(1)&gt;'));
  assert.ok(h.includes('answer details expired') && h.includes('25%'), 'expired: neutral state, score still shown'); assert.ok(h.includes('75%') && h.includes('90 days'));
  assert.ok(h.split('Student:').length === 2, 'no answer line for the expired row'); assert.ok(/1 submission\(s\) from classes that are not yours/.test(h));
});
t('write-the-script result: Writing feedback (numbered corrections at the exact place, corrected text, New vocabulary + Flashcard), script, Error Notebook link', async () => {
  const S = await import(require('url').pathToFileURL(path.join(ROOT, 'dictation', 'script.js')).href);
  const script = 'ANNA: I want the red bag and the blue bag.'; const text = 'I want the red bag and the blu bag'; const r = S.compareScript(script, text);
  const R = Object.assign({ script, ai: { corrections: r.corrections, vocabulary_upgrades: [{ original: '', upgraded: 'blue bag', example: 'I want the red bag and the blue bag.', note: 'túi xanh', vi: 'túi xanh' }] }, added: 1 }, r);
  const B = boot({ hooks: HOOKS + ',dlResultHTML:dlResultHTML,fixSpans:fixSpans,aiItems:aiItems', user: { name: 'Lan', email: 'lan@x.com', role: 'student', cls: 'A' } });
  const h = B.T.dlResultHTML(R, null, script, 'hw');
  assert.ok(h.includes('>Corrections<') && h.includes('Corrected essay') && h.includes('New vocabulary') && h.includes('+ Flashcard') && h.includes('Script of the recording') && h.includes('Error Notebook'));
  assert.ok(h.includes('✗ Not passed') === !r.passed && h.includes(r.pct + '%'));
  const sp = B.T.fixSpans(text, B.T.aiItems(R.ai)); assert.strictEqual(sp.length, 1); assert.strictEqual(sp[0].i, text.lastIndexOf('blu'), 'the second "bag" area, not the first match');
  const x = B.T.dlResultHTML(Object.assign({}, R, { text: '<img src=x onerror=1>', ai: { corrections: [], vocabulary_upgrades: [] } }), null, '<b>s</b>', 'pr');
  assert.ok(!x.includes('<img') && !x.includes('<b>s</b>'), 'student text and script escaped'); assert.ok(x.includes('Write it again'));
  const k = B.T.dlResultHTML(null, { pct: 80, passed: true, words: { right: 8, script: 10 } }, script, 'hw'); assert.ok(k.includes('no longer kept') && k.includes('80%'));
});
const done = () => { out.forEach((l) => console.log(l)); console.log('---- ' + pass + '/' + (pass + fail) + ' passed'); process.exit(fail ? 1 : 0); }; Promise.all(P).then(done);
