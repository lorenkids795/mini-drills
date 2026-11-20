// Owner decisions E-1 … E-6 (approved 11/2026, Dictation Lab R3) as regression tests on the real engine / UI code of this repo, with the
// package's synthetic "Harbour Museum" fixture. Run: node tests/dictation-decisions.test.js
'use strict';
const assert = require('assert'); const fs = require('fs'); const path = require('path'); const { pathToFileURL } = require('url');
const ROOT = path.join(__dirname, '..'); let pass = 0, fail = 0; const T = [];
const t = (name, fn) => T.push([name, fn]);
(async () => {
  const imp = (p) => import(pathToFileURL(path.join(ROOT, p)).href);
  const E = await imp('dictation/engine/index.js'); const V = await imp('dictation/validator/index.js'); const SCHEMA = (await imp('dictation/validator/schema.js')).default;
  const BASE = fs.readFileSync(path.join(ROOT, 'dictation-lab', 'pkg', 'golden-tests-v1.1', 'baseline-harbour-museum.rev1.json'), 'utf8');
  const prep = (doc) => ({ doc, validation: V.validateDictationDocument(doc, { schema: SCHEMA }) });
  const SO = (doc) => Object.assign(prep(doc || JSON.parse(BASE)), { version: 'v1', seed: 5, deselected: [], approval: { approved: true, version: 'v1' } });
  const run = () => E.createRun(Object.assign(prep(JSON.parse(BASE)), { version: 'v1', seed: 5 }));
  const ansOf = (r, id) => { const it = r.lesson.items.get(id); const a = it.spans.filter((s) => s.role === 'correct_answer' || s.role === 'candidate').map((s) => s.span.surface); return it.responseMode === 'choose_option' ? { chosen: a[0] } : { text: a[0] }; };
  const UI = fs.readFileSync(path.join(ROOT, 'dictation', 'ui.js'), 'utf8');

  t('E-1: homework has no per-item Check; the device payload has no answers; nothing is scored before Submit', async () => {
    const pl = E.homeworkPayload(SO(), { assignmentId: 'A', phase: 9 }); const j = JSON.stringify(pl);
    for (const k of ['cleanText', 'acceptedForms', 'correct_answer', 'explanation']) assert.ok(!j.includes(k), k);
    const c = new E.HomeworkClient(E.homeworkPayload(SO(), { assignmentId: 'A' }), { makeKey: () => 'k', transport: {} });
    assert.strictEqual(c.check, undefined); assert.strictEqual(c.session.dispatch({ op: 'check', item: pl.items[0].id }), 'not_available_homework');
    assert.strictEqual(c.review().status, 'locked_until_submitted');
    assert.ok(!/btn\("Check"[^\n]*mountHomework|Check answer/.test(UI.slice(UI.indexOf('export async function mountHomework'), UI.indexOf('function result('))), 'no Check button in the homework UI');
  });
  t('E-2: independent Answer Spotter answers are protected (£8.50 / £12 -> as-005, "school groups" -> as-001) in practice and homework', async () => {
    const r = run(); const blocked = (id) => r.presentBlockers(id);
    for (const id of ['as-003', 'as-004', 'l2-004']) assert.ok(blocked(id).includes('as-005'), id + ' waits for as-005');
    for (const id of ['l1-003', 'l2-002', 'l2-008']) assert.ok(blocked(id).includes('as-001'), id + ' waits for as-001');
    assert.strictEqual(r.check('as-003', { chosen: 'x' }).status, 'locked', 'practice: the £ options wait'); assert.strictEqual(r.present('l2-002').status, 'locked');
    r.check('as-001', ansOf(r, 'as-001')); assert.notStrictEqual(r.present('l2-002').status, 'locked', 'opens once as-001 is answered');
    const p1 = JSON.stringify(E.homeworkPayload(SO(), { assignmentId: 'A', phase: 1 }));
    for (const s of ['8.50', '£12', 'school groups']) assert.ok(!p1.includes(s), 'homework part 1 does not contain ' + s);
    assert.ok(E.phaseLockIds(SO()).includes('as-001') && E.phaseLockIds(SO()).includes('as-005'), 'their answers are locked before part 2');
    const p2 = JSON.stringify(E.releasePhase(SO(), { assignmentId: 'A' })); assert.ok(p2.includes('£12'), 'part 2 shows the options only after the lock');
  });
  t('E-3: the same sentence may appear in Level 1 to 4; reuse is kept, not blocked, and recorded as exposure (not unseen recall)', async () => {
    const r = run(); const by = {}; for (const it of r.items()) { if (it.kind !== 'scored') continue; for (const s of r.sentencesOf(it.id)) (by[s] = by[s] || new Set()).add(it.level); }
    const reused = Object.entries(by).filter(([, L]) => L.size >= 2); assert.ok(reused.length > 0, 'the fixture reuses sentences across levels');
    const l1 = r.items().find((i) => i.level === 'level1' && i.kind === 'scored'); assert.ok(l1, 'Level 1 is still there');
    const sum = JSON.stringify(r.summary()); assert.ok(/exposure|seen/i.test(sum), 'exposure is reported');
  });
  t('E-4: right after Check the UI shows numbers only; Review is a separate, explicit step; a blocked review returns no detail', async () => {
    const fb = UI.slice(UI.indexOf('function fbText'), UI.indexOf('function', UI.indexOf('function fbText') + 10));
    assert.ok(!/detail|text\b|surface|align/.test(fb.replace(/function fbText\(s\)/, '')), 'fbText uses only counts');
    assert.ok(/btn\(shown\[id\] \? "Hide review" : "Review"/.test(UI), 'Review is its own button');
    const r = run(); const c = r.check('l2-004', { answers: ['x', 'y'] }); assert.strictEqual(c.status, 'locked', 'blocked by as-005');
    const r2 = run(); r2.check('as-005', { text: 'zz' }); const g = r2.check('as-003', { chosen: 'zz' }); assert.ok(!g.score || g.score.detail === undefined || r2.reviewGate('as-003').open);
  });
  t('E-5: while Submit waits for the server everything is frozen; a failure restores the draft; a lost acknowledgement is not graded twice', async () => {
    let release; const hang = new Promise((ok) => { release = ok; });
    const srv = E.createMemoryServer({ serverOpts: SO(), assignment: { id: 'A', classId: 'C', contentVersion: 'v1' }, tokens: { t: { studentRef: 's', classId: 'C' } }, token: 't', script: ['lose_ack'] });
    const pl = srv.payload().payload; let k = 0; const host = { makeKey: () => 'k' + ++k, transport: { lockPhase: (q) => srv.lockPhase(q), submit: async (q) => { await hang; return srv.submit(q); } } };
    const c = new E.HomeworkClient(pl, host); const id = pl.items.find((i) => i.level === 'level3').id; c.answer(pl.lockOnContinue[0], { text: 'a' }); await c.continueToNextPhase();
    c.answer(id, { answer: 'first words', text: 'first words' });
    const p = c.submit({ confirmIncomplete: true }); assert.strictEqual(c.session.S.sub, 'submit_pending');
    assert.notStrictEqual(c.answer(id, { answer: 'edited while pending', text: 'x' }).status, 'draft_updated', 'no edit while pending');
    assert.ok(c.view().every((i) => i.readOnly), 'every control read-only'); assert.strictEqual((await c.submit({ confirmIncomplete: true })).status, 'already_pending');
    release(); const r1 = await p; assert.strictEqual(r1.status, 'draft_restored', 'lost ack -> draft back, answers kept');
    assert.ok(JSON.stringify(c.responses).includes('first words'));
    const r2 = await c.submit({ confirmIncomplete: true }); assert.strictEqual(r2.status, 'submitted'); assert.strictEqual(srv.store.size, 1, 'scored once');
    assert.ok(/Submitting…/.test(UI) && /disabled: !res.open \|\| pending/.test(UI), 'the UI shows the pending state and turns Submit off');
  });
  t('E-6: legacy postCheckReviewUnlock stays valid in lesson files but is ignored by the runtime', async () => {
    const base = JSON.parse(BASE); assert.strictEqual(base.settings.answerSpotter.postCheckReviewUnlock, 'after_first_attempt_checked');
    const alt = JSON.parse(BASE); alt.settings.answerSpotter.postCheckReviewUnlock = 'after_reveal'; const pa = prep(alt); assert.strictEqual(pa.validation.valid, true, 'both legacy values still validate');
    const a = E.createRun(Object.assign(prep(base), { version: 'v1', seed: 5 })), b = E.createRun(Object.assign(pa, { version: 'v1', seed: 5 }));
    for (const it of a.items()) assert.deepStrictEqual(b.reviewGate(it.id), a.reviewGate(it.id), it.id);
    for (const r of [a, b]) { r.check('as-001', ansOf(r, 'as-001')); } assert.deepStrictEqual(b.reviewGate('as-001'), a.reviewGate('as-001'));
    assert.strictEqual(a.reviewGate('as-001').open, true, 'a valid Check opens Review whatever the old setting says');
    assert.strictEqual(E.reviewUnlock({ mode: 'homework', submission: 'draft', postCheckReviewUnlock: 'after_first_attempt_checked', validChecks: 9 }), false);
  });
  for (const [name, fn] of T) { try { await fn(); pass++; console.log('PASS ' + name); } catch (e) { fail++; console.log('FAIL ' + name + ' -> ' + (e && e.message)); } }
  console.log('---- ' + pass + '/' + (pass + fail) + ' passed'); process.exit(fail ? 1 : 0);
})();
