#!/usr/bin/env python3
"""Regenerates src/codes.js from the Python reference validator so that the code registry cannot drift. Run: python tools/gen-codes.py"""
import importlib.util, json, os
D = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location("d", os.path.join(D, "..", "..", "rev1-reference", "dictation-semantic-validator.py")); d = importlib.util.module_from_spec(spec); spec.loader.exec_module(d)
codes = {k: [v[0], v[1]] for k, v in d.CODES.items()}
open(os.path.join(D, "..", "src", "codes.js"), "w", encoding="utf-8").write("// GENERATED from rev1-reference/dictation-semantic-validator.py CODES by tools/gen-codes.py. Do not edit by hand.\nexport const CODES = " + json.dumps(codes, ensure_ascii=False, indent=1, sort_keys=True) + ";\nexport const DEFAULT_LIMITS = " + json.dumps(d.DEFAULT_LIMITS) + ";\nexport const GUIDE_MIN = " + json.dumps(d.GUIDE_MIN) + ";\n")
print("wrote %d codes" % len(codes))
