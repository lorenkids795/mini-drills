// Dictation Lab server (dictation-server.js) with a fake Firestore: staff save, admin approve/publish, practice access,
// homework payload / lock / submit, idempotency, class and deadline checks, version pinning, no answer leaks, md-hw.js status.
// Run: node tests/dictation-server.test.js
'use strict';
const assert = require('assert'); const fs = require('fs'); const path = require('path'); const { pathToFileURL } = require('url');
const ROOT = path.join(__dirname, '..'); let pass = 0, fail = 0; const T = [];
const t = (name, fn) => T.push([name, fn]);
(async () => {
  const S = await import(pathToFileURL(path.join(ROOT, 'dictation-server.js')).href);
  const E = await import(pathToFileURL(path.join(ROOT, 'dictation', 'engine', 'index.js')).href);
  const { buildTranscriptDoc } = await import(pathToFileURL(path.join(ROOT, 'dictation', 'transcript.js')).href);
  const MDHW = require(path.join(ROOT, 'md-hw.js'));
  const BASE = fs.readFileSync(path.join(ROOT, 'dictation-lab', 'pkg', 'golden-tests-v1.1', 'baseline-harbour-museum.rev1.json'), 'utf8');
  // ---- fake Firestore + helpers (same signatures as functions/api/[[path]].js)
  function mk() {
    const db = {}; let tick = 0; const col = (c) => (db[c] = db[c] || {});
    const D = {
      fsGet: async (env, c, id) => (col(c)[id] ? { data: JSON.parse(JSON.stringify(col(c)[id].data)), updateTime: col(c)[id].ut } : null),
      fsPut: async (env, c, id, o) => { col(c)[id] = { data: JSON.parse(JSON.stringify(o)), ut: 'u' + ++tick }; },
      fsCreate: async (env, c, id, o) => { if (col(c)[id]) return false; col(c)[id] = { data: JSON.parse(JSON.stringify(o)), ut: 'u' + ++tick }; return true; },
      fsUpdate: async (env, c, id, o, ut) => { const d = col(c)[id]; if (ut && (!d || d.ut !== ut)) return false; col(c)[id] = { data: Object.assign(d ? d.data : {}, JSON.parse(JSON.stringify(o))), ut: 'u' + ++tick }; return true; },
      fsDelete: async (env, c, id) => { delete col(c)[id]; },
      fsList: async (env, c) => Object.entries(col(c)).map(([id, d]) => Object.assign({ id }, d.data)),
      fsQueryDocs: async (env, c, f, v) => Object.entries(col(c)).filter(([, d]) => d.data[f] === v).map(([id, d]) => Object.assign({ id }, d.data)),
      idUser: async (env, req) => req.user || null, staffEmail: async (env, req) => (req.staff ? 'admin@x.test' : ''),
      rosterRow: async (env, em) => (col('roster')[em] ? { id: em, data: col('roster')[em].data } : null),
      normEmail: (e) => String(e || '').trim().toLowerCase(), slug: (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      json: (data, status) => ({ status: status || 200, data }), fail: (msg, status) => ({ status: status || 400, data: { error: msg } }), adminEmail: () => 'admin@x.test',
    };
    return { D, db };
  }
  const staff = { staff: true }; const stu = (em) => ({ user: { em, role: 'student' } });
  async function setup(opts = {}) {
    const { D, db } = mk(); const now = Date.now();
    await D.fsPut(null, 'roster', 'a@x.test', { email: 'a@x.test', name: 'An', cls: 'C1' }); await D.fsPut(null, 'roster', 'b@x.test', { email: 'b@x.test', name: 'Binh', cls: 'C2' });
    const sv = await S.dlStaff(D, null, staff, { op: 'save', title: 'Harbour', json: opts.json || BASE }); assert.strictEqual(sv.status, 200, JSON.stringify(sv.data));
    const lid = sv.data.lid; const ap = await S.dlAdmin(D, null, { op: 'approve', lid, n: 1, mode: opts.mode || 'homework' });
    if (opts.mode !== 'none') assert.strictEqual(ap.status, 200, JSON.stringify(ap.data));
    const pb = await S.dlAdmin(D, null, { op: 'publish', lid, bookId: 'cam21', testId: 't4', part: 2 }); const exId = pb.data.exId;
    await D.fsPut(null, 'assignments', 'A1', { cls: 'C1', start: now - 3600e3, due: opts.due ?? now + 864e5, ex: ['c_' + exId] });
    return { D, db, lid, exId, now };
  }
  const call = (X, user, route, body) => S.dlHomework(X.D, null, user, Object.assign({ exId: X.exId, asgId: 'A1' }, body || {}), route);

  t('staff save validates the lesson; invalid JSON is refused with codes; a version is immutable and a new save is v2', async () => {
    const { D, db } = mk();
    const bad = await S.dlStaff(D, null, staff, { op: 'save', json: '{"schemaVersion":"1.1"}' }); assert.strictEqual(bad.status, 400); assert.strictEqual(bad.data.code, 'invalid');
    assert.strictEqual((await S.dlStaff(D, null, {}, { op: 'save', json: BASE })).status, 401, 'no staff key');
    const a = await S.dlStaff(D, null, staff, { op: 'save', json: BASE }); const b = await S.dlStaff(D, null, staff, { op: 'save', lid: a.data.lid, json: BASE });
    assert.strictEqual(b.data.n, 2); assert.ok(db.dlVersions[a.data.lid + '_1'] && db.dlVersions[a.data.lid + '_2']);
    assert.ok(Object.keys(db.audit).length >= 2, 'audit trail');
  });
  t('approval: only the newest version; homework needs an audited transcript; transcript-only is practice only', async () => {
    const { D } = mk(); const tr = buildTranscriptDoc({ title: 'T', text: 'ANNA: Hello there, I would like to book a court.\n\nTOM: Sure, it costs twelve pounds.', attest: true }).doc;
    const sv = await S.dlStaff(D, null, staff, { op: 'save', json: JSON.stringify(tr) }); assert.strictEqual(sv.data.audited, false);
    const hw = await S.dlAdmin(D, null, { op: 'approve', lid: sv.data.lid, n: 1, mode: 'homework' }); assert.strictEqual(hw.status, 409); assert.strictEqual(hw.data.code, 'not_audited');
    assert.strictEqual((await S.dlAdmin(D, null, { op: 'approve', lid: sv.data.lid, n: 1, mode: 'practice' })).status, 200);
    await S.dlStaff(D, null, staff, { op: 'save', lid: sv.data.lid, json: JSON.stringify(tr) });
    assert.strictEqual((await S.dlAdmin(D, null, { op: 'approve', lid: sv.data.lid, n: 1, mode: 'practice' })).status, 409, 'old version');
    assert.strictEqual((await S.dlAdmin(D, null, { op: 'publish', lid: 'nope', bookId: 'cam21', testId: 't4' })).status, 404);
  });
  t('publish writes an answer-free Library entry (exercises/dl-*), never the lesson', async () => {
    const X = await setup(); const ex = X.db.exercises[X.exId].data; const j = JSON.stringify(ex);
    assert.strictEqual(ex.kind, 'dictation'); assert.strictEqual(ex.dlMode, 'homework'); assert.ok(X.exId.startsWith('dl-'));
    for (const k of ['transcript', 'cleanText', 'spans', 'acceptedForms', 'json']) assert.ok(!j.includes(k), k);
  });
  t('practice: practice lessons for everyone signed in; a homework lesson only after an accepted submission; assistants never', async () => {
    const X = await setup(); const r1 = await S.dlPractice(X.D, null, stu('a@x.test'), { exId: X.exId }); assert.strictEqual(r1.status, 403); assert.strictEqual(r1.data.code, 'homework_only');
    assert.strictEqual((await S.dlPractice(X.D, null, { user: { em: 'h@x.test', role: 'assistant' } }, { exId: X.exId })).status, 403);
    assert.strictEqual((await S.dlPractice(X.D, null, { user: { em: 't@x.test', role: 'teacher' } }, { exId: X.exId })).status, 200, 'teacher preview');
    assert.strictEqual((await S.dlPractice(X.D, null, {}, { exId: X.exId })).status, 401);
    const P = await setup({ mode: 'practice' }); const r = await S.dlPractice(P.D, null, stu('a@x.test'), { exId: P.exId }); assert.strictEqual(r.status, 200); assert.ok(r.data.json.length > 1000);
  });
  t('homework payload: right class only, no answer data, phase 2 only after the server stored phase 1', async () => {
    const X = await setup(); assert.strictEqual((await call(X, stu('b@x.test'), 'payload')).data.code, 'noasg', 'other class');
    assert.strictEqual((await call(X, { user: { em: 't@x.test', role: 'teacher' } }, 'payload')).status, 403);
    const p = await call(X, stu('a@x.test'), 'payload'); assert.strictEqual(p.data.status, 'ok'); const pl = p.data.payload; const j = JSON.stringify(pl);
    for (const k of ['cleanText', 'acceptedForms', 'correct_answer', 'explanation', 'evidenceSentenceIds']) assert.ok(!j.includes(k), k);
    const doc = JSON.parse(BASE); for (const s of doc.transcript.sentences) if (s.cleanText.length > 20) assert.ok(!j.includes(s.cleanText), 'leaks a sentence');
    assert.strictEqual(pl.phases, 2); assert.strictEqual(pl.phase, 1); assert.ok(pl.lockOnContinue.length > 0);
    const early = await call(X, stu('a@x.test'), 'submit', { req: { schema: E.SUBMISSION_SCHEMA, assignmentId: 'A1', contentVersion: pl.contentVersion, idempotencyKey: 'k', responses: {} } });
    assert.strictEqual(early.data.reason, 'phase_not_locked');
  });
  t('submit: scored on the server once; attempt written for md-hw.js; blanks = incomplete; PASS 70% of the whole homework; duplicate returns the same result', async () => {
    const X = await setup(); const em = 'a@x.test'; const pl = (await call(X, stu(em), 'payload')).data.payload; const cv = pl.contentVersion;
    const lockResp = Object.fromEntries(pl.lockOnContinue.map((id) => [id, { text: 'x', chosen: 'x' }]));
    const lk = await call(X, stu(em), 'lock', { req: { contentVersion: cv, responses: lockResp } }); assert.strictEqual(lk.data.status, 'ok'); assert.strictEqual(lk.data.payload.phase, 2);
    const lk2 = await call(X, stu(em), 'lock', { req: { contentVersion: cv, responses: { [pl.lockOnContinue[0]]: { text: 'changed' } } } }); assert.strictEqual(lk2.data.status, 'ok');
    assert.ok(JSON.parse(X.db.dlSits[Object.keys(X.db.dlSits)[0]].data.lock)[pl.lockOnContinue[0]].text === 'x', 'first lock wins');
    const doc = JSON.parse(BASE); const l3 = doc.exercises.level3.items[0]; const sent = doc.transcript.sentences.find((s) => s.id === l3.sentenceId).cleanText;
    const req = { schema: E.SUBMISSION_SCHEMA, assignmentId: 'A1', contentVersion: cv, idempotencyKey: 'k1', responses: { [l3.id]: { answer: sent }, [pl.lockOnContinue[0]]: { text: 'tampered after lock' } } };
    const sub = await call(X, stu(em), 'submit', { req }); assert.strictEqual(sub.data.status, 'accepted', JSON.stringify(sub.data));
    const R = sub.data.result; assert.strictEqual(R.items[l3.id].first.exact, true); assert.strictEqual(R.aggregate.result.completed, false); assert.strictEqual(R.aggregate.result.passed, false);
    assert.strictEqual(R.items[pl.lockOnContinue[0]].first.exact, false, 'locked phase-1 answer is the one scored');
    const att = X.db.attempts[Object.keys(X.db.attempts)[0]].data; assert.strictEqual(att.kind, 'dictation'); assert.strictEqual(att.ex, 'c_' + X.exId); assert.strictEqual(att.asg, 'A1'); assert.ok(att.answered < att.required);
    assert.ok(att.score / att.total < 0.7); assert.strictEqual(MDHW.attState(att), 'incomplete', 'md-hw.js: blanks = incomplete');
    const ev = MDHW.asgEval({ id: 'A1', start: X.now - 3600e3, due: X.now + 864e5, ext: [] }, { attempts: [att], hw: null, pass: null, now: Date.now(), ex: ['c_' + X.exId], sib: [] }); assert.strictEqual(ev.st, 'incomplete');
    const dup = await call(X, stu(em), 'submit', { req: Object.assign({}, req, { idempotencyKey: 'k2' }) }); assert.strictEqual(dup.data.status, 'duplicate'); assert.strictEqual(dup.data.submissionId, sub.data.submissionId);
    assert.strictEqual(Object.keys(X.db.attempts).length, 1, 'one attempt'); assert.ok(!JSON.stringify(X.db.dlSubs).includes('tampered after lock'), 'raw answers are not stored');
    const again = await call(X, stu(em), 'payload'); assert.strictEqual(again.data.submitted, true, 'after submission the payload route returns the result');
    assert.strictEqual((await S.dlPractice(X.D, null, stu(em), { exId: X.exId })).status, 200, 'practice opens after submission');
  });
  t('a fully correct homework passes and is completed (md-hw.js: complete)', async () => {
    const X = await setup(); const em = 'a@x.test'; const doc = JSON.parse(BASE);
    const run = E.createRun({ doc, unsafeSkipValidation: true, version: 'x', seed: E.hashSeed(em + '|' + X.lid) }); const L = run.lesson; const R = {};
    for (const it of run.items()) { if (it.kind !== 'scored') continue; const I = L.items.get(it.id); const lv = it.level;
      if (lv === 'level1') R[it.id] = { placedIds: run.present(it.id).payload?.tiles?.filter((x) => x.id.startsWith('w')).sort((a, b) => a.id.slice(1) - b.id.slice(1)).map((x) => x.id) ?? E.studentItem(L, it.id, lv, { seed: E.hashSeed(em + '|' + X.lid) }).tiles.filter((x) => x.id.startsWith('w')).sort((a, b) => a.id.slice(1) - b.id.slice(1)).map((x) => x.id) };
      else if (lv === 'level2') R[it.id] = { answers: I.blanks.map((b) => L.T.get(b.targetId).surface) };
      else if (lv === 'level3' || lv === 'level4') R[it.id] = { answer: run.sentencesOf(it.id).map((s) => L.S.get(s).cleanText).join('\n') };
      else { const ans = I.spans.filter((s) => s.role === 'correct_answer' || s.role === 'candidate').map((s) => s.span.surface); R[it.id] = I.responseMode === 'choose_option' ? { chosen: ans[0] } : { text: I.type === 'target_detection' ? ans.join(', ') : ans[0] }; } }
    const pl = (await call(X, stu(em), 'payload')).data.payload; const cv = pl.contentVersion;
    await call(X, stu(em), 'lock', { req: { contentVersion: cv, responses: Object.fromEntries(pl.lockOnContinue.map((id) => [id, R[id]])) } });
    const sub = await call(X, stu(em), 'submit', { req: { schema: E.SUBMISSION_SCHEMA, assignmentId: 'A1', contentVersion: cv, idempotencyKey: 'k', responses: R } });
    assert.strictEqual(sub.data.status, 'accepted', JSON.stringify(sub.data)); assert.strictEqual(sub.data.result.aggregate.result.passed, true); assert.strictEqual(sub.data.result.aggregate.result.completed, true);
    const att = Object.values(X.db.attempts)[0].data; assert.strictEqual(MDHW.attState(att), 'complete'); assert.ok(att.score * 100 >= 70 * att.total);
  });
  t('deadline: a homework cannot be opened after the deadline unless a late pass covers it', async () => {
    const X = await setup({ due: Date.now() - 2 * 3600e3 }); assert.strictEqual((await call(X, stu('a@x.test'), 'payload')).data.code, 'closed');
    await X.D.fsPut(null, 'passes', 'a-x-test_A1', { kind: 'day' }); assert.strictEqual((await call(X, stu('a@x.test'), 'payload')).data.status, 'ok', 'late pass');
  });
  t('version pinning: re-publishing a new version does not change a sitting already started (D-21)', async () => {
    const X = await setup(); const pl = (await call(X, stu('a@x.test'), 'payload')).data.payload;
    await S.dlStaff(X.D, null, staff, { op: 'save', lid: X.lid, json: BASE }); await S.dlAdmin(X.D, null, { op: 'approve', lid: X.lid, n: 2, mode: 'homework' }); await S.dlAdmin(X.D, null, { op: 'publish', lid: X.lid, bookId: 'cam21', testId: 't4', part: 2 });
    const pl2 = (await call(X, stu('a@x.test'), 'payload')).data.payload; assert.strictEqual(pl2.contentVersion, pl.contentVersion); assert.ok(pl.contentVersion.endsWith('@1'));
    const bad = await call(X, stu('a@x.test'), 'submit', { req: { schema: E.SUBMISSION_SCHEMA, assignmentId: 'A1', contentVersion: X.lid + '@2', idempotencyKey: 'k', responses: {} } }); assert.strictEqual(bad.data.reason, 'version_mismatch');
  });
  t('a practice-only lesson cannot be used as homework even if an assignment points at it', async () => {
    const X = await setup({ mode: 'practice' }); assert.strictEqual((await call(X, stu('a@x.test'), 'payload')).data.code, 'not_homework');
  });
  t('firestore.rules: students cannot create dictation attempts (kind or c_dl- exercise id)', async () => {
    const r = fs.readFileSync(path.join(ROOT, 'firestore.rules'), 'utf8'); assert.ok(r.includes("request.resource.data.get('kind', '') != 'dictation'")); assert.ok(r.includes("matches('^c_dl-.*')"));
  });
  t('the published bundle (dictation/) is byte-identical to the R3 source package and has no lesson data', async () => {
    const src = path.join(ROOT, 'dictation-lab', 'pkg'); for (const [a, b] of [['hybrid-engine/src', 'engine'], ['js-validator/src', 'validator']])
      for (const f of fs.readdirSync(path.join(src, a))) { if (f === 'cli.js') continue; assert.strictEqual(fs.readFileSync(path.join(ROOT, 'dictation', b, f), 'utf8'), fs.readFileSync(path.join(src, a, f), 'utf8'), b + '/' + f + ' drifted from the package'); }
    const sch = (await import(pathToFileURL(path.join(ROOT, 'dictation', 'validator', 'schema.js')).href)).default; assert.deepStrictEqual(sch, JSON.parse(fs.readFileSync(path.join(src, 'js-validator', 'schema', 'dictation-schema-v1.json'), 'utf8')));
    for (const f of ['ui.js', 'bridge.js', 'transcript.js']) assert.ok(!/cleanText":|"spans":/.test(fs.readFileSync(path.join(ROOT, 'dictation', f), 'utf8')), f);
  });
  for (const [name, fn] of T) { try { await fn(); pass++; console.log('PASS ' + name); } catch (e) { fail++; console.log('FAIL ' + name + ' -> ' + (e && e.message)); } }
  console.log('---- ' + pass + '/' + (pass + fail) + ' passed'); process.exit(fail ? 1 : 0);
})();
