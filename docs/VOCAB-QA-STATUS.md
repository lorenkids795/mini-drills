# Vocab QA status

**BLOCKED** · QA PASS · round 1/3 · full

- Timestamp (Asia/Saigon): 2026-10-31 10:27:42 GMT+7
- UTC: 2026-10-31T03:27:42.525Z
- Branch/SHA: `feature/vocab-lab` / `57768755419e580d2b71f9cf2db63a3f04721ba7`
- Working source fingerprint: `0e292d3cfe0630b411054bb63f54171f999a0e4ecdc93be74d866f2b3a518972` (dirty working tree)
- Command: `node tools/vocab-qa-runner.cjs --session phase27-teacher-decisions --round 1 --changes-file qa-artifacts/phase27-teacher-decisions/focused-editorial-repair.json`
- Session: `phase27-teacher-decisions`
- Environment: Node v24.22.1, win32/x64, Playwright 1.62.1, browser msedge
- Tests: 117 Node tests + 244 core assertions; 0 failed commands
- Artifact directory: `qa-artifacts/phase27-teacher-decisions/round-1-full` (443 screenshots)
- Static manifest: `aa1d4474e101245cf429864219d2762fb187d90e221f56016e894ecf546278ea`

## Coverage

| Feature | Status | Mandatory | Evidence / limitation |
| --- | --- | --- | --- |
| dependencies | PASS | yes | Pinned Playwright and installed browser; missing browser fails preflight. |
| artifact-safety | PASS | yes | Exact 26-file allowlist, byte manifest, CSP, no Firebase/backend/external URLs. |
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
| editorial-workbench | PASS | yes | Local exact-version review, edits, audit, migration, role gates and draft rehearsal; no live AI/publication. |
| draft-102-routes | PASS | yes | 102 independently assessable DRAFT senses: 15 pilot + 87 new routes, 4 explicit editorial blockers; 0 human-approved shipped, 0 published. |
| curriculum-editorial | TEACHER_REVIEW | yes | IELTS sense/context quality and pending teaching content need teacher approval; automation is not the authority. |
| human-visual-ux | TEACHER_REVIEW | no | Teacher reviews screenshots/aesthetics; screenshot automation is not aesthetic approval. |
| staging-auth-security | TEACHER_REVIEW | yes | Mocks/static contracts only. Firebase emulator/staging auth/rules required before production; no live credentials/student data used. |
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
| editorial | PASS | logs/editorial.txt |
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

- New instruction used expression, containing the taught target press (048); all-102 browser leakage assertion detected it.; files: vocab-retrieval.js, vocab-mission.js; reproduction: Round 1 focused editorial: Answer visible C17-T1-R1-048. Replaced wording with vocabulary taught here; preserved the exact leakage assertions.

## Next action

BLOCKED: do not label the entire Vocab Lab release-ready. Keep prototype QA results distinct from unimplemented full-102 missions. Stop after round 3; do not rewrite approved pedagogy or retry a failure until it happens to pass.

Machine-readable report: `docs/VOCAB-QA-STATUS.json`; immutable run `report.json`, logs, screenshots and network reports are in the artifact directory.
