#!/usr/bin/env python3
"""
derive-v1.1-vectors.py : builds golden-tests-v1.1/vectors from the UNCHANGED v2 suite (../golden-tests/vectors) plus the hand-written
new vectors in new-vectors.json, for contract v1.1 (owner policy 2026-11: no hint, no reveal, review after a valid Check / after the
server acknowledgement, homework has no scored Check before submission, PASS on the whole-assignment score).

Every change is listed here, per vector id, with its reason. Nothing is copied from an implementation's output: removed fields are
removed, changed expected values are written below by hand from contract v1.1, and the oracle then has to agree.
Run from anywhere:  python -I derive-v1.1-vectors.py     (rewrites ../vectors/*.json and ../vector-status-manifest.json)
"""
import json, os, copy
HERE = os.path.dirname(os.path.abspath(__file__)); SUITE = os.path.join(HERE, ".."); V2 = os.path.join(SUITE, "..", "golden-tests")
OWNER = "owner policy 2026-11 (v1.1): Hint and Reveal removed for students"
REMOVED = {
    "ATT-003": OWNER + "; hint before the first Check no longer exists",
    "ATT-004": OWNER + "; hint ladder no longer exists",
    "ATT-005": OWNER + "; reveal before any Check no longer exists",
    "ATT-006": OWNER + "; reveal then copy no longer exists",
    "ATT-013": OWNER + "; 'same answer after a hint' no longer exists (D-18 is still covered by ATT-012, EXP-011)",
    "EXP-007": OWNER + "; 'assisted' evidence no longer exists",
    "EXP-009": OWNER + "; reveal-only evidence no longer exists",
    "EXP-010": OWNER + "; hint after the first Check no longer exists",
    "EXP-013": OWNER + "; post_reveal attempts no longer exist",
    "EXD-004": OWNER + "; exposure by Reveal replaced by exposure by review after a Check (EXD-010)",
    "AS-023": "D-28 replaced: postCheckReviewUnlock setting ignored; v1.1 gate covered by RVU-001..008",
    "AS-024": "D-28 replaced: postCheckReviewUnlock setting ignored; v1.1 gate covered by RVU-001..008",
    "AS-025": "D-28 replaced: 'after_reveal' cannot exist without Reveal",
    "AS-026": "D-28 replaced: 'after_reveal' cannot exist without Reveal",
    "AGS-009": OWNER + "; reveal-only (reviewed_only) items no longer exist",
}
STATUS = {"independent_success": "first_attempt_exact"}
def att_v11(e, exposure):
    """attemptSequence expected: drop the hint/reveal/independence/evidence fields, rename the status. Hand-checked per vector."""
    e = copy.deepcopy(e)
    for k in ("independence", "evidence"): e.pop(k, None)
    if "attempts" in e: e["attempts"] = [{k: a[k] for k in ("index", "num", "den", "exact")} for a in e["attempts"]]
    if e.get("firstAttempt"): e["firstAttempt"].pop("independent", None)
    if "status" in e: e["status"] = STATUS.get(e["status"], e["status"])
    return e
EXP_V11 = {  # these vectors only checked the removed 'evidence' / 'independence' fields; new expected values written by hand
    "EXP-001": ("no exposure: first exact Check; informational exposure 'none' (no novelty claim exists in v1.1, P-06)", {"exposureAtFirstCheck": "none", "outcome": "succeeded", "status": "first_attempt_exact"}),
    "EXP-002": ("history completeness changes nothing: there is no novelty claim to verify (D-16 replaced)", {"exposureAtFirstCheck": "none", "status": "first_attempt_exact"}),
    "EXP-003": ("unknown exposure is reported as unknown, never as none", {"exposureAtFirstCheck": "unknown"}),
    "EXP-004": ("Level 1 tiles seen before the first Check are reported, informational only", {"exposureAtFirstCheck": "tokens_shown", "outcome": "succeeded", "status": "first_attempt_exact"}),
    "EXP-005": ("Level 2 context seen before the first Check is reported, informational only", {"exposureAtFirstCheck": "context_shown"}),
    "EXP-006": ("answer seen (review of another item) before the first Check is reported, informational only", {"exposureAtFirstCheck": "answer_shown"}),
    "EXP-008": ("wrong first attempt then exact: improved after practice; first attempt stays the wrong one", {"status": "improved_after_practice", "exposureAtFirstCheck": "none", "firstAttempt": {"num": 4, "den": 6, "exact": False}}),
    "EXP-011": ("five identical Checks create one attempt", {"attempts": [{"index": 0, "num": 4, "den": 6, "exact": False}], "outcome": "in_progress", "practiceAttempts": 0}),
    "EXP-012": ("first attempt is immutable after many later attempts; later ones are practice", {"firstAttempt": {"num": 2, "den": 6, "exact": False}, "outcome": "succeeded", "currentPractice": {"num": 6, "den": 6}, "practiceAttempts": 2}),
}
TITLE = {"ATT-001": "first check exact", "ATT-009": "first check exact after the sentence was shown as Level 1 tiles (exposure is informational)", "ATT-010": "first check exact after the answer was seen elsewhere (exposure is informational)",
         "AGG-002": "unattempted items are not attempted: attempted accuracy 18/22, completion 3 of 5 (v1.1: no reviewed-only state)",
         "NAV-003": "autosaved draft restores the draft answers; a draft is not a submission", "NAV-009": "an empty draft answer is recorded as not answered; a later answer replaces it",
         "SUB-012": "empty answers do not count as answered when counting incomplete items"}

def session_v11(v):
    """Homework session vectors: v1.1 has no scored Check before submission. A draft 'check' becomes an 'answer' event and its result
    'recorded' / 'empty_answer' becomes 'draft_updated'; final attemptCounts become 'answered'. Locks are unchanged."""
    v = copy.deepcopy(v); inp = v["input"]; exp = v["expected"]
    if inp["mode"] != "homework": return v
    sub = "draft"; ev2 = []; res2 = []; answered = {i: False for i in inp["items"]}
    drop = set()
    for k, ev in enumerate(inp["events"]):
        if ev["op"] == "hint": drop.add(k); continue
        if ev["op"] in ("check", "check_empty") and not ev.get("practice"):
            ev2.append({"op": "answer", "item": ev["item"], "empty": ev["op"] == "check_empty"})
        else: ev2.append(ev)
    res = [r for k, r in enumerate(exp.get("results", [])) if k not in drop]
    for k, r in enumerate(res):
        e = ev2[k]
        if e["op"] == "answer" and r in ("recorded", "empty_answer"): res2.append("draft_updated")
        else: res2.append(r)
    inp["events"] = ev2
    if "results" in exp: exp["results"] = res2
    f = exp.get("final", {})
    if "attemptCounts" in f:
        ac = f.pop("attemptCounts"); f["answered"] = {}
        for i in ac:  # hand rule: answered = the last draft answer for the item was non-empty
            last = [e for e in ev2 if e["op"] == "answer" and e["item"] == i]; f["answered"][i] = bool(last) and not last[-1]["empty"]
    f.pop("hints", None); f.pop("firstAttempt", None)
    return v

def main():
    new = json.load(open(os.path.join(SUITE, "new-vectors.json"), encoding="utf-8"))
    man = {"manifestVersion": "3", "contract": "dictation-scoring-contract-v1.1.md", "derivedFrom": "../golden-tests (v2, 242 vectors, unchanged)", "vectors": {}, "removed": {}}
    for f in sorted(os.listdir(os.path.join(V2, "vectors"))):
        d = json.load(open(os.path.join(V2, "vectors", f), encoding="utf-8")); out = []
        for v in d["vectors"]:
            i = v["id"]
            if i in REMOVED: man["removed"][i] = {"reason": REMOVED[i], "v2file": f}; continue
            w = copy.deepcopy(v); why = None
            if w["kind"] == "attemptSequence":
                if i in EXP_V11: w["title"], w["expected"] = EXP_V11[i][0], copy.deepcopy(EXP_V11[i][1]); why = "expected rewritten: 'evidence'/'independence' removed (D-14, D-16 replaced; P-01/P-06 informational exposure)"
                else:
                    e2 = att_v11(w["expected"], w["input"].get("exposure", "none"))
                    if e2 != w["expected"]: w["expected"] = e2; why = "hint/reveal/independence fields removed from the expected value; status independent_success renamed first_attempt_exact"
            elif w["kind"] == "aggregateScores":
                e2 = copy.deepcopy(w["expected"]); e2.pop("reviewedOnly", None)
                for it in w["input"]["items"]:
                    if it["state"] == "reviewed_only": it["state"] = "unattempted"; why = "input state reviewed_only -> unattempted (no reveal in v1.1)"
                if e2 != w["expected"]: w["expected"] = e2; why = (why + "; " if why else "") + "reviewedOnly removed"
            elif w["kind"] == "session":
                w2 = session_v11(w)
                if w2 != w: w = w2; why = "homework: draft 'check' -> 'answer' (no scored Check before submission, O-2); hint events removed"
            if i == "SUB-013":  # hand edit (v1.1): resuming a draft is an edit, and edits are locked while the submission is pending (D-20)
                w["expected"]["results"][-1] = "locked_pending_submit"; w["title"] = "a client can never become submitted without an acknowledgement; resuming a draft while pending is locked"
                why = (why + "; " if why else "") + "resume while pending is now locked_pending_submit (it was 'resumed')"
            if i in TITLE: w["title"] = TITLE[i]; why = why or "title only"
            st = "changed" if why else "unchanged"; man["vectors"][i] = {"status": st, **({"reason": why} if why else {})}; out.append(w)
        for v in new.get(f, []): man["vectors"][v["id"]] = {"status": "new", "reason": "hand-written for contract v1.1"}; out.append(v)
        d["vectorsVersion"] = "3"; d["vectors"] = out
        json.dump(d, open(os.path.join(SUITE, "vectors", f), "w", encoding="utf-8", newline="\n"), ensure_ascii=False, indent=1)
    c = {}
    for x in man["vectors"].values(): c[x["status"]] = c.get(x["status"], 0) + 1
    man["totals"] = {**c, "removed": len(man["removed"]), "total": len(man["vectors"])}
    json.dump(man, open(os.path.join(SUITE, "vector-status-manifest.json"), "w", encoding="utf-8", newline="\n"), ensure_ascii=False, indent=1)
    print(man["totals"])
if __name__ == "__main__": main()
