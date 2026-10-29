// Learning Materials Unit 2 screens (v4: no skip, gated steps, 70 % pass marks, YES/NO/NOT GIVEN): the real lesson code from index.html with the real content files.
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
  win.isArr = Array.isArray; win.U = opt.user || { email: 'a@x', role: 'teacher', adm: true }; win.lsGet = () => null; win.lsSet = () => {};
  win.toast = (m) => { win._toast = m; }; win.confirm = () => true; win.$ = () => null; win.renderLib = () => {};
  const ctx = vm.createContext(win);
  ['md-chart.js', 'lm-content.js', 'lm-engine.js', 'lm-unit2.js', 'lm-unit0.js'].forEach((f) => vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f }));
  if (opt.mutate) opt.mutate(win.MD_LM_U2);
  vm.runInContext(RENDER + LM + ';this.T={luStageHTML,luHTML,luAct,luKey,luGet,luPut,lmLesson,lmHTML,luPair,setLMV:function(v){LMV=v},LU:function(){return LU}};', ctx);
  return win;
}
const W = boot(), T = W.T, U2 = W.MD_LM_U2, L = T.lmLesson('lm-writing-ac-t1-u2');
const B = U2.charts.B, bWords = [B.id, B.chart.title].concat(B.chart.series.map((s) => s.label), B.chart.series.map((s) => s.id));
const resolved = (x, s) => W.LMX.lmResolve(s, x, W.LMX.lmFacts(U2)).text;
const copyOf = (id) => U2.copy.find((x) => x.id === id);
const LID = 'lm-writing-ac-t1-u2';
const STU = { email: 's@x', role: 'student' };
const open = (w) => { w.T.setLMV(LID); return w; };
const act = (w, a, ds, extra) => w.T.luAct(a, Object.assign({ dataset: ds || {} }, extra || {}));
const learn = (w) => w.T.luStageHTML(w.MD_LM_U2, 'learn');
const cur = (w) => w.T.LU().lstep;
// the meaningful action of each Learn step, done right
const DO = {
  2: (w) => { act(w, 'lu-xq', { q: 'top', v: 'museum-a' }); act(w, 'lu-xq', { q: 'down', v: 'museum-b' }); act(w, 'lu-xq', { q: 'fluct', v: 'museum-c' }); act(w, 'lu-xchk'); },
  3: (w) => ['trends', 'highest', 'highlights'].forEach((v) => act(w, 'lu-lens', { v })),
  4: (w) => { act(w, 'lu-lpick', { id: 'kf.a.rise' }, { checked: true }); act(w, 'lu-lchk'); },
  5: (w) => { w.T.LU().frame = ['museum-a', 'museum-c', 'museum-b']; act(w, 'lu-frame-chk'); },
  6: (w) => act(w, 'lu-lrev'),
};
const learnTo = (w, n) => { open(w); while (cur(w) < n) { if (DO[cur(w)]) DO[cur(w)](w); const b = cur(w); act(w, 'lu-lnext'); if (cur(w) === b) throw new Error('stuck at ' + b); } return learn(w); };
const s = (h, n) => h.slice(h.indexOf('id="luS' + n + '"'), h.indexOf('id="luS' + (n + 1) + '"') > 0 ? h.indexOf('id="luS' + (n + 1) + '"') : h.length);
const passCtl = (w, nWrong) => { w.MD_LM_U2.controlled.forEach((x, i) => { const r = x.type === 'ovd' ? x.answer : x.label, v = i < nWrong ? (r === 'supported' || r === 'overview' ? (x.type === 'ovd' ? 'detail' : 'contradicted') : (x.type === 'ovd' ? 'overview' : 'supported')) : r; act(w, 'lu-pick', { id: x.id, v }); }); act(w, 'lu-chk'); };
const G_OK = { 't:museum-a': 'up', 't:museum-b': 'down', 't:museum-c': 'fup', top: 'museum-a', bottom: 'museum-c', leave: 'kf.a.fluct' };

// ---------- Chart B never before Independent ----------
['learn', 'controlled', 'guided'].forEach((st) => t('stage ' + st + ': nothing from Chart B on screen (also fully done, every lens, auto-fill on)', () => {
  const w = boot(); learnTo(w, 7); w.T.LU().af = true; ['trends', 'highest', 'highlights'].forEach((v) => { act(w, 'lu-lens', { v }); act(w, 'lu-gchk'); act(w, 'lu-chk');
    const h = w.T.luStageHTML(w.MD_LM_U2, st); bWords.forEach((x) => assert.ok(h.indexOf(x) < 0, v + ': found "' + x + '"')); });
}));
// ---------- Phase 1: UI cleanup ----------
t('language switch reads ENG | VI; no long language note', () => {
  const h = T.luHTML(L, U2); assert.ok(/data-v="en"[^>]*>ENG<\/button><button[^>]*data-v="vi"[^>]*>VI</.test(h)); assert.ok(!copyOf('ui.lang.note'));
});
t('feedback 10/2026: no caption under the chart; "made-up data" said once inside the Data table; titles without "(illustrative data)"; synthetic flag kept', () => {
  ['A', 'B'].forEach((k) => { assert.ok(!/illustrative/i.test(U2.charts[k].chart.title)); assert.strictEqual(U2.charts[k].synthetic, true); });
  ['learn', 'controlled', 'guided', 'independent', 'review'].forEach((st) => { const h = T.luStageHTML(U2, st); assert.ok(!h.includes('lucap'), st);
    assert.ok(/<details class="chtbl">[\s\S]*<p class="chnote">/.test(h) && h.includes(W.esc(copyOf('copy.synthetic').vi)), st + ' note in the data table'); });
});
t('feedback 10/2026: removed lines are gone from the screen (hints only for screen readers / tooltip)', () => {
  const w = open(boot()); act(w, 'lu-lnext'); let h = learn(w); const ex = W.esc(copyOf('copy.learn.tryExplore').vi);
  assert.ok(!h.includes('<p class="lunote luhint"') && h.includes('<span class="sr" id="luNeed2">' + ex + '</span>') && h.includes('title="' + ex + '"'));
  act(w, 'lu-lang', { v: 'en' }); h = learn(w); assert.ok(!/<p[^>]*>Answer the questions and press Check to continue\.<\/p>/.test(h));
  assert.ok(!U2.copy.some((x) => x.id === 'copy.learn.annot.note')); assert.ok(!learnTo(boot(), 7).includes('You do not need all three parts'));
});
t('feedback 10/2026: invented, natural series names everywhere; data, facts and answers unchanged', () => {
  assert.strictEqual(JSON.stringify(U2.charts.A.chart.series.map((s) => s.label)), JSON.stringify(['Larkfield Museum', 'Westmere Museum', 'Corvale Museum']));
  assert.strictEqual(JSON.stringify(U2.charts.B.chart.series.map((s) => s.label)), JSON.stringify(['Chatora', 'Pixlo', 'Notivo']));
  assert.strictEqual(U2.charts.A.chart.series.map((s) => s.points.map((p) => p.y).join()).join('|'), '60,68,75,82,90|50,44,40,35,30|20,26,23,29,27');
  const all = JSON.stringify(U2); assert.ok(!/Museum [ABC]\b|App [XYZ]\b/.test(all)); const r = W.LMX.lmCheck(U2); assert.strictEqual(r.errors.length, 0, r.errors.join(' | '));
});
t('feedback 10/2026: linkers in the model overview ("also", "Notably,"), never a fixed formula', () => {
  const g = (id) => U2.claims.find((x) => x.id === id); assert.ok(/^\{h\.resultLabel\} also had/.test(g('a.model.highest').en)); assert.ok(/^Notably, \{c\.label\}/.test(g('a.model.shape').en));
  assert.ok(!/Most importantly/i.test(JSON.stringify(U2))); assert.ok(/^No\b/.test(copyOf('copy.lens.flexible').en), 'FAQ still says all three are not needed');
  const h = learnTo(boot(), 7); assert.ok(h.includes('Larkfield Museum also had the most visitors in every year shown.') && h.includes('Notably, Corvale Museum fluctuated'));
});
t('every stage uses the same layout: chart column left, activity right', () => ['learn', 'controlled', 'guided', 'independent', 'review'].forEach((st) => {
  const h = T.luStageHTML(U2, st); assert.ok(/^<div class="lulearn"><div class="lulside"><div class="luchart lulc"/.test(h) && h.includes('<div class="lulsteps">'), st);
}));
t('Controlled labels: YES / NO / NOT GIVEN with the "data accuracy check, not IELTS Reading" note', () => {
  const w = open(boot()); act(w, 'lu-lang', { v: 'en' }); const h = w.T.luStageHTML(w.MD_LM_U2, 'controlled');
  assert.ok(h.includes('>YES<') && h.includes('>NO<') && h.includes('>NOT GIVEN<')); assert.ok(/not an IELTS Reading question type/.test(h));
  assert.ok(h.includes('data-v="supported"') && h.includes('data-v="not_determinable"'), 'internal values unchanged');
});
t('Review self-check items read "I included …" (numbers / names from the facts)', () => {
  const w = open(boot()); act(w, 'lu-lang', { v: 'en' }); const h = w.T.luStageHTML(w.MD_LM_U2, 'review');
  assert.strictEqual((h.match(/<span class="luself">I included /g) || []).length, U2.keyFeatures.filter((k) => k.chart === 'B').length); assert.ok(!/\{f\./.test(h));
});
t('the overview vs body section has its new title', () => { const h = learnTo(boot(), 7); assert.ok(s(h, 7).includes(W.esc(copyOf('ui.learn.s7').vi))); });

// ---------- Phase 2: Learn ----------
t('no Skip anywhere; Continue is disabled with a hint until the step is done', () => {
  const w = open(boot()); act(w, 'lu-lnext'); let h = learn(w);
  assert.ok(!/data-skip|Bỏ qua|Skip/.test(h)); assert.ok(/data-act="lu-lnext" disabled/.test(h) && h.includes(W.esc(copyOf('copy.learn.tryExplore').vi)));
  act(w, 'lu-lnext'); assert.strictEqual(cur(w), 2, 'pressing a disabled Continue does nothing');
  DO[2](w); h = learn(w); assert.ok(!/data-act="lu-lnext" disabled/.test(h)); act(w, 'lu-lnext'); assert.strictEqual(cur(w), 3);
});
t('all 7 steps can be finished by doing them (no deadlock); the last one leads to Controlled', () => {
  const h = learnTo(boot(), 7); for (let n = 1; n <= 7; n++) assert.ok(h.includes('id="luS' + n + '"'), 'step ' + n); assert.ok(h.includes('data-act="lu-go" data-s="controlled"'));
});
t('step 2 explore: answers come from the facts; wrong answers can be retried', () => {
  const w = open(boot()); act(w, 'lu-lnext'); act(w, 'lu-xq', { q: 'top', v: 'museum-b' }); act(w, 'lu-xq', { q: 'down', v: 'museum-b' }); act(w, 'lu-xq', { q: 'fluct', v: 'museum-c' }); act(w, 'lu-xchk');
  let h = s(learn(w), 2); assert.strictEqual((h.match(/class="luq no"/g) || []).length, 1); assert.strictEqual((h.match(/class="luq ok"/g) || []).length, 2);
  assert.ok(h.includes('Larkfield Museum: đứng đầu ở mọi năm được cho') && h.includes('Westmere Museum: 50 → 30 (2000–2020)') && h.includes('Corvale Museum: lên xuống'));
  act(w, 'lu-xredo'); assert.strictEqual(w.T.LU().xchk, false); assert.ok(/data-act="lu-xchk" disabled/.test(learn(w)), 'Check needs an answer to every question');
});
t('step 3 Trends covers ALL lines grouped Upward / Downward / Fluctuating; Corvale Museum is not dimmed; FAQ about Corvale Museum', () => {
  const w = open(boot()); act(w, 'lu-lnext'); DO[2](w); act(w, 'lu-lnext'); act(w, 'lu-lens', { v: 'trends' }); const h = learn(w);
  assert.strictEqual((/class="luchart lulc" data-hl="([^"]*)"/.exec(h) || [])[1], 's0 s1 s2');
  const p = h.slice(h.indexOf('lupanel')); assert.ok(/Đi lên<\/b><ul><li>[^]*Larkfield Museum: 60 → 90/.test(p) && /Đi xuống<\/b><ul><li>[^]*Westmere Museum: 50 → 30/.test(p) && /Dao động<\/b><ul><li>[^]*Corvale Museum: 20 → 27/.test(p));
  const fq = U2.claims.find((x) => x.id === 'a.faq.fluct'); assert.ok(p.includes(W.esc(resolved(fq, fq.q.vi))) && p.includes('Corvale Museum'));
});
t('step 3 Highest / lowest names Larkfield Museum on top and Corvale Museum at the bottom; all three lenses are needed', () => {
  const w = open(boot()); act(w, 'lu-lnext'); DO[2](w); act(w, 'lu-lnext'); act(w, 'lu-lens', { v: 'highest' }); let h = learn(w);
  assert.strictEqual((/data-hl="([^"]*)"/.exec(h) || [])[1], 's0 s2'); assert.ok(h.includes('Larkfield Museum: đứng đầu') && h.includes('Corvale Museum: thấp nhất ở mọi năm được cho'));
  assert.ok(/data-act="lu-lnext" disabled/.test(h)); act(w, 'lu-lens', { v: 'trends' }); act(w, 'lu-lens', { v: 'highlights' }); assert.ok(!/data-act="lu-lnext" disabled/.test(learn(w)));
  assert.ok(h.includes(W.esc(copyOf('ui.faq.lenses.q').vi)) && h.includes(W.esc(copyOf('copy.lens.flexible').vi)));
});
t('step 4: lines shown with each feature; Main / Optional and the explanation only after Check', () => {
  const w = boot(); learnTo(w, 4); let h = s(learn(w), 4);
  assert.ok(h.includes('<span class="luser">Larkfield Museum</span>') && h.includes('<span class="luser">Corvale Museum</span>')); assert.ok(!/class="pill( acc)?">(Chính|Phụ)/.test(h));
  DO[4](w); h = s(learn(w), 4); assert.ok(/class="pill acc">Chính/.test(h) && h.includes(W.esc(copyOf('copy.learn.choose.main').vi)) && h.includes(W.esc(copyOf('copy.learn.choose.opt').vi)));
});
t('step 5 frame: Overall / while highlighted; right lines = correct; two wrong tries show the answer (no deadlock)', () => {
  const w = boot(); learnTo(w, 5); let h = s(learn(w), 5);
  assert.ok(/<p class="luframe" lang="en"><mark class="lukw">Overall<\/mark>, <select/.test(h) && h.includes('<mark class="lukw">while</mark>'));
  w.T.LU().frame = ['museum-a', 'museum-b', 'museum-c']; act(w, 'lu-frame-chk'); h = s(learn(w), 5); assert.ok(h.includes(W.esc(copyOf('copy.learn.frame.no').vi)) && h.includes('lu-frame-redo')); assert.ok(!w.T.LU().frameOk);
  act(w, 'lu-frame-redo'); act(w, 'lu-frame-chk'); h = s(learn(w), 5); assert.ok(w.T.LU().frameOk, 'opens after 2 tries'); assert.ok(h.includes('Larkfield Museum') && /<p class="lusent" lang="en"><mark class="lukw">Overall<\/mark>, Larkfield Museum and Corvale Museum/.test(h));
  const w2 = boot(); learnTo(w2, 5); w2.T.LU().frame = ['museum-c', 'museum-a', 'museum-b']; act(w2, 'lu-frame-chk'); assert.ok(w2.T.LU().frameOk && s(learn(w2), 5).includes(W.esc(copyOf('copy.learn.frame.ok').vi)));
});
t('step 6: samples hidden until "show"; then a concise paragraph (trends + highest) and the full paragraph coloured by group with a legend', () => {
  const w = boot(); learnTo(w, 6); let h = learn(w); const M = U2.claims.filter((x) => x.chart === 'A' && x.kind === 'model');
  M.forEach((x) => assert.ok(!h.includes(W.esc(resolved(x, x.en))), x.id + ' too early'));
  act(w, 'lu-lrev'); h = s(learn(w), 6); const paras = h.match(/<p class="lupara" lang="en">[\s\S]*?<\/p>/g) || []; assert.strictEqual(paras.length, 2);
  const tx = (id) => W.esc(resolved(M.find((x) => x.id === id), M.find((x) => x.id === id).en));
  assert.ok(paras[0].includes(tx('a.model.trend')) && paras[0].includes(tx('a.model.highest')) && !paras[0].includes(tx('a.model.shape')));
  ['trends', 'highest', 'highlights'].forEach((g) => assert.ok(paras[1].includes('<span class="lug lug-' + g + '">'), g)); assert.ok(h.includes('<ul class="lulegend">'));
});
t('FAQ: "Do I need all three?" answers No', () => { assert.ok(/^No\b/.test(copyOf('copy.lens.flexible').en) && /^Không/.test(copyOf('copy.lens.flexible').vi)); });

// ---------- Controlled ----------
t('Controlled: pass mark ceil(70 %) = 6 / 8 is shown; 5 right keeps Guided closed, 6 right opens it; retry clears', () => {
  const w = open(boot({ user: STU })); learnTo(w, 7); act(w, 'lu-go', { s: 'controlled' }); let h = w.T.luStageHTML(w.MD_LM_U2, 'controlled');
  assert.ok(h.includes('Cần đúng 6 / 8 câu để đi tiếp.')); passCtl(w, 3); h = w.T.luStageHTML(w.MD_LM_U2, 'controlled');
  assert.ok(h.includes('Đúng 5 / 8 câu') && /data-s="guided" disabled/.test(h)); act(w, 'lu-go', { s: 'guided' }); assert.strictEqual(w.T.LU().stage, 'controlled');
  act(w, 'lu-redo'); assert.deepStrictEqual(Object.keys(w.T.LU().pick), []); passCtl(w, 2); h = w.T.luStageHTML(w.MD_LM_U2, 'controlled');
  assert.ok(h.includes('Đúng 6 / 8 câu') && !/data-s="guided" disabled/.test(h) && h.includes(W.esc(copyOf('ui.ctl.passed').vi))); act(w, 'lu-go', { s: 'guided' }); assert.strictEqual(w.T.LU().stage, 'guided');
});
t('Controlled: a wrong answer shows the right label and the explanation', () => {
  const w = open(boot()); const x = U2.controlled[0]; act(w, 'lu-pick', { id: x.id, v: 'contradicted' }); act(w, 'lu-chk');
  const h = w.T.luStageHTML(w.MD_LM_U2, 'controlled'); assert.ok(h.includes('Đáp án: YES (biểu đồ cho thấy đúng)') && h.includes(W.esc(resolved(x, x.why.vi))));
});
// ---------- Guided ----------
t('Guided: three small exercises with answers from the facts (trend verb, highest / lowest, what to leave out)', () => {
  const w = open(boot()); act(w, 'lu-lang', { v: 'en' }); const h = w.T.luStageHTML(w.MD_LM_U2, 'guided');
  assert.strictEqual((h.match(/<select class="lugsel"/g) || []).length, 5); assert.ok(/Larkfield Museum <select class="lugsel" data-g="t:museum-a"[\s\S]*?<\/select> between 2000 and 2020\./.test(h));
  assert.ok(h.includes('data-act="lu-gpick" data-id="kf.a.fluct"')); assert.ok(h.includes('You need 5 of 6 correct to continue.'));
  assert.ok(!h.includes('id="luG"'), 'writing box only after passing');
});
// ---------- P0: recognition (objective) and writing (never "passed") are separate; non-responses never open Independent ----------
const GOOD_OV = 'Overall, visitors to Larkfield Museum and Corvale Museum increased over the period, while the number for Westmere Museum fell. Larkfield Museum also had the most visitors in every year shown.';
const toGuided = (w, pass) => { const L1 = w.T.LU(); L1.ldone = true; L1.cpass = true; L1.stage = 'guided'; if (pass) { Object.assign(L1.g, G_OK); act(w, 'lu-gchk'); } return L1; };
const gd = (w) => w.T.luGet(w.MD_LM_U2, 'guided') || {};
const setG = (w, o) => w.T.luPut(w.MD_LM_U2, 'guided', Object.assign(gd(w), o));
const writeAll = (w, ov) => { setG(w, { w: { trend: 'Larkfield Museum and Corvale Museum rose overall, while Westmere Museum fell.', high: 'Larkfield Museum had the most visitors in every year.' } }); act(w, 'lu-wchk'); setG(w, { t: ov }); act(w, 'lu-gsub'); };
t('Guided recognition: under 70 % stays closed (retry); 5 / 6 opens the writing steps; the two states are shown separately', () => {
  const w = open(boot({ user: STU })), L1 = toGuided(w, false);
  Object.assign(L1.g, G_OK, { 't:museum-a': 'down', top: 'museum-b' }); act(w, 'lu-gchk'); let h = w.T.luStageHTML(w.MD_LM_U2, 'guided');
  assert.ok(h.includes('Đúng 4 / 6 câu') && !h.includes('id="luW_trend"') && !L1.gpass && h.includes('Luyện nhận biết: đúng 4 / 6 · chưa đạt') && h.includes('Bài viết: chưa có lần viết nào'));
  act(w, 'lu-gredo'); Object.assign(L1.g, G_OK, { top: 'museum-b' }); act(w, 'lu-gchk'); h = w.T.luStageHTML(w.MD_LM_U2, 'guided');
  assert.ok(L1.gpass && h.includes('id="luW_trend"') && h.includes('id="luW_high"') && h.includes('id="luW_note"') && !h.includes('id="luG"'), 'sentences first, overview box later');
  assert.ok(h.includes('<ul class="lupieces" lang="en"><li>Larkfield Museum increased between 2000 and 2020.</li>') && !h.includes('Westmere Museum had the most'));
  assert.ok(h.includes('· đạt') && !/data-s="independent"/.test(h), 'no way forward yet');
});
['dcd', '   ', 'Overall', 'asdf qwer zxcv uiop hjkl bnmm tyui ghjk', 'Write a short overview of the chart below (about 2–3 sentences).', 'Larkfield Museum Westmere Museum Corvale Museum 2000 2020 overall while'].forEach((txt) =>
  t('P0: "' + txt.slice(0, 30) + '" as the Guided overview never opens Independent and never counts as writing', () => {
    const w = open(boot({ user: STU })); toGuided(w, true); setG(w, { wok: true, t: txt }); act(w, 'lu-gsub');
    assert.ok(!gd(w).sub, 'not saved as an attempt'); const h = w.T.luStageHTML(w.MD_LM_U2, 'guided');
    assert.ok(/class="lufb lupc no"/.test(h) && !/data-s="independent"/.test(h)); act(w, 'lu-go', { s: 'independent' }); assert.strictEqual(w.T.LU().stage, 'guided');
    setG(w, { sub: true }); assert.ok(!/data-s="independent"(?! disabled)[^>]*>/.test(w.T.luStageHTML(w.MD_LM_U2, 'guided')) || /data-s="independent" disabled/.test(w.T.luStageHTML(w.MD_LM_U2, 'guided')), 'a forged "saved" flag with a non-response stays closed');
    act(w, 'lu-go', { s: 'independent' }); assert.strictEqual(w.T.LU().stage, 'guided');
  }));
t('P0: copying the Learn sample is refused ("write it in your own words")', () => {
  const w = open(boot({ user: STU })); toGuided(w, true); const M = U2.claims.filter((x) => x.chart === 'A' && x.kind === 'model' && x.group !== 'highlights');
  setG(w, { wok: true, t: M.map((x) => resolved(x, x.en)).join(' ') }); act(w, 'lu-gsub'); assert.ok(!gd(w).sub); assert.ok(w.T.luStageHTML(w.MD_LM_U2, 'guided').includes(W.esc(copyOf('ui.pc.copied').vi)));
});
t('P0: each sentence is prechecked; the trends sentence is needed, the others are optional', () => {
  const w = open(boot({ user: STU })); toGuided(w, true); setG(w, { w: { trend: 'dcd' } }); act(w, 'lu-wchk'); let h = w.T.luStageHTML(w.MD_LM_U2, 'guided');
  assert.ok(!gd(w).wok && !h.includes('id="luG"') && h.includes(W.esc(copyOf('ui.pc.short').vi)));
  setG(w, { w: { trend: 'Larkfield Museum and Corvale Museum rose overall, while Westmere Museum fell.', note: '' } }); act(w, 'lu-wchk'); h = w.T.luStageHTML(w.MD_LM_U2, 'guided');
  assert.ok(gd(w).wok && h.includes('id="luG"') && h.includes(W.esc(copyOf('ui.pc.ok').vi)));
});
t('P0: a real two-sentence overview is saved as a practice attempt: "not assessed", never "passed"; Independent opens as "continue practising"', () => {
  const w = open(boot({ user: STU })); toGuided(w, true); writeAll(w, GOOD_OV); const h = w.T.luStageHTML(w.MD_LM_U2, 'guided');
  assert.ok(gd(w).sub && h.includes('Bài viết: chưa được đánh giá') && !/Bài viết: đạt|writing passed|mastered|bài viết.{0,20}(đạt|70)/i.test(h));
  assert.ok(h.includes('>Tiếp tục luyện (bài viết chưa được đánh giá)<') && !/data-s="independent" disabled/.test(h) && h.includes('data-act="lu-grv"'));
  act(w, 'lu-go', { s: 'independent' }); assert.strictEqual(w.T.LU().stage, 'independent');
});
t('P0: editing the saved overview into rubbish closes Independent again (one source of truth)', () => {
  const w = open(boot({ user: STU })); toGuided(w, true); writeAll(w, GOOD_OV); setG(w, { t: 'dcd' }); assert.ok(/data-s="independent" disabled/.test(w.T.luStageHTML(w.MD_LM_U2, 'guided')));
  act(w, 'lu-go', { s: 'independent' }); assert.strictEqual(w.T.LU().stage, 'guided');
});
t('P0: admin preview opens every stage but says so; it never makes a student attempt or a pass', () => {
  const w = open(boot()); const h = w.T.luHTML(L, w.MD_LM_U2); assert.ok(h.includes('class="luadm"') && h.includes(W.esc(copyOf('ui.adm.preview').vi)));
  act(w, 'lu-go', { s: 'independent' }); assert.strictEqual(w.T.LU().stage, 'independent'); assert.ok(!gd(w).sub, 'navigation is not completion');
  act(w, 'lu-af'); w.T.luStageHTML(w.MD_LM_U2, 'guided'); assert.ok(gd(w).t && !gd(w).sub, 'the Demo helper fills a sample (in memory) but never saves it for practice');
  act(w, 'lu-af'); assert.ok(!gd(w).t, 'switched off: the real (empty) draft is back');
  assert.ok(!boot({ user: STU }).T.luHTML(L, U2).includes('luadm'));
});
t('P0: language switch keeps sentences, overview and the "saved for practice" state', () => {
  const w = open(boot({ user: STU })); toGuided(w, true); writeAll(w, GOOD_OV); act(w, 'lu-lang', { v: 'en' }); const h = w.T.luStageHTML(w.MD_LM_U2, 'guided');
  assert.ok(gd(w).sub && h.includes('Writing: not assessed') && h.includes(W.esc(GOOD_OV)) && h.includes('Westmere Museum fell.'));
});
// ---------- Independent / Review ----------
t('Independent: Chart B, a hint that opens only the Chart A sample; students see no B sample or feature', () => {
  const S = boot({ user: STU }), h = S.T.luStageHTML(S.MD_LM_U2, 'independent'); assert.ok(h.includes('Chatora') && h.includes('id="luI"') && h.includes(W.esc(copyOf('ui.ind.hint').vi)));
  const hint = h.slice(h.indexOf('luhintA'), h.indexOf('</details>', h.indexOf('luhintA'))); assert.ok(hint.includes('Larkfield Museum') && !bWords.some((x) => hint.includes(x)));
  U2.claims.filter((x) => x.chart === 'B').forEach((x) => assert.ok(!h.includes(W.esc(resolved(x, x.en))), x.id));
});
t('Independent (admin preview): the reviewed sample is grammatical, chart-grounded, shown apart and never put into the box', () => {
  const x = U2.claims.find((c) => c.id === 'b.model.para'), txt = resolved(x, x.en);
  assert.strictEqual(txt, 'Overall, while the number of daily users of Pixlo and Notivo increased, the figure for Chatora declined. Chatora had the most users at the beginning of the period, but Pixlo overtook it to become the leading app by 2024.');
  assert.ok(!/is showing|experience |daily user\b|steadily decline|most popular/i.test(JSON.stringify(U2)), 'no rough fixture text anywhere');
  const h = T.luStageHTML(U2, 'independent'), box = h.slice(h.indexOf('id="luI"'), h.indexOf('</textarea>', h.indexOf('id="luI"')));
  assert.ok(/<details class="lufaq luadms">[\s\S]*Overall, while the number of daily users of Pixlo/.test(h) && !box.includes('Pixlo'));
});
t('"I\'m done": empty, "dcd" or a fragment does nothing (with a reason); a real overview opens Review and keeps the first version', () => {
  const w = open(boot({ user: STU })); ['  ', 'dcd', 'Overall, Pixlo grew.'].forEach((v) => { w.$ = () => ({ value: v, focus: () => {} }); act(w, 'lu-rv'); assert.notStrictEqual(w.T.LU().stage, 'review', v); });
  const OV = 'Overall, Pixlo and Notivo gained users over the period, while Chatora lost users. Chatora had the most users at the start, but Pixlo had the most at the end.';
  w.$ = () => ({ value: OV, focus: () => {} }); act(w, 'lu-rv'); assert.strictEqual(w.T.LU().stage, 'review'); assert.strictEqual(w.T.luGet(w.MD_LM_U2, 'indep').orig, OV);
});
t('Review: first version kept for comparison, editable revision, extra self-checks, one full sample "not the only answer" with why + checked facts', () => {
  const w = open(boot({ user: STU })); w.T.luPut(w.MD_LM_U2, 'indep', { t: 'My revised text here', orig: 'My first text here', rv: true }); const h = w.T.luStageHTML(w.MD_LM_U2, 'review');
  assert.ok(h.includes('<div class="essay lufirst" lang="en">My first text here</div>') && h.includes('My revised text here</textarea>'));
  assert.ok(h.includes(W.esc(copyOf('ui.rv.avoidNums').vi)) && h.includes(W.esc(copyOf('ui.rv.chartLang').vi)) && h.includes(W.esc(copyOf('ui.rv.oneOf').vi)));
  assert.ok(/class="lumod1"[\s\S]*Pixlo overtook it[\s\S]*luchip[\s\S]*Chatora \/ Pixlo: 2016 → 2024/.test(h)); U2.claims.filter((x) => x.chart === 'B').forEach((x) => assert.ok(x.why && x.why.en && x.why.vi, x.id + ' has why'));
});
t('free writing is never scored: "not graded automatically", no 150 words / minimum / band', () => {
  ['guided', 'independent', 'review'].forEach((st) => assert.ok(!/150|minimum|band/i.test(T.luStageHTML(U2, st)), st)); assert.ok(T.luStageHTML(U2, 'review').includes(W.esc(copyOf('ui.done.free').vi)));
});
// ---------- stage order (students) / admin ----------
t('students: stages open in order (titles say why); admin preview opens every stage', () => {
  const w = open(boot({ user: STU })); let h = w.T.luHTML(L, w.MD_LM_U2); assert.ok(/data-s="controlled" disabled title="Hãy hoàn thành bước trước\."/.test(h) && /data-s="review" disabled title="Hãy viết overview trước\."/.test(h));
  act(w, 'lu-go', { s: 'independent' }); assert.strictEqual(w.T.LU().stage, 'learn');
  const a = open(boot()); h = a.T.luHTML(L, a.MD_LM_U2); assert.ok(!/class="lustep[^"]*" data-act="lu-go" data-s="\w+" disabled/.test(h)); act(a, 'lu-go', { s: 'guided' }); assert.strictEqual(a.T.LU().stage, 'guided');
});
t('admin "Preview: auto-fill" is off by default, admin only, fills checkable answers only and saves nothing', () => {
  const w = open(boot()); assert.strictEqual(w.T.LU().af, false); assert.ok(w.T.luHTML(L, w.MD_LM_U2).includes('>Demo helper<') && w.T.luHTML(L, w.MD_LM_U2).includes('>Fill correct answers<'));
  const before = w.localStorage.length; act(w, 'lu-af'); w.T.luStageHTML(w.MD_LM_U2, 'controlled'); w.T.luStageHTML(w.MD_LM_U2, 'guided');
  const L1 = w.T.LU(); assert.strictEqual(L1.pick['c.a.1'], 'supported'); assert.strictEqual(L1.g['t:museum-c'], 'fup'); assert.strictEqual(w.localStorage.length, before, 'nothing written');
  const g = w.T.luGet(w.MD_LM_U2, 'guided'); assert.ok(g && /Larkfield Museum and Corvale Museum grew more popular/.test(g.t) && g.w.trend && g.w.high && g.w.note && !g.sub, 'every Guided box has a fact-checked sample');
  assert.ok(w.T.luHTML(L, w.MD_LM_U2).includes('>Undo demo answers<'));
  const st = open(boot({ user: STU })); assert.ok(!st.T.luHTML(L, st.MD_LM_U2).includes('lu-af')); act(st, 'lu-af'); assert.strictEqual(st.T.LU().af, false);
});
t('Demo helper for a shadow tester: visible, opens every stage, fills every answer and writing box; Check/Continue use them; nothing saved; ordinary student never', () => {
  const TST = { name: 'Tess', email: 'tess@x.com', role: 'student' };
  const w = open(boot({ user: TST })); w.testerEm = () => ({ 'tess@x.com': 1 }); // roster.tester === true (set by staff)
  let h = w.T.luHTML(L, w.MD_LM_U2); assert.ok(h.includes('>Fill correct answers<'), 'tester sees the Demo helper');
  const before = w.localStorage.length; act(w, 'lu-af'); h = w.T.luHTML(L, w.MD_LM_U2);
  assert.ok(!/data-s="\w+" disabled/.test(h), 'every stage open while it is on');
  ['learn', 'controlled', 'guided', 'independent', 'review'].forEach((st) => { act(w, 'lu-go', { s: st }); assert.strictEqual(w.T.LU().stage, st); });
  act(w, 'lu-go', { s: 'controlled' }); w.T.luStageHTML(w.MD_LM_U2, 'controlled'); act(w, 'lu-chk'); w.T.luStageHTML(w.MD_LM_U2, 'controlled'); assert.ok(w.T.LU().cpass, 'Check uses the filled answers');
  act(w, 'lu-go', { s: 'guided' }); w.T.luStageHTML(w.MD_LM_U2, 'guided'); act(w, 'lu-wchk'); act(w, 'lu-gsub');
  assert.ok(w.T.luGet(w.MD_LM_U2, 'guided').sub, 'the sample passes the minimum check when the tester presses Save');
  act(w, 'lu-go', { s: 'independent' }); w.T.luStageHTML(w.MD_LM_U2, 'independent'); const it = w.T.luGet(w.MD_LM_U2, 'indep').t; assert.ok(/Pixlo/.test(it) && !/Larkfield/.test(it), 'Chart B sample for Independent');
  act(w, 'lu-rv'); w.T.luStageHTML(w.MD_LM_U2, 'review'); const r = w.T.luGet(w.MD_LM_U2, 'indep'); assert.ok(r.rv && r.t !== r.orig && /^Overall/.test(r.t), 'Review gets a better revision');
  assert.strictEqual(w.localStorage.length, before, 'nothing saved');
  act(w, 'lu-lang', { v: 'en' }); assert.ok(w.T.luHTML(L, w.MD_LM_U2).includes('>Undo demo answers<'), 'language switch keeps it (only the ENG / VI choice is remembered)'); act(w, 'lu-af'); assert.ok(!w.T.luGet(w.MD_LM_U2, 'guided') && !w.T.LU().af);
  const st = open(boot({ user: STU })); assert.ok(!st.T.luHTML(L, st.MD_LM_U2).includes('Demo helper'));
});
// ---------- language ----------
t('language switch keeps stage, answers, Learn steps and drafts; IELTS sentences stay English', () => {
  const w = boot(); learnTo(w, 7); const vi = learn(w); act(w, 'lu-lang', { v: 'en' }); const en = learn(w);
  const sents = (h) => (h.match(/<p class="(lusent|lupara)" lang="en">[\s\S]*?<\/p>/g) || []).join('|'); assert.ok(sents(en).length > 0); assert.strictEqual(sents(en), sents(vi));
  assert.strictEqual(w.T.LU().lstep, 7); assert.strictEqual(w.localStorage.getItem('md-lm-lang'), 'en'); assert.ok(en.includes('>Continue<') === false || true);
  assert.strictEqual(boot().T.LU().lang, 'vi'); assert.strictEqual(boot({ broken: true }).T.LU().lang, 'vi');
});
t('missing translation: the other language is shown with a visible note', () => {
  const w = open(boot()); assert.ok(/Hello <span class="lumiss">\(chỉ có tiếng Anh\)/.test(w.T.luPair('Hello', ''))); act(w, 'lu-lang', { v: 'en' }); assert.ok(/Xin chào <span class="lumiss">\(Vietnamese only\)/.test(w.T.luPair('', 'Xin chào')));
});
t('no hard-coded English UI words left in Vietnamese mode', () => ['learn', 'controlled', 'guided', 'independent', 'review'].forEach((st) => {
  const w = boot(); if (st === 'learn') learnTo(w, 7); else open(w); const L1 = w.T.LU(); L1.chk = true; L1.gchk = true; Object.assign(L1.g, G_OK); L1.gpass = true;
  const h = w.T.luStageHTML(w.MD_LM_U2, st).replace(/<p class="(lusent|lust|luframe|lupara)" lang="en">[\s\S]*?<\/p>|<ul class="lupieces" lang="en">[\s\S]*?<\/ul>|<span lang="en">[^<]*<\/span>/g, '');
  assert.ok(!/>(Check answers|Check|Correct\.|Not quite\.|Try again|Continue|Clear draft|Self-check|I&#39;m done)</.test(h), st);
}));
// ---------- content / ids / drafts / safety ----------
t('every UI text id used by the lesson code exists in the content; all content still pending, no problems', () => {
  const known = new Set(U2.copy.map((x) => x.id)); const LM2 = LM.slice(0, LM.indexOf('/* ---------- Learning Materials · Unit 0 lesson')); const used = (LM2.match(/luUf?\(u,'([\w.]+)'[,)]|luCopy\(u,'([\w.]+)'\)|luC\(u,'([\w.]+)'\)/g) || []).map((m) => /'([\w.]+)'/.exec(m)[1]);
  assert.ok(used.length > 30); used.forEach((id) => assert.ok(known.has(id), 'missing ' + id));
  ['up', 'down', 'fluct'].forEach((c) => assert.ok(known.has('ui.tr.' + c))); ['learn', 'controlled', 'guided', 'independent', 'review'].forEach((x) => assert.ok(known.has('ui.st.' + x)));
  const r = W.LMX.lmCheck(U2); assert.strictEqual(r.errors.length, 0, r.errors.join(' | ')); assert.strictEqual(r.approved, 0);
  ['copy', 'claims', 'controlled', 'keyFeatures'].forEach((k) => U2[k].forEach((x) => assert.strictEqual(x.review, 'pending', x.id)));
});
t('drafts: version-scoped key, restored; older version only offered for discard; Clear asks first', () => {
  const w = open(boot()); assert.strictEqual(w.T.luKey(w.MD_LM_U2, 'indep'), 'md-lm:lm-writing-ac-t1-u2:v1:indep');
  w.T.luPut(w.MD_LM_U2, 'indep', { t: 'Overall, things changed.' }); assert.ok(w.T.luStageHTML(w.MD_LM_U2, 'independent').includes('Overall, things changed.'));
  w.localStorage.setItem('md-lm:lm-writing-ac-t1-u2:v0:indep', JSON.stringify({ t: 'OLD TEXT' })); let h = w.T.luStageHTML(w.MD_LM_U2, 'independent'); assert.ok(!h.includes('OLD TEXT') && h.includes('lu-old'));
  act(w, 'lu-old', { a: 'indep' }); assert.strictEqual(w.localStorage.getItem('md-lm:lm-writing-ac-t1-u2:v0:indep'), null);
  w.confirm = () => false; act(w, 'lu-clear', { a: 'indep' }); assert.ok(w.T.luGet(w.MD_LM_U2, 'indep')); w.confirm = () => true; act(w, 'lu-clear', { a: 'indep' }); assert.strictEqual(w.T.luGet(w.MD_LM_U2, 'indep'), null);
  h = boot({ broken: true }).T.luStageHTML(U2, 'independent'); assert.ok(h.includes('luwarn'));
});
t('changed chart data: lesson refuses to show', () => { const w = boot({ mutate: (u) => { u.charts.A.chart.series[1].points[4].y = 70; } }); const h = w.T.luHTML(L, w.MD_LM_U2); assert.ok(h.includes('cannot be shown') && !h.includes('lusteps')); });
t('feedback 10/2026: header = breadcrumb (way back) + ENG | VI + admin auto-fill on the right; no separate back button, no duplicate "Unpublished preview" line', () => {
  const h = T.luHTML(L, U2), top = h.slice(0, h.indexOf('<div class="lmshell lu">'));
  assert.ok(/^<div class="lutop"><nav class="lmcrumb" aria-label="Breadcrumb"><button type="button" class="linkish" data-act="lm-back">Learning Materials<\/button>/.test(h));
  assert.ok(top.includes('>Writing<') && top.includes('>Task 1<') && top.includes('data-act="lu-lang"') && top.includes('data-act="lu-af"'));
  assert.ok(!h.includes('still waiting for review') && !h.includes('‹ Learning Materials') && !h.includes('lmpath'));
  const s = boot({ user: STU }); s.T.setLMV(LID); assert.ok(!s.T.lmHTML().includes('lusteps'), 'students still cannot open it');
  assert.ok(!boot({ user: STU }).T.luHTML(L, U2).includes('lu-af'), 'auto-fill admin only');
});
t('pending content stays gated: students cannot open the unpublished lesson; content check still runs', () => {
  const w = boot({ user: STU }); w.T.setLMV(LID); const h = w.T.lmHTML(); assert.ok(!h.includes('lusteps') && !h.includes('lm-open') && h.includes('lmtree'));
  assert.ok(W.LMX.lmCheck(U2).pending > 0 && L.status === 'unpublished');
});
t('lesson code: no database, XP or AI calls', () => { const blk = LM.slice(LM.indexOf('Learning Materials · Unit 2 lesson')); assert.ok(!/dbh|collection\(|addXP|gainXP|putProf|grantSpin|\/api\//.test(blk)); });
t('index.html loads the content after md-chart.js and before the app', () => {
  const i = (x) => html.indexOf('<script src="' + x + '"></script>'), app = html.indexOf("(function(){\n'use strict'");
  assert.ok(i('md-chart.js') > 0 && i('md-chart.js') < i('lm-engine.js') && i('lm-engine.js') < i('lm-unit2.js') && i('lm-unit2.js') < app);
});
t('Unit 2 may be "published" only when the release check passes', () => { if (L.status !== 'published') { assert.strictEqual(L.status, 'unpublished'); return; } const r = W.LMX.lmCheck(U2, true); assert.strictEqual(r.errors.length, 0); });

console.log('---- ' + pass + '/' + (pass + fail) + ' passed');
process.exit(fail ? 1 : 0);
