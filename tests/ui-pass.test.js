// UI/UX pass (11/2026): the app's own confirm box, Home order and "I'm done!", one Demo helper strip, Homework Assistant sidebar,
// Admin groups, Tester mode, Library tiles, Class settings, design tokens, marking boxes, folded AI sections.
// Real app code (tests/app-harness.js). Run: node tests/ui-pass.test.js
'use strict';
const assert = require('assert'), fs = require('fs'), path = require('path');
const { boot, ROOT } = require('./app-harness.js');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
let pass = 0, fail = 0; const out = [];
function t(name, fn) { try { fn(); pass++; out.push('PASS ' + name); } catch (e) { fail++; out.push('FAIL ' + name + ' -> ' + e.message); } }
const HOOKS = 'uiAsk:uiAsk,get UIA(){return UIA},renderLib:renderLib,setAsg:function(a){localAsg=a},setRoster:function(r){rosterDocs=r},get HWA(){return HWA},tabsFor:tabsFor,renderAdmin:renderAdmin,get AD(){return AD},settingsHTML:settingsHTML,correctedBlockHTML:correctedBlockHTML,aiHTML:aiHTML';
const now = Date.now(), DAY = 864e5;

t('confirm box: alertdialog with title, text and two clear buttons; Cancel / Esc do nothing; "type DELETE" is checked', () => {
  const B = boot({ hooks: HOOKS }); let done = 0;
  B.T.uiAsk({ title: 'Remove it?', text: 'Cannot be undone.', ok: 'Remove', danger: true, onOk: () => { done++; } });
  const h = B.el('uiDlg').innerHTML; assert.ok(/role="alertdialog" aria-modal="true" aria-labelledby="uiDT" aria-describedby="uiDD"/.test(h) && h.includes('>Remove it?<') && /class="btn bad" type="button" data-act="ui-ok">Remove</.test(h) && /data-act="ui-cancel">Cancel</.test(h));
  B.cancel(); assert.ok(!done && !B.asking());
  B.T.uiAsk({ title: 'Delete class?', ok: 'Delete class', danger: true, must: 'DELETE', onOk: () => { done++; } });
  B.el('uiIn').value = 'delete'; B.ok(); assert.ok(!done && /Type DELETE exactly/.test(B.el('uiErr').textContent), 'wrong word refused');
  B.el('uiIn').value = 'DELETE'; B.ok(); assert.ok(done === 1 && !B.asking());
});
t('browser dialogs only where the browser must answer at once (unsaved recording, sign out with unsaved work, Admin fallback)', () => {
  const code = html.replace(/\/\*[\s\S]*?\*\//g, '').replace(/:!confirm\(/g, ':FALLBACK('); // comments and the no-button fallbacks do not count
  const n = (code.match(/(^|[^\w.])confirm\(/g) || []).length, p = (code.match(/(^|[^\w.])prompt\(/g) || []).length;
  assert.ok(n <= 2 && p <= 1, 'confirm ' + n + ', prompt ' + p + ' (allowed: sign out with unsaved work + the Admin fallback)');
  assert.ok(!/confirm\('Remove|confirm\('Cancel|confirm\('Delete ALL|prompt\('Delete the class/.test(html));
});
t('Home: homework comes first while something is still to do; "I\'m done!" only appears when the exercises are finished', () => {
  const B = boot({ hooks: HOOKS, user: { name: 'Lan', email: 'lan@x.com', role: 'student', cls: '7h30' } });
  B.T.setRoster([{ email: 'lan@x.com', name: 'Lan', cls: '7h30', role: 'student' }]);
  B.T.setAsg([{ id: 'a1', cls: '7h30', start: now - DAY, due: now + DAY, ex: ['l1', 'r1'] }]); B.T.renderLib();
  let h = B.el('libBody').innerHTML; assert.ok(h.indexOf('class="lock"') >= 0 && h.indexOf('class="lock"') < h.indexOf('class="daily"'), 'homework first');
  assert.ok(!/data-act="imdone"/.test(h) && /2 of 2 exercises to do/.test(h) && /class="btn more sec" data-act="needtime"/.test(h));
  B.T.setAsg([]); B.T.renderLib(); h = B.el('libBody').innerHTML; assert.ok(h.indexOf('class="daily"') < h.indexOf('class="lock"'), 'nothing due: Daily practice first');
  assert.ok(/class="flame[^"]*" aria-hidden="true"><svg/.test(h) && !/🔥|🕯️/.test(h.split('class="daily"')[1].slice(0, 600)), 'line icon, no emoji');
});
t('Homework Assistant: the 4 pages are sidebar tabs; opening one sets the page (no small tabs inside)', () => {
  const B = boot({ hooks: HOOKS, user: { name: 'A', email: 'as@x.com', role: 'assistant' } });
  assert.strictEqual(JSON.stringify(B.T.tabsFor().map((x) => x[1])), '["Dashboard","Assignments","Missing homework","Students to watch"]');
  B.T.HWA.data = { classes: ['7h30'], now, from: now - 60 * DAY, students: [], assignments: [], status: {}, notes: {} };
  B.T.showTab('hwa-miss'); assert.ok(B.T.HWA.view === 'missing' && B.el('v-hwa').innerHTML.includes('<h2>Missing homework</h2>') && !B.el('v-hwa').innerHTML.includes('data-act="hwa-view"'));
});
t('Admin: sub-pages in 4 labelled groups; Prizes linked from Gamification', () => {
  const B = boot({ hooks: HOOKS }); B.T.AD.users = []; B.T.showTab('admin'); const h = B.el('v-admin').innerHTML;
  ['People', 'Classes &amp; data', 'Gamification', 'Tools'].forEach((g) => assert.ok(h.includes('<span class="adngl">' + g + '</span>'), g));
  assert.ok(h.includes('data-act="tab" data-tab="prize"') && h.includes('data-v="assist"') && h.includes('data-v="season"'));
});
t('Tester: "Tester mode" pill in the header; an ordinary student has none', () => {
  const B = boot({ hooks: HOOKS, user: { name: 'T', email: 't@x.com', role: 'student', cls: 'Test' } }); B.T.setRoster([{ email: 't@x.com', name: 'T', cls: 'Test', role: 'student', tester: true }]); B.T.showTab('library');
  assert.ok(/class="pill tst"[^>]*>Tester mode</.test(B.el('whoName').innerHTML));
  const S = boot({ hooks: HOOKS, user: { name: 'S', email: 's@x.com', role: 'student', cls: 'A' } }); S.T.setRoster([{ email: 's@x.com', name: 'S', cls: 'A', role: 'student' }]); S.T.showTab('library');
  assert.ok(!/Tester mode/.test(S.el('whoName').innerHTML));
});
t('Library (teacher): coloured book covers, one per book; empty books grey "Empty"', () => {
  const B = boot({ hooks: HOOKS }); B.T.showTab('library'); const h = B.el('libBody').innerHTML;
  assert.ok(h.includes('<div class="covers">') && /class="bk[^"]*"[^>]*style="--h:\d+"><small>CAMBRIDGE IELTS<\/small><b>14<\/b>/.test(h) && /class="bk e"[^>]*>[\s\S]*?Empty</.test(h));
});
t('Class settings: section links; Delete class folded; no made-up join link', () => {
  const B = boot({ hooks: HOOKS }); const h = B.T.settingsHTML('7h30');
  assert.ok(h.includes('<nav class="csnav"') && h.includes('data-act="cs-jump" data-id="csS_stu"') && /<details class="sec csdanger" id="csS_del"><summary><h3>Delete class<\/h3><\/summary>/.test(h));
  assert.ok(!h.includes('minidrills.app/join') && h.includes('data-act="cs-code"'), 'no made-up link; a real join link is created on request');
});
t('design tokens: one type scale and one radius scale; the old near-duplicate sizes are gone (Leaderboard / sign-in keep theirs)', () => {
  assert.ok(/--fs-xs:\.78rem; --fs-sm:\.84rem; --fs-body:\.9rem; --fs-md:1rem; --fs-lg:1\.15rem;/.test(html) && /--r-xs:4px; --r-sm:8px; --r-md:12px; --r-lg:16px; --r-pill:999px;/.test(html));
  const lb = html.indexOf('/* Leaderboard (Spotlight)'), lbe = html.indexOf('/* ---- wheel, inventory, marquee'); const rest = html.slice(0, lb) + html.slice(lbe);
  assert.ok(!/font-size:(\.76|\.8|\.82|\.85|\.86|\.88|\.92)rem/.test(rest.replace(/[^{}]*\.(lb|lg)[^{]*\{[^}]*\}/g, '')), 'near-duplicate sizes left');
});
t('marking boxes keep their layout; header and save bar stay visible while scrolling; Writing says "Save grade" before the first save', () => {
  assert.ok(/\.spmx>\.sechead,\.wcmx>\.sechead\{position:sticky/.test(html) && /\.spmx>\.spft,\.wcmx>\.spft\{position:sticky/.test(html));
  assert.strictEqual((html.match(/data-act="save-grade" type="button">'\+\(g\?'Update grade':'Save grade'\)\+'/g) || []).length, 3);
  assert.strictEqual((html.match(/data-act="mclose" type="button" aria-label="Close the marking box"/g) || []).length, 3);
});
t('Writing AI result: Corrections open; Corrected essay and Vocabulary upgrades folded with their counts', () => {
  const B = boot({ hooks: HOOKS }); const ai = { corrections: [{ original_text: 'goed', corrected_text: 'went', category: 'Verb', explanation: 'past' }], vocabulary_upgrades: [{ original: 'good', upgraded: 'beneficial', example: 'It is beneficial.' }] };
  const h = B.T.aiHTML(ai, 'I goed to school. It is good.');
  assert.ok(/<details class="aisect"><summary><h4 class="tk sect">Vocabulary upgrades <span class="aisn">1<\/span>/.test(h) && h.indexOf('Corrections') < h.indexOf('Vocabulary upgrades'));
});
out.forEach((l) => console.log(l)); console.log('---- ' + pass + '/' + (pass + fail) + ' passed'); process.exit(fail ? 1 : 0);
