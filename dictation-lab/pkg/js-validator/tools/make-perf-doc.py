#!/usr/bin/env python3
"""Builds test/perf/large.json: a VALID synthetic document with ~600 sentences and one Level 3 item per eligible sentence. Usage: python tools/make-perf-doc.py --rev1-tests PATH"""
import argparse, importlib.util, json, os, sys
ap = argparse.ArgumentParser(); ap.add_argument("--rev1-tests", required=True); a = ap.parse_args(); HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location("mf", os.path.join(a.rev1_tests, "make_fixtures.py")); mf = importlib.util.module_from_spec(spec); spec.loader.exec_module(mf)
lines = []
for i in range(300):
    lines.append("%s: Please check item number %d before the morning meeting starts. I will bring the tickets and the map for group %d today." % ("AMY" if i % 2 == 0 else "BEN", i, i))
raw = "\n\n".join(lines); d = mf.build(raw); d["settings"] = {"sessionGuidelines": {k: {"min": 1, "max": 10} for k in ("level1", "level2", "level3", "level4", "answerSpotter")}}
d["exercises"] = {"level3": {"items": [{"id": "l3-%03d" % (i + 1), "sentenceId": s["id"]} for i, s in enumerate(d["transcript"]["sentences"][:20])]}}
json.dump(d, open(os.path.join(HERE, "..", "test", "perf", "large.json"), "w", encoding="utf-8"), ensure_ascii=False)
print("sentences", len(d["transcript"]["sentences"]), "bytes", os.path.getsize(os.path.join(HERE, "..", "test", "perf", "large.json")))
