# Vocab QA status

**BLOCKED** · QA PASS · round 3/3 · full

- Timestamp (Asia/Saigon): 2026-10-30 13:47:50 GMT+7
- UTC: 2026-10-30T06:47:50.912Z
- Branch/SHA: `feature/vocab-lab` / `a884a1fffe7926f78fa73ff1a158045b8a43b3e1`
- Working source fingerprint: `93405f7e25f19c508831d84c3b8bbc397629685282a2e2ef05d5f9167817ee17` (dirty working tree)
- Command: `node tools/vocab-qa-runner.cjs --session phase25-final --round 3 --changes-file qa-artifacts/phase25-final/round3-changes.json`
- Session: `phase25-final`
- Environment: Node v24.22.1, win32/x64, Playwright 1.62.1, browser msedge
- Tests: 87 Node tests + 244 core assertions; 0 failed commands
- Artifact directory: `qa-artifacts/phase25-final/round-3-full` (430 screenshots)
- Static manifest: `e5e3a526dcba0eb7cbc3981b3259661e618399ad12581dd084b4bddbf37a30aa`

## Coverage

| Feature | Status | Mandatory | Evidence / limitation |
| --- | --- | --- | --- |
| dependencies | PASS | yes | Pinned Playwright and installed browser; missing browser fails preflight. |
| artifact-safety | PASS | yes | Exact 21-file allowlist, byte manifest, CSP, no Firebase/backend/external URLs. |
| writing-scope | PASS | yes | Normalized protected hashes + nested tree; app/Writing/auth/data untouched. |
| source-provenance | PASS | yes | Exact repository, branch/SHA and working-source fingerprint unchanged throughout the run. |
| visual-baseline | PASS | yes | Committed style/markup hashes, explicit geometry/type metrics, screenshots; no automatic baseline updates. |
| network-isolation | PASS | yes | Browser transport guard + fixture-only HTTPS origin simulation; no external transport or API writes. |
| core-vocab | PASS | yes | 102 approved boundaries, 12/20/mixed, partial, review, sampling, evidence, idempotency. |
| core-regression-244 | PASS | yes | All ten original regression scripts; assert count must remain at least 244. |
| writing-content | PASS | yes | Existing Unit 0/2 content validator; no editorial rewriting. |
| check-flow | PASS | yes | New 20/12, legacy12, undo/save/reload, A/B, pause, one wrong/duplicate input. |
| mission-prototype | PASS | yes | Actual classified eligible/empty flow, Case/Investigate/Decode/Morph/Final/Debrief/Sorting; Coast internal fixture only. |
| library-permissions | PASS | yes | Library LM, no standalone nav, ordinary students blocked, mocked admin/tester/UID account paths; UI privilege is not a rules bypass. |
| full-102-personalized-missions | NOT_IMPLEMENTED | yes | 0/102 published targets; 15 candidate targets; 5 context-only senses. Missing approved full-bank routes prevent readiness. |
| curated-engine | PASS | yes | Three candidates, actual classifications, identity/version persistence and independent forms; QA content is not publication. |
| curriculum-editorial | TEACHER_REVIEW | yes | IELTS sense/context quality and pending teaching content need teacher approval; automation is not the authority. |
| human-visual-ux | TEACHER_REVIEW | no | Teacher reviews screenshots/aesthetics; screenshot automation is not aesthetic approval. |
| staging-auth-security | TEACHER_REVIEW | no | Mocks/static contracts only. Firebase emulator/staging auth/rules required before production; no live credentials/student data used. |
| latest-main-reconciliation | NOT_TESTED | no | Offline run does not fetch/merge main. Writing baseline compatibility is checked; latest main divergence must be reconciled before a future approved merge. |

## Commands

| Suite | Result | Log |
| --- | --- | --- |
| scope | PASS | PASS |
| visual-baseline-source | PASS | PASS |
| build-verify | PASS | PASS |
| browser-preflight | PASS |  |
| unit | PASS | logs/unit.txt |
| regression-admin-kick | PASS | logs/regression-admin-kick.txt |
| regression-chart-facts | PASS | logs/regression-chart-facts.txt |
| regression-lm-meta | PASS | logs/regression-lm-meta.txt |
| regression-lm-unit0 | PASS | logs/regression-lm-unit0.txt |
| regression-lm-unit2-ui | PASS | logs/regression-lm-unit2-ui.txt |
| regression-misc | PASS | logs/regression-misc.txt |
| regression-reading | PASS | logs/regression-reading.txt |
| regression-server-purge | PASS | logs/regression-server-purge.txt |
| regression-sign-in | PASS | logs/regression-sign-in.txt |
| regression-ui-audit | PASS | logs/regression-ui-audit.txt |
| writing-content | PASS | logs/writing-content.txt |
| reality | PASS | logs/reality.txt |
| batch | PASS | logs/batch.txt |
| isolation | PASS | logs/isolation.txt |
| visual | PASS | logs/visual.txt |
| check | PASS | logs/check.txt |
| accessibility | PASS | logs/accessibility.txt |
| mission | PASS | logs/mission.txt |
| shell | PASS | logs/shell.txt |
| engine | PASS | logs/engine.txt |
| network-verify | PASS | PASS |
| source-provenance | PASS | PASS |
| final-artifact-verify | PASS | PASS |

## Failures and open issues

- No reproducible test failures in this run.
- full-102-personalized-missions: NOT_IMPLEMENTED — 0/102 published targets; 15 candidate targets; 5 context-only senses. Missing approved full-bank routes prevent readiness.
- curriculum-editorial: TEACHER_REVIEW — IELTS sense/context quality and pending teaching content need teacher approval; automation is not the authority.
- human-visual-ux: TEACHER_REVIEW — Teacher reviews screenshots/aesthetics; screenshot automation is not aesthetic approval.
- staging-auth-security: TEACHER_REVIEW — Mocks/static contracts only. Firebase emulator/staging auth/rules required before production; no live credentials/student data used.
- latest-main-reconciliation: NOT_TESTED — Offline run does not fetch/merge main. Writing baseline compatibility is checked; latest main divergence must be reconciled before a future approved merge.

## Changes in this round

- Adversarial review found that selecting a future approved pack while the editorial-QA toggle was enabled could pass recent QA-only form evidence into its published plan. Current shipped catalog has no published packs, but the publication boundary must be safe before future approval.; files: vocab-mission-planner.js, vocab-mission-library.js, tests/vocab-mission-engine.test.js, tests/fixtures/vocab-qa-baselines.json; reproduction: A cloned human-approved fixture plus recent QA form evidence must retain Morph; only publication-matched evidence may skip it. Require explicit evidence namespace and gather the effective pack namespace; raise minimum test accounting to 87. Shipped drafts remain unapproved.
- Round 2 retained two old harness assumptions: internal Town return showed Check results without starting the next batch, and legacy Coast gameplay polled task buttons before the queued case transition rendered.; files: tests/vocab-ui-preview.browser.js, tests/vocab-mission.browser.js; reproduction: Isolation line 41 Continue Sorting and mission line 56 Case→Investigate. Internal return now follows actual Check navigation/nextBatch; both legacy helpers wait for the committed next task AND rendered prompt, including token draft saves. All legacy scenarios/assertions remain.

## Next action

BLOCKED: do not label the entire Vocab Lab release-ready. Keep prototype QA results distinct from unimplemented full-102 missions. Stop after round 3; do not rewrite approved pedagogy or retry a failure until it happens to pass.

Machine-readable report: `docs/VOCAB-QA-STATUS.json`; immutable run `report.json`, logs, screenshots and network reports are in the artifact directory.
