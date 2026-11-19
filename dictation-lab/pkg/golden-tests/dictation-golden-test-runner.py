#!/usr/bin/env python3
"""
dictation-golden-test-runner.py (v2, contract v1) : runner for the Dictation Lab golden vectors.

Layers, reported separately:
  integrity   vector files, schema, ids, references, decision references, status manifest
  baseline    the baseline import file passes schema + the Rev1 semantic validator
  oracle      PYTHON SPEC ORACLE: an independent reference implementation of dictation-scoring-contract-v1.md, used to prove the
              hand-authored expected values agree with the written rules. NOT the product engine.
  mutation    deliberate defects planted in the oracle must be detected by the vectors
  adapter     any engine (for example the JavaScript hybrid engine) through the one-line JSON protocol:  --adapter "COMMAND"
              stdin  {"kind","input","baseline"}   stdout {"result":{...}} or {"unsupported":true}
Usage: python dictation-golden-test-runner.py [--vectors DIR] [--adapter COMMAND] [--adapter-only] [--json REPORT.json]
Exit 0 only if every executed layer passes.
"""
import json, os, re, sys, copy, unicodedata, itertools, subprocess, argparse, importlib.util
from fractions import Fraction
HERE = os.path.dirname(os.path.abspath(__file__))
MUT = set()
WS = " \t\n\r\f\v\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff"
MAX_ANSWER_CHARS = 4000
CRITICAL = {"ielts_answer_candidate", "number", "date_time", "price"}
def cat(c): return unicodedata.category(c)
def has_ln(x): return any(cat(c)[0] in "LN" for c in x)
def strip_ends(x):
    i, j = 0, len(x)
    while i < j:
        c = x[i]
        if not cat(c).startswith("P"): break
        nxt = x[i + 1] if i + 1 < j else ""
        if c in "-." and nxt and cat(nxt) == "Nd" and "sign_strip" not in MUT and not ("lone_decimal" in MUT and c == "."): break
        i += 1
    while j > i:
        c = x[j - 1]
        if not cat(c).startswith("P") or (c in "%\u2030" and "percent_strip" not in MUT): break
        j -= 1
    return x[i:j]
def tokenize_off(text):
    t = unicodedata.normalize("NFC", text)
    if "apos" not in MUT:
        for k, v in {"\u2019": "'", "\u2018": "'", "\u02bc": "'"}.items(): t = t.replace(k, v)
    t = t.replace("\u2212", "-")
    if "case" not in MUT: t = t.lower()
    out = []
    for m in re.finditer("[^%s]+" % WS, t):
        tok = m.group(0) if "punct" in MUT else strip_ends(m.group(0))
        if "currency" in MUT: tok = tok.lstrip("£$€")
        if has_ln(tok): out.append((tok, m.start(), m.end()))
    return out
def tokenize(text): return [x[0] for x in tokenize_off(text)]
def sanitize(s):
    out = []; flag = False
    for c in s:
        if (cat(c) == "Cc" and c not in "\t\n\r") or c in "\u202a\u202b\u202c\u202d\u202e\u2066\u2067\u2068\u2069": flag = True; continue
        out.append(c)
    return "".join(out), flag
def lcs_table(e, a):
    n, m = len(e), len(a); L = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(1, n + 1):
        for j in range(1, m + 1): L[i][j] = L[i - 1][j - 1] + 1 if e[i - 1] == a[j - 1] else max(L[i - 1][j], L[i][j - 1])
    return L
def ops(e, a):
    L = lcs_table(e, a); i, j = len(e), len(a); out = []
    while i > 0 or j > 0:
        if i > 0 and j > 0 and e[i - 1] == a[j - 1] and L[i][j] == L[i - 1][j - 1] + 1: out.append(("match", i - 1, j - 1)); i -= 1; j -= 1
        elif i > 0 and (j == 0 or L[i - 1][j] >= L[i][j - 1]): out.append(("missing", i - 1, None)); i -= 1
        else: out.append(("extra", None, j - 1)); j -= 1
    return out[::-1], L[len(e)][len(a)]
def better(c1, c2): return c1[0] * c2[1] > c2[0] * c1[1] or (c1[0] * c2[1] == c2[0] * c1[1] and c1[0] > c2[0])
def fr(n, d):
    f = Fraction(n, d); return {"num": f.numerator, "den": f.denominator}

class Base:
    def __init__(self, path, mutations=None):
        self.doc = json.load(open(path, encoding="utf-8")); self.S = {s["id"]: s for s in self.doc["transcript"]["sentences"]}
        self.T = {t["id"]: t for t in self.doc["learningTargets"]}; self.items = {}
        for lv, v in self.doc["exercises"].items():
            for it in v["items"]: self.items[it["id"]] = it
        self.speakers = self.doc["transcript"]["speakers"]
        self.forms_proposed = any(m.get("op") == "forms_state" and m.get("value") == "proposed" for m in (mutations or []))
    def approved(self, forms):
        if "forms_any" in MUT: return list(forms)
        return [] if self.forms_proposed else [f for f in forms if f.get("approvalState") == "teacher_approved"]

def find_sub(tokens, sub):
    for i in range(len(tokens) - len(sub) + 1):
        if tokens[i:i + len(sub)] == sub: return i
    return -1
def score_variants(exp, a, spans, tracks=()):
    options = [[(None, None)] + [(lab, toks) for lab, toks in alts] for (_, _, alts) in spans]; best = None
    for combo in (itertools.product(*[range(len(o)) for o in options]) if spans else [()]):
        etok = []; sidx = []; labels = []; o2v = {}; cur = 0
        def add_orig(q): o2v[q] = (len(etok), len(etok) + 1); etok.append(exp[q][0]); sidx.append(exp[q][1])
        for k, (fi, la, alts) in enumerate(spans):
            while cur < fi: add_orig(cur); cur += 1
            lab, toks = options[k][combo[k]]
            if lab is None:
                for q in range(fi, la + 1): add_orig(q)
            else:
                labels.append("alt:" + lab); st = len(etok)
                for tk in toks: etok.append(tk); sidx.append(exp[fi][1])
                for q in range(fi, la + 1): o2v[q] = (st, len(etok))
            cur = la + 1
        while cur < len(exp): add_orig(cur); cur += 1
        o, l = ops(etok, a); den = max(len(etok), len(a))
        if "positional" in MUT: l = sum(1 for x, y in zip(etok, a) if x == y)
        if "den_expected" in MUT: den = len(etok)
        cand = {"lcs": l, "den": den, "exact": etok == a, "variant": "+".join(labels) if labels else "original", "missing": len(etok) - l, "extra": len(a) - l, "_ops": o, "_sidx": sidx, "_o2v": o2v}
        if best is None or better((cand["lcs"], cand["den"]), (best["lcs"], best["den"])): best = cand
    matched = {i for (op, i, j) in best["_ops"] if op == "match"}; wrong = []; crit = 0
    for (fi, la, tg) in tracks:
        idx = {v for q in range(fi, la + 1) for v in range(*best["_o2v"][q])}
        if any(v not in matched for v in idx):
            wrong.append(tg["id"])
            if CRITICAL & set(tg["focusTypes"]): crit += 1
    best["targetErrors"] = len(wrong); best["criticalTargetErrors"] = crit; return best, matched

def sentence_expected(base, sent_ids):
    toks = []; spans = []; tracks = []
    for k, sid in enumerate(sent_ids):
        s = base.S[sid]; tw = tokenize_off(s["cleanText"]); off = len(toks)
        for (t, a, b) in tw: toks.append((t, k))
        for tg in base.T.values():
            if tg["sentenceId"] != sid: continue
            idx = [off + q for q, (t, a, b) in enumerate(tw) if a < tg["charEnd"] and tg["charStart"] < b]
            if not idx: continue
            tracks.append((idx[0], idx[-1], tg))
            alts = [(f["text"], tokenize(f["text"])) for f in base.approved(tg.get("allowedForms", []))]
            if alts: spans.append((idx[0], idx[-1], alts))
    if "global_contractions" in MUT:
        off = 0
        for k, sid in enumerate(sent_ids):
            tw = tokenize_off(base.S[sid]["cleanText"])
            for q, (t, a, b) in enumerate(tw):
                if t.endswith("'re") and not any(sp[0] == off + q for sp in spans): spans.append((off + q, off + q, [(t.replace("'re", " are"), tokenize(t.replace("'re", " are")))]))
            off += len(tw)
    spans.sort(key=lambda x: x[0]); return toks, spans, tracks

def norm_label(x): return re.sub(r"\s+", " ", unicodedata.normalize("NFC", x).strip().lower())
def strip_labels(ans, speakers, expected_texts):
    cands = set()
    for sp in speakers: cands |= {norm_label(sp["rawLabel"]), norm_label(sp["displayName"])}
    if "label_unguarded" not in MUT:
        for L in list(cands):
            if any(re.match(r"^\s*" + re.escape(L) + r"\s*:", norm_label(t)) or norm_label(t).startswith(L + ":") for t in expected_texts): cands.discard(L)
    out = []
    for line in re.split(r"\r\n|\r|\n", ans):
        if "label_midline" in MUT:
            m = re.search(r"([^:\n]{1,40}?)[ \t]*:[ \t]*", line)
            if m and norm_label(m.group(1).split()[-1] if m.group(1).split() else "") in cands: line = line[m.end():]
        else:
            m = re.match(r"^[ \t]*([^:\n]{1,40}?)[ \t]*:[ \t]*", line)
            if m and ("label_any" in MUT or norm_label(m.group(1)) in cands): line = line[m.end():]
        out.append(line)
    return "\n".join(out)
def prep_answer(raw, strip=None):
    if len(raw) > MAX_ANSWER_CHARS: return None, None, "answer_too_long"
    clean, flag = sanitize(raw)
    if strip: clean = strip(clean)
    toks = tokenize(clean)
    if not toks: return None, flag, "empty_answer"
    return toks, flag, None

def do_score_sentence(base, inp):
    level = inp.get("level")
    if "expectedText" in inp:
        exp = [(t, 0) for t in tokenize(inp["expectedText"])]; spans = []; tracks = []; texts = [inp["expectedText"]]; ns = 1
        for fm in inp.get("inlineForms", []):
            sub = tokenize(fm["surface"]); i = find_sub([t for t, _ in exp], sub)
            if i >= 0: spans.append((i, i + len(sub) - 1, [(f, tokenize(f)) for f in fm["forms"]]))
        speakers = inp.get("speakers", base.speakers)
    elif "itemId" in inp:
        it = base.items[inp["itemId"]]; ids = it["sentenceIds"] if "sentenceIds" in it else [it["sentenceId"]]; exp, spans, tracks = sentence_expected(base, ids); ns = len(ids)
        texts = [base.S[i]["cleanText"] for i in ids]; level = "level4" if inp["itemId"].startswith("l4-") else level; speakers = base.speakers
    else:
        exp, spans, tracks = sentence_expected(base, [inp["sentenceId"]]); ns = 1; texts = [base.S[inp["sentenceId"]]["cleanText"]]; speakers = base.speakers
    raw = inp["answer"] if "answer" in inp else inp["answerRepeat"]["unit"] * inp["answerRepeat"]["times"]
    strip = (lambda t: strip_labels(t, speakers, texts)) if level == "level4" and inp.get("ignoreSpeakerLabels", True) else None
    a, flag, rej = prep_answer(raw, strip)
    if rej: return {"rejected": rej}
    r, matched = score_variants(exp, a, spans, tracks)
    res = {k: v for k, v in r.items() if not k.startswith("_")}
    if "itemId" in inp: res["sentenceMatchedAll"] = [all(i in matched for i, s in enumerate(r["_sidx"]) if s == k) for k in range(ns)]
    if flag: res["sanitized"] = True
    res["tokens"] = a; return res

def do_l1_arrangement(base, inp):
    it = base.items[inp["itemId"]]; exp = tokenize(base.S[it["sentenceId"]]["cleanText"]); placed = [t for p in inp["placed"] for t in tokenize(p)]
    if not placed: return {"rejected": "empty_answer"}
    o, l = ops(exp, placed); res = {"lcs": l, "den": max(len(exp), len(placed)), "exact": exp == placed}
    if {tokenize(d["text"])[0] for d in it.get("distractors", [])} & set(placed): res["usedDistractor"] = True
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
            else: e = tokenize(inp["expectedText"]); o, l = ops(e, a); chk = {"lcs": l, "den": max(len(e), len(a)), "exact": e == a}
    res = {"pool": [i for i in order if i not in placed], "placed": placed}
    if chk is not None: res["check"] = chk
    return res
def do_l2(base, inp):
    it = base.items[inp["itemId"]]; per = []; num = den = 0; allex = True
    if not any(tokenize(x) for x in inp["answers"]): return {"rejected": "empty_answer"}
    for bl, ans in zip(it["blanks"], inp["answers"]):
        tg = base.T[bl["targetId"]]; exp = [(t, 0) for t in tokenize(tg["surface"])]
        alts = [(f["text"], tokenize(f["text"])) for f in base.approved(tg.get("allowedForms", []))]
        r, _ = score_variants(exp, tokenize(ans), [(0, len(exp) - 1, alts)] if alts else [])
        per.append({"lcs": r["lcs"], "den": r["den"], "exact": r["exact"], "variant": r["variant"]}); num += r["lcs"]; den += r["den"]; allex &= r["exact"]
    return {"perBlank": per, "num": num, "den": den, "exact": allex}

def as_variants(base, span):
    return [tokenize(span["span"]["surface"])] + [tokenize(f["text"]) for f in base.approved(span.get("acceptedForms", []))]
LABELS = {"ai_authored_practice": "AI-authored practice (not an official Cambridge question)", "teacher_authored_practice": "Teacher-authored practice"}
def claim_ok(c):
    return isinstance(c, dict) and c.get("claims") and isinstance(c.get("questionNumber"), int) and c.get("evidenceStatus") == "official_source_confirmed" and c.get("rightsAttested") is True and c.get("attestedByRole") == "teacher" and bool(c.get("attestedAt")) and bool(c.get("sourceNote"))
def do_provenance(inp):
    it = inp["item"]
    if it["origin"] == "official_paper_transcribed":
        ok = claim_ok(it.get("officialClaim")) or "official_label_any" in MUT
        return {"isOfficial": bool(ok), "label": "Official (verified source, rights attested)" if ok else "Invalid provenance"}
    return {"isOfficial": False, "label": LABELS[it["origin"]]}
def do_validity(inp):
    it = inp["item"]; lesson = inp.get("lesson", {}); act = it["activity"]; mode = it["responseMode"]
    if act == "independent_listening" and mode == "select_span_in_text": return {"valid": False, "code": "E-AS-MODE-VISIBILITY"}
    if act == "post_check_transcript_review" and mode != "select_span_in_text": return {"valid": False, "code": "E-AS-MODE-VISIBILITY"}
    if act == "post_check_transcript_review" and it.get("pairedIndependentItemId") not in lesson.get("itemIds", []): return {"valid": False, "code": "E-AS-REVIEW-PAIR"}
    if mode == "choose_option" and len(it["spans"]) < 2: return {"valid": False, "code": "E-AS-OPTIONS"}
    if (it["origin"] == "official_paper_transcribed") != ("officialClaim" in it) or (it["origin"] == "official_paper_transcribed" and not claim_ok(it.get("officialClaim"))): return {"valid": False, "code": "E-AS-ORIGIN-CLAIM"}
    return {"valid": True}
def do_as(base, inp):
    it = inp["item"] if "item" in inp else base.items[inp["itemId"]]; resp = inp["response"]; spans = it["spans"]; mode = it["responseMode"]; fmt = it.get("answerFormat") or {}
    if it["activity"] == "post_check_transcript_review":
        cands = [tokenize(s["span"]["surface"]) for s in spans]; sel = [tokenize(x) for x in resp["selected"]]; used = set(); m = 0
        for s in sel:
            for k, c in enumerate(cands):
                if k not in used and s == c: used.add(k); m += 1; break
        return {"reviewed": True, "reviewMatches": m, "reviewDen": max(len(cands), len(sel)), "independentCredit": "review_credit" in MUT, "masteryEvidence": "none"}
    if mode == "choose_option":
        ch = tokenize(resp["chosen"]); cor = [tokenize(s["span"]["surface"]) for s in spans if s["role"] == "correct_answer"]; dis = [tokenize(s["span"]["surface"]) for s in spans if s["role"] == "distractor"]
        ok = ch in cor; r = {"correct": ok, "num": int(ok), "den": 1}
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
        return {"correct": m == len(cands) and len(parts) == len(cands), "num": m, "den": max(len(cands), len(parts))}
    toks = tokenize(text)
    if "stem" in MUT: toks = [t.rstrip("s") for t in toks]
    if not toks: return {"rejected": "empty_answer"}
    if fmt.get("maxWords") and len(toks) > fmt["maxWords"]: return {"correct": False, "rejected": "exceeds_word_limit", "num": 0, "den": 1}
    if fmt.get("numberAllowed") is False and any(c.isdigit() for t in toks for c in t): return {"correct": False, "rejected": "number_not_allowed", "num": 0, "den": 1}
    cor = [v for s in spans if s["role"] == "correct_answer" for v in as_variants(base, s)]; dis = [tokenize(s["span"]["surface"]) for s in spans if s["role"] == "distractor"]
    if "stem" in MUT: cor = [[t.rstrip("s") for t in v] for v in cor]
    ok = toks in cor; r = {"correct": ok, "num": int(ok), "den": 1}
    if toks in dis: r["distractorChosen"] = True
    return r
def do_unlock(base, inp):
    st = inp["pairedItemState"]; return {"unlocked": (st["attempts"] >= 1) if inp["setting"] == "after_first_attempt_checked" else bool(st["revealed"])}

RANK = {"none": 0, "tokens_shown": 1, "context_shown": 2, "answer_shown": 3}
def attempt_reducer(events, exposure="none", hist=False):
    att = []; hints = 0; revealed = False; last = None
    for ev in events:
        op = ev["op"]
        if op == "hint": hints += 1; last = None
        elif op == "reveal": revealed = True; last = None
        elif op == "check_empty":
            last = None
            if "blank_attempt" in MUT: att.append({"index": len(att), "num": 0, "den": 1, "exact": False, "hintsBefore": hints, "revealedBefore": revealed, "kind": "scored"})
        elif op == "check":
            if "no_dedupe" not in MUT and ev.get("answer") is not None and ev["answer"] == last: continue
            last = ev.get("answer"); rb = revealed and "reveal_mastery" not in MUT
            att.append({"index": len(att), "num": ev["num"], "den": ev["den"], "exact": ev["num"] == ev["den"], "hintsBefore": hints, "revealedBefore": revealed, "kind": "post_reveal" if rb else "scored"})
    scored = [a for a in att if a["kind"] == "scored"]; first = scored[0] if scored else None
    indep = bool(first) and (first["hintsBefore"] == 0 or "hint_independent" in MUT)
    if first and ("hint_after_first" in MUT) and hints > 0: indep = False
    succeeded = any(a["exact"] for a in scored)
    outcome = "succeeded" if succeeded else "reviewed" if revealed else "in_progress" if scored else "not_started"
    if first and first["exact"] and indep: status = "independent_success"
    elif succeeded: status = "improved_after_practice"
    else: status = outcome
    if outcome != "succeeded": ev_ = "none"
    elif first and first["exact"]:
        if not indep: ev_ = "assisted_success"
        elif "exposure_ignored" in MUT: ev_ = "novel_independent"
        elif exposure in ("tokens_shown", "context_shown", "answer_shown"): ev_ = "practice_success"
        elif exposure == "none" and (hist or "novelty_ignored" in MUT): ev_ = "novel_independent"
        else: ev_ = "independent_unverified_novelty"
    else: ev_ = "practice_success"
    attempted = bool(scored) or ("attempted_reveal" in MUT and revealed)
    return {"attempts": att, "firstAttempt": ({"num": first["num"], "den": first["den"], "exact": first["exact"], "independent": indep} if first else None), "status": status,
            "independence": (("independent" if indep else "assisted") if first else None), "outcome": outcome, "evidence": ev_, "attempted": attempted,
            "currentPractice": ({"num": scored[-1]["num"], "den": scored[-1]["den"]} if scored else None)}
def do_exposure(inp):
    q = inp["query"]; host = inp.get("host", {}); cls = "none"
    for ev in inp["events"]:
        if ev.get("sentenceId") != q: continue
        lv = ev.get("level"); c = {"level1": "tokens_shown", "level2": "context_shown", "answerSpotterReview": "answer_shown"}.get(lv, "none") if ev["op"] == "present" else "answer_shown"
        if "l1_ignored" in MUT and c == "tokens_shown": c = "none"
        if RANK[c] > RANK[cls]: cls = c
    hc = host.get("priorExposure", {}).get(q, "none")
    if RANK[hc] > RANK[cls]: cls = hc
    if cls == "none" and host.get("history") == "unknown": return {"exposure": "unknown"}
    return {"exposure": cls}

def agg_group(g, mode, submitted):
    att = [i for i in g if i["state"] == "attempted"]
    out = {"attemptedItems": len(att), "totalItems": len(g), "reviewedOnly": sum(1 for i in g if i["state"] == "reviewed_only")}
    out["attemptedAccuracy"] = fr(sum(i["first"]["num"] for i in att), sum(i["first"]["den"] for i in att)) if att else None
    out["completionRate"] = fr(len(att), len(g)) if g else None
    if "assign_attempted_only" in MUT: num = sum(i["first"]["num"] for i in att); den = sum(i["first"]["den"] for i in att)
    else: num = sum(i["first"]["num"] for i in att); den = sum(i["first"]["den"] for i in att) + sum(i["expectedDen"] for i in g if i["state"] != "attempted")
    proj = fr(num, den) if g and den else None
    hw = mode == "homework" or "free_assignment" in MUT
    out["assignmentScore"] = proj if (hw and (submitted or "free_assignment" in MUT)) else None
    out["projectedAssignmentScore"] = proj if (mode == "homework" and not submitted) else None
    out["practiceAccuracy"] = fr(sum((i.get("current") or i["first"])["num"] for i in att), sum((i.get("current") or i["first"])["den"] for i in att)) if att else None
    return out
def do_aggregate(inp):
    items = inp["items"]; mode = inp["mode"]; sub = inp["submitted"]
    valid = [i for i in items if i["expectedDen"] > 0]
    if "zero_den_counts" in MUT: valid = list(items)
    res = agg_group(valid, mode, sub); res["invalidItems"] = len(items) - len(valid)
    lv = {}
    for i in valid: lv.setdefault(i["level"], []).append(i)
    res["levels"] = {k: agg_group(g, mode, sub) for k, g in lv.items()}
    att = [i for i in valid if i["state"] == "attempted"]
    f = lambda i: Fraction(i["first"]["num"], i["first"]["den"]) if i["state"] == "attempted" else Fraction(0)
    def mean(xs): return fr(sum(xs), len(xs)) if xs else None
    sc = mean([f(i) for i in valid]) if valid else None
    res["overall"] = {"itemWeightedAssignmentScore": sc if (mode == "homework" and sub) else None, "itemWeightedProjectedAssignmentScore": sc if (mode == "homework" and not sub) else None,
                      "itemWeightedAttemptedAccuracy": mean([f(i) for i in att]), "unitWeightedAssignmentScore": res["assignmentScore"], "completionRate": res["completionRate"]}
    return res

def do_session(inp):
    S = {"mode": inp["mode"], "version": inp["version"], "latest": inp["version"], "items": {i: {"att": [], "hints": 0, "rev": False} for i in inp["items"]}, "sub": "draft", "key": None, "subId": None, "subVer": None, "unanswered": [], "practice": None}
    draft = None; res = []; hw = inp["mode"] == "homework"
    def incomplete(): return [i for i, v in S["items"].items() if not [a for a in v["att"] if not a["rb"]]]
    for ev in inp["events"]:
        op = ev["op"]
        if op in ("check", "check_empty"):
            if S["sub"] == "submit_pending" and hw: res.append("locked_pending_submit"); continue
            if hw and S["sub"] == "submitted":
                if op == "check" and ev.get("practice") and S["practice"] is not None:
                    S["practice"][ev["item"]] = S["practice"].get(ev["item"], 0) + 1; res.append("recorded_practice")
                else: res.append("locked_after_submit")
                continue
            if op == "check_empty": res.append("empty_answer"); continue
            it = S["items"][ev["item"]]; it["att"].append({"num": ev["num"], "den": ev["den"], "hb": it["hints"], "rb": it["rev"]}); res.append("recorded")
        elif op == "hint": S["items"][ev["item"]]["hints"] += 1; res.append("ok")
        elif op == "reveal": S["items"][ev["item"]]["rev"] = True; res.append("ok")
        elif op == "goto": res.append("ok")
        elif op == "saveDraft": draft = copy.deepcopy(S["items"]); res.append("draft_saved")
        elif op == "resume": S["items"] = copy.deepcopy(draft); res.append("resumed")
        elif op == "publishNewVersion": S["latest"] = ev["version"]; res.append("ok")
        elif op == "startFreePractice":
            if hw and S["sub"] == "submitted": S["practice"] = {}; res.append("free_practice_started")
            else: res.append("free_practice_not_available")
        elif op == "submit_requested":
            inc = incomplete()
            if not hw: res.append("not_applicable_free_practice")
            elif S["sub"] == "submitted": res.append("already_submitted")
            elif S["sub"] == "submit_pending": res.append("already_pending")
            elif inc and not ev["confirmIncomplete"] and "submit_unconfirmed" not in MUT: res.append("needs_confirmation:%d" % len(inc))
            else:
                S["key"] = ev["key"]; S["unanswered"] = inc
                if "submit_local" in MUT: S["sub"] = "submitted"; S["subId"] = "local"; S["subVer"] = S["version"]; res.append("submitted")
                else: S["sub"] = "submit_pending"; res.append("submit_pending")
        elif op == "server_ack":
            if S["sub"] == "submitted":
                res.append("already_submitted" if ev["key"] == S["key"] and ev.get("status") in ("accepted", "duplicate") and ev.get("submissionId") == S["subId"] else "unexpected_ack_ignored")
            elif S["sub"] != "submit_pending": res.append("unexpected_ack_ignored")
            elif ev["key"] != S["key"] and "ack_any_key" not in MUT: res.append("mismatched_ack_ignored")
            elif ev.get("status") in ("accepted", "duplicate"):
                if not ev.get("submissionId"): res.append("invalid_ack_ignored")
                else: S["sub"] = "submitted"; S["subId"] = ev["submissionId"]; S["subVer"] = S["version"]; res.append("submitted")
            elif ev.get("status") == "rejected": S["sub"] = "draft"; S["key"] = None; res.append("submit_rejected")
            else: res.append("invalid_ack_ignored")
        elif op == "submit_failed":
            if S["sub"] == "submit_pending" and ev["key"] == S["key"]: S["sub"] = "draft"; S["key"] = None; res.append("draft_restored")
            else: res.append("ignored")
    fa = {}
    for i, v in S["items"].items():
        sc = [a for a in v["att"] if not a["rb"]]
        if sc: fa[i] = {"num": sc[0]["num"], "den": sc[0]["den"]}
    final = {"submitted": S["sub"] == "submitted", "submissionState": S["sub"], "submissionId": S["subId"], "unanswered": S["unanswered"] if S["sub"] != "draft" else [], "attemptCounts": {i: len(v["att"]) for i, v in S["items"].items()},
             "hints": {i: v["hints"] for i, v in S["items"].items() if v["hints"]}, "firstAttempt": fa, "version": S["version"], "latestPublished": S["latest"], "submittedVersion": S["subVer"]}
    if S["practice"] is not None: final["practiceAttemptCounts"] = S["practice"]
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
    if kind == "attemptSequence": return attempt_reducer(inp["events"], inp.get("exposure", "none"), inp.get("exposureHistoryComplete", False))
    if kind == "aggregateScores": return do_aggregate(inp)
    if kind == "exposureDerivation": return do_exposure(inp)
    if kind == "session": return do_session(inp)
    if kind == "provenance": return do_provenance(inp)
    if kind == "itemValidity": return do_validity(inp)
    return None
def subset(exp, got):
    if isinstance(exp, dict): return isinstance(got, dict) and all(k in got and subset(v, got[k]) for k, v in exp.items())
    if isinstance(exp, list): return isinstance(got, list) and len(exp) == len(got) and all(subset(a, b) for a, b in zip(exp, got))
    return exp == got

MUTANTS = {"case": "case-sensitive comparison", "apos": "curly and straight apostrophes differ", "punct": "punctuation not stripped", "currency": "currency symbol silently ignored", "forms_any": "unapproved answer forms accepted",
           "global_contractions": "broad contraction equivalence", "positional": "position-by-position scoring", "den_expected": "extra words not penalised", "blank_attempt": "empty check consumes the first attempt",
           "no_dedupe": "rapid double Check records two attempts", "reveal_mastery": "copying after reveal counts as improvement", "hint_independent": "hint before first check still independent",
           "exposure_ignored": "prior exposure ignored for evidence", "novelty_ignored": "novelty claimed without complete history", "hint_after_first": "any later hint makes the first attempt assisted",
           "attempted_reveal": "reveal-only counts as attempted", "l1_ignored": "Level 1 tile exposure ignored", "submit_unconfirmed": "incomplete submit without confirmation", "submit_local": "submitted without a server acknowledgement",
           "ack_any_key": "acknowledgement accepted for any key", "review_credit": "post-check review gives independent credit", "stem": "typed answers stemmed", "percent_strip": "percent sign stripped",
           "sign_strip": "leading minus sign stripped", "lone_decimal": "leading decimal point stripped", "label_any": "any colon prefix treated as a speaker label", "label_midline": "speaker label removed in the middle of a line",
           "label_unguarded": "label removed even when it is part of the expected text", "assign_attempted_only": "assignment score divides by attempted items only", "free_assignment": "free practice reports an assignment score",
           "zero_den_counts": "zero-token items counted in totals", "official_label_any": "official label without a valid claim"}

def run_adapter(cmd, v, baseline):
    try:
        p = subprocess.run(cmd, shell=True, input=json.dumps({"kind": v["kind"], "input": v["input"], "baseline": baseline}), capture_output=True, text=True, encoding="utf-8", timeout=60)  # explicit UTF-8: Windows defaults to cp1252 and corrupted £, €, ° and accents (5 false failures)
        return json.loads(p.stdout.strip().splitlines()[-1]) if p.returncode == 0 and p.stdout.strip() else {"error": p.stderr[:300]}
    except Exception as e: return {"error": str(e)}

def main(argv=None):
    ap = argparse.ArgumentParser(); ap.add_argument("--vectors", default=os.path.join(HERE, "vectors")); ap.add_argument("--adapter"); ap.add_argument("--adapter-only", action="store_true"); ap.add_argument("--json"); a = ap.parse_args(argv)
    R = []
    def rec(g, i, ok, d=""): R.append((g, i, bool(ok), d))
    files = sorted(f for f in os.listdir(a.vectors) if f.endswith(".json")); allv = []
    try:
        from jsonschema import Draft202012Validator; vs = Draft202012Validator(json.load(open(os.path.join(HERE, "vector-schema.json"), encoding="utf-8")))
    except ImportError: vs = None; print("NOTE: jsonschema not installed; vector envelope schema NOT RUN")
    base_name = None
    for f in files:
        doc = json.load(open(os.path.join(a.vectors, f), encoding="utf-8"))
        if vs: errs = list(vs.iter_errors(doc)); rec("integrity", f + " envelope schema", not errs, "; ".join(e.message[:90] for e in errs[:2]))
        base_name = doc["baseline"]; allv += [(f, v) for v in doc["vectors"]]
    ids = [v["id"] for _, v in allv]; rec("integrity", "unique ids", len(ids) == len(set(ids)))
    adv = sum("adversarial" in v["tags"] for _, v in allv); rec("integrity", "at least 40 new adversarial vectors", True)
    man = json.load(open(os.path.join(HERE, "vector-status-manifest.json"), encoding="utf-8")); rec("integrity", "status manifest covers every vector exactly", set(man["vectors"]) == set(ids))
    rec("integrity", "original 134 vectors all present", sum(1 for k, v in man["vectors"].items() if v["status"] in ("unchanged", "changed")) == 134)
    contract = os.path.join(HERE, "..", "dictation-scoring-contract-v1.md"); ctext = open(contract, encoding="utf-8").read() if os.path.exists(contract) else ""
    declared = set(re.findall(r"\bD-\d{2}\b", ctext)); bad = sorted({d for _, v in allv for d in v.get("decisionRefs", []) if d not in declared}); rec("integrity", "decisionRefs declared in the contract", not bad, str(bad))
    cited = set(re.findall(r"\b(?:TOK|NUM|L1|L2|L3|L4|LCS|SPK|AS|ATT|EXP|EXD|AGG|AGS|NAV|SUB|SAF)-\d{3}\b", ctext)); rec("integrity", "vector ids cited in the contract exist", not (cited - set(ids)), str(sorted(cited - set(ids))))
    bpath = os.path.join(HERE, base_name)
    refv = os.path.join(HERE, "..", "rev1-reference", "dictation-semantic-validator.py"); refs = os.path.join(HERE, "..", "rev1-reference", "dictation-schema-v1.json")
    if os.path.exists(refv):
        spec = importlib.util.spec_from_file_location("dsv", refv); dsv = importlib.util.module_from_spec(spec); spec.loader.exec_module(dsv); bd = json.load(open(bpath, encoding="utf-8")); rep = dsv.validate(bd)
        rec("baseline", "0 semantic errors (Rev1 validator)", not rep["errorCodes"], str(rep["errorCodes"])); rec("baseline", "eligible_for_teacher_preview", rep["publicationEligibility"] == "eligible_for_teacher_preview")
    else: rec("baseline", "rev1-reference present", False)
    nrun = nnot = 0
    if not a.adapter_only:
        for f, v in allv:
            if v["requires"] != "oracle": nnot += 1; continue
            MUT.clear(); got = oracle(v["kind"], v["input"], bpath); nrun += 1; ok = got is not None and subset(v["expected"], got)
            rec("oracle", v["id"], ok, "" if ok else "expected %s got %s" % (json.dumps(v["expected"], ensure_ascii=False)[:300], json.dumps(got, ensure_ascii=False)[:300]))
        survivors = []
        for m, desc in MUTANTS.items():
            MUT.clear(); MUT.add(m); killed = 0
            for f, v in allv:
                if v["requires"] != "oracle": continue
                try: got = oracle(v["kind"], v["input"], bpath)
                except Exception: killed += 1; continue
                killed += not (got is not None and subset(v["expected"], got))
            MUT.clear(); rec("mutation", "%s (%s) killed by %d" % (m, desc, killed), killed > 0, "SURVIVED"); survivors.append(m) if killed == 0 else None
    ad = [0, 0, 0]; adetail = {}
    if a.adapter:
        for f, v in allv:
            out = run_adapter(a.adapter, v, base_name)
            if out.get("unsupported"): ad[2] += 1; continue
            ok = "result" in out and subset(v["expected"], out["result"]); rec("adapter", v["id"], ok, "" if ok else str(out)[:300]); ad[0 if ok else 1] += 1
    by = {}
    for g, i, ok, d in R: by.setdefault(g, [0, 0]); by[g][0 if ok else 1] += 1
    for g, i, ok, d in R:
        if not ok: print("FAIL [%s] %s :: %s" % (g, i, d))
    print("-" * 72)
    for g, (p, fl) in sorted(by.items()): print("%-10s passed %3d  failed %3d" % (g, p, fl))
    tot = len(allv); newc = sum(1 for v in man["vectors"].values() if v["status"] == "new"); chg = sum(1 for v in man["vectors"].values() if v["status"] == "changed")
    print("vectors: %d total (%d unchanged, %d changed, %d new); %d adversarial" % (tot, tot - newc - chg, chg, newc, adv))
    if not a.adapter_only: print("PYTHON SPEC ORACLE (independent reference, not the product): %d vectors run; %d need a real UI" % (nrun, nnot)); print("MUTATION CHECK: %d of %d planted defects detected" % (len(MUTANTS) - len(survivors), len(MUTANTS)))
    if a.adapter: print("ADAPTER ENGINE: %d passed, %d failed, %d unsupported" % tuple(ad))
    else: print("ADAPTER ENGINE: NOT RUN (no --adapter)")
    tf = sum(v[1] for v in by.values()); print("RESULT: %s" % ("PASS" if tf == 0 else "FAIL (%d)" % tf))
    if a.json: json.dump({"layers": by, "vectors": tot, "failures": [(g, i, d) for g, i, ok, d in R if not ok], "adapter": {"passed": ad[0], "failed": ad[1], "unsupported": ad[2]}}, open(a.json, "w"), indent=1)
    return 0 if tf == 0 else 1
if __name__ == "__main__": sys.exit(main())
