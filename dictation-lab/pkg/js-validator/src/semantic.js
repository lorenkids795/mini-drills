// Semantic validator (stage 2). Faithful JavaScript port of rev1-reference/dictation-semantic-validator.py (82 codes).
// Differences from Python are documented in README.md ("Known divergences"). No dependencies; runs in browsers and Node 18+.
import { CODES, DEFAULT_LIMITS, GUIDE_MIN } from "./codes.js";
import { sha256Utf8 } from "./sha256.js";
import { QRE_SRC, cpLength, utf8Length, words, hasLN, normTok, matches, cmpStr, hasLoneSurrogate, walkStrings, isDigitChar, isAlphaStr } from "./text.js";

export const VERSION = "rev1-js";
const ADVISORY = { l1: [4, 18], l3: [4, 22], l4_words: [25, 80], l4_sent: [2, 5] };
const HARD = { l1: [2, 40], l3: [2, 60], l4_words_max: 300, l4_sent: [2, 8] };
const OPEN = ["proposed_correction", "needs_audio_verification", "unresolved"];
const OPEN_INFO = [...OPEN, "info_note"];
const CUR = "£$€";
const qre = () => new RegExp(QRE_SRC, "g");
const stripQ = (s) => s.replace(qre(), "");
const startsWithAny = (s, chars) => s.length > 0 && chars.includes(s[0]);

class Report {
  constructor() { this.items = []; }
  add(code, path, msg = "") { this.items.push([code, path, msg]); }
}
function dup(items, key, r, path) {
  const seen = new Set();
  items.forEach((it, i) => { const v = it[key]; const k = v === undefined ? "\u0000undef" : v; if (seen.has(k)) r.add("E-ID-DUP", `${path}[${i}].${key}`, `duplicate ${v}`); seen.add(k); });
}
const idMap = (list, key = "id") => { const m = new Map(); for (const x of list) m.set(x[key], x); return m; };
const has = (o, k) => o !== null && typeof o === "object" && Object.prototype.hasOwnProperty.call(o, k);
const pyDict = (v) => v ?? {};

export function validateSemantic(doc, limits = null, fileBytes = null) {
  try { return validateInner(doc, limits, fileBytes); }
  catch (e) {
    if (e instanceof TypeError || e instanceof RangeError) return fatalReport(e);
    throw e;
  }
}
export function fatalReport(e) {
  return { validatorVersion: VERSION, fatal: `structure too malformed for semantic stage (${e.name}: ${e.message}); fix schema errors first`, errorCodes: ["FATAL-STRUCTURE"], warningCodes: [], infoCodes: [], errors: [], warnings: [], info: [], publicationEligibility: "invalid" };
}

function validateInner(doc, limits, fileBytes) {
  const L = { ...DEFAULT_LIMITS, ...(limits || {}) };
  const r = new Report();
  const raw = doc.rawTranscript.text; const tr = doc.transcript; const S = tr.sentences; const T = tr.turns;
  const audit = doc.audit; const ex = doc.exercises ?? {}; const st = doc.settings ?? {};
  // ---- unicode, limits, markup
  let bad = 0;
  for (const [p, s] of walkStrings(doc)) { if (hasLoneSurrogate(s)) { bad++; if (bad <= 5) r.add("E-UNICODE-INVALID", p, "lone surrogate"); } }
  if (bad) return finish(doc, r, S, new Map(), new Set(), L);
  if (fileBytes !== null && fileBytes > L.file_bytes) r.add("E-LIMIT", "$", `file bytes ${fileBytes}`);
  if (cpLength(raw) > L.raw_chars) r.add("E-LIMIT", "$.rawTranscript.text", `chars ${cpLength(raw)}`);
  if (utf8Length(raw) > L.raw_utf8_bytes) r.add("E-LIMIT", "$.rawTranscript.text", "utf8 bytes");
  for (const [k, v] of [["sentences", S], ["turns", T], ["issues", audit.issues], ["decisions", audit.decisions], ["targets", doc.learningTargets ?? []]]) {
    if (v.length > L[k]) r.add("E-LIMIT", "$." + k, `count ${v.length} > ${L[k]}`);
  }
  for (const k of ["level1", "level2", "level3", "level4", "answerSpotter"]) { if ((pyDict(ex[k]).items ?? []).length > L[k]) r.add("E-LIMIT", "$.exercises." + k, "too many items"); }
  const nfcBad = []; const markup = [];
  for (const [p, s] of walkStrings(doc)) { if (s.normalize("NFC") !== s) nfcBad.push(p); if (s.includes("<") || s.includes(">")) markup.push(p); }
  if (nfcBad.length) r.add("W-NOT-NFC", nfcBad[0], `${nfcBad.length} string(s) not NFC`);
  for (const p of markup.slice(0, 25)) r.add("W-MARKUP-LIKE-TEXT", p, "angle brackets present: data accepted, render with textContent only");
  // ---- mode / rights
  if (doc.importMode === "transcript_only") { for (const f of ["learningTargets", "exercises"]) if (has(doc, f)) r.add("E-MODE-FIELDS", "$." + f, "not allowed in transcript_only"); }
  const rights = doc.rights;
  if (doc.metadata.source.type === "cambridge_ielts" && rights.publicRedistributionAllowed) r.add("E-RIGHTS-REDISTRIBUTION", "$.rights");
  if (!rights.teacherAttestsAuthorizedUse) r.add("W-RIGHTS-UNATTESTED", "$.rights");
  // ---- raw transcript
  if (sha256Utf8(raw) !== doc.rawTranscript.sha256) r.add("E-RAW-HASH", "$.rawTranscript.sha256");
  const RL = raw.length;
  const rawslice = (sp) => (0 <= sp.start && sp.start < sp.end && sp.end <= RL ? raw.slice(sp.start, sp.end) : null);
  // ---- speakers, turns
  dup(tr.speakers, "id", r, "$.transcript.speakers"); dup(T, "id", r, "$.transcript.turns"); dup(S, "id", r, "$.transcript.sentences");
  const spk = idMap(tr.speakers); const TID = idMap(T); const SID = idMap(S);
  T.forEach((t, i) => {
    const p = `$.transcript.turns[${i}]`;
    if (t.order !== i + 1) r.add("E-ORD-TURN", p);
    if (!spk.has(t.speakerId)) { r.add("E-SPEAKER", p); return; }
    const seg = rawslice(t.rawSpan);
    if (seg === null || !seg.startsWith(spk.get(t.speakerId).rawLabel + ":")) r.add("E-TURN-SPAN", p);
  });
  // ---- sentences
  let prevEnd = 0;
  S.forEach((s, i) => {
    const p = `$.transcript.sentences[${i}]`;
    if (s.order !== i + 1) r.add("E-ORD-SENT", p);
    const seg = rawslice(s.rawSpan);
    if (seg === null || seg !== s.rawText) r.add("E-RAW-SPAN", p);
    if (s.rawSpan.start < prevEnd) r.add("E-ORD-RAW", p);
    prevEnd = s.rawSpan.end;
    if (!TID.has(s.turnId)) r.add("E-TURN-REF", p);
    else { const tsp = TID.get(s.turnId).rawSpan; if (!(tsp.start <= s.rawSpan.start && s.rawSpan.end <= tsp.end)) r.add("E-SENT-TURN-MISMATCH", p); }
    const ct = s.cleanText;
    if (s.textStatus !== "verified_corrected" && stripQ(s.rawText) !== ct) r.add("E-CLEAN-DERIV", p);
    if (/\(Q\d+\)/.test(ct) || /^\s*[A-Z][A-Z .'-]*:\s/.test(ct) || /^-{3,}/.test(ct)) r.add("E-CLEAN-METADATA-LEAK", p);
    const ts = s.timestamp;
    if (ts !== undefined && ts !== null) { if (!(ts.endSec > ts.startSec) || !doc.metadata.audio.timestampsAvailable) r.add("E-TIMESTAMP", p); }
  });
  if (!S.some((s) => has(s, "timestamp"))) r.add("W-NO-TIMESTAMPS", "$.transcript.sentences", "no sentence has a timestamp");
  // ---- section breaks
  (tr.sectionBreaks ?? []).forEach((b, i) => {
    const p = `$.transcript.sectionBreaks[${i}]`; const seg = rawslice(b.rawSpan);
    if (!SID.has(b.afterSentenceId) || seg === null || !/^-{3,}$/.test(seg)) { r.add("E-BREAK-SPAN", p); return; }
    const a = SID.get(b.afterSentenceId); const nxt = a.order < S.length ? S[a.order] : null;
    if (b.rawSpan.start < a.rawSpan.end || (nxt && b.rawSpan.end > nxt.rawSpan.start)) r.add("E-BREAK-SPAN", p, "not between sentences");
  });
  // ---- q markers
  const QMlist = tr.qMarkers ?? []; const QM = idMap(QMlist); dup(QMlist, "id", r, "$.transcript.qMarkers");
  let last = 0;
  QMlist.forEach((q, i) => {
    const p = `$.transcript.qMarkers[${i}]`; const s = SID.get(q.sentenceId);
    if (s === undefined || !(s.qMarkerIds ?? []).includes(q.id)) { r.add("E-QMARKER-REF", p); return; }
    const seg = rawslice(q.rawSpan); const sp_ = q.rawSpan; const ss = s.rawSpan;
    if (seg !== `(Q${q.number})` || !(ss.start <= sp_.start && sp_.end <= ss.end)) { r.add("E-QMARKER-SPAN", p); return; }
    const rel = s.rawText.slice(0, sp_.end - ss.start);
    if (s.textStatus !== "verified_corrected" && stripQ(rel).length !== q.cleanTextOffset) r.add("E-QMARKER-OFFSET", p);
    if (q.cleanTextOffset > s.cleanText.length) r.add("E-QMARKER-OFFSET", p, "beyond cleanText");
    if (q.number <= last) r.add("E-QMARKER-ORDER", p);
    last = q.number;
    if (has(q, "officialQuestionText") && !rights.teacherAttestsAuthorizedUse) r.add("E-OFFICIAL-RIGHTS", p, "officialQuestionText without attestation");
  });
  S.forEach((s, i) => { for (const qid of s.qMarkerIds ?? []) { if (!QM.has(qid) || QM.get(qid).sentenceId !== s.id) r.add("E-QMARKER-REF", `$.transcript.sentences[${i}].qMarkerIds`, qid); } });
  if (has(tr, "fullCleanText")) {
    const full = T.map((t) => S.filter((s) => s.turnId === t.id).map((s) => s.cleanText).join(" ")).join("\n");
    if (full !== tr.fullCleanText) r.add("E-FULLTEXT", "$.transcript.fullCleanText");
  }
  const ctx = { doc, L, r, raw, tr, S, T, audit, ex, st, rights, rawslice, spk, TID, SID, QM, ISS: null };
  return validateRest(ctx);
}

const DEC_WANT = { apply_proposal: "approved", apply_custom_text: "approved", keep_original: "approved", dismiss: "dismissed", mark_unresolved: "unresolved", exclude_sentence: "unresolved" };
const sorted3 = (items) => {
  const seen = new Map();
  for (const t of items) seen.set(JSON.stringify(t), t);
  return [...seen.values()].sort((a, b) => cmpStr(a[0], b[0]) || cmpStr(a[1], b[1]) || cmpStr(a[2], b[2]));
};

function validateRest(ctx) {
  const { doc, L, r, tr, S, audit, ex, st, rights, rawslice, SID, TID, QM } = ctx;
  const ISS = idMap(audit.issues); dup(audit.issues, "id", r, "$.audit.issues"); dup(audit.decisions, "id", r, "$.audit.decisions");
  const openIssues = audit.issues.filter((x) => OPEN.includes(x.status));
  const st_ = audit.auditState;
  if (st_ === "audited_open_issues" && !openIssues.length) r.add("E-AUDITSTATE", "$.audit.auditState", "no open issue");
  if (st_ === "audited_no_open_issues" && openIssues.length) r.add("E-AUDITSTATE", "$.audit.auditState", "open issues exist");
  if (st_ === "not_audited" && audit.issues.some((x) => x.status !== "safe_cleanup")) r.add("E-AUDITSTATE", "$.audit.auditState", "non-cleanup issues but not_audited");
  if (st_ === "not_audited") r.add("W-NOT-AUDITED", "$.audit.auditState");
  const blocked = new Set(); const openSpans = [];
  audit.issues.forEach((x, i) => {
    const p = `$.audit.issues[${i}]`; const seg = rawslice(x.rawSpan);
    if (seg === null || seg !== x.sourceQuote) r.add("E-ISSUE-SPAN", p);
    for (const sid of x.affectedSentenceIds) if (!SID.has(sid)) r.add("E-ISSUE-REF", p, sid);
    for (const qid of x.affectedQMarkerIds ?? []) if (!QM.has(qid)) r.add("E-ISSUE-REF", p, qid);
    if (has(x, "cleanSpan")) {
      const c = x.cleanSpan; const s = SID.get(c.sentenceId);
      if (s === undefined) r.add("E-ISSUE-REF", p, c.sentenceId);
      else {
        const got = s.cleanText.slice(c.start, c.end);
        if (OPEN_INFO.includes(x.status) && got !== x.sourceQuote) r.add("E-ISSUE-CLEANSPAN", p);
        if (OPEN.includes(x.status)) openSpans.push([c.sentenceId, c.start, c.end, x]);
      }
    }
    if (OPEN.includes(x.status) && x.blocksScoredUse) for (const id of x.affectedSentenceIds) blocked.add(id);
  });
  // decisions: latest per issue (by decidedAt then list order)
  const latest = new Map();
  audit.decisions.forEach((d, i) => {
    const p = `$.audit.decisions[${i}]`;
    if (!ISS.has(d.issueId)) { r.add("E-DECISION-REF", p); return; }
    const key = [d.decidedAt, i]; const cur = latest.get(d.issueId);
    if (cur === undefined || cmpStr(key[0], cur[0][0]) > 0 || (cmpStr(key[0], cur[0][0]) === 0 && key[1] >= cur[0][1])) latest.set(d.issueId, [key, d, p]);
    const iss = ISS.get(d.issueId);
    if (["apply_proposal", "apply_custom_text", "keep_original"].includes(d.action) && !["teacher_confirmed_by_audio", "official_source_confirmed"].includes(d.evidenceStatus)) r.add("E-DECISION-EVIDENCE", p, "no confirmed evidence");
    if (d.action === "apply_proposal" && (d.finalText ?? null) !== (iss.proposedReplacement ?? null)) r.add("E-DECISION-EVIDENCE", p, "finalText differs from proposedReplacement");
  });
  for (const [iid, [, d, p]] of latest) {
    const iss = ISS.get(iid); const act = d.action; const want = DEC_WANT[act];
    if (want === undefined) throw new TypeError("KeyError: " + act);
    if (iss.status !== want) r.add("E-DECISION-STATE", p, `issue status ${iss.status} but latest decision implies ${want}`);
    if (["apply_proposal", "apply_custom_text", "keep_original"].includes(act) && iss.evidenceStatus !== d.evidenceStatus) r.add("E-DECISION-STATE", p, "issue evidence differs from decision");
    for (const sid of iss.affectedSentenceIds) {
      const s = SID.get(sid); if (s === undefined) continue;
      if (act === "apply_proposal" || act === "apply_custom_text") {
        const basis = d.evidenceStatus === "teacher_confirmed_by_audio" ? "audio_confirmed_correction" : "official_transcript_correction";
        if (s.textStatus !== "verified_corrected" || s.provenance.cleanTextBasis !== basis || !s.cleanText.includes(d.finalText ?? "\u0000")) r.add("E-DECISION-STATE", p, `sentence ${sid} does not reflect applied correction`);
      }
      if (act === "keep_original" && s.textStatus !== "verified_unchanged") r.add("E-DECISION-STATE", p, `sentence ${sid} should be verified_unchanged`);
      if (act === "exclude_sentence" && s.enabled) r.add("E-DECISION-STATE", p, `sentence ${sid} should be disabled`);
    }
  }
  audit.issues.forEach((x, i) => { if (x.status === "approved" && !latest.has(x.id)) r.add("E-DECISION-EVIDENCE", `$.audit.issues[${i}]`, "approved without a recorded decision"); });
  S.forEach((s, i) => { if ((s.textStatus === "pending_verification") !== blocked.has(s.id)) r.add("E-BLOCK-CONSISTENCY", `$.transcript.sentences[${i}]`); });
  // ---- selection
  (pyDict(doc.selection).disabledReasons ?? []).forEach((d, i) => { const s = SID.get(d.sentenceId); if (s === undefined || s.enabled) r.add("E-SELECTION-STATE", `$.selection.disabledReasons[${i}]`); });
  // ---- settings ranges
  for (const [lv, [a, b]] of [["level1", ["minTiles", "maxTiles"]], ["level3", ["minWords", "maxWords"]], ["level4", ["minSentences", "maxSentences"]], ["level4", ["minWords", "maxWords"]]]) {
    const o = pyDict(st[lv]); if (has(o, a) && has(o, b) && o[a] > o[b]) r.add("E-SETTINGS-RANGE", "$.settings." + lv, a);
  }
  const g = pyDict(st.sessionGuidelines);
  for (const [lv, v] of Object.entries(g)) if (v.min > v.max) r.add("E-SETTINGS-RANGE", "$.settings.sessionGuidelines." + lv);
  // ---- targets
  const targetsList = doc.learningTargets ?? []; const TG = idMap(targetsList); dup(targetsList, "id", r, "$.learningTargets");
  Object.assign(ctx, { ISS, blocked, openSpans, TG });
  return validateExercises(ctx);
}

function validateExercises(ctx) {
  const { doc, r, S, st, ex, SID, TID, QM, TG, audit, rights, blocked, openSpans, tr } = ctx;
  const sentOk = (sid, p) => {
    const s = SID.get(sid);
    if (s === undefined) { r.add("E-REF-MISSING", p, sid); return null; }
    if (!s.enabled) r.add("E-REF-DISABLED", p, sid);
    if (blocked.has(sid) || s.textStatus === "pending_verification") r.add("E-REF-BLOCKED", p, sid);
    return s;
  };
  const checkSpan = (surface, a, b, ct, occ) => {
    if (ct.slice(a, b) !== surface) return "span";
    const m = matches(ct, surface); const k = m.indexOf(a);
    if (k < 0 || k + 1 !== occ) return "occ";
    return null;
  };
  const checkForms = (forms, surface, p) => {
    for (const f of forms) {
      const k = f.kind;
      if (k === "contraction_equivalent" && !/['\u2019]/.test(surface)) r.add("E-FORM-INVALID", p, "contraction form on span without apostrophe");
      if (k === "symbol_optional" && !(surface && startsWithAny(surface, CUR))) r.add("E-FORM-INVALID", p, "symbol_optional needs a currency symbol");
      if (k === "numeral_word_equivalent" && ![...surface].some(isDigitChar) && !isAlphaStr(surface)) r.add("E-FORM-INVALID", p, "numeral form on non-number span");
    }
  };
  (doc.learningTargets ?? []).forEach((t, i) => {
    const p = `$.learningTargets[${i}]`; const s = SID.get(t.sentenceId);
    if (s === undefined) { r.add("E-REF-MISSING", p, t.sentenceId); return; }
    const bad_ = checkSpan(t.surface, t.charStart, t.charEnd, s.cleanText, t.occurrence);
    if (bad_ === "span") r.add("E-TARGET-SPAN", p); else if (bad_ === "occ") r.add("E-TARGET-OCC", p);
    for (const [sid, a, b, x] of openSpans) if (sid === t.sentenceId && a < t.charEnd && t.charStart < b) r.add("E-TARGET-OPEN-ISSUE", p, x.id);
    if (t.focusTypes.includes("proper_noun_spelling") && audit.issues.some((x) => x.issueClass === "proper_noun" && OPEN_INFO.includes(x.status) && x.affectedSentenceIds.includes(t.sentenceId))) r.add("E-TARGET-PROPERN", p);
    checkForms(t.allowedForms ?? [], t.surface, p);
    if ([...t.surface].some(isDigitChar) || (t.surface && startsWithAny(t.surface, CUR))) { if (!(t.allowedForms ?? []).length) r.add("W-NUMERIC-NO-ALLOWED-FORMS", p, t.id); }
  });
  const levelHdr = (lv) => { const items = pyDict(ex[lv]).items ?? []; dup(items, "id", r, `$.exercises.${lv}.items`); return items; };
  const excStatus = (it, crossings, p, code) => {
    const e = it.lengthException;
    if (crossings.size) {
      const covered = e !== undefined && e !== null && (e.kind === "advisory_both" || (crossings.has("words") && e.kind === "advisory_word_count" && !crossings.has("sentences")) || (crossings.has("sentences") && e.kind === "advisory_sentence_count" && !crossings.has("words")));
      const label = [...crossings].sort().join(",");
      if (covered) r.add("I-LENGTH-EXCEPTION-APPROVED", p, label); else r.add(code, p, label);
    } else if (e !== undefined && e !== null) r.add("W-EXCEPTION-UNUSED", p);
  };
  const orderCheck = (items, key, lv) => {
    let lastn = 0;
    items.forEach((it, i) => {
      const ids = Array.isArray(it[key]) ? it[key] : [it[key]];
      if (ids.length && SID.has(ids[0])) { const o = SID.get(ids[0]).order; if (o < lastn) r.add("E-REF-ORDER", `$.exercises.${lv}.items[${i}]`); lastn = o; }
    });
  };
  const uses = new Map(); const addUse = (sid, lv) => { if (!uses.has(sid)) uses.set(sid, new Set()); uses.get(sid).add(lv); };
  // L1
  const s1 = pyDict(st.level1); const lo1 = s1.minTiles ?? ADVISORY.l1[0], hi1 = s1.maxTiles ?? ADVISORY.l1[1]; const maxd = s1.maxDistractorsPerItem ?? 2;
  let items = levelHdr("level1");
  items.forEach((it, i) => {
    const p = `$.exercises.level1.items[${i}]`; const s = sentOk(it.sentenceId, p); if (s === null) return;
    addUse(s.id, "level1"); const toks = words(s.cleanText); const n = toks.length;
    if (n < HARD.l1[0] || n > HARD.l1[1]) r.add("E-L1-HARD-LEN", p, `tiles=${n}`);
    else excStatus(it, new Set(n < lo1 || n > hi1 ? ["words"] : []), p, "W-L1-LEN");
    const nt = new Set(toks.map(normTok));
    for (const d of it.distractors ?? []) if (nt.has(normTok(d.text))) r.add("E-L1-DISTRACTOR-IN-SENTENCE", p, d.text);
    if ((it.distractors ?? []).length > maxd) r.add("W-L1-DISTRACTOR-COUNT", p);
  });
  orderCheck(items, "sentenceId", "level1");
  // L2
  const maxh = pyDict(st.level2).maxHiddenWords ?? 2;
  items = levelHdr("level2");
  items.forEach((it, i) => {
    const p = `$.exercises.level2.items[${i}]`; const s = sentOk(it.sentenceId, p); if (s === null) return;
    addUse(s.id, "level2"); let tot = 0; const spans = []; const seen = new Set();
    for (const b of it.blanks) {
      const t = TG.get(b.targetId);
      if (t === undefined) { r.add("E-REF-MISSING", p, b.targetId); continue; }
      if (seen.has(b.targetId)) r.add("E-BLANK-OVERLAP", p, "repeated target");
      seen.add(b.targetId);
      if (t.sentenceId !== it.sentenceId) r.add("E-L2-TARGET-SENT", p, t.id);
      tot += words(t.surface).length; spans.push([t.charStart, t.charEnd]);
      if ((t.warnings ?? []).includes("syntax_determinable")) r.add("W-SYNTAX-DET", p, t.id);
    }
    if (tot > maxh) r.add("E-L2-HIDDEN-LIMIT", p, `hidden=${tot}`);
    spans.sort((x, y) => x[0] - y[0] || x[1] - y[1]);
    for (let k = 0; k + 1 < spans.length; k++) if (spans[k][1] > spans[k + 1][0]) r.add("E-BLANK-OVERLAP", p);
  });
  orderCheck(items, "sentenceId", "level2");
  // L3
  const s3 = pyDict(st.level3); const lo3 = s3.minWords ?? ADVISORY.l3[0], hi3 = s3.maxWords ?? ADVISORY.l3[1];
  items = levelHdr("level3");
  items.forEach((it, i) => {
    const p = `$.exercises.level3.items[${i}]`; const s = sentOk(it.sentenceId, p); if (s === null) return;
    addUse(s.id, "level3"); const n = words(s.cleanText).length;
    if (n < HARD.l3[0] || n > HARD.l3[1]) r.add("E-L3-HARD-LEN", p, `words=${n}`);
    else excStatus(it, new Set(n < lo3 || n > hi3 ? ["words"] : []), p, "W-L3-LEN");
  });
  orderCheck(items, "sentenceId", "level3");
  Object.assign(ctx, { sentOk, checkSpan, checkForms, levelHdr, excStatus, orderCheck, uses, addUse });
  return validateLevel4AndSpotter(ctx);
}

function validateLevel4AndSpotter(ctx) {
  const { doc, L, r, S, st, ex, SID, TID, QM, TG, rights, blocked, tr, sentOk, checkSpan, checkForms, levelHdr, excStatus, orderCheck, uses, addUse } = ctx;
  // L4
  const s4 = pyDict(st.level4); const lw4 = s4.minWords ?? ADVISORY.l4_words[0], hw4 = s4.maxWords ?? ADVISORY.l4_words[1];
  const ls4 = s4.minSentences ?? ADVISORY.l4_sent[0], hs4 = s4.maxSentences ?? ADVISORY.l4_sent[1]; const allowMulti = s4.allowMultiSpeaker ?? true;
  const items = levelHdr("level4"); const brk = new Map(); for (const b of tr.sectionBreaks ?? []) brk.set(b.afterSentenceId, b);
  items.forEach((it, i) => {
    const p = `$.exercises.level4.items[${i}]`; const ids = it.sentenceIds; let ok = true;
    for (const sid of ids) { const s = sentOk(sid, p); if (s === null) ok = false; else addUse(sid, "level4"); }
    if (!ok) return;
    const ords = ids.map((x) => SID.get(x).order);
    if (!ords.every((o, k) => o === ords[0] + k)) r.add("E-L4-CONTIG", p);
    for (const x of ids.slice(0, -1)) if (brk.has(x) && brk.get(x).continuityAcrossBreak !== "confirmed_continuous") r.add("E-L4-BREAK", p, x);
    const spkset = new Set(); for (const x of ids) if (TID.has(SID.get(x).turnId)) spkset.add(TID.get(SID.get(x).turnId).speakerId);
    if (spkset.size > 1 && (!it.multiSpeaker || !allowMulti)) r.add("E-L4-MULTISPEAKER", p);
    if (spkset.size === 1 && it.multiSpeaker) r.add("E-L4-MULTISPEAKER", p, "flagged multiSpeaker but one speaker");
    const nw = ids.reduce((a, x) => a + words(SID.get(x).cleanText).length, 0); const ns = ids.length;
    if (ns < HARD.l4_sent[0] || ns > HARD.l4_sent[1] || nw > HARD.l4_words_max) { r.add("E-L4-HARD-SIZE", p, `sentences=${ns} words=${nw}`); return; }
    const cross = new Set(); if (nw < lw4 || nw > hw4) cross.add("words"); if (ns < ls4 || ns > hs4) cross.add("sentences");
    excStatus(it, cross, p, "W-L4-LEN");
  });
  orderCheck(items, "sentenceIds", "level4");
  for (const [sid, lvs] of uses) if (lvs.size > 1) r.add("W-REUSE", "$.exercises", `${sid}: ${[...lvs].sort().join(",")}`);
  // ---- Answer Spotter
  const AS = levelHdr("answerSpotter"); const ASID = idMap(AS);
  const show = pyDict(st.answerSpotter).showTranscriptDuringTask ?? false;
  let approvedFormsNeeded = 0;
  AS.forEach((it, i) => {
    const p = `$.exercises.answerSpotter.items[${i}]`; const ev = it.evidenceSentenceIds; let ok = true;
    for (const sid of ev) if (sentOk(sid, p) === null) ok = false;
    if (ok) { const o = ev.map((x) => SID.get(x).order); const so = [...o].sort((a, b) => a - b); if (!o.every((v, k) => v === so[k])) r.add("E-REF-ORDER", p, "evidence not ascending"); }
    const act = it.activity, mode = it.responseMode;
    if ((mode === "select_span_in_text" && act === "independent_listening") || (act === "independent_listening" && show) || (act === "post_check_transcript_review" && mode !== "select_span_in_text"))
      r.add("E-AS-MODE-VISIBILITY", p, `activity=${act} mode=${mode} showTranscriptDuringTask=${show ? "True" : "False"}`);
    if (act === "post_check_transcript_review") {
      const pr = ASID.get(it.pairedIndependentItemId);
      if (pr === undefined || pr.id === it.id || pr.activity !== "independent_listening" || !pr.evidenceSentenceIds.some((x) => ev.includes(x))) r.add("E-AS-REVIEW-PAIR", p);
    }
    if (mode === "choose_option" && it.spans.length < 2) r.add("E-AS-OPTIONS", p);
    if (it.type === "independent_answer_hunt") r.add("W-RESERVED-TYPE", p);
    const fmt = it.answerFormat; const ansSentences = new Set();
    it.spans.forEach((sp, j) => {
      const sq = `${p}.spans[${j}]`; const s = sp.span; const sen = SID.get(s.sentenceId);
      if (!ev.includes(s.sentenceId)) r.add("E-AS-SCOPE", sq);
      if (sen === undefined) { r.add("E-REF-MISSING", sq, s.sentenceId); return; }
      const res = checkSpan(s.surface, s.charStart, s.charEnd, sen.cleanText, s.occurrence);
      if (res === "span") r.add("E-AS-SPAN", sq); else if (res === "occ") r.add("E-AS-OCC", sq);
      if (sp.role === "correct_answer" || sp.role === "candidate") ansSentences.add(s.sentenceId);
      const forms = sp.acceptedForms ?? [];
      checkForms(forms, s.surface, sq);
      approvedFormsNeeded += forms.filter((f) => (f.approvalState ?? "proposed") !== "teacher_approved").length;
      if (([...s.surface].some(isDigitChar) || startsWithAny(s.surface, CUR)) && (sp.role === "correct_answer" || sp.role === "candidate") && !forms.length) r.add("W-NUMERIC-NO-ALLOWED-FORMS", sq);
      if (fmt && Object.keys(fmt).length && (sp.role === "correct_answer" || sp.role === "candidate")) {
        if (words(s.surface).length > fmt.maxWords) r.add("E-AS-WORDLIMIT", sq);
        for (const f of forms) if (words(f.text).length > fmt.maxWords) r.add("E-AS-WORDLIMIT-ALT", sq, f.text);
      }
    });
    const rel = it.relatedQMarkerIds ?? [];
    for (const qid of rel) {
      if (!QM.has(qid)) { r.add("E-AS-QMARKER-REF", p, qid); continue; }
      if (!ansSentences.has(QM.get(qid).sentenceId)) { r.add("W-QMARKER-ANSWER-DISTANCE", p, qid); if (!it.markerRelationNote) r.add("E-AS-MARKER-NOTE-MISSING", p, qid); }
    }
    if (it.origin === "official_paper_transcribed") {
      const c = it.officialClaim;
      if (c === undefined || c === null) r.add("E-AS-ORIGIN-CLAIM", p, "official origin without officialClaim");
      else {
        if (!rights.teacherAttestsAuthorizedUse) r.add("E-OFFICIAL-RIGHTS", p);
        const mk = rel.filter((q) => QM.has(q) && QM.get(q).number === c.questionNumber).map((q) => QM.get(q));
        if (!mk.length) r.add("E-AS-ORIGIN-CLAIM", p, `no related marker with number ${c.questionNumber}`);
        else if (c.claims.includes("question_text") && !has(mk[0], "officialQuestionText")) r.add("E-AS-ORIGIN-CLAIM", p, "question_text claim but marker has no officialQuestionText");
      }
    } else if (has(it, "officialClaim")) r.add("E-AS-ORIGIN-CLAIM", p, "officialClaim on non-official origin");
  });
  orderCheck(AS, "evidenceSentenceIds", "answerSpotter");
  for (const t of doc.learningTargets ?? []) if (uses.has(t.sentenceId)) approvedFormsNeeded += (t.allowedForms ?? []).filter((f) => (f.approvalState ?? "proposed") !== "teacher_approved").length;
  if (approvedFormsNeeded) r.add("W-FORMS-UNAPPROVED", "$", `${approvedFormsNeeded} answer-set entries not teacher_approved`);
  // ---- quotas (guidelines only)
  const g = pyDict(st.sessionGuidelines);
  for (const [lv, mn0] of Object.entries(GUIDE_MIN)) {
    if (has(ex, lv)) { const mn = pyDict(g[lv]).min ?? mn0; if (ex[lv].items.length < mn) r.add("W-QUOTA-LOW", "$.exercises." + lv, `${ex[lv].items.length} < ${mn}`); }
  }
  return finish(doc, r, S, uses, blocked, L);
}

function finish(doc, r, S, uses, blocked, L) {
  const E = "error", W = "warning", I = "info";
  const errs = sorted3(r.items.filter(([c]) => CODES[c][0] === E)); const warns = sorted3(r.items.filter(([c]) => CODES[c][0] === W)); const infos = sorted3(r.items.filter(([c]) => CODES[c][0] === I));
  const codes = new Set(r.items.map(([c]) => c)); const ex = doc.exercises ?? {}; const audit = doc.audit ?? {};
  const referencedBlocked = errs.some(([c]) => c === "E-REF-BLOCKED");
  let gate;
  if (audit.auditState === "not_audited") gate = "GATE_NOT_AUDITED"; else if (referencedBlocked) gate = "GATE_BLOCKED"; else if (blocked.size) gate = "GATE_PASS_WITH_EXCLUSIONS"; else gate = "GATE_PASS";
  const reasons = []; let elig;
  if (errs.length) elig = "invalid";
  else {
    if (codes.has("W-NOT-AUDITED")) reasons.push("R-NOT-AUDITED");
    if (codes.has("W-RIGHTS-UNATTESTED")) reasons.push("R-RIGHTS-UNATTESTED");
    if (["W-L1-LEN", "W-L3-LEN", "W-L4-LEN"].some((c) => codes.has(c))) reasons.push("R-LENGTH-EXCEPTION-APPROVAL-NEEDED");
    if (codes.has("W-FORMS-UNAPPROVED")) reasons.push("R-ANSWER-SETS-UNAPPROVED");
    elig = reasons.length ? "requires_teacher_action" : "eligible_for_teacher_preview";
  }
  const cnt = (lv) => (pyDict(ex[lv]).items ?? []).length; const uniq = (a) => [...new Set(a)].sort(cmpStr); const toObj = (a) => a.map(([code, path, message]) => ({ code, path, message }));
  return {
    validatorVersion: VERSION, schemaVersion: doc.schemaVersion, importMode: doc.importMode,
    counts: { sentences: S.length, enabledSentences: S.filter((s) => s.enabled).length, blockedSentences: blocked.size, level1: cnt("level1"), level2: cnt("level2"), level3: cnt("level3"), level4: cnt("level4"), answerSpotter: cnt("answerSpotter"), errors: errs.length, warnings: warns.length, info: infos.length },
    errors: toObj(errs), warnings: toObj(warns), info: toObj(infos),
    errorCodes: uniq(errs.map((x) => x[0])), warningCodes: uniq(warns.map((x) => x[0])), infoCodes: uniq(infos.map((x) => x[0])),
    blockedSentenceIds: [...blocked].sort(cmpStr), gate, publicationEligibility: elig, eligibilityReasons: reasons,
    disclaimer: "Eligibility is advisory. Teacher Preview approval, audio/official-source verification of open audit issues, and safe UI rendering are outside this validator. A clean result does not prove the transcript matches any audio.",
  };
}
