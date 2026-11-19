#!/usr/bin/env python3
"""
example-adapter-protocol-demo.py : shows the adapter protocol ONLY. It forwards each vector to the spec ORACLE inside the runner,
so it is NOT a production engine and proves nothing about the product. Codex replaces it with a thin script that calls the real
scoring and session code (for example a small Node script that reads one JSON line on stdin and prints one JSON line on stdout).

stdin  : {"kind": "...", "input": {...}, "baseline": "baseline-harbour-museum.rev1.json"}
stdout : {"result": {...}}   or   {"unsupported": true}
"""
import sys, os, json, importlib.util
HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location("runner", os.path.join(HERE, "..", "dictation-golden-test-runner.py")); runner = importlib.util.module_from_spec(spec); spec.loader.exec_module(runner)
req = json.loads(sys.stdin.readline())
if os.environ.get("DEMO_BREAK") == "case" and req["kind"] in ("tokenize", "scoreSentence", "l2Blanks"): runner.MUT.add("case")   # used only by the self-test to prove the runner detects a faulty engine
res = runner.oracle(req["kind"], req["input"], os.path.join(HERE, req["baseline"]))
print(json.dumps({"unsupported": True} if res is None else {"result": res}, ensure_ascii=False))
