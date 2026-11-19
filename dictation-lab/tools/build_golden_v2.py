#!/usr/bin/env python3
"""Builds golden-tests/vectors (v2) = original 134 vectors (read from golden-tests-original, never modified) + PATCHES + NEW vectors.
All expected values below are HAND-AUTHORED from dictation-scoring-contract-v1.md. They are not produced by any engine."""
import json, os, copy
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); PK = os.path.join(ROOT, "pkg")
ORIG = os.path.join(PK, "golden-tests-original", "vectors"); OUT = os.path.join(PK, "golden-tests", "vectors")
os.makedirs(OUT, exist_ok=True)
TS = "2026-11-09T00:00:00Z"
orig = {}; order = {}
for f in sorted(os.listdir(ORIG)):
    d = json.load(open(os.path.join(ORIG, f), encoding="utf-8")); order[f] = d["suite"]
    for v in d["vectors"]: orig[v["id"]] = (f, v)
assert len(orig) == 134
files = {f: [] for f in order}; status = {}; reasons = {}
def put(fname, v, st, reason="", decs=None):
    if decs is not None: v["decisionRefs"] = sorted(set(decs))
    files.setdefault(fname, []).append(v); status[v["id"]] = st; reasons[v["id"]] = reason
def patch(vid, reason, decs, **ch):
    f, v = orig[vid]; v = copy.deepcopy(v)
    for k, val in ch.items():
        if k in ("input_update",): v["input"].update(val)
        else: v[k] = val
    put(f, v, "changed", reason, decs); return vid
patched = set()
# ---------------------------------------------------------------- CHANGED (contract v1 revisions)
patched.add(patch("TOK-013", "D-17 revised: % carries answer meaning and is no longer stripped", ["D-17"], title="percent sign is meaningful and kept: 20% stays 20%", expected={"tokens": ["20%", "off"]}, tags=["adversarial", "numerals"]))
patched.add(patch("L4-006", "D-13 revised: known leading speaker label at line start is ignored in Level 4", ["D-13"], title="known speaker label at line start is ignored (Level 4, contract rule C8)", expected={"lcs": 25, "den": 25, "exact": True}, tags=["adversarial", "speaker_labels"]))
def ATT(a_i, num, den, exact, hb, rb, kind="scored"): return {"index": a_i, "num": num, "den": den, "exact": exact, "hintsBefore": hb, "revealedBefore": rb, "kind": kind}
FA = lambda num, den, exact, ind: {"num": num, "den": den, "exact": exact, "independent": ind}
def attp(vid, reason, hist, exp, decs=("D-14", "D-16")):
    f, v = orig[vid]; v = copy.deepcopy(v); v["input"]["exposureHistoryComplete"] = hist; v["expected"] = exp; v["tags"] = sorted(set(v["tags"]) | {"exposure"}) if "exposure" in str(exp.get("evidence", "")) else v["tags"]
    put(f, v, "changed", reason, list(decs)); patched.add(vid)
R = "attempt result fields split into independence, outcome, evidence, attempted (contract C10, C11); legacy status kept"
attp("ATT-001", R, True, {"attempts": [ATT(0, 6, 6, True, 0, False)], "firstAttempt": FA(6, 6, True, True), "status": "independent_success", "independence": "independent", "outcome": "succeeded", "evidence": "novel_independent", "attempted": True, "currentPractice": {"num": 6, "den": 6}})
attp("ATT-002", R, False, {"attempts": [ATT(0, 4, 6, False, 0, False), ATT(1, 6, 6, True, 0, False)], "firstAttempt": FA(4, 6, False, True), "status": "improved_after_practice", "independence": "independent", "outcome": "succeeded", "evidence": "practice_success", "attempted": True, "currentPractice": {"num": 6, "den": 6}})
attp("ATT-003", R, True, {"attempts": [ATT(0, 6, 6, True, 1, False)], "firstAttempt": FA(6, 6, True, False), "status": "improved_after_practice", "independence": "assisted", "outcome": "succeeded", "evidence": "assisted_success", "attempted": True, "currentPractice": {"num": 6, "den": 6}})
attp("ATT-004", R, False, {"attempts": [ATT(0, 4, 6, False, 0, False), ATT(1, 5, 6, False, 1, False), ATT(2, 6, 6, True, 2, False)], "firstAttempt": FA(4, 6, False, True), "status": "improved_after_practice", "independence": "independent", "outcome": "succeeded", "evidence": "practice_success", "attempted": True, "currentPractice": {"num": 6, "den": 6}})
attp("ATT-005", R, False, {"attempts": [], "firstAttempt": None, "status": "reviewed", "independence": None, "outcome": "reviewed", "evidence": "none", "attempted": False, "currentPractice": None})
attp("ATT-006", R, False, {"attempts": [ATT(0, 4, 6, False, 0, False), ATT(1, 6, 6, True, 0, True, "post_reveal")], "firstAttempt": FA(4, 6, False, True), "status": "reviewed", "independence": "independent", "outcome": "reviewed", "evidence": "none", "attempted": True, "currentPractice": {"num": 4, "den": 6}})
attp("ATT-007", R, False, {"attempts": [ATT(0, 3, 6, False, 0, False), ATT(1, 4, 6, False, 0, False)], "firstAttempt": FA(3, 6, False, True), "status": "in_progress", "independence": "independent", "outcome": "in_progress", "evidence": "none", "attempted": True, "currentPractice": {"num": 4, "den": 6}})
attp("ATT-008", R, True, {"attempts": [ATT(0, 6, 6, True, 0, False), ATT(1, 5, 6, False, 0, False)], "firstAttempt": FA(6, 6, True, True), "status": "independent_success", "independence": "independent", "outcome": "succeeded", "evidence": "novel_independent", "attempted": True, "currentPractice": {"num": 5, "den": 6}})
attp("ATT-009", R, True, {"attempts": [ATT(0, 6, 6, True, 0, False)], "firstAttempt": FA(6, 6, True, True), "status": "independent_success", "independence": "independent", "outcome": "succeeded", "evidence": "practice_success", "attempted": True, "currentPractice": {"num": 6, "den": 6}}, ("D-16",))
attp("ATT-010", R, True, {"attempts": [ATT(0, 6, 6, True, 0, False)], "firstAttempt": FA(6, 6, True, True), "status": "independent_success", "independence": "independent", "outcome": "succeeded", "evidence": "practice_success", "attempted": True, "currentPractice": {"num": 6, "den": 6}}, ("D-16",))
attp("ATT-011", R, True, {"attempts": [ATT(0, 6, 6, True, 0, False)], "firstAttempt": FA(6, 6, True, True), "status": "independent_success", "independence": "independent", "outcome": "succeeded", "evidence": "novel_independent", "attempted": True, "currentPractice": {"num": 6, "den": 6}}, ("D-12",))
attp("ATT-012", R, False, {"attempts": [ATT(0, 4, 6, False, 0, False)], "firstAttempt": FA(4, 6, False, True), "status": "in_progress", "independence": "independent", "outcome": "in_progress", "evidence": "none", "attempted": True, "currentPractice": {"num": 4, "den": 6}}, ("D-18",))
attp("ATT-013", R, False, {"attempts": [ATT(0, 4, 6, False, 0, False), ATT(1, 4, 6, False, 1, False)], "firstAttempt": FA(4, 6, False, True), "status": "in_progress", "independence": "independent", "outcome": "in_progress", "evidence": "none", "attempted": True, "currentPractice": {"num": 4, "den": 6}}, ("D-18",))
# aggregates: new kind and new formulas (contract C12)
def agg_patch(vid, items, exp, title):
    f, v = orig[vid]; v = copy.deepcopy(v); v["kind"] = "aggregateScores"; v["title"] = title; v["input"] = {"mode": "free_practice", "submitted": False, "items": items}; v["expected"] = exp
    v["tags"] = ["adversarial", "aggregation"]; put(f, v, "changed", "D-19 revised: separate attemptedAccuracy, assignmentScore, completionRate (design review 1)", ["D-19", "D-29"]); patched.add(vid)
FR = lambda n, d: {"num": n, "den": d}
agg_patch("AGG-001", [{"id": "a", "level": "level3", "state": "attempted", "first": FR(1, 1), "expectedDen": 1}, {"id": "b", "level": "level3", "state": "attempted", "first": FR(1, 10), "expectedDen": 10}],
          {"attemptedAccuracy": FR(2, 11), "completionRate": FR(1, 1), "assignmentScore": None}, "token weighted attempted accuracy, not a mean of percentages (free practice: no assignment score)")
agg_patch("AGG-002", [{"id": "a", "level": "level3", "state": "attempted", "first": FR(6, 6), "expectedDen": 6}, {"id": "b", "level": "level3", "state": "attempted", "first": FR(4, 6), "expectedDen": 6}, {"id": "c", "level": "level3", "state": "reviewed_only", "expectedDen": 6},
           {"id": "d", "level": "level3", "state": "attempted", "first": FR(8, 10), "expectedDen": 10}, {"id": "e", "level": "level3", "state": "unattempted", "expectedDen": 6}],
          {"attemptedAccuracy": FR(9, 11), "completionRate": FR(3, 5), "reviewedOnly": 1, "assignmentScore": None}, "reviewed-only and unattempted items are not attempted: attempted accuracy 18/22, completion 3 of 5")
# session submit protocol (contract C13): server-confirmed
SUBMIT = lambda key, conf=True: {"op": "submit_requested", "key": key, "confirmIncomplete": conf}
ACK = lambda key, sid="sub-1", status="accepted": {"op": "server_ack", "key": key, "status": status, "submissionId": sid}
def nav_patch(vid, title, events, results, final, reason, decs, tags=("adversarial", "submission"), items=None, mode=None):
    f, v = orig[vid]; v = copy.deepcopy(v); v["title"] = title; v["input"]["events"] = events
    if items: v["input"]["items"] = items
    if mode: v["input"]["mode"] = mode
    v["expected"] = {"results": results, "final": final}; v["tags"] = list(tags); put(f, v, "changed", reason, decs); patched.add(vid)
SR = "Homework becomes submitted only after a server acknowledgement (design review 5); event names changed from submit to submit_requested, server_ack, submit_failed"
nav_patch("NAV-004", "incomplete submit needs confirmation; confirmed request is only pending until the server acknowledges", [{"op": "check", "item": "A", "num": 6, "den": 6}, SUBMIT("k1", False), SUBMIT("k1", True), ACK("k1")],
          ["recorded", "needs_confirmation:2", "submit_pending", "submitted"], {"submitted": True, "submissionState": "submitted", "unanswered": ["B", "C"], "attemptCounts": {"A": 1, "B": 0, "C": 0}}, SR, ["D-20"])
nav_patch("NAV-005", "failed submit restores draft; retry with a new key; late repeat after success is idempotent", [{"op": "check", "item": "A", "num": 6, "den": 6}, SUBMIT("k1"), {"op": "submit_failed", "key": "k1"}, SUBMIT("k2"), ACK("k2", "sub-2"), SUBMIT("k3")],
          ["recorded", "submit_pending", "draft_restored", "submit_pending", "submitted", "already_submitted"], {"submitted": True, "submissionId": "sub-2", "attemptCounts": {"A": 1}}, SR, ["D-20"])
nav_patch("NAV-006", "version pinning: draft and submission stay on the version in progress", [{"op": "check", "item": "A", "num": 6, "den": 6}, {"op": "publishNewVersion", "version": "v2"}, {"op": "saveDraft"}, {"op": "resume"}, SUBMIT("k1"), ACK("k1")],
          ["recorded", "ok", "draft_saved", "resumed", "submit_pending", "submitted"], {"version": "v1", "latestPublished": "v2", "submittedVersion": "v1", "submitted": True}, SR, ["D-21", "D-20"])
nav_patch("NAV-007", "after server-confirmed submission homework is locked", [{"op": "check", "item": "A", "num": 6, "den": 6}, SUBMIT("k1"), ACK("k1"), {"op": "check", "item": "A", "num": 6, "den": 6}],
          ["recorded", "submit_pending", "submitted", "locked_after_submit"], {"attemptCounts": {"A": 1}, "submitted": True}, SR, ["D-22"])
nav_patch("NAV-008", "free practice never submits and is never locked", [{"op": "check", "item": "A", "num": 4, "den": 6}, SUBMIT("k1"), {"op": "check", "item": "A", "num": 6, "den": 6}],
          ["recorded", "not_applicable_free_practice", "recorded"], {"attemptCounts": {"A": 2}, "submitted": False}, SR, ["D-20"], tags=("submission",))
# ---------------------------------------------------------------- UNCHANGED
for vid, (f, v) in orig.items():
    if vid not in patched: put(f, copy.deepcopy(v), "unchanged", "", None)
# ---------------------------------------------------------------- NEW
def new(fname, vid, title, kind, inp, exp, tags=(), decs=(), requires="oracle", reason=""):
    v = {"id": vid, "title": title, "kind": kind, "requires": requires, "tags": list(tags), "input": inp, "expected": exp}
    if decs: v["decisionRefs"] = list(decs)
    put(fname, v, "new", reason or "new vector for contract v1", None)
E = lambda lcs, den, exact, **kw: dict({"lcs": lcs, "den": den, "exact": exact}, **kw)
P3 = "Not really. You listen, you smile, and you answer questions. Last year we guided over 200 school groups, and most of them came back again."
# --- numerals and symbols (C1, D-17 revised, D-30)
NU = ("adversarial", "numerals")
T = lambda vid, title, text, toks: new("tokenize.json", vid, title, "tokenize", {"text": text}, {"tokens": toks}, NU, ["D-17", "D-30"])
T("NUM-001", "percent kept at the end of a number, sentence full stop stripped", "The tax is 20%.", ["the", "tax", "is", "20%"])
T("NUM-002", "currency symbols attached to numbers are kept", "costs £35, not €40.", ["costs", "£35", "not", "€40"])
T("NUM-003", "leading minus and plus signs before digits are kept", "temperature -5 or +3 degrees", ["temperature", "-5", "or", "+3", "degrees"])
T("NUM-004", "leading decimal point before a digit is kept; interior decimal point kept", "it is .5 of 3.5", ["it", "is", ".5", "of", "3.5"])
T("NUM-005", "degree sign and attached units are kept inside the token", "25°C and 5km", ["25°c", "and", "5km"])
T("NUM-006", "unicode minus sign is mapped to hyphen-minus", "it was \u22125 today", ["it", "was", "-5", "today"])
T("NUM-007", "comma inside a number is kept; trailing comma is not", "\u20ac5,50, please", ["\u20ac5,50", "please"])
T("NUM-008", "percent inside brackets and quotes", "(\u201c20%\u201d)", ["20%"])
SS = lambda vid, title, inp, exp, tags=NU, decs=("D-17", "D-30"): new("l3.json", vid, title, "scoreSentence", inp, exp, tags, decs)
SS("NUM-009", "20 is not 20%", {"expectedText": "The tax is 20%.", "answer": "The tax is 20"}, E(3, 4, False))
SS("NUM-010", "20 percent is not accepted without an approved form", {"expectedText": "The tax is 20%.", "answer": "The tax is 20 percent"}, E(3, 5, False))
SS("NUM-011", "20 percent accepted when the form is approved", {"expectedText": "The tax is 20%.", "answer": "The tax is 20 percent", "inlineForms": [{"surface": "20%", "forms": ["20 percent"]}]}, E(5, 5, True, variant="alt:20 percent"))
SS("NUM-012", "35 is not £35", {"expectedText": "The fee is £35 today.", "answer": "The fee is 35 today"}, E(4, 5, False))
SS("NUM-013", "35 accepted for £35 only through an approved form", {"expectedText": "The fee is £35 today.", "answer": "The fee is 35 today", "inlineForms": [{"surface": "£35", "forms": ["35"]}]}, E(5, 5, True, variant="alt:35"))
SS("NUM-014", "3.5 is not 35", {"expectedText": "It weighs 3.5 kg.", "answer": "It weighs 35 kg"}, E(3, 4, False))
SS("NUM-015", "unit glued to the number is a different token", {"expectedText": "It weighs 3.5 kg.", "answer": "It weighs 3.5kg"}, E(2, 4, False))
SS("NUM-016", "negative sign matters", {"expectedText": "It was -5 today.", "answer": "It was 5 today"}, E(3, 4, False))
SS("NUM-017", "leading decimal point matters: .5 is not 0.5", {"expectedText": "Add .5 litre.", "answer": "Add 0.5 litre"}, E(2, 3, False))
SS("NUM-018", "percent with sentence full stop typed without the full stop is exact", {"expectedText": "The tax is 20%.", "answer": "The tax is 20%"}, E(4, 4, True))
SS("NUM-019", "a lone percent sign is dropped, so 20 % is 20", {"expectedText": "The tax is 20%.", "answer": "The tax is 20 %"}, E(3, 4, False))
SS("NUM-020", "numeral to word form is not accepted: thirty-five pounds", {"expectedText": "The fee is £35 today.", "answer": "The fee is thirty-five pounds today"}, E(4, 6, False))
# --- speaker labels (C8, D-13 revised); baseline Level 4 item l4-003 = s015-s017, speakers NINA and TOM
SP = ("adversarial", "speaker_labels")
def SK(vid, title, ans, exp, item="l4-003", extra=None, tags=SP):
    inp = {"answer": ans}
    if item: inp["itemId"] = item
    inp.update(extra or {})
    new("l4.json", vid, title, "scoreSentence", inp, exp, tags, ["D-13"])
SK("SPK-001", "TOM: at line start is ignored", "TOM: " + P3, E(25, 25, True))
SK("SPK-002", "label with different case and a space before the colon", "tom : " + P3, E(25, 25, True))
SK("SPK-003", "known label before every line", "TOM: Not really.\nTOM: You listen, you smile, and you answer questions.\nTOM: Last year we guided over 200 school groups, and most of them came back again.", E(25, 25, True))
SK("SPK-004", "arbitrary colon text is spoken-looking content and is NOT dropped", "Note: " + P3, E(25, 26, False, extra=1))
SK("SPK-005", "label in the middle of a line is not at line start: kept", "Not really. TOM: You listen, you smile, and you answer questions. Last year we guided over 200 school groups, and most of them came back again.", E(25, 26, False, extra=1))
SK("SPK-006", "label without a colon is not a label", "TOM " + P3, E(25, 26, False, extra=1))
SK("SPK-007", "label ignoring switched off by the setting", "TOM: " + P3, E(25, 26, False, extra=1), extra={"ignoreSpeakerLabels": False})
SK("SPK-008", "guard: a label that is part of the expected text is kept and expected", "Note: bring a map", E(4, 4, True), item=None, extra={"expectedText": "Note: bring a map.", "level": "level4", "speakers": [{"rawLabel": "NOTE", "displayName": "Note"}]})
SK("SPK-009", "display name is also a known label", "Tom: " + P3, E(25, 25, True))
SK("SPK-010", "label of a speaker that is not in the lesson metadata is not ignored", "ANNA: " + P3, E(25, 26, False, extra=1))
SK("SPK-011", "label alone on its own first line", "TOM:\n" + P3, E(25, 25, True))
SK("SPK-012", "label stripping is a Level 4 rule: Level 3 keeps the label as an extra word", "TOM: I\u2019ll send my details today.", E(5, 6, False, extra=1), item="l3-008")
SK("SPK-013", "leading tab and spaces before the label, CRLF line breaks", "  \tTOM:\tNot really.\r\nTOM: You listen, you smile, and you answer questions.\r\nLast year we guided over 200 school groups, and most of them came back again.", E(25, 25, True))
SK("SPK-014", "label text only, no spoken content, is not a free pass", "TOM:", {"rejected": "empty_answer"})
# --- LCS safeguards (C2): partial credit must not hide materially wrong answers
LC = ("adversarial", "lcs_safeguard")
LS = lambda vid, title, inp, exp: new("l3.json", vid, title, "scoreSentence", inp, exp, LC, ["D-25"])
LS("LCS-001", "one wrong number in a 25-token passage: 24/25 but not exact and flagged as a critical target error", {"itemId": "l4-003", "answer": P3.replace("200", "300")}, E(24, 25, False, targetErrors=1, criticalTargetErrors=1))
LS("LCS-002", "both prices wrong in a 15-token sentence: 13/15 with two critical target errors", {"sentenceId": "s010", "answer": "The training is free, but the guidebook costs \u00a39.50, or \u00a314 with the audio guide."}, E(13, 15, False, targetErrors=2, criticalTargetErrors=2))
LS("LCS-003", "all words present but reversed: almost no credit", {"sentenceId": "s004", "answer": "helpers new for looking always We\u2019re"}, E(1, 6, False))
LS("LCS-004", "correct sentence padded with six extra words", {"sentenceId": "s004", "answer": "We\u2019re always looking for new helpers and then some more words here"}, E(6, 12, False, extra=6))
LS("LCS-005", "last content word missing from a 5-token sentence", {"sentenceId": "s019", "answer": "I\u2019ll send my details"}, E(4, 5, False, missing=1, targetErrors=0))
LS("LCS-006", "plural ending target wrong is reported but not critical", {"sentenceId": "s007", "answer": "Mostly guiding school group around the galleries on weekday mornings."}, E(9, 10, False, targetErrors=1, criticalTargetErrors=0))
# --- aggregation (C12, D-19 revised, D-29)
AG = ("adversarial", "aggregation")
def AGS(vid, title, inp, exp, decs=("D-29",)): new("attempts.json", vid, title, "aggregateScores", inp, exp, AG, list(decs))
I = lambda i, level, state, den, first=None, current=None: dict({"id": i, "level": level, "state": state, "expectedDen": den}, **({"first": first} if first else {}), **({"current": current} if current else {}))
HW = lambda items, submitted=True: {"mode": "homework", "submitted": submitted, "items": items}
ten = [I("q%d" % k, "level3", "attempted", 6, FR(6, 6)) if k < 2 else I("q%d" % k, "level3", "unattempted", 6) for k in range(10)]
AGS("AGS-001", "2 of 10 attempted correctly, 8 skipped, submitted homework: 100% attempted accuracy but only 20% assignment score", HW(ten), {"attemptedAccuracy": FR(1, 1), "assignmentScore": FR(1, 5), "completionRate": FR(1, 5), "attemptedItems": 2, "totalItems": 10})
AGS("AGS-002", "nothing attempted on submitted homework", HW([I("q%d" % k, "level3", "unattempted", 6) for k in range(10)]), {"attemptedAccuracy": None, "assignmentScore": FR(0, 1), "completionRate": FR(0, 1)})
AGS("AGS-003", "everything attempted: attempted accuracy equals assignment score", HW([I("a", "level3", "attempted", 6, FR(6, 6)), I("b", "level3", "attempted", 6, FR(4, 6)), I("c", "level3", "attempted", 10, FR(8, 10))]), {"attemptedAccuracy": FR(9, 11), "assignmentScore": FR(9, 11), "completionRate": FR(1, 1)})
AGS("AGS-004", "an item with zero expected tokens is invalid content and excluded from every denominator", HW([I("a", "level3", "attempted", 6, FR(6, 6)), I("z", "level3", "unattempted", 0)]), {"attemptedAccuracy": FR(1, 1), "assignmentScore": FR(1, 1), "completionRate": FR(1, 1), "invalidItems": 1, "totalItems": 1})
AGS("AGS-005", "only zero-token items: every metric is null, never 0 and never 100 percent", HW([I("z", "level3", "unattempted", 0)]), {"attemptedAccuracy": None, "assignmentScore": None, "completionRate": None, "invalidItems": 1, "totalItems": 0})
AGS("AGS-006", "mixed levels: per-level token weighted, overall item weighted", HW([I("a", "level1", "attempted", 6, FR(6, 6)), I("b", "level3", "attempted", 15, FR(10, 15)), I("c", "level4", "unattempted", 25)]),
    {"levels": {"level1": {"attemptedAccuracy": FR(1, 1), "assignmentScore": FR(1, 1)}, "level3": {"attemptedAccuracy": FR(2, 3), "assignmentScore": FR(2, 3)}, "level4": {"attemptedAccuracy": None, "assignmentScore": FR(0, 1)}},
     "overall": {"itemWeightedAssignmentScore": FR(5, 9), "unitWeightedAssignmentScore": FR(8, 23), "completionRate": FR(2, 3)}})
AGS("AGS-007", "unsubmitted homework: assignment score is only a labelled projection", HW(ten, False), {"assignmentScore": None, "projectedAssignmentScore": FR(1, 5), "attemptedAccuracy": FR(1, 1), "completionRate": FR(1, 5)})
AGS("AGS-008", "free practice never has an assignment score", {"mode": "free_practice", "submitted": False, "items": ten}, {"assignmentScore": None, "projectedAssignmentScore": None, "attemptedAccuracy": FR(1, 1), "completionRate": FR(1, 5)})
AGS("AGS-009", "reveal-only items count as not attempted and are reported as reviewed only", HW([I("a", "level3", "attempted", 6, FR(6, 6)), I("r", "level3", "reviewed_only", 6)]), {"attemptedAccuracy": FR(1, 1), "assignmentScore": FR(1, 2), "completionRate": FR(1, 2), "reviewedOnly": 1})
AGS("AGS-010", "first attempt is immutable: the score uses the first attempt, practice accuracy reports the later one", HW([I("a", "level3", "attempted", 6, FR(4, 6), FR(6, 6))]), {"attemptedAccuracy": FR(2, 3), "assignmentScore": FR(2, 3), "practiceAccuracy": FR(1, 1)})
AGS("AGS-011", "Answer Spotter list item: unattempted weight is the number of expected candidates", HW([I("s1", "answerSpotter", "attempted", 1, FR(1, 1)), I("s2", "answerSpotter", "attempted", 2, FR(1, 3)), I("s3", "answerSpotter", "unattempted", 2)]), {"attemptedAccuracy": FR(1, 2), "assignmentScore": FR(1, 3), "completionRate": FR(2, 3)})
# --- exposure (C11, D-16 revised, design review 3)
EX = ("adversarial", "exposure")
def EXA(vid, title, events, exposure, hist, exp): new("attempts.json", vid, title, "attemptSequence", {"exposure": exposure, "exposureHistoryComplete": hist, "events": events}, exp, EX, ["D-16"])
C = lambda num, den, ans=None: dict({"op": "check", "num": num, "den": den}, **({"answer": ans} if ans else {}))
EXA("EXP-001", "no exposure and complete history: novel independent success", [C(6, 6)], "none", True, {"evidence": "novel_independent", "independence": "independent", "outcome": "succeeded"})
EXA("EXP-002", "no in-session exposure but history not asserted complete: independence without a novelty claim", [C(6, 6)], "none", False, {"evidence": "independent_unverified_novelty"})
EXA("EXP-003", "unknown exposure never claims novelty", [C(6, 6)], "unknown", True, {"evidence": "independent_unverified_novelty"})
EXA("EXP-004", "sentence met as Level 1 tiles then answered correctly in Level 3: valid practice success, not novel", [C(6, 6)], "tokens_shown", True, {"evidence": "practice_success", "independence": "independent", "outcome": "succeeded"})
EXA("EXP-005", "sentence met as Level 2 context then answered correctly: practice success", [C(6, 6)], "context_shown", True, {"evidence": "practice_success"})
EXA("EXP-006", "answer was shown earlier: practice success", [C(6, 6)], "answer_shown", True, {"evidence": "practice_success"})
EXA("EXP-007", "hint before the first Check: assisted success, never novel", [{"op": "hint"}, C(6, 6)], "none", True, {"evidence": "assisted_success", "independence": "assisted"})
EXA("EXP-008", "wrong first attempt then exact: practice success even with no exposure", [C(4, 6), C(6, 6)], "none", True, {"evidence": "practice_success", "independence": "independent"})
EXA("EXP-009", "reveal then copy: no evidence, not attempted", [{"op": "reveal"}, C(6, 6)], "none", True, {"evidence": "none", "outcome": "reviewed", "attempted": False, "firstAttempt": None})
EXA("EXP-010", "hint after the first Check does not make the first attempt assisted", [C(4, 6), {"op": "hint"}, C(6, 6)], "none", True, {"independence": "independent", "firstAttempt": {"independent": True}, "evidence": "practice_success"})
EXA("EXP-011", "five identical Checks create one attempt", [C(4, 6, "a b")] * 5, "none", False, {"attempts": [ATT(0, 4, 6, False, 0, False)], "outcome": "in_progress"})
EXA("EXP-012", "first attempt is immutable after many later attempts", [C(2, 6), C(3, 6), C(6, 6)], "none", True, {"firstAttempt": FA(2, 6, False, True), "outcome": "succeeded", "currentPractice": {"num": 6, "den": 6}})
EXA("EXP-013", "checks after reveal are post_reveal and never counted as attempts for completion", [C(3, 6), {"op": "reveal"}, C(6, 6), C(6, 6, "x")], "none", True, {"attempts": [ATT(0, 3, 6, False, 0, False), ATT(1, 6, 6, True, 0, True, "post_reveal"), ATT(2, 6, 6, True, 0, True, "post_reveal")], "outcome": "reviewed", "evidence": "none"})
XD = lambda vid, title, events, exp, host=None: new("attempts.json", vid, title, "exposureDerivation", {"events": events, "query": "s004", "host": host or {}}, exp, EX, ["D-16"])
XD("EXD-001", "Level 1 presentation exposes the tokens", [{"op": "present", "level": "level1", "sentenceId": "s004"}], {"exposure": "tokens_shown"})
XD("EXD-002", "Level 2 presentation exposes the context and outranks tiles", [{"op": "present", "level": "level1", "sentenceId": "s004"}, {"op": "present", "level": "level2", "sentenceId": "s004"}], {"exposure": "context_shown"})
XD("EXD-003", "Level 3 and Level 4 dictation do not expose the text", [{"op": "present", "level": "level3", "sentenceId": "s004"}, {"op": "present", "level": "level4", "sentenceId": "s004"}], {"exposure": "none"})
XD("EXD-004", "reveal exposes the full answer", [{"op": "reveal", "sentenceId": "s004"}], {"exposure": "answer_shown"})
XD("EXD-005", "host-supplied earlier exposure is merged by maximum", [], {"exposure": "answer_shown"}, {"priorExposure": {"s004": "answer_shown"}})
XD("EXD-006", "history unknown and nothing seen in session: unknown", [], {"exposure": "unknown"}, {"history": "unknown"})
XD("EXD-007", "history unknown but tiles were shown in session: the known exposure wins", [{"op": "present", "level": "level1", "sentenceId": "s004"}], {"exposure": "tokens_shown"}, {"history": "unknown"})
XD("EXD-008", "post-check transcript review exposes the answer", [{"op": "present", "level": "answerSpotterReview", "sentenceId": "s004"}], {"exposure": "answer_shown"})
XD("EXD-009", "other sentences are unaffected", [{"op": "present", "level": "level1", "sentenceId": "s005"}], {"exposure": "none"})
# --- server-confirmed submission (C13, D-20 revised)
SB = ("adversarial", "submission")
def SUBV(vid, title, events, results, final, items=("A", "B"), decs=("D-20",), mode="homework"):
    new("session.json", vid, title, "session", {"mode": mode, "version": "v1", "items": list(items), "events": events}, {"results": results, "final": final}, SB, list(decs))
CHK = lambda item, num=6, den=6: {"op": "check", "item": item, "num": num, "den": den}
SUBV("SUB-001", "a confirmed submit request is pending, never submitted, until the server acknowledges", [CHK("A"), CHK("B"), SUBMIT("k1")], ["recorded", "recorded", "submit_pending"], {"submitted": False, "submissionState": "submit_pending"})
SUBV("SUB-002", "failure notice restores the draft with all data intact", [CHK("A"), CHK("B"), SUBMIT("k1"), {"op": "submit_failed", "key": "k1"}], ["recorded", "recorded", "submit_pending", "draft_restored"], {"submitted": False, "submissionState": "draft", "attemptCounts": {"A": 1, "B": 1}})
SUBV("SUB-003", "acknowledgement for another key is ignored", [CHK("A"), CHK("B"), SUBMIT("k1"), ACK("zzz")], ["recorded", "recorded", "submit_pending", "mismatched_ack_ignored"], {"submitted": False, "submissionState": "submit_pending"})
SUBV("SUB-004", "acknowledgement without a pending request is ignored", [CHK("A"), ACK("k1")], ["recorded", "unexpected_ack_ignored"], {"submitted": False, "submissionState": "draft"})
SUBV("SUB-005", "duplicate acknowledgement after success is idempotent", [CHK("A"), CHK("B"), SUBMIT("k1"), ACK("k1"), ACK("k1")], ["recorded", "recorded", "submit_pending", "submitted", "already_submitted"], {"submitted": True, "submissionId": "sub-1"})
SUBV("SUB-006", "server rejection returns to draft", [CHK("A"), CHK("B"), SUBMIT("k1"), ACK("k1", "x", "rejected")], ["recorded", "recorded", "submit_pending", "submit_rejected"], {"submitted": False, "submissionState": "draft"})
SUBV("SUB-007", "an accepted acknowledgement without a submission id is invalid and ignored", [CHK("A"), CHK("B"), SUBMIT("k1"), {"op": "server_ack", "key": "k1", "status": "accepted"}], ["recorded", "recorded", "submit_pending", "invalid_ack_ignored"], {"submitted": False, "submissionState": "submit_pending"})
SUBV("SUB-008", "edits are locked while a submission is pending", [CHK("A"), CHK("B"), SUBMIT("k1"), CHK("A", 3, 6)], ["recorded", "recorded", "submit_pending", "locked_pending_submit"], {"attemptCounts": {"A": 1, "B": 1}, "submissionState": "submit_pending"})
SUBV("SUB-009", "a second request while pending does not create a second submission", [CHK("A"), CHK("B"), SUBMIT("k1"), SUBMIT("k2")], ["recorded", "recorded", "submit_pending", "already_pending"], {"submissionState": "submit_pending"})
SUBV("SUB-010", "optional Free Practice after submission is separate and leaves the submission unchanged", [CHK("A"), CHK("B"), SUBMIT("k1"), ACK("k1"), {"op": "check", "item": "A", "num": 6, "den": 6}, {"op": "startFreePractice"}, {"op": "check", "item": "A", "num": 3, "den": 6, "practice": True}],
     ["recorded", "recorded", "submit_pending", "submitted", "locked_after_submit", "free_practice_started", "recorded_practice"], {"submitted": True, "attemptCounts": {"A": 1, "B": 1}, "practiceAttemptCounts": {"A": 1}})
SUBV("SUB-011", "free practice cannot start before a confirmed submission", [CHK("A"), {"op": "startFreePractice"}], ["recorded", "free_practice_not_available"], {"submitted": False})
SUBV("SUB-012", "empty answers do not count as attempted or answered when counting incomplete items", [{"op": "check_empty", "item": "A"}, SUBMIT("k1", False)], ["empty_answer", "needs_confirmation:2"], {"submitted": False, "submissionState": "draft"})
SUBV("SUB-013", "a client can never become submitted without an acknowledgement event", [CHK("A"), CHK("B"), SUBMIT("k1"), {"op": "saveDraft"}, {"op": "resume"}], ["recorded", "recorded", "submit_pending", "draft_saved", "resumed"], {"submitted": False})
# --- Answer Spotter (C9, design review 7, D-27 revised)
def ITEM(typ="answer_vs_distractor", mode="type_answer", act="independent_listening", etype="price", correct=("£35",), forms=(), distractors=("£40",), maxw=1, numok=True, origin="ai_authored_practice", extra=None, spans_only=None):
    spans = [{"role": "correct_answer", "span": {"sentenceId": "s010", "charStart": 0, "charEnd": len(correct[0]), "surface": c, "occurrence": 1}, "reason": "x"} for c in correct]
    if forms: spans[0]["acceptedForms"] = [{"text": t, "kind": k, "approvalState": "teacher_approved", "approvedAt": TS} for t, k in forms]
    spans += [{"role": "distractor", "span": {"sentenceId": "s010", "charStart": 0, "charEnd": len(d), "surface": d, "occurrence": 1}, "reason": "x"} for d in distractors]
    it = {"id": "as-x01", "type": typ, "origin": origin, "activity": act, "responseMode": mode, "prompt": "Practice question (authored).", "expectedAnswerType": etype, "answerFormat": {"maxWords": maxw, "numberAllowed": numok},
          "evidenceSentenceIds": ["s010"], "spans": spans, "explanation": "x"}
    if extra: it.update(extra)
    return it
AV = ("adversarial", "answer_value")
def ASV(vid, title, item, resp, exp, decs=("D-27", "D-30")): new("answer-spotter.json", vid, title, "scoreAnswerSpotter", {"item": item, "response": resp}, exp, AV, list(decs))
P35 = ITEM(forms=[("35", "symbol_optional")])
ASV("AS-028", "approved symbol-free value is accepted", P35, {"text": "35"}, {"correct": True, "num": 1, "den": 1})
ASV("AS-029", "the printed value is accepted", P35, {"text": "£35"}, {"correct": True, "num": 1, "den": 1})
ASV("AS-030", "extra decimals are a different value", P35, {"text": "£35.00"}, {"correct": False, "num": 0, "den": 1})
ASV("AS-031", "35.0 is not 35", P35, {"text": "35.0"}, {"correct": False, "num": 0, "den": 1})
ASV("AS-032", "3.5 is not 35", P35, {"text": "3.5"}, {"correct": False, "num": 0, "den": 1})
ASV("AS-033", "£350 is not £35", P35, {"text": "£350"}, {"correct": False, "num": 0, "den": 1})
ASV("AS-034", "distractor value typed", P35, {"text": "£40"}, {"correct": False, "distractorChosen": True, "num": 0, "den": 1})
ASV("AS-035", "spelled-out number is not approved", P35, {"text": "thirty-five"}, {"correct": False, "num": 0, "den": 1})
ASV("AS-036", "percent answer needs the percent sign", ITEM(etype="number", correct=("20%",), distractors=("30%",)), {"text": "20"}, {"correct": False, "num": 0, "den": 1})
ASV("AS-037", "percent answer matches exactly", ITEM(etype="number", correct=("20%",), distractors=("30%",)), {"text": "20%"}, {"correct": True, "num": 1, "den": 1})
ASV("AS-038", "spelling variant is not accepted unless approved", ITEM(etype="common_noun", correct=("colour",), distractors=("shape",)), {"text": "color"}, {"correct": False, "num": 0, "den": 1})
ASV("AS-039", "approved spelling variant is accepted", ITEM(etype="common_noun", correct=("colour",), forms=[("color", "spelling_variant")], distractors=("shape",)), {"text": "color"}, {"correct": True, "num": 1, "den": 1})
ASV("AS-040", "an unapproved (proposed) form is never used for grading", ITEM(forms=[("35", "symbol_optional")]) | {"spans": [dict(s, **({"acceptedForms": [{"text": "35", "kind": "symbol_optional", "approvalState": "proposed"}]} if s["role"] == "correct_answer" else {})) for s in ITEM()["spans"]]}, {"text": "35"}, {"correct": False, "num": 0, "den": 1})
VAL = lambda vid, title, item, ctx, exp: new("answer-spotter.json", vid, title, "itemValidity", {"item": item, "lesson": ctx}, exp, ("adversarial", "provenance"), ["D-27"])
VAL("AS-041", "independent item that selects transcript text is invalid", ITEM(mode="select_span_in_text"), {}, {"valid": False, "code": "E-AS-MODE-VISIBILITY"})
VAL("AS-042", "post-check review without a paired independent item is invalid", ITEM(mode="select_span_in_text", act="post_check_transcript_review", extra={"pairedIndependentItemId": "as-nope"}), {"itemIds": ["as-x01"]}, {"valid": False, "code": "E-AS-REVIEW-PAIR"})
VAL("AS-043", "choose_option with a single option is invalid", ITEM(mode="choose_option", distractors=()), {}, {"valid": False, "code": "E-AS-OPTIONS"})
VAL("AS-044", "official origin without an official claim is invalid", ITEM(origin="official_paper_transcribed"), {}, {"valid": False, "code": "E-AS-ORIGIN-CLAIM"})
VAL("AS-045", "a valid independent multiple choice item", ITEM(mode="choose_option"), {}, {"valid": True})
PV = lambda vid, title, item, exp: new("answer-spotter.json", vid, title, "provenance", {"item": item}, exp, ("adversarial", "provenance"), ["D-27"])
PV("AS-046", "AI-authored practice is never labelled official", ITEM(), {"isOfficial": False, "label": "AI-authored practice (not an official Cambridge question)"})
PV("AS-047", "teacher-authored practice label", ITEM(origin="teacher_authored_practice"), {"isOfficial": False, "label": "Teacher-authored practice"})
CLAIM = {"claims": ["answer_key"], "questionNumber": 2, "sourceNote": "SYNTHETIC", "evidenceStatus": "official_source_confirmed", "rightsAttested": True, "attestedByRole": "teacher", "attestedAt": TS}
PV("AS-048", "official label only with a complete official claim", ITEM(origin="official_paper_transcribed", extra={"officialClaim": CLAIM}), {"isOfficial": True, "label": "Official (verified source, rights attested)"})
PV("AS-049", "official origin with a broken claim is not labelled official", ITEM(origin="official_paper_transcribed", extra={"officialClaim": dict(CLAIM, rightsAttested=False)}), {"isOfficial": False, "label": "Invalid provenance"})
# ---------------------------------------------------------------- write
RESULT = {}
SUITE = dict(order)
for fname, vs in files.items():
    json.dump({"suite": SUITE[fname], "vectorsVersion": "2", "baseline": "baseline-harbour-museum.rev1.json", "vectors": sorted(vs, key=lambda v: (v["id"][:v["id"].index("-")], v["id"]))}, open(os.path.join(OUT, fname), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
tot = sum(len(v) for v in files.values()); cnt = {s: sum(1 for x in status.values() if x == s) for s in ("unchanged", "changed", "new")}
json.dump({"manifestVersion": "2", "originalVectors": 134, "totals": dict(cnt, total=tot), "vectors": {k: {"status": status[k], "reason": reasons[k]} for k in sorted(status)}}, open(os.path.join(PK, "golden-tests", "vector-status-manifest.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(tot, cnt)
