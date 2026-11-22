// Dictation Lab — server side (imported by functions/api/[[path]].js; NOT published by build.js: it is not on its file list).
// Contract v1.1 (owner policy): practice may score on the device; HOMEWORK is scored here, from an immutable, approved, audited,
// published lesson version, and the device never receives the lesson or answers before an accepted submission.
// Firestore (service account only, no client rules => clients cannot read or write these):
//   dlLessons/{lid}            {title, cur, approved, approvedMode, published, exId, gate, by, ts}
//   dlVersions/{lid}_{n}       immutable lesson JSON {lid, n, json, sha, gate, audited, deselected[], audio, title, by, ts, approvedMode?, approvedBy?, approvedTs?}
//   dlSits/{slug}_{asg}_{ex}   one homework sitting: pinned version + phase-1 answers {email, asg, ex, ver, lock?, ts}
//   dlSubs/{slug}_{asg}_{ex}   the accepted submission (idempotency anchor) {email, asg, ex, ver, record, result, ts}
//   exercises/dl-{lid}         public, answer-free entry for the Library and assignments {kind:'dictation', dlId, dlVer, dlMode, ...}
//   attempts/{slug}_{asg}_{ex} the official homework attempt (server-written; md-hw.js counts it like any attempt)
//   audit/dl_{lid}_{ts}        save / approve / publish / unpublish trail
// D = helpers from [[path]].js: {fsGet, fsPut, fsCreate, fsUpdate, fsDelete, fsList, fsQueryDocs, idUser, staffEmail, rosterRow, normEmail, slug, json, fail, adminEmail}
import * as DL from './dictation/engine/index.js';
import { validateDictationJson, validateDictationDocument, sha256Utf8 } from './dictation/validator/index.js';
import SCHEMA from './dictation/validator/schema.js';

export const DL_MAX_JSON = 900000; // O-4: Firestore string field, well under the 1 MiB document limit
const PASS_DAYS = { day: 1, week: 7 };
const ID = /^[A-Za-z0-9_-]{1,80}$/;
const BOOK = /^cam\d{1,2}$/, TEST = /^t[1-4]$/;
const clean = (s, n) => String(s ?? '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n);
const vid = (lid, n) => lid + '_' + n;

async function loadVersion(D, env, lid, n) { const v = await D.fsGet(env, 'dlVersions', vid(lid, n)); return v ? v.data : null; }
function docOf(ver) { const doc = JSON.parse(ver.json); return { doc, validation: validateDictationDocument(doc, { schema: SCHEMA }) }; }
async function audit(D, env, lid, op, by, extra) { const ts = Date.now(); await D.fsPut(env, 'audit', 'dl_' + lid + '_' + ts, Object.assign({ kind: 'dictation', lid, op, by, ts }, extra || {})).catch(() => {}); }

/* ---------- staff: save a new version, list, get (POST /api/dictation/staff {op}) ---------- */
export async function dlStaff(D, env, request, body) {
  const by = await D.staffEmail(env, request); if (!by) return D.json({ error: 'Your session ended. Enter your password to continue.', needUnlock: true }, 401);
  const op = body.op;
  if (op === 'list') { const rows = await D.fsList(env, 'dlLessons'); return D.json({ lessons: rows.map((r) => ({ lid: r.id, title: r.title, cur: r.cur, approved: r.approved || 0, approvedMode: r.approvedMode || '', published: r.published || 0, exId: r.exId || '', gate: r.gate || '', ts: r.ts })) }); }
  if (op === 'get') { const lid = String(body.lid || ''); if (!ID.test(lid)) return D.fail('Bad lesson id.'); const L = await D.fsGet(env, 'dlLessons', lid); if (!L) return D.fail('Not found.', 404); const n = Number(body.n) || L.data.cur; const v = await loadVersion(D, env, lid, n); if (!v) return D.fail('Not found.', 404); return D.json({ lesson: Object.assign({ lid }, L.data), version: v }); }
  if (op !== 'save') return D.fail('Unknown action.');
  const json = String(body.json || ''); if (!json || json.length > DL_MAX_JSON) return D.fail('The lesson file is empty or larger than 900 KB.');
  const val = validateDictationJson(json, { schema: SCHEMA });
  if (!val.valid) return D.json({ error: 'The lesson does not pass the validator.', code: 'invalid', gate: val.semantic?.gate ?? null, schemaErrors: (val.schemaErrors || []).slice(0, 30), errors: (val.semantic?.errors || []).slice(0, 30) }, 400);
  let lid = String(body.lid || ''); const now = Date.now(); let L = null;
  if (lid) { if (!ID.test(lid)) return D.fail('Bad lesson id.'); L = await D.fsGet(env, 'dlLessons', lid); if (!L) return D.fail('Not found.', 404); }
  else lid = 'l' + now.toString(36) + Math.floor(Math.random() * 1e6).toString(36);
  const n = (L ? Number(L.data.cur) || 0 : 0) + 1; const gate = val.semantic.gate; const audited = gate === 'GATE_PASS' || gate === 'GATE_PASS_WITH_EXCLUSIONS';
  const deselected = (Array.isArray(body.deselected) ? body.deselected : []).map(String).filter((x) => /^[A-Za-z0-9_-]{1,40}$/.test(x)).slice(0, 2000);
  const audio = /^\/api\/audio\/[A-Za-z0-9_-]{22}$/.test(String(body.audio || '')) ? String(body.audio) : '';
  const title = clean(body.title || JSON.parse(json).metadata?.title, 200) || 'Untitled dictation';
  if (!(await D.fsCreate(env, 'dlVersions', vid(lid, n), { lid, n, json, sha: sha256Utf8(json), gate, audited, deselected, audio, title, by, ts: now }))) return D.json({ error: 'Someone saved this lesson at the same time. Reload and try again.', code: 'busy' }, 409);
  const upd = { title, cur: n, gate, by, ts: now }; if (!L) Object.assign(upd, { approved: 0, approvedMode: '', published: 0, exId: '' });
  if (L) { if (!(await D.fsUpdate(env, 'dlLessons', lid, upd, L.updateTime))) return D.json({ error: 'Someone saved this lesson at the same time. Reload and try again.', code: 'busy' }, 409); }
  else await D.fsPut(env, 'dlLessons', lid, upd);
  await audit(D, env, lid, 'save', by, { n, gate });
  return D.json({ ok: true, lid, n, gate, audited, warnings: (val.semantic.warnings || []).length });
}

/* ---------- admin: approve / publish / unpublish (POST /api/admin/dictation {op}) — called after adminKeyOk ---------- */
export async function dlAdmin(D, env, body) {
  const by = D.adminEmail(env); const lid = String(body.lid || ''); if (!ID.test(lid)) return D.fail('Bad lesson id.');
  const L = await D.fsGet(env, 'dlLessons', lid); if (!L) return D.fail('Not found.', 404); const now = Date.now();
  if (body.op === 'approve') {
    const n = Number(body.n); if (n !== Number(L.data.cur)) return D.fail('Only the newest version can be approved. Reload the lesson.', 409);
    const mode = body.mode === 'homework' ? 'homework' : 'practice'; const v = await loadVersion(D, env, lid, n); if (!v) return D.fail('Not found.', 404);
    if (mode === 'homework' && !v.audited) return D.json({ error: 'This transcript is not teacher-audited, so it can only be approved for Free Practice.', code: 'not_audited' }, 409);
    await D.fsUpdate(env, 'dlVersions', vid(lid, n), { approvedMode: mode, approvedBy: by, approvedTs: now });
    await D.fsUpdate(env, 'dlLessons', lid, { approved: n, approvedMode: mode, ts: now }); await audit(D, env, lid, 'approve', by, { n, mode });
    return D.json({ ok: true, approved: n, mode });
  }
  if (body.op === 'publish') {
    const n = Number(L.data.approved) || 0; if (!n) return D.fail('Approve a version first.', 409);
    const bookId = String(body.bookId || ''), testId = String(body.testId || ''), part = Math.max(0, Math.min(9, Number(body.part) || 0));
    const xtra = bookId === 'xtra' && /^k_[a-z0-9-]{1,40}$/.test(testId); const cat = xtra ? clean(body.cat, 40) : '';
    if (!xtra && (!BOOK.test(bookId) || !TEST.test(testId))) return D.fail('Choose a book and a test.');
    if (xtra && !cat) return D.fail('Choose a category.');
    const v = await loadVersion(D, env, lid, n); const exId = 'dl-' + lid;
    await D.fsPut(env, 'exercises', exId, { title: v.title, skill: 'listening', kind: 'dictation', dlId: lid, dlVer: n, dlMode: L.data.approvedMode || 'practice', dlLabel: v.audited ? 'teacher_audited' : 'unverified_transcript', audio: v.audio || '', bookId, testId, part, ...(xtra ? { cat } : {}), hint: '', ts: now });
    await D.fsUpdate(env, 'dlLessons', lid, { published: n, exId, ts: now }); await audit(D, env, lid, 'publish', by, { n, bookId, testId, part });
    return D.json({ ok: true, exId, published: n });
  }
  if (body.op === 'unpublish') {
    if (L.data.exId) await D.fsDelete(env, 'exercises', L.data.exId);
    await D.fsUpdate(env, 'dlLessons', lid, { published: 0, ts: now }); await audit(D, env, lid, 'unpublish', by, {});
    return D.json({ ok: true });
  }
  return D.fail('Unknown action.');
}

/* ---------- signed-in users: practice lesson, homework payload / lock / submit ---------- */
async function published(D, env, exId) {
  if (!/^dl-[A-Za-z0-9_-]{1,80}$/.test(String(exId || ''))) return null;
  const ex = await D.fsGet(env, 'exercises', exId); if (!ex || ex.data.kind !== 'dictation') return null;
  const ver = await loadVersion(D, env, ex.data.dlId, Number(ex.data.dlVer)); if (!ver) return null;
  return { ex: ex.data, ver };
}
const seedOf = (email, lid) => DL.hashSeed(String(email) + '|' + lid);

// POST /api/dictation/practice {exId}: the practice lesson WITH its answer key (disclosed trade-off). Homework-only lessons are given
// to a student only after an accepted submission for that exercise; staff always (preview).
export async function dlPractice(D, env, request, body) {
  const who = await D.idUser(env, request); if (!who) return D.json({ error: 'Your sign-in has expired. Sign in again.', code: 'auth' }, 401);
  if (who.role !== 'student' && who.role !== 'teacher') return D.fail('Not available for this account.', 403);
  const P = await published(D, env, body.exId); if (!P) return D.fail('This dictation is not available.', 404);
  if (who.role === 'student' && P.ex.dlMode !== 'practice') {
    const subs = await D.fsQueryDocs(env, 'dlSubs', 'email', who.em);
    if (!subs.some((s) => s.ex === body.exId)) return D.json({ error: 'This dictation is homework. Practice opens after you submit it.', code: 'homework_only' }, 403);
  }
  return D.json({ ok: true, json: P.ver.json, version: P.ex.dlId + '@' + P.ver.n, deselected: P.ver.deselected || [], audio: P.ver.audio || '', seed: seedOf(who.em, P.ex.dlId), label: P.ver.audited ? 'teacher_audited' : 'unverified_transcript' });
}

// The homework sitting of one student: assignment occurrence (class, sent, deadline + late pass), pinned version, server options.
async function sitting(D, env, request, body) {
  const who = await D.idUser(env, request); if (!who) return { err: D.json({ error: 'Your sign-in has expired. Sign in again.', code: 'auth' }, 401) };
  if (who.role !== 'student') return { err: D.fail('Only students submit homework.', 403) };
  const exId = String(body.exId || ''), asgId = String(body.asgId || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 120);
  if (!/^dl-[A-Za-z0-9_-]{1,80}$/.test(exId) || !asgId) return { err: D.fail('Bad request.') };
  const [a, r, ex] = await Promise.all([D.fsGet(env, 'assignments', asgId), D.rosterRow(env, who.em), D.fsGet(env, 'exercises', exId)]);
  if (!a || !r || String(r.data.cls || '') !== String(a.data.cls || '') || !Array.isArray(a.data.ex) || a.data.ex.indexOf('c_' + exId) < 0) return { err: D.json({ error: 'This homework was not found for your class.', code: 'noasg' }, 404) };
  if (!ex || ex.data.kind !== 'dictation' || ex.data.dlMode !== 'homework') return { err: D.json({ error: 'This dictation is not set up as homework.', code: 'not_homework' }, 409) };
  const key = D.slug(who.em) + '_' + asgId + '_' + exId; const now = Date.now();
  const pass = await D.fsGet(env, 'passes', D.slug(who.em) + '_' + asgId);
  const due = Number(a.data.due) + (pass && PASS_DAYS[pass.data.kind] ? PASS_DAYS[pass.data.kind] * 864e5 : 0);
  const open = Number(a.data.start) <= now && (!(Number(a.data.due) > 0) || now <= due);
  let sit = await D.fsGet(env, 'dlSits', key);
  if (!sit) { // pin the version on the first open (D-21): a later re-publish does not change this sitting
    if (!open) return { err: D.json({ error: Number(a.data.start) > now ? 'This homework has not been sent yet.' : 'The deadline has passed.', code: Number(a.data.start) > now ? 'early' : 'closed' }, 409) };
    await D.fsCreate(env, 'dlSits', key, { email: who.em, asg: asgId, ex: exId, ver: Number(ex.data.dlVer), ts: now }); sit = await D.fsGet(env, 'dlSits', key);
  }
  const n = Number(sit.data.ver); const lid = ex.data.dlId; const ver = await loadVersion(D, env, lid, n);
  if (!ver || ver.approvedMode !== 'homework' || !ver.audited) return { err: D.json({ error: 'This dictation version is not approved for homework.', code: 'not_approved' }, 409) };
  const { doc, validation } = docOf(ver); const cv = lid + '@' + n;
  const SO = { doc, validation, version: cv, seed: seedOf(who.em, lid), deselected: ver.deselected || [], approval: { approved: true, version: cv } };
  return { who, r, a, exId, asgId, key, open, sit, SO, cv, lid, n, now };
}

export async function dlHomework(D, env, request, body, route) {
  const S = await sitting(D, env, request, body); if (S.err) return S.err;
  const sub = await D.fsGet(env, 'dlSubs', S.key);
  if (sub) return D.json({ status: route === 'submit' ? 'duplicate' : 'ok', submitted: true, submissionId: S.key, result: JSON.parse(sub.data.result) });
  const lock = S.sit.data.lock ? JSON.parse(S.sit.data.lock) : null;
  if (route === 'payload') return D.json({ status: 'ok', payload: DL.homeworkPayload(S.SO, { assignmentId: S.asgId, phase: lock ? 2 : 1 }), locked: lock || {}, open: S.open });
  if (!S.open) return D.json({ status: 'rejected', reason: 'closed', error: 'The deadline has passed.' }, 409);
  const all = DL.homeworkPayload(S.SO, { phase: 9 }).items; const lockIds = DL.phaseLockIds(S.SO);
  if (route === 'lock') {
    if (lock) return D.json({ status: 'ok', payload: DL.releasePhase(S.SO, { assignmentId: S.asgId }) }); // the first lock wins
    const req = body.req || {}; if (req.contentVersion !== S.cv) return D.json({ status: 'rejected', reason: 'version_mismatch' }, 409);
    const v = DL.validateSubmission({ schema: DL.SUBMISSION_SCHEMA, idempotencyKey: 'phase', assignmentId: S.asgId, contentVersion: S.cv, responses: req.responses }, { assignmentId: S.asgId, contentVersion: S.cv, items: all.filter((i) => lockIds.includes(i.id)) });
    if (!v.ok) return D.json({ status: 'rejected', reason: v.reason }, 400);
    if (!(await D.fsUpdate(env, 'dlSits', S.key, { lock: JSON.stringify(req.responses || {}), lockTs: S.now }, S.sit.updateTime))) return D.json({ status: 'rejected', reason: 'busy' }, 409);
    return D.json({ status: 'ok', payload: DL.releasePhase(S.SO, { assignmentId: S.asgId }) });
  }
  if (route !== 'submit') return D.fail('Not found.', 404);
  const req = body.req || {}; const v = DL.validateSubmission(req, { assignmentId: S.asgId, contentVersion: S.cv, items: all });
  if (!v.ok) return D.json({ status: 'rejected', reason: v.reason }, 400);
  if (DL.phaseItemIds(S.SO).length > 1 && !lock) return D.json({ status: 'rejected', reason: 'phase_not_locked' }, 409);
  const sc = DL.scoreHomework(req, S.SO, { locked: lock || {} }); const result = { items: sc.items, aggregate: sc.aggregate, unanswered: sc.unanswered, review: sc.review };
  const rec = DL.storageRecord(sc, {}).record; // scores only: raw answers are not stored (retention period not approved, P-05)
  if (!(await D.fsCreate(env, 'dlSubs', S.key, { email: S.who.em, asg: S.asgId, ex: S.exId, ver: S.n, record: JSON.stringify(rec), result: JSON.stringify(result), ts: S.now }))) {
    const again = await D.fsGet(env, 'dlSubs', S.key); return D.json({ status: 'duplicate', submissionId: S.key, result: again ? JSON.parse(again.data.result) : result });
  }
  const f = sc.aggregate.overall.itemWeightedAssignmentScore || { num: 0, den: 1 }; const big = f.den > 1000;
  const score = big ? Math.floor((f.num * 1000) / f.den) : f.num, total = big ? 1000 : f.den;
  const ids = Object.keys(sc.items); const answered = ids.filter((id) => sc.items[id].state === 'attempted').length;
  await D.fsPut(env, 'attempts', S.key, { email: S.who.em, student: String(S.r.data.name || ''), cls: String(S.r.data.cls || ''), ex: 'c_' + S.exId, kind: 'dictation', asg: S.asgId, sts: S.now, ts: S.now,
    score, total, answered, required: sc.aggregate.totalItems, items: ids.map((id, i) => ({ i, ok: !!sc.items[id].first?.exact })),
    dl: { ver: S.cv, passed: !!sc.aggregate.result?.passed, completed: !!sc.aggregate.result?.completed, official: sc.official } });
  return D.json({ status: 'accepted', submissionId: S.key, result });
}
