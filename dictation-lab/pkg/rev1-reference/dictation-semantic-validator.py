#!/usr/bin/env python3
"""
dictation-semantic-validator.py  (revision 1)

Independent QA scaffolding for the Mini Drills Dictation Lab import contract (schemaVersion 1.1).
NOT production code: Codex implements the production JavaScript validator and must agree with this one
on the test vectors in tests/js_parity_vectors.json and on the expected outcomes in tests/expected_manifest.json.

Stages:  (1) JSON Schema 2020-12 (optional, needs `pip install jsonschema`)  (2) semantic validation (this file, stdlib only)
         (3) teacher/audio verification: NOT automatable. A clean report never proves the transcript matches any audio.

Usage:   python dictation-semantic-validator.py FILE.json [--schema dictation-schema-v1.json] [--json] [--limits LIMITS.json]
         python dictation-semantic-validator.py --list-codes
Exit:    0 no semantic errors (and schema valid when checked), 1 errors, 2 usage or I/O problem.

Coordinates: every offset in the contract is a half-open range in UTF-16 code units (JavaScript String.slice units).
Python indexes by code point, so this file converts explicitly (u16slice, u16len, cp_to_u16).
SHA-256 is over the UTF-8 bytes of rawTranscript.text. Stored text is never normalised; NFC is only reported (W-NOT-NFC).
Safe rendering: angle brackets are legal data. This validator only reports W-MARKUP-LIKE-TEXT (informational).
Validation does NOT provide XSS protection; the UI must render with textContent, never innerHTML.
"""
import json, re, sys, hashlib, argparse, unicodedata

VERSION = "rev1"

# ---------------------------------------------------------------- code registry (every code is implemented here unless noted)
E, W, I = "error", "warning", "info"
CODES = {
 "E-UNICODE-INVALID": (E, "String is not valid Unicode text (lone surrogate or unencodable)"),
 "E-LIMIT": (E, "Configured import limit exceeded"),
 "E-ID-DUP": (E, "Duplicate id inside one collection"),
 "E-MODE-FIELDS": (E, "Field not allowed for this importMode"),
 "E-RIGHTS-REDISTRIBUTION": (E, "Cambridge source with publicRedistributionAllowed = true"),
 "E-RAW-HASH": (E, "rawTranscript.sha256 does not match UTF-8 bytes of text"),
 "E-RAW-SPAN": (E, "rawSpan outside text or rawText differs from the raw slice"),
 "E-ORD-TURN": (E, "turns[].order is not 1..n"),
 "E-ORD-SENT": (E, "sentences[].order is not 1..n"),
 "E-ORD-RAW": (E, "Sentence rawSpans are not in strictly increasing raw order"),
 "E-TURN-SPAN": (E, "Turn rawSpan invalid or does not start with its speaker label"),
 "E-TURN-REF": (E, "Sentence references a missing turn"),
 "E-SPEAKER": (E, "Turn references a missing speaker"),
 "E-SENT-TURN-MISMATCH": (E, "Sentence rawSpan lies outside its turn rawSpan"),
 "E-CLEAN-DERIV": (E, "cleanText is not raw text minus (Qn) markers for an unverified-edit sentence (silent correction)"),
 "E-CLEAN-METADATA-LEAK": (E, "Speaker label, (Qn) marker or section separator inside cleanText"),
 "E-FULLTEXT": (E, "fullCleanText differs from canonical join"),
 "E-QMARKER-SPAN": (E, "qMarker rawSpan does not slice to (Qn) inside its sentence"),
 "E-QMARKER-REF": (E, "qMarker and sentence.qMarkerIds disagree or sentence missing"),
 "E-QMARKER-OFFSET": (E, "cleanTextOffset differs from the offset recomputed from raw text"),
 "E-QMARKER-ORDER": (E, "Marker numbers are not strictly increasing in audio order"),
 "E-BREAK-SPAN": (E, "sectionBreak rawSpan is not a separator line placed after afterSentenceId"),
 "E-TIMESTAMP": (E, "Invalid timestamp or timestamps present while timestampsAvailable is false"),
 "E-ISSUE-SPAN": (E, "Issue sourceQuote differs from rawSpan slice"),
 "E-ISSUE-CLEANSPAN": (E, "Issue cleanSpan does not slice to the expected text"),
 "E-ISSUE-REF": (E, "Issue references a missing sentence or marker"),
 "E-AUDITSTATE": (E, "auditState inconsistent with issues"),
 "E-BLOCK-CONSISTENCY": (E, "pending_verification does not match open blocking issues"),
 "E-DECISION-REF": (E, "Decision references a missing issue"),
 "E-DECISION-EVIDENCE": (E, "Approved or applied decision lacks confirmed evidence, or finalText does not match"),
 "E-DECISION-STATE": (E, "Issue/sentence state does not match the latest decision"),
 "E-TARGET-SPAN": (E, "Target surface differs from cleanText slice"),
 "E-TARGET-OCC": (E, "Target occurrence differs from recomputed whole-token rank"),
 "E-TARGET-OPEN-ISSUE": (E, "Target overlaps an open issue span"),
 "E-TARGET-PROPERN": (E, "proper_noun_spelling target on a sentence with unresolved proper-noun issue"),
 "E-FORM-INVALID": (E, "allowedForms/acceptedForms kind does not fit the span"),
 "E-REF-MISSING": (E, "Reference to a missing sentence, target or item"),
 "E-REF-DISABLED": (E, "Exercise references a disabled sentence"),
 "E-REF-BLOCKED": (E, "Exercise references a pending_verification or blocked sentence"),
 "E-REF-ORDER": (E, "Items are not in audio order"),
 "E-SETTINGS-RANGE": (E, "settings min greater than max"),
 "E-L1-HARD-LEN": (E, "Level 1 tile count outside hard bounds 2..40"),
 "E-L1-DISTRACTOR-IN-SENTENCE": (E, "Distractor already occurs in the sentence"),
 "E-L2-TARGET-SENT": (E, "Blank target belongs to another sentence"),
 "E-L2-HIDDEN-LIMIT": (E, "Hidden words exceed settings.level2.maxHiddenWords"),
 "E-BLANK-OVERLAP": (E, "Blanks overlap or repeat a target"),
 "E-L3-HARD-LEN": (E, "Level 3 word count outside hard bounds 2..60"),
 "E-L4-CONTIG": (E, "Level 4 sentenceIds are not adjacent in audio order"),
 "E-L4-BREAK": (E, "Level 4 span crosses a section break not confirmed continuous"),
 "E-L4-MULTISPEAKER": (E, "Multiple speakers without multiSpeaker = true, or multiSpeaker not allowed"),
 "E-L4-HARD-SIZE": (E, "Level 4 outside hard bounds (2..8 sentences, at most 300 words)"),
 "E-AS-SCOPE": (E, "Span sentence is not in evidenceSentenceIds"),
 "E-AS-SPAN": (E, "Answer Spotter span surface differs from cleanText slice"),
 "E-AS-OCC": (E, "Answer Spotter span occurrence mismatch"),
 "E-AS-WORDLIMIT": (E, "Answer or candidate longer than answerFormat.maxWords"),
 "E-AS-WORDLIMIT-ALT": (E, "Accepted form longer than answerFormat.maxWords"),
 "E-AS-MODE-VISIBILITY": (E, "Item requires selecting text that is not visible (select_span_in_text outside post-check review, or transcript shown during independent listening)"),
 "E-AS-REVIEW-PAIR": (E, "Post-check review item lacks a valid paired independent item"),
 "E-AS-OPTIONS": (E, "choose_option needs at least two options"),
 "E-AS-QMARKER-REF": (E, "relatedQMarkerIds references a missing marker"),
 "E-AS-MARKER-NOTE-MISSING": (E, "Marker cue sentence differs from answer sentence and markerRelationNote is absent"),
 "E-AS-ORIGIN-CLAIM": (E, "Unsupported official-material claim"),
 "E-OFFICIAL-RIGHTS": (E, "Official question text or claim without teacherAttestsAuthorizedUse"),
 "E-SELECTION-STATE": (E, "selection.disabledReasons names an enabled or missing sentence"),
 "W-NOT-NFC": (W, "Text is not NFC-normalised (offsets refer to the stored form)"),
 "W-NOT-AUDITED": (W, "auditState is not_audited"),
 "W-RIGHTS-UNATTESTED": (W, "teacherAttestsAuthorizedUse is false"),
 "W-NO-TIMESTAMPS": (I, "No timestamps: UI must not imply an exact audio position"),
 "W-MARKUP-LIKE-TEXT": (I, "Text contains angle brackets; legal data, must be rendered inert"),
 "W-REUSE": (W, "Sentence reused across levels (guided practice, not independent assessment)"),
 "W-SYNTAX-DET": (W, "Blank target flagged syntax_determinable"),
 "W-L1-LEN": (W, "Level 1 tile count outside advisory range without approved exception"),
 "W-L3-LEN": (W, "Level 3 word count outside advisory range without approved exception"),
 "W-L4-LEN": (W, "Level 4 size outside advisory range without approved exception"),
 "W-L1-DISTRACTOR-COUNT": (W, "More distractors than settings.level1.maxDistractorsPerItem"),
 "W-EXCEPTION-UNUSED": (W, "lengthException present but no advisory threshold is crossed"),
 "I-LENGTH-EXCEPTION-APPROVED": (I, "Advisory threshold crossed with a recorded teacher exception"),
 "W-RESERVED-TYPE": (W, "independent_answer_hunt is reserved; engine ignores it in the MVP"),
 "W-QMARKER-ANSWER-DISTANCE": (W, "Marker cue is in a different sentence than the practice answer (location cue only)"),
 "W-FORMS-UNAPPROVED": (W, "Answer alternatives still proposed, not teacher_approved"),
 "W-NUMERIC-NO-ALLOWED-FORMS": (W, "Numeric or currency target has no explicit answer set"),
 "W-QUOTA-LOW": (W, "Fewer explicit items than the suggested minimum (guideline, not a quota)"),
}

DEFAULT_LIMITS = {"file_bytes": 2_000_000, "raw_chars": 60000, "raw_utf8_bytes": 240000, "sentences": 600, "turns": 300,
                  "issues": 200, "decisions": 200, "targets": 600, "level1": 20, "level2": 25, "level3": 20, "level4": 8, "answerSpotter": 25}
ADVISORY = {"l1": (4, 18), "l3": (4, 22), "l4_words": (25, 80), "l4_sent": (2, 5)}
HARD = {"l1": (2, 40), "l3": (2, 60), "l4_words_max": 300, "l4_sent": (2, 8)}
GUIDE_MIN = {"level1": 8, "level2": 10, "level3": 8, "level4": 3, "answerSpotter": 8}
OPEN = ("proposed_correction", "needs_audio_verification", "unresolved")
CUR = "£$€"

# ---------------------------------------------------------------- unicode helpers (UTF-16 contract)
def u16(s): return s.encode("utf-16-le", "surrogatepass")
def u16len(s): return len(u16(s)) // 2
def u16slice(s, a, b): return u16(s)[2 * a:2 * b].decode("utf-16-le", "surrogatepass")
def cp_to_u16(s, i): return u16len(s[:i])
WS_RE = re.compile(r"[ \t\n\r\f\v\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]+")
def tokens(t): return [x for x in WS_RE.split(t) if x]
def has_ln(x): return any(unicodedata.category(c)[0] in "LN" for c in x)
def words(t): return [x for x in tokens(t) if has_ln(x)]
def is_wordchar(c): return unicodedata.category(c)[0] in "LNM" or c in "_'’-"
def norm_tok(x):
    x = unicodedata.normalize("NFC", x.replace("’", "'")).lower()
    i, j = 0, len(x)
    while i < j and unicodedata.category(x[i])[0] not in "LN": i += 1
    while j > i and unicodedata.category(x[j - 1])[0] not in "LN": j -= 1
    return x[i:j]
def matches(text, surface):
    """UTF-16 start offsets of whole-token, case-insensitive matches (boundary = letter, number, mark, _ ' ’ -)."""
    out, ls, lo = [], surface.lower(), text.lower()
    if len(lo) != len(text) or not surface: return out
    i = lo.find(ls)
    while i >= 0:
        pre = text[i - 1] if i > 0 else ""
        post = text[i + len(surface)] if i + len(surface) < len(text) else ""
        if not (pre and is_wordchar(pre)) and not (post and is_wordchar(post)): out.append(cp_to_u16(text, i))
        i = lo.find(ls, i + 1)
    return out
QRE = re.compile(r"\s*\(Q(\d+)\)")

class Report:
    def __init__(self): self.items = []
    def add(self, code, path, msg=""): self.items.append((code, path, msg))

def walk_strings(o, path="$"):
    if isinstance(o, str): yield path, o
    elif isinstance(o, dict):
        for k, v in o.items(): yield from walk_strings(v, path + "." + k)
    elif isinstance(o, list):
        for i, v in enumerate(o): yield from walk_strings(v, "%s[%d]" % (path, i))

def dup(items, key, r, path):
    seen = set()
    for i, it in enumerate(items):
        v = it.get(key)
        if v in seen: r.add("E-ID-DUP", "%s[%d].%s" % (path, i, key), "duplicate %s" % v)
        seen.add(v)

def validate(doc, limits=None, file_bytes=None):
    L = dict(DEFAULT_LIMITS); L.update(limits or {})
    r = Report(); info = {}
    raw = doc["rawTranscript"]["text"]; tr = doc["transcript"]; S = tr["sentences"]; T = tr["turns"]
    audit = doc["audit"]; ex = doc.get("exercises", {}); st = doc.get("settings", {})
    # ---- unicode, limits, markup
    bad = 0
    for p, s in walk_strings(doc):
        try: s.encode("utf-8")
        except UnicodeEncodeError:
            bad += 1
            if bad <= 5: r.add("E-UNICODE-INVALID", p, "lone surrogate")
    if bad: return finish(doc, r, S, {}, set(), L)
    if file_bytes is not None and file_bytes > L["file_bytes"]: r.add("E-LIMIT", "$", "file bytes %d" % file_bytes)
    if len(raw) > L["raw_chars"]: r.add("E-LIMIT", "$.rawTranscript.text", "chars %d" % len(raw))
    if len(raw.encode("utf-8")) > L["raw_utf8_bytes"]: r.add("E-LIMIT", "$.rawTranscript.text", "utf8 bytes")
    for k, v in (("sentences", S), ("turns", T), ("issues", audit["issues"]), ("decisions", audit["decisions"]), ("targets", doc.get("learningTargets", []))):
        if len(v) > L[k]: r.add("E-LIMIT", "$." + k, "count %d > %d" % (len(v), L[k]))
    for k, key in (("level1", "level1"), ("level2", "level2"), ("level3", "level3"), ("level4", "level4"), ("answerSpotter", "answerSpotter")):
        if len(ex.get(key, {}).get("items", [])) > L[k]: r.add("E-LIMIT", "$.exercises." + key, "too many items")
    nfc_bad = [p for p, s in walk_strings(doc) if unicodedata.normalize("NFC", s) != s]
    if nfc_bad: r.add("W-NOT-NFC", nfc_bad[0], "%d string(s) not NFC" % len(nfc_bad))
    markup = [p for p, s in walk_strings(doc) if "<" in s or ">" in s]
    for p in markup[:25]: r.add("W-MARKUP-LIKE-TEXT", p, "angle brackets present: data accepted, render with textContent only")
    # ---- mode / rights
    if doc["importMode"] == "transcript_only":
        for f in ("learningTargets", "exercises"):
            if f in doc: r.add("E-MODE-FIELDS", "$." + f, "not allowed in transcript_only")
    rights = doc["rights"]
    if doc["metadata"]["source"]["type"] == "cambridge_ielts" and rights.get("publicRedistributionAllowed"): r.add("E-RIGHTS-REDISTRIBUTION", "$.rights")
    if not rights.get("teacherAttestsAuthorizedUse"): r.add("W-RIGHTS-UNATTESTED", "$.rights")
    # ---- raw transcript
    if hashlib.sha256(raw.encode("utf-8")).hexdigest() != doc["rawTranscript"]["sha256"]: r.add("E-RAW-HASH", "$.rawTranscript.sha256")
    RL = u16len(raw)
    def rawslice(sp): return u16slice(raw, sp["start"], sp["end"]) if 0 <= sp["start"] < sp["end"] <= RL else None
    # ---- speakers, turns
    dup(tr["speakers"], "id", r, "$.transcript.speakers"); dup(T, "id", r, "$.transcript.turns"); dup(S, "id", r, "$.transcript.sentences")
    spk = {s["id"]: s for s in tr["speakers"]}; TID = {t["id"]: t for t in T}; SID = {s["id"]: s for s in S}
    for i, t in enumerate(T):
        p = "$.transcript.turns[%d]" % i
        if t["order"] != i + 1: r.add("E-ORD-TURN", p)
        if t["speakerId"] not in spk: r.add("E-SPEAKER", p); continue
        seg = rawslice(t["rawSpan"])
        if seg is None or not seg.startswith(spk[t["speakerId"]]["rawLabel"] + ":"): r.add("E-TURN-SPAN", p)
    # ---- sentences
    prev_end = 0
    for i, s in enumerate(S):
        p = "$.transcript.sentences[%d]" % i
        if s["order"] != i + 1: r.add("E-ORD-SENT", p)
        seg = rawslice(s["rawSpan"])
        if seg is None or seg != s["rawText"]: r.add("E-RAW-SPAN", p)
        if s["rawSpan"]["start"] < prev_end: r.add("E-ORD-RAW", p)
        prev_end = s["rawSpan"]["end"]
        if s["turnId"] not in TID: r.add("E-TURN-REF", p)
        else:
            tsp = TID[s["turnId"]]["rawSpan"]
            if not (tsp["start"] <= s["rawSpan"]["start"] and s["rawSpan"]["end"] <= tsp["end"]): r.add("E-SENT-TURN-MISMATCH", p)
        ct = s["cleanText"]
        if s["textStatus"] != "verified_corrected" and QRE.sub("", s["rawText"]) != ct: r.add("E-CLEAN-DERIV", p)
        if re.search(r"\(Q\d+\)", ct) or re.match(r"^\s*[A-Z][A-Z .'-]*:\s", ct) or re.search(r"^-{3,}", ct): r.add("E-CLEAN-METADATA-LEAK", p)
        ts = s.get("timestamp")
        if ts is not None:
            if not ts["endSec"] > ts["startSec"] or not doc["metadata"]["audio"]["timestampsAvailable"]: r.add("E-TIMESTAMP", p)
    if not any("timestamp" in s for s in S): r.add("W-NO-TIMESTAMPS", "$.transcript.sentences", "no sentence has a timestamp")
    # ---- section breaks
    for i, b in enumerate(tr.get("sectionBreaks", [])):
        p = "$.transcript.sectionBreaks[%d]" % i
        seg = rawslice(b["rawSpan"])
        if b["afterSentenceId"] not in SID or seg is None or not re.fullmatch(r"-{3,}", seg): r.add("E-BREAK-SPAN", p); continue
        a = SID[b["afterSentenceId"]]; nxt = S[a["order"]] if a["order"] < len(S) else None
        if b["rawSpan"]["start"] < a["rawSpan"]["end"] or (nxt and b["rawSpan"]["end"] > nxt["rawSpan"]["start"]): r.add("E-BREAK-SPAN", p, "not between sentences")
    # ---- q markers
    QM = {q["id"]: q for q in tr.get("qMarkers", [])}; dup(tr.get("qMarkers", []), "id", r, "$.transcript.qMarkers")
    last = 0
    for i, q in enumerate(tr.get("qMarkers", [])):
        p = "$.transcript.qMarkers[%d]" % i
        s = SID.get(q["sentenceId"])
        if s is None or q["id"] not in s.get("qMarkerIds", []): r.add("E-QMARKER-REF", p); continue
        seg = rawslice(q["rawSpan"])
        sp_, ss = q["rawSpan"], s["rawSpan"]
        if seg != "(Q%d)" % q["number"] or not (ss["start"] <= sp_["start"] and sp_["end"] <= ss["end"]): r.add("E-QMARKER-SPAN", p); continue
        rel = u16slice(s["rawText"], 0, sp_["end"] - ss["start"])
        if s["textStatus"] != "verified_corrected" and u16len(QRE.sub("", rel)) != q["cleanTextOffset"]: r.add("E-QMARKER-OFFSET", p)
        if q["cleanTextOffset"] > u16len(s["cleanText"]): r.add("E-QMARKER-OFFSET", p, "beyond cleanText")
        if q["number"] <= last: r.add("E-QMARKER-ORDER", p)
        last = q["number"]
        if "officialQuestionText" in q and not rights.get("teacherAttestsAuthorizedUse"): r.add("E-OFFICIAL-RIGHTS", p, "officialQuestionText without attestation")
    for i, s in enumerate(S):
        for qid in s.get("qMarkerIds", []):
            if qid not in QM or QM[qid]["sentenceId"] != s["id"]: r.add("E-QMARKER-REF", "$.transcript.sentences[%d].qMarkerIds" % i, qid)
    if "fullCleanText" in tr:
        full = "\n".join(" ".join(s["cleanText"] for s in S if s["turnId"] == t["id"]) for t in T)
        if full != tr["fullCleanText"]: r.add("E-FULLTEXT", "$.transcript.fullCleanText")
    # ---- audit
    ISS = {x["id"]: x for x in audit["issues"]}; dup(audit["issues"], "id", r, "$.audit.issues"); dup(audit["decisions"], "id", r, "$.audit.decisions")
    open_issues = [x for x in audit["issues"] if x["status"] in OPEN]
    st_ = audit["auditState"]
    if st_ == "audited_open_issues" and not open_issues: r.add("E-AUDITSTATE", "$.audit.auditState", "no open issue")
    if st_ == "audited_no_open_issues" and open_issues: r.add("E-AUDITSTATE", "$.audit.auditState", "open issues exist")
    if st_ == "not_audited" and any(x["status"] not in ("safe_cleanup",) for x in audit["issues"]): r.add("E-AUDITSTATE", "$.audit.auditState", "non-cleanup issues but not_audited")
    if st_ == "not_audited": r.add("W-NOT-AUDITED", "$.audit.auditState")
    blocked = set(); open_spans = []
    for i, x in enumerate(audit["issues"]):
        p = "$.audit.issues[%d]" % i
        seg = rawslice(x["rawSpan"])
        if seg is None or seg != x["sourceQuote"]: r.add("E-ISSUE-SPAN", p)
        for sid in x["affectedSentenceIds"]:
            if sid not in SID: r.add("E-ISSUE-REF", p, sid)
        for qid in x.get("affectedQMarkerIds", []):
            if qid not in QM: r.add("E-ISSUE-REF", p, qid)
        if "cleanSpan" in x:
            c = x["cleanSpan"]; s = SID.get(c["sentenceId"])
            if s is None: r.add("E-ISSUE-REF", p, c["sentenceId"])
            else:
                got = u16slice(s["cleanText"], c["start"], c["end"])
                if x["status"] in OPEN + ("info_note",) and got != x["sourceQuote"]: r.add("E-ISSUE-CLEANSPAN", p)
                if x["status"] in OPEN: open_spans.append((c["sentenceId"], c["start"], c["end"], x))
        if x["status"] in OPEN and x["blocksScoredUse"]: blocked |= set(x["affectedSentenceIds"])
    # decisions: latest per issue (by decidedAt then list order)
    latest = {}
    for i, d in enumerate(audit["decisions"]):
        p = "$.audit.decisions[%d]" % i
        if d["issueId"] not in ISS: r.add("E-DECISION-REF", p); continue
        key = (d["decidedAt"], i)
        if d["issueId"] not in latest or key >= latest[d["issueId"]][0]: latest[d["issueId"]] = (key, d, p)
        iss = ISS[d["issueId"]]
        if d["action"] in ("apply_proposal", "apply_custom_text", "keep_original") and d["evidenceStatus"] not in ("teacher_confirmed_by_audio", "official_source_confirmed"):
            r.add("E-DECISION-EVIDENCE", p, "no confirmed evidence")
        if d["action"] == "apply_proposal" and d.get("finalText") != iss.get("proposedReplacement"): r.add("E-DECISION-EVIDENCE", p, "finalText differs from proposedReplacement")
    for iid, (_, d, p) in latest.items():
        iss = ISS[iid]; act = d["action"]
        want = {"apply_proposal": "approved", "apply_custom_text": "approved", "keep_original": "approved", "dismiss": "dismissed", "mark_unresolved": "unresolved", "exclude_sentence": "unresolved"}[act]
        if iss["status"] != want: r.add("E-DECISION-STATE", p, "issue status %s but latest decision implies %s" % (iss["status"], want))
        if act in ("apply_proposal", "apply_custom_text", "keep_original") and iss["evidenceStatus"] != d["evidenceStatus"]: r.add("E-DECISION-STATE", p, "issue evidence differs from decision")
        for sid in iss["affectedSentenceIds"]:
            s = SID.get(sid)
            if s is None: continue
            if act in ("apply_proposal", "apply_custom_text"):
                basis = "audio_confirmed_correction" if d["evidenceStatus"] == "teacher_confirmed_by_audio" else "official_transcript_correction"
                if s["textStatus"] != "verified_corrected" or s["provenance"]["cleanTextBasis"] != basis or d.get("finalText", "\0") not in s["cleanText"]:
                    r.add("E-DECISION-STATE", p, "sentence %s does not reflect applied correction" % sid)
            if act == "keep_original" and s["textStatus"] != "verified_unchanged": r.add("E-DECISION-STATE", p, "sentence %s should be verified_unchanged" % sid)
            if act == "exclude_sentence" and s["enabled"]: r.add("E-DECISION-STATE", p, "sentence %s should be disabled" % sid)
    for i, x in enumerate(audit["issues"]):
        if x["status"] == "approved" and x["id"] not in latest: r.add("E-DECISION-EVIDENCE", "$.audit.issues[%d]" % i, "approved without a recorded decision")
    for i, s in enumerate(S):
        if (s["textStatus"] == "pending_verification") != (s["id"] in blocked): r.add("E-BLOCK-CONSISTENCY", "$.transcript.sentences[%d]" % i)
    # ---- selection
    for i, d in enumerate(doc.get("selection", {}).get("disabledReasons", [])):
        s = SID.get(d["sentenceId"])
        if s is None or s["enabled"]: r.add("E-SELECTION-STATE", "$.selection.disabledReasons[%d]" % i)
    # ---- settings ranges
    for lv, (a, b) in (("level1", ("minTiles", "maxTiles")), ("level3", ("minWords", "maxWords")), ("level4", ("minSentences", "maxSentences")), ("level4", ("minWords", "maxWords"))):
        if a in st.get(lv, {}) and b in st.get(lv, {}) and st[lv][a] > st[lv][b]: r.add("E-SETTINGS-RANGE", "$.settings." + lv, a)
    g = st.get("sessionGuidelines", {})
    for lv, v in g.items():
        if v["min"] > v["max"]: r.add("E-SETTINGS-RANGE", "$.settings.sessionGuidelines." + lv)
    # ---- targets
    TG = {t["id"]: t for t in doc.get("learningTargets", [])}; dup(doc.get("learningTargets", []), "id", r, "$.learningTargets")
    used_sentences = set()
    def sent_ok(sid, p, strict=True):
        s = SID.get(sid)
        if s is None: r.add("E-REF-MISSING", p, sid); return None
        if not s["enabled"]: r.add("E-REF-DISABLED", p, sid)
        if sid in blocked or s["textStatus"] == "pending_verification": r.add("E-REF-BLOCKED", p, sid)
        return s
    def check_span(surface, a, b, ct, occ):
        got = u16slice(ct, a, b)
        if got != surface: return "span"
        m = matches(ct, surface)
        if a not in m or m.index(a) + 1 != occ: return "occ"
        return None
    def check_forms(forms, surface, p):
        for f in forms:
            k = f["kind"]
            if k == "contraction_equivalent" and not re.search(r"['’]", surface): r.add("E-FORM-INVALID", p, "contraction form on span without apostrophe")
            if k == "symbol_optional" and not (surface and surface[0] in CUR): r.add("E-FORM-INVALID", p, "symbol_optional needs a currency symbol")
            if k == "numeral_word_equivalent" and not any(ch.isdigit() for ch in surface) and not surface.isalpha(): r.add("E-FORM-INVALID", p, "numeral form on non-number span")
    for i, t in enumerate(doc.get("learningTargets", [])):
        p = "$.learningTargets[%d]" % i; s = SID.get(t["sentenceId"])
        if s is None: r.add("E-REF-MISSING", p, t["sentenceId"]); continue
        bad_ = check_span(t["surface"], t["charStart"], t["charEnd"], s["cleanText"], t["occurrence"])
        if bad_ == "span": r.add("E-TARGET-SPAN", p)
        elif bad_ == "occ": r.add("E-TARGET-OCC", p)
        for (sid, a, b, x) in open_spans:
            if sid == t["sentenceId"] and a < t["charEnd"] and t["charStart"] < b: r.add("E-TARGET-OPEN-ISSUE", p, x["id"])
        if "proper_noun_spelling" in t["focusTypes"] and any(x["issueClass"] == "proper_noun" and x["status"] in OPEN + ("info_note",) and t["sentenceId"] in x["affectedSentenceIds"] for x in audit["issues"]):
            r.add("E-TARGET-PROPERN", p)
        check_forms(t.get("allowedForms", []), t["surface"], p)
        if any(ch.isdigit() for ch in t["surface"]) or (t["surface"] and t["surface"][0] in CUR):
            if not t.get("allowedForms") : r.add("W-NUMERIC-NO-ALLOWED-FORMS", p, t["id"])
    # ---- exercises
    def level_hdr(lv):
        items = ex.get(lv, {}).get("items", []); dup(items, "id", r, "$.exercises.%s.items" % lv); return items
    def exc_status(it, crossings, p, code, hard_bad=False):
        e = it.get("lengthException")
        if crossings:
            covered = e is not None and ((e["kind"] == "advisory_both") or ("words" in crossings and e["kind"] == "advisory_word_count" and "sentences" not in crossings)
                                           or ("sentences" in crossings and e["kind"] == "advisory_sentence_count" and "words" not in crossings))
            if covered: r.add("I-LENGTH-EXCEPTION-APPROVED", p, ",".join(sorted(crossings)))
            else: r.add(code, p, ",".join(sorted(crossings)))
        elif e is not None: r.add("W-EXCEPTION-UNUSED", p)
    def order_check(items, key, lv):
        lastn = 0
        for i, it in enumerate(items):
            ids = it[key] if isinstance(it[key], list) else [it[key]]
            if ids and ids[0] in SID:
                o = SID[ids[0]]["order"]
                if o < lastn: r.add("E-REF-ORDER", "$.exercises.%s.items[%d]" % (lv, i))
                lastn = o
    uses = {}
    # L1
    s1 = st.get("level1", {}); lo1, hi1 = s1.get("minTiles", ADVISORY["l1"][0]), s1.get("maxTiles", ADVISORY["l1"][1]); maxd = s1.get("maxDistractorsPerItem", 2)
    items = level_hdr("level1")
    for i, it in enumerate(items):
        p = "$.exercises.level1.items[%d]" % i; s = sent_ok(it["sentenceId"], p)
        if s is None: continue
        uses.setdefault(s["id"], set()).add("level1"); toks = words(s["cleanText"]); n = len(toks)
        if n < HARD["l1"][0] or n > HARD["l1"][1]: r.add("E-L1-HARD-LEN", p, "tiles=%d" % n)
        else: exc_status(it, {"words"} if (n < lo1 or n > hi1) else set(), p, "W-L1-LEN")
        nt = {norm_tok(x) for x in toks}
        for d in it.get("distractors", []):
            if norm_tok(d["text"]) in nt: r.add("E-L1-DISTRACTOR-IN-SENTENCE", p, d["text"])
        if len(it.get("distractors", [])) > maxd: r.add("W-L1-DISTRACTOR-COUNT", p)
    order_check(items, "sentenceId", "level1")
    # L2
    maxh = st.get("level2", {}).get("maxHiddenWords", 2)
    items = level_hdr("level2")
    for i, it in enumerate(items):
        p = "$.exercises.level2.items[%d]" % i; s = sent_ok(it["sentenceId"], p)
        if s is None: continue
        uses.setdefault(s["id"], set()).add("level2"); tot = 0; spans = []; seen = set()
        for b in it["blanks"]:
            t = TG.get(b["targetId"])
            if t is None: r.add("E-REF-MISSING", p, b["targetId"]); continue
            if b["targetId"] in seen: r.add("E-BLANK-OVERLAP", p, "repeated target")
            seen.add(b["targetId"])
            if t["sentenceId"] != it["sentenceId"]: r.add("E-L2-TARGET-SENT", p, t["id"])
            tot += len(words(t["surface"])); spans.append((t["charStart"], t["charEnd"]))
            if "syntax_determinable" in t.get("warnings", []): r.add("W-SYNTAX-DET", p, t["id"])
        if tot > maxh: r.add("E-L2-HIDDEN-LIMIT", p, "hidden=%d" % tot)
        spans.sort()
        for a, b in zip(spans, spans[1:]):
            if a[1] > b[0]: r.add("E-BLANK-OVERLAP", p)
    order_check(items, "sentenceId", "level2")
    # L3
    s3 = st.get("level3", {}); lo3, hi3 = s3.get("minWords", ADVISORY["l3"][0]), s3.get("maxWords", ADVISORY["l3"][1])
    items = level_hdr("level3")
    for i, it in enumerate(items):
        p = "$.exercises.level3.items[%d]" % i; s = sent_ok(it["sentenceId"], p)
        if s is None: continue
        uses.setdefault(s["id"], set()).add("level3"); n = len(words(s["cleanText"]))
        if n < HARD["l3"][0] or n > HARD["l3"][1]: r.add("E-L3-HARD-LEN", p, "words=%d" % n)
        else: exc_status(it, {"words"} if (n < lo3 or n > hi3) else set(), p, "W-L3-LEN")
    order_check(items, "sentenceId", "level3")
    # L4
    s4 = st.get("level4", {}); lw4, hw4 = s4.get("minWords", ADVISORY["l4_words"][0]), s4.get("maxWords", ADVISORY["l4_words"][1])
    ls4, hs4 = s4.get("minSentences", ADVISORY["l4_sent"][0]), s4.get("maxSentences", ADVISORY["l4_sent"][1]); allow_multi = s4.get("allowMultiSpeaker", True)
    items = level_hdr("level4"); brk = {b["afterSentenceId"]: b for b in tr.get("sectionBreaks", [])}
    for i, it in enumerate(items):
        p = "$.exercises.level4.items[%d]" % i; ids = it["sentenceIds"]; ok = True
        for sid in ids:
            s = sent_ok(sid, p)
            if s is None: ok = False
            else: uses.setdefault(sid, set()).add("level4")
        if not ok: continue
        ords = [SID[x]["order"] for x in ids]
        if ords != list(range(ords[0], ords[0] + len(ords))): r.add("E-L4-CONTIG", p)
        for x in ids[:-1]:
            if x in brk and brk[x]["continuityAcrossBreak"] != "confirmed_continuous": r.add("E-L4-BREAK", p, x)
        spkset = {TID[SID[x]["turnId"]]["speakerId"] for x in ids if SID[x]["turnId"] in TID}
        if len(spkset) > 1 and (not it.get("multiSpeaker") or not allow_multi): r.add("E-L4-MULTISPEAKER", p)
        if len(spkset) == 1 and it.get("multiSpeaker"): r.add("E-L4-MULTISPEAKER", p, "flagged multiSpeaker but one speaker")
        nw = sum(len(words(SID[x]["cleanText"])) for x in ids); ns = len(ids)
        if ns < HARD["l4_sent"][0] or ns > HARD["l4_sent"][1] or nw > HARD["l4_words_max"]: r.add("E-L4-HARD-SIZE", p, "sentences=%d words=%d" % (ns, nw)); continue
        cross = set()
        if nw < lw4 or nw > hw4: cross.add("words")
        if ns < ls4 or ns > hs4: cross.add("sentences")
        exc_status(it, cross, p, "W-L4-LEN")
    order_check(items, "sentenceIds", "level4")
    for sid, lvs in uses.items():
        if len(lvs) > 1: r.add("W-REUSE", "$.exercises", "%s: %s" % (sid, ",".join(sorted(lvs))))
    # ---- Answer Spotter
    AS = level_hdr("answerSpotter"); ASID = {x["id"]: x for x in AS}
    show = st.get("answerSpotter", {}).get("showTranscriptDuringTask", False)
    approved_forms_needed = 0
    for i, it in enumerate(AS):
        p = "$.exercises.answerSpotter.items[%d]" % i
        ev = it["evidenceSentenceIds"]; ok = True
        for sid in ev:
            if sent_ok(sid, p) is None: ok = False
        if ok:
            o = [SID[x]["order"] for x in ev]
            if o != sorted(o): r.add("E-REF-ORDER", p, "evidence not ascending")
        act, mode = it["activity"], it["responseMode"]
        if (mode == "select_span_in_text" and act == "independent_listening") or (act == "independent_listening" and show) or (act == "post_check_transcript_review" and mode != "select_span_in_text"):
            r.add("E-AS-MODE-VISIBILITY", p, "activity=%s mode=%s showTranscriptDuringTask=%s" % (act, mode, show))
        if act == "post_check_transcript_review":
            pr = ASID.get(it.get("pairedIndependentItemId"))
            if pr is None or pr["id"] == it["id"] or pr["activity"] != "independent_listening" or not (set(pr["evidenceSentenceIds"]) & set(ev)):
                r.add("E-AS-REVIEW-PAIR", p)
        if mode == "choose_option" and len(it["spans"]) < 2: r.add("E-AS-OPTIONS", p)
        if it["type"] == "independent_answer_hunt": r.add("W-RESERVED-TYPE", p)
        fmt = it.get("answerFormat"); ans_sentences = set()
        for j, sp in enumerate(it["spans"]):
            sq = "%s.spans[%d]" % (p, j); s = sp["span"]; sen = SID.get(s["sentenceId"])
            if s["sentenceId"] not in ev: r.add("E-AS-SCOPE", sq)
            if sen is None: r.add("E-REF-MISSING", sq, s["sentenceId"]); continue
            res = check_span(s["surface"], s["charStart"], s["charEnd"], sen["cleanText"], s["occurrence"])
            if res == "span": r.add("E-AS-SPAN", sq)
            elif res == "occ": r.add("E-AS-OCC", sq)
            if sp["role"] in ("correct_answer", "candidate"): ans_sentences.add(s["sentenceId"])
            forms = sp.get("acceptedForms", [])
            check_forms(forms, s["surface"], sq)
            approved_forms_needed += sum(1 for f in forms if f.get("approvalState", "proposed") != "teacher_approved")
            if (any(ch.isdigit() for ch in s["surface"]) or s["surface"][:1] in CUR) and sp["role"] in ("correct_answer", "candidate") and not forms: r.add("W-NUMERIC-NO-ALLOWED-FORMS", sq)
            if fmt and sp["role"] in ("correct_answer", "candidate"):
                if len(words(s["surface"])) > fmt["maxWords"]: r.add("E-AS-WORDLIMIT", sq)
                for f in forms:
                    if len(words(f["text"])) > fmt["maxWords"]: r.add("E-AS-WORDLIMIT-ALT", sq, f["text"])
        rel = it.get("relatedQMarkerIds", [])
        for qid in rel:
            if qid not in QM: r.add("E-AS-QMARKER-REF", p, qid); continue
            if QM[qid]["sentenceId"] not in ans_sentences:
                r.add("W-QMARKER-ANSWER-DISTANCE", p, qid)
                if not it.get("markerRelationNote"): r.add("E-AS-MARKER-NOTE-MISSING", p, qid)
        if it["origin"] == "official_paper_transcribed":
            c = it.get("officialClaim")
            if c is None: r.add("E-AS-ORIGIN-CLAIM", p, "official origin without officialClaim")
            else:
                if not rights.get("teacherAttestsAuthorizedUse"): r.add("E-OFFICIAL-RIGHTS", p)
                mk = [QM[q] for q in rel if q in QM and QM[q]["number"] == c["questionNumber"]]
                if not mk: r.add("E-AS-ORIGIN-CLAIM", p, "no related marker with number %d" % c["questionNumber"])
                elif "question_text" in c["claims"] and "officialQuestionText" not in mk[0]: r.add("E-AS-ORIGIN-CLAIM", p, "question_text claim but marker has no officialQuestionText")
        elif "officialClaim" in it: r.add("E-AS-ORIGIN-CLAIM", p, "officialClaim on non-official origin")
    order_check(AS, "evidenceSentenceIds", "answerSpotter")
    # ---- forms approval (used content only)
    for t in doc.get("learningTargets", []):
        if t["sentenceId"] in uses: approved_forms_needed += sum(1 for f in t.get("allowedForms", []) if f.get("approvalState", "proposed") != "teacher_approved")
    if approved_forms_needed: r.add("W-FORMS-UNAPPROVED", "$", "%d answer-set entries not teacher_approved" % approved_forms_needed)
    # ---- quotas (guidelines only)
    for lv, mn in GUIDE_MIN.items():
        if lv in ex:
            mn = g.get(lv, {}).get("min", mn)
            if len(ex[lv]["items"]) < mn: r.add("W-QUOTA-LOW", "$.exercises." + lv, "%d < %d" % (len(ex[lv]["items"]), mn))
    return finish(doc, r, S, uses, blocked, L)

def finish(doc, r, S, uses, blocked, L):
    errs = sorted({(c, p, m) for c, p, m in r.items if CODES[c][0] == E})
    warns = sorted({(c, p, m) for c, p, m in r.items if CODES[c][0] == W})
    infos = sorted({(c, p, m) for c, p, m in r.items if CODES[c][0] == I})
    codes = {c for c, _, _ in r.items}
    ex = doc.get("exercises", {}); audit = doc.get("audit", {})
    referenced_blocked = any(c == "E-REF-BLOCKED" for c, _, _ in errs)
    if audit.get("auditState") == "not_audited": gate = "GATE_NOT_AUDITED"
    elif referenced_blocked: gate = "GATE_BLOCKED"
    elif blocked: gate = "GATE_PASS_WITH_EXCLUSIONS"
    else: gate = "GATE_PASS"
    reasons = []
    if errs: elig = "invalid"
    else:
        if "W-NOT-AUDITED" in codes: reasons.append("R-NOT-AUDITED")
        if "W-RIGHTS-UNATTESTED" in codes: reasons.append("R-RIGHTS-UNATTESTED")
        if codes & {"W-L1-LEN", "W-L3-LEN", "W-L4-LEN"}: reasons.append("R-LENGTH-EXCEPTION-APPROVAL-NEEDED")
        if "W-FORMS-UNAPPROVED" in codes: reasons.append("R-ANSWER-SETS-UNAPPROVED")
        elig = "requires_teacher_action" if reasons else "eligible_for_teacher_preview"
    rep = {"validatorVersion": VERSION, "schemaVersion": doc.get("schemaVersion"), "importMode": doc.get("importMode"),
           "counts": {"sentences": len(S), "enabledSentences": sum(1 for s in S if s["enabled"]), "blockedSentences": len(blocked),
                      "level1": len(ex.get("level1", {}).get("items", [])), "level2": len(ex.get("level2", {}).get("items", [])), "level3": len(ex.get("level3", {}).get("items", [])),
                      "level4": len(ex.get("level4", {}).get("items", [])), "answerSpotter": len(ex.get("answerSpotter", {}).get("items", [])),
                      "errors": len(errs), "warnings": len(warns), "info": len(infos)},
           "errors": [{"code": c, "path": p, "message": m} for c, p, m in errs],
           "warnings": [{"code": c, "path": p, "message": m} for c, p, m in warns],
           "info": [{"code": c, "path": p, "message": m} for c, p, m in infos],
           "errorCodes": sorted({c for c, _, _ in errs}), "warningCodes": sorted({c for c, _, _ in warns}), "infoCodes": sorted({c for c, _, _ in infos}),
           "blockedSentenceIds": sorted(blocked), "gate": gate, "publicationEligibility": elig, "eligibilityReasons": reasons,
           "disclaimer": "Eligibility is advisory. Teacher Preview approval, audio/official-source verification of open audit issues, and safe UI rendering are outside this validator. A clean result does not prove the transcript matches any audio."}
    return rep

def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("file", nargs="?"); ap.add_argument("--schema"); ap.add_argument("--json", action="store_true")
    ap.add_argument("--limits"); ap.add_argument("--list-codes", action="store_true")
    a = ap.parse_args(argv)
    if a.list_codes:
        for c in sorted(CODES): print("%-30s %-8s implemented  %s" % (c, CODES[c][0], CODES[c][1]))
        return 0
    if not a.file: ap.print_usage(); return 2
    try:
        data = open(a.file, "rb").read(); doc = json.loads(data.decode("utf-8"))
        limits = json.load(open(a.limits)) if a.limits else None
    except Exception as e:
        print("I/O or JSON error: %s" % e, file=sys.stderr); return 2
    schema_errors = None
    if a.schema:
        try:
            from jsonschema import Draft202012Validator, FormatChecker
            V = Draft202012Validator(json.load(open(a.schema, encoding="utf-8")), format_checker=FormatChecker())
            schema_errors = sorted("%s: %s" % ("/".join(map(str, e.absolute_path)), e.message[:120]) for e in V.iter_errors(doc))
        except ImportError:
            print("jsonschema not installed; schema stage skipped", file=sys.stderr)
    try: rep = validate(doc, limits, len(data))
    except (KeyError, TypeError, IndexError) as e:
        rep = {"validatorVersion": VERSION, "fatal": "structure too malformed for semantic stage (%s: %s); fix schema errors first" % (type(e).__name__, e), "errorCodes": ["FATAL-STRUCTURE"], "warningCodes": [], "infoCodes": [], "errors": [], "warnings": [], "info": [], "publicationEligibility": "invalid"}
    if schema_errors is not None: rep["schemaValid"] = not schema_errors; rep["schemaErrorCount"] = len(schema_errors); rep["schemaErrorsSample"] = schema_errors[:5]
    if a.json: print(json.dumps(rep, ensure_ascii=False, indent=2, sort_keys=True))
    else:
        print("file: %s" % a.file)
        if schema_errors is not None: print("schema valid: %s (%d errors)" % (not schema_errors, len(schema_errors)))
        print("semantic errors: %s" % rep["errorCodes"]); print("warnings: %s" % rep["warningCodes"]); print("info: %s" % rep["infoCodes"])
        print("gate: %s  eligibility: %s %s" % (rep.get("gate"), rep["publicationEligibility"], rep.get("eligibilityReasons", [])))
        if "counts" in rep: print("counts: %s" % json.dumps(rep["counts"], sort_keys=True))
    return 1 if (rep["errorCodes"] or (schema_errors)) else 0

if __name__ == "__main__":
    sys.exit(main())
