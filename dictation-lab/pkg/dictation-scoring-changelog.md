# Dictation Lab scoring: changelog

Newest first. "Vectors" = `golden-tests/vectors`. Nothing here is teacher-approved: D-12…D-32 and P-01…P-06 are proposals
(`../TEACHER-DECISIONS.md`). Rev1 decisions D-01…D-11 are unchanged and still open (D-08: three Cambridge spans unverified).

## 2026-11-18 — R3: owner policy, contract v1.1 (engine 0.3.0-draft)

The owner approved the teaching policy (contract v1.1 §0). **Scoring rules for words (C1–C8) are unchanged.** What changed, and why:

| # | Change | Reason | Tests |
|---|---|---|---|
| P1 | Hint, Reveal and every answer preview removed from the API and the session (`hints.js` deleted; `hint`/`reveal` events are `unsupported_event`) | owner rule 1 | HWS-002/003, ATS-004, EXD-011; engine.test "no hint…"; run.test "no hint, no reveal" |
| P2 | Review gate: free practice after a valid Check of the item; homework only after the server acknowledgement; the document setting `postCheckReviewUnlock` is ignored | owner rules 2, 3; D-28 replaced | RVU-001…008; run.test "review gate" |
| P3 | Independent Answer Spotter answers are protected (Level 1/2 presentation, multiple-choice options and reviews that would show them wait; homework phase 2) | owner rule 2; two real leaks in the baseline | run.test, homework.test phase tests |
| P4 | Feedback before the gate opens is numbers only | the detailed result names approved forms | run.test "feedback before the gate…" |
| P5 | Evidence/independence/novelty removed; informational `exposureAtFirstCheck` | D-14, D-16 replaced; P-01, P-06 | EXP-*, ATS-001 |
| P6 | Homework is server-authoritative: `HomeworkClient` (device, payload only), `homeworkPayload`/`scoreHomework`/`validateSubmission`/`storageRecord` (server), `createMemoryServer` (stub). Submission = final answers only. Removed: `HomeworkSubmitter`, `buildSubmission`, `rescoreSubmission`, `createMemoryTransport`, `dictation-submission/1` | O-2 release blocker; P-05 minimal data | homework.test (10 tests); browser network scan |
| P7 | `aggregateScores` adds `result {submitted, completed, passed}`; PASS = 70% of the whole-assignment item-weighted score; `reviewedOnly` removed | owner rule 7, O-3 | AGS-012…018 |
| P8 | Unaudited transcripts: free practice only, labelled; homework needs an audited gate and a teacher approval of the version | owner rule 6, P-04 | run.test, homework.test |
| P9 | Resume while a submission is pending is locked (was allowed) | edits are locked while pending | SUB-013 (changed) |
| P10 | Engine bug: a response value whose `toString` throws crashed `check`; non-string values are now empty text | found by the new hostile-shape test | run.test "hostile response shapes" |

Golden tests: new suite `golden-tests-v1.1/` (259 vectors: 189 unchanged, 38 changed, 32 new; 15 removed with reasons). The v2 suite is unchanged; `golden-tests-v1.1/baseline-diff.md` proves that all 51 v2 failures on the new engine are intended (0 unexpected). Oracle mutation 37/37; engine mutation 45 mutants.
Validator: unchanged (parity 533/533). Example page and browser self-test rewritten (practice + homework against a reference server, with a network scan).

## 2026-11-17 — r2 (validator parity + matrix)

No scoring rule, golden vector or Python reference file was changed.

| # | Change | Why | Test |
|---|---|---|---|
| V1 | `isDigitChar` (`js-validator/src/text.js`) now accepts the 43 code points that Python's `str.isdigit()` accepts and the JS class missed | Known difference #2 was described as accepted; it was a gap in the JS approximation, not a Unicode-version difference (all 43 are in Unicode 15) | `unit.test.js` isdigit regression, fixture `test/vectors/python-isdigit.json` |
| V2 | Known difference #7 documented: schema `pattern` + final newline (Python accepts, JS and Ajv reject) | The README said the `$` difference had been reviewed and none existed; that was true only for the semantic regex, not for schema patterns | `unit.test.js` trailing-newline test |
| M1 | `scoring-decision-matrix.md`: rows D-26 and D-27 added (vector counts 0/0/0 and 0/0/22, counted by script) | The matrix had 19 of 21 decisions | — |
| T1 | `hybrid-engine/tools/mutation-check.mjs`: removing the temporary `hybrid-engine-mutant` copy retries (`maxRetries: 10`) | On Windows the folder can still be locked for a moment after the child test run; `rmSync` failed with `EPERM` and `run-all` reported FAIL although every mutant was detected | the r2 `run-all --mutation` run |

## 2026-11-17 — finishing session (engine 0.2.0-draft)

No scoring rule of the contract was changed. No golden vector was added, removed or edited. All changes below are bug fixes
in the engine or the tooling, new engine modules, or documentation.

### Engine bug fixes (each has a regression test in `hybrid-engine/test/regression.test.js`)

| # | Defect | Contract rule | Fix | Test |
|---|---|---|---|---|
| R1 | `WordBuilder.fromSentence` stripped every non-letter, non-digit character from tile ends, so `£35` became a `35` tile and `20%` a `20` tile. A correct arrangement of a sentence with a price, percentage, negative or leading-decimal number could never be `exact`. | C1, C4, D-17 | Tiles now use `displayTokens()`, the same chunking and end-stripping as `tokenize()` but keeping case. Property test: `tokenize(tiles) == tokenize(sentence)` on every corpus sentence (> 500). | R1 ×2 |
| R2 | Answer Spotter `choose_option` with an empty or missing choice was scored as a wrong attempt. | D-12 | Rejected as `empty_answer` (not an attempt). | R2 |
| R3 | Level 4 was recognised by the `l4-` id prefix; an explicit Level 4 item with another id did not drop speaker labels, and a Level 3 item whose id started with `l4-` did. `Lesson` also threw on a level without `items`, and on an unknown item id. | C7, C8 | Level comes from the exercise section (`Lesson.levelOf`); missing `items` tolerated; unknown item → `rejected: 'unknown_item'`. | R3 |
| R4 | The session state machine kept its own copy of the attempt rules: an identical re-check (D-18) was counted as a new attempt; first-attempt independence ignored hints. A second, competing implementation. | C10, D-14, D-18 | Each session item keeps an event log reduced by `reduceAttempts()`; new status `duplicate_ignored`. Golden session vectors unchanged (none uses an `answer` key). | R4 ×2 |
| R5 | Hints and reveals still changed a homework sitting while `submit_pending` or after `submitted`. | C13 "locks editing", D-22 | They return `locked_pending_submit` / `locked_after_submit`. Proposal P-02. | R5 |
| R6 | `resume` with no saved draft set the items to `null`; a check or hint on an unknown item threw; impossible scores (`num > den`, `den = 0`) were recorded; a submit without a key was accepted; an unknown event threw. | robustness | New results `no_draft`, `unknown_item`, `invalid_score`, `missing_key`, `unknown_event`; nothing changes state. | R6 |

### Test gaps closed (found by the new engine mutation check)

| # | Planted defect that survived the v2 suite | New test |
|---|---|---|
| G1 | bidi controls kept in answers (the only test also had a NUL, which set the flag on its own) | G1 |
| G2 | `price` removed from the critical focus types (every price target in the baseline also has another critical type) | G2 |
| G3 | both shuffle guards removed (the first mutant was equivalent: the second guard repaired it; mutant strengthened) | G3 |

### Tooling fixes

| Fix | Effect |
|---|---|
| `golden-tests/dictation-golden-test-runner.py` `run_adapter`: `encoding="utf-8"` | On Windows Python decoded the adapter output with cp1252: NUM-002, NUM-005, NUM-007, TOK-005, TOK-009 failed for a correct engine. Now 238/238. The original runner in `golden-tests-original/` is untouched |
| `hybrid-engine/test/engine.test.js`: import by `pathToFileURL` | The "Node globals removed" test failed on Windows (`ERR_UNSUPPORTED_ESM_URL_SCHEME` for `C:\…`) |

### New

* `hybrid-engine/src/run.js` — `createRun` / `DictationRun`: one sitting, all four levels and Answer Spotter through the existing layers;
  validator gate; exposure measured at the first scored attempt (P-01); replay from the event log.
* `hybrid-engine/src/payload.js` — `studentItem`: student-safe item data (data-level part of AS-027).
* `hybrid-engine/src/homework.js` — `HomeworkSubmitter`, `buildSubmission`, `rescoreSubmission`, `createMemoryTransport` (stub; no Firebase).
* Tests: `run.test.js` (10), `homework.test.js` (7), `regression.test.js` (11), `js-validator/test/no-node-globals.test.js` (1).
* `hybrid-engine/tools/mutation-check.mjs` (32 engine mutants), `tools/browser-selftest.mjs` (real headless Chrome / Edge).
* `browser-example.html` for the validator and for the engine.
* Documentation: READMEs, `hand-review-notes.md`, this changelog, `qa-results.md`, `START-HERE.md`, `CODEX-HANDOFF.md`, `TEACHER-DECISIONS.md`.

## 2026-11 (v2 handoff) — scoring contract v1 and golden tests v2

Contract v1 (`dictation-scoring-contract-v1.md`) replaced the scoring part of `golden-tests-original/dictation-golden-scoring-spec.md`
after the design review. Decision details: `scoring-decision-matrix.md`.

| Decision | Change against the original proposal |
|---|---|
| D-13 | Known speaker labels at the start of a line are ignored at Level 4 (was: counted as extra words), with a guard when the label is part of the expected text |
| D-14 | Independence (`assisted`) separated from outcome and evidence |
| D-16 | Exposure classes, `exposureHistoryComplete` and four evidence classes |
| D-17 | `%`, currency attached to numbers, signs, leading decimal point and attached units are kept (was: `%` and leading signs stripped) |
| D-19 | `attemptedAccuracy`, `assignmentScore`, `completionRate` reported separately (was: one Σnum/Σden over attempted items) |
| D-20 | Submitted only after a valid server acknowledgement with an idempotency key (was: a network flag) |
| D-29, D-30, D-31, D-32 | New: invalid 0-token items, no automatic numeric equivalence, mechanical defaults and engine boundary, determinism |

### Vectors (134 original → 242)

| Group | Unchanged | Changed | New |
|---|---|---|---|
| TOK (tokenize) | 13 | 1 (TOK-013, D-17) | — |
| NUM (numbers, money, units) | — | — | 20 |
| L1 | 13 | — | — |
| L2 | 24 | — | — |
| L3 | 21 | — | — |
| LCS (partial credit cannot hide errors) | — | — | 6 |
| L4 | 6 | 1 (L4-006, D-13) | — |
| SPK (speaker labels) | — | — | 14 |
| AS (Answer Spotter) | 27 | — | 22 |
| ATT (attempts) | — | 13 (field split, C10/C11) | — |
| EXP, EXD (evidence, exposure) | — | — | 13 + 9 |
| AGG, AGS (aggregation) | — | 2 (D-19) | 11 |
| NAV, SUB (session, submission) | 5 | 5 (D-20) | 13 |
| SAF (rendering) | 3 | — | — |
| **Total** | **112** | **22** | **108** |

Per-vector reasons: `golden-tests/vector-status-manifest.json`.
