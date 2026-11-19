#!/usr/bin/env python3
"""DEV-ONLY. Re-runs the Python reference validator + jsonschema over test/corpus and checks that the result equals the recorded
parity/python-reference-results.json (so the JS parity test is not trusting a stale recording). Needs: pip install jsonschema.
Usage (from pkg/):  python -I js-validator/tools/check-python-reference.py ."""
import json, os, sys, importlib.util
pkg = sys.argv[1]; jv = os.path.join(pkg, "js-validator")
spec = importlib.util.spec_from_file_location("dsv", os.path.join(pkg, "rev1-reference", "dictation-semantic-validator.py")); dsv = importlib.util.module_from_spec(spec); spec.loader.exec_module(dsv)
from jsonschema import Draft202012Validator, FormatChecker
V = Draft202012Validator(json.load(open(os.path.join(jv, "schema", "dictation-schema-v1.json"), encoding="utf-8")), format_checker=FormatChecker())
rec = json.load(open(os.path.join(jv, "parity", "python-reference-results.json"), encoding="utf-8"))
same = diff = 0; bad = []
for r in rec["results"]:
    data = open(os.path.join(jv, "test", "corpus", r["file"]), "rb").read(); doc = json.loads(data.decode("utf-8"))
    errs = list(V.iter_errors(doc)); out = {"file": r["file"], "schemaValid": not errs, "schemaErrorCount": len(errs)}
    try:
        rep = dsv.validate(doc, None, len(data)); rep.pop("validatorVersion", None); rep.pop("disclaimer", None); out["semantic"] = rep
    except (KeyError, TypeError, IndexError) as e: out["semantic"] = {"fatal": True, "errorCodes": ["FATAL-STRUCTURE"], "pythonException": type(e).__name__}
    if json.dumps(out, sort_keys=True) == json.dumps(r, sort_keys=True): same += 1
    else: diff += 1; bad.append(r["file"])
corpus = sum(len(f) for _, _, f in os.walk(os.path.join(jv, "test", "corpus")))
print("recorded=%d corpusFiles=%d reproduced=%d differ=%d %s" % (len(rec["results"]), corpus, same, diff, bad[:5]))
sys.exit(0 if diff == 0 and corpus == len(rec["results"]) else 1)
