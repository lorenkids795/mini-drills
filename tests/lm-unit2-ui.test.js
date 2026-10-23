// Learning Materials Unit 2 screens (PR 3): the real lesson code from index.html with the real content files.
// Run: node tests/lm-unit2-ui.test.js   (Node built-ins only)
'use strict';
const assert = require('assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
function t(name, fn) { try { fn(); pass++; console.log('PASS ' + name); } catch (e) { fail++; console.log('FAIL ' + name + ' -> ' + e.message); } }
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const cut = (a, b) => { const i = html.indexOf(a), j = html.indexOf(b, i); assert.ok(i > 0 && j > i, 'block ' + a); return html.slice(i, j); };
const RENDER = cut('/* ---------- Writing Task 1: line charts ----------', 'function writingTask(ex){');
const LM = cut('/* ---------- Library › Learning Materials', 'function renderLib(){');

function mkStore(broken) {
  const m = new Map();
  const st = { getItem: (k) => { if (broken) throw new Error('blocked'); return m.has(k) ? m.get(k) : null; }, setItem: (k, v) => { if (broken) throw new Error('blocked'); m.set(k, String(v)); },
    removeItem: (k) => { m.delete(k); }, key: (i) => Array.from(m.keys())[i] || null };
  Object.defineProperty(st, 'length', { get: () => m.size });
  return st;
}
// a fresh "browser" with the app code; mutate(u) may change the content before the lesson code runs
function boot(opt) {
  opt = opt || {};
  const win = { console }; win.window = win;
  win.localStorage = mkStore(opt.broken); win.document = { addEventListener: () => {} };
  win.esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  win.isArr = Array.isArray; win.U = { email: 'a@x', role: 'teacher', adm: true }; win.lsGet = () => null; win.lsSet = () => {};
  win.toast = (m) => { win._toast = m; }; win.confirm = () => true; win.$ = () => null; win.renderLib = () => {};
  const ctx = vm.createContext(win);
  ['md-chart.js', 'lm-content.js', 'lm-engine.js', 'lm-unit2.js'].forEach((f) => vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f }));
  if (opt.mutate) opt.mutate(win.MD_LM_U2);
  vm.runInContext(RENDER + LM + ';this.T={luStageHTML,luHTML,luAct,luKey,luGet,luPut,lmLesson,lmHTML,setLMV:function(v){LMV=v},LU:function(){return LU}};', ctx);
  return win;
}
const W = boot(), T = W.T, U2 = W.MD_LM_U2, L = T.lmLesson('lm-writing-ac-t1-u2');
const B = U2.charts.B, bWords = [B.id, B.chart.title].concat(B.chart.series.map((s) => s.label), B.chart.series.map((s) => s.id));
const resolved = (x, s) => W.LMX.lmResolve(s, x, W.LMX.lmFacts(U2)).text;

['learn', 'controlled', 'guided'].forEach((st) => t('stage ' + st + ': nothing from Chart B on screen', () => {
  const h = T.luStageHTML(U2, st); bWords.forEach((w) => assert.ok(h.indexOf(w) < 0, 'found "' + w + '"'));
}));
t('Learn shows Chart A, all its sample sentences and key features', () => {
  const h = T.luStageHTML(U2, 'learn'); assert.ok(h.includes('<svg class="chsvg"') && h.includes('Museum A'));
  U2.claims.filter((x) => x.chart === 'A').forEach((x) => assert.ok(h.includes(W.esc(resolved(x, x.en))), x.id));
  U2.keyFeatures.filter((x) => x.chart === 'A').forEach((x) => assert.ok(h.includes(W.esc(x.reason.en)), x.id));
});
t('Independent shows Chart B but no B sample sentence or key feature', () => {
  const h = T.luStageHTML(U2, 'independent'); assert.ok(h.includes('App X') && h.includes('id="luI"'));
  U2.claims.filter((x) => x.chart === 'B').forEach((x) => assert.ok(!h.includes(W.esc(resolved(x, x.en))), x.id));
  U2.keyFeatures.filter((x) => x.chart === 'B').forEach((x) => assert.ok(!h.includes(W.esc(x.reason.en)), x.id));
});
t('Review shows B samples, self-check boxes and an editable answer', () => {
  const h = T.luStageHTML(U2, 'review');
  U2.claims.filter((x) => x.chart === 'B').forEach((x) => assert.ok(h.includes(W.esc(resolved(x, x.en))), x.id));
  assert.strictEqual((h.match(/data-act="lu-self"/g) || []).length, U2.keyFeatures.filter((x) => x.chart === 'B').length);
  assert.ok(h.includes('<textarea') && !h.includes('readonly'));
});
t('no 150-word rule, no minimum, no score for writing', () => ['guided', 'independent', 'review'].forEach((st) => { const h = T.luStageHTML(U2, st); assert.ok(!/150|minimum|band/i.test(h.replace(/not a score/g, '')) && !/score/i.test(h.replace(/not a score/g, '')), st); }));
t('Review cannot be opened before a first attempt', () => {
  const w = boot(); w.T.setLMV('lm-writing-ac-t1-u2'); w.T.luAct('lu-go', { dataset: { s: 'review' } });
  assert.strictEqual(w.T.LU().stage, 'learn'); const h = w.T.luHTML(L, w.MD_LM_U2); assert.ok(/data-s="review" disabled/.test(h));
  w.T.LU().stage = 'review'; assert.ok(w.T.luHTML(L, w.MD_LM_U2).includes('id="luCnt"')); assert.strictEqual(w.T.LU().stage, 'independent');
});
t('"I\'m done" with an empty answer does nothing; with text it opens Review', () => {
  const w = boot(); w.T.setLMV('lm-writing-ac-t1-u2'); w.$ = () => ({ value: '  ', focus: () => {} });
  w.T.luAct('lu-rv', {}); assert.notStrictEqual(w.T.LU().stage, 'review'); assert.ok(/first/.test(w._toast));
  w.$ = () => ({ value: 'Overall, App Y grew.', focus: () => {} }); w.T.luAct('lu-rv', {});
  assert.strictEqual(w.T.LU().stage, 'review'); assert.ok(w.T.luHTML(L, w.MD_LM_U2).includes('Sample overview sentences for this chart'));
});
t('Controlled: answers are checked against the content labels', () => {
  const w = boot(); w.T.setLMV('lm-writing-ac-t1-u2'); const C = w.MD_LM_U2.controlled;
  C.forEach((x) => w.T.luAct('lu-pick', { dataset: { id: x.id, v: x.type === 'ovd' ? x.answer : x.label } }));
  w.T.luAct('lu-chk', {}); const h = w.T.luStageHTML(w.MD_LM_U2, 'controlled');
  assert.ok(h.includes('<b>' + C.length + ' / ' + C.length + '</b>')); assert.ok(h.includes('Not determinable'));
  w.T.luAct('lu-redo', {}); assert.ok(!w.T.luStageHTML(w.MD_LM_U2, 'controlled').includes(' / ' + C.length));
});
t('Controlled: a wrong answer shows the right one and both explanations', () => {
  const w = boot(); w.T.setLMV('lm-writing-ac-t1-u2'); const x = w.MD_LM_U2.controlled[0];
  w.T.luAct('lu-pick', { dataset: { id: x.id, v: 'contradicted' } }); w.T.luAct('lu-chk', {});
  const h = w.T.luStageHTML(w.MD_LM_U2, 'controlled'); assert.ok(h.includes('Not quite. Answer: Supported') && h.includes('lang="vi"'));
});
t('drafts: version-scoped key, restored into the box', () => {
  const w = boot(); assert.strictEqual(w.T.luKey(w.MD_LM_U2, 'indep'), 'md-lm:lm-writing-ac-t1-u2:v1:indep');
  w.T.luPut(w.MD_LM_U2, 'indep', { t: 'Overall, things changed.' }); assert.ok(w.T.luStageHTML(w.MD_LM_U2, 'independent').includes('Overall, things changed.'));
});
t('drafts: an older version is not shown, only offered for discard', () => {
  const w = boot(); w.localStorage.setItem('md-lm:lm-writing-ac-t1-u2:v0:indep', JSON.stringify({ t: 'OLD TEXT' }));
  const h = w.T.luStageHTML(w.MD_LM_U2, 'independent'); assert.ok(!h.includes('OLD TEXT') && h.includes('older version') && h.includes('lu-old'));
  w.T.setLMV('lm-writing-ac-t1-u2'); w.T.luAct('lu-old', { dataset: { a: 'indep' } }); assert.strictEqual(w.localStorage.getItem('md-lm:lm-writing-ac-t1-u2:v0:indep'), null);
});
t('drafts: Clear draft asks first and removes it', () => {
  const w = boot(); w.T.setLMV('lm-writing-ac-t1-u2'); w.T.luPut(w.MD_LM_U2, 'indep', { t: 'x', rv: true });
  w.confirm = () => false; w.T.luAct('lu-clear', { dataset: { a: 'indep' } }); assert.ok(w.T.luGet(w.MD_LM_U2, 'indep'));
  w.confirm = () => true; w.T.luAct('lu-clear', { dataset: { a: 'indep' } }); assert.strictEqual(w.T.luGet(w.MD_LM_U2, 'indep'), null);
});
t('drafts: blocked storage shows a warning and nothing breaks', () => { const w = boot({ broken: true }); const h = w.T.luStageHTML(w.MD_LM_U2, 'independent'); assert.ok(h.includes('does not allow saving')); });
t('shared-device notice and local-only wording are shown with every draft', () => ['guided', 'independent', 'review'].forEach((st) => assert.ok(T.luStageHTML(U2, st).includes('only in this browser'), st)));
t('changed chart data: lesson refuses to show, no wrong claims', () => {
  const w = boot({ mutate: (u) => { u.charts.A.chart.series[1].points[4].y = 70; } });
  const h = w.T.luHTML(L, w.MD_LM_U2); assert.ok(h.includes('cannot be shown') && !h.includes('lusteps'));
});
t('pending content: admin preview says so', () => assert.ok(T.luHTML(L, U2).includes('still waiting for review')));
t('students still cannot open the lesson (unpublished)', () => {
  const w = boot(); w.U = { email: 's@x', role: 'student' }; w.T.setLMV('lm-writing-ac-t1-u2'); const h = w.T.lmHTML();
  assert.ok(!h.includes('lusteps') && h.includes('coming soon'));
});
t('lesson code: no database, XP or AI calls', () => { const blk = LM.slice(LM.indexOf('Learning Materials · Unit 2 lesson')); assert.ok(!/dbh|collection\(|addXP|gainXP|putProf|grantSpin|\/api\//.test(blk)); });
t('index.html loads the content after md-chart.js and before the app', () => {
  const i = (s) => html.indexOf('<script src="' + s + '"></script>'), app = html.indexOf("(function(){\n'use strict'");
  assert.ok(i('md-chart.js') > 0 && i('md-chart.js') < i('lm-engine.js') && i('lm-engine.js') < i('lm-unit2.js') && i('lm-unit2.js') < app);
});

t('Unit 2 may be "published" only when the release check passes (no pending, no problems)', () => {
  if (L.status !== 'published') return;
  const r = W.LMX.lmCheck(U2, true); assert.strictEqual(r.errors.length, 0, r.errors.join(' | '));
});

console.log('---- ' + pass + '/' + (pass + fail) + ' passed');
process.exit(fail ? 1 : 0);
