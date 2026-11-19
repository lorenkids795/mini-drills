#!/usr/bin/env python3
"""
make-corpus.py : deterministically builds test/corpus/ and parity/python-reference-results.json.
  corpus/rev1-fixtures  : the 92 synthetic fixtures from the Rev1 test suite (copied)
  corpus/demos          : generator demos and the golden baseline (synthetic)
  corpus/unicode        : hand-built Unicode edge documents (emoji, ZWJ, NFC/NFD, RTL, full-width digits, superscripts, Turkish dotted I, lone surrogate)
  corpus/generated      : seeded mutations of the documents above (semantic and structural), GENERATED_COUNT files
For every file it records what the PYTHON REFERENCE validator and jsonschema say. The JavaScript test compares against that record.
Requires: python3, `pip install jsonschema`, and the Rev1 test fixture generator (path given by --rev1-tests). Cambridge material is never used here.
Usage: python tools/make-corpus.py --rev1-tests PATH/TO/rev1/tests --demos DIR [--seed 20261109] [--count 420]
"""
import argparse, copy, importlib.util, json, os, random, shutil, sys
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.join(HERE, "..")
ap = argparse.ArgumentParser(); ap.add_argument("--rev1-tests", required=True); ap.add_argument("--demos", required=True); ap.add_argument("--seed", type=int, default=20261109); ap.add_argument("--count", type=int, default=420); a = ap.parse_args()
sys.path.insert(0, os.path.join(a.rev1_tests, ".."))
spec = importlib.util.spec_from_file_location("mf", os.path.join(a.rev1_tests, "make_fixtures.py")); mf = importlib.util.module_from_spec(spec); spec.loader.exec_module(mf); dsv = mf.dsv
from jsonschema import Draft202012Validator, FormatChecker
SCHEMA = json.load(open(os.path.join(ROOT, "schema", "dictation-schema-v1.json"), encoding="utf-8")); V = Draft202012Validator(SCHEMA, format_checker=FormatChecker())
CORPUS = os.path.join(ROOT, "test", "corpus")
if os.path.exists(CORPUS): shutil.rmtree(CORPUS)
for d in ("rev1-fixtures", "demos", "unicode", "generated"): os.makedirs(os.path.join(CORPUS, d))
files = []
def save(sub, name, text): open(os.path.join(CORPUS, sub, name), "w", encoding="utf-8", newline="\n").write(text); files.append(os.path.join(sub, name))
for f in sorted(os.listdir(os.path.join(a.rev1_tests, "fixtures"))): save("rev1-fixtures", f, open(os.path.join(a.rev1_tests, "fixtures", f), encoding="utf-8").read())
for f in sorted(os.listdir(a.demos)):
    if f.endswith(".json"): save("demos", f, open(os.path.join(a.demos, f), encoding="utf-8").read())
J = lambda d: json.dumps(d, ensure_ascii=False, indent=1) + "\n"
# ---- unicode edge documents
def uni(name, raw, targets=(), shift=0, tweak=None):
    d = mf.build(raw); d["settings"] = {"level2": {"maxHiddenWords": 2}}
    s = d["transcript"]["sentences"][0]; items = []
    for k, (surf, occ) in enumerate(targets):
        ms = dsv.matches(s["cleanText"], surf)
        if not ms: continue
        t = {"id": "tg-%03d" % (k + 1), "sentenceId": s["id"], "charStart": ms[occ - 1] + shift, "charEnd": ms[occ - 1] + dsv.u16len(surf) + shift, "surface": surf, "occurrence": occ, "focusTypes": ["spelling"], "confidence": "low", "rationale": "unicode probe", "source": "external_ai"}
        d.setdefault("learningTargets", []).append(t); items.append({"id": "l2-%03d" % (k + 1), "sentenceId": s["id"], "blanks": [{"targetId": t["id"]}]})
    if items: d["exercises"] = {"level2": {"items": items[:1]}}
    if tweak: tweak(d)
    save("unicode", name + ".json", J(d))
uni("u01-emoji-before-target", "AMY: I saw \U0001F600 a red kite today.", [("red", 1)])
uni("u02-emoji-code-point-offsets-wrong", "AMY: I saw \U0001F600 a red kite today.", [("red", 1)], shift=-1)
uni("u03-emoji-marker-offsets", "AMY: I saw \U0001F600 a kite (Q1). Then home.")
uni("u04-nfd-combining", "AMY: A caf\u0065\u0301 near the park.", [("caf\u0065\u0301", 1)])
uni("u05-nfc-precomposed", "AMY: A caf\u00e9 near the park.", [("caf\u00e9", 1)])
uni("u06-vietnamese-nfc", "AMY: T\u00f4i mu\u1ed1n \u0111\u1eb7t b\u00e0n hai ng\u01b0\u1eddi.", [("\u0111\u1eb7t", 1)])
uni("u07-vietnamese-nfd", "AMY: Toi\u0302 muo\u0302\u0301n \u0111a\u0323\u0302t ba\u0300n.", [("\u0111", 1)])
uni("u08-zwj-family-emoji", "AMY: We met \U0001F468\u200d\U0001F469\u200d\U0001F467 at noon and left.", [("noon", 1)])
uni("u09-rtl-words", "AMY: He wrote \u05e9\u05dc\u05d5\u05dd and \u0645\u0631\u062d\u0628\u0627 here.", [("here", 1)])
uni("u10-fullwidth-digits-form", "AMY: It costs \uff11\uff12 today.", [("\uff11\uff12", 1)], tweak=lambda d: d["learningTargets"][0].update({"allowedForms": [{"text": "12", "kind": "numeral_word_equivalent", "approvalState": "proposed"}], "focusTypes": ["number"]}))
uni("u11-superscript-digit-form", "AMY: Use x\u00b2 today.", [("x\u00b2", 1)], tweak=lambda d: d["learningTargets"][0].update({"allowedForms": [{"text": "x squared", "kind": "numeral_word_equivalent", "approvalState": "proposed"}], "focusTypes": ["number"]}))
uni("u12-turkish-dotted-capital-i", "AMY: We flew to \u0130stanbul today.", [("\u0130stanbul", 1)])
uni("u13-sharp-s-and-greek-final-sigma", "AMY: Stra\u00dfe and \u039f\u0394\u03a5\u03a3\u03a3\u0395\u03a5\u03a3 here.", [("Stra\u00dfe", 1), ("here", 1)])
uni("u14-astral-letters", "AMY: Write \U0001D4D0\U0001D4D1 then stop.", [("stop", 1)])
uni("u15-two-targets-after-emoji", "AMY: \U0001F600\U0001F600 one two three.", [("two", 1), ("three", 1)])
d = mf.build("AMY: Plain text here."); save("unicode", "u16-lone-surrogate.json", json.dumps(d, ensure_ascii=True).replace("Plain", "Pla\\ud800in"))
uni("u17-angle-brackets-and-script-text", "AMY: Type <script>alert(1)</script> and A < B > C.", [("Type", 1)])
uni("u18-line-and-paragraph-separators-in-text", "AMY: One\u2028two\u2029three four.", [("four", 1)])
# ---- seeded mutations
rng = random.Random(a.seed)
base_names = [f for f in files if f.startswith(("rev1-fixtures/p", "demos/", "unicode/u0"))]
def load(rel): return json.load(open(os.path.join(CORPUS, rel), encoding="utf-8"))
def pick(lst): return lst[rng.randrange(len(lst))]
def sents(d): return d["transcript"]["sentences"]
def M_swap(d):
    s = sents(d)
    if len(s) > 2: i = rng.randrange(len(s) - 1); s[i], s[i + 1] = s[i + 1], s[i]; return True
def M_rawspan(d): s = pick(sents(d)); s["rawSpan"][pick(["start", "end"])] += rng.choice([-2, -1, 1, 2, 7]); return True
def M_status(d): pick(sents(d))["textStatus"] = pick(["verbatim_cleaned", "pending_verification", "verified_unchanged", "verified_corrected"]); return True
def M_enabled(d): s = pick(sents(d)); s["enabled"] = not s["enabled"]; return True
def M_clean(d):
    s = pick(sents(d)); t = s["cleanText"]
    if len(t) > 2: i = rng.randrange(len(t)); s["cleanText"] = t[:i] + rng.choice(["x", "\u00e9", " ", "<", "\U0001F600", "(Q1)"]) + t[i + 1:]; return True
def M_target(d):
    ts = d.get("learningTargets")
    if ts: t = pick(ts); k = pick(["charStart", "charEnd", "occurrence"]); t[k] = max(0, t[k] + rng.choice([-1, 1, 2])); return True
def M_surface(d):
    ts = d.get("learningTargets")
    if ts: t = pick(ts); t["surface"] = t["surface"][:-1] + pick(["x", "s", "\u00e9"]); return True
def M_hash(d): d["rawTranscript"]["sha256"] = pick(["0" * 64, "f" * 64, d["rawTranscript"]["sha256"][:-1] + "0"]); return True
def M_marker(d):
    q = d["transcript"].get("qMarkers")
    if q: m = pick(q); k = pick(["cleanTextOffset", "number"]); m[k] = max(0, m[k] + rng.choice([-1, 1, 3])); return True
def M_issue(d):
    i = d["audit"]["issues"]
    if i: x = pick(i); k = pick(["status", "blocksScoredUse", "severity", "evidenceStatus"]); x[k] = {"status": pick(["proposed_correction", "info_note", "approved", "unresolved", "dismissed", "safe_cleanup"]), "blocksScoredUse": not x["blocksScoredUse"], "severity": pick(["major", "minor", "info", "blocker"]), "evidenceStatus": pick(["not_required", "context_inference_only", "inconclusive", "teacher_confirmed_by_audio"])}[k]; return True
def M_audit(d): d["audit"]["auditState"] = pick(["not_audited", "audited_open_issues", "audited_no_open_issues"]); return True
def M_decision(d):
    i = d["audit"]["issues"]
    if i: d["audit"]["decisions"].append({"id": "dec-%03d" % (len(d["audit"]["decisions"]) + 1), "issueId": pick(i + [{"id": "iss-999"}])["id"], "action": pick(["apply_proposal", "apply_custom_text", "keep_original", "exclude_sentence", "mark_unresolved", "dismiss"]), "finalText": "x", "evidenceStatus": pick(["teacher_confirmed_by_audio", "inconclusive", "not_required"]), "decidedByRole": "teacher", "decidedAt": pick(["2026-01-01T00:00:00Z", "2026-02-01T00:00:00Z"])}); return True
def M_exref(d):
    ex = d.get("exercises")
    if ex:
        lv = pick(list(ex)); items = ex[lv]["items"]; it = pick(items); sid = pick(sents(d))["id"]
        if "sentenceId" in it: it["sentenceId"] = sid
        elif "sentenceIds" in it: it["sentenceIds"] = [sid] + it["sentenceIds"][1:] if len(it["sentenceIds"]) > 1 else [sid, sid]
        elif "evidenceSentenceIds" in it: it["evidenceSentenceIds"] = [sid]
        return True
def M_l4(d):
    items = d.get("exercises", {}).get("level4", {}).get("items")
    if items: items[0]["sentenceIds"] = sorted({pick(sents(d))["id"] for _ in range(3)}) or items[0]["sentenceIds"]; return True
def M_as(d):
    items = d.get("exercises", {}).get("answerSpotter", {}).get("items")
    if items:
        it = pick(items); k = pick(["responseMode", "activity", "origin", "type"])
        it[k] = {"responseMode": pick(["choose_option", "type_answer", "select_span_in_text"]), "activity": pick(["independent_listening", "post_check_transcript_review"]), "origin": pick(["ai_authored_practice", "teacher_authored_practice", "official_paper_transcribed"]), "type": pick(["target_detection", "answer_vs_distractor", "independent_answer_hunt"])}[k]; return True
def M_asspan(d):
    items = d.get("exercises", {}).get("answerSpotter", {}).get("items")
    if items: sp = pick(pick(items)["spans"]); k = pick(["charStart", "charEnd", "occurrence", "role"]); sp["span" if k != "role" else "role"] if False else None; (sp["span"].__setitem__(k, max(0, sp["span"][k] + rng.choice([-1, 1]))) if k != "role" else sp.__setitem__("role", pick(["correct_answer", "distractor", "candidate"]))); return True
def M_settings(d): d.setdefault("settings", {}).setdefault(pick(["level2", "level3", "level4", "level1"]), {}).update(pick([{"maxHiddenWords": 1}, {"minWords": 30, "maxWords": 3}, {"minWords": 2, "maxWords": 5}, {"minSentences": 2, "maxSentences": 2}, {"minTiles": 3, "maxTiles": 4}, {"allowMultiSpeaker": False}])); return True
def M_rights(d): d["rights"][pick(["teacherAttestsAuthorizedUse", "publicRedistributionAllowed"])] = pick([True, False]); return True
def M_forms(d):
    ts = d.get("learningTargets") or []
    for t in ts:
        for f in t.get("allowedForms", []): f["approvalState"] = pick(["proposed", "teacher_approved"]); (f.__setitem__("approvedAt", "2026-01-01T00:00:00Z") if f["approvalState"] == "teacher_approved" else None)
    return bool(ts)
def M_ts(d): s = pick(sents(d)); s["timestamp"] = {"startSec": pick([0.0, 5.0]), "endSec": pick([1.0, 3.0, 5.0]), "source": "teacher_entered"}; return True
def M_break(d):
    b = d["transcript"].get("sectionBreaks")
    if b: b[0]["continuityAcrossBreak"] = pick(["unknown", "confirmed_continuous", "confirmed_discontinuous"]); b[0]["afterSentenceId"] = pick(sents(d))["id"]; return True
def M_inject(d):
    s = pick(sents(d)); t = pick(["<b>x</b>", "A < B", "\u00e9\u0301", "\U0001F600", "\u202e"]); s["cleanText"] += " " + t; s["rawText"] += " " + t; return True
def M_distractor(d):
    items = d.get("exercises", {}).get("level1", {}).get("items")
    if items: it = pick(items); it["distractors"] = [{"text": pick(["gates", "the", "library", "x"]), "rationale": "r", "discrimination": "audibly_distinct"}] * rng.randrange(1, 4); return True
def M_excep(d):
    for lv in ("level3", "level4", "level1"):
        items = d.get("exercises", {}).get(lv, {}).get("items")
        if items: pick(items)["lengthException"] = {"kind": pick(["advisory_word_count", "advisory_sentence_count", "advisory_both"]), "reason": "r", "approvedByRole": "teacher", "approvedAt": pick(["2026-01-01T00:00:00Z", "not-a-date"])}; return True
def M_leaf(d):
    leaves = []
    def walk(o, path):
        if isinstance(o, dict):
            for k, v in o.items(): walk(v, path + [k])
        elif isinstance(o, list):
            for i, v in enumerate(o): walk(v, path + [i])
        else: leaves.append(path)
    walk(d, []); p = pick(leaves); o = d
    for k in p[:-1]: o = o[k]
    v = o[p[-1]]
    if isinstance(v, bool): o[p[-1]] = not v
    elif isinstance(v, int): o[p[-1]] = v + rng.choice([-1, 1, 1000])
    elif isinstance(v, float): o[p[-1]] = v + 1.5
    elif isinstance(v, str): o[p[-1]] = pick([v + "x", v[:-1], "", v.upper(), v + "\u00e9", "s%03d" % rng.randrange(1, 30)])
    return True
MUTATORS = [M_swap, M_rawspan, M_status, M_enabled, M_clean, M_target, M_surface, M_hash, M_marker, M_issue, M_audit, M_decision, M_exref, M_l4, M_as, M_asspan, M_settings, M_rights, M_forms, M_ts, M_break, M_inject, M_distractor, M_excep, M_leaf, M_leaf]
made = 0; tries = 0; crashes = 0
while made < a.count and tries < a.count * 6:
    tries += 1; d = copy.deepcopy(load(pick(base_names))); changed = False
    for _ in range(rng.choice([1, 1, 1, 2, 2, 3])):
        try: changed |= bool(pick(MUTATORS)(d))
        except Exception: pass
    if not changed: continue
    text = J(d)
    try:
        doc = json.loads(text)
        try: dsv.validate(doc, None, len(text.encode("utf-8")))
        except (KeyError, TypeError, IndexError): pass
    except Exception: crashes += 1; continue
    save("generated", "g%04d.json" % made, text); made += 1
# ---- Python reference results
def run_python(rel):
    data = open(os.path.join(CORPUS, rel), "rb").read(); doc = json.loads(data.decode("utf-8"))
    errs = list(V.iter_errors(doc)); out = {"file": rel.replace(os.sep, "/"), "schemaValid": not errs, "schemaErrorCount": len(errs)}
    try:
        rep = dsv.validate(doc, None, len(data)); rep.pop("validatorVersion", None); rep.pop("disclaimer", None); out["semantic"] = rep
    except (KeyError, TypeError, IndexError) as e: out["semantic"] = {"fatal": True, "errorCodes": ["FATAL-STRUCTURE"], "pythonException": type(e).__name__}
    return out
results = []; crash = []
for rel in files:
    try: results.append(run_python(rel))
    except Exception as e: crash.append((rel, type(e).__name__)); os.remove(os.path.join(CORPUS, rel))
results = [r for r in results]
json.dump({"referenceValidator": "rev1-reference/dictation-semantic-validator.py", "jsonschema": __import__("jsonschema").__version__ if hasattr(__import__("jsonschema"), "__version__") else "4.x",
           "dateTimeFormatChecked": False, "note": "Python jsonschema ignores format date-time unless an optional RFC 3339 package is installed; JS enforces it (documented divergence).", "seed": a.seed, "results": results}, open(os.path.join(ROOT, "parity", "python-reference-results.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=0)
fatal = sum(1 for r in results if r["semantic"].get("fatal")); print("corpus files:", len(results), "generated:", made, "python-fatal:", fatal, "python-crash-excluded:", len(crash), crash[:5], "schema-invalid:", sum(1 for r in results if not r["schemaValid"]))
