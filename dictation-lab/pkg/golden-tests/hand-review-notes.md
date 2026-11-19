# Hand-review notes (golden tests v2)

Reviewer: the finishing session, 2026-11-17. Method: for each vector, read the input and the baseline sentence, compute the expected
value **by hand from the contract**, and compare with `expected`. No code was used for these values. This is a sample, not a full audit.

## 1. Sample checked by hand (20 vectors, all consistent with the contract)

| Vector | Hand computation | Result |
|---|---|---|
| AGS-001 | 2 items 6/6 attempted, 8 unattempted × 6 tokens: attempted accuracy 12/12 = 1; assignment 12/(12 + 48) = 1/5; completion 2/10 = 1/5 | matches |
| AGS-004 | the 0-token item is invalid and leaves every denominator: one valid item, 6/6 → 1/1, `invalidItems` 1, `totalItems` 1 | matches |
| AGS-005 | only invalid items: every metric `null` (not 0, not 100%) | matches |
| AGS-010 | first attempt 4/6 = 2/3 is the score; practice accuracy uses the later 6/6 = 1 | matches |
| LCS-001 | 25 expected tokens, `300` instead of `200`: lcs 24, den 25, not exact, the number target is critical → 1 / 1 | matches |
| LCS-002 | s010 has 15 tokens (`the training is free but the guidebook costs £8.50 or £12 with the audio guide`); `£9.50`, `£14` miss both price targets; approved `symbol_optional` forms (8.50, 12) do not help | 13/15, 2 critical: matches |
| LCS-003 | 6 distinct tokens reversed: the longest in-order common subsequence is 1 | 1/6: matches |
| LCS-004 | 6 correct + 6 extra: lcs 6, den max(6, 12) = 12, extra 6 | matches |
| NUM-009 | `the tax is 20%` vs `the tax is 20`: `%` is kept (D-17), so 3/4 | matches |
| NUM-014 | `3.5` ≠ `35`: 3/4 | matches |
| NUM-020 | 5 expected tokens, 6 typed (`thirty-five pounds`): common `the fee is today` = 4, den 6 | matches |
| SPK-008 | `Note:` starts the expected text, so the guard keeps it: 4/4 exact | matches |
| SPK-011 | a line holding only `TOM:` is removed; the rest is the 25-token passage | 25/25 exact: matches |
| EXP-002 | exact, independent, no exposure, history not asserted complete → `independent_unverified_novelty` | matches |
| EXP-008 | wrong then exact → `practice_success`; no hint, so `independent` | matches |
| EXD-005 | host prior exposure `answer_shown` is merged by maximum | matches |
| AS-016 | forms only `proposed`: `8.50`, `12` match neither `£8.50` nor `£12`; den max(2 candidates, 2 typed) = 2 | 0/2: matches |
| AS-040 | an unapproved form is never used | 0/1: matches |
| L2-021 | the target is occurrence 2 of `you`; positional blank answered `you` | exact: matches |
| L3-010 | both prices typed without `£`, both approved `symbol_optional`; the variant label lists both | 15/15, `alt:8.50+alt:12`: matches |

The 22 `changed` vectors were also compared old vs new (`vector-status-manifest.json`): every change is explained by D-13 (L4-006),
D-17 (TOK-013), D-19 (AGG-001, AGG-002), D-20 (NAV-004…008) or the split of attempt fields in C10/C11 (ATT-001…013).
NAV-008 kept its expected value; only the event name changed (`submit` → `submit_requested`).

## 2. Observations for the teacher (no vector was changed because of these)

1. **NUM-020 / D-30** — `thirty-five pounds` for `£35` scores 4/6 and is not exact. Consistent with "no automatic equivalence",
   but strict for listening practice. A teacher can approve a numeral-word form per target.
2. **LCS-003** — a fully reversed sentence still gets 1/6. The contract requires `exact` and error counts beside the fraction, so the
   1/6 is never shown alone; confirm that this partial credit is acceptable in reports (D-25).
3. **SPK-008** — the guard keeps a label when the expected sentence itself starts with it. If a real speaker were called "Note",
   their label would then be counted as an extra word in that sentence only. Rare; accepted as is.
4. **EXP-002 vs EXP-001** — without a host that can prove the exposure history is complete, no attempt can ever be `novel_independent`.
   Production must decide who asserts `exposureHistoryComplete` (P-06 in `TEACHER-DECISIONS.md`).

## 3. Engine behaviour reviewed outside the vectors

Found while finishing the engine; covered by `../hybrid-engine/test/regression.test.js`, not by golden vectors (the vectors test the
contract functions; these defects sat in code paths no vector reaches):

* Level 1 tiles built by `WordBuilder.fromSentence` dropped `£`, `%` and similar symbols, so a correctly arranged sentence with a price
  could never be exact. The vectors pass tile texts directly (`l1Arrangement`), which is why they did not see it.
* `choose_option` with an empty choice was a wrong attempt instead of an empty Check (D-12).
* Level 4 was detected from the `l4-` id prefix.
* The session state machine re-implemented attempt rules and ignored the identical re-check rule (D-18).

## 4. Not reviewed

The remaining 218 vectors were not recomputed by hand in this session. Their agreement with the oracle and with the engine is
mechanical evidence of consistency, not an independent check of the expected values.
