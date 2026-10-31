// Reading (AI lessons, kind 'reading-ms'): question order, paraphrase pairs, Deep reading excerpts, Easy/Medium/Hard + student level.
// Real app code (tests/app-harness.js) + real server source. Run: node tests/reading.test.js
'use strict';
const assert = require('assert'), fs = require('fs'), path = require('path');
const { boot, ROOT } = require('./app-harness.js');
let pass = 0, fail = 0; const out = [];
async function t(name, fn) { try { await fn(); pass++; out.push('PASS ' + name); } catch (e) { fail++; out.push('FAIL ' + name + ' -> ' + e.message); } }
const HOOKS = 'parseReading:parseReading,EXAMPLE_R:EXAMPLE_R,renderRLesson:renderRLesson,rmDraw:rmDraw,get RM(){return RM},rlPick:rlPick,rmExIdx:rmExIdx,rmPsgExHTML:rmPsgExHTML,rmToolsHTML:rmToolsHTML,' +
  'setRoster:function(r){rosterDocs=r},setStuLevel:setStuLevel,allRoster:allRoster,get RD(){return RD},rdLevels:rdLevels,rdLvHTML:rdLvHTML,setTLV:function(v){RM_TLV=v},rebuildCustom:rebuildCustom,setCustom:function(d){customDocs=d},get customMap(){return customMap}';
const SRV = fs.readFileSync(path.join(ROOT, 'functions', 'api', '[[path]].js'), 'utf8');
const clone = (o) => JSON.parse(JSON.stringify(o));
const base = (B) => JSON.parse(B.T.EXAMPLE_R);

(async () => {
  // ---- 3.1 order ----
  await t('completion and TFNG items are put in passage order; NOT GIVEN keeps its slot; answers stay with their items', () => {
    const B = boot({ hooks: HOOKS }), o = base(B), ex = o.deep.exercises;
    ex.completion.items = ex.completion.items.slice().reverse();
    const tf = ex.true_false_not_given.items.slice().reverse(); ex.true_false_not_given.items = tf;
    const r = B.T.parseReading(o); assert.strictEqual(r.errs.length, 0, r.errs.join('|'));
    const C = r.data.rlesson.deep.comp.items, ps = C.map((x) => x.p); assert.deepStrictEqual(ps.slice(), ps.slice().sort((a, b) => a - b));
    ex.completion.items.forEach((x) => { const m = C.find((y) => y.q === x.prompt_with_blank.trim()); if (m) assert.ok(m.a.indexOf(String(x.answer).split('/')[0].trim()) >= 0, 'answer moved with its item'); });
    const T2 = r.data.rlesson.deep.tfng.items; const withP = T2.filter((x) => x.p >= 0).map((x) => x.p); assert.deepStrictEqual(withP.slice(), withP.slice().sort((a, b) => a - b));
    T2.forEach((x, i) => { if (x.p < 0) assert.strictEqual(tf.filter((y) => String(y.answer).toUpperCase().indexOf('NOT') >= 0).length > 0, true); });
    assert.ok(r.data.rwarn.some((w) => /passage order/.test(w)));
  });
  await t('matching exercises are not reordered', () => {
    const B = boot({ hooks: HOOKS }), o = base(B), H = o.deep.exercises.matching_headings.items.map((x) => x.paragraph_id);
    const r = B.T.parseReading(o); assert.deepStrictEqual(r.data.rlesson.deep.head.items.map((x) => 'P' + (x.p + 1)).join(), H.join());
  });
  // ---- 3.3 segs ----
  await t('paraphrase pairs: real matching parts are kept, invented ones dropped with a note', () => {
    const B = boot({ hooks: HOOKS }), o = base(B), x = o.pairs[0], w1 = x.ph.split(' ').slice(0, 2).join(' '), q1 = x.par.split(' ').slice(0, 2).join(' ');
    x.segs = [{ q: q1, t: w1, note: 'same meaning' }, { q: 'not in the paraphrase', t: w1 }, [q1, 'nowhere in the phrase']];
    const r = B.T.parseReading(o), P = r.data.rlesson.pairs[0];
    assert.strictEqual(P.segs.length, 1); assert.deepStrictEqual([P.segs[0].q, P.segs[0].t, P.segs[0].note], [q1, w1, 'same meaning']); assert.ok(r.data.rwarn.some((w) => /word pair/.test(w)));
    assert.ok(!('segs' in r.data.rlesson.pairs[1]), 'old-style pair keeps no segs');
  });
  await t('Stage 3 after Check: pairs shown as "q ≈ t" rows; a pair without segs keeps the old "par → ph" line', () => {
    const B = boot({ hooks: HOOKS }), o = base(B), x = o.pairs[0], w1 = x.ph.split(' ').slice(0, 2).join(' '), q1 = x.par.split(' ').slice(0, 2).join(' ');
    x.segs = [{ q: q1, t: w1 }]; const r = B.T.parseReading(o);
    B.T.renderRLesson({ id: 'r1', skill: 'reading', title: 't', kind: 'reading-ms', rl: r.data.rlesson, qs: r.data.qs }, '', '', null);
    B.T.RM.st = 2; B.T.RM.chk[2] = 1; B.T.rmDraw(); const h = B.el('libBody').innerHTML;
    assert.ok(h.includes('<ul class="rmsegs"><li><b>' + q1 + '</b>')); assert.ok(h.includes('</b> → <b>“'), 'fallback for the other pairs');
  });
  // ---- 3.2 excerpts ----
  await t('Deep reading shows only the paragraphs used by Stage 1 (no "Selected excerpts" box) with a compact link to the full passage', () => {
    const B = boot({ hooks: HOOKS }), o = base(B), r = B.T.parseReading(o), D = clone(r.data.rlesson);
    // make sure at least one paragraph is not used by Stage 1
    D.paras = D.paras.concat(['An extra closing paragraph that no question uses.', 'Another unused paragraph.']);
    B.T.renderRLesson({ id: 'r2', skill: 'reading', title: 't', kind: 'reading-ms', rl: D, qs: r.data.qs }, '', '', null);
    const L = B.T.rmExIdx(); assert.ok(L && L.length < D.paras.length); let h = B.T.rmPsgExHTML();
    const lib = B.el('libBody').innerHTML; assert.ok(!/Selected excerpts|not the whole passage|rmexh/.test(lib) && /<div class="rmph"><h3>Reading passage<\/h3><button type="button" class="linkish rmpsgt" data-act="rm-full"[^>]*>Show full passage</.test(lib), 'link in the passage card header');
    assert.strictEqual((h.match(/class="rmp"/g) || []).length, L.length);
    B.press({ act: 'rm-full' }); h = B.T.rmPsgExHTML(); assert.ok(/>Show only the paragraphs for these questions</.test(B.el('libBody').innerHTML)); assert.strictEqual((h.match(/class="rmp"/g) || []).length, D.paras.length);
  });
  // ---- 4 levels ----
  const lvEx = (B) => { const r = B.T.parseReading(base(B)), m = clone(r.data.rlesson), e = clone(m), hd = clone(m); e.title = 'EASY'; hd.title = 'HARD'; return { id: 'c_x', skill: 'reading', kind: 'reading-ms', title: 'x', rl: m, rlv: { easy: e, hard: hd }, qs: r.data.qs }; };
  const STU = (lv) => ({ name: 'S', email: 's@x.com', role: 'student', cls: 'A' });
  await t('student gets the version of their level (beginner → Easy, advanced → Hard, none → Medium)', () => {
    [['beginner', 'EASY', 'easy'], ['advanced', 'HARD', 'hard'], ['intermediate', null, 'medium'], ['', null, 'medium']].forEach(([lv, title, key]) => {
      const B = boot({ hooks: HOOKS, user: STU() }); B.T.setRoster([{ email: 's@x.com', name: 'S', cls: 'A', role: 'student', level: lv }]);
      const ex = lvEx(B), p = B.T.rlPick(ex); assert.strictEqual(p.lv, key, lv); if (title) assert.strictEqual(p.D.title, title); else assert.strictEqual(p.D, ex.rl);
    });
  });
  await t('missing version falls back to Medium', () => {
    const B = boot({ hooks: HOOKS, user: STU() }); B.T.setRoster([{ email: 's@x.com', name: 'S', cls: 'A', role: 'student', level: 'advanced' }]);
    const ex = lvEx(B); delete ex.rlv.hard; const p = B.T.rlPick(ex); assert.strictEqual(p.lv, 'medium'); assert.strictEqual(p.D, ex.rl);
  });
  await t('teacher switches versions with Easy / Medium / Hard; student only sees a level pill', () => {
    const B = boot({ hooks: HOOKS }), ex = lvEx(B); B.T.renderRLesson(ex, '', '', null); assert.ok(!/data-act="rm-lv"/.test(B.T.rmToolsHTML()), 'inside the settings panel'); B.T.RM.fsOpen = true; let h = B.T.rmToolsHTML();
    assert.ok(/data-act="rm-lv" data-v="easy"/.test(h) && /data-act="rm-lv" data-v="hard"/.test(h)); B.T.setTLV('hard'); assert.strictEqual(B.T.rlPick(ex).D.title, 'HARD');
    const S = boot({ hooks: HOOKS, user: STU() }); S.T.setRoster([{ email: 's@x.com', name: 'S', cls: 'A', role: 'student', level: 'beginner' }]); S.T.renderRLesson(lvEx(S), '', '', null);
    S.T.RM.fsOpen = true; h = S.T.rmToolsHTML(); assert.ok(!/data-act="rm-lv"/.test(h) && /class="pill rmlvp"[^>]*>Easy</.test(h));
  });
  await t('the finished attempt records the level that was played', () => { const src = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'); assert.ok(/readSec:RM\.t,level:RM\.lv,output:/.test(src)); });
  await t('teacher sets a student level in Class settings (saved on the roster row; student cannot)', () => {
    const B = boot({ hooks: HOOKS }); B.T.setRoster([{ email: 's@x.com', name: 'S', cls: 'A', role: 'student' }]);
    B.change({ classList: { contains: (c) => c === 'cslv' }, getAttribute: () => 's@x.com', value: 'advanced' }); assert.strictEqual(B.T.allRoster().find((r) => r.email === 's@x.com').level, 'advanced');
    const S = boot({ hooks: HOOKS, user: STU() }); S.T.setRoster([{ email: 's@x.com', name: 'S', cls: 'A', role: 'student' }]);
    S.change({ classList: { contains: (c) => c === 'cslv' }, getAttribute: () => 's@x.com', value: 'advanced' }); assert.ok(!S.T.allRoster().find((r) => r.email === 's@x.com').level);
  });
  await t('Create: Easy / Hard versions made with the lesson are kept apart (rdLevels) and restored as rlv', () => {
    const B = boot({ hooks: HOOKS }), r = B.T.parseReading(base(B)); B.T.RD.lv = { easy: { st: 'ok', rl: { title: 'E' } }, hard: { st: 'err', msg: 'x' } };
    assert.deepStrictEqual(JSON.parse(JSON.stringify(B.T.rdLevels())), { easy: { title: 'E' } }); // a failed version is never used (retry of failed parts: tests/reading-gen.test.js)
    B.T.setCustom([{ id: 'zz', docId: 'zz', bookId: 'cam14', testId: 't1', skill: 'reading', title: 'Z', rlesson: r.data.rlesson, rlevels: { easy: r.data.rlesson, hard: r.data.rlesson }, qs: r.data.qs }]); B.T.rebuildCustom();
    const c = B.T.customMap.c_zz; assert.ok(c && c.rlv && c.rlv.easy && c.rlv.hard && c.rl);
  });
  // ---- server prompt ----
  await t('server: ORDER rule, segs in prompt + schema, 3 level notes, level passed to the prompt', () => {
    assert.ok(/ORDER: list the completion items and the TRUE\/FALSE\/NOT GIVEN items in the order/.test(SRV)); assert.ok(/Matching exercises do not follow this rule/.test(SRV));
    assert.ok(/"segs": the match split into 1 to 3 meaningful pairs/.test(SRV) && /segs: \{ type: 'ARRAY'/.test(SRV));
    assert.ok(/easy: 'VERSION: EASY/.test(SRV) && /medium: 'VERSION: MEDIUM/.test(SRV) && /hard: 'VERSION: HARD/.test(SRV)); assert.ok(/RPROMPT \+ '\\n' \+ READING_LEVELS\[level\]/.test(SRV) && /def\.prompt \+ '\\n' \+ READING_LEVELS\[level\]/.test(SRV));
  });
  out.forEach((l) => console.log(l)); console.log('---- ' + pass + '/' + (pass + fail) + ' passed'); process.exit(fail ? 1 : 0);
})();
