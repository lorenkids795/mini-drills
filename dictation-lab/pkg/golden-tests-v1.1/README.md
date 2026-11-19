# Golden tests v3 (scoring contract v1.1)

Expected results for the Dictation Lab rules in `../dictation-scoring-contract-v1.1.md` (owner policy 2026-11: no hint, no reveal,
review after a valid Check / after the server acknowledgement, homework scored on the server, PASS on the whole assignment).
The v2 suite for contract v1 is kept **unchanged** in `../golden-tests/` for provenance and regression comparison.
All data is synthetic (the Harbour Museum baseline is CC0; it is a byte-identical copy of the one in `../golden-tests/`).

| File | What it is |
|---|---|
| `vectors/*.json` | 259 vectors in 9 files: 189 unchanged from v2, 38 changed, 32 new; 15 v2 vectors removed |
| `vector-status-manifest.json` | For every v1.1 id: `unchanged`, `changed` (with the reason) or `new`; `removed` lists the 15 v2 ids with the reason |
| `new-vectors.json` | The 32 hand-written new vectors (RVU-*, ATS-*, EXD-010/011, AGS-012…018, HWS-*) |
| `tools/derive-v1.1-vectors.py` | Builds `vectors/` from the v2 suite + `new-vectors.json`; every change is listed in it per id |
| `tools/check-v2-diff.py` | Runs the unchanged v2 suite on the current engine; fails on any failure that is not an intended removal/change; writes `baseline-diff.md` |
| `dictation-golden-test-runner.py` | Runner (v3): integrity, Python spec oracle for v1.1, 37 planted oracle defects, optional adapter |
| `baseline-diff.md` | Result of `tools/check-v2-diff.py` |

## Running

```bash
python -I dictation-golden-test-runner.py                                                     # integrity + oracle + mutation
python -I dictation-golden-test-runner.py --adapter "node ../hybrid-engine/test/golden-adapter.js"   # + the JavaScript engine
python -I tools/check-v2-diff.py                                                               # v2 baseline difference report
```

Expected (2026-11-18, Windows 10, Python 3.12.7, Node 24.20.0): integrity 15/15, baseline 2/2, oracle 255/255, mutation 37/37,
adapter 255 passed, 0 failed, 4 unsupported, `RESULT: PASS`.

## What a PASS means, and what it does not

Same as v2: the oracle is an independent reading of the contract, not the product; the adapter shows the JavaScript engine agrees with
it. The 4 `engine_ui` vectors (AS-027, SAF-001, SAF-002, SAF-003) need the real Mini Drills UI and are **not run**; the reference example
pages are checked in a real browser (`../tools/browser-smoke.mjs`), which is evidence about those pages only, not about the product UI.
