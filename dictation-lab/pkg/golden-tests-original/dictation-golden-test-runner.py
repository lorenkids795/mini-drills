#!/usr/bin/env python3
"""
dictation-golden-test-runner.py : runner for the Dictation Lab golden test vectors.

WHAT THIS IS
  * A fixture-integrity and spec-consistency checker that runs TODAY with only Python 3.9+ (jsonschema optional).
  * A host for a FUTURE production-engine adapter (protocol below).
WHAT THIS IS NOT
  * It does not test any production engine. The built-in ORACLE is a small reference implementation of the written spec
    (dictation-golden-scoring-spec.md). It proves the hand-written expected values agree with the written rules. It is NOT
    Codex's engine, and a pass here never means the product works.

Usage:   python dictation-golden-test-runner.py [--vectors DIR] [--adapter "COMMAND"] [--verbose]
Exit:    0 when integrity, baseline and oracle checks pass (and, if an adapter is given, every supported vector passes); 1 otherwise.

Adapter protocol (to test a production engine later): for each vector the runner starts COMMAND, writes ONE JSON line to stdin
  {"kind": "...", "input": {...}, "baseline": "baseline-harbour-museum.rev1.json"}
and reads ONE JSON line from stdout: {"result": {...}} or {"unsupported": true}. The result is compared with `expected` using the same
subset rule as the oracle (every key in expected must be equal in result). Exit code of COMMAND must be 0.
"""
import json, os, re, sys, copy, unicodedata, itertools, subprocess, argparse, importlib.util
HERE = os.path.dirname(os.path.abspath(__file__))
GT = os.path.join(HERE, "dictation-golden-tests")

# =====================================================================  ORACLE (spec reference, NOT production)
WS_RE = re.compile(r"[ \t\n\r\f\v\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]+")
APOS = {"\u2019": "'", "\u2018": "'", "\u02bc": "'"}
MAX_ANSWER_CHARS = 4000
MUT = set()   # deliberate defects used only by the mutation self-check (see MUTANTS)
def has_ln(x): return any(unicodedata.category(c)[0] in "LN" for c in x)
def strip_p(x):
    i, j = 0, len(x)
    if "punct" in MUT: return x
    while i < j and unicodedata.category(x[i]).startswith("P"): i += 1
    while j > i and unicodedata.category(x[j - 1]).startswith("P"): j -= 1
    return x[i:j]
def tokenize_off(text):
    """[(token, chunkStart, chunkEnd)] after NFC, apostrophe mapping, lowercase, punctuation strip; chunks without letter or number are dropped."""
    t = unicodedata.normalize("NFC", text)
    if "apos" not in MUT:
        for k, v in APOS.items(): t = t.replace(k, v)
    if "case" not in MUT: t = t.lower()
    out = []; pos = 0
    for m in re.finditer(r"[^ \t\n\r\f\v\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]+", t):
        tok = strip_p(m.group(0))
        if "currency" in MUT: tok = tok.lstrip("£$€")
        if has_ln(tok): out.append((tok, m.start(), m.end()))
    return out
def tokenize(text): return [x[0] for x in tokenize_off(text)]
def sanitize(s):
    out = []; flag = False
    for c in s:
        cat = unicodedata.category(c)
        if (cat == "Cc" and c not in "\t\n\r") or c in "\u202a\u202b\u202c\u202d\u202e\u2066\u2067\u2068\u2069": flag = True; continue
        out.append(c)
    return "".join(out), flag
def lcs_table(e, a):
    n, m = len(e), len(a); L = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            L[i][j] = L[i - 1][j - 1] + 1 if e[i - 1] == a[j - 1] else max(L[i - 1][j], L[i][j - 1])
    return L
def ops(e, a):
    """Deterministic backtrace: match first; else expected token missing when L[i-1][j] >= L[i][j-1]; else answer token extra."""
    L = lcs_table(e, a); i, j = len(e), len(a); out = []
    while i > 0 or j > 0:
        if i > 0 and j > 0 and e[i - 1] == a[j - 1] and L[i][j] == L[i - 1][j - 1] + 1: out.append(("match", i - 1, j - 1)); i -= 1; j -= 1
        elif i > 0 and (j == 0 or L[i - 1][j] >= L[i][j - 1]): out.append(("missing", i - 1, None)); i -= 1
        else: out.append(("extra", None, j - 1)); j -= 1
    return out[::-1], L[len(e)][len(a)]
def better(c1, c2):  # c = (lcs, den); true if c1 strictly better than c2
    return c1[0] * c2[1] > c2[0] * c1[1] or (c1[0] * c2[1] == c2[0] * c1[1] and c1[0] > c2[0])

class Base:
    def __init__(self, path, mutations=None):
        self.doc = json.load(open(path, encoding="utf-8")); self.S = {s["id"]: s for s in self.doc["transcript"]["sentences"]}
        self.T = {t["id"]: t for t in self.doc["learningTargets"]}; self.items = {}
        for lv, v in self.doc["exercises"].items():
            for it in v["items"]: self.items[it["id"]] = it
        self.forms_proposed = any(m.get("op") == "forms_state" and m.get("value") == "proposed" for m in (mutations or []))
    def approved(self, forms):
        if "forms_any" in MUT: return list(forms)
        return [] if self.forms_proposed else [f for f in forms if f.get("approvalState") == "teacher_approved"]

def score_variants(exp_tokens_with_spans, a_tokens, spans):
    """exp_tokens_with_spans: list of (token, sentIdx). spans: [(firstTokIdx, lastTokIdx, [(label, tokens)...])]. Returns best result dict."""
    options = [[(None, None)] + [(lab, toks) for lab, toks in alts] for (_, _, alts) in spans]
    best = None
    for combo in itertools.product(*[range(len(o)) for o in options]) if spans else [()]:
        etok = []; sidx = []; labels = []; cur = 0
        for k, (fi, la, alts) in enumerate(spans):
            while cur < fi: etok.append(exp_tokens_with_spans[cur][0]); sidx.append(exp_tokens_with_spans[cur][1]); cur += 1
            lab, toks = options[k][combo[k]]
            if lab is None:
                for q in range(fi, la + 1): etok.append(exp_tokens_with_spans[q][0]); sidx.append(exp_tokens_with_spans[q][1])
            else:
                labels.append("alt:" + lab)
                for tk in toks: etok.append(tk); sidx.append(exp_tokens_with_spans[fi][1])
            cur = la + 1
        while cur < len(exp_tokens_with_spans): etok.append(exp_tokens_with_spans[cur][0]); sidx.append(exp_tokens_with_spans[cur][1]); cur += 1
        o, l = ops(etok, a_tokens); den = max(len(etok), len(a_tokens))
        if "positional" in MUT: l = sum(1 for x, y in zip(etok, a_tokens) if x == y)
        if "den_expected" in MUT: den = len(etok)
        cand = {"lcs": l, "den": den, "exact": etok == a_tokens, "variant": "+".join(labels) if labels else "original", "missing": len(etok) - l, "extra": len(a_tokens) - l, "_ops": o, "_sidx": sidx}
        if best is None or better((cand["lcs"], cand["den"]), (best["lcs"], best["den"])): best = cand
    return best

def prep_answer(raw):
    if len(raw) > MAX_ANSWER_CHARS: return None, None, "answer_too_long"
    clean, flag = sanitize(raw); toks = tokenize(clean)
    if not toks: return None, flag, "empty_answer"
    return toks, flag, None

def sentence_expected(base, sent_ids):
    toks = []; spans = []
    for k, sid in enumerate(sent_ids):
        s = base.S[sid]; tw = tokenize_off(s["cleanText"]); off = len(toks)
        for (t, a, b) in tw: toks.append((t, k))
        for tg in base.T.values():
            if tg["sentenceId"] != sid: continue
            alts = [(f["text"], tokenize(f["text"])) for f in base.approved(tg.get("allowedForms", []))]
            if not alts: continue
            idx = [off + q for q, (t, a, b) in enumerate(tw) if a < tg["charEnd"] and tg["charStart"] < b]
            if idx: spans.append((idx[0], idx[-1], alts))
    if "global_contractions" in MUT:
        off = 0
        for k, sid in enumerate(sent_ids):
            tw = tokenize_off(base.S[sid]["cleanText"])
            for q, (t, a, b) in enumerate(tw):
                if t.endswith("'re") and not any(sp[0] == off + q for sp in spans): spans.append((off + q, off + q, [(t.replace("'re", " are"), tokenize(t.replace("'re", " are")))]))
            off += len(tw)
    spans.sort(key=lambda x: x[0]); return toks, spans

def do_score_sentence(base, inp):
    if "expectedText" in inp: exp = [(t, 0) for t in tokenize(inp["expectedText"])]; spans = []; ns = 1
    elif "itemId" in inp: ids = base.items[inp["itemId"]]["sentenceIds"]; exp, spans = sentence_expected(base, ids); ns = len(ids)
    else: exp, spans = sentence_expected(base, [inp["sentenceId"]]); ns = 1
    raw = inp["answer"] if "answer" in inp else inp["answerRepeat"]["unit"] * inp["answerRepeat"]["times"]
    a, flag, rej = prep_answer(raw)
    if rej: return {"rejected": rej}
    r = score_variants(exp, a, spans); matched = {i for (op, i, j) in r["_ops"] if op == "match"}
    res = {k: v for k, v in r.items() if not k.startswith("_")}
    if "itemId" in inp: res["sentenceMatchedAll"] = [all(i in matched for i, s in enumerate(r["_sidx"]) if s == k) for k in range(ns)]
    if flag: res["sanitized"] = True
    res["tokens"] = a; return res

def do_l1_arrangement(base, inp):
    it = base.items[inp["itemId"]]; exp = tokenize(base.S[it["sentenceId"]]["cleanText"])
    placed = [t for p in inp["placed"] for t in tokenize(p)]
    if not placed: return {"rejected": "empty_answer"}
    o, l = ops(exp, placed); res = {"lcs": l, "den": max(len(exp), len(placed)), "exact": exp == placed}
    dis = {tokenize(d["text"])[0] for d in it.get("distractors", [])}
    if dis & set(placed): res["usedDistractor"] = True
    return res

def do_l1_events(base, inp):
    tiles = inp["tiles"]; order = [t["id"] for t in tiles]; text = {t["id"]: t["text"] for t in tiles}; placed = []; chk = None
    for ev in inp["events"]:
        op = ev["op"]
        if op == "place" and ev["tile"] in order and ev["tile"] not in placed: placed.append(ev["tile"])
        elif op == "remove" and ev["tile"] in placed: placed.remove(ev["tile"])
        elif op == "move" and ev["tile"] in placed: placed.remove(ev["tile"]); placed.insert(ev["to"], ev["tile"])
        elif op == "check":
            a = [t for p in placed for t in tokenize(text[p])]
            if not a: chk = {"rejected": "empty_answer"}
            else:
                e = tokenize(inp["expectedText"]); o, l = ops(e, a); chk = {"lcs": l, "den": max(len(e), len(a)), "exact": e == a}
    res = {"pool": [i for i in order if i not in placed], "placed": placed}
    if chk is not None: res["check"] = chk
    return res

def do_l2(base, inp):
    it = base.items[inp["itemId"]]; per = []; num = den = 0; allex = True; answers = inp["answers"]
    if not any(tokenize(x) for x in answers): return {"rejected": "empty_answer"}
    for bl, ans in zip(it["blanks"], answers):
        tg = base.T[bl["targetId"]]; exp = [(t, 0) for t in tokenize(tg["surface"])]
        alts = [(f["text"], tokenize(f["text"])) for f in base.approved(tg.get("allowedForms", []))]
        a, _ = (tokenize(ans), None)
        r = score_variants(exp, a, [(0, len(exp) - 1, alts)] if alts else [])
        per.append({"lcs": r["lcs"], "den": r["den"], "exact": r["exact"], "variant": r["variant"]}); num += r["lcs"]; den += r["den"]; allex &= r["exact"]
    return {"perBlank": per, "num": num, "den": den, "exact": allex}

def as_variants(base, span):
    surf = span["span"]["surface"]; forms = [f for f in base.approved(span.get("acceptedForms", []))]
    return [tokenize(surf)] + [tokenize(f["text"]) for f in forms]
def do_as(base, inp):
    it = base.items[inp["itemId"]]; resp = inp["response"]; spans = it["spans"]; mode = it["responseMode"]; fmt = it.get("answerFormat") or {}
    if it["activity"] == "post_check_transcript_review":
        cands = [tokenize(s["span"]["surface"]) for s in spans]; sel = [tokenize(x) for x in resp["selected"]]; used = set(); m = 0
        for s in sel:
            for k, c in enumerate(cands):
                if k not in used and s == c: used.add(k); m += 1; break
        return {"reviewed": True, "reviewMatches": m, "reviewDen": max(len(cands), len(sel)), "independentCredit": "review_credit" in MUT, "masteryEvidence": "none"}
    if mode == "choose_option":
        ch = tokenize(resp["chosen"]); cor = [tokenize(s["span"]["surface"]) for s in spans if s["role"] == "correct_answer"]; dis = [tokenize(s["span"]["surface"]) for s in spans if s["role"] == "distractor"]
        ok = ch in cor; r = {"correct": ok, "num": 1 if ok else 0, "den": 1}
        if ch in dis: r["distractorChosen"] = True
        return r
    text = resp["text"]
    if it["type"] == "target_detection":
        parts = [p for p in re.split(r"[,;\n]", text) if tokenize(p)]
        if not parts: return {"rejected": "empty_answer"}
        cands = [as_variants(base, s) for s in spans if s["role"] == "candidate"]; used = set(); m = 0
        for p in parts:
            t = tokenize(p)
            for k, vs in enumerate(cands):
                if k not in used and t in vs: used.add(k); m += 1; break
        den = max(len(cands), len(parts)); return {"correct": m == len(cands) and len(parts) == len(cands), "num": m, "den": den}
    toks = tokenize(text)
    if "stem" in MUT: toks = [t.rstrip("s") for t in toks]
    if not toks: return {"rejected": "empty_answer"}
    if fmt.get("maxWords") and len(toks) > fmt["maxWords"]: return {"correct": False, "rejected": "exceeds_word_limit", "num": 0, "den": 1}
    if fmt.get("numberAllowed") is False and any(c.isdigit() for t in toks for c in t): return {"correct": False, "rejected": "number_not_allowed", "num": 0, "den": 1}
    cor = [v for s in spans if s["role"] == "correct_answer" for v in as_variants(base, s)]; dis = [tokenize(s["span"]["surface"]) for s in spans if s["role"] == "distractor"]
    if "stem" in MUT: cor = [[t.rstrip("s") for t in v] for v in cor]
    ok = toks in cor; r = {"correct": ok, "num": 1 if ok else 0, "den": 1}
    if toks in dis: r["distractorChosen"] = True
    return r

def do_unlock(base, inp):
    st = inp["pairedItemState"]; s = inp["setting"]
    return {"unlocked": (st["attempts"] >= 1) if s == "after_first_attempt_checked" else bool(st["revealed"])}

def mastery(status, exposure):
    if "exposure_ignored" in MUT: exposure = "none"
    if status == "independent_success": return {"none": "independent", "tokens_shown": "independent_exposed", "context_shown": "independent_exposed"}.get(exposure, "practice")
    return "practice" if status == "improved_after_practice" else "none"
def attempt_reducer(events, exposure="none"):
    att = []; hints = 0; revealed = False; last = None
    for ev in events:
        op = ev["op"]
        if op == "hint": hints += 1; last = None
        elif op == "reveal": revealed = True; last = None
        elif op == "check_empty":
            last = None
            if "blank_attempt" in MUT: att.append({"index": len(att), "num": 0, "den": 1, "exact": False, "hintsBefore": hints, "revealedBefore": revealed})
        elif op == "check":
            if "no_dedupe" not in MUT and ev.get("answer") is not None and ev["answer"] == last: continue
            last = ev.get("answer"); att.append({"index": len(att), "num": ev["num"], "den": ev["den"], "exact": ev["num"] == ev["den"], "hintsBefore": hints, "revealedBefore": revealed})
    first = att[0] if att else None
    clean_first = first and first["exact"] and ("hint_independent" in MUT or first["hintsBefore"] == 0) and not first["revealedBefore"]
    if clean_first: status = "independent_success"
    elif any(a["exact"] and ("reveal_mastery" in MUT or not a["revealedBefore"]) for a in att): status = "improved_after_practice"
    elif revealed: status = "reviewed"
    elif att: status = "in_progress"
    else: status = "not_started"
    cur = [a for a in att if not a["revealedBefore"]]
    return {"attempts": att, "firstAttempt": ({"num": first["num"], "den": first["den"], "independent": ("hint_independent" in MUT or first["hintsBefore"] == 0) and not first["revealedBefore"]} if first else None),
            "status": status, "masteryEvidence": mastery(status, exposure), "currentPractice": ({"num": cur[-1]["num"], "den": cur[-1]["den"]} if cur else None)}
def do_aggregate(inp):
    its = inp["items"]; fs = [i["first"] for i in its if i["first"]]; st = [i["status"] for i in its]
    from fractions import Fraction
    fsc = {"num": sum(f["num"] for f in fs), "den": sum(f["den"] for f in fs)}
    if "mean_pct" in MUT:
        mean = sum(Fraction(f["num"], f["den"]) for f in fs) / len(fs); fsc = {"num": mean.numerator, "den": mean.denominator}
    return {"firstAttemptScore": fsc, "items": len(its), "independentSuccess": st.count("independent_success"),
            "improvedAfterPractice": st.count("improved_after_practice"), "reviewed": st.count("reviewed"), "notAttempted": st.count("not_started")}
def do_session(inp):
    S = {"mode": inp["mode"], "version": inp["version"], "latest": inp["version"], "items": {i: {"att": [], "hints": 0, "rev": False} for i in inp["items"]}, "submitted": False, "subVer": None, "unanswered": []}
    draft = None; res = []
    for ev in inp["events"]:
        op = ev["op"]
        if op in ("check", "check_empty"):
            if S["mode"] == "homework" and S["submitted"]: res.append("locked_after_submit"); continue
            if op == "check_empty": res.append("empty_answer"); continue
            it = S["items"][ev["item"]]; it["att"].append({"num": ev["num"], "den": ev["den"], "hb": it["hints"], "rb": it["rev"]}); res.append("recorded")
        elif op == "hint": S["items"][ev["item"]]["hints"] += 1; res.append("ok")
        elif op == "reveal": S["items"][ev["item"]]["rev"] = True; res.append("ok")
        elif op == "goto": res.append("ok")
        elif op == "saveDraft": draft = copy.deepcopy(S); res.append("draft_saved")
        elif op == "resume":
            latest = S["latest"]; S = copy.deepcopy(draft); S["latest"] = latest
            if "resume_latest" in MUT: S["version"] = latest
            res.append("resumed")
        elif op == "publishNewVersion": S["latest"] = ev["version"]; res.append("ok")
        elif op == "submit":
            inc = [i for i, v in S["items"].items() if not v["att"]]
            if S["mode"] == "free_practice": res.append("not_applicable_free_practice")
            elif S["submitted"]: res.append("already_submitted")
            elif inc and not ev["confirm"] and "submit_unconfirmed" not in MUT: res.append("needs_confirmation:%d" % len(inc))
            elif ev["network"] == "fail": res.append("submit_failed")
            else: S["submitted"] = True; S["subVer"] = S["version"]; S["unanswered"] = inc; res.append("submitted")
    final = {"submitted": S["submitted"], "unanswered": S["unanswered"], "attemptCounts": {i: len(v["att"]) for i, v in S["items"].items()}, "hints": {i: v["hints"] for i, v in S["items"].items() if v["hints"]},
             "firstAttempt": {i: {"num": v["att"][0]["num"], "den": v["att"][0]["den"]} for i, v in S["items"].items() if v["att"]}, "version": S["version"], "latestPublished": S["latest"], "submittedVersion": S["subVer"]}
    return {"results": res, "final": final}

def oracle(kind, inp, baseline_path):
    base = Base(baseline_path, inp.get("mutations"))
    if kind == "tokenize": return {"tokens": tokenize(inp["text"])}
    if kind == "l1Arrangement": return do_l1_arrangement(base, inp)
    if kind == "l1Events": return do_l1_events(base, inp)
    if kind == "l2Blanks": return do_l2(base, inp)
    if kind == "scoreSentence": return do_score_sentence(base, inp)
    if kind == "scoreAnswerSpotter": return do_as(base, inp)
    if kind == "reviewUnlock": return do_unlock(base, inp)
    if kind == "attemptSequence": return attempt_reducer(inp["events"], inp.get("exposure", "none"))
    if kind == "aggregate": return do_aggregate(inp)
    if kind == "session": return do_session(inp)
    return None   # studentPayload, render: need the real engine or UI

def subset(exp, got):
    if isinstance(exp, dict): return isinstance(got, dict) and all(k in got and subset(v, got[k]) for k, v in exp.items())
    if isinstance(exp, list): return isinstance(got, list) and len(exp) == len(got) and all(subset(a, b) for a, b in zip(exp, got))
    return exp == got

# =====================================================================  RUNNER
def main(argv=None):
    ap = argparse.ArgumentParser(); ap.add_argument("--vectors", default=os.path.join(GT, "vectors")); ap.add_argument("--adapter"); ap.add_argument("--verbose", action="store_true"); a = ap.parse_args(argv)
    R = []   # (group, id, ok, detail)
    def rec(g, i, ok, d=""): R.append((g, i, bool(ok), d))
    files = sorted(f for f in os.listdir(a.vectors) if f.endswith(".json")); allv = []; schema_ok = None
    try:
        from jsonschema import Draft202012Validator
        vs = Draft202012Validator(json.load(open(os.path.join(GT, "vector-schema.json"), encoding="utf-8"))); schema_ok = True
    except ImportError: vs = None
    spec_text = open(os.path.join(HERE, "dictation-golden-scoring-spec.md"), encoding="utf-8").read() if os.path.exists(os.path.join(HERE, "dictation-golden-scoring-spec.md")) else ""
    declared = set(re.findall(r"\bD-\d{2}\b", spec_text)); baseline_name = None
    for f in files:
        try: doc = json.load(open(os.path.join(a.vectors, f), encoding="utf-8"))
        except Exception as e: rec("integrity", f, False, "invalid JSON: %s" % e); continue
        if vs:
            errs = list(vs.iter_errors(doc)); rec("integrity", f + " envelope schema", not errs, "; ".join(e.message[:80] for e in errs[:2]))
        baseline_name = doc.get("baseline", baseline_name); allv += [(f, v) for v in doc.get("vectors", [])]
    ids = [v["id"] for _, v in allv]; rec("integrity", "unique vector ids", len(ids) == len(set(ids)), "%d ids" % len(ids))
    rec("integrity", "at least 40 vectors", len(ids) >= 40, str(len(ids))); rec("integrity", "at least 12 adversarial vectors", sum("adversarial" in v["tags"] for _, v in allv) >= 12)
    if vs is None: print("NOTE: jsonschema not installed; envelope schema stage NOT RUN")
    cited = set(re.findall(r"\b(?:TOK|L1|L2|L3|L4|AS|ATT|AGG|NAV|SAF)-\d{3}\b", spec_text)); missing = sorted(cited - set(ids)); rec("integrity", "every vector id cited in the spec exists", not missing, str(missing))
    bad_dec = sorted({d for _, v in allv for d in v.get("decisionRefs", []) if d not in declared}); rec("integrity", "decisionRefs all declared in the spec", not bad_dec, str(bad_dec))
    bpath = os.path.join(GT, baseline_name or "baseline-harbour-museum.rev1.json")
    # baseline validity through the Rev1 reference validator
    refv = os.path.join(HERE, "rev1-reference", "dictation-semantic-validator.py"); refs = os.path.join(HERE, "rev1-reference", "dictation-schema-v1.json")
    if os.path.exists(refv) and os.path.exists(bpath):
        spec = importlib.util.spec_from_file_location("dsv", refv); dsv = importlib.util.module_from_spec(spec); spec.loader.exec_module(dsv)
        bd = json.load(open(bpath, encoding="utf-8")); rep = dsv.validate(bd)
        rec("baseline", "0 semantic errors (Rev1 validator)", not rep["errorCodes"], str(rep["errorCodes"])); rec("baseline", "eligible_for_teacher_preview", rep["publicationEligibility"] == "eligible_for_teacher_preview", rep["publicationEligibility"])
        try:
            from jsonschema import Draft202012Validator as DV
            rec("baseline", "schema valid", not list(DV(json.load(open(refs, encoding="utf-8"))).iter_errors(bd)))
        except ImportError: print("NOTE: baseline schema stage NOT RUN (pip install jsonschema)")
    else: rec("baseline", "baseline and rev1-reference present", False, "missing files")
    base = Base(bpath)
    for f, v in allv:
        inp = v["input"]
        for k in ("itemId",):
            if k in inp and inp[k] not in base.items and v["kind"] not in ("session", "studentPayload"): rec("integrity", v["id"] + " itemId exists", False, inp[k])
        if "sentenceId" in inp and inp["sentenceId"] not in base.S: rec("integrity", v["id"] + " sentenceId exists", False, inp["sentenceId"])
    # oracle
    nrun = nnot = 0
    for f, v in allv:
        if v["requires"] != "oracle": nnot += 1; continue
        got = oracle(v["kind"], v["input"], bpath); nrun += 1
        ok = got is not None and subset(v["expected"], got); rec("oracle", v["id"], ok, "" if ok else "expected %s got %s" % (json.dumps(v["expected"], ensure_ascii=False)[:300], json.dumps(got, ensure_ascii=False)[:300]))
    # adapter
    ad_pass = ad_fail = ad_uns = 0
    if a.adapter:
        for f, v in allv:
            try:
                p = subprocess.run(a.adapter, shell=True, input=json.dumps({"kind": v["kind"], "input": v["input"], "baseline": baseline_name}), capture_output=True, text=True, timeout=60)
                out = json.loads(p.stdout.strip().splitlines()[-1]) if p.returncode == 0 and p.stdout.strip() else {"error": p.stderr[:200]}
            except Exception as e: out = {"error": str(e)}
            if out.get("unsupported"): ad_uns += 1; continue
            ok = "result" in out and subset(v["expected"], out["result"]); rec("adapter", v["id"], ok, "" if ok else str(out)[:300]); ad_pass += ok; ad_fail += (not ok)
    # mutation self-check: the suite must FAIL when the oracle is given a deliberate defect
    MUTANTS = {"case": "case-sensitive comparison", "apos": "curly and straight apostrophes differ", "punct": "punctuation not stripped", "currency": "currency symbol silently ignored",
               "forms_any": "unapproved answer forms accepted", "global_contractions": "broad contraction equivalence (we're = we are everywhere)", "positional": "position-by-position scoring instead of order-aware",
               "den_expected": "extra words not penalised", "blank_attempt": "empty check consumes the first attempt", "no_dedupe": "rapid double Check records two attempts",
               "reveal_mastery": "copying after reveal counts as improvement", "hint_independent": "hint before first check still independent", "exposure_ignored": "prior exposure ignored for mastery",
               "mean_pct": "aggregate is a mean of percentages", "submit_unconfirmed": "incomplete submit without confirmation", "resume_latest": "resume jumps to the newest published version",
               "review_credit": "post-check review gives independent credit", "stem": "typed answers stemmed (plural s ignored)"}
    survivors = []
    for m, desc in MUTANTS.items():
        MUT.clear(); MUT.add(m); killed = 0
        for f, v in allv:
            if v["requires"] != "oracle": continue
            got = oracle(v["kind"], v["input"], bpath); killed += not (got is not None and subset(v["expected"], got))
        MUT.clear(); rec("mutation", "%s (%s) killed by %d vectors" % (m, desc, killed), killed > 0, "SURVIVED: the vectors cannot detect this defect")
        if killed == 0: survivors.append(m)
    by = {}
    for g, i, ok, d in R: by.setdefault(g, [0, 0]); by[g][0 if ok else 1] += 1
    for g, i, ok, d in R:
        if not ok: print("FAIL [%s] %s :: %s" % (g, i, d))
    print("-" * 70)
    for g, (p, fl) in sorted(by.items()): print("%-10s passed %3d  failed %3d" % (g, p, fl))
    kinds = {}
    for _, v in allv: kinds[v["kind"]] = kinds.get(v["kind"], 0) + 1
    print("vectors: %d total in %d files; %d adversarial; %d known_limitation" % (len(allv), len(files), sum("adversarial" in v["tags"] for _, v in allv), sum("known_limitation" in v["tags"] for _, v in allv)))
    print("MUTATION SELF-CHECK: %d of %d deliberate defects detected by the vectors" % (len(MUTANTS) - len(survivors), len(MUTANTS)))
    print("ORACLE (spec consistency, NOT production): %d run, %d need the real engine or UI" % (nrun, nnot))
    if a.adapter: print("ADAPTER: %d passed, %d failed, %d unsupported" % (ad_pass, ad_fail, ad_uns))
    else: print("PRODUCTION ENGINE: NOT RUN (no --adapter). %d vectors still need a real engine or UI: %d behavioural vectors are only spec-checked." % (nnot, nrun))
    tf = sum(v[1] for v in by.values()); print("RESULT: %s" % ("PASS (integrity, baseline and oracle)" if tf == 0 else "FAIL (%d)" % tf)); return 0 if tf == 0 else 1
if __name__ == "__main__": sys.exit(main())
