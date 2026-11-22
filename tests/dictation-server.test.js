// Dictation server (dictation-server.js) with a fake Firestore, "write the script" (owner 11/2026): staff save + approval + publish,
// practice gate (never the script before a check), practice check, homework payload / submit (marked on the server once, attempt for
// md-hw.js), AI explanations (fake Gemini) + rule-based fallback, Error Notebook, class / deadline / version pinning, bundle checks.
// Run: node tests/dictation-server.test.js
'use strict';
const assert = require('assert'); const fs = require('fs'); const path = require('path'); const { pathToFileURL } = require('url');
const ROOT = path.join(__dirname, '..'); let pass = 0, fail = 0; const T = [];
const t = (name, fn) => T.push([name, fn]);
(async () => {
  const S = await import(pathToFileURL(path.join(ROOT, 'dictation-server.js')).href);
  const SC = await import(pathToFileURL(path.join(ROOT, 'dictation', 'script.js')).href);
  const MDHW = require(path.join(ROOT, 'md-hw.js'));
  const BASE = fs.readFileSync(path.join(ROOT, 'dictation-lab', 'pkg', 'golden-tests-v1.1', 'baseline-harbour-museum.rev1.json'), 'utf8');
  const SCRIPT = "ANNA: Hello, I would like to join the photography club.\n\nTOM: Great. We meet on Thursday evenings at seven o'clock.";
  const kv = () => { const m = {}; return { get: async (k) => (k in m ? m[k] : null), put: async (k, v) => { m[k] = v; }, m }; };
  function mk(ai) {
    const db = {}; let tick = 0; const col = (c) => (db[c] = db[c] || {}); const calls = { ai: 0, errors: [] };
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
      aiReady: () => !!ai, askGemini: async (env, prompt) => { calls.ai++; calls.prompt = prompt; if (ai === 'throw') throw new Error('busy'); return { out: ai(prompt), model: 'fake' }; },
      saveErrors: async (env, att, attemptId, x) => { calls.errors.push({ att, attemptId, n: x.corrections.length, c: x.corrections }); return x.corrections.length; },
      dayOf: () => ({ day: '2026-11-22', dayStart: 0 }),
    };
    return { D, db, calls };
  }
  const staff = { staff: true }; const stu = (em) => ({ user: { em, role: 'student' } });
  const ENV = () => ({ MD_KV: kv() });
  async function setup(opts = {}) {
    const X = mk(opts.ai); const now = Date.now(); X.env = ENV();
    await X.D.fsPut(null, 'roster', 'a@x.test', { email: 'a@x.test', name: 'An', cls: 'C1' }); await X.D.fsPut(null, 'roster', 'b@x.test', { email: 'b@x.test', name: 'Binh', cls: 'C2' });
    const sv = await S.dlStaff(X.D, X.env, staff, { op: 'save', title: 'Club', script: SCRIPT, checked: opts.checked !== false, audio: '/api/audio/AAAAAAAAAAAAAAAAAAAAAA' }); assert.strictEqual(sv.status, 200, JSON.stringify(sv.data));
    X.lid = sv.data.lid; const ap = await S.dlAdmin(X.D, X.env, { op: 'approve', lid: X.lid, n: 1, mode: opts.mode || 'homework' }); if (opts.mode !== 'none') assert.strictEqual(ap.status, 200, JSON.stringify(ap.data));
    X.exId = (await S.dlAdmin(X.D, X.env, { op: 'publish', lid: X.lid, bookId: 'cam21', testId: 't4', part: 2 })).data.exId;
    await X.D.fsPut(null, 'assignments', 'A1', { cls: 'C1', start: now - 3600e3, due: opts.due ?? now + 864e5, ex: ['c_' + X.exId] }); X.now = now; return X;
  }
  const hw = (X, user, route, body) => S.dlHomework(X.D, X.env, user, Object.assign({ exId: X.exId, asgId: 'A1' }, body || {}), route);
  const leaks = (o) => { const j = JSON.stringify(o); return ['photography', 'Thursday', "seven o'clock"].filter((w) => j.includes(w)); };

  t('compareScript: case / punctuation / labels ignored; spelling, endings, order count; corrections point at the exact place', () => {
    assert.strictEqual(SC.compareScript(SCRIPT, "hello i would like to join the photography club great we meet on thursday evenings at seven o'clock").pct, 100);
    const r = SC.compareScript(SCRIPT, 'Hello, I would like join the photograph club. Great. We meets on Thursday evening at seven oclock extra the the');
    assert.ok(r.pct < 100 && r.pct > 50); assert.strictEqual(r.passed, r.pct >= 70);
    for (const c of r.corrections) assert.strictEqual(r.text.substr(c.at, c.original_text.length), c.original_text, 'at = exact offset');
    const cats = r.corrections.map((c) => c.category); assert.ok(cats.includes('Missing word') && cats.includes('Spelling') && cats.includes('-s / -es ending'), cats.join());
    assert.ok(r.corrections.some((c) => /the the$/.test(c.original_text) && !/the the/.test(c.corrected_text)), 'extra words are dropped from the corrected text');
    assert.strictEqual(SC.compareScript(SCRIPT, '').empty, true); assert.strictEqual(SC.compareScript(SCRIPT, 'TOM:\nANNA:').words.yours, 0, 'labels alone (at the start of a line) are empty');
  });
  t('staff save: the script, checked or not; too short refused; a version is immutable, a new save is v2; JSON lessons still accepted', async () => {
    const { D, db } = mk(); const env = ENV();
    assert.strictEqual((await S.dlStaff(D, env, staff, { op: 'save', script: 'too short' })).status, 400);
    assert.strictEqual((await S.dlStaff(D, env, {}, { op: 'save', script: SCRIPT })).status, 401, 'no staff key');
    const a = await S.dlStaff(D, env, staff, { op: 'save', script: SCRIPT, title: 'T' }); assert.strictEqual(a.data.audited, false);
    const b = await S.dlStaff(D, env, staff, { op: 'save', lid: a.data.lid, script: SCRIPT, checked: true }); assert.strictEqual(b.data.n, 2); assert.strictEqual(b.data.audited, true);
    assert.strictEqual(db.dlVersions[a.data.lid + '_1'].data.kind, 'script'); assert.ok(Object.keys(db.audit).length >= 2, 'audit trail');
    assert.strictEqual((await S.dlStaff(D, env, staff, { op: 'save', json: BASE })).status, 200);
  });
  t('approval: homework only for a script checked against the audio; only the newest version', async () => {
    const { D } = mk(); const env = ENV(); const sv = await S.dlStaff(D, env, staff, { op: 'save', script: SCRIPT });
    const h = await S.dlAdmin(D, env, { op: 'approve', lid: sv.data.lid, n: 1, mode: 'homework' }); assert.strictEqual(h.status, 409); assert.strictEqual(h.data.code, 'not_audited');
    assert.strictEqual((await S.dlAdmin(D, env, { op: 'approve', lid: sv.data.lid, n: 1, mode: 'practice' })).status, 200);
    await S.dlStaff(D, env, staff, { op: 'save', lid: sv.data.lid, script: SCRIPT, checked: true });
    assert.strictEqual((await S.dlAdmin(D, env, { op: 'approve', lid: sv.data.lid, n: 1, mode: 'homework' })).status, 409, 'old version');
    assert.strictEqual((await S.dlAdmin(D, env, { op: 'approve', lid: sv.data.lid, n: 2, mode: 'homework' })).status, 200);
  });
  t('the Library entry and every response before a check carry no script', async () => {
    const X = await setup({ mode: 'practice' }); assert.deepStrictEqual(leaks(X.db.exercises[X.exId].data), []);
    const p = await S.dlPractice(X.D, X.env, stu('a@x.test'), { exId: X.exId }); assert.strictEqual(p.status, 200); assert.deepStrictEqual(leaks(p.data), []); assert.ok(p.data.words >= 15);
    const H = await setup(); const pl = await hw(H, stu('a@x.test'), 'payload'); assert.strictEqual(pl.data.status, 'ok'); assert.deepStrictEqual(leaks(pl.data), []);
  });
  t('practice gate: a homework lesson only from the homework list; assistants never; teacher preview always', async () => {
    const X = await setup(); assert.strictEqual((await S.dlPractice(X.D, X.env, stu('a@x.test'), { exId: X.exId })).data.code, 'homework_only');
    assert.strictEqual((await S.dlCheck(X.D, X.env, stu('a@x.test'), { exId: X.exId, text: 'hello' })).status, 403);
    assert.strictEqual((await S.dlPractice(X.D, X.env, { user: { em: 'h@x.test', role: 'assistant' } }, { exId: X.exId })).status, 403);
    assert.strictEqual((await S.dlCheck(X.D, X.env, { user: { em: 't@x.test', role: 'teacher' } }, { exId: X.exId, text: 'hello' })).status, 200);
  });
  t('practice: ONE check = the submission (no redo), teachers get the attempt, the student sees the full result again', async () => {
    const X = await setup({ mode: 'practice' }); assert.strictEqual((await S.dlCheck(X.D, X.env, stu('a@x.test'), { exId: X.exId, text: '  ' })).status, 400, 'empty text is not a submission');
    const r = await S.dlCheck(X.D, X.env, stu('a@x.test'), { exId: X.exId, text: 'hello i would like join the photograph club' });
    assert.strictEqual(r.data.status, 'accepted'); const R = r.data.result; assert.ok(R.pct < 70 && R.script.includes('photography') && R.ai.corrections.length);
    const att = Object.values(X.db.attempts)[0].data; assert.strictEqual(att.kind, 'dictation'); assert.ok(!('asg' in att) && att.dl.practice === true, 'an attempt for the teacher, no assignment');
    assert.strictEqual(X.calls.errors.length, 1); const again = await S.dlCheck(X.D, X.env, stu('a@x.test'), { exId: X.exId, text: 'a second try' });
    assert.strictEqual(again.data.status, 'duplicate'); assert.strictEqual(again.data.summary.pct, R.pct); assert.strictEqual(Object.keys(X.db.attempts).length, 1); assert.strictEqual(X.calls.errors.length, 1);
    const back = await S.dlPractice(X.D, X.env, stu('a@x.test'), { exId: X.exId }); assert.strictEqual(back.data.submitted, true); assert.strictEqual(back.data.result.text, 'hello i would like join the photograph club', 'full result when coming back');
    const tch = await S.dlCheck(X.D, X.env, { user: { em: 't@x.test', role: 'teacher' } }, { exId: X.exId, text: 'hello' }); assert.ok(tch.data.result.preview); assert.strictEqual(Object.keys(X.db.attempts).length, 1, 'teacher preview saves nothing');
  });
  t('homework submit: right class, marked once on the server, attempt for md-hw.js, repeat = the same result, script after', async () => {
    const X = await setup(); assert.strictEqual((await hw(X, stu('b@x.test'), 'payload')).data.code, 'noasg', 'other class');
    assert.strictEqual((await hw(X, { user: { em: 't@x.test', role: 'teacher' } }, 'payload')).status, 403);
    const sub = await hw(X, stu('a@x.test'), 'submit', { text: "Hello, I would like to join the photography club. Great. We meet on Thursday evenings at seven o'clock." });
    assert.strictEqual(sub.data.status, 'accepted', JSON.stringify(sub.data)); assert.strictEqual(sub.data.result.pct, 100); assert.strictEqual(sub.data.result.passed, true);
    const att = Object.values(X.db.attempts)[0].data; assert.strictEqual(att.kind, 'dictation'); assert.strictEqual(att.asg, 'A1'); assert.strictEqual(MDHW.attState(att), 'complete');
    const dup = await hw(X, stu('a@x.test'), 'submit', { text: 'something else' }); assert.strictEqual(dup.data.status, 'duplicate'); assert.strictEqual(dup.data.summary.pct, 100); assert.strictEqual(Object.keys(X.db.attempts).length, 1);
    const again = await hw(X, stu('a@x.test'), 'payload'); assert.strictEqual(again.data.submitted, true); assert.ok(again.data.script.includes('photography'));
    assert.ok(again.data.result && again.data.result.text.startsWith('Hello, I would'), 'coming back: the whole result again'); assert.ok(!JSON.stringify(X.db.dlSubs).includes('Hello, I would'), 'no student text in the score record');
    assert.strictEqual((await S.dlPractice(X.D, X.env, stu('a@x.test'), { exId: X.exId })).status, 403, 'no redo through practice');
  });
  t('an empty homework submission scores 0 and is Incomplete; nothing goes to the AI', async () => {
    const X = await setup({ ai: () => ({ items: [], vocabulary: [] }) }); const sub = await hw(X, stu('a@x.test'), 'submit', { text: '' }); assert.strictEqual(sub.data.result.pct, 0);
    assert.strictEqual(MDHW.attState(Object.values(X.db.attempts)[0].data), 'incomplete'); assert.strictEqual(X.calls.ai, 0);
  });
  t('AI explains the mistakes found (never adds any) and gives vocabulary FROM the script; Error Notebook gets the cards', async () => {
    const X = await setup({ ai: () => ({ items: [{ id: 0, category: 'Missing word', explanation: 'Listen for "to".', explanation_vi: 'Bạn thiếu “to”.' }, { id: 99, category: 'X', explanation: 'x', explanation_vi: 'x' }],
      vocabulary: [{ word: 'photography club', meaning_vi: 'câu lạc bộ nhiếp ảnh', example: 'made up' }, { word: 'not in the script', meaning_vi: 'x' }] }) });
    const sub = await hw(X, stu('a@x.test'), 'submit', { text: "Hello, I would like join the photography club. Great. We meet on Thursday evenings at seven o'clock.", tzo: -420 });
    const ai = sub.data.result.ai; assert.strictEqual(ai.corrections.length, 1); assert.strictEqual(ai.corrections[0].explanation_vi, 'Bạn thiếu “to”.');
    assert.deepStrictEqual(ai.vocabulary_upgrades.map((v) => v.upgraded), ['photography club']); assert.ok(/photography club/.test(ai.vocabulary_upgrades[0].example), 'example taken from the script');
    assert.strictEqual(X.calls.errors.length, 1); assert.strictEqual(X.calls.errors[0].attemptId, Object.keys(X.db.attempts)[0]); assert.strictEqual(sub.data.result.added, 1);
    assert.ok(X.calls.prompt.includes('TRANSCRIPT') && X.calls.prompt.includes('"wrote":"like"'));
  });
  t('AI busy or over the daily limit: the mark is complete with the rule-based explanations', async () => {
    const X = await setup({ ai: 'throw' }); const sub = await hw(X, stu('a@x.test'), 'submit', { text: 'Hello I would like join the club' });
    assert.strictEqual(sub.data.status, 'accepted'); assert.strictEqual(sub.data.result.ai.aiNote, 'busy'); assert.ok(sub.data.result.ai.corrections[0].explanation_vi.length > 0);
    const Y = await setup({ ai: () => ({ items: [], vocabulary: [] }) }); Y.env.MD_KV.m['aidq:a@x.test:2026-11-22'] = String(S.DL_AI_DAY);
    const s2 = await hw(Y, stu('a@x.test'), 'submit', { text: 'Hello I would like join the club' }); assert.strictEqual(s2.data.result.ai.aiNote, 'limit'); assert.strictEqual(Y.calls.ai, 0);
  });
  t('deadline + late pass, version pinning, practice-only lessons are not homework', async () => {
    const X = await setup({ due: Date.now() - 2 * 3600e3 }); assert.strictEqual((await hw(X, stu('a@x.test'), 'payload')).data.code, 'closed');
    await X.D.fsPut(null, 'passes', 'a-x-test_A1', { kind: 'day' }); assert.strictEqual((await hw(X, stu('a@x.test'), 'payload')).data.status, 'ok', 'late pass');
    const P = await setup(); await hw(P, stu('a@x.test'), 'payload');
    await S.dlStaff(P.D, P.env, staff, { op: 'save', lid: P.lid, script: 'ANNA: A completely new script for version two of the lesson.', checked: true }); await S.dlAdmin(P.D, P.env, { op: 'approve', lid: P.lid, n: 2, mode: 'homework' }); await S.dlAdmin(P.D, P.env, { op: 'publish', lid: P.lid, bookId: 'cam21', testId: 't4', part: 2 });
    const sub = await hw(P, stu('a@x.test'), 'submit', { text: "Hello I would like to join the photography club great we meet on thursday evenings at seven o'clock" }); assert.strictEqual(sub.data.result.pct, 100, 'marked on the pinned version 1');
    const Q = await setup({ mode: 'practice' }); assert.strictEqual((await hw(Q, stu('a@x.test'), 'payload')).data.code, 'not_homework');
  });
  t('older JSON lessons are read as their sentences (scriptOf)', () => {
    const v = { json: BASE, deselected: [] }; const sc = S.scriptOf(v); assert.ok(sc.length > 200 && /Harbour Museum/.test(sc));
  });
  t('firestore.rules: students cannot create dictation attempts (kind or c_dl- exercise id)', async () => {
    const r = fs.readFileSync(path.join(ROOT, 'firestore.rules'), 'utf8'); assert.ok(r.includes("request.resource.data.get('kind', '') != 'dictation'")); assert.ok(r.includes("matches('^c_dl-.*')"));
  });
  t('the published bundle (dictation/) is byte-identical to the R3 source package and has no lesson data', async () => {
    const src = path.join(ROOT, 'dictation-lab', 'pkg'); for (const [a, b] of [['hybrid-engine/src', 'engine'], ['js-validator/src', 'validator']])
      for (const f of fs.readdirSync(path.join(src, a))) { if (f === 'cli.js') continue; assert.strictEqual(fs.readFileSync(path.join(ROOT, 'dictation', b, f), 'utf8'), fs.readFileSync(path.join(src, a, f), 'utf8'), b + '/' + f + ' drifted from the package'); }
    for (const f of ['ui.js', 'bridge.js', 'transcript.js', 'script.js']) assert.ok(!/cleanText":|"spans":/.test(fs.readFileSync(path.join(ROOT, 'dictation', f), 'utf8')), f);
  });
  for (const [name, fn] of T) { try { await fn(); pass++; console.log('PASS ' + name); } catch (e) { fail++; console.log('FAIL ' + name + ' -> ' + (e && e.message)); } }
  console.log('---- ' + pass + '/' + (pass + fail) + ' passed'); process.exit(fail ? 1 : 0);
})();
