# Golden tests v2 (scoring contract v1)

Hand-written expected results for the Dictation Lab scoring, feedback and session rules in `../dictation-scoring-contract-v1.md`.
All data is synthetic (the Harbour Museum baseline is CC0). The 134 original vectors are preserved unchanged in `../golden-tests-original/`.

## Contents

| File | What it is |
|---|---|
| `vectors/*.json` | 242 vectors in 9 files (`{baseline, vectors[{id, title, kind, requires, tags, input, expected}]}`) |
| `vector-schema.json` | Schema of a vector file |
| `vector-status-manifest.json` | For every id: `unchanged` (112), `changed` (22, with the reason) or `new` (108) relative to the original 134 |
| `baseline-harbour-museum.rev1.json` | The lesson every vector refers to: 21 sentences, 12 targets, 7 L1, 8 L2, 9 L3, 3 L4, 8 Answer Spotter items; passes the validator (`GATE_PASS`) |
| `dictation-golden-test-runner.py` | Runner: integrity checks, Python specification oracle, mutation check, optional adapter for any engine |
| `hand-review-notes.md` | Independent hand check of a sample of expected values, and observations |

| File | Vectors | Kinds |
|---|---|---|
| `tokenize.json` | 22 | `tokenize` |
| `l1.json` | 13 | `l1Arrangement` (7), `l1Events` (6) |
| `l2.json` | 24 | `l2Blanks` |
| `l3.json` | 39 | `scoreSentence` (includes the `NUM-*` and `LCS-*` groups) |
| `l4.json` | 21 | `scoreSentence` at Level 4 (includes `SPK-*`) |
| `answer-spotter.json` | 49 | `scoreAnswerSpotter` (35), `itemValidity` (5), `provenance` (4), `reviewUnlock` (4), `studentPayload` (1) |
| `attempts.json` | 48 | `attemptSequence` (26), `aggregateScores` (13), `exposureDerivation` (9) |
| `session.json` | 23 | `session` |
| `safety.json` | 3 | `render` |

177 vectors are tagged `adversarial`. `requires` is `oracle` for 238 vectors and `engine_ui` for 4 (AS-027, SAF-001, SAF-002, SAF-003).
Comparison is a **subset match**: every key in `expected` must be present and equal in the result; extra keys are allowed.

## Running

```bash
python dictation-golden-test-runner.py                                                  # integrity + oracle + mutation
python dictation-golden-test-runner.py --adapter "node ../hybrid-engine/test/golden-adapter.js"   # + the JavaScript engine
python dictation-golden-test-runner.py --adapter "…" --adapter-only --json report.json
```

Python 3 with the standard library only (tested with 3.12.7). Expected output (2026-11-17, Windows 10, Python 3.12.7, Node 24.20.0):

```
baseline   passed   2  failed   0
integrity  passed  15  failed   0
mutation   passed  32  failed   0
oracle     passed 238  failed   0
ADAPTER ENGINE: 238 passed, 0 failed, 4 unsupported
RESULT: PASS
```

### Adapter protocol

The runner starts the adapter command once per vector, writes one JSON line `{"kind", "input", "baseline"}` to its stdin (UTF-8) and reads
the last stdout line: `{"result": {...}}`, or `{"unsupported": true}` for kinds the engine cannot run (here `studentPayload`, `render`).
Any other output counts as a failure. `../hybrid-engine/test/golden-adapter.js` is the reference adapter.

## What a PASS means, and what it does not

| Layer | Meaning |
|---|---|
| `oracle` | The Python oracle inside the runner reproduces the hand-written expected value. The oracle is an independent **reading of the specification**, not the product |
| `mutation` | 32 defects planted in the oracle are each caught by at least one vector: the vectors are sharp enough to detect those mistakes |
| `adapter` | The JavaScript engine gives the expected value. Agreement between two implementations written from the same contract: it shows consistency with the specification, **not** that the specification is pedagogically right (teacher decisions D-12…D-32 are still open) |
| not run | AS-027 and SAF-001…003 need a real student UI (network payload, DOM rendering). They are **not tested**. There is no product UI yet |

Engine-side mutation testing (defects planted in the JavaScript engine) is separate: `../hybrid-engine/tools/mutation-check.mjs`, 32/32 detected.

## Changes to the runner in this revision

* `run_adapter` reads the adapter's output as UTF-8 explicitly. Before, Python used the Windows default code page (cp1252) and
  5 vectors with `£`, `€`, `°` or accents failed for a correct engine (NUM-002, NUM-005, NUM-007, TOK-005, TOK-009). No vector changed.

## Writing new vectors

Write the expected value **by hand from the contract**, then run the oracle. If the oracle disagrees, decide which one is wrong
(write the reason in `hand-review-notes.md`); never copy the oracle's output into `expected`. Add the id to
`vector-status-manifest.json` as `new`. A vector that depends on an unapproved decision should name the decision in its title or tags.
