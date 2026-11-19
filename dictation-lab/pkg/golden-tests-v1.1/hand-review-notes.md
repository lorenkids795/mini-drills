# Hand review notes: golden tests v1.1

The 32 new vectors were written by hand from contract v1.1 before the oracle was changed; the oracle was then rewritten
independently from the contract text. Hand computations of the non-obvious ones:

| Vector | Hand computation |
|---|---|
| AGS-012 | two items 7/10 → item-weighted mean (7/10 + 7/10) / 2 = 7/10 = 70% → passed (≥ 70% is inclusive); both attempted → completed |
| AGS-013 | 2 × 6/6 attempted, 8 × 6 unattempted: attemptedAccuracy 12/12 = 1; assignmentScore 12 / (12 + 48) = 1/5; item-weighted (1 + 1 + 0×8) / 10 = 1/5 → not passed, completion 2/10 = 1/5 |
| AGS-014 | 69/100 → 69 × 100 = 6900 < 70 × 100 = 7000 → not passed (integer comparison, no rounding) |
| AGS-017 | item-weighted (10/10 + 0/1) / 2 = 1/2 → not passed although the unit-weighted score is 10/11 ≈ 91%: PASS must use the item-weighted score |
| AGS-018 | the only item has 0 expected tokens → no valid item → passed unknown (null), not completed |
| RVU-003 | free practice, 2 valid checks but an unchecked independent Answer Spotter item shares the sentence → locked |
| RVU-007 | homework submitted → open even with blockers and 0 checks: after submission everything is locked, so nothing can be gained |
| HWS-005 | after the acknowledgement: `answer` → locked_after_submit; `resume` (a draft exists) → locked_after_submit, and answered stays true |
| ATS-005 | 2/6, 6/6, 3/6 → first 2/6 frozen; succeeded (an exact retry exists) → improved_after_practice; current practice = last = 3/6; 2 practice attempts |

## Disagreement found and decided

| Vector | Oracle | Hand / contract | Decision |
|---|---|---|---|
| SUB-013 (v2) | v1 expected `resumed` for `resume` while the submission is pending | v1.1: a resume is an edit; edits are locked while pending (D-20) | changed to `locked_pending_submit` (recorded in `tools/derive-v1.1-vectors.py` and the manifest; decision E-5) |

## Observations

* AS-023 and AS-025 (removed) still pass on the new engine by coincidence: both expect "locked", and the legacy input gives 0 valid checks.
* The baseline lesson leaks independent Answer Spotter answers through other items (choose-option options £8.50/£12 for as-005;
  Level 2 context "school groups" for as-001). Golden vectors cannot express this (they have no run kind); it is covered by
  `hybrid-engine/test/run.test.js`, `homework.test.js` and the browser network scan.
