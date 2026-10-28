// Learning Materials · Unit 0 (Data Reading & Selection): real content, real chart engine, real app code (tests/app-harness.js).
// Run: node tests/lm-unit0.test.js   (Node built-ins only)
'use strict';
const assert = require('assert'), path = require('path');
const { boot, html, ROOT } = require('./app-harness.js');
const LMX = require(path.join(ROOT, 'lm-engine.js')), U0 = require(path.join(ROOT, 'lm-unit0.js')), CH = require(path.join(ROOT, 'md-chart.js'));
let pass = 0, fail = 0;
const t = (name, fn) => { try { fn(); pass++; console.log('PASS ' + name); } catch (e) { fail++; console.log('FAIL ' + name + ' -> ' + e.message); } };
const LID = 'lm-writing-ac-t1-u0', clone = (o) => JSON.parse(JSON.stringify(o));
const HOOKS = 'u0HTML:u0HTML,u0StageHTML:u0StageHTML,u0Act:u0Act,get U0S(){return U0S},resetU0:function(){U0S=null},setLMV:function(v){LMV=v},lmHTML:lmHTML,lmLesson:lmLesson,lmVisible:lmVisible,luKey:luKey,luPut:luPut,luGet:luGet,get LU(){return LU},setLIBT:function(v){LIBT=v},setRoster:function(r){rosterDocs=r}';
const STU = { name: 'S', email: 's@x.com', role: 'student', cls: 'A' };
// student flows run as if the lesson were already published (only inside this test); the real file stays unpublished
// student flows: a hidden tester account (the only students who may open Writing before it launches)
const mk = (user) => { const B = boot({ hooks: HOOKS, user }); if (user && user.role === 'student') { B.W.MD_LM.lessons.find((x) => x.id === LID).status = 'published'; B.T.setRoster([{ email: user.email, name: user.name, cls: user.cls, role: 'student', tester: true }]); } B.T.setLIBT('lm'); B.T.setLMV(LID); const u = B.W.MD_LM_U0, l = B.T.lmLesson(LID);
  B.T.u0HTML(l, u); const act = (a, ds, extra) => B.T.u0Act(a, Object.assign({ dataset: ds || {} }, extra || {})); return { B, T: B.T, u, l, act, S: () => B.T.U0S, st: (s) => B.T.u0StageHTML(u, s), full: () => B.T.u0HTML(l, u) }; };
const B_WORDS = [U0.charts.B.id, U0.charts.B.chart.title, 'Brennick'].concat(U0.charts.B.chart.series.map((s) => s.label), U0.charts.B.chart.series.map((s) => s.id));
const noB = (h, where) => B_WORDS.forEach((w) => assert.ok(h.indexOf(w) < 0, where + ': found "' + w + '"'));
// answer every item of a Learn step right and press Continue
const LS = { 2: ['q0.l.unit', 'q0.l.series'], 3: ['q0.l.period', 'q0.l.xs', 'ct0.1', 'ct0.2'], 4: ['q0.l.shape'], 5: ['q0.l.high', 'q0.l.low'] };
const item = (id) => (U0.questions.find((x) => x.id === id) || U0.controlled.find((x) => x.id === id));
const right = (x) => (!x.statement ? x.answer : x.stage === 'learn' ? (x.label === 'not_determinable' ? 'cannot' : 'can') : (x.type === 'ovd' ? x.answer : x.label));
const doStep = (C, n) => { if (n === 4) U0.charts.A.chart.series.forEach((s) => C.act('u0-line', { id: s.id }));
  if (LS[n]) { LS[n].forEach((id) => C.act('u0-ans', { id, v: right(item(id)) })); C.act('u0-lchk', { ids: LS[n].join(',') }); }
  if (n === 6) { ['kf0.a.coal', 'kf0.a.wind'].forEach((id) => C.act('u0-sel', { id }, { checked: true })); C.act('u0-selchk'); } };
const learnAll = (C) => { for (let n = 1; n < 7; n++) { doStep(C, n); C.act('u0-lnext'); assert.strictEqual(C.S().ls, n + 1, 'stuck at step ' + n); } };
const C10 = ['q0.c.mean', 'q0.c.notshown', 'c0.y1', 'c0.y2', 'c0.y3', 'c0.y4', 'c0.g1', 'c0.g2', 'c0.m1', 'c0.m2'];
const GOK = { 'q0.g.measure': 'b', 'q0.g.time': 'a', 't:src-coal': 'down', 't:src-wind': 'up', 't:src-solar': 'fup', 'q0.g.high': 'c', 'q0.g.leave': 's' };
const W = { esc: (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;') };
const wrongOf = (x) => { const O = !x.statement ? x.opts.map((o) => o.v) : x.type === 'ovd' ? ['overview', 'detail'] : ['supported', 'contradicted', 'not_determinable']; return O.find((v) => v !== right(x)); };

// ---------- content and facts ----------
t('content check: 0 problems, every item pending, ids unique, EN + VI everywhere, placeholders resolve', () => {
  const r = LMX.lmCheck(U0, false); assert.deepStrictEqual(r.errors, []); assert.strictEqual(r.approved, 0); assert.ok(r.pending >= 150);
  assert.ok(LMX.lmCheck(U0, true).errors.some((e) => /pending/.test(e)), 'release gate fails while pending');
});
t('Chart A facts: coal falls steadily and is top every year; wind rises steadily; solar ends higher but fluctuates and is lowest every year', () => {
  const F = CH.chGetVerifiedFacts(U0.charts.A).facts, g = (id) => F.find((f) => f.id === 'lm-u0-a@1:' + id);
  assert.strictEqual(g('shape:src-coal').result, 'monotonic_decrease'); assert.strictEqual(g('shape:src-wind').result, 'monotonic_increase');
  assert.strictEqual(g('shape:src-solar').result, 'fluctuating'); assert.strictEqual(g('endpoint:src-solar').result, 'increase');
  assert.strictEqual(g('highest-throughout:src-coal+src-wind+src-solar').result, 'src-coal'); assert.strictEqual(g('lowest-throughout:src-coal+src-wind+src-solar').result, 'src-solar');
  assert.ok(F.filter((f) => f.type === 'rank-change').every((f) => f.result === 'not_detected'), 'no change of leader on A');
});
t('Chart B facts: change of leader (car → bicycle), tie bus = bicycle in 2022, no "highest throughout"; never a crossing fact', () => {
  const F = CH.chGetVerifiedFacts(U0.charts.B).facts, g = (id) => F.find((f) => f.id === 'lm-u0-b@1:' + id);
  assert.strictEqual(g('rank-change:mode-car+mode-bike').result, 'detected'); assert.strictEqual(g('tie:mode-bus+mode-bike@2022').result, true);
  assert.strictEqual(g('highest-throughout:mode-car+mode-bus+mode-bike').status, 'unsupported'); assert.ok(!F.some((f) => /cross/.test(f.type)));
  assert.strictEqual(JSON.stringify(g('rank:mode-car+mode-bus+mode-bike@2024').result), JSON.stringify(['mode-bike', 'mode-car', 'mode-bus']));
});
t('measure / unit, period, observed years and groups: the right option is recomputed from the chart JSON', () => {
  ['q0.l.unit', 'q0.l.series', 'q0.l.period', 'q0.l.xs', 'q0.c.mean', 'q0.c.notshown', 'q0.g.measure', 'q0.g.time'].forEach((id) => {
    const x = item(id), ctx = LMX.lmFacts(U0); assert.deepStrictEqual(LMX.lmQuestionCheck(x, ctx, U0), [], id);
    x.opts.forEach((o) => { if (o.v === x.answer) return; const y = clone(x); y.answer = o.v; assert.ok(LMX.lmQuestionCheck(y, ctx, U0).length, id + ': wrong answer "' + o.v + '" not caught'); }); });
});
t('wrong stored answers are caught: question, YES/NO/NOT GIVEN label, missing year treated as NOT GIVEN', () => {
  const c = clone(U0); c.questions.find((x) => x.id === 'q0.l.high').answer = 'w'; c.controlled.find((x) => x.id === 'c0.y3').label = 'contradicted'; c.controlled.find((x) => x.id === 'c0.y2').label = 'supported';
  const e = LMX.lmCheck(c, false).errors; assert.ok(e.some((x) => /q0\.l\.high/.test(x)) && e.some((x) => /c0\.y3.*not_determinable/.test(x)) && e.some((x) => /c0\.y2.*contradicted/.test(x)), e.join(' | '));
  const d = clone(U0); d.charts.A.chart.series[0].points[4].y = 30; assert.ok(LMX.lmCheck(d, false).errors.length > 3, 'changed data breaks the content check');
});
t('salience keys are human keys (main / minor, leave out), never claimed as computed', () => {
  assert.strictEqual(item('q0.g.leave').key.reviewed, true); ['c0.m1', 'c0.m2'].forEach((id) => assert.strictEqual(item(id).type, 'ovd'));
  U0.keyFeatures.forEach((k) => assert.ok(['main', 'secondary'].includes(k.importance) && k.review === 'pending'));
});
t('no Chart B (title, place, labels, ids) in any Learn / Controlled / Guided content item', () => {
  ['copy', 'questions', 'controlled', 'claims', 'keyFeatures'].forEach((k) => U0[k].filter((x) => ['learn', 'controlled', 'guided'].includes(x.stage)).forEach((x) => noB(JSON.stringify(x), x.id)));
});
t('simulated data: fictional places, said once (Learn step 1), not under every chart', () => {
  assert.ok(U0.charts.A.synthetic && U0.charts.B.synthetic); const C = mk(); learnAll(C); const all = ['learn', 'controlled', 'guided', 'independent', 'review'].map((s) => C.st(s)).join('');
  const sim = C.u.copy.find((x) => x.id === 'u0.l.sim'); assert.strictEqual(all.split(sim.vi).length - 1, 1); assert.ok(!/class="chnote"|lucap/.test(all));
});

// ---------- screens ----------
t('Learn: checklist of five steps shown first, Chart A beside it, Vietnamese by default', () => {
  const C = mk(), h = C.st('learn'); assert.ok(h.includes('<ol class="u0ck">') && (h.match(/<li><b>/g) || []).length === 5); assert.ok(h.includes('Electricity generated from three sources in Valmora') && h.includes('id="u0S1"') && !h.includes('id="u0S2"'));
  assert.ok(h.includes('Bảng kiểm đọc số liệu'));
});
t('no Skip: Continue stays disabled until the step is done; a wrong answer twice shows the answer (no dead end)', () => {
  const C = mk(); C.act('u0-lnext'); let h = C.st('learn'); assert.ok(!/data-skip|>Skip<|Bỏ qua, tiếp tục/.test(h) && /data-act="u0-lnext" disabled/.test(h));
  C.act('u0-lnext'); assert.strictEqual(C.S().ls, 2, 'disabled Continue does nothing');
  C.act('u0-ans', { id: 'q0.l.unit', v: 'b' }); C.act('u0-ans', { id: 'q0.l.series', v: 'b' }); C.act('u0-lchk', { ids: 'q0.l.unit,q0.l.series' });
  h = C.st('learn'); assert.ok(/data-act="u0-lnext" disabled/.test(h) && h.includes('data-act="u0-lretry"')); assert.ok(!h.includes(C.u.questions[0].why.vi.slice(0, 20)), 'why not shown before a second try');
  C.act('u0-lretry', { ids: 'q0.l.unit,q0.l.series' }); C.act('u0-ans', { id: 'q0.l.unit', v: 'c' }); C.act('u0-lchk', { ids: 'q0.l.unit,q0.l.series' });
  h = C.st('learn'); assert.ok(!/data-act="u0-lnext" disabled/.test(h) && h.includes('Đáp án:') && h.includes('Electricity generated, in terawatt hours (TWh)'));
});
t('Learn: tapping a line shows its verified start → end and shape; the question appears after every line is seen', () => {
  const C = mk(); for (let n = 1; n < 4; n++) { doStep(C, n); C.act('u0-lnext'); }
  let h = C.st('learn'); assert.ok(!h.includes('q0.l.shape')); C.act('u0-line', { id: 'src-solar' }); h = C.st('learn');
  assert.ok(h.includes('2 → 15 (2005–2025)') && h.includes('lúc tăng lúc giảm') && /data-hl="s2"/.test(h));
  C.act('u0-line', { id: 'src-coal' }); C.act('u0-line', { id: 'src-wind' }); assert.ok(C.st('learn').includes('data-id="q0.l.shape"'));
});
t('Learn: all seven steps can be done; features are chosen first, main / minor + reasons only after Check; summary = Chart A notes', () => {
  const C = mk(); for (let n = 1; n < 6; n++) { doStep(C, n); C.act('u0-lnext'); }
  let h = C.st('learn'); const s6 = h.slice(h.indexOf('id="u0S6"')); assert.ok(!/class="pill( acc)?">(Chính|Phụ)/.test(s6) && /data-act="u0-selchk" disabled/.test(s6));
  doStep(C, 6); h = C.st('learn'); assert.ok(/class="pill acc">Chính/.test(h) && /class="pill">Phụ/.test(h)); C.act('u0-lnext');
  h = C.st('learn'); assert.ok(h.includes('id="u0S7"') && h.includes('Coal was the largest and Solar the smallest source in every year shown.') && C.S().ldone); noB(h, 'learn done');
});
t('Controlled: 10 scored items (incl. two new "gap" observations); YES / NO / NOT GIVEN mapped to supported / contradicted / not_determinable; 6 / 10 keeps Guided closed, 7 / 10 opens it', () => {
  const C = mk(STU); learnAll(C); C.act('u0-lnext'); C.act('u0-go', { s: 'controlled' }); assert.strictEqual(C.S().stage, 'controlled');
  let h = C.st('controlled'); assert.ok(h.includes('Cần đúng 7 / 10 câu') && h.includes('data-v="supported"') && h.includes('>YES (biểu đồ cho thấy đúng)<') && h.includes('>NOT GIVEN (biểu đồ không cho biết)<'));
  assert.ok(h.includes('The gap between Coal and Wind narrowed from 2005 to 2025.') && h.includes(W.esc(C.u.copy.find((x) => x.id === 'u0.ctl.diff').vi)));
  C10.forEach((id, i) => C.act('u0-ans', { id, v: i < 4 ? wrongOf(item(id)) : right(item(id)) })); C.act('u0-cchk'); h = C.st('controlled');
  assert.ok(h.includes('Đúng 6 / 10 câu') && /data-s="guided" disabled/.test(h) && !C.S().cpass); C.act('u0-go', { s: 'guided' }); assert.strictEqual(C.S().stage, 'controlled');
  C.act('u0-credo'); C10.forEach((id, i) => C.act('u0-ans', { id, v: i < 3 ? wrongOf(item(id)) : right(item(id)) })); C.act('u0-cchk');
  assert.ok(C.S().cpass && C.st('controlled').includes('Đúng 7 / 10 câu')); C.act('u0-go', { s: 'guided' }); assert.strictEqual(C.S().stage, 'guided');
  noB(C.st('controlled'), 'controlled');
});
t('the "gap" observations are recomputed from the two endpoint facts (narrowed = YES, widened = NO); a crossing makes it NOT GIVEN', () => {
  const ctx = LMX.lmFacts(U0); assert.strictEqual(LMX.lmClassify(item('c0.g1'), ctx, U0).label, 'supported'); assert.strictEqual(LMX.lmClassify(item('c0.g2'), ctx, U0).label, 'contradicted');
  const c = clone(U0); const x = c.controlled.find((y) => y.id === 'c0.g1'); x.binds = { c: 'lm-u0-b@1:endpoint:mode-car', w: 'lm-u0-b@1:endpoint:mode-bike' }; x.chart = 'B';
  assert.strictEqual(LMX.lmClassify(x, LMX.lmFacts(c), c).label, 'not_determinable', 'Car and Bicycle change places');
});
t('Guided: 7 checklist selects (5 / 7, trend answers from the facts) -> choose 2–3 features -> one observation per chosen feature, the checked fact only after Check -> notes -> compare + acknowledge', () => {
  const C = mk(STU), S = C.S(); S.ldone = true; S.cpass = true; S.stage = 'guided';
  let h = C.st('guided'); assert.strictEqual((h.match(/<select class="u0sel"/g) || []).length, 7); assert.ok(h.includes('Cần đúng 5 / 7 câu') && !h.includes('u0_fo_'));
  Object.assign(S.g, GOK, { 't:src-solar': 'up', 'q0.g.high': 'w', 'q0.g.leave': 'c' }); C.act('u0-gchk'); assert.ok(!S.gpass && C.st('guided').includes('Đúng 4 / 7 câu'));
  C.act('u0-gredo'); Object.assign(S.g, GOK, { 't:src-solar': 'up', 'q0.g.high': 'w' }); C.act('u0-gchk'); assert.ok(S.gpass); h = C.st('guided');
  assert.ok(h.includes('id="u0_gwhy"') && !h.includes('u0_fo_') && h.includes(W.esc(C.u.copy.find((x) => x.id === 'u0.g.pickFirst').vi)));
  ['kf0.a.coal', 'kf0.a.wind', 'kf0.a.top', 'kf0.a.low'].forEach((id) => C.act('u0-gsel', { id }, { checked: true })); assert.strictEqual(Object.keys(S.gsel).filter((k) => S.gsel[k]).length, 3, 'at most 3');
  h = C.st('guided'); assert.ok(h.includes('id="u0_fo_kf0.a.coal"') && h.includes('id="u0_fo_kf0.a.top"') && !h.includes('Đã kiểm với số liệu') && !/Số liệu đã kiểm để so sánh/.test(h), 'fact only after Check');
  S.fobs = { 'kf0.a.coal': 'gfg', 'kf0.a.wind': 'Wind rose steadily over the period.', 'kf0.a.top': 'Coal stayed the biggest source every year.' }; C.act('u0-ochk'); h = C.st('guided');
  assert.ok(/Số liệu đã kiểm để so sánh/.test(h) && h.includes('80 → 48 (2005–2025)') && h.includes('data-act="u0-gcomp"'));
  C.act('u0-gcomp'); assert.strictEqual(S.gsum, '- Wind rose steadily over the period.\n- Coal stayed the biggest source every year.', '"gfg" is not a note');
  S.gwhy = 'They describe the whole chart.'; h = C.st('guided'); assert.ok(/data-s="independent" disabled/.test(h) && h.includes('Đã xem lại, chưa sửa') && h.includes('data-act="u0-gack"'));
  S.gsum += '\n- Solar was the smallest.'; h = C.st('guided'); assert.ok(h.includes('Đã sửa (tự báo)'));
  C.act('u0-gack'); h = C.st('guided'); assert.ok(!/data-s="independent" disabled/.test(h) && h.includes('>Tiếp tục luyện (ghi chú chưa được đánh giá)<')); C.act('u0-go', { s: 'independent' }); assert.strictEqual(S.stage, 'independent');
  noB(h, 'guided');
});
t('Independent: Chart B for the first time as a five-part checklist (compact boxes, "not assessed automatically"); hint = method only; no Chart B reference before Review', () => {
  const C = mk(), h = C.st('independent'); assert.ok(h.includes('Daily journeys to work in Brennick') && (h.match(/id="u0_i_/g) || []).length === 5 && !h.includes('u0_i_main') && !h.includes('u0_i_omit'));
  assert.ok(h.includes(W.esc(C.u.copy.find((x) => x.id === 'u0.i.status').vi)) && h.includes(W.esc(C.u.copy.find((x) => x.id === 'u0.i.highHint').vi)));
  const hint = h.slice(h.indexOf('<details class="lufaq">'), h.indexOf('</details>', h.indexOf('<details class="lufaq">'))); ['Car', 'Bus', 'Bicycle', '2022', '2024'].forEach((w) => assert.ok(hint.indexOf(w) < 0, 'hint has ' + w));
  const S = boot({ hooks: HOOKS, user: STU }); S.W.MD_LM.lessons.find((x) => x.id === LID).status = 'published'; S.T.setLIBT('lm'); S.T.setLMV(LID); const hs = S.T.u0StageHTML(S.W.MD_LM_U0, 'independent');
  U0.claims.filter((x) => x.chart === 'B').forEach((x) => assert.ok(!hs.includes(LMX.lmResolve(x.en, x, LMX.lmFacts(U0)).text), x.id)); U0.keyFeatures.filter((x) => x.chart === 'B').forEach((x) => assert.ok(!hs.includes(x.reason.vi) && !hs.includes(x.reason.en), x.id));
});
t('"I am done" needs every checklist part; Review: A. Compare (first attempt next to the reference, self-check, optional features marked) and B. Revise (separate copy, Save revision, Before / After)', () => {
  const C = mk(STU), S = C.S(); C.act('u0-idone'); assert.notStrictEqual(S.stage, 'review');
  S.ind = { measure: 'journeys', time: '2016-2024', trends: 'bicycles up', high: 'leader changed', leave: 'bus' }; C.act('u0-idone'); assert.ok(S.rv && S.stage === 'review' && S.iorig.trends === 'bicycles up');
  let h = C.st('review'); assert.ok(h.includes('Car was the most used in 2016, but Bicycle was the most used in 2024; Bus and Bicycle were equal in 2022.') && h.includes('<p class="u0mine" lang="en">bicycles up</p>'));
  assert.ok(h.includes('Car / Bicycle: đổi vị trí cho nhau (2016–2024)') && h.includes('Tôi đã nêu mức tăng mạnh của Bicycle.') && h.includes('Tôi đã tránh nêu số liệu') && h.includes('>Không bắt buộc<'));
  assert.ok(h.includes('id="u0_r_trends"') && !h.includes('data-act="u0-rdone"'), 'finish only after saving a revision');
  C.act('u0-self', { id: 'kf0.b.lead' }, { checked: true }); assert.ok(!S.revSaved, 'a tick is not a revision');
  C.act('u0-rsave'); assert.strictEqual(S.revSaved, 'same'); assert.ok(C.st('review').includes('chưa sửa') && !C.st('review').includes('class="u0ba"'));
  S.rev.trends = 'Bicycle rose and Car fell at every point shown.'; C.act('u0-rsave'); h = C.st('review'); assert.strictEqual(S.revSaved, 'changed');
  assert.ok(/<table class="u0ba">[\s\S]*bicycles up[\s\S]*class="u0chg">Bicycle rose/.test(h) && S.iorig.trends === 'bicycles up', 'Before kept');
  C.act('u0-rdone'); assert.ok(S.rdone);
});
t('P0 (Unit 0): "gfg", "dcd", "abc", repeated words, whitespace or a copied reference note never count; a sensible note does; notes stay "not assessed"', () => {
  const C = mk(STU), S = C.S(); S.ldone = S.cpass = S.gpass = true; S.stage = 'guided'; S.gsel = { 'kf0.a.coal': true, 'kf0.a.wind': true };
  ['gfg', 'dcd', 'abc', 'gfg gfg gfg', 'test test', '   ', 'Coal was the largest and Solar the smallest source in every year shown.'].forEach((bad) => {
    S.fobs = { 'kf0.a.coal': bad, 'kf0.a.wind': 'Wind rose steadily over the period.' }; S.gsum = ''; C.act('u0-gcomp'); assert.ok(!S.gsum, JSON.stringify(bad) + ' counted'); });
  S.fobs = { 'kf0.a.coal': 'Coal fell at every point shown.', 'kf0.a.wind': 'Wind rose steadily over the period.' }; C.act('u0-gcomp'); assert.ok(/^- Coal fell/.test(S.gsum));
  S.gwhy = 'gfg'; S.gack = true; assert.ok(/data-s="independent" disabled/.test(C.st('guided')), '"gfg" reason stays closed');
  S.gwhy = 'Vì chúng mô tả cả biểu đồ'; const h = C.st('guided'); assert.ok(!/data-s="independent" disabled/.test(h) && h.includes('chưa được đánh giá') && !/đạt chuẩn|mastered|passed/i.test(h));
  S.stage = 'independent'; ['frf', 'abc', 'xxx xxx', ''].forEach((bad) => { S.ind = { measure: 'journeys', time: '2016-2024', trends: bad, high: 'leader changed', leave: 'bus' }; C.act('u0-idone'); assert.notStrictEqual(S.stage, 'review', JSON.stringify(bad)); });
  S.ind.trends = 'bicycles rose, cars fell'; C.act('u0-idone'); assert.strictEqual(S.stage, 'review');
});
t('P0 (Unit 0): admin preview says so and never creates a student attempt', () => { const A = mk(); assert.ok(A.full().includes('class="luadm"')); A.act('u0-go', { s: 'review' }); assert.ok(!A.S().rv); assert.ok(!mk(STU).full().includes('luadm')); });
t('students: stages open in order (titles explain why); admin opens every stage', () => {
  const C = mk(STU), h = C.full(); assert.ok(/data-s="controlled" disabled title="Hãy hoàn thành bước trước\."/.test(h) && /data-s="review" disabled title="Hãy làm xong phần Tự làm trước\."/.test(h));
  C.act('u0-go', { s: 'independent' }); assert.strictEqual(C.S().stage, 'learn');
  const A = mk(); A.act('u0-go', { s: 'review' }); assert.strictEqual(A.S().stage, 'review');
});
t('admin auto-fill: admin only; fills objective answers AND every writing box from the right chart; nothing saved; off keeps genuine typing and removes only the samples', () => {
  const C = mk(); assert.ok(C.full().includes('Preview: auto-fill off')); const before = JSON.stringify(C.T.luGet(C.u, 'state'));
  C.S().gwhy = 'My own reason typed before'; C.act('u0-af'); const S = C.S(); S.gpass = true; S.ochk = true; S.rv = true;
  ['learn', 'controlled', 'guided', 'independent', 'review'].forEach((st) => C.st(st));
  assert.strictEqual(S.a['c0.y1'], 'supported'); assert.strictEqual(S.g['t:src-solar'], 'fup'); assert.strictEqual(S.gwhy, 'My own reason typed before', 'existing text kept');
  assert.ok(Object.keys(S.gsel).filter((k) => S.gsel[k]).length >= 2 && S.fobs['kf0.a.coal'] === 'Coal fell from 80 to 48 TWh between 2005 and 2025.' && /^- /.test(S.gsum));
  assert.strictEqual(S.ind.trends, 'Bicycle went up and Car went down.'); assert.strictEqual(S.ind.measure, 'Daily journeys to work, in thousands of journeys per day.');
  assert.ok(!/Coal|Wind|Solar|TWh/.test(JSON.stringify(S.ind) + JSON.stringify(S.rev)), 'no Chart A wording for Chart B'); assert.ok(!/Car|Bus|Bicycle/.test(JSON.stringify(S.fobs) + S.gsum), 'no Chart B wording in Guided');
  assert.ok(S.rev.trends !== S.iorig.trends && /every point shown/.test(S.rev.trends), 'After is a visibly better revision');
  assert.strictEqual(JSON.stringify(C.T.luGet(C.u, 'state')), before, 'nothing written while auto-fill is on');
  S.ind.high = 'Typed by the admin during preview.'; C.act('u0-af'); const R = C.S();
  assert.ok(!R.af && R.ind.high === 'Typed by the admin during preview.' && !R.ind.trends && R.gwhy === 'My own reason typed before' && !(R.fobs || {})['kf0.a.coal'], 'samples removed, genuine text kept');
  const St = mk(STU); assert.ok(!St.full().includes('u0-af')); St.act('u0-af'); assert.ok(!St.S().af && !St.S().ind.trends);
});
t('progress: stage, answers and notes restored for the same version; an older version is shown as such and only discarded on request', () => {
  const C = mk(STU); learnAll(C); C.S().fobs = { 'kf0.a.coal': 'note here' }; C.act('u0-line', { id: 'src-wind' }); const saved = C.T.luGet(C.u, 'state'); assert.ok(saved && saved.s.ldone && saved.s.ls === 7);
  C.T.resetU0(); C.T.u0HTML(C.l, C.u); assert.strictEqual(C.S().ls, 7); assert.strictEqual(C.S().fobs['kf0.a.coal'], 'note here');
  assert.strictEqual(C.T.luKey(C.u, 'state'), 'md-lm:lm-writing-ac-t1-u0:v1:state');
  C.B.W.localStorage.setItem('md-lm:lm-writing-ac-t1-u0:v0:state', '{"s":{"ls":3}}'); const st2 = C.B.W.localStorage;
  st2.key = (i) => ['md-lm:lm-writing-ac-t1-u0:v0:state', 'md-lm:lm-writing-ac-t1-u0:v1:state'][i]; Object.defineProperty(st2, 'length', { get: () => 2, configurable: true });
  let h = C.full(); assert.ok(h.includes('phiên bản cũ') && h.includes('data-act="u0-old"') && C.S().ls === 7, 'old version not loaded');
  C.B.W.confirm = () => false; C.act('u0-old'); assert.ok(st2.getItem('md-lm:lm-writing-ac-t1-u0:v0:state'));
  C.B.W.confirm = () => true; C.act('u0-old'); assert.strictEqual(st2.getItem('md-lm:lm-writing-ac-t1-u0:v0:state'), null);
  C.act('u0-clear'); assert.strictEqual(C.S().ls, 1);
  const D = mk(STU); D.T.luPut(D.u, 'state', { s: { ind: { high: 'a b', main: 'Bicycle first', omit: 'exact years' } } }); D.T.resetU0(); D.T.u0HTML(D.l, D.u); assert.ok(/Bicycle first/.test(D.S().ind.high) && /exact years/.test(D.S().ind.leave) && !D.S().ind.main, 'old drafts moved into the five parts');
});
t('language switch keeps stage, answers and notes; English practice statements and options stay English', () => {
  const C = mk(); learnAll(C); C.act('u0-go', { s: 'controlled' }); C.act('u0-ans', { id: 'c0.y1', v: 'supported' }); C.S().rev = { trends: 'kept text' }; const vi = C.st('controlled');
  C.act('u0-lang', { v: 'en' }); const en = C.st('controlled'), S = C.S(); assert.strictEqual(S.stage, 'controlled'); assert.strictEqual(S.a['c0.y1'], 'supported'); assert.strictEqual(S.ls, 7); assert.strictEqual(S.rev.trends, 'kept text');
  const sts = (h) => (h.match(/<p class="lust" lang="en">[^<]*<\/p>/g) || []).join('|'); assert.ok(sts(en).length > 0 && sts(en) === sts(vi));
  assert.ok(en.includes('You need 7 of 10 correct') && !en.includes('Cần đúng'));
});
t('Learn: headings have one number only (the circle); start → end and shape are labelled separately; main / minor is chart-specific guidance with another sensible choice', () => {
  const C = mk(); for (let n = 1; n < 4; n++) { doStep(C, n); C.act('u0-lnext'); } C.act('u0-line', { id: 'src-solar' }); let h = C.st('learn');
  assert.ok(!/<span class="lun" aria-hidden="true">\d<\/span>\d\./.test(h), 'no "3 2. Time"'); assert.ok(h.includes('>Thời gian / phạm vi</h4>'));
  assert.ok(/<dt>Đầu → cuối \(hướng chung\)<\/dt><dd>.*2 → 15 \(2005–2025\)/.test(h) && /<dt>Hình dạng \(qua mọi mốc được đánh dấu\)<\/dt><dd>lúc tăng lúc giảm<\/dd>/.test(h));
  C.act('u0-line', { id: 'src-coal' }); C.act('u0-line', { id: 'src-wind' }); doStep(C, 4); C.act('u0-lnext'); doStep(C, 5); C.act('u0-lnext'); doStep(C, 6); h = C.st('learn');
  assert.ok(h.includes(W.esc(C.u.copy.find((x) => x.id === 'u0.l.mmNote').vi)) && h.includes('Coal fell, Wind rose, and Solar was the smallest source in every year shown.'));
});
t('release controls: Unit 0 unpublished; students and teachers cannot see or open it (list, state or action)', () => {
  const LM = require(path.join(ROOT, 'lm-content.js')), l = LM.lessons.find((x) => x.id === LID); assert.strictEqual(l.status, 'unpublished'); assert.strictEqual(l.unit, 0);
  [STU, { name: 'T', email: 't@x.com', role: 'teacher' }].forEach((user) => { const B = boot({ hooks: HOOKS, user }); B.T.setLIBT('lm'); assert.strictEqual(B.T.lmVisible(B.T.lmLesson(LID)), false);
    B.T.setLMV(LID); const h = B.T.lmHTML(); assert.ok(!h.includes('Data Reading') && !h.includes('lusteps') && !h.includes('Valmora'));
    B.press({ act: 'lm-open', id: LID }); assert.ok(!B.T.lmHTML().includes('lusteps')); });
  const A = boot({ hooks: HOOKS }); A.T.setLIBT('lm'); assert.ok(A.T.lmVisible(A.T.lmLesson(LID)));
  assert.strictEqual(require(path.join(ROOT, 'lm-content.js')).lessons.find((x) => x.id === 'lm-writing-ac-t1-u2').status, 'unpublished', 'Unit 2 status untouched');
});
t('accessibility basics: every action is a button / labelled control; selects and boxes have labels', () => {
  const C = mk(); const S = C.S(); S.ldone = S.cpass = S.gpass = true; S.gsum = 'x'; const h = ['learn', 'controlled', 'guided', 'independent', 'review'].map((s) => C.st(s)).join('');
  (h.match(/<(select|textarea)\b[^>]*>/g) || []).forEach((tag) => { const id = (/id="([^"]+)"/.exec(tag) || [])[1]; assert.ok(id && h.includes('for="' + id + '"'), tag); });
  (h.match(/<(div|span|li|p)\b[^>]*data-act=/g) || []).forEach((tag) => assert.fail('clickable non-button: ' + tag));
});
t('lesson code: no database, XP or AI calls; index.html loads lm-unit0.js after lm-unit2.js and before the app', () => {
  const blk = html.slice(html.indexOf('/* ---------- Learning Materials · Unit 0 lesson'), html.indexOf('function renderLib(){')); assert.ok(blk.length > 1000 && !/dbh|collection\(|addXP|gainXP|putProf|grantSpin|\/api\//.test(blk));
  const i = (x) => html.indexOf('<script src="' + x + '"></script>'); assert.ok(i('lm-unit2.js') > 0 && i('lm-unit2.js') < i('lm-unit0.js') && i('lm-unit0.js') < html.indexOf("(function(){\n'use strict'"));
});
console.log('---- ' + pass + '/' + (pass + fail) + ' passed');
process.exit(fail ? 1 : 0);
