# Codex — Integration Candidate Finalization (SAFE)

Teacher authorized **candidate-only integration work**. **This is NOT permission to change main, merge, PR, deploy, publish, use production secrets or operate on real user data.** Continue in `feature/vocab-lab` and create an isolated detached disposable worktree from the latest freshly fetched origin/main. Read `docs/MAIN-BASELINE-RECOVERY-IMPLEMENTATION-REPORT.md`, `docs/VOCAB-INTEGRATION-CANDIDATE-FOLLOWUP.md` and `docs/MAIN-BASELINE-RECOVERY-IMPLEMENTATION-ISSUES.json`.

Teacher has a more detailed downloadable file named `CODEX-INTEGRATION-CANDIDATE-FINALIZATION.md`; if attached, use it as the detailed acceptance criteria in addition to this repository handoff.

## P0: Library integration builder regression
The preceding handoff had 25/28 main recovery QA commands PASS, 426/436 assertions PASS. Vocab focused unit was **129/130** because the integration builder's broad Learning Materials replacement deleted `vocabMaterialsHTML`. Fix the **builder**, not the tests: use narrow assertive insertion that preserves the latest-main Library and Writing while adding functional Vocab Library hooks. Fail closed when anchors drift. Test actual navigation/mounting/back/access, not just a symbol string.

## Candidate compose
Rebase the disposable candidate on the **then-current latest main** without modifying main or copying historical whole files. Verify the five **ordered** isolated recovery patches apply (Admin → Reading → Homework → Assistant → Cleanup); adapt small deltas only with explicit QA, do not blindly replay. Writing latest main was already PASS and should remain unchanged; ordinary students Coming Soon and denied, Admin/roster Tester preview allowed, direct-route denial, focused lesson. Cleanup is **read-only preview** with no purge/deletion route. Preserve Reading Medium-first, external/mixed Homework explicit Submit and assistant class-scoped access.

## Verification
- Reproduce latest-main 28-command clean baseline and candidate side by side, preserving original test files/assertions and logs.
- Full feature QA Runner including formerly failing `tests/vocab-integration.test.js`, 244 regressions, 20/12 sorting, Reality Check, Mission, Teacher Review, role gates, account switching, reload/cross-tab, mobile/desktop light/dark.
- Browser candidate QA for Writing/Reading/Homework/Admin plus Vocab Library mount, 390/768/1280 widths; fake roles, no live service network.
- Firebase Emulator synthetic security, no claims about deployed signed-token/IAM staging.
- Classify intentional failures in destructive cleanup tests and Writing `lm-check --release` editorial pending correctly; do **not** enable deletion, auto-approve content or weaken tests to make a green score. Stop after max 3 bounded repair/retest cycles per scope. Main may have changed—re-fetch and regenerate rather than assuming old SHAs.

## Deliverable
Write `docs/VOCAB-INTEGRATION-CANDIDATE-FINALIZATION.md` and `.json`: current main/feature SHA, exact builder fix, minimal proposed patches, baseline vs candidate test matrix (PASS/FAIL/NOT_TESTED/BLOCKED), source protection hashes, QA log links, outstanding auth/staging/102-draft approval gates and narrow future release plan. Tooling/documentation and patch proposals only can be committed to `feature/vocab-lab` with `[CF-Pages-Skip]`; do NOT commit application source modifications, modify/push main, merge, PR, deploy or publish. Confirm clean feature worktree and stop.