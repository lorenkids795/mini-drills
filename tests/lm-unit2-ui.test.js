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
  win.localStorage = mkStore(opt.broken); win.document = { addEventListener: () => {}, getElementById: () => null }; win.scrollTo = () => {}; win.scrollY = 0;
  win.esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  win.isArr = Array.isArray; win.U = { email: 'a@x', role: 'teacher', adm: true }; win.lsGet = () => null; win.lsSet = () => {};
  win.toast = (m) => { win._toast = m; }; win.confirm = () => true; win.$ = () => null; win.renderLib = () => {};
  const ctx = vm.createContext(win);
  ['md-chart.js', 'lm-content.js', 'lm-engine.js', 'lm-unit2.js'].forEach((f) => vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f }));
  if (opt.mutate) opt.mutate(win.MD_LM_U2);
  vm.runInContext(RENDER + LM + ';this.T={luStageHTML,luHTML,luAct,luKey,luGet,luPut,lmLesson,lmHTML,luPair,setLMV:function(v){LMV=v},LU:function(){return LU}};', ctx);
  return win;
}
const W = boot(), T = W.T, U2 = W.MD_LM_U2, L = T.lmLesson('lm-writing-ac-t1-u2');
const B = U2.charts.B, bWords = [B.id, B.chart.title].concat(B.chart.series.map((s) => s.label), B.chart.series.map((s) => s.id));
const resolved = (x, s) => W.LMX.lmResolve(s, x, W.LMX.lmFacts(U2)).text;

['learn', 'controlled', 'guided'].forEach((st) => t('stage ' + st + ': nothing from Chart B on screen', () => {
  const h = T.luStageHTML(U2, st); bWords.forEach((w) => assert.ok(h.indexOf(w) < 0, 'found "' + w + '"'));
}));
// open every Learn step of a fresh lesson (Continue × 6), optionally reveal / check
const learnAll = (w, o) => { o = o || {}; w.T.setLMV('lm-writing-ac-t1-u2'); for (let i = 0; i < 6; i++) w.T.luAct('lu-lnext', {}); if (o.reveal) w.T.luAct('lu-lrev', {}); if (o.check) w.T.luAct('lu-lchk', {}); if (o.lens) w.T.luAct('lu-lens', { dataset: { v: o.lens } }); return w.T.luStageHTML(w.MD_LM_U2, 'learn'); };
const copyOf = (id) => U2.copy.find((x) => x.id === id);
t('Learn starts with step 1 only, Chart A beside it, Vietnamese explanations by default', () => {
  const w = boot(), h = w.T.luStageHTML(w.MD_LM_U2, 'learn');
  assert.ok(h.includes('<svg class="chsvg"') && h.includes('Museum A')); assert.ok(h.includes('id="luS1"') && !h.includes('id="luS2"'));
  assert.ok(h.includes(W.esc(copyOf('copy.learn.objective').vi)) && !h.includes(W.esc(copyOf('copy.learn.objective').en)));
});
t('Continue opens the 7 steps one by one; the last one leads to Controlled', () => {
  const h = learnAll(boot()); for (let n = 1; n <= 7; n++) assert.ok(h.includes('id="luS' + n + '"'), 'step ' + n);
  assert.ok(h.includes('data-act="lu-go" data-s="controlled"') && !/id="luS7"[\s\S]*lu-lnext/.test(h));
});
t('sample sentences stay hidden until "show the samples"; then all Chart A models appear in English with a why', () => {
  const w = boot(), before = learnAll(w), M = U2.claims.filter((x) => x.chart === 'A' && x.kind === 'model');
  M.forEach((x) => assert.ok(!before.includes('<li><p class="lusent" lang="en">' + W.esc(resolved(x, x.en))), x.id + ' shown too early'));
  w.T.luAct('lu-lrev', {}); const h = w.T.luStageHTML(w.MD_LM_U2, 'learn');
  M.forEach((x) => { assert.ok(h.includes('<p class="lusent" lang="en">' + W.esc(resolved(x, x.en)) + '</p>'), x.id); assert.ok(h.includes(W.esc(x.why.vi)), x.id + ' why (vi)'); });
});
t('observe before reveal: importance only after "check my choice"', () => {
  const w = boot(); let h = learnAll(w); const s4 = (x) => x.slice(x.indexOf('id="luS4"'), x.indexOf('id="luS5"'));
  assert.ok(!/class="pill( acc)?">(Chính|Phụ)</.test(s4(h)));
  w.T.luAct('lu-lpick', { dataset: { id: 'kf.a.rise' }, checked: true }); w.T.luAct('lu-lchk', {}); h = w.T.luStageHTML(w.MD_LM_U2, 'learn');
  assert.ok(/class="pill acc">Chính</.test(s4(h)) && s4(h).includes('Bạn đã chọn') && s4(h).includes(W.esc(copyOf('copy.learn.choose.fb').vi)));
});
t('lenses highlight exactly the lines of their verified facts', () => {
  const idx = (h) => ((/class="luchart lulc" data-hl="([^"]*)"/.exec(h) || [])[1] || '');
  assert.strictEqual(idx(learnAll(boot(), { lens: 'trends' })), 's0 s1'); // endpoint:museum-a, endpoint:museum-b
  assert.strictEqual(idx(learnAll(boot(), { lens: 'highest' })), 's0'); // highest-throughout -> museum-a
  assert.strictEqual(idx(learnAll(boot(), { lens: 'highlights' })), 's2'); // shape:museum-c
  assert.strictEqual(idx(learnAll(boot())), '');
});
t('evidence chips come from the facts (numbers match Chart A)', () => {
  const h = learnAll(boot(), { lens: 'trends' }); assert.ok(h.includes('Museum A: 60 → 90 (2000–2020)') && h.includes('Museum B: 50 → 30 (2000–2020)'));
  assert.ok(learnAll(boot(), { lens: 'highest' }).includes('Museum A: đứng đầu ở mọi năm được cho'));
});
t('Learn never shows Chart B (all steps, all lenses, revealed, checked)', () => ['trends', 'highest', 'highlights'].forEach((ln) => {
  const h = learnAll(boot(), { reveal: true, check: true, lens: ln }); bWords.forEach((w) => assert.ok(h.indexOf(w) < 0, ln + ': found ' + w));
}));
t('language switch: English shows the English copy, IELTS sentences unchanged', () => {
  const w = boot(); learnAll(w, { reveal: true }); const vi = w.T.luStageHTML(w.MD_LM_U2, 'learn');
  w.T.luAct('lu-lang', { dataset: { v: 'en' } }); const en = w.T.luStageHTML(w.MD_LM_U2, 'learn');
  assert.ok(en.includes(W.esc(copyOf('copy.learn.ovd').en)) && !en.includes(W.esc(copyOf('copy.learn.ovd').vi)));
  const sents = (h) => (h.match(/<p class="lusent" lang="en">[^<]*<\/p>/g) || []).join('|'); assert.ok(sents(en).length > 0); assert.strictEqual(sents(en), sents(vi));
  assert.strictEqual(w.localStorage.getItem('md-lm-lang'), 'en');
});
t('language switch keeps stage, answers, Learn steps and drafts', () => {
  const w = boot(); learnAll(w, { reveal: true }); w.T.luAct('lu-pick', { dataset: { id: 'c.a.1', v: 'supported' } }); w.T.luPut(w.MD_LM_U2, 'guided', { t: 'My guided draft' });
  w.T.luAct('lu-go', { dataset: { s: 'controlled' } }); w.T.luAct('lu-lang', { dataset: { v: 'en' } });
  const L = w.T.LU(); assert.strictEqual(L.stage, 'controlled'); assert.strictEqual(L.pick['c.a.1'], 'supported'); assert.strictEqual(L.lstep, 7); assert.strictEqual(L.lrev, true);
  assert.ok(w.T.luStageHTML(w.MD_LM_U2, 'guided').includes('My guided draft'));
});
t('language preference is remembered; default is Vietnamese; broken storage falls back to Vietnamese', () => {
  assert.strictEqual(boot().T.LU().lang, 'vi'); assert.strictEqual(boot({ broken: true }).T.LU().lang, 'vi');
});
t('missing translation: the other language is shown with a visible note (never hidden)', () => {
  const w = boot(); assert.ok(/Hello <span class="lumiss">\(chỉ có tiếng Anh\)/.test(w.T.luPair('Hello', '')));
  w.T.setLMV('lm-writing-ac-t1-u2'); w.T.luAct('lu-lang', { dataset: { v: 'en' } }); assert.ok(/Xin chào <span class="lumiss">\(Vietnamese only\)/.test(w.T.luPair('', 'Xin chào')));
});
t('every new Learn item is validated, bilingual and still pending', () => {
  const ids = U2.copy.filter((x) => /^(ui\.|copy\.learn\.)/.test(x.id)); assert.ok(ids.length >= 30);
  ids.forEach((x) => { assert.strictEqual(x.review, 'pending', x.id); assert.ok(x.en && x.vi, x.id); });
  U2.claims.filter((x) => x.why).forEach((x) => assert.ok(x.why.en && x.why.vi, x.id));
  const r = W.LMX.lmCheck(U2); assert.strictEqual(r.errors.length, 0, r.errors.join(' | ')); assert.strictEqual(r.approved, 0);
});
t('every UI text id used by the lesson code exists in the content', () => {
  const used = (LM.match(/luU\(u,'([\w.]+)'\)|luCopy\(u,'([\w.]+)'\)|luC\(u,'([\w.]+)'\)|'(ui\.lens\.\w+|copy\.lens\.\w+)'/g) || []).map((m) => /'([\w.]+)'/.exec(m)[1]);
  const known = new Set(U2.copy.map((x) => x.id)); used.forEach((id) => assert.ok(known.has(id), 'missing ' + id));
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
t('shared-device notice and local-only wording are shown with every draft (both languages)', () => ['guided', 'independent', 'review'].forEach((st) => {
  const w = boot(); assert.ok(w.T.luStageHTML(w.MD_LM_U2, st).includes('chỉ được lưu trong trình duyệt này'), st + ' vi');
  w.T.setLMV('lm-writing-ac-t1-u2'); w.T.luAct('lu-lang', { dataset: { v: 'en' } }); assert.ok(w.T.luStageHTML(w.MD_LM_U2, st).includes('only in this browser'), st + ' en');
}));
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
