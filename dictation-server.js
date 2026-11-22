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
//   dlRaw/{slug}_{asg}_{ex}    P-05 (owner: 90 days): the FINAL submitted answers as text {email, cls, asg, ex, ver, answers, submittedAt, expMs,
//                              expiresAt}. Written only when env DL_RAW_RETENTION = 'on'; read only by dlRaw() for an authorized teacher;
//                              expired rows are never returned and are deleted by dlReap() (fail closed: off = nothing raw is kept).
// (11/2026, owner) Students no longer do the 4 levels: they write the WHOLE script; compareScript() marks it word by word on the server,
// the AI (when available) only explains the mistakes found and picks new vocabulary; mistakes go to the Error Notebook.
//   dlVersions also hold {script, kind:'script'} (new lessons); older JSON lessons are read as the text of their sentences (scriptOf).
// D = helpers from [[path]].js: {fsGet, fsPut, fsCreate, fsUpdate, fsDelete, fsList, fsQueryDocs, idUser, staffEmail, rosterRow, normEmail, slug, json, fail, adminEmail}
import { validateDictationJson, validateDictationDocument, sha256Utf8 } from './dictation/validator/index.js';
import SCHEMA from './dictation/validator/schema.js';
import { compareScript, MAX_SCRIPT_CHARS, MAX_TEXT_CHARS } from './dictation/script.js';

export const DL_MAX_JSON = 900000; // O-4: Firestore string field, well under the 1 MiB document limit
const PASS_DAYS = { day: 1, week: 7 };
const ID = /^[A-Za-z0-9_-]{1,80}$/;
const BOOK = /^cam\d{1,2}$/, TEST = /^t[1-4]$/;
const clean = (s, n) => String(s ?? '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n);
const vid = (lid, n) => lid + '_' + n;
export const DL_RAW_DAYS = 90; const DAY = 864e5; const RAW_MS = DL_RAW_DAYS * DAY;
export const rawOn = (env) => String((env && env.DL_RAW_RETENTION) || '').toLowerCase() === 'on';
// same as tNorm in index.html: the roster "Giáo viên" column vs the teacher's account name
export const tNorm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[đĐ]/g, 'd').toLowerCase().replace(/^\s*(co|thay|ms|mrs|mr|miss|teacher)\.?\s+/, '').replace(/\s+/g, ' ').trim();
// display text of one submitted response (Level 1 tiles -> their words); it = the server's student payload item
function answerText(it, r) {
  if (!r || typeof r !== 'object') return '';
  if (Array.isArray(r.placedIds)) { const m = new Map(((it && it.tiles) || []).map((t) => [t.id, t.text])); return r.placedIds.map((x) => m.get(x) ?? '?').join(' '); }
  if (Array.isArray(r.answers)) return r.answers.map((x) => String(x)).join(' · ');
  return String(r.answer ?? r.text ?? r.chosen ?? '');
}
function keyText(rv) {
  if (!rv || typeof rv !== 'object') return '';
  if (Array.isArray(rv.blanks)) return rv.blanks.join(' · ') + (rv.text ? '  (' + rv.text + ')' : '');
  if (Array.isArray(rv.answers)) return rv.answers.join(' / ');
  if (Array.isArray(rv.transcript)) return rv.transcript.map((x) => x.text).join(' ');
  return String(rv.text || '');
}

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
  if (typeof body.script === 'string') return saveScript(D, env, body, by);
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

// a "write the script" version: the teacher's text as typed (labels kept for reading), checked = they checked it against the audio
async function saveScript(D, env, body, by) {
  const script = String(body.script).replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim();
  if (script.length > MAX_SCRIPT_CHARS) return D.fail('The script is too long (20,000 characters at most).');
  if (compareScript(script, '').words.script < 5) return D.fail('Paste the script of the recording first (5 words at least).');
  let lid = String(body.lid || ''); const now = Date.now(); let L = null;
  if (lid) { if (!ID.test(lid)) return D.fail('Bad lesson id.'); L = await D.fsGet(env, 'dlLessons', lid); if (!L) return D.fail('Not found.', 404); }
  else lid = 'l' + now.toString(36) + Math.floor(Math.random() * 1e6).toString(36);
  const n = (L ? Number(L.data.cur) || 0 : 0) + 1; const audited = body.checked === true; const gate = audited ? 'SCRIPT_CHECKED' : 'SCRIPT_UNCHECKED';
  const audio = /^\/api\/audio\/[A-Za-z0-9_-]{22}$/.test(String(body.audio || '')) ? String(body.audio) : '';
  const title = clean(body.title, 200) || 'Untitled dictation';
  if (!(await D.fsCreate(env, 'dlVersions', vid(lid, n), { lid, n, kind: 'script', script, sha: sha256Utf8(script), gate, audited, audio, title, by, ts: now }))) return D.json({ error: 'Someone saved this lesson at the same time. Reload and try again.', code: 'busy' }, 409);
  const upd = { title, cur: n, gate, by, ts: now }; if (!L) Object.assign(upd, { approved: 0, approvedMode: '', published: 0, exId: '' });
  if (L) { if (!(await D.fsUpdate(env, 'dlLessons', lid, upd, L.updateTime))) return D.json({ error: 'Someone saved this lesson at the same time. Reload and try again.', code: 'busy' }, 409); }
  else await D.fsPut(env, 'dlLessons', lid, upd);
  await audit(D, env, lid, 'save', by, { n, gate });
  return D.json({ ok: true, lid, n, gate, audited, warnings: 0 });
}

/* ---------- admin: approve / publish / unpublish (POST /api/admin/dictation {op}) — called after adminKeyOk ---------- */
export async function dlAdmin(D, env, body) {
  if (body.op === 'retention') return D.json({ ok: true, on: rawOn(env), days: DL_RAW_DAYS, last: env && env.MD_KV ? await env.MD_KV.get('dlreap:last', 'json').catch(() => null) : null });
  if (body.op === 'reap') { // manual cleanup for missed runs: bounded, idempotent (deleting an expired row twice is a no-op)
    const tot = { ts: Date.now(), raw: 0, sits: 0, more: false };
    try { for (let i = 0; i < 5; i++) { const o = await dlReap(D, env, 300); tot.raw += o.raw; tot.sits += o.sits; tot.more = o.more; if (!o.more) break; } } catch (e) { tot.err = String((e && e.message) || e).slice(0, 120); }
    if (env && env.MD_KV) await env.MD_KV.put('dlreap:last', JSON.stringify(tot)).catch(() => {});
    return D.json(Object.assign({ ok: !tot.err }, tot), tot.err ? 500 : 200);
  }
  const by = D.adminEmail(env); const lid = String(body.lid || ''); if (!ID.test(lid)) return D.fail('Bad lesson id.');
  const L = await D.fsGet(env, 'dlLessons', lid); if (!L) return D.fail('Not found.', 404); const now = Date.now();
  if (body.op === 'approve') {
    const n = Number(body.n); if (n !== Number(L.data.cur)) return D.fail('Only the newest version can be approved. Reload the lesson.', 409);
    const mode = body.mode === 'homework' ? 'homework' : 'practice'; const v = await loadVersion(D, env, lid, n); if (!v) return D.fail('Not found.', 404);
    if (mode === 'homework' && !v.audited) return D.json({ error: 'This script was not checked against the audio, so it can only be approved for practice. Tick “I checked the script against the audio” and save again.', code: 'not_audited' }, 409);
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

/* ---------- signed-in users: "write the script" (practice check, homework payload / submit) ---------- */
async function published(D, env, exId) {
  if (!/^dl-[A-Za-z0-9_-]{1,80}$/.test(String(exId || ''))) return null;
  const ex = await D.fsGet(env, 'exercises', exId); if (!ex || ex.data.kind !== 'dictation') return null;
  const ver = await loadVersion(D, env, ex.data.dlId, Number(ex.data.dlVer)); if (!ver) return null;
  return { ex: ex.data, ver };
}
// the script of a version: the teacher's text (new lessons) or, for an older JSON lesson, its sentences in order
export function scriptOf(ver) {
  if (ver && typeof ver.script === 'string') return ver.script;
  try { const doc = JSON.parse(ver.json); const off = new Set(ver.deselected || []); return ((doc.transcript && doc.transcript.sentences) || []).filter((x) => x.enabled !== false && !off.has(x.id)).map((x) => x.cleanText).join(' '); } catch (e) { return ''; }
}
function sentenceOf(text, w) { const i = text.toLowerCase().indexOf(w.toLowerCase()); if (i < 0) return ''; let a = i, b = i + w.length; while (a > 0 && !/[.!?\n]/.test(text[a - 1])) a--; while (b < text.length && !/[.!?\n]/.test(text[b])) b++; return text.slice(a, Math.min(text.length, b + 1)).replace(/^[A-Za-z][A-Za-z .'-]{0,30}:\s*/, '').trim().slice(0, 240); }
const resultOf = (cmp, ai, script, extra) => Object.assign({ mode: 'script', text: cmp.text, script, pct: cmp.pct, passed: cmp.passed, num: cmp.num, den: cmp.den, words: cmp.words, tooDifferent: cmp.tooDifferent, empty: cmp.empty, ai }, extra || {});

// AI: explains the mistakes compareScript found (never finds or invents mistakes itself) and picks new words FROM THE SCRIPT.
// No AI / busy / daily limit (KV aidq:<email>:<day>, 30) -> the rule-based explanations, no vocabulary; the mark never depends on it.
export const DL_AI_DAY = 30;
const DL_PROMPT = 'You are an IELTS listening tutor for Vietnamese students aged 13-16. A student listened to a recording and wrote it down. ' +
  'The mistakes below were found by comparing the student\'s text with the transcript word by word; "wrote" is what the student wrote and "correct" is what the recording says. ' +
  'For EVERY mistake id return: category = a short error-notebook label (for example Spelling, Missing word, Extra word, -s / -es ending, -ed ending, Article, Preposition, Word form, Numbers, Wrong word, Homophone); ' +
  'explanation = one short sentence in simple English telling WHY it is wrong or how to hear it; ' +
  'explanation_vi = the same idea in Vietnamese, ONE sentence of at most about 20 words, plain words, name the exact word in quotes. ' +
  'Do not change "wrote" or "correct". Then choose 4 to 6 useful words or phrases for IELTS from the TRANSCRIPT (copy them exactly as they appear), ' +
  'each with meaning_vi (a short Vietnamese meaning) and example = the sentence of the transcript that contains it. Return JSON only.';
const DL_SCHEMA = { type: 'OBJECT', properties: {
  items: { type: 'ARRAY', items: { type: 'OBJECT', properties: { id: { type: 'INTEGER' }, category: { type: 'STRING' }, explanation: { type: 'STRING' }, explanation_vi: { type: 'STRING' } }, required: ['id', 'category', 'explanation', 'explanation_vi'] } },
  vocabulary: { type: 'ARRAY', items: { type: 'OBJECT', properties: { word: { type: 'STRING' }, meaning_vi: { type: 'STRING' }, example: { type: 'STRING' } }, required: ['word', 'meaning_vi'] } } },
  required: ['items', 'vocabulary'] };
async function explain(D, env, who, script, cmp, tzo) {
  const base = { corrections: cmp.corrections.slice(0, 60), vocabulary_upgrades: [], model: '', ts: Date.now() };
  if (cmp.empty || !D.askGemini || !D.aiReady || !D.aiReady(env) || !env || !env.MD_KV) return base;
  const k = 'aidq:' + who.em + ':' + D.dayOf(tzo).day; const used = Number(await env.MD_KV.get(k).catch(() => 0)) || 0;
  if (used >= DL_AI_DAY) return Object.assign(base, { aiNote: 'limit' });
  await env.MD_KV.put(k, String(used + 1), { expirationTtl: 172800 }).catch(() => {});
  const list = base.corrections.slice(0, 40).map((c, i) => ({ id: i, wrote: c.original_text, correct: c.corrected_text, sentence: c.context }));
  let g; try { g = await D.askGemini(env, DL_PROMPT + '\n\nTRANSCRIPT:\n' + script.slice(0, 12000) + '\n\nMISTAKES (JSON):\n' + JSON.stringify(list), DL_SCHEMA, '', 30000); }
  catch (e) { return Object.assign(base, { aiNote: 'busy' }); }
  const o = (g && g.out) || {}; const low = script.toLowerCase();
  (Array.isArray(o.items) ? o.items : []).forEach((x) => { const id = Number(x && x.id); if (!(id >= 0 && id < list.length)) return; const c = base.corrections[id];
    const cat = clean(x.category, 40); if (cat) c.category = cat; const en = clean(x.explanation, 240); if (en) c.explanation = en; const vi = clean(x.explanation_vi, 200); if (vi) c.explanation_vi = vi; });
  const seen = new Set();
  base.vocabulary_upgrades = (Array.isArray(o.vocabulary) ? o.vocabulary : []).map((v) => { const w = clean(v && v.word, 60); if (!w || seen.has(w.toLowerCase()) || low.indexOf(w.toLowerCase()) < 0) return null; seen.add(w.toLowerCase());
    const ex = clean(v.example, 240); const mv = clean(v.meaning_vi, 120); return { original: '', upgraded: w, example: ex && low.indexOf(ex.toLowerCase()) >= 0 ? ex : sentenceOf(script, w), note: mv, vi: mv }; }).filter(Boolean).slice(0, 8);
  base.model = (g && g.model) || ''; return base;
}
// the most important mistakes (first 15) become Error Notebook cards, like Writing (errors/<slug>_<attemptId>_<i>; a repeat run adds nothing)
async function toNotebook(D, env, att, attemptId, ai, exTitle, tzo) {
  if (!D.saveErrors || !ai.corrections.length) return 0;
  try { return await D.saveErrors(env, att, attemptId, { corrections: ai.corrections.slice(0, 15).map((c) => Object.assign({ practice: [] }, c)) }, { exTitle: String(exTitle || ''), dayStart: D.dayOf(tzo).dayStart }); } catch (e) { return 0; }
}

// POST /api/dictation/practice {exId}: what the screen needs BEFORE writing (title, audio, number of words). Never the script.
// A homework lesson opens for practice only after the student's accepted submission; staff always (preview); assistants never.
async function practiceGate(D, env, request, body) {
  const who = await D.idUser(env, request); if (!who) return { err: D.json({ error: 'Your sign-in has expired. Sign in again.', code: 'auth' }, 401) };
  if (who.role !== 'student' && who.role !== 'teacher') return { err: D.fail('Not available for this account.', 403) };
  const P = await published(D, env, body.exId); if (!P) return { err: D.fail('This dictation is not available.', 404) };
  if (who.role === 'student' && P.ex.dlMode !== 'practice') {
    const subs = await D.fsQueryDocs(env, 'dlSubs', 'email', who.em);
    if (!subs.some((x) => x.ex === body.exId)) return { err: D.json({ error: 'This dictation is homework. Practice opens after you submit it.', code: 'homework_only' }, 403) };
  }
  return { who, P };
}
export async function dlPractice(D, env, request, body) {
  const G = await practiceGate(D, env, request, body); if (G.err) return G.err; const P = G.P;
  return D.json({ ok: true, mode: 'script', title: P.ver.title || P.ex.title || '', audio: P.ver.audio || P.ex.audio || '', words: compareScript(scriptOf(P.ver), '').words.script, label: P.ver.audited ? 'teacher_audited' : 'unverified_transcript' });
}
// POST /api/dictation/check {exId, text, tzo}: practice (and teacher preview) marking. Nothing is kept except the student's FIRST practice
// mistakes in the Error Notebook (KV dlpe:<email>:<lid>), so retrying does not fill the notebook.
export async function dlCheck(D, env, request, body) {
  const G = await practiceGate(D, env, request, body); if (G.err) return G.err; const { who, P } = G;
  const text = String(body.text ?? '').slice(0, MAX_TEXT_CHARS); if (!text.trim()) return D.fail('Write what you hear first.');
  const script = scriptOf(P.ver); const cmp = compareScript(script, text); const ai = await explain(D, env, who, script, cmp, body.tzo);
  let added = 0;
  if (who.role === 'student' && env && env.MD_KV) { const mk = 'dlpe:' + who.em + ':' + P.ex.dlId;
    if (!(await env.MD_KV.get(mk).catch(() => '1'))) { const r = await D.rosterRow(env, who.em); added = await toNotebook(D, env, { email: who.em, student: r ? r.data.name : '', cls: r ? r.data.cls : '', ex: 'c_' + body.exId }, 'dlp-' + P.ex.dlId, ai, P.ex.title, body.tzo); await env.MD_KV.put(mk, '1').catch(() => {}); } }
  return D.json({ ok: true, result: resultOf(cmp, ai, script, { added, practice: true }) });
}

// The homework sitting of one student: assignment occurrence (class, sent, deadline + late pass), pinned version.
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
  return { who, r, a, ex: ex.data, exId, asgId, key, open, sit, ver, cv: lid + '@' + n, lid, n, now };
}

// POST /api/dictation/payload | submit {exId, asgId, text?, tzo}. Before: title, audio, word count (never the script).
// Submit: one official mark (the first accepted submission; a repeat returns it), then the AI explanations and the Error Notebook.
// After: the mark and the script; the student's own text only while it is kept (dlRaw, 90 days) — the device keeps its own copy too.
export async function dlHomework(D, env, request, body, route) {
  const S = await sitting(D, env, request, body); if (S.err) return S.err;
  const script = scriptOf(S.ver);
  const done = async (status, rec) => {
    let full = null; const raw = rawOn(env) ? await D.fsGet(env, 'dlRaw', S.key) : null;
    if (raw && Number(raw.data.expMs) > Date.now() && typeof raw.data.text === 'string') { const cmp = compareScript(script, raw.data.text); let ai = null; try { ai = JSON.parse(raw.data.ai || 'null'); } catch (e) { ai = null; } full = resultOf(cmp, ai || { corrections: cmp.corrections, vocabulary_upgrades: [] }, script); }
    return D.json({ status, submitted: true, submissionId: S.key, summary: rec, script, result: full });
  };
  const sub = await D.fsGet(env, 'dlSubs', S.key);
  if (sub) return done(route === 'submit' ? 'duplicate' : 'ok', JSON.parse(sub.data.record || '{}'));
  if (route === 'payload') return D.json({ status: 'ok', mode: 'script', open: S.open, title: S.ver.title || S.ex.title || '', audio: S.ver.audio || S.ex.audio || '', words: compareScript(script, '').words.script });
  if (route !== 'submit') return D.fail('Not found.', 404);
  if (!S.open) return D.json({ status: 'rejected', reason: 'closed', error: 'The deadline has passed.' }, 409);
  const cmp = compareScript(script, String(body.text ?? '').slice(0, MAX_TEXT_CHARS));
  const rec = { mode: 'script', pct: cmp.pct, passed: cmp.passed, num: cmp.num, den: cmp.den, words: cmp.words, empty: cmp.empty };
  if (!(await D.fsCreate(env, 'dlSubs', S.key, { email: S.who.em, asg: S.asgId, ex: S.exId, ver: S.n, mode: 'script', record: JSON.stringify(rec), ts: S.now }))) {
    const again = await D.fsGet(env, 'dlSubs', S.key); return done('duplicate', again ? JSON.parse(again.data.record || '{}') : rec);
  }
  if (S.sit.data.lock) await D.fsUpdate(env, 'dlSits', S.key, { lock: '', rawExp: 0 }).catch(() => {}); // older sittings only
  const big = cmp.den > 1000; const score = big ? Math.floor((cmp.num * 1000) / cmp.den) : cmp.num, total = big ? 1000 : cmp.den;
  await D.fsPut(env, 'attempts', S.key, { email: S.who.em, student: String(S.r.data.name || ''), cls: String(S.r.data.cls || ''), ex: 'c_' + S.exId, kind: 'dictation', asg: S.asgId, sts: S.now, ts: S.now,
    score, total, answered: cmp.empty ? 0 : 1, required: 1, items: [{ i: 0, ok: cmp.pct === 100 }], dl: { ver: S.cv, mode: 'script', pct: cmp.pct, passed: cmp.passed, completed: !cmp.empty, official: true } });
  const ai = await explain(D, env, S.who, script, cmp, body.tzo); // after the mark is stored: a slow or failed AI never loses the submission
  // P-05: the final text only (no drafts), 90 days from this server-accepted submission; fsCreate = a retry never resets the clock
  if (rawOn(env)) await D.fsCreate(env, 'dlRaw', S.key, { email: S.who.em, cls: String(S.r.data.cls || ''), asg: S.asgId, ex: S.exId, ver: S.cv, text: cmp.text, answers: { script: cmp.text },
    ai: JSON.stringify({ corrections: ai.corrections, vocabulary_upgrades: ai.vocabulary_upgrades, model: ai.model }), submittedAt: S.now, expMs: S.now + RAW_MS, expiresAt: new Date(S.now + RAW_MS) }).catch(() => {});
  const added = await toNotebook(D, env, { email: S.who.em, student: String(S.r.data.name || ''), cls: String(S.r.data.cls || ''), ex: 'c_' + S.exId }, S.key, ai, S.ex.title, body.tzo);
  return D.json({ status: 'accepted', submissionId: S.key, result: resultOf(cmp, ai, script, { added }) });
}

/* ---------- P-05: teacher-only raw answers (POST /api/dictation/raw {op:'list', exId}) ----------
   Checked on EVERY request, from server records only (never from ids the client sends): a teacher / admin staff key, the student's
   CURRENT roster row (kicked = gone), still in the class the submission was for and not removed from it, the assignment still for that
   class and still containing this exercise, and the roster "Giáo viên" of that student = this teacher's name. Admin (the owner's
   diagnostic role) sees every class: the one documented exception. Homework Assistants and students never get here (staff key). */
export async function dlRaw(D, env, request, body) {
  const by = await D.staffEmail(env, request); if (!by) return D.json({ error: 'Your session ended. Enter your password to continue.', needUnlock: true }, 401);
  if (body.op !== 'list') return D.fail('Unknown action.');
  const exId = String(body.exId || ''); if (!/^dl-[A-Za-z0-9_-]{1,80}$/.test(exId)) return D.fail('Bad request.');
  const adm = by === D.adminEmail(env); const me = adm ? '' : tNorm(await D.teacherName(env, by)); const now = Date.now();
  const subs = (await D.fsQueryDocs(env, 'dlSubs', 'ex', exId)).slice(0, 300); const C = {}; const memo = (k, f) => (k in C ? C[k] : (C[k] = f()));
  const rows = []; let hidden = 0;
  for (const s of subs) {
    const r = await memo('r:' + s.email, () => D.rosterRow(env, s.email)); const a = await memo('a:' + s.asg, () => D.fsGet(env, 'assignments', s.asg));
    const cls = r ? String(r.data.cls || '') : ''; const cd = cls ? await memo('c:' + cls, () => D.fsGet(env, 'classes', D.slug(cls))) : null;
    const removed = ((cd && cd.data && cd.data.removed) || []).some((e) => D.normEmail(e) === D.normEmail(s.email));
    const ok = !!r && r.data.role !== 'teacher' && !!a && String(a.data.cls || '') === cls && Array.isArray(a.data.ex) && a.data.ex.indexOf('c_' + exId) >= 0 && !removed && (adm || (!!me && tNorm(r.data.teacher) === me));
    if (!ok) { hidden++; continue; }
    const raw = await D.fsGet(env, 'dlRaw', s.id); const rec = JSON.parse(s.record || '{}'); const res = JSON.parse(s.result || '{}');
    const live = !!(raw && Number(raw.data.expMs) > now && String(raw.data.email) === String(s.email));
    if (raw && !live) await D.fsDelete(env, 'dlRaw', s.id).catch(() => {}); // expired: never shown, deleted now
    if (rec.mode === 'script') { const ver = await memo('v:' + s.ex + s.ver, async () => { const e = await D.fsGet(env, 'exercises', s.ex); return e ? loadVersion(D, env, e.data.dlId, Number(s.ver)) : null; });
      rows.push({ name: String(r.data.name || ''), cls, asg: s.asg, submittedAt: Number(s.ts) || 0, raw: live ? 'kept' : (Number(s.ts) + RAW_MS <= now ? 'expired' : 'not_kept'), expiresAt: live ? Number(raw.data.expMs) : 0,
        score: { num: Number(rec.num) || 0, den: Number(rec.den) || 1 }, passed: !!rec.passed, items: [Object.assign({ id: 'script', level: 'script', state: rec.empty ? 'unattempted' : 'attempted', first: { num: Number(rec.num) || 0, den: Number(rec.den) || 1, exact: rec.pct === 100 }, key: ver ? scriptOf(ver) : '' }, live ? { answer: String(raw.data.text ?? (raw.data.answers || {}).script ?? '') } : {})] });
      continue; }
    const items = Object.keys(rec.items || {}).map((id) => { const x = rec.items[id]; const o = { id, level: x.level, state: x.state, first: x.first || null, key: keyText(res.review && res.review[id]) }; if (live) o.answer = String((raw.data.answers || {})[id] ?? ''); return o; });
    rows.push({ name: String(r.data.name || ''), cls, asg: s.asg, submittedAt: Number(s.ts) || 0, raw: live ? 'kept' : (Number(s.ts) + RAW_MS <= now ? 'expired' : 'not_kept'), expiresAt: live ? Number(raw.data.expMs) : 0,
      score: (rec.aggregate && rec.aggregate.overall && rec.aggregate.overall.itemWeightedAssignmentScore) || null, passed: !!(rec.aggregate && rec.aggregate.result && rec.aggregate.result.passed), items });
  }
  return D.json({ ok: true, days: DL_RAW_DAYS, on: rawOn(env), rows, hidden });
}

/* ---------- P-05 automatic deletion ----------
   Pages Functions have no cron, so the cleanup runs (1) from GET /api/status, which every signed-in app calls every 10 minutes, at
   most once an hour (KV dlreap:last), in bounded batches; (2) on demand: POST /api/admin/dictation {op:'reap'}. Reads never return an
   expired row even when deletion is late. If Firestore TTL is switched on for dlRaw.expiresAt it is a second, independent layer. */
export async function dlReap(D, env, max = 200) {
  const now = Date.now(); const out = { ts: now, raw: 0, sits: 0, more: false };
  const raw = await D.fsQueryRange(env, 'dlRaw', 'expMs', 0, now, max);
  for (const d of raw) { await D.fsDelete(env, 'dlRaw', d.id); out.raw++; }
  const sits = await D.fsQueryRange(env, 'dlSits', 'rawExp', 0, now, max);
  for (const d of sits) { await D.fsUpdate(env, 'dlSits', d.id, { lock: '', rawExp: 0 }); out.sits++; }
  out.more = raw.length >= max || sits.length >= max; return out;
}
let REAP_AT = 0;
export async function dlReapMaybe(D, env) {
  const now = Date.now(); if (now - REAP_AT < 6e5 || !env || !env.MD_KV) return null; REAP_AT = now;
  const last = await env.MD_KV.get('dlreap:last', 'json').catch(() => null);
  if (last && now - Number(last.ts) < 36e5 && !last.more && !last.err) return null;
  let out; try { out = await dlReap(D, env, 200); } catch (e) { out = { ts: now, err: String((e && e.message) || e).slice(0, 120) }; } // message only, never data
  await env.MD_KV.put('dlreap:last', JSON.stringify(out)).catch(() => {}); return out;
}
export const _resetReapClock = () => { REAP_AT = 0; };
