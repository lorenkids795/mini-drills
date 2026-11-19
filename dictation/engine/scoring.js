// Contract C4..C9: Level 1-4 scoring, Answer Spotter grading, item validity and provenance labels. Content is read from a validated lesson (baseline-shaped import document).
import { tokenize, tokenizeOffsets, prepareAnswer, stripSpeakerLabels } from "./normalize.js";
import { align, scoreVariants } from "./align.js";

const findSub = (tokens, sub) => { for (let i = 0; i + sub.length <= tokens.length; i++) { let ok = true; for (let j = 0; j < sub.length; j++) if (tokens[i + j] !== sub[j]) { ok = false; break; } if (ok) return i; } return -1; };

export class Lesson {
  /** doc: a schemaVersion 1.1 import document that has ALREADY passed the validator. options.formsApproved=false ignores every alternative (used by vectors). */
  constructor(doc, options = {}) {
    this.doc = doc; this.S = new Map(doc.transcript.sentences.map((s) => [s.id, s])); this.T = new Map((doc.learningTargets ?? []).map((t) => [t.id, t]));
    this.items = new Map(); this.levelOf = new Map();
    for (const [lv, v] of Object.entries(doc.exercises ?? {})) for (const it of v?.items ?? []) { this.items.set(it.id, it); this.levelOf.set(it.id, lv); }
    this.speakers = doc.transcript.speakers; this.formsApproved = options.formsApproved !== false;
  }
  approved(forms = []) { return this.formsApproved ? forms.filter((f) => f.approvalState === "teacher_approved") : []; }

  expectedFor(sentenceIds) {
    const exp = [], spans = [], tracks = [];
    sentenceIds.forEach((sid, k) => {
      const tw = tokenizeOffsets(this.S.get(sid).cleanText); const off = exp.length; for (const x of tw) exp.push({ token: x.token, sent: k });
      for (const tg of this.T.values()) {
        if (tg.sentenceId !== sid) continue;
        const idx = tw.map((x, q) => (x.start < tg.charEnd && tg.charStart < x.end ? off + q : -1)).filter((q) => q >= 0); if (!idx.length) continue;
        tracks.push({ first: idx[0], last: idx[idx.length - 1], target: tg });
        const alts = this.approved(tg.allowedForms).map((f) => ({ label: f.text, tokens: tokenize(f.text) })); if (alts.length) spans.push({ first: idx[0], last: idx[idx.length - 1], alts });
      }
    });
    spans.sort((a, b) => a.first - b.first); return { exp, spans, tracks };
  }
  /** Level 3 / Level 4 dictation. input: {sentenceId | itemId | expectedText, answer | answerRepeat, level?, inlineForms?, speakers?, ignoreSpeakerLabels?} */
  scoreSentence(inp) {
    let level = inp.level; let exp, spans = [], tracks = [], texts, ns, speakers = this.speakers;
    if (inp.expectedText !== undefined) {
      exp = tokenize(inp.expectedText).map((t) => ({ token: t, sent: 0 })); texts = [inp.expectedText]; ns = 1; speakers = inp.speakers ?? this.speakers;
      for (const fm of inp.inlineForms ?? []) { const sub = tokenize(fm.surface); const i = findSub(exp.map((x) => x.token), sub); if (i >= 0) spans.push({ first: i, last: i + sub.length - 1, alts: fm.forms.map((f) => ({ label: f, tokens: tokenize(f) })) }); }
    } else {
      let ids; if (inp.itemId !== undefined) { const it = this.items.get(inp.itemId); if (!it) return { rejected: "unknown_item" }; ids = it.sentenceIds ?? [it.sentenceId]; if (this.levelOf.get(inp.itemId) === "level4") level = "level4"; } /* level comes from the exercise section, not from the id prefix */ else ids = [inp.sentenceId];
      ({ exp, spans, tracks } = this.expectedFor(ids)); texts = ids.map((i) => this.S.get(i).cleanText); ns = ids.length;
    }
    const raw = inp.answer !== undefined ? inp.answer : inp.answerRepeat.unit.repeat(inp.answerRepeat.times);
    const strip = level === "level4" && inp.ignoreSpeakerLabels !== false ? (t) => stripSpeakerLabels(t, speakers, texts) : null;
    const prep = prepareAnswer(raw, strip); if (prep.rejected) return { rejected: prep.rejected };
    const r = scoreVariants(exp, prep.tokens, spans, tracks);
    const res = { lcs: r.lcs, den: r.den, exact: r.exact, variant: r.variant, missing: r.missing, extra: r.extra, targetErrors: r.targetErrors, criticalTargetErrors: r.criticalTargetErrors, wrongTargets: r.wrongTargets };
    if (inp.itemId !== undefined) res.sentenceMatchedAll = Array.from({ length: ns }, (_, k) => r.sidx.every((s, i) => s !== k || r.matched.has(i)));
    if (prep.sanitized) res.sanitized = true; res.tokens = prep.tokens; res.ops = r.ops; return res;
  }
  /** Level 1: placed = tile texts in the order the student arranged them. */
  l1Arrangement(inp) {
    const it = this.items.get(inp.itemId); const exp = tokenize(this.S.get(it.sentenceId).cleanText); const placed = inp.placed.flatMap(tokenize);
    if (!placed.length) return { rejected: "empty_answer" };
    const { lcs } = align(exp, placed); const res = { lcs, den: Math.max(exp.length, placed.length), exact: exp.length === placed.length && exp.every((x, i) => x === placed[i]) };
    const dis = new Set((it.distractors ?? []).map((d) => tokenize(d.text)[0])); if (placed.some((t) => dis.has(t))) res.usedDistractor = true; return res;
  }
  /** Level 2: answers[i] belongs to blank i of the item (positional, no cross credit). */
  scoreBlanks(inp) {
    const it = this.items.get(inp.itemId); if (!inp.answers.some((x) => tokenize(x).length)) return { rejected: "empty_answer" };
    const perBlank = []; let num = 0, den = 0, all = true;
    it.blanks.forEach((bl, i) => {
      const tg = this.T.get(bl.targetId); const exp = tokenize(tg.surface).map((t) => ({ token: t, sent: 0 }));
      const alts = this.approved(tg.allowedForms).map((f) => ({ label: f.text, tokens: tokenize(f.text) }));
      const r = scoreVariants(exp, tokenize(inp.answers[i] ?? ""), alts.length ? [{ first: 0, last: exp.length - 1, alts }] : []);
      perBlank.push({ lcs: r.lcs, den: r.den, exact: r.exact, variant: r.variant }); num += r.lcs; den += r.den; all = all && r.exact;
    });
    return { perBlank, num, den, exact: all };
  }
  /** Number of expected tokens of an item (the unit weight when it is unattempted). */
  expectedDen(itemId) {
    const it = this.items.get(itemId);
    if (it.blanks) return it.blanks.reduce((a, b) => a + tokenize(this.T.get(b.targetId).surface).length, 0);
    if (it.spans) return it.type === "target_detection" ? it.spans.filter((s) => s.role === "candidate").length : 1;
    return (it.sentenceIds ?? [it.sentenceId]).reduce((a, s) => a + tokenize(this.S.get(s).cleanText).length, 0);
  }
}

// ------------------------------------------------------------------ Answer Spotter (C9)
const LABELS = { ai_authored_practice: "AI-authored practice (not an official Cambridge question)", teacher_authored_practice: "Teacher-authored practice" };
export function claimOk(c) { return !!c && typeof c === "object" && Array.isArray(c.claims) && c.claims.length > 0 && Number.isInteger(c.questionNumber) && c.evidenceStatus === "official_source_confirmed" && c.rightsAttested === true && c.attestedByRole === "teacher" && !!c.attestedAt && !!c.sourceNote; }
export function provenanceLabel(item) {
  if (item.origin === "official_paper_transcribed") { const ok = claimOk(item.officialClaim); return { isOfficial: ok, label: ok ? "Official (verified source, rights attested)" : "Invalid provenance" }; }
  return { isOfficial: false, label: LABELS[item.origin] };
}
export function validateAnswerSpotterItem(item, lesson = {}) {
  const act = item.activity, mode = item.responseMode;
  if (act === "independent_listening" && mode === "select_span_in_text") return { valid: false, code: "E-AS-MODE-VISIBILITY" };
  if (act === "post_check_transcript_review" && mode !== "select_span_in_text") return { valid: false, code: "E-AS-MODE-VISIBILITY" };
  if (act === "post_check_transcript_review" && !(lesson.itemIds ?? []).includes(item.pairedIndependentItemId)) return { valid: false, code: "E-AS-REVIEW-PAIR" };
  if (mode === "choose_option" && item.spans.length < 2) return { valid: false, code: "E-AS-OPTIONS" };
  if ((item.origin === "official_paper_transcribed") !== Object.prototype.hasOwnProperty.call(item, "officialClaim") || (item.origin === "official_paper_transcribed" && !claimOk(item.officialClaim))) return { valid: false, code: "E-AS-ORIGIN-CLAIM" };
  return { valid: true };
}
const eqTok = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
const hasTok = (list, t) => list.some((x) => eqTok(x, t));
export function scoreAnswerSpotter(lesson, inp) {
  const it = inp.item ?? lesson.items.get(inp.itemId); const resp = inp.response; const spans = it.spans; const fmt = it.answerFormat ?? {};
  const variants = (s) => [tokenize(s.span.surface), ...lesson.approved(s.acceptedForms).map((f) => tokenize(f.text))];
  if (it.activity === "post_check_transcript_review") {
    const cands = spans.map((s) => tokenize(s.span.surface)); const sel = resp.selected.map(tokenize); const used = new Set(); let m = 0;
    for (const s of sel) for (let k = 0; k < cands.length; k++) if (!used.has(k) && eqTok(s, cands[k])) { used.add(k); m++; break; }
    return { reviewed: true, reviewMatches: m, reviewDen: Math.max(cands.length, sel.length), independentCredit: false, masteryEvidence: "none" };
  }
  if (it.responseMode === "choose_option") {
    const ch = tokenize(resp.chosen ?? ""); if (!ch.length) return { rejected: "empty_answer" }; // D-12: an empty choice is not an attempt
    const cor = spans.filter((s) => s.role === "correct_answer").map((s) => tokenize(s.span.surface)); const dis = spans.filter((s) => s.role === "distractor").map((s) => tokenize(s.span.surface));
    const ok = hasTok(cor, ch); const r = { correct: ok, num: ok ? 1 : 0, den: 1 }; if (hasTok(dis, ch)) r.distractorChosen = true; return r;
  }
  if (it.type === "target_detection") {
    const parts = resp.text.split(/[,;\n]/).filter((p) => tokenize(p).length); if (!parts.length) return { rejected: "empty_answer" };
    const cands = spans.filter((s) => s.role === "candidate").map(variants); const used = new Set(); let m = 0;
    for (const p of parts) { const t = tokenize(p); for (let k = 0; k < cands.length; k++) if (!used.has(k) && hasTok(cands[k], t)) { used.add(k); m++; break; } }
    return { correct: m === cands.length && parts.length === cands.length, num: m, den: Math.max(cands.length, parts.length) };
  }
  const toks = tokenize(resp.text); if (!toks.length) return { rejected: "empty_answer" };
  if (fmt.maxWords && toks.length > fmt.maxWords) return { correct: false, rejected: "exceeds_word_limit", num: 0, den: 1 };
  if (fmt.numberAllowed === false && toks.some((t) => /\p{Nd}/u.test(t))) return { correct: false, rejected: "number_not_allowed", num: 0, den: 1 };
  const cor = spans.filter((s) => s.role === "correct_answer").flatMap(variants); const dis = spans.filter((s) => s.role === "distractor").map((s) => tokenize(s.span.surface));
  const ok = hasTok(cor, toks); const r = { correct: ok, num: ok ? 1 : 0, den: 1 }; if (hasTok(dis, toks)) r.distractorChosen = true; return r;
}
/**
 * v1.1 review gate (owner policy; replaces D-28 and the document setting postCheckReviewUnlock, which is now ignored).
 * Free practice: review of an item opens after a valid (non-empty, non-rejected) Check of that item. Homework: only after the server
 * has acknowledged the submission. blockedBy: independent Answer Spotter items that share a sentence and have no valid Check yet
 * (free practice) — their answers would be disclosed by this review, so it waits (owner rule 2, "do not disclose answers to other
 * unattempted independent items").
 */
export function reviewUnlock({ mode = "free", validChecks = 0, submission = "draft", blockedBy = [] } = {}) {
  if (mode === "homework") return submission === "submitted";
  return validChecks >= 1 && blockedBy.length === 0;
}
