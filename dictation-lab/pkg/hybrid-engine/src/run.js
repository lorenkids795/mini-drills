// One entry point for a Dictation Lab FREE PRACTICE sitting (Levels 1-4 and Answer Spotter) and the scoring core the SERVER uses
// for homework. Every rule comes from scoring.js / session.js; this file only routes. Contract v1.1 (owner policy 2026-11):
//   * no hint, no reveal, no answer preview: the only student actions are present, check and review;
//   * review of an item (its answer / transcript) opens only after a valid Check of that item (free practice) and never discloses
//     the answer of an independent Answer Spotter item that has not been checked yet;
//   * homework is never run on the student's device with the lesson: see homework.js (HomeworkClient + scoreHomework).
// Pure and deterministic: the run is a function of (options, event log). No DOM, network, clock or Math.random.
import { Lesson, scoreAnswerSpotter, reviewUnlock } from "./scoring.js";
import { Session, reduceAttempts, deriveExposure, aggregateScores } from "./session.js";
import { buildExerciseSet } from "./content.js";
import { tokenize } from "./normalize.js";
import { studentItem, itemSeed } from "./payload.js";
import { WordBuilder } from "./wordbuilder.js";

export const LEVELS = ["level1", "level2", "level3", "level4", "answerSpotter"];
const RANK = { none: 0, unknown: 0, tokens_shown: 1, context_shown: 2, answer_shown: 3 };
const AUDITED = new Set(["GATE_PASS", "GATE_PASS_WITH_EXCLUSIONS"]);

/**
 * Throws unless the validator report allows this use (contract C14 + owner rule 6 / P-04):
 *   free practice: GATE_PASS, GATE_PASS_WITH_EXCLUSIONS or GATE_NOT_AUDITED (the last one is labelled "unverified transcript");
 *   homework (server scoring): an audited gate AND a teacher approval for exactly this content version.
 * Returns {audited, label}.
 */
export function assertRunnable(validation, { mode = "free", version, approval } = {}) {
  if (!validation || validation.valid !== true) throw new Error("createRun: the document has not passed the validator (validation.valid !== true)");
  const gate = validation.semantic?.gate; const audited = AUDITED.has(gate);
  if (!audited && gate !== "GATE_NOT_AUDITED") throw new Error("createRun: validator gate " + gate + " is not runnable");
  if (mode === "homework") {
    if (!audited) throw new Error("createRun: homework needs teacher-audited content (gate " + gate + " is practice only)");
    if (!approval || approval.approved !== true || approval.version !== version) throw new Error("createRun: homework needs a teacher approval of content version " + version);
  }
  return { audited, label: audited ? "teacher_audited" : "unverified_transcript" };
}

/** Feedback a student may see right after a Check. Detail that names answer text (variant labels, positions) only once review is open. */
function feedback(lv, r, open) {
  if (r.reviewed) return r;
  if (lv === "answerSpotter") { const out = { correct: r.correct, num: r.num, den: r.den }; if (r.distractorChosen) out.distractorChosen = true; if (r.rejected) out.rejected = r.rejected; return out; }
  const base = { exact: r.exact, num: r.num ?? r.lcs, den: r.den };
  if (lv === "level2") { base.perBlank = r.perBlank.map((b) => ({ exact: b.exact, num: b.lcs, den: b.den })); return open ? { ...base, detail: r } : base; }
  if (r.missing !== undefined) { base.missing = r.missing; base.extra = r.extra; }
  if (r.targetErrors !== undefined) { base.targetErrors = r.targetErrors; base.criticalTargetErrors = r.criticalTargetErrors; }
  if (r.sanitized) base.sanitized = true;
  return open ? { ...base, detail: r } : base;
}

/**
 * options: {
 *   doc, validation (from the JS validator; required unless unsafeSkipValidation), mode: 'free' (only), version, seed (D-32),
 *   deselected, priorExposure: {sentenceId: class}, exposureHistoryComplete, ignoreSpeakerLabels (L4, D-13), formsApproved
 * }
 */
export class DictationRun {
  constructor(opts, log = []) {
    const mode = opts.mode ?? "free";
    if (mode !== "free" && !opts._serverScoring) throw new Error("DictationRun is for free practice; homework uses HomeworkClient on the device and scoreHomework on the server");
    this.content = opts.unsafeSkipValidation ? { audited: false, label: "unvalidated_test_only" } : assertRunnable(opts.validation, { mode: opts._serverScoring ? "homework" : "free", version: opts.version, approval: opts.approval });
    this.opts = { seed: 0, deselected: [], priorExposure: {}, exposureHistoryComplete: false, ignoreSpeakerLabels: true, ...opts, mode: "free" };
    const set = buildExerciseSet(opts.doc, { deselected: this.opts.deselected }); this.set = set;
    const doc = { ...opts.doc, learningTargets: set.targets, exercises: Object.fromEntries(LEVELS.map((lv) => [lv, { items: set[lv] }])) };
    this.lesson = new Lesson(doc, { formsApproved: this.opts.formsApproved !== false });
    this.level = new Map(); this.scored = []; this.reviews = [];
    for (const lv of LEVELS) for (const it of set[lv]) { this.level.set(it.id, lv); if (lv === "answerSpotter" && it.activity === "post_check_transcript_review") this.reviews.push(it.id); else this.scored.push(it.id); }
    const asIds = this.scored.filter((id) => this.level.get(id) === "answerSpotter"); this.typedAS = asIds.filter((id) => this.lesson.items.get(id).responseMode !== "choose_option");
    this.indepAS = [...this.typedAS, ...asIds.filter((id) => !this.typedAS.includes(id))]; // typed answers first: multiple-choice options may contain them
    this.session = new Session({ mode: "free", version: this.opts.version, items: this.scored });
    this.log = []; this.reviewResults = {};
    for (const ev of log) this.apply(ev);
  }
  static replay(opts, log) { return new DictationRun(opts, log.map(({ _result, _out, ...e }) => e)); }
  exportLog() { return this.log.map(({ _out, ...e }) => e); }

  /** Scored items in play order (independent Answer Spotter first: listening before scaffolds), then post-check review items. */
  items() {
    const order = [...this.indepAS, ...this.scored.filter((id) => !this.indepAS.includes(id))];
    return [...order.map((id) => ({ id, level: this.level.get(id), kind: "scored" })), ...this.reviews.map((id) => ({ id, level: "answerSpotter", kind: "review", pairedWith: this.lesson.items.get(id).pairedIndependentItemId }))];
  }
  sentencesOf(id) { const it = this.lesson.items.get(id); return it.sentenceIds ?? (it.sentenceId ? [it.sentenceId] : it.evidenceSentenceIds); }
  validChecks(id) { const it = this.session.S.items[id]; return it ? reduceAttempts(it.log).attempts.length : 0; }
  /** Typed (not multiple-choice) independent Answer Spotter items whose answer appears in what item `id` shows BEFORE any Check:
   * the options of a choose_option item, or the tiles / sentence context of a Level 1 / Level 2 item. */
  discloses(id) {
    const lv = this.level.get(id); const it = this.lesson.items.get(id); let shown = [];
    if (lv === "answerSpotter" && it.responseMode === "choose_option") shown = it.spans.filter((s) => s.role === "correct_answer" || s.role === "distractor").map((s) => s.span.surface);
    else if (lv === "level1") shown = [this.lesson.S.get(it.sentenceId).cleanText, ...(it.distractors ?? []).map((d) => d.text)]; // every tile is visible
    else if (lv === "level2") shown = studentItem(this.lesson, id, lv, {}).segments.filter((x) => x.text !== undefined).map((x) => x.text); // context around the blanks
    if (!shown.length) return [];
    const st = shown.map(tokenize); const has = (t) => t.length > 0 && st.some((x) => { for (let i = 0; i + t.length <= x.length; i++) if (t.every((w, k) => x[i + k] === w)) return true; return false; });
    return this.typedAS.filter((y) => y !== id && this.answersOf(y).some((a) => has(tokenize(a))));
  }
  answersOf(y) { const it = this.lesson.items.get(y); return it.spans.filter((s) => s.role === "correct_answer" || s.role === "candidate").flatMap((s) => [s.span.surface, ...this.lesson.approved(s.acceptedForms).map((f) => f.text)]); }
  /** REVIEW blockers: independent Answer Spotter items (other than `self`) with no valid Check yet that share a sentence with `id`
   * (the review of `id` shows those sentences, its answers or its explanation). */
  blockers(id, self = null) {
    const mine = new Set(this.sentencesOf(id)); return this.indepAS.filter((a) => a !== id && a !== self && this.validChecks(a) === 0 && this.sentencesOf(a).some((s) => mine.has(s)));
  }
  /** What blocks PRESENTING an item (before its first Check): Level 1/2 sharing a sentence with an unchecked independent item, or any disclosure. */
  presentBlockers(id) {
    const lv = this.level.get(id); const dis = new Set(this.discloses(id)); const mine = new Set(lv === "level1" || lv === "level2" ? this.sentencesOf(id) : []);
    return this.indepAS.filter((a) => a !== id && this.validChecks(a) === 0 && (dis.has(a) || this.sentencesOf(a).some((s) => mine.has(s))));
  }
  reviewGate(id) {
    if (this.reviews.includes(id)) { const p = this.lesson.items.get(id).pairedIndependentItemId; const blockedBy = this.blockers(id, p); return { open: reviewUnlock({ mode: "free", validChecks: this.validChecks(p), blockedBy }), blockedBy, needs: this.validChecks(p) ? [] : [p] }; }
    const blockedBy = this.blockers(id); return { open: reviewUnlock({ mode: "free", validChecks: this.validChecks(id), blockedBy }), blockedBy, needs: this.validChecks(id) ? [] : [id] };
  }

  // ---- student actions (each one is an event; apply() is the only place that changes state)
  present(itemId) { return this.apply({ op: "present", item: itemId }); }
  check(itemId, response) { return this.apply({ op: "check", item: itemId, response }); }
  review(itemId) { return this.apply({ op: "review", item: itemId }); }

  apply(ev) { const out = this._apply(ev); this.log.push({ ...ev, _out: out }); return out; }
  _apply(ev) {
    if (!ev || typeof ev !== "object") return { status: "unsupported_event" };
    const id = ev.item; const lv = id !== undefined ? this.level.get(id) : undefined;
    if (!["present", "check", "review"].includes(ev.op)) return { status: "unsupported_event" }; // hint, reveal, preview… do not exist (v1.1)
    if (!lv) return { status: "unknown_item" };
    switch (ev.op) {
      case "present": {
        if (this.reviews.includes(id)) { const g = this.reviewGate(id); if (!g.open) return { status: "locked", reason: g.needs.length ? "check_paired_item_first" : "answer_spotter_first", waitFor: [...g.needs, ...g.blockedBy], payload: studentItem(this.lesson, id, lv, { seed: this.opts.seed, reviewUnlocked: false }), exposure: null };
          return { status: "ok", payload: studentItem(this.lesson, id, lv, { seed: this.opts.seed, reviewUnlocked: true }), exposure: "answer_shown", contentLabel: this.content.label }; }
        { const b = this.presentBlockers(id); if (b.length) return { status: "locked", reason: "answer_spotter_first", waitFor: b, exposure: null }; }
        return { status: "ok", payload: studentItem(this.lesson, id, lv, { seed: this.opts.seed }), exposure: lv === "level1" ? "tokens_shown" : lv === "level2" ? "context_shown" : "none", contentLabel: this.content.label };
      }
      case "check": return this._check(id, lv, ev.response ?? {});
      case "review": {
        const g = this.reviewGate(id); if (!g.open) return { status: "locked", reason: g.needs.length ? "check_first" : "answer_spotter_first", waitFor: [...g.needs, ...g.blockedBy] };
        return { status: "ok", exposure: "answer_shown", review: this.answerOf(id), contentLabel: this.content.label };
      }
    }
    return { status: "unsupported_event" };
  }
  /** The answer material of one item (only ever returned through review, i.e. after the gate). */
  answerOf(id) {
    const lv = this.level.get(id); const it = this.lesson.items.get(id); const L = this.lesson;
    if (this.reviews.includes(id)) return { transcript: it.evidenceSentenceIds.map((s) => ({ sentenceId: s, text: L.S.get(s).cleanText })) };
    if (lv === "answerSpotter") return { answers: it.spans.filter((s) => s.role === "correct_answer" || s.role === "candidate").map((s) => s.span.surface), explanation: it.explanation ?? null, sourceLabel: studentItem(L, id, lv, {}).sourceLabel };
    if (lv === "level2") return { text: L.S.get(it.sentenceId).cleanText, blanks: it.blanks.map((b) => L.T.get(b.targetId).surface) };
    return { text: this.sentencesOf(id).map((s) => L.S.get(s).cleanText).join(" ") };
  }
  /** Pure scoring of one response (no state). Used by _check and by the server (scoreHomework). Non-string values are empty text (never coerced). */
  scoreResponse(id, lv, resp) {
    const L = this.lesson; let r, key; const str = (x) => (typeof x === "string" ? x : typeof x === "number" && Number.isFinite(x) ? String(x) : "");
    if (!resp || typeof resp !== "object") resp = {};
    if (lv === "level1") {
      let placed = resp.placed;
      if (resp.placedIds) { const it = L.items.get(id); const wb = WordBuilder.fromSentence(L.S.get(it.sentenceId).cleanText, itemSeed(this.opts.seed, id), (it.distractors ?? []).map((d) => d.text)); placed = Array.isArray(resp.placedIds) ? resp.placedIds.filter((t) => typeof t === "string").map((t) => wb.text.get(t)).filter((x) => x !== undefined) : []; }
      placed = Array.isArray(placed) ? placed.map(str) : [];
      r = L.l1Arrangement({ itemId: id, placed }); key = r.rejected ? null : placed.flatMap(tokenize);
    } else if (lv === "level2") { const ans = Array.isArray(resp.answers) ? resp.answers.map(str) : []; r = L.scoreBlanks({ itemId: id, answers: ans }); key = r.rejected ? null : ans.map(tokenize); }
    else if (lv === "level3" || lv === "level4") { r = L.scoreSentence({ itemId: id, answer: str(resp.answer), level: lv, ignoreSpeakerLabels: this.opts.ignoreSpeakerLabels }); key = r.rejected ? null : r.tokens; }
    else { const rr = { text: str(resp.text), chosen: str(resp.chosen) }; r = scoreAnswerSpotter(L, { itemId: id, response: rr }); key = r.rejected === "empty_answer" ? null : tokenize(rr.text || rr.chosen); }
    return { r, key };
  }
  _check(id, lv, resp) {
    if (this.reviews.includes(id)) {
      const g = this.reviewGate(id); if (!g.open) return { status: "locked", waitFor: [...g.needs, ...g.blockedBy] };
      const r = scoreAnswerSpotter(this.lesson, { itemId: id, response: { selected: Array.isArray(resp?.selected) ? resp.selected.filter((x) => typeof x === "string") : [] } }); this.reviewResults[id] = r; return { status: "reviewed", score: r };
    }
    { const b = this.presentBlockers(id); if (b.length && this.validChecks(id) === 0) return { status: "locked", reason: "answer_spotter_first", waitFor: b }; }
    const { r, key } = this.scoreResponse(id, lv, resp);
    if (r.rejected === "empty_answer") return { status: this.session.dispatch({ op: "check_empty", item: id }), rejected: "empty_answer", reviewAvailable: this.reviewGate(id).open };
    if (r.rejected && r.num === undefined) return { status: "rejected", rejected: r.rejected }; // answer_too_long, unknown_item: not an attempt, nothing recorded
    const num = r.num ?? r.lcs, den = r.den;
    const status = this.session.dispatch({ op: "check", item: id, num, den, answer: JSON.stringify(key) });
    const g = this.reviewGate(id);
    return { status, score: feedback(lv, r, g.open), reviewAvailable: g.open, ...(g.open ? {} : { reviewWaitsFor: [...g.needs, ...g.blockedBy] }) };
  }

  // ---- read model
  /** Informational exposure class of an item at its first valid Check (P-01), or now if there is none. Never a grading fact (P-06). */
  exposureOf(id) {
    let stop = this.log.length;
    for (let k = 0; k < this.log.length; k++) { const e = this.log[k]; if (e.item === id && e.op === "check" && e._out?.status === "recorded") { stop = k; break; } }
    const events = [];
    for (let k = 0; k < stop; k++) { const e = this.log[k]; if (!e._out || e._out.status !== "ok") continue; const cls = e._out.exposure; if (!cls || cls === "none") continue; const ss = e.op === "review" && this.reviews.includes(e.item) ? this.lesson.items.get(e.item).evidenceSentenceIds : this.sentencesOf(e.item); for (const s of ss) events.push({ sentenceId: s, cls }); }
    let best = null;
    for (const s of this.sentencesOf(id)) {
      const own = events.filter((x) => x.sentenceId === s).map((x) => (x.cls === "answer_shown" ? { op: "review", sentenceId: s } : { op: "present", sentenceId: s, level: { tokens_shown: "level1", context_shown: "level2" }[x.cls] }));
      const { exposure } = deriveExposure({ events: own, query: s, host: { priorExposure: this.opts.priorExposure, history: this.opts.exposureHistoryComplete ? "complete" : "unknown" } });
      if (best === null || RANK[exposure] > RANK[best]) best = exposure;
    }
    return best ?? "none";
  }
  itemSummaries() { const R = {}; for (const id of this.scored) R[id] = reduceAttempts(this.session.S.items[id].log, { exposure: this.exposureOf(id) }); return R; }
  summary() {
    const R = this.itemSummaries();
    const items = this.scored.map((id) => { const r = R[id]; return { id, level: this.level.get(id), state: r.attempted ? "attempted" : "unattempted", first: r.firstAttempt, current: r.currentPractice, expectedDen: this.lesson.expectedDen(id) }; });
    return { items: R, aggregate: aggregateScores({ mode: "free", submitted: false, items }), session: this.session.final(), reviews: { ...this.reviewResults },
      content: this.content, official: false, analyticsEligible: false }; // free practice is never an official grade or Personal Goal evidence (owner rule 6)
  }
}
export const createRun = (opts) => new DictationRun(opts);
