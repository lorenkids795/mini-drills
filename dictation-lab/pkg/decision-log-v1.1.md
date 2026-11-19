# Decision log — contract v1.1 (Dictation Lab R3)

Source of the decisions: the owner's approved teaching policy (11/2026, seven rules, `dictation-scoring-contract-v1.1.md` §0) and the
"suggested resolution" list of the R3 brief. Status values: **APPROVED** (kept, owner-approved), **REPLACED** (the R2 proposal is
superseded by the owner policy), **NOT APPLICABLE**, **PENDING HUMAN INPUT** (blocked until a person decides; nothing was decided for them).
Vector ids refer to `golden-tests-v1.1/`. "Engine" = `hybrid-engine/src`.

## D-12 … D-32 (scoring contract)

| Id | Status | Decision in v1.1 | Implementation | Tests |
|---|---|---|---|---|
| D-12 | APPROVED | An empty or punctuation-only Check is not an attempt, does not consume the first attempt and does not unlock review | `session.js` `check_empty`; `run.js` `_check` (reviewAvailable false) | ATT-011, ATS-003, RVU-001, HWS-006; run.test "review gate" |
| D-13 | APPROVED (clarified) | Level 4 drops a **declared** speaker label at the start of a line followed by a colon, only when the target text does not start with it; never arbitrary prefixes; Level 3 never | `normalize.js` `stripSpeakerLabels` (unchanged); `ignoreSpeakerLabels` default true | SPK-001…014; policy.test "misleading labels" |
| D-14 | REPLACED | No hints exist. `hint` events are `unsupported_event` and change nothing | `session.js` default branch; `hints.js` deleted; `run.js` has no `hint()` | HWS-002, HWS-003, ATS-004; engine.test "no hint … API" |
| D-15 | APPROVED | 4000 code points max; control and bidi characters removed and flagged; tested with Vietnamese, CJK and emoji | `normalize.js` (unchanged) | L3-017, L3-019; policy.test "D-15 input cap" |
| D-16 | REPLACED | No novelty/independence claim. Only an informational `exposureAtFirstCheck` (none/tokens_shown/context_shown/answer_shown/unknown), never used for grades | `session.js` `reduceAttempts`; `run.js` `exposureOf` | EXP-001…006, EXP-008, ATS-001, EXD-001…011 |
| D-17 | APPROVED | Meaningful symbols kept (£ $ € %, signs, decimals, °, glued units) | unchanged | NUM-*; policy.test "numbers, currency…" |
| D-18 | APPROVED | An identical re-check (same normalised tokens, nothing in between) is not a new attempt | `session.js` | ATT-012, EXP-011; regression R4 |
| D-19 | APPROVED | attemptedAccuracy, assignmentScore (whole assignment, blanks 0) and completionRate are separate; plus `result {submitted, completed, passed}` for acknowledged homework | `session.js` `aggregateScores` | AGS-001…018, AGG-001/002 |
| D-20 | APPROVED | Submitted only on a valid server acknowledgement; review opens only then | `session.js`, `homework.js` `HomeworkClient.submit` | NAV-004, SUB-*, HWS-008/009, RVU-004…006 |
| D-21 | APPROVED | The version in progress is pinned; the server rejects another version | `session.js`, `homework.js` `validateSubmission` | NAV-006; homework.test "server authorisation…" |
| D-22 | APPROVED | Locked after submission (answers, resume); optional practice afterwards is separate and ungraded | `session.js` | NAV-007, HWS-005, SUB-010/011 |
| D-23 | APPROVED | Case ignored, proper names included | unchanged | TOK-*; policy.test "case and punctuation" |
| D-24 | APPROVED | No fuzzy credit: spelling, s/ed, inflection are wrong | unchanged | L3-*, LCS-006; policy.test "spelling, s/ed" |
| D-25 | APPROVED | LCS ordered partial credit, always shown with exact/not exact and error counts. The audit found no defect: reversed, inserted and deleted words are penalised | unchanged (`align.js`) | LCS-001…006; policy.test "D-25 ordered…", "long Level 4 passage" |
| D-26 | APPROVED | Level 2 blanks are position-specific | unchanged | L2-007 |
| D-27 | APPROVED | Answer Spotter only from approved forms; never auto-generated; provenance labels; no unsupported "official" claims; pre-check payload has no answers or answer location (see P-03) | unchanged + `run.js` disclosure rules | AS-*, run.test payload test |
| D-28 | REPLACED | The document setting `postCheckReviewUnlock` is ignored. Gate: free practice after a valid Check of the item (and no unchecked independent Answer Spotter item on the same sentence); homework after the server acknowledgement | `scoring.js` `reviewUnlock`, `run.js` `reviewGate` | RVU-001…008 |
| D-29 | APPROVED (reveal part removed) | Zero-token items are excluded from every denominator; "reveal-only" no longer exists | `session.js` | AGS-004/005/018 |
| D-30 | APPROVED | No automatic word/numeral or currency equivalence; alternatives only when teacher-approved | unchanged | NUM-020; policy.test |
| D-31 | APPROVED (thresholds provisional) | Transcript-only mechanical selection for practice; thresholds L1 6–14, L3 4–22, L4 25–80 words, max 10/10/10/4 are **teacher-editable provisional defaults**, not certification | `content.js` (unchanged) | engine.test "content: …" |
| D-32 | APPROVED | Seeded PRNG, replayable logs; logs and payloads contain no answers | unchanged + homework submission has no log | run.test "pure function", homework.test payload test |

## P-01 … P-06 (proposals from R2)

| Id | Status | Decision | Consequence |
|---|---|---|---|
| P-01 | APPROVED (informational) | Exposure is taken at the first valid Check | `exposureAtFirstCheck`; never a grading fact |
| P-02 | REPLACED | Moot: there are no hints or reveals at all | `unsupported_event` everywhere |
| P-03 | APPROVED | Independent Answer Spotter items carry no answer location (whole audio is played) | `payload.js` (no `audio` pointer); run.test payload test |
| P-04 | APPROVED | Unaudited transcript (`GATE_NOT_AUDITED`) = free practice only, labelled `unverified_transcript`, never homework, never official | `run.js` `assertRunnable`; homework.test "homework needs audited content…" |
| P-05 | APPROVED with changes; retention **PENDING HUMAN INPUT** | The device sends only final answers (no keystroke or event log). Server scores once. Default storage = scores only. Raw answers only with an approved retention period; production rollout of raw-answer storage is blocked until then | `homework.js` `HomeworkClient.submit`, `scoreHomework`, `storageRecord`; homework.test "storage keeps scores only…" |
| P-06 | APPROVED | Device-side exposure cannot be proven; it is information only, never part of the official grade | contract §11, §13a |

## O-1 … O-4 (integration questions)

| Id | Status | Decision | Consequence |
|---|---|---|---|
| O-1 | APPROVED | Dedicated ES-module bundle under an isolated Dictation path with a small ES5 bridge; no rewrite of legacy scripts; CSP not weakened | Integration not done in this package (see `CODEX-HANDOFF.md` §4) |
| O-2 | APPROVED; **was a release blocker, fixed in the engine** | Practice scores on the device (the practice answer key is on the device: disclosed trade-off). Homework: the device gets only `homeworkPayload`; the server scores the submitted answers from its own versioned lesson | `homework.js`; homework.test payload test; browser QA network scan of the reference page |
| O-3 | APPROVED | PASS = 70% of `overall.itemWeightedAssignmentScore` (each valid item equal weight, blanks 0) | `aggregateScores.result`; AGS-012…018 |
| O-4 | APPROVED (conditional) | Small validated JSON in Firestore under a safe bound (< 900 KB); larger content / private audio only in restricted R2 after a verified zero-budget setup. Never expose private R2 URLs or answer keys | Not implemented here (no backend); handoff |

## Engineering decisions taken without asking (defensible defaults; owner may override)

| # | Decision | Why | How to change |
|---|---|---|---|
| E-1 | Homework has **no scored Check** before Submit (the student types answers, then submits once) | Without the answer key on the device there is nothing to check against; a server Check per item would cost a Function call per Check and leak scores item by item | A server Check endpoint could be added later; the contract would need a new decision |
| E-2 | "Do not disclose answers to other unattempted independent items" applies to **independent Answer Spotter items**. Free practice: Level 1/2 presentation and multiple-choice options that would show such an answer wait until that item is checked; reviews that would show it wait too. Homework: those items come in phase 2 after the server stored the phase-1 answers | The baseline lesson reuses sentences heavily; two real leaks were found while testing (choose-option options £8.50/£12 = the typed answers of as-005; Level 2 context "school groups" = the answer "groups" of as-001) | `run.js` `presentBlockers`, `discloses`, `blockers`; `homework.js` `phasePlan` |
| E-3 | Reusing one sentence across Levels 1–4 is **not** blocked (it is the designed progression); it is recorded by the exposure label | Blocking would make Level 1 review impossible until Levels 2–4 are done | Same functions, add the Level ids |
| E-4 | Feedback right after a Check, while review is closed, is numbers only (exact, num/den, missing, extra, target errors) | The detailed result names approved forms (`variant`) and error positions | `run.js` `feedback` |
| E-5 | Resuming a draft while a submission is pending is locked (was allowed in v1) | Resume is an edit; edits are locked while pending (D-20) | SUB-013 |
| E-6 | The import schema still accepts `postCheckReviewUnlock`; the engine ignores it | Changing the schema would break validator parity with the Python reference (533/533) | Schema v1.2 + validator code, later |

## Human-only items (not decided; still gated)

1. Audio/transcript alignment of Cambridge `s014`, `s028`, `s033` (D-08).
2. Approval of every non-trivial alternative form (`allowedForms`, `acceptedForms`; sample data says `approverRef: synthetic-test`).
3. Rights for any original or third-party audio and `teacherAttestsAuthorizedUse` for every real lesson.
4. Raw-answer retention period (P-05).
5. Final teacher approval and versioned Publish of every lesson used as homework.
6. Engineering defaults E-1 … E-6 above (confirm or change).
