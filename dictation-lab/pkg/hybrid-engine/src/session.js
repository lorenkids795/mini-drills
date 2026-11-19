// Contract v1.1 C10-C13: attempts, exposure (informational), aggregation, session and submission state machine.
// v1.1 (owner policy, 2026-11): there is NO hint, NO reveal and NO pre-check answer preview. Events named "hint" or
// "reveal" (or anything else unknown) are rejected as "unsupported_event" and never change state.
// Everything is a pure function of the event log: replaying the same events gives the same state.
import { Frac, frac, sumFrac } from "./fraction.js";

export const PASS_PERCENT = 70; // Mini Drills PASS rule (O-3): whole-assignment score, blanks count as 0
const RANK = { none: 0, unknown: 0, tokens_shown: 1, context_shown: 2, answer_shown: 3 };

/**
 * C10. events: {op:'check', num, den, answer?} | {op:'check_empty'}. Any other op is ignored here (the session rejects it before
 * it reaches the log). exposure: informational class at the time of the first valid Check (P-01, P-06): never a grading fact.
 */
export function reduceAttempts(events, { exposure = "none" } = {}) {
  const att = []; let last = null;
  for (const ev of events) {
    if (ev.op === "check_empty") last = null;
    else if (ev.op === "check") {
      if (ev.answer !== undefined && ev.answer === last) continue; // D-18: identical re-check with nothing in between is not a new attempt
      last = ev.answer ?? null;
      att.push({ index: att.length, num: ev.num, den: ev.den, exact: ev.num === ev.den });
    }
  }
  const first = att[0] ?? null; const succeeded = att.some((a) => a.exact);
  const outcome = succeeded ? "succeeded" : att.length ? "in_progress" : "not_started";
  const status = first && first.exact ? "first_attempt_exact" : succeeded ? "improved_after_practice" : outcome;
  const cur = att.length ? att[att.length - 1] : null;
  return {
    attempts: att, firstAttempt: first ? { num: first.num, den: first.den, exact: first.exact } : null, status, outcome, attempted: att.length > 0,
    practiceAttempts: Math.max(0, att.length - 1), currentPractice: cur ? { num: cur.num, den: cur.den } : null,
    exposureAtFirstCheck: first ? (exposure in RANK ? exposure : "unknown") : null, reviewUnlocked: att.length > 0,
  };
}

/** C11 (informational): exposure class of one sentence. events: {op:'present', level, sentenceId} | {op:'review', sentenceId}. host: {priorExposure?, history?} */
export function deriveExposure({ events, query, host = {} }) {
  let cls = "none";
  for (const ev of events) {
    if (ev.sentenceId !== query) continue;
    const c = ev.op === "present" ? ({ level1: "tokens_shown", level2: "context_shown", answerSpotterReview: "answer_shown" }[ev.level] ?? "none") : ev.op === "review" ? "answer_shown" : "none";
    if (RANK[c] > RANK[cls]) cls = c;
  }
  const hc = host.priorExposure?.[query] ?? "none"; if (RANK[hc] > RANK[cls]) cls = hc;
  return { exposure: cls === "none" && host.history === "unknown" ? "unknown" : cls };
}

const passOf = (f) => (f === null ? null : f.num * 100 >= PASS_PERCENT * f.den);

/**
 * C12. items: [{id, level, state:'attempted'|'unattempted', first?, current?, expectedDen}]. Any state other than 'attempted' is
 * unattempted (v1.1 has no reveal-only state). mode: 'free' | 'homework'; submitted: server-acknowledged.
 */
export function aggregateScores({ mode, submitted, items }) {
  const hw = mode === "homework"; const valid = items.filter((i) => i.expectedDen > 0); const isAtt = (i) => i.state === "attempted";
  const group = (g) => {
    const att = g.filter(isAtt); const out = { attemptedItems: att.length, totalItems: g.length };
    const sum = (arr, f) => arr.reduce((a, i) => a + f(i), 0);
    out.attemptedAccuracy = att.length ? frac(sum(att, (i) => i.first.num), sum(att, (i) => i.first.den)) : null;
    out.completionRate = g.length ? frac(att.length, g.length) : null;
    const num = sum(att, (i) => i.first.num); const den = sum(att, (i) => i.first.den) + sum(g.filter((i) => !isAtt(i)), (i) => i.expectedDen);
    const proj = g.length && den ? frac(num, den) : null;
    out.assignmentScore = hw && submitted ? proj : null; out.projectedAssignmentScore = hw && !submitted ? proj : null;
    out.practiceAccuracy = att.length ? frac(sum(att, (i) => (i.current ?? i.first).num), sum(att, (i) => (i.current ?? i.first).den)) : null; return out;
  };
  const res = group(valid); res.invalidItems = items.length - valid.length; const lv = new Map(); for (const i of valid) { if (!lv.has(i.level)) lv.set(i.level, []); lv.get(i.level).push(i); }
  res.levels = {}; for (const [k, g] of lv) res.levels[k] = group(g);
  const att = valid.filter(isAtt); const f = (i) => (isAtt(i) ? new Frac(i.first.num, i.first.den) : new Frac(0n));
  const mean = (xs) => (xs.length ? sumFrac(xs).div(xs.length).toJSON() : null); const sc = valid.length ? mean(valid.map(f)) : null;
  res.overall = { itemWeightedAssignmentScore: hw && submitted ? sc : null, itemWeightedProjectedAssignmentScore: hw && !submitted ? sc : null, itemWeightedAttemptedAccuracy: mean(att.map(f)), unitWeightedAssignmentScore: res.assignmentScore, completionRate: res.completionRate };
  // O-3 / owner rule 7: PASS uses the whole-assignment score (blanks = 0), never attempted-only accuracy. Only for acknowledged homework.
  const official = hw && submitted ? res.overall.itemWeightedAssignmentScore : null;
  res.result = hw && submitted ? { submitted: true, completed: valid.length > 0 && att.length === valid.length, passed: passOf(official), passMetric: "overall.itemWeightedAssignmentScore", passPercent: PASS_PERCENT } : null;
  return res;
}

// ------------------------------------------------------------------ C13 session
// Free practice: per-item event log ({op:'check'...} | {op:'check_empty'}); every attempt rule comes from reduceAttempts().
// Homework (v1.1): there is no scored Check before submission (the client has no answer key, O-2). The client only records
// draft answers ({op:'answer', item, empty}); the server scores the submitted answers. After the server acknowledges the
// submission the work is locked; an optional, separate, ungraded practice context may then record checks.
const LOCKS = { submit_pending: "locked_pending_submit", submitted: "locked_after_submit" };
export function createSessionState({ mode, version, items }) {
  const it = {}; for (const id of items) it[id] = { log: [], answered: false };
  return { mode, version, latest: version, items: it, sub: "draft", key: null, subId: null, subVer: null, unanswered: [], practice: null, draft: null };
}
export function sessionItems(S, exposure = {}) { const out = {}; for (const [id, v] of Object.entries(S.items)) out[id] = reduceAttempts(v.log, exposure[id] ?? {}); return out; }
const isHw = (S) => S.mode === "homework";
const incomplete = (S) => Object.entries(S.items).filter(([, v]) => (isHw(S) ? !v.answered : !reduceAttempts(v.log).attempted)).map(([id]) => id);
/** Applies one event, mutating S, and returns the result string. Unknown items and malformed events never throw. */
export function applySessionEvent(S, ev) {
  const hw = isHw(S); const lock = hw ? LOCKS[S.sub] : undefined;
  if (!ev || typeof ev !== "object") return "unknown_event";
  switch (ev.op) {
    case "check": case "check_empty": {
      if (hw) {
        if (lock === "locked_after_submit" && ev.op === "check" && ev.practice && S.practice !== null && S.items[ev.item]) { S.practice[ev.item] = (S.practice[ev.item] ?? 0) + 1; return "recorded_practice"; }
        return lock ?? "not_available_homework"; // no scored Check (and no feedback) before a server-acknowledged submission
      }
      const it = S.items[ev.item]; if (!it) return "unknown_item";
      if (ev.op === "check_empty") { it.log.push({ op: "check_empty" }); return "empty_answer"; } // D-12: not an attempt, unlocks nothing
      if (!Number.isInteger(ev.num) || !Number.isInteger(ev.den) || ev.den <= 0 || ev.num < 0 || ev.num > ev.den) return "invalid_score";
      const before = reduceAttempts(it.log).attempts.length; const e = { op: "check", num: ev.num, den: ev.den }; if (ev.answer !== undefined) e.answer = ev.answer;
      it.log.push(e); if (reduceAttempts(it.log).attempts.length === before) { it.log.pop(); return "duplicate_ignored"; } // D-18
      return "recorded";
    }
    case "answer": {
      if (!hw) return "not_applicable_free_practice";
      if (lock) return lock; const it = S.items[ev.item]; if (!it) return "unknown_item";
      it.answered = ev.empty !== true; return "draft_updated";
    }
    case "goto": return "ok";
    case "saveDraft": S.draft = structuredClone(S.items); return "draft_saved";
    case "resume": if (S.draft === null) return "no_draft"; if (lock) return lock; S.items = structuredClone(S.draft); return "resumed";
    case "publishNewVersion": S.latest = ev.version; return "ok"; // D-21: the version being worked on never changes
    case "startFreePractice": if (hw && S.sub === "submitted") { S.practice = S.practice ?? {}; return "free_practice_started"; } return "free_practice_not_available";
    case "submit_requested": {
      if (!hw) return "not_applicable_free_practice"; if (S.sub === "submitted") return "already_submitted"; if (S.sub === "submit_pending") return "already_pending";
      if (!ev.key) return "missing_key";
      const inc = incomplete(S); if (inc.length && !ev.confirmIncomplete) return `needs_confirmation:${inc.length}`;
      S.key = ev.key; S.unanswered = inc; S.sub = "submit_pending"; return "submit_pending"; // NEVER submitted until the server acknowledges (D-20)
    }
    case "server_ack": {
      if (S.sub === "submitted") return ev.key === S.key && ["accepted", "duplicate"].includes(ev.status) && ev.submissionId === S.subId ? "already_submitted" : "unexpected_ack_ignored";
      if (S.sub !== "submit_pending") return "unexpected_ack_ignored";
      if (ev.key !== S.key) return "mismatched_ack_ignored";
      if (ev.status === "accepted" || ev.status === "duplicate") { if (!ev.submissionId) return "invalid_ack_ignored"; S.sub = "submitted"; S.subId = ev.submissionId; S.subVer = S.version; return "submitted"; }
      if (ev.status === "rejected") { S.sub = "draft"; S.key = null; return "submit_rejected"; }
      return "invalid_ack_ignored";
    }
    case "submit_failed": if (S.sub === "submit_pending" && ev.key === S.key) { S.sub = "draft"; S.key = null; return "draft_restored"; } return "ignored";
    default: return "unsupported_event"; // includes the removed "hint" and "reveal" (v1.1)
  }
}
export function sessionFinal(S) {
  const R = sessionItems(S); const fa = {}, counts = {}, answered = {};
  for (const [id, r] of Object.entries(R)) { if (r.firstAttempt) fa[id] = { num: r.firstAttempt.num, den: r.firstAttempt.den }; counts[id] = r.attempts.length; answered[id] = S.items[id].answered; }
  const f = { submitted: S.sub === "submitted", submissionState: S.sub, submissionId: S.subId, unanswered: S.sub !== "draft" ? S.unanswered : [], version: S.version, latestPublished: S.latest, submittedVersion: S.subVer, reviewAvailable: isHw(S) ? S.sub === "submitted" : null };
  if (isHw(S)) f.answered = answered; else { f.attemptCounts = counts; f.firstAttempt = fa; }
  if (S.practice !== null) f.practiceAttemptCounts = S.practice; return f;
}
export function runSession(inp) {
  const S = createSessionState(inp); const results = inp.events.map((ev) => applySessionEvent(S, ev)); return { results, final: sessionFinal(S) };
}
/** Stateful wrapper that keeps the event log; replay(log) rebuilds the identical state. */
export class Session {
  constructor(opts) { this.opts = opts; this.S = createSessionState(opts); this.log = []; }
  dispatch(ev) { const r = applySessionEvent(this.S, ev); this.log.push({ ...ev, _result: r }); return r; }
  final() { return sessionFinal(this.S); }
  items(exposure) { return sessionItems(this.S, exposure); }
  static replay(opts, log) { const s = new Session(opts); for (const ev of log) { const { _result, ...e } = ev; s.dispatch(e); } return s; }
}
