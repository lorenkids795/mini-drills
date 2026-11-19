// Homework (contract v1.1 C13, owner rules 3 and 7, O-2, O-3, P-05). NOT connected to Firebase or any backend.
//
// DEVICE side  — HomeworkClient: gets ONLY a student payload (homeworkPayload) from the server. It never receives the lesson, the
//                answer key, transcripts or accepted forms. It records draft answers, asks before submitting with blanks, and sends
//                ONLY the final answers (no keystroke or event log). It is "submitted" only after a valid server acknowledgement.
// SERVER side  — homeworkPayload, releasePhase, validateSubmission, scoreHomework, storageRecord: run where the authoritative,
//                versioned lesson lives (a Worker). The server scores the submitted answers once; that is the official first attempt.
//                Review (answers + transcript) is returned only together with an accepted submission.
// createMemoryServer() is an in-memory stand-in for that server, for tests and demos only.
import { DictationRun } from "./run.js";
import { Session, aggregateScores } from "./session.js";
import { studentItem } from "./payload.js";
import { tokenize, MAX_ANSWER_CHARS, cpLength } from "./normalize.js";

export const PAYLOAD_SCHEMA = "dictation-homework-payload/1";
export const SUBMISSION_SCHEMA = "dictation-submission/2";
export const LIMITS = { maxItems: 200, maxAnswerChars: MAX_ANSWER_CHARS, maxSubmissionBytes: 262144, maxTiles: 64, maxBlanks: 20, maxSelected: 20 };

const serverRun = (serverOpts) => new DictationRun({ ...serverOpts, _serverScoring: true });

/** Phase plan (owner rule 2: no disclosure to unattempted independent items). Phase 2 = items that would show the answer of an
 * independent Answer Spotter item before it is answered (Level 1/2 on the same sentence; multiple-choice options containing a typed
 * answer). `lock` = the independent items they would disclose: the server stores their phase-1 answers (first lock wins) and they
 * become read-only; every other phase-1 item (Level 3/4, …) stays editable until the final Submit. */
function phasePlan(run) {
  const p1 = [], p2 = [], lock = new Set();
  for (const it of run.items()) { if (it.kind !== "scored") continue; const b = run.presentBlockers(it.id); if (b.length) { p2.push(it.id); for (const a of b) lock.add(a); } else p1.push(it.id); }
  return { phases: p2.length ? [p1, p2] : [p1], lock: p1.filter((id) => lock.has(id)) };
}

/** SERVER: the only lesson data a student device receives for homework. Contains no answers (checked by tests and the browser QA). */
export function homeworkPayload(serverOpts, { assignmentId, phase = 1 } = {}) {
  const run = serverRun(serverOpts); const { phases, lock } = phasePlan(run); const ph = Math.min(phase, phases.length);
  const item = (id) => studentItem(run.lesson, id, run.level.get(id), { seed: run.opts.seed });
  return { schema: PAYLOAD_SCHEMA, assignmentId: assignmentId ?? null, contentVersion: run.opts.version, seed: run.opts.seed, contentLabel: run.content.label,
    phases: phases.length, phase: ph, items: phases.slice(0, ph).flat().map(item), lockOnContinue: ph < phases.length ? [...lock] : [], lockedItems: ph > 1 ? [...lock] : [] };
}
/** SERVER: after storing the phase-1 answers (immutable), release the phase-2 items. */
export function releasePhase(serverOpts, opts = {}) { return homeworkPayload(serverOpts, { ...opts, phase: 2 }); }
export function phaseItemIds(serverOpts) { return phasePlan(serverRun(serverOpts)).phases; }
export function phaseLockIds(serverOpts) { return phasePlan(serverRun(serverOpts)).lock; }

/** Response shape and size checks shared by device and server (the server repeats them; never trust the device). */
export function checkResponse(level, r) {
  if (!r || typeof r !== "object" || Array.isArray(r)) return "bad_response";
  const str = (x) => typeof x === "string" && cpLength(x) <= LIMITS.maxAnswerChars;
  if (level === "level1") return Array.isArray(r.placedIds) && r.placedIds.length <= LIMITS.maxTiles && r.placedIds.every((x) => typeof x === "string" && x.length <= 40) ? null : "bad_response";
  if (level === "level2") return Array.isArray(r.answers) && r.answers.length <= LIMITS.maxBlanks && r.answers.every(str) ? null : "bad_response";
  if (level === "level3" || level === "level4") return str(r.answer) ? null : typeof r.answer === "string" ? "answer_too_long" : "bad_response";
  if (level === "answerSpotter") return (r.text === undefined || str(r.text)) && (r.chosen === undefined || str(r.chosen)) && (r.text !== undefined || r.chosen !== undefined) ? null : "bad_response";
  return "bad_response";
}
/** Device-side emptiness (the server decides authoritatively; a speaker label alone, for example, is empty on the server too). */
function looksEmpty(level, r) {
  if (!r) return true;
  if (level === "level1") return !r.placedIds?.length;
  if (level === "level2") return !(r.answers ?? []).some((a) => tokenize(String(a)).length);
  if (level === "answerSpotter") return !tokenize(String(r.text ?? r.chosen ?? "")).length;
  return !tokenize(String(r.answer ?? "")).length;
}

/**
 * DEVICE: one homework sitting. payload from homeworkPayload / releasePhase. host: {transport: {lockPhase(req), submit(req)}, makeKey}.
 * The client never computes a score and never shows an answer before the server's acknowledgement.
 */
export class HomeworkClient {
  constructor(payload, host) {
    if (!payload || payload.schema !== PAYLOAD_SCHEMA) throw new Error("HomeworkClient: not a homework payload");
    this.p = payload; this.host = host; this.items = new Map(payload.items.map((i) => [i.id, i])); this.responses = {}; this.locked = new Set(payload.lockedItems ?? []);
    this.session = new Session({ mode: "homework", version: payload.contentVersion, items: payload.items.map((i) => i.id) }); this.result = null; this.draftResponses = null;
  }
  get phase() { return this.p.phase; }
  get morePhases() { return this.p.phase < this.p.phases; }
  view() { return [...this.items.values()].map((i) => ({ ...i, response: this.responses[i.id] ?? null, readOnly: this.locked.has(i.id) || this.session.S.sub !== "draft" })); }
  answer(itemId, response) {
    const it = this.items.get(itemId); if (!it) return { status: "unknown_item" };
    if (this.locked.has(itemId)) return { status: "locked_phase" };
    const bad = checkResponse(it.level, response); if (bad) return { status: "rejected", rejected: bad };
    const st = this.session.dispatch({ op: "answer", item: itemId, empty: looksEmpty(it.level, response) });
    if (st === "draft_updated") this.responses[itemId] = structuredClone(response); return { status: st };
  }
  saveDraft() { const r = this.session.dispatch({ op: "saveDraft" }); this.draftResponses = structuredClone(this.responses); return { status: r, draft: { responses: this.draftResponses, phase: this.p.phase } }; }
  resume(draft = null) {
    const r = this.session.dispatch({ op: "resume" }); if (r !== "resumed") return { status: r };
    this.responses = structuredClone(draft?.responses ?? this.draftResponses ?? {}); return { status: r };
  }
  /** Phase 1 answers are stored by the server and become read-only; the server then sends the phase 2 items. */
  async continueToNextPhase() {
    if (!this.morePhases) return { status: "no_next_phase" }; if (this.session.S.sub !== "draft") return { status: "locked" };
    const ids = [...this.items.keys()]; const lockIds = this.p.lockOnContinue ?? []; let res;
    try { res = await this.host.transport.lockPhase({ assignmentId: this.p.assignmentId, contentVersion: this.p.contentVersion, phase: this.p.phase, responses: pick(this.responses, lockIds) }); } catch (e) { return { status: "phase_failed", error: String(e?.message || e) }; }
    if (!res || res.status !== "ok" || !res.payload || res.payload.schema !== PAYLOAD_SCHEMA || res.payload.contentVersion !== this.p.contentVersion) return { status: "phase_failed", error: res?.reason ?? "bad response" };
    for (const id of res.payload.lockedItems ?? lockIds) this.locked.add(id);
    this.p = res.payload; for (const it of res.payload.items) if (!this.items.has(it.id)) { this.items.set(it.id, it); this.session.S.items[it.id] = { log: [], answered: false }; }
    return { status: "ok", added: res.payload.items.filter((i) => !ids.includes(i.id)).map((i) => i.id) };
  }
  async submit({ confirmIncomplete = false } = {}) {
    if (this.morePhases) return { status: "finish_phase_first" };
    const key = this.host.makeKey(); const r = this.session.dispatch({ op: "submit_requested", key, confirmIncomplete });
    if (r !== "submit_pending") return { status: r };
    const req = { schema: SUBMISSION_SCHEMA, assignmentId: this.p.assignmentId, contentVersion: this.p.contentVersion, idempotencyKey: key, responses: pick(this.responses, [...this.items.keys()]) };
    let ack; try { ack = await this.host.transport.submit(req); } catch (e) { return { status: fail(this, key), error: String(e?.message || e) }; }
    if (!ack || typeof ack !== "object") return { status: fail(this, key), error: "no acknowledgement" };
    const st = this.session.dispatch({ op: "server_ack", key, status: ack.status, submissionId: ack.submissionId });
    if (st === "submitted" || st === "already_submitted") { this.result = ack.result ?? null; return { status: st, submissionId: ack.submissionId }; }
    if (st === "submit_rejected") return { status: st, reason: ack.reason ?? null };
    return { status: fail(this, key), error: "invalid acknowledgement" };
  }
  /** Score and review exist on the device only after the server acknowledged the submission. */
  review() { return this.session.S.sub === "submitted" && this.result ? { status: "ok", ...this.result } : { status: "locked_until_submitted" }; }
  startFreePractice() { return { status: this.session.dispatch({ op: "startFreePractice" }) }; }
  final() { return this.session.final(); }
}
const pick = (o, ids) => Object.fromEntries(ids.filter((id) => o[id] !== undefined).map((id) => [id, o[id]]));
function fail(c, key) { c.session.dispatch({ op: "submit_failed", key }); return "draft_restored"; }

/** SERVER: shape, size and id checks of a submission. expected: {assignmentId, contentVersion, itemIds:[...]} from the server's own records. */
export function validateSubmission(req, expected) {
  if (!req || typeof req !== "object" || req.schema !== SUBMISSION_SCHEMA) return { ok: false, reason: "bad_payload" };
  if (JSON.stringify(req).length > LIMITS.maxSubmissionBytes) return { ok: false, reason: "too_large" };
  if (req.assignmentId !== expected.assignmentId) return { ok: false, reason: "wrong_assignment" };
  if (req.contentVersion !== expected.contentVersion) return { ok: false, reason: "version_mismatch" };
  if (typeof req.idempotencyKey !== "string" || !req.idempotencyKey || req.idempotencyKey.length > 100) return { ok: false, reason: "missing_key" };
  const R = req.responses; if (!R || typeof R !== "object" || Array.isArray(R)) return { ok: false, reason: "bad_payload" };
  const ids = new Map(expected.items.map((i) => [i.id, i.level])); const keys = Object.keys(R); if (keys.length > LIMITS.maxItems) return { ok: false, reason: "too_large" };
  for (const k of keys) { if (!ids.has(k)) return { ok: false, reason: "unknown_item", item: k }; const bad = checkResponse(ids.get(k), R[k]); if (bad) return { ok: false, reason: bad, item: k }; }
  return { ok: true };
}

/**
 * SERVER: score submitted answers with the server's own lesson (serverOpts: {doc, validation, approval, version, seed, deselected, ...}).
 * locked: phase-1 answers the server stored earlier (they win over anything in req). Each answered item is scored exactly once:
 * that is its official first attempt (no retries, no client-side score is ever read). Blank items count 0 (O-3).
 */
export function scoreHomework(req, serverOpts, { locked = {} } = {}) {
  const run = serverRun(serverOpts); const R = { ...(req.responses ?? {}), ...locked }; const items = {}; const agg = [];
  for (const id of run.scored) {
    const lv = run.level.get(id); const resp = R[id]; let st = "unattempted", first = null, reason = resp === undefined ? "blank" : null;
    if (resp !== undefined && !checkResponse(lv, resp)) {
      const { r } = run.scoreResponse(id, lv, resp);
      if (r.rejected === "empty_answer") reason = "blank"; else if (r.rejected && r.num === undefined) reason = r.rejected;
      else { st = "attempted"; first = { num: r.num ?? r.lcs, den: r.den, exact: (r.num ?? r.lcs) === r.den }; reason = null; }
    } else if (resp !== undefined) reason = "invalid";
    items[id] = { level: lv, state: st, first, ...(reason ? { reason } : {}) };
    agg.push({ id, level: lv, state: st, first, current: first, expectedDen: run.lesson.expectedDen(id) });
  }
  const aggregate = aggregateHw(agg); const unanswered = run.scored.filter((id) => items[id].state !== "attempted");
  const review = Object.fromEntries([...run.scored, ...run.reviews].map((id) => [id, run.answerOf(id)]));
  return { ok: true, items, aggregate, unanswered, review, content: run.content, official: run.content.audited === true, analyticsEligible: run.content.audited === true };
}
const aggregateHw = (items) => aggregateScores({ mode: "homework", submitted: true, items });

/**
 * SERVER: what to persist (P-05, minimal data). Default: scores only, NO raw answers. Raw answers are kept only when the school has
 * approved a retention period (policy.retentionApproved === true and policy.retentionDays a positive integer): PENDING HUMAN INPUT.
 */
export function storageRecord(scored, policy = {}) {
  const keepRaw = policy.retentionApproved === true && Number.isInteger(policy.retentionDays) && policy.retentionDays > 0 && policy.rawAnswers === "keep";
  const rec = { schema: "dictation-homework-record/1", items: Object.fromEntries(Object.entries(scored.items).map(([id, x]) => [id, { level: x.level, state: x.state, first: x.first, ...(x.reason ? { reason: x.reason } : {}) }])),
    aggregate: { overall: scored.aggregate.overall, result: scored.aggregate.result, attemptedAccuracy: scored.aggregate.attemptedAccuracy, completionRate: scored.aggregate.completionRate }, official: scored.official };
  if (keepRaw && policy.responses) { rec.responses = policy.responses; rec.deleteAfterDays = policy.retentionDays; }
  return { record: rec, rawAnswersStored: !!rec.responses, deleteAfterDays: rec.deleteAfterDays ?? null };
}

/**
 * In-memory stand-in for the server (tests and demos only). config: {serverOpts, assignment:{id, classId, contentVersion, open?:() => bool},
 * tokens:{token:{studentRef, classId}}, token (the caller's), script: array of 'accept'|'throw'|'lose_ack' consumed per submit, retention}.
 * Idempotency: one submission per (student, assignment, contentVersion); a repeat returns the same id and result.
 */
export function createMemoryServer(cfg) {
  const store = new Map(), phase1 = new Map(), calls = []; let n = 0; const script = [...(cfg.script ?? [])];
  const who = () => cfg.tokens?.[cfg.token] ?? null; const A = cfg.assignment;
  const auth = () => { const u = who(); if (!u) return "auth"; if (u.classId !== A.classId) return "wrong_class"; if (A.open && !A.open()) return "closed"; return null; };
  const expected = () => ({ assignmentId: A.id, contentVersion: A.contentVersion, items: homeworkPayload(cfg.serverOpts, { phase: 9 }).items });
  return {
    calls, store,
    payload() { const e = auth(); if (e) return { status: "rejected", reason: e }; const u = who(); return { status: "ok", payload: homeworkPayload(cfg.serverOpts, { assignmentId: A.id, phase: phase1.has(u.studentRef) ? 2 : 1 }) }; },
    async lockPhase(req) {
      calls.push({ op: "lockPhase" }); const e = auth(); if (e) return { status: "rejected", reason: e }; const u = who();
      if (req?.assignmentId !== A.id || req?.contentVersion !== A.contentVersion) return { status: "rejected", reason: "wrong_assignment" };
      const lk = phaseLockIds(cfg.serverOpts); const v = validateSubmission({ schema: SUBMISSION_SCHEMA, idempotencyKey: "phase", ...req }, { ...expected(), items: expected().items.filter((i) => lk.includes(i.id)) });
      if (!v.ok) return { status: "rejected", reason: v.reason };
      if (!phase1.has(u.studentRef)) phase1.set(u.studentRef, structuredClone(req.responses ?? {})); // first lock wins; never overwritten
      return { status: "ok", payload: releasePhase(cfg.serverOpts, { assignmentId: A.id }) };
    },
    async submit(req) {
      const how = script.length ? script.shift() : "accept"; calls.push({ op: "submit", how, key: req?.idempotencyKey });
      if (how === "throw") throw new Error("network down (simulated)");
      const e = auth(); if (e) return { status: "rejected", reason: e }; const u = who();
      const dup = u.studentRef + "|" + A.id + "|" + A.contentVersion;
      if (store.has(dup)) { const rec = store.get(dup); return { status: "duplicate", submissionId: rec.submissionId, result: rec.result }; }
      const v = validateSubmission(req, expected()); if (!v.ok) return { status: "rejected", reason: v.reason };
      if (phaseItemIds(cfg.serverOpts).length > 1 && !phase1.has(u.studentRef)) return { status: "rejected", reason: "phase_not_locked" };
      const sc = scoreHomework(req, cfg.serverOpts, { locked: phase1.get(u.studentRef) ?? {} });
      const result = { items: sc.items, aggregate: sc.aggregate, unanswered: sc.unanswered, review: sc.review };
      const rec = { submissionId: "mem-" + ++n, stored: storageRecord(sc, { ...(cfg.retention ?? {}), responses: req.responses }), result };
      store.set(dup, rec);
      if (how === "lose_ack") throw new Error("acknowledgement lost (simulated): the server DID store the submission");
      return { status: "accepted", submissionId: rec.submissionId, result };
    },
  };
}
